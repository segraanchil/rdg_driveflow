"""
Renders sample 360° turntable frames of a stylized car (sedan / MPV) with a tiny painter's-algorithm
rasterizer (numpy + PIL), plus an interior look-around panorama. Output = sample media for the
RDG DriveFlow showroom, clearly labelled as samples in the app.
usage: render360.py <out_dir> [frames]
"""
import math, os, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

OUT = sys.argv[1]
FRAMES = int(sys.argv[2]) if len(sys.argv) > 2 else 24
W, H, SS = 1100, 690, 2  # output size, supersampling

SHAPES = {
    # top profile (x, z) from rear (-) to front (+); glass = x range of the glasshouse; roof = flat roof range
    'sedan': dict(L=4.5, half_w=0.87, wheel_x=(1.38, -1.32), wheel_r=0.31,
                  top=[(-2.25, 0.86), (-2.10, 0.98), (-1.30, 1.01), (-0.62, 1.42), (0.30, 1.44), (1.00, 0.96), (1.95, 0.86), (2.18, 0.78), (2.25, 0.66)],
                  glass=(-1.30, 1.00), belt=[(-2.25, 0.96), (2.25, 0.84)]),
    'mpv': dict(L=4.75, half_w=0.92, wheel_x=(1.50, -1.38), wheel_r=0.35,
                top=[(-2.38, 0.98), (-2.34, 1.62), (-2.15, 1.80), (0.55, 1.84), (1.20, 1.22), (2.05, 1.02), (2.30, 0.92), (2.38, 0.78)],
                glass=(-2.30, 1.20), belt=[(-2.38, 1.12), (2.38, 1.00)]),
}

COLORS = {
    'white': (0.93, 0.93, 0.92), 'silver': (0.70, 0.72, 0.74), 'red': (0.62, 0.06, 0.07),
    'black': (0.10, 0.10, 0.11), 'blue': (0.10, 0.22, 0.45), 'gray': (0.42, 0.43, 0.45),
}


def interp(points, x):
    xs, zs = zip(*points)
    return float(np.interp(x, xs, zs))


def build_car(shape, body_rgb):
    s = SHAPES[shape]
    L, hw = s['L'], s['half_w']
    xs = np.concatenate([np.linspace(-L / 2, -L / 2 + 0.25, 4), np.linspace(-L / 2 + 0.3, L / 2 - 0.3, 90), np.linspace(L / 2 - 0.25, L / 2, 4)])
    g0, g1 = s['glass']
    faces = []  # (verts[N,3], rgb, material)

    def width(x):
        t = abs(x) / (L / 2)
        return hw * (1 - 0.18 * max(0, t - 0.82) / 0.18) if t > 0.82 else hw

    def bottom(x):
        zb = 0.20 + 0.14 * max(0, (abs(x) - (L / 2 - 0.35)) / 0.35)
        for xc in s['wheel_x']:
            ar = s['wheel_r'] + 0.08
            if abs(x - xc) < ar:
                zb = max(zb, s['wheel_r'] + 0.02 + math.sqrt(ar ** 2 - (x - xc) ** 2) * 0.92)
        return zb

    rings = []
    for x in xs:
        zt, zbelt, zb, w = interp(s['top'], x), interp(s['belt'], x), bottom(x), width(x)
        zbelt = min(zbelt, zt - 0.02)
        glassy = g0 <= x <= g1 and zt > zbelt + 0.12
        tw = w * (0.80 if glassy else 0.94)
        zmid = zb + 0.5 * (zbelt - zb)
        ring = [(-w * 0.9, zb), (-w, zb + 0.07), (-w, zmid), (-w * 0.995, zbelt), (-tw, zt - 0.05), (-tw * 0.55, zt),
                (tw * 0.55, zt), (tw, zt - 0.05), (w * 0.995, zbelt), (w, zmid), (w, zb + 0.07), (w * 0.9, zb)]
        rings.append((x, glassy, [(x, y, z) for y, z in ring]))

    glass_rgb, trim = (0.10, 0.12, 0.14), (0.16, 0.16, 0.17)
    for (x0, gl0, r0), (x1, gl1, r1) in zip(rings, rings[1:]):
        xm = (x0 + x1) / 2
        for k in range(len(r0)):
            k2 = (k + 1) % len(r0)
            quad = np.array([r0[k], r1[k], r1[k2], r0[k2]], float)
            rgb, mat = body_rgb, 'paint'
            side_window = k in (3, 7) and gl0 and gl1
            top_glass = k in (4, 5, 6) and gl0 and gl1 and not (s['top'][-5][0] - 0.05 <= xm <= s['top'][-4][0] + 0.05 if shape == 'sedan' else s['top'][3][0] - 0.0 <= xm <= s['top'][4][0] - 0.25)
            if shape == 'sedan':
                top_glass = k in (4, 5, 6) and gl0 and gl1 and not (-0.55 <= xm <= 0.25)
            else:
                top_glass = k in (4, 5, 6) and gl0 and gl1 and (xm > 0.6 or xm < -2.2)
            pillar = shape == 'sedan' and (-0.12 <= xm <= -0.02) or shape == 'mpv' and (-0.30 <= xm <= -0.20 or -1.45 <= xm <= -1.35)
            if (side_window and not pillar) or top_glass:
                rgb, mat = glass_rgb, 'glass'
            elif side_window and pillar:
                rgb, mat = trim, 'trim'
            elif k in (0, 11):
                rgb, mat = (0.07, 0.07, 0.07), 'trim'
            faces.append((quad, rgb, mat))

    # end caps (front +x, rear -x)
    for (x, _, ring), front in ((rings[-1], True), (rings[0], False)):
        faces.append((np.array(ring, float), body_rgb, 'paint'))
        zt = interp(s['top'], x)
        zb = bottom(x)
        w = width(x)
        dx = 0.006 if front else -0.006
        if front:
            lamp_z, grille = (zt - 0.13, zt - 0.03), (zb + 0.12, zt - 0.16)
            faces.append((np.array([(x + dx, -w * 0.42, grille[0]), (x + dx, w * 0.42, grille[0]), (x + dx, w * 0.42, grille[1]), (x + dx, -w * 0.42, grille[1])]), (0.06, 0.06, 0.07), 'trim'))
            for sgn in (-1, 1):
                faces.append((np.array([(x + dx, sgn * w * 0.48, lamp_z[0]), (x + dx, sgn * w * 0.86, lamp_z[0] + 0.02), (x + dx, sgn * w * 0.86, lamp_z[1]), (x + dx, sgn * w * 0.48, lamp_z[1])]), (0.92, 0.93, 0.95), 'lamp'))
        else:
            lamp_z = (zt - 0.16, zt - 0.05)
            for sgn in (-1, 1):
                faces.append((np.array([(x + dx, sgn * w * 0.50, lamp_z[0]), (x + dx, sgn * w * 0.90, lamp_z[0]), (x + dx, sgn * w * 0.90, lamp_z[1]), (x + dx, sgn * w * 0.50, lamp_z[1])]), (0.70, 0.04, 0.05), 'lamp'))
            faces.append((np.array([(x + dx, -w * 0.22, zb + 0.18), (x + dx, w * 0.22, zb + 0.18), (x + dx, w * 0.22, zb + 0.30), (x + dx, -w * 0.22, zb + 0.30)]), (0.85, 0.85, 0.85), 'trim'))

    # dark wheel wells behind each wheel so the arches never show the background through the body
    for xc in s['wheel_x']:
        ar = s['wheel_r'] + 0.08
        for side in (-1, 1):
            yw = side * (width(xc) - 0.16)
            angs = np.linspace(0, np.pi, 14)
            pts = [(xc + ar * math.cos(a), yw, s['wheel_r'] + 0.02 + ar * math.sin(a) * 0.95) for a in angs] + [(xc - ar, yw, 0.18), (xc + ar, yw, 0.18)]
            faces.append((np.array(pts[:14] + [pts[15], pts[14]]), (0.03, 0.03, 0.03), 'well'))

    # wheels
    r, seg = s['wheel_r'], 20
    for xc in s['wheel_x']:
        for side in (-1, 1):
            yc = side * (width(xc) - 0.04)
            hwid = 0.11
            angs = np.linspace(0, 2 * np.pi, seg, endpoint=False)
            outer = [(xc + r * math.cos(a), yc + side * hwid, r + r * math.sin(a)) for a in angs]
            inner = [(xc + r * math.cos(a), yc - side * hwid, r + r * math.sin(a)) for a in angs]
            for i in range(seg):
                j = (i + 1) % seg
                faces.append((np.array([outer[i], outer[j], inner[j], inner[i]]), (0.06, 0.06, 0.06), 'tire'))
            faces.append((np.array(outer), (0.07, 0.07, 0.07), 'tire'))
            rim = [(xc + r * 0.66 * math.cos(a), yc + side * (hwid + 0.004), r + r * 0.66 * math.sin(a)) for a in angs]
            faces.append((np.array(rim), (0.78, 0.79, 0.80), 'rim'))
            for sp in range(5):
                a = sp * 2 * np.pi / 5
                p = lambda rr, da: (xc + rr * math.cos(a + da), yc + side * (hwid + 0.008), r + rr * math.sin(a + da))
                faces.append((np.array([p(0.07, -0.25), p(r * 0.62, -0.10), p(r * 0.62, 0.10), p(0.07, 0.25)]), (0.55, 0.56, 0.58), 'rim'))
            hub = [(xc + 0.06 * math.cos(a), yc + side * (hwid + 0.012), r + 0.06 * math.sin(a)) for a in angs]
            faces.append((np.array(hub), (0.25, 0.25, 0.26), 'rim'))
    # side mirrors
    mx = s['glass'][1] - 0.05
    for side in (-1, 1):
        y0 = side * (width(mx) + 0.0)
        z0 = interp(s['belt'], mx) + 0.04
        box = lambda dx, dy, dz: (mx + dx, y0 + side * dy, z0 + dz)
        faces.append((np.array([box(0, 0, 0), box(-0.14, 0.16, 0), box(-0.14, 0.16, 0.11), box(0, 0, 0.11)]), body_rgb, 'paint'))
    return faces


def look_at(cam, target):
    f = target - cam
    f /= np.linalg.norm(f)
    right = np.cross(f, np.array([0, 0, 1.0]))
    right /= np.linalg.norm(right)
    up = np.cross(right, f)
    return f, right, up


def background(w, h):
    img = Image.new('RGB', (w, h))
    px = np.zeros((h, w, 3), np.float32)
    t = np.linspace(0, 1, h)[:, None]
    horizon = 0.58
    top = np.array([247, 247, 246.0])
    mid = np.array([232, 232, 230.0])
    floor_a, floor_b = np.array([226, 226, 224.0]), np.array([212, 212, 210.0])
    for row in range(h):
        y = row / h
        if y < horizon:
            c = top + (mid - top) * (y / horizon)
        else:
            c = floor_a + (floor_b - floor_a) * ((y - horizon) / (1 - horizon))
        px[row, :, :] = c
    # soft vignette
    yy, xx = np.mgrid[0:h, 0:w]
    v = 1 - 0.10 * (((xx - w / 2) / (w / 2)) ** 2 + ((yy - h / 2) / (h / 2)) ** 2)
    px *= v[..., None]
    return Image.fromarray(np.clip(px, 0, 255).astype(np.uint8))


def render(shape, color_key, angle_deg, path):
    body = COLORS[color_key]
    faces = build_car(shape, body)
    w, h = W * SS, H * SS
    az = math.radians(angle_deg)
    D, elev = 9.2, math.radians(12)
    target = np.array([0.0, 0.0, 0.62])
    cam = target + np.array([D * math.cos(elev) * math.cos(az), D * math.cos(elev) * math.sin(az), D * math.sin(elev)])
    fwd, right, up = look_at(cam, target)
    focal = h * 2.45
    light = -0.45 * right + 0.75 * up - 0.5 * fwd
    light /= np.linalg.norm(light)
    car_center = np.array([0, 0, 0.75])

    def proj(p):
        d = p - cam
        zc = d @ fwd
        return (w / 2 + focal * (d @ right) / zc, h * 0.56 - focal * (d @ up) / zc), zc

    img = background(w, h).convert('RGBA')

    # ground shadow
    shadow = Image.new('L', (w, h), 0)
    sd = ImageDraw.Draw(shadow)
    L, hw = SHAPES[shape]['L'], SHAPES[shape]['half_w']
    outline = [proj(np.array([L / 2 * math.cos(t) * 1.04, hw * math.sin(t) * 1.15, 0.0]))[0] for t in np.linspace(0, 2 * np.pi, 48)]
    sd.polygon(outline, fill=150)
    shadow = shadow.filter(ImageFilter.GaussianBlur(26 * SS))
    for xc in SHAPES[shape]['wheel_x']:
        for side in (-1, 1):
            c, _ = proj(np.array([xc, side * (hw - 0.04), 0.0]))
            sd2 = ImageDraw.Draw(shadow)
            sd2.ellipse([c[0] - 34 * SS, c[1] - 9 * SS, c[0] + 34 * SS, c[1] + 9 * SS], fill=190)
    shadow = shadow.filter(ImageFilter.GaussianBlur(5 * SS))
    dark = Image.new('RGBA', (w, h), (30, 30, 30, 255))
    img = Image.composite(dark, img, shadow.point(lambda v: int(v * 0.55)))

    draw = ImageDraw.Draw(img)
    items = []
    for verts, rgb, mat in faces:
        c = verts.mean(axis=0)
        n = np.cross(verts[1] - verts[0], verts[2] - verts[0])
        if np.linalg.norm(n) < 1e-9:
            n = np.cross(verts[2] - verts[0], verts[3] - verts[0]) if len(verts) > 3 else n
        nn = np.linalg.norm(n)
        if nn < 1e-9:
            continue
        n = n / nn
        ref = c - (car_center if mat not in ('tire', 'rim') else np.array([c[0], 0, c[2]]))
        if mat in ('tire', 'rim') and len(verts) > 4:  # flat discs: face outward along y
            ref = np.array([0, np.sign(c[1]), 0])
        if n @ ref < 0:
            n = -n
        to_cam = cam - c
        if mat == 'well':
            n = to_cam / np.linalg.norm(to_cam)  # double-sided
        elif n @ to_cam <= 0:
            continue
        diff = max(0.0, n @ light)
        view = to_cam / np.linalg.norm(to_cam)
        half = light + view
        half /= np.linalg.norm(half)
        spec = max(0.0, n @ half)
        if mat == 'paint':
            shade = np.array(rgb) * (0.42 + 0.62 * diff) + 0.55 * spec ** 40 + 0.06 * (1 - abs(n[2])) * 0.5
        elif mat == 'glass':
            shade = np.array(rgb) * (0.6 + 0.4 * diff) + 0.65 * spec ** 18 + 0.10 * max(0, n[2])
        elif mat == 'lamp':
            shade = np.array(rgb) * (0.8 + 0.25 * diff) + 0.3 * spec ** 10
        elif mat == 'rim':
            shade = np.array(rgb) * (0.55 + 0.5 * diff) + 0.4 * spec ** 20
        else:
            shade = np.array(rgb) * (0.6 + 0.5 * diff) + 0.08 * spec ** 8
        col = tuple(int(255 * min(1.0, v)) for v in shade)
        pts = [proj(v)[0] for v in verts]
        depth = (c - cam) @ fwd
        items.append((depth, pts, col))
    for _, pts, col in sorted(items, key=lambda t: -t[0]):
        draw.polygon(pts, fill=col)
    img.convert('RGB').resize((W, H), Image.LANCZOS).save(path, quality=84, optimize=True, progressive=True)


def interior(path, tone='dark'):
    Wp, Hp = 3600, 1000
    img = Image.new('RGB', (Wp, Hp))
    d = ImageDraw.Draw(img)
    base = {'dark': (34, 34, 37), 'beige': (120, 108, 92)}[tone]
    trim_c = {'dark': (22, 22, 24), 'beige': (82, 72, 60)}[tone]
    head = {'dark': (70, 70, 74), 'beige': (176, 166, 150)}[tone]
    # headliner + floor gradient
    for y in range(Hp):
        t = y / Hp
        if t < 0.16:
            c = tuple(int(h * (0.85 + 0.15 * t / 0.16)) for h in head)
        else:
            c = tuple(int(b * (1.15 - 0.45 * t)) for b in base)
        d.line([(0, y), (Wp, y)], fill=c)

    def sky(box, horizon=0.62):
        x0, y0, x1, y1 = box
        for y in range(y0, y1):
            t = (y - y0) / max(1, (y1 - y0))
            if t < horizon:
                c = (int(150 + 90 * t), int(190 + 55 * t), int(230 + 20 * t))
            else:
                c = (int(96 - 30 * (t - horizon)), int(118 - 30 * (t - horizon)), int(92 - 20 * (t - horizon)))
            d.line([(x0, y), (x1, y)], fill=c)
        # distant hills / trees
        rng = np.random.default_rng(x0)
        pts = [(x0, int(y0 + (y1 - y0) * horizon))]
        for x in list(range(x0, x1, 40)) + [x1]:
            pts.append((x, int(y0 + (y1 - y0) * (horizon - 0.05 - 0.10 * rng.random()))))
        pts.append((x1, int(y0 + (y1 - y0) * horizon)))
        d.polygon(pts, fill=(84, 112, 84))

    # windows: front windshield, side windows, rear window (wraps around the seam)
    wins = [(int(Wp * 0.37), int(Hp * 0.13), int(Wp * 0.63), int(Hp * 0.52)),
            (int(Wp * 0.14), int(Hp * 0.20), int(Wp * 0.31), int(Hp * 0.47)),
            (int(Wp * 0.69), int(Hp * 0.20), int(Wp * 0.86), int(Hp * 0.47)),
            (0, int(Hp * 0.20), int(Wp * 0.07), int(Hp * 0.42)),
            (int(Wp * 0.93), int(Hp * 0.20), Wp, int(Hp * 0.42))]
    for wbox in wins:
        sky(wbox)
        d.rectangle(wbox, outline=trim_c, width=10)
    # road through the windshield
    rx0, ry0, rx1, ry1 = wins[0]
    hy = int(ry0 + (ry1 - ry0) * 0.62)
    d.polygon([((rx0 + rx1) // 2 - 12, hy), ((rx0 + rx1) // 2 + 12, hy), (rx1 - 60, ry1), (rx0 + 60, ry1)], fill=(70, 72, 74))
    d.line([((rx0 + rx1) // 2, hy), ((rx0 + rx1) // 2, ry1)], fill=(230, 230, 210), width=6)
    # dashboard
    dash = base if tone == 'dark' else (60, 54, 46)
    d.polygon([(int(Wp * 0.30), int(Hp * 0.60)), (int(Wp * 0.36), int(Hp * 0.50)), (int(Wp * 0.64), int(Hp * 0.50)), (int(Wp * 0.70), int(Hp * 0.60)),
               (int(Wp * 0.70), int(Hp * 0.80)), (int(Wp * 0.30), int(Hp * 0.80))], fill=tuple(int(c * 0.75) for c in dash))
    d.line([(int(Wp * 0.36), int(Hp * 0.50)), (int(Wp * 0.64), int(Hp * 0.50))], fill=(110, 110, 112), width=6)
    # instrument cluster + steering wheel (left-hand drive, as in the Philippines)
    cx, cy = int(Wp * 0.43), int(Hp * 0.70)
    d.rounded_rectangle([cx - 120, int(Hp * 0.53), cx + 120, int(Hp * 0.63)], 30, fill=(12, 12, 14))
    for gx in (cx - 60, cx + 60):
        d.ellipse([gx - 42, int(Hp * 0.535), gx + 42, int(Hp * 0.625)], outline=(200, 200, 205), width=5)
        d.line([(gx, int(Hp * 0.58)), (gx + 28, int(Hp * 0.55))], fill=(230, 60, 50), width=4)
    d.ellipse([cx - 175, cy - 175, cx + 175, cy + 175], outline=(18, 18, 20), width=40)
    d.rectangle([cx - 150, cy - 18, cx + 150, cy + 18], fill=(18, 18, 20))
    d.rectangle([cx - 18, cy, cx + 18, cy + 160], fill=(18, 18, 20))
    d.ellipse([cx - 52, cy - 52, cx + 52, cy + 52], fill=(28, 28, 30), outline=(120, 120, 124), width=4)
    # center screen + vents + console
    sx = int(Wp * 0.54)
    d.rounded_rectangle([sx - 130, int(Hp * 0.55), sx + 130, int(Hp * 0.66)], 14, fill=(20, 40, 60))
    for i in range(4):
        d.rounded_rectangle([sx - 110, int(Hp * 0.57) + i * 22, sx - 110 + 80 + 40 * (i % 2), int(Hp * 0.57) + i * 22 + 10], 4, fill=(90, 150, 200))
    for vx in (sx - 90, sx + 90, int(Wp * 0.33), int(Wp * 0.67)):
        d.rounded_rectangle([vx - 50, int(Hp * 0.67), vx + 50, int(Hp * 0.71)], 10, fill=(14, 14, 16))
        for k in range(4):
            d.line([(vx - 40, int(Hp * 0.675) + k * 9), (vx + 40, int(Hp * 0.675) + k * 9)], fill=(60, 60, 62), width=3)
    d.polygon([(sx - 120, int(Hp * 0.80)), (sx + 120, int(Hp * 0.80)), (sx + 160, Hp), (sx - 160, Hp)], fill=trim_c)
    d.ellipse([sx - 30, int(Hp * 0.86), sx + 30, int(Hp * 0.92)], fill=(150, 150, 154))
    # doors (left/right): trim panel, armrest, handle, speaker
    for x0, x1 in ((int(Wp * 0.12), int(Wp * 0.33)), (int(Wp * 0.67), int(Wp * 0.88))):
        d.rectangle([x0, int(Hp * 0.47), x1, int(Hp * 0.92)], fill=tuple(int(c * 0.9) for c in base))
        d.rectangle([x0, int(Hp * 0.47), x1, int(Hp * 0.50)], fill=(120, 120, 124))
        d.rounded_rectangle([x0 + 40, int(Hp * 0.60), x1 - 40, int(Hp * 0.65)], 12, fill=trim_c)
        hx = (x0 + x1) // 2
        d.rounded_rectangle([hx - 50, int(Hp * 0.55), hx + 50, int(Hp * 0.58)], 6, fill=(170, 172, 176))
        d.ellipse([hx - 60, int(Hp * 0.72), hx + 60, int(Hp * 0.86)], fill=(18, 18, 20), outline=(70, 70, 74), width=4)
    # rear bench seat with three headrests (around the seam)
    seat = tuple(int(c * 1.25) for c in base)
    for x0, x1 in ((0, int(Wp * 0.11)), (int(Wp * 0.89), Wp)):
        d.rectangle([x0, int(Hp * 0.44), x1, int(Hp * 0.85)], fill=seat)
        for k in range(0, x1 - x0, 46):
            d.line([(x0 + k, int(Hp * 0.47)), (x0 + k, int(Hp * 0.82))], fill=tuple(int(c * 0.85) for c in seat), width=3)
    for hx in (int(Wp * 0.035), int(Wp * 0.965), int(Wp * 0.075)):
        d.rounded_rectangle([hx - 60, int(Hp * 0.34), hx + 60, int(Hp * 0.45)], 24, fill=seat)
    # pillars
    for px_ in (0.33, 0.36, 0.64, 0.67, 0.12, 0.88):
        x = int(Wp * px_)
        d.rectangle([x - 14, int(Hp * 0.12), x + 14, int(Hp * 0.52)], fill=trim_c)
    img = img.filter(ImageFilter.GaussianBlur(1.2))
    # light vignette top/bottom
    arr = np.asarray(img).astype(np.float32)
    yy = np.linspace(-1, 1, Hp)[:, None]
    arr *= (1 - 0.18 * yy ** 2)[..., None]
    Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8)).resize((3000, 834), Image.LANCZOS).save(path, quality=84, optimize=True, progressive=True)


if __name__ == '__main__':
    sets = [('sedan', 'white'), ('sedan', 'red'), ('sedan', 'gray'), ('mpv', 'silver'), ('mpv', 'black')]
    only = os.environ.get('ONLY')
    for shape, color in sets:
        if only and only != f'{shape}-{color}':
            continue
        out = os.path.join(OUT, f'{shape}-{color}')
        os.makedirs(out, exist_ok=True)
        for i in range(FRAMES):
            render(shape, color, 35 + i * 360 / FRAMES, os.path.join(out, f'frame-{i + 1:02d}.jpg'))
        print('done', shape, color)
    if not only or only == 'interior':
        interior(os.path.join(OUT, 'interior-dark.jpg'), 'dark')
        interior(os.path.join(OUT, 'interior-beige.jpg'), 'beige')
        print('interiors done')
