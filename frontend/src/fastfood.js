// Fast-food planner: menus (estimates) + the search that finds the highest-protein order for a calorie budget.
// Values are rounded estimates for Europe/Switzerland, NOT the chains' official figures — the screen says so.
// Row format: [id, nameDe, nameEn, category, kcal, protein, carbs, fat, max, weight]
//   category: main | starter | salad | side | dessert | drink | extra
//   max = most you can order of one item (default 2), weight = how much of the "main budget" one unit uses (default 1)

const COLA = ["cola", "Coca-Cola (0,4 l)", "Coca-Cola (0.4 l)", "drink", 170, 0, 42, 0];
const COLA_ZERO = ["colazero", "Coca-Cola Zero (0,4 l)", "Coca-Cola Zero (0.4 l)", "drink", 2, 0, 0, 0];

export const CHAINS = [
  {
    id: "mcd",
    name: "McDonald's",
    emoji: "🍔",
    color: "#FFC72C",
    items: [
      ["bigmac", "Big Mac", "Big Mac", "main", 505, 26, 42, 26],
      ["royal", "Royal Cheese", "Royal Cheese", "main", 540, 30, 38, 30],
      ["bigtasty", "Big Tasty", "Big Tasty", "main", 830, 39, 52, 52, 1],
      ["dblcheese", "Double Cheeseburger", "Double Cheeseburger", "main", 440, 26, 33, 23],
      ["cheese", "Cheeseburger", "Cheeseburger", "main", 305, 16, 32, 12, 3, 0.7],
      ["hamburger", "Hamburger", "Hamburger", "main", 255, 13, 31, 9, 3, 0.6],
      ["mcchicken", "McChicken", "McChicken", "main", 400, 15, 42, 19],
      ["mccrispy", "McCrispy", "McCrispy", "main", 490, 26, 48, 21],
      ["filet", "Filet-O-Fish", "Filet-O-Fish", "main", 330, 15, 38, 13],
      ["wrap", "McWrap Chicken", "McWrap Chicken", "main", 520, 27, 47, 24],
      ["nug6", "Chicken McNuggets (6 Stk.)", "Chicken McNuggets (6 pcs)", "starter", 265, 15, 16, 16],
      ["nug9", "Chicken McNuggets (9 Stk.)", "Chicken McNuggets (9 pcs)", "starter", 400, 23, 24, 24],
      ["nug20", "Chicken McNuggets (20 Stk.)", "Chicken McNuggets (20 pcs)", "starter", 880, 51, 53, 53, 1],
      ["chsalad", "Poulet-Salat (gegrillt)", "Grilled chicken salad", "salad", 215, 28, 9, 7],
      ["sidesalad", "Beilagensalat", "Side salad", "salad", 20, 1, 3, 0],
      ["friess", "Pommes klein", "Fries small", "side", 230, 3, 30, 11],
      ["friesm", "Pommes mittel", "Fries medium", "side", 340, 4, 44, 16],
      ["friesl", "Pommes gross", "Fries large", "side", 440, 6, 58, 21],
      ["sundae", "Sundae", "Sundae", "dessert", 230, 5, 38, 6],
      ["mcflurry", "McFlurry", "McFlurry", "dessert", 330, 8, 50, 10],
      COLA,
      COLA_ZERO,
    ],
  },
  {
    id: "bk",
    name: "Burger King",
    emoji: "👑",
    color: "#F5A623",
    items: [
      ["whopper", "Whopper", "Whopper", "main", 660, 28, 50, 37, 1],
      ["dblwhopper", "Double Whopper", "Double Whopper", "main", 910, 52, 51, 54, 1],
      ["whopperjr", "Whopper Jr.", "Whopper Jr.", "main", 370, 17, 33, 19],
      ["bigking", "Big King", "Big King", "main", 530, 28, 40, 29],
      ["cheese", "Cheeseburger", "Cheeseburger", "main", 305, 16, 30, 13, 3, 0.7],
      ["hamburger", "Hamburger", "Hamburger", "main", 255, 14, 30, 9, 3, 0.6],
      ["royale", "Chicken Royale", "Chicken Royale", "main", 580, 25, 52, 30],
      ["crispy", "Crispy Chicken", "Crispy Chicken", "main", 480, 22, 44, 24],
      ["longchicken", "Long Chicken", "Long Chicken", "main", 580, 22, 48, 33],
      ["plant", "Plant-Based Whopper", "Plant-Based Whopper", "main", 590, 24, 54, 30],
      ["nug6", "Chicken Nuggets (6 Stk.)", "Chicken Nuggets (6 pcs)", "starter", 260, 15, 17, 15],
      ["nug9", "Chicken Nuggets (9 Stk.)", "Chicken Nuggets (9 pcs)", "starter", 390, 22, 26, 23],
      ["chsalad", "Crispy-Chicken-Salat", "Crispy chicken salad", "salad", 330, 21, 20, 18],
      ["friesm", "Pommes mittel", "Fries medium", "side", 380, 5, 49, 18],
      ["rings", "Onion Rings (9 Stk.)", "Onion rings (9 pcs)", "side", 330, 4, 40, 17],
      ["sundae", "Sundae", "Sundae", "dessert", 230, 5, 38, 6],
      COLA,
      COLA_ZERO,
    ],
  },
  {
    id: "kfc",
    name: "KFC",
    emoji: "🍗",
    color: "#E4002B",
    items: [
      ["breast", "Original Recipe Brust", "Original Recipe breast", "main", 390, 39, 11, 21, 3, 0.8],
      ["thigh", "Original Recipe Schenkel", "Original Recipe thigh", "main", 280, 19, 9, 19, 3, 0.6],
      ["drum", "Original Recipe Unterschenkel", "Original Recipe drumstick", "main", 130, 12, 4, 8, 4, 0.35],
      ["wing", "Original Recipe Flügel", "Original Recipe wing", "main", 130, 10, 5, 8, 4, 0.35],
      ["tenders", "Tenders (3 Stk.)", "Tenders (3 pcs)", "main", 290, 25, 17, 14, 2, 0.7],
      ["hotwings", "Hot Wings (5 Stk.)", "Hot wings (5 pcs)", "main", 380, 22, 17, 24, 1, 0.8],
      ["zinger", "Zinger Burger", "Zinger burger", "main", 520, 25, 50, 25],
      ["fillet", "Chicken Fillet Burger", "Chicken fillet burger", "main", 440, 27, 40, 19],
      ["twister", "Twister Wrap", "Twister wrap", "main", 480, 23, 45, 23],
      ["popcorn", "Popcorn Chicken (klein)", "Popcorn chicken (small)", "starter", 285, 17, 18, 17],
      ["chsalad", "Chicken-Salat", "Chicken salad", "salad", 250, 24, 12, 12],
      ["friesm", "Pommes mittel", "Fries medium", "side", 340, 4, 44, 16],
      ["wedges", "Wedges (klein)", "Wedges (small)", "side", 280, 4, 35, 14],
      ["slaw", "Coleslaw", "Coleslaw", "side", 150, 1, 13, 10],
      ["corn", "Maiskolben", "Corn on the cob", "side", 130, 3, 21, 3],
      ["cookie", "Cookie", "Cookie", "dessert", 210, 2, 30, 9],
      COLA,
      COLA_ZERO,
    ],
  },
  {
    id: "sub",
    name: "Subway",
    emoji: "🥖",
    color: "#009743",
    items: [
      ["teri6", "Chicken Teriyaki (15 cm)", "Chicken Teriyaki (6 in)", "main", 340, 25, 52, 4, 2],
      ["teri12", "Chicken Teriyaki (30 cm)", "Chicken Teriyaki (12 in)", "main", 680, 50, 104, 8, 1, 1.5],
      ["roast6", "Oven Roasted Chicken (15 cm)", "Oven Roasted Chicken (6 in)", "main", 320, 24, 46, 5, 2],
      ["roast12", "Oven Roasted Chicken (30 cm)", "Oven Roasted Chicken (12 in)", "main", 640, 48, 92, 10, 1, 1.5],
      ["turkey6", "Turkey Breast (15 cm)", "Turkey Breast (6 in)", "main", 280, 18, 46, 3, 2],
      ["turkey12", "Turkey Breast (30 cm)", "Turkey Breast (12 in)", "main", 560, 36, 92, 6, 1, 1.5],
      ["bmt6", "Italian B.M.T. (15 cm)", "Italian B.M.T. (6 in)", "main", 410, 20, 45, 16, 2],
      ["steak6", "Steak & Cheese (15 cm)", "Steak & Cheese (6 in)", "main", 380, 25, 46, 10, 2],
      ["tuna6", "Tuna (15 cm)", "Tuna (6 in)", "main", 450, 19, 44, 22, 2],
      ["meatball6", "Meatball Marinara (15 cm)", "Meatball Marinara (6 in)", "main", 480, 22, 55, 19, 2],
      ["veggie6", "Veggie Delite (15 cm)", "Veggie Delite (6 in)", "main", 230, 9, 44, 2, 2],
      ["chsalad", "Chicken-Teriyaki-Salat", "Chicken Teriyaki salad", "salad", 200, 24, 18, 3],
      ["vegsalad", "Veggie-Salat", "Veggie salad", "salad", 60, 3, 10, 1],
      ["extra", "Extra Poulet (doppelte Portion)", "Extra chicken (double portion)", "extra", 90, 15, 1, 2.5],
      ["chips", "Chips (Tüte)", "Chips (bag)", "side", 150, 2, 15, 9],
      ["cookie", "Cookie", "Cookie", "dessert", 210, 2, 30, 10],
      COLA,
      COLA_ZERO,
    ],
  },
  {
    id: "dom",
    name: "Domino's",
    emoji: "🍕",
    color: "#006491",
    items: [
      ["marg", "Margherita (1 Stück)", "Margherita (1 slice)", "main", 195, 8.5, 25, 6.5, 4, 0.4],
      ["pep", "Pepperoni (1 Stück)", "Pepperoni (1 slice)", "main", 225, 10, 25, 9.5, 4, 0.4],
      ["hawaii", "Hawaii (1 Stück)", "Hawaii (1 slice)", "main", 205, 9, 26, 7, 4, 0.4],
      ["bbq", "BBQ Chicken (1 Stück)", "BBQ Chicken (1 slice)", "main", 215, 11, 26, 7, 4, 0.4],
      ["veggie", "Vegi (1 Stück)", "Veggie (1 slice)", "main", 190, 8, 25, 6, 4, 0.4],
      ["meat", "Meat Lover (1 Stück)", "Meat Lover (1 slice)", "main", 255, 13, 25, 11, 4, 0.4],
      ["carbonara", "Pasta Carbonara", "Pasta Carbonara", "main", 600, 25, 68, 25, 1],
      ["wings", "Chicken Wings (4 Stk.)", "Chicken wings (4 pcs)", "starter", 280, 27, 4, 18],
      ["kickers", "Chicken Kickers (5 Stk.)", "Chicken kickers (5 pcs)", "starter", 270, 19, 18, 13],
      ["caesar", "Chicken-Caesar-Salat", "Chicken Caesar salad", "salad", 330, 28, 14, 18],
      ["garlic", "Knoblauchbrot (2 Stk.)", "Garlic bread (2 pcs)", "side", 250, 6, 30, 12],
      ["lava", "Schoko-Küchlein", "Chocolate lava cake", "dessert", 380, 5, 45, 20],
      COLA,
      COLA_ZERO,
    ],
  },
  {
    id: "ph",
    name: "Pizza Hut",
    emoji: "🍕",
    color: "#EE3124",
    items: [
      ["marg", "Margherita (1 Stück)", "Margherita (1 slice)", "main", 205, 9, 27, 7, 4, 0.4],
      ["pep", "Pepperoni (1 Stück)", "Pepperoni (1 slice)", "main", 250, 11, 27, 11, 4, 0.4],
      ["supreme", "Chicken Supreme (1 Stück)", "Chicken Supreme (1 slice)", "main", 235, 12, 27, 8.5, 4, 0.4],
      ["bbq", "BBQ Chicken (1 Stück)", "BBQ Chicken (1 slice)", "main", 235, 12, 29, 7.5, 4, 0.4],
      ["veggie", "Veggie Supreme (1 Stück)", "Veggie Supreme (1 slice)", "main", 215, 9, 28, 7, 4, 0.4],
      ["meat", "Meat Lovers (1 Stück)", "Meat Lovers (1 slice)", "main", 275, 14, 27, 12, 4, 0.4],
      ["pasta", "Pasta Bolognese", "Pasta Bolognese", "main", 700, 30, 85, 25, 1],
      ["wings", "Chicken Wings (6 Stk.)", "Chicken wings (6 pcs)", "starter", 420, 36, 4, 29, 1],
      ["salad", "Salat (Beilage)", "Side salad", "salad", 120, 3, 12, 7],
      ["sticks", "Breadsticks (2 Stk.)", "Breadsticks (2 pcs)", "side", 230, 6, 34, 7],
      ["dough", "Cookie-Dessert", "Cookie dessert", "dessert", 380, 4, 55, 16],
      COLA,
      COLA_ZERO,
    ],
  },
  {
    id: "doner",
    name: "Döner",
    emoji: "🥙",
    color: "#C77B30",
    items: [
      ["dchicken", "Poulet-Döner (im Brot)", "Chicken doner (in bread)", "main", 600, 38, 55, 22, 1],
      ["dbeef", "Kalbs-Döner (im Brot)", "Veal doner (in bread)", "main", 680, 34, 55, 34, 1],
      ["wchicken", "Poulet-Dürüm", "Chicken wrap", "main", 640, 40, 60, 24, 1],
      ["wbeef", "Fleisch-Dürüm", "Meat wrap", "main", 730, 36, 66, 36, 1],
      ["plate", "Döner-Teller (ohne Brot, mit Salat)", "Doner plate (no bread, with salad)", "main", 480, 40, 12, 30, 2],
      ["falafel", "Falafel-Dürüm", "Falafel wrap", "main", 620, 18, 75, 26, 1],
      ["salad", "Salat (Beilage)", "Side salad", "salad", 80, 2, 8, 4],
      ["fries", "Pommes", "Fries", "side", 380, 5, 50, 18],
      ["baklava", "Baklava (1 Stück)", "Baklava (1 piece)", "dessert", 160, 2, 15, 10],
      ["ayran", "Ayran", "Ayran", "drink", 70, 3, 5, 4],
      COLA,
      COLA_ZERO,
    ],
  },
];

const CAT_ORDER = ["main", "starter", "salad", "side", "extra", "dessert", "drink"];
export const CAT_KEYS = CAT_ORDER;

// row -> object
export function itemsOf(chain) {
  return chain.items.map((r) => ({ id: r[0], de: r[1], en: r[2], cat: r[3], kcal: r[4], p: r[5], c: r[6], f: r[7], max: r[8] || 2, w: r[9] || 1 }));
}

export const sumLines = (lines) => lines.reduce((s, l) => ({ kcal: s.kcal + l.it.kcal * l.qty, p: s.p + l.it.p * l.qty, c: s.c + l.it.c * l.qty, f: s.f + l.it.f * l.qty }), { kcal: 0, p: 0, c: 0, f: 0 });

const MAIN_BUDGET = 2.0; // most "main" units (burgers/subs/pizza slices) in one order

// every multiset of mains whose weights fit MAIN_BUDGET (including none)
function mainSets(mains) {
  const out = [];
  const rec = (i, cur, w) => {
    if (i === mains.length) {
      out.push(cur.slice());
      return;
    }
    const it = mains[i];
    for (let q = 0; q <= it.max && w + q * it.w <= MAIN_BUDGET + 1e-9; q++) {
      if (q) cur.push({ it, qty: q });
      rec(i + 1, cur, w + q * it.w);
      if (q) cur.pop();
    }
  };
  rec(0, [], 0);
  return out;
}

// Finds order variants that fit the budget; returns [{ key, label, lines, tot }] — best first.
//   proteinFirst: the highest-protein order leads, otherwise the lower-fat one does.
export function suggest(chain, budget, proteinFirst = true) {
  const items = itemsOf(chain);
  const by = (cat) => items.filter((i) => i.cat === cat);
  const opt = (arr) => [null, ...arr];
  const drinks = by("drink").filter((d) => d.kcal <= 120 || d.p >= 3); // water is added separately
  const sets = mainSets(by("main"));
  const startersO = opt(by("starter"));
  const saladsO = opt(by("salad"));
  const sidesO = opt(by("side"));
  const extrasO = opt(by("extra"));
  const dessertsO = opt(by("dessert"));
  const drinksO = opt(drinks);
  const combos = [];
  for (const ms of sets) {
    const mk = ms.reduce((s, l) => s + l.it.kcal * l.qty, 0);
    if (mk > budget) continue;
    for (const st of startersO) {
      const k1 = mk + (st ? st.kcal : 0);
      if (k1 > budget) continue;
      for (const sa of saladsO) {
        const k2 = k1 + (sa ? sa.kcal : 0);
        if (k2 > budget) continue;
        for (const si of sidesO) {
          const k3 = k2 + (si ? si.kcal : 0);
          if (k3 > budget) continue;
          for (const ex of extrasO) {
            if (ex && !ms.length) continue;
            const k4 = k3 + (ex ? ex.kcal : 0);
            if (k4 > budget) continue;
            for (const de of dessertsO) {
              const k5 = k4 + (de ? de.kcal : 0);
              if (k5 > budget) continue;
              for (const dr of drinksO) {
                const k6 = k5 + (dr ? dr.kcal : 0);
                if (k6 > budget) continue;
                const lines = ms.map((l) => ({ it: l.it, qty: l.qty }));
                [st, sa, si, ex, de, dr].forEach((x) => x && lines.push({ it: x, qty: 1 }));
                if (!lines.length) continue;
                const tot = sumLines(lines);
                combos.push({ lines, tot, key: lines.map((l) => l.it.id + "x" + l.qty).sort().join("|") });
              }
            }
          }
        }
      }
    }
  }
  if (!combos.length) return [];
  const hasMain = combos.some((c) => c.lines.some((l) => l.it.cat === "main"));
  const pool = hasMain ? combos.filter((c) => c.lines.some((l) => l.it.cat === "main")) : combos;
  const used = new Set();
  const take = (sorted) => {
    const hit = sorted.find((c) => !used.has(c.key));
    if (!hit) return null;
    used.add(hit.key);
    return hit;
  };
  const byProtein = pool.slice().sort((a, b) => b.tot.p - a.tot.p || b.tot.kcal - a.tot.kcal);
  const dense = pool.filter((c) => c.tot.kcal >= budget * 0.5).sort((a, b) => b.tot.p / b.tot.kcal - a.tot.p / a.tot.kcal || b.tot.p - a.tot.p);
  const lean = pool.filter((c) => c.tot.kcal >= budget * 0.6 && (c.tot.f * 9) / Math.max(1, c.tot.kcal) <= 0.34).sort((a, b) => b.tot.p - a.tot.p);
  const a = take(byProtein);
  const b = take(dense);
  const c = take(lean);
  const out = [];
  if (a) out.push({ ...a, label: "ffBestProtein" });
  if (b) out.push({ ...b, label: "ffBestRatio" });
  if (c) out.push({ ...c, label: "ffLowFat" });
  if (!proteinFirst && out.length > 1) {
    const lowFat = out.findIndex((v) => v.label === "ffLowFat");
    if (lowFat > 0) out.unshift(out.splice(lowFat, 1)[0]);
  }
  return out;
}

// drink-only / tiny budgets: what is the smallest real meal here? (for the "raise your budget" hint)
export function smallestMeal(chain) {
  const items = itemsOf(chain).filter((i) => i.cat === "main" || i.cat === "salad");
  return items.reduce((m, i) => (i.kcal < m ? i.kcal : m), 9999);
}
