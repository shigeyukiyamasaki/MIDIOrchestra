## MIDIOrchestra プロジェクトルール

### イベントリスナー登録時のnullチェック必須

`src/main.js` はエディター（`index.html`）とビューワー（`viewer.html`）で共有されている。
ビューワーにはエディターのUI要素（日差しパネル、画像パネル等）が存在しないため、
イベントリスナー登録時は必ずオプショナルチェーニング（`?.`）またはnullガードを使うこと。

```js
// OK: 要素がなくてもエラーにならない
document.getElementById('someControl')?.addEventListener('input', (e) => { ... });

// OK: ブロック単位でガード
if (document.getElementById('somePanel')) {
  // パネル内の複数リスナーをまとめて登録
}

// NG: 要素がないとクラッシュする
document.getElementById('someControl').addEventListener('input', (e) => { ... });
```
