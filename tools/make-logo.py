"""CobBox 品牌标：方块豹猫头像（16×16 像素网格 + 矢量矩形输出）。

豹猫元素：尖耳、脸颊/额头上的深色斑点（rosette 简化成方块）、鼻子。
配色跟主题走：紫色主色 + 米白面部 + 深色眼睛。

同时输出两套资源：
- 透明底：界面里用（logo.svg / logo-512.png）
- 白色底：应用/安装包/网页图标用（favicon、apple-touch-icon、docs/logo、Tauri 图标源）
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
WHITE = "#ffffff"

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


def svg_markup(size=1024, background=None):
    cell = size / 16
    parts = [
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {size} {size}" width="{size}" height="{size}">',
    ]
    if background:
        parts.append(f'<rect x="0" y="0" width="{size}" height="{size}" fill="{background}"/>')
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


def render(size, background=None):
    cell = size / 16
    image = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    if background:
        draw.rectangle([0, 0, size - 1, size - 1], fill=background)
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

    # 1) 透明底：界面使用
    svg = svg_markup()
    for rel in ["site/assets/logo.svg", "apps/editor/public/logo.svg"]:
        path = os.path.join(ROOT, rel)
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with io.open(path, "w", encoding="utf-8", newline="\n") as handle:
            handle.write(svg)

    png_targets = {
        "site/assets/logo-512.png": (512, None),
        "site/assets/logo-256.png": (256, None),
        "site/assets/logo-light-1024.png": (1024, WHITE),
        "site/assets/logo-light-512.png": (512, WHITE),
        "docs/logo.png": (512, WHITE),
    }
    for rel, (size, bg) in png_targets.items():
        path = os.path.join(ROOT, rel)
        os.makedirs(os.path.dirname(path), exist_ok=True)
        render(size, bg).save(path)

    # 2) 白底：favicon / apple-touch-icon / 安装包图标
    icon_sizes = [16, 24, 32, 48, 64, 128, 256]
    for rel in ["site/assets/favicon.ico", "apps/desktop/build/icon.ico"]:
        path = os.path.join(ROOT, rel)
        os.makedirs(os.path.dirname(path), exist_ok=True)
        images = [render(size, WHITE) for size in icon_sizes]
        images[-1].save(path, format="ICO", sizes=[(s, s) for s in icon_sizes])

    render(32, WHITE).save(os.path.join(ROOT, "site/assets/favicon-32.png"))
    render(180, WHITE).save(os.path.join(ROOT, "site/assets/apple-touch-icon.png"))

    print("logo assets written")


if __name__ == "__main__":
    main()
