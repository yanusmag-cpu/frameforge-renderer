"""YunoWorld v9 Blender kit: reusable, detailed stylised building blocks shared by all v9 films.
Coordinates are Three.js metres (x right, y up, z toward the default camera); L() converts to Blender.
Materials are named "<surface>|<hex>" so the Three engine can dress every surface with its own texture/shader
(brick, plank, stone, cobble, tile, plaster, roof, metal, brass, glass, fabric, paper, leaf, bark, paint, emit, terrain...).
Every mesh gets world-space box UVs in metres and a 'Col' colour attribute (per-piece variation + baked cavity/height tint),
so planks, bricks and stones read as individual, slightly different pieces.
"""
import bpy, bmesh, math, random, json
from mathutils import Vector, noise
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
MATS = {}
R = random.Random(9)


def L(x, y, z): return (x, -z, y)


def srgb2lin(c): return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def rgb(h):
    h = h.lstrip('#')
    if len(h) == 3: h = ''.join(c * 2 for c in h)
    return tuple(int(h[i:i + 2], 16) / 255 for i in (0, 2, 4))


def mat(tag, hexc, rough=0.7, metal=0.0, emit=0.0):
    name = f'{tag}|{hexc}'
    if name in MATS: return MATS[name]
    m = bpy.data.materials.new(name); m.use_nodes = True; p = m.node_tree.nodes.get('Principled BSDF')
    c = rgb(hexc); p.inputs['Base Color'].default_value = (*[srgb2lin(v) for v in c], 1)
    p.inputs['Roughness'].default_value = rough; p.inputs['Metallic'].default_value = metal
    if emit:
        p.inputs['Emission Color'].default_value = (*[srgb2lin(v) for v in c], 1); p.inputs['Emission Strength'].default_value = emit
    if tag == 'glass': m.blend_method = 'BLEND'
    MATS[name] = m; return m


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True); MATS.clear()


def link(o, coll=None):
    (coll or bpy.context.scene.collection).objects.link(o); return o


COLL = None


def group(name):
    """start a new set; every object made afterwards goes into it"""
    global COLL
    COLL = bpy.data.collections.new(name); bpy.context.scene.collection.children.link(COLL); return COLL


def _obj(name, me):
    o = bpy.data.objects.new(name, me); link(o, COLL); return o


def _bm_obj(name, bm, m, smooth=False):
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    if smooth:
        for f in me.polygons: f.use_smooth = True
    o = _obj(name, me)
    if m is not None: o.data.materials.append(m)
    return o


def bevel(o, w=0.01, seg=2, ang=40):
    if w <= 0: return o
    b = o.modifiers.new('bevel', 'BEVEL'); b.width = w; b.segments = seg; b.limit_method = 'ANGLE'; b.angle_limit = math.radians(ang)
    o.modifiers.new('wn', 'WEIGHTED_NORMAL'); return o


def box(name, p, s, m, bev=0.012, rot=(0, 0, 0), seg=2, taper=0.0):
    """box centred at p (Three coords), size s (x, y, z), rotation (rx, ry, rz) about Three axes. taper narrows the top."""
    bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts:
        x, y, z = v.co.x * s[0], v.co.z * s[1], -v.co.y * s[2]
        if taper and v.co.z > 0: x *= 1 - taper; z *= 1 - taper
        v.co = Vector(L(x, y, z))
    o = _bm_obj(name, bm, m); o.location = L(*p); o.rotation_euler = (rot[0], -rot[2], rot[1]); return bevel(o, bev, seg)


def span(name, a, b, m, bev=0.012):
    p = tuple((a[i] + b[i]) / 2 for i in range(3)); s = tuple(max(1e-3, abs(b[i] - a[i])) for i in range(3))
    return box(name, p, s, m, bev)


def cyl(name, p, r, h, m, axis='y', verts=24, r2=None, bev=0.0, smooth=True, cap=True):
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=cap, cap_tris=False, segments=verts, radius1=r, radius2=r if r2 is None else r2, depth=h)
    rot = {'y': (0, 0, 0), 'x': (0, math.pi / 2, 0), 'z': (math.pi / 2, 0, 0)}[axis]
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    o = _obj(name, me); o.data.materials.append(m); o.location = L(*p); o.rotation_euler = rot
    if smooth:
        for f in me.polygons:
            if abs(f.normal.z) < .5: f.use_smooth = True
    return bevel(o, bev)


def sphere(name, p, r, m, sc=(1, 1, 1), segs=24, rings=12):
    bm = bmesh.new(); bmesh.ops.create_uvsphere(bm, u_segments=segs, v_segments=rings, radius=r)
    for v in bm.verts: v.co = Vector((v.co.x * sc[0], v.co.y * sc[2], v.co.z * sc[1]))
    o = _bm_obj(name, bm, m, smooth=True); o.location = L(*p); return o


def blob(name, p, r, m, sc=(1, 1, 1), sub=2, rough=0.18, seed=0):
    """organic lump (rocks, foliage clumps, hay): displaced icosphere, smooth shaded"""
    bm = bmesh.new(); bmesh.ops.create_icosphere(bm, subdivisions=sub, radius=r)
    o3 = Vector((seed * 1.7, seed * .3, seed * 2.1))
    for v in bm.verts:
        n = noise.noise(v.co * (2.2 / max(r, .01)) + o3); v.co *= 1 + n * rough
        v.co = Vector((v.co.x * sc[0], v.co.y * sc[2], v.co.z * sc[1]))
    o = _bm_obj(name, bm, m, smooth=True); o.location = L(*p); return o


def rock(name, p, r, m, seed=0, flat=0.6):
    """faceted cartoon rock: low-sub ico, flattened, flat-shaded chunky facets with a bevel"""
    bm = bmesh.new(); bmesh.ops.create_icosphere(bm, subdivisions=1, radius=r)
    rr = random.Random(seed)
    for v in bm.verts:
        v.co *= 0.78 + rr.random() * 0.4; v.co.z *= flat
        if v.co.z < -r * .2: v.co.z = -r * .2
    o = _bm_obj(name, bm, m); o.location = L(*p); o.rotation_euler = (0, 0, rr.random() * 6.28); return bevel(o, r * .06, 2, 30)


def tube(name, pts, r, m, verts=10, r_end=None):
    """swept tube along Three-coord points (pipes, rails, cables, branches)"""
    cu = bpy.data.curves.new(name, 'CURVE'); cu.dimensions = '3D'; cu.bevel_depth = r; cu.bevel_resolution = max(1, verts // 4); cu.use_fill_caps = True
    sp = cu.splines.new('POLY'); sp.points.add(len(pts) - 1)
    for i, q in enumerate(pts):
        sp.points[i].co = (*L(*q), 1); sp.points[i].radius = 1 if r_end is None else 1 + (r_end / r - 1) * i / max(1, len(pts) - 1)
    o = _obj(name, cu); o.data.materials.append(m)
    bpy.context.view_layer.objects.active = o; o.select_set(True)
    return o


def plane(name, p, w, d, m, rot=(0, 0, 0), sub=1):
    bm = bmesh.new(); bmesh.ops.create_grid(bm, x_segments=sub, y_segments=sub, size=.5)
    for v in bm.verts: v.co = Vector(L(v.co.x * w, 0, -v.co.y * d))
    o = _bm_obj(name, bm, m); o.location = L(*p); o.rotation_euler = (rot[0], -rot[2], rot[1]); return o


def text_plane(name, p, w, h, m, rot=(0, 0, 0)):
    """vertical panel (signs, maps, screens) facing +z"""
    return plane(name, p, w, h, m, rot=(rot[0] + math.pi / 2, rot[1], rot[2]))


# ---------------------------------------------------------------- finishing: UVs, colour attribute, joins, export
def realize(objs):
    """bake modifiers + transforms into new world-space meshes through the depsgraph (fast: no per-object operators);
    curves become meshes; colour attributes and material slots are kept"""
    bpy.context.view_layer.update(); dg = bpy.context.evaluated_depsgraph_get(); out = []
    for o in objs:
        if o.type not in ('MESH', 'CURVE'): continue
        ev = o.evaluated_get(dg); me = bpy.data.meshes.new_from_object(ev, preserve_all_data_layers=True, depsgraph=dg)
        me.transform(o.matrix_world)
        if o.type == 'CURVE' and not me.materials and o.data.materials: me.materials.append(o.data.materials[0])
        name = o.name; colls = list(o.users_collection); bpy.data.objects.remove(o, do_unlink=True)
        n = bpy.data.objects.new(name, me)
        for c in colls: c.objects.link(n)
        out.append(n)
    return out


def box_uv(o, scale=1.0):
    me = o.data; uv = me.uv_layers.get('UVMap') or me.uv_layers.new(name='UVMap')
    for poly in me.polygons:
        n = poly.normal; ax = max(range(3), key=lambda i: abs(n[i]))
        for li in poly.loop_indices:
            v = me.vertices[me.loops[li].vertex_index].co
            if ax == 0: u, w = v.y, v.z
            elif ax == 1: u, w = v.x, v.z
            else: u, w = v.x, v.y
            uv.data[li].uv = (u * scale, w * scale)


def colour(o, fn):
    """fn(world_co_three, normal_three, piece_rand) -> (r, g, b) multiplier stored in 'Col' (POINT, float)"""
    me = o.data; a = me.color_attributes.get('Col') or me.color_attributes.new('Col', 'FLOAT_COLOR', 'POINT')
    rr = (hash(o.name) % 9973) / 9973
    for i, v in enumerate(me.vertices):
        c = v.co; n = v.normal; c3 = (c.x, c.z, -c.y); n3 = (n.x, n.z, -n.y)
        r, g, b = fn(c3, n3, rr); a.data[i].color = (r, g, b, 1)
    me.color_attributes.active_color = a


def vary(amount=0.12, ground_ao=0.35, ao_h=0.6, floor=0.0):
    """per-piece brightness/hue variation + darkening toward the floor (cheap contact occlusion)"""
    def f(c, n, rr):
        k = 1 + (rr - .5) * 2 * amount; h = max(0.0, min(1.0, (c[1] - floor) / ao_h)); ao = 1 - ground_ao * (1 - h) ** 2
        return (k * ao * (1 + (rr - .5) * amount * .3), k * ao, k * ao * (1 - (rr - .5) * amount * .3))
    return f


def finish(objs, var=0.1, ground_ao=0.3, floor=0.0, uv=1.0):
    objs = realize([o for o in objs if o.name in bpy.data.objects])
    for o in objs:
        if o.type != 'MESH': continue
        box_uv(o, uv)
        if not o.data.color_attributes.get('Col'): colour(o, vary(var, ground_ao, floor=floor))
    return objs


def join(objs, name):
    """join meshes sharing a material into one object per material (fewer draw calls); keeps colour attributes"""
    by = {}
    for o in objs:
        if o.type != 'MESH' or not o.data.materials: continue
        by.setdefault(o.data.materials[0].name, []).append(o)
    out = []
    for k, os_ in by.items():
        bpy.ops.object.select_all(action='DESELECT')
        for o in os_: o.select_set(True)
        bpy.context.view_layer.objects.active = os_[0]
        if len(os_) > 1: bpy.ops.object.join()
        j = bpy.context.view_layer.objects.active; j.name = f'{name}.{k.split("|")[0]}.{len(out)}'; out.append(j)
    return out


def export(path, objs):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs:
        if o.name in bpy.data.objects: o.select_set(True)
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    kw = dict(filepath=str(path), export_format='GLB', use_selection=True, export_apply=True, export_yup=True,
              export_materials='EXPORT', export_cameras=False, export_lights=False, export_animations=False)
    try: bpy.ops.export_scene.gltf(**kw, export_vertex_color='ACTIVE')
    except TypeError: bpy.ops.export_scene.gltf(**kw, export_colors=True)
    print('exported', path, len(objs), 'objects', flush=True)


def guarded(main):
    """run the build; print every traceback line with an 'Error:' prefix so the CI log filter shows where it failed"""
    import traceback
    try: main()
    except Exception:
        for l in traceback.format_exc().splitlines(): print('Error:', l, flush=True)
        raise


def build_set(path, name, fn, joinable=True, keep=()):
    """run fn() inside a fresh collection; join everything except objects whose name starts with a prefix in keep
    (animated parts stay separate and keep their names, e.g. 'anim:hatch'). Returns nothing; writes the GLB."""
    import time; t0 = time.time(); group(name); fn(); n0 = len(COLL.objects)
    objs = finish(list(COLL.objects)); print(f'exported-progress {name}: {n0} objects built+baked in {time.time() - t0:.0f}s', flush=True)
    animated = [o for o in objs if any(o.name.startswith(k) for k in keep) or o.name.startswith('anim:')]
    for o in animated:   # pivot at the part's own centre so the engine can swing/slide it naturally
        bpy.ops.object.select_all(action='DESELECT'); o.select_set(True); bpy.context.view_layer.objects.active = o
        bpy.ops.object.origin_set(type='ORIGIN_GEOMETRY', center='BOUNDS')
        o.name = o.name.replace(':', '-').replace('.', '-')   # three's GLTFLoader strips ':' and '.', so use '-' separators
    static = [o for o in objs if o not in animated]
    if joinable: static = join(static, name)
    export(path, static + animated)
    for o in list(COLL.objects): bpy.data.objects.remove(o, do_unlink=True)


# ---------------------------------------------------------------- architecture
def plank_floor(x0, x1, z0, z1, y=0.0, w=0.16, base='#8a5a34', dark='#5b3a20', name='floor', along='x'):
    """individual planks with staggered butt joints, tiny height/colour variation (reads as a real wooden floor)"""
    rr = random.Random(int(abs(x0 * 13 + z0 * 7)) + 3)
    ms = [mat('plank', base, .62), mat('plank', dark, .66)]
    if along == 'x':
        z = z0
        while z < z1 - 1e-3:
            x = x0 - rr.random() * 1.2
            while x < x1:
                ln = 1.4 + rr.random() * 1.6; a, b = max(x, x0), min(x + ln, x1)
                if b - a > .05: box(f'{name}.pk', ((a + b) / 2, y - .02 + rr.random() * .006, z + w / 2), (b - a - .006, .04, w - .008), ms[rr.random() < .3], bev=.006, seg=1)
                x += ln
            z += w
    else:
        x = x0
        while x < x1 - 1e-3:
            z = z0 - rr.random() * 1.2
            while z < z1:
                ln = 1.4 + rr.random() * 1.6; a, b = max(z, z0), min(z + ln, z1)
                if b - a > .05: box(f'{name}.pk', (x + w / 2, y - .02 + rr.random() * .006, (a + b) / 2), (w - .008, .04, b - a - .006), ms[rr.random() < .3], bev=.006, seg=1)
                z += ln
            x += w


def tile_floor(x0, x1, z0, z1, y=0.0, s=0.3, a='#e8e4da', b='#c9d2d6', name='tiles'):
    ma, mb = mat('tile', a, .25), mat('tile', b, .25)
    nx, nz = int((x1 - x0) / s), int((z1 - z0) / s)
    for i in range(nx):
        for j in range(nz):
            box(f'{name}.t', (x0 + (i + .5) * s, y - .01, z0 + (j + .5) * s), (s - .008, .02, s - .008), ma if (i + j) % 2 else mb, bev=.003, seg=1)


def stone_floor(x0, x1, z0, z1, y=0.0, base='#8d8a84', name='flags', s=0.55):
    """irregular flagstones (palace corridors, streets): row offset, size jitter, chunky bevel"""
    rr = random.Random(int(x0 * 3 + z1 * 11) + 1); ms = [mat('stone', base, .8), mat('stone', '#7b776f', .85), mat('stone', '#a29d93', .8)]
    z = z0
    while z < z1 - .05:
        h = s * (.7 + rr.random() * .6); x = x0 - rr.random() * s
        while x < x1:
            w = s * (.8 + rr.random() * .9); a, b = max(x, x0), min(x + w, x1); c, d = z, min(z + h, z1)
            if b - a > .06 and d - c > .06: box(f'{name}.s', ((a + b) / 2, y - .03 + rr.random() * .01, (c + d) / 2), (b - a - .02, .06, d - c - .02), ms[int(rr.random() * 3)], bev=.015, seg=2)
            x += w
        z += h


def cobbles(pts, width, y=0.0, base='#77726b', name='cobbles', s=0.16, seed=1):
    """rounded cobblestones laid along a polyline (streets)"""
    rr = random.Random(seed); ms = [mat('stone', base, .85), mat('stone', '#8a847a', .85), mat('stone', '#615d58', .9)]
    for (ax, az), (bx, bz) in zip(pts[:-1], pts[1:]):
        dx, dz = bx - ax, bz - az; ln = math.hypot(dx, dz); ux, uz = dx / ln, dz / ln; px, pz = -uz, ux
        t = 0
        while t < ln:
            o = (rr.random() - .5) * s
            for k in range(int(width / s)):
                q = -width / 2 + (k + .5) * s + o * .5
                cx, cz = ax + ux * t + px * q, az + uz * t + pz * q
                blob(f'{name}.c', (cx, y + .01, cz), s * .48, ms[int(rr.random() * 3)], sc=(1 + rr.random() * .3, .45, 1), sub=1, rough=.12, seed=rr.random() * 50)
            t += s * .95


def brick_wall(name, a, b, h, y0=0.0, t=0.28, base='#a4553b', mortar='#d8cbb5', openings=(), courses=True, surf='brick'):
    """wall from a=(x,z) to b=(x,z), height h. Body uses the 'brick' surface (shader draws running bond with mortar);
    openings: list of (u0, u1, v0, v1) in metres along the wall / up from y0, cut as real holes with reveals."""
    ax, az = a; bx, bz = b; ln = math.hypot(bx - ax, bz - az); ang = math.atan2(bz - az, bx - ax)
    m = mat(surf, base, .9); cuts = sorted(openings)
    # build the wall as rectangles around the openings (real holes: no boolean needed)
    us = sorted({0.0, ln, *[c[0] for c in cuts], *[c[1] for c in cuts]})
    for u0, u1 in zip(us[:-1], us[1:]):
        vs = [(0.0, h)]
        for c in cuts:
            if c[0] <= u0 + 1e-4 and c[1] >= u1 - 1e-4:
                vs = [seg for v in vs for seg in ((v[0], min(v[1], c[2])), (max(v[0], c[3]), v[1])) if seg[1] - seg[0] > 1e-3]
        for v0, v1 in vs:
            cu = (u0 + u1) / 2; cx, cz = ax + math.cos(ang) * cu, az + math.sin(ang) * cu
            box(f'{name}.w', (cx, y0 + (v0 + v1) / 2, cz), (u1 - u0, v1 - v0, t), m, bev=0, rot=(0, -ang, 0))
    return ang


def wall_point(a, b, u, off=0.0):
    ax, az = a; bx, bz = b; ln = math.hypot(bx - ax, bz - az); ux, uz = (bx - ax) / ln, (bz - az) / ln
    return ax + ux * u - uz * off, az + uz * u + ux * off


def window(name, a, b, u, v0, w, h, y0=0.0, t=0.28, frame='#efe6d2', glass='#7fa6b8', bars=(2, 3), sill=True, lit=0.0, arch=False, shutters=None):
    """detailed sash window in a wall: frame, mullions/transoms, glass, stone sill and lintel, optional shutters"""
    ang = math.atan2(b[1] - a[1], b[0] - a[0]); fm = mat('paint', frame, .5); gm = mat('glass' if not lit else 'emit', glass, .08, emit=lit)
    sm = mat('stone', '#cfc6b4', .8)
    for side in (1, -1):
        cx, cz = wall_point(a, b, u, side * t * .32)
        rot = (0, -ang, 0)
        box(f'{name}.gl', (cx, y0 + v0 + h / 2, cz), (w - .06, h - .06, .02), gm, bev=0, rot=rot)
        fr = .06
        for dy in (0, h):
            box(f'{name}.fr', (cx, y0 + v0 + dy, cz), (w + fr, fr, .07), fm, bev=.006, rot=rot)
        for sx in (-.5, .5):
            px, pz = cx + math.cos(ang) * w * sx, cz + math.sin(ang) * w * sx
            box(f'{name}.fr', (px, y0 + v0 + h / 2, pz), (fr, h, .07), fm, bev=.006, rot=rot)
        nx, ny = bars
        for i in range(1, nx):
            k = -.5 + i / nx; px, pz = cx + math.cos(ang) * w * k, cz + math.sin(ang) * w * k
            box(f'{name}.mu', (px, y0 + v0 + h / 2, pz), (.03, h, .05), fm, bev=.004, rot=rot)
        for j in range(1, ny):
            box(f'{name}.tr', (cx, y0 + v0 + h * j / ny, cz), (w, .03, .05), fm, bev=.004, rot=rot)
        if side == 1 and sill:
            sx_, sz_ = wall_point(a, b, u, t * .55)
            box(f'{name}.sill', (sx_, y0 + v0 - .05, sz_), (w + .2, .08, .2), sm, bev=.012, rot=rot)
            box(f'{name}.lint', (sx_ * 0 + cx, y0 + v0 + h + .12, cz), (w + .28, .2, t * 1.1), sm, bev=.012, rot=rot)
            if shutters:
                for sx in (-.5, .5):
                    px, pz = wall_point(a, b, u + sx * (w + .34), t * .55)
                    box(f'{name}.sh', (px, y0 + v0 + h / 2, pz), (w * .5, h, .04), mat('paint', shutters, .6), bev=.008, rot=rot)
                    for k in range(5): box(f'{name}.slat', (px, y0 + v0 + h * (k + .5) / 5, pz), (w * .46, .025, .06), mat('paint', shutters, .6), bev=.004, rot=rot)
    return (u - w / 2, u + w / 2, v0, v0 + h)


def door(name, a, b, u, w=1.0, h=2.15, y0=0.0, t=0.28, col='#5d3b26', frame='#e8dcc2', step=True, open_=0.0, glazed=False, anim=False):
    """panelled door with frame, knob, step; anim name lets the engine swing it (open_ is the default opening)"""
    ang = math.atan2(b[1] - a[1], b[0] - a[0]); dm = mat('paint', col, .55); fm = mat('paint', frame, .5)
    cx, cz = wall_point(a, b, u, 0); rot = (0, -ang, 0)
    hx, hz = wall_point(a, b, u - w / 2, t * .2)
    leaf = box(f'anim:{name}' if anim else f'{name}.leaf', (hx + math.cos(ang) * w / 2, y0 + h / 2, hz + math.sin(ang) * w / 2), (w - .04, h - .02, .05), dm, bev=.01, rot=rot)
    for (pu, pv, pw, ph) in [(0, .3, .7, .38), (0, .72, .7, .38)]:
        px, pz = wall_point(a, b, u + pu * w, t * .2 + .03)
        box(f'{name}.pn', (px, y0 + h * pv, pz), (w * pw, h * ph, .02), mat('paint', col, .5) if not glazed or pv < .5 else mat('glass', '#9bb7c4', .1), bev=.006, rot=rot)
    kx, kz = wall_point(a, b, u + w * .38, t * .2 + .05); sphere(f'{name}.knob', (kx, y0 + 1.0, kz), .03, mat('brass', '#c9a24a', .3, .9))
    for side in (1, -1):
        px, pz = wall_point(a, b, u + side * (w / 2 + .05), 0)
        box(f'{name}.fr', (px, y0 + h / 2, pz), (.1, h + .1, t + .06), fm, bev=.01, rot=rot)
    px, pz = wall_point(a, b, u, 0); box(f'{name}.fr', (px, y0 + h + .05, pz), (w + .2, .1, t + .06), fm, bev=.01, rot=rot)
    if step:
        px, pz = wall_point(a, b, u, t * .5 + .2); box(f'{name}.step', (px, y0 + .06, pz), (w + .4, .12, .45), mat('stone', '#bdb5a6', .85), bev=.015, rot=rot)
    return (u - w / 2, u + w / 2, 0, h)


def gable_roof(name, x0, x1, z0, z1, y, rise, col='#8e4a36', over=0.35, ridge_axis='x', tiles=True, chimney=None):
    """pitched roof with real overlapping tile courses, ridge cap, fascia boards and eaves"""
    m = mat('roof', col, .8); fm = mat('paint', '#e9e2d0', .55); wall_y = y
    if ridge_axis == 'x':
        y = wall_y - rise * over / ((z1 - z0) / 2 + over)
        L_ = x1 - x0 + over * 2; half = (z1 - z0) / 2 + over; zc = (z0 + z1) / 2; xc = (x0 + x1) / 2
        slope = math.atan2(rise, half); sl = math.hypot(half, rise)
        for s in (1, -1):
            n = max(4, int(sl / .24)) if tiles else 1
            for i in range(n):
                k = (i + .5) / n; zz = zc + s * half * (1 - k); yy = y + rise * k
                box(f'{name}.tile', (xc, yy, zz), (L_, .05, sl / n * 1.15), m, bev=.01, rot=(s * slope, 0, 0), seg=1)
            box(f'{name}.fascia', (xc, y - .06, zc + s * half), (L_, .16, .05), fm, bev=.008)
        box(f'{name}.ridge', (xc, y + rise + .04, zc), (L_ + .05, .12, .18), m, bev=.03)
        # gable triangles
        for gx in (x0, x1):
            bm = bmesh.new(); vs = [bm.verts.new(L(gx, wall_y, z0)), bm.verts.new(L(gx, wall_y, z1)), bm.verts.new(L(gx, y + rise - .06, zc))]
            bm.faces.new(vs); bmesh.ops.solidify(bm, geom=bm.faces[:], thickness=.2)
            _bm_obj(f'{name}.gable', bm, mat('plaster', '#e8dcc4', .9))
    else:
        L_ = z1 - z0 + over * 2; half = (x1 - x0) / 2 + over; xc = (x0 + x1) / 2; zc = (z0 + z1) / 2
        y = wall_y - rise * over / half
        slope = math.atan2(rise, half); sl = math.hypot(half, rise)
        for s in (1, -1):
            n = max(4, int(sl / .24)) if tiles else 1
            for i in range(n):
                k = (i + .5) / n; xx = xc + s * half * (1 - k); yy = y + rise * k
                box(f'{name}.tile', (xx, yy, zc), (sl / n * 1.15, .05, L_), m, bev=.01, rot=(0, 0, -s * slope), seg=1)
            box(f'{name}.fascia', (xc + s * half, y - .06, zc), (.05, .16, L_), fm, bev=.008)
        box(f'{name}.ridge', (xc, y + rise + .04, zc), (.18, .12, L_ + .05), m, bev=.03)
        for gz in (z0, z1):
            bm = bmesh.new(); vs = [bm.verts.new(L(x0, wall_y, gz)), bm.verts.new(L(x1, wall_y, gz)), bm.verts.new(L(xc, y + rise - .06, gz))]
            bm.faces.new(vs); bmesh.ops.solidify(bm, geom=bm.faces[:], thickness=.2)
            _bm_obj(f'{name}.gable', bm, mat('plaster', '#e8dcc4', .9))
    if chimney:
        cx, cz, ch = chimney
        box(f'{name}.chim', (cx, wall_y + rise * .6 + ch / 2, cz), (.6, ch, .6), mat('brick', '#8f4632', .9), bev=.01)
        box(f'{name}.chimcap', (cx, wall_y + rise * .6 + ch + .05, cz), (.72, .1, .72), mat('stone', '#b8b0a2', .8), bev=.01)
        for dx in (-.13, .13): cyl(f'{name}.pot', (cx + dx, wall_y + rise * .6 + ch + .25, cz), .08, .32, mat('roof', '#9d5a3c', .8), verts=12)


def house(name, x, z, w, d, floors=2, fh=3.0, col='#a4553b', roof='#7e3f2f', trim='#efe6d2', door_col='#2f5d4f', facing=1,
          shutters=None, timber=False, plaster=None, shop=None, sign=None, lit=0.0, chimney=True, seed=1):
    """period town house: plinth, brick or plaster walls (or timber framing), string courses, quoins, windows per floor with
    sills/lintels, panelled door with step, optional shopfront with awning and sign, gable roof with tiles and chimney."""
    rr = random.Random(seed); x0, x1, z0, z1 = x - w / 2, x + w / 2, z - d / 2, z + d / 2; H = floors * fh
    front = ((x0, z1), (x1, z1)) if facing > 0 else ((x1, z0), (x0, z0))
    back = ((x1, z0), (x0, z0)) if facing > 0 else ((x0, z1), (x1, z1))
    sides = [((x0, z0), (x0, z1)), ((x1, z1), (x1, z0))]
    wallcol = plaster or col; surf = 'plaster' if plaster else 'brick'
    ops_front = []
    nwin = max(1, int(w / 1.9))
    for f in range(floors):
        for i in range(nwin):
            u = w * (i + .5) / nwin
            if f == 0 and shop and abs(u - w / 2) < w * .3: continue
            if f == 0 and not shop and i == nwin // 2: continue
            ops_front.append(window(f'{name}.win{f}{i}', *front, u, f * fh + .9, 1.0, 1.55 if f else 1.7, shutters=shutters, lit=lit if rr.random() < .5 else 0, frame=trim))
    if shop:
        sw = w * .58; ops_front.append((w / 2 - sw / 2, w / 2 + sw / 2, .45, 2.75))
        a, b = front; ang = math.atan2(b[1] - a[1], b[0] - a[0]); cx, cz = wall_point(a, b, w / 2, .16)
        box(f'{name}.shopgl', (cx, 1.6, cz), (sw - .1, 2.2, .03), mat('glass', '#86a9b6', .08) if not lit else mat('emit', '#ffcf8a', .3, emit=lit), bev=0, rot=(0, -ang, 0))
        box(f'{name}.shopfr', (cx, .3, cz), (sw + .1, .6, .12), mat('paint', shop, .5), bev=.01, rot=(0, -ang, 0))
        box(f'{name}.fascia', (cx, 3.05, cz + 0), (sw + .5, .55, .14), mat('paint', shop, .5), bev=.015, rot=(0, -ang, 0))
        for k in range(1, 4):
            px, pz = wall_point(a, b, w / 2 - sw / 2 + sw * k / 4, .17); box(f'{name}.mull', (px, 1.6, pz), (.05, 2.2, .06), mat('paint', shop, .5), bev=.004, rot=(0, -ang, 0))
        # striped awning
        ax_, az_ = wall_point(a, b, w / 2, .7)
        for k in range(8):
            px, pz = wall_point(a, b, w / 2 - sw / 2 + sw * (k + .5) / 8, .7)
            box(f'{name}.awn', (px, 2.7, pz), (sw / 8, .04, 1.1), mat('fabric', '#e9e1cf' if k % 2 else sign or '#b8423a', .9), bev=0, rot=(-.38, -ang, 0))
        ops_front.append(door(f'{name}.door', *front, w * .9 if w > 4 else w * .82, w=.9, col=door_col, glazed=True))
    else:
        ops_front.append(door(f'{name}.door', *front, w / 2, col=door_col))
    if timber:
        brick_wall(f'{name}.fw', *front, fh, base=wallcol, openings=[o for o in ops_front if o[2] < fh], surf=surf)
        brick_wall(f'{name}.fw2', *front, H - fh, y0=fh, base='#efe3c8', openings=[(o[0], o[1], o[2] - fh, o[3] - fh) for o in ops_front if o[2] >= fh], surf='plaster')
        a, b = front; ang = math.atan2(b[1] - a[1], b[0] - a[0])
        for k in range(int(w / .9) + 1):
            px, pz = wall_point(a, b, min(w, k * .9), .16); box(f'{name}.tb', (px, fh + (H - fh) / 2, pz), (.14, H - fh, .06), mat('bark', '#4a3122', .8), bev=.01, rot=(0, -ang, 0))
        for yy in (fh, H): px, pz = wall_point(a, b, w / 2, .16); box(f'{name}.tb', (px, yy, pz), (w, .16, .07), mat('bark', '#4a3122', .8), bev=.01, rot=(0, -ang, 0))
    else:
        brick_wall(f'{name}.fw', *front, H, base=wallcol, openings=ops_front, surf=surf)
    brick_wall(f'{name}.bw', *back, H, base=wallcol, surf=surf)
    for s_ in sides: brick_wall(f'{name}.sw', *s_, H, base=wallcol, surf=surf)
    # plinth, string courses, quoins, cornice
    sm = mat('stone', '#c8bfae', .85)
    box(f'{name}.plinth', (x, .2, z), (w + .12, .4, d + .12), sm, bev=.02)
    for f in range(1, floors): box(f'{name}.course', (x, f * fh, z), (w + .1, .14, d + .1), sm, bev=.015)
    box(f'{name}.cornice', (x, H - .08, z), (w + .3, .22, d + .3), mat('paint', trim, .5), bev=.03)
    if not plaster:
        for (qx, qz) in [(x0, z0), (x0, z1), (x1, z0), (x1, z1)]:
            for k in range(int(H / .5)): box(f'{name}.quoin', (qx, k * .5 + .25, qz), (.36 if k % 2 else .26, .46, .36 if k % 2 == 0 else .26), sm, bev=.012, seg=1)
    box(f'{name}.inner', (x, H / 2, z), (w - .5, H - .1, d - .5), mat('paint', '#2b241f', 1.0), bev=0)
    gable_roof(f'{name}.roof', x0, x1, z0, z1, H, min(w, d) * .42, col=roof, chimney=(x0 + w * .78, z, 1.6) if chimney else None, ridge_axis='x')
    # wall lantern + drainpipe
    a, b = front; px, pz = wall_point(a, b, .25, .3)
    tube(f'{name}.drain', [(px, .1, pz), (px, H, pz)], .045, mat('metal', '#3e4244', .5, .6))
    return (x0, x1, z0, z1, H)


def lantern(name, p, lit=2.5, col='#2c2f30', glow='#ffc46b', post=0.0, bracket=None):
    """period street/wall lantern: cap, glass box with glowing core, frame bars, optional post or wall bracket"""
    m = mat('metal', col, .45, .7); x, y, z = p
    if post:
        cyl(f'{name}.post', (x, post / 2, z), .06, post, m, verts=14); cyl(f'{name}.base', (x, .25, z), .12, .5, m, verts=14, r2=.08)
        y = post + .25
    if bracket:
        bx, bz = bracket; tube(f'{name}.br', [(bx, y + .35, bz), ((bx + x) / 2, y + .48, (bz + z) / 2), (x, y + .38, z)], .02, m)
    box(f'{name}.glow', (x, y, z), (.17, .26, .17), mat('emit', glow, .2, emit=lit), bev=0)
    for dx in (-.1, .1):
        for dz in (-.1, .1): box(f'{name}.bar', (x + dx, y, z + dz), (.02, .32, .02), m, bev=0)
    box(f'{name}.cap', (x, y + .2, z), (.28, .07, .28), m, bev=.01, taper=.35); sphere(f'{name}.fin', (x, y + .28, z), .04, m)
    box(f'{name}.bot', (x, y - .17, z), (.22, .05, .22), m, bev=.01)


# ---------------------------------------------------------------- furniture & props
def table(name, x, z, w, d, h=0.76, top='#7a4e2e', legs=None):
    tm = mat('plank', top, .55); lm = mat('plank', legs or top, .6)
    box(f'{name}.top', (x, h - .025, z), (w, .05, d), tm, bev=.012)
    box(f'{name}.apron', (x, h - .1, z), (w - .12, .1, d - .12), lm, bev=.008)
    for sx in (-1, 1):
        for sz in (-1, 1): box(f'{name}.leg', (x + sx * (w / 2 - .07), (h - .05) / 2, z + sz * (d / 2 - .07)), (.06, h - .05, .06), lm, bev=.008, taper=-.1)


def chair(name, x, z, face=0.0, col='#6b4326', seat='#7d2f2a'):
    m = mat('plank', col, .6); c, s = math.cos(face), math.sin(face)
    P = lambda dx, dz: (x + dx * c + dz * s, z - dx * s + dz * c)
    for (dx, dz) in [(-.2, -.2), (.2, -.2), (-.2, .2), (.2, .2)]:
        px, pz = P(dx, dz); box(f'{name}.leg', (px, .23, pz), (.04, .46, .04), m, bev=.006)
    box(f'{name}.seat', (x, .48, z), (.46, .05, .46), m, bev=.01, rot=(0, face, 0)); box(f'{name}.cush', (x, .515, z), (.42, .04, .42), mat('fabric', seat, .9), bev=.015, rot=(0, face, 0))
    for dx in (-.2, .2):
        px, pz = P(dx, -.21); box(f'{name}.back', (px, .78, pz), (.04, .6, .04), m, bev=.006)
    px, pz = P(0, -.21); box(f'{name}.rail', (px, 1.02, pz), (.46, .1, .035), m, bev=.01, rot=(0, face, 0)); box(f'{name}.rail', (px, .8, pz), (.42, .05, .03), m, bev=.006, rot=(0, face, 0))


def bookshelf(name, x, z, w=1.2, h=2.0, d=0.32, face=0.0, col='#5c3a22', seed=1):
    rr = random.Random(seed); m = mat('plank', col, .6); cs = ['#7a2a24', '#2c4a6b', '#3f5f3a', '#8a6a2a', '#5a3550', '#b48a52', '#2e2e3a']
    c, s = math.cos(face), math.sin(face); rot = (0, face, 0)
    P = lambda dx, dy, dz: (x + dx * c + dz * s, dy, z - dx * s + dz * c)
    for dx in (-w / 2, w / 2): box(f'{name}.side', P(dx, h / 2, 0), (.04, h, d), m, bev=.008, rot=rot)
    box(f'{name}.back', P(0, h / 2, -d / 2), (w, h, .02), m, bev=0, rot=rot)
    for k in range(5):
        y = .05 + k * (h - .1) / 4; box(f'{name}.shelf', P(0, y, 0), (w, .035, d), m, bev=.006, rot=rot)
        if k == 4: break
        xx = -w / 2 + .05
        while xx < w / 2 - .08:
            bw = .025 + rr.random() * .035; bh = .2 + rr.random() * .13; lean = 0 if rr.random() < .85 else .2
            box(f'{name}.book', P(xx + bw / 2, y + .02 + bh / 2, .02), (bw, bh, d * .8), mat('fabric', rr.choice(cs), .85), bev=.004, rot=(0, face, lean))
            xx += bw + .004


def crate(name, p, s=0.6, col='#9b7448', rot=0.0):
    m = mat('plank', col, .7); x, y, z = p
    box(f'{name}.body', (x, y + s / 2, z), (s * .96, s * .96, s * .96), m, bev=.01, rot=(0, rot, 0))
    for dy in (.08, .5, .92):
        box(f'{name}.slat', (x, y + s * dy, z), (s, s * .1, s), mat('plank', '#7d5a35', .7), bev=.008, rot=(0, rot, 0))


def desk_lamp(name, x, y, z, shade='#2f5f4a', lit=3.0):
    m = mat('brass', '#b8923e', .3, .9)
    cyl(f'{name}.base', (x, y + .015, z), .09, .03, m, verts=20); cyl(f'{name}.stem', (x, y + .2, z), .012, .38, m, verts=10)
    cyl(f'{name}.shade', (x + .05, y + .4, z), .13, .12, mat('paint', shade, .4), verts=24, r2=.06)
    box(f'{name}.bulb', (x + .05, y + .35, z), (.08, .04, .08), mat('emit', '#ffd28a', .2, emit=lit), bev=0)


def cage(name, p, w=0.5, h=0.45, d=0.4, col='#c9a24a'):
    """wire bird cage / pigeon loft box: base tray, many thin bars, top bars"""
    x, y, z = p; m = mat('brass', col, .35, .85)
    box(f'{name}.tray', (x, y + .03, z), (w + .04, .06, d + .04), mat('plank', '#6e4a2c', .6), bev=.01)
    n = int(w / .035)
    for i in range(n + 1):
        xx = x - w / 2 + w * i / n
        for zz in (z - d / 2, z + d / 2): cyl(f'{name}.bar', (xx, y + .06 + h / 2, zz), .005, h, m, verts=5, smooth=False)
    nz = int(d / .035)
    for i in range(nz + 1):
        zz = z - d / 2 + d * i / nz
        for xx in (x - w / 2, x + w / 2): cyl(f'{name}.bar', (xx, y + .06 + h / 2, zz), .005, h, m, verts=5, smooth=False)
    box(f'{name}.top', (x, y + .06 + h, z), (w + .02, .02, d + .02), m, bev=.004)


# ---------------------------------------------------------------- landscape
def terrain(name, x0, x1, z0, z1, n, height, colour_fn, flat=(), skirt=True):
    """heightfield ground with vertex colours. height(x,z)->y; colour_fn(x,z,y,slope)->rgb (0..1, sRGB-ish multipliers on a
    white 'terrain' surface). flat: list of (x, z, r, y) discs flattened smoothly (building pads, paths)."""
    bm = bmesh.new(); vs = []
    for j in range(n + 1):
        row = []
        for i in range(n + 1):
            x = x0 + (x1 - x0) * i / n; z = z0 + (z1 - z0) * j / n; y = height(x, z)
            for (fx, fz, fr, fy) in flat:
                dd = math.hypot(x - fx, z - fz); k = max(0.0, min(1.0, (dd - fr) / (fr * .6 + 1)))
                k = k * k * (3 - 2 * k); y = fy + (y - fy) * k
            row.append(bm.verts.new(L(x, y, z)))
        vs.append(row)
    for j in range(n):
        for i in range(n): bm.faces.new((vs[j][i], vs[j + 1][i], vs[j + 1][i + 1], vs[j][i + 1]))   # wound so normals face up
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    for f in me.polygons: f.use_smooth = True
    o = _obj(name, me); o.data.materials.append(mat('terrain', '#ffffff', .95))
    me.update(); a = me.color_attributes.new('Col', 'FLOAT_COLOR', 'POINT')
    for i, v in enumerate(me.vertices):
        x, y, z = v.co.x, v.co.z, -v.co.y; nrm = v.normal; slope = 1 - abs(nrm.z)
        r, g, b = colour_fn(x, z, y, slope); a.data[i].color = (r, g, b, 1)
    me.color_attributes.active_color = a
    return o


def fbm(x, z, s=1.0, oct=4, seed=0):
    t, a, f = 0.0, 1.0, s
    for _ in range(oct): t += a * noise.noise(Vector((x * f + seed * 7.1, z * f - seed * 3.3, seed * .7))); a *= .5; f *= 2.03
    return t


def tree(name, x, z, y=0.0, h=5.5, r=2.2, leaf='#4f8a3a', leaf2='#79b04a', bark='#5d4030', seed=1, kind='round'):
    """stylised cartoon tree: tapered trunk + branches, 5-9 overlapping foliage clumps with a light-to-dark vertex
    gradient (sunlit tops, cool undersides) so it reads as volume, not a ball"""
    rr = random.Random(seed); bm_ = mat('bark', bark, .85)
    tube(f'{name}.trunk', [(x, y - .2, z), (x + rr.uniform(-.2, .2), y + h * .35, z + rr.uniform(-.2, .2)), (x + rr.uniform(-.3, .3), y + h * .62, z + rr.uniform(-.3, .3))], h * .055, bm_, r_end=h * .03)
    for k in range(3):
        a = rr.random() * 6.28; tube(f'{name}.br', [(x, y + h * .45, z), (x + math.cos(a) * r * .55, y + h * .68, z + math.sin(a) * r * .55)], h * .02, bm_, r_end=h * .01)
    lm = mat('leaf', leaf, .9); n = 6 + int(rr.random() * 4)
    clumps = []
    for k in range(n):
        a = rr.random() * 6.28; d = rr.random() * r * .62; yy = y + h * (.62 + rr.random() * .3)
        if kind == 'cone': d *= (1 - (yy - y - h * .5) / (h * .55)); yy = y + h * (.35 + k / n * .6)
        cr = r * (.42 + rr.random() * .25) * (1.15 if kind != 'cone' else .9 - k / n * .5)
        clumps.append(blob(f'{name}.leaf', (x + math.cos(a) * d, yy, z + math.sin(a) * d), cr, lm, sc=(1, .82, 1), sub=2, rough=.22, seed=seed * 10 + k))
    top = y + h * 1.05; lc, dc = rgb(leaf2), rgb(leaf)
    for o in clumps:
        def f(c, n_, rr_, top=top):
            k = max(0.0, min(1.0, (c[1] - (top - h * .6)) / (h * .6))); up = max(0.0, n_[1])
            l = .62 + .38 * k + .18 * up
            return tuple(min(1.6, l * (lc[i] / max(dc[i], .01) * k + (1 - k))) for i in range(3))
        colour(o, f)
    return clumps


def bush(name, x, z, y=0.0, r=0.7, leaf='#4a7f36', seed=1, flowers=None):
    rr = random.Random(seed); lm = mat('leaf', leaf, .9)
    for k in range(3 + int(rr.random() * 3)):
        a = rr.random() * 6.28; d = rr.random() * r * .5
        blob(f'{name}.b', (x + math.cos(a) * d, y + r * .45, z + math.sin(a) * d), r * (.5 + rr.random() * .3), lm, sc=(1, .75, 1), sub=2, rough=.25, seed=seed * 7 + k)
    if flowers:
        for k in range(10):
            a = rr.random() * 6.28; d = rr.random() * r * .8
            sphere(f'{name}.fl', (x + math.cos(a) * d, y + r * (.55 + rr.random() * .45), z + math.sin(a) * d), .05, mat('paint', flowers, .6), segs=8, rings=5)


def fence(name, pts, h=1.0, col='#8d6a46', gap=2.0):
    m = mat('plank', col, .75)
    for (ax, az), (bx, bz) in zip(pts[:-1], pts[1:]):
        ln = math.hypot(bx - ax, bz - az); n = max(1, int(ln / gap)); ang = math.atan2(bz - az, bx - ax)
        for i in range(n + 1):
            k = i / n; box(f'{name}.post', (ax + (bx - ax) * k, h / 2, az + (bz - az) * k), (.1, h, .1), m, bev=.012, taper=.0)
        for yy in (h * .35, h * .8): box(f'{name}.rail', ((ax + bx) / 2, yy, (az + bz) / 2), (ln, .08, .04), m, bev=.008, rot=(0, -ang, 0))


def scatter_json(path, data):
    Path(path).parent.mkdir(parents=True, exist_ok=True); json.dump(data, open(path, 'w'), separators=(',', ':')); print('exported', path, flush=True)
