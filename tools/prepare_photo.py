#!/usr/bin/env python3
"""Prepare one photo for the site: fix rotation, strip metadata, shrink, save as JPEG.

    python3 tools/prepare_photo.py INPUT OUTPUT [--max 1280] [--crop LEFT,TOP,SIZE]

Why each step matters
  * Rotation: phones often store a photo sideways plus a flag saying "rotate me".
    Browsers honour the flag but canvas code may not, so we bake the rotation in.
  * Metadata: saving a fresh JPEG drops EXIF data, including GPS coordinates that
    would otherwise be public on a GitHub Pages site.
  * Size: a 1.4 MB phone photo is slow on mobile data. 1280 px on the long side at
    quality 82 is typically 150-300 KB and still sharp on a phone screen.
  * --crop LEFT,TOP,SIZE cuts a SQUARE (in pixels of the original) first, used for
    the cipher dial, whose centre is a circle.
"""
import argparse
from pathlib import Path

from PIL import Image, ImageOps


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("input")
    ap.add_argument("output")
    ap.add_argument("--max", type=int, default=1280, help="longest side in pixels")
    ap.add_argument("--crop", help="LEFT,TOP,SIZE of a square crop in original pixels")
    a = ap.parse_args()

    im = ImageOps.exif_transpose(Image.open(a.input)).convert("RGB")   # bake in rotation
    if a.crop:
        left, top, size = (int(v) for v in a.crop.split(","))
        im = im.crop((left, top, left + size, top + size))
    im.thumbnail((a.max, a.max), Image.LANCZOS)                        # keeps aspect ratio
    Path(a.output).parent.mkdir(parents=True, exist_ok=True)
    im.save(a.output, "JPEG", quality=82, optimize=True, progressive=True)  # no EXIF written
    print("%s  %dx%d  %d KB" % (a.output, im.width, im.height, Path(a.output).stat().st_size // 1024))


if __name__ == "__main__":
    main()
