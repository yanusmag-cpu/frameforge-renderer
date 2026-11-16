"""FrameForge — "What if humans evolved underwater?" Original ocean world (procedural, no scans or third-party assets).
Run: blender -b --factory-startup -P scripts/sea/build-assets.py
  → public/sea/world.glb   reef shelf, drop-off and abyss terrain, island beach, the domed city (glass domes, towers, glass tunnels),
                            surface homes, deep pressure habitat, submersible
  → public/sea/props.glb   corals (branching, brain, fan, tube sponge, anemone), kelp, sea grass, rocks, palms, fish, turtle, whale,
                            jellyfish, manta ray (animated by vertex shaders in Three)
  → public/sea/veg.json, height.json
Three.js metres, y up, sea surface y=0. Shelf y≈-12 (z -175..70), drop-off z 70..140 to the abyss y≈-152; island beach z<-180.
"""
import bpy, bmesh, math, random, json
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'public/sea'; OUT.mkdir(parents=True, exist_ok=True)
random.seed(1859)
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

def export_glb(name, filt):
    bpy.ops.object.select_all(action='DESELECT')
    for o in bpy.context.scene.objects:
        if filt(o): o.select_set(True)
    bpy.ops.export_scene.gltf(filepath=str(OUT / name), export_format='GLB', use_selection=True, export_apply=True, export_yup=True, export_materials='EXPORT', export_cameras=False, export_lights=False, export_skins=True, export_animations=False)
    print('exported', name)
def export_world(name):
    bulk_convert(list(bpy.context.scene.objects))
    for o in bpy.context.scene.objects:
        if o.type == 'MESH' and o.data.materials and o.data.materials[0] and o.data.materials[0].name in SMOOTH:
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


SMOOTH = {'rock', 'coral', 'brain', 'sponge', 'anemone', 'dome_glass', 'tunnel_glass', 'creature', 'whale', 'jelly', 'sand', 'pod', 'hull', 'shell', 'palm_bark'}
# ================================================================== seabed (heights exported to height.json)
def Hs(x, z):
    h = -12 + 1.2 * math.sin(x / 17) * math.cos(z / 23) + .6 * math.sin(x / 7 + z / 9) + .3 * math.sin(x / 2.7 - z / 3.1)
    h += 18.5 * sm((-176 - z) / 44) + 1.2 * math.sin(x / 11) * sm((-190 - z) / 20)          # island beach rising out of the sea
    h -= 140 * sm((z - 70) / 70) * (1 + .08 * math.sin(x / 23))                             # drop-off into the deep
    h += sm((z - 150) / 40) * (6 * math.sin(x / 29) * math.cos(z / 37) + 3 * math.sin(x / 9 + z / 13))
    if -45 < x < 75 and 165 < z < 215: h = max(h, -112 + 1.5 * math.sin(x / 5))                # habitat ledge
    return h
X0, X1, Z0, Z1, STEP = -160, 160, -260, 420, 2.0
NX, NZ = int((X1 - X0) / STEP) + 1, int((Z1 - Z0) / STEP) + 1
def seabed():
    verts, faces = [], []
    for j in range(NZ):
        for i in range(NX): x, z = X0 + i * STEP, Z0 + j * STEP; verts.append((x, Hs(x, z), z))
    for j in range(NZ - 1):
        for i in range(NX - 1): a = j * NX + i; faces.append((a, a + NX, a + NX + 1, a + 1))
    mesh('seabed', verts, faces, mat('seabed', (.7, .62, .45), 0, .95), smooth=True)
    (OUT / 'height.json').write_text(json.dumps({'x0': X0, 'z0': Z0, 'step': STEP, 'nx': NX, 'nz': NZ, 'h': [[round(verts[j * NX + i][1], 2) for i in range(NX)] for j in range(NZ)]}, separators=(',', ':')))
# ================================================================== the city
GLASS = None
def dome(cx, cz, r, name):
    y0 = Hs(cx, cz) + .3; g = mat('dome_glass', (.6, .85, .9), .2, .05); fr = mat('dome_frame', (.82, .84, .86), .9, .3); parts = []
    bpy.ops.mesh.primitive_uv_sphere_add(segments=48, ring_count=24, radius=r, location=L(cx, y0, cz)); d = bpy.context.object; d.name = name + '_glass'
    bm = bmesh.new(); bm.from_mesh(d.data); bmesh.ops.delete(bm, geom=[v for v in bm.verts if v.co.z < -.01], context='VERTS'); bm.to_mesh(d.data); bm.free(); finish(d, g)
    parts.append(torus(name + '_ring', (cx, y0 + .25, cz), r, .35, fr, segs=48, minor=8))
    for k in range(10):   # meridian ribs
        a = k / 10 * math.pi
        pts = [(cx + math.cos(a) * r * math.cos(b), y0 + r * math.sin(b), cz + math.sin(a) * r * math.cos(b)) for b in [math.pi * i / 24 for i in range(25)]]
        parts.append(tube(f'{name}_rib{k}', pts, .09, fr, 1))
    for k in range(3): parts.append(torus(f'{name}_lat{k}', (cx, y0 + r * math.sin(.35 + k * .4), cz), r * math.cos(.35 + k * .4), .07, fr, segs=48, minor=6))
    # interior: terraced buildings with glowing windows, plants, a central spire
    inner = mat('city_white', (.92, .93, .95), .1, .5); win = mat('window_glow', (1, .85, .55), 0, .4, (1, .8, .5), 2.2); plant = mat('reef_plant', (.25, .6, .35), 0, .7)
    for k in range(int(r * .9)):
        a = random.uniform(0, 6.28); rr = random.uniform(0, r * .62); h = random.uniform(1.5, r * .55); w = random.uniform(1.4, 2.8)
        x, z = cx + math.cos(a) * rr, cz + math.sin(a) * rr; parts.append(cyl(f'{name}_b{k}', (x, y0 + h / 2, z), w, h, inner, verts=16, bevel=.08))
        for j in range(int(h / 1.2)): parts.append(cyl(f'{name}_w{k}_{j}', (x, y0 + .7 + j * 1.2, z), w + .02, .25, win, verts=16))
        parts.append(sphere(f'{name}_p{k}', (x, y0 + h + .4, z), .7, plant, (1, .6, 1), 8))
    parts.append(cyl(name + '_spire', (cx, y0 + r * .45, cz), .6, r * .9, inner, verts=16, r2=.15))
    return parts
def tower(cx, cz, top, name):
    y0 = Hs(cx, cz); m = mat('city_white', (.92, .93, .95), .1, .5); neon = mat('neon_cyan', (.3, .95, 1), 0, .3, (.25, .9, 1), 3.0); g = mat('dome_glass', (.6, .85, .9), .2, .05); parts = []
    h = top - y0; parts.append(cyl(name + '_core', (cx, y0 + h / 2, cz), 1.6, h, m, verts=20, r2=1.1))
    for k in range(int(h / 2.6)):
        y = y0 + 2 + k * 2.6; parts.append(torus(f'{name}_bal{k}', (cx, y, cz), 2.4 - k * .08, .18, m, segs=32, minor=6)); parts.append(torus(f'{name}_n{k}', (cx, y + .35, cz), 1.75 - k * .05, .06, neon, segs=32, minor=4))
    parts.append(sphere(name + '_bulb', (cx, top + 1.4, cz), 2.2, g, (1, .8, 1), 24)); return parts
def tunnel(a, b, name, y=None):
    g = mat('tunnel_glass', (.6, .85, .9), .2, .05); fr = mat('dome_frame', (.82, .84, .86), .9, .3)
    ya = Hs(*a) + 2.4 if y is None else y; yb = Hs(*b) + 2.4 if y is None else y; parts = []
    pts = [(a[0] + (b[0] - a[0]) * k / 12, ya + (yb - ya) * k / 12 + math.sin(math.pi * k / 12) * 1.2, a[1] + (b[1] - a[1]) * k / 12) for k in range(13)]
    parts.append(tube(name + '_g', pts, 2.0, g, 4)); L_ = math.hypot(b[0] - a[0], b[1] - a[1]); n = int(L_ / 3)
    for k in range(1, n):
        s = k / n; p = (a[0] + (b[0] - a[0]) * s, ya + (yb - ya) * s + math.sin(math.pi * s) * 1.2, a[1] + (b[1] - a[1]) * s)
        ang = math.atan2(b[0] - a[0], b[1] - a[1]); o = torus(f'{name}_r{k}', p, 2.05, .09, fr, axis='z', segs=24, minor=4); o.rotation_euler = (0, 0, -ang); parts.append(o)
    return parts
DOMES = [(0, -40, 14), (-30, -52, 10), (28, -30, 11), (-14, -12, 8), (22, -70, 9)]
def city():
    for i, (x, z, r) in enumerate(DOMES): dome(x, z, r, f'dome{i}')
    for i, (x, z, top) in enumerate([(-18, -30, -2.5), (12, -60, -4), (38, -50, -3), (-36, -28, -5)]): tower(x, z, top, f'tower{i}')
    for i, (a, b) in enumerate([(0, 1), (0, 2), (0, 3), (0, 4), (1, 3)]):
        (ax, az, ar), (bx, bz, br) = DOMES[a], DOMES[b]; d = math.hypot(bx - ax, bz - az); ux, uz = (bx - ax) / d, (bz - az) / d
        tunnel((ax + ux * ar * .95, az + uz * ar * .95), (bx - ux * br * .95, bz - uz * br * .95), f'tun{i}')
    # surface homes: floating pods with decks, kelp gardens below
    pod = mat('pod', (.95, .92, .85), .05, .4); deck = mat('deck_wood', (.55, .4, .26), 0, .7); g = mat('dome_glass', (.6, .85, .9), .2, .05)
    for i, (x, z) in enumerate([(46, 18), (58, 30), (38, 36), (64, 12), (52, 46)]):
        sphere(f'pod{i}', (x, -.6, z), 3.2, pod, (1, .55, 1), 24); sphere(f'podg{i}', (x, 1.0, z), 2.0, g, (1, .7, 1), 20); cyl(f'deck{i}', (x, .15, z), 4.6, .3, deck, verts=24)
        for k in range(4): a = k * 1.57 + .6; cyl(f'leg{i}_{k}', (x + math.cos(a) * 2.5, (-.6 + Hs(x, z)) / 2, z + math.sin(a) * 2.5), .12, abs(Hs(x, z)), mat('dome_frame', (.82, .84, .86), .9, .3), verts=8)
        cyl(f'ladder{i}', (x + 3.4, -3, z), .06, 6, mat('dome_frame', (.82, .84, .86), .9, .3), verts=6)
    # deep pressure habitat on the ledge + submersible
    hx, hz = 22, 190; hy = Hs(hx, hz); hull = mat('hull', (.9, .6, .2), .6, .4); lamp = mat('lamp_cold', (.8, .95, 1), 0, .3, (.7, .9, 1), 6.0); port = mat('window_glow', (1, .85, .55), 0, .4, (1, .8, .5), 2.2)
    sphere('hab_main', (hx, hy + 5, hz), 5, hull, (1, 1, 1), 32); cyl('hab_mod', (hx + 7, hy + 3, hz), 2.4, 8, hull, axis='x', verts=24)
    for k in range(8): a = k / 8 * 6.283; sphere(f'hab_port{k}', (hx + math.cos(a) * 4.95, hy + 5.6, hz + math.sin(a) * 4.95), .5, port, (1, 1, 1), 10)
    for k in range(4): a = k * 1.57; cyl(f'hab_leg{k}', (hx + math.cos(a) * 3.6, hy + 1.3, hz + math.sin(a) * 3.6), .35, 2.6, mat('dome_frame', (.82, .84, .86), .9, .3), verts=10)
    for k in range(6): a = k / 6 * 6.283; sphere(f'hab_lamp{k}', (hx + math.cos(a) * 6, hy + .6, hz + math.sin(a) * 6), .25, lamp, (1, 1, 1), 8)
    sphere('hab_beacon', (hx, hy + 10.3, hz), .4, mat('beacon_red', (1, .2, .1), 0, .3, (1, .15, .05), 8), (1, 1, 1), 10)
    # submersible (KEEP: animated)
    s = [sphere('sub_body', (0, 0, 0), 1.3, hull, (1, 1, 1.9), 24), sphere('sub_dome', (0, .35, 1.6), .9, mat('dome_glass', (.6, .85, .9), .2, .05), (1, 1, 1), 20),
         cyl('sub_prop', (0, 0, -2.6), .5, .4, mat('dome_frame', (.82, .84, .86), .9, .3), axis='z', verts=16), sphere('sub_lampL', (.9, -.6, 1.7), .18, lamp, (1, 1, 1), 8), sphere('sub_lampR', (-.9, -.6, 1.7), .18, lamp, (1, 1, 1), 8)]
    keep('Submersible', s, (0, 0, 0))
    # island: dry sand above the waterline + palms (the ending)
    for i in range(40):
        x, z = random.uniform(-150, 150), random.uniform(-255, -205); h = Hs(x, z)
        if h < 1.5: continue
        tr = [(x, h, z), (x + .6, h + 4, z + .3), (x + 1.4, h + 7.5, z + .5)]; tube(f'palm{i}', tr, .22, mat('palm_bark', (.55, .45, .32), 0, .9), 2)
        leaf = vcol_mat('palm_leaf', .6); src = frond(f'pf{i}', 3.2, .4, 14, .1, leaf, droop=.5, col=(.2, .5, .15))
        for k in range(8): rot_copy(src, k / 8 * 6.283, .3, (x + 1.4, h + 7.5, z + .5), f'pf{i}_{k}')
        bpy.data.objects.remove(src, do_unlink=True)
    rock = vcol_mat('rock', .9)
    for i in range(140):   # reef rocks & drop-off boulders
        x, z = random.uniform(-150, 150), random.uniform(-170, 160); r = random.uniform(.8, 3.5) if z < 70 else random.uniform(3, 9)
        if any(math.hypot(x - dx, z - dz) < dr + 4 for dx, dz, dr in DOMES): continue
        o = ico(f'rk{i}', (x, Hs(x, z), z), r, rock, (1.3, .7, 1.1), sub=2)
        set_cols(o, lambda p, i: (.35, .3, .26) if random.random() < .5 else (.45, .4, .34))

# ================================================================== reef & creature props (instanced / cloned in Three)
def branch(name, base, dirv, length, r, depth, m, parts):
    if depth == 0 or length < .08: return
    end = (base[0] + dirv[0] * length, base[1] + dirv[1] * length, base[2] + dirv[2] * length)
    parts.append(tube(f'{name}{len(parts)}', [base, ((base[0] + end[0]) / 2, (base[1] + end[1]) / 2 + length * .05, (base[2] + end[2]) / 2), end], r, m, 1))
    for k in range(random.choice((2, 3))):
        a = random.uniform(0, 6.28); sp = random.uniform(.35, .7); d = (dirv[0] + math.cos(a) * sp, dirv[1] + .3, dirv[2] + math.sin(a) * sp); n = math.sqrt(sum(c * c for c in d))
        branch(name, end, tuple(c / n for c in d), length * random.uniform(.6, .78), r * .72, depth - 1, m, parts)
def colorize(o, a, b, axis=1, lo=0, hi=1):
    set_cols(o, lambda p, i: tuple(a[k] + (b[k] - a[k]) * min(1, max(0, (p[axis] - lo) / (hi - lo))) for k in range(3)))
def props():
    cor = vcol_mat('coral', .6)
    for nm, a, b in (('CoralPink', (.85, .25, .45), (1, .6, .75)), ('CoralPurple', (.45, .2, .75), (.75, .5, 1)), ('CoralOrange', (.95, .4, .12), (1, .75, .3))):
        parts = []; branch(nm, (0, 0, 0), (0, 1, 0), .55, .07, 5, cor, parts); bulk_convert(parts); objs = [bpy.data.objects[o.name] for o in parts]
        for o in objs: colorize(o, a, b, 1, 0, 1.4)
        keep(nm, objs, (0, 0, 0))
    br = sphere('brain', (0, .35, 0), .6, vcol_mat('brain', .7), (1, .6, 1), 32); colorize(br, (.75, .7, .25), (.95, .9, .5), 1, 0, .7); keep('BrainCoral', [br], (0, 0, 0))
    fv, ff = [], []   # sea fan: a flat lattice fan
    for i in range(14):
        for j in range(10):
            a = (i / 13 - .5) * 2.0; r = .15 + j * .13; fv.append((math.sin(a) * r, math.cos(a) * r * 1.1, (random.random() - .5) * .05))
    for i in range(13):
        for j in range(9): q = i * 10 + j; ff.append((q, q + 10, q + 11, q + 1))
    fo = mesh('fan', fv, ff, vcol_mat('coral', .6)); colorize(fo, (.6, .1, .35), (.95, .3, .55), 1, 0, 1.3); keep('SeaFan', [fo], (0, 0, 0))
    parts = []; sp = vcol_mat('sponge', .8)
    for k in range(5):
        a = k * 1.3; h = random.uniform(.5, 1.2); o = cyl(f'ts{k}', (math.cos(a) * .18, h / 2, math.sin(a) * .18), .09 + random.random() * .04, h, sp, verts=12, r2=.12)
        bm = bmesh.new(); bm.from_mesh(o.data); top = [f for f in bm.faces if f.normal.z > .9]; bmesh.ops.delete(bm, geom=top, context='FACES'); bm.to_mesh(o.data); bm.free()
        colorize(o, (.9, .45, .1), (1, .65, .25), 1, 0, 1.2); parts.append(o)
    keep('TubeSponge', parts, (0, 0, 0))
    parts = [sphere('an_b', (0, .12, 0), .2, vcol_mat('anemone', .6), (1, .7, 1), 12)]
    for k in range(26):
        a = random.uniform(0, 6.28); r = random.uniform(.03, .17); parts.append(tube(f'an{k}', [(math.cos(a) * r, .18, math.sin(a) * r), (math.cos(a) * r * 1.8, .45, math.sin(a) * r * 1.8), (math.cos(a) * r * 2.4, .62 + random.random() * .1, math.sin(a) * r * 2.4)], .02, vcol_mat('anemone', .6), 1))
    bulk_convert(parts[1:])
    for o in [bpy.data.objects[p.name] for p in parts]: colorize(o, (.2, .6, .45), (.8, .95, .6), 1, 0, .7)
    keep('Anemone', [bpy.data.objects[p.name] for p in parts], (0, 0, 0))
    kelp = vcol_mat('kelp', .7); parts = []
    for k in range(3):   # kelp: tall twisting ribbons with bladder floats
        h = random.uniform(7, 11); vs, fs = [], []
        for j in range(40):
            s = j / 39; y = s * h; w = .18 + .1 * math.sin(s * 9); tw = s * 4 + k
            vs += [(math.cos(tw) * w + k * .3, y, math.sin(tw) * w), (-math.cos(tw) * w + k * .3, y, -math.sin(tw) * w)]
            if j: a = 2 * j; fs.append((a - 2, a - 1, a + 1, a))
        o = mesh(f'kelp{k}', vs, fs, kelp); colorize(o, (.35, .3, .1), (.55, .55, .18), 1, 0, 10); parts.append(o)
    keep('Kelp', parts, (0, 0, 0))
    g = vcol_mat('kelp', .7); parts = []
    for k in range(14):
        a = random.uniform(0, 6.28); r = random.uniform(0, .25); h = random.uniform(.3, .7)
        o = mesh(f'sg{k}', [(math.cos(a) * r - .015, 0, math.sin(a) * r), (math.cos(a) * r + .015, 0, math.sin(a) * r), (math.cos(a) * r + .1, h, math.sin(a) * r + .05)], [(0, 1, 2)], g); colorize(o, (.2, .45, .15), (.45, .7, .25), 1, 0, .7); parts.append(o)
    keep('SeaGrass', parts, (0, 0, 0))
    r = ico('reefrock', (0, .2, 0), 1, vcol_mat('rock', .9), (1.3, .7, 1.1), sub=2); set_cols(r, lambda p, i: (.45, .4, .34) if random.random() < .5 else (.55, .35, .45)); keep('ReefRock', [r], (0, 0, 0))
    # ---- creatures (static lofts; swim motion in the vertex shader). All face +z.
    cr = vcol_mat('creature', .45)
    for nm, a, b, stripe in (('FishYellow', (1, .82, .1), (1, .9, .4), (.15, .3, .9)), ('FishBlue', (.15, .4, .95), (.5, .8, 1), (1, .85, .1)), ('FishOrange', (1, .45, .1), (1, .95, .9), (.98, .98, .98))):
        body = Piece(nm + '_b', [(0, 0, -.18), (0, 0, -.1), (0, 0, .05), (0, 0, .15), (0, 0, .2)], [(.01, .02), (.025, .06), (.04, .09), (.03, .06), (.008, .015)], [], lambda p, i, a=a, b=b, s=stripe: s if abs(math.sin(p.z * 40)) > .92 else (a if p.y > -.02 else b), ring=10, sub=3, m=cr)
        tail = mesh(nm + '_t', [(0, 0, -.16), (0, .08, -.27), (0, -.08, -.27)], [(0, 1, 2)], cr); plain_cols(tail, a)
        fin = mesh(nm + '_f', [(0, .07, -.05), (0, .12, -.1), (0, .06, .08)], [(0, 1, 2)], cr); plain_cols(fin, a)
        keep(nm, [body.o, tail, fin], (0, 0, 0))
    wh = vcol_mat('whale', .55)
    body = Piece('wh_b', [(0, 0, -7), (0, .1, -5), (0, .3, -2), (0, .4, 1), (0, .3, 3.5), (0, 0, 5.6), (0, -.3, 6.4)], [(.15, .2), (.6, .7), (1.3, 1.4), (1.7, 1.6, -.1), (1.6, 1.4, -.2), (1.1, .9, -.2), (.5, .45, -.1)], [],
                 lambda p, i: (.15, .17, .2) if p.y > -.2 else (.85, .86, .88), ring=18, sub=4, m=wh)
    parts = [body.o]
    for sd in (1, -1):
        fin = Piece(f'wh_p{sd}', [(sd * 1.3, -.5, 2.6), (sd * 3.2, -1.4, 1.2), (sd * 5.0, -2.2, -.2)], [(.5, .12), (.38, .09), (.12, .04)], [], lambda p, i: (.85, .86, .88), ring=8, m=wh); parts.append(fin.o)
        fl = mesh(f'wh_f{sd}', [(0, 0, -6.8), (sd * 2.6, .1, -8.2), (sd * 1.2, 0, -7.4)], [(0, 1, 2)], wh); plain_cols(fl, (.15, .17, .2)); parts.append(fl)
    keep('Whale', parts, (0, 0, 0))
    sh = vcol_mat('shell', .5)
    shell = sphere('tu_s', (0, 0, 0), .5, sh, (1, .38, 1.25), 24); set_cols(shell, lambda p, i: (.35, .28, .12) if (int(p[0] * 6) + int(p[2] * 6)) % 2 else (.5, .4, .18))
    parts = [shell, sphere('tu_h', (0, .02, .72), .16, sh, (1, .9, 1.3), 12)]; plain_cols(parts[1], (.55, .55, .4))
    for sd in (1, -1):
        for fz, ln in ((.35, .7), (-.4, .35)):
            f = mesh(f'tu_fl{sd}{fz}', [(sd * .35, 0, fz + .1), (sd * (.35 + ln), -.02, fz - .1), (sd * (.35 + ln * .6), 0, fz - .25), (sd * .35, 0, fz - .1)], [(0, 1, 2, 3)], sh); plain_cols(f, (.55, .55, .4)); parts.append(f)
    keep('Turtle', parts, (0, 0, 0))
    jm = mat('jelly', (.6, .4, 1), 0, .3, (.55, .35, 1), 2.5); bell = sphere('je_b', (0, 0, 0), .5, jm, (1, .7, 1), 24)
    bm = bmesh.new(); bm.from_mesh(bell.data); bmesh.ops.delete(bm, geom=[v for v in bm.verts if v.co.z < -.05], context='VERTS'); bm.to_mesh(bell.data); bm.free()
    parts = [bell] + [tube(f'je_t{k}', [(math.cos(k * .9) * .3, 0, math.sin(k * .9) * .3), (math.cos(k * .9) * .25, -.8, math.sin(k * .9) * .25), (math.cos(k * .9 + .3) * .2, -1.7, math.sin(k * .9 + .3) * .2)], .012, jm, 1) for k in range(7)]
    parts += [tube(f'je_a{k}', [(math.cos(k * 1.6) * .08, 0, math.sin(k * 1.6) * .08), (math.cos(k * 1.6) * .12, -.6, math.sin(k * 1.6) * .12), (math.cos(k * 1.6) * .05, -1.1, math.sin(k * 1.6) * .05)], .05, jm, 1) for k in range(4)]
    keep('Jelly', parts, (0, 0, 0))
    mm = vcol_mat('creature', .45)
    vs = [(0, 0, 1.2), (2.4, .05, -.2), (.4, 0, -.5), (0, 0, -1.6), (-.4, 0, -.5), (-2.4, .05, -.2), (0, .25, .3)]
    ma = mesh('manta', vs, [(0, 1, 6), (1, 2, 6), (2, 3, 6), (3, 4, 6), (4, 5, 6), (5, 0, 6), (0, 5, 4, 3, 2, 1)], mm); set_cols(ma, lambda p, i: (.12, .13, .16) if p[1] > .01 else (.9, .9, .9))
    keep('Manta', [ma], (0, 0, 0))
    bubble = sphere('bubble', (0, 0, 0), .05, mat('bubble', (.9, .95, 1), 0, .1), (1, 1, 1), 8); keep('Bubble', [bubble], (0, 0, 0))

def veg_json():
    out = {k: [] for k in ('CoralPink', 'CoralPurple', 'CoralOrange', 'BrainCoral', 'SeaFan', 'TubeSponge', 'Anemone', 'Kelp', 'SeaGrass', 'ReefRock')}
    def ok(x, z, r):
        if any(math.hypot(x - dx, z - dz) < dr + 1.5 + r for dx, dz, dr in DOMES): return False
        return Hs(x, z) < -3
    U = random.uniform
    def put(k, n, zone, rad, sc):
        c = 0
        for _ in range(n * 30):
            if c >= n: break
            x, z = zone()
            if not ok(x, z, rad): continue
            out[k].append([round(x, 2), round(Hs(x, z), 2), round(z, 2), round(U(*sc), 2), round(U(0, 6.28), 2)]); c += 1
    for k, n, sc in (('CoralPink', 420, (.8, 2.2)), ('CoralPurple', 380, (.8, 2.2)), ('CoralOrange', 300, (.7, 1.8)), ('BrainCoral', 260, (.6, 2.0)), ('SeaFan', 260, (.8, 2.0)), ('TubeSponge', 240, (.7, 1.8)), ('Anemone', 300, (.8, 1.6)), ('SeaGrass', 900, (.8, 1.6)), ('ReefRock', 200, (.5, 2.2))):
        put(k, n, lambda: (U(-120, 120), U(-170, 80)), .8, sc)
    put('Kelp', 160, lambda: (U(20, 90), U(-10, 70)), .5, (.8, 1.3))          # kelp garden under the surface homes
    put('Kelp', 90, lambda: (U(-110, 110), U(-165, 60)), .5, (.7, 1.2))
    (OUT / 'veg.json').write_text(json.dumps(out, separators=(',', ':')))

reset(); seabed(); city(); export_world('world.glb')
reset(); props(); export_world('props.glb'); veg_json()
print('ALL ASSETS DONE')
