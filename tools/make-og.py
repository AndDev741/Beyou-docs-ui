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

    Same geometry as public/favicon.svg: on the ring's 48-unit grid the arc
    runs from -61 to 298 degrees (the dasharray 125/25.8 gap) and the check is
    the polyline (22,33) (29,40) (43,26). PIL draws arcs and lines with no
    antialiasing, so the mark is drawn SUPERSAMPLE times too big on its own
    layer and shrunk with LANCZOS before compositing.
    """
    size = diameter * SUPERSAMPLE
    layer = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    u = size / 48.0  # one grid unit; the favicon's stroke of 8 scales with it
    stroke = round(8 * u)
    d.arc([0, 0, size - 1, size - 1], start=-61, end=298, fill=ACCENT, width=stroke)
    p = lambda a, b: ((a - 8) * u, (b - 8) * u)
    d.line([p(22, 33), p(29, 40), p(43, 26)], fill=ACCENT, width=stroke, joint="curve")
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
