// Konto-Sync: Der komplette App-Stand (alle "asfit."-Schlüssel des Geräts) liegt als EIN
// Datensatz pro Konto in der Datenbank. Anmelden auf einem neuen Gerät holt ihn zurück.
// Der Server schaut nie in den Inhalt hinein; es gilt: letzter Schreiber gewinnt.
import { pool, requireAuth, authEnabled } from "./auth.js";

export async function initSyncDb() {
  if (!pool) return;
  await pool.query(`CREATE TABLE IF NOT EXISTS user_data (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    data TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`);
}

// Großzügig für Jahre an Einträgen samt einiger Fotos; die App lässt notfalls
// die Fortschrittsfotos weg, bevor sie dieses Limit reißt.
const MAX_BYTES = 15_000_000;

export function mountSync(app) {
  app.get("/api/sync", requireAuth, async (req, res) => {
    try {
      const r = await pool.query("SELECT data, updated_at FROM user_data WHERE user_id=$1", [req.userId]);
      if (!r.rows.length) return res.status(404).json({ error: "empty" });
      res.json({ data: r.rows[0].data, updatedAt: r.rows[0].updated_at });
    } catch (e) {
      console.error("Sync-Lesen:", e.message);
      res.status(500).json({ error: "db" });
    }
  });

  app.put("/api/sync", requireAuth, async (req, res) => {
    try {
      const data = typeof req.body?.data === "string" ? req.body.data : "";
      if (!data || data.length < 2) return res.status(400).json({ error: "no_data" });
      if (Buffer.byteLength(data, "utf8") > MAX_BYTES) return res.status(413).json({ error: "too_large" });
      await pool.query(
        "INSERT INTO user_data (user_id, data, updated_at) VALUES ($1, $2, now()) ON CONFLICT (user_id) DO UPDATE SET data = EXCLUDED.data, updated_at = now()",
        [req.userId, data]
      );
      res.json({ ok: true, updatedAt: new Date().toISOString() });
    } catch (e) {
      console.error("Sync-Schreiben:", e.message);
      res.status(500).json({ error: "db" });
    }
  });
}

export const syncEnabled = authEnabled;
