"""YunoWorld v9 — "They Put PIGEONS Inside a Missile". Detailed Blender sets and hero props (GLB) for the Three engine.
Run: blender -b --factory-startup -P scripts/yw9/pigeon_sets.py  → public/yw9-pigeon/*.glb + scatter json
Sets (each centred on its own origin, floor y=0, metres): lab (1943 flour-mill workshop), war (Washington committee room),
range (outdoor bombing range with terrain), coast (cliffs, beach, lighthouse, target freighter), street (1940s crossroads for
the "three friends" analogy), navy (1948 Navy lab). Props: cone (cutaway pigeon nose cone), glider (Pelican glide bomb).
"""
import sys, math, random
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from kit9 import *  # noqa
import kit9
import bmesh
from mathutils import Vector

OUT = kit9.ROOT / 'public/yw9-pigeon'
reset()


def lathe(name, prof, m, seg=48, a0=0.0, a1=2 * math.pi, axis_len=1, cap=False):
    """revolve profile [(x_along_axis, radius)] around the Three +x axis between angles a0..a1 (cutaways use a partial sweep)"""
    bm = bmesh.new(); full = abs(a1 - a0 - 2 * math.pi) < 1e-4; n = seg if full else seg + 1; rings = []
    for (x, r) in prof:
        row = []
        for i in range(n):
            a = a0 + (a1 - a0) * i / seg
            row.append(bm.verts.new(L(x, r * math.cos(a), r * math.sin(a))))
        rings.append(row)
    for j in range(len(rings) - 1):
        for i in range(seg):
            i2 = (i + 1) % n if full else i + 1
            bm.faces.new((rings[j][i], rings[j][i2], rings[j + 1][i2], rings[j + 1][i]))
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    for f in me.polygons: f.use_smooth = True
    o = kit9._obj(name, me); o.data.materials.append(m)
    sol = o.modifiers.new('sol', 'SOLIDIFY'); sol.thickness = .018; sol.offset = -1
    return o


OGIVE = [(0.0, 0.47), (0.25, 0.47), (0.6, 0.455), (0.95, 0.42), (1.3, 0.36), (1.6, 0.28), (1.85, 0.19), (2.02, 0.11), (2.1, 0.05), (2.13, 0.0)]


def nose_cone(prefix='', cut=True, at=(0, 0, 0)):
    """the pigeon-guided nose cone. Axis along +x (nose at x=2.13). Interior: three bays with screens, pigeons' jackets,
    gimbals, pneumatic pickups and valve block; separate shell (full) and shellcut (cutaway) for the x-ray shots."""
    ox, oy, oz = at
    P = lambda x, y, z: (ox + x, oy + y, oz + z)
    steel = mat('paint', '#7f8a57', .55); dark = mat('metal', '#4a4f55', .5, .5); brass = mat('brass', '#d2a64e', .3, .9)
    red = mat('paint', '#d8452f', .45); ins = mat('paint', '#c9cfd3', .5)
    sh = lathe(f'anim:{prefix}shell', [(ox + x, r) for x, r in OGIVE], steel)
    for o in [sh]: o.location = L(0, oy, oz)
    if cut:
        sc = lathe(f'anim:{prefix}cut', [(ox + x, r) for x, r in OGIVE], steel, seg=40, a0=math.radians(115), a1=math.radians(115 + 250))
        sc.location = L(0, oy, oz)
        # red cut edges (technical cutaway look)
        for a in (115, 365):
            ar = math.radians(a)
            pts = [(ox + x, oy + r * math.cos(ar) * .985, oz + r * math.sin(ar) * .985) for x, r in OGIVE]
            tube(f'anim:{prefix}cut.edge{a}', pts, .014, red)
    # panel rings + rivets on the full shell
    for x, r in [(0.02, .475), (0.6, .46), (1.3, .366), (1.85, .196)]:
        cyl(f'anim:{prefix}shell.ring{int(x * 100)}', P(x, 0, 0), r + .006, .03, dark, axis='x', verts=48)
    # nose lens ports (three, in a triangle) — the pigeons' windows on the target
    for k in range(3):
        a = math.pi / 2 + k * 2 * math.pi / 3; y, z = math.cos(a) * .12, math.sin(a) * .12
        cyl(f'{prefix}lensrim{k}', P(1.98, y, z), .07, .05, brass, axis='x', verts=24)
        cyl(f'{prefix}lens{k}', P(2.0, y, z), .055, .03, mat('glass', '#a7d8ef', .05), axis='x', verts=24)
    # interior: bulkheads, ribs, stringers
    for x in (0.05, 0.6, 1.3, 1.85):
        r = [rr for xx, rr in OGIVE if xx >= x][0] - .035
        tube(f'anim:{prefix}frame.ring{int(x * 100)}', [P(x, r * math.cos(a * math.pi / 20), r * math.sin(a * math.pi / 20)) for a in range(41)], .02, mat('paint', '#e3b23c', .45))
    cyl(f'anim:{prefix}frame.rear', P(0.03, 0, 0), .44, .02, ins, axis='x', verts=40)
    for k in range(10):
        a = k * 2 * math.pi / 10
        tube(f'anim:{prefix}frame.str{k}', [P(x, (r - .03) * math.cos(a), (r - .03) * math.sin(a)) for x, r in OGIVE[:8]], .008, dark)
    # three bays: pigeon jacket (cloth sleeve), screen on a gimbal, pickup pads, tubes to the valve block
    for k in range(3):
        a = math.pi / 2 + k * 2 * math.pi / 3; y, z = math.cos(a) * .2, math.sin(a) * .2
        cyl(f'anim:{prefix}jacket{k}', P(.55, y, z), .07, .28, mat('fabric', '#c9b48a', .95), axis='x', verts=16)
        tube(f'{prefix}gimbal{k}', [P(.93, y + .135 * math.cos(b * math.pi / 12), z + .135 * math.sin(b * math.pi / 12)) for b in range(25)], .012, brass)
        box(f'anim:{prefix}screen{k}', P(.9, y, z), (.012, .19, .19), mat('screen', '#d7f0ff', .3), bev=.004)
        for j in range(4):
            b = j * math.pi / 2; box(f'{prefix}pad{k}{j}', P(.935, y + math.cos(b) * .1, z + math.sin(b) * .1), (.02, .03, .03), mat('rubber', '#2a2a2a', .9), bev=.004)
        tube(f'{prefix}hose{k}', [P(.9, y, z), P(.6, y * .4, z * .4 - .02), P(.25, 0, 0)], .012, mat('rubber', '#3a2f2a', .8))
        box(f'{prefix}bay{k}', P(.5, y * 1.12, z * 1.12), (.6, .02, .2), ins, bev=.004, rot=(a, 0, 0))
    box(f'{prefix}valve', P(.22, 0, 0), (.2, .22, .22), brass, bev=.02)
    for j in range(6): cyl(f'{prefix}valvebolt{j}', P(.33, math.cos(j) * .08, math.sin(j) * .08), .012, .02, dark, axis='x', verts=8)
    # top hatch (opens for the pigeon) — hinged at x=.3
    box(f'anim:{prefix}hatch', P(.6, .47, 0), (.42, .02, .32), steel, bev=.006)
    box(f'{prefix}hatchrim', P(.6, .455, 0), (.46, .015, .36), dark, bev=.004)


def glider():
    """Pelican-style glide bomb carrying the cone: fuselage, wing, tail fins (animated), all in its own frame (nose +x)"""
    steel = mat('paint', '#7f8a57', .55); dark = mat('metal', '#4a4f55', .5, .5); yel = mat('paint', '#e3b23c', .5)
    lathe('anim:g_nose', [(2.2 + x, r) for x, r in OGIVE], steel)
    lathe('g_body', [(-1.6, .3), (-1.0, .44), (0, .47), (1.2, .47), (2.2, .47)], steel)
    cyl('g_band', (2.0, 0, 0), .478, .08, yel, axis='x', verts=48); cyl('g_band2', (-.6, 0, 0), .45, .06, yel, axis='x', verts=48)
    box('g_wing', (.6, 0, 0), (1.1, .06, 4.4), steel, bev=.02, taper=0)
    for s in (1, -1): box(f'g_wingtip{s}', (.5, 0, s * 2.25), (.7, .05, .2), dark, bev=.02)
    for k in range(2):
        box(f'anim:g_fin{k}', (-1.35, .0, 0), (.7, .04, 1.1), steel, bev=.012, rot=(0, 0, 0) if k == 0 else (math.pi / 2, 0, 0))
    for j in range(24):
        a = j / 24 * 2 * math.pi; sphere(f'g_rivet{j}', (1.2, .475 * math.cos(a), .475 * math.sin(a)), .012, dark, segs=6, rings=4)


# ================================================================ SETS
def lab():
    """General Mills flour-mill workshop, Minneapolis 1943: brick walls, timber posts/beams, plank floor, tall windows
    with low sun from the left, workbenches, pegboard tools, stacked pigeon cages, flour sacks, chalkboard, pendant lamps."""
    W, D, H = 12.0, 9.0, 4.4; x0, x1, z0, z1 = -W / 2, W / 2, -D / 2, D / 2
    plank_floor(x0, x1, z0, z1, base='#9a6a3c', dark='#6e4526', name='labfloor')
    wins = [window(f'lw{i}', (x0, z1), (x0, z0), u, .95, 1.5, 2.5, bars=(3, 4), frame='#e9e0c8') for i, u in enumerate((1.8, 4.5, 7.2))]
    brick_wall('lab.left', (x0, z1), (x0, z0), H, base='#9c4f38', openings=wins)
    dr = door('labdoor', (x0, z0), (x1, z0), 9.6, col='#4b5d3f')
    bw = [window('bw0', (x0, z0), (x1, z0), 2.4, 1.6, 1.3, 1.6, bars=(2, 3))]
    brick_wall('lab.back', (x0, z0), (x1, z0), H, base='#9c4f38', openings=[dr] + bw)
    brick_wall('lab.right', (x1, z0), (x1, z1), H, base='#94492f')
    # white-washed lower band + skirting
    for (a, b) in [((x0 + .15, z0 + .15), (x1 - .15, z0 + .15)), ((x1 - .15, z0 + .15), (x1 - .15, z1))]:
        ang = math.atan2(b[1] - a[1], b[0] - a[0]); ln = math.hypot(b[0] - a[0], b[1] - a[1]); cx, cz = (a[0] + b[0]) / 2, (a[1] + b[1]) / 2
        box('lab.skirt', (cx, .09, cz), (ln, .18, .04), mat('plank', '#5a3b22', .6), bev=.006, rot=(0, -ang, 0))
    # timber posts and beams
    tm = mat('bark', '#6b4a30', .8)
    for x in (-3.0, 3.0):
        box('post', (x, H / 2, -1.2), (.26, H, .26), tm, bev=.02)
        box('postcap', (x, H - .35, -1.2), (.5, .14, .5), tm, bev=.02)
    for z in (-3.0, -1.2, .8, 2.8): box('beam', (0, H - .2, z), (W, .3, .24), tm, bev=.025)
    box('beamlong', (-3, H - .48, 0), (.22, .22, D), tm, bev=.02); box('beamlong', (3, H - .48, 0), (.22, .22, D), tm, bev=.02)
    box('lab.ceiling', (0, H + .06, 0), (W, .12, D), mat('plank', '#8a6644', .7), bev=0)
    for x in range(-5, 6): box('lab.joist', (x, H - .06, 0), (.12, .14, D), tm, bev=.01)
    # pendant lamps
    for i, (x, z) in enumerate([(-1.6, -.4), (1.6, -.4), (0, 2.2)]):
        cyl(f'pend{i}.cord', (x, H - .9, z), .006, 1.1, mat('rubber', '#222', .8), verts=6)
        cyl(f'pend{i}.shade', (x, H - 1.5, z), .26, .22, mat('paint', '#2f4a3c', .45), verts=28, r2=.07)
        sphere(f'pend{i}.bulb', (x, H - 1.6, z), .07, mat('emit', '#ffd59a', .2, emit=6))
    # central workbench with the nose-cone cradle (cone prop sits at (0, 1.02, -.3))
    table('bench', 0, -.3, 3.0, 1.2, h=.92, top='#8a5f38', legs='#5e3e24')
    for x in (-.55, .75):
        box('cradle', (x, 1.0, -.3), (.12, .16, .9), mat('plank', '#6e4a2c', .6), bev=.015)
        cyl('cradlepad', (x, 1.06, -.3), .05, .8, mat('rubber', '#2d2420', .9), axis='z', verts=12)
    # tools and parts on the bench
    rr = random.Random(4)
    for k in range(9):
        x = rr.uniform(-1.3, 1.3); z = rr.choice([.15, .2])
        kind = rr.random()
        if kind < .35: box(f'wrench{k}', (x, .935, z), (.22, .012, .04), mat('metal', '#8b9298', .35, .9), bev=.004, rot=(0, rr.uniform(-1, 1), 0))
        elif kind < .6: cyl(f'coil{k}', (x, .96, z), .04, .06, mat('brass', '#b98a3e', .3, .9), verts=16)
        elif kind < .8: box(f'parts{k}', (x, .96, z), (.16, .06, .1), mat('plank', '#a88a5a', .7), bev=.006)
        else: cyl(f'can{k}', (x, .98, z), .035, .1, mat('metal', '#6d7f8a', .4, .7), verts=14)
    desk_lamp('benchlamp', 1.25, .92, -.75, shade='#2f5f4a', lit=4)
    # right wall: long workbench, pegboard with tools, stacked pigeon cages
    table('sidebench', x1 - .5, -1.4, .9, 3.6, h=.9, top='#8a5f38')
    box('pegboard', (x1 - .17, 1.75, -1.4), (.03, 1.2, 3.2), mat('plank', '#c4a77a', .8), bev=.005)
    for k in range(14):
        z = -2.9 + k * .22; y = 1.5 + (k % 3) * .3
        box(f'peg{k}', (x1 - .2, y, z), (.03, .26 + (k % 2) * .12, .05), mat('metal', '#7e868c', .35, .85), bev=.004)
    for j in range(3):
        for i in range(3):
            cage(f'cage{j}{i}', (x1 - .55, j * .52, 1.0 + i * .62), w=.56, h=.44, d=.5)
    # flour sacks and barrels (it's a flour mill)
    for k in range(7):
        x = x0 + .8 + (k % 4) * .55; z = z0 + .7 + (k // 4) * .4; y = (k // 4) * .3
        blob(f'sack{k}', (x, y + .26, z), .3, mat('fabric', '#e7dcc2', .95), sc=(1, .85, .7), sub=2, rough=.12, seed=k)
    for k, (x, z) in enumerate([(x0 + 3.1, z0 + .6), (x0 + 3.75, z0 + .7)]):
        cyl(f'barrel{k}', (x, .45, z), .3, .9, mat('plank', '#8a5a32', .7), verts=24)
        for yy in (.12, .45, .78): cyl(f'hoop{k}{yy}', (x, yy, z), .305, .04, mat('metal', '#3e3e3e', .5, .7), verts=24)
    crate('crate1', (x0 + 4.6, 0, z0 + .6), .6, rot=.2); crate('crate2', (x0 + 4.65, .6, z0 + .62), .5, rot=-.1)
    # chalkboard with diagrams (drawn by the engine on the 'board' surface)
    box('boardframe', (3.0, 2.0, z0 + .17), (2.6, 1.5, .05), mat('plank', '#6b4a2e', .6), bev=.01)
    text_plane('board', (3.0, 2.0, z0 + .2), 2.4, 1.3, mat('board', '#2e3d34', .9))
    box('chalktray', (3.0, 1.22, z0 + .24), (2.4, .04, .08), mat('plank', '#6b4a2e', .6), bev=.006)
    bookshelf('shelf', -1.2, z0 + .32, w=1.4, h=2.1, seed=3)
    # radiators under the windows, stool, filing cabinet
    for u in (1.8, 4.5, 7.2):
        z = z1 - u
        for k in range(10): box(f'rad{u}{k}', (x0 + .3, .45, z - .45 + k * .1), (.12, .6, .06), mat('paint', '#c9c2b2', .5), bev=.012)
    cyl('stool.seat', (-1.6, .72, .9), .2, .05, mat('plank', '#7a5233', .6), verts=24)
    for k in range(3): a = k * 2.09; box(f'stool.leg{k}', (-1.6 + math.cos(a) * .14, .35, .9 + math.sin(a) * .14), (.04, .7, .04), mat('plank', '#6a4429', .6), bev=.006)
    box('cabinet', (-4.6, .7, z0 + .4), (.6, 1.4, .6), mat('paint', '#5f6f64', .5), bev=.015)
    for k in range(3): box(f'cabinet.dr{k}', (-4.6, .3 + k * .42, z0 + .71), (.5, .34, .02), mat('paint', '#6f8074', .45), bev=.008)
    # dusty light: grain on the floor
    for k in range(40):
        sphere(f'grain{k}', (x0 + 1.2 + rr.random() * 2.5, .005, z0 + .5 + rr.random() * 1.5), .012, mat('paint', '#e6d6aa', .9), segs=5, rings=3)


def war():
    """1943 Washington committee room: walnut wainscot panels, teal plaster, crown moulding, map board, windows with
    venetian blinds, long felt-topped table, leather chairs, green banker's lamps, papers, cups, clock, cabinets."""
    W, D, H = 11.0, 8.0, 3.8; x0, x1, z0, z1 = -W / 2, W / 2, -D / 2, D / 2
    plank_floor(x0, x1, z0, z1, base='#6e3f22', dark='#4f2c17', w=.12, name='warfloor', along='z')
    wins = [window(f'ww{i}', (x0, z0), (x1, z0), u, 1.0, 1.4, 2.0, bars=(2, 2), frame='#efe7d6') for i, u in enumerate((1.6, 9.4))]
    for side, (a, b, ops) in enumerate([((x0, z0), (x1, z0), wins), ((x0, z1), (x0, z0), []), ((x1, z0), (x1, z1), [door('wardoor', (x1, z0), (x1, z1), 6.2, col='#4a2a18', frame='#d9c9a6')])]):
        brick_wall(f'war.w{side}', a, b, H, base='#2f6b6b', openings=ops, surf='plaster')
        ang = math.atan2(b[1] - a[1], b[0] - a[0]); ln = math.hypot(b[0] - a[0], b[1] - a[1])
        for k in range(int(ln / .9)):
            u = (k + .5) * ln / int(ln / .9)
            if any(o[0] - .2 < u < o[1] + .2 and o[2] < 1.2 for o in ops): continue
            px, pz = wall_point(a, b, u, .16); box(f'war.panel{side}{k}', (px, .58, pz), (ln / int(ln / .9) - .04, 1.04, .03), mat('plank', '#5a3018', .5), bev=.01, rot=(0, -ang, 0))
            px, pz = wall_point(a, b, u, .18); box(f'war.panelin{side}{k}', (px, .58, pz), (ln / int(ln / .9) - .26, .8, .02), mat('plank', '#6b3a1e', .45), bev=.012, rot=(0, -ang, 0))
        cx, cz = wall_point(a, b, ln / 2, .2); box(f'war.dado{side}', (cx, 1.13, cz), (ln, .07, .06), mat('plank', '#4a2814', .5), bev=.012, rot=(0, -ang, 0))
        cx, cz = wall_point(a, b, ln / 2, .2); box(f'war.crown{side}', (cx, H - .08, cz), (ln, .16, .1), mat('paint', '#e9dfc8', .5), bev=.03, rot=(0, -ang, 0))
        cx, cz = wall_point(a, b, ln / 2, .17); box(f'war.skirt{side}', (cx, .07, cz), (ln, .14, .04), mat('plank', '#3e2210', .5), bev=.008, rot=(0, -ang, 0))
    # venetian blinds inside the windows
    for i, u in enumerate((1.6, 9.4)):
        for k in range(16): box(f'blind{i}{k}', (x0 + u, 1.1 + k * .12, z0 + .25), (1.36, .012, .06), mat('paint', '#e8dfc9', .5), bev=0, rot=(.5, 0, 0))
    # map board (engine draws the map on the 'map' surface)
    box('mapframe', (0, 2.1, z0 + .17), (3.6, 1.95, .06), mat('plank', '#4a2814', .5), bev=.015)
    text_plane('map', (0, 2.1, z0 + .21), 3.4, 1.75, mat('map', '#e9dfc4', .9))
    # long table, felt top, chairs, lamps, papers, cups
    table('wtable', 0, .4, 4.4, 1.4, h=.78, top='#4a2814')
    box('felt', (0, .785, .4), (4.1, .012, 1.15), mat('fabric', '#2f5b3f', .95), bev=0)
    for k in range(4):
        x = -1.65 + k * 1.1
        chair(f'chairN{k}', x, -.55, face=0, col='#3e2414', seat='#6b2a22'); chair(f'chairS{k}', x, 1.35, face=math.pi, col='#3e2414', seat='#6b2a22')
    for k, x in enumerate((-1.95, -.55, .55, 1.95)): desk_lamp(f'wlamp{k}', x, .79, -.05, shade='#2c6a48', lit=5)
    rr = random.Random(8)
    for k in range(10):
        box(f'paper{k}', (rr.uniform(-1.9, 1.9), .795, rr.uniform(-.1, .9)), (.21, .003, .3), mat('paper', '#f3ecda', .9), bev=0, rot=(0, rr.uniform(-.5, .5), 0))
    for k in range(5):
        x, z = rr.uniform(-1.8, 1.8), rr.choice([0.0, .8])
        cyl(f'cup{k}', (x, .83, z), .04, .08, mat('paint', '#f2efe8', .3), verts=16); cyl(f'saucer{k}', (x, .792, z), .07, .008, mat('paint', '#f2efe8', .3), verts=20)
    cyl('jug', (.6, .9, .45), .07, .24, mat('glass', '#bfe0ea', .05), verts=20)
    # Skinner's box of pigeons (carried in, set on the table) and the $25,000 contract slid across the felt
    crate('anim:pbox', (2.9, 0, 2.6), .5, col='#b08a58')
    for k in range(6): box(f'anim:pbox.hole{k}', (2.9 - .15 + (k % 3) * .15, .32 + (k // 3) * .12, 2.6 + .255), (.06, .06, .01), mat('paint', '#1a1410', .9), bev=0)
    box('anim:cheque', (-1.3, .797, .1), (.26, .004, .12), mat('paper', '#e3edd6', .9), bev=0)
    box('runner', (0, .005, .4), (5.6, .01, 2.6), mat('fabric', '#7a2a24', .95), bev=0)
    box('runnerb', (0, .006, .4), (5.4, .01, 2.4), mat('fabric', '#8f3a2c', .95), bev=0)
    box('war.ceiling', (0, H + .06, 0), (W, .12, D), mat('plaster', '#efe6d0', .9), bev=0)
    for x in (-3.0, 0.0, 3.0): box('war.coffer', (x, H - .05, 0), (.2, .1, D), mat('paint', '#e6dcc4', .5), bev=.02)
    # cabinets, clock, ceiling lights, side table with globe
    for k in range(2): box(f'wcab{k}', (x1 - .5, .65, -2.6 + k * .75), (.6, 1.3, .7), mat('paint', '#5a5f58', .5), bev=.015)
    cyl('clock', (x0 + .17, 2.6, 1.2), .28, .05, mat('paint', '#f4ecd8', .5), axis='x', verts=36); cyl('clockrim', (x0 + .16, 2.6, 1.2), .31, .04, mat('brass', '#b8903e', .3, .9), axis='x', verts=36)
    for k, x in enumerate((-2.5, 2.5)):
        cyl(f'ceil{k}', (x, H - .15, .4), .3, .12, mat('glass', '#f6ead2', .3), verts=28); sphere(f'ceilglow{k}', (x, H - .2, .4), .12, mat('emit', '#ffe2b0', .2, emit=4))
    table('sidetbl', x0 + .6, -2.6, .7, .7, h=.75, top='#4a2814')
    cyl('globestand', (x0 + .6, .9, -2.6), .02, .3, mat('brass', '#b8903e', .3, .9), verts=8)
    sphere('globe', (x0 + .6, 1.18, -2.6), .2, mat('map', '#7fb0c8', .5))


def ground_colours(paths, craters=(), sand=None, base=None):
    """vertex colours for stylised terrain: several greens by noise, lighter meadow patches, darker hollows,
    soil + worn edges along dirt tracks, crater soil, optional sand/rock by height and slope"""
    G = [rgb('#4f8f3a'), rgb('#6aa94a'), rgb('#86bf55'), rgb('#3f7a35')]
    def near_path(x, z):
        d = 1e9; w = 2.0
        for pts, wid in paths:
            for (ax, az), (bx, bz) in zip(pts[:-1], pts[1:]):
                dx, dz = bx - ax, bz - az; t = max(0, min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz + 1e-9)))
                dd = math.hypot(x - ax - dx * t, z - az - dz * t) / wid
                if dd < d: d, w = dd, wid
        return d
    def f(x, z, y, slope):
        n1 = fbm(x, z, .045, 3, 1); n2 = fbm(x, z, .2, 2, 5)
        k = max(0, min(1, .5 + n1 * .9)); c = [G[0][i] * (1 - k) + G[2][i] * k for i in range(3)]
        if n2 > .25: c = [c[i] * .6 + G[1][i] * .4 for i in range(3)]
        if n2 < -.3: c = [c[i] * .7 + G[3][i] * .3 for i in range(3)]
        d = near_path(x, z)
        if d < 1.6:
            soil = rgb('#9a7650') if fbm(x, z, .8, 1, 9) > -.1 else rgb('#86643f'); m = max(0, min(1, (1.6 - d) / .7))
            if d < .5: soil = [soil[i] * (.9 + .1 * fbm(x, z, 2.5, 1, 3)) for i in range(3)]
            c = [c[i] * (1 - m) + soil[i] * m for i in range(3)]
        for (cx, cz, cr) in craters:
            dd = math.hypot(x - cx, z - cz) / cr
            if dd < 1.4:
                m = max(0, min(1, (1.4 - dd) / .5)); s_ = rgb('#6b5038') if dd < .8 else rgb('#8a6a48')
                c = [c[i] * (1 - m) + s_[i] * m for i in range(3)]
        if sand is not None:
            if y < sand + .9: m = max(0, min(1, (sand + .9 - y) / .6)); s_ = rgb('#e6d3a0'); c = [c[i] * (1 - m) + s_[i] * m for i in range(3)]
            if slope > .45: m = max(0, min(1, (slope - .45) / .2)); r_ = rgb('#8a7f72') if fbm(x, z, .3, 2, 4) > 0 else rgb('#a29483'); c = [c[i] * (1 - m) + r_[i] * m for i in range(3)]
        return tuple(c)
    return f, near_path


def scatter(n, x0, x1, z0, z1, h, f_col, near_path, seed, avoid=(), weight=None, path_clear=1.2):
    rr = random.Random(seed); grass = []; flowers = []
    pal = ['#f6f1e2', '#f2d24a', '#e5713f', '#c95a8f', '#8a6ad1', '#f4a6c0']
    tries = 0
    while len(grass) < n and tries < n * 6:
        tries += 1; x = rr.uniform(x0, x1); z = rr.uniform(z0, z1)
        if weight and rr.random() > weight(x, z): continue
        if near_path(x, z) < path_clear or any(math.hypot(x - a, z - b) < r for a, b, r in avoid): continue
        y = h(x, z); c = f_col(x, z, y, 0)
        grass.append([round(x, 2), round(y, 3), round(z, 2), round(c[0], 3), round(c[1], 3), round(c[2], 3), round(.7 + rr.random() * .6, 2)])
        if fbm(x, z, .09, 2, 13) > .38 and rr.random() < .45:
            col = pal[int((fbm(x, z, .05, 1, 21) + 1) * 3) % len(pal)]; flowers.append([round(x + rr.uniform(-.2, .2), 2), round(y, 3), round(z + rr.uniform(-.2, .2), 2), col])
    return grass, flowers


def range_set():
    """outdoor bombing range: rolling meadow with tree lines and far hills, a farm track, fence, barn + farmhouse,
    observation tower, a chalk target cross and soil craters where the bombs missed"""
    paths = [([(-80, 26), (-40, 18), (-15, 9), (0, 6), (20, 2), (36, -14), (40, -40)], 2.2), ([(0, 6), (-4, 40), (-10, 80)], 1.6)]
    craters = [(-9, -4, 2.2), (11, -9, 2.6), (6, 12, 2.0), (-14, 8, 2.4), (17, 5, 1.8)]
    def h(x, z):
        d = math.hypot(x, z); far = max(0, d - 45) / 35
        y = fbm(x, z, .03, 3, 2) * 1.4 + far * far * 9 + max(0, fbm(x, z, .015, 2, 7)) * far * 10
        for (cx, cz, cr) in craters:
            dd = math.hypot(x - cx, z - cz) / cr
            if dd < 1.25: y += -.55 * (1 - dd * dd) if dd < 1 else .18 * (1 - (dd - 1) / .25)
        return y
    fcol, near = ground_colours(paths, craters)
    terrain('range.ground', -95, 95, -95, 95, 190, h, fcol, flat=[(36, -40, 9, h(36, -40)), (-26, -24, 7, h(-26, -24))])
    # chalk target cross + ring
    for a in (math.pi / 4, -math.pi / 4): box('target', (0, h(0, 0) + .03, 0), (16, .02, 1.1), mat('paint', '#f3efe4', .9), bev=0, rot=(0, a, 0))
    for k in range(40):
        a = k / 40 * 2 * math.pi; box('ring', (math.cos(a) * 9, h(math.cos(a) * 9, math.sin(a) * 9) + .03, math.sin(a) * 9), (1.45, .02, .5), mat('paint', '#f3efe4', .9), bev=0, rot=(0, -a + math.pi / 2, 0))
    # barn (red board walls), farmhouse, observation tower, fence along the track
    house('barn', 36, -40, 9, 7, floors=1, fh=4.4, plaster='#a8392c', roof='#5a5a5e', trim='#f1e9d6', door_col='#7a2a22', seed=3, chimney=False)
    house('farm', -26, -24, 7, 6, floors=2, fh=2.8, plaster='#efe5cf', roof='#7d3b2c', trim='#ffffff', door_col='#2f5d4f', shutters='#3f6f58', seed=4)
    ty = h(-18, 18); tm = mat('plank', '#8a6a46', .75)
    for dx in (-1.2, 1.2):
        for dz in (-1.2, 1.2): box('tower.leg', (-18 + dx, ty + 3, 18 + dz), (.2, 6, .2), tm, bev=.01)
    box('tower.deck', (-18, ty + 6, 18), (3.2, .2, 3.2), tm, bev=.02)
    for dz in (-1.5, 1.5): box('tower.rail', (-18, ty + 6.55, 18 + dz), (3.2, .08, .08), tm, bev=.01)
    box('tower.roof', (-18, ty + 8.4, 18), (3.6, .12, 3.6), mat('roof', '#5d4a3a', .8), bev=.02, taper=.35)
    for dx in (-1.5, 1.5):
        for dz in (-1.5, 1.5): box('tower.pole', (-18 + dx, ty + 7.3, 18 + dz), (.1, 2.2, .1), tm, bev=.01)
    fence('fence', [(-78, 29), (-40, 21.5), (-16, 12.6), (-2, 9.6)], h=1.1)
    # trees: tree lines along the far edges and clumps near the farm
    rr = random.Random(11); k = 0
    for (cx, cz, n, spread) in [(-45, -50, 9, 18), (50, 20, 8, 16), (-60, 40, 7, 14), (10, -62, 8, 20), (-30, -30, 4, 6), (60, -55, 6, 12), (-8, 55, 6, 16)]:
        for i in range(n):
            x = cx + rr.uniform(-spread, spread); z = cz + rr.uniform(-spread * .5, spread * .5)
            if near(x, z) < 2: continue
            tree(f'tree{k}', x, z, h(x, z) - .1, h=rr.uniform(5, 8.5), r=rr.uniform(2, 3.2), seed=k + 1, leaf=rr.choice(['#3f7a33', '#4b8a3a', '#56933e']), leaf2=rr.choice(['#8cc25a', '#9fcf62']), kind='cone' if rr.random() < .25 else 'round'); k += 1
    for i in range(22):
        x, z = rr.uniform(-60, 60), rr.uniform(-60, 60)
        if near(x, z) < 2 or math.hypot(x, z) < 14: continue
        bush(f'bush{i}', x, z, h(x, z), r=rr.uniform(.5, 1.1), seed=i + 40, flowers=rr.choice([None, '#f2d24a', '#f6f1e2']))
    for i in range(30):
        x, z = rr.uniform(-55, 55), rr.uniform(-55, 55)
        if near(x, z) < 1.5 or math.hypot(x, z) < 10: continue
        for j in range(rr.randint(1, 3)): rock(f'rock{i}{j}', (x + rr.uniform(-.8, .8), h(x, z) + .05, z + rr.uniform(-.8, .8)), rr.uniform(.2, .6), mat('stone', rr.choice(['#8f8a80', '#a39d90', '#7d786f']), .85), seed=i * 3 + j)
    g, fl = scatter(26000, -40, 40, -40, 40, h, fcol, near, 5, avoid=[(36, -40, 7), (-26, -24, 5), (-18, 18, 2.5)] + [(a, b, r * .85) for a, b, r in craters],
                    weight=lambda x, z: max(.12, 1 - math.hypot(x, z) / 45))
    scatter_json(OUT / 'range-grass.json', {'grass': g, 'flowers': fl})


def ship(x, z, y=0.0, rot=0.0, name='ship'):
    """1940s cargo freighter (target): shaped hull with sheer and flared bow, red boot-top, deck, hatches, white bridge
    with windows, funnel with band, masts, booms, rails, lifeboats"""
    Lh, B, Dh = 58.0, 9.0, 5.0
    bm = bmesh.new(); prof = []
    n = 22
    for i in range(n + 1):
        u = i / n; xx = -Lh / 2 + Lh * u; wid = B / 2 * (1 - max(0, (u - .78) / .22) ** 1.6 * .97) * (1 - max(0, (.08 - u) / .08) ** 2 * .35)
        sheer = Dh + (u - .5) ** 2 * 2.2
        prof.append((xx, wid, sheer))
    rows = []
    for (xx, wid, sh) in prof:
        ring = [bm.verts.new(L(xx, -1.5, -wid * .82)), bm.verts.new(L(xx, -.2, -wid)), bm.verts.new(L(xx, sh, -wid * 1.02)), bm.verts.new(L(xx, sh, wid * 1.02)), bm.verts.new(L(xx, -.2, wid)), bm.verts.new(L(xx, -1.5, wid * .82))]
        rows.append(ring)
    for a_, b_ in zip(rows[:-1], rows[1:]):
        for i in range(5): bm.faces.new((a_[i], a_[i + 1], b_[i + 1], b_[i]))
    me = bpy.data.meshes.new(f'{name}.hull'); bm.to_mesh(me); bm.free()
    hull = kit9._obj(f'{name}.hull', me); hull.data.materials.append(mat('paint', '#3b4048', .55))
    for f_ in me.polygons: f_.use_smooth = True
    box(f'{name}.boot', (0, .25, 0), (Lh * .96, .9, B * 1.01), mat('paint', '#a8322a', .6), bev=.1)
    box(f'{name}.deck', (0, Dh - .1, 0), (Lh * .95, .2, B * .98), mat('plank', '#a68a62', .7), bev=.02)
    wh = mat('paint', '#ecebe4', .5)
    for k, (xx, w_, d_, hh) in enumerate([(-14, 12, 8, 3), (-14.5, 9, 7, 2.6), (-15, 6, 6, 2.2)]):
        yb = Dh + sum([3, 2.6, 2.2][:k]); box(f'{name}.house{k}', (xx, yb + hh / 2, 0), (w_, hh, d_), wh, bev=.06)
        for j in range(int(w_ / 1.2)):
            box(f'{name}.port{k}{j}', (xx - w_ / 2 + .6 + j * 1.2, yb + hh * .6, d_ / 2 + .01), (.7, .7, .02), mat('glass', '#2a3e4a', .1), bev=0)
            box(f'{name}.port{k}{j}b', (xx - w_ / 2 + .6 + j * 1.2, yb + hh * .6, -d_ / 2 - .01), (.7, .7, .02), mat('glass', '#2a3e4a', .1), bev=0)
    cyl(f'{name}.funnel', (-15, Dh + 9.5, 0), 1.4, 4.4, mat('paint', '#d4a033', .5), verts=28, r2=1.3)
    cyl(f'{name}.funtop', (-15, Dh + 11.9, 0), 1.32, .9, mat('paint', '#202224', .6), verts=28)
    for k, xx in enumerate((8, 20)):
        cyl(f'{name}.mast{k}', (xx, Dh + 6, 0), .2, 12, mat('paint', '#d9d6cc', .5), verts=12)
        box(f'{name}.hatch{k}', (xx - 4, Dh + .5, 0), (6, 1.0, 5), mat('paint', '#5e6a58', .6), bev=.06)
        for s in (-1, 1): tube(f'{name}.boom{k}{s}', [(xx, Dh + 2, 0), (xx - 6, Dh + 6.5, s * 1.5)], .12, mat('paint', '#d9d6cc', .5))
    for s in (-1, 1):
        tube(f'{name}.rail{s}', [(-Lh * .45, Dh + 1, s * B * .48), (Lh * .4, Dh + 1, s * B * .48)], .04, wh)
        for k in range(2):
            blob(f'{name}.boat{s}{k}', (-12 - k * 4, Dh + 3.6, s * 4.4), 1.0, mat('paint', '#f0efe8', .5), sc=(1.9, .45, .6), sub=2, rough=.02)
    objs = [o for o in kit9.COLL.objects if o.name.startswith(name)]
    for o in objs:
        o.location = (o.location.x + x, o.location.y - z, o.location.z + y)


def coast():
    """the target run: green cliff-top meadow with a lighthouse, rock faces, a sandy cove and the freighter at sea.
    Sea itself is an engine shader at y=0; terrain dives below it offshore."""
    def h(x, z):
        land = 1 / (1 + math.exp((x + 18 + fbm(z, x, .03, 2, 3) * 12) / 5.0))
        cliff = 16 * land + fbm(x, z, .04, 3, 6) * 2.4 * land
        return cliff - 4 * (1 - land) + fbm(x, z, .08, 2, 8) * .6
    fcol, near = ground_colours([([(-120, -40), (-60, -10), (-40, 20), (-38, 60)], 1.8)], sand=0.0)
    terrain('coast.ground', -150, 60, -150, 120, 170, h, fcol)
    ly = h(-34, -8); ww = mat('paint', '#f4f1e8', .5); rd = mat('paint', '#c43d33', .5)
    for k in range(6): cyl(f'lh.ring{k}', (-34, ly + k * 2.2 + 1.1, -8), 2.0 - k * .14, 2.2, rd if k % 2 else ww, verts=36, r2=1.86 - k * .14)
    cyl('lh.gallery', (-34, ly + 13.4, -8), 1.6, .25, mat('metal', '#2e3133', .5, .6), verts=36)
    cyl('lh.lamp', (-34, ly + 14.4, -8), 1.0, 1.8, mat('emit', '#fff1c4', .1, emit=3), verts=24)
    cyl('lh.cap', (-34, ly + 15.8, -8), 1.2, 1.2, rd, verts=24, r2=.2)
    house('lhkeeper', -38, -2, 6, 5, floors=1, fh=3, plaster='#f2eee2', roof='#4a5258', trim='#ffffff', door_col='#2f4f6f', seed=7)
    rr = random.Random(21)
    for i in range(60):
        x, z = rr.uniform(-140, -22), rr.uniform(-140, 110)
        if near(x, z) < 2 or math.hypot(x + 34, z + 8) < 8: continue
        if rr.random() < .35: tree(f'ctree{i}', x, z, h(x, z) - .1, h=rr.uniform(4, 7), r=rr.uniform(1.6, 2.6), seed=i + 70, kind='cone' if rr.random() < .5 else 'round', leaf='#3e7032', leaf2='#86b955')
        else: bush(f'cbush{i}', x, z, h(x, z), r=rr.uniform(.5, 1.1), seed=i + 90, flowers=rr.choice([None, '#f2d24a', '#f6f1e2', '#c95a8f']))
    for i in range(45):
        x, z = rr.uniform(-24, -8), rr.uniform(-140, 110)
        rock(f'crock{i}', (x, h(x, z) + .3, z), rr.uniform(.6, 2.2), mat('stone', rr.choice(['#8a8073', '#9c917f', '#756b60']), .9), seed=i + 300, flat=.8)
    ship(42, -70, 0, name='freighter')
    g, fl = scatter(14000, -60, -22, -60, 40, h, fcol, near, 9, avoid=[(-34, -8, 3), (-38, -2, 4)])
    scatter_json(OUT / 'coast-grass.json', {'grass': g, 'flowers': fl})


def street():
    """1940s small-town crossroads for the 'three friends' analogy: cobbled roads (engine cobble shader), granite kerbs,
    flagstone pavements, eight distinct shops and houses, signpost, lamp posts, bench, mailbox, verges with trees."""
    rw, pw = 7.0, 4.6
    for ax in ('x', 'z'):
        if ax == 'x': box('road.x', (0, -.04, 0), (90, .08, rw), mat('cobble', '#7a746c', .9), bev=0)
        else: box('road.z', (0, -.035, 0), (rw, .08, 90), mat('cobble', '#7a746c', .9), bev=0)
    km = mat('stone', '#a7a199', .8)
    for sx in (-1, 1):
        for sz in (-1, 1):
            # pavement blocks per quadrant + kerbs
            xa, xb = sorted((sx * rw / 2, sx * (rw / 2 + pw))); za, zb = sorted((sz * rw / 2, sz * 45))
            if sx > 0 and sz > 0: stone_floor(xa, xb, za, min(zb, 16), y=.15, base='#a29d93', s=.6, name=f'pave{sx}{sz}')
            box(f'pavebase{sx}{sz}', ((xa + xb) / 2, .06, (za + zb) / 2), (xb - xa, .12, zb - za), mat('pave', '#a29d93', .85), bev=0)
            xa2, xb2 = sorted((sx * rw / 2, sx * 45)); za2, zb2 = sorted((sz * rw / 2, sz * (rw / 2 + pw)))
            if sx > 0 and sz > 0: stone_floor(xa2, min(xb2, 16), za2, zb2, y=.15, base='#a29d93', s=.6, name=f'pavb{sx}{sz}')
            box(f'pavbbase{sx}{sz}', ((xa2 + xb2) / 2, .06, (za2 + zb2) / 2), (xb2 - xa2, .12, zb2 - za2), mat('pave', '#a29d93', .85), bev=0)
            box(f'kerbz{sx}{sz}', (sx * rw / 2, .07, sz * (rw / 2 + 21)), (.22, .16, 42), km, bev=.02)
            box(f'kerbx{sx}{sz}', (sx * (rw / 2 + 21), .07, sz * rw / 2), (42, .16, .22), km, bev=.02)
    specs = [  # (x, z, w, d, floors, colour, plaster, roof, shopfront, sign colour, timber, facing)
        (-13, -11.5, 9, 7, 2, '#a4553b', None, '#6f3a2c', '#2f5d4f', '#b8423a', False, 1),
        (-24, -11.5, 8, 7, 3, '#8f4632', None, '#4f4a4e', None, None, False, 1),
        (13, -11.5, 9, 7, 2, '#b96b48', '#e9d9b8', '#7a3d2e', '#7a2a3a', '#2f5d8f', False, 1),
        (24, -11.5, 8, 7, 2, '#9c5038', None, '#5a4a40', None, None, True, 1),
        (-13, 11.5, 9, 7, 2, '#a0583e', '#cfe0d4', '#6a3b30', '#2c4f7a', '#d9a63a', False, -1),
        (-24, 11.5, 8, 7, 2, '#8a4a33', None, '#4f4a4e', None, None, False, -1),
        (13, 11.5, 9, 7, 3, '#a4553b', None, '#6f3a2c', '#6b3f22', '#3f7a4a', False, -1),
        (24, 11.5, 8, 7, 2, '#b06048', '#f0e2c6', '#7d3b2c', None, None, True, -1)]
    for i, (x, z, w, d, fl, col, pl, rf, shop, sign, tim, face) in enumerate(specs):
        house(f'h{i}', x, z, w, d, floors=fl, fh=3.0, col=col, plaster=pl, roof=rf, shop=shop, sign=sign, timber=tim, facing=face,
              shutters='#3f6f58' if i % 3 == 0 else None, seed=i + 10, lit=.0)
    # signpost at the corner with three arms (engine paints town names)
    sp = mat('paint', '#f1ece0', .5)
    cyl('sign.post', (rw / 2 + 1.2, 1.9, rw / 2 + 1.2), .07, 3.8, sp, verts=14)
    for k, a in enumerate((0.0, math.pi / 2, math.pi)):
        box(f'anim:signarm{k}', (rw / 2 + 1.2 + math.cos(a) * .55, 3.0 + k * .32, rw / 2 + 1.2 - math.sin(a) * .55), (1.1, .22, .04), mat('sign', '#f1ece0', .5), bev=.01, rot=(0, a, 0))
    sphere('sign.finial', (rw / 2 + 1.2, 3.85, rw / 2 + 1.2), .09, sp)
    for k, (x, z) in enumerate([(-rw / 2 - .5, -8), (rw / 2 + .5, 8), (-rw / 2 - .5, 18), (rw / 2 + .5, -18)]): lantern(f'lamp{k}', (x, 0, z), lit=1.5, post=3.4)
    # bench, mailbox, verges with grass, trees, flower tubs
    bm_ = mat('plank', '#6b4a2e', .7)
    for k in range(3): box(f'bench.seat{k}', (-rw / 2 - 2.2, .48, -4.8 + k * .14), (1.7, .04, .11), bm_, bev=.006)
    for k in range(3): box(f'bench.back{k}', (-rw / 2 - 2.2, .7 + k * .14, -5.0), (1.7, .1, .04), bm_, bev=.006)
    for dx in (-.75, .75): box(f'bench.leg{dx}', (-rw / 2 - 2.2 + dx, .3, -4.7), (.06, .6, .5), mat('metal', '#2c2f30', .5, .7), bev=.01)
    cyl('mailbox', (rw / 2 + .7, .8, -3.0), .26, 1.3, mat('paint', '#c0302a', .45), verts=24); cyl('mailtop', (rw / 2 + .7, 1.5, -3.0), .3, .12, mat('paint', '#c0302a', .45), verts=24)
    box('mailslot', (rw / 2 + .7, 1.25, -2.73), (.24, .03, .02), mat('paint', '#1a1a1a', .8), bev=0)
    for k, (x, z) in enumerate([(-rw / 2 - 1.8, 20), (rw / 2 + 1.8, -24), (-rw / 2 - 1.8, -26), (rw / 2 + 1.8, 28)]):
        tree(f'stree{k}', x, z, .15, h=6, r=2.2, seed=k + 200, leaf='#4b8a3a', leaf2='#a3d066')
        box(f'treepit{k}', (x, .17, z), (1.4, .05, 1.4), mat('stone', '#8f877c', .85), bev=.02)
    for k, (x, z) in enumerate([(-rw / 2 - .6, 4.5), (rw / 2 + .6, -6.5)]):
        cyl(f'tub{k}', (x, .45, z), .35, .6, mat('plank', '#7a5233', .7), verts=20)
        bush(f'tubfl{k}', x, z, .7, r=.42, seed=k + 300, flowers=['#e5713f', '#f2d24a'][k])
    # grass verges behind the pavements at the far ends
    def h(x, z): return .16 + fbm(x, z, .3, 2, 4) * .05
    gcol = lambda x, z, y, s: tuple(v * (0.9 + .2 * fbm(x, z, .4, 2, 3)) for v in rgb('#5f9e45'))
    for k, (x0, x1, z0, z1) in enumerate([(-rw / 2 - pw - .1, -rw / 2 - pw + 1.3, 15, 44), (rw / 2 + pw - 1.3, rw / 2 + pw + .1, -44, -15)]):
        terrain(f'verge{k}', x0, x1, z0, z1, 12, h, gcol)
    g = []
    rr = random.Random(5)
    for k, (x0, x1, z0, z1) in enumerate([(-rw / 2 - pw, -rw / 2 - pw + 1.2, 15, 44), (rw / 2 + pw - 1.2, rw / 2 + pw, -44, -15)]):
        for i in range(1600):
            x, z = rr.uniform(x0, x1), rr.uniform(z0, z1); c = gcol(x, z, 0, 0); g.append([round(x, 2), .17, round(z, 2), *[round(v, 3) for v in c], round(.6 + rr.random() * .4, 2)])
    scatter_json(OUT / 'street-grass.json', {'grass': g, 'flowers': [[x, .17, z, '#f2d24a'] for x, _, z, *_ in g[::40]]})


def navy():
    """1948 Navy laboratory: chequer tile floor, pale green tiled dado, cream walls, steel equipment racks with dials and
    indicator lamps, oscilloscopes, workbench with the revived cone, pigeon boxes, a tall electronic console (arrives at the end)"""
    W, D, H = 12.0, 9.0, 3.9; x0, x1, z0, z1 = -W / 2, W / 2, -D / 2, D / 2
    tile_floor(x0, x1, z0, z1, s=.45, a='#e9e6dd', b='#2f4f5f', name='navytile')
    wins = [window(f'nw{i}', (x0, z0), (x1, z0), u, 1.0, 1.6, 2.0, bars=(2, 3), frame='#d6dde0') for i, u in enumerate((2.0, 6.0, 10.0))]
    brick_wall('navy.back', (x0, z0), (x1, z0), H, base='#e8e2cf', openings=wins, surf='plaster')
    brick_wall('navy.left', (x0, z1), (x0, z0), H, base='#e8e2cf', surf='plaster')
    brick_wall('navy.right', (x1, z0), (x1, z1), H, base='#e8e2cf', surf='plaster', openings=[door('navydoor', (x1, z0), (x1, z1), 6.6, col='#5a6b74', frame='#cfd6d8', glazed=True)])
    for (a, b) in [((x0, z0), (x1, z0)), ((x0, z1), (x0, z0)), ((x1, z0), (x1, z1))]:
        ang = math.atan2(b[1] - a[1], b[0] - a[0]); ln = math.hypot(b[0] - a[0], b[1] - a[1]); cx, cz = wall_point(a, b, ln / 2, .16)
        box('navy.dado', (cx, .6, cz), (ln, 1.2, .03), mat('tile', '#9fc4b0', .3), bev=0, rot=(0, -ang, 0))
        cx, cz = wall_point(a, b, ln / 2, .19); box('navy.dadocap', (cx, 1.22, cz), (ln, .05, .05), mat('tile', '#5f8f78', .3), bev=.01, rot=(0, -ang, 0))
    rr = random.Random(3)
    for k in range(4):
        x = x0 + 1.0 + k * 1.05
        box(f'rack{k}', (x, 1.0, z0 + .55), (.95, 2.0, .6), mat('metal', '#6f7b80', .4, .6), bev=.015)
        for j in range(4):
            y = .4 + j * .45; box(f'rackpanel{k}{j}', (x, y, z0 + .86), (.86, .38, .02), mat('metal', '#8c979b', .35, .6), bev=.006)
            for i in range(3):
                cyl(f'dial{k}{j}{i}', (x - .28 + i * .28, y + .05, z0 + .88), .055, .02, mat('paint', '#f2efe2', .4), axis='z', verts=18)
                cyl(f'knob{k}{j}{i}', (x - .28 + i * .28, y - .12, z0 + .89), .022, .03, mat('rubber', '#1e1e1e', .5), axis='z', verts=10)
            sphere(f'ind{k}{j}', (x + .36, y + .12, z0 + .88), .018, mat('emit', rr.choice(['#ff5a3a', '#7dff8a', '#ffd23a']), .2, emit=6), segs=8, rings=5)
    table('nbench', 1.0, -.2, 3.2, 1.2, h=.92, top='#56636a', legs='#3d474c')
    for x in (.45, 1.75): box('ncradle', (x, 1.0, -.2), (.12, .16, .9), mat('metal', '#3d474c', .4, .6), bev=.015)
    for k in range(2):
        x = -3.2 + k * 1.3; box(f'scope{k}', (x, 1.15, -1.0), (.5, .4, .55), mat('metal', '#5b6870', .4, .5), bev=.03)
        box(f'scopescreen{k}', (x - .05, 1.2, -.72), (.26, .2, .01), mat('screen', '#7dffb0', .2, emit=2.5), bev=0)
    table('scopetbl', -2.55, -1.0, 2.4, .9, h=.92, top='#56636a', legs='#3d474c')
    for k in range(3): cage(f'nbox{k}', (x1 - .6, 0, -2.2 + k * .62), w=.56, h=.44, d=.5, col='#9aa3aa')
    # the electronic guidance console (slides in at the end)
    box('anim:console', (-4.6, 1.15, 1.6), (1.1, 2.3, .8), mat('metal', '#4e5a60', .4, .6), bev=.03)
    for k in range(12):
        cyl(f'anim:console.tube{k}', (-4.95 + (k % 6) * .14, 1.55 + (k // 6) * .35, 2.02), .04, .18, mat('emit', '#ffb066', .2, emit=4), verts=12)
    box('navy.ceiling', (0, H + .06, 0), (W, .12, D), mat('plaster', '#f1f1ea', .9), bev=0)
    for k in range(2): box(f'ceilN{k}', (-2 + k * 4, H - .06, 0), (.5, .08, 2.4), mat('emit', '#eef4ff', .2, emit=3), bev=.01)


# ================================================================ BUILD
def main():
    build_set(OUT / 'lab.glb', 'lab', lab)
    build_set(OUT / 'war.glb', 'war', war)
    build_set(OUT / 'range.glb', 'range', range_set)
    build_set(OUT / 'coast.glb', 'coast', coast)
    build_set(OUT / 'street.glb', 'street', street)
    build_set(OUT / 'navy.glb', 'navy', navy)
    build_set(OUT / 'cone.glb', 'cone', nose_cone, joinable=True)
    build_set(OUT / 'glider.glb', 'glider', glider, joinable=True)
    print('ALL ASSETS DONE')


guarded(main)
