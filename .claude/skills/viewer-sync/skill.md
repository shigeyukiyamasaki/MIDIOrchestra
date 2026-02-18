---
name: viewer-sync
description: |
  エディター(index.html)のUIコントロールを追加・変更した際に、
  ビューワー(viewer.html)との同期を確認するチェックリスト。
  index.htmlにinput/selectを追加・変更したときに使う。
---

# エディター↔ビューワー設定同期チェックリスト

## 背景

`main.js` はエディターとビューワーで共有。ビューワーでは `applySettings()` がDOM値をセットし、
イベントリスナー経由で3Dオブジェクトに反映する。viewer.htmlに対応するDOM要素がないと設定が無言で消える。

## チェック項目

### 1. DOM要素の存在

viewer.htmlに対応する `input[id]` / `select[id]` が存在するか。
なければ追加する（非表示でも可）。

### 2. スライダー属性の完全一致

`min`, `max`, `step`, `value` がindex.htmlと**完全一致**すること。
特に `step` が異なると、HTMLのrange inputが値を最寄りのステップに**自動的に丸める**。

例: エディターで `step="1"` → 125を保存 → ビューワーで `step="10"` → 130に丸められる

### 3. viewerExport.js の mediaSlots

メディアスロット追加時は `src/viewerExport.js` の `mediaSlots` 配列に追加。
含まれないスロットはエクスポート・公開時にデータから欠落する。

### 4. syncWallSettingsFromDOM() の更新

壁面・床パネル追加時は `syncWallSettingsFromDOM()` の配列にも追加。
ビューワーでimage-panelガード内のイベントリスナーが機能しない場合の補完。

### 5. キャッシュバスター更新

viewer.htmlはデータファイルに `?t=Date.now()` を付けている。
`main.js`, `presetManager.js` の `?v=...` も更新すること。

## なぜこの問題が繰り返し起きるか（構造的原因）

### 1. 二重定義（DRY違反）

同じUIコントロールの定義が `index.html` と `viewer.html` に手書きで二重管理されている。
片方を変更してもう片方を忘れると不整合が生じるが、エラーにならない。

### 2. サイレント失敗

- `document.getElementById()` は要素がなければ `null` を返すだけ
- `applySettings()` の自動収集は対応DOM要素がなければ黙ってスキップ
- `setRangeValue()` もnullチェック付きで静かに失敗

→ 設定が欠落しても**コンソールにエラーが出ない**ため、目視で3D空間を確認するまで気づけない。

### 3. プラットフォームの暗黙的挙動

HTMLの `<input type="range">` は `step` に合わない値をセットすると**自動的に最寄りのステップに丸める**。
コード上では正しい値を `.value` に代入しているように見えるが、DOMが勝手に変換する。

### 原則

> **同じ定義を複数箇所に手書きし、かつ不整合がエラーにならない構造は、必ず壊れる。**

### 将来的な根本対策（参考）

- **A. 共有定義からの自動生成**: JSON定義から両HTMLのinput要素を生成するビルドステップ
- **B. ランタイム検証**: ビューワー起動時に設定キーとDOM要素の突合を行い、欠落を `console.warn` で警告
- **C. ビルドタイム比較**: ← **実装済み**（`tools/check-viewer-sync.py`）

## 同期チェックスクリプト

UIコントロールを追加・変更した後に実行する:

```bash
python3 tools/check-viewer-sync.py
```

- `[MISSING]`: viewer.html に存在しない要素（エディター専用UIは無視してよい）
- `[MISMATCH]`: 属性（min/max/step/value/type）が異なる要素 → 修正必須
- `[OK]`: 一致した要素数
- 終了コード 0 = 問題なし、1 = 要確認あり
