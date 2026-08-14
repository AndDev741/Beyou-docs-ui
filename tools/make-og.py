#!/usr/bin/env python3
"""Draws the 1200x630 share card at public/og-cover.png.

Not part of the build: the output is committed, because drawing it needs
Pillow and the static Geist TTFs that live in the mobile app. Run it again
only when the wording or the mark changes:

    python3 tools/make-og.py

Fonts default to ../Beyou-Frontend/apps/mobile/assets/fonts, resolved against
this repo's root so the invocation works from any directory; pass --fonts-dir
to point somewhere else. Output is deterministic: same inputs, same bytes.
"""
import math
import argparse
import os
from PIL import Image, ImageDraw, ImageFont

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEFAULT_FONTS = os.path.normpath(
    os.path.join(REPO, "..", "Beyou-Frontend", "apps", "mobile", "assets", "fonts")
)
OUT = os.path.join(REPO, "public", "og-cover.png")

BG = (14, 18, 24)        # #0E1218
INK = (240, 244, 249)    # #F0F4F9
MUTED = (163, 174, 189)  # #A3AEBD
ACCENT = (92, 157, 255)  # #5C9DFF
W, H = 1200, 630

HEADLINE = "Beyou Docs"
SUBTITLE = ("How the Beyou habit app is built: "
            "architecture, APIs and the decisions behind them")
FOOTER = "docs.beyouweb.com"

SUPERSAMPLE = 4


def brand_mark(diameter):
    """The ring with its opening to the north-east, and the check inside it.

    Same geometry as public/favicon.svg (64-unit viewBox, center (32,32)):
    ring at stroke-center radius 24 with stroke 8 (annulus 20..28, OUTER
    diameter 56), round caps, dash covering 298.4 degrees clockwise from
    3 o'clock so the ~61.6-degree opening sits across the north-east; check
    polyline (22,33) -> (29,40) -> (43,26), same stroke, round caps/joins.
    `diameter` is the ring's OUTER diameter (u = diameter/56). PIL arc widths
    grow inward from the bbox, so the bbox sits at outer radius 28u. Drawn
    SUPERSAMPLE times too big and shrunk with LANCZOS for antialiasing.
    """
    size = diameter * SUPERSAMPLE
    layer = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    c = size / 2.0
    u = size / 56.0
    stroke = max(1, round(8 * u))
    R = 28 * u
    d.arc([c - R, c - R, c + R, c + R], start=0, end=298.4, fill=ACCENT, width=stroke)
    for ang in (0.0, 298.4):  # round caps at the dash endpoints (radius 24u)
        ex = c + 24 * u * math.cos(math.radians(ang))
        ey = c + 24 * u * math.sin(math.radians(ang))
        d.ellipse([ex - stroke / 2, ey - stroke / 2, ex + stroke / 2, ey + stroke / 2], fill=ACCENT)
    p = lambda a, b: (c + (a - 32) * u, c + (b - 32) * u)
    pts = [p(22, 33), p(29, 40), p(43, 26)]
    d.line(pts, fill=ACCENT, width=stroke, joint="curve")
    for ex, ey in (pts[0], pts[-1]):  # round caps on the check's open ends
        d.ellipse([ex - stroke / 2, ey - stroke / 2, ex + stroke / 2, ey + stroke / 2], fill=ACCENT)
    return layer.resize((diameter, diameter), Image.LANCZOS)


def wrap(d, text, font, width):
    """Greedy wrap; the subtitle is too long for one line at its size."""
    words, lines, line = text.split(), [], ""
    for w in words:
        probe = (line + " " + w).strip()
        if d.textlength(probe, font=font) <= width:
            line = probe
        else:
            lines.append(line)
            line = w
    if line:
        lines.append(line)
    return lines


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--fonts-dir", default=DEFAULT_FONTS,
                    help="directory holding Geist-SemiBold.ttf and Geist-Regular.ttf")
    args = ap.parse_args()

    head_f = ImageFont.truetype(os.path.join(args.fonts_dir, "Geist-SemiBold.ttf"), 76)
    sub_f = ImageFont.truetype(os.path.join(args.fonts_dir, "Geist-Regular.ttf"), 30)
    foot_f = ImageFont.truetype(os.path.join(args.fonts_dir, "Geist-Regular.ttf"), 24)

    im = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(im)

    mark = brand_mark(110)
    im.paste(mark, ((W - mark.width) // 2, 100), mark)

    d.text((W / 2, 300), HEADLINE, font=head_f, fill=INK, anchor="mm")

    y = 392
    for line in wrap(d, SUBTITLE, sub_f, 880):
        d.text((W / 2, y), line, font=sub_f, fill=MUTED, anchor="mm")
        y += 42

    d.text((W / 2, 566), FOOTER, font=foot_f, fill=ACCENT, anchor="mm")

    im.save(OUT, optimize=True)
    print("wrote", os.path.relpath(OUT, REPO),
          round(os.path.getsize(OUT) / 1024), "KB")


if __name__ == "__main__":
    main()
