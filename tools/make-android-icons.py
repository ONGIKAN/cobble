from PIL import Image, ImageDraw
import os

SRC = 'site/assets/logo-512.png'
RES = 'apps/mobile/android/app/src/main/res'
BG = (255, 255, 255, 255)

logo = Image.open(SRC).convert('RGBA')

densities = {
    'mdpi': 48,
    'hdpi': 72,
    'xhdpi': 96,
    'xxhdpi': 144,
    'xxxhdpi': 192,
}

for density, size in densities.items():
    folder = os.path.join(RES, f'mipmap-{density}')
    # legacy square icon: dark background + logo inset
    icon = Image.new('RGBA', (size, size), BG)
    inset = int(size * 0.16)
    mark = logo.resize((size - inset * 2, size - inset * 2), Image.LANCZOS)
    icon.alpha_composite(mark, (inset, inset))
    icon.save(os.path.join(folder, 'ic_launcher.png'))

    # round icon
    round_icon = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    mask = Image.new('L', (size, size), 0)
    ImageDraw.Draw(mask).ellipse((0, 0, size - 1, size - 1), fill=255)
    base = Image.new('RGBA', (size, size), BG)
    base.alpha_composite(mark, (inset, inset))
    round_icon.paste(base, (0, 0), mask)
    round_icon.save(os.path.join(folder, 'ic_launcher_round.png'))

    # adaptive foreground: transparent 108dp canvas, logo in the 66dp safe zone
    fg_size = int(size * 108 / 48)
    fg = Image.new('RGBA', (fg_size, fg_size), (0, 0, 0, 0))
    inner = int(fg_size * 0.52)
    mark_fg = logo.resize((inner, inner), Image.LANCZOS)
    fg.alpha_composite(mark_fg, ((fg_size - inner) // 2, (fg_size - inner) // 2))
    fg.save(os.path.join(folder, 'ic_launcher_foreground.png'))

print('android icons written')

# background color
colors = os.path.join(RES, 'values', 'ic_launcher_background.xml')
if os.path.exists(colors):
    with open(colors, 'w', encoding='utf-8', newline='\n') as fh:
        fh.write('''<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ic_launcher_background">#FFFFFF</color>
</resources>
''')
    print('background color set')
