// Konto-Sync (Client): sichert alle "asfit."-Schlüssel als einen Stand auf dem Server
// und holt ihn beim Anmelden zurück. Der Anmelde-Token selbst ("asfit.auth") und rein
// gerätespezifische Schlüssel werden nie mitgesichert.
const SKIP = new Set(["asfit.auth", "asfit.syncMeta", "asfit.pendingShareCode", "asfit.pendingCs"]);

export function collectLocal() {
  const out = {};
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith("asfit.") && !SKIP.has(k)) out[k] = localStorage.getItem(k);
    }
  } catch {}
  return out;
}

async function digest(s) {
  try {
    const h = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
    return [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, "0")).join("");
  } catch {
    return "len:" + s.length; // Notbehelf ohne WebCrypto
  }
}

const meta = () => {
  try {
    return JSON.parse(localStorage.getItem("asfit.syncMeta") || "{}");
  } catch {
    return {};
  }
};
const setMeta = (m) => {
  try {
    localStorage.setItem("asfit.syncMeta", JSON.stringify(m));
  } catch {}
};

// Stand hochschieben; "unchanged" wenn sich seit dem letzten Push nichts geändert hat.
export async function pushSync(apiBase, headers) {
  const obj = collectLocal();
  let blob = JSON.stringify(obj);
  if (blob.length > 14_000_000) {
    // Notbremse: über dem Server-Limit → die (großen) Fortschrittsfotos bleiben nur lokal
    delete obj["asfit.progressPhotos"];
    blob = JSON.stringify(obj);
  }
  const hash = await digest(blob);
  if (meta().hash === hash) return "unchanged";
  const r = await fetch(apiBase + "/api/sync", {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify({ data: blob }),
  }).catch(() => null);
  if (r && r.ok) {
    setMeta({ hash, at: Date.now() });
    return "pushed";
  }
  return "failed";
}

export async function pullSync(apiBase, headers) {
  const r = await fetch(apiBase + "/api/sync", { headers }).catch(() => null);
  if (!r) return { state: "failed" };
  if (r.status === 404) return { state: "empty" };
  if (!r.ok) return { state: "failed" };
  const j = await r.json().catch(() => null);
  return j && typeof j.data === "string" ? { state: "ok", data: j.data, updatedAt: j.updatedAt } : { state: "failed" };
}

// Serverstand aufs Gerät schreiben (Token bleibt erhalten). true = danach neu laden.
export function applySync(blob) {
  let obj;
  try {
    obj = JSON.parse(blob);
  } catch {
    return false;
  }
  if (!obj || typeof obj !== "object") return false;
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k && k.startsWith("asfit.") && !SKIP.has(k)) localStorage.removeItem(k);
    }
    Object.entries(obj).forEach(([k, v]) => {
      if (typeof k === "string" && k.startsWith("asfit.") && !SKIP.has(k) && typeof v === "string") {
        try {
          localStorage.setItem(k, v);
        } catch {}
      }
    });
    setMeta({ hash: null, at: Date.now() });
    return true;
  } catch {
    return false;
  }
}
