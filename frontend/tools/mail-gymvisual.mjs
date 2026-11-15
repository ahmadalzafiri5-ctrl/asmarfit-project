// Einmalige Anfrage an GymVisual über Resend. Der API-Schlüssel wird NICHT im
// Code gespeichert: beim Start einfügen (Strg+V) und Enter drücken.
import { createInterface } from "readline";

const rl = createInterface({ input: process.stdin, output: process.stdout });
const key = await new Promise((res) => rl.question("Resend-API-Schluessel einfuegen (re_...): ", (a) => res(a.trim())));
rl.close();
if (!key.startsWith("re_")) {
  console.error("Das sieht nicht nach einem Resend-Schluessel aus — Abbruch.");
  process.exit(1);
}

const text = `Hello GymVisual team,

I'm the developer of ASFIT, a fitness app on Google Play (package com.asfit.app) made in Switzerland.

We are looking to license your animated exercise demonstrations (GIF/video) for use inside our app, bundled offline. We need roughly 150-200 common exercises (barbell, dumbbell, machine, cable and bodyweight movements).

Could you please let us know:
1. Which bundle/pack would cover a set of ~180 exercises, and the current price?
2. Does the Non-Exclusive Commercial Royalty-Free License cover bundling the files inside a mobile app distributed via Google Play / App Store?
3. Are higher-resolution versions (720p+) available for the animated GIFs, and in which formats (GIF/WebP/MP4)?
4. Is there a discount for a one-time all-exercises purchase?

Note: your website currently returns "403 Forbidden" for us (tried from Switzerland, multiple browsers) — you may want to check your firewall settings.

Thank you and best regards
Ahmad Al-Zafiri
AS Web & App Development, Switzerland
as@development-info.org`;

const r = await fetch("https://api.resend.com/emails", {
  method: "POST",
  headers: { "content-type": "application/json", authorization: "Bearer " + key },
  body: JSON.stringify({
    from: "Ahmad | ASFIT <no-reply@development-info.org>",
    to: ["support@gymvisual.com", "contact@gymvisual.com"],
    cc: ["as@development-info.org"],
    reply_to: "as@development-info.org",
    subject: "Licensing inquiry: animated exercise demos for fitness app (approx. 180 exercises)",
    text,
  }),
});
console.log("Status:", r.status, await r.text());
