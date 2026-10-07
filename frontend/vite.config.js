import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// every build gets an id; the app asks version.json (written by the plugin below) whether a newer build is live
const BUILD_ID = Date.now().toString(36);
const versionFile = () => ({
  name: "asfit-version-file",
  generateBundle() {
    this.emitFile({ type: "asset", fileName: "version.json", source: JSON.stringify({ build: BUILD_ID }) });
  },
});

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), versionFile()],
  define: { __BUILD_ID__: JSON.stringify(BUILD_ID) },
  server: {
    port: 5173,
  },
});
