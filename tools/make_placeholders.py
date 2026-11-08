#!/usr/bin/env python3
"""Generate placeholder illustrations so every game works before real photos exist.

Run from anywhere:   python3 tools/make_placeholders.py

Output goes to assets/images/. Replace any file with your own photo of the same
name (or change the path in that game's config.js). The hunt images draw their
hidden objects at the same coordinates as games/hunt/config.js, so the
placeholder hunt is playable out of the box; for real photos, re-position the
targets with ?calibrate=1 (see README).
"""
import math
import random
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

OUT = Path(__file__).resolve().parent.parent / "assets" / "images"
OUT.mkdir(parents=True, exist_ok=True)
SS = 2  # supersampling factor: draw at 2x, shrink with LANCZOS for smooth edges


class Art:
    """Tiny drawing helper. All coordinates are in FINAL pixels."""

    def __init__(self, w, h):
        self.w, self.h = w, h
        self.img = Image.new("RGB", (w * SS, h * SS), "white")
        self.d = ImageDraw.Draw(self.img)

    def _s(self, v):
        return [(x * SS) for x in v]

    def rect(self, box, fill):
        self.d.rectangle(self._s(box), fill=fill)

    def ell(self, box, fill):
        self.d.ellipse(self._s(box), fill=fill)

    def poly(self, pts, fill):
        self.d.polygon([(x * SS, y * SS) for x, y in pts], fill=fill)

    def line(self, pts, fill, width=3):
        self.d.line([(x * SS, y * SS) for x, y in pts], fill=fill, width=int(width * SS))

    def gradient(self, box, top, bottom):
        x0, y0, x1, y1 = box
        for y in range(int(y0), int(y1)):
            t = (y - y0) / max(1, (y1 - y0 - 1))
            col = tuple(int(top[i] + (bottom[i] - top[i]) * t) for i in range(3))
            self.d.rectangle([x0 * SS, y * SS, x1 * SS, (y + 1) * SS], fill=col)

    def heart(self, cx, cy, size, fill):
        pts = []
        for i in range(120):
            t = i / 120 * 2 * math.pi
            x = 16 * math.sin(t) ** 3
            y = -(13 * math.cos(t) - 5 * math.cos(2 * t) - 2 * math.cos(3 * t) - math.cos(4 * t))
            pts.append((cx + x * size / 17, cy + y * size / 17))
        self.poly(pts, fill)

    def star(self, cx, cy, r, fill, points=5):
        pts = []
        for i in range(points * 2):
            rad = r if i % 2 == 0 else r * 0.45
            a = -math.pi / 2 + i * math.pi / points
            pts.append((cx + rad * math.cos(a), cy + rad * math.sin(a)))
        self.poly(pts, fill)

    def hills(self, base_y, amp, colour, phase=0.0, freq=1.0, bottom=None):
        pts = [(0, bottom or self.h)]
        for x in range(0, self.w + 8, 8):
            pts.append((x, base_y + amp * math.sin(x / self.w * math.pi * 2 * freq + phase)))
        pts.append((self.w, bottom or self.h))
        self.poly(pts, colour)

    def label(self, text):
        try:
            font = ImageFont.load_default(size=max(14, self.w // 40) * SS)
        except TypeError:  # very old Pillow
            font = ImageFont.load_default()
        self.d.text((14 * SS, (self.h - 30) * SS), text, fill=(255, 255, 255), font=font,
                    stroke_width=2 * SS, stroke_fill=(0, 0, 0))

    def save(self, name):
        out = self.img.resize((self.w, self.h), Image.LANCZOS)
        out.save(OUT / name, quality=85, optimize=True)
        print("wrote", OUT / name)


# ---------------------------------------------------------------------------
def scratch_1():  # sunset over hills
    a = Art(800, 1000)
    a.gradient((0, 0, 800, 700), (70, 40, 110), (250, 150, 80))
    a.ell((250, 520, 550, 820), (255, 226, 140))
    a.hills(720, 40, (120, 60, 90), 0.3, 1.2)
    a.hills(810, 50, (80, 40, 70), 1.7, 0.9)
    a.hills(900, 40, (45, 25, 50), 3.1, 1.6)
    for bx, by in [(150, 300), (230, 340), (600, 260)]:
        a.line([(bx - 20, by), (bx, by - 10), (bx + 20, by)], (40, 25, 50), 4)
    a.heart(400, 250, 90, (255, 200, 200))
    a.label("Placeholder: scratch-1.jpg")
    a.save("scratch-1.jpg")


def scratch_2():  # beach
    a = Art(800, 1000)
    a.gradient((0, 0, 800, 520), (110, 190, 240), (210, 238, 250))
    a.ell((560, 90, 700, 230), (255, 236, 150))
    a.gradient((0, 520, 800, 700), (40, 140, 190), (90, 200, 215))
    for i in range(7):
        a.line([(x, 560 + i * 24 + 6 * math.sin(x / 30 + i)) for x in range(0, 800, 20)], (230, 250, 255), 3)
    a.rect((0, 700, 800, 1000), (240, 215, 160))
    a.rect((395, 640, 405, 900), (110, 70, 40))
    a.poly([(250, 640), (550, 640), (400, 520)], (230, 70, 70))
    a.poly([(400, 520), (450, 640), (550, 640)], (250, 240, 235))
    a.ell((120, 800, 260, 850), (70, 150, 190))
    a.save("scratch-2.jpg")


def scratch_3():  # night sky
    a = Art(800, 1000)
    a.gradient((0, 0, 800, 1000), (15, 20, 60), (60, 50, 110))
    rnd = random.Random(3)
    for _ in range(140):
        x, y, r = rnd.randint(0, 800), rnd.randint(0, 800), rnd.choice([1, 1, 2, 3])
        a.ell((x - r, y - r, x + r, y + r), (255, 255, 230))
    a.ell((560, 110, 700, 250), (250, 240, 200))
    a.ell((590, 95, 730, 235), (30, 30, 80))
    a.heart(300, 420, 300, (230, 80, 100))
    a.heart(300, 420, 230, (245, 120, 130))
    a.hills(900, 30, (12, 12, 35), 0.4, 1.3)
    a.rect((560, 800, 700, 920), (25, 20, 40))
    a.poly([(540, 800), (720, 800), (630, 730)], (25, 20, 40))
    a.rect((600, 830, 630, 870), (255, 210, 110))
    a.save("scratch-3.jpg")


def house_scene(a, sun_left=True):
    a.gradient((0, 0, a.w, int(a.h * .65)), (120, 190, 240), (215, 238, 250))
    sx = 140 if sun_left else a.w - 140
    a.ell((sx - 70, 70, sx + 70, 210), (255, 220, 90))
    for cx, cy in [(a.w * .55, 150), (a.w * .75, 250)]:
        for dx, dy, r in [(0, 0, 50), (45, 10, 40), (-45, 12, 38)]:
            a.ell((cx + dx - r, cy + dy - r * .7, cx + dx + r, cy + dy + r * .7), (255, 255, 255))
    a.rect((0, a.h * .65, a.w, a.h), (110, 180, 100))
    hx, hy = a.w * .32, a.h * .5
    a.rect((hx, hy, hx + 330, hy + 250), (240, 200, 150))
    a.poly([(hx - 30, hy), (hx + 360, hy), (hx + 165, hy - 150)], (190, 70, 60))
    a.rect((hx + 135, hy + 130, hx + 205, hy + 250), (110, 70, 45))
    a.rect((hx + 35, hy + 60, hx + 105, hy + 130), (150, 205, 240))
    a.rect((hx + 235, hy + 60, hx + 305, hy + 130), (150, 205, 240))
    a.rect((a.w * .08, a.h * .5 + 80, a.w * .08 + 28, a.h * .5 + 250), (110, 75, 45))
    a.ell((a.w * .08 - 70, a.h * .5 - 50, a.w * .08 + 98, a.h * .5 + 120), (60, 140, 70))
    a.poly([(hx + 135, a.h), (hx + 205, a.h), (hx + 205, hy + 250), (hx + 135, hy + 250)], (225, 205, 165))


def rotate_1():
    a = Art(900, 1200)
    house_scene(a, True)
    a.save("rotate-1.jpg")


def rotate_2():  # lighthouse
    a = Art(800, 1000)
    a.gradient((0, 0, 800, 600), (250, 190, 140), (255, 235, 200))
    a.ell((80, 80, 200, 200), (255, 245, 190))
    a.gradient((0, 600, 800, 1000), (40, 110, 170), (20, 70, 120))
    a.poly([(0, 620), (300, 620), (380, 760), (0, 800)], (95, 85, 80))
    a.poly([(300, 330), (520, 330), (560, 700), (260, 700)], (250, 250, 245))
    for y0 in (380, 480, 580):
        a.rect((285, y0, 535, y0 + 45), (200, 55, 55))
    a.rect((330, 250, 490, 330), (255, 225, 110))
    a.poly([(310, 250), (510, 250), (410, 170)], (90, 60, 55))
    a.poly([(560, 800), (680, 800), (620, 740)], (255, 255, 255))
    a.rect((540, 800, 700, 830), (120, 70, 50))
    a.poly([(100, 400), (130, 380), (160, 400), (130, 392)], (255, 255, 255))
    a.save("rotate-2.jpg")


def hunt_1():  # park with hidden objects (coordinates mirror games/hunt/config.js)
    a = Art(800, 1000)
    a.gradient((0, 0, 800, 560), (130, 200, 245), (225, 242, 252))
    a.hills(560, 40, (120, 190, 110), 0.5, 1.0)
    a.hills(680, 45, (90, 165, 90), 2.2, 1.4)
    a.rect((0, 760, 800, 1000), (105, 170, 85))
    rnd = random.Random(11)
    for _ in range(9):  # decoy trees
        x, y = rnd.randint(40, 760), rnd.randint(520, 900)
        a.rect((x - 8, y, x + 8, y + 70), (110, 75, 45))
        a.ell((x - 48, y - 70, x + 48, y + 20), (55, 130, 65))
    px = lambda p: p / 100 * 800
    py = lambda p: p / 100 * 1000
    # target 1: red kite at (22, 28)
    a.poly([(px(22), py(28) - 38), (px(22) + 26, py(28)), (px(22), py(28) + 38), (px(22) - 26, py(28))], (225, 45, 45))
    a.line([(px(22), py(28) + 38), (px(22) - 40, py(28) + 150)], (60, 40, 40), 2)
    # target 2: golden star at (71, 41)
    a.star(px(71), py(41), 34, (250, 200, 40))
    # target 3: heart-shaped stone at (48, 76)
    a.heart(px(48), py(76), 60, (150, 150, 155))
    a.label("Placeholder: hunt-1.jpg")
    a.save("hunt-1.jpg")


def hunt_2():  # seaside
    a = Art(800, 1000)
    a.gradient((0, 0, 800, 500), (30, 40, 90), (120, 110, 160))
    a.gradient((0, 500, 800, 1000), (30, 100, 150), (15, 60, 100))
    rnd = random.Random(5)
    for _ in range(60):
        x, y = rnd.randint(0, 800), rnd.randint(0, 420)
        a.ell((x - 1, y - 1, x + 2, y + 2), (255, 255, 230))
    for i in range(9):
        a.line([(x, 540 + i * 50 + 5 * math.sin(x / 25 + i)) for x in range(0, 800, 20)], (130, 190, 220), 2)
    px = lambda p: p / 100 * 800
    py = lambda p: p / 100 * 1000
    # target 1: blue boat at (15, 70)
    a.poly([(px(15) - 55, py(70)), (px(15) + 55, py(70)), (px(15) + 35, py(70) + 30), (px(15) - 35, py(70) + 30)], (40, 90, 220))
    a.poly([(px(15), py(70) - 70), (px(15), py(70) - 5), (px(15) + 40, py(70) - 5)], (245, 245, 245))
    # target 2: crescent moon at (80, 22)
    a.ell((px(80) - 32, py(22) - 32, px(80) + 32, py(22) + 32), (250, 240, 190))
    a.ell((px(80) - 14, py(22) - 40, px(80) + 50, py(22) + 24), (60, 60, 120))
    # target 3: key at (55, 50)
    a.ell((px(55) - 26, py(50) - 26, px(55) + 6, py(50) + 6), (240, 190, 50))
    a.ell((px(55) - 16, py(50) - 16, px(55) - 4, py(50) - 4), (30, 100, 150))
    a.rect((px(55) - 4, py(50) - 4, px(55) + 40, py(50) + 4), (240, 190, 50))
    a.rect((px(55) + 24, py(50) + 2, px(55) + 32, py(50) + 16), (240, 190, 50))
    a.label("Placeholder: hunt-2.jpg")
    a.save("hunt-2.jpg")


def wordsearch_1():  # picnic banner
    a = Art(1200, 525)
    a.gradient((0, 0, 1200, 300), (135, 205, 245), (230, 245, 252))
    a.ell((980, 40, 1100, 160), (255, 225, 100))
    a.rect((0, 300, 1200, 525), (120, 185, 100))
    a.poly([(250, 340), (950, 340), (1050, 500), (150, 500)], (255, 255, 255))
    for i in range(8):
        for j in range(3):
            if (i + j) % 2 == 0:
                x0 = 250 + i * 87 - j * 33
                a.poly([(x0, 340 + j * 53), (x0 + 87, 340 + j * 53), (x0 + 87 - 11, 340 + (j + 1) * 53), (x0 - 11, 340 + (j + 1) * 53)], (215, 60, 60))
    a.rect((560, 300, 700, 370), (160, 110, 60))
    a.heart(630, 285, 70, (230, 70, 90))
    a.label("Placeholder: wordsearch-1.jpg")
    a.save("wordsearch-1.jpg")


def cipher_1():
    a = Art(600, 600)
    a.gradient((0, 0, 600, 600), (150, 40, 95), (80, 20, 55))      # berry background
    a.ell((120, 120, 480, 480), (240, 180, 175))                   # rose-gold ring
    a.ell((150, 150, 450, 450), (252, 224, 224))
    a.heart(300, 290, 190, (224, 69, 123))
    a.ell((278, 262, 322, 306), (252, 224, 224))                   # keyhole
    a.poly([(290, 295), (310, 295), (320, 360), (280, 360)], (252, 224, 224))
    a.save("cipher-1.jpg")


def paint_1():  # mountains and lake (portrait, 4:5)
    a = Art(800, 1000)
    a.gradient((0, 0, 800, 520), (95, 170, 235), (250, 215, 170))
    a.ell((540, 140, 680, 280), (255, 230, 120))
    a.poly([(0, 560), (200, 260), (400, 560)], (110, 120, 150))
    a.poly([(250, 560), (500, 200), (800, 560)], (80, 90, 125))
    a.poly([(440, 280), (500, 200), (560, 280), (500, 262)], (250, 250, 255))
    a.rect((0, 540, 800, 640), (60, 130, 80))
    a.gradient((0, 640, 800, 1000), (70, 150, 190), (40, 100, 150))
    a.poly([(0, 640), (800, 640), (800, 660), (0, 680)], (60, 130, 80))
    a.ell((300, 760, 520, 800), (110, 180, 215))
    a.heart(400, 830, 130, (225, 70, 85))
    a.save("paint-1.jpg")


if __name__ == "__main__":
    for fn in (scratch_1, scratch_2, scratch_3, rotate_1, rotate_2, hunt_1, hunt_2,
               wordsearch_1, cipher_1, paint_1):
        fn()
