"""生成 Cobble Studio 品牌图标：块状字母 C（Cobble 的首字母）+ 品牌橙。

形状：1024 画布上由「上、左、下」三根 200 厚的方条拼成 C，无圆角。
- 透明底版本用于官网 header 与 favicon；
- 深色方底版本用于 EXE / APK / 社交图。

输出：
- site/assets/logo.svg（透明底）、logo-512.png、logo-256.png
- site/assets/favicon.ico、favicon-32.png、apple-touch-icon.png
- apps/editor/public/logo.svg（编辑器 favicon / 顶栏）
- apps/desktop/build/icon.ico（Electron 打包）
- docs/logo.png（README）
"""

from pathlib import Path
from PIL import Image, ImageDraw

BG = (13, 15, 18)
ACCENT = (255, 107, 53)

ROOT = Path(__file__).resolve().parent.parent

# 三根方条：(x0, y0, x1, y1)
BARS = ((88, 88, 936, 288), (88, 288, 288, 736), (88, 736, 936, 936))

SVG = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" role="img" aria-label="Cobble Studio">
  <rect x="88" y="88" width="848" height="200" fill="#ff6b35"/>
  <rect x="88" y="288" width="200" height="448" fill="#ff6b35"/>
  <rect x="88" y="736" width="848" height="200" fill="#ff6b35"/>
</svg>
"""


def render(size: int, background: bool) -> Image.Image:
    mode = 'RGBA'
    image = Image.new(mode, (size, size), BG + (255,) if background else (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    unit = size / 1024
    for x0, y0, x1, y1 in BARS:
        draw.rectangle(
            [round(x0 * unit), round(y0 * unit), round(x1 * unit) - 1, round(y1 * unit) - 1],
            fill=ACCENT + (255,),
        )
    return image


def main() -> None:
    site = ROOT / 'site' / 'assets'
    editor_public = ROOT / 'apps' / 'editor' / 'public'
    desktop_build = ROOT / 'apps' / 'desktop' / 'build'
    docs = ROOT / 'docs'
    for directory in (site, editor_public, desktop_build, docs):
        directory.mkdir(parents=True, exist_ok=True)

    (site / 'logo.svg').write_text(SVG, encoding='utf-8')
    (editor_public / 'logo.svg').write_text(SVG, encoding='utf-8')

    render(512, background=False).save(site / 'logo-512.png')
    render(256, background=True).save(site / 'logo-256.png')
    render(180, background=True).save(site / 'apple-touch-icon.png')
    render(1024, background=True).save(docs / 'logo.png')

    ico_sizes = [(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]
    render(256, background=True).save(desktop_build / 'icon.ico', sizes=ico_sizes)
    render(256, background=True).save(site / 'favicon.ico', sizes=ico_sizes)
    render(32, background=True).save(site / 'favicon-32.png')
    print('logo assets written')


if __name__ == '__main__':
    main()
