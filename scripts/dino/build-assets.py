"""FrameForge — "What if you were raised by dinosaurs?" Original Late-Cretaceous world + rigged creatures (all procedural, no scans, no third-party assets).
Run: blender -b --factory-startup -P scripts/dino/build-assets.py
  → public/dino/world.glb   forest plateau, stream, waterfall, escarpment, valley, river, overlook outcrop, hero log, hero tree, footprints
  → public/dino/props.glb   instanced vegetation (conifers, broadleaf, tree ferns, cycads, ferns, horsetails, moss rocks, flowers, far LODs) + asteroid
  → public/dino/dinos.glb   skinned creatures: feathered raptor (the "mother"), tyrannosaur, sauropod, pterosaur, small bird — bones posed procedurally in Three
  → public/dino/veg.json, height.json (2.5 m terrain grid for placing actors)
Three.js metres: y up; creatures face +z. Forest plateau y≈0; cliff edge z≈zc(x)≈82; valley floor y≈-58; impact far beyond z=+600.
"""
import bpy, bmesh, math, random, json
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'public/dino'; OUT.mkdir(parents=True, exist_ok=True)
random.seed(66)
MATS = {}
def mat(name, c, metal=0.0, rough=0.6, emit=None, strength=0.0):
    if name in MATS: return MATS[name]
    m = bpy.data.materials.new(name); m.use_nodes = True; p = m.node_tree.nodes.get('Principled BSDF')
    p.inputs['Base Color'].default_value = (*c, 1); p.inputs['Roughness'].default_value = rough; p.inputs['Metallic'].default_value = metal
    if emit: p.inputs['Emission Color'].default_value = (*emit, 1); p.inputs['Emission Strength'].default_value = strength
    MATS[name] = m; return m
def L(x, y, z): return (x, -z, y)
def reset():
    bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
    for block in (bpy.data.meshes, bpy.data.curves):
        for d in list(block):
            if d.users == 0: block.remove(d)
def finish(o, m, bevel=0.0, seg=2):
    if m is not None: o.data.materials.clear(); o.data.materials.append(m)
    if bevel:
        b = o.modifiers.new('bevel', 'BEVEL'); b.width = bevel; b.segments = seg; b.limit_method = 'ANGLE'
    return o
def box(name, p, s, m, bevel=0.01, rot=(0, 0, 0), seg=2):
    me = bpy.data.meshes.new(name); bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts: v.co.x *= s[0]; v.co.y *= s[2]; v.co.z *= s[1]
    bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new(name, me); bpy.context.collection.objects.link(o); o.location = L(*p); o.rotation_euler = (rot[0], -rot[2], rot[1])
    return finish(o, m, bevel, seg)
def span(name, a, b, m, bevel=0.01):
    """Axis-aligned box from corner a to corner b (Three coords)."""
    p = tuple((a[i] + b[i]) / 2 for i in range(3)); s = tuple(abs(b[i] - a[i]) for i in range(3))
    return box(name, p, s, m, bevel)
def cyl(name, p, r, h, m, axis='y', verts=20, bevel=0.0, r2=None):
    if r2 is None: bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=r, depth=h, location=L(*p))
    else: bpy.ops.mesh.primitive_cone_add(vertices=verts, radius1=r, radius2=r2, depth=h, location=L(*p))
    o = bpy.context.object; o.name = name
    if axis == 'x': o.rotation_euler = (0, math.pi / 2, 0)
    elif axis == 'z': o.rotation_euler = (math.pi / 2, 0, 0)
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=False)
    if verts >= 12:
        for f in o.data.polygons:
            if abs(f.normal.z if axis == 'y' else (f.normal.x if axis == 'x' else f.normal.y)) < .5: f.use_smooth = True
    return finish(o, m, bevel)
def sphere(name, p, r, m, sc=(1, 1, 1), segs=16):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segs, ring_count=max(6, segs // 2), radius=r, location=L(*p))
    o = bpy.context.object; o.name = name; o.scale = (sc[0], sc[2], sc[1]); bpy.ops.object.transform_apply(scale=True); bpy.ops.object.shade_smooth(); return finish(o, m)
def ico(name, p, r, m, sc=(1, 1, 1), sub=1):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=sub, radius=r, location=L(*p))
    o = bpy.context.object; o.name = name; o.scale = (sc[0], sc[2], sc[1]); bpy.ops.object.transform_apply(scale=True, location=False, rotation=False)
    for v in o.data.vertices: v.co *= 1 + random.uniform(-.12, .12)
    return finish(o, m)
def _ico_old(name, p, r, m, sc=(1, 1, 1), sub=1):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=sub, radius=r, location=L(*p))
    o = bpy.context.object; o.name = name; o.scale = (sc[0], sc[2], sc[1]); bpy.ops.object.transform_apply(scale=True)
    for v in o.data.vertices: v.co *= 1 + random.uniform(-.12, .12)
    return finish(o, m)
def torus(name, p, R, r, m, axis='y', segs=32, minor=10):
    bpy.ops.mesh.primitive_torus_add(major_radius=R, minor_radius=r, major_segments=segs, minor_segments=minor, location=L(*p))
    o = bpy.context.object; o.name = name
    if axis == 'x': o.rotation_euler = (0, math.pi / 2, 0)
    elif axis == 'z': o.rotation_euler = (math.pi / 2, 0, 0)
    bpy.ops.object.transform_apply(rotation=True); bpy.ops.object.shade_smooth(); return finish(o, m)
def tube(name, pts, r, m, res=2):
    c = bpy.data.curves.new(name, 'CURVE'); c.dimensions = '3D'; c.bevel_depth = r; c.bevel_resolution = res; c.use_fill_caps = True
    s = c.splines.new('POLY'); s.points.add(len(pts) - 1)
    for q, pt in zip(s.points, pts): q.co = (*L(*pt), 1)
    o = bpy.data.objects.new(name, c); bpy.context.collection.objects.link(o); c.materials.append(m); return o
def catenary(a, b, sag, n=14):
    return [(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t - sag * 4 * t * (1 - t), a[2] + (b[2] - a[2]) * t) for t in [i / n for i in range(n + 1)]]
def mesh(name, verts, faces, m, smooth=False):
    d = bpy.data.meshes.new(name); d.from_pydata([L(*v) for v in verts], [], faces); d.update()
    o = bpy.data.objects.new(name, d); bpy.context.collection.objects.link(o)
    if smooth:
        for f in d.polygons: f.use_smooth = True
    return finish(o, m)
def boolean(target, cutter, op='DIFFERENCE'):
    md = target.modifiers.new('bool', 'BOOLEAN'); md.operation = op; md.object = cutter; md.solver = 'EXACT'
    bpy.ops.object.select_all(action='DESELECT'); target.select_set(True); bpy.context.view_layer.objects.active = target
    bpy.ops.object.modifier_apply(modifier=md.name); bpy.data.objects.remove(cutter, do_unlink=True); return target
def apply_mods(o):
    bpy.ops.object.select_all(action='DESELECT'); o.select_set(True); bpy.context.view_layer.objects.active = o
    for md in list(o.modifiers): bpy.ops.object.modifier_apply(modifier=md.name)
def bulk_convert(objs):
    """Convert curves/fonts and apply all modifiers of many objects in ONE operator call."""
    objs = [o for o in objs if o.type in ('CURVE', 'FONT') or (o.type == 'MESH' and len(o.modifiers))]
    if not objs: return
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs: o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]; bpy.ops.object.convert(target='MESH')
def join(name, objs):
    names = [o.name for o in objs if o is not None]
    bulk_convert([bpy.data.objects[n] for n in names])
    objs = [bpy.data.objects[n] for n in names]
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs: o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    if len(objs) > 1: bpy.ops.object.join()
    o = bpy.context.view_layer.objects.active; o.name = name; return o
def keep(name, objs, pivot):
    """Join objs into one separately animatable object whose origin is pivot (Three coords)."""
    o = join('KEEP ' + name, objs)
    bpy.context.scene.cursor.location = L(*pivot); bpy.ops.object.origin_set(type='ORIGIN_CURSOR'); return o
def world_uv(o):
    me = o.data; bm = bmesh.new(); bm.from_mesh(me); uv = bm.loops.layers.uv.verify(); mw = o.matrix_world; r = mw.to_3x3()
    for f in bm.faces:
        n = r @ f.normal; ax = max(range(3), key=lambda i: abs(n[i]))
        for lp in f.loops:
            co = mw @ lp.vert.co
            if ax == 0: u, v = (co.y if n[0] > 0 else -co.y), co.z
            elif ax == 1: u, v = (co.x if n[1] < 0 else -co.x), co.z
            else: u, v = co.x, co.y
            lp[uv].uv = (u, v)
    bm.to_mesh(me); bm.free()

from mathutils import Vector, Matrix, Quaternion
def sm(x): x = min(1.0, max(0.0, x)); return x * x * (3 - 2 * x)
def vcol_mat(name, rough=.8, metal=0.0, alpha=False):
    """material whose base colour is the 'Col' colour attribute (exported as COLOR_0)"""
    if name in MATS: return MATS[name]
    m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree; p = nt.nodes.get('Principled BSDF')
    vc = nt.nodes.new('ShaderNodeVertexColor'); vc.layer_name = 'Col'; nt.links.new(vc.outputs['Color'], p.inputs['Base Color'])
    p.inputs['Roughness'].default_value = rough; p.inputs['Metallic'].default_value = metal
    MATS[name] = m; return m
def set_cols(o, fn):
    """per-vertex colour from fn(three_xyz, index) -> (r,g,b)"""
    me = o.data; a = me.color_attributes.get('Col') or me.color_attributes.new('Col', 'FLOAT_COLOR', 'POINT')
    mw = o.matrix_world
    for i, v in enumerate(me.vertices):
        w = mw @ v.co; c = fn((w.x, w.z, -w.y), i); a.data[i].color = (*c, 1)
def plain_cols(o, c): set_cols(o, lambda p, i: c)

# ================================================================== terrain (heights exported to height.json, same grid)
def zc(x): return 82 + 10 * math.sin(x / 47) + 5 * math.sin(x / 19 + 1)
def xs(z): return -52 + 14 * math.sin(z / 38)                     # plateau stream centre line
def xr(z): return 20 * math.sin((z - 90) / 95) + 7 * math.sin(z / 31)   # valley river centre line
def plateau(x, z):
    return 1.4 * math.sin(x / 23) * math.cos(z / 31) + .7 * math.sin(x / 9.3 + z / 13.1) + .35 * math.sin(x / 4.1 - z / 5.3) + min(3.0, max(0.0, .015 * (zc(x) - z)))
def valley(x, z):
    h = -58 + 2.5 * math.sin(x / 40) * math.cos(z / 53) + 1.2 * math.sin(x / 13 + z / 17)
    h += 48 * sm((z - 380) / 170) * (.6 + .4 * math.sin(x / 70)) + 34 * sm((abs(x) - 190) / 90)
    d = abs(x - xr(z)); h -= 2.5 * (1 - sm(d / 12))
    return h
def H(x, z):
    c = zc(x); t = sm((z - c) / 9)
    p = plateau(x, z); d = abs(x - xs(z)); p -= 1.6 * (1 - sm(d / 4.5)) * (1 - sm((z - c + 3) / 3))
    return p * (1 - t) + valley(x, z) * t
X0, X1, Z0, Z1, STEP = -300, 300, -260, 640, 2.5
NX, NZ = int((X1 - X0) / STEP) + 1, int((Z1 - Z0) / STEP) + 1

def terrain():
    verts, faces = [], []
    for j in range(NZ):
        for i in range(NX): x, z = X0 + i * STEP, Z0 + j * STEP; verts.append((x, H(x, z), z))
    for j in range(NZ - 1):
        for i in range(NX - 1): a = j * NX + i; faces.append((a, a + 1, a + NX + 1, a + NX))
    o = mesh('terrain', verts, faces, mat('terrain', (.3, .4, .2), 0, .95), smooth=True)
    hs = [[round(verts[j * NX + i][1], 2) for i in range(NX)] for j in range(NZ)]
    (OUT / 'height.json').write_text(json.dumps({'x0': X0, 'z0': Z0, 'step': STEP, 'nx': NX, 'nz': NZ, 'h': hs}, separators=(',', ':')))
    return o

def strip(name, cl, z0, z1, width, yfn, m, n=160):
    """water ribbon following centre line x=cl(z)"""
    verts, faces = [], []
    for k in range(n + 1):
        z = z0 + (z1 - z0) * k / n; x = cl(z); y = yfn(x, z)
        dz = (z1 - z0) / n; tx = cl(z + dz * .5) - cl(z - dz * .5); l = math.hypot(tx, dz); nx, nz = dz / l, -tx / l
        verts += [(x - nx * width / 2, y, z - nz * width / 2), (x + nx * width / 2, y, z + nz * width / 2)]
        if k: a = 2 * k; faces.append((a - 2, a - 1, a + 1, a))
    return mesh(name, verts, faces, m)

def waterfall_x():
    x = -50.0
    for _ in range(30): x = xs(zc(x))
    return x
XW = waterfall_x(); ZW = zc(XW)

def world():
    terrain()
    water = mat('river_water', (.2, .35, .3), .1, .05); fall = mat('waterfall', (.85, .9, .9), 0, .3)
    strip('stream', xs, -255, ZW - .5, 8.5, lambda x, z: H(x, z) + 1.15, water)
    strip('river', xr, zc(0) + 14, 630, 26, lambda x, z: valley(x, z) + 1.55, water)
    # waterfall: a curtain hugging the escarpment, slightly proud of the rock, plus a plunge pool
    verts, faces = [], []
    n = 40
    for k in range(n + 1):
        s = k / n; z = ZW - .5 + 12 * s; y = max(H(XW, z), valley(XW, z) + 1.6) + 1.2 + 1.5 * math.sin(math.pi * s)
        for side in (-1, 1): verts.append((XW + side * (3.4 + 1.6 * s), y, z + 1.0 + 1.5 * s))
        if k: a = 2 * k; faces.append((a - 2, a - 1, a + 1, a))
    mesh('waterfall', verts, faces, fall)
    # escarpment boulders + strata so the cliff reads as rock even from far away
    rock = vcol_mat('mossrock', .9)
    rocks = []
    for i in range(170):
        x = random.uniform(-290, 290); c = zc(x); z = c + random.uniform(-1, 9); y = H(x, z)
        r = random.uniform(2.5, 7.5); o = ico(f'cliff{i}', (x, y + r * .2, z), r, rock, (1.3, random.uniform(.7, 1.6), 1), sub=2); rocks.append(o)
    for i in range(60):   # valley floor rocks
        x = random.uniform(-180, 180); z = random.uniform(110, 420); r = random.uniform(1, 3.5); rocks.append(ico(f'vr{i}', (x, valley(x, z), z), r, rock, (1.2, .7, 1), sub=1))
    # overlook outcrop (final shots): flat-topped slab jutting over the valley
    OX = 14; oc = zc(OX)
    slab = ico('outcrop', (OX, -1.4, oc + .5), 1, rock, (5.2, 2.7, 7.2), sub=3)
    for v in slab.data.vertices:
        if v.co.z > .9: v.co.z = 2.65 + random.uniform(-.04, .04)   # flatten top at y≈1.25 (Blender z = Three y)
    rocks.append(slab)
    for i in range(8): rocks.append(ico(f'oc{i}', (OX + random.uniform(-6, 6), random.uniform(-3, 0), oc + random.uniform(-6, 3)), random.uniform(1.2, 2.4), rock, (1.2, .8, 1), sub=2))
    for o in rocks:
        set_cols(o, lambda p, i: (.2 + random.uniform(0, .04), .3 + random.uniform(0, .06), .12) if (o.data.vertices[i].normal.z > .55 and random.random() < .8) else ((.36, .33, .29) if random.random() < .6 else (.44, .4, .35)))
    # hero log (training run + hiding place): huge fallen conifer, moss on top, broken root plate
    LOG = [(-42, -58), (-22, -50)]
    bark = vcol_mat('bark', .95)
    (ax, az), (bx, bz) = LOG; pts = []
    for k in range(13):
        s = k / 12; x = ax + (bx - ax) * s; z = az + (bz - az) * s; pts.append((x, max(H(x, z), H(x + 1, z), H(x, z + 1)) + .95 - .15 * s, z))
    logo = tube('hero_log', pts, 1.0, bark, res=4)
    bulk_convert([logo]); logo = bpy.data.objects['hero_log']
    set_cols(logo, lambda p, i: (.22, .36, .12) if p[1] > H(p[0], p[2]) + 1.55 + random.uniform(-.25, .1) else ((.3, .22, .15) if random.random() < .7 else (.22, .16, .1)))
    plate = ico('root_plate', (ax - .6, H(ax, az) + 1.6, az - .3), 2.4, bark, (.5, 1.1, 1.2), sub=2); set_cols(plate, lambda p, i: (.28, .2, .13) if random.random() < .6 else (.35, .3, .22))
    roots = [tube(f'root{k}', [(ax - .8, H(ax, az) + 1.6 + random.uniform(-1, 1), az + random.uniform(-1, 1)), (ax - 2 - random.uniform(0, 1.5), H(ax, az) + random.uniform(-.5, 2.5), az + random.uniform(-2.5, 2.5))], .16, bark, 1) for k in range(9)]
    bulk_convert(roots)
    for k in range(9): set_cols(bpy.data.objects[f'root{k}'], lambda p, i: (.3, .22, .15))
    # hero tree at the clearing edge: giant trunk with buttress roots
    TX, TZ = 7.5, -37; ty = H(TX, TZ)
    trunk = cyl('hero_trunk', (TX, ty + 15, TZ), 1.7, 30, bark, verts=24, r2=1.0)
    for v in trunk.data.vertices: v.co.x *= 1 + .05 * math.sin(v.co.z * 1.3 + v.co.y); v.co.y *= 1 + .05 * math.cos(v.co.z * .9 + v.co.x)
    bt = []
    for k in range(7):
        a = k / 7 * 6.283 + .3; bt.append(tube(f'butt{k}', [(TX + math.cos(a) * .8, ty + 2.6, TZ + math.sin(a) * .8), (TX + math.cos(a) * 2.6, ty + .6, TZ + math.sin(a) * 2.6), (TX + math.cos(a) * 4.2, ty - .2, TZ + math.sin(a) * 4.2)], .45, bark, 2))
    bulk_convert(bt)
    for o in [trunk] + [bpy.data.objects[f'butt{k}'] for k in range(7)]:
        set_cols(o, lambda p, i: (.22, .34, .12) if (p[1] < ty + 1.2 and random.random() < .7) else ((.32, .24, .17) if random.random() < .6 else (.25, .19, .13)))
    # forest-floor debris around the clearing: dead branches + small logs
    for k in range(26):
        x, z = random.uniform(-14, 14), random.uniform(-44, -18)
        if math.hypot(x, z + 30) < 3.5: continue
        a = random.uniform(0, 6.28); l = random.uniform(1.2, 3.5); y = H(x, z) + .08
        b = tube(f'br{k}', [(x, y, z), (x + math.cos(a) * l * .5, y + .05, z + math.sin(a) * l * .5), (x + math.cos(a + .3) * l, y, z + math.sin(a + .3) * l)], random.uniform(.04, .12), bark, 1)
    bulk_convert([o for o in bpy.context.scene.objects if o.name.startswith('br')])
    for o in [o for o in bpy.context.scene.objects if o.name.startswith('br')]: set_cols(o, lambda p, i: (.3, .23, .16))
    # theropod footprints pressed into the stream-bank mud (the "follow footprints" lesson)
    pm = mat('mud_print', (.12, .09, .06), 0, .35)
    for k in range(24):
        z = -98 + k * 1.45; x = xs(z) + 6.2 + (.36 if k % 2 else -.36); y = H(x, z) + .03; a = math.atan2(xs(z + 1) - xs(z - 1), 2)
        ca, sa = math.cos(a), math.sin(a)
        def R(px, pz): return (x + px * ca + pz * sa, y, z - px * sa + pz * ca)
        vs = [R(0, -.08), R(-.07, 0), R(-.34, .38), R(-.27, .43), R(-.03, .12), R(0, .55), R(.06, .55), R(.03, .12), R(.27, .43), R(.34, .38), R(.07, 0)]
        mesh(f'print{k}', vs, [tuple(range(len(vs)))], pm)

# ================================================================== vegetation props (instanced in Three)
def frond(name, length, arch, pairs, width, m, droop=.25, col=None):
    """fern-type frond along local +z: arched rachis strip + paired leaflets (each a tapered quad)"""
    verts, faces, cols = [], [], []
    def P(s): return (0, length * arch * (.95 * s - .9 * s * s), length * s)
    def addq(a, b, c, d, cc):
        n = len(verts); verts.extend([a, b, c, d]); faces.append((n, n + 1, n + 2, n + 3)); cols.extend([cc] * 4)
    base = col or (.22, .45, .14); tip = (min(1, base[0] * 1.6), min(1, base[1] * 1.35), base[2] * 1.2)
    for k in range(pairs):
        s0, s1 = (k + .2) / pairs, (k + .8) / pairs; p0, p1 = P(s0), P(s1)
        addq((-width * .15, p0[1], p0[2]), (width * .15, p0[1], p0[2]), (width * .15, p1[1], p1[2]), (-width * .15, p1[1], p1[2]), base)
        ll = length * .2 * (1 - s0) ** .55 * min(1, s0 * 6 + .3); dz = ll * .45; dy = -ll * droop
        cc = tuple(base[i] + (tip[i] - base[i]) * s0 for i in range(3))
        for sd in (-1, 1):
            r0 = (sd * width * .1, p0[1], p0[2]); r1 = (sd * width * .1, p1[1], p1[2] + (p1[2] - p0[2]) * .4)
            tipv = (sd * ll, p0[1] + dy, p0[2] + dz)
            addq(r0, (sd * ll * .55, p0[1] + dy * .55 + ll * .05, p0[2] + dz * .5 - ll * .07), tipv, r1, cc)
    o = mesh(name, verts, faces, m)
    a = o.data.color_attributes.new('Col', 'FLOAT_COLOR', 'POINT')
    for i, c in enumerate(cols): a.data[i].color = (*c, 1)
    return o
def rot_copy(o, yaw, pitch, at, name):
    c = o.copy(); c.data = o.data.copy(); bpy.context.collection.objects.link(c); c.name = name
    c.rotation_euler = (0, 0, 0)
    M = Matrix.Translation(Vector(L(*at))) @ Matrix.Rotation(yaw, 4, 'Z') @ Matrix.Rotation(pitch, 4, 'X')
    c.data.transform(M); c.matrix_world = Matrix.Identity(4); return c
def fern(name, n=9, length=1.3, pairs=13, col=(.2, .44, .13)):
    leaf = vcol_mat('fern_leaf', .65); src = frond(name + '_src', length, .85, pairs, .05, leaf, col=col); parts = []
    for k in range(n):
        yaw = k / n * 6.283 + random.uniform(-.2, .2); parts.append(rot_copy(src, yaw, -random.uniform(.15, .55), (0, .05, 0), f'{name}_{k}'))
    bpy.data.objects.remove(src, do_unlink=True); return parts
def props():
    bark = vcol_mat('bark', .95); needles = mat('needles', (.12, .26, .12), 0, .8); leaves = mat('leaves', (.17, .35, .12), 0, .75); rock = vcol_mat('mossrock', .9)
    # --- araucarian conifer: tall bare trunk, whorled up-curving bottlebrush branches, umbrella crown
    tr = cyl('c_trunk', (0, 15, 0), .55, 30, bark, verts=10, r2=.14); plain_cols(tr, (.33, .25, .18)); parts = [tr]
    for w in range(7):
        y = 15 + w * 2.3; nb = 5 if w < 6 else 4; ln = 6.2 - w * .6
        for b in range(nb):
            a = b / nb * 6.283 + w * .7; ca, sa = math.cos(a), math.sin(a)
            p0 = (ca * .3, y, sa * .3); p1 = (ca * ln * .55, y + .3, sa * ln * .55); p2 = (ca * ln, y + 1.6, sa * ln)
            parts.append(tube(f'c_b{w}_{b}', [p0, p1, p2], .42, needles, 1))
    parts.append(sphere('c_top', (0, 31, 0), 1.6, needles, (1, .7, 1), 8))
    keep('Conifer', parts, (0, 0, 0))
    tr = cyl('cf_trunk', (0, 14, 0), .5, 28, bark, verts=6, r2=.15); plain_cols(tr, (.33, .25, .18))
    keep('ConiferFar', [tr, cyl('cf_c1', (0, 22, 0), 5, 4, needles, verts=7, r2=3.0), cyl('cf_c2', (0, 26, 0), 4, 4, needles, verts=7, r2=1.6), cyl('cf_c3', (0, 29.5, 0), 2.2, 3, needles, verts=6, r2=.2)], (0, 0, 0))
    # --- broadleaf (magnolia-like early flowering tree): forked trunk, clumped crown
    tr = cyl('b_trunk', (0, 4, 0), .55, 8, bark, verts=10, r2=.35); parts = [tr]
    br = [tube(f'b_br{k}', [(0, 7.5, 0), (math.cos(k * 2.1) * 2.5, 11, math.sin(k * 2.1) * 2.5), (math.cos(k * 2.1) * 4, 13.5, math.sin(k * 2.1) * 4)], .25, bark, 1) for k in range(3)]
    bulk_convert(br); parts += [bpy.data.objects[f'b_br{k}'] for k in range(3)]
    for o in parts: plain_cols(o, (.36, .3, .24))
    for k in range(11):
        a = random.uniform(0, 6.28); r = random.uniform(1, 4.5); parts.append(ico(f'b_l{k}', (math.cos(a) * r, random.uniform(12, 16.5), math.sin(a) * r), random.uniform(2.2, 3.2), leaves, (1, .75, 1), sub=2))
    keep('Broadleaf', parts, (0, 0, 0))
    tr = cyl('bf_trunk', (0, 5, 0), .5, 10, bark, verts=6, r2=.3); plain_cols(tr, (.36, .3, .24))
    keep('BroadleafFar', [tr] + [ico(f'bf_l{k}', (math.cos(k * 2.1) * 2.5, 13.5 + k * .4, math.sin(k * 2.1) * 2.5), 3.4, leaves, (1, .75, 1), sub=1) for k in range(3)], (0, 0, 0))
    # --- tree fern
    tr = cyl('tf_trunk', (0, 2.6, 0), .28, 5.2, bark, verts=8, r2=.22); set_cols(tr, lambda p, i: (.25, .18, .12) if random.random() < .5 else (.36, .26, .16))
    leaf = vcol_mat('fern_leaf', .65); src = frond('tf_src', 3.0, .55, 15, .09, leaf, droop=.18, col=(.24, .47, .15)); parts = [tr]
    for k in range(12): parts.append(rot_copy(src, k / 12 * 6.283 + random.uniform(-.15, .15), -random.uniform(.1, .5) + .25, (0, 5.2, 0), f'tf_{k}'))
    bpy.data.objects.remove(src, do_unlink=True); keep('TreeFern', parts, (0, 0, 0))
    # --- cycad: stout scaly trunk + crown of stiff fronds
    tr = cyl('cy_trunk', (0, .8, 0), .45, 1.6, bark, verts=12, r2=.38); set_cols(tr, lambda p, i: (.42, .33, .2) if (i // 2) % 2 else (.3, .23, .15))
    src = frond('cy_src', 1.7, .7, 18, .06, leaf, droop=.05, col=(.18, .38, .1)); parts = [tr]
    for k in range(16): parts.append(rot_copy(src, k / 16 * 6.283, -random.uniform(.0, .45) + .35, (0, 1.6, 0), f'cy_{k}'))
    bpy.data.objects.remove(src, do_unlink=True); keep('Cycad', parts, (0, 0, 0))
    # --- ground ferns (two sizes / tints)
    keep('Fern', fern('fe', 9, 1.25, 13), (0, 0, 0))
    keep('FernBig', fern('fb', 11, 2.1, 14, (.17, .4, .12)), (0, 0, 0))
    # --- horsetail clump
    stem = mat('horsetail', (.32, .45, .2), 0, .6); parts = []
    for k in range(7):
        a = k * 2.4; r = .12 + k * .03; h = random.uniform(1.1, 1.9)
        parts.append(cyl(f'hs{k}', (math.cos(a) * r, h / 2, math.sin(a) * r), .025, h, stem, verts=6))
        for j in range(1, 5): parts.append(cyl(f'hsr{k}_{j}', (math.cos(a) * r, h * j / 5, math.sin(a) * r), .045, .02, mat('horsetail_ring', (.15, .14, .1), 0, .7), verts=6))
    keep('Horsetail', parts, (0, 0, 0))
    # --- moss rock, flowers
    r = ico('mr', (0, .3, 0), 1, rock, (1.3, .75, 1), sub=2)
    set_cols(r, lambda p, i: (.2, .33, .12) if r.data.vertices[i].normal.z > .35 else ((.38, .35, .3) if random.random() < .6 else (.46, .42, .36)))
    keep('MossRock', [r], (0, 0, 0))
    petal = mat('petal', (.95, .93, .86), 0, .5); parts = [cyl('fl_stem', (0, .25, 0), .012, .5, mat('stem', (.25, .4, .15), 0, .6), verts=5)]
    for k in range(6):
        a = k / 6 * 6.283; parts.append(sphere(f'fl_p{k}', (math.cos(a) * .06, .52, math.sin(a) * .06), .06, petal, (1, .25, .55), 8))
    parts.append(sphere('fl_c', (0, .53, 0), .03, mat('pollen', (.95, .75, .2), 0, .6), (1, 1, 1), 8))
    keep('Flower', parts, (0, 0, 0))
    # --- asteroid: cratered rock
    a = ico('ast', (0, 0, 0), 1, mat('asteroid', (.3, .27, .24), 0, .95), (1, .85, 1.1), sub=4)
    for v in a.data.vertices:
        d = v.co.normalized(); v.co = d * (1 + .12 * math.sin(d.x * 7) * math.cos(d.y * 5) + .06 * math.sin(d.z * 13 + d.x * 4) - .1 * max(0, math.sin(d.x * 3 + d.y * 4) - .7) * 3)
    keep('Asteroid', [a], (0, 0, 0))

def veg_json():
    out = {k: [] for k in ('Conifer', 'ConiferFar', 'Broadleaf', 'BroadleafFar', 'TreeFern', 'Cycad', 'Fern', 'FernBig', 'Horsetail', 'MossRock', 'Flower')}
    def free(x, z, r):   # keep corridors open (clearing, log, stream, footprint trail, overlook)
        if math.hypot(x, z + 30) < r + 4.5: return False
        if abs(x - xs(z)) < 5 + r * .4 and z < ZW: return False
        if -100 < z < -60 and abs(x - xs(z) - 6) < 3 + r: return False
        if math.hypot(x + 32, z + 54) < 11 + r: return False
        if abs(x - 14) < 10 + r and z > zc(14) - 14: return False
        if math.hypot(x - 7.5, z + 37) < 3.5 + r: return False
        return z < zc(x) - 3 - r
    def put(k, n, zone, rad, sc, tries=60000):
        c = 0
        for _ in range(tries):
            if c >= n: break
            x, z = zone()
            if not free(x, z, rad): continue
            out[k].append([round(x, 2), round(H(x, z), 2), round(z, 2), round(random.uniform(*sc), 2), round(random.uniform(0, 6.28), 2)]); c += 1
    U = random.uniform
    put('Conifer', 230, lambda: (U(-290, 290), U(-255, 80)), 3, (.75, 1.15))
    put('Broadleaf', 200, lambda: (U(-290, 290), U(-255, 80)), 3.5, (.8, 1.2))
    put('TreeFern', 240, lambda: (U(-140, 140), U(-180, 75)), 1.5, (.7, 1.25))
    put('TreeFern', 60, lambda: (xs(z := U(-200, 70)) + U(-14, 14), z), 1.5, (.8, 1.2))
    put('Cycad', 170, lambda: (U(-140, 140), U(-180, 78)), 1.2, (.7, 1.3))
    put('Fern', 1150, lambda: (U(-70, 70), U(-110, 80)), .5, (.7, 1.3))
    put('Fern', 260, lambda: (U(-16, 16) , U(-46, -14)), .2, (.7, 1.2))
    put('FernBig', 420, lambda: (U(-90, 90), U(-130, 80)), .8, (.7, 1.2))
    put('Horsetail', 260, lambda: (xs(z := U(-150, 70)) + U(-9, 9), z), .2, (.7, 1.2))
    put('MossRock', 150, lambda: (U(-120, 120), U(-150, 78)), .8, (.4, 1.6))
    put('Flower', 70, lambda: (U(-9, 9), U(-40, -20)), .1, (.8, 1.3))
    # valley floor: far LODs only (seen from the overlook)
    for k, n in (('ConiferFar', 420), ('BroadleafFar', 520)):
        c = 0
        while c < n:
            x, z = U(-260, 260), U(110, 560)
            if abs(x - xr(z)) < 16 or valley(x, z) > -25 or z < zc(x) + 14: continue
            out[k].append([round(x, 2), round(valley(x, z), 2), round(z, 2), round(U(.7, 1.2), 2), round(U(0, 6.28), 2)]); c += 1
    (OUT / 'veg.json').write_text(json.dumps(out, separators=(',', ':')))

# ================================================================== creatures: lofted bodies + feather cards, skinned to procedurally posed armatures
def V(*a): return Vector(a)
def catmull(pts, vals, sub=4):
    """resample a polyline (and per-point value tuples) with Catmull-Rom"""
    P = [V(*p) for p in pts]; out_p, out_v = [], []
    for i in range(len(P) - 1):
        p0, p1, p2, p3 = P[max(0, i - 1)], P[i], P[i + 1], P[min(len(P) - 1, i + 2)]
        for k in range(sub):
            t = k / sub; t2, t3 = t * t, t * t * t
            out_p.append(.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3))
            out_v.append(tuple(vals[i][j] + (vals[i + 1][j] - vals[i][j]) * (t * t * (3 - 2 * t)) for j in range(len(vals[i]))))
    out_p.append(P[-1]); out_v.append(vals[-1]); return out_p, out_v
def frames(P):
    T = []
    for i in range(len(P)):
        d = P[min(len(P) - 1, i + 1)] - P[max(0, i - 1)]; T.append(d.normalized())
    out = []
    for t in T:
        up = V(0, 1, 0) if abs(t.y) < .9 else V(0, 0, 1)
        s = up.cross(t).normalized(); u = t.cross(s).normalized(); out.append((t, s, u))
    return out
class Piece:
    """a lofted, closed tube in Three coordinates with per-vertex colour and the bones it may follow"""
    def __init__(self, name, pts, prof, bones, col, ring=14, sub=4, m=None):
        prof = [tuple(v) + (0,) * (3 - len(v)) for v in prof]
        P, Vv = catmull(pts, prof, sub); F = frames(P); verts, faces = [], []
        self.rings = []
        for i, (p, v) in enumerate(zip(P, Vv)):
            rx, ry, dy = v[0], v[1], (v[2] if len(v) > 2 else 0); t, s, u = F[i]; c = p + u * dy; ring_i = []
            for k in range(ring):
                a = k / ring * 6.283185; q = c + s * math.cos(a) * rx + u * math.sin(a) * ry
                ring_i.append(len(verts)); verts.append(q)
            self.rings.append((c, t, s, u, rx, ry, ring_i))
        for i in range(len(P) - 1):
            for k in range(ring): a = i * ring + k; b = i * ring + (k + 1) % ring; faces.append((a, b, b + ring, a + ring))
        tip0 = len(verts); verts.append(P[0] - F[0][0] * min(Vv[0][0], Vv[0][1]) * .6)
        tip1 = len(verts); verts.append(P[-1] + F[-1][0] * min(Vv[-1][0], Vv[-1][1]) * .6)
        for k in range(ring): faces.append((tip0, (k + 1) % ring, k)); faces.append((tip1, (len(P) - 1) * ring + k, (len(P) - 1) * ring + (k + 1) % ring))
        self.o = mesh(name, [tuple(v) for v in verts], faces, m, smooth=True); self.bones = bones
        bm = bmesh.new(); bm.from_mesh(self.o.data); bmesh.ops.recalc_face_normals(bm, faces=bm.faces); bm.to_mesh(self.o.data); bm.free()
        self.verts = verts
        set_cols(self.o, lambda p, i: col(V(*p), i))
def bone_dist(p, h, t):
    ab = t - h; k = max(0.0, min(1.0, (p - h).dot(ab) / max(ab.length_squared, 1e-9))); return (p - (h + ab * k)).length
def weights_for(p, bones, B):
    ds = sorted(((bone_dist(p, B[b][0], B[b][1]), b) for b in bones))[:2]
    if len(ds) == 1: return [(ds[0][1], 1.0)]
    w0, w1 = 1 / (ds[0][0] ** 4 + 1e-5), 1 / (ds[1][0] ** 4 + 1e-5); s = w0 + w1
    return [(ds[0][1], w0 / s), (ds[1][1], w1 / s)]
def skin(o, B, bones=None, roots=None):
    """vertex groups from nearest bones; roots[i] = Three point whose weights vertex i copies (rigid cards)"""
    bpy.context.view_layer.update(); groups = {}
    mw = o.matrix_world
    cache = {}
    for i, v in enumerate(o.data.vertices):
        if roots is not None: key = roots[i]; p = V(*key[0]); bl = key[1]
        else: w = mw @ v.co; p = V(w.x, w.z, -w.y); bl = bones; key = None
        ws = cache.get(id(key)) if key is not None else None
        if ws is None:
            ws = weights_for(p, bl, B)
            if key is not None: cache[id(key)] = ws
        for b, w in ws:
            g = groups.get(b) or o.vertex_groups.new(name=b); groups[b] = g; g.add([i], w, 'REPLACE')
def cards(name, specs, m):
    """feather cards: specs = [(root, dir, side, length, width, colour, bones)] (Three coords). Each card is rigid on its root."""
    verts, faces, cols, roots, uvs = [], [], [], [], []
    for root, d, sd, ln, wd, c, bl in specs:
        r = V(*root); d = V(*d).normalized(); s = V(*sd).normalized(); key = (tuple(r), bl)
        quad = [r - s * wd * .5, r + s * wd * .5, r + d * ln + s * wd * .3, r + d * ln - s * wd * .3]
        n = len(verts); verts += [tuple(q) for q in quad]; faces.append((n, n + 1, n + 2, n + 3)); cols += [c] * 4; roots += [key] * 4; uvs += [(0, 0), (1, 0), (1, 1), (0, 1)]
    o = mesh(name, verts, faces, m)
    a = o.data.color_attributes.new('Col', 'FLOAT_COLOR', 'POINT')
    for i, c in enumerate(cols): a.data[i].color = (*c, 1)
    uvl = o.data.uv_layers.new(name='UVMap')
    for poly in o.data.polygons:
        for li in poly.loop_indices: uvl.data[li].uv = uvs[o.data.loops[li].vertex_index]
    o['rigid_roots'] = 1
    return o, roots
def armature(prefix, bones):
    """bones: [(name, head, tail, parent)] in Three coords → returns (armature object, dict name->(head Vector, tail Vector))"""
    arm = bpy.data.armatures.new(prefix); ob = bpy.data.objects.new('DINO_' + prefix, arm); bpy.context.collection.objects.link(ob)
    bpy.context.view_layer.objects.active = ob; bpy.ops.object.mode_set(mode='EDIT'); B = {}
    for n, h, t, par in bones:
        b = arm.edit_bones.new(prefix + '_' + n); b.head = L(*h); b.tail = L(*t); b.roll = 0
        if par: b.parent = arm.edit_bones[prefix + '_' + par]
        B[prefix + '_' + n] = (V(*h), V(*t))
    bpy.ops.object.mode_set(mode='OBJECT'); return ob, B
def bind(ob, pieces_with_weights, name):
    objs = []
    for o, B, bones, roots in pieces_with_weights:
        skin(o, B, bones, roots); objs.append(o)
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs: o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    if len(objs) > 1: bpy.ops.object.join()
    me = bpy.context.view_layer.objects.active; me.name = name
    md = me.modifiers.new('Armature', 'ARMATURE'); md.object = ob; me.parent = ob
    return me
def pal(*cs): return [tuple(c) for c in cs]
def rnd(cs): return random.choice(cs)

def raptor(prefix='raptor'):
    """the mother: large feathered dromaeosaur (hip 1.6 m, length ~6 m), tawny with dark bars, cream belly, rust crest, white eye ring"""
    s = lambda b: prefix + '_' + b
    bones = [('pelvis', (0, 1.6, -.4), (0, 1.6, .1), None), ('spine', (0, 1.6, .1), (0, 1.62, .7), 'pelvis'), ('chest', (0, 1.62, .7), (0, 1.8, 1.15), 'spine'),
             ('neck1', (0, 1.8, 1.15), (0, 2.06, 1.4), 'chest'), ('neck2', (0, 2.06, 1.4), (0, 2.32, 1.62), 'neck1'), ('head', (0, 2.32, 1.62), (0, 2.4, 2.48), 'neck2'),
             ('jaw', (0, 2.3, 1.82), (0, 2.26, 2.45), 'head'), ('lidL', (.125, 2.5, 1.9), (.135, 2.58, 1.9), 'head'), ('lidR', (-.125, 2.5, 1.9), (-.135, 2.58, 1.9), 'head'),
             ('tail1', (0, 1.6, -.4), (0, 1.58, -1.2), 'pelvis'), ('tail2', (0, 1.58, -1.2), (0, 1.55, -2.0), 'tail1'), ('tail3', (0, 1.55, -2.0), (0, 1.5, -2.8), 'tail2'), ('tail4', (0, 1.5, -2.8), (0, 1.45, -3.7), 'tail3')]
    for sd, n in ((1, 'L'), (-1, 'R')):
        x = .26 * sd
        bones += [('thigh' + n, (x, 1.48, -.25), (x * 1.12, .97, .17), 'pelvis'), ('shin' + n, (x * 1.12, .97, .17), (x * 1.12, .43, -.25), 'thigh' + n),
                  ('foot' + n, (x * 1.12, .43, -.25), (x * 1.12, .07, -.1), 'shin' + n), ('toe' + n, (x * 1.12, .07, -.1), (x * 1.12, .04, .25), 'foot' + n),
                  ('arm' + n, (.2 * sd, 1.56, .82), (.3 * sd, 1.3, .76), 'chest'), ('fore' + n, (.3 * sd, 1.3, .76), (.34 * sd, 1.22, 1.08), 'arm' + n), ('hand' + n, (.34 * sd, 1.22, 1.08), (.36 * sd, 1.12, 1.34), 'fore' + n)]
    ob, B = armature(prefix, bones)
    skinM = vcol_mat(prefix + '_skin', .7); feathM = vcol_mat('feather', .75); hard = mat('claw', (.08, .07, .06), 0, .35); eye = mat('dino_eye', (.85, .55, .12), 0, .08); toothM = mat('tooth', (.93, .9, .8), 0, .4)
    tawny, dark, cream, rust = (.55, .38, .22), (.22, .15, .1), (.86, .8, .66), (.62, .3, .14)
    def bodycol(p, i):
        side = abs(p.x); top = p.y - 1.6
        c = tawny if top > -.12 else cream
        if top > -.05 and math.sin(p.z * 7.5) > .55: c = dark
        return c
    body = Piece(prefix + '_body', [(0, 1.45, -3.75), (0, 1.5, -2.8), (0, 1.55, -2.0), (0, 1.58, -1.2), (0, 1.6, -.45), (0, 1.58, .15), (0, 1.62, .72), (0, 1.8, 1.15), (0, 2.06, 1.4), (0, 2.32, 1.62), (0, 2.46, 1.8), (0, 2.46, 2.0), (0, 2.42, 2.22), (0, 2.38, 2.4), (0, 2.35, 2.5)],
                 [(.02, .02), (.06, .075), (.1, .12), (.15, .18), (.22, .27), (.28, .34, -.05), (.26, .33, -.03), (.17, .19), (.12, .13), (.12, .13), (.155, .175), (.135, .15, -.01), (.095, .11, -.02), (.055, .07, -.025), (.025, .035, -.025)],
                 [s(b) for b in ('pelvis', 'spine', 'chest', 'neck1', 'neck2', 'head', 'tail1', 'tail2', 'tail3', 'tail4')], bodycol, m=skinM)
    jaw = Piece(prefix + '_jaw', [(0, 2.31, 1.86), (0, 2.28, 2.08), (0, 2.27, 2.3), (0, 2.28, 2.46)], [(.1, .05), (.08, .045), (.05, .03), (.02, .015)], [s('jaw')], lambda p, i: cream, ring=10, m=skinM)
    parts = [(body.o, B, body.bones, None), (jaw.o, B, jaw.bones, None)]
    for sd, n in ((1, 'L'), (-1, 'R')):
        h, k, a, bl = B[s('thigh' + n)][0], B[s('shin' + n)][0], B[s('foot' + n)][0], B[s('toe' + n)][0]
        th = Piece(f'{prefix}_thigh{n}', [tuple(h + V(0, .12, -.05)), tuple(h), tuple((h + k) * .5), tuple(k), tuple((k + a) * .5), tuple(a), tuple(bl)], [(.21, .28), (.23, .31), (.18, .21), (.1, .11), (.065, .07), (.05, .055), (.04, .04)],
                   [s('pelvis'), s('thigh' + n), s('shin' + n), s('foot' + n)], lambda p, i: tawny if p.y > .9 else (.42, .3, .2), ring=12, m=skinM)
        parts.append((th.o, B, th.bones, None))
        for j, (dx, ln) in enumerate(((-.07, .3), (0, .36), (.07, .28))):   # toes + sickle claw on the second toe
            tp = Piece(f'{prefix}_toe{n}{j}', [tuple(bl + V(dx * sd, 0, 0)), tuple(bl + V(dx * sd * 1.3, -.02, ln))], [(.03, .025), (.012, .01)], [s('toe' + n)], lambda p, i: (.35, .28, .2), ring=6, sub=2, m=skinM)
            parts.append((tp.o, B, tp.bones, None))
        cl = Piece(f'{prefix}_sickle{n}', [tuple(bl + V(-.02 * sd, .08, .05)), tuple(bl + V(-.03 * sd, .2, .12)), tuple(bl + V(-.03 * sd, .12, .26))], [(.025, .03), (.018, .02), (.003, .003)], [s('toe' + n)], lambda p, i: (.08, .07, .06), ring=6, sub=3, m=hard)
        parts.append((cl.o, B, cl.bones, None))
        sh, el, wr, tip = B[s('arm' + n)][0], B[s('fore' + n)][0], B[s('hand' + n)][0], B[s('hand' + n)][1]
        ar = Piece(f'{prefix}_arm{n}', [tuple(sh), tuple(el), tuple(wr), tuple(tip)], [(.08, .09), (.06, .06), (.04, .04), (.025, .02)], [s('arm' + n), s('fore' + n), s('hand' + n)], lambda p, i: tawny, ring=8, m=skinM)
        parts.append((ar.o, B, ar.bones, None))
        for j in range(3):
            c = Piece(f'{prefix}_claw{n}{j}', [tuple(tip + V(sd * (j - 1) * .02, 0, 0)), tuple(tip + V(sd * (j - 1) * .03, -.1, .05))], [(.012, .012), (.002, .002)], [s('hand' + n)], lambda p, i: (.08, .07, .06), ring=5, sub=2, m=hard)
            parts.append((c.o, B, c.bones, None))
        e = sphere(f'{prefix}_eye{n}', (.118 * sd, 2.5, 1.9), .058, eye, (1, 1, 1), 12); parts.append((e, B, [s('head')], None))
        ring_ = torus(f'{prefix}_ering{n}', (.122 * sd, 2.5, 1.9), .064, .014, mat('eyering', (.92, .88, .78), 0, .6), axis='x', segs=16, minor=6); parts.append((ring_, B, [s('head')], None))
        lid = sphere(f'{prefix}_lid{n}', (.12 * sd, 2.505, 1.9), .064, skinM, (1, 1, 1), 10)
        for v in lid.data.vertices:
            if v.co.z < 0: v.co.z = 0       # upper hemisphere only: rotates down over the eye to blink
        set_cols(lid, lambda p, i: tawny); parts.append((lid, B, [s('lid' + n)], None))
        for j in range(9):   # teeth
            z = 2.0 + j * .05; parts.append((cyl(f'{prefix}_t{n}{j}', (.075 * sd * (1 - j * .07), 2.31 + j * .006, z), .001, .05, toothM, verts=5, r2=.009), B, [s('head')], None))
    # ---- feather cards
    spec = []; feather_cols = pal((.6, .42, .24), (.5, .34, .2), (.42, .28, .17), (.68, .5, .3), (.3, .2, .13))
    for ring in body.rings:
        c, t, sv, u, rx, ry, idx = ring
        if c.z > 1.7 or c.z < -3.2: continue
        bl = [s('pelvis'), s('spine'), s('chest'), s('neck1'), s('neck2'), s('tail1'), s('tail2'), s('tail3'), s('tail4')]
        n_here = 34 if c.z < 1.1 else 20
        for _ in range(n_here):
            a = random.uniform(-.55, 3.69); nrm = sv * math.cos(a) + u * math.sin(a); root = c + sv * math.cos(a) * rx + u * math.sin(a) * ry
            belly = math.sin(a) < -.25
            d = (-t * .9 + nrm * .08 - u * .22).normalized(); side = nrm.cross(d).normalized()
            ln = random.uniform(.16, .3) * (1.4 if c.z > .9 else 1.0) * (.7 if belly else 1)
            col = cream if belly else rnd(feather_cols)
            if not belly and math.sin(c.z * 7.5) > .6: col = dark
            spec.append((tuple(root + nrm * .012), tuple(d), tuple(side), ln, ln * .55, col, bl))
    for k in range(70):   # neck ruff: longer, lifted
        z = random.uniform(.8, 1.35); c = V(0, 1.7 + (z - .8) * .5, z); a = random.uniform(-.3, 3.44); nrm = V(math.cos(a), math.sin(a) * .9, 0).normalized()
        root = c + nrm * .18; d = (V(0, -.3, -1) + nrm * .25).normalized(); spec.append((tuple(root), tuple(d), tuple(nrm.cross(d).normalized()), random.uniform(.28, .4), .16, rnd(feather_cols), [s('chest'), s('neck1')]))
    for k in range(16):   # crest (rust)
        z = 1.72 + k * .022; root = V(random.uniform(-.04, .04), 2.58 - k * .006, z); d = V(random.uniform(-.25, .25), .55, -1).normalized()
        spec.append((tuple(root), tuple(d), (1, 0, 0), random.uniform(.18, .32) * (1.2 - k / 20), .06, rust, [s('head')]))
    for sd, n in ((1, 'L'), (-1, 'R')):   # wings: secondaries along the forearm, primaries from the hand — hanging along the flank when folded
        el, wr, tip = B[s('fore' + n)][0], B[s('hand' + n)][0], B[s('hand' + n)][1]
        for j in range(10):
            k = j / 9; root = el + (wr - el) * k; d = V(0, -.55, -1).normalized(); spec.append((tuple(root + V(sd * .03, 0, 0)), tuple(d), (0, 1, 0), .32 + .2 * k, .13, rnd(feather_cols) if j % 3 else dark, [s('fore' + n)]))
        for j in range(9):
            k = j / 8; root = wr + (tip - wr) * k; d = V(0, -.5 - k * .2, -1 + k * .5).normalized(); spec.append((tuple(root + V(sd * .035, 0, 0)), tuple(d), (0, 1, 0), .55 + .25 * math.sin(k * 2.6), .13, dark if j % 2 else (.5, .34, .2), [s('hand' + n)]))
    for j in range(22):   # tail fan (frond-like, horizontal)
        k = j / 21; z = -1.4 - k * 2.3; tb = s('tail2') if z > -2 else (s('tail3') if z > -2.8 else s('tail4'))
        for sd in (1, -1):
            root = V(sd * (.1 - k * .05), 1.56 - k * .1, z); d = V(sd * (.85 - k * .4), .02, -.5 - k * .6).normalized()
            spec.append((tuple(root), tuple(d), tuple(V(0, 1, 0).cross(d).normalized()), .3 + .34 * k, .17, dark if j % 5 == 0 else rnd(feather_cols), [tb]))
    fo, roots = cards(prefix + '_feathers', spec, feathM)
    parts.append((fo, B, None, roots))
    bind(ob, parts, prefix + '_mesh')

def tyrannosaur(prefix='rex'):
    s = lambda b: prefix + '_' + b; K = 2.1
    bones = [('pelvis', (0, 3.3, -.8), (0, 3.3, .3), None), ('spine', (0, 3.3, .3), (0, 3.25, 1.5), 'pelvis'), ('chest', (0, 3.25, 1.5), (0, 3.4, 2.4), 'spine'),
             ('neck1', (0, 3.4, 2.4), (0, 3.65, 3.0), 'chest'), ('neck2', (0, 3.65, 3.0), (0, 3.85, 3.4), 'neck1'), ('head', (0, 3.85, 3.4), (0, 3.6, 5.0), 'neck2'),
             ('jaw', (0, 3.45, 3.55), (0, 3.25, 5.0), 'head'), ('lidL', (.28, 3.92, 3.75), (.3, 4.05, 3.75), 'head'), ('lidR', (-.28, 3.92, 3.75), (-.3, 4.05, 3.75), 'head'),
             ('tail1', (0, 3.3, -.8), (0, 3.25, -2.6), 'pelvis'), ('tail2', (0, 3.25, -2.6), (0, 3.1, -4.4), 'tail1'), ('tail3', (0, 3.1, -4.4), (0, 2.9, -6.2), 'tail2'), ('tail4', (0, 2.9, -6.2), (0, 2.7, -8.0), 'tail3')]
    for sd, n in ((1, 'L'), (-1, 'R')):
        x = .55 * sd
        bones += [('thigh' + n, (x, 3.05, -.5), (x * 1.1, 2.0, .35), 'pelvis'), ('shin' + n, (x * 1.1, 2.0, .35), (x * 1.1, .9, -.5), 'thigh' + n),
                  ('foot' + n, (x * 1.1, .9, -.5), (x * 1.1, .15, -.2), 'shin' + n), ('toe' + n, (x * 1.1, .15, -.2), (x * 1.1, .08, .55), 'foot' + n),
                  ('arm' + n, (.4 * sd, 2.85, 2.1), (.48 * sd, 2.55, 2.2), 'chest'), ('fore' + n, (.48 * sd, 2.55, 2.2), (.5 * sd, 2.5, 2.5), 'arm' + n), ('hand' + n, (.5 * sd, 2.5, 2.5), (.5 * sd, 2.42, 2.62), 'fore' + n)]
    ob, B = armature(prefix, bones)
    skinM = vcol_mat(prefix + '_skin', .75); hard = mat('claw', (.08, .07, .06), 0, .35); eye = mat('rex_eye', (.95, .6, .1), 0, .08); toothM = mat('tooth', (.93, .9, .8), 0, .4)
    top, belly, stripe = (.27, .25, .2), (.62, .55, .44), (.15, .14, .12)
    def col(p, i):
        c = top if p.y > 3.1 else belly
        if p.y > 3.2 and math.sin(p.z * 3.2) > .6: c = stripe
        return tuple(x * random.uniform(.92, 1.06) for x in c)
    body = Piece(prefix + '_body', [(0, 2.7, -8.1), (0, 2.9, -6.2), (0, 3.1, -4.4), (0, 3.25, -2.6), (0, 3.3, -.8), (0, 3.25, .4), (0, 3.28, 1.5), (0, 3.45, 2.4), (0, 3.7, 3.0), (0, 3.9, 3.45), (0, 3.95, 3.9), (0, 3.85, 4.5), (0, 3.65, 5.1)],
                 [(.04, .04), (.17, .2), (.3, .38), (.48, .58), (.66, .78), (.78, .95, -.15), (.7, .9, -.1), (.52, .6), (.42, .48), (.44, .52), (.4, .45, -.02), (.3, .3, -.05), (.18, .17, -.05)],
                 [s(b) for b in ('pelvis', 'spine', 'chest', 'neck1', 'neck2', 'head', 'tail1', 'tail2', 'tail3', 'tail4')], col, ring=16, m=skinM)
    jaw = Piece(prefix + '_jaw', [(0, 3.5, 3.5), (0, 3.4, 4.1), (0, 3.32, 4.7), (0, 3.3, 5.05)], [(.36, .2), (.3, .18), (.2, .12), (.1, .07)], [s('jaw')], lambda p, i: belly, ring=12, m=skinM)
    parts = [(body.o, B, body.bones, None), (jaw.o, B, jaw.bones, None)]
    for sd, n in ((1, 'L'), (-1, 'R')):
        h, k, a, bl = B[s('thigh' + n)][0], B[s('shin' + n)][0], B[s('foot' + n)][0], B[s('toe' + n)][0]
        th = Piece(f'{prefix}_leg{n}', [tuple(h + V(0, .25, -.1)), tuple(h), tuple((h + k) * .5), tuple(k), tuple((k + a) * .5), tuple(a), tuple(bl)], [(.42, .52), (.46, .58), (.36, .42), (.22, .24), (.15, .16), (.11, .12), (.09, .08)],
                   [s('pelvis'), s('thigh' + n), s('shin' + n), s('foot' + n)], col, ring=12, m=skinM)
        parts.append((th.o, B, th.bones, None))
        for j, dx in enumerate((-.14, 0, .14)):
            tp = Piece(f'{prefix}_toe{n}{j}', [tuple(bl + V(dx * sd, 0, 0)), tuple(bl + V(dx * sd * 1.4, -.05, .7))], [(.09, .07), (.03, .02)], [s('toe' + n)], lambda p, i: (.25, .23, .19), ring=6, sub=2, m=skinM)
            parts.append((tp.o, B, tp.bones, None))
        ar = Piece(f'{prefix}_arm{n}', [tuple(B[s('arm' + n)][0]), tuple(B[s('fore' + n)][0]), tuple(B[s('hand' + n)][0]), tuple(B[s('hand' + n)][1])], [(.1, .1), (.07, .07), (.05, .05), (.02, .02)], [s('arm' + n), s('fore' + n), s('hand' + n)], col, ring=8, m=skinM)
        parts.append((ar.o, B, ar.bones, None))
        parts.append((sphere(f'{prefix}_eye{n}', (.27 * sd, 3.92, 3.75), .07, eye, (1, 1, 1), 12), B, [s('head')], None))
        lid = sphere(f'{prefix}_lid{n}', (.285 * sd, 3.925, 3.75), .078, skinM, (1, 1, 1), 10)
        for v in lid.data.vertices:
            if v.co.z < 0: v.co.z = 0
        set_cols(lid, lambda p, i: top); parts.append((lid, B, [s('lid' + n)], None))
        for j in range(12):
            z = 3.85 + j * .1; parts.append((cyl(f'{prefix}_t{n}{j}', (.22 * sd * (1 - j * .05), 3.53, z), .002, .16, toothM, verts=5, r2=.025), B, [s('head')], None))
    spec = []
    for ring in body.rings:   # sparse filament fuzz along the back and neck
        c, t, sv, u, rx, ry, idx = ring
        if -5 < c.z < 3.4:
            for _ in range(10):
                a = random.uniform(1.0, 2.14); nrm = sv * math.cos(a) + u * math.sin(a); root = c + sv * math.cos(a) * rx + u * math.sin(a) * ry
                d = (-t + nrm * .5).normalized(); spec.append((tuple(root), tuple(d), tuple(nrm.cross(d).normalized()), random.uniform(.12, .22), .06, (.2, .17, .13), [s('pelvis'), s('spine'), s('chest'), s('neck1'), s('neck2'), s('tail1'), s('tail2')]))
    fo, roots = cards(prefix + '_fuzz', spec, vcol_mat('feather', .75)); parts.append((fo, B, None, roots))
    bind(ob, parts, prefix + '_mesh')

def sauropod(prefix='sauro'):
    s = lambda b: prefix + '_' + b
    bones = [('pelvis', (0, 4.8, -2.5), (0, 5.0, 0), None), ('spine', (0, 5.0, 0), (0, 4.8, 2.5), 'pelvis'), ('chest', (0, 4.8, 2.5), (0, 5.0, 4.0), 'spine'),
             ('neck1', (0, 5.0, 4.0), (0, 6.6, 6.0), 'chest'), ('neck2', (0, 6.6, 6.0), (0, 8.4, 7.6), 'neck1'), ('neck3', (0, 8.4, 7.6), (0, 10.2, 8.9), 'neck2'), ('head', (0, 10.2, 8.9), (0, 10.0, 9.9), 'neck3'),
             ('tail1', (0, 4.8, -2.5), (0, 4.4, -5.5), 'pelvis'), ('tail2', (0, 4.4, -5.5), (0, 3.6, -8.5), 'tail1'), ('tail3', (0, 3.6, -8.5), (0, 2.6, -11.5), 'tail2'), ('tail4', (0, 2.6, -11.5), (0, 1.8, -15.0), 'tail3')]
    for sd, n in ((1, 'L'), (-1, 'R')):
        bones += [('thigh' + n, (1.1 * sd, 4.3, -2.2), (1.15 * sd, 2.2, -2.0), 'pelvis'), ('shin' + n, (1.15 * sd, 2.2, -2.0), (1.15 * sd, .1, -2.2), 'thigh' + n),
                  ('upper' + n, (1.0 * sd, 4.3, 3.2), (1.05 * sd, 2.3, 3.4), 'chest'), ('lower' + n, (1.05 * sd, 2.3, 3.4), (1.05 * sd, .1, 3.3), 'upper' + n)]
    ob, B = armature(prefix, bones)
    skinM = vcol_mat(prefix + '_skin', .85)
    def col(p, i):
        c = (.42, .4, .36) if p.y > 4.2 else (.58, .54, .47)
        if p.y > 4.6 and math.sin(p.z * 1.4 + p.x) > .7: c = (.33, .31, .28)
        return tuple(x * random.uniform(.93, 1.05) for x in c)
    body = Piece(prefix + '_body', [(0, 1.8, -15.1), (0, 2.6, -11.5), (0, 3.6, -8.5), (0, 4.4, -5.5), (0, 4.9, -2.5), (0, 5.0, 0), (0, 4.9, 2.5), (0, 5.1, 4.0), (0, 6.6, 6.0), (0, 8.4, 7.6), (0, 10.2, 8.9), (0, 10.3, 9.4), (0, 10.0, 10.0)],
                 [(.05, .05), (.32, .38), (.62, .72), (1.0, 1.2), (1.45, 1.75), (1.6, 1.95, -.3), (1.5, 1.85, -.25), (1.05, 1.2), (.62, .68), (.45, .5), (.34, .37), (.3, .3), (.14, .14)],
                 [s(b) for b in ('pelvis', 'spine', 'chest', 'neck1', 'neck2', 'neck3', 'head', 'tail1', 'tail2', 'tail3', 'tail4')], col, ring=16, m=skinM)
    parts = [(body.o, B, body.bones, None)]
    for n in ('L', 'R'):
        for up, lo in (('thigh', 'shin'), ('upper', 'lower')):
            a, b, c = B[s(up + n)][0], B[s(lo + n)][0], B[s(lo + n)][1]
            lg = Piece(f'{prefix}_{up}{n}', [tuple(a + V(0, .4, 0)), tuple(a), tuple(b), tuple(c), tuple(c + V(0, -.05, .1))], [(.75, .85), (.7, .8), (.45, .48), (.42, .44), (.5, .3)], [s(up + n), s(lo + n), s('pelvis' if up == 'thigh' else 'chest')], col, ring=12, m=skinM)
            parts.append((lg.o, B, lg.bones, None))
    bind(ob, parts, prefix + '_mesh')

def flyer(prefix, bird=False):
    """pterosaur (membrane wings, crest) or a small bird (feathered wings, tail fan)"""
    s = lambda b: prefix + '_' + b
    span = .55 if bird else 3.2; y = .6 if bird else 1.2
    bones = [('body', (0, y, -.2 * span), (0, y, .2 * span), None), ('neck', (0, y, .2 * span), (0, y + .05 * span, .3 * span), 'body'), ('head', (0, y + .05 * span, .3 * span), (0, y + .04 * span, .45 * span), 'neck'),
             ('tail', (0, y, -.2 * span), (0, y, -.4 * span), 'body')]
    for sd, n in ((1, 'L'), (-1, 'R')):
        bones += [('wing1' + n, (.05 * span * sd, y + .02 * span, .08 * span), (.25 * span * sd, y + .03 * span, .06 * span), 'body'), ('wing2' + n, (.25 * span * sd, y + .03 * span, .06 * span), (.5 * span * sd, y + .02 * span, -.02 * span), 'wing1' + n)]
    ob, B = armature(prefix, bones)
    skinM = vcol_mat(prefix + '_skin', .8)
    bc = (.3, .27, .25) if bird else (.5, .4, .33)
    body = Piece(prefix + '_body', [(0, y, -.3 * span), (0, y, -.15 * span), (0, y, .05 * span), (0, y + .03 * span, .2 * span), (0, y + .05 * span, .3 * span), (0, y + .05 * span, .36 * span)],
                 [(.01 * span, .01 * span), (.045 * span, .05 * span), (.06 * span, .065 * span), (.035 * span, .035 * span), (.045 * span, .045 * span), (.03 * span, .03 * span)],
                 [s('body'), s('neck'), s('head'), s('tail')], lambda p, i: bc, ring=10, m=skinM)
    beak = Piece(prefix + '_beak', [(0, y + .045 * span, .36 * span), (0, y + .035 * span, (.5 if not bird else .45) * span)], [(.015 * span, .02 * span), (.002 * span, .002 * span)], [s('head')], lambda p, i: (.8, .6, .2) if bird else (.55, .45, .35), ring=6, sub=2, m=skinM)
    parts = [(body.o, B, body.bones, None), (beak.o, B, beak.bones, None)]
    if not bird:
        crest = Piece(prefix + '_crest', [(0, y + .07 * span, .3 * span), (0, y + .12 * span, .18 * span)], [(.004 * span, .02 * span), (.002 * span, .004 * span)], [s('head')], lambda p, i: (.75, .3, .15), ring=6, sub=2, m=skinM)
        parts.append((crest.o, B, crest.bones, None))
        for sd, n in ((1, 'L'), (-1, 'R')):
            sh = B[s('wing1' + n)][0]; wr = B[s('wing2' + n)][0]; tip = B[s('wing2' + n)][1]
            vs = [tuple(sh), tuple(wr), tuple(tip), tuple(wr * .55 + V(0, y, -.22 * span) * .45), (.08 * span * sd, y, -.18 * span)]
            mm = mesh(f'{prefix}_mem{n}', vs, [(0, 1, 3, 4), (1, 2, 3)], skinM)
            set_cols(mm, lambda p, i: (.62, .45, .33)); parts.append((mm, B, [s('body'), s('wing1' + n), s('wing2' + n)], None))
    else:
        spec = []
        for sd, n in ((1, 'L'), (-1, 'R')):
            sh, wr, tip = B[s('wing1' + n)][0], B[s('wing2' + n)][0], B[s('wing2' + n)][1]
            for j in range(12):
                k = j / 11; root = sh + (tip - sh) * k; bn = s('wing1' + n) if k < .5 else s('wing2' + n)
                spec.append((tuple(root), (0, 0, -1), (1, 0, 0), .1 + .08 * k, .045, (.25, .23, .22) if j % 3 else (.12, .11, .1), [bn]))
        for j in range(7):
            a = (j - 3) * .14; spec.append(((0, y, -.25 * span), (math.sin(a), 0, -math.cos(a)), (math.cos(a), 0, math.sin(a)), .14, .04, (.18, .17, .16), [s('tail')]))
        fo, roots = cards(prefix + '_feathers', spec, vcol_mat('feather', .75)); parts.append((fo, B, None, roots))
    bind(ob, parts, prefix + '_mesh')

def export_glb(name, filt):
    bpy.ops.object.select_all(action='DESELECT')
    for o in bpy.context.scene.objects:
        if filt(o): o.select_set(True)
    bpy.ops.export_scene.gltf(filepath=str(OUT / name), export_format='GLB', use_selection=True, export_apply=True, export_yup=True, export_materials='EXPORT', export_cameras=False, export_lights=False, export_skins=True, export_animations=False)
    print('exported', name)
def export_world(name):
    bulk_convert(list(bpy.context.scene.objects))
    for o in bpy.context.scene.objects:
        if o.type == 'MESH' and o.data.materials and o.data.materials[0] and o.data.materials[0].name in ('leaves', 'mossrock', 'asteroid', 'needles', 'bark', 'petal'):
            for f in o.data.polygons: f.use_smooth = True
    for o in bpy.context.scene.objects:
        if o.type == 'MESH' and not o.get('rigid_roots') and not o.data.uv_layers: world_uv(o)
        elif o.type == 'MESH' and not o.get('rigid_roots'): world_uv(o)
    by = {}
    for o in bpy.context.scene.objects:
        if o.type == 'MESH' and o.data.materials and not o.name.startswith('KEEP'): by.setdefault(o.data.materials[0].name, []).append(o)
    for mname, objs in by.items():
        if len(objs) > 1:
            bpy.ops.object.select_all(action='DESELECT')
            for o in objs: o.select_set(True)
            bpy.context.view_layer.objects.active = objs[0]; bpy.ops.object.join()
        objs[0].name = mname
    export_glb(name, lambda o: o.type == 'MESH')

reset(); world(); export_world('world.glb')
reset(); props(); export_world('props.glb'); veg_json()
reset(); random.seed(7); raptor(); tyrannosaur(); sauropod(); flyer('ptero'); flyer('bird', bird=True)
export_glb('dinos.glb', lambda o: o.type in ('MESH', 'ARMATURE'))
print('ALL ASSETS DONE')
