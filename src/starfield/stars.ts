export interface StarData {
  count: number;
  yaleCount: number;
  pos: Float32Array;
  abs: Float32Array;
  col: Float32Array;
}

/** Loads the bundled catalogue (see scripts/build-stars.py for the format). */
export async function loadStars(url = "/stars.bin"): Promise<StarData> {
  const buf = await (await fetch(url)).arrayBuffer();
  const head = new Uint32Array(buf, 0, 2);
  const count = head[0] ?? 0;
  const raw = new Float32Array(buf, 8, count * 7);
  const pos = new Float32Array(count * 3);
  const abs = new Float32Array(count);
  const col = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const o = i * 7;
    pos[i * 3] = raw[o]!;
    pos[i * 3 + 1] = raw[o + 1]!;
    pos[i * 3 + 2] = raw[o + 2]!;
    abs[i] = raw[o + 3]!;
    col[i * 3] = raw[o + 4]!;
    col[i * 3 + 1] = raw[o + 5]!;
    col[i * 3 + 2] = raw[o + 6]!;
  }
  return { count, yaleCount: head[1] ?? 0, pos, abs, col };
}

/** Procedural far field that wraps around the camera so deep-space travel never empties. */
export function makeFarField(n: number, box: number): StarData {
  const pos = new Float32Array(n * 3);
  const abs = new Float32Array(n);
  const col = new Float32Array(n * 3);
  const tints = [
    [0.7, 0.8, 1],
    [1, 1, 1],
    [1, 0.95, 0.85],
    [1, 0.8, 0.6],
  ];
  for (let i = 0; i < n; i++) {
    for (let k = 0; k < 3; k++) pos[i * 3 + k] = (Math.random() - 0.5) * box;
    abs[i] = 1 + Math.random() * 6;
    const t = tints[Math.floor(Math.random() * tints.length)];
    col.set(t!, i * 3);
  }
  return { count: n, yaleCount: 0, pos, abs, col };
}
