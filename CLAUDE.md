## MIDIOrchestra プロジェクトルール

## 📎 参照ルール（上位層）

- **運用共通**: [COMMON_RULES.md](~/shared-claude-rules/COMMON_RULES.md)
- **全ツール共通**: [TOOL_CRAFT_RULES.md](~/shared-claude-rules/TOOL_CRAFT_RULES.md)
- **メディア系共通**: [TOOL_CRAFT_MEDIA.md](~/shared-claude-rules/TOOL_CRAFT_MEDIA.md)

上記に書かれているルールは本ファイルには重複させない。

---

### 変更後は必ずデプロイすること

このプロジェクトはローカルではなく本番環境で動作確認を行っている。
コードの変更が完了したら、必ず `romashige.com` にデプロイすること。

- デプロイ先（FTPパス）: `/romashige.com/public_html/midi-orchestra/`
- FTPホスト: `sv1141.xserver.jp`
- 認証情報: `~/.netrc` に保存済み（lftpが自動で読み取る）

### デプロイ時のファイルパスはHTMLの参照パスと一致させること

サーバー上のディレクトリ構造はローカルと異なる場合がある。
アップロード先パスは**HTMLの `<script src="...">`や`<link href="...">`の参照パス**に合わせること。

- `src/main.js` → `/midi-orchestra/src/main.js` にアップロード（ルート直下の `/midi-orchestra/main.js` ではない）
- `style.css` → `/midi-orchestra/style.css` にアップロード
- デプロイ前に `index.html` 内の参照パスを確認する
- JSファイル更新時はキャッシュバスター（`?v=...`）も更新する

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

- **公開時に自動生成**: 920px超の動画は公開フローでffmpeg.wasmによりモバイル版（nearest-neighbor縮小）が自動生成・アップロードされる
- ファイル名例: `SongName_floor.mp4` → `SongName_floor_mobile.mp4`
- モバイル版がない場合はオリジナルにフォールバック（4Kは再生失敗する）
- 関連ファイル: `src/mobileVideoGenerator.js`, `src/viewerExport.js`

#### ffmpeg.wasm 自前ホスト（/midi-orchestra/ffmpeg/）

ffmpeg.wasmのコア・ワーカーファイルは同一オリジンに自前ホストしている。
`worker.js`が相対importで`const.js`/`errors.js`を読むため、BlobURL化やCDN直接参照ではWorkerが起動できずハングする。

| ファイル | 元パッケージ |
|---------|------------|
| `ffmpeg/worker.js` | `@ffmpeg/ffmpeg@0.12.10/dist/esm/worker.js` |
| `ffmpeg/const.js` | `@ffmpeg/ffmpeg@0.12.10/dist/esm/const.js` |
| `ffmpeg/errors.js` | `@ffmpeg/ffmpeg@0.12.10/dist/esm/errors.js` |
| `ffmpeg/ffmpeg-core.js` | `@ffmpeg/core@0.12.10/dist/esm/ffmpeg-core.js` |
| `ffmpeg/ffmpeg-core.wasm` | `@ffmpeg/core@0.12.10/dist/esm/ffmpeg-core.wasm` |

FFmpegクラス本体のみCDN ESM importで取得（`@ffmpeg/ffmpeg@0.12.10/+esm`）。

#### 過去のバグ（修正済み）

- `loadVideoFromURL()`のモバイルURL変換正規表現が`noCacheUrl()`のクエリパラメータ（`?t=...`）付きURLに対応していなかった → `/(\.\w+)(\?|$)/` に修正（2026-04-03）
- ffmpeg.wasm `worker.js`をBlobURL化すると相対importが解決できずハングする → 同一オリジン自前ホストで解決（2026-04-03）

### モバイル制約（本プロジェクト固有）

一般的なモバイル対応ルール（`100dvh` 使用、iOS での動的3D生成制限）は `TOOL_CRAFT_MEDIA.md` §3 参照。

**本プロジェクト固有の対策**: ノート発音ごとの `createPopIcon()` はiOSで無効化済み（`checkNoteRipples()` 内）。
```js
if (!isMobileDevice && trackInfo) {
  createPopIcon(mesh.position.y, mesh.position.z, trackInfo.instrumentId);
}
```

**今後の改善案**: 完全無効化ではなく、同時存在数に上限を設ける（例: 最大50個、古いものから削除）ことで復活の余地あり。

**その他のモバイル制約**:
- リピート時のオーバーラップ再生（`new Audio()` + `play()`）はiOSのユーザージェスチャー要件により`rAF`内から実行不可。モバイルでは無効化中
- `createMediaElementSource`（オーディオビジュアライザー用）はモバイルでも動作確認済み
- ジオメトリのセグメント数はデスクトップと同じ値に戻し済み（床・水面・雲影・影すべて）

**残存するモバイル品質制限**（保留中、戻すかは未定）:

| 項目 | モバイル | デスクトップ | 箇所 |
|------|---------|------------|------|
| ピクセル比 | 最大2 | 制限なし | `setupThreeJS()` L1889 |
| ブルーム解像度 | 0.5倍 | 1倍 | `setupThreeJS()` L1896 |
| シャドウマップ | 1024px | 2048px | `setupThreeJS()` L1956-1957 |

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

### 3Dオブジェクトの状態同期は関数に集約すること

壁パネルの状態同期は `syncWallSettingsFromDOM()` に集約されている。他の関数から状態更新する場合は必ずこの関数を呼ぶこと（インライン重複禁止。`TOOL_CRAFT_RULES.md` §3-6 参照）。

### メディアスロット追加時のチェックリスト

詳細は [media-slot-addition skill](.claude/skills/media-slot-addition/skill.md) を参照。
専用エージェント [add-media-slot](.claude/agents/add-media-slot.md) で実行すること。

### 自動収集（collectCurrentSettings）の除外ルール

`collectCurrentSettings()` は `#controls` 等のコンテナ内の全 `input[id]`/`select[id]` を自動収集する。
**プリセットUI自体のコントロール**（`presetSelect` 等）は設定ではないため、除外すること。

新しいUIコントロールを `#controls` 内に追加する際、それが「保存すべき設定」でない場合は除外条件に追加する。

### エディター↔ビューワーの設定同期

`index.html` にUIコントロールを追加・変更した場合、`viewer.html` との同期が必須。
変更後は `python3 tools/check-viewer-sync.py` を実行し、不整合がないことを確認すること。

詳細は [viewer-sync skill](.claude/skills/viewer-sync/skill.md) を参照。

### キャラクターアニメーション（ドット絵スプライト）

詳細は [character-animation skill](.claude/skills/character-animation/skill.md) を参照。
