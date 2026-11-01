#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

FF="/c/Users/35378/AppData/Local/Microsoft/WinGet/Packages/Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe/ffmpeg-9.0.2-full_build/bin/ffmpeg.exe"
VF="scale=in_range=full:out_range=tv:flags=lanczos,format=yuv420p,fade=t=in:st=0:d=0.35,fade=t=out:st=23.2:d=0.8"

for pair in "169:16x9" "916:9x16"; do
  ratio="${pair%%:*}"
  label="${pair##*:}"
  echo "== encode ${label} =="
  "$FF" -y -hide_banner -loglevel warning \
    -framerate 30 -i "promo/frames-${ratio}/%04d.jpg" \
    -vf "$VF" \
    -c:v libx264 -preset slow -crf 17 -profile:v high -level 4.1 \
    -colorspace bt709 -color_primaries bt709 -color_trc bt709 -color_range tv \
    -pix_fmt yuv420p -movflags +faststart \
    -metadata title="Cobble Studio 宣传片 ${label}" \
    -metadata comment="Cobble Studio - 用积木拼出你的 2D 小游戏" \
    "promo/cobble-promo-${label}.mp4"
done

echo "== covers =="
"$FF" -y -hide_banner -loglevel error -ss 2.6 -i promo/cobble-promo-16x9.mp4 -frames:v 1 promo/cobble-promo-16x9-cover.png
"$FF" -y -hide_banner -loglevel error -ss 2.6 -i promo/cobble-promo-9x16.mp4 -frames:v 1 promo/cobble-promo-9x16-cover.png

echo "== files =="
ls -lh promo/*.mp4 promo/*-cover.png
