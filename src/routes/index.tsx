import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { Starfield } from "@/starfield/Starfield";
import { setupServiceWorker } from "@/lib/pwa";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Starflight Atlas — Warp through real stars" },
      { name: "description", content: "Fly at warp speed through 109,000 real stars from the Yale Bright Star and HYG catalogues. Works offline." },
      { property: "og:title", content: "Starflight Atlas — Warp through real stars" },
      { property: "og:description", content: "An immersive 3D warp-speed flight through the real night sky, steered by touch." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  useEffect(() => {
    void setupServiceWorker();
  }, []);
  return <Starfield />;
}
