import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import NodeCache from "node-cache";
import { searchBasics, fold, tokensOf } from "./basics.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: "8mb" })); // photo scan sends a downscaled JPEG as base64

const PORT = process.env.PORT || 3001;
const USDA_API_KEY = process.env.USDA_API_KEY;

// Open Food Facts asks integrators to send an identifying User-Agent.
const OFF_USER_AGENT = "AsmarFit/1.0 (food API proxy; dev)";

// Open Food Facts category tags (from `categories_tags`) that mark a product
// as a sports/protein supplement rather than a regular food. Matched as a
// lowercase substring, so the singular form also catches the plural tag
// (e.g. "protein-powder" ⊂ "en:protein-powders").
const SUPPLEMENT_CATEGORY_HINTS = [
  "protein-powder",
  "whey-protein",
  "protein-bar",
  "dietary-supplement",
  "bodybuilding-supplement",
  "food-supplement",
  "sports-nutrition",
  "proteinpulver",
  "proteinriegel",
];

function looksLikeSupplement(product) {
  const tags = Array.isArray(product.categories_tags)
    ? product.categories_tags
    : typeof product.categories === "string"
      ? product.categories.split(",")
      : [];
  const haystack = tags.join(" ").toLowerCase();
  return SUPPLEMENT_CATEGORY_HINTS.some((hint) => haystack.includes(hint));
}

// Cache results for 6 hours — both APIs ask integrators to avoid hammering them,
// and the same "banana" or "3017624010701" search happens constantly across users.
const cache = new NodeCache({ stdTTL: 60 * 60 * 6 });

if (!USDA_API_KEY) {
  console.warn(
    "⚠️  No USDA_API_KEY set in .env — /api/food/search will fail. " +
      "Get a free key at https://api.data.gov/signup and put it in .env"
  );
}

/* ---------- USDA nutrient IDs we care about ---------- */
const NUTRIENT_IDS = {
  kcal: 1008,
  protein: 1003,
  carbs: 1005,
  fat: 1004,
};

function pickNutrient(foodNutrients, id) {
  const hit = (foodNutrients || []).find(
    (n) => n.nutrientId === id || n.nutrient?.id === id
  );
  if (!hit) return 0;
  // USDA foodNutrients use `.amount`; some branded-food shapes use `.value`
  const val = hit.amount ?? hit.value ?? 0;
  return Math.round(val * 10) / 10;
}

/**
 * Normalizes a USDA FoodData Central food object into the same shape
 * the AsmarFit frontend already uses: { name, per100: { kcal, protein, carbs, fat } }.
 * USDA values are per 100 g for Foundation / SR Legacy / Survey foods, which
 * covers the vast majority of a "search by name" use case (raw & prepared foods).
 * Branded foods sometimes report per-serving instead — flagged via `note` below
 * so the frontend can show a caveat instead of a silently wrong number.
 */
function normalizeUsdaFood(food) {
  const per100 = {
    kcal: pickNutrient(food.foodNutrients, NUTRIENT_IDS.kcal),
    protein: pickNutrient(food.foodNutrients, NUTRIENT_IDS.protein),
    carbs: pickNutrient(food.foodNutrients, NUTRIENT_IDS.carbs),
    fat: pickNutrient(food.foodNutrients, NUTRIENT_IDS.fat),
  };
  return {
    source: "usda",
    fdcId: food.fdcId,
    name: food.description,
    brand: food.brandOwner || null,
    dataType: food.dataType,
    per100,
    // Supplement tagging is derived from Open Food Facts category tags only —
    // USDA has no comparable field, so USDA hits are never flagged.
    isSupplement: false,
    note:
      food.dataType === "Branded" && food.servingSize
        ? `Reported per ${food.servingSize}${food.servingSizeUnit || ""} serving on the label — treat as approximate per 100 g.`
        : null,
  };
}

/**
 * Normalizes an Open Food Facts product (barcode lookup or text search) into
 * the same shape. `isSupplement` is true when the product's category tags mark
 * it as a protein/sports supplement, so the frontend can highlight it later.
 */
function decodeEntities(str) {
  return String(str).replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&#0?39;|&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
}

function normalizeOffProduct(product) {
  const n = product.nutriments || {};
  return {
    source: "openfoodfacts",
    barcode: product.code,
    name: decodeEntities(product.product_name || product.generic_name || "Unknown product"),
    // `brands` is a comma string on the barcode API but an array on the search API.
    brand: Array.isArray(product.brands) ? product.brands.join(", ") || null : product.brands || null,
    imageUrl: product.image_front_small_url || product.image_url || null,
    per100: {
      kcal: Math.round(n["energy-kcal_100g"] ?? n["energy-kcal"] ?? 0),
      protein: Math.round((n["proteins_100g"] ?? 0) * 10) / 10,
      carbs: Math.round((n["carbohydrates_100g"] ?? 0) * 10) / 10,
      fat: Math.round((n["fat_100g"] ?? 0) * 10) / 10,
    },
    isSupplement: looksLikeSupplement(product),
    nutriScore: product.nutrition_grades || null,
    note: null,
  };
}

/** ALL-CAPS branded names ("BANANA") → "Banana", so they read like the rest. */
function prettyName(name) {
  const n = String(name || "").trim();
  return n && n === n.toUpperCase() && /[A-Z]/.test(n) ? n.toLowerCase().replace(/(^|[\s(\/-])([a-z])/g, (m, p, c) => p + c.toUpperCase()) : n;
}

/**
 * One USDA request. Resolves to { results, error }. The USDA gateway sporadically
 * answers 400/5xx for perfectly valid queries, so a failed request is retried once.
 */
async function usdaRequest(query, dataType, pageSize) {
  const url = new URL("https://api.nal.usda.gov/fdc/v1/foods/search");
  url.searchParams.set("query", query);
  url.searchParams.set("api_key", USDA_API_KEY);
  url.searchParams.set("pageSize", String(pageSize));
  url.searchParams.set("dataType", dataType);
  let lastError = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(12_000) });
      if (r.ok) {
        const data = await r.json();
        return { results: (data.foods || []).map(normalizeUsdaFood), error: null };
      }
      lastError = "USDA API returned " + r.status;
    } catch (err) {
      console.error("USDA search failed:", err.message);
      lastError = "Failed to reach USDA FoodData Central";
    }
  }
  return { results: [], error: lastError };
}

/**
 * USDA FoodData Central text search: curated data (Foundation + SR Legacy) first,
 * branded products second. Two separate requests so branded noise can never push the
 * clean entries out of the page.
 */
async function searchUsda(query) {
  const [curated, branded] = await Promise.all([
    usdaRequest(query, "Foundation,SR Legacy", 15),
    usdaRequest(query, "Branded", 12),
  ]);
  const clean = (list) =>
    list
      .map((f) => ({ ...f, name: prettyName(f.name) }))
      .filter((f) => f.name && f.per100.kcal > 0 && f.per100.kcal <= 950);
  return {
    results: [...clean(curated.results), ...clean(branded.results)],
    error: curated.results.length + branded.results.length === 0 ? curated.error || branded.error : null,
  };
}

/**
 * Open Food Facts text search via the dedicated search service
 * (search.openfoodfacts.org). Good coverage of branded products and supplements
 * that USDA lacks. Results are re-ranked (name matches the query first) because the
 * raw relevance order is noisy for short words. Same { results, error } contract.
 */
async function searchOpenFoodFacts(query, lang) {
  try {
    const url = new URL("https://search.openfoodfacts.org/search");
    url.searchParams.set("q", query);
    if (lang === "de") url.searchParams.set("langs", "de");
    url.searchParams.set("page_size", "50");
    url.searchParams.set(
      "fields",
      "code,product_name,generic_name,brands,nutriments,categories_tags,categories,nutrition_grades,image_front_small_url,image_url"
    );

    const r = await fetch(url, { headers: { "User-Agent": OFF_USER_AGENT }, signal: AbortSignal.timeout(12_000) });
    if (!r.ok) return { results: [], error: "Open Food Facts returned " + r.status };
    const data = await r.json();
    const tokens = tokensOf(query);
    const scored = (data.hits || [])
      .map(normalizeOffProduct)
      // Drop entries with no usable name / nutrition, and impossible outliers
      // (no food has more than ~900 kcal per 100 g).
      .filter((p) => p.name && p.name !== "Unknown product" && p.name.trim().length > 2 && p.per100.kcal > 0 && p.per100.kcal <= 950)
      .map((p, i) => {
        const words = tokensOf(p.name);
        const nameFold = words.join(" ");
        const allInName = tokens.every((t) => words.some((w) => w.startsWith(t)));
        const brandHit = tokens.every((t) => fold(p.brand || "").includes(t));
        let rank = 4;
        if (nameFold === tokens.join(" ")) rank = 0;
        else if (allInName && words[0]?.startsWith(tokens[0])) rank = 1;
        else if (allInName) rank = 2;
        else if (brandHit) rank = 3;
        return { p, rank, i };
      })
      .sort((a, b) => a.rank - b.rank || a.i - b.i);
    // Keep only genuine matches when there are enough of them; otherwise fall back to
    // the raw list so odd spellings still return something.
    const genuine = scored.filter((x) => x.rank < 4);
    const use = genuine.length >= 5 ? genuine : scored;
    return { results: use.map((x) => x.p), error: null };
  } catch (err) {
    console.error("Open Food Facts search failed:", err.message);
    return { results: [], error: "Failed to reach Open Food Facts" };
  }
}

/**
 * Merges the sources in priority order (curated basics, USDA, Open Food Facts),
 * de-duplicated on name + brand and on name + kcal (OFF is full of near-identical
 * copies), capped so the response stays a reasonable size.
 */
function mergeSearchResults(...lists) {
  const seen = new Set();
  const seenKcal = new Set();
  const merged = [];
  for (const item of lists.flat()) {
    const key = (item.name || "").toLowerCase().trim() + "|" + (item.brand || "").toLowerCase().trim();
    const key2 = (item.name || "").toLowerCase().trim() + "|" + item.per100.kcal;
    if (seen.has(key) || seenKcal.has(key2)) continue;
    seen.add(key);
    seenKcal.add(key2);
    merged.push(item);
  }
  return merged.slice(0, 40);
}

/* ---------- GET /api/food/search?q=banana&lang=de ---------- */
app.get("/api/food/search", async (req, res) => {
  const query = (req.query.q || "").trim();
  // Language of the app UI (DE/EN toggle). German results come from the curated list
  // plus Open Food Facts (real German products). English results come from the curated
  // list plus USDA (Open Food Facts fills in when USDA has too little / is unavailable).
  const lang = req.query.lang === "de" ? "de" : "en";
  if (!query) return res.status(400).json({ error: "Missing ?q= search term" });
  const cacheKey = "search2:" + lang + ":" + query.toLowerCase();
  const cached = cache.get(cacheKey);
  if (cached) return res.json({ cached: true, results: cached });

  const basics = searchBasics(query, lang);
  let usda = { results: [], error: null };
  let off = { results: [], error: null };
  if (lang === "en" && USDA_API_KEY) {
    usda = await searchUsda(query);
    if (usda.results.length < 8) off = await searchOpenFoodFacts(query, lang);
  } else {
    off = await searchOpenFoodFacts(query, lang);
  }

  const results = mergeSearchResults(basics, usda.results, off.results);

  // Only fail (and skip caching) when there's nothing to show AND a source actually
  // errored — never when a source came back genuinely empty.
  if (results.length === 0 && (usda.error || off.error)) {
    return res.status(502).json({ error: usda.error || off.error });
  }

  // Don't cache partial results caused by a failing source, so the next try can recover.
  if (!usda.error && !off.error) cache.set(cacheKey, results);
  res.json({ cached: false, results });
});

/* ---------- POST /api/assistant ---------- */
// In-app support / fitness assistant. Needs ANTHROPIC_API_KEY on the server;
// the key never reaches the app. Simple per-IP rate limit to cap cost.
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const ASSISTANT_MODEL = process.env.ASSISTANT_MODEL || "claude-haiku-4-5-20251001";
const assistantHits = new Map();

app.post("/api/assistant", async (req, res) => {
  if (!ANTHROPIC_API_KEY) return res.status(503).json({ error: "not_configured" });

  const now = Date.now();
  const hits = (assistantHits.get(req.ip) || []).filter((ts) => now - ts < 60_000);
  if (hits.length >= 15) return res.status(429).json({ error: "rate_limited" });
  assistantHits.set(req.ip, [...hits, now]);

  const lang = req.body?.lang === "en" ? "English" : "German";
  const messages = (Array.isArray(req.body?.messages) ? req.body.messages : [])
    .slice(-10)
    .filter((m) => (m?.role === "user" || m?.role === "assistant") && typeof m.content === "string" && m.content.trim())
    .map((m) => ({ role: m.role, content: m.content.slice(0, 2000) }));
  if (messages.length === 0 || messages[messages.length - 1].role !== "user") {
    return res.status(400).json({ error: "Expected a final user message" });
  }

  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: ASSISTANT_MODEL,
        max_tokens: 600,
        system:
          "You are the assistant inside ASFIT, a fitness and nutrition tracking app (food logging with barcode scan and search, recipes, workouts with self-entered weights, progress charts, water tracking, notes with mood). " +
          "Help with training, nutrition, motivation and how to use the app. Be friendly, concrete and brief (max ~150 words). " +
          "You are not a doctor: for medical problems, injuries, eating disorders or medication, recommend a professional. " +
          "Reply in " + lang + "." +
          (typeof req.body?.context === "string" && req.body.context.trim() ? " Context from the app screen the user is on (use it to answer precisely): " + req.body.context.slice(0, 1500) : ""),
        messages,
      }),
    });
    if (!r.ok) {
      console.error("Anthropic API returned", r.status);
      return res.status(502).json({ error: "upstream_error" });
    }
    const data = await r.json();
    const reply = (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join(" ").trim();
    res.json({ reply: reply || "…" });
  } catch (err) {
    console.error("Assistant request failed:", err.message);
    res.status(502).json({ error: "upstream_error" });
  }
});

/* ---------- POST /api/food/photo ---------- */
// AI food photo recognition: a vision model estimates the dish and its
// nutrition from one photo. Estimates only — the app lets the user review.
app.post("/api/food/photo", async (req, res) => {
  if (!ANTHROPIC_API_KEY) return res.status(503).json({ error: "not_configured" });

  const now = Date.now();
  const hits = (assistantHits.get(req.ip) || []).filter((ts) => now - ts < 60_000);
  if (hits.length >= 15) return res.status(429).json({ error: "rate_limited" });
  assistantHits.set(req.ip, [...hits, now]);

  const image = typeof req.body?.image === "string" ? req.body.image : "";
  const sep = image.indexOf(";base64,");
  const mediaType = image.slice(5, sep);
  const b64 = image.slice(sep + 8);
  const m = ["image/jpeg", "image/png", "image/webp"].includes(mediaType) && /^[A-Za-z0-9+/=]+$/.test(b64) ? [null, mediaType, b64] : null;
  if (!m) return res.status(400).json({ error: "Expected a base64 image data URL (jpeg/png/webp)" });
  const lang = req.body?.lang === "en" ? "English" : "German";

  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: process.env.PHOTO_MODEL || ASSISTANT_MODEL,
        max_tokens: 700,
        system:
          "You estimate nutrition from a photo of a meal. Identify each visible food or drink item, estimate its portion and its nutrition. Drinks and other liquids (cola, water, juice, milk, coffee, soup, smoothies …) are measured in millilitres, solid food in grams. " +
          "Answer with ONLY a JSON object, no prose, in exactly this shape: " +
          '{"name": string (short dish name in ' + lang + '), "items": [{"name": string (' + lang + '), "unit": "g" | "ml" (ml for liquids), "grams": number (the amount in the given unit), "kcal": number, "protein": number, "carbs": number, "fat": number}], "isFood": boolean}. ' +
          "Use realistic values (protein/carbs/fat in grams, kcal for the whole portion). If the photo does not show food or drink, return isFood false and an empty items array.",
        messages: [
          {
            role: "user",
            content: [
              { type: "image", source: { type: "base64", media_type: m[1], data: m[2] } },
              { type: "text", text: "Estimate this meal." },
            ],
          },
        ],
      }),
    });
    if (!r.ok) {
      console.error("Anthropic API returned", r.status);
      return res.status(502).json({ error: "upstream_error" });
    }
    const data = await r.json();
    const text = (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join(" ");
    const jsonStart = text.indexOf("{");
    const jsonEnd = text.lastIndexOf("}");
    if (jsonStart < 0 || jsonEnd < jsonStart) return res.status(502).json({ error: "bad_model_output" });
    const parsed = JSON.parse(text.slice(jsonStart, jsonEnd + 1));
    const num = (v) => (Number.isFinite(Number(v)) ? Math.max(0, Math.round(Number(v) * 10) / 10) : 0);
    const items = (Array.isArray(parsed.items) ? parsed.items : []).slice(0, 12).map((it) => ({
      name: String(it.name || "").slice(0, 80),
      unit: it.unit === "ml" ? "ml" : "g",
      grams: num(it.grams),
      kcal: Math.round(num(it.kcal)),
      protein: num(it.protein),
      carbs: num(it.carbs),
      fat: num(it.fat),
    }));
    const total = items.reduce(
      (t, it) => ({ grams: t.grams + it.grams, kcal: t.kcal + it.kcal, protein: t.protein + it.protein, carbs: t.carbs + it.carbs, fat: t.fat + it.fat }),
      { grams: 0, kcal: 0, protein: 0, carbs: 0, fat: 0 }
    );
    for (const k of ["grams", "protein", "carbs", "fat"]) total[k] = Math.round(total[k] * 10) / 10;
    total.unit = items.length > 0 && items.every((it) => it.unit === "ml") ? "ml" : "g";
    res.json({ isFood: parsed.isFood !== false && items.length > 0, name: String(parsed.name || "").slice(0, 80), items, total });
  } catch (err) {
    console.error("Photo scan failed:", err.message);
    res.status(502).json({ error: "upstream_error" });
  }
});

/* ---------- GET /api/food/barcode/:code ---------- */
app.get("/api/food/barcode/:code", async (req, res) => {
  const { code } = req.params;
  const cacheKey = `barcode:${code}`;
  const cached = cache.get(cacheKey);
  if (cached) return res.json({ cached: true, result: cached });

  try {
    const offRes = await fetch(`https://world.openfoodfacts.org/api/v2/product/${code}.json`);
    if (!offRes.ok) {
      return res.status(offRes.status).json({ error: `Open Food Facts returned ${offRes.status}` });
    }
    const data = await offRes.json();
    if (data.status !== 1 || !data.product) {
      return res.status(404).json({ error: "Product not found for this barcode" });
    }
    const result = normalizeOffProduct(data.product);
    cache.set(cacheKey, result);
    res.json({ cached: false, result });
  } catch (err) {
    console.error(err);
    res.status(502).json({ error: "Failed to reach Open Food Facts" });
  }
});

app.get("/health", (_req, res) => res.json({ ok: true }));

app.post("/api/recipe", async (req, res) => {
  if (!ANTHROPIC_API_KEY) return res.status(503).json({ error: "not_configured" });

  const now = Date.now();
  const hits = (assistantHits.get(req.ip) || []).filter((ts) => now - ts < 60_000);
  if (hits.length >= 15) return res.status(429).json({ error: "rate_limited" });
  assistantHits.set(req.ip, [...hits, now]);

  const lang = req.body?.lang === "en" ? "English" : "German";
  const wish = typeof req.body?.prompt === "string" ? req.body.prompt.trim().slice(0, 500) : "";
  if (!wish) return res.status(400).json({ error: "Expected a prompt" });

  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: ASSISTANT_MODEL,
        max_tokens: 700,
        system:
          "You create one simple recipe for a nutrition tracking app. Reply with ONLY a JSON object, no other text, in this exact shape: " +
          '{"name": string, "category": "breakfast"|"lunch"|"dinner"|"snacks", "kcal": number, "protein": number, "carbs": number, "fat": number, "ingredients": [string]} ' +
          "Nutrition values are per one serving (whole numbers, grams for macros). Ingredients include concrete amounts (e.g. '200 ml milk'). Use " + lang + " for name and ingredients. Estimates are fine.",
        messages: [{ role: "user", content: wish }],
      }),
    });
    if (!r.ok) {
      console.error("Anthropic API returned", r.status);
      return res.status(502).json({ error: "upstream_error" });
    }
    const data = await r.json();
    const text = (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join(" ");
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) return res.status(502).json({ error: "bad_format" });
    const raw = JSON.parse(m[0]);
    const num = (v) => Math.max(0, Math.round(Number(v) || 0));
    const category = ["breakfast", "lunch", "dinner", "snacks"].includes(raw.category) ? raw.category : "lunch";
    const ingredients = Array.isArray(raw.ingredients) ? raw.ingredients.map((x) => String(x).slice(0, 120)).slice(0, 25) : [];
    if (!raw.name || ingredients.length === 0) return res.status(502).json({ error: "bad_format" });
    res.json({ name: String(raw.name).slice(0, 80), category, kcal: num(raw.kcal), protein: num(raw.protein), carbs: num(raw.carbs), fat: num(raw.fat), ingredients });
  } catch (err) {
    console.error("Recipe request failed:", err.message);
    res.status(502).json({ error: "upstream_error" });
  }
});

// AI illustration for a recipe. The free pollinations.ai service rejects
// direct browser requests (bot check), so the server fetches the picture and
// hands it back as a data URL — the app then stores it with the recipe.
const imageHits = new Map();
app.post("/api/recipe-image", async (req, res) => {
  const now = Date.now();
  const hits = (imageHits.get(req.ip) || []).filter((ts) => now - ts < 60_000);
  if (hits.length >= 6) return res.status(429).json({ error: "rate_limited" });
  imageHits.set(req.ip, [...hits, now]);

  const name = typeof req.body?.name === "string" ? req.body.name.trim().slice(0, 80) : "";
  if (!name) return res.status(400).json({ error: "Expected a name" });
  const words = (Array.isArray(req.body?.ingredients) ? req.body.ingredients : [])
    .slice(0, 4)
    .map((l) => String(l).replace(/^[\d.,/\s]*(g|kg|ml|l|el|tl|stk|stück|tasse|prise)?\s+/i, "").trim().slice(0, 40))
    .filter(Boolean)
    .join(", ");
  const prompt =
    "photorealistic food photograph of " + name + (words ? " with " + words : "") +
    ", served on a plate, shot with a 50mm lens, shallow depth of field, soft natural window light, restaurant quality";
  const seed = Math.floor(Math.random() * 100000);
  const url = "https://image.pollinations.ai/prompt/" + encodeURIComponent(prompt) + "?width=768&height=576&nologo=true&model=flux&enhance=false&seed=" + seed;

  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(60_000) });
    if (!r.ok || !(r.headers.get("content-type") || "").startsWith("image/")) return res.status(502).json({ error: "upstream_error" });
    const buf = Buffer.from(await r.arrayBuffer());
    res.json({ image: "data:" + r.headers.get("content-type") + ";base64," + buf.toString("base64") });
  } catch (err) {
    console.error("Recipe image failed:", err.message);
    res.status(502).json({ error: "upstream_error" });
  }
});

app.listen(PORT, () => {
  console.log(`AsmarFit food API running on http://localhost:${PORT}`);
  console.log(`  GET /api/food/search?q=banana`);
  console.log(`  GET /api/food/barcode/3017624010701`);
});
