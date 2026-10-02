// The curated food list lives in backend/basics.js (the server uses it for search).
// The app bundles the same file so common foods show up instantly, typo-tolerant,
// before the server has even answered (a sleeping free Render server needs ~30 s).
// Copy it over before every dev start / build; if the backend folder isn't there
// (e.g. a build that only checked out frontend/), keep the committed copy.
import { copyFileSync, existsSync } from "node:fs";

const src = new URL("../../backend/basics.js", import.meta.url);
const dst = new URL("../src/basics.js", import.meta.url);
if (existsSync(src)) {
  copyFileSync(src, dst);
  console.log("basics.js synced from backend/");
} else {
  console.log("backend/basics.js not found - keeping committed src/basics.js");
}
