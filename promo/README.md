# CobBox 宣传片

16:9（Bilibili）与 9:16（抖音）两条无配乐宣传动画，静音画面轨，方便后期自行配 BGM。

## 成品

| 文件 | 规格 | 用途 |
| --- | --- | --- |
| `cobble-promo-16x9.mp4` | 1920×1080 · 30fps · H.264 · 24s · 无音轨 | Bilibili / 官网 / 微信 |
| `cobble-promo-9x16.mp4` | 1080×1920 · 30fps · H.264 · 24s · 无音轨 | 抖音 / 视频号 / Reels |

封面：`cobble-promo-16x9-cover.png`、`cobble-promo-9x16-cover.png`

## 节奏点（配 BGM 用）

| 时间 | 段落 |
| --- | --- |
| 0.0s | Logo 开场 |
| 3.2s | 拖积木（编辑器） |
| 7.8s | 点运行（游戏试玩） |
| 11.6s | 导出（HTML5 / EXE / Android） |
| 15.2s | 手机、平板也能玩 |
| 18.7s | 免费开源、本地优先 |
| 21.6s | 结尾 CTA |

建议 BGM 90–110 BPM；第 3.2s / 7.8s / 11.6s / 15.2s / 18.7s / 21.6s 处卡在重拍上会最贴。

## 重新生成

```bash
# 1) 重新截取素材（需先本地起静态服务：node tools/serve.mjs --port 8133 --root pages-dist）
node promo/capture.mjs
# 2) 渲染两套帧（各 720 帧）
node promo/render.mjs --ratio=169
node promo/render.mjs --ratio=916
# 3) 编码
bash promo/encode.sh
```

素材与动效都放在 `scene.html` / `scene.css` / `scene.js`，时间轴在 `scene.js` 的 `render(t)` 里（总长 `DURATION = 24.0`）。
