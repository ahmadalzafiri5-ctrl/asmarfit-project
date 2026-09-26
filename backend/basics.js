// Curated everyday foods (per 100 g / 100 ml) so the most common searches always
// return clean, correct entries in both languages, ahead of crowd-sourced data.
// Values are typical reference values (USDA / Bundeslebensmittelschluessel level) —
// meant as sensible defaults, not lab-exact numbers.
// Format: [de, en, kcal, protein, carbs, fat, extra search words, unit]
const RAW = [
  // Fleisch & Fisch
  ["Hähnchenbrust, gegart", "Chicken breast, cooked", 165, 31, 0, 3.6, "huhn hühnchen chicken poulet"],
  ["Hähnchenbrust, roh", "Chicken breast, raw", 110, 23, 0, 1.5, "huhn hühnchen chicken"],
  ["Hähnchenschenkel, gegart", "Chicken thigh, cooked", 209, 26, 0, 10.9, "huhn hühnchen keule chicken drumstick"],
  ["Putenbrust, roh", "Turkey breast, raw", 107, 24, 0, 1, "pute truthahn turkey"],
  ["Rinderhack (5% Fett), roh", "Ground beef 5% fat, raw", 137, 21, 0, 5, "hackfleisch rind beef mince"],
  ["Rindersteak, gebraten", "Beef steak, cooked", 183, 27, 0, 8, "rindfleisch beef sirloin"],
  ["Schweinefilet, roh", "Pork tenderloin, raw", 110, 22, 0, 2, "schwein pork"],
  ["Schweinehack, roh", "Ground pork, raw", 250, 17, 0, 20, "hackfleisch schwein pork mince"],
  ["Lachs, roh", "Salmon, raw", 208, 20, 0, 13, "salmon fisch"],
  ["Thunfisch (Dose, natur)", "Tuna, canned in water", 116, 26, 0, 1, "tuna fisch"],
  ["Kabeljau, roh", "Cod, raw", 82, 18, 0, 0.7, "dorsch fisch cod"],
  ["Garnelen, gegart", "Shrimp, cooked", 99, 24, 0.2, 0.3, "crevetten shrimp prawns"],
  ["Schinken (Kochschinken)", "Ham, cooked", 107, 18, 1, 3.5, "ham"],
  // Eier, Tofu, Proteinpulver
  ["Ei (ganz)", "Egg, whole", 155, 13, 1.1, 11, "eier hühnerei egg eggs"],
  ["Eiweiß (Eiklar)", "Egg white", 52, 11, 0.7, 0.2, "ei eiklar egg whites"],
  ["Tofu", "Tofu", 76, 8, 1.9, 4.8, ""],
  ["Tempeh", "Tempeh", 192, 20, 7.6, 11, ""],
  ["Whey Protein Pulver", "Whey protein powder", 380, 75, 8, 6, "eiweißpulver proteinpulver protein shake"],
  // Getreide, Brot
  ["Reis, gekocht", "White rice, cooked", 130, 2.7, 28, 0.3, "rice"],
  ["Reis, roh", "White rice, raw", 350, 7, 78, 0.6, "rice"],
  ["Vollkornreis, gekocht", "Brown rice, cooked", 123, 2.7, 26, 1, "naturreis rice"],
  ["Haferflocken", "Oats, rolled", 372, 13.5, 60, 7, "hafer oatmeal porridge oats"],
  ["Quinoa, gekocht", "Quinoa, cooked", 120, 4.4, 21, 1.9, ""],
  ["Nudeln, gekocht", "Pasta, cooked", 131, 5, 25, 1.1, "spaghetti pasta makkaroni penne"],
  ["Nudeln, roh", "Pasta, dry", 356, 12.5, 71, 1.5, "spaghetti pasta makkaroni penne"],
  ["Vollkornnudeln, gekocht", "Whole wheat pasta, cooked", 124, 5, 25, 1.1, "pasta"],
  ["Couscous, gekocht", "Couscous, cooked", 112, 3.8, 23, 0.2, ""],
  ["Kartoffeln, gekocht", "Potato, boiled", 77, 2, 17, 0.1, "kartoffel potato potatoes salzkartoffeln"],
  ["Süßkartoffel, gekocht", "Sweet potato, cooked", 86, 1.6, 20, 0.1, "süsskartoffel sweet potato"],
  ["Vollkornbrot", "Whole grain bread", 230, 8, 41, 2, "brot bread"],
  ["Weißbrot", "White bread", 265, 9, 49, 3.2, "brot bread toast"],
  ["Brötchen", "Bread roll", 280, 9, 56, 1.5, "semmel weggli brot roll bun"],
  ["Wrap (Tortilla)", "Tortilla wrap", 310, 8, 48, 8, "tortilla"],
  ["Knäckebrot", "Crispbread", 335, 10, 62, 1.5, "knaeckebrot"],
  ["Reiswaffeln", "Rice cakes", 387, 8, 82, 2.8, "reiskuchen"],
  ["Cornflakes", "Corn flakes", 357, 7, 84, 0.9, "frühstücksflocken cereal"],
  ["Müsli", "Muesli", 370, 10, 64, 6, "granola"],
  // Milchprodukte
  ["Milch 1,5 % Fett", "Milk, low fat 1.5%", 47, 3.4, 4.8, 1.5, "milch fettarme milk"],
  ["Vollmilch 3,5 % Fett", "Whole milk", 64, 3.3, 4.8, 3.6, "milch milk"],
  ["Hafermilch", "Oat milk", 45, 1, 6.5, 1.5, "haferdrink oat drink milch"],
  ["Magerquark", "Low-fat quark", 67, 12, 4, 0.3, "quark"],
  ["Speisequark 20 % Fett i.Tr.", "Quark 20%", 110, 12, 3.5, 5, "quark"],
  ["Skyr natur", "Skyr, plain", 63, 11, 4, 0.2, "joghurt yogurt"],
  ["Naturjoghurt 3,5 %", "Plain yogurt", 61, 3.5, 4.7, 3.5, "joghurt yoghurt yogurt"],
  ["Griechischer Joghurt", "Greek yogurt", 133, 6, 4, 10, "joghurt yogurt"],
  ["Hüttenkäse", "Cottage cheese", 98, 11, 3.4, 4.3, "körniger frischkäse cottage"],
  ["Mozzarella", "Mozzarella", 250, 18, 2, 19, "käse cheese"],
  ["Gouda", "Gouda cheese", 356, 25, 0, 28, "käse cheese"],
  ["Parmesan", "Parmesan", 431, 38, 4, 29, "käse cheese"],
  ["Feta", "Feta", 264, 14, 4, 21, "käse cheese schafskäse"],
  ["Frischkäse", "Cream cheese", 250, 6, 4, 23, "käse philadelphia"],
  ["Butter", "Butter", 741, 0.7, 0.6, 83, ""],
  ["Sahne 30 %", "Cream 30%", 292, 2.4, 3.3, 30, "rahm schlagsahne cream"],
  // Obst
  ["Apfel", "Apple", 52, 0.3, 14, 0.2, "äpfel apples"],
  ["Banane", "Banana", 89, 1.1, 23, 0.3, "bananen"],
  ["Orange", "Orange", 47, 0.9, 12, 0.1, "orangen"],
  ["Erdbeeren", "Strawberries", 32, 0.7, 8, 0.3, "erdbeere strawberry"],
  ["Blaubeeren", "Blueberries", 57, 0.7, 14, 0.3, "heidelbeeren blueberry"],
  ["Himbeeren", "Raspberries", 52, 1.2, 12, 0.7, "himbeere raspberry"],
  ["Weintrauben", "Grapes", 69, 0.7, 18, 0.2, "trauben grape"],
  ["Ananas", "Pineapple", 50, 0.5, 13, 0.1, ""],
  ["Mango", "Mango", 60, 0.8, 15, 0.4, ""],
  ["Birne", "Pear", 57, 0.4, 15, 0.1, "birnen"],
  ["Kiwi", "Kiwi", 61, 1.1, 15, 0.5, ""],
  ["Wassermelone", "Watermelon", 30, 0.6, 8, 0.2, "melone"],
  ["Datteln", "Dates", 282, 2.5, 75, 0.4, "dattel"],
  ["Avocado", "Avocado", 160, 2, 9, 15, ""],
  // Gemüse
  ["Brokkoli", "Broccoli", 34, 2.8, 7, 0.4, "broccoli"],
  ["Tomate", "Tomato", 18, 0.9, 3.9, 0.2, "tomaten tomatoes"],
  ["Gurke", "Cucumber", 15, 0.7, 3.6, 0.1, "salatgurke"],
  ["Karotte", "Carrot", 41, 0.9, 10, 0.2, "karotten möhre möhren rüebli carrots"],
  ["Paprika", "Bell pepper", 31, 1, 6, 0.3, "peperoni pepper"],
  ["Spinat", "Spinach", 23, 2.9, 3.6, 0.4, ""],
  ["Zucchini", "Zucchini", 17, 1.2, 3.1, 0.3, "courgette"],
  ["Zwiebel", "Onion", 40, 1.1, 9, 0.1, "zwiebeln onions"],
  ["Salat (Eisberg)", "Lettuce", 14, 0.9, 3, 0.1, "eisbergsalat kopfsalat salad"],
  ["Champignons", "Mushrooms", 22, 3.1, 3.3, 0.3, "pilze mushroom"],
  ["Blumenkohl", "Cauliflower", 25, 1.9, 5, 0.3, ""],
  // Hülsenfrüchte
  ["Linsen, gekocht", "Lentils, cooked", 116, 9, 20, 0.4, "lentils"],
  ["Kichererbsen, gekocht", "Chickpeas, cooked", 164, 8.9, 27, 2.6, "chickpeas hummus"],
  ["Kidneybohnen, gekocht", "Kidney beans, cooked", 127, 8.7, 23, 0.5, "bohnen beans"],
  // Nüsse, Fette, Süsses
  ["Mandeln", "Almonds", 579, 21, 22, 50, "almond nüsse nuts"],
  ["Walnüsse", "Walnuts", 654, 15, 14, 65, "walnuss walnut nüsse nuts"],
  ["Erdnüsse", "Peanuts", 567, 26, 16, 49, "erdnuss peanut nüsse nuts"],
  ["Cashewnüsse", "Cashews", 553, 18, 30, 44, "cashew nüsse nuts"],
  ["Erdnussbutter", "Peanut butter", 588, 25, 20, 50, "peanutbutter erdnussmus"],
  ["Olivenöl", "Olive oil", 884, 0, 0, 100, "öl oil"],
  ["Kokosöl", "Coconut oil", 862, 0, 0, 100, "öl oil"],
  ["Honig", "Honey", 304, 0.3, 82, 0, ""],
  ["Zucker", "Sugar", 400, 0, 100, 0, ""],
  ["Marmelade", "Jam", 250, 0.4, 60, 0.1, "konfitüre confiture"],
  ["Nutella (Nuss-Nougat-Creme)", "Nutella (hazelnut spread)", 539, 6.3, 57.5, 30.9, "nussnougat haselnuss"],
  ["Zartbitterschokolade", "Dark chocolate", 546, 5, 60, 31, "schokolade chocolate"],
  ["Vollmilchschokolade", "Milk chocolate", 535, 7.7, 59, 30, "schokolade chocolate"],
  ["Chiasamen", "Chia seeds", 486, 17, 42, 31, "chia"],
  ["Leinsamen", "Flaxseed", 534, 18, 29, 42, "leinsaat flax"],
  // Fertiges, Snacks
  ["Pizza Margherita", "Pizza, margherita", 266, 11, 33, 10, ""],
  ["Döner Kebab", "Doner kebab", 215, 12, 16, 11, "kebap"],
  ["Pommes frites", "French fries", 312, 3.4, 41, 15, "fries pommes chips"],
  ["Hamburger", "Hamburger", 254, 13, 31, 9, "burger cheeseburger"],
  ["Croissant", "Croissant", 406, 8, 46, 21, "gipfeli"],
  ["Kartoffelchips", "Potato chips", 536, 6.5, 53, 33, "chips crisps"],
  ["Gummibärchen", "Gummy bears", 343, 6.9, 77, 0.5, "gummibaerchen fruchtgummi"],
  ["Vanilleeis", "Vanilla ice cream", 207, 3.5, 24, 11, "eis eiscreme glace"],
  ["Lasagne", "Lasagna", 135, 7.5, 12, 6, ""],
  // Getränke (pro 100 ml)
  ["Wasser", "Water", 0, 0, 0, 0, "mineralwasser leitungswasser", "ml"],
  ["Cola", "Cola", 42, 0, 10.6, 0, "coca coke pepsi", "ml"],
  ["Cola Zero / Light", "Cola zero / diet", 0, 0, 0, 0, "zero light diet", "ml"],
  ["Orangensaft", "Orange juice", 45, 0.7, 10, 0.2, "saft juice", "ml"],
  ["Apfelsaft", "Apple juice", 46, 0.1, 11, 0.1, "saft juice", "ml"],
  ["Kaffee, schwarz", "Coffee, black", 1, 0.1, 0, 0, "coffee espresso", "ml"],
  ["Bier", "Beer", 43, 0.5, 3.6, 0, "pils lager", "ml"],
  ["Rotwein", "Red wine", 85, 0.1, 2.6, 0, "wein wine", "ml"],
  ["Energy Drink", "Energy drink", 45, 0, 11, 0, "redbull monster", "ml"],
];

// Fold for accent-/case-insensitive matching (ä→a, ö→o, ü→u, ß→ss, ae→a ...).
// Applied to both the query and the entries, so it only has to be consistent.
function fold(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/ß/g, "ss")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ae/g, "a")
    .replace(/oe/g, "o")
    .replace(/ue/g, "u");
}

const tokensOf = (q) => fold(q).split(/[^a-z0-9]+/).filter(Boolean);

const BASICS = RAW.map(([de, en, kcal, protein, carbs, fat, kw, unit]) => ({
  de,
  en,
  per100: { kcal, protein, carbs, fat },
  unit: unit || "g",
  words: tokensOf(`${de} ${en} ${kw || ""}`),
  deFold: fold(de),
  enFold: fold(en),
}));

/** Basics matching the query: every query token must prefix-match a word of the entry. */
function searchBasics(query, lang) {
  const tokens = tokensOf(query);
  if (!tokens.length) return [];
  const hits = [];
  for (const b of BASICS) {
    if (!tokens.every((t) => b.words.some((w) => w.startsWith(t)))) continue;
    const name = lang === "de" ? b.de : b.en;
    const nameFold = lang === "de" ? b.deFold : b.enFold;
    const first = tokens[0];
    // exact name / name starts with query rank ahead of keyword-only matches
    const score = nameFold === tokens.join(" ") ? 0 : nameFold.startsWith(first) ? 1 : nameFold.includes(first) ? 2 : 3;
    hits.push({
      score,
      item: { source: "basic", name, brand: null, unit: b.unit, per100: b.per100, isSupplement: false, note: null },
    });
  }
  return hits.sort((a, b) => a.score - b.score).map((h) => h.item);
}

export { searchBasics, fold, tokensOf };
