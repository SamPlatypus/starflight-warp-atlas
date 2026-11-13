// Landmark stars for tap targeting. Positions are HYG v3.8 x, y, z in parsecs
// (equatorial, Sol at origin, z = celestial north), copied from the same catalogue as stars.bin.
// Spectral classes are tidied from the catalogue. Use toScene() for scene axes.

export interface Landmark {
  name: string;
  bayer: string;
  spectral: string;
  x: number;
  y: number;
  z: number;
}

export const LANDMARKS: Landmark[] = [
  { name: "Sirius", bayer: "α Canis Majoris", spectral: "A1V", x: -0.494323, y: 2.476731, z: -0.758485 },
  { name: "Canopus", bayer: "α Carinae", spectral: "A9II", x: -5.992679, y: 57.132034, z: -75.396105 },
  { name: "Alpha Centauri", bayer: "α Centauri A", spectral: "G2V", x: -0.495203, y: -0.414084, z: -1.156625 },
  { name: "Proxima Centauri", bayer: "α Centauri C", spectral: "M5.5Ve", x: -0.472264, y: -0.361451, z: -1.151219 },
  { name: "Barnard's Star", bayer: "V2500 Ophiuchi", spectral: "M4V", x: -0.017373, y: -1.816613, z: 0.149123 },
  { name: "Wolf 359", bayer: "CN Leonis", spectral: "M6V", x: -2.282811, y: 0.649334, z: 0.292057 },
  { name: "Arcturus", bayer: "α Boötis", spectral: "K1.5III", x: -8.823448, y: -5.932531, z: 3.698938 },
  { name: "Vega", bayer: "α Lyrae", spectral: "A0V", x: 0.960565, y: -5.908009, z: 4.809731 },
  { name: "Capella", bayer: "α Aurigae", spectral: "G3III + G8III", x: 1.712633, y: 8.954439, z: 9.440007 },
  { name: "Rigel", bayer: "β Orionis", spectral: "B8Ia", x: 51.601106, y: 256.709905, z: -37.740051 },
  { name: "Procyon", bayer: "α Canis Minoris", spectral: "F5IV-V", x: -1.469312, y: 3.17617, z: 0.320024 },
  { name: "Achernar", bayer: "α Eridani", spectral: "B6Vep", x: 21.065573, y: 9.568417, z: -35.951967 },
  { name: "Betelgeuse", bayer: "α Orionis", spectral: "M1-2Ia-ab", x: 3.189296, y: 151.364387, z: 19.682142 },
  { name: "Hadar", bayer: "β Centauri", spectral: "B1III", x: -50.954051, y: -30.56287, z: -104.478695 },
  { name: "Altair", bayer: "α Aquilae", spectral: "A7V", x: 2.355468, y: -4.4873, z: 0.790749 },
  { name: "Acrux", bayer: "α Crucis", spectral: "B0.5IV", x: -44.363755, y: -5.171957, z: -88.034513 },
  { name: "Aldebaran", bayer: "α Tauri", spectral: "K5III", x: 7.02722, y: 18.287604, z: 5.806661 },
  { name: "Antares", bayer: "α Scorpii", spectral: "M1.5Iab", x: -58.542602, y: -140.307591, z: -75.574766 },
  { name: "Spica", bayer: "α Virginis", spectral: "B1V", x: -69.990853, y: -27.285826, z: -14.82176 },
  { name: "Pollux", bayer: "β Geminorum", spectral: "K0III", x: -4.055465, y: 8.19518, z: 4.867171 },
  { name: "Fomalhaut", bayer: "α Piscis Austrini", spectral: "A3V", x: 6.450517, y: -1.799476, z: -3.807757 },
  { name: "Deneb", bayer: "α Cygni", spectral: "A2Ia", x: 197.250632, y: -232.113407, z: 307.600832 },
  { name: "Mimosa", bayer: "β Crucis", spectral: "B0.5III", x: -42.168771, y: -8.909619, z: -73.723149 },
  { name: "Regulus", bayer: "α Leonis", spectral: "B8IVn", x: -21.018857, y: 11.132218, z: 5.041397 },
  { name: "Adhara", bayer: "ε Canis Majoris", spectral: "B2II", x: -27.497987, y: 105.141608, z: -60.171969 },
  { name: "Castor", bayer: "α Geminorum", spectral: "A1V + A2Vm", x: -5.311938, y: 12.130011, z: 8.238737 },
  { name: "Shaula", bayer: "λ Scorpii", spectral: "B1.5IV", x: -16.048583, y: -138.749793, z: -105.649898 },
  { name: "Gacrux", bayer: "γ Crucis", spectral: "M3.5III", x: -14.606901, y: -1.998688, z: -22.800748 },
  { name: "Bellatrix", bayer: "γ Orionis", spectral: "B2III", x: 11.658576, y: 76.036136, z: 8.56012 },
  { name: "Elnath", bayer: "β Tauri", spectral: "B7III", x: 5.281578, y: 35.6504, z: 19.655456 },
  { name: "Miaplacidus", bayer: "β Carinae", spectral: "A1III", x: -8.980712, y: 8.001552, z: -32.546536 },
  { name: "Alnilam", bayer: "ε Orionis", spectral: "B0Ia", x: 62.775122, y: 602.66691, z: -12.712683 },
  { name: "Alnair", bayer: "α Gruis", spectral: "B6V", x: 18.672505, y: -9.904001, z: -22.635193 },
  { name: "Alioth", bayer: "ε Ursae Majoris", spectral: "A1III-IVp", x: -13.775959, y: -3.309169, z: 20.972944 },
  { name: "Dubhe", bayer: "α Ursae Majoris", spectral: "K0III", x: -17.298705, y: 4.33488, z: 33.191332 },
  { name: "Mirfak", bayer: "α Persei", spectral: "F5Ib", x: 62.885098, y: 77.880689, z: 118.708804 },
  { name: "Polaris", bayer: "α Ursae Minoris", spectral: "F7Ib", x: 1.3431, y: 1.047629, z: 132.614909 },
  { name: "Algol", bayer: "β Persei", spectral: "B8V", x: 14.189428, y: 15.238793, z: 18.072114 },
];

/** HYG axes -> scene axes, matching scripts/build-stars.py (x, z, -y; scene y = celestial north). */
export function toScene(s: Landmark): [number, number, number] {
  return [s.x, s.z, -s.y];
}
