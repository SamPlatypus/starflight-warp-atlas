export const starVertex = /* glsl */ `
attribute vec2 corner;
attribute vec3 aPos;
attribute float aAbs;
attribute vec3 aCol;
uniform vec3 uCam;
uniform vec3 uVel;
uniform float uStreak;
uniform float uWrap;
uniform float uBox;
uniform vec2 uRes;
uniform float uPx;
uniform float uMagLimit;
varying vec3 vCol;
varying float vI;
varying float vFade;
varying float vY;

void main() {
  vec3 rel = aPos - uCam;
  float edge = 1.0;
  if (uWrap > 0.5) {
    rel = mod(rel + 0.5 * uBox, uBox) - 0.5 * uBox;
    edge = smoothstep(0.5 * uBox, 0.3 * uBox, length(rel));
  }
  float d = max(length(rel), 0.0003);
  float m = aAbs + 5.0 * (log2(d) * 0.30103 - 1.0);
  float I = pow(10.0, -0.4 * (m - uMagLimit)) * edge;
  if (I < 0.03) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }

  vec3 vh = (viewMatrix * vec4(rel, 0.0)).xyz;
  vec3 vt = (viewMatrix * vec4(rel + uVel * uStreak, 0.0)).xyz;
  if (vh.z > -0.0001) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }
  vt.z = min(vt.z, -0.0001);
  vec4 ch = projectionMatrix * vec4(vh, 1.0);
  vec4 ct = projectionMatrix * vec4(vt, 1.0);
  vec2 sh = ch.xy / ch.w * 0.5 * uRes;
  vec2 st = ct.xy / ct.w * 0.5 * uRes;
  vec2 dir = st - sh;
  float len = min(length(dir), uRes.y * 0.6);
  vec2 ax = len > 0.001 ? normalize(dir) : vec2(1.0, 0.0);
  vec2 nrm = vec2(-ax.y, ax.x);
  float w = uPx * clamp(0.7 + sqrt(I) * 0.8, 0.7, 6.0);
  vec2 p = sh + ax * (corner.x * len + (corner.x * 2.0 - 1.0) * w) + nrm * corner.y * w;

  float spread = w / (w + len * 0.35);
  vI = (1.0 - exp(-I * 1.2)) * mix(1.0, spread, 0.55);
  vCol = mix(aCol, vec3(1.0), clamp(I * 0.08, 0.0, 0.6));
  vFade = 1.0 - corner.x;
  vY = corner.y;
  gl_Position = vec4(p / (0.5 * uRes) * ch.w, ch.z, ch.w);
}
`;

export const starFragment = /* glsl */ `
varying vec3 vCol;
varying float vI;
varying float vFade;
varying float vY;
void main() {
  float a = exp(-3.5 * vY * vY) * mix(0.08, 1.0, vFade * vFade) * vI;
  gl_FragColor = vec4(vCol * a, 1.0);
}
`;
