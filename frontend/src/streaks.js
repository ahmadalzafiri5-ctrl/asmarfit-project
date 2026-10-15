// Serien-Logik (aus App.jsx ausgelagert): Welche Tage zählen, und wie lang ist die Serie?
// Neu mit "Streak-Freeze": EIN verpasster Tag pro 7 Tage bricht die Serie nicht —
// er wird überbrückt (zählt selbst nicht mit), erst der zweite Fehltag innerhalb
// von 7 Tagen oder zwei Fehltage am Stück beenden die Serie. So kostet ein
// Ruhetag oder ein vergessener Tag nicht die ganze Motivation.

export const dateKey = (d) => d.toLocaleDateString("sv");

export const dayHasFood = (day) => Boolean(day && day.meals && Object.values(day.meals).some((a) => Array.isArray(a) && a.length > 0));

const FREEZE_WINDOW = 7; // Tage, innerhalb derer höchstens ein Fehltag überbrückt wird

// current streak (today may still be open), best streak, first tracked day.
// frozenUsed: wurde in der aktuellen Serie ein Fehltag überbrückt? (für die UI)
export function computeStreaks(history) {
  const keys = Object.keys(history).filter((k) => dayHasFood(history[k])).sort();
  if (!keys.length) return { current: 0, best: 0, first: null, trackedToday: false, frozenUsed: false };
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const trackedToday = dayHasFood(history[dateKey(today)]);

  // Rückwärts vom letzten relevanten Tag: getrackte Tage zählen, einen einzelnen
  // Fehltag überbrücken, wenn der letzte überbrückte mindestens 7 Tage her ist.
  const cursor = new Date(today);
  if (!trackedToday) cursor.setDate(cursor.getDate() - 1);
  let current = 0;
  let sinceFreeze = Infinity; // Abstand (in Tagen) zum zuletzt überbrückten Fehltag
  let frozenUsed = false;
  for (;;) {
    if (dayHasFood(history[dateKey(cursor)])) {
      current++;
      sinceFreeze++;
    } else {
      const before = new Date(cursor);
      before.setDate(before.getDate() - 1);
      const canFreeze = sinceFreeze >= FREEZE_WINDOW && dayHasFood(history[dateKey(before)]);
      if (!canFreeze) break;
      frozenUsed = true;
      sinceFreeze = 0;
    }
    cursor.setDate(cursor.getDate() - 1);
  }

  // Beste Serie: vorwärts mit derselben Überbrückungs-Regel.
  let best = 0;
  let run = 0;
  let lastFreeze = -Infinity;
  const walk = new Date(keys[0] + "T12:00:00");
  for (let i = 0; walk <= today; i++, walk.setDate(walk.getDate() + 1)) {
    if (dayHasFood(history[dateKey(walk)])) {
      run++;
      best = Math.max(best, run);
    } else {
      const next = new Date(walk);
      next.setDate(next.getDate() + 1);
      const canFreeze = run > 0 && i - lastFreeze >= FREEZE_WINDOW && dayHasFood(history[dateKey(next)]);
      if (canFreeze) lastFreeze = i;
      else run = 0;
    }
  }
  return { current, best, first: keys[0], trackedToday, frozenUsed };
}
