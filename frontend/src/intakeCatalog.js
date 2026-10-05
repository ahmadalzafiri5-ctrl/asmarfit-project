// Name list for the intake diary: pick a substance, the amount is typed in by the user.
// Only names, the usual form (injection / oral / gel) and a unit to start with. No doses, no cycles, no advice of any kind.
// Not on the list? The diary also takes any name typed in by hand.
// Row: [name, aliases (for the search), route, unit, group]
export const INTAKE_GROUPS = [
  { k: "inj", de: "Testosteron & Anabolika", en: "Testosterone & anabolics" },
  { k: "oral", de: "Orale", en: "Orals" },
  { k: "pct", de: "Anti-Östrogen / PCT", en: "Anti-estrogen / PCT" },
  { k: "horm", de: "Hormone", en: "Hormones" },
  { k: "gh", de: "Wachstumshormon-Peptide", en: "Growth hormone peptides" },
  { k: "pep", de: "Weitere Peptide", en: "Other peptides" },
  { k: "glp", de: "Abnehm-Spritzen (GLP-1)", en: "Weight-loss injections (GLP-1)" },
  { k: "sarm", de: "SARMs", en: "SARMs" },
  { k: "supp", de: "Ergänzungen & Begleitmittel", en: "Supplements & support" },
];

const R = [
  // injectable androgens and anabolics
  ["Testosteron Enantat", "testosterone enanthate test e delatestryl", "inject", "mg", "inj"],
  ["Testosteron Cypionat", "testosterone cypionate test cyp depo-testosterone", "inject", "mg", "inj"],
  ["Testosteron Propionat", "testosterone propionate test prop", "inject", "mg", "inj"],
  ["Testosteron Undecanoat", "testosterone undecanoate nebido aveed", "inject", "mg", "inj"],
  ["Testosteron-Mix (Sustanon)", "sustanon omnadren testosterone blend mix", "inject", "mg", "inj"],
  ["Testosteron Gel", "testosterone gel testogel androgel", "gel", "mg", "inj"],
  ["Nandrolon Decanoat", "nandrolone decanoate deca durabolin", "inject", "mg", "inj"],
  ["Nandrolon Phenylpropionat", "nandrolone phenylpropionate npp", "inject", "mg", "inj"],
  ["Trenbolon Acetat", "trenbolone acetate tren ace", "inject", "mg", "inj"],
  ["Trenbolon Enantat", "trenbolone enanthate tren e", "inject", "mg", "inj"],
  ["Boldenon Undecylenat", "boldenone undecylenate equipoise eq", "inject", "mg", "inj"],
  ["Drostanolon", "drostanolone masteron propionate enanthate", "inject", "mg", "inj"],
  ["Methenolon Enantat", "methenolone enanthate primobolan primo depot", "inject", "mg", "inj"],
  ["Stanozolol (Spritze)", "stanozolol winstrol depot winny", "inject", "mg", "inj"],
  // oral androgens
  ["Methandienon", "methandienone dianabol dbol d-bol", "oral", "mg", "oral"],
  ["Oxandrolon", "oxandrolone anavar var", "oral", "mg", "oral"],
  ["Stanozolol (oral)", "stanozolol winstrol winny tabletten", "oral", "mg", "oral"],
  ["Chlordehydromethyltestosteron", "turinabol tbol oral-turinabol", "oral", "mg", "oral"],
  ["Oxymetholon", "oxymetholone anadrol a-bomb", "oral", "mg", "oral"],
  ["Fluoxymesteron", "fluoxymesterone halotestin halo", "oral", "mg", "oral"],
  ["Methenolon (oral)", "methenolone acetate primobolan tabletten", "oral", "mg", "oral"],
  ["Mesterolon", "mesterolone proviron", "oral", "mg", "oral"],
  ["Methyltestosteron", "methyltestosterone", "oral", "mg", "oral"],
  // anti-estrogens, AIs, PCT and similar
  ["Tamoxifen", "nolvadex tamox", "oral", "mg", "pct"],
  ["Clomifen", "clomiphene clomid", "oral", "mg", "pct"],
  ["Enclomifen", "enclomiphene", "oral", "mg", "pct"],
  ["Anastrozol", "anastrozole arimidex adex", "oral", "mg", "pct"],
  ["Letrozol", "letrozole femara", "oral", "mg", "pct"],
  ["Exemestan", "exemestane aromasin", "oral", "mg", "pct"],
  ["Raloxifen", "raloxifene evista", "oral", "mg", "pct"],
  ["Cabergolin", "cabergoline dostinex caber", "oral", "mg", "pct"],
  ["Finasterid", "finasteride proscar propecia", "oral", "mg", "pct"],
  ["Dutasterid", "dutasteride avodart", "oral", "mg", "pct"],
  // hormones
  ["hCG (Choriongonadotropin)", "hcg human chorionic gonadotropin pregnyl ovitrelle", "inject", "IE", "horm"],
  ["HMG / FSH", "hmg fsh menopur gonal-f follitropin", "inject", "IE", "horm"],
  ["Wachstumshormon (Somatropin)", "hgh gh somatropin growth hormone genotropin norditropin", "inject", "IE", "horm"],
  ["IGF-1 LR3", "igf-1 igf1 lr3 long r3", "inject", "mcg", "horm"],
  ["L-Thyroxin (T4)", "levothyroxine l-thyroxin euthyrox t4", "oral", "mcg", "horm"],
  ["Liothyronin (T3)", "liothyronine t3 cytomel thybon", "oral", "mcg", "horm"],
  ["Oxytocin", "oxytocin nasal", "other", "IE", "horm"],
  // growth hormone secretagogues
  ["CJC-1295 (ohne DAC)", "cjc 1295 no dac mod grf 1-29 modified grf", "inject", "mcg", "gh"],
  ["CJC-1295 (mit DAC)", "cjc 1295 dac", "inject", "mg", "gh"],
  ["Ipamorelin", "ipamorelin ipa", "inject", "mcg", "gh"],
  ["GHRP-2", "ghrp2 ghrp-2 pralmorelin", "inject", "mcg", "gh"],
  ["GHRP-6", "ghrp6 ghrp-6", "inject", "mcg", "gh"],
  ["Hexarelin", "hexarelin", "inject", "mcg", "gh"],
  ["Sermorelin", "sermorelin", "inject", "mcg", "gh"],
  ["Tesamorelin", "tesamorelin egrifta", "inject", "mg", "gh"],
  ["MK-677 (Ibutamoren)", "mk677 mk-677 ibutamoren nutrobal", "oral", "mg", "gh"],
  // other peptides
  ["BPC-157", "bpc157 bpc 157 body protection compound", "inject", "mcg", "pep"],
  ["TB-500 (Thymosin Beta-4)", "tb500 tb-500 thymosin beta 4", "inject", "mg", "pep"],
  ["GHK-Cu", "ghk cu copper peptide", "inject", "mg", "pep"],
  ["Thymosin Alpha-1", "thymosin alpha 1 ta1 zadaxin", "inject", "mg", "pep"],
  ["Selank", "selank", "other", "mcg", "pep"],
  ["Semax", "semax", "other", "mcg", "pep"],
  ["PT-141 (Bremelanotid)", "pt141 pt-141 bremelanotide", "inject", "mg", "pep"],
  ["Melanotan II", "melanotan 2 mt2 mt-2", "inject", "mg", "pep"],
  ["Epitalon", "epitalon epithalon", "inject", "mg", "pep"],
  ["DSIP", "delta sleep inducing peptide dsip", "inject", "mcg", "pep"],
  ["MOTS-c", "motsc mots-c", "inject", "mg", "pep"],
  ["SS-31 (Elamipretid)", "ss31 ss-31 elamipretide", "inject", "mg", "pep"],
  ["AOD-9604", "aod9604 aod 9604", "inject", "mcg", "pep"],
  ["Kisspeptin-10", "kisspeptin kisspeptin-10", "inject", "mcg", "pep"],
  ["LL-37", "ll37 ll-37", "inject", "mcg", "pep"],
  ["KPV", "kpv", "inject", "mcg", "pep"],
  ["NAD+", "nad nad+ nicotinamide adenine dinucleotide", "inject", "mg", "pep"],
  ["Follistatin 344", "follistatin 344 fst344", "inject", "mcg", "pep"],
  // GLP-1 and similar
  ["Semaglutid", "semaglutide ozempic wegovy rybelsus", "inject", "mg", "glp"],
  ["Tirzepatid", "tirzepatide mounjaro zepbound", "inject", "mg", "glp"],
  ["Liraglutid", "liraglutide saxenda victoza", "inject", "mg", "glp"],
  ["Retatrutid", "retatrutide", "inject", "mg", "glp"],
  ["Cagrilintid", "cagrilintide", "inject", "mg", "glp"],
  // SARMs
  ["Ostarin (MK-2866)", "ostarine enobosarm mk2866 mk-2866", "oral", "mg", "sarm"],
  ["Ligandrol (LGD-4033)", "ligandrol lgd4033 lgd-4033", "oral", "mg", "sarm"],
  ["Testolon (RAD-140)", "testolone rad140 rad-140", "oral", "mg", "sarm"],
  ["Andarin (S4)", "andarine s4", "oral", "mg", "sarm"],
  ["Cardarin (GW-501516)", "cardarine gw501516 gw-501516", "oral", "mg", "sarm"],
  ["Stenabolic (SR9009)", "stenabolic sr9009", "oral", "mg", "sarm"],
  ["YK-11", "yk11 yk-11", "oral", "mg", "sarm"],
  // supplements and support
  ["Kreatin", "creatine monohydrate", "oral", "g", "supp"],
  ["Koffein", "caffeine", "oral", "mg", "supp"],
  ["Vitamin D3", "vitamin d d3 cholecalciferol", "oral", "IE", "supp"],
  ["Omega-3", "omega 3 fish oil fischöl epa dha", "oral", "mg", "supp"],
  ["Magnesium", "magnesium", "oral", "mg", "supp"],
  ["Zink", "zinc zink", "oral", "mg", "supp"],
  ["TUDCA", "tudca tauroursodeoxycholic", "oral", "mg", "supp"],
  ["NAC (N-Acetylcystein)", "nac n-acetylcysteine acc", "oral", "mg", "supp"],
  ["Berberin", "berberine", "oral", "mg", "supp"],
  ["Metformin", "metformin", "oral", "mg", "supp"],
  ["Telmisartan", "telmisartan micardis", "oral", "mg", "supp"],
  ["Candesartan", "candesartan atacand", "oral", "mg", "supp"],
];

export const INTAKE_CATALOG = R.map(([n, a, r, u, g]) => ({ n, a: n.toLowerCase() + " " + a, r, u, g }));

export function searchIntake(query, group) {
  const toks = String(query || "").toLowerCase().split(/\s+/).filter(Boolean);
  return INTAKE_CATALOG.filter((x) => (group === "all" || x.g === group) && toks.every((tok) => x.a.includes(tok)));
}
