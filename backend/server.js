import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import NodeCache from "node-cache";

dotenv.config();

const app = express();
app.use(cors());

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
function normalizeOffProduct(product) {
  const n = product.nutriments || {};
  return {
    source: "openfoodfacts",
    barcode: product.code,
    name: product.product_name || product.generic_name || "Unknown product",
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

/**
 * USDA FoodData Central text search. Resolves to { results, error } instead of
 * throwing, so one source being down doesn't take the whole endpoint with it.
 */
async function searchUsda(query) {
  try {
    const url = new URL("https://api.nal.usda.gov/fdc/v1/foods/search");
    url.searchParams.set("query", query);
    url.searchParams.set("api_key", USDA_API_KEY);
    url.searchParams.set("pageSize", "20");
    // Prefer well-curated data first; branded foods still show up further down.
    url.searchParams.set("dataType", "Foundation,SR Legacy,Survey (FNDDS),Branded");

    const r = await fetch(url);
    if (!r.ok) return { results: [], error: `USDA API returned ${r.status}` };
    const data = await r.json();
    return { results: (data.foods || []).map(normalizeUsdaFood), error: null };
  } catch (err) {
    console.error("USDA search failed:", err.message);
    return { results: [], error: "Failed to reach USDA FoodData Central" };
  }
}

/**
 * Open Food Facts text search via the dedicated search service
 * (search.openfoodfacts.org). Good coverage of branded products and supplements
 * that USDA lacks, and far more tolerant of load than the legacy CGI endpoint.
 * Same { results, error } contract.
 */
async function searchOpenFoodFacts(query) {
  try {
    const url = new URL("https://search.openfoodfacts.org/search");
    url.searchParams.set("q", query);
    url.searchParams.set("page_size", "24");
    url.searchParams.set(
      "fields",
      "code,product_name,generic_name,brands,nutriments,categories_tags,categories,nutrition_grades,image_front_small_url,image_url"
    );

    const r = await fetch(url, { headers: { "User-Agent": OFF_USER_AGENT } });
    if (!r.ok) return { results: [], error: `Open Food Facts returned ${r.status}` };
    const data = await r.json();
    const results = (data.hits || [])
      .map(normalizeOffProduct)
      // Free-text OFF results include entries with no usable name or no nutrition
      // data at all — drop those so the list stays useful (name + kcal).
      .filter((p) => p.name && p.name !== "Unknown product" && p.per100.kcal > 0);
    return { results, error: null };
  } catch (err) {
    console.error("Open Food Facts search failed:", err.message);
    return { results: [], error: "Failed to reach Open Food Facts" };
  }
}

/**
 * Merges the two sources: USDA first (curated basics), then Open Food Facts
 * (branded products & supplements), de-duplicated on name + brand, capped so
 * the response stays a reasonable size.
 */
function mergeSearchResults(usdaResults, offResults) {
  const seen = new Set();
  const keyOf = (r) => `${(r.name || "").toLowerCase().trim()}|${(r.brand || "").toLowerCase().trim()}`;
  const merged = [];
  for (const item of [...usdaResults, ...offResults]) {
    const key = keyOf(item);
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(item);
  }
  return merged.slice(0, 40);
}

/**
 * Translates a German search term to English via MyMemory (free, no API key).
 * USDA only understands English food names, so a German query needs this
 * before being sent there. Never throws — on any failure (or a low-confidence
 * match) it just falls back to the original text, so a flaky translation
 * service degrades USDA relevance instead of breaking the search.
 */
async function translateDeToEn(text) {
  const cacheKey = `translate:de-en:${text.toLowerCase()}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  try {
    const url = new URL("https://api.mymemory.translated.net/get");
    url.searchParams.set("q", text);
    url.searchParams.set("langpair", "de|en");
    const r = await fetch(url);
    if (!r.ok) return text;
    const data = await r.json();
    const translated = data?.responseData?.translatedText;
    if (typeof translated !== "string" || !translated.trim()) return text;
    cache.set(cacheKey, translated, 60 * 60 * 24); // translations don't go stale — cache a day
    return translated;
  } catch (err) {
    console.error("Translation failed, using original query:", err.message);
    return text;
  }
}

/* ---------- GET /api/food/search?q=banana&lang=de ---------- */
app.get("/api/food/search", async (req, res) => {
  const query = (req.query.q || "").trim();
  // Language of the app UI (DE/EN toggle), not the query's own language.
  // Determines both the USDA search term and whether Open Food Facts runs
  // at all: en → USDA already returns English, no need for OFF's mixed-
  // language text search; de → OFF is a good source for German products,
  // but USDA needs the term translated first since it only understands
  // English food names.
  const lang = req.query.lang === "de" ? "de" : "en";
  if (!query) return res.status(400).json({ error: "Missing ?q= search term" });
  if (!USDA_API_KEY) return res.status(500).json({ error: "Server is missing USDA_API_KEY" });

  const cacheKey = `search:${lang}:${query.toLowerCase()}`;
  const cached = cache.get(cacheKey);
  if (cached) return res.json({ cached: true, results: cached });

  const usdaQuery = lang === "de" ? await translateDeToEn(query) : query;
  const [usda, off] = await Promise.all([
    searchUsda(usdaQuery),
    lang === "de" ? searchOpenFoodFacts(query) : Promise.resolve({ results: [], error: null }),
  ]);

  const results = mergeSearchResults(usda.results, off.results);

  // Only fail (and skip caching) when there's nothing to show AND a source
  // actually errored — never when a source came back genuinely empty, and
  // never just because OFF was intentionally skipped for lang=en (its
  // `error` is null in that case, not truthy, so this only fires on a real
  // failure).
  if (results.length === 0 && (usda.error || off.error)) {
    return res.status(502).json({ error: usda.error || off.error });
  }

  cache.set(cacheKey, results);
  res.json({ cached: false, results });
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

app.listen(PORT, () => {
  console.log(`AsmarFit food API running on http://localhost:${PORT}`);
  console.log(`  GET /api/food/search?q=banana`);
  console.log(`  GET /api/food/barcode/3017624010701`);
});
