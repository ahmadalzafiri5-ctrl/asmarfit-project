// Share-Bilder (Canvas, 1080x1350): hübsche Karten für Stories/Chats.
// Bewusst ohne sensible Details - kein Körpergewicht, keine Kalorienziele-
// Überschreitung in Rot, nur das, was man gern herzeigt.

const W = 1080;
const H = 1350;

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function base(ctx, accent) {
  // dunkler Verlauf + Akzentkreis oben
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "#15181c");
  g.addColorStop(1, "#0b0d10");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  ctx.save();
  ctx.globalAlpha = 0.14;
  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.arc(W - 120, -40, 420, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// Schrift so weit verkleinern, dass der Text in maxWidth passt
function fitText(ctx, text, maxWidth, startPx, family) {
  let px = startPx;
  ctx.font = "800 " + px + "px " + family;
  while (px > 40 && ctx.measureText(text).width > maxWidth) {
    px -= 4;
    ctx.font = "800 " + px + "px " + family;
  }
  return px;
}

function footer(ctx, accent) {
  ctx.fillStyle = accent;
  ctx.font = "700 44px Sora, Inter, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("ASFIT", 72, H - 80);
  ctx.fillStyle = "#8a9099";
  ctx.font = "400 30px Inter, sans-serif";
  ctx.textAlign = "right";
  ctx.fillText("asmarfit-project.onrender.com", W - 72, H - 80);
}

function statBox(ctx, x, y, w, label, value, accent) {
  roundRect(ctx, x, y, w, 190, 28);
  ctx.fillStyle = "rgba(255,255,255,0.06)";
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.font = "700 72px Sora, Inter, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(value, x + 36, y + 96);
  ctx.fillStyle = "#9aa3ac";
  ctx.font = "400 32px Inter, sans-serif";
  ctx.fillText(label, x + 36, y + 150);
  void accent;
}

/** kind "workout": { title, date, duration, volume, kcal, records: [{name, value}] } */
function drawWorkout(ctx, d, accent) {
  base(ctx, accent);
  ctx.fillStyle = "#9aa3ac";
  ctx.font = "400 34px Inter, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(d.date, 72, 140);
  ctx.fillStyle = "#ffffff";
  fitText(ctx, d.title, W - 144, 84, "Sora, Inter, sans-serif");
  ctx.fillText(d.title, 72, 250);
  statBox(ctx, 72, 340, (W - 180) / 2, d.durationLabel, d.duration, accent);
  statBox(ctx, 72 + (W - 180) / 2 + 36, 340, (W - 180) / 2, d.volumeLabel, d.volume, accent);
  if (d.kcal) statBox(ctx, 72, 566, W - 144, d.kcalLabel, d.kcal, accent);
  let y = d.kcal ? 850 : 640;
  if (d.records && d.records.length) {
    ctx.fillStyle = accent;
    ctx.font = "700 40px Sora, Inter, sans-serif";
    ctx.fillText(d.recordsLabel, 72, y);
    y += 36;
    for (const r of d.records.slice(0, 4)) {
      roundRect(ctx, 72, y, W - 144, 104, 24);
      ctx.fillStyle = "rgba(255,255,255,0.06)";
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.font = "600 40px Inter, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText("🏆 " + r.name, 100, y + 66);
      ctx.fillStyle = accent;
      ctx.font = "800 44px Sora, Inter, sans-serif";
      ctx.textAlign = "right";
      ctx.fillText(r.value, W - 108, y + 68);
      ctx.textAlign = "left";
      y += 128;
    }
  }
  footer(ctx, accent);
}

/** kind "day": { title, date, kcal, kcalLabel, macros: [{label, value}] } */
function drawDay(ctx, d, accent) {
  base(ctx, accent);
  ctx.fillStyle = "#9aa3ac";
  ctx.font = "400 34px Inter, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(d.date, 72, 140);
  ctx.fillStyle = "#ffffff";
  fitText(ctx, d.title, W - 144, 84, "Sora, Inter, sans-serif");
  ctx.fillText(d.title, 72, 250);
  // grosse kcal-Zahl
  ctx.fillStyle = accent;
  ctx.font = "800 190px Sora, Inter, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(String(d.kcal), W / 2, 580);
  ctx.fillStyle = "#9aa3ac";
  ctx.font = "400 40px Inter, sans-serif";
  ctx.fillText(d.kcalLabel, W / 2, 650);
  // Makros als drei Boxen
  const bw = (W - 144 - 64) / 3;
  (d.macros || []).slice(0, 3).forEach((m, i) => {
    statBox(ctx, 72 + i * (bw + 32), 760, bw, m.label, m.value, accent);
  });
  footer(ctx, accent);
}

/** kind "week": { title, date, lines: [{label, value}] } */
function drawWeek(ctx, d, accent) {
  base(ctx, accent);
  ctx.fillStyle = "#9aa3ac";
  ctx.font = "400 34px Inter, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(d.date, 72, 140);
  ctx.fillStyle = "#ffffff";
  fitText(ctx, d.title, W - 144, 84, "Sora, Inter, sans-serif");
  ctx.fillText(d.title, 72, 250);
  let y = 380;
  for (const l of (d.lines || []).slice(0, 6)) {
    roundRect(ctx, 72, y, W - 144, 128, 26);
    ctx.fillStyle = "rgba(255,255,255,0.06)";
    ctx.fill();
    ctx.fillStyle = "#cfd5db";
    ctx.font = "500 38px Inter, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(l.label, 104, y + 80);
    ctx.fillStyle = accent;
    ctx.font = "800 48px Sora, Inter, sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(String(l.value), W - 108, y + 82);
    ctx.textAlign = "left";
    y += 152;
  }
  footer(ctx, accent);
}

/** Rendert eine Karte und liefert einen PNG-Blob. */
export function renderShareCard(kind, data, accent = "#E4A64C") {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (kind === "workout") drawWorkout(ctx, data, accent);
  else if (kind === "day") drawDay(ctx, data, accent);
  else drawWeek(ctx, data, accent);
  return new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
}

/** Teilt das Bild über das native Share-Sheet; ohne Share-Sheet wird es heruntergeladen. */
export async function shareCardBlob(blob, text, filename = "asfit.png") {
  const file = new File([blob], filename, { type: "image/png" });
  try {
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], text });
      return "shared";
    }
  } catch (e) {
    if (e && e.name === "AbortError") return "aborted";
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return "downloaded";
}
