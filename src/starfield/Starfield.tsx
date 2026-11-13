import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { ChevronRight, Crosshair, Gauge, Navigation, Rocket, Settings2, Sparkles, X } from "lucide-react";
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
import { placeCompass, type CompassPlacement } from "./compass";
import { createAutopilot, disengage, engage, pickNearest, slerpFactor, stepAutopilot, type ApPhase, type Autopilot } from "./autopilot";
import { LANDMARKS, toScene, type Landmark } from "./namedStars";

const FAR_BOX = 40;
const FAR_COUNT = 5000;
const STREAK = 0.035; // seconds of trail
const FOV = 68;

interface Shared {
  flight: Flight;
  boosting: boolean;
  cam: THREE.Vector3;
  density: number;
  camera: THREE.PerspectiveCamera | null;
  target: Landmark | null;
  targetPos: THREE.Vector3;
  ap: Autopilot;
  onPhase: (p: ApPhase) => void;
  onArrive: () => void;
}

type ApStatus = ApPhase | "arrived";
const LANDMARK_POS = LANDMARKS.map((s) => new THREE.Vector3(...toScene(s)));
const ORIGIN = new THREE.Vector3();

interface CompassEls {
  root: HTMLElement | null;
  arrow: HTMLElement | null;
  tag: HTMLElement | null;
}

const fmtLy = (ly: number) => (ly < 1 ? ly.toFixed(2) : ly < 10 ? ly.toFixed(1) : Math.round(ly).toLocaleString());

/** Position a HUD marker (reticle or edge chevron) from a placement. */
function writeMarker(m: CompassEls, at: CompassPlacement, w: number, h: number) {
  const el = m.root;
  if (!el) return;
  el.dataset["mode"] = at.mode;
  if (at.mode === "hidden") return;
  el.style.transform = `translate3d(${at.x.toFixed(1)}px, ${at.y.toFixed(1)}px, 0)`;
  if (at.mode === "edge" && m.arrow) m.arrow.style.transform = `rotate(${at.angle.toFixed(3)}rad)`;
  if (m.tag) {
    const mid = Math.abs(at.x - w / 2) < w / 6;
    const tx = mid ? "-50%" : at.x > w / 2 ? "calc(-100% - 22px)" : "22px";
    const ty = at.y > h / 2 ? "calc(-100% - 22px)" : "22px";
    m.tag.style.transform = `translate(${tx}, ${ty})`;
  }
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

function Scene({ shared, stars, compass, marker, onReady }: { shared: Shared; stars: StarData; compass: CompassEls; marker: CompassEls; onReady: () => void }) {
  const { camera, gl, size, setDpr } = useThree();
  const real = useMemo(() => ({ geo: makeGeometry(stars), mat: makeMaterial(false) }), [stars]);
  const far = useMemo(() => ({ geo: makeGeometry(makeFarField(FAR_COUNT, FAR_BOX)), mat: makeMaterial(true) }), []);
  const fwd = useMemo(() => new THREE.Vector3(), []);
  const dq = useMemo(() => new THREE.Quaternion(), []);
  const euler = useMemo(() => new THREE.Euler(), []);
  const solView = useMemo(() => new THREE.Vector3(), []);
  const solNdc = useMemo(() => new THREE.Vector3(), []);
  const toTarget = useMemo(() => new THREE.Vector3(), []);
  const up = useMemo(() => new THREE.Vector3(), []);
  const look = useMemo(() => new THREE.Matrix4(), []);
  const goal = useMemo(() => new THREE.Quaternion(), []);
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
    const pc = camera as THREE.PerspectiveCamera;
    shared.camera = pc;
    const ap = shared.ap;
    const piloting = ap.phase !== "off" && shared.target !== null;
    stepFlight(f, dt, shared.boosting && !piloting);

    if (piloting) {
      // Autopilot: slerp heading toward the target, keeping the current "up" to avoid rolling.
      f.yawRate = 0;
      f.pitchRate = 0;
      toTarget.copy(shared.targetPos).sub(shared.cam);
      up.set(0, 1, 0).applyQuaternion(camera.quaternion);
      look.lookAt(ORIGIN, toTarget, up);
      goal.setFromRotationMatrix(look);
      camera.quaternion.slerp(goal, slerpFactor(dt));
    } else {
      euler.set(f.pitchRate * dt, f.yawRate * dt, 0);
      dq.setFromEuler(euler);
      camera.quaternion.multiply(dq);
    }
    fwd.set(0, 0, -1).applyQuaternion(camera.quaternion);
    if (piloting) {
      const prev = ap.phase;
      const res = stepAutopilot(ap, fwd.angleTo(toTarget), toTarget.length(), f.speed, dt);
      f.speed = ap.speed;
      if (res === "arrived") shared.onArrive();
      else if (ap.phase !== prev) shared.onPhase(ap.phase);
    }
    fwd.multiplyScalar(f.speed);
    shared.cam.addScaledVector(fwd, dt);

    const fov = FOV + 14 * f.boost;
    if (Math.abs(pc.fov - fov) > 0.01) {
      pc.fov = fov;
      pc.updateProjectionMatrix();
    }

    // Sol compass: Sol sits at world origin, so relative to the camera it is -cam.
    pc.updateMatrixWorld();
    if (compass.root) {
      solView.copy(shared.cam).negate().applyMatrix4(pc.matrixWorldInverse);
      solNdc.copy(shared.cam).negate().project(pc);
      writeMarker(compass, placeCompass(solView, solNdc, size.width, size.height), size.width, size.height);
    }
    // Target reticle: same placement rules as the compass, relative to the locked landmark.
    if (marker.root) {
      if (!shared.target) marker.root.dataset["mode"] = "hidden";
      else {
        solView.copy(shared.targetPos).sub(shared.cam).applyMatrix4(pc.matrixWorldInverse);
        solNdc.copy(shared.targetPos).sub(shared.cam).project(pc);
        writeMarker(marker, placeCompass(solView, solNdc, size.width, size.height), size.width, size.height);
      }
    }

    const dpr = gl.getPixelRatio();
    const count = densityToCount(shared.density, stars.count);
    real.geo.instanceCount = count;
    far.geo.instanceCount = Math.round(FAR_COUNT * (0.3 + 0.7 * shared.density));
    const mag = densityToMagLimit(shared.density);
    for (const m of [real.mat, far.mat]) {
      const u = m.uniforms as Record<string, { value: any }>;
      u["uCam"]!.value.copy(shared.cam);
      u["uVel"]!.value.copy(fwd);
      u["uStreak"]!.value = STREAK * (1 + 2.5 * f.boost);
      u["uRes"]!.value.set(size.width * dpr, size.height * dpr);
      u["uPx"]!.value = 1.3 * dpr;
      u["uMagLimit"]!.value = mag;
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
  const [solTag, setSolTag] = useState(false);
  const [target, setTarget] = useState<Landmark | null>(null);
  const [apStatus, setApStatus] = useState<ApStatus>("off");
  const targetDistRef = useRef<HTMLSpanElement>(null);
  const marker = useRef<CompassEls>({ root: null, arrow: null, tag: null }).current;
  const hudRef = useRef<HTMLDivElement>(null);
  const compass = useRef<CompassEls>({ root: null, arrow: null, tag: null }).current;
  const idle = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const shared = useRef<Shared>({
    flight: createFlight(sliderToSpeed(0.45)),
    boosting: false,
    cam: new THREE.Vector3(),
    density: 0.5,
    camera: null,
    target: null,
    targetPos: new THREE.Vector3(),
    ap: createAutopilot(),
    onPhase: (p) => setApStatus(p),
    onArrive: () => {
      setApStatus("arrived");
      setSpeedT(0); // cut throttle to minimum
    },
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
      el.textContent = `${(f.speed * PC_TO_LY).toFixed(f.speed < 3 ? 1 : 0)} ly/s · ${fmtLy(ly)} ly from Sol`;
      if (compass.tag) compass.tag.textContent = `Sol · ${fmtLy(ly)} ly`;
      if (shared.target && targetDistRef.current) {
        targetDistRef.current.textContent = `${fmtLy(shared.targetPos.distanceTo(shared.cam) * PC_TO_LY)} ly`;
      }
    }, 200);
    return () => clearInterval(id);
  }, [shared, compass]);

  const setBoost = (on: boolean) => {
    shared.boosting = on;
    setBoostOn(on);
  };

  const cancelAutopilot = () => {
    if (shared.ap.phase === "off") return;
    disengage(shared.ap);
    setApStatus("off");
  };
  const selectTarget = (i: number) => {
    const s = LANDMARKS[i];
    if (!s) return;
    if (shared.target !== s) cancelAutopilot();
    shared.target = s;
    shared.targetPos.copy(LANDMARK_POS[i]!);
    setTarget(s);
    if (shared.ap.phase === "off") setApStatus("off");
  };
  const clearTarget = () => {
    cancelAutopilot();
    shared.target = null;
    setTarget(null);
  };
  const flyHere = () => {
    if (!shared.target) return;
    engage(shared.ap, shared.flight.speed);
    setApStatus("align");
    poke();
  };
  /** Landmark index within the tap radius of a screen point, using the live camera. */
  const pickAt = (x: number, y: number, w: number, h: number) => {
    const pc = shared.camera;
    if (!pc) return -1;
    pc.updateMatrixWorld();
    const v = new THREE.Vector3();
    const pts = LANDMARK_POS.map((p) => {
      v.copy(p).sub(shared.cam).applyMatrix4(pc.matrixWorldInverse);
      if (v.z >= 0) return null;
      v.copy(p).sub(shared.cam).project(pc);
      if (Math.abs(v.x) > 1 || Math.abs(v.y) > 1) return null;
      return { x: ((v.x + 1) / 2) * w, y: ((1 - v.y) / 2) * h };
    });
    return pickNearest(pts, x, y);
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
    if (!d.moved && Math.hypot(dx, dy) > 10) {
      d.moved = true;
      cancelAutopilot(); // steering by hand takes back control
    }
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
      const box = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const hit = pickAt(e.clientX - box.left, e.clientY - box.top, box.width, box.height);
      if (hit >= 0) {
        selectTarget(hit);
        poke();
      } else if (uiVisible && !panel) setUiVisible(false);
      else poke();
    }
    drag.current = null;
  };

  const live = uiVisible || panel;
  const fade = live ? "opacity-100" : "pointer-events-none opacity-0";

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
            <Scene shared={shared} stars={stars} compass={compass} marker={marker} onReady={() => setReady(true)} />
          </Canvas>
        )}
      </div>

      {!stars && (
        <div className="hud-text absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
          Charting {""}109,400 stars…
        </div>
      )}

      {/* Sol compass: placed every frame by the scene; sits under the controls so buttons win taps. */}
      <button
        ref={(n) => void (compass.root = n)}
        data-mode="hidden"
        aria-label="Sol compass"
        aria-pressed={solTag}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={() => {
          setSolTag((t) => !t);
          poke();
        }}
        className={`hud-compass transition-opacity duration-700 ${fade}`}
      >
        <span className="hud-compass-dot" />
        <span ref={(n) => void (compass.arrow = n)} className="hud-compass-arrow">
          <ChevronRight className="size-5" strokeWidth={2.5} />
        </span>
        <span ref={(n) => void (compass.tag = n)} className={`hud-compass-tag hud-text ${solTag ? "" : "hidden"}`} />
      </button>

      {/* Target reticle: stays up while a landmark is locked; taps pass through to the sky. */}
      <div ref={(n) => void (marker.root = n)} data-mode="hidden" aria-hidden className="hud-target">
        <span className="hud-target-ring" />
        <span ref={(n) => void (marker.arrow = n)} className="hud-target-arrow">
          <ChevronRight className="size-5" strokeWidth={2.5} />
        </span>
      </div>

      {target && (
        <div
          role="dialog"
          aria-label={`Target ${target.name}`}
          className={`hud-card absolute left-1/2 top-[calc(max(env(safe-area-inset-top),12px)+26px)] w-[min(320px,calc(100vw-40px))] -translate-x-1/2 p-3.5 transition-opacity duration-700 ${fade}`}
        >
          <div className="flex items-start gap-3">
            <Crosshair className="mt-0.5 size-4 shrink-0 text-primary" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-base font-semibold text-foreground">{target.name}</div>
              <div className="hud-text truncate text-[11px] text-muted-foreground">
                {target.bayer} · {target.spectral}
              </div>
              <div className="hud-text mt-1 text-[11px] text-muted-foreground">
                <span ref={targetDistRef} className="text-foreground">…</span> away
                {apStatus === "align" && " · aligning"}
                {apStatus === "warp" && " · warp engaged"}
                {apStatus === "arrived" && " · arrived"}
              </div>
            </div>
            <button aria-label="Dismiss target" onClick={clearTarget} className="hud-chip size-8 shrink-0">
              <X className="size-3.5" />
            </button>
          </div>
          {apStatus === "align" || apStatus === "warp" ? (
            <button onClick={cancelAutopilot} className="hud-fly hud-fly-on mt-3">
              <X className="size-4" /> Disengage
            </button>
          ) : (
            <button onClick={flyHere} className="hud-fly mt-3">
              <Navigation className="size-4" /> Fly Here
            </button>
          )}
        </div>
      )}

      <div className={`pointer-events-none absolute inset-x-0 top-0 flex justify-center pt-[max(env(safe-area-inset-top),12px)] transition-opacity duration-700 ${fade}`}>
        <div ref={hudRef} className="hud-text text-[11px] tracking-widest text-muted-foreground" />
      </div>

      <div className={`pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 px-5 pb-[max(env(safe-area-inset-bottom),20px)] transition-opacity duration-700 ${live ? "opacity-100" : "opacity-0"}`}>
        <button aria-label="Settings" onClick={() => setPanel((p) => !p)} className={`hud-chip size-11 ${live ? "pointer-events-auto" : ""}`}>
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
          className={`hud-boost ${boostOn ? "hud-boost-on" : ""} ${live ? "pointer-events-auto" : ""}`}
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
            Drag to steer · hold rocket to boost · tap a bright star to target it · tap empty sky to hide controls. Real positions from the Yale Bright Star & HYG catalogues.
          </p>
          <InstallButton />
        </div>
      )}
    </div>
  );
}
