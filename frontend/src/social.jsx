// Community-Baustein: Wunsch-Akzentfarbe, Tier-Charaktere, öffentliches Profil
// (Nutzername, Profilbild, Sichtbarkeit, Social-Links) und der Live-Wettkampf
// (Münzen + Level). Alles hier ist eigenständig: Farben kommen aus den CSS-
// Variablen der App, Daten liegen in localStorage — kein Server nötig für die Vorschau.
import { useState, useEffect, useRef } from "react";

const C = {
  bg: "var(--c-bg)",
  surface: "var(--c-surface)",
  raised: "var(--c-raised)",
  border: "var(--c-border)",
  text: "var(--c-text)",
  dim: "var(--c-dim)",
  gold: "var(--c-gold)",
  goldSoft: "var(--c-goldSoft)",
  coral: "var(--c-coral)",
};

/* ---------------- Wunsch-Akzentfarbe ---------------- */
// Der Start der App bleibt IMMER schwarz — die Wahl hier färbt nur den Akzent
// (Knöpfe, Hervorhebungen). "auto" = die Farbe des gewählten Themas.
export const ACCENTS = [
  // ASFIT-Rot = die Farbe des App-Icons; aufgehellt genug für dunklen Grund. Standard, solange nichts gewählt ist.
  { id: "asfit", c: "#E8463E", soft: "rgba(232,70,62,0.18)", de: "ASFIT-Rot", en: "ASFIT Red" },
  { id: "gold", c: "#D4AF37", soft: "rgba(212,175,55,0.18)", de: "Gold", en: "Gold" },
  { id: "green", c: "#3DD68C", soft: "rgba(61,214,140,0.16)", de: "Grün", en: "Green" },
  { id: "blue", c: "#5B9DF5", soft: "rgba(91,157,245,0.18)", de: "Blau", en: "Blue" },
  { id: "violet", c: "#B08AF0", soft: "rgba(176,138,240,0.18)", de: "Violett", en: "Violet" },
  { id: "orange", c: "#FF9F43", soft: "rgba(255,159,67,0.18)", de: "Orange", en: "Orange" },
];
export const DEFAULT_ACCENT = "asfit";

export function savedAccent() {
  try {
    return JSON.parse(localStorage.getItem("asfit.accent") || "null");
  } catch {
    return null;
  }
}
export function saveAccent(id) {
  try {
    localStorage.setItem("asfit.accent", JSON.stringify(id));
  } catch {}
}
// Nach applyTheme aufgerufen: überschreibt die Akzent-Variablen, wenn eine
// Wunschfarbe gewählt wurde (sonst bleibt die Theme-Farbe).
export function applyAccentOverride(root) {
  // Ohne eigene Wahl gilt ASFIT-Rot (die Farbe des App-Icons) als Standard-Akzent.
  const a = ACCENTS.find((x) => x.id === savedAccent()) || ACCENTS.find((x) => x.id === DEFAULT_ACCENT);
  if (!a) return;
  root.style.setProperty("--c-gold", a.c);
  root.style.setProperty("--c-goldSoft", a.soft);
}

/* ---------------- Tier-Charaktere ---------------- */
export const ANIMALS = [
  { id: "lion", e: "🦁", de: "Löwe", en: "Lion" },
  { id: "wolf", e: "🐺", de: "Wolf", en: "Wolf" },
  { id: "eagle", e: "🦅", de: "Adler", en: "Eagle" },
  { id: "panther", e: "🐆", de: "Panther", en: "Panther" },
  { id: "bull", e: "🐂", de: "Stier", en: "Bull" },
  { id: "shark", e: "🦈", de: "Hai", en: "Shark" },
  { id: "gorilla", e: "🦍", de: "Gorilla", en: "Gorilla" },
  { id: "fox", e: "🦊", de: "Fuchs", en: "Fox" },
  { id: "bear", e: "🐻", de: "Bär", en: "Bear" },
  { id: "tiger", e: "🐯", de: "Tiger", en: "Tiger" },
  { id: "rhino", e: "🦏", de: "Nashorn", en: "Rhino" },
  { id: "falcon", e: "🦉", de: "Eule", en: "Owl" },
];
export const animalById = (id) => ANIMALS.find((a) => a.id === id) || null;

// Flache, geometrische Tier-Wappen (ein Pfad pro Tier, Augen als Aussparungen
// über die Wicklungsrichtung) — bewusst im Stil von Sport-Logos statt Emojis.
const ANIMAL_PATHS = {
  lion: "M32 6 L37.2 12.7 L45 9.5 L46.1 17.9 L54.5 19 L51.3 26.8 L58 32 L51.3 37.2 L54.5 45 L46.1 46.1 L45 54.5 L37.2 51.3 L32 58 L26.8 51.3 L19 54.5 L17.9 46.1 L9.5 45 L12.7 37.2 L6 32 L12.7 26.8 L9.5 19 L17.9 17.9 L19 9.5 L26.8 12.7 Z M32 16 A16 16 0 1 0 32.02 16 Z M32 19.5 A12.5 12.5 0 1 1 32.02 19.5 Z M24 27.5 L26 31.5 L29.5 29 Z M40 27.5 L34.5 29 L38 31.5 Z M28.5 35 L32 39.5 L35.5 35 Z",
  wolf: "M32 58 L16 46 L10 24 L12 7 L24 18 L32 15 L40 18 L52 7 L54 24 L48 46 Z M20 29 L23 35 L28 32 Z M44 29 L36 32 L41 35 Z M28 45 L32 50 L36 45 Z",
  eagle: "M15 26 C15 14 25 6 36 8 L50 16 L44 19 C48 21 51 23 52 26 L61 29 L50 31 L55 37 L45 35 C43 43 34 48 24 45 L15 51 L20 39 C17 35 15 31 15 26 Z M33 18 L41 22 L34 24.5 Z",
  panther: "M32 56 L19 49 L13 32 L15 13 L25 21 L32 19 L39 21 L49 13 L51 32 L45 49 Z M20 31 L21 35 L28 33 Z M44 31 L36 33 L43 35 Z M29 44 L32 48 L35 44 Z",
  bull: "M20 20 C11 20 4 14 4 5 C6 4 9 4 11 5 C11 11 15 15 21 15 Z M44 20 L43 15 C49 15 53 11 53 5 C55 4 58 4 60 5 C60 14 53 20 44 20 Z M21 12 L43 12 L49 26 L44 44 L32 55 L20 44 L15 26 Z M24 27 L26 32 L30 29 Z M40 27 L34 29 L38 32 Z M26.5 44 L28.5 48 L30.5 45 Z M37.5 44 L33.5 45 L35.5 48 Z",
  shark: "M4 27 L13 32 C22 24 36 21 46 25 L41 12 L53 23 C57 26 60 30 60 33 L50 36 C40 43 24 45 12 41 L4 45 L8 35 Z M48 28 L46 31 L50 32 Z",
  gorilla: "M10 27 C5 27 3 32 5 36 C7 39 11 39 12 36 Z M54 27 C59 27 61 32 59 36 C57 39 53 39 52 36 Z M32 4 L43 10 C51 14 55 21 55 29 C55 43 45 55 32 55 C19 55 9 43 9 29 C9 21 13 14 21 10 Z M16 25 C21 20.5 27 19 32 19 C37 19 43 20.5 48 25 L46 29 C41 25.5 37 24 32 24 C27 24 23 25.5 18 29 Z M22 38 C22 33 27 30 32 30 C37 30 42 33 42 38 L39.5 38 C39.5 34.5 36 32.5 32 32.5 C28 32.5 24.5 34.5 24.5 38 Z M25.5 42 L29.5 44.5 L26.5 47.5 Z M38.5 42 L37.5 47.5 L34.5 44.5 Z",
  fox: "M32 60 L15 43 L6 9 L23 20 L32 17 L41 20 L58 9 L49 43 Z M21 31 L23 37 L29 34 Z M43 31 L35 34 L41 37 Z M29 48 L32 53 L35 48 Z",
  bear: "M18 25 C12 25 7 20 7 15 C7 10 11 6 16 6 C21 6 25 9 26 13 Z M38 13 C39 9 43 6 48 6 C53 6 57 10 57 15 C57 20 52 25 46 25 Z M32 10 C44 10 53 19 53 32 C53 46 44 56 32 56 C20 56 11 46 11 32 C11 19 20 10 32 10 Z M23 29 L24 34 L29 31 Z M41 29 L35 31 L40 34 Z M28 42 L32 47 L36 42 Z",
  tiger: "M32 56 L19 49 L13 32 L15 13 L25 21 L32 19 L39 21 L49 13 L51 32 L45 49 Z M29 17 L32 26 L35 17 Z M20 22 L26 30 L24 20 Z M44 22 L40 20 L38 30 Z M20 31 L21 35 L28 33 Z M44 31 L36 33 L43 35 Z M29 44 L32 48 L35 44 Z",
  rhino: "M8 46 C6 28 16 15 32 15 C44 15 52 23 54 33 L54 38 L46 41 L46 46 Z M49 29 L61 11 L55 33 Z M41 23 L47 13 L47 27 Z M19 17 L23 6 L29 14 Z M34 27 L33 31 L37 31 Z",
  falcon: "M14 9 L23 16 C28 12 36 12 41 16 L50 9 L50 26 C52 43 44 55 32 55 C20 55 12 43 14 26 Z M23 25 C26 25 28 27 28 30 C28 33 26 35 23 35 C20 35 18 33 18 30 C18 27 20 25 23 25 Z M41 25 C44 25 46 27 46 30 C46 33 44 35 41 35 C38 35 36 33 36 30 C36 27 38 25 41 25 Z M30 39 L32 44 L34 39 Z",
};
export function AnimalGlyph({ id, size = 26, color = "currentColor", style }) {
  const d = ANIMAL_PATHS[id];
  if (!d) return null;
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" style={style} aria-hidden="true">
      <path d={d} fill={color} fillRule="evenodd" />
    </svg>
  );
}

/* ---------------- Öffentliches Profil (localStorage) ---------------- */
const PUB_KEY = "asfit.pubProfile";
export function loadPub() {
  try {
    return { username: "", avatar: null, visibility: "private", socials: { tiktok: "", instagram: "", snapchat: "" }, ...JSON.parse(localStorage.getItem(PUB_KEY) || "{}") };
  } catch {
    return { username: "", avatar: null, visibility: "private", socials: { tiktok: "", instagram: "", snapchat: "" } };
  }
}
export function savePub(p) {
  try {
    localStorage.setItem(PUB_KEY, JSON.stringify(p));
  } catch {}
}

// Foto klein rechnen (256px, JPEG), damit es in localStorage passt.
export function fileToAvatar(file) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const s = 256;
      const canvas = document.createElement("canvas");
      canvas.width = s;
      canvas.height = s;
      const ctx = canvas.getContext("2d");
      const m = Math.min(img.width, img.height);
      ctx.drawImage(img, (img.width - m) / 2, (img.height - m) / 2, m, m, 0, 0, s, s);
      resolve({ type: "photo", data: canvas.toDataURL("image/jpeg", 0.82) });
    };
    img.onerror = () => resolve(null);
    img.src = URL.createObjectURL(file);
  });
}

// Runder Avatar: Foto, Tier oder Initiale
export function Avatar({ avatar, name = "", size = 56 }) {
  const base = { width: size, height: size, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" };
  if (avatar && avatar.type === "photo" && avatar.data) return <img src={avatar.data} alt="" style={{ ...base, objectFit: "cover", border: "2px solid " + C.gold }} />;
  if (avatar && avatar.type === "animal") {
    const a = animalById(avatar.id);
    if (a) return <div style={{ ...base, background: C.goldSoft, border: "2px solid " + C.gold, boxSizing: "border-box" }}><AnimalGlyph id={a.id} size={size * 0.56} color={C.gold} /></div>;
  }
  return (
    <div style={{ ...base, background: "linear-gradient(150deg, var(--c-gold), var(--c-teal))" }}>
      <span style={{ fontFamily: "Sora, sans-serif", fontSize: size * 0.4, fontWeight: 700, color: C.bg }}>{(name || "?").charAt(0).toUpperCase()}</span>
    </div>
  );
}

/* ---------------- Texte (6 Sprachen, kompakt) ---------------- */
const SOC = {
  de: { pickColor: "Deine Farbe", pickColorSub: "Der Start bleibt schwarz — deine Farbe setzt die Akzente in der ganzen App.", profTitle: "Dein Profil", profSub: "Profilbild und Nutzername — so erscheinst du in Rangliste und Duellen.", uploadPhoto: "Foto hochladen", orChar: "oder wähle deinen Charakter", username: "Nutzername", unamePh: "z. B. iron.ahmad", vis: "Profil-Sichtbarkeit", visPub: "Öffentlich", visPriv: "Privat", visHint: "Privat = niemand findet dich. Öffentlich = andere sehen Nutzername, Charakter und Level.", socials: "Social Media", socialsHint: "Wird nur auf deinem öffentlichen Profil angezeigt.", duel: "Live-Wettkampf", duelSub: "Fordere andere heraus — der Gewinner kassiert Münzen und Level-Punkte.", coins: "Münzen", level: "Level", duelStart: "Gegner suchen", searching: "Gegner wird gesucht…", found: "Gegner gefunden!", ready: "Bereit? Das Duell dauert 30 Sekunden.", go: "Los!", tap: "WDH.", duelWin: "Gewonnen! 🏆", duelLose: "Knapp verloren", duelWinSub: "+{c} Münzen · +{x} XP", duelLoseSub: "+{c} Münzen Trostpreis · +{x} XP", again: "Nochmal", close: "Schliessen", you: "Du", demo: "Vorschau: Gegner wird simuliert — echtes Matchmaking folgt mit dem Server-Update." },
  en: { pickColor: "Your color", pickColorSub: "The start stays black — your color sets the accents across the app.", profTitle: "Your profile", profSub: "Profile photo and username — how you appear in rankings and duels.", uploadPhoto: "Upload photo", orChar: "or pick your character", username: "Username", unamePh: "e.g. iron.ahmad", vis: "Profile visibility", visPub: "Public", visPriv: "Private", visHint: "Private = nobody can find you. Public = others see username, character and level.", socials: "Social media", socialsHint: "Only shown on your public profile.", duel: "Live battle", duelSub: "Challenge others — the winner takes coins and level points.", coins: "Coins", level: "Level", duelStart: "Find opponent", searching: "Searching for opponent…", found: "Opponent found!", ready: "Ready? The duel lasts 30 seconds.", go: "Go!", tap: "REPS", duelWin: "You won! 🏆", duelLose: "So close", duelWinSub: "+{c} coins · +{x} XP", duelLoseSub: "+{c} consolation coins · +{x} XP", again: "Again", close: "Close", you: "You", demo: "Preview: opponent is simulated — real matchmaking ships with the server update." },
  fr: { pickColor: "Ta couleur", pickColorSub: "Le départ reste noir — ta couleur définit les accents de l'app.", profTitle: "Ton profil", profSub: "Photo de profil et pseudo — ton apparence dans le classement et les duels.", uploadPhoto: "Importer une photo", orChar: "ou choisis ton personnage", username: "Pseudo", unamePh: "p. ex. iron.ahmad", vis: "Visibilité du profil", visPub: "Public", visPriv: "Privé", visHint: "Privé = personne ne te trouve. Public = les autres voient pseudo, personnage et niveau.", socials: "Réseaux sociaux", socialsHint: "Affiché uniquement sur ton profil public.", duel: "Duel en direct", duelSub: "Défie les autres — le gagnant remporte pièces et points de niveau.", coins: "Pièces", level: "Niveau", duelStart: "Trouver un adversaire", searching: "Recherche d'un adversaire…", found: "Adversaire trouvé !", ready: "Prêt ? Le duel dure 30 secondes.", go: "Go !", tap: "RÉP.", duelWin: "Gagné ! 🏆", duelLose: "Perdu de peu", duelWinSub: "+{c} pièces · +{x} XP", duelLoseSub: "+{c} pièces de consolation · +{x} XP", again: "Rejouer", close: "Fermer", you: "Toi", demo: "Aperçu : adversaire simulé — le vrai matchmaking arrive avec la mise à jour serveur." },
  it: { pickColor: "Il tuo colore", pickColorSub: "L'avvio resta nero — il tuo colore definisce gli accenti dell'app.", profTitle: "Il tuo profilo", profSub: "Foto profilo e nome utente — così appari in classifica e nelle sfide.", uploadPhoto: "Carica foto", orChar: "oppure scegli il tuo personaggio", username: "Nome utente", unamePh: "es. iron.ahmad", vis: "Visibilità del profilo", visPub: "Pubblico", visPriv: "Privato", visHint: "Privato = nessuno ti trova. Pubblico = gli altri vedono nome, personaggio e livello.", socials: "Social media", socialsHint: "Mostrato solo sul tuo profilo pubblico.", duel: "Sfida live", duelSub: "Sfida gli altri — il vincitore prende monete e punti livello.", coins: "Monete", level: "Livello", duelStart: "Trova avversario", searching: "Ricerca avversario…", found: "Avversario trovato!", ready: "Pronto? La sfida dura 30 secondi.", go: "Via!", tap: "RIP.", duelWin: "Hai vinto! 🏆", duelLose: "Per un soffio", duelWinSub: "+{c} monete · +{x} XP", duelLoseSub: "+{c} monete di consolazione · +{x} XP", again: "Di nuovo", close: "Chiudi", you: "Tu", demo: "Anteprima: avversario simulato — il matchmaking reale arriva con l'aggiornamento server." },
  es: { pickColor: "Tu color", pickColorSub: "El inicio sigue siendo negro — tu color define los acentos de la app.", profTitle: "Tu perfil", profSub: "Foto de perfil y nombre de usuario — así apareces en el ranking y los duelos.", uploadPhoto: "Subir foto", orChar: "o elige tu personaje", username: "Nombre de usuario", unamePh: "p. ej. iron.ahmad", vis: "Visibilidad del perfil", visPub: "Público", visPriv: "Privado", visHint: "Privado = nadie te encuentra. Público = otros ven nombre, personaje y nivel.", socials: "Redes sociales", socialsHint: "Solo se muestra en tu perfil público.", duel: "Duelo en vivo", duelSub: "Reta a otros — el ganador se lleva monedas y puntos de nivel.", coins: "Monedas", level: "Nivel", duelStart: "Buscar rival", searching: "Buscando rival…", found: "¡Rival encontrado!", ready: "¿Listo? El duelo dura 30 segundos.", go: "¡Ya!", tap: "REP.", duelWin: "¡Ganaste! 🏆", duelLose: "Por poco", duelWinSub: "+{c} monedas · +{x} XP", duelLoseSub: "+{c} monedas de consuelo · +{x} XP", again: "Otra vez", close: "Cerrar", you: "Tú", demo: "Vista previa: rival simulado — el matchmaking real llega con la actualización del servidor." },
  tr: { pickColor: "Senin rengin", pickColorSub: "Başlangıç siyah kalır — rengin tüm uygulamadaki vurguları belirler.", profTitle: "Profilin", profSub: "Profil fotoğrafı ve kullanıcı adı — sıralamada ve düellolarda böyle görünürsün.", uploadPhoto: "Fotoğraf yükle", orChar: "veya karakterini seç", username: "Kullanıcı adı", unamePh: "örn. iron.ahmad", vis: "Profil görünürlüğü", visPub: "Herkese açık", visPriv: "Gizli", visHint: "Gizli = kimse seni bulamaz. Açık = diğerleri kullanıcı adını, karakterini ve seviyeni görür.", socials: "Sosyal medya", socialsHint: "Yalnızca herkese açık profilinde gösterilir.", duel: "Canlı düello", duelSub: "Başkalarına meydan oku — kazanan jeton ve seviye puanı alır.", coins: "Jeton", level: "Seviye", duelStart: "Rakip bul", searching: "Rakip aranıyor…", found: "Rakip bulundu!", ready: "Hazır mısın? Düello 30 saniye sürer.", go: "Başla!", tap: "TEKRAR", duelWin: "Kazandın! 🏆", duelLose: "Kıl payı", duelWinSub: "+{c} jeton · +{x} XP", duelLoseSub: "+{c} teselli jetonu · +{x} XP", again: "Tekrar", close: "Kapat", you: "Sen", demo: "Önizleme: rakip simüle edilir — gerçek eşleştirme sunucu güncellemesiyle gelir." },
};
export const soc = (lang) => SOC[String(lang || "de").slice(0, 2)] || SOC.de;

/* ---------------- Münzen & Level ---------------- */
function loadNum(key) {
  try {
    return Number(JSON.parse(localStorage.getItem(key) || "0")) || 0;
  } catch {
    return 0;
  }
}
export const levelOf = (xp) => Math.floor(xp / 100) + 1;

/* ---------------- Farbwahl-Grid (Onboarding + Einstellungen) ---------------- */
export function AccentPicker({ lang, value, onPick }) {
  const l2 = String(lang || "de").slice(0, 2);
  return (
    <div data-accent-picker style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
      {ACCENTS.map((a) => {
        const sel = value === a.id;
        return (
          <div key={a.id} data-accent={a.id} onClick={() => onPick(a.id)} style={{ padding: "16px 8px 12px", borderRadius: 16, textAlign: "center", cursor: "pointer", background: sel ? a.soft : C.surface, border: `2px solid ${sel ? a.c : C.border}` }}>
            <div style={{ width: 34, height: 34, borderRadius: "50%", background: a.c, margin: "0 auto 8px", boxShadow: sel ? `0 0 0 4px ${a.soft}` : "none" }} />
            <div style={{ fontFamily: "Sora, sans-serif", fontSize: 12.5, fontWeight: 600, color: C.text }}>{l2 === "de" ? a.de : a.en}</div>
          </div>
        );
      })}
    </div>
  );
}

/* ---------------- Profil-Schritt (Onboarding) & Profil-Karte (Einstellungen) ---------------- */
export function AvatarPicker({ lang, avatar, onChange }) {
  const s = soc(lang);
  const fileRef = useRef(null);
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
        <Avatar avatar={avatar} size={72} />
        <button
          data-avatar-upload
          onClick={() => fileRef.current && fileRef.current.click()}
          style={{ background: C.raised, color: C.text, border: "1px solid " + C.border, borderRadius: 12, padding: "11px 16px", fontFamily: "Sora, sans-serif", fontWeight: 600, fontSize: 13, cursor: "pointer" }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: "-2px", marginRight: 7 }}><path d="M3 8a2 2 0 0 1 2-2h2l1.5-2h7L17 6h2a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" /><circle cx="12" cy="13" r="3.5" /></svg>
          {s.uploadPhoto}
        </button>
        <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={async (e) => { const f = e.target.files && e.target.files[0]; if (f) { const av = await fileToAvatar(f); if (av) onChange(av); } e.target.value = ""; }} />
      </div>
    </div>
  );
}

// Einstellungen → Profil: Profilbild + Nutzername ändern (bewusst schlank —
// Sichtbarkeits-Umschalter, Tier-Charaktere und Social-Links wurden entfernt)
export function PublicProfileScreen({ lang }) {
  const s = soc(lang);
  const [pub, setPub] = useState(loadPub);
  const upd = (patch) => setPub((p) => { const n = { ...p, ...patch }; savePub(n); return n; });
  const lvl = levelOf(loadNum("asfit.xp"));
  return (
    <div style={{ padding: "0 20px 28px" }}>
      <div style={{ background: C.surface, border: "1px solid " + C.border, borderRadius: 18, padding: 18, marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
          <Avatar avatar={pub.avatar} name={pub.username} size={56} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: "Sora, sans-serif", fontSize: 16, fontWeight: 700, color: C.text }}>{pub.username || s.username}</div>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: C.dim, marginTop: 2 }}>{s.level} {lvl} · {loadNum("asfit.coins")}</div>
          </div>
        </div>
        <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12.5, color: C.dim, marginBottom: 6 }}>{s.username}</div>
        <input data-pub-username value={pub.username} onChange={(e) => upd({ username: e.target.value.replace(/[^\w.\-]/g, "").toLowerCase().slice(0, 24) })} placeholder={s.unamePh} style={{ width: "100%", boxSizing: "border-box", padding: "12px", borderRadius: 12, border: "1.5px solid " + C.border, background: C.bg, color: C.text, fontFamily: "Inter, sans-serif", fontSize: 14, marginBottom: 14 }} />
        <AvatarPicker lang={lang} avatar={pub.avatar} onChange={(avatar) => upd({ avatar })} />
      </div>
    </div>
  );
}

/* ---------------- Live-Wettkampf ---------------- */
// Vorschau-Version: der Gegner wird lokal simuliert (ein Bot mit Tier-Charakter),
// Spielgefühl, Münzen und Level sind echt. Das Server-Matchmaking kommt als
// eigenes Backend-Update.
const BOT_NAMES = ["max.lifts", "fit.leonie", "kraftwerk_tim", "sarah.strong", "berg.movers", "eisen_elif", "nico.pump", "lea.cardio"];
const DUEL_SEC = 30;

export function DuelCard({ lang }) {
  const s = soc(lang);
  const [open, setOpen] = useState(false);
  const [coins, setCoins] = useState(() => loadNum("asfit.coins"));
  const [xp, setXp] = useState(() => loadNum("asfit.xp"));
  useEffect(() => {
    try {
      localStorage.setItem("asfit.coins", JSON.stringify(coins));
      localStorage.setItem("asfit.xp", JSON.stringify(xp));
    } catch {}
  }, [coins, xp]);
  const lvl = levelOf(xp);
  const pct = xp % 100;
  return (
    <>
      <div data-duel-card onClick={() => setOpen(true)} style={{ background: `linear-gradient(135deg, ${C.goldSoft}, ${C.surface} 70%)`, border: "1px solid " + C.border, borderRadius: 18, padding: 16, marginBottom: 12, cursor: "pointer" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 44, height: 44, borderRadius: 13, background: C.goldSoft, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 21, flexShrink: 0 }}>⚔️</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: "Sora, sans-serif", fontSize: 15, fontWeight: 700, color: C.text }}>{s.duel}</div>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: C.dim, marginTop: 2, lineHeight: 1.45 }}>{s.duelSub}</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <div style={{ flex: 1, background: C.bg, border: "1px solid " + C.border, borderRadius: 12, padding: "8px 10px", textAlign: "center" }}>
            <div style={{ fontFamily: "Sora, sans-serif", fontSize: 15, fontWeight: 700, color: C.gold }}>{coins}</div>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: 10.5, color: C.dim }}>{s.coins}</div>
          </div>
          <div style={{ flex: 1.6, background: C.bg, border: "1px solid " + C.border, borderRadius: 12, padding: "8px 10px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "Sora, sans-serif", fontSize: 11.5, fontWeight: 600, color: C.text }}>
              <span>{s.level} {lvl}</span>
              <span style={{ color: C.dim }}>{pct}/100 XP</span>
            </div>
            <div style={{ height: 5, borderRadius: 3, background: C.raised, marginTop: 6 }}>
              <div style={{ width: pct + "%", height: "100%", borderRadius: 3, background: C.gold }} />
            </div>
          </div>
        </div>
      </div>
      {open && <LiveDuel lang={lang} onClose={() => setOpen(false)} coins={coins} setCoins={setCoins} xp={xp} setXp={setXp} />}
    </>
  );
}

function LiveDuel({ lang, onClose, coins, setCoins, xp, setXp }) {
  const s = soc(lang);
  const pub = loadPub();
  const [phase, setPhase] = useState("search"); // search → ready → run → done
  const [bot, setBot] = useState(null);
  const [my, setMy] = useState(0);
  const [his, setHis] = useState(0);
  const [left, setLeft] = useState(DUEL_SEC);
  const [won, setWon] = useState(false);
  const reward = useRef(null);

  // "Matchmaking": nach 2–3 s steht der Gegner (simuliert, mit Tier-Charakter)
  useEffect(() => {
    if (phase !== "search") return undefined;
    const id = setTimeout(() => {
      setBot({ name: BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)], animal: ANIMALS[Math.floor(Math.random() * ANIMALS.length)], lvl: Math.max(1, levelOf(xp) + Math.floor(Math.random() * 3) - 1) });
      setPhase("ready");
    }, 2000 + Math.random() * 1000);
    return () => clearTimeout(id);
  }, [phase, xp]);

  // Duell-Uhr + Gegner-Fortschritt
  useEffect(() => {
    if (phase !== "run") return undefined;
    const clock = setInterval(() => setLeft((v) => v - 1), 1000);
    const opp = setInterval(() => setHis((v) => v + (Math.random() < 0.72 ? 1 : 0)), 650);
    return () => {
      clearInterval(clock);
      clearInterval(opp);
    };
  }, [phase]);
  useEffect(() => {
    if (phase === "run" && left <= 0) {
      const w = my >= his;
      const c = w ? 50 : 10;
      const x = w ? 40 : 10;
      reward.current = { c, x };
      setWon(w);
      setCoins(coins + c);
      setXp(xp + x);
      setPhase("done");
    }
  }, [left, phase]); // eslint-disable-line react-hooks/exhaustive-deps

  const bar = (val, max, color) => (
    <div style={{ height: 8, borderRadius: 4, background: C.raised, overflow: "hidden" }}>
      <div style={{ width: Math.min(100, (val / Math.max(1, max)) * 100) + "%", height: "100%", background: color, transition: "width 0.2s" }} />
    </div>
  );
  const head = (avatar, name, lvl, right) => (
    <div style={{ display: "flex", alignItems: "center", gap: 10, flexDirection: right ? "row-reverse" : "row", textAlign: right ? "right" : "left" }}>
      {avatar}
      <div style={{ minWidth: 0 }}>
        <div style={{ fontFamily: "Sora, sans-serif", fontSize: 13.5, fontWeight: 700, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</div>
        <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11, color: C.dim }}>{s.level} {lvl}</div>
      </div>
    </div>
  );
  const maxSide = Math.max(my, his, 20);

  return (
    <div data-duel style={{ position: "fixed", inset: 0, zIndex: 900, background: C.bg, display: "flex", flexDirection: "column", padding: "calc(16px + env(safe-area-inset-top)) 20px calc(20px + env(safe-area-inset-bottom))" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
        <div style={{ fontFamily: "Sora, sans-serif", fontSize: 17, fontWeight: 700, color: C.text }}>⚔️ {s.duel}</div>
        <div data-duel-close onClick={onClose} style={{ fontFamily: "Sora, sans-serif", fontSize: 13, fontWeight: 600, color: C.dim, cursor: "pointer", padding: 6 }}>✕</div>
      </div>

      {phase === "search" && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
          <div style={{ width: 74, height: 74, borderRadius: "50%", border: `3px solid ${C.gold}`, borderTopColor: "transparent", animation: "duelSpin 0.9s linear infinite", marginBottom: 22 }} />
          <div style={{ fontFamily: "Sora, sans-serif", fontSize: 16, fontWeight: 700, color: C.text }}>{s.searching}</div>
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: C.dim, marginTop: 20, maxWidth: 280, lineHeight: 1.5 }}>{s.demo}</div>
          <style>{`@keyframes duelSpin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {phase === "ready" && bot && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
          <div style={{ fontFamily: "Sora, sans-serif", fontSize: 15, fontWeight: 700, color: C.gold, marginBottom: 20 }}>{s.found}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 22, marginBottom: 24 }}>
            <div style={{ textAlign: "center" }}>
              <Avatar avatar={pub.avatar} name={pub.username} size={64} />
              <div style={{ fontFamily: "Sora, sans-serif", fontSize: 12.5, fontWeight: 600, color: C.text, marginTop: 8 }}>{pub.username || s.you}</div>
            </div>
            <div style={{ fontFamily: "Sora, sans-serif", fontSize: 20, fontWeight: 800, color: C.dim }}>VS</div>
            <div style={{ textAlign: "center" }}>
              <Avatar avatar={{ type: "animal", id: bot.animal.id }} size={64} />
              <div style={{ fontFamily: "Sora, sans-serif", fontSize: 12.5, fontWeight: 600, color: C.text, marginTop: 8 }}>{bot.name}</div>
            </div>
          </div>
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: C.dim, marginBottom: 24 }}>{s.ready}</div>
          <button data-duel-go onClick={() => { setMy(0); setHis(0); setLeft(DUEL_SEC); setPhase("run"); }} style={{ background: C.gold, color: C.bg, border: "none", borderRadius: 16, padding: "15px 48px", fontFamily: "Sora, sans-serif", fontWeight: 700, fontSize: 16, cursor: "pointer" }}>
            {s.go}
          </button>
        </div>
      )}

      {phase === "run" && bot && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <div style={{ textAlign: "center", fontFamily: "Sora, sans-serif", fontSize: 40, fontWeight: 800, color: left <= 5 ? C.coral : C.text, marginBottom: 16 }}>{left}s</div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            {head(<Avatar avatar={pub.avatar} name={pub.username} size={40} />, pub.username || s.you, levelOf(xp))}
            {head(<Avatar avatar={{ type: "animal", id: bot.animal.id }} size={40} />, bot.name, bot.lvl, true)}
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 6 }}>
            <div style={{ flex: 1 }}>{bar(my, maxSide, C.gold)}</div>
            <div style={{ flex: 1 }}>{bar(his, maxSide, C.coral)}</div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "Sora, sans-serif", fontSize: 22, fontWeight: 800, color: C.text, marginBottom: 10 }}>
            <span>{my}</span>
            <span>{his}</span>
          </div>
          <button
            data-duel-tap
            onClick={() => setMy((v) => v + 1)}
            style={{ flex: 1, background: C.goldSoft, color: C.gold, border: `2.5px solid ${C.gold}`, borderRadius: 24, fontFamily: "Sora, sans-serif", fontWeight: 800, fontSize: 24, cursor: "pointer", WebkitTapHighlightColor: "transparent", touchAction: "manipulation" }}
          >
            +1 {s.tap}
          </button>
        </div>
      )}

      {phase === "done" && reward.current && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
          <div style={{ fontSize: 52, marginBottom: 12 }}>{won ? "🏆" : "🥈"}</div>
          <div style={{ fontFamily: "Sora, sans-serif", fontSize: 22, fontWeight: 800, color: C.text, marginBottom: 8 }}>{won ? s.duelWin : s.duelLose}</div>
          <div style={{ fontFamily: "Sora, sans-serif", fontSize: 14.5, fontWeight: 700, color: C.gold, marginBottom: 6 }}>{(won ? s.duelWinSub : s.duelLoseSub).replace("{c}", reward.current.c).replace("{x}", reward.current.x)}</div>
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: C.dim, marginBottom: 26 }}>{my} : {his}</div>
          <div style={{ display: "flex", gap: 10 }}>
            <button data-duel-again onClick={() => { setBot(null); setPhase("search"); }} style={{ background: C.gold, color: C.bg, border: "none", borderRadius: 14, padding: "13px 28px", fontFamily: "Sora, sans-serif", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>{s.again}</button>
            <button data-duel-end onClick={onClose} style={{ background: C.raised, color: C.text, border: "1px solid " + C.border, borderRadius: 14, padding: "13px 28px", fontFamily: "Sora, sans-serif", fontWeight: 600, fontSize: 14, cursor: "pointer" }}>{s.close}</button>
          </div>
        </div>
      )}
    </div>
  );
}
