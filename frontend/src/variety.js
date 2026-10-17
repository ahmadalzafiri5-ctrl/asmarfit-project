// Abwechslungs-Hinweis (pure Logik): Wer dieselbe Übung über viele Wochen fährt,
// bekommt im Workout dezent 2 Alternativen für dieselbe Muskelgruppe angeboten.
// Nur ein Vorschlag - nichts wird automatisch getauscht.

const DAY = 86400000;

/** Übung lange genug im Programm? Seit mindestens `minDays` dabei UND in den
 *  letzten `recentDays` mindestens `minSessions` Mal trainiert (= läuft seit
 *  ~6 Wochen regelmässig, nicht nur ein alter Einzelversuch). */
export function varietyDue(history, exerciseKey, { minSessions = 8, minDays = 42, recentDays = 56 } = {}) {
  const dates = (history || [])
    .filter((w) => (w.sets || []).some((s) => s.exerciseKey === exerciseKey))
    .map((w) => new Date(w.dateISO).getTime())
    .filter((t) => Number.isFinite(t));
  if (!dates.length) return false;
  const now = Date.now();
  const recent = dates.filter((t) => now - t <= recentDays * DAY);
  return recent.length >= minSessions && now - Math.min(...dates) >= minDays * DAY;
}

/** Bis zu `count` Alternativen aus derselben Muskelgruppe, deterministisch
 *  (beginnend nach der Übung selbst in Bibliotheks-Reihenfolge), ohne bereits
 *  im Workout vorhandene Übungen. */
export function varietyAlternatives(library, exerciseKey, usedKeys = [], count = 2) {
  const ex = library.find((e) => e.key === exerciseKey);
  if (!ex) return [];
  const pool = library.filter((e) => e.muscle === ex.muscle && e.key !== exerciseKey && !usedKeys.includes(e.key));
  if (!pool.length) return [];
  const start = pool.findIndex((e) => library.indexOf(e) > library.indexOf(ex));
  const ordered = start === -1 ? pool : [...pool.slice(start), ...pool.slice(0, start)];
  return ordered.slice(0, count);
}
