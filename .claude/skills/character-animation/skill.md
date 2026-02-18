---
name: character-animation
description: |
  MIDIOrchestraプロジェクトのキャラクターアニメーション（ドット絵スプライト）に関するルール。
  素材の加工・変換・実装時に適用する。
  「キャラクター」「アニメーション」「スプライト」「ドット絵」「GIF変換」「MP4変換」等のキーワードで呼び出す。
---

# キャラクターアニメーション ルール

## 1. ドット絵の4倍拡大（すべてのドット絵素材に共通）

キャラクタースプライトは元ドットの**4倍**で描画されている。
ドット絵素材を拡大する際は、ぼやけないように**ニアレストネイバー**で**4倍**に統一すること。

**静止画・動画ソースを問わず、すべてのドット絵素材に適用する。**
MP4変換する場合は、先にこの工程で4倍に拡大してから変換する。

```bash
ffmpeg -i input.png -vf "scale=iw*4:ih*4:flags=neighbor" -update 1 -y output.png
```

### なぜ4倍拡大が必要か

MP4変換時に使われるyuv420pは2×2ピクセルブロック単位で色差を間引く。等倍のままだと隣接する異なる色のドットが混合されて境界がにじむ。4倍に拡大しておけば各ドットが4×4ブロックになり、色差サブサンプリングの影響がブロック内部に限定され、視覚的に無劣化になる。

---

## 2. MP4変換（入力は4倍拡大済みを前提）

### yuv420p対策の追加拡大（必須）

4倍拡大済みでも各ドットは4×4pxしかない。yuv420pは2×2ブロック単位で色差を間引くため、4×4ドットの境界50%が色にじみの影響を受ける。**変換時にさらに4倍（`scale=iw*4:ih*4:flags=neighbor`）を適用して各ドットを16×16pxにする**ことで、にじみを12.5%に抑えて視覚的に無劣化になる。

### H.264 必須オプション

| オプション | 値 | 理由 |
|-----------|-----|------|
| `scale=iw*4:ih*4:flags=neighbor` | 追加4倍拡大 | yuv420pの色にじみ対策。入力が4倍済みでも必要 |
| `-crf 1` | 準ロスレス | ドット絵では視覚的に無劣化。**`-crf 0` は使わないこと**（下記参照） |
| `-profile:v high` | Highプロファイル | QuickTime/ブラウザ互換に必須 |
| `-pix_fmt yuv420p` | 色空間 | ブラウザ互換に必須 |
| `-an` | 音声なし | アニメーションスプライトに音声は不要 |
| `-movflags +faststart` | Web最適化 | メタデータを先頭に配置 |

### `-crf 0` を使ってはいけない理由

`-crf 0`（ロスレス）を指定すると、libx264が **High 4:4:4 Predictive** プロファイルを強制する。このプロファイルはQuickTimeで再生できず、一部ブラウザでも非対応。`-crf 1` + `-profile:v high` がドット絵では実質無劣化かつ互換性のある最善の組み合わせ。

### GIF → MP4

```bash
ffmpeg -i input.gif -vf "scale=iw*4:ih*4:flags=neighbor" -c:v libx264 -crf 1 -profile:v high -pix_fmt yuv420p -an -movflags +faststart output.mp4
```

### スプライトシート（横並びPNG）→ MP4

複数フレームが横に並んだPNG画像からアニメーションMP4を生成するパターン。

#### 手順

1. **フレーム数と寸法を確認**: 画像の幅÷フレーム数 = 1フレームの幅
2. **コンテンツ範囲を検出**: 背景色でないピクセルの上端・下端を調べ、足が一番下に来るようにクロップ
3. **ffmpegで変換**: `crop` フィルタで `mod(n, フレーム数)` を使いフレームを切り替え

#### コンテンツ範囲の検出（Python）

```python
from PIL import Image
img = Image.open('spritesheet.png')
pixels = img.load()
w, h = img.size
frame_w = w // フレーム数

for frame_idx in range(フレーム数):
    x_start = frame_idx * frame_w
    top, bottom = h, 0
    for y in range(h):
        for x in range(x_start, x_start + frame_w):
            r, g, b = pixels[x, y][:3]
            if not (背景色の条件):  # 例: r < 50 and g > 200 and b > 200 (シアン)
                top = min(top, y)
                bottom = max(bottom, y)
                break
    print(f'Frame {frame_idx}: top={top}, bottom={bottom}')
```

全フレーム共通の `top`（最小値）と `bottom`（最大値）を使う。

#### 変換コマンド

```bash
ffmpeg -loop 1 -r 4 -t 2 -i spritesheet.png \
  -vf "crop=FRAME_W:CONTENT_H:FRAME_W*mod(n\,FRAME_COUNT):TOP,scale=iw*4:ih*4:flags=neighbor" \
  -c:v libx264 -crf 1 -profile:v high -pix_fmt yuv420p -an -movflags +faststart \
  output.mp4
```

| パラメータ | 説明 |
|-----------|------|
| `FRAME_W` | 1フレームの幅（画像幅÷フレーム数） |
| `CONTENT_H` | コンテンツの高さ（bottom - top + 1） |
| `FRAME_COUNT` | フレーム数 |
| `TOP` | コンテンツ上端のY座標 |
| `-r 4` | フレームレート（4fps = 歩行アニメーション向き） |
| `-t 2` | 出力長さ（秒）。loop再生前提なので短くてよい |

#### 注意点

- **足を一番下に揃える**: `crop` の Y オフセットを `top`（コンテンツ上端）にすることで、下の余白を除去し足がフレーム底辺に来る。壁面パネルは下端を床に揃えるため、余白があると宙に浮く
- **出力サイズは偶数にする**: yuv420p は幅・高さが偶数でなければならない。入力が4倍拡大済みなら自動的に偶数になる。未拡大の場合は `pad` で偶数に調整
- **`-loop 1`**: 入力画像を無限ループにし、`-t` で出力長さを制限する
