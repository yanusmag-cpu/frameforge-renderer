"""FrameForge — "What if you were the size of an ant?" An ordinary bedroom built at ant scale (1 unit = 1 m for a 5 mm person: real × 350).
Run: blender -b --factory-startup -P scripts/ant/build-assets.py
  → public/ant/world.glb   floor (rug + boards), walls, window, open door, bed, nightstand + lamp, sofa with wooden legs, bookshelf, crumbs, dust
  → public/ant/props.glb   carpet tuft (instanced), crumb, droplet, dust bunny, hair strand, shoe, vacuum floor-head, sugar grain
  → public/ant/bugs.glb    skinned wood ant and house spider (bones posed procedurally in Three)
  → public/ant/tufts.json  instanced carpet fibres around the action
Three units, y up, floor y=0. Room x -700..700, z -875..875, walls 875 high. Sofa x 0..700, z 220..535, underside 35 high.
"""
import bpy, bmesh, math, random, json
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'public/ant'; OUT.mkdir(parents=True, exist_ok=True)
random.seed(5)
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


SMOOTH = {'crumb', 'crust', 'droplet', 'fabric_sofa', 'cushion', 'wood_leg', 'bug_shell', 'spider', 'pillow', 'duvet', 'lamp_shade', 'shoe_upper', 'vac_body', 'dust', 'sugar'}
def rbox(name, a, b, m, bevel=.04):   # rounded box from corner a to corner b (Three coords)
    o = span(name, a, b, m, bevel=min(abs(b[i] - a[i]) for i in range(3)) * bevel); return o
# ================================================================== the room
def room():
    wall = mat('wall_paint', (.93, .88, .8), 0, .9); base = mat('baseboard', (.95, .95, .93), 0, .5); wood = mat('wood_floor', (.62, .44, .28), 0, .45)
    rug = mat('carpet_floor', (.78, .72, .62), 0, 1); dark = mat('wood_dark', (.35, .22, .14), 0, .5)
    span('floor', (-700, -1, -875), (700, 0, 875), wood, 0)
    span('rug', (-420, 0, -560), (680, .6, 560), rug, 0)
    for nm, a, b in (('wall_back', (-700, 0, -880), (700, 875, -875)), ('wall_left', (-705, 0, -875), (-700, 875, 875)), ('wall_right', (700, 0, -875), (705, 875, 875)), ('wall_front', (-700, 0, 875), (700, 875, 880))):
        span(nm, a, b, wall, 0)
    for nm, a, b in (('bb_back', (-700, 0, -875), (700, 35, -868)), ('bb_left', (-700, 0, -875), (-693, 35, 875)), ('bb_right_a', (693, 0, -875), (700, 35, 280)), ('bb_right_b', (693, 0, 600), (700, 35, 875))):
        span(nm, a, b, base, 0)
    # window in the back wall: bright panes + frame + sill (sunlight source)
    glow = mat('window_light', (1, .95, .85), 0, .3, (1, .93, .8), 3.5); frame = mat('window_frame', (.96, .96, .95), 0, .4)
    span('window', (-250, 300, -876), (250, 750, -874), glow, 0)
    for x in (-250, 0, 250): span(f'wf{x}', (x - 8, 300, -873), (x + 8, 750, -866), frame, 0)
    for y in (300, 525, 750): span(f'wh{y}', (-258, y - 8, -873), (258, y + 8, -866), frame, 0)
    span('sill', (-280, 285, -875), (280, 300, -830), frame, 0)
    # door on the right wall, half open: warm hallway light through the gap
    span('door_gap', (701, 0, 285), (703, 735, 600), mat('hall_light', (1, .92, .78), 0, .3, (1, .88, .7), 2.6), 0)
    door = span('door', (550, 0, 590), (560, 730, 905), mat('door_paint', (.95, .94, .9), 0, .5), 0); door.rotation_euler = (0, 0, 0)
    span('door_frame_a', (690, 0, 270), (705, 750, 285), frame, 0); span('door_frame_b', (690, 0, 600), (705, 750, 615), frame, 0); span('door_frame_t', (690, 735, 270), (705, 750, 615), frame, 0)
    # bed (back-left), duvet + pillows
    span('bed_base', (-690, 0, -870), (-170, 160, -160), dark, 0); duv = mat('duvet', (.78, .82, .9), 0, .95)
    ico('duvet', (-430, 230, -500), 1, duv, (270, 70, 360), sub=3); ico('pillow1', (-560, 300, -780), 1, mat('pillow', (.97, .96, .94), 0, .95), (100, 40, 60), sub=3); ico('pillow2', (-320, 300, -780), 1, mat('pillow', (.97, .96, .94), 0, .95), (100, 40, 60), sub=3)
    # nightstand + lamp
    span('night', (-150, 0, -860), (60, 210, -700), dark, 0); cyl('lamp_base', (-50, 260, -780), 30, 100, mat('lamp_metal', (.75, .6, .35), .9, .3), verts=24, r2=18)
    cyl('lamp_shade', (-50, 380, -780), 90, 130, mat('lamp_shade', (1, .93, .78), 0, .6, (1, .85, .6), 1.2), verts=32, r2=60)
    # bookshelf (left wall)
    span('shelf', (-700, 0, 120), (-560, 640, 560), dark, 0)
    for k, y in enumerate((150, 300, 450)):
        span(f'shelfboard{k}', (-700, y, 120), (-560, y + 12, 560), dark, 0)
        x0 = 130
        while x0 < 540:
            w = random.uniform(10, 26); h = random.uniform(90, 135); span(f'book{k}_{x0:.0f}', (-690, y + 12, x0), (-580, y + 12 + h, x0 + w), mat(f'book{random.randint(0, 5)}', random.choice([(.6, .15, .12), (.15, .3, .55), (.85, .7, .3), (.2, .45, .3), (.9, .9, .85), (.35, .2, .4)]), 0, .7), 0); x0 += w + 1.5
    # sofa: wooden legs (35 high), fabric base, seat cushions, back, arms
    fab = mat('fabric_sofa', (.62, .55, .45), 0, .95); cus = mat('cushion', (.66, .58, .48), 0, .95); leg = mat('wood_leg', (.45, .27, .14), 0, .4)
    for x, z in ((25, 245), (675, 245), (25, 510), (675, 510), (350, 245), (350, 510)):
        cyl(f'sofa_leg{x}_{z}', (x, 17.5, z), 7, 35, leg, verts=24, r2=5.2)
    rbox('sofa_base', (0, 35, 220), (700, 150, 535), fab, .12); rbox('sofa_back', (0, 150, 420), (700, 330, 535), fab, .1)
    rbox('sofa_armL', (-40, 35, 220), (40, 240, 535), fab, .2); rbox('sofa_armR', (660, 35, 220), (740, 240, 535), fab, .2)
    rbox('cushion1', (40, 150, 225), (350, 205, 430), cus, .3); rbox('cushion2', (350, 150, 225), (660, 205, 430), cus, .3)
    rbox('backcush1', (40, 190, 380), (350, 320, 440), cus, .3); rbox('backcush2', (350, 190, 380), (660, 320, 440), cus, .3)
    # the crumb the hero climbs + scattered crumbs, grains and dust under/near the sofa
    cr = vcol_mat('crumb', .95)
    def crumb(name, p, r):
        o = ico(name, p, r, cr, (1.1, .8, 1), sub=3)
        for v in o.data.vertices: v.co *= 1 + random.uniform(-.1, .1)
        set_cols(o, lambda q, i: (.92, .78, .52) if random.random() < .7 else (.62, .38, .16)); return o
    crumb('hero_crumb', (128, 1.0, 64), 2.2)
    for k in range(70):
        x, z = random.uniform(-60, 240), random.uniform(-60, 320); r = random.uniform(.15, .7); crumb(f'cr{k}', (x, r * .6, z), r)
    dust = mat('dust', (.75, .72, .68), 0, 1)
    for k in range(40):   # dust bunnies under the sofa
        x, z = random.uniform(30, 650), random.uniform(250, 500); o = ico(f'dust{k}', (x, 2, z), random.uniform(2, 6), dust, (1.3, .6, 1.1), sub=2)
    hair = mat('hair', (.18, .12, .08), 0, .5)
    for k in range(10):
        x, z = random.uniform(-40, 200), random.uniform(-40, 300); a = random.uniform(0, 6.28); pts = [(x + math.cos(a) * s * 6 + math.sin(s * 3) * 2, .4 + .3 * math.sin(s * 2), z + math.sin(a) * s * 6) for s in [i / 6 for i in range(0, 43)]]
        tube(f'hair{k}', pts[::3], .06, hair, 1)

# ================================================================== props
def props():
    fib = vcol_mat('fiber', .9); parts = []
    for k in range(12):   # one tuft: a twisted bundle of fine curly strands, splaying at the tips
        a = k / 12 * 6.283 + random.uniform(-.3, .3); r0 = random.uniform(.03, .16); h = random.uniform(2.4, 3.6); ph = random.uniform(0, 6.28); pts = []
        for j in range(5):
            s_ = j / 4; tw = s_ * 3.2 + a; rr = r0 + s_ * s_ * .42; pts.append((math.cos(tw) * rr + math.sin(s_ * 5 + ph) * .06, h * s_, math.sin(tw) * rr + math.cos(s_ * 5 + ph) * .06))
        parts.append(tube(f'fs{k}', pts, .042, fib, 0))
    bulk_convert(parts); objs = [bpy.data.objects[p.name] for p in parts]
    for o in objs:
        tint = random.uniform(.85, 1.08); set_cols(o, lambda p, i: ((.55 + p[1] * .1) * tint, (.47 + p[1] * .09) * tint, (.36 + p[1] * .08) * tint))
    keep('Tuft', objs, (0, 0, 0))
    cr = vcol_mat('crumb', .95); c = ico('crumbp', (0, .6, 0), 1, cr, (1.1, .8, 1), sub=3); set_cols(c, lambda q, i: (.92, .78, .52) if random.random() < .7 else (.62, .38, .16)); keep('Crumb', [c], (0, 0, 0))
    d = sphere('drop', (0, 0, 0), 1, mat('droplet', (.9, .95, 1), 0, .02), (1, .78, 1), 48)
    for v in d.data.vertices:
        if v.co.z < 0: v.co.z *= .08    # flattened contact patch: a sessile droplet
    keep('Droplet', [d], (0, 0, 0))
    s = ico('sugar', (0, .5, 0), .6, mat('sugar', (.97, .97, .98), 0, .15), (1, 1, 1), sub=1); keep('Sugar', [s], (0, 0, 0))
    # shoe (real 30 cm → 105 long): sole with deep tread, canvas upper, laces; origin at the sole centre
    sole = mat('shoe_sole', (.93, .92, .9), 0, .8); up = mat('shoe_upper', (.16, .28, .55), 0, .85); lace = mat('lace', (.97, .97, .97), 0, .7)
    parts = [rbox('sole', (-19, 0, -52), (19, 9, 52), sole, .3)]
    for k in range(18): parts.append(span(f'tread{k}', (-17, -2.2, -48 + k * 5.6), (17, 0, -46 + k * 5.6), sole, 0))
    parts.append(ico('upper', (0, 24, -5), 1, up, (17, 18, 46), sub=3)); parts.append(ico('toecap', (0, 15, 38), 1, sole, (16, 9, 14), sub=2))
    for k in range(6): parts.append(tube(f'lace{k}', [(-9, 37 - k * 1.2, 8 + k * 5), (0, 39 - k * 1.2, 8.5 + k * 5), (9, 37 - k * 1.2, 8 + k * 5)], .9, lace, 1))
    keep('Shoe', parts, (0, 0, 0))
    # vacuum floor-head (real 30 cm wide → 105): body, red brush roll, bristles, wheels, neck + hose going up out of frame; faces -x (approaching)
    body = mat('vac_body', (.12, .12, .14), .3, .35); red = mat('vac_red', (.75, .08, .07), .2, .4); bris = mat('brush', (.15, .15, .17), 0, .9)
    parts = [rbox('vac_shell', (-20, 4, -52), (22, 24, 52), body, .25), rbox('vac_top', (-14, 22, -42), (18, 30, 42), red, .3)]
    parts.append(cyl('vac_roll', (-17, 7, 0), 6, 100, red, axis='z', verts=24))
    for k in range(60): parts.append(span(f'bris{k}', (-25, 0, -50 + k * 1.68), (-14, 7, -49.4 + k * 1.68), bris, 0))
    for z in (-46, 46): parts.append(cyl(f'vac_wheel{z}', (14, 4.5, z), 4.5, 4, body, axis='z', verts=20))
    parts.append(cyl('vac_neck', (14, 45, 0), 7, 40, body, verts=20)); parts.append(cyl('vac_tube', (30, 300, 0), 6, 520, mat('vac_metal', (.75, .76, .78), .9, .25), verts=20))
    for o in parts: o.rotation_euler = o.rotation_euler   # noqa
    keep('Vacuum', parts, (0, 0, 0))

# ================================================================== bugs: lofted chitin + hair cards, skinned to procedurally posed armatures
def ant(prefix='ant'):
    s = lambda b: prefix + '_' + b
    bones = [('body', (0, .55, -.25), (0, .58, .3), None), ('head', (0, .62, .32), (0, .66, .75), 'body'), ('gaster', (0, .55, -.3), (0, .5, -1.05), 'body'),
             ('mandL', (.08, .55, .72), (.05, .5, .9), 'head'), ('mandR', (-.08, .55, .72), (-.05, .5, .9), 'head'),
             ('antL1', (.06, .8, .62), (.22, 1.15, .78), 'head'), ('antL2', (.22, 1.15, .78), (.32, 1.0, 1.3), 'antL1'), ('antR1', (-.06, .8, .62), (-.22, 1.15, .78), 'head'), ('antR2', (-.22, 1.15, .78), (-.32, 1.0, 1.3), 'antR1')]
    for k, z in enumerate((.2, 0, -.18)):
        for sd, n in ((1, 'L'), (-1, 'R')):
            bones += [(f'fem{n}{k}', (sd * .1, .52, z), (sd * .55, .82, z + (.25 - k * .25)), 'body'), (f'tib{n}{k}', (sd * .55, .82, z + (.25 - k * .25)), (sd * 1.05, .02, z + (.45 - k * .45)), f'fem{n}{k}')]
    ob, B = armature(prefix, bones)
    m = vcol_mat('bug_shell', .25); red, blk, dk = (.55, .14, .06), (.06, .05, .05), (.25, .07, .03)
    def col(p, i): return blk if p.z < -.3 or p.z > .35 else red
    body = Piece(prefix + '_body', [(0, .52, -1.1), (0, .58, -.75), (0, .55, -.38), (0, .53, -.3), (0, .58, -.05), (0, .6, .22), (0, .6, .3), (0, .64, .38), (0, .66, .55), (0, .6, .75)],
                 [(.03, .03), (.3, .28), (.25, .23), (.06, .06), (.13, .14), (.11, .13), (.05, .05), (.16, .15), (.18, .16), (.1, .09)], [s('body'), s('head'), s('gaster')], col, ring=14, m=m)
    parts = [(body.o, B, body.bones, None)]
    for sd, n in ((1, 'L'), (-1, 'R')):
        e = sphere(f'{prefix}_eye{n}', (sd * .15, .7, .55), .07, mat('bug_eye', (.02, .02, .03), .2, .05), (1, 1.3, 1), 12); parts.append((e, B, [s('head')], None))
        md = Piece(f'{prefix}_mand{n}', [(sd * .09, .56, .7), (sd * .08, .53, .82), (sd * .02, .5, .92)], [(.035, .03), (.03, .02), (.008, .008)], [s('mand' + n)], lambda p, i: dk, ring=6, sub=3, m=m); parts.append((md.o, B, md.bones, None))
        a1, a2, a3 = B[s('ant' + n + '1')][0], B[s('ant' + n + '2')][0], B[s('ant' + n + '2')][1]
        an = Piece(f'{prefix}_ant{n}', [tuple(a1), tuple(a2), tuple(a3)], [(.025, .025), (.022, .022), (.03, .03)], [s('ant' + n + '1'), s('ant' + n + '2')], lambda p, i: blk, ring=6, m=m); parts.append((an.o, B, an.bones, None))
        for k in range(3):
            f0, f1, f2 = B[s(f'fem{n}{k}')][0], B[s(f'tib{n}{k}')][0], B[s(f'tib{n}{k}')][1]
            lg = Piece(f'{prefix}_leg{n}{k}', [tuple(f0), tuple(f1), tuple((f1 + f2) * .5), tuple(f2)], [(.045, .045), (.035, .035), (.025, .025), (.012, .012)], [s(f'fem{n}{k}'), s(f'tib{n}{k}')], lambda p, i: dk if p.y > .5 else blk, ring=6, m=m)
            parts.append((lg.o, B, lg.bones, None))
    spec = []   # fine bristles on the gaster
    for ring in body.rings:
        c, t, sv, u, rx, ry, idx = ring
        if c.z < -.4:
            for _ in range(14):
                a = random.uniform(0, 6.283); nrm = sv * math.cos(a) + u * math.sin(a); root = c + sv * math.cos(a) * rx + u * math.sin(a) * ry
                d = (nrm + -t * .6).normalized(); spec.append((tuple(root), tuple(d), tuple(nrm.cross(d).normalized()), .07, .01, (.35, .3, .25), [s('gaster')]))
    fo, roots = cards(prefix + '_hair', spec, vcol_mat('bug_hair', .8)); parts.append((fo, B, None, roots))
    bind(ob, parts, prefix + '_mesh')

def spider(prefix='spider'):
    """house spider: body ~3.5 long, legs ~8 long each (real ≈ 5 cm leg span)"""
    s = lambda b: prefix + '_' + b
    bones = [('ceph', (0, 2.4, -.2), (0, 2.5, .9), None), ('abd', (0, 2.45, -.3), (0, 2.6, -2.4), 'ceph'), ('chelL', (.2, 2.3, .95), (.15, 1.8, 1.15), 'ceph'), ('chelR', (-.2, 2.3, .95), (-.15, 1.8, 1.15), 'ceph'),
             ('palpL', (.3, 2.3, .9), (.6, 2.1, 1.7), 'ceph'), ('palpR', (-.3, 2.3, .9), (-.6, 2.1, 1.7), 'ceph')]
    for k, (z, ang) in enumerate(((.65, .55), (.3, .2), (-.05, -.2), (-.35, -.6))):
        for sd, n in ((1, 'L'), (-1, 'R')):
            dx, dz = math.cos(ang) * sd, math.sin(ang)
            p0 = (sd * .45, 2.35, z); p1 = (p0[0] + dx * 2.6, 4.4, z + dz * 2.6); p2 = (p0[0] + dx * 5.2, 2.0, z + dz * 5.2); p3 = (p0[0] + dx * 6.6, 0.02, z + dz * 6.6)
            bones += [(f'fem{n}{k}', p0, p1, 'ceph'), (f'tib{n}{k}', p1, p2, f'fem{n}{k}'), (f'tar{n}{k}', p2, p3, f'tib{n}{k}')]
    ob, B = armature(prefix, bones)
    m = vcol_mat('spider', .6); base, light, dark = (.36, .27, .18), (.62, .5, .34), (.12, .09, .07)
    def col(p, i): return light if (abs(p.x) < .18 and p.y > 2.6) or math.sin(p.z * 6) > .75 else (dark if p.y < 2.25 else base)
    body = Piece(prefix + '_body', [(0, 2.6, -2.6), (0, 2.65, -1.9), (0, 2.6, -1.0), (0, 2.45, -.32), (0, 2.42, -.15), (0, 2.5, .2), (0, 2.5, .65), (0, 2.42, .98)],
                 [(.06, .06), (1.35, 1.2), (1.4, 1.25), (.35, .3), (.55, .4), (1.0, .65), (.8, .6), (.32, .26)], [s('ceph'), s('abd')], col, ring=16, m=m)
    parts = [(body.o, B, body.bones, None)]
    for k in range(8):   # eye cluster
        x = (k % 4 - 1.5) * .12; y = 2.85 + (k // 4) * .12 - abs(x) * .3; parts.append((sphere(f'{prefix}_e{k}', (x, y, .82 - (k // 4) * .08), .06 + (.03 if k in (1, 2) else 0), mat('spider_eye', (.02, .02, .03), .4, .02), (1, 1, 1), 10), B, [s('ceph')], None))
    for sd, n in ((1, 'L'), (-1, 'R')):
        ch = Piece(f'{prefix}_chel{n}', [tuple(B[s('chel' + n)][0]), tuple(B[s('chel' + n)][1])], [(.16, .16), (.05, .05)], [s('chel' + n)], lambda p, i: dark, ring=8, m=m); parts.append((ch.o, B, ch.bones, None))
        pa = Piece(f'{prefix}_palp{n}', [tuple(B[s('palp' + n)][0]), tuple((B[s('palp' + n)][0] + B[s('palp' + n)][1]) * .5 + V(0, .2, 0)), tuple(B[s('palp' + n)][1])], [(.07, .07), (.06, .06), (.09, .09)], [s('palp' + n)], col, ring=8, m=m); parts.append((pa.o, B, pa.bones, None))
        for k in range(4):
            a, b_, c_, d_ = B[s(f'fem{n}{k}')][0], B[s(f'tib{n}{k}')][0], B[s(f'tar{n}{k}')][0], B[s(f'tar{n}{k}')][1]
            lg = Piece(f'{prefix}_leg{n}{k}', [tuple(a), tuple(b_), tuple(c_), tuple(d_)], [(.3, .3), (.24, .24), (.15, .15), (.06, .06)], [s(f'fem{n}{k}'), s(f'tib{n}{k}'), s(f'tar{n}{k}')], lambda p, i: light if (int(p.y * 3) % 2) else base, ring=8, sub=6, m=m)
            parts.append((lg.o, B, lg.bones, None))
    spec = []   # hair: dense on the abdomen, bristly spines on the legs
    for ring in body.rings:
        c, t, sv, u, rx, ry, idx = ring
        for _ in range(40 if c.z < -.3 else 18):
            a = random.uniform(0, 6.283); nrm = sv * math.cos(a) + u * math.sin(a); root = c + sv * math.cos(a) * rx + u * math.sin(a) * ry
            d = (nrm * .7 - t * .7).normalized(); spec.append((tuple(root), tuple(d), tuple(nrm.cross(d).normalized()), random.uniform(.18, .34), .06, random.choice([base, light, dark, dark]), [s('abd') if c.z < -.3 else s('ceph')]))
    for sd, n in ((1, 'L'), (-1, 'R')):
        for k in range(4):
            for seg, bn in ((('fem', 'tib')), ('tib', 'tar')):
                a, b_ = B[s(f'{seg}{n}{k}')][0], B[s(f'{seg}{n}{k}')][1]
                for j in range(22):
                    q = a + (b_ - a) * (j / 21); d = (V(random.uniform(-1, 1), random.uniform(.3, 1), random.uniform(-1, 1))).normalized()
                    spec.append((tuple(q), tuple(d), tuple(d.cross(V(0, 1, 0)).normalized() if abs(d.y) < .95 else V(1, 0, 0)), random.uniform(.18, .35), .03, dark, [s(f'{seg}{n}{k}')]))
    fo, roots = cards(prefix + '_hair', spec, vcol_mat('bug_hair', .8)); parts.append((fo, B, None, roots))
    bind(ob, parts, prefix + '_mesh')

CLEAR = [(0, 0, 0, 0, 3.2), (1.6, 3.2, 3.4, 8, 1.8), (2, 1, 16, -6, 1.6), (-.6, 4.4, 13.4, -2.6, 1.7), (17, -2.5, 24, -9, 2.4), (22.4, -9.2, 22.4, -9.2, 2.8), (33, -15, 24.6, -9.6, 1.9),
         (20.4, -4.8, 23.5, -7, 1.6), (24.6, -9.6, 31, -12, 1.7), (19, -3.5, 19, -3.5, 1.6), (25, -10, 25, -10, 2.4), (40, 26, 40, 26, 3.2), (35, 19, 36.5, 20.5, 2.2), (38, 24, 60, 236, 2.2), (33, 13, 55, 225, 2.2),
         (124.5, 64, 128, 64, 3.6), (119, 66.5, 119, 66.5, 1.9), (124, 66, 124, 66, 1.6), (120, 58, 120, 58, 2.2), (124, 52, 124, 52, 2.6), (128, 64.5, 139, 69, 2.3), (124, 66, 135, 72, 1.7),
         (136.4, 72.4, 136.7, 72.1, 1.6), (139, 69, 115, 61, 2.3), (130, 66.5, 106, 58.5, 2.1)]
def seg_d(x, z, ax, az, bx, bz):
    dx, dz = bx - ax, bz - az; L2 = dx * dx + dz * dz; k = 0 if L2 == 0 else max(0, min(1, ((x - ax) * dx + (z - az) * dz) / L2)); return math.hypot(x - ax - dx * k, z - az - dz * k)
def tufts_json():
    out = []
    zones = [((0, 0), 22, 1.25), ((25, -10), 20, 1.3), ((60, 40), 24, 1.5), ((95, 150), 26, 1.7), ((100, 230), 18, 1.9), ((128, 64), 18, 1.3), ((150, 68), 30, 1.5)]
    seen = set()
    for (cx, cz), r, step in zones:
        n = int(r / step)
        for i in range(-n, n + 1):
            for j in range(-n, n + 1):
                x = cx + i * step + random.uniform(-.45, .45) * step; z = cz + j * step + random.uniform(-.45, .45) * step
                if math.hypot(x - cx, z - cz) > r: continue
                key = (round(x / step), round(z / step))
                if key in seen: continue
                if any(seg_d(x, z, *c[:4]) < c[4] for c in CLEAR): continue
                seen.add(key); out.append([round(x, 2), 0, round(z, 2), round(random.uniform(.75, 1.25), 2), round(random.uniform(0, 6.28), 2)])
    (OUT / 'tufts.json').write_text(json.dumps({'Tuft': out}, separators=(',', ':'))); print('tufts', len(out))

reset(); room(); export_world('world.glb')
reset(); props(); export_world('props.glb'); tufts_json()
reset(); random.seed(9); ant(); spider()
export_glb('bugs.glb', lambda o: o.type in ('MESH', 'ARMATURE'))
print('ALL ASSETS DONE')
