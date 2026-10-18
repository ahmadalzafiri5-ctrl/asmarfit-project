// Übernimmt das in der App gewählte Farb-Theme (Gender + Hell/Dunkel) auf die
// Rechtsseiten. Gleiche Origin wie die App -> gleiche localStorage-Keys.
// Palette = Kopie aus App.jsx (THEMES); gifFilter wird hier nicht gebraucht.
(function () {
  var THEMES = {
    neutral: {
      light: { bg: "#FFFFFF", surface: "#F6F7F8", raised: "#EEF1F3", border: "#E1E4E8", text: "#161A1D", dim: "#656D76", gold: "#008563", goldSoft: "rgba(0,133,99,0.14)", coral: "#E2694F" },
      dark: { bg: "#111416", surface: "#1A1E21", raised: "#242A2E", border: "#2F363B", text: "#F1F4F5", dim: "#9AA5AC", gold: "#1FD1A2", goldSoft: "rgba(31,209,162,0.16)", coral: "#F0806A" },
    },
    female: {
      light: { bg: "#FFFFFF", surface: "#FDF4F8", raised: "#FBE8F0", border: "#F3D6E2", text: "#2B1A24", dim: "#7A616E", gold: "#C54877", goldSoft: "rgba(197,72,119,0.13)", coral: "#F08A5D" },
      dark: { bg: "#171015", surface: "#22171E", raised: "#2D1F27", border: "#3D2A35", text: "#FAEFF4", dim: "#B79CAA", gold: "#F26AA0", goldSoft: "rgba(242,106,160,0.17)", coral: "#F59B70" },
    },
    male: {
      light: { bg: "#FFFFFF", surface: "#F2F5FB", raised: "#E8EEF9", border: "#D6E0F0", text: "#0F1729", dim: "#5C6982", gold: "#2563EB", goldSoft: "rgba(37,99,235,0.12)", coral: "#F0782E" },
      dark: { bg: "#0D1220", surface: "#151C2E", raised: "#1E2740", border: "#2A3550", text: "#EBF1FF", dim: "#94A1BE", gold: "#5B8DF6", goldSoft: "rgba(91,141,246,0.18)", coral: "#F58F4C" },
    },
    diverse: {
      light: { bg: "#FFFFFF", surface: "#F8F6F1", raised: "#F0EBDF", border: "#E2DAC8", text: "#171512", dim: "#6C6659", gold: "#956C09", goldSoft: "rgba(149,108,9,0.14)", coral: "#A63D40" },
      dark: { bg: "#0B0B0A", surface: "#161513", raised: "#201E1A", border: "#2E2B24", text: "#F5EFE0", dim: "#A79C87", gold: "#D4AF37", goldSoft: "rgba(212,175,55,0.18)", coral: "#E0726F" },
    },
  };
  try {
    var mode = JSON.parse(localStorage.getItem("asfit.appearance") || '"system"');
    var sel = JSON.parse(localStorage.getItem("asfit.colorTheme") || '"auto"');
    var gender = sel === "auto" ? ((JSON.parse(localStorage.getItem("asfit.profile") || "null") || {}).gender) : sel;
    var dark = mode === "dark" || (mode === "system" && window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches);
    var t = (THEMES[gender] || THEMES.neutral)[dark ? "dark" : "light"];
    var r = document.documentElement;
    Object.keys(t).forEach(function (k) { r.style.setProperty("--c-" + k, t[k]); });
    r.style.colorScheme = dark ? "dark" : "light";
  } catch (e) { /* ohne gespeichertes Theme bleiben die CSS-Defaults aktiv */ }
})();
