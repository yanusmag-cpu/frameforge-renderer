"""YunoWorld v9 — "Shoe Shops X-RAYED Kids' Feet" (shoe-fitting fluoroscopes, 1920s–1950s). Blender sets + props.
Run: blender -b --factory-startup -P scripts/yw9/xray_sets.py  → public/yw9-xray/*.glb
Sets: shop (a 1950s shoe shop: chequered tile floor, walls of shoe-box shelving with a rolling ladder, fitting chairs and
stools, counter with cash register, display window onto the street, posters, pendant lights), street (1950s main street:
shopfronts with awnings and signs, parked rounded sedans, lamp posts, trees), state (1957 Pennsylvania legislative chamber:
curved rows of desks, raised rostrum, columns, flags, chandeliers).
Props: scope (the shoe-fitting fluoroscope cabinet: walnut case, three viewing hoods, foot slot, step; inside the X-ray
tube, 1 mm aluminium filter sheet, beam cone and fluorescent screen, all anim-named for cutaways), shoes (a pair).
"""
import sys, math, random
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from kit9 import *  # noqa
import kit9

OUT = kit9.ROOT / 'public/yw9-xray'
reset()


def shop():
    W, D, H = 10.0, 8.0, 3.4; x0, x1, z0, z1 = -W / 2, W / 2, -D / 2, D / 2
    tile_floor(x0, x1, z0, z1, a='#e9e1cf', b='#8e2f2f', s=.5, name='sfloor')
    ws = [window('sw0', (x1, z1), (x0, z1), 2.0, .5, 2.6, 2.4, bars=(3, 2), frame='#2f4f6a'), window('sw1', (x1, z1), (x0, z1), 7.4, .5, 2.6, 2.4, bars=(3, 2), frame='#2f4f6a')]
    brick_wall('s.back', (x0, z0), (x1, z0), H, base='#e8d8b8', surf='plaster'); brick_wall('s.left', (x0, z1), (x0, z0), H, base='#d8e4d8', surf='plaster')
    brick_wall('s.right', (x1, z0), (x1, z1), H, base='#d8e4d8', surf='plaster'); brick_wall('s.front', (x1, z1), (x0, z1), H, base='#d8e4d8', surf='plaster', openings=ws)
    box('s.ceiling', (0, H + .06, 0), (W, .12, D), mat('plaster', '#f4eede', .9), bev=0)
    for k in range(3):
        cyl(f's.rod{k}', (-3 + k * 3, H - .3, -.5), .015, .6, mat('metal', '#b8a070', .3, .8), verts=6)
        sphere(f's.globe{k}', (-3 + k * 3, H - .7, -.5), .28, mat('emit', '#fff0d0', .2, emit=3.0))
    # walls of shoe boxes (back + left), ladder rail
    rr = random.Random(5); BX = ['#e8d8b8', '#c9a46a', '#7aa0c0', '#e0b0a0', '#f2ecdc', '#b8c8a0', '#d0a050']
    for wall, (ax, az, bx, bz) in enumerate([(x0 + .5, z0 + .22, x1 - .5, z0 + .22), (x0 + .22, z0 + .5, x0 + .22, 1.5)]):
        ln = math.hypot(bx - ax, bz - az); ang = math.atan2(bz - az, bx - ax); n = int(ln / .36)
        box(f'case{wall}', ((ax + bx) / 2, 1.5, (az + bz) / 2), (ln + .1, 3.0, .4), mat('plank', '#6a3f22', .6), bev=.01, rot=(0, -ang, 0))
        for i in range(n):
            for r in range(11):
                u = (i + .5) / n; px, pz = ax + (bx - ax) * u, az + (bz - az) * u; c = rr.choice(BX)
                off = .12 + rr.uniform(-.015, .03)
                if wall == 0:
                    box(f'sb{wall}', (px, .2 + r * .26, pz + off), (.32, .2, .3), mat('paper', c, .85), bev=.008)
                    box(f'sbl{wall}', (px, .2 + r * .26, pz + off + .155), (.12, .06, .005), mat('paper', '#f6f2e8', .9), bev=0)
                else:
                    box(f'sb{wall}', (px + off, .2 + r * .26, pz), (.3, .2, .32), mat('paper', c, .85), bev=.008)
                    box(f'sbl{wall}', (px + off + .155, .2 + r * .26, pz), (.005, .06, .12), mat('paper', '#f6f2e8', .9), bev=0)
        box(f'rail{wall}', ((ax + bx) / 2, 2.95, (az + bz) / 2 + (.45 if wall == 0 else 0)), (ln, .04, .04), mat('brass', '#c9a24a', .3, .85), bev=0, rot=(0, -ang, 0))
    for s in (-1, 1): box(f'ladder.s{s}', (1.6 + s * .22, 1.5, z0 + .62), (.05, 3.0, .05), mat('plank', '#8a5a32', .6), bev=.005, rot=(-.18, 0, 0))
    for k in range(9): box(f'ladder.r{k}', (1.6, .2 + k * .32, z0 + .62 + (1.5 - (.2 + k * .32)) * .18), (.44, .035, .035), mat('plank', '#8a5a32', .6), bev=0)
    # fitting chairs (row), stools with sloping rests, foot measure
    for k in range(4):
        x = -3.4 + k * 1.1; chair(f'fchair{k}', x, 1.2, face=3.14, col='#5a3a22', seat='#2f6a5a')
        box(f'stool{k}', (x, .2, .55), (.35, .4, .5), mat('plank', '#6a4022', .6), bev=.02); box(f'rest{k}', (x, .43, .45), (.3, .04, .3), mat('rubber', '#3a3a3a', .8), bev=.01, rot=(.35, 0, 0))
    box('measure', (-2.2, .02, .3), (.14, .02, .38), mat('metal', '#8a9096', .3, .8), bev=.005)
    box('counter', (3.2, .5, -1.6), (2.6, 1.0, .7), mat('plank', '#6a3f22', .5), bev=.02); box('countertop', (3.2, 1.02, -1.6), (2.7, .05, .78), mat('tile', '#2f4f6a', .3), bev=.01)
    box('register', (3.6, 1.2, -1.6), (.5, .35, .45), mat('brass', '#b8923a', .3, .8), bev=.04); box('regtop', (3.6, 1.43, -1.7), (.4, .12, .1), mat('paint', '#f2ecdc', .4), bev=.01)
    for k, (x, c) in enumerate([(-1.2, '#c43d33'), (1.0, '#2f6a9a')]): text_plane(f'poster{k}', (x, 2.2, z0 + .44), .8, 1.0, mat('map', c, .8))
    # window display: stepped plinths with shoes
    for k in range(3): box(f'disp{k}', (-2.8 + k * .4, .25 + k * .18, z1 - .5), (2.2 - k * .5, .5 + k * .36, .5), mat('fabric', '#8e2f2f', .9), bev=.02)
    for k in range(5): shoe(f'dshoe{k}', -3.6 + k * .45, .55 + (k % 3) * .18, z1 - .5, col=rr.choice(['#6a3a22', '#2a2a2e', '#c43d33', '#e8dcc0']))


def shoe(name, x, y, z, col='#6a3a22', rot=0.0, s=1.0):
    m = mat('paint', col, .35)
    blob(f'{name}.body', (x, y + .05 * s, z), .14 * s, m, sc=(.65, .45, 1.4), sub=2, rough=0)
    box(f'{name}.sole', (x, y + .01 * s, z), (.13 * s, .02 * s, .29 * s), mat('rubber', '#2a1e18', .8), bev=.008, rot=(0, rot, 0))
    box(f'{name}.heel', (x, y + .025 * s, z - .11 * s), (.1 * s, .05 * s, .07 * s), mat('rubber', '#2a1e18', .8), bev=.008)


def street():
    box('road', (0, -.02, 0), (120, .04, 9), mat('pave', '#4a4a4e', .85), bev=0)
    for k in range(30): box(f'line{k}', (-58 + k * 4, .005, 0), (2.0, .01, .14), mat('paint', '#f0e8c8', .6), bev=0)
    for s in (-1, 1):
        box(f'kerb{s}', (0, .08, s * 4.6), (120, .16, .25), mat('stone', '#bdb6a6', .8), bev=.02)
        box(f'walk{s}', (0, .08, s * 6.6), (120, .14, 3.8), mat('pave', '#c8c2b2', .85), bev=0)
    SH = [('#c9a46a', '#c43d33'), ('#e8dcc0', '#2f6a9a'), ('#d8e4ea', '#3f8a5a'), ('#f2e0c8', '#d0a040'), ('#c8b8d8', '#8e2f2f'), ('#e8d0b0', '#2f4f6a')]
    rr = random.Random(8)
    for side in (-1, 1):
        for i in range(7):
            pc, aw = SH[(i + (side > 0) * 3) % len(SH)]
            house(f'st{side}{i}', -36 + i * 12, side * 13.2, 11, 8, floors=2, fh=3.4, plaster=pc, roof='#5a5a5e', trim='#f4f0e6', door_col=aw,
                  facing=-side, shop=aw, sign=aw, lit=.8, seed=80 + i + (side > 0) * 10, chimney=False)
    text_plane('shopsign', (0, 3.75, -9.0), 4.4, .8, mat('sign', '#1e2a3a', .5))
    for i, (x, s, c) in enumerate([(-20, -1, '#3f7ab0'), (-12, -1, '#c43d33'), (6, -1, '#7ab0a0'), (-4, 1, '#e8c84a'), (16, 1, '#2f4f6a'), (26, -1, '#e8e0d0')]):
        car_model(f'car{i}', x, s * 3.4, col=c, rot=0 if s < 0 else math.pi)
    for i in range(8):
        for s in (-1, 1):
            x = -42 + i * 12
            cyl(f'lp{s}{i}', (x, 2.2, s * 5.0), .06, 4.4, mat('metal', '#2f3a3a', .5, .6), verts=10)
            sphere(f'lpg{s}{i}', (x, 4.5, s * 5.0), .22, mat('emit', '#fff2d0', .2, emit=1.2))
    for i in range(6): tree(f'stt{i}', -30 + i * 12 + 6, (-1 if i % 2 else 1) * 6.0, .15, h=5.5, r=1.6, seed=i + 5, leaf='#4a7f36', leaf2='#9fcf62')


def state():
    """1957 legislative chamber: carpet, panelled walls, curved desk rows, rostrum, columns, flags, chandeliers, gallery"""
    W, D, H = 18.0, 16.0, 8.0; x0, x1, z0, z1 = -W / 2, W / 2, -D / 2, D / 2
    box('cfloor', (0, -.02, 0), (W, .04, D), mat('fabric', '#3a4f7a', .95), bev=0)
    for (a, b) in [((x0, z0), (x1, z0)), ((x0, z1), (x0, z0)), ((x1, z0), (x1, z1))]: brick_wall('cw', a, b, H, base='#e8dcc0', surf='plaster')
    box('cceil', (0, H + .1, 0), (W, .2, D), mat('plaster', '#f2e8d2', .9), bev=0)
    for (a, b) in [((x0, z0), (x1, z0)), ((x0, z1), (x0, z0)), ((x1, z0), (x1, z1))]:
        ang = math.atan2(b[1] - a[1], b[0] - a[0]); ln = math.hypot(b[0] - a[0], b[1] - a[1]); cx, cz = wall_point(a, b, ln / 2, .17)
        box('cwains', (cx, 1.0, cz), (ln, 2.0, .05), mat('plank', '#5a3018', .5), bev=.01, rot=(0, -ang, 0))
        box('cgallery', (cx, 4.6, cz), (ln, .3, .2), mat('plank', '#6a3a1e', .5), bev=.02, rot=(0, -ang, 0))
    box('rostrum', (0, .7, z0 + 2.0), (6.0, 1.4, 1.6), mat('plank', '#5a3018', .5), bev=.03); box('rostrum2', (0, 1.4, z0 + 1.2), (3.0, 2.8, 1.2), mat('plank', '#4a2612', .5), bev=.03)
    box('seal', (0, 2.2, z0 + 1.8), (.9, .9, .02), mat('brass', '#c9a24a', .3, .85), bev=0)
    for k, x in enumerate((-5.5, -3.0, 3.0, 5.5)): cyl(f'col{k}', (x, H / 2, z0 + .6), .35, H, mat('plaster', '#f2ead6', .7), verts=24)
    for k, (x, c) in enumerate([(-1.8, '#2f4f8a'), (1.8, '#c9a24a')]):
        cyl(f'fpole{k}', (x, 1.6, z0 + 1.0), .03, 3.2, mat('brass', '#c9a24a', .3, .85), verts=8)
        box(f'flag{k}', (x + .45, 2.7, z0 + 1.0), (.9, .6, .02), mat('fabric', c, .9), bev=0, rot=(0, 0, .05))
    for r in range(4):
        Rr = 4.5 + r * 1.6
        for k in range(10):
            a = -1.0 + 2.0 * (k + .5) / 10; px, pz = math.sin(a) * Rr, z0 + 2.5 + math.cos(a) * Rr
            box(f'desk{r}{k}', (px, .4 + r * .1, pz), (1.2, .8, .5), mat('plank', '#6a3a1e', .5), bev=.02, rot=(0, -a, 0))
            chair(f'cc{r}{k}', px + math.sin(a) * .6, pz + math.cos(a) * .6, face=a, col='#4a2612', seat='#7a2a22')
            box(f'cpap{r}{k}', (px, .82 + r * .1, pz), (.3, .005, .2), mat('paper', '#f3ecda', .9), bev=0, rot=(0, -a, 0))
    for k in range(3): sphere(f'chand{k}', (-5 + k * 5, H - 1.2, 1.0), .6, mat('emit', '#fff0cc', .2, emit=2.2), sc=(1, .6, 1))


def scope():
    """the fluoroscope: walnut cabinet 1.3 m tall, three viewing hoods (customer, parent, salesman) on a sloping top, the
    foot slot with brass trim at the front bottom, a step, a dial and a 'TRUE FIT' plaque; inside (anim): the X-ray tube
    under the slot, the 1 mm aluminium filter, the beam cone and the fluorescent screen behind the hoods"""
    w = mat('plank', '#6a3a1e', .45)
    box('anim:case', (0, .78, 0), (.62, 1.0, .52), w, bev=.03)
    box('anim:case.base', (0, .1, .05), (.7, .2, .62), mat('plank', '#4a2612', .5), bev=.02)
    box('anim:case.top', (0, 1.33, -.02), (.66, .14, .58), w, bev=.03, rot=(-.2, 0, 0))
    for k, (x, z, r) in enumerate([(0, .12, 0), (-.2, -.12, .5), (.2, -.12, -.5)]):
        cyl(f'anim:hood{k}', (x, 1.48, z), .065, .16, mat('rubber', '#1e1e20', .7), verts=16)
        cyl(f'hoodring{k}', (x, 1.56, z), .07, .02, mat('brass', '#c9a24a', .3, .85), verts=16)
    box('slot', (0, .36, .265), (.42, .16, .01), mat('paint', '#0e0e10', .6), bev=0)
    box('slottrim', (0, .36, .27), (.46, .2, .005), mat('brass', '#c9a24a', .3, .85), bev=.004)
    box('step', (0, .05, .42), (.6, .1, .3), mat('rubber', '#2a2a2a', .8), bev=.02)
    cyl('dial', (.22, .95, .265), .05, .02, mat('paint', '#f2ecdc', .4), axis='z', verts=20)
    box('plaque', (0, 1.0, .265), (.3, .09, .005), mat('brass', '#d8b25a', .3, .85), bev=0)
    for k in range(2): box(f'grille{k}', (-.2 + k * .4, .7, .262), (.12, .2, .004), mat('metal', '#8a7a5a', .4, .7), bev=0)
    # internals
    cyl('anim:tube', (0, .14, .12), .045, .26, mat('glass', '#c8d8e0', .1), axis='x', verts=16)
    sphere('anim:tube.anode', (0, .14, .12), .03, mat('emit', '#a8d8ff', .2, emit=2.0))
    box('anim:filter', (0, .25, .12), (.4, .004, .3), mat('metal', '#d8dde2', .2, .9), bev=0)
    cyl('anim:beam', (0, .6, .12), .2, .9, mat('emit', '#8ef0b0', .2, emit=1.4), verts=24, r2=.02)
    text_plane('anim:screen', (0, 1.1, .05), .36, .26, mat('screen', '#2a6a3a', .3), rot=(-math.pi / 2 + .25, 0, 0))
    for k in range(2): shoe(f'anim:foot{k}', -.1 + k * .2, .29, .14, col='#6a3a22')


def viewer():
    """the view down the hood, for point-of-view shots: an upright 1 m phosphor screen facing +z inside a black tube"""
    text_plane('vscreen', (0, 0, 0), 1.0, 1.0, mat('screen', '#2a6a3a', .3))


def main():
    build_set(OUT / 'shop.glb', 'shop', shop)
    build_set(OUT / 'street.glb', 'street', street)
    build_set(OUT / 'state.glb', 'state', state)
    build_set(OUT / 'scope.glb', 'scope', scope, joinable=True)
    build_set(OUT / 'viewer.glb', 'viewer', viewer, joinable=True)
    print('ALL ASSETS DONE')


guarded(main)
