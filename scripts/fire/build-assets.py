"""YunoWorld — "The Firefighter Who Started Another Fire" (30 s animation test). Forest set, 1 unit = 1 m, Three coords (y up).
Run: blender -b --factory-startup -P scripts/fire/build-assets.py
  → public/fire/world.glb  terrain (analytic height H(x,z), shared with src/fire/terrain.ts), distant mountain ridges.
  → public/fire/props.glb  KEEP templates instanced by the engine: Fir, Pine, Fern, Shrub, Grass, Log, Branch, RockA, RockB, Engine (wildland truck).
The prepared control line runs along z = 0 (x -150..150); the unburned fuel bed lies at z < 0, the wildfire approaches from z ≈ -100.
"""
import bpy, math, random
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'public/fire'; OUT.mkdir(parents=True, exist_ok=True)
random.seed(7)
MATS = {}
VCOL = ('leaf', 'needles', 'needles_b', 'fern', 'grass_dry', 'rock')
COL = {
    'forest_floor': (1, 1, 1), 'mountain': (.42, .48, .58), 'mountain_far': (.55, .6, .7), 'bark': (.32, .24, .18), 'bark_pine': (.5, .3, .18), 'needles': (.18, .3, .16),
    'needles_b': (.24, .34, .18), 'leaf': (1, 1, 1), 'fern': (.32, .48, .18), 'grass_dry': (.7, .6, .34), 'rock': (.46, .44, .4), 'deadwood': (.45, .38, .3),
    'truck_red': (.62, .08, .07), 'truck_white': (.9, .9, .88), 'chrome': (.8, .8, .82), 'tyre': (.06, .06, .06), 'glass_win': (.08, .1, .12), 'lightbar': (1, .2, .1),
    'hose': (.75, .7, .2), 'black': (.05, .05, .05), 'stripe': (.95, .75, .1),
}
EMIT = {'lightbar': 1.5}
METAL = {'chrome': 1}
ROUGH = {'glass_win': .08, 'chrome': .15, 'truck_red': .35, 'truck_white': .35}
SMOOTH = {'bark', 'bark_pine', 'leaf', 'rock', 'tyre', 'chrome', 'deadwood', 'needles', 'needles_b'}
def mat(name):
    if name in MATS: return MATS[name]
    m = bpy.data.materials.new(name); m.use_nodes = True; p = m.node_tree.nodes.get('Principled BSDF')
    c = COL.get(name, (.8, .8, .8)); p.inputs['Base Color'].default_value = (*c, 1)
    p.inputs['Roughness'].default_value = ROUGH.get(name, .7); p.inputs['Metallic'].default_value = METAL.get(name, 0)
    if name in EMIT: p.inputs['Emission Color'].default_value = (*c, 1); p.inputs['Emission Strength'].default_value = EMIT[name]
    if name in VCOL:
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


# ================================================================== terrain (keep in sync with src/fire/terrain.ts)
def H(x, z): return 0.07 * max(0.0, -z) + 0.9 * math.sin(0.06 * x) * math.cos(0.045 * z) + 0.35 * math.sin(0.17 * x + 0.11 * z) - 0.012 * max(0.0, z)
def terrain():
    x0, x1, z0, z1, st = -180.0, 180.0, -300.0, 140.0, 2.0
    nx, nz = int((x1 - x0) / st) + 1, int((z1 - z0) / st) + 1
    V = [(x0 + i * st, H(x0 + i * st, z0 + j * st), z0 + j * st) for j in range(nz) for i in range(nx)]
    F = [(j * nx + i, (j + 1) * nx + i, (j + 1) * nx + i + 1, j * nx + i + 1) for j in range(nz - 1) for i in range(nx - 1)]
    K.add('forest_floor', V, F, [[(V[k][0], V[k][2]) for k in f] for f in F])
def mountains():
    for (zc, amp, base, m, seed) in ((-760, 210, 40, 'mountain', 3), (-1100, 330, 60, 'mountain_far', 9)):
        rnd = random.Random(seed); pts = []
        for i in range(161):
            x = -1600 + i * 20; y = base + amp * (.55 + .45 * math.sin(x * .0042 + seed) * math.cos(x * .0017 + seed * .3)) + rnd.uniform(-14, 14)
            pts.append((x, y))
        V = []; F = []
        for i, (x, y) in enumerate(pts): V += [(x, -40, zc + rnd.uniform(-30, 30)), (x, y, zc + rnd.uniform(-20, 20))]
        for i in range(len(pts) - 1): F.append((2 * i, 2 * i + 2, 2 * i + 3, 2 * i + 1))
        K.add(m, V, F)

# ================================================================== vegetation templates (pivot at the base)
def fir(k, h=26.0, seed=1):
    r = random.Random(seed)
    lathe('bark', (0, -.6, 0), [(.42, 0), (.36, 2), (.3, h * .4), (.18, h * .75), (.05, h * .98), (0, h)], 10, k)
    layers = 14
    for i in range(layers):
        y = h * (.28 + .7 * i / layers); rad = (1 - i / layers) ** .85 * 4.6 + .35; n_ = 9 if i < 9 else 6
        for j in range(n_):   # drooping branch "spikes" (jagged silhouette)
            a = 2 * math.pi * (j + r.random() * .6) / n_ + i * .7; L_ = rad * r.uniform(.8, 1.15); dr = r.uniform(.6, 1.1)
            tip = (math.cos(a) * L_, y - dr, math.sin(a) * L_); sa, sb = a - .32, a + .32
            p0 = (0, y + .25, 0); p1 = (math.cos(sa) * L_ * .55, y - .1, math.sin(sa) * L_ * .55); p2 = (math.cos(sb) * L_ * .55, y - .1, math.sin(sb) * L_ * .55)
            g = r.uniform(.8, 1.15); col = (.17 * g, .31 * g, .17 * g)
            k.add('needles', [p0, p1, tip, p2], [(0, 1, 2, 3)], col=col)
            k.add('needles', [p0, (p1[0], p1[1] - .45, p1[2]), (tip[0], tip[1] - .3, tip[2]), (p2[0], p2[1] - .45, p2[2])], [(3, 2, 1, 0)], col=(col[0] * .7, col[1] * .7, col[2] * .7))
    for j in range(5):   # dead lower branches
        a = r.uniform(0, 6.28); y = r.uniform(2.5, h * .26); beam('deadwood', (0, y, 0), (math.cos(a) * 1.6, y - .4, math.sin(a) * 1.6), .07, k=k)
def pine(k, h=24.0, seed=2):
    r = random.Random(seed)
    lathe('bark_pine', (0, -.6, 0), [(.5, 0), (.42, 2), (.36, h * .5), (.22, h * .85), (.08, h)], 10, k)
    for j in range(9):
        a = j * 2.4 + r.random(); y = h * r.uniform(.62, .95); L_ = r.uniform(2.0, 3.6)
        e = (math.cos(a) * L_, y + r.uniform(-.5, .8), math.sin(a) * L_); beam('bark_pine', (0, y - .6, 0), e, .14, k=k)
        g = r.uniform(.85, 1.1)
        blob('needles_b', e, r.uniform(1.4, 2.0), (1, .62, 1), k=k, col=(.23 * g, .34 * g, .17 * g))
    blob('needles_b', (0, h + .3, 0), 1.6, (1, .8, 1), k=k, col=(.22, .33, .16))
def fern(k, seed=3):   # arching fronds: rachis + alternating leaflets
    r = random.Random(seed)
    for j in range(11):
        a = 2 * math.pi * j / 11 + r.uniform(-.2, .2); L_ = r.uniform(.75, 1.15); g = r.uniform(.85, 1.15); col = (.3 * g, .5 * g, .2 * g)
        ca, sa = math.cos(a), math.sin(a)
        def at(t):
            d = L_ * t; y = .05 + math.sin(t * math.pi * .7) * L_ * .62 - t * t * .3
            return (ca * d, y, sa * d)
        N = 12
        for i in range(1, N):
            t = i / N; p = at(t); q = at(t + 1 / N); wl = (.16 * math.sin(t * math.pi) + .02) * r.uniform(.9, 1.1)
            for sd in (-1, 1):
                tip = (p[0] - sa * wl * sd + ca * wl * .6, p[1] - wl * .25, p[2] + ca * wl * sd + sa * wl * .6)
                k.add('fern', [p, q, tip], [(0, 1, 2) if sd > 0 else (0, 2, 1)], col=col)
        beam('fern', at(0), at(.98), .012, k=k)
def shrub(k, seed=4):
    r = random.Random(seed)
    for j in range(6):
        a = r.uniform(0, 6.28); d = r.uniform(.1, .7); beam('deadwood', (0, 0, 0), (math.cos(a) * d, r.uniform(.5, 1.1), math.sin(a) * d), .04, k=k)
    for j in range(7):
        a = r.uniform(0, 6.28); d = r.uniform(0, .7); g = r.uniform(.8, 1.2)
        blob('leaf', (math.cos(a) * d, r.uniform(.6, 1.2), math.sin(a) * d), r.uniform(.38, .6), (1, .8, 1), k=k, col=(.34 * g, .42 * g, .2 * g))
def grass(k, seed=5):
    r = random.Random(seed)
    for j in range(16):
        a = r.uniform(0, 6.28); d = r.uniform(0, .25); hh = r.uniform(.35, .7); lean = r.uniform(.1, .35)
        b0 = (math.cos(a) * d, 0, math.sin(a) * d); tip = (b0[0] + math.cos(a) * lean, hh, b0[2] + math.sin(a) * lean); w = .03
        g = r.uniform(.85, 1.15); k.add('grass_dry', [(b0[0] - w * math.sin(a), 0, b0[2] + w * math.cos(a)), (b0[0] + w * math.sin(a), 0, b0[2] - w * math.cos(a)), tip], [(0, 1, 2)], col=(.72 * g, .6 * g, .33 * g))
def log(k, seed=6):
    beam('bark', (-3.2, .32, 0), (3.2, .3, 0), .55, .55, k=k); beam('deadwood', (-3.25, .32, 0), (-3.2, .32, 0), .5, .5, k=k)
    for (x, a) in ((-1.5, .8), (.6, -1.1), (2.0, .5)): beam('bark', (x, .45, 0), (x + .3, .9, math.sin(a) * .7), .1, k=k)
def branch(k, seed=7):
    r = random.Random(seed); beam('deadwood', (-1.4, .06, 0), (1.4, .08, .2), .09, k=k)
    for j in range(4): x = r.uniform(-1, 1); beam('deadwood', (x, .07, .05), (x + .4, .1, r.uniform(-.6, .6)), .04, k=k)
def rock(k, s_=1.0, seed=8): blob('rock', (0, .3 * s_, 0), .9 * s_, (1.3, .6, 1), k=k, col=(.48, .46, .42), sub=2)
def engine(k):
    W = 1.25
    ab('truck_red', (-W, .7, 1.4), (W, 2.6, 3.6), k=k)                   # cab
    ab('glass_win', (-W + .05, 1.75, 3.55), (W - .05, 2.45, 3.62), k=k); [ab('glass_win', (sd * W - .02, 1.75, 1.8), (sd * W + .02, 2.45, 3.3), k=k) for sd in (-1, 1)]
    ab('truck_red', (-W, .7, 3.6), (W, 1.6, 4.6), k=k); ab('chrome', (-W + .1, .8, 4.58), (W - .1, 1.5, 4.66), k=k)
    ab('lightbar', (-.8, 2.6, 2.6), (.8, 2.78, 2.9), k=k)
    ab('truck_white', (-W, .8, -3.4), (W, 2.3, 1.3), k=k)                # body with compartments
    for z in (-2.9, -1.6, -.3):
        for sd in (-1, 1): ab('chrome', (sd * W - .01, 1.0, z), (sd * W + .01, 2.1, z + 1.1), k=k)
    ab('stripe', (-W - .01, 1.15, -3.4), (W + .01, 1.3, 4.6), k=k)
    cylx('hose', (0, 2.6, -2.2), .45, 1.6, 16, k); ab('truck_white', (-W, 2.3, -3.4), (W, 2.4, -.8), k=k)
    for sd in (-1, 1):
        for z in (-2.4, 3.2): cylx('tyre', (sd * 1.12, .5, z), .5, .36, 18, k); cylx('chrome', (sd * 1.3, .5, z), .22, .04, 10, k)
    ab('black', (-W, .45, -3.4), (W, .8, 4.6), k=k)
def props():
    def P(name, fn):
        k = Kit(); fn(k); KEEPS[name] = (k, (0, 0, 0))
    P('Fir', lambda k: fir(k)); P('Fir2', lambda k: fir(k, 31, 11)); P('Pine', lambda k: pine(k)); P('Pine2', lambda k: pine(k, 28, 12))
    P('Fern', fern); P('Shrub', shrub); P('Grass', grass); P('Log', log); P('Branch', branch); P('RockA', lambda k: rock(k, 1.0, 8)); P('RockB', lambda k: rock(k, 1.8, 9))
    P('Engine', engine)
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
        if m in VCOL:
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
terrain(); mountains()
build_objects(K, 'world')
export('world.glb')
reset(); K = Kit(); KEEPS.clear(); props()
for nm, (k, pv) in KEEPS.items(): build_objects(k, nm, pv, keep=True)
export('props.glb')
print('ALL ASSETS DONE')
