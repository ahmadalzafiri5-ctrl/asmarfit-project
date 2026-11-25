import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
// fonts come with the app (no request to Google, and they work offline in the Android app)
import "@fontsource/sora/latin-500.css";
import "@fontsource/sora/latin-600.css";
import "@fontsource/sora/latin-700.css";
import "@fontsource/inter/latin-400.css";
import "@fontsource/inter/latin-500.css";
import "@fontsource/inter/latin-600.css";

// iPhones mit deutscher/Schweizer Region tippen "78,5" — Kommazahlen-Felder bekommen immer einen Punkt,
// damit Number()/parseFloat() in der App die Zahl verstehen. Der native Setter umgeht Reacts Wert-Tracker,
// so dass React die Änderung trotzdem als onChange mit dem Punkt-Wert meldet.
const nativeValueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
window.addEventListener(
  "input",
  (e) => {
    const el = e.target;
    if (!(el instanceof HTMLInputElement) || el.inputMode !== "decimal" || !el.value.includes(",")) return;
    const pos = el.selectionStart;
    nativeValueSetter.call(el, el.value.replace(/,/g, "."));
    try {
      el.setSelectionRange(pos, pos);
    } catch {
      /* nicht jedes Feld kennt eine Auswahl */
    }
  },
  true
);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
