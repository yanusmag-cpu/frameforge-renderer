"""YunoWorld — "The Man Who Sold the Eiffel Tower Twice" (Paris, May 1925). Three sets in one world, 1 unit = 1 m, Three coords (y up).
Run: blender -b --factory-startup -P scripts/eiffel/build-assets.py
  → public/eiffel/world.glb  PARIS  (origin): Haussmann avenue z +200..-150 (street x -14..14), Hôtel de Crillon frontage (left, z -30..-110),
                                        commissariat (right, z -25..-55), kiosk, Morris column, café, lamp posts, Champ de Mars, Eiffel Tower at (0,0,-460),
                                        distant city ring.
                             HOTEL  (x +1000): meeting room x 993..1007, z -5..5, ceiling 5.2 (windows on z=-5 wall, doors at x=1007, fireplace z=+5);
                                        corridor x 1007..1047, z -1.6..1.6; window view of rooftops + a far tower.
                             STATION (x -1000): platform x -1006..-1000 (top y .9), track at x -998, train shed roof, posters, clock.
  → public/eiffel/props.glb  KEEP props: CarA, CarB, Train, ModelTower, Letter, Letters, Blueprint, Envelope, Pen, Inkwell, Stamp, InkPad, Banknotes,
                             Cheque, Glass, Ashtray, Suitcase, Newspaper, Trolley, Door (hotel double door leaf)
Meshes are gathered per material into one object (fast); UVs: world-space box projection in metres, or explicit 0..1 for printed surfaces.
"""
import bpy, math, random
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'public/eiffel'; OUT.mkdir(parents=True, exist_ok=True)
random.seed(1925)

# ------------------------------------------------------------------ materials
MATS = {}
COL = {
    'cobble': (.42, .38, .34), 'pavement': (.62, .6, .56), 'kerb': (.55, .54, .52), 'stone_a': (.86, .8, .68), 'stone_b': (.8, .74, .62), 'stone_rust': (.78, .72, .6),
    'glass_win': (.08, .1, .12), 'glass_shop': (.1, .12, .13), 'zinc': (.36, .4, .46), 'chimney': (.62, .4, .3), 'pot': (.7, .42, .28), 'iron': (.06, .08, .07),
    'rail': (.05, .06, .06), 'tower_iron': (.46, .31, .2), 'lawn': (.3, .45, .16), 'gravel': (.72, .64, .5), 'bark': (.4, .36, .3), 'leaf': (1, 1, 1),
    'lamp_glass': (1, .9, .7), 'kiosk_green': (.12, .24, .17), 'kiosk_papers': (1, 1, 1), 'morris_posters': (1, 1, 1), 'wicker': (.62, .46, .26), 'cafe_table': (.2, .2, .2),
    'shop_green': (.1, .25, .18), 'shop_red': (.45, .08, .08), 'shop_blue': (.1, .16, .3), 'shop_black': (.06, .06, .06), 'shop_cream': (.82, .76, .6),
    'awning_red': (1, 1, 1), 'awning_green': (1, 1, 1), 'awning_blue': (1, 1, 1), 'brass': (.8, .6, .3), 'gilt': (.82, .62, .3), 'flag_fr': (1, 1, 1),
    'parquet': (1, 1, 1), 'boiserie': (1, 1, 1), 'ceiling_plaster': (.93, .9, .82), 'mahogany': (.28, .12, .07), 'leather_green': (.12, .25, .17), 'velvet_red': (.5, .07, .1),
    'drape_red': (.55, .08, .1), 'carpet_runner': (1, 1, 1), 'marble_white': (.92, .9, .86), 'crystal': (1, .95, .85), 'mirror': (.7, .72, .74), 'canvas_a': (1, 1, 1),
    'canvas_b': (1, 1, 1), 'canvas_c': (1, 1, 1), 'paper_letter': (1, 1, 1), 'paper_letter0': (1, 1, 1), 'paper_plain': (.95, .92, .84), 'blueprint': (1, 1, 1), 'cheque': (1, 1, 1), 'banknote': (1, 1, 1),
    'newspaper': (1, 1, 1), 'envelope': (.9, .84, .7), 'wax': (.6, .08, .1), 'ink': (.03, .03, .05), 'leaf_palm': (.2, .4, .18), 'pot_ceramic': (.75, .7, .62),
    'door_white': (.9, .87, .78), 'platform_stone': (.6, .57, .52), 'rail_steel': (.36, .34, .33), 'sleeper_wood': (.3, .22, .16), 'ballast': (.38, .35, .32),
    'iron_green': (.16, .24, .2), 'glass_roof': (.75, .82, .85), 'loco_black': (.06, .06, .07), 'carriage_blue': (.08, .12, .3), 'carriage_window': (.12, .14, .16),
    'poster_a': (1, 1, 1), 'poster_b': (1, 1, 1), 'poster_c': (1, 1, 1), 'clock_face': (1, 1, 1), 'brick': (.55, .3, .22), 'car_red': (.5, .08, .08),
    'car_black': (.05, .05, .06), 'car_green': (.12, .25, .2), 'tyre': (.06, .06, .06), 'chrome': (.8, .8, .82), 'headlamp': (1, .95, .85), 'seat_leather': (.3, .16, .1),
    'suitcase': (.42, .24, .12), 'trolley_brass': (.8, .6, .3), 'sky_city': (.55, .55, .6), 'tablecloth': (.92, .9, .84), 'glass_drink': (.85, .8, .6), 'sign_crillon': (1, 1, 1),
    'sign_police': (1, 1, 1), 'sign_cafe': (1, 1, 1), 'sign_shops': (1, 1, 1), 'sign_station': (1, 1, 1), 'sign_journaux': (1, 1, 1), 'sign_rue': (1, 1, 1),
    'hall_carpet': (1, 1, 1), 'wallpaper': (1, 1, 1), 'steam_vent': (.2, .2, .2), 'plant_dark': (.1, .2, .1), 'blotter': (.15, .25, .2), 'stair_red': (.55, .1, .12),
}
EMIT = {'lamp_glass': 2.0, 'crystal': 1.2, 'headlamp': 0.0}
METAL = {'brass': .9, 'gilt': .9, 'chrome': 1, 'trolley_brass': .9, 'rail_steel': .6}
ROUGH = {'glass_win': .08, 'glass_shop': .05, 'mirror': .02, 'marble_white': .25, 'mahogany': .35, 'parquet': .35, 'chrome': .15, 'car_red': .3, 'car_black': .3,
         'car_green': .3, 'loco_black': .4, 'glass_roof': .1, 'crystal': .05, 'gilt': .3, 'brass': .3, 'leather_green': .5}
SMOOTH = {'tower_iron_x', 'leaf', 'bark', 'velvet_red', 'drape_red', 'tyre', 'chrome', 'crystal', 'pot_ceramic', 'leaf_palm', 'brass', 'gilt', 'car_red', 'car_black', 'car_green',
          'loco_black', 'headlamp', 'suitcase', 'glass_drink', 'wicker', 'marble_white', 'trolley_brass', 'plant_dark'}
def mat(name):
    if name in MATS: return MATS[name]
    m = bpy.data.materials.new(name); m.use_nodes = True; p = m.node_tree.nodes.get('Principled BSDF')
    c = COL.get(name, (.8, .8, .8)); p.inputs['Base Color'].default_value = (*c, 1)
    p.inputs['Roughness'].default_value = ROUGH.get(name, .7); p.inputs['Metallic'].default_value = METAL.get(name, 0)
    if name in EMIT: p.inputs['Emission Color'].default_value = (*c, 1); p.inputs['Emission Strength'].default_value = EMIT[name]
    if name == 'leaf':
        nt = m.node_tree; vc = nt.nodes.new('ShaderNodeVertexColor'); vc.layer_name = 'Col'; nt.links.new(vc.outputs['Color'], p.inputs['Base Color'])
    MATS[name] = m; return m

# ------------------------------------------------------------------ kit: geometry gathered per material
class Kit:
    def __init__(self): self.parts = {}
    def _p(self, m):
        if m not in self.parts: self.parts[m] = ([], [], [], [])   # verts, faces, uvs (per corner), cols (per vertex)
        return self.parts[m]
    def add(self, m, verts, faces, uvs=None, col=None):
        V, F, U, C = self._p(m); o = len(V); V.extend(verts)
        for i, f in enumerate(faces):
            F.append(tuple(o + k for k in f))
            if uvs is not None: U.append(uvs[i])
            else: U.append(boxuv([verts[k] for k in f]))
        C.extend([col or (1, 1, 1)] * len(verts))
def boxuv(pts):
    a, b, c = pts[0], pts[1], pts[2]
    u = (b[0] - a[0], b[1] - a[1], b[2] - a[2]); v = (c[0] - a[0], c[1] - a[1], c[2] - a[2])
    n = (u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]); ax = max(range(3), key=lambda i: abs(n[i]))
    out = []
    for p in pts:
        if ax == 0: out.append((p[2] * (-1 if n[0] > 0 else 1), p[1]))
        elif ax == 1: out.append((p[0], p[2]))
        else: out.append((p[0] * (1 if n[2] > 0 else -1), p[1]))
    return out
K = Kit()
KEEPS = {}

def box(m, c, s, ry=0.0, k=None, col=None):
    k = k or K; hx, hy, hz = s[0] / 2, s[1] / 2, s[2] / 2; cs, sn = math.cos(ry), math.sin(ry)
    pts = []
    for dx in (-hx, hx):
        for dy in (-hy, hy):
            for dz in (-hz, hz): pts.append((c[0] + dx * cs + dz * sn, c[1] + dy, c[2] - dx * sn + dz * cs))
    # index = ix*4 + iy*2 + iz
    F = [(0, 1, 3, 2), (4, 6, 7, 5), (0, 4, 5, 1), (2, 3, 7, 6), (0, 2, 6, 4), (1, 5, 7, 3)]
    k.add(m, pts, F, col=col)
def ab(m, a, b, k=None, col=None):
    box(m, ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2), (abs(b[0] - a[0]), abs(b[1] - a[1]), abs(b[2] - a[2])), k=k, col=col)
def beam(m, a, b, w, d=None, k=None):
    d = d or w; ax = (b[0] - a[0], b[1] - a[1], b[2] - a[2]); L = math.sqrt(sum(x * x for x in ax)) or 1e-6; t = tuple(x / L for x in ax)
    ref = (0, 1, 0) if abs(t[1]) < .9 else (1, 0, 0)
    u = (t[1] * ref[2] - t[2] * ref[1], t[2] * ref[0] - t[0] * ref[2], t[0] * ref[1] - t[1] * ref[0]); ul = math.sqrt(sum(x * x for x in u)); u = tuple(x / ul for x in u)
    v = (t[1] * u[2] - t[2] * u[1], t[2] * u[0] - t[0] * u[2], t[0] * u[1] - t[1] * u[0])
    pts = []
    for e in (a, b):
        for su, sv in ((-1, -1), (1, -1), (1, 1), (-1, 1)): pts.append(tuple(e[i] + u[i] * su * w / 2 + v[i] * sv * d / 2 for i in range(3)))
    F = [(0, 1, 2, 3), (7, 6, 5, 4), (0, 4, 5, 1), (1, 5, 6, 2), (2, 6, 7, 3), (3, 7, 4, 0)]
    (k or K).add(m, pts, F)
def lathe(m, c, prof, n=12, k=None, smooth_uv=False):
    """prof: [(r, y)] bottom→top; caps when r=0 at ends"""
    pts = []; F = []; U = []
    for (r, y) in prof:
        for i in range(n): a = 2 * math.pi * i / n; pts.append((c[0] + r * math.cos(a), c[1] + y, c[2] + r * math.sin(a)))
    for j in range(len(prof) - 1):
        for i in range(n):
            a, b = j * n + i, j * n + (i + 1) % n; F.append((a, b, b + n, a + n))
            U.append([(i / n, j / (len(prof) - 1)), ((i + 1) / n, j / (len(prof) - 1)), ((i + 1) / n, (j + 1) / (len(prof) - 1)), (i / n, (j + 1) / (len(prof) - 1))])
    (k or K).add(m, pts, F, U if smooth_uv else None)
def cyl(m, c, r, h, n=12, k=None, r2=None, cap=True):
    r2 = r if r2 is None else r2
    lathe(m, c, ([(0, 0)] if cap else []) + [(r, 0), (r2, h)] + ([(0, h)] if cap else []), n, k)
def cylx(m, c, r, w, n=14, k=None):
    """cylinder along x (wheels)"""
    pts = []; F = []
    for sx in (-w / 2, w / 2):
        for i in range(n): a = 2 * math.pi * i / n; pts.append((c[0] + sx, c[1] + r * math.cos(a), c[2] + r * math.sin(a)))
    for i in range(n): F.append((i, (i + 1) % n, n + (i + 1) % n, n + i))
    F.append(tuple(range(n))[::-1]); F.append(tuple(range(n, 2 * n)))
    (k or K).add(m, pts, F)
def blob(m, c, r, sc=(1, 1, 1), k=None, col=None, sub=1):
    """low-poly lumpy sphere (foliage)"""
    t = (1 + 5 ** .5) / 2
    V = [(-1, t, 0), (1, t, 0), (-1, -t, 0), (1, -t, 0), (0, -1, t), (0, 1, t), (0, -1, -t), (0, 1, -t), (t, 0, -1), (t, 0, 1), (-t, 0, -1), (-t, 0, 1)]
    F = [(0, 11, 5), (0, 5, 1), (0, 1, 7), (0, 7, 10), (0, 10, 11), (1, 5, 9), (5, 11, 4), (11, 10, 2), (10, 7, 6), (7, 1, 8), (3, 9, 4), (3, 4, 2), (3, 2, 6), (3, 6, 8), (3, 8, 9), (4, 9, 5), (2, 4, 11), (6, 2, 10), (8, 6, 7), (9, 8, 1)]
    for _ in range(sub):
        mid = {}; NF = []
        def mp(a, b):
            key = (min(a, b), max(a, b))
            if key not in mid: V.append(tuple((V[a][i] + V[b][i]) / 2 for i in range(3))); mid[key] = len(V) - 1
            return mid[key]
        for a, b, cc in F: ab_, bc, ca = mp(a, b), mp(b, cc), mp(cc, a); NF += [(a, ab_, ca), (b, bc, ab_), (cc, ca, bc), (ab_, bc, ca)]
        F = NF
    pts = []
    for v in V:
        l = math.sqrt(sum(x * x for x in v)); j = 1 + random.uniform(-.14, .14)
        pts.append((c[0] + v[0] / l * r * sc[0] * j, c[1] + v[1] / l * r * sc[1] * j, c[2] + v[2] / l * r * sc[2] * j))
    (k or K).add(m, pts, F, col=col)
def quad(m, p0, p1, p2, p3, uv=((0, 0), (1, 0), (1, 1), (0, 1)), k=None):
    (k or K).add(m, [p0, p1, p2, p3], [(0, 1, 2, 3)], [list(uv)])
def wallquad(m, x0, z0, x1, z1, y0, y1, k=None, uvs=None):
    """vertical quad from (x0,z0) to (x1,z1), y0..y1; normal = left of the direction a→b (viewed from above, y up)"""
    quad(m, (x0, y0, z0), (x1, y0, z1), (x1, y1, z1), (x0, y1, z0), uvs or ((0, 0), (1, 0), (1, 1), (0, 1)), k)

# ================================================================== EIFFEL TOWER (true proportions, 300 m + mast)
def tower(c, k=None, detail=1, m='tower_iron', s=1.0):
    k = k or K
    def P(x, y, z): return (c[0] + x * s, c[1] + y * s, c[2] + z * s)
    hw = lambda y: max(3.6, 62.5 * math.exp(-y / 100.0)) if y < 268 else 3.6
    hin = lambda y: 37.5 * max(0.0, 1 - y / 116.0) ** 1.22
    W = (1.7 if detail else 2.6) * s; w2 = W * .45
    lv = [0, 6, 12, 19, 26, 33, 40, 47, 53, 57.6, 64, 71, 78, 86, 94, 102, 110, 115.7] if detail else [0, 19, 40, 57.6, 86, 115.7]
    for sx in (-1, 1):
        for sz in (-1, 1):
            corners = [lambda y: (sx * hw(y), sz * hw(y)), lambda y: (sx * hin(y), sz * hin(y)), lambda y: (sx * hw(y), sz * hin(y)), lambda y: (sx * hin(y), sz * hw(y))]
            for f in corners:
                for i in range(len(lv) - 1):
                    a, b = lv[i], lv[i + 1]; pa, pb = f(a), f(b); beam(m, P(pa[0], a, pa[1]), P(pb[0], b, pb[1]), W, k=k)
            for (fa, fb) in ((corners[0], corners[2]), (corners[0], corners[3]), (corners[1], corners[2]), (corners[1], corners[3])):
                for i in range(len(lv) - 1):
                    a, b = lv[i], lv[i + 1]; A0, B0, A1, B1 = fa(a), fb(a), fa(b), fb(b)
                    width = math.hypot(A0[0] - B0[0], A0[1] - B0[1]); nsub = max(1, round(width / (9 if detail else 18)))
                    for j in range(nsub):
                        t0, t1 = j / nsub, (j + 1) / nsub
                        q = lambda A, B, t: (A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t)
                        p00, p10, p01, p11 = q(A0, B0, t0), q(A0, B0, t1), q(A1, B1, t0), q(A1, B1, t1)
                        beam(m, P(p00[0], a, p00[1]), P(p11[0], b, p11[1]), w2, k=k); beam(m, P(p10[0], a, p10[1]), P(p01[0], b, p01[1]), w2, k=k)
                        if detail and j: beam(m, P(p00[0], a, p00[1]), P(p01[0], b, p01[1]), w2 * .8, k=k)
                    beam(m, P(A1[0], b, A1[1]), P(B1[0], b, B1[1]), w2 * 1.2, k=k)
    # upper shaft
    up = [115.7, 124, 133, 142, 152, 162, 172, 183, 194, 205, 216, 228, 240, 252, 264, 276] if detail else [115.7, 150, 190, 230, 276]
    for sx in (-1, 1):
        for sz in (-1, 1):
            for i in range(len(up) - 1):
                a, b = up[i], up[i + 1]; beam(m, P(sx * hw(a), a, sz * hw(a)), P(sx * hw(b), b, sz * hw(b)), W * .9, k=k)
    for i in range(len(up) - 1):
        a, b = up[i], up[i + 1]
        for (dx, dz) in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ha, hb = hw(a), hw(b); nsub = max(1, round(2 * ha / (10 if detail else 20)))
            for j in range(nsub):
                t0, t1 = -1 + 2 * j / nsub, -1 + 2 * (j + 1) / nsub
                def pt(h, t, y):
                    return P(dx * h + (t * h if dx == 0 else 0), y, dz * h + (t * h if dz == 0 else 0))
                beam(m, pt(ha, t0, a), pt(hb, t1, b), w2 * .9, k=k); beam(m, pt(ha, t1, a), pt(hb, t0, b), w2 * .9, k=k)
            beam(m, pt(hb, -1, b), pt(hb, 1, b), w2, k=k)
    # first floor platform (57.6 m) with its frieze of small arches, second floor (115.7), top
    for (y0, h, ext) in ((51.5, 6.1, 3.5), (112.5, 3.2, 2.0)):
        hh = hw(y0) + ext
        for (dx, dz) in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            if dx: box(m, P(dx * hh, y0 + h / 2, 0), (2.0 * s, h * s, 2 * hh * s), k=k)
            else: box(m, P(0, y0 + h / 2, dz * hh), (2 * hh * s, h * s, 2.0 * s), k=k)
            if detail and y0 < 60:
                for i in range(-16, 17):
                    t = i / 16.5 * hh
                    x0 = (dx * (hh + .9), t) if dx else (t, dz * (hh + .9))
                    beam(m, P(x0[0], y0 + .4, x0[1]), P(x0[0], y0 + h - 1.4, x0[1]), .35 * s, k=k)
        if y0 < 60:
            ri = hh - 15
            for (dx, dz) in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                if dx: box('stone_b', P(dx * (hh + ri) / 2, y0 + h - .2, 0), ((hh - ri) * s, .4 * s, 2 * hh * s), k=k)
                else: box('stone_b', P(0, y0 + h - .2, dz * (hh + ri) / 2), (2 * ri * s, .4 * s, (hh - ri) * s), k=k)
        else: box('stone_b', P(0, y0 + h - .2, 0), (2 * hh * s, .4 * s, 2 * hh * s), k=k)
        for (dx, dz) in ((1, 0), (-1, 0), (0, 1), (0, -1)):   # railing + pavilions
            if dx: box(m, P(dx * hh, y0 + h + .6, 0), (.15 * s, 1.2 * s, 2 * hh * s), k=k)
            else: box(m, P(0, y0 + h + .6, dz * hh), (2 * hh * s, 1.2 * s, .15 * s), k=k)
        if y0 < 60:
            for (dx, dz) in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                c2 = (dx * (hh - 7.5), dz * (hh - 7.5)); sz2 = (9 if dx else 40, 40 if dx else 9)
                box('stone_a', P(c2[0], y0 + h + 2.4, c2[1]), (sz2[0] * s, 4.6 * s, sz2[1] * s), k=k); box('zinc', P(c2[0], y0 + h + 5.1, c2[1]), ((sz2[0] + 1) * s, .8 * s, (sz2[1] + 1) * s), k=k)
        else:
            box('stone_a', P(0, y0 + h + 2.4, 0), (24 * s, 4.6 * s, 24 * s), k=k); box('zinc', P(0, y0 + h + 5.1, 0), (25 * s, .8 * s, 25 * s), k=k)
    # decorative arches between the legs (below the first floor)
    if True:
        for (dx, dz) in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            pl = hw(34) - 1.5; prev = None
            N = 28 if detail else 12
            for i in range(N + 1):
                a = math.pi * i / N; t = -math.cos(a); y = 19 + 20.5 * math.sin(a) ** .85; span = hin(19) + 3.5
                p = (dx * pl, t * span) if dx else (t * span, dz * pl)
                cur = P(p[0], y, p[1]); cur2 = P(p[0], y - 2.2, p[1])
                if prev:
                    beam(m, prev[0], cur, W * .8, k=k); beam(m, prev[1], cur2, W * .5, k=k)
                    if detail and i % 2 == 0: beam(m, cur, cur2, w2 * .6, k=k)
                    if i % 2 == 0 and y < 50:
                        top = P(p[0], 51.5, p[1]); beam(m, cur, top, w2 * .5, k=k)
                prev = (cur, cur2)
    # top: glazed gallery, campanile, lantern, mast
    box('stone_b', P(0, 276, 0), (17 * s, .8 * s, 17 * s), k=k)
    box('glass_win', P(0, 278.6, 0), (15 * s, 4.4 * s, 15 * s), k=k)
    for (dx, dz) in ((1, 1), (1, -1), (-1, 1), (-1, -1)):
        beam(m, P(dx * 7.5, 276, dz * 7.5), P(dx * 7.5, 281, dz * 7.5), .8 * s, k=k)
        beam(m, P(dx * 6.5, 281, dz * 6.5), P(dx * 1.6, 291, dz * 1.6), .9 * s, k=k)
    box(m, P(0, 281.4, 0), (16 * s, .9 * s, 16 * s), k=k)
    lathe(m, P(0, 290, 0), [(0, 0), (3.6 * s, 0), (3.4 * s, 2.5 * s), (2.2 * s, 5 * s), (1.0 * s, 8 * s), (.5 * s, 10 * s), (0, 10.4 * s)], 10, k)
    cyl(m, P(0, 300, 0), .28 * s, 12 * s, 6, k)
    # piers: masonry foundations under each leg
    for sx in (-1, 1):
        for sz in (-1, 1):
            cx, cz = sx * (62.5 + 37.5) / 2, sz * (62.5 + 37.5) / 2
            box('stone_rust', P(cx, .9, cz), (29 * s, 1.8 * s, 29 * s), k=k)

# ================================================================== PARIS STREET
STREET_W = 14.0
SHOPS = ['BOULANGERIE', 'CAFÉ', 'PHARMACIE', 'LIBRAIRIE', 'TABAC', 'CHAPELLERIE', 'FLEURISTE', 'HORLOGERIE', 'ÉPICERIE', 'MODES', 'BRASSERIE', 'PÂTISSERIE']
SIGNS = []   # (index, text) → atlas row for sign_shops
def sign_uv(idx):
    """sign atlas: 16 rows; return uv for row idx"""
    v0, v1 = 1 - (idx + 1) / 16, 1 - idx / 16
    return ((0, v0), (1, v0), (1, v1), (0, v1))
def building(side, z0, z1, floors=5, stone='stone_a', shop=True, shop_i=0, depth=22):
    """Haussmann block on the left (side -1, facade at x=-14 facing +x) or right (side +1)."""
    fx = side * STREET_W; out = -side   # outward normal x sign
    zmin, zmax = min(z0, z1), max(z0, z1)
    H = 4.6 + 3.0 + 3.2 * floors - 3.2   # ground + entresol + upper floors
    top = 4.6 + 3.0 + 3.2 * (floors - 1)
    ab(stone, (fx, 0, zmin), (fx + side * depth, top + .2, zmax))
    bays = max(1, round((zmax - zmin) / 4.0)); bw = (zmax - zmin) / bays
    X = lambda d: fx + out * d   # d metres out from the facade
    # rusticated ground floor band + cornices
    ab('stone_rust', (X(.25), 0, zmin), (fx, 4.6, zmax))
    ab(stone, (X(.4), 4.45, zmin), (fx, 4.75, zmax))
    ab(stone, (X(.35), 7.45, zmin), (fx, 7.7, zmax))
    ab(stone, (X(.9), top, zmin - .3), (fx, top + .55, zmax + .3))      # main cornice
    ab(stone, (X(.5), top - .5, zmin), (fx, top, zmax))
    for b in range(bays):
        za, zb = zmin + b * bw, zmin + (b + 1) * bw; zc = (za + zb) / 2
        if shop:
            cols = ['shop_green', 'shop_red', 'shop_blue', 'shop_black', 'shop_cream']; cm = cols[(shop_i + b // 2) % 5]
            ab(cm, (X(.3), 0, za + .15), (X(.05), 3.4, zb - .15))           # wooden shopfront frame
            ab('glass_shop', (X(.32), .7, za + .45), (X(.12), 3.0, zb - .45))
            ab(cm, (X(.36), 0, za + .15), (X(.12), .7, zb - .15))           # stall riser
            if b % 2 == 0:
                idx = (shop_i * 3 + b // 2) % len(SHOPS)
                wallquad('sign_shops', X(.37), zb - .2 if side < 0 else za + .2, X(.37), za + .2 if side < 0 else zb - .2, 3.45, 4.2, uvs=sign_uv(idx))
                aw = ['awning_red', 'awning_green', 'awning_blue'][(shop_i + b) % 3]
                if (b // 2 + shop_i) % 2 == 0:
                    quad(aw, (X(.3), 3.3, za + .1), (X(.3), 3.3, zb + bw - .1), (X(2.6), 2.5, zb + bw - .1), (X(2.6), 2.5, za + .1), ((0, 0), (8, 0), (8, 1), (0, 1)))
                    quad(aw, (X(2.6), 2.5, za + .1), (X(2.6), 2.5, zb + bw - .1), (X(2.6), 2.15, zb + bw - .1), (X(2.6), 2.15, za + .1), ((0, 0), (8, 0), (8, .3), (0, .3)))
        else:
            ab('glass_win', (X(.05), 1.0, zc - .8), (fx, 3.9, zc + .8)); ab('door_white', (X(.2), .9, zc - .95), (X(.0), 1.05, zc + .95))
        # entresol + floors
        for f in range(floors):
            y0 = 4.6 + (0 if f == 0 else 3.0 + 3.2 * (f - 1)) + .45; hwin = 1.9 if f == 0 else 2.3
            if f == 4: hwin = 2.0
            ww = min(1.25, bw * .32)
            ab('glass_win', (X(.02), y0, zc - ww / 2), (X(-.2), y0 + hwin, zc + ww / 2))
            ab('door_white', (X(.0), y0 + hwin * .62, zc - ww / 2), (X(-.15), y0 + hwin * .66, zc + ww / 2))
            ab('door_white', (X(.0), y0, zc - .04), (X(-.15), y0 + hwin, zc + .04))
            ab(stone, (X(.14), y0 - .1, zc - ww / 2 - .22), (fx, y0 + hwin + .1, zc - ww / 2))      # jambs
            ab(stone, (X(.14), y0 - .1, zc + ww / 2), (fx, y0 + hwin + .1, zc + ww / 2 + .22))
            ab(stone, (X(.3), y0 + hwin + .05, zc - ww / 2 - .35), (fx, y0 + hwin + .35, zc + ww / 2 + .35))   # lintel / pediment
            if f in (1, 4):   # continuous balconies (2nd and 5th floors)
                pass
            else:
                ab(stone, (X(.5), y0 - .22, zc - ww / 2 - .2), (fx, y0 - .05, zc + ww / 2 + .2))
                wallquad('rail', X(.48), zc + ww / 2 + .15 if side < 0 else zc - ww / 2 - .15, X(.48), zc - ww / 2 - .15 if side < 0 else zc + ww / 2 + .15, y0 - .05, y0 + .85, uvs=((0, 0), (ww + .3, 0), (ww + .3, .9), (0, .9)))
    for f in (1, 4):   # continuous wrought-iron balconies
        y0 = 4.6 + 3.0 + 3.2 * (f - 1) + .25
        ab(stone, (X(1.0), y0 - .25, zmin + .2), (fx, y0, zmax - .2))
        for zz in [zmin + .3 + i * 1.2 for i in range(int((zmax - zmin - .6) / 1.2) + 1)]: ab(stone, (X(.95), y0 - .55, zz - .12), (X(.2), y0 - .25, zz + .12))
        wallquad('rail', X(.98), zmax - .2 if side < 0 else zmin + .2, X(.98), zmin + .2 if side < 0 else zmax - .2, y0, y0 + .95, uvs=((0, 0), (zmax - zmin - .4, 0), (zmax - zmin - .4, .95), (0, .95)))
    # mansard roof with dormers + chimneys
    ry0 = top + .55; rh = 5.2; inset = 2.6
    quad('zinc', (fx, ry0, zmin), (fx, ry0, zmax), (X(-inset), ry0 + rh, zmax), (X(-inset), ry0 + rh, zmin)) if side > 0 else quad('zinc', (fx, ry0, zmax), (fx, ry0, zmin), (X(-inset), ry0 + rh, zmin), (X(-inset), ry0 + rh, zmax))
    ab('zinc', (X(-inset), ry0 + rh - .3, zmin), (fx + side * depth, ry0 + rh, zmax))
    ab('zinc', (fx + side * (depth - .01), ry0, zmin), (fx + side * depth, ry0 + rh, zmax))
    for b in range(bays):
        zc = zmin + (b + .5) * bw
        ab('stone_a', (X(.5), ry0, zc - .55), (X(-1.2), ry0 + 1.9, zc + .55))
        ab('glass_win', (X(.52), ry0 + .25, zc - .35), (X(.4), ry0 + 1.5, zc + .35))
        quad('zinc', (X(.6), ry0 + 1.85, zc - .7), (X(.6), ry0 + 1.85, zc + .7), (X(-.6), ry0 + 2.5, zc + .7), (X(-.6), ry0 + 2.5, zc - .7)) if side < 0 else quad('zinc', (X(.6), ry0 + 1.85, zc + .7), (X(.6), ry0 + 1.85, zc - .7), (X(-.6), ry0 + 2.5, zc - .7), (X(-.6), ry0 + 2.5, zc + .7))
    for zz in (zmin + .6, zmax - .6):
        ab('chimney', (X(-4), ry0, zz - .45), (X(-6.5), ry0 + rh + 1.6, zz + .45))
        for i in range(4): cyl('pot', (X(-4.4) - side * i * .6, ry0 + rh + 1.6, zz), .13, .55, 8)
    # party wall pilasters
    for zz in (zmin, zmax): ab(stone, (X(.18), 0, zz - .2), (fx, top, zz + .2))

def lamp_post(x, z, k=None):
    lathe('iron', (x, 0, z), [(0, 0), (.32, 0), (.3, .35), (.16, .5), (.14, 1.2), (.09, 1.4), (.075, 3.6), (.1, 3.7), (.06, 3.9), (0, 3.95)], 10, k)
    box('iron', (x, 4.0, z), (.2, .16, .2), k=k)
    lathe('lamp_glass', (x, 4.05, z), [(0, 0), (.16, 0), (.26, .55), (.0, .58)], 6, k)
    lathe('iron', (x, 4.6, z), [(.3, 0), (.0, .25)], 6, k); cyl('iron', (x, 4.85, z), .03, .2, 4, k)

def kiosk(x, z):
    lathe('kiosk_green', (x, 0, z), [(0, 0), (1.45, 0), (1.45, .25), (1.35, .3), (1.35, 2.5), (1.5, 2.6), (0, 2.6)], 8)
    n = 8
    for i in range(n):   # newspaper display panels on each face (u from atlas column)
        a0, a1 = 2 * math.pi * i / n + .05, 2 * math.pi * (i + 1) / n - .05; r = 1.37
        p0 = (x + r * math.cos(a0), z + r * math.sin(a0)); p1 = (x + r * math.cos(a1), z + r * math.sin(a1))
        wallquad('kiosk_papers', p1[0], p1[1], p0[0], p0[1], .55, 2.35, uvs=((i / 8, 0), ((i + 1) / 8, 0), ((i + 1) / 8, 1), (i / 8, 1)))
    for i in range(n):
        a0, a1 = 2 * math.pi * i / n, 2 * math.pi * (i + 1) / n; r = 1.52
        wallquad('sign_journaux', x + r * math.cos(a1), z + r * math.sin(a1), x + r * math.cos(a0), z + r * math.sin(a0), 2.62, 3.0, uvs=((0, 0), (1, 0), (1, 1), (0, 1)))
    lathe('kiosk_green', (x, 2.6, z), [(1.75, .0), (1.75, .42), (1.5, .55), (1.0, .95), (.45, 1.3), (.12, 1.55), (0, 1.62)], 8)
    lathe('gilt', (x, 4.2, z), [(0, 0), (.1, 0), (.06, .3), (.12, .45), (0, .6)], 8)

def morris(x, z):
    lathe('kiosk_green', (x, 0, z), [(0, 0), (.85, 0), (.85, .3), (.72, .38), (0, .38)], 16)
    lathe('morris_posters', (x, .38, z), [(.7, 0), (.7, 2.6)], 18, smooth_uv=True)
    lathe('kiosk_green', (x, 2.98, z), [(0, 0), (.85, 0), (.85, .2), (.78, .32), (.7, .9), (.4, 1.2), (.18, 1.35), (.25, 1.5), (0, 1.75)], 16)

def tree(x, z, h=11, k=None):
    k = k or K
    beam('bark', (x, 0, z), (x + random.uniform(-.3, .3), h * .45, z + random.uniform(-.3, .3)), .5, k=k)
    g = random.uniform(.85, 1.1); base = (.42 * g, .55 * g, .2 * g)
    for i in range(5):
        a = random.uniform(0, 6.28); r = random.uniform(0, 2.2); y = h * random.uniform(.55, .85)
        c = tuple(min(1, v * random.uniform(.8, 1.2)) for v in base)
        blob('leaf', (x + math.cos(a) * r, y, z + math.sin(a) * r), random.uniform(2.6, 3.6), (1, .8, 1), k=k, col=c)

def car(name, color, pivot=(0, 0, 0)):
    k = Kit()
    ab(color, (-.85, .55, -1.6), (.85, 1.2, 1.4), k=k)                       # body tub
    ab(color, (-.6, .65, 1.4), (.6, 1.2, 2.5), k=k)                         # bonnet
    ab('chrome', (-.62, .55, 2.48), (.62, 1.25, 2.6), k=k)                  # radiator
    ab('car_black', (-.9, 1.95, -1.65), (.9, 2.02, .45), k=k)               # roof
    for sx in (-1, 1):
        beam('car_black', (sx * .85, 1.2, .4), (sx * .85, 1.97, .4), .06, k=k); beam('car_black', (sx * .85, 1.2, -1.6), (sx * .85, 1.97, -1.6), .06, k=k)
        ab('car_black', (sx * .82, .5, -2.0), (sx * 1.05, .58, 2.2), k=k)      # running board
        for zz in (-1.6, 1.75):
            cylx('tyre', (sx * .88, .42, zz), .42, .16, 16, k); cylx('chrome', (sx * .97, .42, zz), .16, .04, 10, k)
            lathe('car_black', (sx * .9, .42, zz), [(.48, -.05), (.5, .3), (.0, .32)], 10, k)
    quad('glass_win', (-.8, 1.2, .45), (.8, 1.2, .45), (.8, 1.9, .42), (-.8, 1.9, .42), k=k)
    ab('seat_leather', (-.75, .9, -1.4), (.75, 1.45, -.6), k=k)
    for sx in (-1, 1): lathe('headlamp', (sx * .55, 1.25, 2.55), [(0, 0), (.15, 0), (.17, .1), (0, .15)], 8, k)
    KEEPS[name] = (k, pivot)

def paris():
    # ground
    ab('cobble', (-9, -.1, -150), (9, 0, 200))
    for sd in (-1, 1):
        ab('pavement', (sd * 9, 0, -150), (sd * STREET_W, .15, 200)); ab('kerb', (sd * 9 - sd * .25, 0, -150), (sd * 9, .16, 200))
    ab('cobble', (-60, -.1, 90), (-14, 0, 100)); ab('cobble', (14, -.1, 90), (60, 0, 100))
    ab('cobble', (-60, -.1, -20), (-14, 0, -10)); ab('cobble', (14, -.1, -20), (60, 0, -10))
    # blocks: (side, z0, z1, floors, stone, shop index)
    blocks = [(-1, 200, 160, 5, 'stone_a', 0), (-1, 160, 128, 5, 'stone_b', 1), (-1, 128, 100, 5, 'stone_a', 2), (-1, 90, 62, 5, 'stone_b', 3), (-1, 62, 30, 5, 'stone_a', 4), (-1, 30, -10, 5, 'stone_b', 5),
              (1, 200, 168, 5, 'stone_b', 6), (1, 168, 136, 5, 'stone_a', 7), (1, 136, 100, 5, 'stone_b', 8), (1, 90, 58, 5, 'stone_a', 9), (1, 58, 26, 5, 'stone_b', 10), (1, 26, -10, 5, 'stone_a', 11),
              (1, -55, -95, 5, 'stone_b', 1), (1, -95, -150, 5, 'stone_a', 4)]
    for (sd, z0, z1, fl, st, si) in blocks: building(sd, z0, z1, fl, st, True, si)
    crillon(-1, -20, -150)
    commissariat(1, -20, -55)
    kiosk(-11.6, 52); morris(11.4, 74)
    for z in range(190, -150, -22):
        for sd in (-1, 1): lamp_post(sd * 9.6, z + (sd > 0) * 11)
    # café terrace (right side, z 104..126)
    for i in range(6):
        for j in range(2):
            x, z = 10.4 + j * 1.6, 108 + i * 3.2
            cyl('cafe_table', (x, 0, z), .05, .72, 6); cyl('cafe_table', (x, .72, z), .36, .04, 12)
            for a in (0, math.pi):
                cx, cz = x + .55 * math.cos(a), z + .55 * math.sin(a)
                ab('wicker', (cx - .22, .42, cz - .22), (cx + .22, .48, cz + .22)); ab('wicker', (cx + (.2 if a == 0 else -.24), .48, cz - .22), (cx + (.24 if a == 0 else -.2), .95, cz + .22))
                for (dx, dz) in ((-.18, -.18), (.18, -.18), (-.18, .18), (.18, .18)): beam('wicker', (cx + dx, 0, cz + dz), (cx + dx, .42, cz + dz), .04)
    wallquad('sign_cafe', 14 - .5, 104, 14 - .5, 126, 3.45, 4.25)
    # street name plaque (blue enamel) on the corner
    wallquad('sign_rue', -14 + .05, 30.6, -14 + .05, 28.6, 3.5, 3.95)
    # Champ de Mars: lawns, gravel, tree rows, tower
    ab('gravel', (-140, -.12, -620), (140, 0, -150))
    for sd in (-1, 1):
        ab('lawn', (sd * 18, 0, -440), (sd * 75, .06, -160))
        for z in range(-165, -400, -14): tree(sd * 90 + random.uniform(-1, 1), z, random.uniform(11, 14)); tree(sd * 105 + random.uniform(-1, 1), z - 7, random.uniform(11, 14))
    for z in range(-155, -60, 20): pass
    tower((0, 0, -460))
    # distant city ring
    for i in range(140):
        a = random.uniform(0, 2 * math.pi); r = random.uniform(330, 900)
        x, z = math.cos(a) * r, -460 + math.sin(a) * r
        if abs(x) < 70 and z > -260: continue
        w, d, h = random.uniform(18, 50), random.uniform(18, 40), random.uniform(16, 24); ry = random.uniform(0, 3)
        box('stone_a' if i % 2 else 'stone_b', (x, h / 2, z), (w, h, d), ry); box('zinc', (x, h + 2.2, z), (w * .9, 4.4, d * .8), ry)
    # sky-side horizon floor
    ab('gravel', (-1500, -.3, -1700), (1500, -.12, 900))

def crillon(side, z0, z1):
    """Hôtel de Crillon style frontage: rusticated arcade, giant Corinthian colonnade, balustrade, marquise canopy."""
    fx = side * STREET_W; X = lambda d: fx - side * d
    zmin, zmax = min(z0, z1), max(z0, z1)
    ab('stone_a', (fx, 0, zmin), (fx + side * 26, 22.5, zmax))
    ab('stone_rust', (X(.4), 0, zmin), (fx, 7.2, zmax))
    nb = 18; bw = (zmax - zmin) / nb
    for b in range(nb):
        zc = zmin + (b + .5) * bw
        ab('glass_win', (X(.45), .3, zc - 1.25), (X(.3), 5.8, zc + 1.25)); ab('stone_a', (X(.55), 5.6, zc - 1.6), (X(.3), 6.3, zc + 1.6))
        lathe('stone_a', (X(1.2), 7.2, zc - bw / 2), [(0, 0), (.75, 0), (.75, .5), (.6, .6), (.55, 11.5), (.85, 12.2), (.85, 12.6), (0, 12.6)], 12)   # columns
        for (yy, hh) in ((8.6, 3.0), (13.2, 3.0)): ab('glass_win', (X(.05), yy, zc - .8), (X(-.1), yy + hh, zc + .8)); ab('stone_a', (X(.3), yy + hh, zc - 1.0), (X(.0), yy + hh + .4, zc + 1.0))
    ab('stone_a', (X(2.2), 19.8, zmin), (fx, 21.2, zmax))
    for i in range(int((zmax - zmin) / .55)): lathe('stone_a', (X(1.9), 21.2, zmin + .3 + i * .55), [(.12, 0), (.18, .3), (.1, .6), (.12, .9), (.0, .92)], 6)
    ab('stone_a', (X(2.2), 22.1, zmin), (fx, 22.4, zmax))
    # entrance: marquise canopy, doors, red carpet steps, sign
    zc = (zmin + zmax) / 2 + 12
    ab('door_white', (X(.5), 0, zc - 1.6), (X(.35), 4.2, zc + 1.6)); ab('glass_win', (X(.55), .2, zc - 1.4), (X(.48), 4.0, zc + 1.4))
    for i in range(3): ab('stair_red', (X(.5 + (3 - i) * .45), 0, zc - 2.2), (X(.45), .17 * (i + 1), zc + 2.2))
    ab('iron', (X(4.6), 4.6, zc - 3.4), (X(.3), 4.8, zc + 3.4)); quad('glass_roof', (X(.3), 4.82, zc - 3.4), (X(4.6), 4.82, zc - 3.4), (X(4.6), 4.82, zc + 3.4), (X(.3), 4.82, zc + 3.4))
    for zz in (zc - 3.3, zc + 3.3): beam('iron', (X(4.5), 0, zz), (X(4.5), 4.6, zz), .12)
    wallquad('sign_crillon', X(4.65), zc + 3.3, X(4.65), zc - 3.3, 4.85, 5.65)
    for zz in (zc - 2.6, zc + 2.6): lathe('pot_ceramic', (X(.9), .52, zz), [(0, 0), (.35, 0), (.45, .7), (0, .7)], 10); blob('plant_dark', (X(.9), 1.6, zz), .7, (1, 1.2, 1))
    for zz in range(int(zmin) + 4, int(zmax) - 2, 9): lamp_post(X(-.3) + side * 0, zz)   # lanterns on the facade line
    # flags above the entrance
    for zz in (zc - 2.5, zc + 2.5):
        beam('iron', (X(.2), 8.0, zz), (X(2.6), 10.0, zz), .06); quad('flag_fr', (X(2.6), 10.0, zz), (X(2.6), 8.3, zz), (X(.9), 7.2, zz + .02), (X(.9), 8.9, zz + .02), ((1, 1), (1, 0), (0, 0), (0, 1)))
    ab('stone_a', (X(0), 0, zmin - 2), (X(-30), 22, zmin))

def commissariat(side, z0, z1):
    building(side, z0, z1, 4, 'stone_b', False, 0)
    fx = side * STREET_W; X = lambda d: fx - side * d; zmin, zmax = min(z0, z1), max(z0, z1); zc = (zmin + zmax) / 2
    ab('door_white', (X(.25), 0, zc - 1.2), (X(.05), 3.6, zc + 1.2)); ab('shop_blue', (X(.3), 0, zc - 1.0), (X(.2), 3.3, zc + 1.0))
    wallquad('sign_police', X(.35), zc + 3.5 if side < 0 else zc - 3.5, X(.35), zc - 3.5 if side < 0 else zc + 3.5, 3.75, 4.45)
    for zz in (zc - 1.8, zc + 1.8):
        beam('iron', (X(.1), 4.9, zz), (X(1.6), 6.3, zz), .05); quad('flag_fr', (X(1.6), 6.3, zz), (X(1.6), 5.0, zz), (X(.4), 4.1, zz + .02), (X(.4), 5.5, zz + .02), ((1, 1), (1, 0), (0, 0), (0, 1)))
    lathe('lamp_glass', (X(.6), 3.2, zc + 2.6), [(0, 0), (.18, 0), (.22, .35), (0, .4)], 8)
    ab('stone_a', (X(.5), 0, zc - 2.0), (X(.0), .3, zc + 2.0))

# ================================================================== HOTEL (x + 1000)
HX = 1000.0
def hotel():
    x0, x1, z0, z1, H = HX - 7, HX + 7, -5.0, 5.0, 5.2
    ab('parquet', (x0, -.1, z0), (x1, 0, z1)); ab('ceiling_plaster', (x0, H, z0), (x1, H + .2, z1))
    # walls (boiserie panels) with openings: 3 windows on z0, door on x1, fireplace on z1
    wallquad('boiserie', x1, z1, x0, z1, 0, H, uvs=((0, 0), (14, 0), (14, H), (0, H)))           # back wall (z1) faces -z
    wallquad('boiserie', x0, z1, x0, z0, 0, H, uvs=((0, 0), (10, 0), (10, H), (0, H)))           # x0 wall faces +x
    # x1 wall with door opening (z -1.1..1.1, h 3.4)
    for (za, zb) in ((z0, -1.1), (1.1, z1)): wallquad('boiserie', x1, za, x1, zb, 0, H, uvs=((0, 0), (zb - za, 0), (zb - za, H), (0, H)))
    wallquad('boiserie', x1, -1.1, x1, 1.1, 3.4, H, uvs=((0, 3.4), (2.2, 3.4), (2.2, H), (0, H)))
    ab('gilt', (x1 - .12, 0, -1.3), (x1 + .05, 3.6, -1.1)); ab('gilt', (x1 - .12, 0, 1.1), (x1 + .05, 3.6, 1.3)); ab('gilt', (x1 - .12, 3.4, -1.3), (x1 + .05, 3.65, 1.3))
    # window wall z0: three tall french windows (x -4.5, 0, 4.5), w 1.8, sill .25, top 4.1
    wins = [-4.5, 0, 4.5]; edges = [x0] + [w for c in wins for w in (HX + c - .9, HX + c + .9)] + [x1]
    for i in range(0, len(edges), 2): wallquad('boiserie', edges[i], z0, edges[i + 1], z0, 0, H, uvs=((0, 0), (edges[i + 1] - edges[i], 0), (edges[i + 1] - edges[i], H), (0, H)))
    for c in wins:
        wx = HX + c
        wallquad('boiserie', wx - .9, z0, wx + .9, z0, 0, .25, uvs=((0, 0), (1.8, 0), (1.8, .25), (0, .25))); wallquad('boiserie', wx - .9, z0, wx + .9, z0, 4.1, H, uvs=((0, 4.1), (1.8, 4.1), (1.8, H), (0, H)))
        for xx in (wx - .9, wx, wx + .9): ab('door_white', (xx - .05, .25, z0 - .06), (xx + .05, 4.1, z0 + .02))
        for yy in (.25, 1.5, 2.8, 4.05): ab('door_white', (wx - .9, yy, z0 - .06), (wx + .9, yy + .06, z0 + .02))
        for sd in (-1, 1):   # drapes (folded)
            for f in range(5): lathe('drape_red', (wx + sd * (1.2 + f * .12), 0, z0 + .25), [(.09, 0), (.08, 4.6), (.07, 4.65)], 6)
        ab('gilt', (wx - 1.7, 4.55, z0 + .05), (wx + 1.7, 4.8, z0 + .35))
    # dado / cornice / mouldings
    for (a, b) in (((x0, z0), (x1, z0 + .08)), ((x0, z1 - .08), (x1, z1)), ((x0, z0), (x0 + .08, z1)), ((x1 - .08, z0), (x1, z1))):
        ab('gilt', (a[0], H - .35, a[1]), (b[0], H - .2, b[1])); ab('boiserie', (a[0], 0, a[1]), (b[0], .14, b[1]))
    # fireplace + mirror on z1
    ab('marble_white', (HX - 1.1, 0, z1 - .45), (HX + 1.1, 1.25, z1)); ab('ink', (HX - .65, 0, z1 - .46), (HX + .65, .85, z1 - .2)); ab('marble_white', (HX - 1.25, 1.25, z1 - .55), (HX + 1.25, 1.36, z1))
    ab('gilt', (HX - 1.05, 1.4, z1 - .1), (HX + 1.05, 4.3, z1 - .02)); ab('mirror', (HX - .9, 1.55, z1 - .12), (HX + .9, 4.15, z1 - .1))
    for sd in (-1, 1): lathe('gilt', (HX + sd * .8, 1.36, z1 - .3), [(0, 0), (.1, 0), (.03, .35), (.06, .45), (.02, .6), (0, .62)], 8)
    lathe('gilt', (HX, 1.36, z1 - .3), [(0, 0), (.14, 0), (.12, .25), (.08, .3), (0, .32)], 8)
    # paintings (canvas in front of a gilt frame of four bars)
    def frame_x(x, z0_, z1_, y0, y1, w=.12):
        for (a_, b_) in (((x, y0 - w, z0_ - w), (x + .07, y0, z1_ + w)), ((x, y1, z0_ - w), (x + .07, y1 + w, z1_ + w)), ((x, y0, z0_ - w), (x + .07, y1, z0_)), ((x, y0, z1_), (x + .07, y1, z1_ + w))): ab('gilt', a_, b_)
    def frame_z(z, x0_, x1_, y0, y1, w=.12):
        for (a_, b_) in (((x0_ - w, y0 - w, z - .07), (x1_ + w, y0, z)), ((x0_ - w, y1, z - .07), (x1_ + w, y1 + w, z)), ((x0_ - w, y0, z - .07), (x0_, y1, z)), ((x1_, y0, z - .07), (x1_ + w, y1, z))): ab('gilt', a_, b_)
    quad('canvas_a', (x0 + .03, 1.7, 2.2), (x0 + .03, 1.7, -2.2), (x0 + .03, 4.0, -2.2), (x0 + .03, 4.0, 2.2)); frame_x(x0, -2.2, 2.2, 1.7, 4.0)
    quad('canvas_b', (HX + 4.6, 1.9, z1 - .03), (HX + 2.6, 1.9, z1 - .03), (HX + 2.6, 3.6, z1 - .03), (HX + 4.6, 3.6, z1 - .03)); frame_z(z1, HX + 2.6, HX + 4.6, 1.9, 3.6)
    quad('canvas_c', (HX - 2.6, 1.9, z1 - .03), (HX - 4.6, 1.9, z1 - .03), (HX - 4.6, 3.6, z1 - .03), (HX - 2.6, 3.6, z1 - .03)); frame_z(z1, HX - 4.6, HX - 2.6, 1.9, 3.6)
    # sconces
    for (sx, sz) in ((HX - 5.8, z1 - .1), (HX + 5.8, z1 - .1), (HX + 1.8, z1 - .1), (HX - 1.8, z1 - .1)):
        ab('gilt', (sx - .06, 2.3, sz - .15), (sx + .06, 2.6, sz)); lathe('lamp_glass', (sx, 2.62, sz - .25), [(0, 0), (.07, 0), (.08, .2), (0, .22)], 6)
    # the conference table + chairs
    ab('mahogany', (HX - 3.6, .7, -.85), (HX + 3.6, .78, .85)); ab('leather_green', (HX - 3.35, .78, -.6), (HX + 3.35, .785, .6))
    for (lx, lz) in ((-3.4, -.7), (3.4, -.7), (-3.4, .7), (3.4, .7), (0, -.7), (0, .7)): lathe('mahogany', (HX + lx, 0, lz), [(.06, 0), (.09, .1), (.05, .35), (.08, .55), (.07, .7)], 8)
    ab('mahogany', (HX - 3.55, .58, -.8), (HX + 3.55, .7, .8))
    for i, cx in enumerate([-2.4, 0, 2.4]):
        for sz in (-1, 1): chair(HX + cx, sz * 1.25, -sz)
    chair(HX - 4.2, 0, 1, axis='x'); chair(HX + 4.2, 0, -1, axis='x')
    # chandeliers
    for cx in (-2.6, 2.6): chandelier(HX + cx, H, 0)
    # cheval mirror in the corner (by the window), palm
    ab('mahogany', (HX - 6.4, 0, -3.32), (HX - 6.3, 2.2, -3.22)); ab('mahogany', (HX - 6.4, 0, -2.18), (HX - 6.3, 2.2, -2.08)); ab('mahogany', (HX - 6.4, 0, -3.3), (HX - 5.6, .06, -3.2)); ab('mahogany', (HX - 6.4, 0, -2.2), (HX - 5.6, .06, -2.1))
    for (a_, b_) in (((HX - 6.37, .35, -3.22), (HX - 6.29, .43, -2.18)), ((HX - 6.37, 2.08, -3.22), (HX - 6.29, 2.16, -2.18)), ((HX - 6.37, .35, -3.22), (HX - 6.29, 2.16, -3.14)), ((HX - 6.37, .35, -2.26), (HX - 6.29, 2.16, -2.18))): ab('gilt', a_, b_)
    ab('mirror', (HX - 6.32, .43, -3.14), (HX - 6.3, 2.08, -2.26))
    lathe('pot_ceramic', (HX + 6.2, 0, -4.2), [(0, 0), (.3, 0), (.42, .55), (0, .55)], 10)
    for i in range(9):
        a = i * .7; beam('leaf_palm', (HX + 6.2, .5, -4.2), (HX + 6.2 + math.cos(a) * 1.1, 1.6 + (i % 3) * .3, -4.2 + math.sin(a) * 1.1), .28, .03)
    # side table (letters stage, by the window) + sideboard with decanter
    ab('mahogany', (HX - 5.6, .78, 3.6), (HX - 3.6, .84, 4.6)); [lathe('mahogany', (HX + lx, 0, lz), [(.04, 0), (.05, .78)], 6) for lx in (-5.5, -3.7) for lz in (3.7, 4.5)]
    # outside the windows: balcony balustrade, Place de la Concorde rooftops, the tower far away
    ab('stone_a', (x0 - 2, -.2, z0 - 3), (x1 + 2, 0, z0)); ab('stone_a', (x0 - 2, .9, z0 - 3.1), (x1 + 2, 1.05, z0 - 2.9))
    for i in range(70): lathe('stone_a', (x0 - 1.5 + i * .25, 0, z0 - 3), [(.07, 0), (.1, .25), (.05, .55), (.08, .8), (0, .9)], 6)
    for i in range(40):
        bx = HX + random.uniform(-260, 260); bz = random.uniform(-80, -420); w, d, h = random.uniform(20, 45), random.uniform(15, 30), random.uniform(-6, 4)
        box('stone_a' if i % 2 else 'stone_b', (bx, h - 6, bz), (w, 16, d), random.uniform(-.2, .2)); box('zinc', (bx, h + 3.5, bz), (w * .92, 3.6, d * .8))
    tower((HX + 260, -18, -1350), detail=0)

def chair(x, z, face, axis='z', **kw):
    f = kw.get('face', face)
    if axis == 'z':
        ab('velvet_red', (x - .28, .45, z - .25), (x + .28, .55, z + .25)); bz = z + f * -.27
        ab('mahogany', (x - .3, .4, z - .27), (x + .3, .46, z + .27)); ab('mahogany', (x - .3, .45, bz - .04), (x + .3, 1.15, bz + .04)); ab('velvet_red', (x - .22, .58, bz - .06 * -f), (x + .22, 1.05, bz + .02 * f))
        for dx in (-.25, .25):
            for dz in (-.22, .22): lathe('mahogany', (x + dx, 0, z + dz), [(.03, 0), (.035, .4)], 6)
    else:
        ab('velvet_red', (x - .25, .45, z - .28), (x + .25, .55, z + .28)); bx = x - f * .27
        ab('mahogany', (x - .27, .4, z - .3), (x + .27, .46, z + .3)); ab('mahogany', (bx - .04, .45, z - .3), (bx + .04, 1.25, z + .3)); ab('velvet_red', (bx - .06, .58, z - .22), (bx + .06, 1.15, z + .22))
        for dx in (-.22, .22):
            for dz in (-.25, .25): lathe('mahogany', (x + dx, 0, z + dz), [(.03, 0), (.035, .4)], 6)

def chandelier(x, top, z, s=1.0):
    cyl('gilt', (x, top - .6 * s, z), .02 * s, .6 * s, 4)
    lathe('gilt', (x, top - 1.35 * s, z), [(0, 0), (.08 * s, .0), (.22 * s, .35 * s), (.12 * s, .6 * s), (.05 * s, .75 * s), (0, .78 * s)], 8)
    for i in range(10):
        a = 2 * math.pi * i / 10; ex, ez = x + math.cos(a) * .55 * s, z + math.sin(a) * .55 * s
        beam('gilt', (x, top - 1.15 * s, z), (ex, top - 1.0 * s, ez), .03 * s); lathe('lamp_glass', (ex, top - .98 * s, ez), [(0, 0), (.035 * s, 0), (.04 * s, .1 * s), (0, .16 * s)], 5)
        for j in range(3): blob('crystal', (x + math.cos(a + .3) * (.3 + j * .1) * s, top - (1.3 + j * .12) * s, z + math.sin(a + .3) * (.3 + j * .1) * s), .035 * s, sub=0)
    blob('crystal', (x, top - 1.5 * s, z), .09 * s, (1, 1.6, 1), sub=0)

def corridor():
    x0, x1, z0, z1, H = HX + 7, HX + 47, -1.7, 1.7, 4.3
    ab('parquet', (x0, -.1, z0), (x1, 0, z1)); ab('hall_carpet', (x0, 0, -.8), (x1 - .5, .015, .8)); ab('ceiling_plaster', (x0, H, z0), (x1, H + .2, z1))
    for (za, sd) in ((z0, 1), (z1, -1)):
        x = x0
        while x < x1 - .1:
            nx = min(x1, x + 6.0)
            wallquad('wallpaper', x if sd > 0 else nx, za, nx if sd > 0 else x, za, 0, H, uvs=((0, 0), (nx - x, 0), (nx - x, H), (0, H)))
            dc = x + 3.0
            ab('door_white', (dc - .65, 0, za - .05 * sd), (dc + .65, 2.7, za + .06 * sd)); ab('gilt', (dc - .8, 2.7, za), (dc + .8, 2.9, za + .1 * sd))
            ab('brass', (dc + .45, 1.0, za + .07 * sd), (dc + .5, 1.06, za + .1 * sd))
            ab('gilt', (dc + 1.9, 2.2, za), (dc + 2.0, 2.45, za + .14 * sd)); lathe('lamp_glass', (dc + 1.95, 2.45, za + .2 * sd), [(0, 0), (.06, 0), (.07, .18), (0, .2)], 6)
            ab('boiserie', (x, 0, za), (nx, 1.0, za + .04 * sd))
            x = nx
        ab('gilt', (x0, H - .3, za), (x1, H - .18, za + .1 * sd))
    for i in range(6): chandelier(x0 + 3.5 + i * 6.5, H, 0, .62)
    # end window with drapes
    wallquad('boiserie', x1, z0, x1, z1, 0, H, uvs=((0, 0), (3.4, 0), (3.4, H), (0, H)))
    ab('glass_win', (x1 - .05, .6, -.9), (x1, 3.6, .9)); [ab('door_white', (x1 - .1, .6, zz - .04), (x1 - .04, 3.6, zz + .04)) for zz in (-.9, 0, .9)]
    for sd in (-1, 1):
        for f in range(4): lathe('drape_red', (x1 - .25, 0, sd * (1.05 + f * .1)), [(.08, 0), (.07, 3.9)], 6)
    # alcove bench + palm at x+20, console tables
    ab('velvet_red', (HX + 26, .42, z1 - .6), (HX + 28, .55, z1 - .05)); ab('mahogany', (HX + 26, 0, z1 - .6), (HX + 28, .42, z1 - .05))
    lathe('pot_ceramic', (HX + 29, 0, z1 - .45), [(0, 0), (.25, 0), (.35, .5), (0, .5)], 10)
    for i in range(8): a = i * .8; beam('leaf_palm', (HX + 29, .45, z1 - .45), (HX + 29 + math.cos(a) * .9, 1.4 + (i % 3) * .25, z1 - .45 + math.sin(a) * .5), .24, .03)
    ab('mahogany', (HX + 16, .8, z0 + .05), (HX + 17.4, .86, z0 + .5)); lathe('pot_ceramic', (HX + 16.7, .86, z0 + .28), [(0, 0), (.1, 0), (.16, .25), (.06, .4), (.08, .45), (0, .45)], 10)

# ================================================================== STATION (x - 1000)
SX = -1000.0
def station():
    ab('ballast', (SX - 40, -.2, -120), (SX + 40, 0, 60))
    ab('platform_stone', (SX - 16, 0, -100), (SX, .9, 50)); ab('kerb', (SX - .3, .88, -100), (SX, .95, 50))
    ab('platform_stone', (SX + 4.0, 0, -100), (SX + 12, .9, 50))
    for tx in (SX + 2.0, SX + 16):
        for sd in (-.72, .72): ab('rail_steel', (tx + sd - .04, 0, -120), (tx + sd + .04, .18, 60))
        for z in range(-120, 60, 1): ab('sleeper_wood', (tx - 1.3, 0, z), (tx + 1.3, .1, z + .25))
    for z in range(-90, 50, 12):     # cast iron columns + arched trusses
        for x in (SX - 7, SX + 9):
            lathe('iron_green', (x, .9 if x < SX + 4 else .9, z), [(.32, 0), (.32, .5), (.18, .7), (.16, 7.4), (.3, 7.8), (.0, 8.0)], 10)
        prev = None
        for i in range(25):
            a = math.pi * i / 24; x = SX + 1 - math.cos(a) * 15; y = 8.7 + math.sin(a) * 9
            if prev: beam('iron_green', prev, (x, y, z), .32); beam('iron_green', (prev[0], prev[1] - .9, z), (x, y - .9, z), .2)
            if i % 2 == 0 and prev: beam('iron_green', (x, y, z), (x, y - .9, z), .12)
            prev = (x, y, z)
    for i in range(24):   # glazed roof panels between trusses
        a0, a1 = math.pi * i / 24, math.pi * (i + 1) / 24
        x0_, y0_ = SX + 1 - math.cos(a0) * 15, 8.7 + math.sin(a0) * 9; x1_, y1_ = SX + 1 - math.cos(a1) * 15, 8.7 + math.sin(a1) * 9
        quad('glass_roof' if 6 < i < 18 else 'zinc', (x0_, y0_, -96), (x1_, y1_, -96), (x1_, y1_, 52), (x0_, y0_, 52), ((0, 0), (1, 0), (1, 30), (0, 30)))
    # side wall with posters, clock, benches, luggage
    ab('brick', (SX - 17, 0, -100), (SX - 16, 9, 50))
    for i, z in enumerate(range(-60, 40, 9)):
        m = ['poster_a', 'poster_b', 'poster_c'][i % 3]; wallquad(m, SX - 15.95, z + 2.4, SX - 15.95, z, 2.2, 5.6)
    lathe('iron_green', (SX - 3, 6.0, -8), [(0, 0), (.05, 0), (.05, 1.5), (0, 1.5)], 6)
    lathe('iron_green', (SX - 3, 5.0, -8), [(0, 0), (.7, 0), (.7, .25), (0, .25)], 16)
    quad('clock_face', (SX - 3.6, 4.65, -8.26), (SX - 2.4, 4.65, -8.26), (SX - 2.4, 5.85, -8.26), (SX - 3.6, 5.85, -8.26)); ab('iron_green', (SX - 3.7, 4.55, -8.25), (SX - 2.3, 5.95, -7.75))
    quad('clock_face', (SX - 2.4, 4.65, -7.74), (SX - 3.6, 4.65, -7.74), (SX - 3.6, 5.85, -7.74), (SX - 2.4, 5.85, -7.74))
    wallquad('sign_station', SX - 15.9, -18, SX - 15.9, -30, 6.2, 7.4)
    for z in (-40, -20, 10, 25):
        ab('mahogany', (SX - 14.5, .9, z), (SX - 13.8, 1.35, z + 3)); ab('mahogany', (SX - 14.6, 1.35, z), (SX - 14.5, 2.0, z + 3))
    for i in range(10):
        z = random.uniform(-50, 30); x = SX - random.uniform(4, 12); w, h, d = random.uniform(.5, .9), random.uniform(.3, .5), random.uniform(.3, .5)
        box('suitcase', (x, .9 + h / 2, z), (w, h, d), random.uniform(0, 3))
    # far end: big arched glass gable with daylight
    for i in range(13):
        a0 = math.pi * i / 12; x = SX + 1 - math.cos(a0) * 15; y = 8.7 + math.sin(a0) * 9; beam('iron_green', (x, 0, -96), (x, y, -96), .25)
    quad('glass_roof', (SX - 14, 0, -96.2), (SX + 16, 0, -96.2), (SX + 16, 17.7, -96.2), (SX - 14, 17.7, -96.2))
    ab('stone_a', (SX - 40, 0, 52), (SX + 40, 26, 54))
    tower((SX + 40, -30, -900), detail=0)
    ab('stone_b', (SX - 300, -.4, -1300), (SX + 300, -.2, -97))

def train(pivot):
    k = Kit(); x = SX + 2.0
    # locomotive (pointing -z)
    cl = []
    for i in range(16): a = 2 * math.pi * i / 16; cl.append((x + 1.15 * math.cos(a), 2.4 + 1.15 * math.sin(a)))
    pts = [(p[0], p[1], z) for z in (-28.0, -18.0) for p in cl]; F = [(i, (i + 1) % 16, 16 + (i + 1) % 16, 16 + i) for i in range(16)]; F.append(tuple(range(16))[::-1]); F.append(tuple(range(16, 32)))
    k.add('loco_black', pts, F)
    ab('loco_black', (x - 1.4, 1.0, -18), (x + 1.4, 4.2, -14.2), k=k); ab('carriage_window', (x - 1.42, 2.8, -17.4), (x + 1.42, 3.6, -16.4), k=k)
    ab('loco_black', (x - 1.5, 4.2, -18.2), (x + 1.5, 4.4, -14.0), k=k)
    cyl('loco_black', (x, 3.4, -26.6), .38, 1.9, 12, k); lathe('brass', (x, 3.4, -23.0), [(.0, 0), (.4, 0), (.42, .5), (.25, .9), (0, 1.0)], 10, k)
    for zz in (-26.5, -24.2, -21.9, -19.6):
        for sd in (-1, 1): cylx('car_red', (x + sd * 1.0, .85, zz), .85, .14, 18, k)
    ab('car_red', (x - 1.5, .6, -28.6), (x + 1.5, .95, -28.2), k=k)
    lathe('headlamp', (x, 3.3, -28.1), [(0, 0), (.22, 0), (.25, .2), (0, .25)], 10, k)
    ab('loco_black', (x - 1.3, 1.0, -14), (x + 1.3, 3.0, -9), k=k)   # tender
    # carriages (Wagons-Lits blue with gold lining)
    for c in range(3):
        z0 = -8.5 + c * 21; z1 = z0 + 20
        ab('carriage_blue', (x - 1.45, 1.1, z0), (x + 1.45, 2.25, z1), k=k); ab('carriage_blue', (x - 1.45, 3.25, z0), (x + 1.45, 3.9, z1), k=k)   # below / above the windows
        ab('carriage_blue', (x - 1.45, 2.25, z0), (x + 1.45, 3.25, z0 + 1.6), k=k); ab('carriage_blue', (x - 1.45, 2.25, z1 - 1.5), (x + 1.45, 3.25, z1), k=k)
        for w in range(7): zz = z0 + 3.0 + w * 2.3; ab('carriage_blue', (x - 1.45, 2.25, zz), (x + 1.45, 3.25, zz + .9), k=k)   # piers between windows
        ab('seat_leather', (x - 1.3, 1.1, z0 + 1.7), (x - .3, 1.6, z1 - 1.6), k=k); ab('mahogany', (x - .2, 1.1, z0 + 1.6), (x + .1, 3.25, z1 - 1.5), k=k)   # compartment seats + corridor wall
        ab('loco_black', (x - 1.5, 3.9, z0), (x + 1.5, 4.25, z1), k=k)
        ab('brass', (x - 1.47, 3.6, z0 + .2), (x + 1.47, 3.66, z1 - .2), k=k); ab('brass', (x - 1.47, 1.6, z0 + .2), (x + 1.47, 1.66, z1 - .2), k=k)
        for w in range(8):
            zz = z0 + 1.6 + w * 2.3
            ab('carriage_window', (x - 1.47, 2.25, zz), (x + 1.47, 3.25, zz + 1.4), k=k)
        for zz in (z0 + 3, z1 - 3):
            for sd in (-1, 1): cylx('loco_black', (x + sd * .75, .5, zz), .48, .12, 14, k)
    KEEPS['Train'] = (k, pivot)

# ================================================================== PROPS (tabletop + movable)
def props():
    def P(name, fn, pivot=(0, 0, 0)):
        k = Kit(); fn(k); KEEPS[name] = (k, pivot)
    P('Letter0', lambda k: quad('paper_letter0', (-.105, .001, .148), (.105, .001, .148), (.105, .001, -.148), (-.105, .001, -.148), k=k))
    P('Letter', lambda k: quad('paper_letter', (-.105, .001, .148), (.105, .001, .148), (.105, .001, -.148), (-.105, .001, -.148), k=k))
    def letters(k):
        for i, (dx, dz, r) in enumerate(((.0, .0, 0), (.04, -.02, .12), (-.03, .03, -.08))):
            c, s = math.cos(r), math.sin(r); pts = [(x * c - z * s + dx, .001 + i * .0015, x * s + z * c + dz) for (x, z) in ((-.105, .148), (.105, .148), (.105, -.148), (-.105, -.148))]
            quad('paper_letter', *pts, k=k)
    P('Letters', letters)
    P('Blueprint', lambda k: quad('blueprint', (-.42, .001, .3), (.42, .001, .3), (.42, .001, -.3), (-.42, .001, -.3), k=k))
    P('Cheque', lambda k: quad('cheque', (-.1, .001, .045), (.1, .001, .045), (.1, .001, -.045), (-.1, .001, -.045), k=k))
    def env(k):
        ab('envelope', (-.11, 0, -.06), (.11, .006, .06), k=k); quad('envelope', (-.11, .007, -.06), (.11, .007, -.06), (0, .007, .01), (0, .007, .01), k=k); cyl('wax', (0, .006, .005), .014, .004, 10, k)
    P('Envelope', env)
    def pen(k): beam('ink', (-.07, .006, 0), (.06, .006, 0), .011, k=k); beam('gilt', (.06, .006, 0), (.075, .006, 0), .009, k=k); beam('gilt', (-.07, .006, 0), (-.08, .006, 0), .012, k=k)
    P('Pen', pen)
    def inkwell(k): lathe('crystal', (0, 0, 0), [(0, 0), (.035, 0), (.04, .04), (.02, .055), (.022, .065), (0, .065)], 10, k); cyl('ink', (0, .045, 0), .028, .005, 8, k)
    P('Inkwell', inkwell)
    def stamp(k): ab('brass', (-.045, .004, -.032), (.045, .02, .032), k=k); lathe('mahogany', (0, .02, 0), [(.016, 0), (.016, .08), (.034, .1), (.036, .13), (.02, .15), (0, .152)], 12, k); ab('ink', (-.044, 0, -.031), (.044, .004, .031), k=k)
    P('Stamp', stamp, (0, 0, 0))
    P('InkPad', lambda k: (ab('suitcase', (-.06, 0, -.04), (.06, .014, .04), k=k), ab('wax', (-.05, .014, -.03), (.05, .016, .03), k=k)))
    def notes(k):
        for i in range(12): ab('banknote', (-.09 + random.uniform(-.004, .004), i * .0018, -.05 + random.uniform(-.003, .003)), (.09, (i + 1) * .0018, .05), k=k)
        ab('paper_plain', (-.012, 0, -.051), (.012, .023, .051), k=k)
    P('Banknotes', notes)
    def glass(k): lathe('glass_drink', (0, 0, 0), [(0, 0), (.03, 0), (.006, .01), (.005, .06), (.03, .07), (.042, .1), (.035, .13), (0, .13)], 12, k)
    P('Glass', glass)
    P('Ashtray', lambda k: lathe('crystal', (0, 0, 0), [(0, 0), (.06, 0), (.07, .025), (.05, .025), (.05, .012), (0, .012)], 12, k))
    def suit(k): ab('suitcase', (-.33, .0, -.11), (.33, .44, .11), k=k); beam('ink', (-.08, .47, 0), (.08, .47, 0), .025, k=k); ab('brass', (-.25, .38, -.115), (-.19, .43, .115), k=k); ab('brass', (.19, .38, -.115), (.25, .43, .115), k=k)
    P('Suitcase', suit)
    def model(k): tower((0, .03, 0), k=k, detail=0, s=1 / 900.0); cyl('mahogany', (0, 0, 0), .1, .03, 16, k)
    P('ModelTower', model)
    P('Newspaper', lambda k: quad('newspaper', (-.29, .002, .2), (.29, .002, .2), (.29, .002, -.2), (-.29, .002, -.2), k=k))
    def trolley(k):
        ab('trolley_brass', (-.6, .35, -.35), (.6, .4, .35), k=k)
        for sd in (-1, 1): beam('trolley_brass', (sd * .6, .35, -.35), (sd * .6, 1.9, -.35), .04, k=k); beam('trolley_brass', (sd * .6, .35, .35), (sd * .6, 1.9, .35), .04, k=k)
        beam('trolley_brass', (-.6, 1.9, -.35), (.6, 1.9, -.35), .04, k=k); beam('trolley_brass', (-.6, 1.9, .35), (.6, 1.9, .35), .04, k=k)
        for (dx, dz) in ((-.5, -.3), (.5, -.3), (-.5, .3), (.5, .3)): cylx('tyre', (dx, .14, dz), .14, .05, 10, k)
        for i, (w, h) in enumerate(((1.1, .3), (.9, .28), (.8, .35), (.6, .25))):
            y = .4 + sum(hh for (_, hh) in ((1.1, .3), (.9, .28), (.8, .35), (.6, .25))[:i]); ab('suitcase', (-w / 2, y, -.3), (w / 2, y + h, .3), k=k)
    P('Trolley', trolley)
    car('CarA', 'car_black'); car('CarB', 'car_red'); car('CarC', 'car_green')

# ================================================================== export
def build_objects(kit, name, pivot=(0, 0, 0), keep=False):
    objs = []
    for m, (V, F, U, C) in kit.parts.items():
        if not F: continue
        nm = ('KEEP ' + name) if keep else m
        me = bpy.data.meshes.new(nm)
        me.from_pydata([(v[0] - pivot[0], -(v[2] - pivot[2]), v[1] - pivot[1]) for v in V], [], F); me.update()
        uv = me.uv_layers.new(name='UVMap')
        li = 0
        for fi, poly in enumerate(me.polygons):
            uvs = U[fi]
            for j, lidx in enumerate(poly.loop_indices): uv.data[lidx].uv = uvs[j % len(uvs)]
        if m == 'leaf':
            a = me.color_attributes.new('Col', 'FLOAT_COLOR', 'POINT')
            for i, c in enumerate(C): a.data[i].color = (*c, 1)
        if m in SMOOTH:
            for p in me.polygons: p.use_smooth = True
        me.materials.append(mat(m))
        o = bpy.data.objects.new(nm, me); bpy.context.collection.objects.link(o); objs.append(o)
    if keep and len(objs) > 1:
        bpy.ops.object.select_all(action='DESELECT')
        for o in objs: o.select_set(True)
        bpy.context.view_layer.objects.active = objs[0]; bpy.ops.object.join(); objs = [bpy.context.view_layer.objects.active]
    if keep:
        objs[0].name = 'KEEP ' + name; objs[0].location = (pivot[0], -pivot[2], pivot[1])
    return objs
def export(name):
    bpy.ops.object.select_all(action='DESELECT')
    for o in bpy.context.scene.objects:
        if o.type == 'MESH': o.select_set(True)
    bpy.ops.export_scene.gltf(filepath=str(OUT / name), export_format='GLB', use_selection=True, export_apply=True, export_yup=True, export_materials='EXPORT',
                              export_cameras=False, export_lights=False, export_animations=False)
    print('exported', name)
def reset():
    bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
    for d in list(bpy.data.meshes): bpy.data.meshes.remove(d)

reset()
paris(); hotel(); corridor(); station(); train((SX + 2.0, 0, 0))
build_objects(K, 'world')
for nm, (k, pv) in list(KEEPS.items()): build_objects(k, nm, pv, keep=True)
export('world.glb')
reset(); K = Kit(); KEEPS.clear(); props()
for nm, (k, pv) in KEEPS.items(): build_objects(k, nm, pv, keep=True)
export('props.glb')
print('ALL ASSETS DONE')
