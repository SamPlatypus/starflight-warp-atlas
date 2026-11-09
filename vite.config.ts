// @lovable.dev/vite-tanstack-config already includes tanstackStart, react, tailwind, paths etc. — do NOT add them manually.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  vite: {
    plugins: [
      VitePWA({
        registerType: "autoUpdate",
        injectRegister: null,
        devOptions: { enabled: false },
        filename: "sw.js",
        manifest: false,
        workbox: {
          globPatterns: ["**/*.{js,css,png,ico,svg,bin,webmanifest}"],
          maximumFileSizeToCacheInBytes: 6_000_000,
          navigateFallback: null,
          runtimeCaching: [
            {
              urlPattern: ({ request, url }) => request.mode === "navigate" && !url.pathname.startsWith("/~oauth"),
              handler: "NetworkFirst",
              options: { cacheName: "pages", networkTimeoutSeconds: 3 },
            },
          ],
        },
      }),
    ],
  },
});
