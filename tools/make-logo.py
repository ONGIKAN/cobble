"""Cobble Studio 品牌标：方块豹猫头像（16×16 像素网格 + 矢量矩形输出）。

豹猫元素：尖耳、脸颊/额头上的深色斑点（rosette 简化成方块）、鼻子。
配色跟主题走：紫色主色 + 米白面部 + 深色眼睛。
"""

import io
import os

from PIL import Image, ImageDraw

ROOT = r"F:/创想/game-creator"

PURPLE = "#8b5cf6"
PURPLE_DEEP = "#6d3ff0"
CREAM = "#f2efe6"
DARK = "#14101f"
SPOT = "#3a2370"

# 16×16 像素：P 紫色、C 米白、D 深色、S 斑点深紫
GRID = [
    "................",
    "...PP......PP...",
    "..PPPP....PPPP..",
    "..PPPPPPPPPPPP..",
    "..PPPPPPPPPPPP..",
    "..PCSCCCCCCSCP..",
    "..PCCCCCCCCCCP..",
    "..PCDDCCCCDDCP..",
    "..PCCCCCCCCCCP..",
    "..PCCCCSPPSCCP..",
    "..PSCCCCCCCCSP..",
    "..PCCCCCCCCCCP..",
    "..PCCCCCCCCCCP..",
    "...PCCCCCCCCP...",
    "....PCCCCCCP....",
    "......PPPP......",
]

COLORS = {
    "P": PURPLE,
    "C": CREAM,
    "D": DARK,
    "S": SPOT,
}


def runs(row):
    """把一行像素合并成连续同色段。"""
    out = []
    start = 0
    for i in range(1, len(row) + 1):
        if i == len(row) or row[i] != row[start]:
            out.append((start, row[start], i - start))
            start = i
    return out


def svg_markup(size=1024):
    cell = size / 16
    parts = [
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {size} {size}" width="{size}" height="{size}">',
    ]
    for y, row in enumerate(GRID):
        for x, ch, width in runs(row):
            if ch == ".":
                continue
            parts.append(
                f'<rect x="{x * cell:g}" y="{y * cell:g}" width="{width * cell:g}" '
                f'height="{cell:g}" fill="{COLORS[ch]}"/>'
            )
    parts.append("</svg>")
    return "\n".join(parts)


def render(size):
    cell = size / 16
    image = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    for y, row in enumerate(GRID):
        for x, ch, width in runs(row):
            if ch == ".":
                continue
            draw.rectangle(
                [x * cell, y * cell, (x + width) * cell - 1, (y + 1) * cell - 1],
                fill=COLORS[ch],
            )
    return image


def main():
    os.makedirs(os.path.join(ROOT, "docs"), exist_ok=True)

    outputs = {
        "site/assets/logo.svg": None,
        "apps/editor/public/logo.svg": None,
    }
    svg = svg_markup()
    for rel in outputs:
        path = os.path.join(ROOT, rel)
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with io.open(path, "w", encoding="utf-8", newline="\n") as handle:
            handle.write(svg)

    png_targets = {
        "site/assets/logo-512.png": 512,
        "site/assets/logo-256.png": 256,
        "site/assets/favicon-32.png": 32,
        "site/assets/apple-touch-icon.png": 180,
        "docs/logo.png": 512,
    }
    for rel, size in png_targets.items():
        path = os.path.join(ROOT, rel)
        os.makedirs(os.path.dirname(path), exist_ok=True)
        render(size).save(path)

    icon_sizes = [16, 24, 32, 48, 64, 128, 256]
    for rel in ["site/assets/favicon.ico", "apps/desktop/build/icon.ico"]:
        path = os.path.join(ROOT, rel)
        os.makedirs(os.path.dirname(path), exist_ok=True)
        images = [render(size) for size in icon_sizes]
        images[-1].save(path, format="ICO", sizes=[(s, s) for s in icon_sizes])

    print("logo assets written")


if __name__ == "__main__":
    main()
