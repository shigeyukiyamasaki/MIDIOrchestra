// ============================================
// Mobile Video Generator - ffmpeg.wasm を使った動画縮小
// ============================================
// 公開フローで大きい動画（920px超）を検出し、モバイル版を自動生成する

const MOBILE_MAX_SIZE = 920; // これ以下はモバイル版不要
// ffmpeg.wasm: FFmpegクラスはCDNからESM import、コア+ワーカーは同一オリジンに自前ホスト
// （worker.jsが相対importでconst.js/errors.jsを読むため、BlobURL化するとハングする）
const FFMPEG_ESM_URL = 'https://cdn.jsdelivr.net/npm/@ffmpeg/ffmpeg@0.12.10/+esm';
const FFMPEG_LOCAL_DIR = `${location.origin}/midi-orchestra/ffmpeg`;

let ffmpegInstance = null;
let ffmpegLoaded = false;
let ffmpegLoading = false;

function reportFailure(message, error, onStatus) {
  console.error(message, error);
  if (onStatus) onStatus('モバイル版の生成に失敗（詳細はコンソールを確認）');
}

// ffmpeg.wasm をロード（初回のみ）
async function loadFFmpeg(onStatus) {
  if (ffmpegLoaded) return ffmpegInstance;
  if (ffmpegLoading) {
    // 別の呼び出しがロード中なら待つ
    while (ffmpegLoading) await new Promise(r => setTimeout(r, 100));
    if (ffmpegLoaded && ffmpegInstance) return ffmpegInstance;
    const loadWaitError = new Error('ffmpeg.wasm load did not complete successfully');
    reportFailure('[MobileVideo] ffmpeg.wasm load wait failed:', loadWaitError, onStatus);
    throw loadWaitError;
  }
  ffmpegLoading = true;

  try {
    if (onStatus) onStatus('ffmpeg.wasm をロード中...');

    const { FFmpeg } = await import(FFMPEG_ESM_URL);

    ffmpegInstance = new FFmpeg();

    // 進捗コールバック
    ffmpegInstance.on('progress', ({ progress }) => {
      if (onStatus) onStatus(`モバイル版を生成中... ${Math.round(progress * 100)}%`);
    });
    ffmpegInstance.on('log', ({ message }) => {
      console.log('[MobileVideo][ffmpeg]', message);
    });

    // 同一オリジンからロード（toBlobURL不要、worker.jsの相対importが正しく解決される）
    await ffmpegInstance.load({
      coreURL: `${FFMPEG_LOCAL_DIR}/ffmpeg-core.js`,
      wasmURL: `${FFMPEG_LOCAL_DIR}/ffmpeg-core.wasm`,
      classWorkerURL: `${FFMPEG_LOCAL_DIR}/worker.js`,
    });

    ffmpegLoaded = true;
    console.log('[MobileVideo] ffmpeg.wasm loaded (self-hosted)');
  } catch (e) {
    reportFailure('[MobileVideo] Failed to load ffmpeg.wasm:', e, onStatus);
    ffmpegInstance = null;
    ffmpegLoaded = false;
    ffmpegLoading = false;
    throw e;
  }

  ffmpegLoading = false;
  return ffmpegInstance;
}

// 動画の解像度を取得
function getVideoDimensions(blob) {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.muted = true;
    video.preload = 'metadata';
    const url = URL.createObjectURL(blob);
    video.src = url;
    video.onloadedmetadata = () => {
      const w = video.videoWidth;
      const h = video.videoHeight;
      URL.revokeObjectURL(url);
      video.remove();
      resolve({ width: w, height: h });
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      video.remove();
      resolve(null);
    };
    // DOMに追加（メタデータ読み込みに必要な場合あり）
    video.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;pointer-events:none;z-index:-1;';
    document.body.appendChild(video);
  });
}

// モバイル版動画を生成
// 戻り値: { blob, name } または null（生成不要/失敗）
async function generateMobileVideo(originalBlob, originalName, onStatus) {
  try {
    // 解像度チェック
    const dims = await getVideoDimensions(originalBlob);
    if (!dims) {
      const dimensionsError = new Error(`Could not read video dimensions for ${originalName}`);
      reportFailure('[MobileVideo] Failed to inspect video dimensions:', dimensionsError, onStatus);
      return null;
    }

    const maxDim = Math.max(dims.width, dims.height);
    if (maxDim <= MOBILE_MAX_SIZE) {
      console.log(`[MobileVideo] ${originalName}: ${dims.width}x${dims.height} — モバイル版不要`);
      return null;
    }

    console.log(`[MobileVideo] ${originalName}: ${dims.width}x${dims.height} — モバイル版を生成`);

    // 縮小サイズを計算（アスペクト比を維持し、短辺を偶数に）
    const scale = MOBILE_MAX_SIZE / maxDim;
    let newW = Math.round(dims.width * scale);
    let newH = Math.round(dims.height * scale);
    // H.264は偶数サイズ必須
    if (newW % 2 !== 0) newW--;
    if (newH % 2 !== 0) newH--;

    const ffmpeg = await loadFFmpeg(onStatus);

    if (onStatus) onStatus('モバイル版を準備中...');

    // 入力ファイルを書き込み
    const inputData = new Uint8Array(await originalBlob.arrayBuffer());
    await ffmpeg.writeFile('input.mp4', inputData);

    if (onStatus) onStatus('モバイル版を生成中... 0%');

    // ffmpegで縮小（nearest-neighborでドット絵のシャープさを維持）
    await ffmpeg.exec([
      '-i', 'input.mp4',
      '-vf', `scale=${newW}:${newH}:flags=neighbor`,
      '-c:v', 'libx264',
      '-crf', '1',
      '-profile:v', 'high',
      '-pix_fmt', 'yuv420p',
      '-an',
      '-movflags', '+faststart',
      'output_mobile.mp4',
    ]);

    // 出力を読み取り
    const outputData = await ffmpeg.readFile('output_mobile.mp4');
    const mobileBlob = new Blob([outputData], { type: 'video/mp4' });

    // クリーンアップ
    await ffmpeg.deleteFile('input.mp4');
    await ffmpeg.deleteFile('output_mobile.mp4');

    // ファイル名に _mobile を追加
    const mobileName = originalName.replace(/(\.\w+)$/, '_mobile$1');

    console.log(`[MobileVideo] Generated: ${mobileName} (${newW}x${newH}, ${(mobileBlob.size / 1024 / 1024).toFixed(1)}MB)`);

    return { blob: mobileBlob, name: mobileName };
  } catch (e) {
    reportFailure('[MobileVideo] Generation failed:', e, onStatus);
    return null;
  }
}

// グローバルに公開
window.mobileVideoGenerator = { generateMobileVideo, getVideoDimensions, MOBILE_MAX_SIZE };
