"""YunoWorld v9 — "They Mailed a KID With Stamps on Her Coat" (US Parcel Post, 1913–1915). Blender sets + props.
Run: blender -b --factory-startup -P scripts/yw9/mail_sets.py  → public/yw9-mail/*.glb + grass json
Sets: farm (Grangeville, Idaho 1914: farmhouse with porch, barn, windmill, fences, prairie), line (the depot platform and a
long railway through rolling hills), mailcar (inside a Railway Post Office car), ohio (1913 village lane with picket fences),
office (the Postmaster General's office). Props: train (locomotive + mail car + coach).
"""
import sys, math, random
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from kit9 import *  # noqa
import kit9

OUT = kit9.ROOT / 'public/yw9-mail'
reset()


def prairie_colours(paths):
    G = [rgb('#5f9a45'), rgb('#86b85a'), rgb('#a6b860'), rgb('#4f8a3c')]
    def near(x, z):
        d = 1e9
        for pts, wd in paths:
            for (ax, az), (bx, bz) in zip(pts[:-1], pts[1:]):
                dx, dz = bx - ax, bz - az; t = max(0, min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz + 1e-9)))
                d = min(d, math.hypot(x - ax - dx * t, z - az - dz * t) / wd)
        return d
    def f(x, z, y, slope):
        n1 = fbm(x, z, .04, 3, 1); k = max(0, min(1, .5 + n1)); c = [G[0][i] * (1 - k) + G[1][i] * k for i in range(3)]
        if fbm(x, z, .12, 2, 6) > .3: c = [c[i] * .6 + G[2][i] * .4 for i in range(3)]
        if y > 14 + fbm(x, z, .05, 2, 4) * 4: c = [1.0, 1.0, 1.04]        # snow on the far hilltops (February)
        d = near(x, z)
        if d < 1.5: m = max(0, min(1, (1.5 - d) / .6)); s_ = rgb('#a08058'); c = [c[i] * (1 - m) + s_[i] * m for i in range(3)]
        return tuple(c)
    return f, near


def farm():
    paths = [([(-80, 14), (-20, 10), (0, 9), (30, 6), (80, 2)], 2.0), ([(0, 9), (0, 2)], 1.0)]
    def h(x, z):
        d = math.hypot(x, z); far = max(0, d - 35) / 30
        return fbm(x, z, .03, 3, 2) * .8 + far * far * 6 + max(0, fbm(x, z, .012, 2, 8)) * far * 14
    fcol, near = prairie_colours(paths)
    terrain('farm.ground', -110, 110, -110, 110, 150, h, fcol, flat=[(0, -6, 10, 0.0), (16, -16, 7, 0.0), (-12, -10, 3, 0.0)])
    y0 = h(0, -6)
    x0, x1, z0, z1, H = house('farmhouse', 0, -6, 9, 7, floors=2, fh=2.8, plaster='#f2e8d4', roof='#6a3a2a', trim='#ffffff', door_col='#3f6f58', shutters='#3f6f58', seed=3)
    # porch: deck, posts, railing, roof
    box('porch.deck', (0, .45, -1.6), (9.2, .2, 2.0), mat('plank', '#9a7a52', .7), bev=.02)
    for k in range(6): box(f'porch.post{k}', (-4.4 + k * 1.76, 1.6, -.7), (.14, 2.3, .14), mat('paint', '#ffffff', .5), bev=.02)
    box('porch.roof', (0, 2.85, -1.5), (9.6, .12, 2.4), mat('roof', '#6a3a2a', .8), bev=.03, rot=(-.12, 0, 0))
    for k in range(24): box(f'porch.bal{k}', (-4.4 + k * .38, .85, -.7), (.05, .6, .05), mat('paint', '#ffffff', .5), bev=.005)
    box('porch.rail', (0, 1.15, -.7), (8.9, .07, .1), mat('paint', '#ffffff', .5), bev=.01)
    for k in range(3): box(f'porch.step{k}', (0, .1 + k * .12, .1 - k * .3), (1.6, .14, .32), mat('plank', '#9a7a52', .7), bev=.01)
    chair('rocker', 3.0, -1.4, face=0.3, col='#8a5a32', seat='#b8423a')
    house('barn', 16, -16, 9, 8, floors=1, fh=4.6, plaster='#a8392c', roof='#5a5a5e', trim='#f1e9d6', door_col='#7a2a22', seed=5, chimney=False)
    # windmill: lattice tower, tail, blades (anim)
    m = mat('metal', '#8a9096', .4, .6); wx, wz = -12, -10; wy = 0.0
    for a in range(4):
        dx, dz = math.cos(a * 1.571 + .785) * 1.2, math.sin(a * 1.571 + .785) * 1.2
        tube(f'mill.leg{a}', [(wx + dx, wy, wz + dz), (wx + dx * .2, wy + 9, wz + dz * .2)], .07, m)
    for k in range(6): tube(f'mill.brace{k}', [(wx - 1.1 + k * .1, wy + k * 1.4, wz - 1.1 + k * .1), (wx + 1.1 - k * .1, wy + k * 1.4 + 1.2, wz + 1.1 - k * .1)], .03, m)
    box('mill.head', (wx, wy + 9.2, wz), (.8, .5, .5), m, bev=.05); box('mill.tail', (wx - 1.6, wy + 9.3, wz), (1.8, 1.0, .05), mat('paint', '#c43d33', .5), bev=.02)
    for k in range(12): box(f'anim:blades.b{k}', (wx + .45, wy + 9.2 + math.sin(k * .5236) * 1.1, wz + math.cos(k * .5236) * 1.1), (.04, 1.1, .3), mat('paint', '#e8e2d0', .5), bev=.01, rot=(-k * .5236, 0, 0))
    fence('farmfence', [(-30, 8), (-10, 8), (-2, 8)], h=1.1, col='#e8e2d0'); fence('farmfence2', [(2, 8), (25, 8), (40, 8)], h=1.1, col='#e8e2d0')
    cyl('mailbox.post', (3.4, .6, 8.6), .05, 1.2, mat('plank', '#6a4a2e', .7), verts=8); box('mailbox', (3.4, 1.3, 8.6), (.5, .3, .26), mat('metal', '#7a7f84', .4, .6), bev=.1)
    rr = random.Random(7)
    for i in range(30):
        x, z = rr.uniform(-70, 70), rr.uniform(-70, 60)
        if near(x, z) < 2 or math.hypot(x, z + 6) < 12 or math.hypot(x - 16, z + 16) < 8: continue
        tree(f'ft{i}', x, z, h(x, z) - .1, h=rr.uniform(6, 10), r=rr.uniform(2.2, 3.2), seed=i + 1, leaf=rr.choice(['#4a7f36', '#5a8a3a']), leaf2='#9fcf62')
    for i in range(16):
        x, z = rr.uniform(-40, 40), rr.uniform(-30, 30)
        if near(x, z) < 1.6 or math.hypot(x, z + 6) < 9: continue
        bush(f'fb{i}', x, z, h(x, z), r=rr.uniform(.5, 1.0), seed=i + 50, flowers=rr.choice([None, '#f2d24a', '#c95a8f']))
    g = []; fl = []
    for i in range(16000):
        x, z = rr.uniform(-30, 30), rr.uniform(-28, 28)
        if near(x, z) < 1.1 or (abs(x) < 5.2 and -10 < z < -1) or math.hypot(x - 16, z + 16) < 6: continue
        c = fcol(x, z, h(x, z), 0); g.append([round(x, 2), round(h(x, z), 3), round(z, 2), *[round(v, 3) for v in c], round(.7 + rr.random() * .6, 2)])
        if fbm(x, z, .1, 2, 13) > .35 and rr.random() < .4: fl.append([round(x, 2), round(h(x, z), 3), round(z, 2), rr.choice(['#f6f1e2', '#f2d24a', '#e5713f', '#8a6ad1'])])
    scatter_json(OUT / 'farm-grass.json', {'grass': g, 'flowers': fl})


def line():
    """the depot and the line: a timber station with bay window and name board, platform, water tower; the track runs
    for 600 m through rolling hills (flattened along the railway)"""
    def h(x, z):
        y = fbm(x, z, .012, 3, 5) * 9 + fbm(x, z, .05, 2, 2) * 1.2
        k = min(1, abs(z) / 14); k = k * k * (3 - 2 * k); return y * k + (0 if k < 1 else 0)
    fcol, near = prairie_colours([([(-300, 0), (300, 0)], 3.0)])
    terrain('line.ground', -320, 320, -160, 160, 200, h, fcol, flat=[(0, 9, 16, 0.0), (25, 7, 5, 0.0)])
    track('rail', -310, 310, 0)
    box('platform', (0, .5, 3.6), (40, 1.0, 4.0), mat('plank', '#8a6a46', .75), bev=.03)
    box('platedge', (0, .95, 1.7), (40, .1, .3), mat('stone', '#c8c0b0', .8), bev=.02)
    x0, x1, z0, z1, H = house('depot', 0, 9, 12, 5, floors=1, fh=3.6, plaster='#c8a46a', roof='#5a3a2a', trim='#f2e8d4', door_col='#5a2a1e', facing=-1, seed=12, chimney=True)
    text_plane('depotsign', (0, 3.4, 6.35), 5.0, .7, mat('sign', '#1e2a3a', .5), rot=(0, math.pi, 0))
    for k in range(5): box(f'bench{k}', (-12 + k * 6, 1.45, 5.0), (1.8, .08, .5), mat('plank', '#6a4a2e', .7), bev=.01)
    wt = mat('plank', '#7a5a3a', .75)
    for a in range(4): box(f'wtleg{a}', (24 + (a % 2) * 2.6, 3.5, 6 + (a // 2) * 2.6), (.3, 7, .3), wt, bev=.02)
    cyl('wtank', (25.3, 8.6, 7.3), 2.0, 3.2, wt, verts=28); cyl('wtroof', (25.3, 10.6, 7.3), 2.3, .9, mat('roof', '#5a3a2a', .8), verts=28, r2=.2)
    for k in range(4): lantern(f'plamp{k}', (-15 + k * 10, 1.0, 5.4), lit=1.5, post=3.0)
    for k in range(12): crate(f'pcrate{k}', (-18 + k * .7 + (k % 3) * .2, 1.0, 4.5 + (k % 2) * .4), .5 + (k % 3) * .1, col='#a88a5a')
    rr = random.Random(9)
    for i in range(70):
        x, z = rr.uniform(-300, 300), rr.choice([-1, 1]) * rr.uniform(18, 150)
        tree(f'lt{i}', x, z, h(x, z) - .1, h=rr.uniform(7, 12), r=rr.uniform(2.5, 3.6), seed=i + 100, kind='cone' if rr.random() < .6 else 'round', leaf=rr.choice(['#2f5f34', '#3f7a36', '#4a7f36']), leaf2='#8fc25a')
    g = []
    for i in range(14000):
        x, z = rr.uniform(-60, 60), rr.choice([-1, 1]) * rr.uniform(2.2, 30)
        if 1.5 < z < 12 and abs(x) < 22: continue
        c = fcol(x, z, h(x, z), 0); g.append([round(x, 2), round(h(x, z), 3), round(z, 2), *[round(v, 3) for v in c], round(.7 + rr.random() * .6, 2)])
    scatter_json(OUT / 'line-grass.json', {'grass': g, 'flowers': []})


def mailcar():
    """inside a Railway Post Office car: plank floor, tongue-and-groove walls, wall of pigeonhole sorting cases with
    letters, mail-sack racks, piles of sacks and string-tied parcels, oil lamps, small windows with daylight"""
    W, L, H = 2.8, 14.0, 2.6; z0, z1 = -W / 2, W / 2
    plank_floor(-L / 2, L / 2, z0, z1, base='#8a6038', dark='#6a4426', name='mfloor')
    for side in (-1, 1):
        box(f'mwall{side}', (0, H / 2, side * W / 2), (L, H, .08), mat('plank', '#b08a5a', .7), bev=0)
        for k in range(7):
            box(f'mwin{side}{k}', (-6 + k * 2, 1.9, side * (W / 2 - .045)), (.5, .4, .02), mat('emit', '#f4f0e0', .2, emit=2.2), bev=0)
    box('mceiling', (0, H + .05, 0), (L, .1, W), mat('plank', '#9a7a52', .7), bev=0)
    for e in (-1, 1): box(f'mend{e}', (e * L / 2, H / 2, 0), (.08, H, W), mat('plank', '#a07a4a', .7), bev=0)
    # pigeonhole cases (left wall) with letters
    rr = random.Random(3)
    for c in range(14):
        for r in range(8):
            x = -4.6 + c * .3; y = 1.0 + r * .2
            box(f'cub{c}{r}', (x, y, z0 + .2), (.29, .19, .3), mat('plank', '#c8a46a', .7), bev=.004)
            if rr.random() < .7: box(f'let{c}{r}', (x, y - .02, z0 + .25), (.22, .12, .02), mat('paper', rr.choice(['#f4efe2', '#e8dcc0', '#f2e6d0', '#dfe6ee']), .9), bev=0, rot=(0, 0, rr.uniform(-.1, .1)))
    box('sorttable', (-2.5, .9, z0 + .55), (4.4, .06, .5), mat('plank', '#8a6038', .6), bev=.01)
    # sacks and parcels on the right
    for k in range(14):
        blob(f'sack{k}', (1.0 + (k % 7) * .7, .3 + (k // 7) * .45, z1 - .6 - (k % 2) * .3), .38, mat('fabric', rr.choice(['#c9b88a', '#b8a578', '#d4c49a']), .95), sc=(1.1, .7, .8), sub=2, rough=.1, seed=k)
    for k in range(10):
        bx = rr.uniform(-6, 0); bz = rr.uniform(z1 - .9, z1 - .3); s_ = rr.uniform(.25, .45)
        box(f'parcel{k}', (bx, s_ / 2 + .02, bz), (s_ * 1.4, s_, s_), mat('paper', '#b8946a', .9), bev=.01, rot=(0, rr.uniform(-.4, .4), 0))
        box(f'string{k}', (bx, s_ / 2 + .02, bz), (s_ * 1.42, s_ + .01, .015), mat('fabric', '#e8dcc0', .9), bev=0, rot=(0, rr.uniform(-.4, .4), 0))
    for k in range(3): lantern(f'mlamp{k}', (-4 + k * 4, 2.2, 0), lit=2.5)


def ohio():
    """1913 village lane: dirt road, grass verges, picket fences, three clapboard houses, trees, a rural mailbox"""
    def h(x, z): return fbm(x, z, .05, 2, 3) * .3
    fcol, near = prairie_colours([([(-60, 0), (60, 0)], 3.0)])
    terrain('ohio.ground', -70, 70, -50, 50, 120, h, fcol, flat=[(x, -10, 7, 0.0) for x in (-12, 2, 16)])
    for i, (x, z, c, r) in enumerate([(-12, -10, '#f2ead8', '#5a3a2a'), (2, -11, '#d8e4ea', '#4a4a52'), (16, -10, '#f2e0c8', '#6a3a2a')]):
        house(f'oh{i}', x, z, 8, 6, floors=2, fh=2.8, plaster=c, roof=r, trim='#ffffff', door_col=['#3f6f58', '#7a2a2a', '#2f4f7a'][i], shutters=['#3f6f58', '#2f4f7a', '#7a2a2a'][i], seed=20 + i)
        fence(f'ofence{i}', [(x - 4.5, z + 5), (x - 1, z + 5)], h=.9, col='#f4f0e6', gap=.18); fence(f'ofenceb{i}', [(x + 1, z + 5), (x + 4.5, z + 5)], h=.9, col='#f4f0e6', gap=.18)
        box(f'opath{i}', (x, .02, z + 4.2), (1.0, .03, 2.2), mat('stone', '#b8b0a2', .85), bev=0)
    cyl('omail.post', (6.5, .6, 4.6), .05, 1.2, mat('plank', '#6a4a2e', .7), verts=8); box('omail', (6.5, 1.3, 4.6), (.5, .3, .26), mat('metal', '#7a7f84', .4, .6), bev=.1)
    rr = random.Random(11)
    for i in range(14):
        x, z = rr.uniform(-55, 55), rr.choice([-1, 1]) * rr.uniform(8, 40)
        if abs(z + 10) < 6 and abs(x) < 22: continue
        tree(f'ot{i}', x, z, h(x, z) - .1, h=rr.uniform(6, 10), r=rr.uniform(2.4, 3.4), seed=i + 30, leaf=rr.choice(['#4a7f36', '#5a8a3a', '#3f7a33']), leaf2='#a3d066')
    g = []; fl = []
    for i in range(12000):
        x, z = rr.uniform(-30, 30), rr.uniform(-6, 12)
        if abs(z) < 2.4 or (-15 < z < -4.8): continue
        c = fcol(x, z, h(x, z), 0); g.append([round(x, 2), round(h(x, z), 3), round(z, 2), *[round(v, 3) for v in c], round(.7 + rr.random() * .5, 2)])
        if rr.random() < .04: fl.append([round(x, 2), round(h(x, z), 3), round(z, 2), rr.choice(['#f6f1e2', '#f2d24a', '#e5713f'])])
    scatter_json(OUT / 'ohio-grass.json', {'grass': g, 'flowers': fl})


def office():
    """the Postmaster General's office, 1914: panelled walls, tall window, big desk with in-trays, lamp, bookcases, rug"""
    W, D, H = 8.0, 7.0, 3.6; x0, x1, z0, z1 = -W / 2, W / 2, -D / 2, D / 2
    plank_floor(x0, x1, z0, z1, base='#6e3f22', dark='#4f2c17', w=.12, name='pfloor', along='z')
    box('prug', (0, .008, 0), (4.4, .015, 3.4), mat('fabric', '#2f3f6a', .95), bev=0); box('prugb', (0, .01, 0), (4.0, .015, 3.0), mat('fabric', '#8e2a2a', .95), bev=0)
    ws = [window('pw0', (x0, z0), (x1, z0), 4.0, .9, 1.5, 2.3, bars=(2, 4), frame='#efe7d6')]
    brick_wall('p.back', (x0, z0), (x1, z0), H, base='#e8dcc0', openings=ws, surf='plaster'); brick_wall('p.left', (x0, z1), (x0, z0), H, base='#e8dcc0', surf='plaster'); brick_wall('p.right', (x1, z0), (x1, z1), H, base='#e8dcc0', surf='plaster')
    box('p.ceiling', (0, H + .06, 0), (W, .12, D), mat('plaster', '#f2ead6', .9), bev=0)
    for (a, b) in [((x0, z0), (x1, z0)), ((x0, z1), (x0, z0)), ((x1, z0), (x1, z1))]:
        ang = math.atan2(b[1] - a[1], b[0] - a[0]); ln = math.hypot(b[0] - a[0], b[1] - a[1]); cx, cz = wall_point(a, b, ln / 2, .17)
        box('p.wains', (cx, .6, cz), (ln, 1.2, .04), mat('plank', '#5a3018', .5), bev=.01, rot=(0, -ang, 0))
    table('pdesk', 0, -1.2, 2.4, 1.1, h=.78, top='#4a2612')
    rr = random.Random(2)
    for k in range(8): box(f'pp{k}', (rr.uniform(-.9, .9), .79 + k * .002, -1.2 + rr.uniform(-.35, .35)), (.21, .002, .3), mat('paper', '#f3ecda', .9), bev=0, rot=(0, rr.uniform(-.5, .5), 0))
    for k in range(2): box(f'tray{k}', (-.85 + k * .35, .82, -1.55), (.3, .06, .38), mat('plank', '#6a4022', .6), bev=.01)
    desk_lamp('plamp', .9, .78, -1.5, shade='#2c6a48', lit=5)
    chair('pchair', 0, -2.0, face=0, col='#3e2414', seat='#6b2a22')
    for k, x in enumerate((-2.9, 2.9)): bookshelf(f'pbs{k}', x, z0 + .32, w=1.3, h=2.4, seed=60 + k)
    cyl('pclock', (x0 + .17, 2.4, 1.0), .28, .05, mat('paint', '#f4ecd8', .5), axis='x', verts=36)


def train():
    locomotive('anim:loco', 6.5, 0, 0)
    railcar('anim:mcar', -5.5, 0, 0, L=11, col='#7a2a1e', label='#e8d8a8', wins=4)
    railcar('anim:coach', -17.5, 0, 0, L=11, col='#3a5a3a', wins=7)


def tag():
    """the label sewn to May's coat: a card with rows of stamps (painted 'map' board) and a string"""
    box('tagcard', (0, 0, 0), (.34, .24, .01), mat('paper', '#efe3c6', .9), bev=.004)
    text_plane('tagstamps', (0, 0, .007), .32, .22, mat('map', '#e8dcc0', .9))
    tube('tagstring', [(-.15, .1, 0), (-.05, .2, -.01), (.05, .21, -.01), (.15, .1, 0)], .006, mat('fabric', '#c8a868', .9), verts=5)


def scale():
    """a depot platform scale: cast-iron base and deck, pillar, a balance beam with a sliding poise, a big dial"""
    m = mat('metal', '#3a4a42', .45, .6); br = mat('brass', '#c9a24a', .3, .85)
    box('sc.base', (0, .08, 0), (1.0, .16, .8), m, bev=.03); box('sc.deck', (0, .19, 0), (.9, .04, .7), mat('plank', '#8a6a46', .7), bev=.01)
    box('sc.pillar', (0, .75, -.32), (.14, 1.1, .12), m, bev=.02)
    cyl('sc.dial', (0, 1.45, -.3), .3, .08, m, axis='z', verts=36); cyl('sc.face', (0, 1.45, -.255), .26, .01, mat('paint', '#f4ecd8', .5), axis='z', verts=36)
    box('anim:needle', (0, 1.45, -.245), (.012, .44, .006), mat('paint', '#a8302a', .4), bev=0)
    box('sc.beam', (0, 1.08, -.3), (.9, .05, .05), br, bev=.01); box('anim:poise', (.2, 1.08, -.3), (.08, .1, .08), br, bev=.02)


def main():
    build_set(OUT / 'farm.glb', 'farm', farm)
    build_set(OUT / 'line.glb', 'line', line)
    build_set(OUT / 'mailcar.glb', 'mailcar', mailcar)
    build_set(OUT / 'ohio.glb', 'ohio', ohio)
    build_set(OUT / 'office.glb', 'office', office)
    build_set(OUT / 'train.glb', 'train', train, joinable=True)
    build_set(OUT / 'tag.glb', 'tag', tag, joinable=True)
    build_set(OUT / 'scale.glb', 'scale', scale, joinable=True)
    print('ALL ASSETS DONE')


guarded(main)
