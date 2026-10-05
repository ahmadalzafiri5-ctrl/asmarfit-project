// Writes catalog/import/menus-drinks-sauces.csv: the soft drinks and sauces that nearly every chain sells, in the usual
// local sizes (all estimates). Chains with a full nutrition table (src "dataset") are left alone.
//   node tools/gen-drinks-sauces.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(HERE, "..", "catalog", "import", "menus-drinks-sauces.csv");

// [english, german, kcal, protein, carbs, fat, category]
const EU_DRINKS = [
  ["Coca-Cola (0.3 l)", "Coca-Cola (0,3 l)", 130, 0, 32, 0, "drink"],
  ["Coca-Cola (0.5 l)", "Coca-Cola (0,5 l)", 215, 0, 53, 0, "drink"],
  ["Coca-Cola Zero (0.5 l)", "Coca-Cola Zero (0,5 l)", 3, 0, 0, 0, "drink"],
  ["Fanta Orange (0.4 l)", "Fanta Orange (0,4 l)", 160, 0, 38, 0, "drink"],
  ["Sprite (0.4 l)", "Sprite (0,4 l)", 150, 0, 37, 0, "drink"],
  ["Iced Tea Lemon (0.4 l)", "Eistee Zitrone (0,4 l)", 120, 0, 29, 0, "drink"],
  ["Apple Juice (0.25 l)", "Apfelsaft (0,25 l)", 115, 0, 27, 0, "drink"],
  ["Milk (0.25 l)", "Milch (0,25 l)", 125, 8, 12, 5, "drink"],
  ["Coffee black", "Kaffee schwarz", 5, 0.5, 0, 0, "drink"],
  ["Espresso", "Espresso", 5, 0.5, 0, 0, "drink"],
  ["Cappuccino", "Cappuccino", 100, 6, 9, 4, "drink"],
  ["Latte Macchiato", "Latte Macchiato", 150, 8, 12, 7, "drink"],
  ["Orange Juice (0.25 l)", "Orangensaft (0,25 l)", 110, 1, 25, 0, "drink"],
  ["Iced Tea Peach (0.4 l)", "Eistee Pfirsich (0,4 l)", 120, 0, 29, 0, "drink"],
];
const EU_SAUCES = [
  ["Ketchup (sachet)", "Ketchup (Beutel)", 20, 0, 5, 0, "extra"],
  ["Mayonnaise (sachet)", "Mayonnaise (Beutel)", 100, 0, 1, 11, "extra"],
  ["BBQ Sauce", "BBQ-Sauce", 45, 0, 10, 0, "extra"],
  ["Sweet & Sour Sauce", "Süss-Sauer-Sauce", 50, 0, 12, 0, "extra"],
  ["Sweet Chili Sauce", "Sweet-Chili-Sauce", 50, 0, 12, 0, "extra"],
  ["Curry Sauce", "Curry-Sauce", 55, 0, 10, 1.5, "extra"],
  ["Mustard Sauce", "Senf-Sauce", 60, 0.5, 4, 5, "extra"],
  ["Garlic Sauce", "Knoblauch-Sauce", 110, 0.5, 2, 12, "extra"],
];
const US_DRINKS = [
  ["Coca-Cola (small)", "Coca-Cola (klein)", 150, 0, 40, 0, "drink"],
  ["Coca-Cola (medium)", "Coca-Cola (mittel)", 210, 0, 55, 0, "drink"],
  ["Coca-Cola (large)", "Coca-Cola (gross)", 290, 0, 76, 0, "drink"],
  ["Diet Coke (medium)", "Diet Coke (mittel)", 0, 0, 0, 0, "drink"],
  ["Sprite (medium)", "Sprite (mittel)", 200, 0, 52, 0, "drink"],
  ["Lemonade (medium)", "Limonade (mittel)", 190, 0, 50, 0, "drink"],
  ["Sweet Tea (medium)", "Süsser Eistee (mittel)", 180, 0, 46, 0, "drink"],
  ["Unsweetened Iced Tea", "Eistee ungesüsst", 0, 0, 0, 0, "drink"],
  ["Orange Juice (small)", "Orangensaft (klein)", 140, 2, 33, 0, "drink"],
  ["2% Milk (small)", "Milch 2 % (klein)", 120, 8, 12, 5, "drink"],
  ["Coffee black", "Kaffee schwarz", 5, 1, 0, 0, "drink"],
];
const US_SAUCES = [
  ["Ranch Dressing", "Ranch-Dressing", 140, 0, 2, 15, "extra"],
  ["BBQ Sauce", "BBQ-Sauce", 45, 0, 11, 0, "extra"],
  ["Honey Mustard Sauce", "Honig-Senf-Sauce", 100, 0, 9, 7, "extra"],
  ["Ketchup (packet)", "Ketchup (Beutel)", 10, 0, 3, 0, "extra"],
  ["Buffalo Sauce", "Buffalo-Sauce", 25, 0, 1, 2.5, "extra"],
  ["Mayonnaise (packet)", "Mayonnaise (Beutel)", 90, 0, 0, 10, "extra"],
];

// restaurant name as in the catalog, set of items. The cafes and the sushi / world kitchens get nothing here.
const PLAN = [
  ["McDonald's", EU_DRINKS, EU_SAUCES],
  ["Burger King", EU_DRINKS, EU_SAUCES],
  ["KFC", EU_DRINKS, EU_SAUCES],
  ["Subway", EU_DRINKS, []],
  ["Domino's", EU_DRINKS, EU_SAUCES.filter((s) => /Ketchup|Garlic|BBQ|Chili/.test(s[0]))],
  ["Pizza Hut", EU_DRINKS, EU_SAUCES.filter((s) => /Ketchup|Garlic|BBQ|Chili/.test(s[0]))],
  ["Döner", EU_DRINKS.filter((d) => !/Latte|Cappuccino|Espresso/.test(d[0])), []],
  ["Wendy's", US_DRINKS, US_SAUCES],
  ["Popeyes", US_DRINKS, US_SAUCES],
  ["Five Guys", US_DRINKS.filter((d) => !/Milk|Juice|Coffee/.test(d[0])), []],
  ["In-N-Out", US_DRINKS.filter((d) => !/Coffee|Juice/.test(d[0])), []],
  ["Shake Shack", US_DRINKS.filter((d) => !/Milk|Juice|Coffee/.test(d[0])), []],
  ["Papa John's", US_DRINKS.filter((d) => !/Milk|Juice|Coffee/.test(d[0])), US_SAUCES.filter((s) => /Ranch|BBQ|Buffalo/.test(s[0]))],
  ["Little Caesars", US_DRINKS.filter((d) => !/Milk|Juice|Coffee/.test(d[0])), US_SAUCES.filter((s) => /Ranch|Buffalo/.test(s[0]))],
  ["Chipotle", US_DRINKS.filter((d) => !/Milk|Coffee/.test(d[0])), []],
  ["Panda Express", US_DRINKS.filter((d) => !/Milk|Juice|Coffee/.test(d[0])), []],
];

const q = (s) => (/[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s);
const lines = ["restaurant,item,item_de,kcal,protein,carbs,fat,category,region,max,weight"];
for (const [name, drinks, sauces] of PLAN) {
  const region = /McDonald's|Burger King|KFC|Subway|Domino's|Pizza Hut|Döner/.test(name) ? "EU" : "US";
  for (const r of [...drinks, ...sauces]) lines.push([q(name), q(r[0]), q(r[1]), r[2], r[3], r[4], r[5], r[6], region, "", ""].join(","));
}
fs.writeFileSync(OUT, lines.join("\n") + "\n");
console.log("Zeilen:", lines.length - 1);
