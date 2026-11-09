"""Build public/stars.bin from the HYG v3.8 catalogue (includes Yale Bright Star `hr` ids).

Usage: curl -L https://raw.githubusercontent.com/astronexus/HYG-Database/main/hyg/v3/hyg_v38.csv.gz | gunzip > hyg.csv
       python3 scripts/build-stars.py hyg.csv public/stars.bin

Format: uint32 count, uint32 yaleCount, then count * 7 float32: x, y, z (parsecs, y = celestial north),
absmag, r, g, b. Sorted: Yale Bright Star entries first (by apparent mag), then the rest by apparent mag.
"""
import csv, math, struct, sys


def bv_to_rgb(bv: float):
    # Ballesteros (2012) B-V -> temperature, then a blackbody-ish RGB approximation.
    bv = max(-0.4, min(2.0, bv))
    t = 4600 * (1 / (0.92 * bv + 1.7) + 1 / (0.92 * bv + 0.62))
    t /= 100
    if t <= 66:
        r = 255
        g = 99.47 * math.log(t) - 161.12
        b = 0 if t <= 19 else 138.52 * math.log(t - 10) - 305.04
    else:
        r = 329.7 * (t - 60) ** -0.1332
        g = 288.12 * (t - 60) ** -0.0755
        b = 255
    c = lambda v: max(0.0, min(255.0, v)) / 255
    return c(r), c(g), c(b)


rows = []
with open(sys.argv[1]) as f:
    for r in csv.DictReader(f):
        if r["proper"] == "Sol":
            continue
        dist = float(r["dist"])
        if dist <= 0 or dist >= 100000:
            continue
        ci = float(r["ci"]) if r["ci"] else 0.65
        x, y, z = float(r["x"]), float(r["y"]), float(r["z"])
        rows.append((0 if r["hr"] else 1, float(r["mag"]), x, z, -y, float(r["absmag"]), *bv_to_rgb(ci)))

rows.sort(key=lambda t: (t[0], t[1]))
yale = sum(1 for t in rows if t[0] == 0)
with open(sys.argv[2], "wb") as out:
    out.write(struct.pack("<II", len(rows), yale))
    for t in rows:
        out.write(struct.pack("<7f", *t[2:]))
print(len(rows), "stars,", yale, "from Yale BSC")
