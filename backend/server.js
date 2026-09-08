import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import NodeCache from "node-cache";

dotenv.config();

const app = express();
app.use(cors());

const PORT = process.env.PORT || 3001;
const USDA_API_KEY = process.env.USDA_API_KEY;

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
    note:
      food.dataType === "Branded" && food.servingSize
        ? `Reported per ${food.servingSize}${food.servingSizeUnit || ""} serving on the label — treat as approximate per 100 g.`
        : null,
  };
}

/**
 * Normalizes an Open Food Facts product into the same shape.
 */
function normalizeOffProduct(product) {
  const n = product.nutriments || {};
  return {
    source: "openfoodfacts",
    barcode: product.code,
    name: product.product_name || product.generic_name || "Unknown product",
    brand: product.brands || null,
    imageUrl: product.image_front_small_url || product.image_url || null,
    per100: {
      kcal: Math.round(n["energy-kcal_100g"] ?? n["energy-kcal"] ?? 0),
      protein: Math.round((n["proteins_100g"] ?? 0) * 10) / 10,
      carbs: Math.round((n["carbohydrates_100g"] ?? 0) * 10) / 10,
      fat: Math.round((n["fat_100g"] ?? 0) * 10) / 10,
    },
    nutriScore: product.nutrition_grades || null,
  };
}

/* ---------- GET /api/food/search?q=banana ---------- */
app.get("/api/food/search", async (req, res) => {
  const query = (req.query.q || "").trim();
  if (!query) return res.status(400).json({ error: "Missing ?q= search term" });
  if (!USDA_API_KEY) return res.status(500).json({ error: "Server is missing USDA_API_KEY" });

  const cacheKey = `search:${query.toLowerCase()}`;
  const cached = cache.get(cacheKey);
  if (cached) return res.json({ cached: true, results: cached });

  try {
    const url = new URL("https://api.nal.usda.gov/fdc/v1/foods/search");
    url.searchParams.set("query", query);
    url.searchParams.set("api_key", USDA_API_KEY);
    url.searchParams.set("pageSize", "20");
    // Prefer well-curated data first; branded foods still show up further down.
    url.searchParams.set("dataType", "Foundation,SR Legacy,Survey (FNDDS),Branded");

    const usdaRes = await fetch(url);
    if (!usdaRes.ok) {
      return res.status(usdaRes.status).json({ error: `USDA API returned ${usdaRes.status}` });
    }
    const data = await usdaRes.json();
    const results = (data.foods || []).map(normalizeUsdaFood);

    cache.set(cacheKey, results);
    res.json({ cached: false, results });
  } catch (err) {
    console.error(err);
    res.status(502).json({ error: "Failed to reach USDA FoodData Central" });
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

app.listen(PORT, () => {
  console.log(`AsmarFit food API running on http://localhost:${PORT}`);
  console.log(`  GET /api/food/search?q=banana`);
  console.log(`  GET /api/food/barcode/3017624010701`);
});
