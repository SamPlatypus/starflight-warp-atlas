import { useEffect, useState } from "react";
import { Download } from "lucide-react";

interface BIPEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
}

export function InstallButton() {
  const [evt, setEvt] = useState<BIPEvent | null>(null);
  const [mode, setMode] = useState<"hidden" | "prompt" | "ios" | "manual">("hidden");
  const [help, setHelp] = useState(false);

  useEffect(() => {
    const w = window as Window & { Capacitor?: { isNativePlatform?: () => boolean }; __bip?: BIPEvent };
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone;
    if (w.Capacitor?.isNativePlatform?.() || standalone) return;
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    setMode(ios ? "ios" : "manual");
    const on = (e: Event) => {
      e.preventDefault();
      setEvt(e as BIPEvent);
      setMode("prompt");
    };
    window.addEventListener("beforeinstallprompt", on);
    const done = () => setMode("hidden");
    window.addEventListener("appinstalled", done);
    return () => {
      window.removeEventListener("beforeinstallprompt", on);
      window.removeEventListener("appinstalled", done);
    };
  }, []);

  if (mode === "hidden") return null;

  const click = async () => {
    if (mode === "prompt" && evt) {
      await evt.prompt();
      await evt.userChoice;
      setEvt(null);
      setMode("hidden");
    } else setHelp((h) => !h);
  };

  return (
    <div className="space-y-2">
      <button onClick={click} className="hud-install">
        <Download className="size-4" /> Install App
      </button>
      {help && (
        <p className="hud-text text-[10px] leading-relaxed text-muted-foreground">
          {mode === "ios"
            ? "Tap Share, then “Add to Home Screen”."
            : "Open the browser menu and choose “Install app” or “Add to Home screen”. Or download the APK from GitHub Actions."}
        </p>
      )}
    </div>
  );
}
