"""YunoWorld v9 — "This Robot Beat Napoleon at Chess" (the Mechanical Turk). Blender sets + the automaton prop.
Run: blender -b --factory-startup -P scripts/yw9/turk_sets.py  → public/yw9-turk/*.glb
Sets: palace (1809 imperial hall: marble chequer floor, crimson walls, gilt pilasters, chandeliers), theatre (exhibition
stage with curtains, footlights and audience benches), museum (1854 night street; the museum building ablaze), room (an
1850s writing room), office (a modern office of desks and screens). Props: turk (cabinet with opening doors, gears, drawer,
chessboard with pieces, the turbaned figure with a moving arm and turning head), candle.
"""
import sys, math, random
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from kit9 import *  # noqa
import kit9

OUT = kit9.ROOT / 'public/yw9-turk'
reset()
GOLD = '#d4a640'


def gilt_room(name, W, D, H, wall, floor='tile', wins=(), win_v0=1.0, win_h=2.8, ceiling='#f4ead2'):
    x0, x1, z0, z1 = -W / 2, W / 2, -D / 2, D / 2
    if floor == 'tile': tile_floor(x0, x1, z0, z1, s=.6, a='#efe6d6', b='#3a2a2a', name=f'{name}.floor')
    else: plank_floor(x0, x1, z0, z1, base='#8a5a30', dark='#6a4222', name=f'{name}.floor')
    ws = [window(f'{name}.w{i}', (x0, z0), (x1, z0), u, win_v0, 1.4, win_h, bars=(2, 4), frame='#f4ead2') for i, u in enumerate(wins)]
    brick_wall(f'{name}.back', (x0, z0), (x1, z0), H, base=wall, openings=ws, surf='plaster')
    brick_wall(f'{name}.left', (x0, z1), (x0, z0), H, base=wall, surf='plaster')
    brick_wall(f'{name}.right', (x1, z0), (x1, z1), H, base=wall, surf='plaster')
    box(f'{name}.ceiling', (0, H + .06, 0), (W, .12, D), mat('plaster', ceiling, .9), bev=0)
    gm = mat('brass', GOLD, .35)
    for (a, b) in [((x0, z0), (x1, z0)), ((x0, z1), (x0, z0)), ((x1, z0), (x1, z1))]:
        ang = math.atan2(b[1] - a[1], b[0] - a[0]); ln = math.hypot(b[0] - a[0], b[1] - a[1])
        for yy, hh in ((.08, .16), (1.0, .06), (H - .2, .3)):
            cx, cz = wall_point(a, b, ln / 2, .19); box(f'{name}.mould', (cx, yy, cz), (ln, hh, .08), gm if yy > .5 else mat('paint', '#2a1a14', .5), bev=.02, rot=(0, -ang, 0))
        for k in range(int(ln / 2.4) + 1):
            px, pz = wall_point(a, b, min(ln - .2, max(.2, k * 2.4)), .2)
            box(f'{name}.pil', (px, H / 2, pz), (.3, H, .1), mat('paint', '#f2e6cc', .5), bev=.02, rot=(0, -ang, 0))
            box(f'{name}.pilcap', (px, H - .45, pz), (.42, .25, .14), gm, bev=.03, rot=(0, -ang, 0))
    return x0, x1, z0, z1


def chandelier(name, x, y, z, r=.7, n=10):
    gm = mat('brass', GOLD, .3)
    cyl(f'{name}.rod', (x, y + .7, z), .02, 1.4, gm, verts=8); cyl(f'{name}.ring', (x, y, z), r, .06, gm, verts=32)
    for k in range(n):
        a = k * 6.283 / n; cyl(f'{name}.c{k}', (x + math.cos(a) * r, y + .1, z + math.sin(a) * r), .02, .16, mat('paint', '#f6f0e0', .4), verts=8)
        sphere(f'{name}.f{k}', (x + math.cos(a) * r, y + .22, z + math.sin(a) * r), .035, mat('emit', '#ffd59a', .2, emit=8), segs=8, rings=5)
    for k in range(14): sphere(f'{name}.cr{k}', (x + math.cos(k * .45) * r * .8, y - .25 - (k % 3) * .08, z + math.sin(k * .45) * r * .8), .03, mat('glass', '#eaf6ff', .05), segs=6, rings=4)


def palace():
    x0, x1, z0, z1 = gilt_room('pal', 13, 10, 5.4, '#8e2230', wins=(2.4, 6.5, 10.6))
    for x in (-3.2, 3.2): chandelier(f'pch{x}', x, 3.9, -.5)
    for i, u in enumerate((2.4, 6.5, 10.6)):
        for s_ in (-1, 1):
            for f in range(4): box(f'pdr{i}{s_}{f}', (x0 + u + s_ * (.9 + f * .07), 2.4, z0 + .32 + (f % 2) * .04), (.09, 4.0, .08), mat('fabric', '#d6b06a', .9), bev=.03)
    for k, x in enumerate((-4.5, 4.5)):   # abstract gilt-framed landscape panels (original, not real paintings)
        box(f'pframe{k}', (x, 2.6, z0 + .2), (1.8, 1.3, .08), mat('brass', GOLD, .3), bev=.04)
        text_plane(f'ppaint{k}', (x, 2.6, z0 + .25), 1.5, 1.0, mat('map', '#7fa86a', .9))
    box('prug', (0, .008, .5), (6, .015, 4.5), mat('fabric', '#2a3a6a', .95), bev=0); box('prugb', (0, .01, .5), (5.6, .015, 4.1), mat('fabric', '#8e2230', .95), bev=0)
    chair('napchair', 0, 1.15, face=math.pi, col='#e9d9a8', seat='#2a3a6a')
    for k in range(4): chair(f'pch{k}', -4.5 + (k % 2) * 9, -2 + (k // 2) * 2.5, face=math.pi / 2 * (1 if k % 2 == 0 else -1), col='#e9d9a8', seat='#8e2230')


def theatre():
    """exhibition stage: plank stage with apron, red velvet curtains with gold fringe, footlights, gas lamps, painted
    backdrop, audience benches on a wooden floor"""
    W, D, H = 14.0, 14.0, 6.0; x0, x1, z0, z1 = -W / 2, W / 2, -D / 2, D / 2
    plank_floor(x0, x1, -1.0, z1, base='#6a4426', dark='#4f321a', name='tfloor')
    box('stage', (0, .45, -4.0), (12, .9, 6), mat('plank', '#8a5a30', .6), bev=.03)
    plank_floor(-6, 6, -7, -1.0, y=.9, base='#9a6a3a', dark='#7a4e28', name='stagefl')
    box('apron', (0, .45, -.98), (12, .9, .06), mat('paint', '#4a1a1a', .6), bev=.01)
    for k in range(12): sphere(f'foot{k}', (-5.5 + k, .96, -1.25), .06, mat('emit', '#ffd59a', .2, emit=6), segs=8, rings=5)
    brick_wall('t.back', (x0, z0), (x1, z0), H, base='#3a2a3a', surf='plaster')
    brick_wall('t.left', (x0, z1), (x0, z0), H, base='#5a2030', surf='plaster'); brick_wall('t.right', (x1, z0), (x1, z1), H, base='#5a2030', surf='plaster')
    text_plane('backdrop', (0, 3.2, z0 + .2), 9, 4.4, mat('map', '#6a8ab0', .9))
    for s_ in (-1, 1):
        for f in range(7): box(f'curt{s_}{f}', (s_ * (4.2 + f * .26), 3.5, -1.3 - (f % 2) * .08), (.24, 5.2, .14), mat('fabric', '#9e1c26', .9), bev=.05)
    box('pelmet', (0, 5.6, -1.3), (12.5, .9, .2), mat('fabric', '#8a1820', .9), bev=.05)
    for k in range(24): box(f'fringe{k}', (-6 + k * .52, 5.1, -1.2), (.4, .12, .04), mat('brass', GOLD, .35), bev=.01)
    for r in range(4):
        for s_ in (-1, 1):
            z = 1.2 + r * 1.3; box(f'bench{r}{s_}', (s_ * 2.8, .45, z), (4.4, .08, .42), mat('plank', '#6a4426', .6), bev=.01)
            box(f'benchback{r}{s_}', (s_ * 2.8, .8, z + .2), (4.4, .5, .05), mat('plank', '#6a4426', .6), bev=.01)
            for dx in (-2, 0, 2): box(f'benchleg{r}{s_}{dx}', (s_ * 2.8 + dx, .22, z), (.08, .44, .36), mat('plank', '#4f321a', .6), bev=.01)
    for k, (x, z) in enumerate([(-6.7, 1), (6.7, 1), (-6.7, 4.5), (6.7, 4.5)]): lantern(f'gas{k}', (x, 2.6, z), lit=3, bracket=(x + (-.2 if x > 0 else .2), z))
    box('t.ceiling', (0, H + .06, 0), (W, .12, D), mat('plaster', '#3a2a2a', .9), bev=0)


def museum():
    """1854 night street: cobbled road, gas lamps, terraced brick houses, and the grand museum hall with columns and a
    pediment, its windows glowing orange (the fire is sprites + lights in the engine)"""
    box('road', (0, -.04, 0), (80, .08, 9), mat('cobble', '#5a5650', .9), bev=0)
    for s_ in (-1, 1): box(f'pave{s_}', (0, .07, s_ * 6.2), (80, .14, 3.4), mat('pave', '#7a756c', .85), bev=0)
    for s_ in (-1, 1): box(f'kerb{s_}', (0, .08, s_ * 4.55), (80, .16, .22), mat('stone', '#8f877c', .8), bev=.02)
    # the museum: wide brick hall, stone columns, pediment
    house('mus', 0, -14, 20, 10, floors=2, fh=4.2, col='#8a4432', roof='#3a3436', trim='#e8dcc4', door_col='#3a2418', lit=4.0, seed=60, chimney=False)
    for k in range(6):
        x = -7.5 + k * 3; cyl(f'col{k}', (x, 4.2, -8.6), .35, 8.4, mat('stone', '#d8ccb4', .8), verts=20)
        box(f'colcap{k}', (x, 8.5, -8.6), (.9, .25, .9), mat('stone', '#d8ccb4', .8), bev=.03); box(f'colbase{k}', (x, .2, -8.6), (.9, .4, .9), mat('stone', '#d8ccb4', .8), bev=.03)
    box('portico', (0, 8.75, -8.6), (17, .5, 1.6), mat('stone', '#d8ccb4', .8), bev=.04)
    for k, x in enumerate((-22, -14, 14, 22)): house(f'th{k}', x, -12, 7, 7, floors=3, fh=2.9, col=['#7a3a2a', '#8a4a34', '#6e3626', '#83402e'][k], roof='#2e2e34', seed=61 + k, lit=1.2, facing=1)
    for k, x in enumerate((-18, -6, 6, 18)): house(f'oh{k}', x, 13, 8, 7, floors=3, fh=2.9, col=['#6e3626', '#7a3a2a', '#83402e', '#8a4a34'][k], roof='#2e2e34', seed=70 + k, lit=1.0, facing=-1)
    for k, x in enumerate((-12, 0, 12)):
        lantern(f'gl{k}', (x, 0, -4.8), lit=2.5, post=3.2); lantern(f'gr{k}', (x + 6, 0, 4.8), lit=2.5, post=3.2)


def room():
    """1850s writing room: wallpaper, floorboards, writing desk with an oil lamp, quill and papers, bookcase, curtain"""
    W, D, H = 6.0, 5.0, 3.2; x0, x1, z0, z1 = -W / 2, W / 2, -D / 2, D / 2
    plank_floor(x0, x1, z0, z1, base='#7a4e2a', dark='#5c3a1e', name='rfloor')
    ws = [window('rw0', (x0, z0), (x1, z0), 4.4, 1.0, 1.2, 1.6, bars=(2, 3))]
    brick_wall('r.back', (x0, z0), (x1, z0), H, base='#4a5a3a', openings=ws, surf='plaster'); brick_wall('r.left', (x0, z1), (x0, z0), H, base='#4a5a3a', surf='plaster'); brick_wall('r.right', (x1, z0), (x1, z1), H, base='#4a5a3a', surf='plaster')
    box('r.ceiling', (0, H + .06, 0), (W, .12, D), mat('plaster', '#e9e0c8', .9), bev=0)
    table('rdesk', 0, -1.6, 1.6, .8, h=.78, top='#5a3018'); chair('rchair', 0, -.95, face=math.pi, col='#4a2612', seat='#5a2a22')
    cyl('lamp.base', (.55, .84, -1.75), .08, .1, mat('brass', GOLD, .3), verts=16); cyl('lamp.glass', (.55, 1.0, -1.75), .07, .22, mat('glass', '#fff4dc', .05), verts=16)
    sphere('lamp.flame', (.55, .98, -1.75), .03, mat('emit', '#ffc86a', .2, emit=10), segs=8, rings=5)
    rr = random.Random(4)
    for k in range(9): box(f'rpaper{k}', (rr.uniform(-.6, .4), .79 + k * .002, -1.55 + rr.uniform(-.25, .2)), (.21, .002, .3), mat('paper', '#efe6cf', .9), bev=0, rot=(0, rr.uniform(-.5, .5), 0))
    tube('quill', [(-.1, .8, -1.45), (-.25, 1.02, -1.6)], .006, mat('paint', '#f2efe6', .6))
    bookshelf('rbs', -2.2, z0 + .32, w=1.2, h=2.2, seed=50)
    for k in range(4): box(f'rcurt{k}', (x0 + 4.4 + (k - 1.5) * .45, 1.8, z0 + .3), (.12, 2.6, .1), mat('fabric', '#6a2a2a', .9), bev=.03)


def office():
    """modern open-plan office at night: carpet tiles, rows of desks with monitors (screens glow), task chairs, a big wall
    screen (the engine paints it), pendant lights"""
    W, D, H = 14.0, 10.0, 3.2; x0, x1, z0, z1 = -W / 2, W / 2, -D / 2, D / 2
    tile_floor(x0, x1, z0, z1, s=.6, a='#5a6270', b='#4e5664', name='carpet')
    brick_wall('o.back', (x0, z0), (x1, z0), H, base='#d8dde2', surf='plaster'); brick_wall('o.left', (x0, z1), (x0, z0), H, base='#c8d0d8', surf='plaster'); brick_wall('o.right', (x1, z0), (x1, z1), H, base='#c8d0d8', surf='plaster')
    box('o.ceiling', (0, H + .06, 0), (W, .12, D), mat('plaster', '#eef0f2', .9), bev=0)
    box('wallscreen', (0, 1.9, z0 + .2), (5.2, 2.2, .1), mat('metal', '#1a1c20', .4, .4), bev=.03)
    text_plane('wallscr', (0, 1.9, z0 + .26), 5.0, 2.0, mat('board', '#0d1b2a', .5))
    for r in range(3):
        for c in range(4):
            x, z = -4.5 + c * 3, -1.0 + r * 2.2
            box(f'odesk{r}{c}', (x, .74, z), (1.6, .05, .8), mat('paint', '#e8e4dc', .4), bev=.01)
            for dx in (-.75, .75): box(f'oleg{r}{c}{dx}', (x + dx, .37, z), (.05, .74, .7), mat('metal', '#3a3e44', .4, .5), bev=.005)
            box(f'omon{r}{c}', (x, 1.05, z - .25), (.6, .36, .03), mat('metal', '#1a1c20', .4, .4), bev=.01)
            box(f'oscr{r}{c}', (x, 1.05, z - .23), (.56, .32, .01), mat('emit', '#7fb8ff', .2, emit=1.6), bev=0)
            box(f'okb{r}{c}', (x, .78, z + .05), (.4, .02, .14), mat('paint', '#2a2c30', .5), bev=.005)
            cyl(f'ochair{r}{c}', (x, .48, z + .55), .24, .08, mat('fabric', '#2a3a5a', .9), verts=16); box(f'ochairb{r}{c}', (x, .78, z + .78), (.44, .5, .06), mat('fabric', '#2a3a5a', .9), bev=.04)
    for k in range(4): cyl(f'opend{k}', (-4.5 + k * 3, H - .4, 1.2), .3, .1, mat('emit', '#f6f8ff', .2, emit=2.5), verts=24)


def turk():
    """the automaton: walnut cabinet (1.2 x 0.6 x 0.78 m) with brass trim, three front doors (anim), a drawer, visible gear
    train (anim gears), chessboard with pieces (anim, individually), and the turbaned figure seated behind it: robe, torso,
    head (anim, turns), glass eyes, moustache, turban, left arm (anim) with an open hand"""
    wm = mat('plank', '#5a3018', .5); gm = mat('brass', GOLD, .3)
    box('anim:cab', (0, .45, 0), (1.2, .78, .6), wm, bev=.015)
    box('anim:cabtop', (0, .855, 0), (1.26, .04, .66), mat('plank', '#4a2612', .45), bev=.01)
    for y in (.08, .835): box(f'cabtrim{y}', (0, y, .305), (1.22, .03, .02), gm, bev=.005)
    for k, x in enumerate((-.4, 0, .4)):
        box(f'anim:door{k}', (x, .52, .31), (.38, .5, .02), mat('plank', '#6a3a1e', .5), bev=.006)
        box(f'anim:door{k}.panel', (x, .52, .322), (.28, .38, .01), mat('plank', '#7a4626', .5), bev=.004)
        sphere(f'anim:door{k}.knob', (x + .15, .52, .335), .012, gm, segs=8, rings=5)
    box('anim:drawer', (0, .16, .31), (1.14, .14, .02), mat('plank', '#6a3a1e', .5), bev=.006)
    for k, (x, y, r) in enumerate([(-.38, .5, .16), (-.12, .58, .1), (.05, .42, .13), (.3, .55, .15), (.42, .33, .08)]):
        cyl(f'anim:gear{k}', (x, y, .2), r, .03, gm, axis='z', verts=28)
        for j in range(12): box(f'anim:gear{k}.t{j}', (x + math.cos(j * .5236) * (r + .015), y + math.sin(j * .5236) * (r + .015), .2), (.03, .02, .03), gm, bev=0, rot=(0, 0, j * .5236))
        cyl(f'anim:gear{k}.hub', (x, y, .22), r * .25, .04, mat('metal', '#3a3e44', .4, .5), axis='z', verts=12)
    for k in range(4): box(f'lever{k}', (-.45 + k * .3, .3, .05), (.02, .3, .02), mat('metal', '#5a6066', .4, .5), bev=0, rot=(0, 0, .3 - k * .2))
    # chessboard
    for i in range(8):
        for j in range(8): box(f'sq{i}{j}', (-.2 + (i + .5) * .05, .88, -.2 + (j + .5) * .05), (.05, .01, .05), mat('paint', '#efe6d6' if (i + j) % 2 else '#3a2618', .4), bev=0)
    box('boardrim', (0, .875, 0), (.44, .012, .44), gm, bev=.004)
    rr = random.Random(9); squares = rr.sample([(i, j) for i in range(8) for j in range(8)], 16)
    for k, (i, j) in enumerate(squares):
        c = mat('paint', '#f4efe2' if k % 2 else '#24201c', .35); x, z = -.2 + (i + .5) * .05, -.2 + (j + .5) * .05; hh = .035 + (k % 4) * .012
        cyl(f'anim:pieces.p{k}', (x, .885 + hh / 2, z), .014, hh, c, verts=12, r2=.009); sphere(f'anim:pieces.p{k}.top', (x, .89 + hh, z), .011, c, segs=8, rings=5)
    # the figure behind the cabinet
    cyl('robe', (0, 1.12, -.42), .26, .5, mat('fabric', '#2f5f6a', .9), verts=24, r2=.2)
    cyl('torso', (0, 1.52, -.42), .2, .4, mat('fabric', '#3a7a6a', .9), verts=24, r2=.17)
    box('sash', (0, 1.38, -.24), (.36, .06, .06), mat('fabric', '#c8a040', .9), bev=.02)
    sphere('anim:head', (0, 1.88, -.42), .14, mat('paint', '#d9a878', .55))
    for s_ in (-1, 1):
        sphere(f'anim:head.eye{s_}', (s_ * .05, 1.9, -.3), .025, mat('glass', '#f4f4f0', .05), segs=10, rings=6); sphere(f'anim:head.pupil{s_}', (s_ * .05, 1.9, -.277), .01, mat('paint', '#14141a', .3), segs=8, rings=5)
    box('anim:head.stache', (0, 1.84, -.29), (.12, .025, .02), mat('paint', '#2a1a12', .6), bev=.008)
    blob('anim:head.turban', (0, 2.0, -.42), .17, mat('fabric', '#f2ece0', .95), sc=(1.05, .7, 1.05), sub=2, rough=.12, seed=3)
    cyl('anim:head.band', (0, 1.98, -.42), .165, .04, mat('fabric', '#a8302a', .9), verts=24)
    sphere('anim:head.jewel', (0, 2.0, -.25), .02, mat('emit', '#4ab0ff', .2, emit=2), segs=8, rings=5)
    tube('anim:arm', [(.18, 1.62, -.42), (.36, 1.3, -.25), (.3, .98, -.05)], .045, mat('fabric', '#3a7a6a', .9))
    sphere('anim:arm.hand', (.3, .95, -.02), .045, mat('paint', '#d9a878', .55))
    tube('armL', [(-.18, 1.62, -.42), (-.3, 1.3, -.3), (-.28, 1.05, -.2)], .045, mat('fabric', '#3a7a6a', .9))
    box('cushion', (0, .9, -.42), (.5, .08, .4), mat('fabric', '#8e2230', .9), bev=.03)
    # the hidden master's sliding seat inside (anim)
    box('anim:seat', (-.2, .2, -.05), (.4, .05, .3), mat('plank', '#7a5a3a', .6), bev=.01)
    for k in range(2): box(f'rail{k}', (0, .17, -.15 + k * .2), (1.1, .02, .02), mat('metal', '#5a6066', .4, .5), bev=0)


def candle():
    cyl('anim:c.stick', (0, .08, 0), .02, .16, mat('paint', '#f4eedc', .4), verts=12); cyl('anim:c.holder', (0, .01, 0), .06, .02, mat('brass', GOLD, .3), verts=16)
    sphere('anim:c.flame', (0, .19, 0), .018, mat('emit', '#ffcf6a', .2, emit=12), sc=(1, 1.8, 1), segs=8, rings=6)


def main():
    build_set(OUT / 'palace.glb', 'palace', palace)
    build_set(OUT / 'theatre.glb', 'theatre', theatre)
    build_set(OUT / 'museum.glb', 'museum', museum)
    build_set(OUT / 'room.glb', 'room', room)
    build_set(OUT / 'office.glb', 'office', office)
    build_set(OUT / 'turk.glb', 'turk', turk)
    build_set(OUT / 'candle.glb', 'candle', candle)
    print('ALL ASSETS DONE')


guarded(main)
