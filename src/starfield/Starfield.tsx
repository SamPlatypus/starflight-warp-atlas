import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Gauge, Rocket, Settings2, Sparkles, X } from "lucide-react";
import { starFragment, starVertex } from "./shaders";
import { loadStars, makeFarField, type StarData } from "./stars";
import {
  createFlight,
  densityToCount,
  densityToMagLimit,
  dragToSteer,
  sliderToSpeed,
  stepFlight,
  PC_TO_LY,
  type Flight,
} from "./sim";
import { InstallButton } from "./InstallButton";

const FAR_BOX = 40;
const FAR_COUNT = 5000;
const STREAK = 0.035; // seconds of trail
const FOV = 68;

interface Shared {
  flight: Flight;
  boosting: boolean;
  cam: THREE.Vector3;
  density: number;
}

function makeMaterial(wrap: boolean) {
  return new THREE.ShaderMaterial({
    vertexShader: starVertex,
    fragmentShader: starFragment,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uCam: { value: new THREE.Vector3() },
      uVel: { value: new THREE.Vector3() },
      uStreak: { value: STREAK },
      uWrap: { value: wrap ? 1 : 0 },
      uBox: { value: FAR_BOX },
      uRes: { value: new THREE.Vector2(1, 1) },
      uPx: { value: 1.5 },
      uMagLimit: { value: 6.5 },
    },
  });
}

function makeGeometry(d: StarData) {
  const g = new THREE.InstancedBufferGeometry();
  g.setAttribute("corner", new THREE.Float32BufferAttribute([0, -1, 1, -1, 1, 1, 0, 1], 2));
  g.setIndex([0, 1, 2, 0, 2, 3]);
  g.setAttribute("aPos", new THREE.InstancedBufferAttribute(d.pos, 3));
  g.setAttribute("aAbs", new THREE.InstancedBufferAttribute(d.abs, 1));
  g.setAttribute("aCol", new THREE.InstancedBufferAttribute(d.col, 3));
  g.instanceCount = d.count;
  return g;
}

function Scene({ shared, stars, onReady }: { shared: Shared; stars: StarData; onReady: () => void }) {
  const { camera, gl, size, setDpr } = useThree();
  const real = useMemo(() => ({ geo: makeGeometry(stars), mat: makeMaterial(false) }), [stars]);
  const far = useMemo(() => ({ geo: makeGeometry(makeFarField(FAR_COUNT, FAR_BOX)), mat: makeMaterial(true) }), []);
  const fwd = useMemo(() => new THREE.Vector3(), []);
  const dq = useMemo(() => new THREE.Quaternion(), []);
  const euler = useMemo(() => new THREE.Euler(), []);
  const perf = useRef({ t: 0, frames: 0, dpr: Math.min(window.devicePixelRatio, 2), ready: false });

  useEffect(() => () => {
    real.geo.dispose();
    real.mat.dispose();
    far.geo.dispose();
    far.mat.dispose();
  }, [real, far]);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const f = shared.flight;
    stepFlight(f, dt, shared.boosting);

    euler.set(f.pitchRate * dt, f.yawRate * dt, 0);
    dq.setFromEuler(euler);
    camera.quaternion.multiply(dq);
    fwd.set(0, 0, -1).applyQuaternion(camera.quaternion).multiplyScalar(f.speed);
    shared.cam.addScaledVector(fwd, dt);

    const pc = camera as THREE.PerspectiveCamera;
    const fov = FOV + 14 * f.boost;
    if (Math.abs(pc.fov - fov) > 0.01) {
      pc.fov = fov;
      pc.updateProjectionMatrix();
    }

    const dpr = gl.getPixelRatio();
    const count = densityToCount(shared.density, stars.count);
    real.geo.instanceCount = count;
    far.geo.instanceCount = Math.round(FAR_COUNT * (0.3 + 0.7 * shared.density));
    const mag = densityToMagLimit(shared.density);
    for (const m of [real.mat, far.mat]) {
      const u = m.uniforms;
      u.uCam.value.copy(shared.cam);
      u.uVel.value.copy(fwd);
      u.uStreak.value = STREAK * (1 + 2.5 * f.boost);
      u.uRes.value.set(size.width * dpr, size.height * dpr);
      u.uPx.value = 1.3 * dpr;
      u.uMagLimit.value = mag;
    }

    // Adaptive resolution: drop pixel ratio if sustained under ~45fps.
    const p = perf.current;
    p.t += rawDt;
    p.frames++;
    if (p.t > 2) {
      const fps = p.frames / p.t;
      if (fps < 45 && p.dpr > 1) {
        p.dpr = Math.max(1, p.dpr - 0.25);
        setDpr(p.dpr);
      }
      p.t = 0;
      p.frames = 0;
    }
    if (!p.ready) {
      p.ready = true;
      onReady();
    }
  });

  return (
    <>
      <mesh geometry={far.geo} material={far.mat} frustumCulled={false} />
      <mesh geometry={real.geo} material={real.mat} frustumCulled={false} />
    </>
  );
}

const LS_KEY = "starfield-settings";

export function Starfield() {
  const [stars, setStars] = useState<StarData | null>(null);
  const [ready, setReady] = useState(false);
  const [speedT, setSpeedT] = useState(0.45);
  const [density, setDensity] = useState(0.5);
  const [panel, setPanel] = useState(false);
  const [uiVisible, setUiVisible] = useState(true);
  const [boostOn, setBoostOn] = useState(false);
  const hudRef = useRef<HTMLDivElement>(null);
  const idle = useRef<ReturnType<typeof setTimeout>>();
  const shared = useRef<Shared>({
    flight: createFlight(sliderToSpeed(0.45)),
    boosting: false,
    cam: new THREE.Vector3(),
    density: 0.5,
  }).current;
  const drag = useRef<{ id: number; x: number; y: number; t: number; moved: boolean } | null>(null);

  useEffect(() => {
    loadStars().then(setStars);
    try {
      const s = JSON.parse(localStorage.getItem(LS_KEY) ?? "null");
      if (s) {
        setSpeedT(s.speedT);
        setDensity(s.density);
      }
    } catch {}
    let lock: { release: () => Promise<void> } | null = null;
    const nav = navigator as Navigator & { wakeLock?: { request: (t: "screen") => Promise<typeof lock> } };
    nav.wakeLock?.request("screen").then((l) => (lock = l)).catch(() => {});
    return () => void lock?.release();
  }, []);

  useEffect(() => {
    shared.flight.cruise = sliderToSpeed(speedT);
    shared.density = density;
    localStorage.setItem(LS_KEY, JSON.stringify({ speedT, density }));
  }, [speedT, density, shared]);

  // Auto-hide controls after a few idle seconds.
  const poke = () => {
    setUiVisible(true);
    clearTimeout(idle.current);
    idle.current = setTimeout(() => setUiVisible(false), 4000);
  };
  useEffect(() => {
    poke();
    return () => clearTimeout(idle.current);
  }, []);
  useEffect(() => {
    if (panel) clearTimeout(idle.current);
  }, [panel]);

  // HUD text updates outside React renders.
  useEffect(() => {
    const id = setInterval(() => {
      const el = hudRef.current;
      if (!el) return;
      const f = shared.flight;
      const ly = shared.cam.length() * PC_TO_LY;
      el.textContent = `${(f.speed * PC_TO_LY).toFixed(f.speed < 3 ? 1 : 0)} ly/s · ${ly < 10 ? ly.toFixed(1) : Math.round(ly).toLocaleString()} ly from Sol`;
    }, 200);
    return () => clearInterval(id);
  }, [shared]);

  const setBoost = (on: boolean) => {
    shared.boosting = on;
    setBoostOn(on);
  };

  const onDown = (e: React.PointerEvent) => {
    if (drag.current) return;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY, t: performance.now(), moved: false };
  };
  const onMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (Math.hypot(dx, dy) > 10) d.moved = true;
    const short = Math.min(window.innerWidth, window.innerHeight);
    shared.flight.steerX = dragToSteer(dx, short);
    shared.flight.steerY = dragToSteer(dy, short);
  };
  const onUp = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    shared.flight.steerX = 0;
    shared.flight.steerY = 0;
    if (!d.moved && performance.now() - d.t < 300) {
      if (uiVisible && !panel) setUiVisible(false);
      else poke();
    }
    drag.current = null;
  };

  const fade = uiVisible || panel ? "opacity-100" : "pointer-events-none opacity-0";

  return (
    <div className="fixed inset-0 touch-none select-none overflow-hidden bg-background" data-scene-ready={ready ? "" : undefined}>
      <div className="absolute inset-0" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
        {stars && (
          <Canvas
            dpr={[1, 2]}
            gl={{ antialias: false, powerPreference: "high-performance", alpha: false }}
            camera={{ fov: FOV, near: 0.0001, far: 10, position: [0, 0, 0] }}
            onCreated={({ gl }) => gl.setClearColor("#020308")}
          >
            <Scene shared={shared} stars={stars} onReady={() => setReady(true)} />
          </Canvas>
        )}
      </div>

      {!stars && (
        <div className="hud-text absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
          Charting {""}109,400 stars…
        </div>
      )}

      <div className={`pointer-events-none absolute inset-x-0 top-0 flex justify-center pt-[max(env(safe-area-inset-top),12px)] transition-opacity duration-700 ${fade}`}>
        <div ref={hudRef} className="hud-text text-[11px] tracking-widest text-muted-foreground" />
      </div>

      <div className={`absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 px-5 pb-[max(env(safe-area-inset-bottom),20px)] transition-opacity duration-700 ${fade}`}>
        <button aria-label="Settings" onClick={() => setPanel((p) => !p)} className="hud-chip size-11">
          {panel ? <X className="size-4" /> : <Settings2 className="size-4" />}
        </button>

        <button
          aria-label="Boost"
          onPointerDown={(e) => {
            e.stopPropagation();
            (e.target as Element).setPointerCapture?.(e.pointerId);
            setBoost(true);
            poke();
          }}
          onPointerUp={() => setBoost(false)}
          onPointerCancel={() => setBoost(false)}
          onContextMenu={(e) => e.preventDefault()}
          className={`hud-boost ${boostOn ? "hud-boost-on" : ""}`}
        >
          <Rocket className="size-6" />
        </button>
      </div>

      {panel && (
        <div className="hud-panel absolute bottom-[calc(max(env(safe-area-inset-bottom),20px)+60px)] left-5 w-[min(300px,calc(100vw-40px))] space-y-4 p-4">
          <label className="block space-y-2">
            <span className="hud-text flex items-center gap-2 text-[11px] text-muted-foreground">
              <Gauge className="size-3.5" /> SPEED
            </span>
            <input type="range" min={0} max={1} step={0.001} value={speedT} onChange={(e) => setSpeedT(+e.target.value)} className="hud-range" />
          </label>
          <label className="block space-y-2">
            <span className="hud-text flex items-center gap-2 text-[11px] text-muted-foreground">
              <Sparkles className="size-3.5" /> DENSITY · {stars ? densityToCount(density, stars.count).toLocaleString() : "…"} stars
            </span>
            <input type="range" min={0} max={1} step={0.001} value={density} onChange={(e) => setDensity(+e.target.value)} className="hud-range" />
          </label>
          <p className="hud-text text-[10px] leading-relaxed text-muted-foreground">
            Drag to steer · hold rocket to boost · tap to hide controls. Real positions from the Yale Bright Star & HYG catalogues.
          </p>
          <InstallButton />
        </div>
      )}
    </div>
  );
}
