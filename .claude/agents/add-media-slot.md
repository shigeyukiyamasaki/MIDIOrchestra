---
name: add-media-slot
description: メディアスロット（床・壁面パネル等）を追加する専用エージェント
tools: Read,Write,Edit,Glob,Grep,Bash
model: sonnet
skills: media-slot-addition
---
MIDIOrchestraプロジェクトに新しいメディアスロットを追加してください。

追加するスロット: {{slot_name}}
参考にする既存スロット: {{reference_slot}}

## 作業手順

1. 参考スロットの実装を `src/main.js` と `src/presetManager.js` から読み取る
2. 参考スロットをコピーして新スロット用に名前を変更
3. `index.html` にUI要素（ドロップゾーン、スライダー等）を追加
4. **media-slot-addition スキルのチェックリスト6項目をすべて実行**
5. 完了時にチェックリストの実装状況を報告
