// Prüft, ob ein In-App-Kauf-Schlüssel bei der App Store Server API akzeptiert wird.
// Fragt eine erfundene Transaktion ab: 404 = Anmeldung gültig, 401 = Schlüssel/IDs falsch.
// Aufruf: node tools/apple-key-check.mjs <pfad.p8> <keyId> <issuerId> [bundleId]
import { readFileSync } from "node:fs";
import { importPKCS8, SignJWT } from "jose";

const [p8Path, keyId, issuer, bid = "com.asfit.app"] = process.argv.slice(2);
const key = await importPKCS8(readFileSync(p8Path, "utf8"), "ES256");
const jwt = await new SignJWT({ bid })
  .setProtectedHeader({ alg: "ES256", kid: keyId, typ: "JWT" })
  .setIssuer(issuer)
  .setAudience("appstoreconnect-v1")
  .setIssuedAt()
  .setExpirationTime("10m")
  .sign(key);
for (const host of ["https://api.storekit.itunes.apple.com", "https://api.storekit-sandbox.itunes.apple.com"]) {
  const r = await fetch(host + "/inApps/v1/transactions/2000000000000001", { headers: { authorization: "Bearer " + jwt } });
  const verdict = r.status === 401 ? "ABGELEHNT (Schlüssel/IDs falsch)" : r.status === 404 || r.status === 400 ? "Anmeldung OK" : "unerwartet";
  console.log(host.includes("sandbox") ? "Sandbox:   " : "Produktion:", r.status, verdict);
}
