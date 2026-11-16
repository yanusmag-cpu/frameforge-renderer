"""FrameForge — "Why GTA 6 took 13 years": original Vice-City-inspired coastal city + game studio (no game assets, no real logos).
Run: blender -b --factory-startup -P scripts/vice/build-assets.py  →  public/vice/world.glb, props.glb, palms.json
Three.js metres. Land y=.3, sea y=0 (ocean z<-30, bay x>222). Ocean Drive z -12..-4; avenue A z 34..46; hero crossing (0,40).
Studio interior around x=2000. Materials are named by surface type; window grids/neon/screens are drawn in Three.
"""
import bpy, bmesh, math, random, json
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'public/vice'; OUT.mkdir(parents=True, exist_ok=True)
random.seed(2013)
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

# ================================================================== materials
P = {k: mat('stucco_' + k, c, 0, .85) for k, c in {'pink': (.93, .6, .68), 'mint': (.55, .86, .74), 'sky': (.55, .78, .93), 'peach': (.98, .76, .58), 'lilac': (.75, .66, .9), 'cream': (.96, .92, .82), 'white': (.95, .95, .93), 'yellow': (.98, .87, .5), 'coral': (.98, .55, .45), 'teal': (.3, .7, .72)}.items()}
glassT = mat('tower_glass', (.35, .55, .7), .8, .08); glassG = mat('tower_glass_green', (.3, .6, .55), .8, .08); glassD = mat('tower_glass_dark', (.15, .2, .3), .85, .06)
apt = mat('apartment', (.86, .83, .78), 0, .8); conc = mat('concrete', (.62, .62, .6), 0, .9); concD = mat('concrete_dark', (.4, .4, .4), 0, .9)
asph = mat('asphalt', (.14, .14, .15), 0, .85); walk = mat('sidewalk', (.72, .7, .66), 0, .9); curb = mat('curb', (.8, .8, .78), 0, .8); paint = mat('road_paint', (.95, .95, .9), 0, .6); paintY = mat('road_paint_yellow', (.98, .78, .15), 0, .6)
sand = mat('beach_sand', (.93, .84, .64), 0, 1); grass = mat('turf', (.36, .6, .25), 0, 1); swampM = mat('swamp_mud', (.3, .28, .18), 0, 1); hedge = mat('plant_leaf', (.2, .5, .22), 0, .8)
metal = mat('metal', (.6, .62, .65), .9, .35); dark = mat('metal_dark', (.12, .12, .13), .6, .45); chrome = mat('chrome', (.85, .86, .88), 1, .12); white = mat('paint_white', (.95, .95, .95), 0, .5)
neonP = mat('neon_pink', (1, .3, .7), 0, .3, (1, .25, .65), 3.0); neonC = mat('neon_cyan', (.3, .9, 1), 0, .3, (.25, .85, 1), 3.0); neonY = mat('neon_yellow', (1, .9, .4), 0, .3, (1, .85, .35), 2.5)
glassS = mat('shop_glass', (.25, .35, .4), .7, .05); woodM = mat('wood', (.5, .34, .2), 0, .7); woodD = mat('wood_dark', (.3, .2, .12), 0, .7); fabricA = [mat(f'awning_{i}', c, 0, .9) for i, c in enumerate([(.9, .25, .3), (.15, .55, .75), (.95, .7, .2), (.2, .65, .45), (.6, .3, .7)])]
tlR = mat('tl_red', (.9, .1, .1), 0, .3, (1, .1, .05), .2); tlA = mat('tl_amber', (1, .6, .1), 0, .3, (1, .55, .05), .2); tlG = mat('tl_green', (.1, .9, .4), 0, .3, (.05, 1, .35), .2)
lampM = mat('lamp_warm', (1, .92, .75), 0, .3, (1, .85, .6), 1.5); pool = mat('pool_water', (.25, .75, .9), .1, .05); railM = mat('glass_rail', (.6, .8, .85), .5, .05)
carpet = mat('carpet_grey', (.32, .33, .36), 0, 1); floorW = mat('floor_wood', (.62, .45, .3), 0, .5); wallS = mat('studio_wall', (.18, .19, .22), 0, .8); wallW = mat('plaster_white', (.9, .9, .88), 0, .9)
deskM = mat('desk_white', (.92, .92, .9), .1, .4); chairM = mat('fabric', (.15, .16, .18), 0, .9); screenM = mat('screen', (.2, .25, .3), 0, .25, (.6, .7, .8), 1.0); bezel = mat('bezel', (.05, .05, .06), .3, .4)
wallScreen = mat('screen_wall', (.2, .25, .3), 0, .25, (.6, .7, .8), 1.0); timelineM = mat('screen_timeline', (.2, .25, .3), 0, .25, (.6, .7, .8), 1.0); stageM = mat('stage_gloss', (.05, .05, .07), .4, .12)
pipeM = mat('metal_duct', (.5, .52, .55), .9, .35); plantM = mat('plant_leaf', (.2, .5, .22), 0, .8); potM = mat('pot_white', (.92, .92, .9), 0, .5); brick = mat('brick', (.6, .35, .28), 0, .9)

# ================================================================== city layout
AVES = [40, 80, 120, 160, 200, 240]          # avenues along x (road centre z)
STREETS = list(range(-200, 221, 40))           # streets along z (road centre x)
def road_x(z0, z1, x0, x1, name='road'):     # road strip (both directions), markings
    span(name, (x0, .2, z0), (x1, .3, z1), asph, 0)
def ground():
    span('land', (-260, -1, -14), (222, .2, 520), conc, 0)                     # base slab under the city (sidewalks sit on it)
    span('beach', (-260, -1.2, -48), (222, .25, -14), sand, 0)
    span('seawall bay', (222, -3, -48), (224, .45, 520), conc, .02)
    # Ocean Drive
    span('ocean dr', (-260, .2, -12), (222, .32, -4), asph, 0); span('ocean walk', (-260, .2, -14), (222, .45, -12), walk, .01); span('ocean walk2', (-260, .2, -4), (222, .45, -1), walk, .01)
    for x in range(-255, 220, 6): box('od dash', (x, .325, -8), (3, .01, .14), paintY, 0)
    # avenues & streets with sidewalks
    for z in AVES:
        span(f'ave {z}', (-260, .2, z - 6), (222, .32, z + 6), asph, 0); span('walk', (-260, .2, z - 9), (222, .45, z - 6), walk, .01); span('walk', (-260, .2, z + 6), (222, .45, z + 9), walk, .01)
        span('curb', (-260, .2, z - 6.1), (222, .47, z - 5.95), curb, 0); span('curb', (-260, .2, z + 5.95), (222, .47, z + 6.1), curb, 0)
        for x in range(-255, 220, 6):
            if z > 80 or any(abs(x - s) < 9 for s in STREETS): continue
            box('lane dash', (x, .325, z), (3, .01, .14), paint, 0); box('lane dash', (x, .325, z - 3), (2, .01, .1), paint, 0); box('lane dash', (x, .325, z + 3), (2, .01, .1), paint, 0)
    for x in STREETS:
        span(f'street {x}', (x - 6, .2, -4), (x + 6, .32, 520), asph, 0); span('walk', (x - 9, .2, -1), (x - 6, .45, 520), walk, .01); span('walk', (x + 6, .2, -1), (x + 9, .45, 520), walk, .01)
        for z in (AVES[:2] if abs(x) <= 40 else []):   # zebra crossings near the hero streets
            for s in (-1, 1):
                for k in range(8): box('zebra', (x - 5.25 + k * 1.5, .325, z + s * 7.5), (.8, .01, 2.6), paint, 0)
                for k in range(8): box('zebra', (x + s * 7.5, .325, z - 5.25 + k * 1.5), (2.6, .01, .8), paint, 0)
            box('stop line', (x + 3, .325, z - 9.1), (6, .01, .35), paint, 0)
def deco_hotel(x, z, w, d, floors, col, face=-1, name='deco'):
    """1930s-style pastel hotel: stepped massing, rounded corner, eyebrow ledges, vertical fin with neon, porch."""
    h = 3.4 * floors + 1; o = [box(name, (x, .45 + h / 2, z), (w, h, d), col, .05)]
    for f in range(1, floors + 1):
        o.append(box(name + ' ledge', (x, .45 + 3.4 * f + .15, z + face * (d / 2 + .25)), (w + .1, .12, .55), P['white'], .02))
    o.append(cyl(name + ' corner', (x + w / 2 - 1.2, .45 + (h + 2.5) / 2, z + face * (d / 2 - 1.2)), 1.6, h + 2.5, col, 'y', 24))
    o.append(box(name + ' crown', (x - w * .15, .45 + h + 1.4, z + face * (d / 2 - .8)), (w * .45, 2.8, 1.4), P['white'], .03))
    o.append(box(name + ' fin', (x - w * .15, .45 + h * .55, z + face * (d / 2 + .35)), (.45, h * .75, .7), P['white'], .02))
    o.append(box(name + ' neon fin', (x - w * .15, .45 + h * .55, z + face * (d / 2 + .72)), (.14, h * .7, .06), random.choice([neonP, neonC]), 0))
    o.append(box(name + ' neon band', (x, .45 + 3.4 + .4, z + face * (d / 2 + .52)), (w * .9, .1, .05), random.choice([neonP, neonC, neonY]), 0))
    o.append(box(name + ' porch', (x + w * .15, .45 + 2.8, z + face * (d / 2 + 1.4)), (w * .4, .2, 2.8), P['white'], .03))
    for k in range(2): o.append(cyl(name + ' porch col', (x + w * .15 + (k - .5) * w * .3, .45 + 1.4, z + face * (d / 2 + 2.6)), .15, 2.8, P['white'], 'y', 12))
    o.append(box(name + ' lobby glass', (x + w * .15, .45 + 1.3, z + face * (d / 2 + .02)), (w * .35, 2.4, .05), glassS, 0))
    return o
def tower(x, z, w, d, h, m, name='tower'):
    o = [box(name, (x, .45 + h / 2, z), (w, h, d), m, .05), box(name + ' base', (x, .45 + 3, z), (w + .6, 6, d + .6), conc, .05),
         box(name + ' cap', (x, .45 + h + 1.2, z), (w * .7, 2.4, d * .7), concD, .05)]
    for k in range(1, int(h / 12)): o.append(box(name + ' band', (x, .45 + k * 12, z), (w + .25, .5, d + .25), concD, .02))
    if h > 90: o.append(cyl(name + ' spire', (x, .45 + h + 8, z), .25, 14, metal, 'y', 8))
    return o
def apartment(x, z, w, d, h, name='apt'):
    o = [box(name, (x, .45 + h / 2, z), (w, h, d), random.choice([apt, P['cream'], P['peach'], P['sky']]), .04)]
    for f in range(1, int(h / 3.2)):
        o.append(box(name + ' balcony', (x, .45 + f * 3.2, z - d / 2 - .5), (w * .9, .15, 1.0), P['white'], .02))
        o.append(box(name + ' rail', (x, .45 + f * 3.2 + .5, z - d / 2 - .98), (w * .9, .9, .04), railM, 0))
    return o
def city():
    random.seed(13)
    for bz in [(0, 28)] + [(a + 9, a + 31) for a in AVES[:-1]]:
        z0, z1 = bz; zc = (z0 + z1) / 2
        for xs in STREETS[:-1]:
            x0, x1 = xs + 9, xs + 31; xc = (x0 + x1) / 2
            if z0 == 0:   # ocean-front deco hotels (two per block)
                for k, xx in enumerate((x0 + 5.5, x1 - 5.5)):
                    deco_hotel(xx, 7.5, 10, 13, random.randint(3, 5), P[random.choice(list(P))], -1, f'deco{xs}_{k}')
                continue
            dc = math.hypot(xc - 60, zc - 150); r = random.random()
            if dc < 70 and r > .2: tower(xc, zc, random.uniform(14, 20), random.uniform(14, 20), random.uniform(70, 180) * (1.2 - dc / 140), random.choice([glassT, glassG, glassD]), f'tw{xs}_{z0}')
            elif dc < 150 and r > .35: tower(xc, zc, random.uniform(12, 18), random.uniform(12, 18), random.uniform(30, 70), random.choice([glassT, glassG, apt]), f'tw{xs}_{z0}')
            else:
                for k, xx in enumerate((x0 + 5.5, x1 - 5.5)): apartment(xx, zc, 10, 18, random.uniform(10, 26), f'apt{xs}_{z0}_{k}')
    # distant skyline beyond the grid
    for k in range(40):
        x = random.uniform(-240, 200); z = random.uniform(300, 520)
        if abs((x - 20) % 40 - 20) < 8: continue
        tower(x, z, random.uniform(14, 24), random.uniform(14, 24), random.uniform(40, 160), random.choice([glassT, glassD, apt]), f'far{k}')
def shops():
    """storefronts along the north side of avenue z=40 (hero walk), awnings, signs (texture drawn in Three), cafe tables"""
    for k, x0 in enumerate([-33, -21, -11, 9, 19, 29]):
        w = 9.4; m = P[random.choice(list(P))]
        span(f'shop {k}', (x0, .45, 49.2), (x0 + w, 4.4, 58), m, .02)
        span(f'shop glass {k}', (x0 + .5, .5, 49.15), (x0 + w - .5, 3.2, 49.2), glassS, 0)
        span(f'shop frame {k}', (x0 + .3, 3.2, 49.1), (x0 + w - .3, 3.35, 49.2), P['white'], 0)
        span(f'sign_shop{k}', (x0 + .6, 3.45, 49.12), (x0 + w - .6, 4.25, 49.16), mat(f'sign_shop{k}', (.9, .9, .9), 0, .5), 0)
        aw = box(f'awning {k}', (x0 + w / 2, 3.0, 48.4), (w - .6, .06, 1.8), fabricA[k % 5], 0, (-.32, 0, 0))
        for j in range(2): box('table', (x0 + 2.4 + j * 4.2, 1.2, 47.6), (.7, .05, .7), white, .01); cyl('table post', (x0 + 2.4 + j * 4.2, .82, 47.6), .03, .75, chrome, 'y', 8)
    span('upper floors', (-34, 4.4, 49.2), (39, 14, 58), P['cream'], .02)
    for k in range(14): span('upper win', (-33 + k * 5.1, 6.0, 49.15), (-30.5 + k * 5.1, 8.2, 49.2), glassS, 0); span('upper win', (-33 + k * 5.1, 9.8, 49.15), (-30.5 + k * 5.1, 12, 49.2), glassS, 0)
def street_furniture():
    for z in AVES[:3] + [-8]:
        for x in range(-210, 220, 25):
            for s in (-1, 1):
                zz = (z + s * 7.6) if z > 0 else (-13.2 if s < 0 else -2.2)
                cyl('lamp post', (x, .45 + 3.5, zz), .08, 7, dark, 'y', 8); box('lamp arm', (x, 7.9, zz - s * .7), (.12, .1, 1.5), dark, .01); box('lamp head', (x, 7.8, zz - s * 1.4), (.35, .15, .6), lampM, .03)
    # traffic lights at the hero crossing (0,40): KEEP so the lamp materials can switch state
    for i, (x, z, ang) in enumerate([(-7.6, 32.4, 0), (7.6, 47.6, math.pi), (7.6, 32.4, -math.pi / 2), (-7.6, 47.6, math.pi / 2)]):
        parts = [cyl('tl pole', (x, .45 + 2.6, z), .1, 5.2, dark, 'y', 10), box('tl arm', (x + math.cos(ang) * 2.2, 5.4, z - math.sin(ang) * 2.2), (4.4 if abs(math.cos(ang)) > .5 else .14, .14, .14 if abs(math.cos(ang)) > .5 else 4.4), dark, .01)]
        hx, hz = x + math.cos(ang) * 4.0, z - math.sin(ang) * 4.0
        parts += [box('tl head', (hx, 4.9, hz), (.42, 1.25, .42), dark, .03)]
        for j, m in enumerate((tlR, tlA, tlG)): parts.append(sphere('tl lamp', (hx + math.sin(ang) * .22, 5.3 - j * .38, hz + math.cos(ang) * .22), .13, m, segs=10))
        parts.append(box('tl ped', (x + math.sin(ang) * .2, 2.6, z + math.cos(ang) * .2), (.3, .5, .25), dark, .02))
        keep(f'Traffic light {i}', parts, (x, 0, z))
    # bus stop, benches, bins, hydrants, planters on the hero block
    box('bus shelter roof', (-20, 2.7, 46.9), (4, .1, 1.6), railM, .02); [cyl('shelter post', (-21.8 + k * 3.6, 1.55, 47.5), .05, 2.3, chrome, 'y', 8) for k in range(2)]
    span('bus ad', (-21.9, .7, 47.62), (-18.1, 2.5, 47.66), mat('sign_busad', (.9, .9, .9), 0, .5), 0); box('bench', (-20, .9, 47.2), (2.6, .08, .45), woodM, .01)
    for x in (-27, -3.6, 14, 33): cyl('bin', (x, .9, 46.8), .3, .9, dark, 'y', 12)
    for x in (-15, 4.2, 24): cyl('hydrant', (x, .75, 46.6), .14, .6, mat('hydrant_red', (.85, .15, .1), .3, .4), 'y', 10)
    for x in (-30, -8.5, 11.5, 31): box('planter', (x, .75, 47.9), (1.6, .6, .6), conc, .03); ico('planter bush', (x, 1.25, 47.9), .55, hedge, (1.4, .7, .8), 1)
def rooftop():
    """hotel tower roof terrace at block (46..74, 6..34): pool, loungers, glass railing — the host's lookout"""
    x, z, h = 60, 20, 44
    tower(x, z, 22, 22, h, glassT, 'lookout tower')
    span('roof deck', (49, .45 + h, 9), (71, .45 + h + .15, 31), floorW, 0)
    span('roof pool', (53, .45 + h + .05, 12), (63, .45 + h + .2, 18), pool, 0); span('pool edge', (52.6, .45 + h + .1, 11.6), (63.4, .45 + h + .22, 18.4), white, 0)
    for k in range(3): box('lounger', (55 + k * 3, .45 + h + .45, 21.5), (.8, .12, 2), white, .03, (0, 0, 0))
    for (a, b) in [((49, 9), (71, 9)), ((49, 31), (71, 31)), ((49, 9), (49, 31)), ((71, 9), (71, 31))]:
        span('roof rail', (min(a[0], b[0]) - .03, .45 + h + .15, min(a[1], b[1]) - .03), (max(a[0], b[0]) + .03, .45 + h + 1.25, max(a[1], b[1]) + .03), railM, 0)
    for k in range(4): box('roof planter', (50.5 + k * 6.5, .45 + h + .45, 29.8), (1.8, .6, .8), conc, .03); ico('roof plant', (50.5 + k * 6.5, .45 + h + 1.1, 29.8), .6, plantM, (1.3, .8, .7), 1)
    for k in range(5): cyl('string pole', (50 + k * 5, .45 + h + 1.6, 30.4), .04, 3, dark, 'y', 6)
def causeway():
    """elevated highway across the bay (x 224..700, z ~120) on piers, with an island halfway"""
    Y = 12
    span('cw deck', (224, Y - .8, 112), (700, Y, 128), concD, .02); span('cw road', (224, Y, 112.5), (700, Y + .08, 127.5), asph, 0)
    for x in range(226, 700, 8): box('cw dash', (x, Y + .09, 120), (4, .01, .2), paintY, 0); box('cw dash', (x, Y + .09, 116), (3, .01, .14), paint, 0); box('cw dash', (x, Y + .09, 124), (3, .01, .14), paint, 0)
    for x in range(232, 700, 28):
        for s in (-1, 1): cyl('cw pier', (x, Y / 2 - 1, 120 + s * 5), 1.1, Y + 2, conc, 'y', 16)
        box('cw cap', (x, Y - 1.2, 120), (2.4, 1.0, 14), conc, .03)
    for s in (-1, 1): span('cw rail', (224, Y, 120 + s * 7.9 - .15), (700, Y + 1.1, 120 + s * 7.9 + .15), conc, .02)
    for x in range(230, 700, 30): cyl('cw lamp', (x, Y + 4, 112.4), .1, 8, dark, 'y', 8); box('cw lamp head', (x, Y + 8, 113.4), (.3, .15, 1.8), lampM, .02)
    # ramp down into the city
    span('cw ramp', (200, .3, 112), (224, Y, 128), concD, .02)
    # island with a mansion + palms
    cyl('island', (430, -1, 190), 60, 2.6, sand, 'y', 40); cyl('island lawn', (430, .35, 190), 52, .1, grass, 'y', 40)
    deco_hotel(430, 200, 26, 14, 2, P['white'], -1, 'mansion'); span('mansion pool', (420, .3, 176), (440, .45, 184), pool, 0)
def swamp():
    """mangrove marsh to the west: low mud banks barely above the water with root clumps"""
    for k in range(70):
        x = random.uniform(-520, -280); z = random.uniform(-40, 420)
        cyl('marsh bank', (x, -.2, z), random.uniform(6, 20), .5, swampM, 'y', 14)
        for j in range(random.randint(2, 5)):
            xx, zz = x + random.uniform(-6, 6), z + random.uniform(-6, 6)
            for r in range(4): cyl('mangrove root', (xx + math.cos(r * 1.6) * .6, .5, zz + math.sin(r * 1.6) * .6), .05, 1.2, woodD, 'y', 5)
            ico('mangrove crown', (xx, 2.6, zz), random.uniform(1.6, 2.8), hedge, (1.4, .7, 1.4), 1)
    span('marsh land', (-280, -1, -14), (-260, .2, 520), grass, 0)

# ================================================================== the game studio (x 1985..2025, z -14..14)
SX = 2005
def studio():
    x0, x1, z0, z1, h = SX - 20, SX + 20, -14, 14, 4.6
    span('st floor', (x0, -.2, z0), (x1, 0, z1), floorW, 0); span('st ceiling', (x0, h, z0), (x1, h + .2, z1), wallS, 0)
    span('st wall n', (x0, 0, z0 - .2), (x1, h, z0), wallS, 0); span('st wall e', (x1, 0, z0), (x1 + .2, h, z1), wallS, 0); span('st wall w', (x0 - .2, 0, z0), (x0, h, z1), wallS, 0)
    span('st wall s', (x0, 0, z1), (x1, h, z1 + .2), wallW, 0)
    # big LED wall on the north wall (updates / timeline), and a long timeline strip on the west wall
    span('screen_wall', (SX - 9, 1.2, z0 + .02), (SX + 9, 4.2, z0 + .06), wallScreen, 0); span('led frame', (SX - 9.2, 1.0, z0), (SX + 9.2, 4.4, z0 + .03), bezel, 0)
    span('screen_timeline', (x0 + .02, 1.4, -10), (x0 + .06, 3.6, 10), timelineM, 0)
    # exposed ducts + pendant lights
    for z in (-6, 6): tube('duct', [(x0, h - .5, z), (x1, h - .5, z)], .35, pipeM, 1)
    for i in range(6):
        for j in range(3):
            x, z = SX - 15 + i * 6, -8 + j * 8; cyl('pendant cord', (x, h - .6, z), .01, 1.2, dark, 'y', 6); cyl('pendant', (x, h - 1.25, z), .35, .2, dark, 'y', 16, 0, .12); sphere('pendant bulb', (x, h - 1.36, z), .1, lampM, segs=10)
    # desk rows: 4 rows × 6 desks with dual monitors (screens drawn in Three) and chairs
    for r in range(4):
        for c in range(6):
            x, z = SX - 15 + c * 6, -9 + r * 5
            box('desk', (x, .74, z), (1.8, .05, .85), deskM, .01); [box('desk leg', (x + s * .85, .37, z), (.06, .74, .8), metal, 0) for s in (-1, 1)]
            for s in (-1, 1): box('monitor', (x + s * .43, 1.13, z - .25), (.78, .46, .04), bezel, .01, (0, -s * .18, 0)); box('screen', (x + s * .43, 1.13, z - .225), (.72, .41, .01), screenM, 0, (0, -s * .18, 0)); box('monitor stand', (x + s * .43, .86, z - .3), (.08, .25, .08), metal, 0)
            box('keyboard', (x, .78, z + .05), (.5, .02, .16), bezel, .005); box('mouse', (x + .4, .78, z + .05), (.06, .03, .1), bezel, .01)
            if (r + c) % 3 == 0: cyl('mug', (x - .7, .82, z), .045, .1, white, 'y', 10)
            cyl('chair base', (x, .06, z + .75), .28, .03, dark, 'y', 5); cyl('chair post', (x, .28, z + .75), .03, .4, chrome, 'y', 8); box('chair seat', (x, .5, z + .75), (.48, .08, .46), chairM, .03); box('chair back', (x, .82, z + .98), (.46, .5, .07), chairM, .03)
    # glass meeting room (east), plants, sofa, display wall of game cases (cases themselves are added in Three)
    span('meeting glass', (SX + 12, 0, -4), (SX + 12.04, 3.2, 8), railM, 0); span('meeting table', (SX + 14, .72, -1), (SX + 18, .78, 5), woodD, .02)
    for k in range(6): cyl('pot', (SX - 18.5 + (k % 2) * 37, .35, -12 + k * 4.5), .35, .7, potM, 'y', 14); ico('plant', (SX - 18.5 + (k % 2) * 37, 1.2, -12 + k * 4.5), .7, plantM, (.9, 1.3, .9), 1)
    span('display shelf', (SX - 4, 0, z1 - 1.2), (SX + 4, 1.0, z1 - .2), deskM, .02); span('display back', (SX - 4.2, 1.0, z1 - .25), (SX + 4.2, 3.4, z1 - .2), wallS, 0)
    for k in range(3): cyl('display riser', (SX - 2.6 + k * 2.6, 1.08, z1 - .7), .32, .16, chrome, 'y', 20)
    box('display light', (SX, 3.3, z1 - .9), (7.5, .08, .2), lampM, .01)
def stage():
    """dark glossy showcase stage for the final line-up (x 2100)"""
    span('stage floor', (2080, -.2, -20), (2120, 0, 20), stageM, 0); span('stage back', (2080, 0, -8), (2120, 12, -7.8), wallS, 0)
    for k in range(3): cyl('pedestal', (2093 + k * 7, .5, 0), .9, 1.0, stageM, 'y', 32); torus('pedestal rim', (2093 + k * 7, 1.0, 0), .9, .02, neonC, 'y', 40, 6)

# ================================================================== props: cars, palms (instanced), bits
def car_body(name, L_, W_, H_, paintm, kind='sedan'):
    o = [box(name + ' body', (0, .55, 0), (L_, .55, W_), paintm, .14, seg=3)]
    if kind == 'bus':
        o = [box(name + ' body', (0, 1.75, 0), (L_, 2.9, W_), paintm, .15), box(name + ' windows', (0, 2.3, 0), (L_ - .8, .9, W_ + .02), glassS, 0)]
    else:
        cab = (L_ * .5 if kind != 'sports' else L_ * .38); ch = (.5 if kind != 'suv' else .7)
        o.append(box(name + ' cabin', (-.1 if kind != 'sports' else -.25, .82 + ch / 2, 0), (cab, ch, W_ * .9), glassS, .12))
        o.append(box(name + ' roof', (-.1 if kind != 'sports' else -.25, .82 + ch + .02, 0), (cab * .85, .05, W_ * .85), paintm, .03))
    for sx in (-1, 1):
        for sz in (-1, 1): o.append(cyl(name + ' tire', (sx * L_ * .32, .34, sz * W_ * .46), .34, .24, mat('rubber', (.06, .06, .06), 0, .9), 'z', 16, .02)); o.append(cyl(name + ' rim', (sx * L_ * .32, .34, sz * (W_ * .46 + .12)), .2, .02, chrome, 'z', 14))
    for sz in (-1, 1):
        o.append(box(name + ' head', (L_ / 2, .7, sz * W_ * .32), (.04, .14, .3), mat('headlight', (1, 1, .95), 0, .1, (1, .97, .9), .6), 0))
        o.append(box(name + ' tail', (-L_ / 2, .72, sz * W_ * .34), (.04, .16, .26), mat('taillight', (.8, .05, .05), 0, .2, (.9, .05, .05), .5), 0))
    return o
def props():
    cols = [('red', (.75, .08, .1)), ('white', (.92, .92, .92)), ('black', (.06, .06, .07)), ('teal', (.1, .55, .6)), ('yellow', (.95, .72, .1)), ('silver', (.62, .64, .67)), ('pink', (.95, .4, .62)), ('blue', (.12, .25, .6))]
    for kind, (L_, W_, H_) in {'sedan': (4.6, 1.85, 1.45), 'sports': (4.4, 1.95, 1.2), 'suv': (4.8, 2.0, 1.8), 'taxi': (4.6, 1.85, 1.45), 'bus': (11.5, 2.5, 3.2)}.items():
        for cn, c in cols[:5 if kind != 'taxi' else 1]:
            pm = mat(f'car_paint_{cn}', c, .5, .25) if kind != 'taxi' else mat('car_paint_taxi', (.98, .78, .12), .5, .3)
            if kind == 'bus': pm = mat('bus_paint', (.95, .95, .9), .3, .4)
            keep(f'Car {kind} {cn}', car_body(kind, L_, W_, H_, pm, kind), (0, 0, 0))
            if kind == 'bus': break
    fr = [tube('pm trunk', [(0, 0, 0), (.2, 3.0, 0), (.45, 6.5, 0), (.7, 9.5, 0)], .2, mat('palm_trunk', (.55, .45, .32), 0, .95), 2)]
    for k in range(9):
        a = k * 2 * math.pi / 9; dx, dz = math.cos(a), math.sin(a)
        fr.append(tube('pm frond', [(.7, 9.5, 0), (.7 + dx * 1.5, 10.0, dz * 1.5), (.7 + dx * 3.0, 9.6, dz * 3.0), (.7 + dx * 3.8, 8.6, dz * 3.8)], .16, mat('palm', (.24, .5, .2), 0, .8), 1))
    keep('Palm', fr, (0, 0, 0))
    keep('Bush', [ico('bs', (dx, .5 + dy, dz), rr, hedge, (1.2, .8, 1.2), 1) for (dx, dy, dz, rr) in [(0, 0, 0, .7), (.5, -.1, .2, .5), (-.45, -.05, -.2, .55)]], (0, 0, 0))
    keep('Boat', [box('boat hull', (0, .4, 0), (7, .8, 2.4), white, .2), box('boat cabin', (-.5, 1.2, 0), (2.6, .8, 1.8), glassS, .1), box('boat stripe', (0, .55, 1.21), (6.6, .15, .02), mat('boat_blue', (.1, .3, .7), .3, .3), 0)], (0, 0, 0))

def palms_json():
    out = []
    for x in range(-250, 220, 12):
        out.append([x + random.uniform(-1, 1), .45, -13.2, random.uniform(.85, 1.15), random.uniform(0, 6.28)])
        out.append([x + 6 + random.uniform(-1, 1), .45, -2.0, random.uniform(.8, 1.1), random.uniform(0, 6.28)]) if x % 24 == 0 else None
    for z in AVES[:4]:
        for x in range(-210, 220, 14):
            if any(abs(x - s) < 11 for s in STREETS): continue
            if z == 40 and -36 < x < 40: continue
            out.append([x, .45, z - 7.8, random.uniform(.7, 1.0), random.uniform(0, 6.28)])
    for k in range(40): a = random.uniform(0, 6.28); r = random.uniform(10, 45); out.append([430 + math.cos(a) * r, .45, 190 + math.sin(a) * r, random.uniform(.8, 1.2), random.uniform(0, 6.28)])
    for k in range(60): out.append([random.uniform(-250, 210), .2, random.uniform(-40, -20), random.uniform(.8, 1.2), random.uniform(0, 6.28)]) if random.random() < .5 else None
    (OUT / 'palms.json').write_text(json.dumps([p for p in out if p], separators=(',', ':')))

reset(); ground(); city(); shops(); street_furniture(); rooftop(); causeway(); swamp(); studio(); stage(); export('world.glb')
palms_json()
reset(); props(); export('props.glb')
print('ALL ASSETS DONE')
