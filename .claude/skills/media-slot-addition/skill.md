---
name: media-slot-addition
description: |
  MIDIOrchestraプロジェクトにメディアスロット（床・壁面パネル等）を追加する際の必須チェックリスト。
  「メディアスロット追加」「パネル追加」「床追加」「壁追加」「新しいスロット」等のキーワードで呼び出す。
  漏れるとプリセット読み込みやビューワーがクラッシュする。
---

# メディアスロット追加チェックリスト

新しいメディアスロット（床、壁面パネル等）を追加した際は、以下の **6項目すべて** を更新すること。

## 必須チェック項目

### 1. `window.appFunctions` にエクスポート（main.js末尾）

`loadXxxImage` と `clearXxxImage` の両方を追加する。

```js
window.appFunctions = {
  // ...既存...
  loadXxxImage, clearXxxImage,  // ← 追加
};
```

### 2. `setupDropZone` のnullガード（setupEventListeners内）

ビューワーにはエディターのDOM要素がないため、ガードなしだとビューワーがクラッシュする。

```js
const xxxDropZone = document.getElementById('xxxDropZone');
setupDropZone(xxxDropZone, loadXxxImage, true, 'xxx');
```

`setupDropZone` 関数自体に `if (!dropZone) return;` が入っているが、呼び出し側でもガードを付けるのが望ましい。

### 3. `presetManager.js` の `loadPreset` 内のクリア処理

```js
app.clearXxxImage();
```

### 4. `presetManager.js` の `loadPreset` 内のメディア復元処理

```js
if (media.xxx) {
  await restoreMediaSlot(media.xxx, app.loadXxxImage, null);
}
```

### 5. `presetManager.js` の `loadPreset` 内の `currentMediaRefs` 復元

```js
window.currentMediaRefs.xxx = media.xxx || null;
```

### 6. 画像・動画読み込み関数内で `onWindowResize()` を呼ぶ

`visible = false` で初期化されたメッシュのジオメトリを差し替えて `visible = true` にしても、EffectComposer経由のレンダリングでは変更が即座に反映されない。画像・動画の読み込み完了後、`updateXxxImageSize()` と `visible = true` の後に `onWindowResize()` を呼ぶこと。

```js
// 画像読み込み関数内
updateXxxImageSize(currentSize);
xxxPlane.visible = true;
onWindowResize();  // ← 必須：ジオメトリ変更をレンダラーに反映
```

```js
// 動画読み込み関数内（onVideoReady内）
updateXxxImageSize(currentSize);
xxxPlane.visible = true;
onWindowResize();  // ← 必須
```

これがないと、新規状態（プリセット未読込）でメディアを読み込んだときにアスペクト比が壊れる。DevToolsを開くと直る場合、この問題を疑うこと。

## 完了条件

**6項目すべてが実装されていること。** 1つでも漏れるとプリセットの保存・復元またはメディア表示が壊れる。

作業完了時に、以下の形式で各項目の実装状況を報告すること：

```
チェックリスト:
1. appFunctions エクスポート: done (L行番号)
2. setupDropZone nullガード: done (L行番号)
3. clearXxxImage クリア処理: done (L行番号)
4. restoreMediaSlot 復元処理: done (L行番号)
5. currentMediaRefs 復元: done (L行番号)
6. onWindowResize 呼び出し: done (L行番号 - 画像/動画両方)
```
