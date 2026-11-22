"""YunoWorld v9 — five new films' Blender sets + hero props, one script, selected by the FILM5 global (wrapper scripts).
knock : East End terraced street at dawn (brick terraces, lit windows, cobbles, gas lamps, sill flowerpots) + a bedroom.
pigcam: Kronberg-style hill town (half-timbered houses, market square, church tower with a pigeon loft, trees, hills)
        + the apothecary; hero prop: the pigeon camera (wooden body, twin lenses, aluminium breastplate, straps, air ball).
bath  : Victorian resort beach (sand, promenade terrace, pier, striped bathing machines) ; hero props: bathing machine
        (wheels, steps, door, modesty hood, flag) and a horse (anim legs).
spit  : Georgian kitchen (brick hearth with fire, spit + roast, wall dog-wheel with chain + pulley, copper pans, beams).
        hero prop: the dog wheel assembly (anim wheel/pulley/spit) and the turnspit dog (anim legs).
lick  : Victorian London street market (brick shopfronts, striped stalls, fruit, cobbles, gas lamps); hero props: the
        hokey-pokey barrow and the penny-lick glass (thick glass, shallow dip, ice cream).
"""
import sys, math, random
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from kit9 import *  # noqa
import kit9

FILM5 = globals().get('FILM5', 'knock')
OUT = kit9.ROOT / f'public/yw9-{FILM5}'
reset()


def grass_json(path, pts_fn, n, rr, flowers=None):
    g = []; fl = []
    for i in range(n):
        p = pts_fn(rr)
        if not p: continue
        x, y, z, c = p; g.append([round(x, 2), round(y, 3), round(z, 2), *[round(v, 3) for v in c], round(.6 + rr.random() * .6, 2)])
        if flowers and rr.random() < flowers: fl.append([round(x, 2), round(y, 3), round(z, 2), rr.choice(['#f6f1e2', '#f2d24a', '#e5713f', '#c95a8f', '#8a6ad1'])])
    scatter_json(path, {'grass': g, 'flowers': fl})


def flowerpot(name, x, y, z, col='#c95a3a', fl='#e8405a'):
    cyl(f'{name}.pot', (x, y + .09, z), .09, .18, mat('stone', col, .8), verts=12, r2=.07)
    blob(f'{name}.leaf', (x, y + .24, z), .13, mat('leaf', '#3f7a33', .8), sc=(1.1, .8, 1), sub=2, rough=.2, seed=hash(name) % 97)
    for k in range(4): sphere(f'{name}.f{k}', (x + math.cos(k * 1.6) * .08, y + .3, z + math.sin(k * 1.6) * .08), .035, mat('paint', fl, .5))


# ------------------------------------------------------------------------------------------------ knock
def knock_street():
    """dawn East End terrace: two facing rows of two-storey brick terraces, cobbled road, flagstone pavements, kerbs,
    gas lamps, flowerpots on sills, a corner shop; the hero house sits at x=0 on the north side (front at z=-5)"""
    road_pts = [(-40, 0), (40, 0)]
    cobbles(road_pts, 6.6, base='#6f6a63', name='road', s=.22)
    for s in (-1, 1):
        stone_floor(-40, 40, s * 3.3 if s > 0 else -5.0, 5.0 if s > 0 else -3.3, base='#8e8a82', name=f'pave{s}')
        box(f'kerb{s}', (0, .06, s * 3.35), (80, .14, .22), mat('stone', '#a8a296', .85), bev=.02)
    rr = random.Random(4)
    BR = ['#9a4a34', '#a85a3c', '#8e4230', '#b0603f', '#94503a']
    for s in (-1, 1):
        for i in range(14):
            x = -36.4 + i * 5.6
            house(f'h{s}{i}', x, s * 9.0, 5.6, 8.0, floors=2, fh=3.0, col=rr.choice(BR), roof='#4a4a52', trim='#efe6d2',
                  door_col=rr.choice(['#2f5d4f', '#7a2a2a', '#2f3f6a', '#3a3a3a']), facing=-s, lit=1.6 if rr.random() < .6 else 0.0, seed=10 + i + (s > 0) * 30,
                  shop='#2f5d4f' if (s < 0 and i == 10) else None)
            zf = s * 9.0 - s * 4.0 + (-s) * .3   # just in front of the facade
            for k, u in enumerate((1.4, 4.2)):
                if rr.random() < .55: flowerpot(f'fp{s}{i}{k}', x - 2.8 + u + (.2 if k else -.2), 3.9, zf - s * .05, fl=rr.choice(['#e8405a', '#f2d24a', '#f6f1e2', '#c95a8f']))
        for k in range(6):
            x = -30 + k * 12
            lantern(f'lamp{s}{k}', (x, 0, s * 3.75), lit=3.2, post=3.4)
    # hero window (north side house h-17 at x=0.4? compute: i=7 -> x=2.8; use i=6 -> x=-2.8): the target window is the
    # upper-left window of house x=-2.8 => centre (-4.2+... ) handled in shots via constants
    box('hero.sill', (-2.8 - 2.8 + 1.4, 3.88, -4.78), (1.25, .08, .26), mat('stone', '#d8cfbe', .8), bev=.01)


def knock_bedroom():
    """the sleeper's bedroom behind the hero window: plank floor, papered walls, iron bed with quilt, washstand, chair
    with folded work clothes, boots, candle on a chair, sash window (glass) with the street's dawn light"""
    W, D, H = 4.4, 4.0, 2.7; x0, x1, z0, z1 = -W / 2, W / 2, -D / 2, D / 2
    plank_floor(x0, x1, z0, z1, base='#7a5032', dark='#5a3820', name='bfloor')
    ws = [window('bw', (x0, z1), (x1, z1), 1.6, .9, 1.0, 1.4, bars=(2, 2), frame='#efe6d2', glass='#a8c0d8')]
    for (a, b, op) in [((x1, z0), (x0, z0), ()), ((x0, z0), (x0, z1), ()), ((x1, z1), (x1, z0), ()), ((x0, z1), (x1, z1), ws)]:
        brick_wall('bwall', a, b, H, base='#d8c6a0', surf='plaster', openings=op)
    box('bceil', (0, H + .05, 0), (W, .1, D), mat('plaster', '#efe6d2', .9), bev=0)
    m = mat('metal', '#2a2a2e', .5, .6)
    for e in (-1, 1):
        for sx in (-1, 1): cyl(f'bpost{e}{sx}', (-.3 + sx * .55, .5 + (e > 0) * .25, -1.0 + e * 1.0), .025, 1.0 + (e > 0) * .5, m, verts=8)
        box(f'brail{e}', (-.3, .95 + (e > 0) * .45, -1.0 + e * 1.0), (1.15, .04, .04), m, bev=0)
    box('bmattress', (-.3, .48, -1.0), (1.1, .2, 2.0), mat('fabric', '#efe6d2', .95), bev=.05)
    box('bquilt', (-.3, .6, -.75), (1.16, .08, 1.5), mat('fabric', '#8e3a3a', .95), bev=.04)
    blob('bpillow', (-.3, .66, -1.75), .25, mat('fabric', '#f4efe4', .95), sc=(1.6, .5, .8), sub=2, rough=0)
    table('wash', 1.6, -1.6, .7, .5, h=.8, top='#6a4022'); cyl('bowl', (1.6, .86, -1.6), .2, .1, mat('paint', '#f2f0ea', .3), verts=20, r2=.12)
    chair('bchair', 1.4, .6, face=-1.2, col='#5a3a22', seat='#5a3a22')
    box('bclothes', (1.4, .52, .6), (.4, .1, .35), mat('fabric', '#3f4a5a', .95), bev=.03)
    for k in range(2): blob(f'boot{k}', (1.1 + k * .2, .07, 1.0), .1, mat('rubber', '#2a1e18', .6), sc=(.7, .6, 1.4), sub=2, rough=0)
    cyl('candle', (1.6, .9, -1.45), .025, .14, mat('paint', '#f4ecd8', .5), verts=10); sphere('flame', (1.6, 1.0, -1.45), .02, mat('emit', '#ffb060', .2, emit=3))


# ------------------------------------------------------------------------------------------------ pigcam
def pig_town():
    """hillside town: half-timbered houses round a sloping cobbled market square, a church with tower and a pigeon loft
    on its roof, the apothecary with a sign, gardens, trees, wooded hills; generous so the camera can fly over it"""
    def h(x, z):
        d = math.hypot(x, z); return max(0, d - 34) * .18 + fbm(x, z, .02, 3, 4) * 3 * min(1, max(0, d - 30) / 20) + z * -.02
    G = [rgb('#4f8a3c'), rgb('#7fb85a'), rgb('#3f7033')]
    def col(x, z, y, s):
        k = max(0, min(1, .5 + fbm(x, z, .05, 2, 2))); c = [G[0][i] * (1 - k) + G[1][i] * k for i in range(3)]
        if fbm(x, z, .015, 2, 7) > .25: c = [c[i] * .6 + G[2][i] * .4 for i in range(3)]
        return tuple(c)
    terrain('town.ground', -160, 160, -160, 160, 130, h, col, flat=[(0, 0, 32, 0.0)])
    cobbles([(-14, 0), (14, 0)], 16, base='#8a8178', name='square', s=.22)
    cobbles([(14, 0), (40, -8)], 5, base='#857c72', name='lane1'); cobbles([(-14, 0), (-40, 10)], 5, base='#857c72', name='lane2')
    rr = random.Random(9); PL = ['#f2e8d4', '#efe0c0', '#f4ecdc', '#e8d8b8', '#f2dcc8', '#e0e8d8']
    ring = [(-11, -12, 0), (-4, -12.5, 0), (3, -12, 0), (10, -12.5, 0), (-12, 12, 1), (-5, 12.5, 1), (2, 12, 1), (9, 12.5, 1)]
    for i, (x, z, fl) in enumerate(ring):
        house(f't{i}', x, z, 6.4, 7, floors=3, fh=2.7, plaster=rr.choice(PL), roof=rr.choice(['#9a3a2a', '#8a4030', '#a84a32', '#5a4a4a']), trim='#f4efe4',
              door_col=rr.choice(['#3f6f58', '#7a2a2a', '#2f4f7a']), shutters=rr.choice(['#3f6f58', '#2f4f7a', '#8a3a2a']), timber=True, facing=1 if fl == 0 else -1,
              shop=('#2f5d4f' if i == 2 else None), seed=50 + i, lit=0.0)
    for i in range(26):   # outer streets
        a = rr.uniform(0, 6.28); d = rr.uniform(26, 60); x, z = math.cos(a) * d, math.sin(a) * d
        house(f'o{i}', x, z, rr.uniform(5, 7), rr.uniform(6, 8), floors=rr.choice([2, 3]), fh=2.7, plaster=rr.choice(PL), roof=rr.choice(['#9a3a2a', '#a84a32', '#8a4030']),
              trim='#f4efe4', timber=rr.random() < .7, facing=1 if z < 0 else -1, seed=90 + i, chimney=rr.random() < .6)
    # church: nave + tower + pigeon loft on the roof ridge
    box('church.nave', (22, 4.5, -22), (8, 9, 16), mat('plaster', '#efe6d2', .9), bev=.05)
    gable_roof('church.roof', 18, 26, -30, -14, 9, 4.5, col='#5a4a4a', ridge_axis='z')
    box('church.tower', (22, 10, -32), (4.6, 20, 4.6), mat('plaster', '#f2ead6', .9), bev=.05)
    cyl('church.spire', (22, 22.5, -32), 3.0, 5, mat('roof', '#3a4a5a', .8), verts=8, r2=.05)
    for k in range(4): box(f'church.clock{k}', (22 + (k == 1) * 2.32 - (k == 3) * 2.32, 16, -32 + (k == 0) * 2.32 - (k == 2) * 2.32), (1.2, 1.2, .05) if k % 2 == 0 else (.05, 1.2, 1.2), mat('paint', '#f4ecd8', .5), bev=0)
    box('loft', (22, 9.9, -18), (2.4, 1.4, 1.6), mat('plank', '#e8e0cc', .7), bev=.03); box('loft.board', (22, 9.25, -17.0), (2.6, .08, .6), mat('plank', '#8a6a46', .7), bev=.01)
    for k in range(3): box(f'loft.hole{k}', (21.3 + k * .7, 10.0, -17.18), (.3, .35, .02), mat('paint', '#1a1410', .7), bev=0)
    cyl('fountain', (0, .4, 0), 1.6, .8, mat('stone', '#bdb5a4', .8), verts=28); cyl('fountain.col', (0, 1.4, 0), .2, 2.0, mat('stone', '#c8c0b0', .8), verts=14)
    for i in range(70):
        a = rr.uniform(0, 6.28); d = rr.uniform(20, 150); x, z = math.cos(a) * d, math.sin(a) * d
        tree(f'tr{i}', x, z, h(x, z) - .1, h=rr.uniform(6, 11), r=rr.uniform(2.4, 3.8), seed=i + 1, kind='cone' if d > 70 and rr.random() < .6 else 'round', leaf=rr.choice(['#3f7a36', '#4f8a3a', '#2f6a34']), leaf2='#9fcf62')
    for i in range(30):
        x, z = rr.uniform(-30, 30), rr.choice([-1, 1]) * rr.uniform(16.5, 19)
        bush(f'bu{i}', x, z, 0, r=rr.uniform(.5, .9), seed=i + 3, flowers=rr.choice(['#e8405a', '#f2d24a', None, '#c95a8f']))
    grass_json(OUT / 'town-grass.json', lambda r: (lambda x, z: None if math.hypot(x, z) < 19 else (x, h(x, z), z, col(x, z, 0, 0)))(r.uniform(-45, 45), r.uniform(-45, 45)), 14000, rr, .05)


def pig_shop():
    """the apothecary: tiled floor, walls of wooden drawers and labelled jars, counter with scales and mortar, window"""
    W, D, H = 6.0, 5.0, 3.2; x0, x1, z0, z1 = -W / 2, W / 2, -D / 2, D / 2
    tile_floor(x0, x1, z0, z1, a='#e8e0cc', b='#3f6a5a', s=.4, name='pfloor')
    ws = [window('pw', (x1, z1), (x0, z1), 1.5, .8, 1.6, 2.0, bars=(3, 3), frame='#2f5d4f')]
    for (a, b, op) in [((x0, z0), (x1, z0), ()), ((x0, z1), (x0, z0), ()), ((x1, z0), (x1, z1), ()), ((x1, z1), (x0, z1), ws)]:
        brick_wall('pwall', a, b, H, base='#e8dcc0', surf='plaster', openings=op)
    box('pceil', (0, H + .05, 0), (W, .1, D), mat('plaster', '#f4ecdc', .9), bev=0)
    rr = random.Random(3)
    for c in range(14):
        for r in range(6):
            box(f'drw{c}{r}', (x0 + .5 + c * .36, .5 + r * .3, z0 + .2), (.34, .28, .3), mat('plank', '#7a4a26', .6), bev=.01)
            sphere(f'knob{c}{r}', (x0 + .5 + c * .36, .5 + r * .3, z0 + .36), .015, mat('brass', '#c9a24a', .3, .85))
    for c in range(16):
        for r in range(3):
            x = x0 + .45 + c * .32; y = 2.4 + r * .28
            cyl(f'jar{c}{r}', (x, y, z0 + .2), .1, .22, mat('paint', rr.choice(['#f4f0e6', '#2f5d8a', '#e8e0cc']), .3), verts=14)
            box(f'jarl{c}{r}', (x, y, z0 + .305), (.12, .07, .005), mat('paper', '#f4ecd8', .9), bev=0)
    box('pshelf', (0, 2.25, z0 + .2), (W - .4, .04, .3), mat('plank', '#5a3018', .6), bev=.01)
    box('counter', (0, .5, -.6), (3.6, 1.0, .7), mat('plank', '#5a3018', .5), bev=.02); box('countertop', (0, 1.02, -.6), (3.7, .05, .8), mat('stone', '#d8d0c0', .5), bev=.01)
    cyl('mortar', (-1.0, 1.1, -.6), .12, .14, mat('stone', '#e8e4dc', .5), verts=18, r2=.09)
    box('scale.base', (1.0, 1.07, -.6), (.4, .04, .2), mat('brass', '#c9a24a', .3, .85), bev=.01); cyl('scale.post', (1.0, 1.25, -.6), .015, .35, mat('brass', '#c9a24a', .3, .85), verts=8)
    box('scale.beam', (1.0, 1.42, -.6), (.5, .02, .02), mat('brass', '#c9a24a', .3, .85), bev=0)
    for s in (-1, 1): cyl(f'scale.pan{s}', (1.0 + s * .24, 1.3, -.6), .09, .02, mat('brass', '#c9a24a', .3, .85), verts=16)
    lantern('plamp', (0, 2.6, 0), lit=2.2)


def pig_camera():
    """hero prop (real size ~ 9 cm): wooden camera body with two lenses, aluminium breastplate, leather straps, the
    rubber air ball and its hose (anim:ball deflates), the shutter flap (anim:shutter)"""
    wood = mat('plank', '#8a5a32', .5); al = mat('metal', '#c8ccd0', .3, .85); lea = mat('fabric', '#6a3a22', .8)
    box('cam.body', (0, .06, 0), (.09, .05, .05), wood, bev=.004)
    for s in (-1, 1):
        cyl(f'cam.lens{s}', (s * .025, .045, .028), .011, .016, mat('metal', '#2a2a2e', .3, .8), axis='z', verts=16)
        cyl(f'cam.glass{s}', (s * .025, .045, .037), .008, .002, mat('glass', '#8ab0d0', .05), axis='z', verts=16)
    box('anim:shutter', (0, .045, .0372), (.07, .02, .002), mat('paint', '#1a1a1a', .5), bev=0)
    box('cam.plate', (0, .09, -.01), (.07, .004, .07), al, bev=.002)
    for s in (-1, 1): tube(f'cam.strap{s}', [(s * .035, .09, -.01), (s * .05, .12, .02), (s * .03, .15, .04)], .004, lea, verts=6)
    sphere('anim:ball', (0, .095, -.05), .016, mat('rubber', '#b8402a', .6))
    tube('cam.hose', [(0, .095, -.034), (.01, .08, -.02), (.02, .07, -.003)], .003, mat('rubber', '#3a2a22', .7), verts=6)
    box('cam.label', (0, .06, .0255), (.04, .012, .001), mat('brass', '#d8b25a', .3, .85), bev=0)


# ------------------------------------------------------------------------------------------------ bath
def bath_beach():
    """resort beach: sand sloping into the sea (engine sea at y=0), wet-sand band, seaweed, pebbles, a promenade wall,
    a terrace of stucco hotels with balconies, a pier on iron legs, flags, rows of striped bathing machines, boats"""
    def h(x, z):
        y = z * .045 + fbm(x, z, .05, 2, 3) * .12          # sand rises toward the promenade (+z); the sea is at -z
        return y
    SD = [rgb('#e8d2a0'), rgb('#d8bc84'), rgb('#c8a874')]
    def col(x, z, y, s):
        k = max(0, min(1, .5 + fbm(x, z, .2, 2, 2))); c = [SD[0][i] * (1 - k) + SD[1][i] * k for i in range(3)]
        if y < .25: m = max(0, min(1, (.25 - y) / .3)); c = [c[i] * (1 - m) + SD[2][i] * .8 * m for i in range(3)]
        return tuple(c)
    terrain('bath.sand', -120, 120, -60, 60, 160, lambda x, z: h(x, z) if z > -40 else h(x, z) - (-40 - z) * .1, col)
    box('prom.wall', (0, 2.2, 47), (240, 1.6, 1.2), mat('stone', '#d8d0c0', .85), bev=.04)
    box('prom.walk', (0, 3.05, 52), (240, .1, 9), mat('pave', '#c8c0b0', .85), bev=0)
    for k in range(60): cyl(f'rail{k}', (-118 + k * 4, 3.5, 47.6), .035, .9, mat('paint', '#2f5d7a', .5), verts=8)
    box('prom.rail', (0, 3.95, 47.6), (240, .06, .06), mat('paint', '#2f5d7a', .5), bev=0)
    rr = random.Random(6); ST = ['#f4ecdc', '#f2e0c8', '#e8f0f2', '#f6e6d6', '#f0e4ec']
    for i in range(16):
        x = -75 + i * 10
        house(f'hot{i}', x, 61, 9.8, 9, floors=4, fh=3.0, plaster=rr.choice(ST), roof=rr.choice(['#4a5a6a', '#5a4a4a']), trim='#ffffff', door_col='#2f5d7a',
              shutters=rr.choice(['#2f6a8a', '#3f8a6a', None]), facing=-1, seed=200 + i, chimney=True)
        for f in (1, 2):
            box(f'bal{i}{f}', (x, f * 3.0 + .1 + 3.0, 56.4), (8.4, .1, .8), mat('paint', '#ffffff', .5), bev=.01)
            for k in range(14): cyl(f'balr{i}{f}{k}', (x - 4 + k * .6, f * 3 + 3.5, 56.05), .02, .8, mat('paint', '#2f5d7a', .5), verts=6)
    # pier
    for k in range(30):
        for s in (-1, 1): cyl(f'pleg{k}{s}', (60 + s * 2.4, 1.2, 40 - k * 4), .18, 6.0, mat('metal', '#4a4a52', .5, .6), verts=10)
    box('pier.deck', (60, 4.3, -18), (6, .25, 120), mat('plank', '#9a7a52', .7), bev=.02)
    for s in (-1, 1): box(f'pier.rail{s}', (60 + s * 3, 4.9, -18), (.08, .08, 120), mat('paint', '#f4f0e6', .5), bev=0)
    box('pier.pav', (60, 6.4, -76), (12, 4, 8), mat('paint', '#f4ecdc', .6), bev=.05); cyl('pier.dome', (60, 9.0, -76), 3.2, 2.2, mat('roof', '#2f6a5a', .6), verts=24, r2=.4)
    for k in range(12): cyl(f'flag{k}', (60 + (k % 2) * 6 - 3, 6.5, 30 - k * 10), .03, 3.0, mat('paint', '#f4f0e6', .5), verts=6) if k % 2 == 0 else None
    for i in range(8):   # boats on the sand / in the shallows
        x = -60 + i * 9 + rr.uniform(-2, 2); z = rr.choice([-6, 2, 8])
        blob(f'boat{i}', (x, h(x, z) + .3, z), 1.0, mat('paint', rr.choice(['#2f6a8a', '#c43d33', '#f4ecdc', '#3f8a5a']), .5), sc=(2.4, .45, .8), sub=2, rough=0, seed=i)
    for i in range(40): rock(f'peb{i}', (rr.uniform(-80, 80), 0, rr.uniform(-8, 30)), rr.uniform(.08, .25), mat('stone', rr.choice(['#a8a090', '#8a8478', '#c8c0b0']), .85), seed=i)
    for i in range(10):   # background row of parked machines up the beach
        machine(f'bm{i}', -40 + i * 5.2, h(-40 + i * 5.2, 30), 30, stripes=['#c43d33', '#2f6a9a', '#3f8a5a', '#d8a030'][i % 4], rot=0, hood=False)


def machine(name, x, y, z, stripes='#c43d33', rot=0.0, hood=True):
    """bathing machine (body ~2.2 x 1.8 x 2.4 m on four big wheels): plank walls with painted stripes, pitched roof,
    door + steps at each end, small window, flag pole; optional canvas modesty hood (anim:hood) at the sea end"""
    wood = mat('plank', '#f4ecdc', .7); st = mat('paint', stripes, .5)
    def P(dx, dy, dz):  # local -> world with yaw
        c, s = math.cos(rot), math.sin(rot); return (x + dx * c + dz * s, y + dy, z - dx * s + dz * c)
    box(f'{name}.body', P(0, 1.95, 0), (2.2, 2.0, 1.8), wood, bev=.04, rot=(0, rot, 0))
    for k in range(5): box(f'{name}.stripe{k}', P(-.88 + k * .44, 1.95, 0), (.22, 2.0, 1.82), st, bev=0, rot=(0, rot, 0))
    box(f'{name}.roof', P(0, 3.05, 0), (2.4, .12, 2.0), mat('roof', '#4a4a52', .8), bev=.03, rot=(0, rot, 0))
    box(f'{name}.ridge', P(0, 3.25, 0), (2.4, .3, .9), mat('roof', '#4a4a52', .8), bev=.05, rot=(0, rot, 0))
    for e in (-1, 1):
        box(f'{name}.door{e}', P(e * 1.105, 1.8, 0), (.03, 1.5, .8), mat('plank', '#5a3a22', .6), bev=.01, rot=(0, rot, 0))
        for k in range(3): box(f'{name}.step{e}{k}', P(e * (1.25 + k * .22), .85 - k * .25, 0), (.24, .06, .7), mat('plank', '#8a6a46', .7), bev=.01, rot=(0, rot, 0))
    box(f'{name}.win', P(0, 2.4, .905), (.4, .3, .02), mat('glass', '#9fb8c4', .1), bev=0, rot=(0, rot, 0))
    for wx in (-.75, .75):
        for wz in (-1, 1):
            cyl(f'{name}.wheel{wx}{wz}', P(wx, .62, wz * .98), .62, .1, mat('plank', '#5a3a22', .6), axis='z', verts=24)
            cyl(f'{name}.hub{wx}{wz}', P(wx, .62, wz * 1.04), .1, .06, mat('metal', '#2a2a2e', .4, .6), axis='z', verts=12)
    box(f'{name}.axle', P(0, .62, 0), (1.6, .1, 2.0), mat('metal', '#2a2a2e', .4, .6), bev=.01, rot=(0, rot, 0))
    cyl(f'{name}.pole', P(.9, 3.8, .7), .025, 1.4, mat('plank', '#5a3a22', .6), verts=6)
    if hood:
        for k in range(4):
            box(f'anim:hood.h{k}', P(-1.3 - k * .45, 2.2, 0), (.04, 1.8 - k * .1, 1.9), mat('fabric', '#f4f0e6', .9), bev=0, rot=(0, rot, 0))
        box('anim:hood.top', P(-1.95, 3.1, 0), (1.5, .03, 1.9), mat('fabric', '#f4f0e6', .9), bev=0, rot=(0, rot, 0)) if name == 'hero' else None


def bath_props():
    machine('hero', 0, 0, 0, stripes='#e05a4a')
    box('anim:flag', (.9, 4.4, .7), (.5, .32, .02), mat('fabric', '#2f6a9a', .9), bev=0)
    horse()


def horse():
    """stylised draught horse (~1.6 m at the shoulder) facing +x, standing at local x=3.6; legs anim:leg{k} (pivot at
    the hip/shoulder thanks to the bounds-centre origin -> we offset them so the swing reads), tail, harness + traces"""
    hx = 3.8; m = mat('paint', '#8a5a36', .6); dk = mat('paint', '#3a2618', .6)
    blob('anim:horse.body', (hx, 1.45, 0), .9, m, sc=(1.45, .62, .55), sub=3, rough=.02, seed=2)
    blob('anim:horse.neck', (hx + 1.05, 1.95, 0), .5, m, sc=(.6, 1.0, .45), sub=2, rough=.02, seed=3)
    blob('anim:horse.head', (hx + 1.45, 2.3, 0), .38, m, sc=(1.25, .6, .55), sub=2, rough=.02, seed=4)
    for s in (-1, 1):
        blob(f'anim:horse.ear{s}', (hx + 1.3, 2.62, s * .1), .07, m, sc=(.6, 1.6, .5), sub=1, rough=0)
        sphere(f'anim:horse.eye{s}', (hx + 1.62, 2.38, s * .19), .045, dk)
    blob('anim:horse.mane', (hx + .95, 2.15, 0), .35, dk, sc=(.9, 1.1, .2), sub=2, rough=.15, seed=5)
    blob('anim:horse.tail', (hx - 1.35, 1.35, 0), .25, dk, sc=(.5, 1.4, .3), sub=2, rough=.2, seed=6)
    for k, (lx, lz) in enumerate([(.85, .25), (.85, -.25), (-.85, .25), (-.85, -.25)]):
        cyl(f'anim:leg{k}', (hx + lx, .55, lz), .11, 1.1, m, verts=10)
        cyl(f'anim:leg{k}.hoof', (hx + lx, .05, lz), .14, .12, dk, verts=10)
    box('anim:horse.collar', (hx + .85, 1.75, 0), (.25, .7, .75), mat('fabric', '#5a2a1e', .8), bev=.08)
    for s in (-1, 1): tube(f'trace{s}', [(hx + .8, 1.5, s * .45), (2.3, 1.2, s * .7), (1.15, 1.0, s * .8)], .025, mat('fabric', '#3a2618', .8), verts=6)


# ------------------------------------------------------------------------------------------------ spit
def spit_kitchen():
    """Georgian kitchen: flagstone floor, whitewashed walls, oak beams, a big brick hearth (x=0, back wall z=-3.4) with
    a log fire, firedogs, the spit and roast (props), the dog wheel high on the right wall beside the chimney breast;
    copper pans, dresser with plates, scrubbed table with vegetables and bread, baskets, hanging herbs, window"""
    W, D, H = 9.0, 7.0, 4.2; x0, x1, z0, z1 = -W / 2, W / 2, -D / 2, D / 2
    stone_floor(x0, x1, z0, z1, base='#9a8e7e', name='kfloor', s=.6)
    ws = [window('kw', (x0, z1), (x0, z0), 2.5, 1.1, 1.3, 1.8, bars=(2, 3), frame='#e8e0cc')]
    for (a, b, op) in [((x0, z0), (x1, z0), ()), ((x0, z1), (x0, z0), ws), ((x1, z0), (x1, z1), ())]:
        brick_wall('kwall', a, b, H, base='#ece4d0', surf='plaster', openings=op)
    box('kceil', (0, H + .05, 0), (W, .1, D), mat('plaster', '#efe6d2', .9), bev=0)
    for k in range(5): box(f'beam{k}', (x0 + .9 + k * 1.8, H - .14, 0), (.26, .28, D), mat('bark', '#4a3122', .8), bev=.02)
    # hearth: brick chimney breast with a wide arched opening
    BR = '#a85a3c'
    box('hearth.l', (-1.95, 1.3, z0 + .55), (.7, 2.6, 1.1), mat('brick', BR, .9), bev=.02)
    box('hearth.r', (1.95, 1.3, z0 + .55), (.7, 2.6, 1.1), mat('brick', BR, .9), bev=.02)
    box('hearth.lintel', (0, 2.85, z0 + .55), (4.6, .6, 1.1), mat('brick', BR, .9), bev=.02)
    box('hearth.breast', (0, 3.6, z0 + .45), (4.6, 1.3, .9), mat('brick', BR, .9), bev=.02)
    box('hearth.back', (0, 1.3, z0 + .12), (3.2, 2.6, .2), mat('brick', '#5a3226', .95), bev=0)
    box('hearth.floor', (0, .06, z0 + .7), (3.4, .12, 1.3), mat('stone', '#6a625a', .9), bev=.02)
    box('mantel', (0, 3.2, z0 + 1.1), (4.9, .12, .3), mat('plank', '#5a3018', .6), bev=.02)
    for k in range(5): cyl(f'mant.pot{k}', (-1.8 + k * .9, 3.42, z0 + 1.1), .11, .3, mat('metal', '#c87a4a', .3, .8), verts=16)
    for k in range(6):   # logs
        cyl(f'log{k}', (-.6 + k * .24, .22 + (k % 2) * .12, z0 + .55 + (k % 3) * .1), .1, 1.0, mat('bark', '#4a3122', .9), axis='x', verts=10)
    for s in (-1, 1):
        cyl(f'firedog{s}', (s * 1.1, .5, z0 + 1.15), .04, 1.0, mat('metal', '#2a2a2e', .4, .6), verts=8)
        box(f'firedog.hook{s}', (s * 1.1, .98, z0 + 1.18), (.08, .1, .12), mat('metal', '#2a2a2e', .4, .6), bev=.01)
    # dresser with plates, table with veg/bread, baskets, hanging herbs and pans
    box('dresser', (x1 - .35, 1.0, -1.2), (.5, 2.0, 2.0), mat('plank', '#6a3a1e', .6), bev=.02)
    for r in range(3):
        for k in range(5): cyl(f'plate{r}{k}', (x1 - .45, 1.35 + r * .38, -2.0 + k * .4), .16, .02, mat('paint', '#e8ecf2', .3), axis='x', verts=20)
    table('ktable', -1.6, 1.6, 2.4, 1.0, h=.8, top='#c8a878')
    rr = random.Random(2)
    for k in range(10): sphere(f'veg{k}', (-2.4 + rr.uniform(0, 1.6), .87, 1.4 + rr.uniform(0, .4)), rr.uniform(.05, .08), mat('paint', rr.choice(['#e07a2a', '#c8402a', '#7a9a3a', '#e8d8a0', '#8a3a7a']), .5))
    blob('bread', (-.6, .9, 1.6), .14, mat('paint', '#c8843a', .6), sc=(1.6, .7, 1), sub=2, rough=.05)
    for k in range(3): cyl(f'basket{k}', (x0 + .6 + k * .6, .2, 2.8), .25, .35, mat('plank', '#b08a5a', .8), verts=16, r2=.3)
    for k in range(7):
        x = -3.6 + k * .7
        tube(f'hook{k}', [(x, H - .28, 1.2), (x, H - .6, 1.2)], .01, mat('metal', '#2a2a2e', .4, .6), verts=4)
        cyl(f'pan{k}', (x, H - .85, 1.2), .16 + (k % 3) * .04, .06, mat('metal', '#c87a4a', .25, .85), axis='z', verts=20)
    for k in range(6): blob(f'herb{k}', (2.2 + k * .25, H - .5, 2.4), .1, mat('leaf', '#6a8a3a', .8), sc=(.6, 1.4, .6), sub=1, rough=.3, seed=k)
    lantern('klamp', (-3.0, 2.4, -2.6), lit=1.8)


def spit_props():
    """the mechanism, world-placed to the kitchen: dog wheel (1.0 m dia, 0.35 m wide) high on the right of the hearth at
    (2.9, 2.6, -2.7) turning about x; its axle pulley; a chain belt down to the spit pulley at (2.0, 1.15, -2.4); the spit
    (iron rod along x at y=1.15) through the roast; everything anim so the shots couple their rotations"""
    wood = mat('plank', '#7a5032', .6); iron = mat('metal', '#2a2a2e', .4, .7)
    WX, WY, WZ, R = 2.95, 2.75, -2.75, .55
    for k in range(16):    # tread slats
        a = k / 16 * 6.283
        box(f'anim:wheel.s{k}', (WX, WY + math.sin(a) * R, WZ + math.cos(a) * R), (.4, .05, .2), wood, bev=.005, rot=(-a, 0, 0))
    for s in (-1, 1):
        for k in range(24):
            a = k / 24 * 6.283; b = (k + 1) / 24 * 6.283
            box(f'anim:wheel.rim{s}{k}', (WX + s * .2, WY + math.sin((a + b) / 2) * (R + .03), WZ + math.cos((a + b) / 2) * (R + .03)), (.04, .06, R * .27), wood, bev=0, rot=(-(a + b) / 2, 0, 0))
        for k in range(4): box(f'anim:wheel.spoke{s}{k}', (WX + s * .2, WY, WZ), (.03, R * 2, .04), wood, bev=0, rot=(k * .785, 0, 0))
    cyl('anim:wheel.axle', (WX, WY, WZ), .04, .7, iron, axis='x', verts=10)
    cyl('anim:wheel.pulley', (WX - .38, WY, WZ), .14, .05, iron, axis='x', verts=24)
    box('wheel.bracket', (WX + .38, WY, WZ), (.06, .2, .2), iron, bev=.01)
    box('wheel.wallpost', (WX + .45, WY - .3, WZ), (.08, 1.4, .1), mat('bark', '#4a3122', .8), bev=.01)
    SX, SY, SZ = 0.0, 1.15, -2.3
    cyl('anim:spit.rod', (SX + .3, SY, SZ), .02, 5.2, iron, axis='x', verts=8)
    blob('anim:spit.roast', (SX, SY, SZ), .3, mat('paint', '#a8542a', .45), sc=(1.6, .85, .85), sub=3, rough=.06, seed=4)
    for k in range(4): blob(f'anim:spit.fat{k}', (SX - .3 + k * .2, SY + .2, SZ + .1), .06, mat('paint', '#e8b070', .3), sc=(1.2, .5, 1), sub=1, rough=0)
    cyl('anim:spit.pulley', (WX - .38, SY, SZ), .16, .05, iron, axis='x', verts=24)
    box('anim:spit.crank', (SX + 1.85, SY, SZ + .06), (.03, .03, .14), iron, bev=0)
    # chain: two straight runs between the pulleys (link boxes), drawn separately so the shots can scroll them
    for side in (-1, 1):
        y0, z0_ = WY, WZ + side * .14; y1, z1_ = SY, SZ + side * .16
        n = 22
        for k in range(n):
            u = (k + .5) / n
            box(f'anim:chain{"a" if side < 0 else "b"}.l{k}', (WX - .38, y0 + (y1 - y0) * u, z0_ + (z1_ - z0_) * u), (.02, .06, .025), iron, bev=0)
    turnspit_dog()


def turnspit_dog():
    """stylised turnspit: long body, short crooked legs (anim:dleg{k}), big ears, curled tail, ginger-and-white coat;
    sized to stand inside the wheel (local origin at the wheel bottom)"""
    WX, WY, WZ = 2.95, 2.75 - .52, -2.75
    c = mat('paint', '#c8843a', .6); w = mat('paint', '#f2e8d8', .6); dk = mat('paint', '#2a1e18', .5)
    blob('anim:dog.body', (WX, WY + .22, WZ), .2, c, sc=(.7, .65, 1.6), sub=3, rough=.02, seed=7)
    blob('anim:dog.belly', (WX, WY + .17, WZ), .16, w, sc=(.6, .5, 1.4), sub=2, rough=0, seed=8)
    blob('anim:dog.head', (WX, WY + .37, WZ + .32), .12, c, sc=(.95, .9, 1.1), sub=2, rough=0, seed=9)
    blob('anim:dog.snout', (WX, WY + .33, WZ + .43), .06, w, sc=(.8, .7, 1.1), sub=1, rough=0)
    sphere('anim:dog.nose', (WX, WY + .35, WZ + .49), .02, dk)
    for s in (-1, 1):
        sphere(f'anim:dog.eye{s}', (WX + s * .05, WY + .41, WZ + .42), .016, dk)
        blob(f'anim:dog.ear{s}', (WX + s * .1, WY + .4, WZ + .3), .06, mat('paint', '#8a5426', .6), sc=(.4, 1.2, .8), sub=1, rough=0, seed=s + 20)
    blob('anim:dog.tail', (WX, WY + .38, WZ - .32), .05, c, sc=(.5, 1.6, .5), sub=1, rough=0, seed=12)
    for k, (dx, dz) in enumerate([(.08, .2), (-.08, .2), (.08, -.2), (-.08, -.2)]):
        cyl(f'anim:dleg{k}', (WX + dx, WY + .07, WZ + dz), .035, .14, c, verts=8)


# ------------------------------------------------------------------------------------------------ lick
def lick_market():
    """Victorian London street market: cobbled street, flagstone pavements with kerbs, three-storey brick shopfronts with
    painted fascias and striped awnings on both sides, market stalls (trestles, crates of fruit and veg, striped
    canopies), gas lamps, flower baskets, a pub corner, distant church spire"""
    cobbles([(-45, 0), (45, 0)], 8, base='#7a7068', name='mroad', s=.22)
    for s in (-1, 1):
        stone_floor(-45, 45, s * 4 if s > 0 else -7, 7 if s > 0 else -4, base='#9a948a', name=f'mpave{s}')
        box(f'mkerb{s}', (0, .06, s * 4.05), (90, .14, .22), mat('stone', '#aaa498', .85), bev=.02)
    rr = random.Random(12); BR = ['#9a4a34', '#a85a3c', '#8e4230', '#b0603f', '#7a3a2a']; SH = ['#2f5d4f', '#7a2a2a', '#2f4f7a', '#5a3a6a', '#3a6a3a', '#a8682a']
    for s in (-1, 1):
        for i in range(11):
            x = -40 + i * 8
            house(f'm{s}{i}', x, s * 11.2, 7.8, 8, floors=3, fh=3.0, col=rr.choice(BR), roof='#4a4a52', trim='#efe6d2', door_col=rr.choice(SH), facing=-s,
                  shop=rr.choice(SH), sign=rr.choice(['#c43d33', '#2f6a9a', '#3f8a5a', '#d8a030']), seed=300 + i + (s > 0) * 20)
        for k in range(8): lantern(f'mlamp{s}{k}', (-35 + k * 10, 0, s * 4.4), lit=2.2, post=3.4)
    for i in range(7):   # stalls along the north kerb
        x = -27 + i * 9; cs = rr.choice(['#c43d33', '#2f6a9a', '#3f8a5a', '#d8a030'])
        box(f'st{i}.top', (x, .85, -2.4), (2.6, .08, 1.2), mat('plank', '#8a6a46', .7), bev=.01)
        for dx in (-1.2, 1.2):
            for dz in (-.55, .55): cyl(f'st{i}.leg{dx}{dz}', (x + dx, .42, -2.4 + dz), .03, .85, mat('plank', '#6a4a2e', .7), verts=6)
        for dx in (-1.3, 1.3): cyl(f'st{i}.pole{dx}', (x + dx, 1.4, -1.85), .03, 2.8, mat('plank', '#6a4a2e', .7), verts=6)
        for k in range(6): box(f'st{i}.can{k}', (x - 1.1 + k * .44 + .22, 2.75, -2.4), (.44, .04, 1.5), mat('fabric', cs if k % 2 == 0 else '#f4f0e6', .9), bev=0, rot=(.22, 0, 0))
        for k in range(4):
            box(f'st{i}.crate{k}', (x - .9 + k * .6, .98, -2.4), (.5, .2, .9), mat('plank', '#b08a5a', .8), bev=.01)
            fc = rr.choice(['#e0402a', '#f2a030', '#7aa83a', '#e8d84a', '#8a3a7a'])
            for j in range(8): sphere(f'st{i}.fr{k}{j}', (x - 1.05 + k * .6 + (j % 4) * .1, 1.13, -2.75 + (j // 4) * .2 + rr.uniform(0, .5)), .055, mat('paint', fc, .45))
    for i in range(10): flowerpot(f'mfp{i}', -38 + i * 8.4, 0, -4.4, col='#a85a3a', fl=rr.choice(['#e8405a', '#f2d24a', '#c95a8f']))
    box('spire.tower', (6, 14, -60), (5, 28, 5), mat('stone', '#c8c0b0', .85), bev=.05); cyl('spire.top', (6, 33, -60), 3.2, 10, mat('roof', '#4a5a6a', .8), verts=8, r2=.05)


def lick_props():
    """barrow: two big wheels, painted cart body with a lid and the ice-cream tub, legs, handles, a row of penny licks;
    glass: the hero penny lick at 5x scale for macro shots (thick base, shallow dip, a small dome of ice cream)"""
    p = mat('paint', '#2f6a5a', .45); gold = mat('paint', '#e8c84a', .4)
    box('bar.body', (0, .95, 0), (1.6, .7, .9), p, bev=.04); box('bar.trim', (0, 1.32, 0), (1.66, .06, .96), gold, bev=.01)
    cyl('bar.tub', (-.3, 1.42, 0), .28, .25, mat('metal', '#c8ccd0', .25, .85), verts=24); cyl('bar.lid', (.35, 1.4, 0), .26, .06, mat('brass', '#c9a24a', .3, .85), verts=24)
    for s in (-1, 1): cyl(f'bar.wheel{s}', (.2, .6, s * .55), .6, .07, mat('paint', '#c43d33', .5), axis='z', verts=28)
    for s in (-1, 1): tube(f'bar.handle{s}', [(-.8, 1.1, s * .35), (-1.6, 1.0, s * .38)], .025, mat('plank', '#6a4a2e', .7), verts=6)
    cyl('bar.leg', (-.7, .4, 0), .03, .8, mat('plank', '#6a4a2e', .7), verts=6)
    for k in range(6): glass(f'bar.g{k}', .55 - k * .2, 1.33, .3, s=1.0)
    glass('anim:hero', 0, 0, 0, s=5.0, scoop=True)


def glass(name, x, y, z, s=1.0, scoop=False):
    """penny lick: a thick, heavy glass ~7 cm tall — conical foot, thick stem, and a shallow dish on top"""
    g = mat('glass', '#d8ecf0', .04); x0 = s
    cyl(f'{name}.foot', (x, y + .006 * x0, z), .032 * x0, .012 * x0, g, verts=28, r2=.028 * x0)
    cyl(f'{name}.stem', (x, y + .03 * x0, z), .018 * x0, .04 * x0, g, verts=24, r2=.024 * x0)
    cyl(f'{name}.bowl', (x, y + .06 * x0, z), .036 * x0, .022 * x0, g, verts=32, r2=.03 * x0)
    cyl(f'{name}.dip', (x, y + .071 * x0, z), .022 * x0, .002 * x0, mat('glass', '#b8d8e0', .04), verts=24)
    if scoop: blob(f'{name}.ice', (x, y + .078 * x0, z), .02 * x0, mat('paint', '#f6e8c8', .6), sc=(1.0, .55, 1.0), sub=3, rough=.08, seed=3)


def main():
    if FILM5 == 'knock':
        build_set(OUT / 'street.glb', 'street', knock_street); build_set(OUT / 'bedroom.glb', 'bedroom', knock_bedroom)
    if FILM5 == 'pigcam':
        build_set(OUT / 'town.glb', 'town', pig_town); build_set(OUT / 'shop.glb', 'shop', pig_shop); build_set(OUT / 'camera.glb', 'camera', pig_camera, joinable=True)
    if FILM5 == 'bath':
        build_set(OUT / 'beach.glb', 'beach', bath_beach); build_set(OUT / 'machine.glb', 'machine', bath_props, joinable=True)
    if FILM5 == 'spit':
        build_set(OUT / 'kitchen.glb', 'kitchen', spit_kitchen); build_set(OUT / 'mech.glb', 'mech', spit_props, joinable=True)
    if FILM5 == 'lick':
        build_set(OUT / 'market.glb', 'market', lick_market); build_set(OUT / 'barrow.glb', 'barrow', lick_props, joinable=True)
    print('ALL ASSETS DONE')


guarded(main)
