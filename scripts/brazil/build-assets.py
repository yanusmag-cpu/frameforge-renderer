"""FrameForge — Brazil $70M bank heist (Fortaleza, 2005). Original Blender sets & props.
Run: blender -b --factory-startup -P scripts/brazil/build-assets.py
Coordinates are Three.js metres (x along the street, y up, z toward the camera/road).
One continuous world:
  street level y=0 (road), north pavement y=.15 for z in [0,2.5], buildings z<0.
  landscaping shop x in [-4,4]; Banco Central x in [64,92] behind a plaza (facade z=-3, podium y=1.2).
  tunnel void y in [-5.9,-4.1], z in [.4,1.5], x from 2 to 78.3 (78 m), shop shaft x in [2,3].
  vault room x in [72,84], y in [-2.4,.8], z in [-4,1.2]; reinforced slab y in [-3.5,-2.4].
  section plane z=1.5 (cutaway shots clip 'FRONT' objects; the earth block's z=1.5 face is the cut).
Objects named 'KEEP …' stay separate (animated in Three). 'FRONT …' objects are removed in cutaway shots.
Materials are named by surface type; Three.js swaps in stylised canvas textures by name (UVs are world-scale box maps).
"""
import bpy, bmesh, math, random
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'public/brazil'; OUT.mkdir(parents=True, exist_ok=True)
random.seed(2005)
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
            if ax == 0: u, v = (co.y if n[0] < 0 else -co.y), co.z
            elif ax == 1: u, v = (-co.x if n[1] < 0 else co.x), co.z
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
cash = mat('cash', (.36, .55, .78), 0, .7); band = mat('cash_band', (.95, .93, .86), 0, .6); wrap = mat('cash_wrap', (.62, .7, .8), .2, .2)
pallet = mat('pallet_wood', (.72, .58, .38), 0, .8); vsteel = mat('vault_steel', (.6, .62, .64), .95, .3); brass = mat('brass', (.8, .62, .3), 1, .3)
awnG = mat('awning_green', (.12, .5, .35), 0, .8); awnR = mat('awning_red', (.75, .2, .18), 0, .8); awnB = mat('awning_blue', (.2, .35, .65), 0, .8)
bulb = mat('bulb', (1, .85, .55), 0, .4, (1, .78, .45), 6.0); fluoro = mat('fluoro', (.95, .98, 1), 0, .3, (.9, .95, 1), 4.0)
lampW = mat('lamp_warm', (1, .9, .7), 0, .3, (1, .82, .55), 3.0); ledG = mat('led_green', (.2, 1, .3), 0, .3, (.2, 1, .3), 5.0)
ledR = mat('led_red', (1, .15, .1), 0, .3, (1, .1, .05), 5.0); screen = mat('screen', (.3, .45, .4), 0, .2, (.4, .6, .5), 1.2)
rubber = mat('rubber', (.07, .07, .07), 0, .9); carR = mat('car_paint_red', (.7, .1, .1), .4, .3); carW = mat('car_paint_white', (.9, .9, .9), .4, .3)
carS = mat('car_paint_silver', (.62, .64, .66), .6, .3); carB = mat('car_paint_blue', (.15, .3, .6), .4, .3); fabric = mat('fabric', (.3, .32, .36), 0, .9)
bagW = mat('bag_white', (.9, .9, .86), 0, .9); plastic = mat('plastic_blue', (.15, .35, .7), 0, .5); plasticY = mat('plastic_yellow', (.95, .75, .1), 0, .5)
cable = mat('cable', (.08, .08, .08), 0, .6); ropeO = mat('cable_orange', (.95, .45, .1), 0, .6); sign = lambda n: mat('sign_' + n, (.9, .9, .9), 0, .5)
studioC = mat('studio_cyc', (.06, .08, .12), 0, .8); studioF = mat('studio_floor', (.05, .05, .07), .3, .25); studioL = mat('studio_led', (1, .25, .2), 0, .3, (1, .2, .15), 8.0)
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
def street():
    # road & pavements
    span('FRONT Road', (-40, -.25, 2.5), (130, 0, 10.5), asphalt, 0)
    for i in range(-20, 66): box('FRONT Lane dash', (i * 2.6, .005, 6.5), (1.4, .01, .12), paint, 0)
    span('FRONT Pavement S', (-40, -.25, 10.5), (130, .15, 13), walk, .01)
    span('FRONT Curb S', (-40, -.25, 10.4), (130, .17, 10.6), curb, .02)
    span('Pavement N', (-40, -.25, 0), (130, .15, 1.5), walk, .01)       # behind section plane
    span('FRONT Pavement N front', (-40, -.25, 1.5), (130, .15, 2.4), walk, .01)
    span('FRONT Curb N', (-40, -.25, 2.4), (130, .17, 2.6), curb, .02)
    span('Plaza', (60, .15, -6), (96, .2, 0), stone, .01)
    # earth block with the cut face at z=1.5 (strata coloured in Three by world y)
    e = span('Earth', (-40, -9, -16), (130, -.25, 1.5), earth, 0)
    void = [((2, -5.9, .4), (78.6, -4.1, 1.6)),            # main tunnel
            ((2, -5.9, -1.4), (3.1, -.2, 1.6)),            # shop shaft
            ((71.7, -4.2, -4.3), (84.3, .2, 1.6))]          # vault room + slab (separate objects)               # vault box + slab region (slab & room are separate objects)
    for a, b in void:
        c = span('cut', (a[0], a[1], a[2]), (b[0], b[1], b[2]), earth, 0); boolean(e, c)
    # ---- the landscaping shop (x -4..4)
    shop()
    # ---- row of colourful buildings between the shop and the bank
    cols = ['coral', 'teal', 'yellow', 'pink', 'blue', 'lime', 'peach', 'mint', 'cream', 'coral', 'teal', 'yellow']
    x = -28.0; k = 0
    for w in [6.5, 5.0, 7.0, 5.5]:
        house(x, w, random.choice([3.6, 4.2, 6.4]), P[cols[k % len(cols)]], variant=k); x += w; k += 1
    x = 4.0
    while x < 60:
        w = random.choice([4.5, 5.5, 6.5, 7.5]); w = min(w, 60 - x)
        if w < 3: break
        house(x, w, random.choice([3.6, 4.2, 6.5, 7.2]), P[cols[k % len(cols)]], variant=k)
        if k % 3 == 1: awning('Awning', x + .4, x + w - .4, 3.0, .02, 1.3, [awnR, awnB, awnG][k % 3])
        x += w; k += 1
    house(96, 8, 6.4, P['peach'], variant=2); house(104, 9, 4.2, P['teal'], variant=3); house(113, 8, 6.8, P['yellow'], variant=4)
    # ---- far side of the street (removed in cutaway)
    x = -30.0; k = 3
    while x < 125:
        w = random.choice([5.0, 6.0, 7.0]); house(x, w, random.choice([3.8, 4.4, 6.6]), P[cols[(k * 5) % len(cols)]], z0=13.0, front=True, variant=k); x += w; k += 1
    # ---- poles, wires, trees
    poles = list(range(-26, 128, 14))
    for i, px in enumerate(poles): pole('FRONT Pole', px, 2.15)
    for a, b in zip(poles, poles[1:]):
        for s in (-.6, 0, .6): tube('FRONT Wire', catenary((a, 8.75, 2.15 + s), (b, 8.75, 2.15 + s), .45), .012, cable, 1)
        tube('FRONT Wire low', catenary((a, 7.6, 2.15), (b, 7.6, 2.15), .6), .015, cable, 1)
    for px in [-18, 12, 26, 40, 54, 100]: tree('FRONT Tree', px + 7, 1.95, random.uniform(3.6, 4.6))
    for px in [63, 93]: palm('Palm', px, -1.5, 8.5, lean=.6)
    for px in [68, 88]: palm('Palm', px, -1.2, 6.5, lean=-.4)
    # ---- parked cars and bus stop on the far pavement
    car('Parked car A', 20, 3.4, carR, 0); car('Parked car B', 34, 3.4, carS, 0); car('Parked car C', 50, 9.5, carW, math.pi)
    car('Police car', -30, 5.0, carW, 0)  # driven past during the 'nobody suspected' time-lapse
    box('FRONT Bus shelter roof', (44, 2.6, 12.0), (3.4, .08, 1.4), steel, .02)
    for s in (-1.6, 1.6): box('FRONT Bus shelter post', (44 + s, 1.35, 12.5), (.08, 2.5, .08), steel, 0)
    box('FRONT Bus shelter bench', (44, .55, 12.3), (2.6, .06, .4), wood, .01)
    bank()
    vault()
    tunnel()
    studio()
def shop():
    x0, x1 = -4.0, 4.0
    span('Shop wall back', (x0, .15, -10), (x1, 4.2, -9.8), P['cream'], .01)
    for xx in (x0, x1 - .2): span('Shop wall side', (xx, .15, -10), (xx + .2, 4.2, 0), P['cream'], .01)
    span('Shop roof slab', (x0, 4.2, -10), (x1, 4.4, 0), conc, .01)
    span('Shop parapet', (x0, 4.4, -.25), (x1, 5.4, 0), P['cream'], .02)
    span('Shop facade top', (x0, 3.0, -.2), (x1, 4.4, 0.0), P['cream'], .01)
    span('Shop sign board', (x0 + .5, 3.25, .0), (x1 - .5, 4.15, .08), sign('shop'), .02)   # 'GRAMA SINTÉTICA' painted in Three
    for xx in (x0, x1 - .35): span('Shop pier', (xx, .15, -.2), (xx + .35, 3.0, .02), P['cream'], .01)
    span('Shop window', (x0 + .35, .6, -.08), (-.5, 2.75, -.04), glassS, 0)
    span('Shop window base', (x0 + .35, .15, -.15), (-.5, .6, 0), P['white'], .01)
    span('Shop mullion', (-.55, .15, -.15), (-.45, 3.0, .02), dark, 0)
    span('Shop door glass', (-.45, .15, -.08), (x1 - .35, 2.75, -.04), glassS, 0)
    span('Shop shutter box', (-.45, 2.75, -.25), (x1 - .35, 3.0, 0.02), steel, .01)
    span('Shop floor', (x0, .15, -10), (x1, .2, 0), mat('floor_shop', (.85, .8, .7), 0, .4), 0)
    span('Shop interior wall', (x0 + .2, 2.9, -9.8), (x1 - .2, 3.0, -.2), P['white'], 0)  # ceiling
    awning('Shop awning', x0 + .1, x1 - .1, 3.05, .05, 1.4, awnG)
    # interior: counter, shelves, grass rolls, plants, soil bags
    span('Counter', (-1.5, .2, -6.4), (2.5, 1.15, -5.7), wood, .02); span('Counter top', (-1.6, 1.15, -6.5), (2.6, 1.2, -5.6), woodD, .01)
    for i in range(3):
        span('Shelf', (-3.75, .6 + i * .7, -9.6), (-1.0, .65 + i * .7, -8.9), plank, .005)
        for j in range(4): cyl('Shelf pot', (-3.4 + j * .7, .8 + i * .7, -9.25), .16, .3, pot, 'y', 14, 0, .2); ico('Shelf plant', (-3.4 + j * .7, 1.08 + i * .7, -9.25), .2, leaf)
    for s in (-3.8, -.95): span('Shelf post', (s, .2, -9.65), (s + .05, 2.3, -9.6), dark, 0)
    for i in range(6): cyl('Grass roll', (1.8 + (i % 3) * .55, .5 + (i // 3) * .55, -8.8), .26, 1.8, turf, 'x' if False else 'z', 18)
    span('Turf sample', (-3.6, .21, -4.5), (-1.2, .24, -1.5), turf, .005)
    for i in range(5): span('Soil bag', (2.0, .2 + i * .18, -3.6 + (i % 2) * .05), (3.6, .38 + i * .18, -2.7), bagW, .04)
    for i, (px, pz) in enumerate([(-3.2, -.7), (-2.4, -.6), (3.3, .55), (-3.6, .6)]):
        cyl('Pot', (px, .4, pz), .28, .5, pot, 'y', 16, 0, .2); ico('Pot plant', (px, .95, pz), .45, leaf if i % 2 else leafD, (1, 1.2, 1))
    for xx in (-2.2, .5, 2.6): cyl('Fluoro', (xx, 2.85, -5), .03, 2.0, fluoro, 'z', 8)
    # floor hatch over the shaft (x 2..3.1, z -1.4..-.4) — animated lid
    keep('Hatch', [span('Hatch lid', (2.0, .2, -1.4), (3.1, .26, -.4), plank, .01)], (2.0, .23, -.9))
    span('Hatch frame', (1.95, .15, -1.45), (3.15, .21, -.35), woodD, 0)
def bank():
    x0, x1, zf = 64.0, 92.0, -3.0
    span('Bank podium', (x0 - 1, .2, -16), (x1 + 1, 1.2, zf + .6), stone, .02)
    for i in range(6): span('Bank step', (70, .2, zf + .6 + i * .32), (86, 1.2 - i * .17, zf + .92 + i * .32), stone, .01)
    # lower lobby glass curtain wall + columns
    span('Bank lobby glass', (x0 + 1, 1.2, zf - 1.6), (x1 - 1, 5.0, zf - 1.5), glass, 0)
    for i in range(10): span('Bank lobby mullion', (x0 + 1 + i * 2.88, 1.2, zf - 1.6), (x0 + 1.12 + i * 2.88, 5.0, zf - 1.45), dark, 0)
    for i in range(8): cyl('Bank column', (x0 + 2 + i * 3.43, 3.1, zf - .3), .32, 3.8, stone, 'y', 20)
    span('Bank doors', (76.5, 1.2, zf - 1.48), (79.5, 3.6, zf - 1.42), mat('glass_door', (.2, .3, .35), .3, .05), 0)
    span('Bank canopy', (x0, 5.0, zf - 1.6), (x1, 5.6, zf + .4), stone, .03)
    # upper stone-clad volume with recessed window strips
    span('Bank upper', (x0, 5.6, -16), (x1, 15.2, zf), stone, .02)
    for fl in range(3):
        y = 6.6 + fl * 2.9
        span('Bank win band', (x0 + .6, y, zf + .01), (x1 - .6, y + 1.5, zf + .03), glass, 0)
        for i in range(15): span('Bank fin', (x0 + .6 + i * 1.91, y - .1, zf), (x0 + .75 + i * 1.91, y + 1.6, zf + .35), stone, .01)
        span('Bank sill', (x0 + .4, y - .15, zf), (x1 - .4, y, zf + .4), stoneD, .01)
    span('Bank roof cap', (x0 - .2, 15.2, -16.2), (x1 + .2, 15.6, zf + .2), stoneD, .02)
    span('Bank sign', (70.5, 5.05, zf + .41), (85.5, 5.55, zf + .45), sign('bank'), 0)   # 'BANCO CENTRAL DO BRASIL'
    span('Bank emblem', (66.0, 11.5, zf + .01), (69.5, 14.5, zf + .06), sign('emblem'), 0)
    for s, fx in enumerate((86.0, 89.0)):
        cyl('Flagpole', (fx, 5.7, -.6), .05, 11, chrome, 'y', 10)
        o = mesh('Flag', [(fx, 10.8, -.6), (fx + 1.9, 10.6, -.62), (fx + 1.9, 9.4, -.6), (fx, 9.6, -.6)], [(0, 1, 2, 3)], flagG if s == 0 else sign('flag_ce'))
        o.modifiers.new('sol', 'SOLIDIFY').thickness = .01
    for i in range(14): cyl('Bollard', (65 + i * 2.0, .5, -.3), .1, .7, stoneD, 'y', 12)
    for i in range(30): box('Fence bar', (x0 - .8, 1.6, -15 + i * .4), (.03, 1.6, .03), dark, 0)
    for px in (66.5, 89.5): span('Planter', (px - 1.2, 1.2, -2.6), (px + 1.2, 1.7, -1.8), stone, .02); ico('Planter shrub', (px, 1.9, -2.2), .7, leaf, (1.4, .6, .5))
    # --- interior lobby (ground floor of the bank) for the 'no guards' shot
    span('Lobby floor', (x0 + 1, 1.2, -15), (x1 - 1, 1.22, zf - 1.6), marble, 0)
    span('Lobby back wall', (x0 + 1, 1.2, -15.2), (x1 - 1, 5.6, -15), P['cream'], 0)
    span('Lobby ceiling', (x0 + 1, 5.4, -15), (x1 - 1, 5.6, zf - 1.6), P['white'], 0)
    for i in range(3): cyl('Lobby downlight', (72 + i * 6, 5.38, -9), .25, .02, fluoro, 'y', 16)
    span('Guard desk', (71, 1.22, -8.6), (74.4, 2.3, -7.9), wood, .02); span('Guard desk top', (70.9, 2.3, -8.7), (74.5, 2.36, -7.8), stoneD, .01)
    for i in range(3):
        span('CCTV monitor', (71.3 + i * 1.05, 2.36, -8.55), (72.2 + i * 1.05, 3.05, -8.3), dark, .02)
        span('CCTV screen', (71.36 + i * 1.05, 2.42, -8.29), (72.14 + i * 1.05, 2.99, -8.27), sign('cctv'), 0)
    span('Guard chair seat', (72.4, 1.75, -9.7), (73.2, 1.85, -9.0), fabric, .04)
    span('Guard chair back', (72.4, 1.85, -9.75), (73.2, 2.7, -9.65), fabric, .04)
    cyl('Guard chair post', (72.8, 1.5, -9.35), .04, .5, dark, 'y', 8)
    cyl('Coffee mug', (74.0, 2.45, -8.1), .05, .12, mat('mug', (.9, .9, .9), 0, .4), 'y', 12)
    span('Alarm panel', (75.5, 2.6, -14.98), (76.1, 3.4, -14.9), P['white'], .02)
    for i in range(3): box('Alarm led', (75.65 + i * .15, 3.25, -14.88), (.05, .05, .02), ledG, 0)
def vault():
    # reinforced slab y -4.1..-2.4, with section face at z=1.5 and a breakthrough hole at x 77.6..78.6, z .4..1.3
    s = span('Slab', (71.7, -4.1, -4.3), (84.3, -3.0, 1.5), conc, 0)
    c = span('cut', (77.6, -4.2, .4), (78.6, -2.9, 1.3), conc, 0); boolean(s, c)
    for i in range(int(12 / .25) + 1):
        for yy in (-3.98, -3.12):
            cyl('Rebar x', (72.2 + i * .25, yy, -1.3), .016, 5.6, rebar, 'z', 6)  # bars along z poke out at the cut face
    for j in range(23):
        for yy in (-3.92, -3.18):
            tube('Rebar long', [(72.2, yy, -3.9 + j * .24), (77.55, yy, -3.9 + j * .24)], .014, rebar, 1)
            tube('Rebar long', [(78.65, yy, -3.9 + j * .24), (83.8, yy, -3.9 + j * .24)], .014, rebar, 1)
    for k in range(10):  # bent stubs at the hole edge
        x = 77.6 + random.uniform(0, 1); tube('Rebar stub', [(x, -3.2, 1.32), (x + random.uniform(-.1, .1), -3.3, 1.12), (x, -3.45, 1.05)], .016, rebar, 1)
    keep('Floor plug', [span('plug', (77.6, -3.02, .4), (78.6, -3.0, 1.3), tileF, 0), span('plug core', (77.6, -4.1, .4), (78.6, -3.02, 1.3), conc, 0)], (78.1, -3.0, .85))
    # room
    span('Vault floor finish', (72, -3.0, -4), (84, -2.98, 1.5), tileF, 0)
    c = span('cut', (77.6, -3.1, .4), (78.6, -2.5, 1.3), tileF, 0); boolean(bpy.data.objects['Vault floor finish'], c)
    span('Vault wall back', (72, -3.0, -4.3), (84, -.6, -4), concW, 0)
    span('Vault wall L', (71.7, -3.0, -4.3), (72, -.6, 1.5), concW, 0)
    span('Vault wall R', (84, -3.0, -4.3), (84.3, -.6, 1.5), concW, 0)
    span('Vault ceiling', (71.7, -.6, -4.3), (84.3, -.25, 1.5), conc, 0)
    for xx in range(73, 84, 3): span('Vault fluoro', (xx, -.66, -2.2), (xx + 1.4, -.6, -1.9), fluoro, 0)
    for i in range(12): span('Wall rib', (72.05 + i * 1.0, -3.0, -4.0), (72.15 + i * 1.0, -.6, -3.92), conc, 0)
    # vault door on the left wall (opens into the corridor at x<72)
    dr = []
    dr.append(cyl('Door slab', (0, 0, 0), 1.1, .55, vsteel, 'x', 48, .02))
    for k in range(16):
        a = k / 16 * math.tau; dr.append(cyl('Door bolt', (.0, math.sin(a) * .95, math.cos(a) * .95), .06, .7, chrome, 'x', 12))
    dr.append(cyl('Door hub', (.3, 0, 0), .22, .12, chrome, 'x', 24))
    for k in range(3):
        a = k / 3 * math.tau; dr.append(tube('Door spoke', [(.33, 0, 0), (.33, math.sin(a) * .65, math.cos(a) * .65)], .035, chrome, 2))
        dr.append(sphere('Door spoke knob', (.33, math.sin(a) * .68, math.cos(a) * .68), .06, chrome))
    dr.append(torus('Door ring', (.29, 0, 0), .85, .03, brass, 'x', 48, 8))
    d = keep('Vault door', dr, (0, 0, 1.1)); d.location = L(72.3, -1.85, -.3)
    torus('Door frame', (72.0, -1.85, -1.4), 1.17, .1, vsteel, 'x', 48, 10)
    cyl('Door hinge', (72.25, -1.85, -.27), .12, 2.0, vsteel, 'y', 16)
    # cash pallets (separately animated) + steel cages
    spots = [(73.4, -3.0), (74.9, -3.0), (76.4, -3.0), (79.6, -3.0), (81.1, -3.0), (82.6, -3.0), (74.2, -1.4), (81.8, -1.4), (82.8, .2), (74.0, .1)]
    for i, (px, pz) in enumerate(spots):
        parts = pallet_stack(f'P{i}', 0, 0, 4 if i < 6 else 3)
        o = keep(f'Pallet {i}', parts, (0, 0, 0)); o.location = L(px, -2.98, pz)
    for i in range(7): box('Cage post', (72.9 + i * 1.65, -1.8, -3.75), (.05, 2.4, .05), dark, 0)
    for i in range(5): box('Cage rail', (78, -2.8 + i * .5, -3.75), (11.6, .03, .03), dark, 0)
    box('Motion sensor', (83.7, -.85, -3.7), (.2, .25, .15), P['white'], .03); box('Motion sensor led', (83.62, -.92, -3.62), (.04, .04, .02), ledG, 0)
    cyl('CCTV cam', (83.5, -.8, 1.0), .08, .3, P['white'], 'x', 12)
    # corridor beyond the door (dark)
    span('Corridor floor', (66, -3.0, -3), (72, -2.98, .2), tileF, 0); span('Corridor wall', (66, -3.0, -3.2), (71.7, -.6, -3), concW, 0)
    span('Corridor light', (68, -.66, -1.6), (69.4, -.6, -1.3), fluoro, 0)
def tunnel():
    # dirt floor + wood frames every 1.2 m + ceiling planks + plastic sheet + cable with bulbs + air duct
    span('Tunnel floor', (2, -5.9, .4), (78.6, -5.82, 1.5), dirt, 0)
    x = 3.2
    while x < 77.5:
        for zz in (.48, 1.42): box('Tunnel post', (x, -5.0, zz), (.1, 1.8, .1), wood, .01)
        box('Tunnel cap', (x, -4.16, .95), (.14, .1, 1.1), wood, .01)
        x += 1.2
    for i in range(61): box('Tunnel plank', (3.0 + i * 1.2 + .6, -4.1, .95), (1.2, .03, 1.0), plank, .004)
    tube('Tunnel cable', [(2.2, -4.2, .55)] + [(3.2 + i * 1.2, -4.24 - .04 * (i % 2), .55) for i in range(63)] + [(78.4, -4.2, .55)], .012, cable, 1)
    for i in range(19):
        bx = 4.4 + i * 4.0
        cyl('Bulb socket', (bx, -4.28, .62), .03, .08, dark, 'y', 8); sphere('Bulb', (bx, -4.38, .62), .055, bulb)
    tube('Air duct', [(2.4, -4.32, 1.32)] + [(3.0 + i * 3, -4.32 + .03 * math.sin(i), 1.3) for i in range(26)], .09, mat('duct', (.75, .76, .78), .6, .4), 3)
    for i in range(25):
        x = random.uniform(5, 76); ico('Dirt clump', (x, -5.8, random.uniform(.55, 1.35)), random.uniform(.05, .12), dirt, (1, .6, 1))
    for x in (9.0, 31.0, 55.0): cyl('Bucket', (x, -5.68, 1.25), .15, .3, plastic if x < 40 else plasticY, 'y', 14, 0, .12)
    # shop shaft: ladder + timber lining (x 2..3.1)
    for s in (2.25, 2.85): box('Ladder rail', (s, -2.87, -1.25), (.06, 6.05, .06), wood, .005)
    for i in range(18): box('Ladder rung', (2.55, -5.6 + i * .32, -1.25), (.62, .04, .05), wood, 0)
    for i in range(5): box('Shaft lining', (2.55, -1.0 - i * .95, -1.38), (1.1, .2, .04), plank, 0)
    # end: short timber prop under the breakthrough
    for s in (77.7, 78.5): box('End prop', (s, -5.0, .5), (.1, 1.8, .1), wood, .01)
def studio():
    """Presenter set floating on the road in front of the bank; the backdrop halves slide away (KEEP)."""
    cx, cz = 78.0, 7.0
    for side in (-1, 1):
        parts = []
        for k in range(16):
            a0 = (k / 16) * math.pi / 2; a1 = ((k + 1) / 16) * math.pi / 2
            r = 3.4; xa, za = cx + side * math.sin(a0) * r, cz - math.cos(a0) * r + .4; xb, zb = cx + side * math.sin(a1) * r, cz - math.cos(a1) * r + .4
            parts.append(mesh('Cyc seg', [(xa, 0, za), (xb, 0, zb), (xb, 4.2, zb), (xa, 4.2, za)], [(0, 1, 2, 3) if side > 0 else (1, 0, 3, 2)], studioC))
        for yy in (.6, 3.7):
            parts.append(tube('Cyc LED', [(cx + side * math.sin(a * math.pi / 32) * 3.36, yy, cz - math.cos(a * math.pi / 32) * 3.36 + .4) for a in range(17)], .02, studioL, 1))
        for k in (5, 10):
            a = k / 16 * math.pi / 2; parts.append(box('Cyc panel LED', (cx + side * math.sin(a) * 3.33, 2.2, cz - math.cos(a) * 3.33 + .4), (.04, 2.6, .04), studioW, 0))
        keep('Studio ' + ('R' if side > 0 else 'L'), parts, (cx, 0, cz))
    keep('Studio floor', [cyl('Studio disc', (cx, .04, cz), 2.6, .08, studioF, 'y', 64), torus('Studio disc LED', (cx, .08, cz), 2.6, .02, studioL, 'y', 64, 6)], (cx, 0, cz))
    # hook cash mountain on the plaza (shown only in the opening)
    parts = []
    for ly in range(7):
        n = 9 - ly
        for i in range(n):
            for j in range(max(1, 4 - ly // 2)):
                parts += cash_brick('Hook brick', (78 - n * .27 + i * .54 + .27 + random.uniform(-.03, .03), .15 + ly * .31, 2.75 + j * .34 + ly * .17), random.uniform(-.05, .05))
    keep('Hook cash', parts, (78, 0, 3.3))

reset(); street(); export('world.glb')

# ================================================================== PROPS (separate, reusable)
def props():
    keep('Cash brick', cash_brick('b', (0, .15, 0)), (0, 0, 0))
    parts = []
    for a in range(2):
        for b in range(2): parts += cash_brick('c', (-.26 + a * .52, .48 + b * .31, 0), 0)
    parts += [box('Cart deck', (0, .28, 0), (1.2, .06, .5), wood, .01), box('Cart rail', (0, .45, -.25), (1.2, .3, .03), steel, 0)]
    for s in (-1, 1):
        for xx in (-.45, .45): parts.append(cyl('Cart wheel', (xx, .12, s * .2), .1, .05, rubber, 'z', 14))
    parts.append(tube('Cart handle', [(.6, .3, -.2), (.95, .85, -.2), (.95, .85, .2), (.6, .3, .2)], .02, steel))
    keep('Cash cart', parts, (0, 0, 0))
    keep('Pickaxe', [cyl('Pick handle', (0, .45, 0), .025, .9, wood, 'y', 10), mesh('Pick head', [(-.38, .9, -.02), (0, .96, -.03), (.38, .9, -.02), (.38, .9, .02), (0, .96, .03), (-.38, .9, .02), (0, .88, 0)],
         [(0, 1, 4, 5), (1, 2, 3, 4), (0, 6, 2, 1), (5, 4, 3, 6)], steel)], (0, 0, 0))
    keep('Shovel', [cyl('Shovel handle', (0, .55, 0), .02, 1.1, wood, 'y', 10), box('Shovel blade', (0, .02, 0), (.24, .3, .02), steel, .02), box('Shovel grip', (0, 1.1, 0), (.14, .04, .04), dark, .01)], (0, 0, 0))
    wb = [mesh('WB tub', [(-.45, .3, -.3), (.35, .3, -.25), (.35, .3, .25), (-.45, .3, .3), (-.6, .7, -.4), (.55, .7, -.35), (.55, .7, .35), (-.6, .7, .4)],
               [(0, 1, 2, 3), (0, 4, 5, 1), (1, 5, 6, 2), (2, 6, 7, 3), (3, 7, 4, 0)], plasticY)]
    wb.append(cyl('WB wheel', (.55, .18, 0), .18, .08, rubber, 'z', 16))
    for s in (-1, 1): wb.append(tube('WB handle', [(.55, .18, s * .05), (-.2, .4, s * .3), (-1.0, .62, s * .32)], .02, steel))
    for s in (-1, 1): wb.append(box('WB leg', (-.35, .15, s * .25), (.03, .3, .03), steel, 0))
    wb.append(ico('WB dirt', (-.05, .68, 0), .38, dirt, (1.2, .45, .9), 2))
    keep('Wheelbarrow', wb, (0, 0, 0))
    keep('Bucket', [cyl('Bucket body', (0, .16, 0), .15, .32, plastic, 'y', 16, 0, .12), ico('Bucket dirt', (0, .3, 0), .12, dirt, (1, .4, 1))], (0, 0, 0))
    keep('Work lamp', [cyl('Lamp cage', (0, .14, 0), .07, .2, dark, 'y', 10), sphere('Lamp bulb', (0, .14, 0), .05, bulb), torus('Lamp hook', (0, .29, 0), .04, .008, dark, 'z', 12, 4)], (0, .3, 0))
    keep('Chunk A', [ico('ca', (0, 0, 0), .16, conc, (1.3, .7, 1), 1)], (0, 0, 0))
    keep('Chunk B', [ico('cb', (0, 0, 0), .11, conc, (1, .8, 1.2), 1)], (0, 0, 0))
    keep('Grass roll', [cyl('gr', (0, 0, 0), .2, 1.4, turf, 'z', 18)], (0, 0, 0))
    keep('Newspaper', [box('np', (0, 0, 0), (.4, .01, .55), mat('paper', (.92, .9, .84), 0, .9), 0)], (0, 0, 0))
    keep('Key', [torus('kr', (0, 0, 0), .025, .006, brass, 'z', 16, 6), box('ks', (.06, 0, 0), (.08, .01, .004), brass, 0)], (0, 0, 0))
    keep('Clipboard', [box('cb', (0, 0, 0), (.24, .32, .015), wood, .005), box('cbp', (0, -.01, .009), (.21, .26, .003), mat('paper', (.92, .9, .84), 0, .9), 0)], (0, 0, 0))
    keep('Camera', [box('cam', (0, 0, 0), (.14, .09, .07), dark, .01), cyl('lens', (0, 0, .06), .03, .06, dark, 'z', 12)], (0, 0, 0))
reset(); props(); export('props.glb')
print('ALL ASSETS DONE')
