"""FrameForge — Brazil heist PART 2 (the aftermath). New original Blender sets & props; Part 1 assets are reused unchanged from public/brazil.
Same conventions as Part 1 (Three.js metres; KEEP objects animated in Three; materials named by surface type). Sets are placed away from the Part 1 world:
  safehouse x 200-209 (floor y .15, front z 0, street z 0..10) · police HQ office x 220-232 · evidence room x 240-248 · roadside x 260-300 · HQ facade/garage x 310-336.
"""
import bpy, bmesh, math, random
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'public/brazil2'; OUT.mkdir(parents=True, exist_ok=True)
random.seed(2006)
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
def plaster(n, c): return mat('plaster_' + n, c, 0, .9)
P = {k: plaster(k, c) for k, c in {
    'yellow': (.95, .78, .35), 'coral': (.93, .52, .42), 'teal': (.35, .7, .68), 'white': (.93, .91, .86), 'pink': (.92, .62, .68),
    'blue': (.45, .62, .85), 'lime': (.72, .82, .45), 'peach': (.97, .76, .58), 'mint': (.66, .86, .74), 'cream': (.96, .9, .74)}.items()}
roof = mat('roof_tile', (.72, .32, .18), 0, .8); asphalt = mat('asphalt', (.18, .18, .19), 0, .95); walk = mat('sidewalk', (.78, .76, .72), 0, .9)
curb = mat('curb', (.7, .69, .66), 0, .85); paint = mat('road_paint', (.95, .92, .8), 0, .7); paintY = mat('road_paint_yellow', (.95, .78, .2), 0, .7)
stone = mat('stone', (.84, .8, .72), 0, .6); stoneD = mat('stone_dark', (.42, .41, .4), 0, .5); glass = mat('glass', (.12, .2, .27), .3, .08)
glassS = mat('glass_shop', (.55, .7, .75), .1, .05); steel = mat('metal', (.55, .57, .6), .9, .35); dark = mat('metal_dark', (.12, .12, .13), .6, .4)
chrome = mat('chrome', (.8, .82, .85), 1, .15); wood = mat('wood', (.55, .37, .2), 0, .75); woodD = mat('wood_dark', (.32, .2, .11), 0, .8)
plank = mat('plank', (.62, .45, .27), 0, .8); earth = mat('earth', (.45, .28, .16), 0, 1); dirt = mat('dirt', (.42, .27, .15), 0, 1)
conc = mat('concrete', (.66, .65, .62), 0, .85); concW = mat('concrete_paint', (.86, .87, .88), 0, .7); rebar = mat('rebar', (.45, .22, .12), .7, .6)
tileF = mat('floor_tile', (.62, .64, .66), 0, .35); marble = mat('marble', (.88, .86, .82), 0, .2); turf = mat('turf', (.25, .62, .2), 0, .9)
leaf = mat('plant_leaf', (.2, .52, .22), 0, .7); leafD = mat('plant_leaf_dark', (.12, .38, .16), 0, .7); pot = mat('pot_terracotta', (.75, .38, .22), 0, .8)
trunk = mat('palm_trunk', (.5, .4, .28), 0, .9); frond = mat('palm_leaf', (.28, .55, .2), 0, .7); bark = mat('tree_bark', (.35, .25, .17), 0, .9)
cash = mat('cash', (.62, .78, .58), 0, .7); band = mat('cash_band', (.95, .93, .86), 0, .6); wrap = mat('cash_wrap', (.85, .9, .88), .1, .15)
pallet = mat('pallet_wood', (.72, .58, .38), 0, .8); vsteel = mat('vault_steel', (.6, .62, .64), .95, .3); brass = mat('brass', (.8, .62, .3), 1, .3)
awnG = mat('awning_green', (.12, .5, .35), 0, .8); awnR = mat('awning_red', (.75, .2, .18), 0, .8); awnB = mat('awning_blue', (.2, .35, .65), 0, .8)
bulb = mat('bulb', (1, .85, .55), 0, .4, (1, .78, .45), 3.0); fluoro = mat('fluoro', (.95, .98, 1), 0, .3, (.9, .95, 1), 4.0)
lampW = mat('lamp_warm', (1, .9, .7), 0, .3, (1, .82, .55), 3.0); ledG = mat('led_green', (.2, 1, .3), 0, .3, (.2, 1, .3), 5.0)
ledR = mat('led_red', (1, .15, .1), 0, .3, (1, .1, .05), 5.0); screen = mat('screen', (.3, .45, .4), 0, .2, (.4, .6, .5), 1.2)
rubber = mat('rubber', (.07, .07, .07), 0, .9); carR = mat('car_paint_red', (.7, .1, .1), .4, .3); carW = mat('car_paint_white', (.9, .9, .9), .4, .3)
carS = mat('car_paint_silver', (.62, .64, .66), .6, .3); carB = mat('car_paint_blue', (.15, .3, .6), .4, .3); fabric = mat('fabric', (.3, .32, .36), 0, .9)
bagW = mat('bag_white', (.9, .9, .86), 0, .9); plastic = mat('plastic_blue', (.15, .35, .7), 0, .5); plasticY = mat('plastic_yellow', (.95, .75, .1), 0, .5)
cable = mat('cable', (.08, .08, .08), 0, .6); ropeO = mat('cable_orange', (.95, .45, .1), 0, .6); sign = lambda n: mat('sign_' + n, (.9, .9, .9), 0, .5)
studioC = mat('studio_cyc', (.05, .07, .13), 0, .8); studioF = mat('studio_floor', (.05, .05, .07), .3, .25); studioL = mat('studio_led', (1, .25, .2), 0, .3, (1, .2, .15), 8.0)
studioW = mat('studio_led_white', (.9, .95, 1), 0, .3, (.85, .9, 1), 6.0); gold = mat('gold', (1, .78, .3), 1, .25); flagG = mat('flag_brazil', (.1, .6, .25), 0, .8)

# ------------------------------------------------------------------ reusable builders
def window(name, x, y, z, w, h, frame=wood, grille=True, front=False, glassm=glass):
    pre = 'FRONT ' if front else ''
    out = [box(pre + name + ' glass', (x, y, z - .04), (w, h, .04), glassm, 0)]
    out.append(box(pre + name + ' sill', (x, y - h / 2 - .05, z + .05), (w + .2, .08, .14), conc, .01))
    for s in (-1, 1): out.append(box(pre + name + ' jamb', (x + s * (w / 2 + .03), y, z), (.06, h + .06, .1), frame, .005))
    for s in (-1, 1): out.append(box(pre + name + ' head', (x, y + s * (h / 2 + .03), z), (w + .12, .06, .1), frame, .005))
    if grille:
        n = max(3, int(w / .14))
        for i in range(1, n): out.append(box(pre + name + ' bar', (x - w / 2 + i * w / n, y, z + .06), (.018, h, .018), dark, 0))
        out.append(box(pre + name + ' rail', (x, y, z + .06), (w, .018, .018), dark, 0))
    return out
def door(name, x, y0, z, w, h, m=woodD, front=False):
    pre = 'FRONT ' if front else ''
    o = [box(pre + name, (x, y0 + h / 2, z - .03), (w, h, .06), m, .01)]
    for s in (-1, 1): o.append(box(pre + name + ' frame', (x + s * (w / 2 + .04), y0 + h / 2, z), (.08, h + .08, .12), wood, .005))
    o.append(box(pre + name + ' frame top', (x, y0 + h + .04, z), (w + .16, .08, .12), wood, .005))
    o.append(sphere(pre + name + ' knob', (x + w * .35, y0 + 1.0, z + .03), .035, brass))
    return o
def house(x0, w, h, col, z0=0.0, depth=10.0, y0=0.15, roofed=True, front=False, rng=None, variant=0):
    """Colourful Fortaleza street building (front at z=z0, extends to z0-depth)."""
    pre = 'FRONT ' if front else ''; zf = z0; s = -1 if front else 1  # front buildings face -z
    zz = (lambda d: zf + d) if not front else (lambda d: zf - d)
    span(pre + 'House wall', (x0, y0, zf - depth if not front else zf), (x0 + w, y0 + h, zf if not front else zf + depth), col, .02)
    span(pre + 'House base', (x0 - .02, y0, zz(.02) - .02), (x0 + w + .02, y0 + .45, zz(.02) + .02), conc, .01)
    span(pre + 'House cornice', (x0 - .08, y0 + h - .25, zz(.0) - .08), (x0 + w + .08, y0 + h - .05, zz(.0) + .08), P['white'], .02)
    if roofed:
        # pitched terracotta roof behind a small parapet
        r = mesh(pre + 'Roof', [(x0, y0 + h - .1, zf), (x0 + w, y0 + h - .1, zf), (x0 + w, y0 + h + 1.3, zf - s * depth / 2), (x0, y0 + h + 1.3, zf - s * depth / 2),
                               (x0, y0 + h - .1, zf - s * depth), (x0 + w, y0 + h - .1, zf - s * depth)], [(0, 1, 2, 3), (3, 2, 5, 4)], roof)
        sol = r.modifiers.new('sol', 'SOLIDIFY'); sol.thickness = .08
        for i in range(int(w / .32)):
            tube(pre + 'Roof ridge tile', [(x0 + i * .32 + .16, y0 + h - .05, zf), (x0 + i * .32 + .16, y0 + h + 1.37, zf - s * depth / 2)], .045, roof, 1)
    else:
        span(pre + 'Parapet', (x0, y0 + h, zz(0) - .12), (x0 + w, y0 + h + .5, zz(0) + .12), col, .02)
    nwin = max(1, int(w / 2.6)); dz = .06 * (1 if not front else -1)
    for i in range(nwin):
        wx = x0 + (i + .5) * w / nwin
        if variant % 3 == 0 and i == nwin // 2: door(pre + 'Door', wx, y0, zf + dz, 1.0, 2.2, woodD, front)
        else: window(pre + 'Win', wx, y0 + 1.5, zf + dz, 1.1, 1.3, wood, True, front)
        if h > 4.5: window(pre + 'Win up', wx, y0 + 4.3, zf + dz, 1.0, 1.2, wood, False, front)
    if h > 4.5 and variant % 2 == 0:
        span(pre + 'Balcony', (x0 + .3, y0 + 3.3, zz(0)), (x0 + w - .3, y0 + 3.4, zz(.7)), conc, .02)
        for i in range(int((w - .6) / .25) + 1): box(pre + 'Baluster', (x0 + .3 + i * .25, y0 + 3.85, zz(.68)), (.03, .9, .03), dark, 0)
        box(pre + 'Balcony rail', (x0 + w / 2, y0 + 4.3, zz(.68)), (w - .6, .04, .05), dark, 0)
    if variant % 4 == 1:  # AC unit
        box(pre + 'AC unit', (x0 + w * .8, y0 + 3.0, zz(.25)), (.7, .45, .4), P['white'], .03)
        cyl(pre + 'AC fan', (x0 + w * .8 - .1, y0 + 3.0, zz(.46)), .16, .02, dark, 'z', 16)
def awning(name, x0, x1, y, z, depth, m, front=False):
    pre = 'FRONT ' if front else ''; s = -1 if front else 1
    o = mesh(pre + name, [(x0, y, z), (x1, y, z), (x1, y - .5, z + s * depth), (x0, y - .5, z + s * depth)], [(0, 1, 2, 3)], m)
    so = o.modifiers.new('sol', 'SOLIDIFY'); so.thickness = .03
    for i in range(int((x1 - x0) / .45) + 1):  # scalloped valance
        cyl(pre + name + ' scallop', (x0 + i * .45 + .225, y - .55, z + s * depth), .22, .03, m, 'z', 12)
    return o
def palm(name, x, z, h, front=False, lean=0.0):
    pre = 'FRONT ' if front else ''; pts = []
    for i in range(9):
        t = i / 8; pts.append((x + math.sin(t * 1.4) * lean, .15 + t * h, z + math.sin(t * 1.1) * lean * .3))
    tube(pre + name + ' trunk', pts, .17, trunk, 3)
    for i in range(8): torus(pre + name + ' ring', (pts[i + 1][0], pts[i + 1][1] - .3, pts[i + 1][2]), .17, .035, trunk, 'y', 16, 6)
    top = pts[-1]
    for k in range(11):
        a = k / 11 * math.tau + random.uniform(-.2, .2); L_ = random.uniform(2.2, 3.0); droop = random.uniform(.9, 1.6)
        seg = []
        for j in range(7):
            t = j / 6; seg.append((top[0] + math.cos(a) * L_ * t, top[1] + .35 * math.sin(t * math.pi * .8) * 1.4 - droop * t * t, top[2] + math.sin(a) * L_ * t))
        # frond: ribbon with leaflets
        verts = []; faces = []
        for j, p in enumerate(seg):
            w = .55 * math.sin(min(1, (j + .5) / 6) * math.pi) + .05
            nx, nz = -math.sin(a), math.cos(a)
            verts += [(p[0] + nx * w, p[1] - .12 * w, p[2] + nz * w), (p[0] - nx * w, p[1] - .12 * w, p[2] - nz * w), (p[0], p[1] + .05, p[2])]
        for j in range(len(seg) - 1):
            b = j * 3; faces += [(b, b + 3, b + 5, b + 2), (b + 2, b + 5, b + 4, b + 1)]
        mesh(pre + name + ' frond', verts, faces, frond)
    for k in range(5): sphere(pre + name + ' coconut', (top[0] + math.cos(k * 1.3) * .22, top[1] - .2, top[2] + math.sin(k * 1.3) * .22), .14, woodD)
def tree(name, x, z, h=4.0, front=False):
    pre = 'FRONT ' if front else ''
    cyl(pre + name + ' trunk', (x, .15 + h * .3, z), .14, h * .6, bark, 'y', 10, 0, .09)
    for k in range(6):
        ico(pre + name + ' crown', (x + random.uniform(-.9, .9), .15 + h * .65 + random.uniform(0, 1.0), z + random.uniform(-.9, .9)), random.uniform(.8, 1.2), leaf if k % 2 else leafD, (1, .8, 1), 1)
def pole(name, x, z, front=True):
    pre = 'FRONT ' if front else ''
    cyl(pre + name, (x, 4.6, z), .12, 9, conc, 'y', 10, 0, .09)
    box(pre + name + ' crossarm', (x, 8.6, z), (.1, .12, 1.6), wood, .01)
    for s in (-.6, 0, .6): cyl(pre + name + ' insulator', (x, 8.75, z + s), .05, .14, mat('ceramic', (.9, .9, .88), 0, .2), 'y', 10)
    box(pre + name + ' transformer', (x, 7.3, z - .35), (.5, .8, .5), mat('metal_grey', (.5, .52, .54), .5, .5), .04)
    tube(pre + name + ' lamp arm', [(x, 7.0, z), (x, 7.4, z - .8), (x, 7.4, z - 1.6)], .04, steel)
    box(pre + name + ' lamp head', (x, 7.32, z - 1.65), (.25, .12, .55), dark, .03)
    box(pre + name + ' lamp lens', (x, 7.25, z - 1.65), (.2, .02, .45), lampW, 0)
def car(name, x, z, m, ang=0.0):
    """Boxy early-2000s Brazilian hatchback (original design). Built at origin, returned as KEEP group."""
    parts = []
    parts.append(box('Car body', (0, .62, 0), (3.7, .62, 1.6), m, .12, seg=3))
    cab = mesh('Car cabin', [(-1.1, .93, .76), (.75, .93, .76), (.25, 1.42, .66), (-1.0, 1.45, .66), (-1.1, .93, -.76), (.75, .93, -.76), (.25, 1.42, -.66), (-1.0, 1.45, -.66)],
               [(0, 1, 2, 3), (5, 4, 7, 6), (1, 5, 6, 2), (4, 0, 3, 7), (3, 2, 6, 7), (0, 4, 5, 1)], glass)
    parts.append(cab)
    parts.append(box('Car roof', (-.38, 1.47, 0), (1.3, .06, 1.36), m, .03))
    for s in (-1, 1):
        parts.append(box('Car pillar', (-1.05, 1.2, s * .71), (.08, .52, .06), m, .01))
        parts.append(box('Car mirror', (.62, 1.0, s * .86), (.12, .1, .14), m, .02))
        for xx in (-1.15, 1.2):
            parts.append(cyl('Car tire', (xx, .32, s * .74), .32, .22, rubber, 'z', 18, .02))
            parts.append(cyl('Car hub', (xx, .32, s * .86), .17, .02, steel, 'z', 14))
        parts.append(box('Car light', (1.85, .72, s * .55), (.04, .16, .34), mat('headlight', (1, 1, .95), 0, .1, (1, .97, .9), .5), 0))
        parts.append(box('Car tail', (-1.85, .75, s * .6), (.04, .2, .22), mat('taillight', (.8, .05, .05), 0, .2, (.9, .05, .05), .4), 0))
    parts.append(box('Car grille', (1.86, .58, 0), (.03, .14, .7), dark, .01))
    parts.append(box('Car bumper F', (1.88, .4, 0), (.08, .16, 1.62), rubber, .03)); parts.append(box('Car bumper R', (-1.88, .4, 0), (.08, .16, 1.62), rubber, .03))
    parts.append(box('Car plate', (-1.9, .55, 0), (.02, .13, .4), mat('plate', (.85, .85, .8), 0, .5), 0))
    o = keep(name, parts, (0, 0, 0)); o.location = L(x, 0, z); o.rotation_euler = (0, 0, -ang); return o
def cash_brick(name, p, rot=0.0, sc=1.0):
    """Shrink-wrapped brick of banknote bundles (0.5 x 0.3 x 0.32 m)."""
    out = [box(name, p, (.5 * sc, .3 * sc, .32 * sc), cash, .015 * sc, (0, rot, 0))]
    for k in (-1, 0, 1):
        out.append(box(name + ' band', (p[0] + math.cos(rot) * k * .16 * sc, p[1], p[2] - math.sin(rot) * k * .16 * sc), (.04 * sc, .305 * sc, .325 * sc), band, 0, (0, rot, 0)))
    return out
def pallet_stack(name, x, z, layers=4, front_open=False):
    parts = []
    for i in range(3): parts.append(box(name + ' deck', (x, .05, z - .45 + i * .45), (1.2, .03, .12), pallet, .004))
    for i in range(3): parts.append(box(name + ' block', (x - .5 + i * .5, .1, z), (.12, .1, 1.0), pallet, .004))
    for i in range(7): parts.append(box(name + ' top', (x - .54 + i * .18, .17, z), (.14, .03, 1.0), pallet, .003))
    for ly in range(layers):
        for a in range(2):
            for b in range(3):
                parts += cash_brick(name + ' brick', (x - .26 + a * .52, .34 + ly * .31, z - .33 + b * .33), 0)
    parts.append(box(name + ' film', (x, .34 + layers * .31 / 2 - .16, z), (1.08, layers * .31 + .02, 1.02), wrap, .02))
    return parts

# ================================================================== STREET (+ cutaway earth, tunnel, vault)


# Part 2: jitter ico vertices about their own centre (transform_apply also bakes the location, so scaling raw coords would smear them across the map)
def ico(name, p, r, m, sc=(1, 1, 1), sub=1):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=sub, radius=r, location=L(*p))
    o = bpy.context.object; o.name = name; o.scale = (sc[0], sc[2], sc[1]); bpy.ops.object.transform_apply(scale=True, location=False, rotation=False)
    for v in o.data.vertices: v.co *= 1 + random.uniform(-.12, .12)
    return finish(o, m)
def moved(fn, dx):
    """build a set with fn() and shift everything it created by dx metres along x (keeps sets apart)"""
    before = set(bpy.data.objects); fn()
    for o in set(bpy.data.objects) - before: o.location.x += dx

# ================================================================== PART 2 materials
sirenR = mat('siren_red', (1, .1, .08), 0, .3, (1, .08, .05), 1.0); sirenB = mat('siren_blue', (.1, .3, 1), 0, .3, (.08, .25, 1), 1.0)
cork = mat('cork', (.66, .5, .32), 0, 1); paper = mat('paper', (.93, .91, .86), 0, .9); manila = mat('folder_manila', (.85, .72, .45), 0, .8)
sofaM = mat('fabric_sofa', (.35, .45, .55), 0, .95); rugM = mat('fabric_rug', (.62, .25, .2), 0, 1); curtainM = mat('fabric_curtain', (.85, .75, .5), 0, .9)
crt = mat('plastic_beige', (.8, .76, .66), 0, .5); blinds = mat('blinds', (.86, .84, .78), 0, .6); tape = mat('tape_police', (.98, .82, .1), 0, .5)
grass = mat('turf', (.36, .55, .22), 0, 1); dirtR = mat('dirt', (.5, .33, .19), 0, 1); shelfM = mat('metal_grey', (.5, .52, .54), .5, .5)
box_c = mat('cardboard', (.66, .5, .33), 0, .95); carDk = mat('car_paint_dark', (.1, .11, .13), .5, .3); stripeB = mat('car_paint_blue', (.15, .3, .6), .4, .3)
tileW = mat('floor_tile', (.62, .64, .66), 0, .35); ceilM = mat('plaster_white', (.93, .91, .86), 0, .9)

def room(tag, x0, x1, z0, z1, h, floor, wall, y0=0.0, skip=(), t=.2, hole=None):
    if hole:  # floor with a rectangular opening (hx0, hx1, hz0, hz1)
        hx0, hx1, hz0, hz1 = hole
        o = [span(tag + ' floor', (x0 - t, y0 - .2, z0 - t), (hx0, y0, z1 + t), floor, 0), span(tag + ' floor', (hx1, y0 - .2, z0 - t), (x1 + t, y0, z1 + t), floor, 0),
             span(tag + ' floor', (hx0, y0 - .2, z0 - t), (hx1, y0, hz0), floor, 0), span(tag + ' floor', (hx0, y0 - .2, hz1), (hx1, y0, z1 + t), floor, 0)]
    else: o = [span(tag + ' floor', (x0 - t, y0 - .2, z0 - t), (x1 + t, y0, z1 + t), floor, 0)]
    o += [span(tag + ' ceiling', (x0 - t, y0 + h, z0 - t), (x1 + t, y0 + h + .2, z1 + t), ceilM, 0)]
    sides = {'n': ((x0 - t, y0, z0 - t), (x1 + t, y0 + h, z0)), 's': ((x0 - t, y0, z1), (x1 + t, y0 + h, z1 + t)), 'w': ((x0 - t, y0, z0), (x0, y0 + h, z1)), 'e': ((x1, y0, z0), (x1 + t, y0 + h, z1))}
    for k, (a, b) in sides.items():
        if k not in skip: o.append(span(f'{tag} wall {k}', a, b, wall, 0))
    for k in 'nwe':
        if k in skip: continue
        a, b = sides[k]; o.append(span(f'{tag} skirting', (a[0] if k != 'e' else x1 - .02, y0, a[2] if k != 'n' else z0), (b[0] if k != 'w' else x0 + .02, y0 + .1, z0 + .02 if k == 'n' else b[2]), woodD, 0))
    return o
def desk(n, x, z, w=1.5, d=.75, m=woodD):
    o = [box(n + ' top', (x, .76, z), (w, .04, d), m, .01)]
    o += [box(n + ' ped', (x + s * (w / 2 - .22), .37, z), (.4, .74, d - .06), m, .01) for s in (-1, 1)]
    o += [box(n + ' drawer', (x + s * (w / 2 - .22), .55 - k * .22, z + d / 2 - .02), (.36, .18, .02), wood, .005) for s in (-1, 1) for k in range(3)]
    return o
def crt_pc(n, x, z, yaw=0.0):
    return [box(n + ' crt', (x, 1.0, z), (.42, .38, .4), crt, .04, (0, yaw, 0)), box(n + ' scr', (x + math.sin(yaw) * .205, 1.02, z + math.cos(yaw) * .205), (.34, .27, .01), screen, .01, (0, yaw, 0)),
            box(n + ' kb', (x + math.sin(yaw) * .45, .79, z + math.cos(yaw) * .45), (.44, .02, .15), crt, .005, (0, yaw, 0))]
def chairO(n, x, z, yaw=0.0, keepit=False):
    p = [cyl(n + ' base', (x, .05, z), .28, .03, dark, 'y', 5), cyl(n + ' post', (x, .27, z), .03, .4, chrome, 'y', 10), box(n + ' seat', (x, .5, z), (.46, .08, .44), fabric, .03),
         box(n + ' back', (x - math.sin(yaw) * .2, .82, z - math.cos(yaw) * .2), (.44, .5, .07), fabric, .03, (0, yaw, 0))]
    return keep(n, p, (x, 0, z)) if keepit else p
def police_car(name, x=0.0, z=0.0):
    """Early-2000s Brazilian patrol sedan (original livery: white, blue band, roof light bar)."""
    parts = []
    parts.append(box('Pol body', (0, .64, 0), (4.3, .64, 1.72), carW, .12, seg=3))
    cab = mesh('Pol cabin', [(-1.25, .96, .8), (.85, .96, .8), (.3, 1.42, .7), (-1.0, 1.44, .7), (-1.25, .96, -.8), (.85, .96, -.8), (.3, 1.42, -.7), (-1.0, 1.44, -.7)],
               [(0, 1, 2, 3), (5, 4, 7, 6), (1, 5, 6, 2), (4, 0, 3, 7), (3, 2, 6, 7), (0, 4, 5, 1)], glass)
    parts += [cab, box('Pol roof', (-.35, 1.47, 0), (1.35, .06, 1.42), carW, .03)]
    for s in (-1, 1):
        parts.append(box('Pol band', (0, .7, s * .865), (4.0, .16, .01), stripeB, 0)); parts.append(box('sign_polcar' if s > 0 else 'Pol band2', (-.2, .48, s * .866), (1.6, .12, .01), sign('polcar') if s > 0 else stripeB, 0))
        for xx in (-1.35, 1.35):
            parts.append(cyl('Pol tire', (xx, .33, s * .78), .33, .22, rubber, 'z', 18, .02)); parts.append(cyl('Pol hub', (xx, .33, s * .9), .17, .02, steel, 'z', 14))
        parts.append(box('Pol light', (2.15, .74, s * .58), (.04, .16, .34), mat('headlight', (1, 1, .95), 0, .1, (1, .97, .9), .5), 0))
        parts.append(box('Pol tail', (-2.15, .77, s * .62), (.04, .2, .24), mat('taillight', (.8, .05, .05), 0, .2, (.9, .05, .05), .4), 0))
    parts += [box('Pol bar base', (-.35, 1.53, 0), (.32, .06, 1.2), dark, .02), box('Pol bar red', (-.35, 1.62, .3), (.28, .12, .55), sirenR, .03), box('Pol bar blue', (-.35, 1.62, -.3), (.28, .12, .55), sirenB, .03)]
    parts += [box('Pol bumper F', (2.18, .42, 0), (.08, .16, 1.74), rubber, .03), box('Pol bumper R', (-2.18, .42, 0), (.08, .16, 1.74), rubber, .03), box('Pol grille', (2.16, .6, 0), (.03, .14, .7), dark, .01)]
    o = keep(name, parts, (0, 0, 0)); o.location = L(x, 0, z); return o

# ================================================================== A. SAFEHOUSE (x 200..209, interior z -6..-.2, floor y .15) + street outside
def safehouse():
    Y = .15
    room('safe', 200, 209, -6, -.2, 2.9, tileF, P['peach'], Y, skip=('s',), hole=(204.0, 205.4, -3.6, -2.2))
    # front wall with a door and a barred window (facade faces +z)
    span('safe front L', (199.8, Y, -.2), (203.6, Y + 2.9, 0), P['peach'], 0); span('safe front R', (204.6, Y, -.2), (209.2, Y + 2.9, 0), P['peach'], 0)
    span('safe front top', (203.6, Y + 2.2, -.2), (204.6, Y + 2.9, 0), P['peach'], 0)
    keep('Safe door', [box('sd leaf', (204.1, Y + 1.1, -.1), (1.0, 2.2, .06), woodD, .01), sphere('sd knob', (204.5, Y + 1.0, -.05), .035, brass)], (203.6, Y, -.1))
    window('safe win', 206.8, Y + 1.5, .02, 1.6, 1.2, wood, True)
    span('safe win hole', (206.0, Y + .9, -.2), (207.6, Y + 2.1, 0.0), glass, 0)
    # parapet roof outside, sidewalk, gate wall, little front garden
    span('safe parapet', (199.8, Y + 2.9, -6.2), (209.2, Y + 3.5, .05), P['peach'], .02); span('safe cornice', (199.7, Y + 2.85, -.05), (209.3, Y + 3.0, .12), P['white'], .02)
    span('safe yard', (199.8, -.25, 0), (209.2, Y, 2.6), stone, 0)
    span('safe gate wall L', (199.8, Y, 2.5), (203.4, Y + 1.6, 2.7), P['white'], .02); span('safe gate wall R', (204.8, Y, 2.5), (209.2, Y + 1.6, 2.7), P['white'], .02)
    for k in range(8): box('safe gate bar', (203.5 + k * .18, Y + .8, 2.6), (.025, 1.6, .025), dark, 0)
    span('safe road', (180, -.25, 4.2), (240, 0, 11), asphalt, 0); span('safe walk', (180, -.25, 2.7), (240, .15, 4.2), walk, .01); span('safe curb', (180, -.25, 4.1), (240, .17, 4.3), curb, .02)
    for i in range(23): box('safe dash', (181 + i * 2.6, .005, 7.6), (1.4, .01, .12), paint, 0)
    cols = ['teal', 'yellow', 'coral', 'blue', 'lime', 'pink', 'mint']
    x = 186.0
    for k, w in enumerate([6.5, 7.0]): house(x, w, random.choice([3.6, 4.2]), P[cols[k]], z0=2.6, depth=8, variant=k + 1); x += w
    x = 209.4
    for k, w in enumerate([6.0, 7.0]): house(x, w, random.choice([3.6, 4.2, 6.4]), P[cols[k + 2]], z0=2.6, depth=8, variant=k + 3); x += w
    x = 184.0
    for k in range(7): w = random.choice([6.0, 7.0]); house(x, w, random.choice([3.8, 4.4, 6.6]), P[cols[(k * 3) % 7]], z0=11.0, front=True, variant=k); x += w
    for px in (192, 214, 228): tree('safe tree', px, 3.3, random.uniform(3.6, 4.4))
    palm('safe palm', 197, 1.4, 7, lean=.5); pole('safe pole', 220, 3.5)
    # ---- interior: living room
    sofa = [box('sofa seat', (202.0, Y + .3, -5.3), (2.2, .45, .9), sofaM, .06), box('sofa back', (202.0, Y + .75, -5.7), (2.2, .6, .25), sofaM, .08)]
    sofa += [box('sofa arm', (202.0 + s * 1.1, Y + .5, -5.3), (.22, .7, .9), sofaM, .06) for s in (-1, 1)] + [box('cushion', (201.5 + k * 1.0, Y + .58, -5.25), (.9, .14, .75), sofaM, .06) for k in range(2)]
    [None for _ in sofa]
    box('tv stand', (202.0, Y + .3, -.75), (1.6, .6, .45), woodD, .02); box('tv', (202.0, Y + .85, -.8), (.75, .55, .5), crt, .05); box('tv screen', (202.0, Y + .87, -1.06), (.6, .44, .01), screen, .01)
    box('coffee table', (202.0, Y + .4, -3.6), (1.1, .05, .6), wood, .01); [box('ct leg', (202.0 + sx * .48, Y + .2, -3.6 + sz * .25), (.05, .4, .05), woodD, 0) for sx in (-1, 1) for sz in (-1, 1)]
    box('ashtray', (202.2, Y + .45, -3.6), (.14, .03, .14), glass, .02); box('magazine', (201.8, Y + .44, -3.5), (.25, .01, .32), paper, 0)
    box('cabinet', (208.4, Y + .5, -4.0), (.9, 1.0, .5), woodD, .02); box('radio', (208.4, Y + 1.12, -4.0), (.4, .22, .2), dark, .03)
    box('fan base', (208.3, Y + .05, -1.2), (.3, .05, .3), dark, .02); cyl('fan post', (208.3, Y + .6, -1.2), .02, 1.1, chrome, 'y', 8); cyl('fan cage', (208.3, Y + 1.2, -1.15), .25, .1, chrome, 'z', 20)
    box('pot', (200.5, Y + .25, -.6), (.4, .5, .4), pot, .04); ico('plant', (200.5, Y + .85, -.6), .45, leafD, (1, 1.3, 1), 1)
    for k in range(5): box('curtain', (206.2 + k * .38, Y + 1.5, -.25), (.36, 1.5, .05), curtainM, .02)
    box('wall clock', (205.5, Y + 2.2, -5.98), (.3, .3, .03), P['white'], .01); box('picture', (202, Y + 1.9, -5.98), (.9, .6, .03), woodD, .01); box('picture art', (202, Y + 1.9, -5.96), (.8, .5, .01), P['teal'], 0)
    cyl('ceiling lamp', (204.5, Y + 2.8, -3.0), .25, .1, P['white'], 'y', 20); sphere('ceiling bulb', (204.5, Y + 2.72, -3.0), .1, lampW)
    box('door inner', (208.98, Y + 1.05, -3.0), (.04, 2.1, .9), woodD, .01)
    # hidden floor stash: tiles over a concrete cavity filled with cash bricks; rug over it
    span('stash pit floor', (204.0, Y - .62, -3.6), (205.4, Y - .6, -2.2), conc, 0)
    for a, b in [((204.0, Y - .6, -3.62), (205.4, Y, -3.6)), ((204.0, Y - .6, -2.2), (205.4, Y, -2.18)), ((203.98, Y - .6, -3.6), (204.0, Y, -2.2)), ((205.4, Y - .6, -3.6), (205.42, Y, -2.2))]: span('stash wall', a, b, conc, 0)
    cash = []
    for i in range(2):
        for j in range(4):
            for k in range(2): cash += cash_brick('stash', (204.38 + i * .64, Y - .43 + k * .31, -3.43 + j * .33), 0, .98)
    keep('Stash cash', cash, (204.7, Y - .5, -2.9))
    tiles = [box('stash tile', (204.35 + i * .7, Y - .02, -3.25 + j * .7), (.68, .04, .68), tileF, .004) for i in range(2) for j in range(2)]
    keep('Stash tiles', tiles, (204.0, Y, -2.9))
    keep('Rug', [box('rug', (204.7, Y + .008, -2.9), (2.0, .012, 1.5), rugM, .004), box('rug border', (204.7, Y + .009, -2.9), (2.1, .01, 1.6), P['cream'], .004)], (203.7, Y, -2.9))
    # floor tiles of the room, separated so the opened stash reads (the room floor is cut where the stash is)
    # (the room floor object stays; the pit sits on top of it and the room-floor patch is hidden by Stash tiles in place)

# ================================================================== B. POLICE HQ — investigation office (x 220..232, z -7..0, floor y 0)
def hq_office():
    room('hq', 220, 232, -7, 0, 3.2, mat('floor_vinyl', (.55, .56, .52), 0, .45), P['cream'])
    span('hq dado', (220, 0, -6.99), (232, 1.0, -6.97), P['mint'], 0); span('hq dado w', (220.01, 0, -7), (220.03, 1.0, 0), P['mint'], 0)
    # evidence board on the back wall (texture drawn live in Three: sign_board covers x 222.5..229.5, y 1.0..2.6)
    span('hq board frame', (222.35, .9, -6.99), (229.65, 2.7, -6.95), woodD, .01); span('sign_board', (222.5, 1.0, -6.95), (229.5, 2.6, -6.93), sign('board'), 0)
    # window with blinds on the east wall (light rays come from here)
    span('hq window', (231.97, 1.0, -5.2), (232.0, 2.6, -2.4), glass, 0)
    for k in range(15): span('hq blind', (231.85, 1.05 + k * .1, -5.2), (231.9, 1.08 + k * .1, -2.4), blinds, 0)
    for k, (x, z) in enumerate([(223.5, -3.8), (228.6, -3.8), (223.5, -1.6)]):
        desk(f'hq desk{k}', x, z, 1.6, .8); crt_pc(f'hq pc{k}', x - .3, z - .15, 0)
        box(f'hq phone{k}', (x + .5, .82, z + .1), (.22, .08, .18), dark, .02); box(f'hq files{k}', (x + .35, .8, z - .2), (.3, .06, .38), manila, .005)
        box(f'hq lamp{k}', (x + .65, 1.0, z - .25), (.06, .4, .06), dark, .01); cyl(f'hq lampshade{k}', (x + .62, 1.18, z - .2), .1, .12, P['lime'], 'y', 14, 0, .05)
    chairO('Chair hq0', 223.5, -2.9, math.pi, True); chairO('Chair hq1', 228.6, -2.9, math.pi, True); chairO('Chair hq2', 223.5, -.7, math.pi, True)
    for k in range(4): box('filing', (220.4, .65, -6.4 + k * .65), (.55, 1.3, .6), shelfM, .02); [box('filing h', (220.69, .3 + j * .3, -6.4 + k * .65), (.02, .03, .2), chrome, 0) for j in range(4)]
    box('cooler', (231.4, .55, -.6), (.4, 1.1, .4), P['white'], .03); cyl('cooler jug', (231.4, 1.3, -.6), .15, .4, mat('water', (.5, .7, .9), 0, .1), 'y', 16)
    for x in (223, 229):
        box('hq fluoro', (x, 3.15, -3.5), (1.4, .06, .25), fluoro, .01); box('hq fluoro housing', (x, 3.18, -3.5), (1.5, .04, .32), steel, .01)
    keep('Ceiling fan', [cyl('cf hub', (226, 2.9, -2.5), .1, .15, dark, 'y', 12)] + [box('cf blade', (226 + math.cos(a) * .45, 2.84, -2.5 + math.sin(a) * .45), (.75, .015, .14), woodD, .005, (0, -a, 0)) for a in (0, 2.094, 4.189)], (226, 2.9, -2.5))
    cyl('cf rod', (226, 3.05, -2.5), .015, .3, dark, 'y', 6)
    span('hq map', (220.03, 1.3, -1.8), (220.05, 2.5, -.4), paper, 0)
    for k in range(3): box('hq coffee', (229.2 + k * .2, .83, -3.5), (.07, .1, .07), P['white'], .02)
    box('hq door', (226, 1.05, -.03), (1.0, 2.1, .06), woodD, .01)

# ================================================================== C. EVIDENCE ROOM (x 240..248, z -6..0)
def evidence_room():
    room('ev', 240, 248, -6, 0, 3.0, mat('floor_vinyl', (.55, .56, .52), 0, .45), concW)
    for k in range(3):
        x = 241 + k * 2.4
        for j in range(5): span('ev shelf', (x - .9, .1 + j * .55, -5.9), (x + .9, .14 + j * .55, -5.3), shelfM, .005)
        for s in (-1, 1): span('ev post', (x + s * .9 - .03, 0, -5.9), (x + s * .9 + .03, 2.4, -5.85), shelfM, 0); span('ev post', (x + s * .9 - .03, 0, -5.35), (x + s * .9 + .03, 2.4, -5.3), shelfM, 0)
        for j in range(4):
            for i in range(3): box('ev box', (x - .55 + i * .55, .32 + j * .55, -5.6), (.45, .32, .45), box_c, .01); box('ev label', (x - .55 + i * .55, .34 + j * .55, -5.37), (.2, .08, .005), paper, 0)
    desk('ev table', 244, -2.6, 3.0, 1.3, shelfM)
    # recovered money: KEEP pile on the table (bricks); empty pallets on the floor for the unrecovered share
    pile = []
    for i in range(4):
        for j in range(2):
            for k in range(2 if (i + j) % 3 else 3): pile += cash_brick('ev cash', (242.9 + i * .52, .94 + k * .31, -2.85 + j * .4), 0)
    keep('Evidence cash', pile, (244, .78, -2.6))
    for k in range(3): pallet_stack('ev pallet', 241.2 + k * 1.4, -.9, layers=0)
    box('ev tag', (243.0, .8, -2.1), (.12, .005, .08), paper, 0); box('ev scale', (245.7, .82, -2.3), (.45, .08, .35), steel, .02)
    for x in (242, 246): box('ev fluoro', (x, 2.95, -3), (1.4, .06, .25), fluoro, .01)
    span('ev cage', (239.8, 0, -.06), (248.2, 3.0, -.03), mat('chainlink_mesh', (.6, .62, .64), .8, .5), 0)
    span('sign_evidence', (240.8, 2.35, -5.99), (243.8, 2.75, -5.95), sign('evidence'), 0)

# ================================================================== D. ROADSIDE at dawn (x 260..300) — family-friendly aftermath: abandoned car, police tape
def roadside():
    span('rs ground', (240, -.3, -60), (320, 0, 40), grass, 0); span('rs road', (240, -.25, -1.8), (320, .02, 1.8), dirtR, 0)
    for k in range(40): ico('rs bush', (random.uniform(242, 318), .3, random.choice([-1, 1]) * random.uniform(4, 30)), random.uniform(.4, 1.0), leaf if k % 2 else leafD, (1.3, .7, 1.3), 1)
    for k in range(14): tree('rs tree', random.uniform(244, 318), random.choice([-1, 1]) * random.uniform(8, 35), random.uniform(3.5, 6))
    for x in range(250, 312, 3): cyl('rs fence post', (x, .55, -2.6), .05, 1.1, woodD, 'y', 6)
    for yy in (.5, .9): tube('rs fence wire', [(250, yy, -2.6), (311, yy, -2.6)], .006, dark, 1)
    ico('rs hill', (280, -14, -90), 40, mat('hill_far', (.38, .5, .32), 0, 1), (2.5, .6, 1), 2)
    car('Dark car', 281, -.3, carDk, .25)
    keep('Car door open', [box('cdo', (281.5, .75, .55), (.9, .7, .05), carDk, .02)], (281.95, .7, .55))
    posts = [(277.5, -2.2), (285.0, -2.2), (285.0, 2.6), (277.5, 2.6)]
    tp = [cyl('tape post', (x, .5, z), .03, 1.0, P['white'], 'y', 8) for x, z in posts]
    for (a, b) in zip(posts, posts[1:] + posts[:1]):
        tp.append(tube('tape', catenary((a[0], .92, a[1]), (b[0], .92, b[1]), .12, 10), .012, tape, 1))
        L_ = math.dist(a, b); ang = math.atan2(b[1] - a[1], b[0] - a[0])
        tp.append(box('tape ribbon', ((a[0] + b[0]) / 2, .86, (a[1] + b[1]) / 2), (L_, .07, .006), tape, 0, (0, -ang, 0)))
    keep('Tape', tp, (281, 0, 0))
    box('rs hat', (279.6, .06, .9), (.3, .08, .3), mat('felt', (.25, .22, .2), 0, 1), .05)

# ================================================================== E. POLICE HQ FACADE + GARAGE (x 310..336, front z 0)
def hq_exterior():
    Y = .15
    span('hqx bldg', (310, Y, -12), (336, Y + 8.2, 0), P['white'], .02); span('hqx base', (309.9, Y, -.05), (336.1, Y + .5, .05), stoneD, .01)
    span('hqx band', (309.9, Y + 3.6, -.05), (336.1, Y + 3.9, .08), P['blue'], .01); span('hqx roof', (309.7, Y + 8.2, -12.2), (336.3, Y + 8.5, .2), conc, .02)
    for fl in range(2):
        for k in range(7):
            if fl == 0 and k in (4, 5): continue
            window('hqx win', 312.2 + k * 3.4, Y + 2.0 + fl * 3.6, .03, 1.8, 1.3, steel, False, glassm=glass)
    span('hqx garage', (325.2, Y, -.05), (332.8, Y + 3.2, .02), mat('roller_steel', (.55, .58, .6), .7, .45), 0)
    for k in range(16): span('hqx roller', (325.2, Y + .1 + k * .2, .02), (332.8, Y + .13 + k * .2, .04), dark, 0)
    span('sign_hq', (313.5, Y + 4.25, .05), (324.5, Y + 5.05, .09), sign('hq'), 0)
    span('hqx canopy', (316, Y + 2.8, 0), (321, Y + 3.0, 2.2), conc, .02); door('hqx door', 318.5, Y, .03, 1.8, 2.4, glass)
    for s in (-1, 1): cyl('hqx flagpole', (318.5 + s * 4.5, 4, 2.6), .05, 8, chrome, 'y', 10)
    span('hqx yard', (306, -.25, 0), (340, .15, 4.0), stone, 0); span('hqx road', (300, -.25, 4.0), (346, 0, 13), asphalt, 0)
    for i in range(16): box('hqx dash', (301 + i * 2.8, .005, 8.5), (1.4, .01, .12), paint, 0)
    for px in (311, 334): palm('hqx palm', px, 2.5, 7.5, lean=.4)
    police_car('Pol A', 314.5, 2.4); police_car('Pol B', 321.5, 2.4)

reset(); safehouse(); moved(hq_office, 180); moved(evidence_room, 190); moved(roadside, 260); moved(hq_exterior, 290); export('part2.glb')
def props2():
    police_car('Police cruiser')
    keep('Cuffs', [torus('cuff', (s * .05, 0, 0), .035, .007, chrome, 'z', 16, 6) for s in (-1, 1)], (0, 0, 0))
    keep('Evidence box', [box('eb', (0, .16, 0), (.45, .32, .45), box_c, .01), box('eb label', (0, .2, .23), (.22, .08, .005), paper, 0)], (0, 0, 0))
reset(); props2(); export('props2.glb')
print('ALL ASSETS DONE')
