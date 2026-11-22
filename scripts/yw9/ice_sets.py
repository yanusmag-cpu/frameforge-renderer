"""YunoWorld v9 — "Why They Shot a Block of ICE in Front of Admirals" (Project Habbakuk / pykrete). Blender sets + props.
Run: blender -b --factory-startup -P scripts/yw9/ice_sets.py  → public/yw9-ice/*.glb
Sets: hall (1943 Quebec conference hall), atlantic (convoy at sea, engine sea shader), study (Pyke's cluttered study),
bath (a 1940s country-house bathroom), carrier (the giant ice ship at sea), lake (Patricia Lake in the Canadian Rockies,
with the test model, a motor hut and pine forest; its sunken remains on the lake bed). Props: blocks (two ice blocks on a
stand, one shatters), uboat, plane, macro (cut-open pykrete block: wood fibres and a stopped crack).
"""
import sys, math, random
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from kit9 import *  # noqa
import kit9

OUT = kit9.ROOT / 'public/yw9-ice'
reset()


def hall():
    """Quebec 1943: herringbone-ish parquet, red runner, walnut wainscot, cream walls with pilasters, tall arched windows with
    crimson drapes, two brass chandeliers, a trestle with the ice blocks (prop), admirals' chairs, flags of no nation"""
    W, D, H = 14.0, 10.0, 5.5; x0, x1, z0, z1 = -W / 2, W / 2, -D / 2, D / 2
    plank_floor(x0, x1, z0, z1, base='#8c5a2e', dark='#6a4020', w=.14, name='hfloor', along='z')
    box('runner', (0, .006, 0), (2.6, .012, D - 1), mat('fabric', '#9e2a2a', .95), bev=0)
    for side in (-1, 1): box(f'runner.edge{side}', (side * 1.25, .008, 0), (.12, .012, D - 1), mat('fabric', '#d8b24a', .9), bev=0)
    wins = [window(f'hw{i}', (x0, z0), (x1, z0), u, 1.1, 1.5, 3.0, bars=(2, 5), frame='#f2ead6') for i, u in enumerate((2.5, 7.0, 11.5))]
    brick_wall('hall.back', (x0, z0), (x1, z0), H, base='#ece0c6', openings=wins, surf='plaster')
    brick_wall('hall.left', (x0, z1), (x0, z0), H, base='#ece0c6', surf='plaster')
    brick_wall('hall.right', (x1, z0), (x1, z1), H, base='#ece0c6', surf='plaster', openings=[door('halldoor', (x1, z0), (x1, z1), 5.0, w=1.6, h=2.8, col='#5a3018', frame='#e9dcc0')])
    for (a, b) in [((x0, z0), (x1, z0)), ((x0, z1), (x0, z0)), ((x1, z0), (x1, z1))]:
        ang = math.atan2(b[1] - a[1], b[0] - a[0]); ln = math.hypot(b[0] - a[0], b[1] - a[1]); cx, cz = wall_point(a, b, ln / 2, .17)
        box('hall.wains', (cx, .6, cz), (ln, 1.2, .04), mat('plank', '#5a3018', .5), bev=.01, rot=(0, -ang, 0))
        cx, cz = wall_point(a, b, ln / 2, .2); box('hall.rail', (cx, 1.22, cz), (ln, .08, .07), mat('plank', '#4a2612', .5), bev=.015, rot=(0, -ang, 0))
        cx, cz = wall_point(a, b, ln / 2, .2); box('hall.crown', (cx, H - .15, cz), (ln, .3, .14), mat('paint', '#f4ecd8', .5), bev=.04, rot=(0, -ang, 0))
        for k in range(int(ln / 2.25) + 1):
            px, pz = wall_point(a, b, min(ln - .2, max(.2, k * 2.25)), .2); box('hall.pilaster', (px, H / 2, pz), (.36, H, .1), mat('paint', '#f4ecd8', .5), bev=.02, rot=(0, -ang, 0))
    for i, u in enumerate((2.5, 7.0, 11.5)):   # crimson drapes with folds
        for side in (-1, 1):
            for f in range(4): box(f'drape{i}{side}{f}', (x0 + u + side * (.95 + f * .07), 2.4, z0 + .32 + (f % 2) * .04), (.09, 4.2, .08), mat('fabric', '#8e1f26', .9), bev=.03)
        box(f'pelmet{i}', (x0 + u, 4.65, z0 + .35), (2.6, .35, .12), mat('fabric', '#7a1820', .9), bev=.03)
    box('ceiling', (0, H + .06, 0), (W, .12, D), mat('plaster', '#f2ead6', .9), bev=0)
    for z in (-2.5, 2.5):   # chandeliers
        cx_, cy_ = 0, H - 1.6
        cyl(f'ch{z}.rod', (cx_, H - .6, z), .02, 1.2, mat('brass', '#c9a24a', .3), verts=8)
        cyl(f'ch{z}.ring', (cx_, cy_, z), .7, .06, mat('brass', '#c9a24a', .3), verts=32)
        for k in range(10):
            a = k * .628; cyl(f'ch{z}.cand{k}', (cx_ + math.cos(a) * .7, cy_ + .12, z + math.sin(a) * .7), .02, .16, mat('paint', '#f6f0e0', .4), verts=8)
            sphere(f'ch{z}.flame{k}', (cx_ + math.cos(a) * .7, cy_ + .25, z + math.sin(a) * .7), .035, mat('emit', '#ffd59a', .2, emit=8), segs=8, rings=5)
        for k in range(16): sphere(f'ch{z}.crys{k}', (cx_ + math.cos(k * .39) * .55, cy_ - .25 - (k % 3) * .08, z + math.sin(k * .39) * .55), .03, mat('glass', '#e8f4ff', .05), segs=6, rings=4)
    # the demonstration: a trestle stand, sandbags behind, the admirals' chairs along the side
    table('trestle', 0, -2.3, 2.2, .8, h=.9, top='#7a5230')
    for k in range(5): blob(f'sand{k}', (-.8 + k * .4, .2, -3.0), .3, mat('fabric', '#b59b6a', .95), sc=(1.3, .7, .9), sub=2, rough=.08, seed=k)
    for k in range(3): blob(f'sandb{k}', (-.6 + k * .4, .55, -3.0), .28, mat('fabric', '#a58c5c', .95), sc=(1.3, .7, .9), sub=2, rough=.08, seed=k + 9)
    for k in range(5): chair(f'achair{k}', 3.2, -2.5 + k * 1.05, face=-math.pi / 2, col='#4a2612', seat='#8e1f26')
    table('sidetbl', 4.6, 0, 1.0, 4.6, h=.78, top='#4a2612')
    for k in range(4): box(f'folder{k}', (4.6, .795, -1.6 + k * 1.1), (.3, .02, .4), mat('paper', '#e8dcc0', .9), bev=0)


def study():
    """Geoffrey Pyke's study: cosy and chaotic. Rug on floorboards, papered walls, overflowing shelves, desk buried in plans
    and an ice-ship drawing, green lamp, armchair, window with rain-grey London light"""
    W, D, H = 7.0, 6.0, 3.4; x0, x1, z0, z1 = -W / 2, W / 2, -D / 2, D / 2
    plank_floor(x0, x1, z0, z1, base='#7a4e2a', dark='#5c3a1e', name='sfloor')
    box('rug', (0, .008, .3), (3.6, .015, 2.6), mat('fabric', '#7a2f2a', .95), bev=0); box('rugin', (0, .01, .3), (3.2, .015, 2.2), mat('fabric', '#2f4a5a', .95), bev=0)
    wins = [window('sw0', (x0, z0), (x1, z0), 4.9, 1.0, 1.3, 1.6, bars=(2, 3))]
    brick_wall('st.back', (x0, z0), (x1, z0), H, base='#3f5a4a', openings=wins, surf='plaster')
    brick_wall('st.left', (x0, z1), (x0, z0), H, base='#3f5a4a', surf='plaster')
    brick_wall('st.right', (x1, z0), (x1, z1), H, base='#3f5a4a', surf='plaster')
    box('st.ceiling', (0, H + .06, 0), (W, .12, D), mat('plaster', '#e9e0c8', .9), bev=0)
    for (a, b) in [((x0, z0), (x1, z0)), ((x0, z1), (x0, z0)), ((x1, z0), (x1, z1))]:
        ang = math.atan2(b[1] - a[1], b[0] - a[0]); ln = math.hypot(b[0] - a[0], b[1] - a[1]); cx, cz = wall_point(a, b, ln / 2, .16)
        box('st.skirt', (cx, .1, cz), (ln, .2, .04), mat('plank', '#4a2c16', .5), bev=.01, rot=(0, -ang, 0))
    for k, x in enumerate((-2.6, -1.3)): bookshelf(f'sbs{k}', x, z0 + .32, w=1.25, h=2.4, seed=20 + k)
    bookshelf('sbs3', x1 - .3, -1.0, w=1.4, h=2.3, face=-math.pi / 2, seed=33)
    table('desk', .6, -1.6, 2.0, 1.0, h=.78, top='#5a3018')
    rr = random.Random(5)
    for k in range(16):
        box(f'plan{k}', (.6 + rr.uniform(-.85, .85), .79 + k * .002, -1.6 + rr.uniform(-.4, .4)), (.42, .002, .3), mat('paper', rr.choice(['#efe6cf', '#dfe9f2', '#f3ecd6']), .9), bev=0, rot=(0, rr.uniform(-.6, .6), 0))
    text_plane('iceplan', (.6, .81, -1.5), .9, .6, mat('board', '#2a4a78', .9), rot=(-math.pi / 2, 0, 0))
    desk_lamp('slamp', 1.4, .78, -1.9, shade='#2f6a48', lit=5)
    for k in range(6): box(f'stack{k}', (-.9 + rr.random() * .3, .18 + k * .3, -2.4 + rr.random() * .3), (.5, .28, .36), mat('paper', '#e9dfc4', .9), bev=.01, rot=(0, rr.uniform(-.3, .3), 0))
    chair('dchair', .6, -.85, face=math.pi, col='#4a2612', seat='#6a2a22')
    box('arm.seat', (-2.2, .35, 1.4), (1.0, .4, .9), mat('fabric', '#8a5a2a', .95), bev=.12, seg=3)
    box('arm.back', (-2.2, .85, 1.0), (1.0, .8, .25), mat('fabric', '#8a5a2a', .95), bev=.1, seg=3)
    for s_ in (-1, 1): box(f'arm.arm{s_}', (-2.2 + s_ * .5, .6, 1.4), (.2, .5, .9), mat('fabric', '#7a4a22', .95), bev=.08, seg=3)
    sphere('globe', (2.6, 1.05, 1.6), .22, mat('map', '#8ab8d0', .5)); cyl('globestand', (2.6, .45, 1.6), .05, .9, mat('plank', '#5a3018', .6), verts=10)
    for k in range(5): cyl(f'mug{k}', (.6 + rr.uniform(-.8, .8), .83, -1.2 - rr.random() * .5), .04, .09, mat('paint', '#f0ece2', .4), verts=14)


def bath():
    """a 1940s country-house bathroom: black-and-white tiles, green dado tiles, claw-foot tub (lathe), brass taps, towel rail,
    mirror, frosted-glass door (a silhouette appears behind it), window with soft light"""
    W, D, H = 5.0, 4.0, 3.2; x0, x1, z0, z1 = -W / 2, W / 2, -D / 2, D / 2
    tile_floor(x0, x1, z0, z1, s=.3, a='#f1eee6', b='#22262a', name='btile')
    wins = [window('bw0', (x0, z0), (x1, z0), 1.2, 1.3, 1.0, 1.4, bars=(2, 2), frame='#f4f2ea')]
    brick_wall('b.back', (x0, z0), (x1, z0), H, base='#e9e6dc', openings=wins, surf='plaster')
    brick_wall('b.left', (x0, z1), (x0, z0), H, base='#e9e6dc', surf='plaster')
    brick_wall('b.right', (x1, z0), (x1, z1), H, base='#e9e6dc', surf='plaster', openings=[(1.2, 2.2, 0, 2.15)])
    for (a, b) in [((x0, z0), (x1, z0)), ((x0, z1), (x0, z0)), ((x1, z0), (x1, z1))]:
        ang = math.atan2(b[1] - a[1], b[0] - a[0]); ln = math.hypot(b[0] - a[0], b[1] - a[1]); cx, cz = wall_point(a, b, ln / 2, .16)
        box('b.dado', (cx, .6, cz), (ln, 1.2, .03), mat('tile', '#6aa68a', .2), bev=0, rot=(0, -ang, 0))
        cx, cz = wall_point(a, b, ln / 2, .19); box('b.cap', (cx, 1.22, cz), (ln, .05, .05), mat('tile', '#2f6a52', .2), bev=.01, rot=(0, -ang, 0))
    box('b.ceiling', (0, H + .06, 0), (W, .12, D), mat('plaster', '#f2f0ea', .9), bev=0)
    # frosted door in the right wall opening
    box('anim:frost', (x1, 1.08, -.3), (.05, 2.1, .98), mat('glass', '#dfe8ec', .4), bev=.01)
    box('frostframe', (x1, 1.08, -.3), (.08, 2.2, .06), mat('paint', '#f4f2ea', .5), bev=.01)
    # claw-foot tub
    prof = [(-.85, .0), (-.85, .3), (-.8, .38), (.8, .38), (.85, .3), (.85, 0)]
    tub = cyl('tub.body', (-.6, .55, -.9), .42, .62, mat('paint', '#f6f4ee', .25), axis='x', verts=40)
    tub.scale = (1.0, 1.0, 1.0)
    box('tub.water', (-.6, .74, -.9), (1.55, .02, .66), mat('glass', '#9fd6e2', .05), bev=0)
    box('tub.rim', (-.6, .86, -.9), (1.75, .06, .82), mat('paint', '#f6f4ee', .25), bev=.03)
    for (dx, dz) in [(-.7, -.3), (.7, -.3), (-.7, .3), (.7, .3)]: blob(f'tub.foot{dx}{dz}', (-.6 + dx, .1, -.9 + dz), .09, mat('brass', '#c9a24a', .3), sc=(1, 1.3, 1), sub=1, rough=.1)
    for k, dz in enumerate((-.1, .1)): tube(f'tap{k}', [(-1.45, .86, -.9 + dz), (-1.45, 1.05, -.9 + dz), (-1.32, 1.08, -.9 + dz)], .022, mat('brass', '#d2a64e', .3))
    tube('towelrail', [(x1 - .3, 1.0, z0 + .4), (x1 - .3, 1.0, z0 + 1.4)], .025, mat('brass', '#d2a64e', .3))
    box('towel', (x1 - .3, .8, z0 + .9), (.06, .5, .7), mat('fabric', '#f2e6d0', .95), bev=.03)
    box('mirror', (1.0, 1.75, z0 + .17), (.7, .9, .03), mat('glass', '#cfe4ec', .05), bev=.01); box('mirrorframe', (1.0, 1.75, z0 + .15), (.8, 1.0, .03), mat('brass', '#c9a24a', .3), bev=.02)
    box('sink', (1.0, .85, z0 + .4), (.6, .15, .45), mat('paint', '#f6f4ee', .25), bev=.05); cyl('sinkped', (1.0, .4, z0 + .38), .1, .8, mat('paint', '#f6f4ee', .25), verts=20)
    box('bathmat', (-.6, .01, -.2), (1.0, .015, .55), mat('fabric', '#c9d9e0', .95), bev=0)


def iceship():
    """Habbakuk: a 2,000 ft (610 m) ice aircraft carrier. Rounded bow, sloping 40 ft ice walls with refrigeration pipes, a
    flight deck with markings, an island, parked fighters, frost and snow along the waterline"""
    Lh, B, Dh = 610.0, 92.0, 42.0
    bm = bmesh.new(); rows = []
    for i in range(41):
        u = i / 40; x = -Lh / 2 + Lh * u; w = B / 2 * (1 - max(0, (u - .82) / .18) ** 1.8 * .85) * (1 - max(0, (.06 - u) / .06) ** 2 * .3)
        rows.append([bm.verts.new(L(x, -12, -w * .85)), bm.verts.new(L(x, 0, -w)), bm.verts.new(L(x, Dh, -w * .96)), bm.verts.new(L(x, Dh, w * .96)), bm.verts.new(L(x, 0, w)), bm.verts.new(L(x, -12, w * .85))])
    for a, b in zip(rows[:-1], rows[1:]):
        for k in range(5): bm.faces.new((a[k], b[k], b[k + 1], a[k + 1]))
    bmesh.ops.contextual_create(bm, geom=rows[0]); bmesh.ops.contextual_create(bm, geom=rows[-1])
    me = bpy.data.meshes.new('hab.hull'); bm.to_mesh(me); bm.free(); o = kit9._obj('hab.hull', me); o.data.materials.append(mat('ice', '#bfe6f2', .3))
    box('hab.deck', (0, Dh + .5, 0), (Lh * .97, 1.0, B * .93), mat('ice', '#e8f6fb', .4), bev=.3)
    for k in range(18): box(f'hab.stripe{k}', (-Lh * .45 + k * Lh * .052, Dh + 1.05, 0), (14, .05, 1.6), mat('paint', '#f2d24a', .6), bev=0)
    box('hab.edge', (0, Dh + 1.05, B * .42), (Lh * .95, .05, 1.0), mat('paint', '#f2f2f2', .6), bev=0)
    for k in range(3):   # island superstructure
        box(f'hab.island{k}', (60 - k * 2, Dh + 6 + k * 7, -B * .38), (40 - k * 9, 7, 14 - k * 2), mat('paint', '#d9dee2', .5), bev=.4)
    cyl('hab.mast', (58, Dh + 32, -B * .38), .8, 16, mat('paint', '#d9dee2', .5), verts=10)
    for k in range(26):   # refrigeration pipes along the hull
        x = -Lh * .45 + k * Lh * .036
        tube(f'hab.pipe{k}', [(x, 2, B / 2 * .99), (x, Dh - 2, B / 2 * .97)], .6, mat('metal', '#7d8a92', .4, .5))
    for k in range(10):
        x = -150 + k * 28; plane_model(f'hab.plane{k}', (x, Dh + 1.1, 12 + (k % 2) * 16), 1.0)
    for k in range(60):
        rr = random.Random(k); blob(f'hab.snow{k}', (rr.uniform(-Lh * .45, Lh * .45), Dh + 1, rr.choice([-1, 1]) * B * .44), rr.uniform(2, 5), mat('snow', '#ffffff', .9), sc=(2, .35, .6), sub=1, rough=.15, seed=k)


def plane_model(name, p, s=1.0, col='#4f6b57'):
    """cartoon WWII fighter: fuselage, wings, tail, canopy, propeller (anim)"""
    x, y, z = p; m = mat('paint', col, .5); d = mat('metal', '#3a3e44', .5, .5)
    cyl(f'{name}.fus', (x, y + 1.3 * s, z), .55 * s, 8 * s, m, axis='x', verts=16, r2=.3 * s)
    box(f'{name}.wing', (x + .6 * s, y + 1.1 * s, z), (2.2 * s, .18 * s, 11 * s), m, bev=.05 * s)
    box(f'{name}.tail', (x - 3.6 * s, y + 1.4 * s, z), (1.2 * s, .12 * s, 3.6 * s), m, bev=.04 * s)
    box(f'{name}.fin', (x - 3.6 * s, y + 2.2 * s, z), (1.2 * s, 1.5 * s, .14 * s), m, bev=.04 * s)
    sphere(f'{name}.canopy', (x + .4 * s, y + 1.85 * s, z), .45 * s, mat('glass', '#9fc6dc', .05), sc=(1.6, .8, .8))
    cyl(f'{name}.spin', (x + 4.1 * s, y + 1.3 * s, z), .22 * s, .5 * s, d, axis='x', verts=12, r2=.05 * s)
    for k in range(2): box(f'{name}.wheel{k}', (x + 1.0 * s, y + .35 * s, z + (k - .5) * 2.4 * s), (.5 * s, .7 * s, .2 * s), d, bev=.1 * s)
    for k in range(2): box(f'{name}.roundel{k}', (x + .6 * s, y + 1.21 * s, z + (k - .5) * 7 * s), (1.0 * s, .02 * s, 1.0 * s), mat('paint', '#e8e2d0', .6), bev=0)


def lake():
    """Patricia Lake, Jasper: turquoise lake in a bowl of pine forest under snow-capped peaks; the 60 ft test model (a
    boathouse-like timber shed on the water) with a small motor hut on a jetty"""
    def h(x, z):
        d = math.hypot(x / 1.3, z); rim = max(0, d - 45) / 30
        y = -6 + min(1, max(0, (d - 30) / 18)) * 8 + rim * rim * 10 + fbm(x, z, .02, 3, 3) * 3 * min(1, rim + .3)
        peak = max(0, fbm(x, z, .008, 3, 11) + .2) * max(0, d - 120) * .45
        return y + peak
    def col(x, z, y, slope):
        if y < .4: return rgb('#c8b890') if y > -1.5 else rgb('#6a8a7a')
        if y > 38 + fbm(x, z, .05, 2, 5) * 8: return (1.05, 1.05, 1.1)
        if slope > .5 or y > 24: r_ = rgb('#8a8278') if fbm(x, z, .1, 2, 2) > 0 else rgb('#a09688'); return r_
        c = rgb('#4f8a3c') if fbm(x, z, .05, 2, 7) > -.1 else rgb('#6aa448')
        return c
    terrain('lake.ground', -260, 260, -320, 200, 170, h, col)
    rr = random.Random(31); n = 0
    for i in range(420):
        x, z = rr.uniform(-230, 230), rr.uniform(-290, 170); y = h(x, z)
        if y < 1.0 or y > 30: continue
        tree(f'pine{n}', x, z, y - .2, h=rr.uniform(9, 16), r=rr.uniform(2.2, 3.4), seed=n + 500, kind='cone', leaf=rr.choice(['#2f5f34', '#356a3a', '#2a5530']), leaf2=rr.choice(['#5f9a52', '#6aa85a'])); n += 1
        if n > 150: break
    # the test model on the water (y ~ 0), its jetty and motor hut on the shore
    tm = mat('plank', '#8a6a4a', .75); ice_ = mat('ice', '#cfeaf2', .3)
    box('anim:model.ice', (8, .6, 18), (18.3, 2.2, 9.1), ice_, bev=.3)
    for k in range(10): box(f'anim:model.wall{k}', (8 - 8.6 + k * 1.9, 3.2, 18), (1.7, 3.2, 8.4), tm, bev=.05)
    gable_roof('anim:model.roof', -1.2, 17.2, 13.8, 22.2, 4.8, 2.4, col='#5a4a3a', ridge_axis='x', chimney=None)
    box('jetty', (8, .55, 28.5), (2.2, .2, 12), tm, bev=.04)
    for k in range(7): cyl(f'jettypost{k}', (7 + (k % 2) * 2, .0, 23 + k * 1.8), .12, 2.4, mat('bark', '#5a4030', .8), verts=10)
    house('motorhut', 8, 37, 4, 3.5, floors=1, fh=2.6, plaster='#7a5a3e', roof='#4a4a4e', trim='#e8e0cc', door_col='#3a4a3a', seed=40, chimney=True)
    tube('pipe', [(8, .9, 35), (8, .9, 22.5)], .12, mat('metal', '#5a6066', .4, .5))
    # the remains on the lake bed (seen underwater at the end): scattered timbers and ice-shaped hummocks
    for k in range(24):
        rr2 = random.Random(k + 70); x, z = 8 + rr2.uniform(-10, 10), 18 + rr2.uniform(-6, 6)
        box(f'wreck{k}', (x, h(x, z) + .2, z), (rr2.uniform(2, 5), .25, .3), mat('bark', '#4a3a2a', .9), bev=.04, rot=(rr2.uniform(-.2, .2), rr2.uniform(0, 3), rr2.uniform(-.15, .15)))
    for k in range(10):
        rr2 = random.Random(k + 90); x, z = 8 + rr2.uniform(-9, 9), 18 + rr2.uniform(-5, 5)
        rock(f'lump{k}', (x, h(x, z) + .3, z), rr2.uniform(.6, 1.4), mat('stone', '#6f7f7a', .9), seed=k + 80, flat=.6)


def blocks():
    """the two demonstration blocks on a tray: plain ice (shatters: separate shards) and pykrete (stays)"""
    box('anim:iceA', (-.45, .25, 0), (.5, .5, .5), mat('ice', '#cfeef8', .15), bev=.03)
    rr = random.Random(3)
    for k in range(14):
        box(f'anim:shards.k{k}', (-.45 + rr.uniform(-.2, .2), .25 + rr.uniform(-.2, .2), rr.uniform(-.2, .2)), (rr.uniform(.06, .16), rr.uniform(.06, .16), rr.uniform(.04, .1)), mat('ice', '#d8f2fa', .15), bev=.01, rot=(rr.random() * 3, rr.random() * 3, rr.random() * 3))
    box('anim:iceB', (.45, .25, 0), (.5, .5, .5), mat('pykrete', '#d9ccb0', .55), bev=.03)
    box('tray', (0, -.02, 0), (1.6, .04, .8), mat('metal', '#8a9096', .4, .5), bev=.01)


def uboat():
    """a stylised U-boat surfacing: hull, conning tower, deck gun, periscope"""
    m = mat('paint', '#5a6068', .5)
    cyl('ub.hull', (0, 0, 0), 2.2, 50, m, axis='x', verts=20, r2=1.4)
    box('ub.deck', (0, 1.6, 0), (40, .3, 2.4), mat('plank', '#6a6a60', .7), bev=.05)
    box('ub.tower', (2, 3.2, 0), (6, 3.2, 2.4), m, bev=.4, taper=.15)
    cyl('ub.scope', (3, 6.5, 0), .1, 3.5, mat('metal', '#3a3e44', .4, .6), verts=8)
    cyl('ub.gun', (-6, 2.4, 0), .12, 3, mat('metal', '#3a3e44', .4, .6), axis='x', verts=8)


def macro():
    """cut-open pykrete block (1 unit = 1 cm): translucent ice volume shell, dozens of wood fibres, and a crack that stops"""
    box('anim:shell', (0, 0, 0), (2.4, 2.4, 2.4), mat('glass', '#cfeef8', .05), bev=.05)
    rr = random.Random(7)
    for k in range(90):
        a = (rr.uniform(-1.1, 1.1), rr.uniform(-1.1, 1.1), rr.uniform(-1.1, 1.1)); d = (rr.uniform(-1, 1), rr.uniform(-1, 1), rr.uniform(-1, 1)); l = rr.uniform(.4, 1.0)
        b = (a[0] + d[0] * l * .5, a[1] + d[1] * l * .5, a[2] + d[2] * l * .5)
        tube(f'fibre{k}', [a, ((a[0] + b[0]) / 2 + rr.uniform(-.05, .05), (a[1] + b[1]) / 2, (a[2] + b[2]) / 2), b], .025, mat('bark', rr.choice(['#b98a52', '#a87a44', '#c99a62']), .8))
    for k in range(8):   # the crack (animated to grow then stop at the fibres)
        box(f'anim:crack-{k}', (-1.2 + k * .12, .3 - k * .03, .0), (.14, .01, 1.6), mat('emit', '#ffffff', .2, emit=1.5), bev=0, rot=(0, 0, .2 * math.sin(k * 1.7)))


def main():
    build_set(OUT / 'hall.glb', 'hall', hall)
    build_set(OUT / 'study.glb', 'study', study)
    build_set(OUT / 'bath.glb', 'bath', bath)
    build_set(OUT / 'carrier.glb', 'carrier', iceship)
    def atlantic():
        ship(0, 0, name='cv1'); ship(-70, -60, name='cv2'); ship(-140, 30, name='cv3'); ship(80, -120, name='cv4')
    build_set(OUT / 'atlantic.glb', 'atlantic', atlantic)
    build_set(OUT / 'lake.glb', 'lake', lake)
    build_set(OUT / 'blocks.glb', 'blocks', blocks)
    build_set(OUT / 'uboat.glb', 'uboat', uboat)
    build_set(OUT / 'plane.glb', 'plane', lambda: plane_model('anim:fighter', (0, 0, 0), 1.0))
    build_set(OUT / 'macro.glb', 'macro', macro)
    print('ALL ASSETS DONE')


guarded(main)
