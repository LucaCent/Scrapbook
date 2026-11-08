#!/usr/bin/env python3
"""Create printable QR codes for each game.

    pip install "qrcode[pil]"
    python3 tools/make_qr.py https://YOUR-USER.github.io/YOUR-REPO/

Outputs (in ./qr/):
    page-1.png ... page-6.png   one code per game, labelled "Page N"
    sheet.png                   all six on one printable sheet

The game list is read from shared/core.js, so there is a single source of truth.
Error correction is level Q (about 25% of the code can be damaged), which is
what you want for something that will be glued into a book and handled.
"""
import re
import sys
from pathlib import Path

import qrcode
from qrcode.constants import ERROR_CORRECT_Q
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "qr"


def read_games():
    text = (ROOT / "shared" / "core.js").read_text()
    games = re.findall(r"\{\s*id:\s*'([^']+)',\s*letter:\s*'([^']+)',\s*title:\s*'([^']+)',\s*path:\s*'([^']+)'", text)
    if not games:
        raise SystemExit("Could not read the game list from shared/core.js")
    return [dict(id=g[0], letter=g[1], title=g[2], path=g[3]) for g in games]


def font(size):
    for name in ("DejaVuSans-Bold.ttf", "Arial Bold.ttf", "Arial.ttf"):
        try:
            return ImageFont.truetype(name, size)
        except OSError:
            continue
    try:
        return ImageFont.load_default(size=size)
    except TypeError:
        return ImageFont.load_default()


def make_code(url, caption, px=600):
    qr = qrcode.QRCode(error_correction=ERROR_CORRECT_Q, box_size=12, border=4)
    qr.add_data(url)
    qr.make(fit=True)
    code = qr.make_image(fill_color="black", back_color="white").convert("RGB")
    code = code.resize((px, px), Image.NEAREST)          # NEAREST keeps the modules crisp
    canvas = Image.new("RGB", (px, px + 80), "white")
    canvas.paste(code, (0, 0))
    d = ImageDraw.Draw(canvas)
    f = font(40)
    w = d.textlength(caption, font=f)
    d.text(((px - w) / 2, px + 14), caption, fill="black", font=f)
    return canvas


def main():
    if len(sys.argv) != 2 or not sys.argv[1].startswith("http"):
        raise SystemExit(__doc__)
    base = sys.argv[1].rstrip("/") + "/"
    OUT.mkdir(exist_ok=True)

    tiles = []
    for n, g in enumerate(read_games(), start=1):
        url = base + g["path"]                            # folder URL; Pages serves its index.html
        img = make_code(url, "Page %d" % n)
        img.save(OUT / ("page-%d.png" % n))
        tiles.append(img)
        print("page-%d.png  ->  %s" % (n, url))

    # Contact sheet: 3 columns x 2 rows on a white page.
    tw, th = tiles[0].size
    gap = 40
    cols = 3
    rows = (len(tiles) + cols - 1) // cols
    sheet = Image.new("RGB", (cols * tw + (cols + 1) * gap, rows * th + (rows + 1) * gap), "white")
    for i, t in enumerate(tiles):
        sheet.paste(t, (gap + (i % cols) * (tw + gap), gap + (i // cols) * (th + gap)))
    sheet.save(OUT / "sheet.png")
    print("sheet.png written")


if __name__ == "__main__":
    main()
