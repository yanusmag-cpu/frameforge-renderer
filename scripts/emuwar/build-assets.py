"""FrameForge — The Great Emu War (1932). Original Blender assets.
Run: blender -b --factory-startup -P scripts/emuwar/build-assets.py
Helper coordinates are Three.js metres: x forward, y up, z right. Every exported node is a 'KEEP …' object with a
meaningful pivot so Three can place, instance and animate it:
  emu.glb    articulated emu parts (body hi/lo, neck segment, head, lower beak, eye, iris, lid, brow, thigh, tarsus, foot)
  truck.glb  1930s army truck: sprung body, canopy, four wheels, steering wheel
  gun.glb    Lewis gun with pan magazine, cocking handle, tripod, spring and cartridge case
  farm.glb   homestead, shed, windmill tower + rotor, tank stand, fence post, gate, hay bale, trough
  nature.glb gum trees, dead tree, tussocks, grass tree, rocks, sandstone outcrop, dam wall, wheat stalk
  kit.glb    ammunition boxes, sandbag, slouch hat, canteen
"""
import bpy, math, random
from pathlib import Path
from mathutils import Vector
ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'public/emuwar'; OUT.mkdir(parents=True, exist_ok=True)
random.seed(1932)
MATS = {}
def mat(name, c, metal=0.0, rough=0.7, emit=None, strength=0.0):
    if name in MATS: return MATS[name]
    m = bpy.data.materials.new(name); m.use_nodes = True; m.use_backface_culling = False; p = m.node_tree.nodes.get('Principled BSDF')
    p.inputs['Base Color'].default_value = (*c, 1); p.inputs['Roughness'].default_value = rough; p.inputs['Metallic'].default_value = metal
    if emit: p.inputs['Emission Color'].default_value = (*emit, 1); p.inputs['Emission Strength'].default_value = strength
    MATS[name] = m; return m
def hexc(h): h = h.lstrip('#'); return tuple((int(h[i:i + 2], 16) / 255) ** 2.2 for i in (0, 2, 4))
def M(name, h, **k): return mat(name, hexc(h), **k)
def L(x, y, z): return (x, -z, y)
def V(*a): return Vector(a)
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
def box(name, p, s, m, bevel=0.0, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(size=1, location=L(*p)); o = bpy.context.object; o.name = name
    o.scale = (s[0], s[2], s[1]); o.rotation_euler = (rot[0], -rot[2], rot[1]); bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    return finish(o, m, bevel)
def cyl(name, p, r, h, m, axis='y', verts=16, r2=None, bevel=0.0):
    if r2 is None: bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=r, depth=h, location=L(*p))
    else: bpy.ops.mesh.primitive_cone_add(vertices=verts, radius1=r, radius2=r2, depth=h, location=L(*p))
    o = bpy.context.object; o.name = name
    if axis == 'x': o.rotation_euler = (0, math.pi / 2, 0)
    elif axis == 'z': o.rotation_euler = (math.pi / 2, 0, 0)
    elif axis == '-x': o.rotation_euler = (0, -math.pi / 2, 0)
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=False); return finish(o, m, bevel)
def sphere(name, p, r, m, sc=(1, 1, 1), segs=16, smooth=True):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segs, ring_count=max(6, segs // 2), radius=r, location=L(*p))
    o = bpy.context.object; o.name = name; o.scale = (sc[0], sc[2], sc[1]); bpy.ops.object.transform_apply(location=False, scale=True)
    if smooth: bpy.ops.object.shade_smooth()
    return finish(o, m)
def ico(name, p, r, m, sc=(1, 1, 1), sub=2, jitter=0.0, flat=False):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=sub, radius=r, location=L(*p)); o = bpy.context.object; o.name = name
    for v in o.data.vertices:
        n = v.co.normalized(); v.co += n * (random.uniform(-1, 1) * jitter * r)
    o.scale = (sc[0], sc[2], sc[1]); bpy.ops.object.transform_apply(location=False, scale=True)
    if not flat: bpy.ops.object.shade_smooth()
    return finish(o, m)
def torus(name, p, R, r, m, axis='y', segs=24, minor=8):
    bpy.ops.mesh.primitive_torus_add(major_radius=R, minor_radius=r, major_segments=segs, minor_segments=minor, location=L(*p))
    o = bpy.context.object; o.name = name
    if axis == 'x': o.rotation_euler = (0, math.pi / 2, 0)
    elif axis == 'z': o.rotation_euler = (math.pi / 2, 0, 0)
    bpy.ops.object.transform_apply(location=False, rotation=True); bpy.ops.object.shade_smooth(); return finish(o, m)
def mesh(name, verts, faces, m, smooth=False):
    d = bpy.data.meshes.new(name); d.from_pydata([L(*v) for v in verts], [], faces); d.update()
    o = bpy.data.objects.new(name, d); bpy.context.collection.objects.link(o)
    for f in d.polygons: f.use_smooth = smooth
    return finish(o, m)
def keep(name, objs, pivot=(0, 0, 0)):
    """Join objs (applying modifiers) into one animatable object whose origin is pivot (Three coords)."""
    objs = [o for o in objs if o is not None]
    for o in objs:
        bpy.ops.object.select_all(action='DESELECT'); o.select_set(True); bpy.context.view_layer.objects.active = o
        if o.type != 'MESH': bpy.ops.object.convert(target='MESH')
        for md in list(o.modifiers): bpy.ops.object.modifier_apply(modifier=md.name)
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs: o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    if len(objs) > 1: bpy.ops.object.join()
    o = bpy.context.object; o.name = 'KEEP ' + name
    bpy.context.scene.cursor.location = L(*pivot); bpy.ops.object.origin_set(type='ORIGIN_CURSOR'); return o
def export(name):
    bpy.ops.export_scene.gltf(filepath=str(OUT / name), export_format='GLB', export_apply=True, export_yup=True, export_materials='EXPORT', export_cameras=False, export_lights=False)
    print('exported', name)

# ---------------------------------------------------------------- generic mesh builders (Three coordinates)
def nrm(v):
    l = math.sqrt(sum(c * c for c in v)) or 1.0; return tuple(c / l for c in v)
def crs(a, b): return (a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0])
def addv(a, b, k=1.0): return tuple(a[i] + b[i] * k for i in range(3))
def ribbon(paths, widths, normals, m, name='ribbon'):
    """Strips (feather cards, blades, leaves). paths: list of point lists; widths: list of width lists; normals: list of facing normals."""
    verts, faces = [], []
    for pts, ws, n in zip(paths, widths, normals):
        base = len(verts)
        for i, p in enumerate(pts):
            d = nrm(tuple(pts[min(i + 1, len(pts) - 1)][k] - pts[max(i - 1, 0)][k] for k in range(3)))
            side = nrm(crs(d, n)); w = ws[i] / 2
            verts += [addv(p, side, -w), addv(p, side, w)]
        for i in range(len(pts) - 1):
            a = base + i * 2; faces.append((a, a + 1, a + 3, a + 2))
    return mesh(name, verts, faces, m)
def loft(name, pts, radii, m, sides=8, cap=True, smooth=True, wobble=0.0):
    verts, faces = [], []
    up = (0, 1, 0)
    for i, p in enumerate(pts):
        d = nrm(tuple(pts[min(i + 1, len(pts) - 1)][k] - pts[max(i - 1, 0)][k] for k in range(3)))
        a = crs(d, up if abs(d[1]) < .95 else (1, 0, 0)); a = nrm(a); b = nrm(crs(a, d))
        for s in range(sides):
            t = s / sides * math.tau; r = radii[i] * (1 + wobble * math.sin(s * 2.7 + i * 1.3))
            verts.append(tuple(p[k] + (a[k] * math.cos(t) + b[k] * math.sin(t)) * r for k in range(3)))
    for i in range(len(pts) - 1):
        for s in range(sides):
            a0 = i * sides + s; a1 = i * sides + (s + 1) % sides
            faces.append((a0, a1, a1 + sides, a0 + sides))
    if cap:
        faces.append(tuple(range(sides - 1, -1, -1))); n0 = (len(pts) - 1) * sides; faces.append(tuple(range(n0, n0 + sides)))
    return mesh(name, verts, faces, m, smooth)
def corrugated(name, o, u, v, nu, nv, amp, waves, m):
    """Corrugated-iron sheet: origin o, edge vectors u (corrugation direction) and v."""
    n = nrm(crs(u, v)); verts, faces = [], []
    for j in range(nv + 1):
        for i in range(nu + 1):
            s, t = i / nu, j / nv; h = amp * math.sin(s * waves * math.tau)
            verts.append(tuple(o[k] + u[k] * s + v[k] * t + n[k] * h for k in range(3)))
    for j in range(nv):
        for i in range(nu):
            a = j * (nu + 1) + i; faces.append((a, a + 1, a + nu + 2, a + nu + 1))
    return mesh(name, verts, faces, m, True)
def arcband(name, c, R, w, a0, a1, m, segs=18, axis='z', thick=0.02):
    """Curved band around an axis (mudguards, dam wall courses)."""
    verts, faces = [], []
    for i in range(segs + 1):
        a = a0 + (a1 - a0) * i / segs
        for rr in (R, R + thick):
            for zz in (-w / 2, w / 2):
                if axis == 'z': verts.append((c[0] + math.cos(a) * rr, c[1] + math.sin(a) * rr, c[2] + zz))
                else: verts.append((c[0] + math.cos(a) * rr, c[1] + zz, c[2] + math.sin(a) * rr))
    for i in range(segs):
        b = i * 4; nb = b + 4
        faces += [(b, b + 1, nb + 1, nb), (b + 2, nb + 2, nb + 3, b + 3), (b, nb, nb + 2, b + 2), (b + 1, b + 3, nb + 3, nb + 1)]
    return mesh(name, verts, faces, m, True)

# ================================================================= EMU (scale 1: head ≈ 1.8 m)
def emu():
    reset()
    down, F = M('Emu down', '#3a2d22', rough=.95), [M('Emu feather A', '#5c4632', rough=.9), M('Emu feather B', '#71583f', rough=.9), M('Emu feather C', '#43342a', rough=.92), M('Emu feather tip', '#2a211a', rough=.95)]
    skin, face, hair = M('Emu skin', '#6c7b88', rough=.65), M('Emu face', '#7e8b98', rough=.6), M('Emu hair', '#2b241e', rough=.9)
    beakm, mouth = M('Emu beak', '#3b3733', rough=.45), M('Emu mouth', '#c4646a', rough=.5)
    leg, scale_m, toe, claw = M('Emu leg', '#59636c', rough=.7), M('Emu scale', '#3d464e', rough=.75), M('Emu toe', '#4f5860', rough=.7), M('Emu claw', '#1d1b19', rough=.4)
    A, B, C = .48, .34, .27
    def body(name, n, segs, lmin, lmax):
        parts = [sphere(name + ' base', (0, 0, 0), 1, down, sc=(A * .96, B * .94, C * .96), segs=20)]
        groups = {i: ([], [], []) for i in range(4)}
        golden = math.pi * (3 - math.sqrt(5))
        for i in range(n):
            y = 1 - (i + .5) / n * 1.55; r = math.sqrt(max(0, 1 - y * y)); th = golden * i
            ux, uy, uz = math.cos(th) * r, y, math.sin(th) * r
            if uy < -.55: continue
            p = (ux * A, uy * B, uz * C); nn = nrm((ux / A, uy / B, uz / C))
            g = (-.55 + random.uniform(-.15, .15), -1, random.uniform(-.1, .1))
            dot = sum(g[k] * nn[k] for k in range(3)); t = nrm(tuple(g[k] - nn[k] * dot for k in range(3)))
            Ln = random.uniform(lmin, lmax) * (1.25 if ux < -.3 else 1.0)
            pts = []
            for s in range(segs + 1):
                q = s / segs; out = .025 * math.sin(q * math.pi) - .02 * q * q
                pts.append(tuple(p[k] + t[k] * Ln * q + nn[k] * out - (0, .04 * q * q, 0)[k] for k in range(3)))
            w = random.uniform(.05, .075); ws = [w * (1 - .55 * s / segs) for s in range(segs + 1)]
            k = 3 if random.random() < .18 else random.randrange(3)
            groups[k][0].append(pts); groups[k][1].append(ws); groups[k][2].append(nn)
        for k, (ps, ws, ns) in groups.items():
            if ps: parts.append(ribbon(ps, ws, ns, F[k], name + f' cards{k}'))
        return keep(name, parts)
    body('EmuBodyHi', 1300, 3, .2, .34); body('EmuBodyLo', 260, 1, .24, .36)
    # neck segment: 0.1 m tall along +y, bluish skin with sparse dark hair-feathers
    ps, ws, ns = [], [], []
    for i in range(16):
        a = random.uniform(0, math.tau); y = random.uniform(0, .1); n = (math.cos(a), .25, math.sin(a)); p = (math.cos(a) * .045, y, math.sin(a) * .045)
        L2 = random.uniform(.05, .09); ps.append([p, addv(addv(p, n, L2 * .6), (0, -1, 0), L2 * .5)]); ws.append([.022, .006]); ns.append(nrm((math.cos(a + 1.5), 0, math.sin(a + 1.5))))
    keep('EmuNeck', [loft('neck', [(0, -.01, 0), (0, .11, 0)], [.05, .047], skin, sides=10), ribbon(ps, ws, ns, hair, 'neck hair')])
    # head: pivot at the top of the neck; beak toward +x
    hp, hw, hn = [], [], []
    for i in range(30):
        a = random.uniform(-.9, .9); b = random.uniform(-1.2, 1.2); root = (-.01 + .04 * a, .055, .035 * math.sin(b))
        tip = addv(root, nrm((-.6 + .3 * a, 1, .4 * math.sin(b))), random.uniform(.05, .095)); hp.append([root, tip]); hw.append([.016, .003]); hn.append((0, 0, 1) if abs(b) < .6 else (1, 0, 0))
    for i in range(18):
        a = random.uniform(0, math.tau); root = (-.04, .0 + .03 * math.sin(a), .045 * math.cos(a)); tip = addv(root, (-.6, -.2 + .2 * math.sin(a), .5 * math.cos(a)), .06)
        hp.append([root, tip]); hw.append([.014, .004]); hn.append((0, 1, 0))
    skull = sphere('skull', (.02, .03, 0), .066, face, sc=(1.25, .92, .86), segs=20)
    beak = cyl('beak', (.118, .012, 0), .034, .11, beakm, axis='x', r2=.007, verts=14); beak.scale = (1, 1, 1)
    for v in beak.data.vertices: v.co.z *= .62; v.co.y *= .8
    nostril = [box('nostril' + str(s), (.125, .028, s * .012), (.018, .006, .005), hair) for s in (-1, 1)]
    keep('EmuHead', [skull, beak, *nostril, ribbon(hp, hw, hn, hair, 'tuft')])
    lower = cyl('lower', (.095, -.006, 0), .026, .095, beakm, axis='x', r2=.006, verts=12)
    for v in lower.data.vertices: v.co.z *= .58; v.co.y *= .6
    tongue = box('tongue', (.085, .0, 0), (.07, .008, .028), mouth)
    lowerk = keep('EmuJaw', [lower, tongue], (.05, -.006, 0))
    keep('EmuEye', [sphere('eye', (0, 0, 0), .027, M('Emu eye white', '#f3eee4', rough=.25), segs=18)])
    iris = cyl('iris', (.022, 0, 0), .0195, .004, M('Emu iris', '#d9721c', rough=.3), axis='x', verts=24)
    pupil = cyl('pupil', (.0245, 0, 0), .0105, .003, M('Emu pupil', '#0b0907', rough=.2), axis='x', verts=20)
    glint = sphere('glint', (.027, .007, -.006), .0035, M('Emu glint', '#ffffff', rough=.1, emit=(1, 1, 1), strength=2.0), segs=8)
    keep('EmuIris', [iris, pupil, glint])
    bpy.ops.mesh.primitive_uv_sphere_add(segments=18, ring_count=10, radius=.0295, location=(0, 0, 0)); lid = bpy.context.object; lid.name = 'lid'
    import bmesh
    bm = bmesh.new(); bm.from_mesh(lid.data); bmesh.ops.delete(bm, geom=[v for v in bm.verts if v.co.z < -.002], context='VERTS'); bm.to_mesh(lid.data); bm.free()
    bpy.ops.object.shade_smooth(); finish(lid, face)
    keep('EmuLid', [lid])
    bp, bw, bn = [], [], []
    for i in range(9):
        q = i / 8; bp.append([(-.025 + .05 * q, .0, 0), (-.03 + .055 * q, .022, 0)]); bw.append([.012, .004]); bn.append((0, 0, 1))
    keep('EmuBrow', [box('brow', (0, 0, 0), (.055, .012, .01), hair), ribbon(bp, bw, bn, hair, 'brow hair')])
    # legs (unit lengths in metres: thigh .42 hip→ankle, tarsus .48 ankle→foot)
    tp, tw, tn = [], [], []
    for i in range(90):
        a = random.uniform(0, math.tau); y = -random.uniform(0, .26); rr = .085 * (1 + y * 1.6)
        root = (math.cos(a) * rr, y, math.sin(a) * rr); tp.append([root, addv(root, (math.cos(a) * .3, -1, math.sin(a) * .3), random.uniform(.08, .14))]); tw.append([.035, .01]); tn.append(nrm((math.cos(a), 0, math.sin(a))))
    keep('EmuThigh', [loft('thighc', [(0, 0, 0), (0, -.21, 0), (0, -.42, 0)], [.085, .05, .032], F[2], sides=10), ribbon(tp, tw, tn, F[0], 'thigh cards')])
    sc = [loft('shank', [(0, 0, 0), (0, -.24, 0), (0, -.48, 0)], [.03, .024, .026], leg, sides=10)]
    for i in range(14): sc.append(box(f'scute{i}', (.022, -.03 - i * .031, 0), (.012, .022, .03), scale_m, bevel=.003))
    sc.append(sphere('ankle', (0, 0, 0), .036, leg))
    keep('EmuTarsus', sc)
    ft = [sphere('pad', (.0, -.012, 0), .03, toe, sc=(1.2, .6, 1))]
    for a, ln in ((0, .15), (.42, .12), (-.42, .12)):
        d = (math.cos(a), 0, math.sin(a)); pts = [(0, -.012, 0), addv((0, -.02, 0), d, ln * .5), addv((0, -.024, 0), d, ln)]
        ft.append(loft(f'toe{a}', pts, [.017, .014, .009], toe, sides=8))
        ft.append(cyl(f'claw{a}', addv((0, -.026, 0), d, ln + .02), .009, .035, claw, axis='x', r2=.001, verts=8))
        cl = ft[-1]; cl.rotation_euler = (0, 0, 0); cl.select_set(True)
        for v in cl.data.vertices:
            x, y = v.co.x - L(*addv((0, -.026, 0), d, ln + .02))[0], v.co.y - L(*addv((0, -.026, 0), d, ln + .02))[1]
            v.co.x, v.co.y = L(*addv((0, -.026, 0), d, ln + .02))[0] + x * math.cos(-a) - y * math.sin(-a), L(*addv((0, -.026, 0), d, ln + .02))[1] + x * math.sin(-a) + y * math.cos(-a)
    keep('EmuFoot', ft)
    export('emu.glb')

# ================================================================= 1930s ARMY TRUCK (x forward, origin at ground between axles)
FX, RX, TRK, WR = 1.45, -1.85, .82, .42
def wheel(name, x, z):
    tyre = torus(name + ' tyre', (x, WR, z), .31, .11, TR, axis='z', segs=28, minor=10)
    tread = [box(f'{name} tread{i}', (x + math.cos(i / 22 * math.tau) * .415, WR + math.sin(i / 22 * math.tau) * .415, z), (.05, .03, .19), TR, rot=(0, 0, i / 22 * math.tau)) for i in range(22)]
    disc = cyl(name + ' disc', (x, WR, z + (.06 if z > 0 else -.06)), .26, .03, OD, axis='z', verts=24)
    hub = cyl(name + ' hub', (x, WR, z + (.1 if z > 0 else -.1)), .085, .07, BK, axis='z', verts=14)
    holes = [cyl(f'{name} hole{i}', (x + math.cos(i / 6 * math.tau) * .17, WR + math.sin(i / 6 * math.tau) * .17, z + (.078 if z > 0 else -.078)), .035, .01, BK, axis='z', verts=10) for i in range(6)]
    nuts = [cyl(f'{name} nut{i}', (x + math.cos(i / 8 * math.tau + .3) * .11, WR + math.sin(i / 8 * math.tau + .3) * .11, z + (.105 if z > 0 else -.105)), .012, .02, CH, axis='z', verts=6) for i in range(8)]
    return keep(name, [tyre, *tread, disc, hub, *holes, *nuts], (x, WR, z))
def truck():
    reset()
    global TR, OD, BK, CH
    OD, OD2, WD, CV, BK, CH, TR = M('Truck olive', '#4e5833', rough=.72), M('Truck olive dark', '#394126', rough=.78), M('Truck wood', '#7b5a3a', rough=.85), M('Truck canvas', '#b29a6b', rough=.95), M('Truck black', '#151515', rough=.6), M('Truck chrome', '#c9c6bb', metal=.9, rough=.25), M('Truck rubber', '#1a1a1a', rough=.9)
    GL, LP, RD = M('Truck glass', '#20262a', rough=.08, metal=.3), M('Lamp glass', '#efe3c2', rough=.1, emit=hexc('#fff1c8'), strength=.4), M('Tail red', '#8a1c14', rough=.3)
    b = []
    for z in (-.42, .42): b.append(box(f'rail{z}', (-.3, .62, z), (5.0, .16, .08), BK))
    b += [box('cab', (.05, 1.55, 0), (1.25, 1.1, 1.72), OD, bevel=.06), box('cabroof', (.05, 2.12, 0), (1.35, .07, 1.82), OD2, bevel=.03),
          box('bonnet', (1.25, 1.22, 0), (1.25, .6, 1.0), OD, bevel=.09), box('bonnet top', (1.25, 1.53, 0), (1.25, .08, .9), OD, bevel=.04),
          box('cowl', (.66, 1.3, 0), (.12, .8, 1.25), OD2, bevel=.02), box('rad shell', (1.9, 1.2, 0), (.1, .78, .82), CH, bevel=.03),
          box('grille', (1.95, 1.18, 0), (.03, .66, .7), BK), cyl('rad cap', (1.9, 1.62, 0), .04, .08, CH), box('bumper', (2.2, .6, 0), (.12, .12, 2.0), BK, bevel=.02),
          box('crank', (2.1, .78, 0), (.25, .03, .03), CH), box('dash', (.62, 1.48, 0), (.05, .3, 1.5), OD2),
          box('windscreen frame top', (.66, 2.0, 0), (.06, .06, 1.6), OD2), box('ws glass', (.68, 1.8, 0), (.015, .38, 1.5), GL),
          box('seat', (-.25, 1.15, 0), (.4, .14, 1.4), M('Seat leather', '#4a3324', rough=.6)), box('seatback', (-.45, 1.45, 0), (.1, .5, 1.4), M('Seat leather', '#4a3324'))]
    for i in range(7):
        y = 1.0 + i * .07
        for z in (-.5, .5): b.append(box(f'louvre{i}{z}', (1.25, y, z * 1.01), (.6, .02, .02), OD2))
    for z in (-.86, .86):
        b += [box(f'door{z}', (.05, 1.38, z * 1.0), (1.0, .7, .02), OD2), box(f'doorwin{z}', (.05, 1.86, z * 1.005), (.85, .3, .01), GL),
              box(f'board{z}', (.2, .55, z * 1.08), (1.9, .05, .28), BK), box(f'mirror arm{z}', (.66, 1.95, z * 1.12), (.03, .03, .2), BK),
              cyl(f'mirror{z}', (.66, 1.98, z * 1.25), .07, .02, CH, axis='x')]
    for z in (-.38, .38):
        b += [cyl(f'lamp{z}', (1.98, 1.42, z * 1.55), .11, .14, OD2, axis='x', verts=20), cyl(f'lens{z}', (2.06, 1.42, z * 1.55), .095, .02, LP, axis='x', verts=20),
              torus(f'lamprim{z}', (2.07, 1.42, z * 1.55), .1, .012, CH, axis='x'), box(f'lampbar{z}', (1.95, 1.3, z * 1.25), (.04, .04, .3), BK)]
    for x, zs, a0, a1 in ((FX, (-TRK, TRK), -.1, math.pi + .25), (RX, (-TRK, TRK), -.15, math.pi + .15)):
        for z in zs: b.append(arcband(f'guard{x}{z}', (x, WR, z * (1.0 if x == FX else 1.02)), .5, .34, a0, a1, OD, segs=20, thick=.025))
    b += [box('bed floor', (-1.75, .92, 0), (2.75, .08, 2.0), WD)]
    for i in range(4):
        y = 1.0 + i * .14
        for z in (-1.0, 1.0): b.append(box(f'side{i}{z}', (-1.75, y, z), (2.75, .11, .04), WD, bevel=.008))
        b.append(box(f'tail{i}', (-3.12, y, 0), (.04, .11, 2.0), WD, bevel=.008))
    for x in (-.45, -1.3, -2.2, -3.1):
        for z in (-1.02, 1.02): b.append(box(f'stake{x}{z}', (x, 1.2, z), (.07, .62, .06), OD2))
    b += [cyl('spare', (.6, .85, -1.02), .38, .2, TR, axis='z', verts=24), box('tank', (-.6, .5, .55), (.7, .3, .32), OD2, bevel=.04),
          box('tail lamp', (-3.15, 1.05, .85), (.04, .08, .1), RD), box('plate', (-3.16, .82, 0), (.02, .16, .42), M('Plate', '#e6e0cc', rough=.6)),
          box('rear hitch', (-3.15, .6, 0), (.15, .1, .2), BK), box('chassis x', (-.3, .58, 0), (.1, .1, .9), BK)]
    keep('TruckBody', b, (0, WR, 0))
    bows = [loft(f'bow{x}', [(x, 1.0 + (math.sin(a / 12 * math.pi) * .95 + .5 if 0 < a < 12 else .5), math.cos(a / 12 * math.pi) * 1.04) for a in range(13)], [.025] * 13, OD2, sides=6) for x in (-.5, -1.3, -2.2, -3.05)]
    can = []
    for i in range(14):
        a0, a1 = i / 14 * math.pi, (i + 1) / 14 * math.pi
        can.append(mesh(f'canvas{i}', [(-.42, 1.5 + math.sin(a0) * .95, math.cos(a0) * 1.04), (-3.12, 1.5 + math.sin(a0) * .95, math.cos(a0) * 1.04), (-3.12, 1.5 + math.sin(a1) * .95, math.cos(a1) * 1.04), (-.42, 1.5 + math.sin(a1) * .95, math.cos(a1) * 1.04)], [(0, 1, 2, 3)], CV, True))
    keep('TruckCanopy', bows + can, (0, WR, 0))
    for nm, x, z in (('WheelFL', FX, -TRK), ('WheelFR', FX, TRK), ('WheelRL', RX, -TRK), ('WheelRR', RX, TRK)): wheel(nm, x, z)
    st = [torus('steer ring', (.25, 1.55, -.42), .2, .015, BK, axis='x'), box('steer spoke', (.25, 1.55, -.42), (.01, .38, .02), BK), box('steer spoke2', (.25, 1.55, -.42), (.01, .02, .38), BK), cyl('column', (.45, 1.35, -.42), .02, .5, BK, axis='x')]
    keep('TruckSteering', st, (.25, 1.55, -.42))
    export('truck.glb')

# ================================================================= LEWIS GUN on tripod (pivot = tripod head; barrel toward +x)
def gun():
    reset()
    st, st2, wd, br = M('Gun steel', '#2c2e2f', metal=.7, rough=.45), M('Gun steel dark', '#1b1c1d', metal=.6, rough=.5), M('Gun wood', '#6b4426', rough=.6), M('Brass', '#c2913e', metal=.85, rough=.3)
    g = [cyl('shroud', (.37, .07, 0), .056, .64, st, axis='x', verts=20), cyl('muzzle cone', (.72, .07, 0), .056, .08, st, axis='x', r2=.025, verts=16),
         cyl('barrel', (.8, .07, 0), .014, .12, st2, axis='x', verts=10), cyl('flash', (.86, .07, 0), .02, .04, st2, axis='x', verts=10),
         box('receiver', (-.08, .06, 0), (.3, .11, .075), st, bevel=.01), box('rear sight', (-.02, .13, 0), (.03, .03, .01), st2), box('front sight', (.77, .11, 0), (.01, .03, .006), st2),
         box('stock', (-.42, .03, 0), (.38, .09, .05), wd, bevel=.015), box('butt', (-.62, .01, 0), (.05, .15, .055), wd, bevel=.012),
         box('grip', (-.2, -.04, 0), (.05, .13, .045), wd, rot=(0, 0, -.35), bevel=.01), torus('guard', (-.15, -.02, 0), .025, .004, st2, axis='z'),
         box('gas', (.35, .01, 0), (.6, .02, .02), st2)]
    for i in range(9): g.append(torus(f'rib{i}', (.1 + i * .065, .07, 0), .057, .004, st2, axis='x', segs=20))
    keep('Lewis', g, (0, 0, 0))
    p = [cyl('pan', (0, 0, 0), .135, .045, st, verts=32), cyl('hub', (0, .028, 0), .03, .02, st2, verts=12)]
    for i in range(25):
        a = i / 25 * math.tau; p.append(box(f'panrib{i}', (math.cos(a) * .085, .025, math.sin(a) * .085), (.09, .008, .012), st2, rot=(0, -a, 0)))
    keep('Pan', p, (0, 0, 0)); [o.location for o in []]
    bpy.data.objects['KEEP Pan'].location = L(-.06, .145, 0)
    keep('Bolt', [cyl('knob', (0, 0, .025), .012, .05, st2, axis='z', verts=10), sphere('knobend', (0, 0, .055), .016, st2)], (0, 0, 0)); bpy.data.objects['KEEP Bolt'].location = L(-.06, .06, .04)
    t = [cyl('head', (0, -.03, 0), .04, .06, st2, verts=12)]
    for a in (0, 2.2, -2.2):
        d = (math.cos(a) * .42, -.62, math.sin(a) * .42); t.append(loft(f'leg{a}', [(0, -.04, 0), addv((0, -.04, 0), d, 1)], [.018, .014], st2, sides=8))
        t.append(cyl(f'foot{a}', addv((0, -.66, 0), (d[0], 0, d[2])), .025, .02, st2, verts=8))
    keep('Tripod', t, (0, 0, 0))
    pts = [(math.cos(i * .6) * .012, i * .004, math.sin(i * .6) * .012) for i in range(32)]
    keep('Spring', [loft('coil', pts, [.0025] * len(pts), M('Spring steel', '#9aa0a3', metal=.9, rough=.3), sides=6)], (0, .06, 0))
    keep('Casing', [cyl('case', (0, 0, 0), .006, .05, br, axis='x', verts=8)], (0, 0, 0))
    export('gun.glb')

# ================================================================= FARM
def farm():
    reset()
    wb, wb2, tr, iron, rust, brick, glass = M('Weatherboard', '#d8cdb6', rough=.85), M('Weatherboard shade', '#bfb39a', rough=.9), M('Timber', '#7a5b3c', rough=.9), M('Corrugated iron', '#9fa3a1', metal=.6, rough=.45), M('Rusty iron', '#8a5a3c', metal=.3, rough=.7), M('Brick', '#9a4d35', rough=.9), M('Window', '#2a2f33', rough=.15, metal=.2)
    hay, hay2, red = M('Hay', '#d9b866', rough=.95), M('Hay dark', '#b8964c', rough=.95), M('Gate paint', '#7a5b3c', rough=.85)
    W, D, H = 10.0, 7.0, 3.0
    h = []
    for i in range(14):
        y = .35 + i * H / 14
        for x0, z0, ln, axis in ((-W / 2, D / 2, W, 'x'), (-W / 2, -D / 2, W, 'x'), (-W / 2, -D / 2, D, 'z'), (W / 2, -D / 2, D, 'z')):
            if axis == 'x': h.append(box(f'wb{i}{z0}', (0, y, z0 + (.012 * (i % 2)) * (1 if z0 > 0 else -1)), (ln, H / 14 * 1.08, .04), wb if i % 3 else wb2))
            else: h.append(box(f'wbz{i}{x0}', (x0 + (.012 * (i % 2)) * (1 if x0 > 0 else -1), y, 0), (.04, H / 14 * 1.08, ln), wb if i % 3 else wb2))
    h.append(box('stumps', (0, .17, 0), (W + .1, .34, D + .1), tr))
    for x in (-3.2, -1.2, 2.2, 3.6):
        h += [box(f'win{x}', (x, 1.9, D / 2 + .03), (.9, 1.1, .03), glass), box(f'winframe{x}', (x, 1.9, D / 2 + .045), (1.05, 1.25, .02), M('Trim', '#efe9da', rough=.7)), box(f'sill{x}', (x, 1.3, D / 2 + .08), (1.1, .06, .1), M('Trim', '#efe9da'))]
    h.append(box('door', (.5, 1.4, D / 2 + .03), (.95, 2.1, .04), tr))
    roof = [corrugated('roofF', (-W / 2 - .4, H + .35, D / 2 + .5), (W + .8, 0, 0), (0, 2.2, -D / 2 - .5), 120, 6, .025, 60, iron),
            corrugated('roofB', (W / 2 + .4, H + .35, -D / 2 - .5), (-W - .8, 0, 0), (0, 2.2, D / 2 + .5), 120, 6, .025, 60, rust)]
    gab = [mesh(f'gable{s}', [(s * W / 2, H + .35, -D / 2), (s * W / 2, H + .35, D / 2), (s * W / 2, H + 2.5, 0)], [(0, 1, 2)], wb) for s in (-1, 1)]
    ver = [box('deck', (0, .32, D / 2 + 1.4), (W, .1, 2.6), tr), corrugated('verandah roof', (-W / 2, H + .2, D / 2), (W, 0, 0), (0, -.5, 2.8), 100, 3, .02, 50, iron)]
    for x in (-4.8, -2.4, 0, 2.4, 4.8): ver += [box(f'post{x}', (x, 1.75, D / 2 + 2.6), (.12, 2.9, .12), M('Trim', '#efe9da')), box(f'rail{x}', (x + 1.2, .85, D / 2 + 2.6), (2.3, .06, .05), M('Trim', '#efe9da'))]
    for i in range(3): ver.append(box(f'step{i}', (.5, .1 + i * .08, D / 2 + 2.9 + (2 - i) * .25), (1.6, .08, .3), tr))
    ch = [box('chimney', (-3.5, H + 2.1, -1.0), (.7, 2.4, .7), brick), box('chimney cap', (-3.5, H + 3.35, -1.0), (.85, .1, .85), brick)]
    keep('House', h + roof + gab + ver + ch, (0, 0, 0))
    s = [corrugated('shedwallL', (-4, 0, -3), (8, 0, 0), (0, 3.2, 0), 80, 4, .03, 40, rust), corrugated('shedwallR', (4, 0, 3), (-8, 0, 0), (0, 3.2, 0), 80, 4, .03, 40, iron),
         corrugated('shedback', (-4, 0, 3), (0, 0, -6), (0, 3.2, 0), 60, 4, .03, 30, rust), corrugated('shedroof', (-4.3, 3.2, -3.3), (8.6, 0, 0), (0, 1.0, 3.3), 86, 4, .03, 43, iron),
         corrugated('shedroof2', (4.3, 3.2, 3.3), (-8.6, 0, 0), (0, 1.0, -3.3), 86, 4, .03, 43, rust)]
    for x in (-3.9, 0, 3.9): s.append(box(f'shedpost{x}', (x, 1.9, 2.95), (.15, 3.8, .15), tr))
    for i, (x, y) in enumerate(((-2.5, .45), (-1.4, .45), (-2.0, 1.35), (1.8, .45))): s.append(box(f'bale{i}', (x, y, 0), (1.1, .9, .6), hay if i % 2 else hay2, bevel=.06))
    keep('Shed', s)
    t = []
    for sx in (-1, 1):
        for sz in (-1, 1):
            t.append(loft(f'mleg{sx}{sz}', [(sx * 1.4, 0, sz * 1.4), (sx * .25, 9.0, sz * .25)], [.05, .04], M('Galvanised', '#8d9396', metal=.6, rough=.5), sides=6, smooth=False))
    wy = lambda y: 1.4 - 1.15 * y / 9.0
    cor = lambda y: [(wy(y), y, wy(y)), (wy(y), y, -wy(y)), (-wy(y), y, -wy(y)), (-wy(y), y, wy(y))]
    for i in range(7):
        y0, y1 = .9 + i * 1.25, .9 + (i + 1) * 1.25
        for a in range(4):
            c0, c1 = cor(y0), cor(min(y1, 8.9))
            t.append(loft(f'brace{i}{a}', [c0[a], c0[(a + 1) % 4]], [.02, .02], M('Galvanised', '#8d9396'), sides=5, smooth=False))
            t.append(loft(f'diag{i}{a}', [c0[a], c1[(a + 1) % 4]], [.012, .012], M('Galvanised', '#8d9396'), sides=4, smooth=False))
    t += [box('platform', (0, 9.0, 0), (.9, .08, .9), tr), box('tail boom', (-1.2, 9.4, 0), (2.2, .07, .07), M('Galvanised', '#8d9396')),
          mesh('tail vane', [(-2.2, 9.0, 0), (-3.4, 9.2, 0), (-3.4, 10.3, 0), (-2.2, 9.9, 0)], [(0, 1, 2, 3)], M('Vane paint', '#c9c3b5', rough=.7)), box('pump rod', (0, 4.5, 0), (.03, 9, .03), M('Galvanised', '#8d9396'))]
    keep('WindmillTower', t)
    r = [cyl('rhub', (0, 0, 0), .16, .2, M('Galvanised', '#8d9396'), axis='x', verts=14), torus('rring', (.05, 0, 0), 1.0, .02, M('Galvanised', '#8d9396'), axis='x', segs=32)]
    for i in range(18):
        a = i / 18 * math.tau; c, sn = math.cos(a), math.sin(a)
        r.append(mesh(f'blade{i}', [(.0, c * .25 - sn * .05, sn * .25 + c * .05), (.0, c * .25 + sn * .05, sn * .25 - c * .05), (.08, c * 1.45 + sn * .17, sn * 1.45 - c * .17), (-.08, c * 1.45 - sn * .17, sn * 1.45 + c * .17)], [(0, 1, 2, 3)], M('Blade', '#d8d4ca', metal=.5, rough=.4)))
    keep('WindmillRotor', r, (0, 0, 0)); bpy.data.objects['KEEP WindmillRotor'].location = L(.6, 9.4, 0)
    tk = [loft('tank', [(0, 3.2, 0), (0, 5.4, 0)], [1.2, 1.2], iron, sides=28), cyl('tanklid', (0, 5.5, 0), 1.24, .2, iron, r2=.2, verts=28)]
    for i in range(10): tk.append(torus(f'tankrib{i}', (0, 3.3 + i * .22, 0), 1.21, .015, iron, segs=28, minor=4))
    for sx in (-1, 1):
        for sz in (-1, 1): tk.append(box(f'tleg{sx}{sz}', (sx * .9, 1.6, sz * .9), (.18, 3.2, .18), tr))
    tk += [box('tdeck', (0, 3.15, 0), (2.6, .12, 2.6), tr), box('tbrace', (0, 1.6, .9), (2.0, .1, .08), tr, rot=(0, 0, .8))]
    keep('Tank', tk)
    keep('FencePost', [loft('post', [(0, -.2, 0), (0, 1.25, 0)], [.07, .06], M('Grey post', '#8a7f70', rough=.95), sides=7, wobble=.12)])
    gate = [box('g1', (0, .4, 0), (3.2, .1, .06), red), box('g2', (0, .8, 0), (3.2, .1, .06), red), box('g3', (0, 1.2, 0), (3.2, .1, .06), red), box('g4', (-1.55, .8, 0), (.1, .9, .06), red), box('g5', (1.55, .8, 0), (.1, .9, .06), red), box('gd', (0, .8, 0), (3.3, .09, .05), red, rot=(0, 0, .25))]
    keep('Gate', gate, (0, 0, 0))
    keep('Bale', [box('bale', (0, .45, 0), (1.1, .9, .6), hay, bevel=.07), box('twine', (.3, .45, 0), (.02, .92, .62), hay2), box('twine2', (-.3, .45, 0), (.02, .92, .62), hay2)])
    keep('Trough', [box('trough', (0, .35, 0), (2.4, .45, .7), iron, bevel=.04), box('water', (0, .5, 0), (2.3, .02, .6), M('Trough water', '#3e5a63', rough=.05, metal=.4))])
    export('farm.glb')

# ================================================================= NATURE
def gum(name, seed, H=11.0, spread=4.5):
    random.seed(seed)
    bark, dark = M('Gum bark', '#d4ccba', rough=.8), M('Gum bark dark', '#8b806d', rough=.9)
    leaves = [M('Gum leaf A', '#55673c', rough=.8), M('Gum leaf B', '#6f7f48', rough=.8), M('Gum leaf C', '#3f4e2f', rough=.85)]
    parts = []; tips = []
    def branch(p, d, ln, r, depth):
        pts = [p]; rs = [r]
        for i in range(1, 6):
            q = i / 5; d2 = nrm((d[0] + random.uniform(-.25, .25), d[1] + .05, d[2] + random.uniform(-.25, .25)))
            pts.append(addv(pts[-1], d2, ln / 5)); rs.append(r * (1 - .6 * q))
        parts.append(loft(f'{name}b{len(parts)}', pts, rs, bark if depth < 2 else dark, sides=9 if depth == 0 else 6, wobble=.08))
        end = pts[-1]
        if depth < 2:
            for k in range(3):
                a = random.uniform(0, math.tau); nd = nrm((math.cos(a) * .8, .9 - depth * .2, math.sin(a) * .8))
                branch(pts[3 + (k % 2)], nd, ln * .62, rs[3 + (k % 2)] * .85, depth + 1)
        else: tips.append(end)
    branch((0, 0, 0), (0, 1, 0), H * .55, .38, 0)
    ps = {i: ([], [], []) for i in range(3)}
    for c in tips:
        for i in range(120):
            o = addv(c, (random.gauss(0, 1.15), random.gauss(-.25, .6), random.gauss(0, 1.15)))
            d = nrm((random.uniform(-.3, .3), -1, random.uniform(-.3, .3))); n = nrm((random.uniform(-1, 1), .2, random.uniform(-1, 1)))
            k = 0 if o[1] > c[1] else (1 if random.random() < .5 else 2)
            ps[k][0].append([o, addv(o, d, .1), addv(o, addv(d, (0, .3, 0)), .2)]); ps[k][1].append([.012, .05, .01]); ps[k][2].append(n)
    for k, (a, b, c) in ps.items(): parts.append(ribbon(a, b, c, leaves[k], f'{name}leaves{k}'))
    return keep(name, parts)
def nature():
    reset()
    gum('GumA', 3, 11.5); gum('GumB', 11, 9.0); gum('GumC', 23, 13.0)
    random.seed(77)
    dd = []
    def dead(p, d, ln, r, depth):
        pts = [p]
        for i in range(1, 5): pts.append(addv(pts[-1], nrm((d[0] + random.uniform(-.3, .3), d[1], d[2] + random.uniform(-.3, .3))), ln / 4))
        dd.append(loft(f'dead{len(dd)}', pts, [r, r * .8, r * .6, r * .45, r * .3], M('Dead wood', '#8e8a83', rough=.95), sides=6, wobble=.1))
        if depth < 3:
            for k in range(2): a = random.uniform(0, math.tau); dead(pts[2 + k], nrm((math.cos(a), .7, math.sin(a))), ln * .6, r * .5, depth + 1)
    dead((0, 0, 0), (0, 1, 0), 6, .3, 0); keep('DeadTree', dd)
    for nm, n, cols in (('TussockA', 90, ('#c8a466', '#a88a50')), ('TussockB', 70, ('#9aa060', '#c3a967'))):
        ms = [M(nm + ' a', cols[0], rough=.95), M(nm + ' b', cols[1], rough=.95)]; g = {0: ([], [], []), 1: ([], [], [])}
        for i in range(n):
            a = random.uniform(0, math.tau); tilt = random.uniform(.15, .9); ln = random.uniform(.35, .75); d = nrm((math.cos(a) * tilt, 1, math.sin(a) * tilt))
            o = (math.cos(a) * .06, 0, math.sin(a) * .06); k = i % 2
            g[k][0].append([o, addv(o, d, ln * .5), addv(addv(o, d, ln), (math.cos(a) * ln * .3, -ln * .15, math.sin(a) * ln * .3))]); g[k][1].append([.03, .018, .002]); g[k][2].append(nrm((-math.sin(a), 0, math.cos(a))))
        keep(nm, [ribbon(*g[k], ms[k], f'{nm}{k}') for k in g])
    gt = [loft('gt trunk', [(0, 0, 0), (0, .6, 0), (0, 1.1, 0)], [.16, .14, .13], M('Grasstree trunk', '#1f1b18', rough=.95), sides=10, wobble=.15)]
    gp, gw, gn = [], [], []
    for i in range(160):
        a = random.uniform(0, math.tau); el = random.uniform(-.5, 1.0); d = nrm((math.cos(a), el, math.sin(a))); o = (0, 1.1, 0)
        gp.append([o, addv(o, d, .45), addv(addv(o, d, .9), (0, -.25 * (1 - el), 0))]); gw.append([.012, .008, .002]); gn.append(nrm((-math.sin(a), 0, math.cos(a))))
    gt.append(ribbon(gp, gw, gn, M('Grasstree leaf', '#5d7040', rough=.8), 'gt leaves')); gt.append(cyl('spike', (0, 2.2, 0), .03, 1.4, M('Grasstree spike', '#4a3a26'), verts=8))
    keep('GrassTree', gt)
    rk, rk2 = M('Sandstone', '#9b5b3d', rough=.95), M('Sandstone dark', '#6f3f2a', rough=.95)
    for i in range(3): keep(f'Rock{i}', [ico(f'rock{i}', (0, .2, 0), .6, rk if i % 2 else rk2, sc=(1.3, .7, 1.0), sub=2, jitter=.22, flat=True)])
    oc = []
    for i in range(14):
        a = random.uniform(0, math.tau); rr = random.uniform(0, 3.0); hh = 3.4 * (1 - rr / 4.5)
        oc.append(ico(f'oc{i}', (math.cos(a) * rr, hh * .5, math.sin(a) * rr), random.uniform(1.2, 2.2), rk if i % 3 else rk2, sc=(1.2, hh / 2.6 + .3, 1.0), sub=2, jitter=.18, flat=True))
    oc.append(ico('summit', (0, 3.0, 0), 1.3, rk, sc=(1.4, .55, 1.2), sub=3, jitter=.1, flat=True))
    keep('Outcrop', oc)
    wall = []
    for row in range(5):
        for i in range(34):
            a = -1.2 + 2.4 * (i + (row % 2) * .5) / 34; R = 18.0
            wall.append(box(f'stone{row}_{i}', (math.cos(a) * R, .15 + row * .27, math.sin(a) * R), (.62 + random.uniform(-.1, .1), .26, .55), rk if (i + row) % 3 else rk2, rot=(0, -a, 0), bevel=.04))
    keep('DamWall', wall)
    wh, wh2 = M('Wheat', '#dcb661', rough=.85), M('Wheat dark', '#b88c40', rough=.85)
    w = [loft('stem', [(0, 0, 0), (.02, .5, 0), (.05, 1.0, 0)], [.006, .005, .004], wh2, sides=6)]
    for i in range(14):
        for s in (-1, 1):
            y = 1.0 + i * .012; w.append(sphere(f'grain{i}{s}', (.05 + .0005 * i, y, s * .007), .007, wh, sc=(.8, 1.4, .8), segs=8))
            w.append(ribbon([[(.05, y, s * .009), (.05 + s * .01, y + .05, s * .03), (.05 + s * .02, y + .11, s * .04)]], [[.002, .0012, .0004]], [(1, 0, 0)], wh2, f'awn{i}{s}'))
    keep('Wheat', w)
    export('nature.glb')

# ================================================================= KIT
def kit():
    reset()
    wd, wd2, rope, felt, band, badge, bag = M('Crate wood', '#8a6a44', rough=.85), M('Crate wood dark', '#5f4a30', rough=.9), M('Rope', '#c2a77a', rough=.95), M('Hat felt', '#7c5c3b', rough=.9), M('Hat band', '#4f3d2a', rough=.9), M('Badge', '#d4a43d', metal=.8, rough=.3), M('Hessian', '#b79c6e', rough=1)
    crate = [box('crate', (0, .18, 0), (.75, .34, .4), wd, bevel=.015), box('crate lid', (0, .37, 0), (.77, .05, .42), wd2, bevel=.01)] + [torus(f'handle{s}', (s * .39, .22, 0), .05, .01, rope, axis='x') for s in (-1, 1)]
    keep('AmmoBox', crate)
    open_ = [box('crate o', (0, .18, 0), (.75, .34, .4), wd, bevel=.015), box('crate lid o', (0, .55, -.22), (.77, .42, .05), wd2, rot=(-.25, 0, 0), bevel=.01), box('crate empty', (0, .33, 0), (.68, .02, .33), M('Crate inside', '#3d2f1f'))]
    keep('AmmoBoxOpen', open_)
    keep('Sandbag', [ico('sandbag', (0, .12, 0), .3, bag, sc=(1.4, .45, .8), sub=3, jitter=.04)])
    hat = [cyl('crown', (0, .07, 0), .1, .12, felt, verts=20, r2=.085), sphere('crown top', (0, .13, 0), .085, felt, sc=(1, .35, 1)),
           cyl('band', (0, .035, 0), .102, .04, band, verts=20)]
    bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=.2, depth=.012, location=L(0, .012, 0)); brim = bpy.context.object; brim.name = 'brim'
    for v in brim.data.vertices:
        x, z = v.co.x, -v.co.y
        if z < -.05: v.co.z += (-z - .05) * 1.6
    finish(brim, felt); hat += [brim, cyl('badge', (0, .1, -.13), .03, .006, badge, axis='z', verts=12)]
    keep('Hat', hat)
    keep('Canteen', [cyl('canteen', (0, .12, 0), .07, .2, M('Canteen', '#6b6a4a', rough=.8), verts=14), cyl('cap', (0, .24, 0), .02, .03, M('Gun steel', '#2c2e2f'), verts=8)])
    export('kit.glb')

for fn in (emu, truck, gun, farm, nature, kit): fn()
print('ALL ASSETS DONE')
