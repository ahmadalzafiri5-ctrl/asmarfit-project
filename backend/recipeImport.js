// Reads the text of a recipe from a link (recipe sites, TikTok captions, Instagram posts when
// they are public) so the AI route can work out the nutrition values.
//
// The server fetches whatever address a caller sends, so every connection is checked: only
// http/https, never private / loopback / link-local addresses (checked on the address the socket
// really connects to, which also stops DNS tricks), a small size limit and a short timeout.
import http from "node:http";
import https from "node:https";
import dns from "node:dns";
import net from "node:net";

const MAX_BYTES = 1_500_000;
const UA = "Mozilla/5.0 (compatible; ASFIT-RecipeImport/1.0)";

export function isPrivateIp(ip) {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split(".").map(Number);
    return a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224;
  }
  if (net.isIPv6(ip)) {
    const x = ip.toLowerCase();
    if (x === "::1" || x === "::") return true;
    if (/^f[cd]/.test(x) || /^fe[89ab]/.test(x)) return true;
    const mapped = x.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return isPrivateIp(mapped[1]);
    return false;
  }
  return true; // not an IP address at all
}

function guardedLookup(hostname, options, cb) {
  dns.lookup(hostname, options, (err, address, family) => {
    if (err) return cb(err);
    const list = Array.isArray(address) ? address : [{ address, family }];
    if (list.some((a) => isPrivateIp(a.address))) return cb(new Error("blocked"));
    cb(null, address, family);
  });
}

function badHost(host) {
  return !host || host === "localhost" || host.endsWith(".local") || host.endsWith(".internal") || (net.isIP(host) && isPrivateIp(host));
}

/** GET with redirects followed by hand (each hop re-checked). Resolves { url, type, body }. */
export function safeGet(rawUrl, { maxRedirects = 3, timeoutMs = 8000, accept = "text/html,application/xhtml+xml,application/json;q=0.8,*/*;q=0.5" } = {}) {
  return new Promise((resolve, reject) => {
    let redirects = 0;
    const go = (urlStr) => {
      let u;
      try {
        u = new URL(urlStr);
      } catch {
        return reject(new Error("bad_url"));
      }
      if (!/^https?:$/.test(u.protocol) || u.username || u.password) return reject(new Error("bad_url"));
      if (badHost(u.hostname.replace(/^\[|\]$/g, ""))) return reject(new Error("blocked"));
      const lib = u.protocol === "https:" ? https : http;
      const req = lib.request(
        u,
        { method: "GET", lookup: guardedLookup, timeout: timeoutMs, headers: { "user-agent": UA, accept, "accept-language": "de,en;q=0.8", "accept-encoding": "identity" } },
        (res) => {
          const code = res.statusCode || 0;
          if (code >= 300 && code < 400 && res.headers.location) {
            res.resume();
            if (++redirects > maxRedirects) return reject(new Error("too_many_redirects"));
            return go(new URL(res.headers.location, u).toString());
          }
          if (code < 200 || code >= 300) {
            res.resume();
            return reject(new Error("http_" + code));
          }
          const chunks = [];
          let size = 0;
          res.on("data", (c) => {
            size += c.length;
            if (size > MAX_BYTES) return req.destroy(new Error("too_large"));
            chunks.push(c);
          });
          res.on("end", () => resolve({ url: u.toString(), type: String(res.headers["content-type"] || ""), body: Buffer.concat(chunks).toString("utf8") }));
          res.on("error", reject);
        }
      );
      req.on("timeout", () => req.destroy(new Error("timeout")));
      req.on("error", reject);
      req.end();
    };
    go(rawUrl);
  });
}

const ENTITIES = { "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'", "&apos;": "'", "&nbsp;": " " };
const decode = (s) =>
  String(s || "")
    .replace(/&(amp|lt|gt|quot|apos|nbsp|#39);/g, (m) => ENTITIES[m] || m)
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Math.min(Number(n), 0x10ffff)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(Math.min(parseInt(h, 16), 0x10ffff)));

function metaContent(html, key) {
  const re = new RegExp("<meta[^>]+(?:property|name)=[\"']" + key + "[\"'][^>]*>", "i");
  const tag = html.match(re);
  if (!tag) return "";
  const c = tag[0].match(/content=("([^"]*)"|'([^']*)')/i);
  return c ? decode(c[2] ?? c[3]) : "";
}

function visibleText(html) {
  return decode(
    html
      .replace(/<(script|style|noscript|svg|head)[\s\S]*?<\/\1>/gi, " ")
      .replace(/<[^>]+>/g, " ")
  )
    .replace(/\s+/g, " ")
    .trim();
}

function findRecipes(node, out) {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) return node.forEach((n) => findRecipes(n, out));
  const type = node["@type"];
  if (type && (Array.isArray(type) ? type : [type]).some((t) => String(t).toLowerCase() === "recipe")) out.push(node);
  if (node["@graph"]) findRecipes(node["@graph"], out);
}

/** Pulls title, description, a schema.org Recipe (if the page has one) and the visible text out of HTML. */
export function extractFromHtml(html) {
  const recipes = [];
  for (const m of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      findRecipes(JSON.parse(m[1].trim()), recipes);
    } catch {
      /* ignore broken blocks */
    }
  }
  const r = recipes[0];
  const recipe = r
    ? {
        name: decode(r.name),
        yield: Array.isArray(r.recipeYield) ? r.recipeYield.join(" / ") : String(r.recipeYield || ""),
        ingredients: (Array.isArray(r.recipeIngredient) ? r.recipeIngredient : []).map((i) => decode(i)).slice(0, 60),
        nutrition: r.nutrition && typeof r.nutrition === "object" ? r.nutrition : null,
      }
    : null;
  return {
    title: metaContent(html, "og:title") || decode((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || ""),
    description: metaContent(html, "og:description") || metaContent(html, "description"),
    recipe,
    text: visibleText(html),
  };
}

/** Everything useful from a link, as one block of plain text for the AI (never longer than ~7000 characters). */
export async function fetchSourceText(url) {
  let target = url;
  let caption = "";
  // TikTok pages are empty for crawlers, but their public oEmbed answer carries the caption.
  if (/^https?:\/\/([\w-]+\.)?tiktok\.com\//i.test(url)) {
    const page = await safeGet(url, { maxRedirects: 3, accept: "*/*" }).catch(() => null);
    if (page) target = page.url;
    const o = await safeGet("https://www.tiktok.com/oembed?url=" + encodeURIComponent(target), { accept: "application/json" }).catch(() => null);
    if (o) {
      try {
        const j = JSON.parse(o.body);
        caption = [j.title, j.author_name ? "(@" + j.author_name + ")" : ""].filter(Boolean).join(" ");
      } catch {
        /* no caption */
      }
    }
    return caption.length >= 20 ? "TikTok caption: " + caption : "";
  }
  const page = await safeGet(url);
  if (!/html|xml|json|text/i.test(page.type)) throw new Error("not_text");
  const x = extractFromHtml(page.body);
  const parts = [];
  if (x.title) parts.push("Title: " + x.title);
  if (x.description) parts.push("Description: " + x.description);
  if (x.recipe) {
    parts.push("Recipe data: " + x.recipe.name + (x.recipe.yield ? " | yield: " + x.recipe.yield : ""));
    if (x.recipe.ingredients.length) parts.push("Ingredients:\n- " + x.recipe.ingredients.join("\n- "));
    if (x.recipe.nutrition) parts.push("Nutrition per serving (from the page): " + JSON.stringify(x.recipe.nutrition).slice(0, 600));
  }
  if (!x.recipe && x.text) parts.push("Page text: " + x.text.slice(0, 5000));
  return parts.join("\n").slice(0, 7000);
}
