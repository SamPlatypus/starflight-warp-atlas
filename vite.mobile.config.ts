// Static client-only build for the Capacitor Android app (no server needed).
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

export default defineConfig({
  root: "mobile",
  base: "./",
  publicDir: "../public",
  plugins: [react(), tailwindcss()],
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "src") } },
  build: { outDir: "../dist-mobile", emptyOutDir: true },
});
