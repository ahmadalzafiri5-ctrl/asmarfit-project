// Country helpers: the user picks the country they shop in (ISO 3166-1 alpha-2, e.g. "CH"). Names always come from Intl,
// never from free text, so nothing the app sends can end up as an instruction in an AI prompt.

// Open Food Facts country tags are the English name in lower case with dashes ("en:switzerland"); these differ from Intl:
const OFF_SLUG = {
  CZ: "czech-republic", TR: "turkey", US: "united-states", GB: "united-kingdom", KR: "south-korea", KP: "north-korea", RU: "russia",
  CI: "ivory-coast", MM: "myanmar", MK: "north-macedonia", CD: "democratic-republic-of-the-congo", CG: "republic-of-the-congo",
  TW: "taiwan", HK: "hong-kong", MO: "macau", VN: "vietnam", LA: "laos", BO: "bolivia", VE: "venezuela", IR: "iran", SY: "syria",
  MD: "moldova", TZ: "tanzania", PS: "palestinian-territories", BN: "brunei", CV: "cape-verde", SZ: "eswatini", TL: "east-timor",
  VA: "vatican-city", FM: "micronesia", XK: "kosovo",
};

const names = {};
const displayNames = (lang) => (names[lang] = names[lang] || new Intl.DisplayNames([lang], { type: "region" }));

export function countryNameFor(cc, lang = "en") {
  try {
    const n = displayNames(lang === "de" ? "de" : "en").of(cc);
    return n && n !== cc && !/^(Unknown Region|Unbekannte Region)$/.test(n) ? n : null; // "ZZ" is the code for "unknown"
  } catch {
    return null;
  }
}

export const isCountryCode = (cc) => typeof cc === "string" && /^[A-Z]{2}$/.test(cc) && countryNameFor(cc, "en") !== null;

export function offCountryTag(cc) {
  const slug = OFF_SLUG[cc] || String(countryNameFor(cc, "en") || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return "en:" + slug;
}
