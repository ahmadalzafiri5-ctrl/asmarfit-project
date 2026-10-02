// Curated everyday foods (per 100 g / 100 ml) so the most common searches always
// return clean, correct entries in both languages, ahead of crowd-sourced data.
// Values are typical reference values (USDA / Bundeslebensmittelschluessel level) —
// meant as sensible defaults, not lab-exact numbers.
// Format: [de, en, kcal, protein, carbs, fat, extra search words, unit]
const RAW = [
  // Fleisch & Fisch
  ["Hähnchenbrust, gegart", "Chicken breast, cooked", 165, 31, 0, 3.6, "huhn hühnchen chicken poulet gebraten gegrillt gebacken grilled"],
  ["Hähnchenbrust, roh", "Chicken breast, raw", 110, 23, 0, 1.5, "huhn hühnchen chicken"],
  ["Hähnchenschenkel, gegart", "Chicken thigh, cooked", 209, 26, 0, 10.9, "huhn hühnchen keule chicken drumstick gebraten gegrillt"],
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
  // Backen & Zutaten
  ["Sauerteig (Anstellgut)", "Sourdough starter", 105, 4, 21, 0.5, "sauerteigstarter sourdough starter"],
  ["Weizenmehl Type 405", "Wheat flour, all-purpose", 348, 10, 73, 1, "mehl flour"],
  ["Vollkornmehl", "Whole wheat flour", 340, 13, 65, 2.5, "mehl flour"],
  ["Hefe, frisch", "Yeast, fresh", 105, 12, 4, 1.1, "hefewürfel yeast"],
  ["Backpulver", "Baking powder", 53, 0, 28, 0, ""],
  ["Speisestärke", "Cornstarch", 381, 0.6, 91, 0.1, "maizena starch"],
  // Saucen & Würzen
  ["Senf", "Mustard", 66, 4.4, 6, 3.3, "mustard"],
  ["Ketchup", "Ketchup", 100, 1.2, 24, 0.2, ""],
  ["Mayonnaise", "Mayonnaise", 680, 1.1, 1, 75, ""],
  ["Sojasauce", "Soy sauce", 53, 8, 5, 0, "soja soy"],
  ["Essig", "Vinegar", 21, 0, 0.4, 0, "vinegar"],
  ["Pesto (Basilikum)", "Pesto (basil)", 450, 4, 5, 46, ""],
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

// Fibre, sugar and salt per 100 g / 100 ml: [fiber g, sugar g, salt g] — typical reference
// values, keyed by the German name. Foods not listed simply show no such values.
const MICRO = {
  "Hähnchenbrust, gegart": [0, 0, 0.2], "Hähnchenbrust, roh": [0, 0, 0.15], "Hähnchenschenkel, gegart": [0, 0, 0.25],
  "Putenbrust, roh": [0, 0, 0.15], "Rinderhack (5% Fett), roh": [0, 0, 0.15], "Rindersteak, gebraten": [0, 0, 0.2],
  "Schweinefilet, roh": [0, 0, 0.15], "Schweinehack, roh": [0, 0, 0.15], "Lachs, roh": [0, 0, 0.1],
  "Thunfisch (Dose, natur)": [0, 0, 0.9], "Kabeljau, roh": [0, 0, 0.2], "Garnelen, gegart": [0, 0, 0.9], "Schinken (Kochschinken)": [0, 0.5, 2.5],
  "Ei (ganz)": [0, 1.1, 0.35], "Eiweiß (Eiklar)": [0, 0.7, 0.4], "Tofu": [1.2, 0.6, 0.02], "Tempeh": [5, 0.5, 0.02], "Whey Protein Pulver": [0, 5, 0.5],
  "Reis, gekocht": [0.4, 0, 0.01], "Reis, roh": [1.3, 0, 0.01], "Vollkornreis, gekocht": [1.8, 0.2, 0.01], "Haferflocken": [10, 1, 0.02],
  "Quinoa, gekocht": [2.8, 0.9, 0.02], "Nudeln, gekocht": [1.8, 0.6, 0.01], "Nudeln, roh": [3, 2.7, 0.02], "Vollkornnudeln, gekocht": [3.9, 0.8, 0.01],
  "Couscous, gekocht": [1.4, 0.1, 0.01], "Kartoffeln, gekocht": [1.8, 0.8, 0.01], "Süßkartoffel, gekocht": [3, 6, 0.1],
  "Vollkornbrot": [7, 3, 1.2], "Weißbrot": [2.7, 5, 1.2], "Brötchen": [3, 2, 1.3], "Wrap (Tortilla)": [3, 3, 1.5], "Knäckebrot": [14, 2, 1.2],
  "Reiswaffeln": [3, 0.5, 0.4], "Cornflakes": [3, 8, 1.8], "Müsli": [8, 15, 0.05],
  "Milch 1,5 % Fett": [0, 4.8, 0.1], "Vollmilch 3,5 % Fett": [0, 4.8, 0.1], "Hafermilch": [0.8, 3.5, 0.1], "Magerquark": [0, 4, 0.1],
  "Speisequark 20 % Fett i.Tr.": [0, 3.5, 0.1], "Skyr natur": [0, 4, 0.1], "Naturjoghurt 3,5 %": [0, 4.7, 0.15], "Griechischer Joghurt": [0, 4, 0.1],
  "Hüttenkäse": [0, 3.4, 0.9], "Mozzarella": [0, 1, 0.6], "Gouda": [0, 0, 1.8], "Parmesan": [0, 0, 1.8], "Feta": [0, 0.5, 2.8],
  "Frischkäse": [0, 3.5, 0.7], "Butter": [0, 0.6, 0.02], "Sahne 30 %": [0, 3.3, 0.08],
  "Apfel": [2.4, 10, 0], "Banane": [2.6, 12, 0], "Orange": [2.4, 9.4, 0], "Erdbeeren": [2, 4.9, 0], "Blaubeeren": [2.4, 10, 0], "Himbeeren": [6.5, 4.4, 0],
  "Weintrauben": [0.9, 16, 0], "Ananas": [1.4, 10, 0], "Mango": [1.6, 14, 0], "Birne": [3.1, 9.8, 0], "Kiwi": [3, 9, 0], "Wassermelone": [0.4, 6, 0],
  "Datteln": [8, 63, 0], "Avocado": [6.7, 0.7, 0.02],
  "Brokkoli": [2.6, 1.7, 0.05], "Tomate": [1.2, 2.6, 0.01], "Gurke": [0.5, 1.7, 0.01], "Karotte": [2.8, 4.7, 0.15], "Paprika": [2.1, 4.2, 0.01],
  "Spinat": [2.2, 0.4, 0.2], "Zucchini": [1, 2.5, 0.01], "Zwiebel": [1.7, 4.2, 0.01], "Salat (Eisberg)": [1.2, 1.8, 0.02], "Champignons": [1, 2, 0.01], "Blumenkohl": [2, 1.9, 0.08],
  "Linsen, gekocht": [7.9, 1.8, 0.01], "Kichererbsen, gekocht": [7.6, 4.8, 0.02], "Kidneybohnen, gekocht": [6.4, 0.3, 0.01],
  "Mandeln": [12, 4, 0.01], "Walnüsse": [6.7, 2.6, 0.01], "Erdnüsse": [8.5, 4, 0.02], "Cashewnüsse": [3.3, 6, 0.03], "Erdnussbutter": [6, 9, 1.1],
  "Olivenöl": [0, 0, 0], "Kokosöl": [0, 0, 0], "Honig": [0.2, 82, 0.01], "Zucker": [0, 100, 0], "Marmelade": [1, 55, 0.02],
  "Nutella (Nuss-Nougat-Creme)": [3.4, 56, 0.1], "Zartbitterschokolade": [11, 30, 0.02], "Vollmilchschokolade": [3, 56, 0.2], "Chiasamen": [34, 0, 0.05], "Leinsamen": [27, 1.5, 0.1],
  "Pizza Margherita": [2.3, 3.5, 1.3], "Döner Kebab": [2, 3, 1.6], "Pommes frites": [3.8, 0.5, 0.9], "Hamburger": [1.5, 5, 1.3], "Croissant": [2.5, 10, 1.2],
  "Kartoffelchips": [4.5, 0.5, 1.6], "Gummibärchen": [0, 46, 0.05], "Vanilleeis": [0.5, 21, 0.2], "Lasagne": [1.2, 3, 0.9],
  "Sauerteig (Anstellgut)": [1.5, 1, 0.7], "Weizenmehl Type 405": [3.5, 0.5, 0.01], "Vollkornmehl": [10, 1, 0.01], "Hefe, frisch": [8, 0, 0.1],
  "Speisestärke": [0.9, 0, 0.02], "Senf": [3, 3, 3.5], "Ketchup": [0.9, 22, 2.7], "Mayonnaise": [0, 2, 1.5], "Sojasauce": [0.8, 0.4, 15],
  "Essig": [0, 0.4, 0.05], "Pesto (Basilikum)": [3, 2, 1.5],
  "Wasser": [0, 0, 0], "Cola": [0, 10.6, 0], "Cola Zero / Light": [0, 0, 0.02], "Orangensaft": [0.2, 8.5, 0], "Apfelsaft": [0.2, 10, 0],
  "Kaffee, schwarz": [0, 0, 0], "Bier": [0, 0.3, 0], "Rotwein": [0, 0.6, 0], "Energy Drink": [0, 11, 0.07],
};

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
  per100: { kcal, protein, carbs, fat, ...(MICRO[de] ? { fiber: MICRO[de][0], sugar: MICRO[de][1], salt: MICRO[de][2] } : {}) },
  unit: unit || "g",
  words: tokensOf(`${de} ${en} ${kw || ""}`),
  deFold: fold(de),
  enFold: fold(en),
}));

// Edit distance with adjacent transpositions ("hafre" -> "hafer" counts as 1).
function editDistance(a, b) {
  const al = a.length;
  const bl = b.length;
  if (!al) return bl;
  if (!bl) return al;
  const d = Array.from({ length: al + 1 }, (_, i) => [i, ...Array(bl).fill(0)]);
  for (let j = 0; j <= bl; j++) d[0][j] = j;
  for (let i = 1; i <= al; i++) {
    for (let j = 1; j <= bl; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
  }
  return d[al][bl];
}

// How well does one typed token match one word? 0 = exact prefix, 1-2 = that many
// typos (compared against the word's start so half-typed words work too), -1 = no.
function tokenScore(tok, word) {
  if (word.startsWith(tok)) return 0;
  if (tok.length < 4) return -1;
  const maxD = tok.length <= 5 ? 1 : 2;
  const d = Math.min(editDistance(tok, word.slice(0, tok.length)), editDistance(tok, word));
  return d <= maxD ? d : -1;
}

/** Basics matching the query — typo-tolerant; exact matches rank ahead of fuzzy ones. */
function searchBasics(query, lang) {
  const tokens = tokensOf(query);
  if (!tokens.length) return [];
  const hits = [];
  for (const b of BASICS) {
    let typos = 0;
    let ok = true;
    for (const t of tokens) {
      let best = -1;
      for (const w of b.words) {
        const sc = tokenScore(t, w);
        if (sc === 0) { best = 0; break; }
        if (sc > 0 && (best === -1 || sc < best)) best = sc;
      }
      if (best === -1) { ok = false; break; }
      typos += best;
    }
    if (!ok) continue;
    const name = lang === "de" ? b.de : b.en;
    const nameFold = lang === "de" ? b.deFold : b.enFold;
    const first = tokens[0];
    // exact name / name starts with query rank ahead of keyword-only matches
    const nameScore = nameFold === tokens.join(" ") ? 0 : nameFold.startsWith(first) ? 1 : nameFold.includes(first) ? 2 : 3;
    // Tagged like a generic/homemade entry (the way Yazio marks its own generic
    // foods) so it reads clearly as "the plain version" next to branded results.
    const brand = lang === "de" ? "Hausgemacht" : "Homemade";
    hits.push({
      score: (typos > 0 ? 10 : 0) + typos + nameScore,
      item: { source: "basic", name, brand, unit: b.unit, per100: b.per100, isSupplement: false, note: null },
    });
  }
  return hits.sort((x, y) => x.score - y.score).map((h) => h.item);
}

// Vocabulary of known food words (original spelling), used to repair typos in the
// text we forward to USDA / Open Food Facts, which cope badly with misspellings.
// Compound words also contribute their stems ("hähnchenbrust" -> "hähnchen"), since
// people search for the stem.
const VOCAB = [
  ...new Set(
    RAW.flatMap(([de, en, , , , , kw]) => `${de} ${en} ${kw || ""}`.toLowerCase().split(/[^\p{L}\p{N}]+/u))
      .filter((w) => w.length >= 4)
      .flatMap((w) => Array.from({ length: Math.max(0, w.length - 4) }, (_, i) => w.slice(0, 5 + i)).filter((p) => p.length >= 5 || p === w).concat(w))
  ),
].map((orig) => ({ orig, folded: fold(orig) }));

/** "bannane" -> "banane", "hänchen" -> "hähnchen". Unknown words are left alone. */
function correctQuery(query) {
  let changed = false;
  const out = String(query)
    .trim()
    .split(/\s+/)
    .map((word) => {
      const f = fold(word);
      if (f.length < 4 || VOCAB.some((v) => v.folded.startsWith(f))) return word;
      const maxD = f.length <= 5 ? 1 : 2;
      const raw = word.toLowerCase();
      let best = null;
      for (const v of VOCAB) {
        const d = editDistance(f, v.folded);
        if (d > maxD) continue;
        // ties: prefer the candidate closer in original spelling (keeps umlauts straight)
        const d2 = editDistance(raw, v.orig);
        if (!best || d < best.d || (d === best.d && d2 < best.d2) || (d === best.d && d2 === best.d2 && v.orig.length < best.v.orig.length)) best = { d, d2, v };
      }
      if (!best) return word;
      changed = true;
      return best.v.orig;
    })
    .join(" ");
  return changed ? out : String(query).trim();
}

export { searchBasics, correctQuery, fold, tokensOf };
