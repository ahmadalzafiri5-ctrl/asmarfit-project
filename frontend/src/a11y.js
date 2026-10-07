// Accessibility for a screen built from tappable divs: every element with a pointer cursor gets the button role,
// can be reached with the Tab key and used with Enter / Space, and icon-only buttons get a spoken name.
// Runs once at the root (and follows the page as it changes); the single screens need no change.
// Elements added by this helper carry data-a11y-auto, everything else is left alone.
const NAMES = {
  de: { "chevron-left": "Zurück", "chevron-right": "Weiter", "chevron-down": "Aufklappen", "chevron-up": "Zuklappen", settings: "Einstellungen", x: "Schließen", plus: "Hinzufügen", "plus-step": "Erhöhen", minus: "Verringern", pencil: "Bearbeiten", "share-2": "Teilen", share: "Teilen", trash: "Löschen", "trash-2": "Löschen", check: "Bestätigen", search: "Suchen", "scan-barcode": "Barcode scannen", scan: "Scannen", camera: "Kamera", star: "Favorit", bell: "Erinnerung", info: "Information", play: "Start", pause: "Pause", "rotate-ccw": "Zurücksetzen", "refresh-cw": "Neu laden", copy: "Kopieren", "more-horizontal": "Mehr", "arrow-left": "Zurück", "arrow-right": "Weiter", image: "Bild", "image-plus": "Bild hinzufügen", maximize: "Vollbild", "maximize-2": "Vollbild" },
  en: { "chevron-left": "Back", "chevron-right": "Next", "chevron-down": "Expand", "chevron-up": "Collapse", settings: "Settings", x: "Close", plus: "Add", "plus-step": "Increase", minus: "Decrease", pencil: "Edit", "share-2": "Share", share: "Share", trash: "Delete", "trash-2": "Delete", check: "Confirm", search: "Search", "scan-barcode": "Scan barcode", scan: "Scan", camera: "Camera", star: "Favourite", bell: "Reminder", info: "Information", play: "Play", pause: "Pause", "rotate-ccw": "Reset", "refresh-cw": "Reload", copy: "Copy", "more-horizontal": "More", "arrow-left": "Back", "arrow-right": "Next", image: "Image", "image-plus": "Add image", maximize: "Full screen", "maximize-2": "Full screen" },
};

const isTap = (el) => el && el.nodeType === 1 && (el.tagName === "DIV" || el.tagName === "SPAN") && el.style && el.style.cursor === "pointer";
const iconKey = (el) => {
  const svg = el.querySelector && el.querySelector("svg[class*='lucide-']");
  if (!svg) return null;
  const m = String(svg.getAttribute("class") || "").match(/lucide-([a-z0-9-]+)/g);
  if (!m) return null;
  // the last "lucide-xyz" is the icon name ("lucide lucide-settings")
  return m[m.length - 1].replace("lucide-", "");
};

export function installA11y(lang = "de") {
  let current = lang;
  const nameFor = (key) => (NAMES[current] || NAMES.de)[key] || null;

  const decorate = (el) => {
    if (!isTap(el)) {
      if (el && el.nodeType === 1 && el.hasAttribute && el.hasAttribute("data-a11y-auto")) {
        el.removeAttribute("role");
        el.removeAttribute("tabindex");
        el.removeAttribute("data-a11y-auto");
      }
      return;
    }
    if (!el.hasAttribute("data-a11y-auto")) {
      if (el.hasAttribute("role") || el.hasAttribute("tabindex")) return; // already handled by hand
      el.setAttribute("role", "button");
      el.setAttribute("tabindex", "0");
      el.setAttribute("data-a11y-auto", "");
    }
    if (!el.hasAttribute("aria-label") || el.hasAttribute("data-a11y-icon")) {
      const text = (el.textContent || "").trim();
      if (!text) {
        let key = iconKey(el);
        // a plus next to a minus is an amount stepper ("increase"), a lone plus adds something
        if (key === "plus" && el.parentElement && el.parentElement.querySelector(".lucide-minus")) key = "plus-step";
        const name = key && nameFor(key);
        if (name) {
          el.setAttribute("aria-label", name);
          el.setAttribute("data-a11y-icon", key);
        }
      }
    }
  };
  const scan = (root) => {
    if (!root || root.nodeType !== 1) return;
    decorate(root);
    root.querySelectorAll("div,span").forEach(decorate);
  };

  const obs = new MutationObserver((list) => {
    for (const m of list) {
      if (m.type === "attributes") decorate(m.target);
      else m.addedNodes.forEach((n) => n.nodeType === 1 && scan(n));
    }
  });
  const start = () => {
    scan(document.body);
    obs.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["style"] });
  };
  const onKey = (e) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    const el = e.target;
    if (el && el.hasAttribute && el.hasAttribute("data-a11y-auto")) {
      e.preventDefault();
      el.click();
    }
  };
  document.addEventListener("keydown", onKey);
  if (document.body) start();

  return {
    relabel(next) {
      current = next;
      document.querySelectorAll("[data-a11y-icon]").forEach((el) => {
        const name = nameFor(el.getAttribute("data-a11y-icon"));
        if (name) el.setAttribute("aria-label", name);
      });
    },
    stop() {
      obs.disconnect();
      document.removeEventListener("keydown", onKey);
    },
  };
}
