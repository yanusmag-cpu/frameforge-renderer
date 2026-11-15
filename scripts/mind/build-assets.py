"""FrameForge — The 72-Hour Mind Game: Blackstone Prison (original Blender sets & props).
Run: blender -b --factory-startup -P scripts/mind/build-assets.py
Three.js metres (x right, y up, z toward camera). Exterior centred at the origin; interiors are closed sets at x>=180:
  cell block hall 180-220 · control room 260-274 · interrogation 300-306 · security corridor 330-380 (+ service passage z<-1.7 at x 360)
  maintenance/electrical 400-442 · infirmary 460-474 · shaft 499-514 (+ service room 514-521) · warden office 540-548.
Objects named KEEP stay separate (animated in Three); FRONT objects can be hidden for cutaway framing. Materials are named by surface type.
"""
import bpy, bmesh, math, random
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'public/mind'; OUT.mkdir(parents=True, exist_ok=True)
random.seed(72)
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

# ================================================================== BLACKSTONE PRISON — materials
def M(n, c, metal=0.0, rough=.7, emit=None, s=0.0): return mat(n, c, metal, rough, emit, s)
concP = M('concrete_panel', (.62, .62, .6), 0, .9); concD = M('concrete_dark', (.38, .38, .37), 0, .95); concF = M('concrete_floor', (.5, .5, .49), 0, .5)
brick = M('brick_grey', (.52, .5, .48), 0, .9); grassE = M('grass_ext', (.33, .45, .22), 0, 1); gravel = M('gravel', (.55, .53, .5), 0, 1)
asph = M('asphalt', (.17, .17, .18), 0, .95); paintW = M('road_paint', (.92, .9, .84), 0, .7); paintY = M('road_paint_yellow', (.95, .76, .15), 0, .7)
steel = M('metal', (.55, .57, .6), .9, .35); dark = M('metal_dark', (.13, .13, .14), .6, .45); bars = M('metal_bars', (.32, .35, .38), .9, .35)
paintSteel = M('steel_paint_grey', (.42, .46, .5), .5, .5); doorG = M('steel_door_green', (.27, .38, .33), .4, .55); doorB = M('steel_door_blue', (.2, .3, .42), .4, .5)
glass = M('glass', (.1, .16, .22), .3, .08); glassD = M('glass_mirror', (.05, .06, .08), .8, .05); chrome = M('chrome', (.82, .84, .86), 1, .15)
wallLo = M('paint_wall_lower', (.36, .45, .42), 0, .6); wallHi = M('paint_wall_upper', (.82, .82, .78), 0, .8); wallBlue = M('paint_wall_blue', (.55, .62, .7), 0, .7)
wallCream = M('paint_wall_cream', (.86, .82, .72), 0, .8); wallInf = M('paint_wall_infirmary', (.82, .88, .86), 0, .7); wallOff = M('paint_wall_office', (.62, .58, .5), 0, .8)
stripeY = M('paint_stripe_yellow', (.9, .7, .1), 0, .6); stripeR = M('paint_stripe_red', (.7, .12, .1), 0, .6); hazard = M('hazard_stripe', (.95, .75, .1), 0, .6)
tile = M('floor_tile', (.68, .7, .7), 0, .35); vinyl = M('floor_vinyl', (.45, .5, .48), 0, .4); carpet = M('carpet_blue', (.2, .25, .35), 0, 1)
wood = M('wood', (.5, .33, .19), 0, .7); woodD = M('wood_dark', (.3, .19, .11), 0, .7); fabricB = M('fabric', (.28, .33, .42), 0, .95)
mattress = M('mattress', (.72, .7, .62), 0, .95); blanket = M('blanket_grey', (.38, .4, .44), 0, 1); sheet = M('linen', (.88, .9, .9), 0, .9)
curtain = M('curtain_green', (.55, .72, .66), 0, .9); rubber = M('rubber', (.07, .07, .07), 0, .9); plastic = M('plastic_beige', (.78, .74, .66), 0, .5)
pipeR = M('pipe_red', (.62, .12, .1), .4, .5); pipeY = M('pipe_yellow', (.85, .62, .12), .4, .5); pipeG = M('pipe_grey', (.5, .52, .54), .7, .4); pipeB = M('pipe_blue', (.18, .32, .5), .4, .5)
copper = M('copper', (.75, .42, .25), 1, .35); cable = M('cable', (.06, .06, .06), 0, .6); duct = M('duct', (.6, .62, .64), .9, .35); rust = M('rust', (.42, .24, .14), .5, .8)
fluoro = M('fluoro', (.95, .98, 1), 0, .3, (.85, .93, 1), 4.0); lampW = M('lamp_warm', (1, .9, .7), 0, .3, (1, .78, .5), 4.0); lampC = M('lamp_cool', (.9, .95, 1), 0, .3, (.75, .85, 1), 3.0)
emerg = M('emergency_red', (1, .15, .1), 0, .3, (1, .08, .04), 0.6); ledG = M('led_green', (.2, 1, .3), 0, .3, (.2, 1, .3), 5.0); ledR = M('led_red', (1, .15, .1), 0, .3, (1, .1, .05), 5.0)
ledA = M('led_amber', (1, .6, .1), 0, .3, (1, .55, .1), 4.0); screen = M('screen_wall', (.3, .35, .4), 0, .25, (.6, .7, .8), 1.0); screenS = M('screen_small', (.2, .3, .35), 0, .25, (.3, .55, .7), 1.2)
leaf = M('plant_leaf', (.2, .4, .18), 0, .8); leafD = M('plant_leaf_dark', (.12, .3, .14), 0, .8); bark = M('tree_bark', (.3, .22, .15), 0, .9); hill = M('hill', (.3, .38, .25), 0, 1)
carW = M('car_paint_white', (.9, .9, .9), .4, .3); carN = M('car_paint_navy', (.1, .15, .28), .4, .3); carS = M('car_paint_silver', (.62, .64, .66), .6, .3); carY = M('car_paint_yellow', (.9, .7, .1), .4, .35)
paper = M('paper', (.93, .92, .88), 0, .9); blue_print = M('blueprint', (.15, .3, .6), 0, .8); cork = M('cork', (.65, .48, .3), 0, 1); chalk = M('chalkboard', (.12, .16, .14), 0, .9)
wire = M('razor_wire', (.7, .72, .75), 1, .3); fence = M('chainlink', (.6, .62, .64), .9, .4); medW = M('medical_white', (.92, .93, .94), .1, .35)
dust = M('dust_grime', (.32, .3, .27), 0, 1); web = M('cobweb', (.85, .85, .85), 0, 1); crate = M('crate_wood', (.55, .42, .26), 0, .85); cardb = M('cardboard', (.62, .48, .32), 0, .95)
sign = lambda n: mat('sign_' + n, (.9, .9, .9), 0, .5); flagG = M('flag_generic', (.2, .3, .5), 0, .8); leather = M('leather_black', (.08, .08, .09), 0, .5)
gold = M('brass', (.8, .62, .3), 1, .3)

# ================================================================== builders
def Lbox(n, a, b, m, bev=.008): return span(n, a, b, m, bev)
def room(tag, x0, x1, z0, z1, h, floor, wall, ceil=None, lower=None, lowerH=1.2, skip=(), t=.2, base=None):
    """closed room; walls are thick slabs outside the interior box. skip: sides to omit ('n','s','e','w')."""
    o = [Lbox(tag + ' floor', (x0 - t, -.2, z0 - t), (x1 + t, 0, z1 + t), floor, 0)]
    o.append(Lbox(tag + ' ceiling', (x0 - t, h, z0 - t), (x1 + t, h + .25, z1 + t), ceil or wallHi, 0))
    sides = {'n': ((x0 - t, 0, z0 - t), (x1 + t, h, z0)), 's': ((x0 - t, 0, z1), (x1 + t, h, z1 + t)), 'w': ((x0 - t, 0, z0), (x0, h, z1)), 'e': ((x1, 0, z0), (x1 + t, h, z1))}
    for k, (a, b) in sides.items():
        if k in skip: continue
        o.append(Lbox(f'{"FRONT " if k == "s" else ""}{tag} wall {k}', a, b, wall, 0))
        if lower:  # painted dado band on the interior face
            if k == 'n': o.append(Lbox(f'{tag} dado n', (x0, 0, z0), (x1, lowerH, z0 + .012), lower, 0)); o.append(Lbox(f'{tag} stripe n', (x0, lowerH, z0), (x1, lowerH + .06, z0 + .014), stripeY if base is None else base, 0))
            if k == 's': o.append(Lbox(f'FRONT {tag} dado s', (x0, 0, z1 - .012), (x1, lowerH, z1), lower, 0))
            if k == 'w': o.append(Lbox(f'{tag} dado w', (x0, 0, z0), (x0 + .012, lowerH, z1), lower, 0))
            if k == 'e': o.append(Lbox(f'{tag} dado e', (x1 - .012, 0, z0), (x1, lowerH, z1), lower, 0))
        o.append(Lbox(f'{tag} skirting {k}', (a[0] if k != 'e' else x1 - .03, 0, a[2] if k != 's' else z1 - .03), (b[0] if k != 'w' else x0 + .03, .1, b[2] if k != 'n' else z0 + .03), concD, 0) if k in 'nwe' else None)
    return [x for x in o if x]
def fluor_fixture(n, x, y, z, ln=1.2, axis='x', m=fluoro):
    s = (ln, .06, .22) if axis == 'x' else (.22, .06, ln)
    return [box(n + ' housing', (x, y - .03, z), (s[0] + .06, .07, s[2] + .06), paintSteel, .01), box(n + ' tube', (x, y - .075, z), (s[0], .03, s[2] * .7), m, .01)]
def cctv(n, x, y, z, yaw=0.0, keep=False):
    """wall CCTV camera on a bracket; yaw = direction the lens points (rad, 0 = +z)."""
    dx, dz = math.sin(yaw), math.cos(yaw)
    parts = [box(n + ' mount', (x, y + .1, z), (.12, .22, .12), paintSteel, .01),
             box(n + ' arm', (x + dx * .12, y, z + dz * .12), (.06, .06, .26), paintSteel, .005, rot=(0, yaw, 0)),
             box(n + ' body', (x + dx * .3, y - .05, z + dz * .3), (.17, .15, .38), M('camera_white', (.88, .88, .86), .2, .4), .03, rot=(-.35, yaw, 0)),
             box(n + ' hood', (x + dx * .32, y + .04, z + dz * .32), (.21, .03, .44), paintSteel, .01, rot=(-.35, yaw, 0)),
             cyl(n + ' lens', (x + dx * .5, y - .12, z + dz * .5), .055, .04, glassD, 'z', 16),
             sphere(n + ' led', (x + dx * .48, y - .02, z + dz * .48), .018, ledR, segs=8)]
    if keep: return keep_obj('Cam ' + n, parts, (x, y, z))
    return parts
def keep_obj(n, parts, pivot): return keep(n.replace(' ', '_'), parts, pivot)
def door_steel(n, x, z, w=1.0, h=2.15, face='z', m=doorG, window=True, keepit=False, hinge=None, sign_m=None):
    """steel door in a wall plane at z (face='z') or x (face='x'). Frame + leaf + small wired window + handle."""
    parts = []
    if face == 'z':
        parts += [box(n + ' frame', (x, h / 2 + .03, z), (w + .16, h + .1, .14), paintSteel, .01)]
        leaf = [box(n + ' leaf', (x, h / 2, z + .03), (w, h, .06), m, .008)]
        if window: leaf += [box(n + ' win', (x, 1.55, z + .065), (.26, .34, .01), glass, 0), box(n + ' winframe', (x, 1.55, z + .068), (.32, .4, .006), paintSteel, 0)]
        leaf += [box(n + ' handle', (x + w * .38, 1.02, z + .1), (.16, .04, .04), chrome, .01), box(n + ' kick', (x, .15, z + .066), (w * .9, .26, .006), steel, 0)]
    else:
        parts += [box(n + ' frame', (x, h / 2 + .03, z), (.14, h + .1, w + .16), paintSteel, .01)]
        leaf = [box(n + ' leaf', (x + .03, h / 2, z), (.06, h, w), m, .008)]
        if window: leaf += [box(n + ' win', (x + .065, 1.55, z), (.01, .34, .26), glass, 0)]
        leaf += [box(n + ' handle', (x + .1, 1.02, z + w * .38), (.04, .04, .16), chrome, .01)]
    if keepit:
        hx = hinge or ((x - w / 2, 0, z) if face == 'z' else (x, 0, z - w / 2))
        return parts + [keep_obj(n, leaf, hx)]
    return parts + leaf
def pipe_run(n, pts, r, m, brackets=True):
    o = [tube(n, pts, r, m, 3)]
    if brackets:
        for i in range(len(pts) - 1):
            a, b = pts[i], pts[i + 1]; L_ = math.dist(a, b); k = max(1, int(L_ / 1.6))
            for j in range(1, k + 1):
                t = j / (k + 1); p = tuple(a[q] + (b[q] - a[q]) * t for q in range(3))
                o.append(box(n + ' clamp', p, (r * 2.6 if abs(b[0] - a[0]) < .01 else .05, r * 2.6, r * 2.6 if abs(b[2] - a[2]) < .01 else .05), dark, .004))
    return o
def valve(n, p, r=.12, m=pipeR):
    return [torus(n + ' wheel', p, r, .018, m, 'z', 20, 6), cyl(n + ' stem', (p[0], p[1], p[2] - .06), .02, .12, chrome, 'z', 8)]
def panel_box(n, x, y, z, w=.6, h=.8, d=.2, lights=True):
    o = [box(n, (x, y, z + d / 2), (w, h, d), paintSteel, .01), box(n + ' door', (x, y, z + d + .005), (w - .04, h - .04, .01), M('panel_grey', (.55, .57, .58), .4, .5), .004),
         box(n + ' label', (x, y + h * .32, z + d + .012), (w * .5, .06, .004), M('label_white', (.92, .9, .8), 0, .6), 0), box(n + ' handle', (x + w * .38, y, z + d + .02), (.03, .1, .03), dark, .005)]
    if lights: o += [sphere(n + ' l1', (x - w * .3, y + h * .38, z + d + .015), .015, ledG, segs=8), sphere(n + ' l2', (x - w * .22, y + h * .38, z + d + .015), .015, ledA, segs=8)]
    return o
def chair_office(n, x, z, yaw=0.0, keepit=True, m=fabricB):
    parts = [cyl(n + ' base', (x, .06, z), .3, .03, dark, 'y', 5), cyl(n + ' post', (x, .28, z), .03, .4, chrome, 'y', 10),
             box(n + ' seat', (x, .5, z), (.48, .08, .46), m, .03),
             box(n + ' back', (x - math.sin(yaw) * .22, .82, z - math.cos(yaw) * .22), (.46, .5, .07), m, .03, rot=(0, yaw, 0))]
    for k in range(5):
        a = k * 2 * math.pi / 5; parts.append(sphere(n + ' wheel', (x + math.cos(a) * .3, .03, z + math.sin(a) * .3), .03, rubber, segs=8))
    return keep_obj(n, parts, (x, 0, z)) if keepit else parts
def chair_steel(n, x, z, yaw=0.0, keepit=True):
    dx, dz = math.sin(yaw), math.cos(yaw)
    parts = [box(n + ' seat', (x, .46, z), (.44, .04, .42), paintSteel, .01), box(n + ' back', (x - dx * .2, .72, z - dz * .2), (.42 if abs(dz) > .5 else .04, .3, .04 if abs(dz) > .5 else .42), paintSteel, .01)]
    for sx in (-1, 1):
        for sz in (-1, 1): parts.append(cyl(n + ' leg', (x + sx * .19, .23, z + sz * .18), .015, .46, chrome, 'y', 8))
    return keep_obj(n, parts, (x, 0, z)) if keepit else parts
def table_steel(n, x, z, w=1.4, d=.8, h=.75, m=paintSteel):
    o = [box(n + ' top', (x, h - .02, z), (w, .04, d), m, .01)]
    for sx in (-1, 1):
        for sz in (-1, 1): o.append(box(n + ' leg', (x + sx * (w / 2 - .06), (h - .04) / 2, z + sz * (d / 2 - .06)), (.05, h - .04, .05), steel, .004))
    return o
def tree(n, x, z, h=6.0):
    o = [cyl(n + ' trunk', (x, h * .3, z), .14, h * .6, bark, 'y', 8, r2=.09)]
    for k in range(4): o.append(ico(n + ' crown', (x + random.uniform(-.6, .6), h * (.62 + k * .1), z + random.uniform(-.6, .6)), h * (.24 - k * .03), leaf if k % 2 else leafD, (1, .85, 1), 1))
    return o
def razor_coil(n, x0, x1, y, z, axis='x', r=.32):
    pts = []; L_ = abs(x1 - x0); turns = int(L_ / .22)
    for i in range(turns * 8 + 1):
        a = i / 8 * 2 * math.pi; s = x0 + (x1 - x0) * i / (turns * 8)
        pts.append((s, y + math.sin(a) * r, z + math.cos(a) * r) if axis == 'x' else (z + math.cos(a) * r, y + math.sin(a) * r, s))
    return [tube(n, pts, .012, wire, 1)]

# ================================================================== EXTERIOR (centred at the origin)
def exterior():
    o = []
    o.append(Lbox('ground', (-260, -.3, -260), (260, 0, 260), grassE, 0))
    o.append(Lbox('yard gravel', (-59.7, -.28, -69.7), (59.7, .015, 29.7), gravel, 0))
    # roads: approach road + inner service road
    o.append(Lbox('road out', (-4.5, -.28, 30), (4.5, .03, 260), asph, 0))
    for zz in range(34, 260, 6): o.append(Lbox('road dash', (-.08, .03, zz), (.08, .036, zz + 3), paintW, 0))
    o.append(Lbox('road in', (-4.5, -.28, -12), (4.5, .03, 30), asph, 0)); o.append(Lbox('road ring', (-50, -.28, -27), (45, .03, -21), asph, 0))
    o.append(Lbox('road admin', (8, -.28, -21), (14, .03, -12), asph, 0))
    # perimeter wall with buttress panels, coping and razor wire
    H = 6.5
    for (a, b, nm) in [((-60.3, 0, -70.3), (60.3, H, -69.7), 'n'), ((-60.3, 0, 29.7), (-7, H, 30.3), 's1'), ((7, 0, 29.7), (60.3, H, 30.3), 's2'), ((-60.3, 0, -70.3), (-59.7, H, 30.3), 'w'), ((59.7, 0, -70.3), (60.3, H, 30.3), 'e')]:
        o.append(Lbox('perimeter ' + nm, a, b, concP, .01)); o.append(Lbox('coping ' + nm, (a[0] - .12, H, a[2] - .12), (b[0] + .12, H + .25, b[2] + .12), concD, .01))
    for x in list(range(-56, 60, 6)):
        for zz, sgn in ((-70.3, -1), (30.3, 1)):
            if abs(x) < 8 and sgn > 0: continue
            o.append(Lbox('pilaster', (x - .25, 0, zz + (0 if sgn > 0 else -.35)), (x + .25, H, zz + (.35 if sgn > 0 else 0)), concP, .01))
    for z in range(-66, 30, 6):
        for xx, sgn in ((-60.3, -1), (60.3, 1)): o.append(Lbox('pilaster', (xx + (0 if sgn > 0 else -.35), 0, z - .25), (xx + (.35 if sgn > 0 else 0), H, z + .25), concP, .01))
    for (x0, x1, zz) in [(-60, 60, -70), (-60, -7.2, 30), (7.2, 60, 30)]: o += razor_coil('wire', x0, x1, H + .55, zz)
    for (z0, z1, xx) in [(-70, 30, -60), (-70, 30, 60)]: o += razor_coil('wire', z0, z1, H + .55, xx, axis='z')
    # watchtowers
    for i, (x, z) in enumerate([(-58, -68), (58, -68), (-58, 28), (58, 28)]):
        tw = []
        for sx in (-1, 1):
            for sz in (-1, 1): tw.append(Lbox('tower leg', (x + sx * 1.4 - .15, 0, z + sz * 1.4 - .15), (x + sx * 1.4 + .15, 10, z + sz * 1.4 + .15), concP, .01))
        for yy in (3.5, 7):
            tw.append(Lbox('tower brace', (x - 1.45, yy, z - 1.45), (x + 1.45, yy + .25, z + 1.45), concD, .01))
        tw.append(Lbox('tower deck', (x - 2.2, 10, z - 2.2), (x + 2.2, 10.25, z + 2.2), concD, .01))
        tw.append(Lbox('tower cabin low', (x - 1.8, 10.25, z - 1.8), (x + 1.8, 11.2, z + 1.8), brick, .01))
        tw.append(Lbox('tower glass', (x - 1.75, 11.2, z - 1.75), (x + 1.75, 12.6, z + 1.75), glass, 0))
        for sx in (-1, 1):
            for sz in (-1, 1): tw.append(Lbox('tower mullion', (x + sx * 1.8 - .07, 11.2, z + sz * 1.8 - .07), (x + sx * 1.8 + .07, 12.6, z + sz * 1.8 + .07), dark, 0))
        tw.append(Lbox('tower roof', (x - 2.4, 12.6, z - 2.4), (x + 2.4, 12.9, z + 2.4), concD, .02)); tw.append(box('tower roof cap', (x, 13.1, z), (1.2, .3, 1.2), concD, .02))
        for sx in (-1, 1): tw.append(Lbox('tower rail', (x - 2.2, 11.1, z + sx * 2.2 - .03), (x + 2.2, 11.15, z + sx * 2.2 + .03), steel, 0))
        tw.append(Lbox('tower ladder', (x + 1.6, 0, z + 1.7), (x + 1.65, 10, z + 1.75), steel, 0))
        o += tw
        sl = [cyl('search body', (x, 13.55, z + .9), .28, .5, dark, 'z', 16), cyl('search lens', (x, 13.55, z + 1.16), .24, .02, lampW, 'z', 16), box('search yoke', (x, 13.3, z + .9), (.7, .1, .1), dark, .01)]
        o.append(keep_obj(f'Searchlight {i}', sl, (x, 13.55, z + .9)))
    # main gate (sliding) + gatehouse + sign
    g = [Lbox('gate frame', (-7, 0, 30.05), (7, 5.8, 30.25), M('gate_steel', (.3, .33, .36), .7, .45), .02)]
    for k in range(29): g.append(Lbox('gate bar', (-6.8 + k * .48, .2, 29.98), (-6.72 + k * .48, 5.6, 30.02), dark, 0))
    for yy in (.5, 2.8, 5.2): g.append(Lbox('gate rail', (-6.9, yy, 29.94), (6.9, yy + .18, 30.0), M('gate_steel', (.3, .33, .36), .7, .45), 0))
    g.append(Lbox('gate stripe', (-6.9, 1.4, 29.93), (6.9, 1.6, 29.94), hazard, 0))
    o.append(keep_obj('Gate main', g, (0, 0, 30.1)))
    o.append(Lbox('gate track', (-21, 0, 29.9), (7, .05, 30.4), steel, 0))
    for sx in (-1, 1): o.append(Lbox('gate pier', (sx * 7.4 - .45, 0, 29.4), (sx * 7.4 + .45, 7.3, 31.0), concD, .02)); o.append(box('gate lamp', (sx * 7.4, 7.5, 30.6), (.5, .25, .5), lampW, .02))
    gh = [Lbox('gatehouse', (9, 0, 31.2), (17, 4, 37), brick, .02), Lbox('gatehouse roof', (8.6, 4, 30.8), (17.4, 4.35, 37.4), concD, .02)]
    for k in range(3): gh.append(Lbox('gatehouse win', (9.6 + k * 2.4, 1.2, 37.0), (11.2 + k * 2.4, 2.6, 37.06), glass, 0))
    gh.append(Lbox('gatehouse door', (13.9, 0, 31.14), (15, 2.2, 31.2), doorB, 0)); o += gh
    o.append(Lbox('sign_blackstone', (-21.5, 2.6, 30.32), (-8.5, 4.6, 30.36), sign('blackstone'), 0))
    o.append(Lbox('sign back', (-21.7, 2.45, 30.29), (-8.3, 4.75, 30.33), dark, 0))
    # vehicle inspection checkpoint (inside the gate)
    ck = []
    for sx in (-1, 1):
        for zz in (14, 24): ck.append(Lbox('canopy col', (sx * 6 - .15, 0, zz - .15), (sx * 6 + .15, 5.2, zz + .15), paintSteel, .01))
    ck.append(Lbox('canopy roof', (-6.6, 5.2, 13.4), (6.6, 5.6, 24.6), M('canopy_white', (.85, .86, .86), .3, .5), .02))
    ck.append(Lbox('canopy fascia', (-6.62, 5.0, 24.55), (6.62, 5.6, 24.62), stripeY, 0))
    for zz in (16, 19, 22):
        for xx in (-3, 3): ck += fluor_fixture('canopy light', xx, 5.2, zz, 1.6, 'z', lampC)
    ck.append(Lbox('inspect line', (-4.4, .03, 24.6), (4.4, .04, 24.9), paintW, 0))
    for zz in (12, 26): ck.append(Lbox('speed bump', (-4.4, .03, zz), (4.4, .1, zz + .4), hazard, .02))
    ck += [Lbox('booth', (5, 0, 19.5), (7.2, 2.6, 22.5), brick, .02), Lbox('booth glass', (4.96, 1.1, 19.8), (5.0, 2.3, 22.2), glass, 0), Lbox('booth roof', (4.8, 2.6, 19.3), (7.4, 2.85, 22.7), concD, .02)]
    o += ck
    bar = [cyl('barrier arm', (0, 1.05, 24.4), .06, 8.4, M('barrier_red', (.85, .15, .1), .2, .45), 'x', 12), box('barrier weight', (4.3, 1.05, 24.4), (.4, .4, .3), dark, .02)]
    for k in range(5): bar.append(cyl('barrier band', (-3.4 + k * 1.6, 1.05, 24.4), .062, .4, paintW, 'x', 12))
    o.append(keep_obj('Barrier', bar, (4.2, 1.05, 24.4))); o.append(Lbox('barrier post', (4.1, 0, 24.2), (4.5, 1, 24.6), stripeY, .02))
    o.append(cyl('mirror pole', (-5.2, .8, 18), .04, 1.6, steel, 'y', 8)); o.append(cyl('mirror', (-5.2, .2, 18.4), .3, .02, chrome, 'y', 20))
    # inner double fence around the yard
    for zz in (-20, 10):
        for x0 in range(-32, 6, 3): o.append(cyl('fence post', (x0, 2, zz), .04, 4, fence, 'y', 6))
        o.append(Lbox('fence mesh', (-32, 0, zz - .01), (5, 4, zz + .01), M('chainlink_mesh', (.62, .64, .66), .8, .5), 0))
    for xx in (-32, 5):
        o.append(Lbox('fence mesh', (xx - .01, 0, -20), (xx + .01, 4, 10), M('chainlink_mesh', (.62, .64, .66), .8, .5), 0))
    o.append(Lbox('court', (-26, .015, -16), (-2, .03, 6), M('court_asphalt', (.24, .3, .36), 0, .9), 0))
    o.append(Lbox('court line', (-14.05, .03, -16), (-13.95, .035, 6), paintW, 0))
    for (x, z) in [(-28, -10), (-28, 2), (1, -10), (1, 2)]: o += table_steel('yard table', x, z, 1.8, .8, .75, concD)
    for zz in (-16, 6): o += [cyl('hoop post', (-14, 1.6, zz + (-.6 if zz > 0 else .6)), .08, 3.2, paintSteel, 'y', 10), box('backboard', (-14, 3.2, zz + (-.5 if zz > 0 else .5)), (1.4, .9, .05), M('backboard_white', (.9, .9, .9), 0, .5), .01), torus('hoop', (-14, 2.9, zz + (-.8 if zz > 0 else .8)), .23, .02, M('hoop_orange', (.9, .4, .1), .5, .4), 'y', 20, 6)]
    # cell block A
    cb = [Lbox('cellblock', (-45, 0, -62), (-5, 13, -30), concP, .02), Lbox('cellblock base', (-45.2, 0, -62.2), (-4.8, 1, -29.8), concD, .02), Lbox('cellblock parapet', (-45.3, 13, -62.3), (-4.7, 13.6, -29.7), concD, .02)]
    for fl in range(3):
        for k in range(14): cb.append(Lbox('slit window', (-43.5 + k * 2.8, 2.2 + fl * 3.8, -29.97), (-43.1 + k * 2.8, 4.2 + fl * 3.8, -29.93), glass, 0))
        for k in range(10): cb.append(Lbox('slit window', (-44.97, 2.2 + fl * 3.8, -60 + k * 3), (-44.93, 4.2 + fl * 3.8, -59.6 + k * 3), glass, 0))
        for k in range(10): cb.append(Lbox('slit window', (-5.07, 2.2 + fl * 3.8, -60 + k * 3), (-5.03, 4.2 + fl * 3.8, -59.6 + k * 3), glass, 0))
    cb.append(Lbox('sign_blockA', (-28, 10.3, -29.94), (-22, 11.8, -29.9), sign('blockA'), 0))
    cb.append(Lbox('cellblock entry', (-27, 0, -30), (-23, 3.4, -27.6), concD, .02)); cb.append(Lbox('cellblock door', (-26, 0, -27.62), (-24, 2.4, -27.58), doorB, 0))
    for k in range(4): cb.append(box('hvac', (-40 + k * 9, 14.2, -46), (3, 1.2, 2.2), paintSteel, .03)); cb.append(cyl('hvac fan', (-40 + k * 9, 14.82, -46), .8, .05, dark, 'y', 20))
    o += cb
    # administration
    ad = [Lbox('admin', (10, 0, -20), (42, 8, 2), wallCream, .02), Lbox('admin roof', (9.6, 8, -20.4), (42.4, 8.5, 2.4), concD, .02), Lbox('admin base', (9.8, 0, -20.2), (42.2, .6, 2.2), concD, .02)]
    for fl in range(2):
        for k in range(9): ad.append(Lbox('admin win', (11.5 + k * 3.4, 1.4 + fl * 3.4, 1.97), (13.7 + k * 3.4, 3.2 + fl * 3.4, 2.03), glass, 0)); ad.append(Lbox('admin sill', (11.4 + k * 3.4, 1.3 + fl * 3.4, 2.0), (13.8 + k * 3.4, 1.4 + fl * 3.4, 2.15), concD, 0))
    ad.append(Lbox('admin canopy', (22, 3.0, 2), (30, 3.25, 5.5), concD, .02)); ad.append(Lbox('admin entry glass', (23.5, 0, 1.96), (28.5, 2.8, 2.02), glass, 0))
    ad.append(Lbox('sign_admin', (21, 6.6, 2.04), (31, 7.4, 2.08), sign('admin'), 0))
    o += ad
    # utility / maintenance building with stack, transformer yard
    ut = [Lbox('utility', (-56, 0, -26), (-36, 7, -6), brick, .02), Lbox('utility roof', (-56.3, 7, -26.3), (-35.7, 7.4, -5.7), concD, .02),
          Lbox('roller door', (-50, 0, -5.97), (-44, 4.5, -5.93), M('roller_steel', (.55, .58, .6), .7, .45), 0), Lbox('sign_maint', (-52, 5, -5.95), (-42, 6, -5.91), sign('maint'), 0),
          cyl('stack', (-39, 11, -22), .8, 22, concP, 'y', 20), torus('stack band', (-39, 20, -22), .82, .06, stripeR, 'y', 24, 6)]
    for k in range(3): ut += pipe_run('ext pipe', [(-35.9, 5.5 - k * .4, -24), (-34, 5.5 - k * .4, -24), (-34, 5.5 - k * .4, -12)], .1, [pipeG, pipeY, pipeR][k], False)
    ut += [box('generator', (-30, 1.1, -14), (4, 2.2, 1.8), M('genset_green', (.2, .4, .3), .4, .5), .04), box('transformer', (-30, 1.2, -9), (2, 2.4, 1.6), paintSteel, .04)]
    o += ut
    # infirmary block
    inf = [Lbox('infirmary', (15, 0, -56), (36, 6, -36), wallInf, .02), Lbox('infirmary roof', (14.7, 6, -56.3), (36.3, 6.4, -35.7), concD, .02), Lbox('sign_infirmary', (20, 4.4, -35.96), (31, 5.4, -35.92), sign('infirmary'), 0)]
    for k in range(6): inf.append(Lbox('inf win', (16.5 + k * 3.2, 1.4, -35.97), (18.3 + k * 3.2, 3.2, -35.93), glass, 0))
    o += inf
    # floodlight masts + lamps along the service road
    for (x, z) in [(-20, -24), (5, -24), (-48, 0), (48, -40), (0, 8), (30, 20)]:
        o += [cyl('mast', (x, 6, z), .12, 12, paintSteel, 'y', 10), box('flood head', (x, 12.2, z), (1.4, .5, .5), dark, .03), box('flood lens', (x, 12.05, z + .26), (1.3, .35, .02), lampC, 0)]
    # parked vehicles
    o += vehicle('van', 18, 8, carW, 0) + vehicle('car', 32, 8, carS, 0, small=True) + vehicle('car', 36, 8, carN, 0, small=True)
    # landscape outside the walls
    for k in range(70):
        x = random.uniform(-200, 200); z = random.uniform(-200, 200)
        if -75 < x < 75 and -85 < z < 45: continue
        if -10 < x < 10 and z > 25: continue
        o += tree('tree', x, z, random.uniform(5, 9))
    for k in range(9):
        a = k / 9 * 2 * math.pi; o.append(ico('hill', (math.cos(a) * 230, -8, math.sin(a) * 230), 60, hill, (1.3, .45, 1.3), 2))
    for zz in range(40, 200, 25):
        for sx in (-1, 1): o += [cyl('road lamp', (sx * 6, 4, zz), .07, 8, paintSteel, 'y', 8), box('road lamp head', (sx * 5.3, 8, zz), (1.4, .15, .35), dark, .02)]
    return o
def vehicle(n, x, z, m, yaw=0.0, small=False, truck=False):
    L_, W_, H_ = (4.3, 1.8, 1.45) if small else (5.6, 2.0, 2.4)
    o = [box(n + ' body', (x, .45 + H_ / 2, z), (W_, H_ - .5, L_), m, .12)]
    if small: o.append(box(n + ' cabin', (x, .45 + H_ + .2, z - .2), (W_ * .9, .6, L_ * .5), glass, .12))
    else: o.append(box(n + ' windscreen', (x, .45 + H_ - .5, z + L_ / 2 + .005), (W_ * .86, .7, .02), glass, 0))
    for sx in (-1, 1):
        for sz in (-1, 1): o.append(cyl(n + ' wheel', (x + sx * W_ / 2, .36, z + sz * L_ * .32), .36, .26, rubber, 'x', 16))
    o += [box(n + ' light', (x + sx * W_ * .35, .9, z + L_ / 2 + .01), (.3, .12, .02), lampW, 0) for sx in (-1, 1)]
    return o

# ================================================================== A. CELL BLOCK HALL  x 180..220, z -8..8 (cells behind z=-8, 2 tiers)
CELLX = [182 + i * 3.6 for i in range(10)]   # cell left edges (3.6 m pitch, 3.3 m wide)
MCELL = 4                                      # Marcus: ground floor, cell index 4 → x 196.4..199.7
def cell(tag, x0, y0, detail=False):
    o = []; w = 3.3; z0, z1 = -12, -8
    o.append(Lbox(tag + ' back', (x0 - .15, y0, z0 - .2), (x0 + w + .15, y0 + 3.0, z0), concP, 0))
    for sx in (x0 - .15, x0 + w): o.append(Lbox(tag + ' side', (sx, y0, z0), (sx + .15, y0 + 3.0, z1), concP, 0))
    o.append(Lbox(tag + ' floor', (x0, y0 - .02, z0), (x0 + w, y0 + .005, z1), concF, 0)); o.append(Lbox(tag + ' ceil', (x0 - .15, y0 + 3.0, z0), (x0 + w + .15, y0 + 3.2, z1), concP, 0))
    o.append(Lbox(tag + ' dado', (x0, y0, z0 + .002), (x0 + w, y0 + 1.1, z0 + .012), wallLo, 0))
    o += fluor_fixture(tag + ' lamp', x0 + w / 2, y0 + 3.0, z0 + 1.2, .9)
    # bunk bed (2 tiers) along the left side wall
    bx = x0 + .5
    for yy in (.45, 1.65):
        o += [Lbox(tag + ' bunk', (x0 + .02, y0 + yy, z0 + .1), (x0 + .95, y0 + yy + .06, z0 + 2.1), paintSteel, .01), Lbox(tag + ' mattress', (x0 + .05, y0 + yy + .06, z0 + .12), (x0 + .92, y0 + yy + .2, z0 + 2.08), mattress, .04)]
        o.append(Lbox(tag + ' blanket', (x0 + .04, y0 + yy + .19, z0 + .7), (x0 + .93, y0 + yy + .25, z0 + 2.06), blanket, .03))
        o.append(box(tag + ' pillow', (bx, y0 + yy + .27, z0 + .35), (.6, .12, .36), sheet, .05))
    for zz in (z0 + .1, z0 + 2.1): o.append(Lbox(tag + ' bunk post', (x0 + .9, y0, zz - .03), (x0 + .96, y0 + 1.9, zz + .03), paintSteel, 0))
    # steel toilet + sink combo in the back corner, mirror plate
    o += [box(tag + ' wc', (x0 + w - .35, y0 + .25, z0 + .35), (.5, .5, .55), chrome, .08), box(tag + ' sink', (x0 + w - .35, y0 + .85, z0 + .18), (.5, .2, .3), chrome, .04), box(tag + ' mirror', (x0 + w - .35, y0 + 1.5, z0 + .01), (.35, .45, .01), chrome, 0)]
    # desk + stool on the right wall
    o += [Lbox(tag + ' desk', (x0 + w - .55, y0 + .72, z0 + .9), (x0 + w - .01, y0 + .76, z0 + 2.1), paintSteel, .01), Lbox(tag + ' shelf', (x0 + w - .3, y0 + 1.6, z0 + .9), (x0 + w - .01, y0 + 1.63, z0 + 2.1), paintSteel, 0),
          cyl(tag + ' stool', (x0 + w - .8, y0 + .25, z0 + 1.5), .17, .5, paintSteel, 'y', 12)]
    if detail:  # Marcus: books, stacked notebooks, drawings pinned to the wall, mug, folded jacket
        for k in range(7): o.append(box(tag + ' book', (x0 + w - .15, y0 + 1.75, z0 + 1.0 + k * .08), (.2, .24 + (k % 3) * .03, .06), M(f'book_{k % 4}', [(.6, .15, .12), (.15, .3, .5), (.2, .42, .25), (.75, .62, .3)][k % 4], 0, .8), .005))
        o += [box(tag + ' notebook', (x0 + w - .3, y0 + .77, z0 + 1.4), (.22, .02, .3), paper, .004), box(tag + ' notebook2', (x0 + w - .28, y0 + .79, z0 + 1.42), (.22, .02, .3), blue_print, .004),
              cyl(tag + ' mug', (x0 + w - .2, y0 + .82, z0 + 1.9), .04, .1, M('mug_white', (.9, .9, .88), 0, .4), 'y', 12)]
        o.append(Lbox('sign_cellsketch', (x0 + 1.1, y0 + 1.2, z0 + .015), (x0 + 2.6, y0 + 2.3, z0 + .02), sign('cellsketch'), 0))
    return o
def bars_door(tag, x0, y0, keepit=False):
    w = 3.3; z = -8; o = []
    fixed = [Lbox(tag + ' rail top', (x0, y0 + 2.75, z - .04), (x0 + w, y0 + 2.85, z + .04), bars, 0), Lbox(tag + ' rail low', (x0, y0, z - .04), (x0 + w, y0 + .06, z + .04), bars, 0)]
    for k in range(9): fixed.append(cyl(tag + ' bar', (x0 + .1 + k * .18, y0 + 1.4, z), .018, 2.75, bars, 'y', 8))
    leaf = [Lbox(tag + ' leaf frame', (x0 + 1.75, y0 + .06, z - .03), (x0 + 3.25, y0 + 2.7, z + .03), bars, .005)]
    for k in range(7): leaf.append(cyl(tag + ' leaf bar', (x0 + 1.85 + k * .2, y0 + 1.38, z + .045), .018, 2.6, bars, 'y', 8))
    for yy in (1.0, 2.0): leaf.append(Lbox(tag + ' leaf cross', (x0 + 1.75, y0 + yy, z + .03), (x0 + 3.25, y0 + yy + .05, z + .07), bars, 0))
    leaf.append(box(tag + ' lock', (x0 + 1.85, y0 + 1.1, z + .09), (.12, .22, .08), dark, .01)); leaf.append(Lbox(tag + ' meal slot', (x0 + 2.2, y0 + 1.05, z + .07), (x0 + 2.8, y0 + 1.25, z + .1), paintSteel, 0))
    o += fixed + ([keep_obj(tag.replace(' ', '_'), leaf, (x0 + 1.75, y0, z))] if keepit else leaf)
    o.append(Lbox(tag + ' number', (x0 + .2, y0 + 2.9, z + .01), (x0 + .7, y0 + 3.15, z + .04), M('plate_white', (.9, .9, .88), 0, .5), 0))
    return o
def cellblock_hall():
    o = []; X0, X1, Z0, Z1, H = 180, 220, -8, 8, 9.2
    o += room('hall', X0, X1, Z0, Z1, H, concF, concP, concD, skip=('n',))
    # front facade of cells (wall between cells above tiers) + floor band, upper gallery
    o.append(Lbox('cell face', (X0, 3.0, -8.2), (X1, 3.25, -8.0), concP, 0)); o.append(Lbox('cell face top', (X0, 6.2, -8.2), (X1, H, -8.0), concP, 0))
    for i, x0 in enumerate(CELLX):
        for tier, y0 in enumerate((0, 3.25)):
            o += cell(f'cell {tier}{i}', x0, y0, detail=(i == MCELL and tier == 0))
            o += bars_door(f'Celldoor {tier}{i}', x0, y0, keepit=(i == MCELL and tier == 0))
        o.append(Lbox('pier', (x0 + 3.3, 0, -8.15), (x0 + 3.6, 6.2, -7.95), concP, 0))
    o.append(Lbox('pier', (X0, 0, -8.15), (X0 + 2, 6.2, -7.95), concP, 0)); o.append(Lbox('pier', (218, 0, -8.15), (X1, 6.2, -7.95), concP, 0))
    o.append(Lbox('gallery deck', (X0, 3.05, -8), (X1, 3.25, -6.6), M('grating', (.4, .42, .44), .7, .5), .01))
    for k in range(41): o.append(cyl('gallery baluster', (X0 + 1 + k * .95, 3.75, -6.62), .02, 1.0, paintSteel, 'y', 6))
    o.append(Lbox('gallery rail', (X0, 4.22, -6.68), (X1, 4.28, -6.56), stripeY, .01)); o.append(Lbox('gallery mid', (X0, 3.7, -6.65), (X1, 3.73, -6.59), paintSteel, 0))
    for k in range(9): o.append(Lbox('gallery bracket', (X0 + 2 + k * 4.5, 2.6, -8), (X0 + 2.15 + k * 4.5, 3.05, -6.7), paintSteel, 0))
    # stair to the gallery at the east end
    for k in range(14): o.append(Lbox('stair', (215.4, k * .232, -6.6 + k * .0), (217.6, k * .232 + .05, -6.6 + .0), paintSteel, 0)) if False else None
    for k in range(13): o.append(Lbox('stair tread', (217.8 + 0, k * .25, -6.4 + k * .28 - 0), (219.6, k * .25 + .06, -6.12 + k * .28), M('grating', (.4, .42, .44), .7, .5), .005))
    o.append(Lbox('stair stringer', (217.75, 0, -6.4), (217.8, 3.25, -2.7), paintSteel, 0)); o.append(Lbox('stair rail', (217.7, 1.0, -6.4), (217.76, 4.2, -2.6), stripeY, 0))
    o.append(Lbox('landing', (217.8, 3.05, -8), (220, 3.25, -2.6), M('grating', (.4, .42, .44), .7, .5), .01))
    # tall windows on the south wall (light shafts), clerestory
    for k in range(8):
        x = 183 + k * 4.9; o.append(Lbox('FRONT hall window', (x, 4.2, 7.97), (x + 1.4, 8.4, 8.03), glass, 0))
        for yy in (5.6, 7.0): o.append(Lbox('FRONT hall window bar', (x, yy, 7.94), (x + 1.4, yy + .06, 7.96), dark, 0))
        for kk in range(4): o.append(Lbox('FRONT hall window bar', (x + .1 + kk * .4, 4.2, 7.94), (x + .14 + kk * .4, 8.4, 7.96), dark, 0))
    # floor: tables with fixed stools, painted walk line, guard podium, CCTV
    for (x, z) in [(186, 2.5), (193, 2.5), (200, 2.5), (207, 2.5)]:
        o += [cyl('table', (x, .72, z), .65, .05, paintSteel, 'y', 24), cyl('table post', (x, .36, z), .08, .72, paintSteel, 'y', 10)]
        for k in range(4): a = k * math.pi / 2 + .785; o += [cyl('stool', (x + math.cos(a) * 1.0, .42, z + math.sin(a) * 1.0), .17, .05, paintSteel, 'y', 14), cyl('stool post', (x + math.cos(a) * 1.0, .2, z + math.sin(a) * 1.0), .04, .42, paintSteel, 'y', 8)]
    o.append(Lbox('walk line', (X0, .005, -5.2), (X1, .012, -5.05), stripeY, 0)); o.append(Lbox('walk line', (X0, .005, -1.2), (X1, .012, -1.05), stripeY, 0))
    o += [Lbox('podium', (212, 0, 3), (214.4, 1.1, 5.2), paintSteel, .02), Lbox('podium top', (211.9, 1.1, 2.9), (214.5, 1.16, 5.3), woodD, .01), box('podium screen', (213.2, 1.35, 4.2), (.5, .32, .04), screenS, .01)]
    o += cctv('hallcam1', 181, 6.0, 7.6, math.pi * .75) + cctv('hallcam2', 219, 6.0, 7.6, -math.pi * .75) + cctv('hallcam3', 181, 6.0, -5, math.pi * .4)
    for x in range(184, 220, 6):
        for z in (-4, 3): o += fluor_fixture('hall lamp', x, H, z, 1.8)
    o += pipe_run('hall pipe', [(X0, 8.6, 7.3), (X1, 8.6, 7.3)], .1, pipeG) + pipe_run('hall pipe', [(X0, 8.3, 7.4), (X1, 8.3, 7.4)], .06, pipeB)
    o.append(Lbox('sign_blockA_in', (197, 7.2, -7.97), (203, 8.0, -7.93), sign('blockA_in'), 0))
    o += door_steel('hall door', 182.5, 7.95, 1.4, 2.4, m=doorB)
    return o

# ================================================================== B. SECURITY CONTROL ROOM  x 260..274, z -6..6
def control_room():
    o = room('ctrl', 260, 274, -6, 6, 3.4, carpet, wallBlue, concD, lower=wallLo)
    o.append(Lbox('screen_wall', (261.5, .95, -5.96), (272.5, 3.05, -5.92), screen, 0))          # 4x3 monitor grid → one canvas
    o.append(Lbox('screen bezel', (261.35, .85, -5.99), (272.65, 3.15, -5.95), dark, .01))
    for k in range(1, 4): o.append(Lbox('bezel v', (261.5 + k * 2.75 - .03, .95, -5.92), (261.5 + k * 2.75 + .03, 3.05, -5.9), dark, 0))
    for k in range(1, 3): o.append(Lbox('bezel h', (261.5, .95 + k * .7 - .025, -5.92), (272.5, .95 + k * .7 + .025, -5.9), dark, 0))
    # curved console (segments)
    for k in range(7):
        a = (k - 3) * .16; x = 267 + math.sin(a) * 4.6; z = -3.6 + (1 - math.cos(a)) * 4.6 * .25
        o += [box('console', (x, .42, z), (1.36, .84, .9), paintSteel, .02, rot=(0, -a, 0)), box('console top', (x, .86, z + .05), (1.4, .05, 1.0), M('console_black', (.08, .08, .09), .2, .4), .01, rot=(0, -a, 0)),
              box('console screen', (x - math.sin(a) * .1, 1.13, z - .25), (.62, .38, .03), screenS, .01, rot=(-.2, -a, 0)), box('keyboard', (x, .9, z + .25), (.5, .02, .16), dark, .005, rot=(0, -a, 0))]
        for kk in range(3): o.append(sphere('console led', (x - .5 + kk * .05, .89, z + .4), .01, [ledG, ledA, ledR][kk], segs=6))
    o.append(chair_office('Chair ctrl', 267, -1.8, 0)); o.append(chair_office('Chair ctrl2', 264.2, -2.0, 0, m=fabricB)); o.append(chair_office('Chair ctrl3', 269.8, -2.0, 0))
    # side desk with radio rack, phone, coffee, papers; server racks at east wall
    o += table_steel('ctrl side desk', 271.8, 3.5, 2.6, .9, .76, woodD) + [box('radio base', (271.2, .87, 3.4), (.5, .2, .3), dark, .02), cyl('radio ant', (271.4, 1.12, 3.4), .01, .3, dark, 'y', 6), cyl('coffee', (272.5, .82, 3.2), .045, .12, M('mug_white', (.9, .9, .88), 0, .4), 'y', 12), box('papers', (272.0, .785, 3.7), (.3, .01, .4), paper, 0)]
    for k in range(3): o += [box('rack', (273.6, 1.0, -4.5 + k * .75), (.6, 2.0, .7), dark, .02), box('rack face', (273.28, 1.0, -4.5 + k * .75), (.02, 1.9, .62), M('rack_vent', (.2, .21, .22), .5, .5), 0)] + [sphere('rack led', (273.26, .3 + j * .2, -4.7 + k * .75), .012, ledG if j % 3 else ledA, segs=6) for j in range(9)]
    o += door_steel('ctrl door', 260.02, 3.8, 1.0, 2.15, face='x', m=doorB)
    o.append(Lbox('ctrl window', (259.99, 1.1, -1), (260.03, 2.3, 2), glass, 0))
    o.append(Lbox('sign_control', (263, 2.6, 5.97), (267, 3.0, 5.93), sign('control'), 0))
    for x in (263, 267, 271):
        for z in (-2, 3): o += fluor_fixture('ctrl lamp', x, 3.4, z, 1.0, 'x', lampC)
    o += cctv('ctrlcam', 273.6, 2.9, 5.5, -2.4)
    o += pipe_run('ctrl tray', [(260, 3.2, 5.6), (274, 3.2, 5.6)], .05, cable, False)
    o.append(Lbox('clock face', (266.6, 2.75, 5.97), (267.4, 3.15, 5.93), sign('clock'), 0))
    return o

# ================================================================== C. INTERROGATION ROOM  x 300..306.4, z -4..4
def interrogation():
    o = room('intr', 300, 306.4, -4, 4, 3.0, vinyl, M('paint_wall_interrog', (.58, .6, .56), 0, .85), concD, lower=M('paint_wall_interrog_low', (.38, .41, .38), 0, .7), lowerH=1.0, base=concD)
    o.append(Lbox('one-way mirror', (300.0, .95, -2.2), (300.04, 2.25, 1.6), glassD, 0)); o.append(Lbox('mirror frame', (299.98, .88, -2.28), (300.05, 2.32, 1.68), dark, 0))
    for k in range(5):
        for j in range(2): o.append(Lbox('acoustic panel', (306.38, .9 + j * .85, -3.4 + k * 1.4), (306.4, 1.65 + j * .85, -2.2 + k * 1.4), M('acoustic', (.42, .44, .44), 0, 1), .005))
    o += table_steel('intr table', 303.2, 0, 1.6, .9, .76) + [box('table ring', (303.2, .78, -.25), (.1, .03, .05), chrome, .005), box('folder', (303.0, .79, .2), (.24, .015, .32), M('folder_manila', (.82, .7, .45), 0, .8), .003)]
    o.append(chair_steel('Chair i1', 303.2, -.95, 0)); o.append(chair_steel('Chair i2', 303.2, .95, math.pi))
    # hanging lamp
    o += [cyl('lamp cord', (303.2, 2.6, 0), .008, .8, cable, 'y', 6), cyl('lamp shade', (303.2, 2.08, 0), .32, .24, M('shade_green', (.2, .32, .26), .3, .5), 'y', 24, r2=.08), sphere('lamp bulb', (303.2, 1.97, 0), .07, lampW, segs=12)]
    o += cctv('intrcam', 306.2, 2.75, 3.8, -2.4) + door_steel('intr door', 305.4, 3.98, 1.0, 2.15, face='z', m=doorG)
    o.append(Lbox('sign_interview', (304.8, 2.4, 3.97), (306.0, 2.62, 3.93), sign('interview'), 0))
    o.append(Lbox('wall clock', (301.62, 2.22, -3.98), (301.98, 2.58, -3.95), sign('clock2'), 0))
    return o

# ================================================================== D. SECURITY CORRIDOR  x 330..380, z -1.7..1.7 (+ abandoned service passage behind the maintenance door at x 360)
def corridor():
    o = room('corr', 330, 380, -1.7, 1.7, 3.0, tile, wallHi, concD, lower=wallLo, lowerH=1.1)
    for x in range(332, 380, 4): o += fluor_fixture('corr lamp', x, 3.0, 0, 1.2, 'x')
    for k, x in enumerate([334, 342, 350, 368, 374]):
        o += door_steel(f'corr door n{k}', x, -1.68, 1.0, 2.15, m=doorB if k % 2 else doorG); o += door_steel(f'corr door s{k}', x + 2, 1.62, 1.0, 2.15, m=doorG)
    # barred security gate across the corridor
    gate = [Lbox('cgate frame', (355, 0, -1.7), (355.12, 2.9, 1.7), bars, 0)]
    for k in range(16): gate.append(cyl('cgate bar', (355.06, 1.45, -1.6 + k * .21), .018, 2.9, bars, 'y', 8))
    o.append(keep_obj('Gate corr', gate, (355.06, 0, -1.7)))
    # old maintenance door (scuffed, sign) and the abandoned passage behind it (z -1.7 .. -9, x 359.2..361)
    o.append(Lbox('corr wall cut', (359.2, 0, -1.9), (361.0, 2.2, -1.69), concD, 0)) if False else None
    md = [box('mdoor leaf', (360.1, 1.08, -1.66), (1.0, 2.15, .06), rust, .006), box('mdoor bar', (360.1, 1.05, -1.62), (.9, .07, .04), dark, .01), box('mdoor plate', (360.1, 1.7, -1.625), (.5, .28, .01), sign('mdoor'), 0)]
    o.append(keep_obj('Maint door', md, (359.6, 0, -1.66)))
    o.append(box('mdoor frame', (360.1, 1.1, -1.7), (1.2, 2.25, .14), dust, .01))
    # passage: narrow, dusty, cables, crates
    P0, P1 = 359.3, 360.9
    o.append(Lbox('pass floor', (P0 - .2, -.2, -10), (P1 + .2, 0, -1.7), concD, 0)); o.append(Lbox('pass ceil', (P0 - .2, 2.4, -10), (P1 + .2, 2.6, -1.7), concD, 0))
    o.append(Lbox('pass wall w', (P0 - .2, 0, -10), (P0, 2.4, -1.75), brick, 0)); o.append(Lbox('pass wall e', (P1, 0, -10), (P1 + .2, 2.4, -1.75), brick, 0)); o.append(Lbox('pass end', (P0 - .2, 0, -10.2), (P1 + .2, 2.4, -10), brick, 0))
    o += pipe_run('pass pipe', [(P1 - .1, 2.2, -1.8), (P1 - .1, 2.2, -10)], .07, rust) + pipe_run('pass cable', [(P0 + .08, 1.9, -1.8), (P0 + .08, 1.9, -10)], .025, cable, False)
    for k in range(5): o.append(box('pass crate', (P0 + .35 + (k % 2) * .9, .2 + (k // 2) * 0, -4 - k * 1.2), (.6, .4 + (k % 3) * .15, .5), crate if k % 2 else cardb, .01, rot=(0, random.uniform(-.3, .3), 0)))
    for k in range(3): o += fluor_fixture('pass lamp', 360.1, 2.4, -3.5 - k * 2.5, .6, 'z', lampW)
    o.append(Lbox('pass dust', (P0, .002, -9.9), (P1, .006, -1.8), dust, 0))
    for k in range(4): o.append(box('cobweb', (P0 + .06 if k % 2 else P1 - .06, 2.25, -3 - k * 2), (.02, .35, .5), web, 0))
    # bait camera (KEEP so it can pan), regular cameras, emergency beacons, extinguishers, signs
    o.append(cctv('Bait', 362.5, 2.75, -1.45, math.pi * .2, keep=True))
    o += cctv('corrcam1', 331, 2.75, 1.45, math.pi * .6) + cctv('corrcam2', 378.5, 2.75, -1.45, -math.pi * .65)
    for k, x in enumerate((340, 352, 365, 377)):
        o.append(keep_obj(f'Beacon {k}', [cyl('beacon base', (x, 2.97, 0), .1, .05, dark, 'y', 12), sphere('beacon dome', (x, 2.9, 0), .09, emerg, (1, .9, 1), 12)], (x, 2.9, 0)))
    for x in (345, 371): o += [cyl('extinguisher', (x, .55, -1.55), .09, .62, M('extinguisher_red', (.75, .08, .06), .2, .35), 'y', 14), Lbox('sign_ext', (x - .15, 1.2, -1.69), (x + .15, 1.5, -1.66), sign('ext'), 0)]
    o.append(Lbox('sign_bwing', (336, 2.2, 1.68), (339, 2.6, 1.64), sign('bwing'), 0))
    o += pipe_run('corr pipe', [(330, 2.75, 1.45), (380, 2.75, 1.45)], .06, pipeY) + pipe_run('corr pipe2', [(330, 2.85, 1.25), (380, 2.85, 1.25)], .04, pipeG)
    o.append(Lbox('corr floor line', (330, .006, -.04), (380, .012, .04), stripeY, 0))
    return o

# ================================================================== E. MAINTENANCE CORRIDOR + ELECTRICAL ROOM  x 400..440
def maintenance():
    o = room('mnt', 400, 430, -2, 2, 3.4, concF, brick, concD, lower=M('paint_wall_maint', (.45, .42, .35), 0, .8), lowerH=1.2, skip=('e',))
    o += room('elec', 430, 442, -5, 5, 3.6, concF, concP, concD, lower=wallLo, skip=('w',))
    o.append(Lbox('elec wall w', (429.8, 0, -5), (430, 3.6, -2), concP, 0)); o.append(Lbox('elec wall w', (429.8, 0, 2), (430, 3.6, 5), concP, 0))
    # dense pipe runs along the north wall + ceiling
    cols = [pipeR, pipeY, pipeG, pipeB, copper]
    for k in range(5): o += pipe_run(f'mpipe{k}', [(400, 2.9 - k * .22, -1.75 + (k % 2) * .05), (429.9, 2.9 - k * .22, -1.75 + (k % 2) * .05)], .07 + (k % 2) * .03, cols[k])
    o += pipe_run('mpipe drop', [(412, 2.9, -1.75), (412, 2.9, -.8), (412, .6, -.8)], .09, pipeR) + pipe_run('mduct', [(400, 3.1, 1.2), (430, 3.1, 1.2)], .22, duct, False)
    for x in (406, 418, 426): o += valve('mvalve', (x, 2.0, -1.55), .14, cols[(x // 6) % 5])
    o += [cyl('gauge', (409, 1.6, -1.94), .12, .05, chrome, 'z', 20), cyl('gauge face', (409, 1.6, -1.91), .1, .01, paper, 'z', 20)]
    o += pipe_run('cable tray', [(400, 2.6, 1.7), (442, 2.6, 1.7)], .03, cable, False)
    for k in range(6): o.append(Lbox('tray rung', (402 + k * 6, 2.55, 1.5), (402.06 + k * 6, 2.58, 1.95), dark, 0))
    for x in range(403, 430, 5): o += fluor_fixture('mnt lamp', x, 3.4, 0, .9, 'x', lampW)
    o.append(keep_obj('Beacon mnt', [cyl('beacon base', (415, 3.37, 0), .1, .05, dark, 'y', 12), sphere('beacon dome', (415, 3.3, 0), .09, emerg, (1, .9, 1), 12)], (415, 3.3, 0)))
    o.append(Lbox('hazard floor', (400, .006, 1.5), (430, .012, 1.65), hazard, 0)); o.append(Lbox('hazard floor', (400, .006, -1.65), (430, .012, -1.5), hazard, 0))
    o += [box('toolcart', (422, .5, 1.3), (.9, .9, .5), M('cart_red', (.7, .12, .1), .3, .45), .02), box('bucket', (404, .2, 1.5), (.3, .4, .3), M('bucket_yellow', (.9, .7, .1), 0, .5), .05), box('mop', (404.3, .8, 1.7), (.04, 1.6, .04), wood, 0)]
    o.append(Lbox('sign_maintwing', (401, 2.15, 1.98), (404, 2.5, 1.94), sign('maintwing'), 0))
    # electrical room: breaker cabinets, transformer, switchboard, cable ladder, inspection tags
    for k in range(5): o += panel_box(f'breaker{k}', 431.4 + k * 1.1, 1.3, -4.98, .9, 1.9, .35)
    o += [box('transformer', (440.4, 1.0, 0), (1.6, 2.0, 2.4), M('transformer_grey', (.45, .48, .5), .5, .5), .04), box('sign_highvolt', (439.58, 1.6, 0), (.01, .3, .5), sign('highvolt'), 0)]
    for k in range(10): o.append(box('fin', (440.4, 1.0, -1.1 + k * .24), (1.7, 1.6, .03), dark, 0))
    o += panel_box('switchboard', 436, 1.4, 4.75, 2.6, 1.6, .25) if False else []
    o.append(box('switchboard', (436, 1.2, 4.8), (3.0, 2.2, .35), paintSteel, .02)); o += [box('sw breaker', (434.9 + k * .35, 1.5, 4.61), (.12, .3, .05), dark, .01) for k in range(8)] + [sphere('sw led', (434.9 + k * .35, 1.75, 4.6), .015, ledG, segs=6) for k in range(8)]
    o += pipe_run('elec ladder', [(430, 3.3, -4.6), (442, 3.3, -4.6)], .04, steel, False) + [tube(f'elec cable{k}', [(432 + k * 1.1, 3.3, -4.6), (432 + k * 1.1, 2.3, -4.8)], .03, cable, 1) for k in range(5)]
    for x in (433, 438):
        for z in (-2, 2): o += fluor_fixture('elec lamp', x, 3.6, z, 1.0, 'x', lampW)
    o.append(Lbox('sign_inspection', (431.2, 2.45, -4.6), (433.2, 2.85, -4.64), sign('inspection'), 0))
    o.append(keep_obj('Beacon elec', [cyl('beacon base', (436, 3.57, 0), .1, .05, dark, 'y', 12), sphere('beacon dome', (436, 3.5, 0), .09, emerg, (1, .9, 1), 12)], (436, 3.5, 0)))
    o += door_steel('mnt door', 400.02, 0, 1.0, 2.15, face='x', m=doorG)
    return o

# ================================================================== F. INFIRMARY  x 460..474, z -5..5  (ceiling vent hatch at x 471, z -3.2)
def infirmary():
    o = room('inf', 460, 474, -5, 5, 3.0, tile, wallInf, wallHi, lower=M('paint_wall_inf_low', (.55, .7, .66), 0, .6), lowerH=1.0, base=M('stripe_teal', (.2, .5, .48), 0, .6))
    for k in range(3):
        x = 462.5 + k * 3.2
        o += [Lbox('bed frame', (x - .5, .45, -4.9), (x + .5, .55, -2.9), medW, .02), Lbox('bed mattress', (x - .47, .55, -4.88), (x + .47, .72, -2.92), sheet, .05), box('bed pillow', (x, .78, -4.6), (.6, .1, .35), sheet, .04)]
        for sx in (-1, 1):
            for zz in (-4.85, -2.95): o.append(cyl('bed leg', (x + sx * .45, .22, zz), .025, .45, chrome, 'y', 8))
        o.append(Lbox('bed blanket', (x - .48, .7, -3.9), (x + .48, .76, -2.95), M('blanket_blue', (.4, .55, .7), 0, 1), .03))
        o += [cyl('curtain rail', (x + 1.3, 2.7, -3.9), .015, 2.2, chrome, 'z', 8)]
        for j in range(9): o.append(box('curtain fold', (x + 1.3 + (.03 if j % 2 else -.03), 1.65, -4.9 + j * .24), (.04, 2.0, .25), curtain, 0))
        o += [cyl('iv pole', (x - .7, 1.0, -4.6), .015, 2.0, chrome, 'y', 8), box('iv bag', (x - .7, 1.85, -4.55), (.12, .2, .03), M('iv_clear', (.8, .9, .95), .1, .2), .02)]
    o += [box('med cabinet', (471.5, 1.6, 4.82), (2.2, 1.6, .35), medW, .02), box('med glass', (471.5, 1.7, 4.63), (2.0, 1.1, .02), glass, 0), Lbox('counter', (466, 0, 4.4), (470, .9, 5), medW, .02), Lbox('counter top', (465.95, .9, 4.35), (470.05, .95, 5), M('counter_grey', (.6, .62, .64), .2, .4), .01)]
    for k in range(6): o.append(box('med bottle', (466.5 + k * .5, 1.02, 4.7), (.08, .16, .08), M(f'bottle_{k % 3}', [(.9, .9, .9), (.5, .3, .2), (.3, .5, .8)][k % 3], 0, .3), .02))
    o += table_steel('inf desk', 463, 3.8, 1.6, .8, .76, woodD) + [box('inf monitor', (463, 1.02, 3.6), (.55, .36, .04), screenS, .01)]
    o.append(chair_office('Chair inf', 463, 3.0, math.pi))
    # ceiling vent hatch (opens downward), the shaft above is built separately
    o.append(Lbox('vent frame', (470.4, 2.97, -3.7), (471.6, 3.0, -2.7), paintSteel, 0))
    vh = [Lbox('vent grille', (470.45, 2.94, -3.65), (471.55, 2.97, -2.75), M('vent_grille', (.75, .76, .76), .6, .4), 0)] + [Lbox('vent slat', (470.5 + j * .1, 2.92, -3.6), (470.53 + j * .1, 2.94, -2.8), dark, 0) for j in range(11)]
    o.append(keep_obj('Vent hatch', vh, (470.45, 2.95, -3.2)))
    o.append(box('wall vent', (461.5, 2.5, -4.98), (.8, .4, .03), M('vent_grille', (.75, .76, .76), .6, .4), .01))
    o += cctv('infcam', 473.6, 2.7, 4.6, -2.5)
    for x in (463, 467, 471):
        for z in (-3, 2): o += fluor_fixture('inf lamp', x, 3.0, z, 1.0, 'x', lampC)
    o.append(Lbox('sign_infirmary_in', (464, 2.25, 4.97), (468, 2.65, 4.93), sign('infirmary_in'), 0))
    o += door_steel('inf door', 460.02, 0, 1.4, 2.2, face='x', m=medW)
    o.append(Lbox('wall cross', (466.6, 1.6, -4.98), (467.4, 2.4, -4.94), sign('greencross'), 0))
    return o

# ================================================================== G. MAINTENANCE SHAFT x 500..514 (interior .9 x .9, floor y 1.8) + H. SERVICE ROOM x 514..520
def shaft():
    o = []; Y0, Y1, Z0, Z1 = 1.8, 2.7, -.45, .45
    o += [Lbox('shaft floor', (499, Y0 - .06, Z0 - .06), (514, Y0, Z1 + .06), duct, 0), Lbox('shaft top', (499, Y1, Z0 - .06), (514, Y1 + .06, Z1 + .06), duct, 0),
          Lbox('shaft w', (499, Y0, Z0 - .06), (514, Y1, Z0), duct, 0), Lbox('shaft e', (499, Y0, Z1), (514, Y1, Z1 + .06), duct, 0), Lbox('shaft cap', (498.94, Y0 - .06, Z0 - .06), (499, Y1 + .06, Z1 + .06), duct, 0)]
    for k in range(15):
        x = 499.4 + k * 1.0
        o += [Lbox('rib', (x, Y0 - .002, Z0 - .002), (x + .05, Y0 + .02, Z1 + .002), dark, 0), Lbox('rib', (x, Y1 - .02, Z0 - .002), (x + .05, Y1 + .002, Z1 + .002), dark, 0),
              Lbox('rib', (x, Y0, Z0 - .002), (x + .05, Y1, Z0 + .02), dark, 0), Lbox('rib', (x, Y0, Z1 - .02), (x + .05, Y1, Z1 + .002), dark, 0)]
        for yy in (Y0 + .15, Y1 - .15): o.append(sphere('rivet', (x + .1, yy, Z0 + .005), .012, chrome, segs=6))
    o.append(Lbox('shaft grime', (499.2, Y0 + .001, -.3), (513.8, Y0 + .004, .3), dust, 0))
    o.append(Lbox('shaft cable', (499.2, Y1 - .05, Z1 - .08), (513.8, Y1 - .03, Z1 - .06), cable, 0))
    o.append(Lbox('shaft side opening', (504, Y0, Z1), (505, Y1, Z1 + .06), dark, 0))
    # final hatch at the east end (hinged at its top, swings outward into the service room)
    o.append(Lbox('hatch frame', (513.96, Y0 - .08, Z0 - .08), (514.04, Y1 + .08, Z1 + .08), paintSteel, 0))
    hatch = [Lbox('hatch panel', (514.0, Y0, Z0), (514.04, Y1, Z1), M('vent_grille', (.75, .76, .76), .6, .4), 0)] + [Lbox('hatch slat', (514.04, Y0 + .08 + j * .1, Z0 + .04), (514.06, Y0 + .11 + j * .1, Z1 - .04), dark, 0) for j in range(8)]
    o.append(keep_obj('Shaft hatch', hatch, (514.02, Y1, 0)))
    # service room where the guards are waiting
    o += room('svc', 514.04, 521, -3, 3, 3.6, concF, concP, concD, lower=wallLo, skip=('w',))
    o.append(Lbox('svc wall w', (513.9, 0, -3), (514.04, Y0 - .08, 3), concP, 0)); o.append(Lbox('svc wall w2', (513.9, Y1 + .08, -3), (514.04, 3.6, 3), concP, 0))
    o.append(Lbox('svc wall w3', (513.9, Y0 - .08, -3), (514.04, Y1 + .08, Z0 - .08), concP, 0)); o.append(Lbox('svc wall w4', (513.9, Y0 - .08, Z1 + .08), (514.04, Y1 + .08, 3), concP, 0))
    o += pipe_run('svc pipe', [(514.1, 3.2, -2.8), (521, 3.2, -2.8)], .08, pipeR) + [box('svc shelf', (520.6, 1.0, 0), (.5, 2.0, 2.4), paintSteel, .02)]
    for k in range(6): o.append(box('svc box', (520.55, .4 + (k // 2) * .55, -.8 + (k % 2) * 1.2), (.4, .35, .5), cardb, .01))
    o += fluor_fixture('svc lamp', 517.5, 3.6, 0, 1.0, 'z', lampW) + door_steel('svc door', 517.5, 2.98, 1.0, 2.15, m=doorB)
    return o

# ================================================================== I. WARDEN'S OFFICE x 540..548, z -4..4
def office():
    o = room('off', 540, 548, -4, 4, 3.0, M('carpet_red', (.36, .14, .12), 0, 1), wallOff, wallHi, lower=M('wood_panel', (.42, .27, .16), 0, .6), lowerH=1.1, base=woodD)
    o += [Lbox('desk top', (542.8, .74, -2.6), (545.6, .8, -1.4), woodD, .02), Lbox('desk ped', (542.9, 0, -2.55), (543.6, .74, -1.45), wood, .01), Lbox('desk ped', (544.8, 0, -2.55), (545.5, .74, -1.45), wood, .01),
          box('desk lamp', (545.2, 1.0, -2.3), (.08, .4, .08), gold, .01), box('desk phone', (543.3, .85, -2.3), (.25, .1, .2), dark, .02), box('desk blotter', (544.2, .805, -2.0), (.8, .01, .5), leather, .002),
          box('nameplate', (544.2, .86, -1.5), (.4, .1, .04), gold, .005)]
    o.append(chair_office('Chair warden', 544.2, -3.1, math.pi, m=leather)); o.append(chair_steel('Chair visitor', 543.6, -.6, math.pi)); o.append(chair_steel('Chair visitor2', 544.9, -.6, math.pi))
    o += [Lbox('blinds window', (540.5, 1.0, -3.98), (542.3, 2.5, -3.94), M('blinds', (.85, .82, .74), 0, .6), 0)] + [Lbox('blind slat', (540.5, 1.0 + j * .1, -3.93), (542.3, 1.03 + j * .1, -3.91), M('blinds', (.85, .82, .74), 0, .6), 0) for j in range(15)]
    for k in range(3): o += [box('filing', (547.6, .7, 2.6 - k * .6), (.6, 1.4, .55), paintSteel, .02)] + [box('filing handle', (547.28, .4 + j * .35, 2.6 - k * .6), (.02, .04, .2), chrome, 0) for j in range(4)]
    o += [Lbox('bookshelf', (540.05, 0, 1.2), (540.45, 2.2, 3.6), woodD, .02)] + [box('shelf book', (540.3, .3 + (j // 12) * .5, 1.3 + (j % 12) * .19), (.25, .32, .15), M(f'book_{j % 4}', [(.6, .15, .12), (.15, .3, .5), (.2, .42, .25), (.75, .62, .3)][j % 4], 0, .8), .005) for j in range(48)]
    o += [cyl('flagpole', (546.9, 1.2, -3.4), .02, 2.4, gold, 'y', 8), box('flag', (546.9, 1.95, -3.0), (.02, .8, .75), flagG, 0)]
    o += [box('frame1', (543.0, 1.9, -3.97), (.6, .45, .03), woodD, .005), box('frame2', (545.6, 1.9, -3.97), (.6, .45, .03), woodD, .005), Lbox('sign_cert', (542.75, 1.72, -3.95), (543.25, 2.08, -3.94), sign('cert'), 0)]
    o += fluor_fixture('off lamp', 544, 3.0, -1, 1.2, 'x', lampW) + fluor_fixture('off lamp', 544, 3.0, 2, 1.2, 'x', lampW) + door_steel('off door', 546.5, 3.98, 1.0, 2.15, m=woodD)
    o.append(box('plant pot', (541, .3, -3.4), (.4, .6, .4), M('pot_grey', (.4, .4, .42), 0, .7), .04)); o.append(ico('plant', (541, .95, -3.4), .45, leafD, (1, 1.2, 1), 1))
    return o

# ================================================================== PROPS (cloned per use in Three)
def props():
    o = []
    # contractor box truck (cab + box), keep as one object at origin
    t = [box('truck box', (0, 2.1, -1.0), (2.4, 2.6, 5.4), M('truck_box', (.9, .9, .88), .2, .5), .06), box('truck cab', (0, 1.45, 2.6), (2.3, 1.9, 1.9), carY, .12),
         box('truck screen', (0, 1.95, 3.56), (2.0, .7, .02), glass, 0), box('truck chassis', (0, .6, 0), (2.0, .3, 7.0), dark, .02),
         Lbox('sign_contractor', (-1.21, 1.6, -3.4), (-1.19, 2.8, 1.4), sign('contractor'), 0), box('truck door', (0, 2.1, -3.72), (2.3, 2.5, .04), M('truck_box', (.9, .9, .88), .2, .5), .01)]
    for sx in (-1, 1):
        for zz in (-2.8, -1.6, 2.4): t.append(cyl('truck wheel', (sx * 1.05, .48, zz), .48, .32, rubber, 'x', 18))
        t.append(box('truck lamp', (sx * .85, 1.0, 3.56), (.35, .2, .02), lampW, 0)); t.append(box('truck tail', (sx * 1.0, .9, -3.75), (.2, .3, .02), ledR, 0))
    o.append(keep('Truck', t, (0, 0, 0)))
    # transport van (escort), guard flashlight in 3D (for the shaft reveal), monitor-style props
    o.append(keep('Van', vehicle('escort van', 0, 0, carN), (0, 0, 0)))
    o.append(keep('Flashlight', [cyl('fl body', (0, 0, 0), .025, .22, dark, 'z', 12), cyl('fl head', (0, 0, .13), .04, .06, dark, 'z', 12), cyl('fl lens', (0, 0, .165), .035, .01, lampW, 'z', 12)], (0, 0, 0)))
    o.append(keep('Blueprint table', table_steel('bp table', 0, 0, 1.6, 1.0, .9, woodD) + [Lbox('sign_blueprint', (-.75, .905, -.45), (.75, .915, .45), sign('blueprint'), 0)], (0, 0, 0)))
    return o

reset(); [None for _ in exterior()]; [None for _ in cellblock_hall()]; [None for _ in control_room()]; [None for _ in interrogation()]
[None for _ in corridor()]; [None for _ in maintenance()]; [None for _ in infirmary()]; [None for _ in shaft()]; [None for _ in office()]
export('world.glb')
reset(); props(); export('props.glb')
print('ALL ASSETS DONE')
