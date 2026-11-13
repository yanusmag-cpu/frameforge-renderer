"""Claude BA5390 production — original Blender assets (BAC One-Eleven 500, flight deck, cabin, Southampton airport, vehicles).
Run: blender -b --factory-startup -P scripts/ba5390/build-assets.py
Helper coordinates are Three.js metres: x forward (nose +x), y up, z starboard (+z right wing). Captain = left seat (-z).
Aircraft frame origin: fuselage centreline at the pilots' seat station. Flight-deck floor y=-0.9.
Objects named 'KEEP …' stay separate (animated in Three): windscreen panes, yokes, flight-deck door, gear, airstairs.
"""
import bpy, math, random
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'public/ba5390'; OUT.mkdir(parents=True, exist_ok=True)
random.seed(1061990)
MATS = {}
def mat(name, c, metal=0.0, rough=0.6, emit=None, strength=0.0, alpha=1.0):
    if name in MATS: return MATS[name]
    m = bpy.data.materials.new(name); m.use_nodes = True; p = m.node_tree.nodes.get('Principled BSDF')
    p.inputs['Base Color'].default_value = (*c, 1); p.inputs['Roughness'].default_value = rough; p.inputs['Metallic'].default_value = metal
    if emit: p.inputs['Emission Color'].default_value = (*emit, 1); p.inputs['Emission Strength'].default_value = strength
    if alpha < 1: p.inputs['Alpha'].default_value = alpha
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
def box(name, p, s, m, bevel=0.01, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(size=1, location=L(*p)); o = bpy.context.object; o.name = name
    o.scale = (s[0], s[2], s[1]); o.rotation_euler = (rot[0], -rot[2], rot[1]); bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return finish(o, m, bevel)
def cyl(name, p, r, h, m, axis='y', verts=20, bevel=0.0, r2=None):
    if r2 is None: bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=r, depth=h, location=L(*p))
    else: bpy.ops.mesh.primitive_cone_add(vertices=verts, radius1=r, radius2=r2, depth=h, location=L(*p))
    o = bpy.context.object; o.name = name
    if axis == 'x': o.rotation_euler = (0, math.pi / 2, 0)
    elif axis == 'z': o.rotation_euler = (math.pi / 2, 0, 0)
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=False); return finish(o, m, bevel)
def sphere(name, p, r, m, sc=(1, 1, 1), segs=20):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segs, ring_count=max(6, segs // 2), radius=r, location=L(*p))
    o = bpy.context.object; o.name = name; o.scale = (sc[0], sc[2], sc[1]); bpy.ops.object.transform_apply(scale=True); bpy.ops.object.shade_smooth(); return finish(o, m)
def torus(name, p, R, r, m, axis='y', segs=24):
    bpy.ops.mesh.primitive_torus_add(major_radius=R, minor_radius=r, major_segments=segs, minor_segments=8, location=L(*p))
    o = bpy.context.object; o.name = name
    if axis == 'x': o.rotation_euler = (0, math.pi / 2, 0)
    elif axis == 'z': o.rotation_euler = (math.pi / 2, 0, 0)
    bpy.ops.object.transform_apply(rotation=True); bpy.ops.object.shade_smooth(); return finish(o, m)
def tube(name, pts, r, m, res=2):
    c = bpy.data.curves.new(name, 'CURVE'); c.dimensions = '3D'; c.bevel_depth = r; c.bevel_resolution = res; c.use_fill_caps = True
    s = c.splines.new('POLY'); s.points.add(len(pts) - 1)
    for q, pt in zip(s.points, pts): q.co = (*L(*pt), 1)
    o = bpy.data.objects.new(name, c); bpy.context.collection.objects.link(o); c.materials.append(m); return o
def mesh(name, verts, faces, m, smooth=False):
    d = bpy.data.meshes.new(name); d.from_pydata([L(*v) for v in verts], [], faces); d.update()
    o = bpy.data.objects.new(name, d); bpy.context.collection.objects.link(o)
    if smooth:
        for f in d.polygons: f.use_smooth = True
    return finish(o, m)
def text(name, body, p, size, m, rot=(0, 0, 0), extrude=0.005, align='CENTER'):
    c = bpy.data.curves.new(name, 'FONT'); c.body = body; c.size = size; c.extrude = extrude; c.align_x = align; c.align_y = 'CENTER'
    o = bpy.data.objects.new(name, c); bpy.context.collection.objects.link(o); o.location = L(*p); o.rotation_euler = rot; c.materials.append(m); return o
def keep(name, objs, pivot):
    """Join objs into one separately animatable object whose origin is pivot (Three coords)."""
    for o in objs:
        if o.type != 'MESH':
            bpy.ops.object.select_all(action='DESELECT'); o.select_set(True); bpy.context.view_layer.objects.active = o; bpy.ops.object.convert(target='MESH')
    objs = [bpy.data.objects[o.name] for o in objs]
    for o in objs:
        bpy.ops.object.select_all(action='DESELECT'); o.select_set(True); bpy.context.view_layer.objects.active = o
        for md in list(o.modifiers): bpy.ops.object.modifier_apply(modifier=md.name)
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs: o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    if len(objs) > 1: bpy.ops.object.join()
    o = bpy.context.object; o.name = 'KEEP ' + name
    bpy.context.scene.cursor.location = L(*pivot); bpy.ops.object.origin_set(type='ORIGIN_CURSOR'); return o
def export(name):
    for o in list(bpy.context.scene.objects):
        if o.type in ('CURVE', 'FONT'):
            bpy.ops.object.select_all(action='DESELECT'); o.select_set(True); bpy.context.view_layer.objects.active = o; bpy.ops.object.convert(target='MESH')
    for o in bpy.context.scene.objects:
        if o.type == 'MESH':
            bpy.ops.object.select_all(action='DESELECT'); o.select_set(True); bpy.context.view_layer.objects.active = o
            for md in list(o.modifiers): bpy.ops.object.modifier_apply(modifier=md.name)
    by = {}
    for o in bpy.context.scene.objects:
        if o.type == 'MESH' and o.data.materials and not o.name.startswith('KEEP'):
            by.setdefault(o.data.materials[0].name, []).append(o)
    for mname, objs in by.items():
        if len(objs) < 2: continue
        bpy.ops.object.select_all(action='DESELECT')
        for o in objs: o.select_set(True)
        bpy.context.view_layer.objects.active = objs[0]; bpy.ops.object.join(); objs[0].name = mname
    bpy.ops.export_scene.gltf(filepath=str(OUT / name), export_format='GLB', export_apply=True, export_yup=True, export_materials='EXPORT', export_cameras=False, export_lights=False)
    print('exported', name)

# ---------------------------------------------------------------- materials (1990 Landor-era British Airways inspired)
pearl = mat('Livery pearl grey', (.78, .80, .83), .35, .25)
navy = mat('Livery midnight blue', (.02, .05, .16), .3, .3)
red = mat('Livery speedwing red', (.62, .03, .05), .2, .35)
tailBlue = mat('Tail midnight blue', (.02, .05, .17), .3, .28)
silver = mat('Bare metal', (.72, .74, .76), .95, .22)
darkMetal = mat('Dark metal', (.09, .10, .11), .7, .4)
black = mat('Rubber black', (.02, .02, .02), 0, .8)
glass = mat('Cockpit glass', (.08, .12, .16), .1, .05, alpha=.35)
cabinGlass = mat('Cabin window', (.05, .07, .09), .2, .1)
navR = mat('Nav red', (.9, .05, .05), 0, .3, (1, .05, .05), 10)
navG = mat('Nav green', (.05, .9, .2), 0, .3, (.05, 1, .2), 10)
strobe = mat('Strobe white', (1, 1, 1), 0, .3, (1, 1, 1), 12)
landing = mat('Landing light', (1, .97, .9), 0, .2, (1, .95, .85), 20)
gold = mat('Crest gold', (.8, .6, .2), .9, .3)
# flight deck
fdGrey = mat('Flight deck grey', (.25, .27, .28), .1, .65)
fdPanel = mat('Panel black', (.03, .035, .04), .2, .55)
fdBeige = mat('Flight deck liner beige', (.55, .52, .46), 0, .7)
seatBlue = mat('Seat navy fabric', (.07, .1, .2), 0, .9)
sheep = mat('Seat sheepskin', (.75, .7, .6), 0, 1)
gaugeFace = mat('Gauge face', (.03, .03, .03), 0, .3)
gaugeMark = mat('Gauge markings', (.95, .95, .9), 0, .4, (.9, .9, .85), .6)
adiSky = mat('ADI sky', (.15, .45, .85), 0, .3, (.2, .5, .9), .5)
adiGround = mat('ADI ground', (.45, .28, .1), 0, .4, (.45, .28, .12), .4)
amber = mat('Annunciator amber', (1, .6, .1), 0, .3, (1, .55, .05), 4)
redLamp = mat('Annunciator red', (1, .1, .05), 0, .3, (1, .05, .02), 5)
greenLamp = mat('Annunciator green', (.1, 1, .3), 0, .3, (.1, 1, .3), 3)
switchM = mat('Switch chrome', (.8, .8, .8), .9, .25)
knobM = mat('Knob black', (.05, .05, .05), .1, .4)
leverM = mat('Throttle lever', (.6, .6, .62), .8, .3)
leverKnob = mat('Throttle knob ivory', (.85, .82, .72), 0, .4)
bolt = mat('Windscreen bolt', (.55, .56, .58), .95, .3)
# cabin
seatFab = mat('Cabin seat blue', (.08, .14, .32), 0, .9)
seatHead = mat('Headrest cover white', (.88, .88, .86), 0, .9)
bin_ = mat('Overhead bin', (.82, .81, .78), 0, .5)
wall = mat('Cabin sidewall', (.86, .85, .82), 0, .6)
carpet = mat('Aisle carpet', (.12, .16, .35), 0, 1)
cabLight = mat('Cabin light strip', (1, .96, .88), 0, .3, (1, .94, .82), 4)
winDay = mat('Cabin window daylight', (.75, .88, 1), 0, .2, (.75, .88, 1), 3)
exitSign = mat('Exit sign', (.1, .9, .3), 0, .3, (.1, 1, .3), 4)
curtain = mat('Curtain navy', (.05, .08, .2), 0, .95)
galley = mat('Galley steel', (.7, .71, .72), .9, .3)
# airport
asphalt = mat('Runway asphalt', (.11, .11, .12), 0, .85)
paint = mat('Runway white paint', (.92, .92, .9), 0, .6)
yellowP = mat('Taxi yellow', (.95, .75, .1), 0, .6)
concrete = mat('Apron concrete', (.45, .45, .43), 0, .9)
termGlass = mat('Terminal glass', (.25, .4, .5), .4, .1, (.9, .75, .5), .6)
termWall = mat('Terminal cladding', (.72, .72, .7), .2, .5)
hangar = mat('Hangar blue', (.3, .4, .52), .4, .5)
edgeL = mat('Runway edge light', (1, .95, .8), 0, .3, (1, .9, .7), 8)
apprL = mat('Approach light', (1, .95, .85), 0, .3, (1, .95, .8), 10)
papiR = mat('PAPI red', (1, .1, .1), 0, .3, (1, .1, .1), 10)
papiW = mat('PAPI white', (1, 1, 1), 0, .3, (1, 1, 1), 10)
grassDark = mat('Hedge green', (.08, .2, .08), 0, .9)
trunk = mat('Tree trunk', (.2, .13, .08), 0, .9)
# vehicles
fireRed = mat('Fire tender red', (.75, .05, .04), .3, .35)
hiVisY = mat('Ambulance yellow', (.85, .9, .1), .2, .4)
hiVisG = mat('Ambulance green', (.1, .55, .25), .2, .4)
blueL = mat('Blue beacon', (.1, .3, 1), 0, .3, (.1, .3, 1), 14)
vWhite = mat('Vehicle white', (.9, .9, .9), .2, .35)
vGlass = mat('Vehicle glass', (.05, .08, .1), .3, .1)

# ---------------------------------------------------------------- BAC One-Eleven 500 exterior
def fus_profile(x):
    """Return (top, bottom, half_width) of the fuselage section at station x."""
    if x > 0.9:  # nose: windscreen slope then rounded tip at x=4.1
        u = (x - .9) / 3.2
        top = 1.6 - .78 * min(1, (x - .9) / 1.15) - (0 if x < 2.05 else 1.05 * ((x - 2.05) / 2.05) ** 1.4)
        bot = -1.6 + 1.25 * max(0, (x - 1.4) / 2.7) ** 1.8
        w = 1.6 * max(.04, math.sqrt(max(0, 1 - u ** 2.4)))
        return max(top, bot + .08), bot, w
    if x < -21.0:  # tail cone sweeping up
        u = (x + 21.0) / -7.6
        return 1.6 - .25 * u, -1.6 + 2.5 * u ** 1.3, 1.6 * (1 - .82 * u ** 1.15)
    return 1.6, -1.6, 1.6
def fuselage():
    xs = [-28.6 + i * .5 for i in range(int((0.9 + 28.6) / .5))] + [0.9 + i * .1 for i in range(33)]
    ring = 36; verts = []; faces = []
    for x in xs:
        top, bot, w = fus_profile(x); c = (top + bot) / 2; h = (top - bot) / 2
        for k in range(ring):
            a = k / ring * 2 * math.pi
            verts.append((x, c + h * math.cos(a), w * math.sin(a)))
    for i in range(len(xs) - 1):
        for k in range(ring):
            faces.append((i * ring + k, i * ring + (k + 1) % ring, (i + 1) * ring + (k + 1) % ring, (i + 1) * ring + k))
    tip = len(verts); verts.append((4.12, -0.18, 0))
    for k in range(ring): faces.append(((len(xs) - 1) * ring + k, (len(xs) - 1) * ring + (k + 1) % ring, tip))
    tail = len(verts); verts.append((-28.75, 0.9, 0))
    for k in range(ring): faces.append((k, tail, (k + 1) % ring))
    o = mesh('Fuselage', verts, faces, pearl, smooth=True)
    o.data.materials.append(navy); o.data.materials.append(red)
    for p in o.data.polygons:
        cz = sum(o.data.vertices[v].co.z for v in p.vertices) / len(p.vertices)   # blender z = three y
        cx = sum(o.data.vertices[v].co.x for v in p.vertices) / len(p.vertices)
        # Landor: midnight-blue lower fuselage, red speedwing pinstripe sweeping from nose to wing root
        line = -.25 + .18 * math.tanh((cx + 6) / 6)
        p.material_index = 1 if cz < line - .07 else (2 if cz < line else 0)
    return o
def surface(name, root, tip, span_dir, chord_root, chord_tip, thick, m, sweep=0.0, dihedral=0.0):
    """Tapered aerofoil slab from root (x_le, y, z) along span_dir (+1 starboard, -1 port) or 'up' for fins."""
    n = 10; verts = []; faces = []
    for i in range(n + 1):
        u = i / n; ch = chord_root + (chord_tip - chord_root) * u
        if span_dir == 'up':
            le = (root[0] - sweep * u, root[1] + tip * u, root[2])
            for j, (dx, dz) in enumerate([(0, 0), (-.25 * ch, thick * ch), (-ch, 0), (-.25 * ch, -thick * ch)]):
                verts.append((le[0] + dx, le[1], le[2] + dz))
        else:
            le = (root[0] - sweep * u, root[1] + dihedral * u, root[2] + span_dir * tip * u)
            for j, (dx, dy) in enumerate([(0, 0), (-.25 * ch, thick * ch), (-ch, 0), (-.25 * ch, -thick * ch * .5)]):
                verts.append((le[0] + dx, le[1] + dy, le[2]))
    for i in range(n):
        for j in range(4): faces.append((i * 4 + j, i * 4 + (j + 1) % 4, (i + 1) * 4 + (j + 1) % 4, (i + 1) * 4 + j))
    faces.append((n * 4, n * 4 + 1, n * 4 + 2, n * 4 + 3)); faces.append((3, 2, 1, 0))
    return mesh(name, verts, faces, m, smooth=True)
def plane(with_cockpit_cutouts=True):
    fus = fuselage()
    # windscreen / side-window cut-outs so the flight deck is visible once the left pane is gone
    cut = []
    def pane_quad(zc, zw, x0, x1):
        top0, _, _ = fus_profile(x0); top1, _, _ = fus_profile(x1)
        return [(x1, top1 - .12, zc - zw), (x1, top1 - .12, zc + zw), (x0, top0 - .1, zc + zw * .9), (x0, top0 - .1, zc - zw * .9)]
    panes = {'L': (-.4, .32), 'R': (.4, .32)}
    for k, (zc, zw) in panes.items():
        q = pane_quad(zc, zw, 1.32, 1.98)
        # cutter: thick prism along the surface normal
        vs = [(x, y - .35, z) for x, y, z in q] + [(x, y + .45, z) for x, y, z in q]
        fs = [(0, 1, 2, 3), (7, 6, 5, 4), (0, 4, 5, 1), (1, 5, 6, 2), (2, 6, 7, 3), (3, 7, 4, 0)]
        c = mesh('cut ' + k, vs, fs, None); cut.append(c)
        g = mesh(('KEEP ' if k == 'L' else '') + 'Windscreen ' + k, q, [(0, 1, 2, 3)], glass)
        sol = g.modifiers.new('t', 'SOLIDIFY'); sol.thickness = .03
    for side in (-1, 1):  # direct-vision side windows
        x0, x1 = 0.75, 1.25; top0, _, w0 = fus_profile(x0)
        vs = [(x0, .55, side * 1.0), (x1, .58, side * .95), (x1, .98, side * .82), (x0, 1.0, side * .9)]
        c = mesh(f'cut side {side}', [(x, y, z * .8) for x, y, z in vs] + [(x, y, z * 1.4) for x, y, z in vs], [(0, 1, 2, 3), (7, 6, 5, 4), (0, 4, 5, 1), (1, 5, 6, 2), (2, 6, 7, 3), (3, 7, 4, 0)], None); cut.append(c)
        g = mesh(f'Side window {side}', [(x, y, z * 1.12) for x, y, z in vs], [(0, 1, 2, 3)], glass); g.modifiers.new('t', 'SOLIDIFY').thickness = .02
    for c in cut:
        bpy.ops.object.select_all(action='DESELECT'); c.select_set(True); bpy.context.view_layer.objects.active = c
        bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT'); bpy.ops.mesh.normals_make_consistent(inside=False); bpy.ops.object.mode_set(mode='OBJECT')
    for c in cut:
        md = fus.modifiers.new('cut', 'BOOLEAN'); md.operation = 'DIFFERENCE'; md.object = c; md.solver = 'EXACT'
    bpy.ops.object.select_all(action='DESELECT'); fus.select_set(True); bpy.context.view_layer.objects.active = fus
    for md in list(fus.modifiers): bpy.ops.object.modifier_apply(modifier=md.name)
    for c in cut: bpy.data.objects.remove(c, do_unlink=True)
    # windscreen frames + 90 bolt heads around the captain's pane (the infamous A211-8C bolts)
    for k, (zc, zw) in panes.items():
        q = pane_quad(zc, zw, 1.32, 1.98); q = [(x, y + .02, z) for x, y, z in q]
        tube('Frame ' + k, q + [q[0]], .035, darkMetal)
        if k == 'L':
            for i in range(90):
                u = i / 90 * 4; e = int(u); f = u - e; a = q[e]; b = q[(e + 1) % 4]
                p = tuple(a[j] + (b[j] - a[j]) * f for j in range(3))
                cyl(f'Bolt {i}', (p[0], p[1] + .03, p[2]), .011, .012, bolt, verts=6)
    tube('Centre post', [(1.98, fus_profile(1.98)[0] - .1, 0), (1.32, fus_profile(1.32)[0] - .08, 0)], .05, darkMetal)
    # wipers
    for side in (-1, 1): tube(f'Wiper {side}', [(2.02, fus_profile(2.0)[0] - .12, side * .55), (1.75, fus_profile(1.75)[0] - .02, side * .25)], .012, black)
    # cabin windows (BAC One-Eleven small rounded rectangles)
    for side in (-1, 1):
        for i in range(24):
            x = -1.6 - i * .76
            if -10.6 < x < -9.6: continue
            box(f'Win {side} {i}', (x, .55, side * 1.585), (.24, .32, .03), cabinGlass, .03)
    # doors: forward airstair door (port) + service door (starboard), outlines
    for side, x in ((-1, -0.9), (1, -1.0)):
        tube(f'Door outline {side}', [(x - .4, -.55, side * 1.61), (x + .4, -.55, side * 1.61), (x + .4, 1.2, side * 1.55), (x - .4, 1.2, side * 1.55), (x - .4, -.55, side * 1.61)], .012, darkMetal)
        box(f'Door handle {side}', (x + .25, .3, side * 1.62), (.12, .03, .02), silver, .005)
    for side in (-1, 1): box(f'Overwing exit {side}', (-10.1, .55, side * 1.585), (.55, .62, .02), cabinGlass, .02)
    # titles and crest-style details
    for side in (-1, 1):
        text(f'Title {side}', 'BRITISH AIRWAYS', (-7.0, 1.05, side * 1.6), .52, navy, rot=(math.pi / 2, 0, math.pi if side < 0 else 0))
        text(f'Reg {side}', 'G-BJRT', (-25.0, .2, side * (fus_profile(-25.0)[2] + .02)), .32, navy, rot=(math.pi / 2, 0, math.pi if side < 0 else 0))
    # wings (span 28.5 m, sweep ~20 deg, low-mounted)
    for side in (-1, 1):
        surface(f'Wing {side}', (-10.2, -1.15, side * 1.4), 12.9, side, 4.6, 1.5, .11, silver, sweep=4.4, dihedral=.75)
        surface(f'Flap {side}', (-14.2, -1.18, side * 1.7), 7.5, side, .9, .7, .05, pearl, sweep=2.0, dihedral=.45)
        tube(f'Fence {side}', [(-12.5, -1.0, side * 7), (-16.0, -.85, side * 7)], .03, silver)
        for i in range(3): box(f'Flap track {side}{i}', (-15.2 - i * .9, -1.3, side * (3.6 + i * 2.8)), (1.6, .14, .1), silver, .02)
        sphere(f'Wingtip light {side}', (-15.0, -.4, side * 14.2), .1, navG if side > 0 else navR)
        cyl(f'Landing light {side}', (-10.0, -1.25, side * 2.6), .09, .1, landing, axis='x')
    box('Wing box fairing', (-12.0, -1.35, 0), (6.5, .5, 3.0), pearl, .25)
    # rear-mounted Spey engines on pylons
    for side in (-1, 1):
        zc = side * 2.55; yc = .75
        cyl(f'Nacelle {side}', (-22.6, yc, zc), .78, 4.4, silver, axis='x', verts=32)
        cyl(f'Intake lip {side}', (-20.35, yc, zc), .8, .2, pearl, axis='x', verts=32)
        cyl(f'Intake dark {side}', (-20.3, yc, zc), .62, .12, black, axis='x', verts=32)
        cyl(f'Spinner {side}', (-20.55, yc, zc), .22, .4, silver, axis='x', verts=16, r2=.02)
        for b in range(18):
            a = b / 18 * 2 * math.pi
            tube(f'Fan blade {side} {b}', [(-20.5, yc + .22 * math.cos(a), zc + .22 * math.sin(a)), (-20.55, yc + .6 * math.cos(a + .2), zc + .6 * math.sin(a + .2))], .03, darkMetal, res=0)
        cyl(f'Exhaust {side}', (-25.1, yc, zc), .6, .7, darkMetal, axis='x', verts=24, r2=.5)
        surface(f'Pylon {side}', (-21.6, yc, side * 1.35), 1.0, side, 2.6, 2.3, .12, pearl, sweep=.3)
        box(f'Nacelle band {side}', (-21.4, yc, zc), (.12, 1.58, 1.58), tailBlue, .4)
    # T-tail
    surface('Fin', (-24.0, 1.35, 0), 5.7, 'up', 5.4, 3.1, .07, tailBlue, sweep=3.6)
    surface('Fin tip red', (-27.55, 6.95, 0), .35, 'up', 3.15, 3.0, .07, red, sweep=.2)
    for side in (-1, 1): surface(f'Tailplane {side}', (-27.4, 7.1, side * .15), 4.4, side, 2.7, 1.2, .08, pearl, sweep=1.8, dihedral=-.1)
    box('Fin bullet', (-28.6, 7.15, 0), (1.6, .35, .4), tailBlue, .15)
    for side in (-1, 1):
        sphere(f'Crest {side}', (-26.6, 3.8, side * .2), .42, gold, sc=(1, 1.2, .2), segs=16)
        text(f'Tail band {side}', 'BRITISH AIRWAYS', (-26.4, 2.6, side * .24), .18, pearl, rot=(math.pi / 2, 0, math.pi if side < 0 else 0))
    surface('Ventral strake', (-25.5, -1.0, 0), .5, 'up', 3, 2, .04, navy, sweep=1.0)
    # lights, antennas, probes
    sphere('Beacon top', (-6, 1.65, 0), .08, navR); sphere('Beacon bottom', (-6, -1.65, 0), .08, navR); sphere('Tail strobe', (-29.0, 7.15, 0), .07, strobe)
    for i, x in enumerate((-3, -15)): box(f'Antenna {i}', (x, 1.75, 0), (.4, .25, .03), darkMetal, .02, rot=(0, 0, -.4))
    for side in (-1, 1): tube(f'Pitot {side}', [(2.6, -.2, side * 1.0), (2.85, -.2, side * 1.0)], .015, silver)
    # landing gear (KEEP so it can retract/extend); main gear under wing, nose gear
    for side in (-1, 1):
        parts = [tube(f'MLG leg {side}', [(-12.6, -1.5, side * 2.25), (-12.6, -3.1, side * 2.25)], .09, silver)]
        for dz in (-.25, .25): parts.append(cyl(f'MLG wheel {side}{dz}', (-12.6, -3.25, side * 2.25 + dz), .45, .28, black, axis='z', verts=24)); parts.append(cyl(f'MLG hub {side}{dz}', (-12.6, -3.25, side * 2.25 + dz * 1.55), .22, .03, silver, axis='z', verts=16))
        keep(f'Main gear {"L" if side < 0 else "R"}', parts, (-12.6, -1.5, side * 2.25))
    parts = [tube('NLG leg', [(1.9, -1.3, 0), (1.9, -2.95, 0)], .07, silver)]
    for dz in (-.16, .16): parts.append(cyl(f'NLG wheel {dz}', (1.9, -3.1, dz), .3, .2, black, axis='z', verts=20))
    parts.append(cyl('Taxi light', (1.95, -1.9, 0), .07, .08, landing, axis='x'))
    keep('Nose gear', parts, (1.9, -1.3, 0))
reset(); plane(); export('plane.glb')

# ---------------------------------------------------------------- FLIGHT DECK (same aircraft frame)
def flightdeck():
    FL = -.9
    box('FD floor', (0, FL - .03, 0), (3.6, .06, 2.2), fdGrey, .005)
    for side in (-1, 1):  # curved liner panels left/right/ceiling
        vs = []; fs = []; n = 10
        for i in range(n + 1):
            a = math.radians(-30 + 110 * i / n)
            for x in (-1.7, .95):
                vs.append((x, .25 + 1.32 * math.sin(a) * .95, side * 1.42 * math.cos(a)))
        for i in range(n): fs.append((i * 2, i * 2 + 1, i * 2 + 3, i * 2 + 2))
        mesh(f'Liner {side}', vs, fs, fdBeige, smooth=True)
        box(f'Side console {side}', (-.2, -.45, side * 1.0), (1.8, .9, .32), fdGrey, .03)
        for i in range(6): cyl(f'Side knob {side}{i}', (-.8 + i * .25, .0, side * .95), .025, .03, knobM, verts=10)
        box(f'Map pocket {side}', (.2, -.35, side * 1.13), (.5, .35, .06), fdPanel, .01)
    # main instrument panel (tilted) with gauges, ADI, HSI, annunciators
    def panel(cx, cz, w):
        box(f'Panel {cz}', (cx, -.12, cz), (.06, .62, w), fdPanel, .01, rot=(0, 0, -.12))
        for r in range(3):
            for c in range(4):
                p = (cx - .035 - r * .006, .1 - r * .17, cz - w / 2 + .1 + c * (w - .2) / 3)
                if r == 1 and c == 1:
                    sphere(f'ADI {cz}', (p[0] - .01, p[1], p[2]), .07, adiSky, sc=(.35, 1, 1), segs=16)
                    box(f'ADI ground {cz}', (p[0] - .028, p[1] - .035, p[2]), (.01, .06, .13), adiGround, 0)
                    continue
                cyl(f'Gauge {cz} {r}{c}', p, .062, .02, gaugeFace, axis='x', verts=20)
                torus(f'Gauge rim {cz} {r}{c}', (p[0] - .012, p[1], p[2]), .062, .008, switchM, axis='x', segs=20)
                for t in range(8):
                    a = t / 8 * 2 * math.pi; box(f'Tick {cz}{r}{c}{t}', (p[0] - .013, p[1] + .048 * math.cos(a), p[2] + .048 * math.sin(a)), (.002, .012, .004), gaugeMark, 0)
                box(f'Needle {cz} {r}{c}', (p[0] - .014, p[1] + .02, p[2] + .005), (.002, .045, .006), gaugeMark, 0, rot=(random.uniform(-1, 1), 0, 0))
    panel(1.2, -.48, .78); panel(1.2, .48, .78)
    box('Centre panel', (1.16, -.15, 0), (.06, .7, .36), fdPanel, .01, rot=(0, 0, -.12))
    for i in range(3):
        for j in range(2):
            cyl(f'Engine gauge {i}{j}', (1.12, .1 - i * .15, -.08 + j * .16), .055, .02, gaugeFace, axis='x', verts=18)
            box(f'Engine needle {i}{j}', (1.105, .12 - i * .15, -.08 + j * .16), (.002, .04, .005), gaugeMark, 0)
    for i in range(10):  # annunciator strip on glareshield face
        box(f'Annunciator {i}', (1.12, .25, -.7 + i * .155), (.015, .04, .1), [amber, greenLamp, amber, amber, redLamp][i % 5], .003)
    box('Glareshield', (1.08, .3, 0), (.45, .06, 1.9), mat('Glareshield matte', (.12, .12, .13), 0, .9), .02)
    box('Autopilot panel', (.9, .3, 0), (.08, .1, .8), fdGrey, .01)
    for i in range(8): cyl(f'AP knob {i}', (.85, .3, -.35 + i * .1), .018, .03, knobM, axis='x', verts=10)
    # centre pedestal with throttles, flap lever, trim wheels, radios
    box('Pedestal', (.45, -.55, 0), (1.3, .7, .36), fdGrey, .03)
    box('Pedestal top', (.45, -.18, 0), (1.25, .05, .34), fdPanel, .01, rot=(0, 0, -.15))
    for i, z in enumerate((-.06, .06)):
        tube(f'Throttle {i}', [(.75, -.16, z), (.62, .08, z)], .015, leverM); sphere(f'Throttle knob {i}', (.6, .1, z), .03, leverKnob)
    tube('Flap lever', [(.35, -.16, .13), (.3, .02, .13)], .012, leverM); box('Flap knob', (.3, .04, .13), (.05, .03, .04), switchM, .01)
    tube('Speed brake', [(.4, -.16, -.13), (.36, .0, -.13)], .012, leverM); box('Speed brake knob', (.36, .02, -.13), (.05, .03, .04), fdPanel, .01)
    for side in (-1, 1): cyl(f'Trim wheel {side}', (.55, -.4, side * .19), .14, .03, fdPanel, axis='z', verts=24)
    for i in range(4):
        box(f'Radio {i}', (.05 - i * .2, -.2, 0), (.17, .05, .3), fdPanel, .01)
        for j in range(4): box(f'Radio digit {i}{j}', (.05 - i * .2, -.17, -.09 + j * .06), (.05, .005, .03), amber, 0)
        for j in range(2): cyl(f'Radio knob {i}{j}', (.05 - i * .2, -.16, -.12 + j * .24), .02, .03, knobM, verts=10)
    # overhead panel with switches
    box('Overhead', (.45, 1.22, 0), (1.2, .08, .7), fdGrey, .02, rot=(0, 0, .25))
    for r in range(7):
        for c in range(9):
            p = (.0 + r * .14, 1.12 + r * .035, -.3 + c * .075)
            cyl(f'OH switch {r}{c}', p, .009, .05, switchM, verts=6)
            if (r + c) % 5 == 0: box(f'OH light {r}{c}', (p[0], p[1] + .02, p[2] + .03), (.03, .01, .02), [amber, greenLamp][(r * c) % 2], 0)
    # control columns / yokes (KEEP, pivot at floor so pitch can animate)
    for side in (-1, 1):
        z = side * .45
        parts = [tube(f'Column {side}', [(.95, FL, z), (.95, -.35, z), (.82, -.1, z)], .035, fdPanel)]
        parts.append(torus(f'Yoke ring {side}', (.8, -.08, z), .17, .022, fdPanel, axis='x', segs=24))
        parts.append(box(f'Yoke boss {side}', (.79, -.08, z), (.06, .08, .14), fdGrey, .01))
        for dz in (-1, 1): parts.append(box(f'Yoke grip {side}{dz}', (.79, -.06, z + dz * .17), (.05, .14, .05), knobM, .015))
        keep(f'Yoke {"L" if side < 0 else "R"}', parts, (.95, FL, z))
        for dz in (-.12, .12): box(f'Rudder pedal {side}{dz}', (1.05, FL + .12, z + dz), (.06, .2, .1), fdGrey, .01, rot=(0, 0, .5))
    # pilot seats with harnesses
    for side in (-1, 1):
        z = side * .5; parts = []
        box(f'Seat base {side}', (.0, FL + .25, z), (.45, .5, .4), fdGrey, .03)
        box(f'Seat pan {side}', (.05, FL + .55, z), (.48, .1, .48), seatBlue, .04)
        box(f'Seat back {side}', (-.22, FL + 1.0, z), (.12, .85, .48), seatBlue, .05, rot=(0, 0, .12))
        box(f'Sheepskin {side}', (-.17, FL + 1.0, z), (.03, .7, .4), sheep, .02, rot=(0, 0, .12))
        box(f'Headrest {side}', (-.28, FL + 1.5, z), (.1, .2, .3), seatBlue, .04)
        for dz in (-.27, .27): box(f'Armrest {side}{dz}', (.05, FL + .75, z + dz), (.38, .05, .05), fdGrey, .015)
        for dz in (-.12, .12): tube(f'Harness {side}{dz}', [(-.25, FL + 1.4, z + dz), (-.1, FL + 1.25, z + dz * .9), (.1, FL + .7, z)], .012, seatBlue)
        tube(f'Lap belt {side}', [(.05, FL + .62, z - .24), (.18, FL + .7, z), (.05, FL + .62, z + .24)], .012, seatBlue)
    # jump seat + bulkhead with flight-deck door (KEEP, hinge at port edge)
    box('Jump seat', (-1.1, FL + .55, -.6), (.35, .06, .4), seatBlue, .02)
    box('Jump seat back', (-1.32, FL + .9, -.6), (.06, .6, .4), seatBlue, .02)
    for side in (-1, 1): box(f'Bulkhead {side}', (-1.7, .1, side * .85), (.06, 2.1, .9), fdBeige, .01)
    box('Bulkhead top', (-1.7, 1.05, 0), (.06, .2, .8), fdBeige, .01)
    d = box('Door panel', (-1.68, .0, 0), (.04, 1.8, .74), fdBeige, .01); h = cyl('Door handle', (-1.64, .0, .28), .02, .1, switchM, axis='x', verts=8)
    keep('FD door', [d, h], (-1.68, .0, -.37))
    # windscreen frames + bolts seen from inside, posts, sun visors
    def pane_q(zc, zw):
        def top(x): return 1.6 - .78 * min(1, (x - .9) / 1.15)
        return [(1.98, top(1.98) - .12, zc - zw), (1.98, top(1.98) - .12, zc + zw), (1.32, top(1.32) - .1, zc + zw * .9), (1.32, top(1.32) - .1, zc - zw * .9)]
    for k, (zc, zw) in {'L': (-.4, .32), 'R': (.4, .32)}.items():
        q = pane_q(zc, zw); qi = [(x - .02, y - .02, z) for x, y, z in q]
        tube('Inner frame ' + k, qi + [qi[0]], .03, fdPanel)
        g = mesh(('KEEP ' if k == 'L' else '') + 'Inner windscreen ' + k, [(x - .005, y - .005, z) for x, y, z in q], [(0, 1, 2, 3)], glass)
        if k == 'L':
            for i in range(90):
                u = i / 90 * 4; e = int(u); f = u - e; a = q[e]; b = q[(e + 1) % 4]
                p = tuple(a[j] + (b[j] - a[j]) * f for j in range(3))
                cyl(f'Inner bolt {i}', (p[0], p[1] + .035, p[2]), .011, .014, bolt, verts=6)
    tube('Inner centre post', [(1.98, .62, 0), (1.32, 1.1, 0)], .045, fdPanel)
    # checklist card, coffee cup holders, oxygen mask stowage
    for side in (-1, 1):
        box(f'Checklist {side}', (.9, .2, side * .78), (.01, .22, .14), mat('Checklist card', (.9, .88, .75), 0, .6), 0, rot=(0, 0, -.2))
        cyl(f'O2 mask box {side}', (-.3, .3, side * 1.1), .07, .12, mat('O2 box', (.75, .74, .7), 0, .5), axis='z')
reset(); flightdeck(); export('cockpit.glb')

# ---------------------------------------------------------------- PASSENGER CABIN (aircraft frame, behind the bulkhead)
def cabin():
    FL = -.95
    box('Cabin floor', (-11, FL - .03, 0), (19, .06, 3.0), fdGrey, 0)
    box('Aisle carpet', (-11, FL + .005, -.2), (19, .01, .5), carpet, 0)
    vs = []; fs = []; n = 16
    for i in range(n + 1):
        a = math.radians(-35 + 250 * i / n)
        for x in (-20.5, -1.6): vs.append((x, .1 + 1.48 * math.sin(a), 1.48 * math.cos(a)))
    for i in range(n): fs.append((i * 2, i * 2 + 1, i * 2 + 3, i * 2 + 2))
    mesh('Cabin shell', vs, fs, wall, smooth=True)
    for side in (-1, 1):
        for i in range(24):
            x = -2.0 - i * .76
            box(f'Window {side}{i}', (x, .55, side * 1.42), (.22, .3, .02), winDay, .03)
            box(f'Window reveal {side}{i}', (x, .55, side * 1.4), (.3, .38, .03), bin_, .05)
        box(f'Bin {side}', (-11, 1.12, side * 1.05), (18.5, .42, .55), bin_, .04)
        for i in range(12): box(f'Bin seam {side}{i}', (-2.3 - i * 1.55, 1.12, side * .775), (.01, .38, .01), fdGrey, 0)
        box(f'Light strip {side}', (-11, .9, side * .78), (18.5, .03, .03), cabLight, 0)
        box(f'PSU {side}', (-11, .88, side * 1.05), (18.5, .03, .35), wall, 0)
    box('Ceiling light', (-11, 1.5, 0), (18.5, .02, .4), cabLight, 0)
    def seat(x, z, n_, prefix):
        w = .5; box(prefix + ' base', (x, FL + .25, z), (.45, .1, w * n_), darkMetal, .02)
        for k in range(n_):
            zz = z - w * (n_ - 1) / 2 + k * w
            box(f'{prefix} cushion {k}', (x + .02, FL + .43, zz), (.46, .12, w - .04), seatFab, .04)
            box(f'{prefix} back {k}', (x - .22, FL + .82, zz), (.1, .72, w - .05), seatFab, .04, rot=(0, 0, .1))
            box(f'{prefix} headrest {k}', (x - .24, FL + 1.12, zz), (.11, .18, w - .08), seatHead, .02)
        for k in range(n_ + 1): box(f'{prefix} arm {k}', (x, FL + .55, z - w * n_ / 2 + k * w), (.4, .04, .04), darkMetal, .01)
    for r in range(20):
        x = -2.3 - r * .82
        seat(x, -.85, 2, f'L{r}'); seat(x, .62, 3, f'R{r}')
    box('Galley', (-1.95, .1, .95), (.6, 2.0, .9), galley, .02)
    for i in range(4): box(f'Galley drawer {i}', (-1.64, -.5 + i * .3, .95), (.02, .25, .8), galley, .01)
    box('Trolley', (-1.9, -.5, -.95), (.5, .9, .35), galley, .02)
    for side in (-1, 1): box(f'Curtain {side}', (-1.75, .3, side * .7), (.05, 1.6, .5), curtain, .02)
    box('Exit sign', (-1.72, 1.25, -.2), (.03, .1, .3), exitSign, .005)
    cyl('Extinguisher', (-1.75, -.6, -1.25), .06, .4, mat('Extinguisher red', (.7, .05, .03), .2, .4))
reset(); cabin(); export('cabin.glb')

# ---------------------------------------------------------------- SOUTHAMPTON AIRPORT (runway 02, threshold at origin, runway along +x)
def airport():
    LEN = 1723; W = 37
    box('Runway', (LEN / 2, -.02, 0), (LEN + 60, .04, W + 8), asphalt, 0)
    for i in range(8):  # threshold piano keys
        for s in (-1, 1): box(f'Key {i}{s}', (15, .005, s * (2 + i * 2.1)), (30, .01, 1.5), paint, 0)
    text('Runway 02', '02', (55, .01, 0), 14, paint, rot=(0, 0, -math.pi / 2), extrude=0, align='CENTER')
    for i in range(int((LEN - 100) / 50)): box(f'CL {i}', (90 + i * 50, .006, 0), (30, .01, .9), paint, 0)
    for s in (-1, 1):
        box(f'Edge {s}', (LEN / 2, .006, s * (W / 2 - .5)), (LEN, .01, .7), paint, 0)
        box(f'Aim {s}', (300, .006, s * 6), (45, .01, 4.5), paint, 0)
        for i in range(3): box(f'TDZ {s}{i}', (150 + i * 150, .006, s * 7), (22, .01, 1.8), paint, 0)
        for i in range(0, LEN, 60): box(f'Edge light {s}{i}', (i, .25, s * (W / 2 + 2)), (.2, .5, .2), edgeL, 0)
        for i in range(4): box(f'PAPI {s}{i}', (320, .6, s * (W / 2 + 12 + i * 3)), (.6, .6, .6), papiR if i < 2 else papiW, .05)
    for i in range(12):  # approach lighting before threshold
        x = -30 - i * 30
        for k in range(-2, 3): cyl(f'Appr {i}{k}', (x, 1.5 + i * .1, k * 1.5), .15, .2, apprL, verts=8)
        cyl(f'Appr pole {i}', (x, .75 + i * .05, 0), .05, 1.5 + i * .1, darkMetal, verts=6)
    box('Taxiway', (1100, -.015, 70), (24, .03, 120), asphalt, 0)
    box('Taxi line', (1100, .005, 70), (.4, .01, 120), yellowP, 0)
    box('Apron', (1100, -.015, 175), (420, .03, 110), concrete, 0)
    box('Terminal', (1100, 6, 250), (300, 12, 40), termWall, .3)
    box('Terminal glass', (1100, 6.5, 229.5), (290, 7, .6), termGlass, 0)
    box('Terminal roof', (1100, 12.4, 250), (306, .8, 44), darkMetal, .1)
    cyl('Tower shaft', (900, 14, 225), 3, 28, termWall, verts=16)
    cyl('Tower cab', (900, 30.5, 225), 6, 5, termGlass, verts=8)
    cyl('Tower roof', (900, 33.5, 225), 6.8, 1, darkMetal, verts=8)
    for i in range(3):
        box(f'Hangar {i}', (1450 + i * 70, 9, 210), (60, 18, 50), hangar, .2)
        cyl(f'Hangar roof {i}', (1450 + i * 70, 18, 210), 25, 60, hangar, axis='x', verts=24)
    box('Fire station', (700, 4, 120), (40, 8, 20), mat('Fire station brick', (.45, .2, .15), 0, .9), .2)
    for i in range(4): box(f'Fire bay {i}', (686 + i * 9, 3, 109.8), (7, 6, .3), mat('Bay door', (.75, .1, .08), .3, .4), .02)
    for i in range(160):  # tree clumps around the field
        x = random.uniform(-600, 2300); z = random.choice([-1, 1]) * random.uniform(90, 600)
        if z > 0 and 500 < x < 1900 and z < 320: continue
        h = random.uniform(6, 14); cyl(f'Trunk {i}', (x, h * .25, z), .4, h * .5, trunk, verts=6)
        sphere(f'Crown {i}', (x, h * .7, z), h * .35, grassDark, sc=(1, .8, 1), segs=8)
    for i in range(30):
        box(f'Parked car {i}', (980 + i * 9, .7, 285), (4.2, 1.4, 1.9), mat(f'Car paint {i % 5}', [(.6, .1, .1), (.1, .2, .5), (.8, .8, .8), (.1, .1, .1), (.2, .4, .2)][i % 5], .5, .3), .3)
reset(); airport(); export('airport.glb')

# ---------------------------------------------------------------- VEHICLES (x forward)
def tender():
    box('Body', (0, 1.8, 0), (9, 2.6, 2.6), fireRed, .12); box('Cab', (3.6, 2.2, 0), (2.2, 2.2, 2.6), fireRed, .15)
    box('Windscreen', (4.68, 2.6, 0), (.05, .9, 2.3), vGlass, .02)
    for s in (-1, 1): box(f'Stripe {s}', (0, 1.4, s * 1.31), (9, .3, .02), mat('Retro yellow', (1, .85, .1), 0, .4, (1, .8, .1), .3), 0)
    for x in (-3, -.5, 3.4):
        for s in (-1, 1): cyl(f'Wheel {x}{s}', (x, .6, s * 1.25), .6, .4, black, axis='z', verts=20)
    cyl('Monitor', (2, 3.4, 0), .15, .7, silver, axis='x', verts=10)
    for s in (-1, 1): box(f'Beacon {s}', (4.2, 3.35, s * .9), (.3, .2, .3), blueL, .05)
    text('Fire label', 'AIRPORT FIRE', (0, 2.4, 1.32), .4, vWhite, rot=(math.pi / 2, 0, 0))
reset(); tender(); export('firetender.glb')
def ambulance():
    box('Body', (-.5, 1.6, 0), (4.6, 2.4, 2.1), hiVisY, .12); box('Cab', (2.3, 1.2, 0), (1.6, 1.6, 2.0), hiVisY, .2)
    box('Windscreen', (3.05, 1.6, 0), (.05, .7, 1.8), vGlass, .02)
    for s in (-1, 1):
        for i in range(8): box(f'Battenburg {s}{i}', (-2.5 + i * .55, 1.05, s * 1.06), (.55, .45, .02), hiVisG if i % 2 else hiVisY, 0)
    for x in (-1.8, 2.2):
        for s in (-1, 1): cyl(f'Wheel {x}{s}', (x, .42, s * .95), .42, .3, black, axis='z', verts=18)
    for s in (-1, 1): box(f'Beacon {s}', (1.9, 2.1, s * .7), (.25, .15, .25), blueL, .04)
    text('Amb label', 'AMBULANCE', (-.5, 2.2, 1.06), .35, mat('Amb text', (.05, .2, .1), 0, .5), rot=(math.pi / 2, 0, 0))
reset(); ambulance(); export('ambulance.glb')
def stairs():
    box('Truck', (0, .8, 0), (5, 1.2, 2.2), vWhite, .1)
    for i in range(12): box(f'Step {i}', (-2.5 + i * .32, 1.4 + i * .27, 0), (.32, .05, 1.2), silver, .01)
    for s in (-1, 1): tube(f'Rail {s}', [(-2.5, 2.4, s * .65), (1.3, 5.6, s * .65)], .03, silver)
    for x in (-1.6, 1.6):
        for s in (-1, 1): cyl(f'Wheel {x}{s}', (x, .35, s * 1.0), .35, .25, black, axis='z', verts=16)
reset(); stairs(); export('stairs.glb')
print('ALL ASSETS DONE')
