// Seasonal look: which season / event it is today. Special days win over the plain seasons.
// Order of the special ones: Halloween, Christmas, New Year, Valentine's Day, Easter. Pure functions, no UI.
export const SEASON_KEYS = ["halloween", "christmas", "newyear", "winter", "valentine", "spring", "easter", "summer", "autumn"];

export const SEASONS = {
  halloween: { emoji: "🎃", tint: "#FF7A1A", motion: "float", particles: ["🦇", "🎃", "👻", "🕸️"] },
  christmas: { emoji: "🎄", tint: "#D93A3A", motion: "fall", particles: ["❄️", "❄️", "✨", "🎄"] },
  newyear: { emoji: "🎆", tint: "#F2C14E", motion: "rise", particles: ["✨", "🎉", "🥂", "⭐"] },
  winter: { emoji: "❄️", tint: "#6FB7F2", motion: "fall", particles: ["❄️", "❄️", "❅", "❆"] },
  valentine: { emoji: "❤️", tint: "#FF5C8A", motion: "rise", particles: ["❤️", "💕", "💗", "🌹"] },
  spring: { emoji: "🌸", tint: "#FF9EC4", motion: "fall", particles: ["🌸", "🌼", "🍃", "🦋"] },
  easter: { emoji: "🐣", tint: "#B7E07A", motion: "float", particles: ["🐣", "🥚", "🌷", "🐰"] },
  summer: { emoji: "☀️", tint: "#FFC83D", motion: "rise", particles: ["✨", "☀️", "🌊", "🍉"] },
  autumn: { emoji: "🍂", tint: "#E0872B", motion: "fall", particles: ["🍂", "🍁", "🍂", "🌰"] },
};

// Easter Sunday (Gregorian, "Anonymous" algorithm)
export function easterSunday(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day, 12);
}

// timezones of the southern hemisphere: the plain seasons are swapped there
const SOUTH = ["Australia/", "Pacific/Auckland", "Pacific/Fiji", "Antarctica/", "America/Argentina/", "America/Santiago", "America/Sao_Paulo", "America/Montevideo", "America/Lima", "America/La_Paz", "America/Asuncion", "Africa/Johannesburg", "Africa/Maputo", "Africa/Harare", "Africa/Windhoek", "Africa/Lusaka", "Indian/Mauritius", "Indian/Antananarivo"];
export const isSouthern = (tz) => SOUTH.some((p) => String(tz || "").startsWith(p));

const SWAP = { winter: "summer", summer: "winter", spring: "autumn", autumn: "spring" };

export function seasonFor(date = new Date(), south = false) {
  const m = (date.getMonth() + 1) * 100 + date.getDate(); // e.g. Oct 18 -> 1018
  // special days first
  if (m >= 1018 && m <= 1101) return "halloween";
  if (m >= 1201 && m <= 1226) return "christmas";
  if (m >= 1227 || m <= 102) return "newyear"; // Dec 27 - Jan 2
  if (m >= 210 && m <= 214) return "valentine";
  const easter = easterSunday(date.getFullYear());
  const days = Math.round((new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12) - easter) / 86400000);
  if (days >= -10 && days <= 1) return "easter";
  // the plain seasons (northern hemisphere), swapped in the south
  let base;
  if (m >= 103 && m <= 319) base = "winter";
  else if (m >= 320 && m <= 620) base = "spring";
  else if (m >= 621 && m <= 922) base = "summer";
  else base = "autumn"; // Sep 23 - Oct 17 and Nov 2 - Nov 30
  return south ? SWAP[base] : base;
}
