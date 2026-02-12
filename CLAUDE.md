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

### モバイル動画テクスチャの制限

4K動画はモバイルSafariで再生不可（error code 4: MEDIA_ERR_SRC_NOT_SUPPORTED）。
ビューワーのURL参照動画で、モバイルでは `{ファイル名}_mobile.{拡張子}` を自動的に試行する仕組みあり。

- 公開時に大きい動画（床・壁）を使う場合、手動でモバイル版（720p程度）を作成しサーバーにアップロードする必要あり
- ファイル名例: `SongName_floor.mp4` → `SongName_floor_mobile.mp4`
- ffmpegコマンド例: `ffmpeg -i original.mp4 -vf "scale=720:720" -r 30 -c:v libx264 -crf 28 -an -movflags +faststart mobile.mp4`
- モバイル版がない場合はオリジナルにフォールバック（4Kは再生失敗する）
