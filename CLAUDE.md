## MIDIOrchestra プロジェクトルール

### 変更後は必ずデプロイすること

このプロジェクトはローカルではなく本番環境で動作確認を行っている。
コードの変更が完了したら、必ず `romashige.com` にデプロイすること。

- デプロイ先（FTPパス）: `/romashige.com/public_html/midi-orchestra/`
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

### モバイルでは `100vh` ではなく `100dvh` を使うこと

モバイルブラウザ（Chrome・Safari共通）では `100vh` はURLバーが隠れた状態の最大ビューポート高さを返す。
URLバーが表示されている通常の状態では、実際の表示領域より大きい値になる。

- `100vh`: 最大ビューポート高さ（URLバー非表示時）→ 実際の画面よりはみ出す
- `100dvh`: 動的ビューポート高さ（現在の実際の表示領域）→ 正確

モバイル向けのレイアウトでビューポート高さを参照する場合は、必ず `dvh` を使うこと。

### ブルーム制御対象のレイヤー設定

ノートの発光（ブルーム）は`noteBloomEnabled`チェックボックスで切り替え可能。
この制御はThree.jsのカメラレイヤーで実装されており、**レイヤー1のオブジェクトがブルーム制御対象**となる。

新しい3Dオブジェクトを追加する際、ノートと同じブルーム制御に含めたい場合は以下の2点が必要:

1. **オブジェクトをレイヤー1に設定する**
```js
sprite.layers.set(1); // ノートと同じレイヤー（ブルーム制御対象）
scene.add(sprite);
```

2. **レンダリングループの条件分岐にオブジェクト配列を追加する**（L8144付近）
```js
if (!noteBloomEnabled && ((state.noteObjects && state.noteObjects.length > 0) || (state.popIcons && state.popIcons.length > 0) || ...)) {
```

レイヤー1に入れないとブルーム無効時でも常にブルームが適用され、条件分岐に含めないと除外処理自体が実行されない。

### ドット絵の拡大は4倍・ニアレストネイバー

このプロジェクトのキャラクタースプライトは元ドットの**4倍**で描画されている。
ドット絵素材を拡大する際は、ぼやけないように**ニアレストネイバー**で**4倍**に統一すること。

```bash
ffmpeg -i input.png -vf "scale=iw*4:ih*4:flags=neighbor" -update 1 -y output.png
```
