"""YunoWorld v9 — "Britain's Giant Concrete EARS" (the Denge sound mirrors, 1920s–30s). Blender sets + props.
Run: blender -b --factory-startup -P scripts/yw9/ears_sets.py  → public/yw9-ears/*.glb + grass json
Sets: denge (shingle spit between flooded gravel pits at Dungeness, the 20 ft and 30 ft dishes and the 200 ft curved wall,
microphone pole, listening chamber, causeway), lab (Dr Tucker's 1920s acoustics lab with chalkboard and gramophone horn),
hut (inside the listening chamber: headphones, stethoscope tubes, dials, logbook), radar (Chain Home lattice masts at dusk).
Props: plane (biplane bomber), waves (sound-wave arcs, anim), mic (microphone on a swinging arm).
Sea plane is the engine's (y=0): the terrain dips below 0 for the lakes and the Channel.
"""
import sys, math, random
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from kit9 import *  # noqa
import kit9

OUT = kit9.ROOT / 'public/yw9-ears'
reset()
CON = '#c9c2b2'


def con(c=CON, r=.9): return mat('concrete', c, r)


def dish(name, cx, cy, cz, D, depth, t=.35, m=None, seg=28, ring=10):
    """concave spherical cap of rim diameter D, opening toward -z, with thickness t and a rim face. (cx,cy,cz) = rim centre"""
    m = m or con(); a = D / 2; R = (a * a + depth * depth) / (2 * depth); th = math.asin(min(1, a / R))
    C = (cx, cy, cz - R + depth)          # sphere centre sits seaward of the dish; the deepest point is at cz + depth
    bm = bmesh.new(); inner = []; outer = []
    for i in range(ring + 1):
        tt = th * i / ring; ri = []; ro = []
        for j in range(seg):
            ph = 2 * math.pi * j / seg; d = (math.sin(tt) * math.cos(ph), math.sin(tt) * math.sin(ph), math.cos(tt))
            ri.append(bm.verts.new(L(C[0] + R * d[0], C[1] + R * d[1], C[2] + R * d[2])))
            ro.append(bm.verts.new(L(C[0] + (R + t) * d[0], C[1] + (R + t) * d[1], C[2] + (R + t) * d[2])))
            if i == 0: break
        inner.append(ri); outer.append(ro)
    for i in range(ring):
        for j in range(seg):
            jn = (j + 1) % seg
            if i == 0:
                bm.faces.new((inner[0][0], inner[1][jn], inner[1][j])); bm.faces.new((outer[0][0], outer[1][j], outer[1][jn]))
            else:
                bm.faces.new((inner[i][j], inner[i][jn], inner[i + 1][jn], inner[i + 1][j]))
                bm.faces.new((outer[i][j], outer[i + 1][j], outer[i + 1][jn], outer[i][jn]))
    for j in range(seg):
        jn = (j + 1) % seg; bm.faces.new((inner[ring][j], outer[ring][j], outer[ring][jn], inner[ring][jn]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    for f in me.polygons: f.use_smooth = True
    o = kit9._obj(name, me); o.data.materials.append(m); return o


def mirror20(x, z):
    """20 ft mirror: dish set into a squat inclined concrete block on a plinth, facing the sea (-z)"""
    box('m20.plinth', (x, .4, z + 1.2), (8.0, .8, 5.0), con('#bdb5a4'), bev=.05)
    box('m20.block', (x, 3.6, z + 1.6), (7.4, 5.8, 3.2), con(), bev=.06, rot=(.18, 0, 0))
    for s in (-1, 1): box(f'm20.wing{s}', (x + s * 3.9, 2.4, z + 1.8), (.6, 3.6, 3.6), con('#c2bba9'), bev=.04, rot=(.18, 0, 0), taper=.25)
    dish('m20.dish', x, 3.9, z - .05, 6.1, 1.3, m=con('#d4cdbd'))
    tube('m20.pipe', [(x, 3.9, z + 1.2), (x, 1.0, z + 2.6), (x, .3, z + 3.6)], .06, mat('metal', '#5a5e62', .5, .6))


def mirror30(x, z):
    """30 ft mirror: tall dish in a vertical slab braced by sloping buttresses, a forecourt where the trumpet stood"""
    box('m30.slab', (x, 5.2, z + .8), (11.0, 10.4, 1.8), con(), bev=.06)
    for k, s in enumerate((-1, -.35, .35, 1)):
        box(f'm30.butt{k}', (x + s * 5.0, 3.0, z + 3.2), (.7, 6.0, 4.0), con('#c2bba9'), bev=.04, rot=(-.55, 0, 0), taper=.6)
    dish('m30.dish', x, 5.6, z - .1, 9.1, 1.7, m=con('#d4cdbd'))
    box('m30.court', (x, .1, z - 3.0), (10.0, .2, 5.0), con('#b8b09f'), bev=.03)
    cyl('m30.post', (x, 2.2, z - 4.4), .07, 4.4, mat('metal', '#4f5458', .5, .6), verts=10)
    box('m30.ladder', (x + .9, 4.0, z + .1), (.5, 7.0, .06), mat('metal', '#6a6e72', .5, .6), bev=.01)


def wall200(x, z):
    """200 ft (61 m) mirror: a long vertical concrete wall curved in plan and slightly in section, on a sloping forecourt,
    with end wings, the listening room under the middle, and the microphone pole on the forecourt at the focus"""
    Rr, span, Hh = 46.0, 61.0, 8.0; th = span / Rr; n = 30; cz = z - Rr + 3.0
    for i in range(n):
        a = -th / 2 + th * (i + .5) / n; px, pz = x + math.sin(a) * Rr, cz + math.cos(a) * Rr
        box(f'w200.seg{i}', (px, Hh / 2, pz), (span / n + .08, Hh, 1.0), con('#cfc8b8' if i % 2 else '#c9c2b2'), bev=.02, rot=(.09, -a, 0))
        box(f'w200.cap{i}', (px, Hh + .1, pz + .1), (span / n + .1, .25, 1.3), con('#bdb5a4'), bev=.02, rot=(0, -a, 0))
        if i % 3 == 0: box(f'w200.rib{i}', (x + math.sin(a) * (Rr + 1.6), 2.6, cz + math.cos(a) * (Rr + 1.6)), (.5, 5.2, 2.6), con('#bfb8a7'), bev=.03, rot=(-.35, -a, 0), taper=.5)
    for s in (-1, 1):
        a = s * th / 2; px, pz = x + math.sin(a) * Rr, cz + math.cos(a) * Rr
        box(f'w200.wing{s}', (px + s * 1.2, Hh / 2 - .5, pz - 2.0), (1.0, Hh - 1, 4.5), con(), bev=.04, rot=(0, -a + s * .35, 0))
    box('w200.court', (x, .05, z - 5.5), (58.0, .1, 11.0), con('#b8b09f'), bev=0)
    box('w200.room', (x, 1.2, z + 3.6), (5.0, 2.4, 3.0), con('#bdb5a4'), bev=.04)
    box('w200.door', (x, 1.0, z + 2.08), (.95, 1.9, .06), mat('paint', '#3f5a48', .6), bev=.01)
    cyl('w200.pole', (x, 1.6, z - 9.0), .06, 3.2, mat('metal', '#4f5458', .5, .6), verts=10)
    cyl('w200.mic', (x, 3.25, z - 9.0), .16, .3, mat('metal', '#2e3236', .3, .8), verts=16, axis='z')


def denge():
    rr = random.Random(4)
    lakes = [(-30, -6, 16, 9), (32, -2, 18, 10), (0, -46, 60, 16)]     # (x, z, rx, rz) flooded pits + the shore line south
    def h(x, z):
        y = .9 + fbm(x, z, .05, 3, 3) * .35 + math.sin(x * .9 + z * .2) * .05      # shingle ridges
        for (lx, lz, rx, rz) in lakes:
            d = math.hypot((x - lx) / rx, (z - lz) / rz)
            if d < 1.6: k = max(0, min(1, (1.6 - d) / .6)); y = y * (1 - k) + (-1.4) * k
        if z < -60: y = min(y, -2.0 + (z + 60) * .05)                                  # the Channel
        return y
    S = [rgb('#b9ad97'), rgb('#9c917f'), rgb('#cfc4ae'), rgb('#7d8f5a'), rgb('#a3ad6a')]
    def col(x, z, y, slope):
        n = fbm(x, z, .3, 2, 5); c = S[0] if n > .1 else S[1] if n < -.2 else S[2]
        v = fbm(x, z, .04, 3, 9)
        if v > .05 and y > .8: k = min(1, (v - .05) * 3); c = [c[i] * (1 - k) + S[3 + (v > .3)][i] * k for i in range(3)]   # marsh grass
        if y < .2: c = [c[i] * .7 for i in range(3)]
        return tuple(c)
    terrain('denge.ground', -140, 140, -120, 120, 190, h, col, flat=[(-22, 18, 8, .9), (4, 20, 8, .9), (0, 34, 34, .9)])
    mirror20(-22, 18); mirror30(4, 20); wall200(0, 40)
    for i in range(3): box(f'causeway{i}', (-8 + i * 8, .95, 8 - i * 4), (3, .2, 12), mat('stone', '#a69c8a', .85), bev=.03, rot=(0, .3 * i, 0))
    house('keeperhut', 26, 26, 4.5, 3.5, floors=1, fh=2.6, plaster='#d8d2c4', roof='#5a5a5e', trim='#efe6d2', door_col='#3f5a48', seed=8, chimney=True)
    fence('wire', [(-60, 2), (-30, 6), (0, 6), (30, 5), (60, 2)], h=1.0, col='#7a6a52', gap=3.0)
    for i in range(40):
        x, z = rr.uniform(-110, 110), rr.uniform(-40, 110)
        if h(x, z) < .6 or (abs(x) < 36 and 10 < z < 50): continue
        bush(f'gorse{i}', x, z, h(x, z) - .05, r=rr.uniform(.5, 1.2), leaf=rr.choice(['#5f6f3a', '#6f7a3f', '#4f6a36']), seed=i, flowers=rr.choice([None, '#f2c43a', '#e9d24a']))
    for i in range(60):
        x, z = rr.uniform(-100, 100), rr.uniform(-50, 100)
        if h(x, z) < .5: continue
        rock(f'peb{i}', (x, h(x, z), z), rr.uniform(.15, .5), mat('stone', rr.choice(['#9a8f7c', '#b3a890', '#857a68']), .85), seed=i)
    g = []; fl = []
    for i in range(16000):
        x, z = rr.uniform(-60, 60), rr.uniform(-20, 70)
        y = h(x, z)
        if y < .5 or fbm(x, z, .04, 3, 9) < -.05: continue
        if (abs(x + 22) < 5 and 15 < z < 23) or (abs(x - 4) < 7 and 15 < z < 25) or (abs(x) < 32 and 28 < z < 46): continue
        c = col(x, z, y, 0); g.append([round(x, 2), round(y, 3), round(z, 2), *[round(v * 1.05, 3) for v in c], round(.5 + rr.random() * .5, 2)])
        if rr.random() < .03: fl.append([round(x, 2), round(y, 3), round(z, 2), rr.choice(['#f4ecd8', '#c98fd1', '#f2c43a'])])
    scatter_json(OUT / 'denge-grass.json', {'grass': g, 'flowers': fl})


def lab():
    """Dr William Sansome Tucker's acoustics lab, 1920s: brick walls, tall window, chalkboard (board), workbench with valves,
    a big brass gramophone horn, tuning forks, a model dish, oscillograph, stool, lamp"""
    W, D, H = 8.0, 6.5, 3.6; x0, x1, z0, z1 = -W / 2, W / 2, -D / 2, D / 2
    plank_floor(x0, x1, z0, z1, base='#7a5032', dark='#5a3820', name='lfloor')
    ws = [window('lw0', (x1, z0), (x1, z1), 3.2, .9, 1.4, 2.2, bars=(2, 4), frame='#e8e0cc')]
    brick_wall('l.back', (x0, z0), (x1, z0), H, base='#9a5a40'); brick_wall('l.left', (x0, z1), (x0, z0), H, base='#9a5a40')
    brick_wall('l.right', (x1, z0), (x1, z1), H, base='#9a5a40', openings=ws)
    box('l.ceiling', (0, H + .06, 0), (W, .12, D), mat('plaster', '#ece4d2', .9), bev=0)
    for k in range(4): box(f'l.joist{k}', (x0 + 1 + k * 2, H - .1, 0), (.18, .22, D), mat('plank', '#5a3a22', .7), bev=.01)
    box('chalkframe', (-.6, 2.0, z0 + .18), (4.4, 1.9, .06), mat('plank', '#5a3a22', .6), bev=.01)
    text_plane('chalk', (-.6, 2.0, z0 + .22), 4.2, 1.7, mat('board', '#24302a', .9))
    box('chalkledge', (-.6, 1.02, z0 + .26), (4.2, .05, .12), mat('plank', '#5a3a22', .6), bev=.005)
    table('bench', 1.6, -1.6, 2.6, .9, h=.9, top='#6a4022')
    m = mat('brass', '#c99a3a', .3, .85)
    tube('horn', [(1.0, 1.0, -1.6), (1.6, 1.2, -1.6), (2.1, 1.5, -1.6)], .05, m, r_end=.45)
    for k in range(5): cyl(f'fork{k}', (.4 + k * .16, 1.05, -1.25), .012, .28 - k * .03, mat('metal', '#c8ccd0', .25, .9), verts=6)
    for k in range(3):
        cyl(f'valve{k}', (2.4 + k * .2, 1.0, -1.9), .05, .16, mat('glass', '#d8e4ea', .1), verts=12)
        sphere(f'vglow{k}', (2.4 + k * .2, 1.02, -1.9), .025, mat('emit', '#ffb070', .2, emit=3.0))
    box('oscbox', (2.8, 1.15, -1.5), (.5, .45, .45), mat('plank', '#3a2a1e', .5), bev=.02)
    text_plane('oscscreen', (2.8, 1.2, -1.27), .26, .2, mat('screen', '#2a5a3a', .3))
    dish('modeldish', -2.6, 1.4, -1.4, .9, .22, t=.06, m=con('#d4cdbd'))
    cyl('modelstand', (-2.6, .5, -1.0), .05, 1.0, mat('plank', '#5a3a22', .6), verts=8)
    chair('lstool', 1.4, -.6, face=3.1, col='#5a3a22', seat='#5a3a22')
    desk_lamp('llamp', 2.9, .9, -1.95, shade='#2f5f4a', lit=4)
    bookshelf('lbooks', x0 + .3, 1.2, w=1.6, h=2.2, face=1.571, seed=7)


def hut():
    """the listening chamber: bare concrete, a sloping desk under a small slot window, a listener's chair, headphones on a
    hook, the stethoscope tubes and trumpet pipe coming through the wall, dials, logbook, clock, enamel mug, lamp"""
    W, D, H = 4.2, 3.4, 2.6; x0, x1, z0, z1 = -W / 2, W / 2, -D / 2, D / 2
    box('hfloor', (0, -.05, 0), (W, .1, D), con('#a8a090'), bev=0)
    for (p, s) in [((0, H / 2, z0), (W, H, .2)), ((x0, H / 2, 0), (.2, H, D)), ((x1, H / 2, 0), (.2, H, D)), ((0, H + .05, 0), (W, .2, D))]:
        box('hwall', p, s, con('#bdb6a6'), bev=0)
    box('hslot', (0, 1.75, z0 + .11), (1.6, .25, .02), mat('emit', '#eef2f4', .2, emit=1.8), bev=0)
    box('hdesk', (0, .95, z0 + .5), (2.6, .06, .7), mat('plank', '#7a5a3a', .6), bev=.01, rot=(.12, 0, 0))
    for s in (-1, 1): box(f'hdleg{s}', (s * 1.2, .47, z0 + .5), (.06, .94, .6), mat('plank', '#6a4a2e', .6), bev=.01)
    tube('hpipe', [(-.4, 2.6, z0 + .15), (-.4, 1.6, z0 + .2), (-.2, 1.15, z0 + .45)], .07, mat('metal', '#6a6e72', .45, .7))
    for k in range(2): tube(f'htube{k}', [(-.2, 1.15, z0 + .45), (.1 + k * .12, 1.1, z0 + .7), (.3 + k * .1, .99, z0 + .8)], .015, mat('rubber', '#3a2a22', .8))
    blob('anim:phones', (.45, 1.01, z0 + .75), .09, mat('rubber', '#2a2420', .6), sc=(1.4, .6, .9), sub=2, rough=0)
    for k in range(3):
        cyl(f'hdial{k}', (-1.0 + k * .32, 1.32, z0 + .22), .12, .04, mat('paint', '#f2ecdc', .4), axis='z', verts=24)
        box(f'anim:needle{k}', (-1.0 + k * .32, 1.36, z0 + .25), (.01, .09, .005), mat('paint', '#a8302a', .4), bev=0)
    box('hlog', (.0, .99, z0 + .6), (.36, .02, .26), mat('paper', '#efe6cf', .9), bev=.002, rot=(.12, .1, 0))
    cyl('hmug', (.9, 1.04, z0 + .55), .05, .1, mat('paint', '#e8e8e2', .3), verts=14)
    chair('hchair', 0, z0 + 1.25, face=3.14, col='#5a3a22', seat='#5a3a22')
    lantern('hlamp', (1.4, 2.2, z0 + .5), lit=2.0)
    cyl('hclock', (x1 - .11, 2.0, .4), .16, .04, mat('paint', '#f4ecd8', .5), axis='x', verts=28)


def radar():
    """Chain Home station at dusk: four steel lattice transmitter masts with cross-arms and curtain wires, wooden receiver
    towers, transmitter and receiver blocks, fence, fields"""
    def h(x, z): return fbm(x, z, .02, 3, 2) * 2.0
    G = [rgb('#4f7a3c'), rgb('#6f9a4a')]
    def col(x, z, y, s): k = max(0, min(1, .5 + fbm(x, z, .03, 2, 3))); return tuple(G[0][i] * (1 - k) + G[1][i] * k for i in range(3))
    terrain('radar.ground', -200, 200, -200, 200, 120, h, col, flat=[(0, 0, 70, 0.0)])
    m = mat('metal', '#7a7f84', .45, .6)
    for t in range(4):
        x = -45 + t * 30; Hh = 60.0
        for a in range(4):
            dx, dz = (a % 2 - .5) * 5, (a // 2 - .5) * 5
            tube(f'mast{t}.leg{a}', [(x + dx, 0, dz), (x + dx * .25, Hh, dz * .25)], .14, m, verts=6)
        for k in range(14):
            y0, y1 = k * Hh / 14, (k + 1) * Hh / 14; s0, s1 = 1 - .75 * y0 / Hh, 1 - .75 * y1 / Hh
            c0 = [((a % 2 - .5) * 5 * s0, (a // 2 - .5) * 5 * s0) for a in (0, 1, 3, 2)]; c1 = [((a % 2 - .5) * 5 * s1, (a // 2 - .5) * 5 * s1) for a in (0, 1, 3, 2)]
            for f in range(4):
                g = (f + 1) % 4; tube(f'mast{t}.x{k}{f}', [(x + c0[f][0], y0, c0[f][1]), (x + c1[g][0], y1, c1[g][1])], .05, m, verts=5)
                tube(f'mast{t}.h{k}{f}', [(x + c1[f][0], y1, c1[f][1]), (x + c1[g][0], y1, c1[g][1])], .04, m, verts=5)
        for y in (20, 35, 50): box(f'mast{t}.arm{y}', (x, y, 0), (.25, .25, 10), m, bev=.02)
        sphere(f'mast{t}.lamp', (x, Hh + .4, 0), .3, mat('emit', '#ff4a3a', .2, emit=4.0))
    for i in range(3):
        for y in (20, 35, 50): tube(f'curtain{i}{y}', [(-45 + i * 30, y - .4, 4.6), (-30 + i * 30, y - 2.2, 4.6), (-15 + i * 30, y - .4, 4.6)], .02, mat('metal', '#3a3e42', .5, .6), verts=4)
    for k, (x, z) in enumerate([(-20, 30), (10, 34)]):
        house(f'block{k}', x, z, 10, 6, floors=1, fh=3.4, plaster='#a8a294', roof='#6a6a6a', trim='#d8d2c4', door_col='#3f5a48', seed=40 + k, chimney=False, lit=1.2)
    fence('rfence', [(-70, -25), (70, -25), (70, 45), (-70, 45), (-70, -25)], h=1.6, col='#6a6e72', gap=3.5)
    rr = random.Random(5)
    for i in range(30):
        x, z = rr.uniform(-190, 190), rr.uniform(-190, 190)
        if abs(x) < 80 and abs(z) < 60: continue
        tree(f'rt{i}', x, z, h(x, z) - .1, h=rr.uniform(8, 13), r=rr.uniform(3, 4.5), seed=i + 70, leaf=rr.choice(['#3f6a34', '#4a7a3a']), leaf2='#8fba5a')


def props():
    """plane: 1920s biplane bomber; waves: sound-wave arcs (anim:wave.k) that travel toward the dish; mic: microphone"""
    plane_model('anim:bomber', (0, 0, 0), s=1.0, col='#6a7058')
    m = mat('emit', '#ffe7a8', .2, emit=1.6)
    for k in range(6):
        r = 2.0 + k * 1.6; n = 18
        pts = [(math.sin(-.9 + 1.8 * i / n) * r, 6 + math.cos(-.9 + 1.8 * i / n) * r * .5 - r * .5, -k * 1.6 - 4) for i in range(n + 1)]
        tube(f'anim:wave.w{k}', pts, .05, m, verts=6)


def main():
    build_set(OUT / 'denge.glb', 'denge', denge)
    build_set(OUT / 'lab.glb', 'lab', lab)
    build_set(OUT / 'hut.glb', 'hut', hut)
    build_set(OUT / 'radar.glb', 'radar', radar)
    build_set(OUT / 'props.glb', 'props', props, joinable=True)
    print('ALL ASSETS DONE')


guarded(main)
