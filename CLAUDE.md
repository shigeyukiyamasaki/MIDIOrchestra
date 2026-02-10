## MIDIOrchestra プロジェクトルール

### 変更後は必ずデプロイすること

このプロジェクトはローカルではなく本番環境で動作確認を行っている。
コードの変更が完了したら、必ず `romashige.com` にデプロイすること。

- デプロイ先: `romashige.com/public_html/midi-orchestra/`
- FTPホスト: `sv1141.xserver.jp`
- 認証情報: `~/.netrc` に保存済み（lftpが自動で読み取る）

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
