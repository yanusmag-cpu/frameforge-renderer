"""FrameForge — Lake Nyos (Cameroon, 1986). Original Blender world: crater lake, rim, the valley the CO2 followed, a grassland village and the hero house.
Run: blender -b --factory-startup -P scripts/nyos/build-assets.py   →  public/nyos/world.glb, props.glb, veg.json
Three.js metres (x right, y up, z toward camera). Lake centre (0,0), surface y=20; the village sits in the valley basin around (-16, 4, 262).
The terrain height function is mirrored exactly in src/nyos/terrain.ts. Vegetation is exported as instance lists (veg.json) and instanced in Three.
"""
import bpy, bmesh, math, random, json
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'public/nyos'; OUT.mkdir(parents=True, exist_ok=True)
random.seed(1986)
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
def export(name):
    bulk_convert(list(bpy.context.scene.objects))
    for o in bpy.context.scene.objects:
        if o.type == 'MESH': world_uv(o)
    by = {}
    for o in bpy.context.scene.objects:
        if o.type == 'MESH' and o.data.materials and not o.name.startswith('KEEP'):
            pre = 'FRONT ' if o.name.startswith('FRONT') else ''
            by.setdefault(pre + o.data.materials[0].name, []).append(o)
    for mname, objs in by.items():
        if len(objs) > 1:
            bpy.ops.object.select_all(action='DESELECT')
            for o in objs: o.select_set(True)
            bpy.context.view_layer.objects.active = objs[0]; bpy.ops.object.join()
        objs[0].name = mname
    bpy.ops.export_scene.gltf(filepath=str(OUT / name), export_format='GLB', export_apply=True, export_yup=True, export_materials='EXPORT', export_cameras=False, export_lights=False)
    print('exported', name)

# ------------------------------------------------------------------ materials

# ================================================================== shared terrain (mirrored exactly in src/nyos/terrain.ts)
WL = 20.0          # lake surface height
def smooth(a, b, x):
    t = min(1.0, max(0.0, (x - a) / (b - a))); return t * t * (3 - 2 * t)
def mixf(a, b, t): return a + (b - a) * t
def valley_x(z): return 16.0 * math.sin(z / 47.0) - 6.0 * math.sin(z / 19.0) * smooth(150, 230, z)
def H(x, z):
    r = math.hypot(x, z); ang = math.atan2(z, x)
    if r < 92: base = WL - 27.0 * (1 - (r / 92.0) ** 2) ** .85
    elif r < 128: base = WL + 27.0 * smooth(92, 128, r)
    else: base = 47.0 - 27.0 * (1 - math.exp(-(r - 128) / 85.0))
    rimb = math.exp(-((r - 120) / 26.0) ** 2)
    base += (math.sin(ang * 5 + .4) * 3.2 + math.sin(ang * 11 + 1.0) * 1.6) * rimb
    base += 75.0 * smooth(250, 400, r) * (.55 + .45 * math.sin(ang * 3 + .5)) + 22.0 * smooth(170, 330, r) * (.5 + .5 * math.sin(ang * 7 - .7))
    n = (1.4 * math.sin(x * .093 + z * .061) + .9 * math.sin(x * .047 - z * .121) + .5 * math.sin(x * .21 + z * .17)) * smooth(88, 104, r)
    base += n
    # the valley the gas followed: a notch in the rim (+z) opening into a broad basin where the village sits
    w = mixf(13.0, 68.0, smooth(118, 235, z)); g = math.exp(-((x - valley_x(z)) / w) ** 2) * smooth(84, 112, z)
    target = mixf(WL + 2.2, 3.0, smooth(112, 238, z)) + .7 * math.sin(x * .13) * smooth(200, 240, z) + .5 * math.sin(z * .2 + x * .05)
    return mixf(base, target, g)

def ico(name, p, r, m, sc=(1, 1, 1), sub=1, jit=.12):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=sub, radius=r, location=L(*p))
    o = bpy.context.object; o.name = name; o.scale = (sc[0], sc[2], sc[1]); bpy.ops.object.transform_apply(scale=True, location=False, rotation=False)
    for v in o.data.vertices: v.co *= 1 + random.uniform(-jit, jit)
    return finish(o, m)

# ================================================================== materials (names drive the Three-side detail textures)
turf = mat('turf', (.36, .52, .2), 0, 1); turfD = mat('turf_dark', (.24, .4, .16), 0, 1); rock = mat('stone', (.42, .4, .37), 0, .95); dirt = mat('dirt', (.55, .36, .2), 0, 1)
bed = mat('earth', (.3, .24, .18), 0, 1); sand = mat('sand_shore', (.58, .5, .38), 0, 1)
mud = mat('plaster_mud', (.62, .4, .25), 0, .95); mudL = mat('plaster_mud_light', (.74, .55, .38), 0, .95); mudR = mat('plaster_mud_red', (.56, .3, .2), 0, .95)
whiteW = mat('plaster_white', (.88, .85, .78), 0, .9); thatch = mat('thatch', (.62, .5, .3), 0, 1); roofM = mat('roof_metal', (.55, .55, .55), .6, .45); rust = mat('roof_rust', (.5, .3, .2), .4, .7)
wood = mat('wood', (.45, .3, .18), 0, .8); woodD = mat('wood_dark', (.28, .18, .11), 0, .8); bark = mat('tree_bark', (.33, .24, .16), 0, .95)
leaf = mat('leaf', (.2, .45, .17), 0, .8); leafD = mat('plant_leaf', (.14, .36, .14), 0, .8); banana = mat('banana_leaf', (.32, .58, .2), 0, .7); palmM = mat('palm', (.24, .45, .18), 0, .8); palmT = mat('palm_trunk', (.42, .33, .22), 0, .95)
fabric = mat('fabric', (.7, .3, .2), 0, 1); clothB = mat('cloth_blue', (.2, .35, .65), 0, 1); clothY = mat('cloth_yellow', (.9, .7, .2), 0, 1); clothG = mat('cloth_green', (.2, .55, .35), 0, 1)
blanket = mat('blanket_pattern', (.75, .3, .2), 0, 1); mattress = mat('mattress', (.8, .74, .6), 0, 1); clay = mat('clay_pot', (.62, .34, .2), 0, .8); basket = mat('basket', (.7, .55, .3), 0, .9)
iron = mat('metal_dark', (.15, .15, .16), .7, .5); glassM = mat('glass', (.15, .2, .25), .2, .1); ash = mat('ash', (.25, .24, .23), 0, 1); stoneS = mat('stone_small', (.5, .48, .45), 0, .95)
flame = mat('flame', (1, .6, .2), 0, .5, (1, .55, .2), 6.0); bamboo = mat('bamboo', (.68, .58, .32), 0, .8)

# ================================================================== terrain (grid 3 m, materials by height / slope / paths)
LANES = [[(-60, 300), (-38, 284), (-20, 270), (-8, 262), (6, 256), (22, 250), (40, 246)], [(-20, 270), (-24, 252), (-28, 236), (-22, 214), (-10, 190), (4, 160), (6, 135), (2, 108), (-6, 94)],
         [(-8, 262), (-6, 280), (-4, 300)], [(6, 256), (14, 274), (26, 286)]]
def dist_seg(px, pz, a, b):
    ax, az = a; bx, bz = b; dx, dz = bx - ax, bz - az; t = max(0, min(1, ((px - ax) * dx + (pz - az) * dz) / (dx * dx + dz * dz))); return math.hypot(px - ax - dx * t, pz - az - dz * t)
def lane_d(x, z): return min(dist_seg(x, z, l[i], l[i + 1]) for l in LANES for i in range(len(l) - 1))
def terrain():
    N, S = 261, 3.0; off = -(N - 1) * S / 2
    bm = bmesh.new(); vs = []
    for j in range(N):
        for i in range(N):
            x = off + i * S; z = off + j * S; vs.append(bm.verts.new(L(x, H(x, z), z)))
    me = bpy.data.meshes.new('terrain'); o = bpy.data.objects.new('terrain', me); bpy.context.scene.collection.objects.link(o)
    mats = [turf, turfD, rock, dirt, bed, sand]
    for m_ in mats: o.data.materials.append(m_)
    for j in range(N - 1):
        for i in range(N - 1):
            a, b, c, d = vs[j * N + i], vs[j * N + i + 1], vs[(j + 1) * N + i + 1], vs[(j + 1) * N + i]
            f = bm.faces.new((a, d, c, b))
            x = off + (i + .5) * S; z = off + (j + .5) * S; y = H(x, z); r = math.hypot(x, z)
            sx = (H(x + 1, z) - H(x - 1, z)) / 2; sz = (H(x, z + 1) - H(x, z - 1)) / 2; slope = math.hypot(sx, sz)
            mi = 0
            if y < WL - 1.2: mi = 4
            elif y < WL + .9 and r < 100: mi = 5
            elif slope > .95: mi = 2
            elif slope > .55: mi = 1 if (i * 7 + j * 3) % 5 else 2
            elif ((i * 13 + j * 7) % 9 == 0): mi = 1
            if mi in (0, 1) and lane_d(x, z) < 2.2: mi = 3
            f.material_index = mi
    bm.normal_update(); bm.to_mesh(me); bm.free()
    for p in me.polygons: p.use_smooth = True
    return o

# ================================================================== village architecture
def round_hut(name, x, z, r=2.3, h=2.3, rot=0.0, wall=None, door_ang=0.0):
    y = H(x, z) - .1; wall = wall or random.choice([mud, mudL, mudR])
    o = [cyl(name + ' wall', (x, y + h / 2, z), r, h, wall, 'y', 24), cyl(name + ' plinth', (x, y + .12, z), r + .12, .24, stoneS, 'y', 24)]
    o.append(cyl(name + ' roof', (x, y + h + 1.15, z), r + .75, 2.3, thatch, 'y', 24, 0, .05))
    o.append(cyl(name + ' roof tip', (x, y + h + 2.35, z), .14, .5, thatch, 'y', 8))
    dx, dz = math.sin(door_ang), math.cos(door_ang)
    o.append(box(name + ' door', (x + dx * (r + .02), y + .95, z + dz * (r + .02)), (.9, 1.75, .08), woodD, .01, (0, door_ang, 0)))
    o.append(box(name + ' lintel', (x + dx * (r + .05), y + 1.9, z + dz * (r + .05)), (1.2, .12, .12), wood, .01, (0, door_ang, 0)))
    return o
def rect_house(name, x, z, w=6.0, d=4.4, h=2.6, rot=0.0, wall=None, roof=None, door=True):
    """mud-brick house with pitched corrugated roof; built axis-aligned then rotated about Y."""
    y = H(x, z) - .1; wall = wall or random.choice([mud, mudL, whiteW]); roof = roof or random.choice([roofM, rust])
    parts = [box(name + ' walls', (0, h / 2, 0), (w, h, d), wall, .02), box(name + ' plinth', (0, .15, 0), (w + .2, .3, d + .2), stoneS, .01)]
    rl = math.hypot(d / 2 + .5, 1.1)
    for s in (-1, 1): parts.append(box(name + ' roof', (0, h + .55, s * (d / 4 + .12)), (w + .8, .06, rl), roof, 0, (s * -math.atan2(1.1, d / 2 + .5), 0, 0)))
    parts.append(mesh(name + ' gable', [(-w / 2, h, -d / 2), (-w / 2, h, d / 2), (-w / 2, h + 1.05, 0), (w / 2, h, -d / 2), (w / 2, h, d / 2), (w / 2, h + 1.05, 0)], [(0, 1, 2), (3, 5, 4)], wall))
    if door: parts.append(box(name + ' door', (w * .18, 1.0, d / 2 + .03), (.95, 1.95, .06), woodD, .01))
    for sx in (-.28, .32): parts += [box(name + ' shutter', (w * sx, 1.55, d / 2 + .04), (.8, .7, .05), random.choice([clothB, wood, clothG]), .01), box(name + ' sill', (w * sx, 1.15, d / 2 + .06), (.95, .08, .14), wood, .01)]
    o = join(name, parts); o.rotation_euler = (0, 0, -rot); o.location = L(x, y, z); return o
def granary(name, x, z):
    y = H(x, z); o = [cyl(name + ' leg', (x + sx * .55, y + .45, z + sz * .55), .07, .9, wood, 'y', 6) for sx in (-1, 1) for sz in (-1, 1)]
    o += [cyl(name + ' body', (x, y + 1.6, z), .95, 1.4, mudL, 'y', 16), cyl(name + ' roof', (x, y + 2.8, z), 1.35, 1.2, thatch, 'y', 16, 0, .05)]
    return o
def fence(name, pts):
    o = []
    for a, b in zip(pts, pts[1:]):
        L_ = math.dist(a, b); n = max(2, int(L_ / .35))
        for k in range(n):
            t = k / n; x = a[0] + (b[0] - a[0]) * t; z = a[1] + (b[1] - a[1]) * t
            o.append(cyl(name + ' stick', (x, H(x, z) + .6 + random.uniform(-.05, .08), z), .035, 1.2 + random.uniform(-.1, .15), bamboo, 'y', 5))
        for yy in (.45, .9): o.append(tube(name + ' rail', [(a[0], H(*a) + yy, a[1]), (b[0], H(*b) + yy, b[1])], .025, bamboo, 1))
    return o
def hearth(name, x, z):
    y = H(x, z); o = [ico(name + ' stone', (x + math.cos(a) * .35, y + .1, z + math.sin(a) * .35), .14, stoneS, (1, .8, 1), 1) for a in (0, 2.1, 4.2)]
    o += [cyl(name + ' ash', (x, y + .02, z), .5, .04, ash, 'y', 16), sphere(name + ' pot', (x, y + .38, z), .3, iron, (1, .8, 1), 14)]
    return o
def jar(name, x, z, s=1.0): y = H(x, z); return [sphere(name, (x, y + .3 * s, z), .3 * s, clay, (1, 1.2, 1), 14), cyl(name + ' neck', (x, y + .66 * s, z), .12 * s, .12 * s, clay, 'y', 12)]
def bench(name, x, z, ang=0.0):
    y = H(x, z); return [box(name, (x, y + .45, z), (1.8, .08, .35), wood, .01, (0, ang, 0))] + [box(name + ' leg', (x + math.cos(ang) * s * .75, y + .22, z - math.sin(ang) * s * .75), (.08, .44, .3), woodD, 0, (0, ang, 0)) for s in (-1, 1)]
def clothesline(name, a, b):
    o = [cyl(name + ' pole', (p[0], H(*p) + 1.0, p[1]), .04, 2.0, wood, 'y', 6) for p in (a, b)]
    o.append(tube(name + ' line', catenary((a[0], H(*a) + 1.95, a[1]), (b[0], H(*b) + 1.95, b[1]), .15, 8), .008, iron, 1))
    for k in range(4):
        t = .2 + k * .2; x = a[0] + (b[0] - a[0]) * t; z = a[1] + (b[1] - a[1]) * t; ang = math.atan2(b[1] - a[1], b[0] - a[0])
        o.append(box(name + ' cloth', (x, mixf(H(*a), H(*b), t) + 1.55, z), (.55, .7, .02), random.choice([clothB, clothY, clothG, fabric]), 0, (0, -ang, 0)))
    return o

# ================================================================== the hero house (interior shots)  — at HX, HZ, facing +z toward the lane
HX, HZ = -2.0, 252.0
def hero_house():
    y0 = H(HX, HZ) + .05; W, D, Hh = 5.2, 4.2, 2.6; x0, x1, z0, z1 = HX - W / 2, HX + W / 2, HZ - D / 2, HZ + D / 2; t = .22
    o = [span('hh floor', (x0 - t, y0 - .4, z0 - t), (x1 + t, y0, z1 + t), mat('floor_mud', (.5, .36, .24), 0, 1), 0)]
    # walls with a window (west wall, looking at the village) and a door (south wall, +z)
    o += [span('hh wall n', (x0 - t, y0, z0 - t), (x1 + t, y0 + Hh, z0), mudL, 0), span('hh wall e', (x1, y0, z0), (x1 + t, y0 + Hh, z1), mudL, 0)]
    o += [span('hh wall w low', (x0 - t, y0, z0), (x0, y0 + 1.0, z1), mudL, 0), span('hh wall w top', (x0 - t, y0 + 2.0, z0), (x0, y0 + Hh, z1), mudL, 0),
          span('hh wall w a', (x0 - t, y0 + 1.0, z0), (x0, y0 + 2.0, HZ - .7), mudL, 0), span('hh wall w b', (x0 - t, y0 + 1.0, HZ + .7), (x0, y0 + 2.0, z1), mudL, 0)]
    o += [span('hh wall s a', (x0 - t, y0, z1), (HX + .2, y0 + Hh, z1 + t), mudL, 0), span('hh wall s b', (HX + 1.2, y0, z1), (x1 + t, y0 + Hh, z1 + t), mudL, 0), span('hh wall s top', (HX + .2, y0 + 2.05, z1), (HX + 1.2, y0 + Hh, z1 + t), mudL, 0)]
    o.append(span('hh dado', (x0 + .01, y0, z0 + .01), (x1 - .01, y0 + .6, z0 + .03), mudR, 0))
    # roof: rafters + corrugated sheets (visible from inside), with a ridge
    for k in range(7): o.append(box('hh rafter', (x0 + .2 + k * .8, y0 + Hh + .45, HZ), (.08, .1, D + .6), woodD, .005, (0, 0, 0)))
    for s in (-1, 1): o.append(box('hh roof', (HX, y0 + Hh + .5, HZ + s * (D / 4 + .1)), (W + .9, .05, D / 2 + .7), rust, 0, (s * -math.atan2(1.0, D / 2 + .4), 0, 0)))
    o.append(mesh('hh gable', [(x0 - t, y0 + Hh, z0), (x0 - t, y0 + Hh, z1), (x0 - t, y0 + Hh + 1.0, HZ), (x1 + t, y0 + Hh, z0), (x1 + t, y0 + Hh, z1), (x1 + t, y0 + Hh + 1.0, HZ)], [(0, 1, 2), (3, 5, 4)], mudL))
    # window frame + shutter (KEEP, swings out) ; door (KEEP, swings in)
    o += [span('hh win frame', (x0 - .25, y0 + .97, HZ - .75), (x0 + .03, y0 + 1.03, HZ + .75), wood, 0), span('hh win frame', (x0 - .25, y0 + 1.97, HZ - .75), (x0 + .03, y0 + 2.03, HZ + .75), wood, 0)]
    keep('Shutter', [box('sh', (x0 - .26, y0 + 1.5, HZ), (.05, 1.0, 1.4), wood, .01), box('sh bar', (x0 - .3, y0 + 1.5, HZ), (.04, .1, 1.3), woodD, 0)], (x0 - .26, y0 + 1.5, HZ - .7))
    keep('House door', [box('hd', (HX + .7, y0 + 1.0, z1 + .02), (1.0, 2.0, .06), woodD, .01), box('hd plank', (HX + .7, y0 + 1.5, z1 + .06), (.95, .1, .02), wood, 0), box('hd plank', (HX + .7, y0 + .6, z1 + .06), (.95, .1, .02), wood, 0), sphere('hd knob', (HX + 1.05, y0 + 1.0, z1 + .08), .03, iron)], (HX + .2, y0, z1 + .02))
    # furniture: bed with mattress + patterned blanket + pillow, table, stool, lantern, pots, hanging clothes, mat
    bx, bz = x1 - 1.0, HZ - .6
    o += [box('bed frame', (bx, y0 + .3, bz), (1.0, .14, 2.0), wood, .01)] + [box('bed leg', (bx + sx * .45, y0 + .15, bz + sz * .95), (.08, .3, .08), woodD, 0) for sx in (-1, 1) for sz in (-1, 1)]
    o += [box('bed mattress', (bx, y0 + .44, bz), (.95, .14, 1.95), mattress, .04), box('bed blanket', (bx, y0 + .53, bz + .3), (.98, .06, 1.3), blanket, .03), box('bed pillow', (bx, y0 + .56, bz - .75), (.6, .1, .32), mat('linen', (.9, .9, .86), 0, .9), .04)]
    o += [box('table', (x0 + .8, y0 + .7, z0 + .9), (.9, .05, .7), wood, .01)] + [box('table leg', (x0 + .8 + sx * .38, y0 + .35, z0 + .9 + sz * .28), (.05, .7, .05), woodD, 0) for sx in (-1, 1) for sz in (-1, 1)]
    o += [cyl('stool', (x0 + 1.3, y0 + .22, z0 + 1.6), .2, .44, wood, 'y', 12)] + jar('hh jar', x0 + .4, z1 - .5, .9) + jar('hh jar2', x0 + .9, z1 - .35, .7)
    o += [box('mat', (HX - .6, y0 + .01, HZ + .6), (1.4, .02, .9), basket, 0), cyl('hh basket', (x0 + .5, y0 + .2, z0 + 1.6), .25, .4, basket, 'y', 14, 0, .2)]
    o += [box('clothes', (x1 - .05, y0 + 1.6, HZ + 1.2), (.04, .8, .55), clothY, 0), box('clothes2', (x1 - .05, y0 + 1.5, HZ + .5), (.04, .7, .45), clothB, 0), cyl('peg', (x1 - .1, y0 + 1.95, HZ + .85), .02, .9, wood, 'z', 6)]
    keep('Lantern', [cyl('ln base', (x0 + .75, y0 + .76, z0 + .8), .08, .03, iron, 'y', 12), cyl('ln glass', (x0 + .75, y0 + .9, z0 + .8), .065, .22, glassM, 'y', 12), sphere('ln flame', (x0 + .75, y0 + .88, z0 + .8), .025, flame, (1, 1.8, 1), 8), torus('ln handle', (x0 + .75, y0 + 1.06, z0 + .8), .06, .008, iron, 'z', 12, 4)], (x0 + .75, y0 + .76, z0 + .8))

# ================================================================== the village around the hero house (in the valley basin)
def village():
    random.seed(19861)
    spots = [(-14, 262, 'r', .3), (-24, 250, 'h', .2), (-30, 272, 'r', 1.0), (-12, 280, 'h', -.4), (-40, 262, 'r', .6), (8, 270, 'r', -1.0), (18, 258, 'h', .5),
             (-6, 238, 'h', 0.1), (-34, 238, 'r', .2), (14, 242, 'r', -.6), (-48, 282, 'h', .8), (2, 292, 'r', 2.4), (-22, 296, 'r', 1.4), (28, 276, 'h', -.9), (-52, 246, 'r', .4), (30, 244, 'r', -1.2)]
    for k, (x, z, kind, rot) in enumerate(spots):
        if kind == 'r': round_hut(f'hut{k}', x, z, random.uniform(2.0, 2.5), random.uniform(2.1, 2.5), rot, door_ang=math.atan2(-6 - x, 262 - z))
        else: rect_house(f'house{k}', x, z, random.uniform(5.2, 6.6), random.uniform(4.0, 4.6), 2.6, rot)
    for k, (x, z) in enumerate([(-18, 256), (-36, 280), (12, 262), (-2, 284)]): granary(f'gran{k}', x, z)
    fence('fence a', [(-30, 258), (-26, 266), (-20, 268)]); fence('fence b', [(4, 262), (10, 264), (14, 268)]); fence('fence c', [(-46, 270), (-42, 276), (-36, 276)])
    for k, (x, z) in enumerate([(-10, 268), (-28, 244), (16, 250), (-38, 270)]): hearth(f'hearth{k}', x, z)
    for k, (x, z) in enumerate([(-8, 266), (-9, 267), (2, 258), (-26, 247), (-25, 248), (12, 266)]): jar(f'jar{k}', x, z, random.uniform(.7, 1.1))
    bench('bench a', -12, 270, .3); bench('bench b', 6, 248, -.2); clothesline('line a', (-20, 276), (-14, 278)); clothesline('line b', (10, 254), (15, 252))
    # small church / meeting house with a bell post
    rect_house('meeting', -58, 262, 8.0, 5.5, 3.0, .5, whiteW, roofM)
    cyl('bell post', (-52, H(-52, 256) + 1.6, 256), .08, 3.2, wood, 'y', 6); cyl('bell', (-52, H(-52, 256) + 3.0, 256.2), .16, .25, iron, 'y', 12, 0, .08)
    # shoreline rocks + driftwood around the lake, lakeside reeds handled by veg.json
    for k in range(70):
        a = random.uniform(0, 2 * math.pi); r = random.uniform(90, 101); x, z = math.cos(a) * r, math.sin(a) * r
        ico('shore rock', (x, H(x, z) + .1, z), random.uniform(.4, 1.6), rock, (1.3, .7, 1.1), 1, .2)
    for k in range(40):
        a = random.uniform(0, 2 * math.pi); r = random.uniform(104, 135); x, z = math.cos(a) * r, math.sin(a) * r
        ico('rim boulder', (x, H(x, z) + .3, z), random.uniform(1.2, 3.5), rock, (1.2, .8, 1.1), 1, .22)

# ================================================================== vegetation instance lists (instanced in Three)
def veg():
    random.seed(1987); out = {'tree': [], 'palm': [], 'banana': [], 'bush': [], 'grass': [], 'reed': []}
    huts = [(-14, 262), (-24, 250), (-30, 272), (-12, 280), (-40, 262), (8, 270), (18, 258), (-6, 238), (-34, 238), (14, 242), (-48, 282), (2, 292), (-22, 296), (28, 276), (-52, 246), (30, 244), (-58, 262), (HX, HZ)]
    def free(x, z, rad):
        if lane_d(x, z) < rad + 1.5: return False
        return all(math.hypot(x - a, z - b) > rad + 4.5 for a, b in huts)
    def put(kind, x, z, s):
        y = H(x, z); out[kind].append([round(x, 2), round(y, 2), round(z, 2), round(s, 2), round(random.uniform(0, 6.28), 2)])
    tries = 0
    while len(out['tree']) < 900 and tries < 30000:
        tries += 1; x, z = random.uniform(-380, 380), random.uniform(-380, 380); r = math.hypot(x, z)
        if r < 100 or H(x, z) < WL + 1 and r < 110: continue
        sx = (H(x + 1, z) - H(x - 1, z)) / 2; sz = (H(x, z + 1) - H(x, z - 1)) / 2
        if math.hypot(sx, sz) > 1.1 or not free(x, z, 2): continue
        dense = .35 + .65 * (1 if r > 140 else 0)
        if random.random() > dense: continue
        put('tree', x, z, random.uniform(.8, 1.5))
    for k in range(70):
        a = random.uniform(-1.4, 1.4); x = -16 + random.uniform(-70, 60); z = 262 + random.uniform(-45, 45)
        if free(x, z, 1.5): put('palm', x, z, random.uniform(.8, 1.2))
    for k in range(160):
        x = -16 + random.uniform(-62, 54); z = 262 + random.uniform(-40, 40)
        if free(x, z, 1.0): put('banana', x, z, random.uniform(.7, 1.2))
    for k in range(1400):
        x, z = random.uniform(-300, 300), random.uniform(-300, 340); r = math.hypot(x, z)
        if r < 96 or not free(x, z, .6): continue
        put('bush', x, z, random.uniform(.6, 1.4))
    for k in range(5000):
        x = random.uniform(-110, 90); z = random.uniform(150, 330)
        if random.random() < .4: x, z = random.uniform(-200, 200), random.uniform(-200, 200)
        if math.hypot(x, z) < 96 or not free(x, z, .2): continue
        put('grass', x, z, random.uniform(.6, 1.3))
    for k in range(900):
        a = random.uniform(0, 2 * math.pi); r = random.uniform(89.5, 95); x, z = math.cos(a) * r, math.sin(a) * r
        put('reed', x, z, random.uniform(.7, 1.3))
    (OUT / 'veg.json').write_text(json.dumps(out, separators=(',', ':')))
    print({k: len(v) for k, v in out.items()})

# ================================================================== instanced plant models + props (props.glb)
def props():
    def at(objs): return objs
    keep('Tree', [cyl('tr trunk', (0, 1.6, 0), .22, 3.2, bark, 'y', 8, 0, .14), cyl('tr branch', (.4, 3.0, .1), .08, 1.2, bark, 'x', 6)] +
         [ico('tr crown', (dx, 3.6 + dy, dz), rr, leaf if k % 2 else leafD, (1, .8, 1), 2, .16) for k, (dx, dy, dz, rr) in enumerate([(0, .6, 0, 1.7), (1.0, .1, .3, 1.2), (-.9, .2, -.4, 1.25), (.2, 1.3, -.2, 1.1), (-.3, -.2, .9, 1.0)])], (0, 0, 0))
    fr = [tube('pm trunk', [(0, 0, 0), (.15, 2.5, 0), (.35, 5.0, 0), (.6, 7.0, 0)], .16, palmT, 2)]
    for k in range(8):
        a = k * 2 * math.pi / 8; dx, dz = math.cos(a), math.sin(a)
        fr.append(tube('pm frond', [(.6, 7.0, 0), (.6 + dx * 1.3, 7.5, dz * 1.3), (.6 + dx * 2.6, 7.0, dz * 2.6), (.6 + dx * 3.3, 6.1, dz * 3.3)], .14, palmM, 1))
    keep('Palm', fr, (0, 0, 0))
    bn = [cyl('bn stem', (0, 1.1, 0), .14, 2.2, mat('banana_stem', (.45, .55, .25), 0, .8), 'y', 8)]
    for k in range(6):
        a = k * 2 * math.pi / 6 + .3; dx, dz = math.cos(a), math.sin(a)
        bn.append(box('bn leaf', (dx * .9, 2.2 + (k % 2) * .25, dz * .9), (1.9, .03, .55), banana, .0, (0, -a, -.5 + (k % 3) * .15)))
    keep('Banana', bn, (0, 0, 0))
    keep('Bush', [ico('bs', (dx, .45 + dy, dz), rr, leafD if k % 2 else leaf, (1.2, .8, 1.2), 1, .2) for k, (dx, dy, dz, rr) in enumerate([(0, 0, 0, .7), (.5, -.1, .2, .5), (-.45, -.05, -.2, .55)])], (0, 0, 0))
    gr = []
    for k in range(5):
        a = k * .63; gr.append(box('gr blade', (math.cos(a) * .05, .3, math.sin(a) * .05), (.5, .6, .01), turf, 0, (0, a, .1)))
    keep('Grass', gr, (0, 0, 0))
    keep('Reed', [cyl('rd', (math.cos(k * 1.3) * .12, .7 + (k % 3) * .1, math.sin(k * 1.3) * .12), .015, 1.4 + (k % 3) * .2, mat('reed', (.5, .6, .3), 0, .9), 'y', 4) for k in range(7)], (0, 0, 0))
    keep('Basket', [cyl('bk', (0, .15, 0), .22, .3, basket, 'y', 14, 0, .16)], (0, 0, 0))
    keep('Hoe', [cyl('ho handle', (0, .75, 0), .02, 1.5, wood, 'y', 6), box('ho blade', (.08, 1.5, 0), (.18, .12, .02), iron, .005)], (0, 0, 0))
    keep('Bicycle', [torus('bc wheel', (s * .55, .35, 0), .33, .02, iron, 'z', 20, 4) for s in (-1, 1)] + [tube('bc frame', [(-.55, .35, 0), (-.1, .8, 0), (.45, .8, 0), (.55, .35, 0), (0, .35, 0), (-.1, .8, 0)], .02, mat('bike_red', (.7, .12, .1), .4, .4), 1), box('bc seat', (-.12, .9, 0), (.2, .05, .1), iron, .01)], (0, 0, 0))

reset(); terrain(); hero_house(); village(); export('world.glb')
veg()
reset(); props(); export('props.glb')
print('ALL ASSETS DONE')
