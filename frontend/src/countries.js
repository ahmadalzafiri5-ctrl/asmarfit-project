// Country choice: the country the user shops in. Names and flags come from the browser (Intl and flag emoji), so there is
// no table of names to keep up. Pure functions, no UI.
const CODES = "AF AX AL DZ AS AD AO AI AQ AG AR AM AW AU AT AZ BS BH BD BB BY BE BZ BJ BM BT BO BQ BA BW BV BR IO VG BN BG BF BI KH CM CA CV KY CF TD CL CN CX CC CO KM CG CD CK CR CI HR CU CW CY CZ DK DJ DM DO EC EG SV GQ ER EE SZ ET FK FO FJ FI FR GF PF TF GA GM GE DE GH GI GR GL GD GP GU GT GG GN GW GY HT HM HN HK HU IS IN ID IR IQ IE IM IL IT JM JP JE JO KZ KE KI XK KW KG LA LV LB LS LR LY LI LT LU MO MG MW MY MV ML MT MH MQ MR MU YT MX FM MD MC MN ME MS MA MZ MM NA NR NP NL NC NZ NI NE NG NU NF KP MK MP NO OM PK PW PS PA PG PY PE PH PN PL PT PR QA RE RO RU RW WS SM ST SA SN RS SC SL SG SX SK SI SB SO ZA GS KR SS ES LK BL SH KN LC MF PM VC SD SR SJ SE CH SY TW TJ TZ TH TL TG TK TO TT TN TR TM TC TV UM VI UG UA AE GB US UY UZ VU VA VE VN WF EH YE ZM ZW".split(" ");

const DN = {};
const dn = (lang) => (DN[lang === "de" ? "de" : "en"] = DN[lang === "de" ? "de" : "en"] || new Intl.DisplayNames([lang === "de" ? "de" : "en"], { type: "region" }));

export function countryName(cc, lang = "en") {
  try {
    const n = dn(lang).of(cc);
    return n && n !== cc ? n : cc;
  } catch {
    return cc;
  }
}

// flag emoji from the two letters (regional indicator symbols); a globe for anything else
export const flagOf = (cc) => (/^[A-Z]{2}$/.test(cc || "") ? String.fromCodePoint(...[...cc].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65)) : "🌍");

const fold = (s) => String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

const LIST = {};
// every country with its name in the app language, sorted by that name
export function allCountries(lang = "en") {
  const key = lang === "de" ? "de" : "en";
  if (!LIST[key]) {
    LIST[key] = CODES.map((code) => ({ code, name: countryName(code, key) }))
      .filter((c) => c.name !== c.code)
      .sort((a, b) => a.name.localeCompare(b.name, key));
  }
  return LIST[key];
}

// typing narrows the list (accents and case ignored; names that start with the text come first)
export function searchCountries(query, lang = "en") {
  const q = fold(String(query || "").trim());
  const all = allCountries(lang);
  if (!q) return all;
  const hits = all.filter((c) => fold(c.name).includes(q) || c.code.toLowerCase() === q);
  return [...hits.filter((c) => fold(c.name).startsWith(q)), ...hits.filter((c) => !fold(c.name).startsWith(q))];
}

const TZ_COUNTRY = {
  "Europe/Zurich": "CH", "Europe/Berlin": "DE", "Europe/Vienna": "AT", "Europe/Paris": "FR", "Europe/Rome": "IT", "Europe/Madrid": "ES", "Europe/Amsterdam": "NL", "Europe/Brussels": "BE",
  "Europe/London": "GB", "Europe/Dublin": "IE", "Europe/Lisbon": "PT", "Europe/Stockholm": "SE", "Europe/Oslo": "NO", "Europe/Copenhagen": "DK", "Europe/Helsinki": "FI", "Europe/Warsaw": "PL",
  "Europe/Prague": "CZ", "Europe/Bratislava": "SK", "Europe/Budapest": "HU", "Europe/Athens": "GR", "Europe/Istanbul": "TR", "Europe/Vaduz": "LI", "Europe/Luxembourg": "LU", "Europe/Zagreb": "HR",
  "Europe/Ljubljana": "SI", "Europe/Belgrade": "RS", "Europe/Bucharest": "RO", "Europe/Sofia": "BG", "Europe/Kyiv": "UA", "Europe/Kiev": "UA", "Europe/Moscow": "RU", "Europe/Riga": "LV", "Europe/Vilnius": "LT", "Europe/Tallinn": "EE",
  "Atlantic/Reykjavik": "IS", "America/New_York": "US", "America/Chicago": "US", "America/Denver": "US", "America/Los_Angeles": "US", "America/Phoenix": "US", "America/Anchorage": "US", "Pacific/Honolulu": "US",
  "America/Toronto": "CA", "America/Vancouver": "CA", "America/Edmonton": "CA", "America/Halifax": "CA", "America/Mexico_City": "MX", "America/Sao_Paulo": "BR", "America/Argentina/Buenos_Aires": "AR",
  "America/Bogota": "CO", "America/Santiago": "CL", "America/Lima": "PE", "Australia/Sydney": "AU", "Australia/Melbourne": "AU", "Australia/Brisbane": "AU", "Australia/Perth": "AU", "Pacific/Auckland": "NZ",
  "Asia/Tokyo": "JP", "Asia/Seoul": "KR", "Asia/Shanghai": "CN", "Asia/Hong_Kong": "HK", "Asia/Taipei": "TW", "Asia/Kolkata": "IN", "Asia/Calcutta": "IN", "Asia/Dubai": "AE", "Asia/Riyadh": "SA", "Asia/Singapore": "SG",
  "Asia/Bangkok": "TH", "Asia/Jakarta": "ID", "Asia/Manila": "PH", "Asia/Karachi": "PK", "Asia/Jerusalem": "IL", "Asia/Tehran": "IR", "Africa/Johannesburg": "ZA", "Africa/Cairo": "EG", "Africa/Lagos": "NG", "Africa/Nairobi": "KE", "Africa/Casablanca": "MA",
};

// where the user probably is: time zone first (where the phone really is), then an explicit region in the language ("de-CH")
export function guessCountry({ timeZone, languages } = {}) {
  if (timeZone && TZ_COUNTRY[timeZone]) return TZ_COUNTRY[timeZone];
  for (const l of languages || []) {
    try {
      const r = new Intl.Locale(l).region;
      if (r && /^[A-Z]{2}$/.test(r) && countryName(r, "en") !== r) return r;
    } catch {
      /* odd language tag */
    }
  }
  return null;
}

const EU = "AL AD AT BY BE BA BG HR CY CZ DK EE FI FR DE GR HU IS IE IT XK LV LI LT LU MT MD MC ME NL MK NO PL PT RO RU SM RS SK SI ES SE CH UA GB VA".split(" ");
// which group of the fast-food catalog is "at home" in a country
export const ffRegionFor = (cc) => (EU.includes(cc) ? "EU" : cc === "US" || cc === "CA" || cc === "PR" ? "US" : "world");
