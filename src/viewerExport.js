// ============================================
// Viewer Export - viewer-data.js 生成 & 公開
// ============================================

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      // data:...;base64,XXXX の "XXXX" 部分だけ取得
      const base64 = reader.result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// メディアデータを収集してJSON文字列を返す（共通処理）
async function collectViewerDataJSON() {
  const settings = window.presetManager.collectCurrentSettings();
  const refs = window.currentMediaRefs || {};
  const mediaSlots = ['midi', 'audio', 'skyDome', 'floor', 'leftWall', 'rightWall', 'backWall'];

  const media = {};
  for (const slot of mediaSlots) {
    const mediaId = refs[slot];
    if (!mediaId) {
      media[slot] = null;
      continue;
    }

    try {
      const record = await window.presetManager.getMediaFromLibrary(mediaId);
      if (!record || !record.blob) {
        media[slot] = null;
        continue;
      }

      const blob = record.blob;
      const data = await blobToBase64(blob);
      media[slot] = {
        name: record.name || `${slot}.bin`,
        mimeType: record.mimeType || blob.type || 'application/octet-stream',
        data: data,
      };
    } catch (e) {
      console.error(`Failed to export media slot "${slot}":`, e);
      media[slot] = null;
    }
  }

  return JSON.stringify({ settings, media });
}

// ダウンロード用エクスポート
async function exportViewerData() {
  const jsonStr = await collectViewerDataJSON();
  const jsContent = 'window.VIEWER_DATA = ' + jsonStr + ';\n';

  const blob = new Blob([jsContent], { type: 'application/javascript' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'viewer-data.js';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  console.log('Viewer data exported successfully');
}

// サーバーに直接公開
async function publishViewerData(song) {
  const jsonStr = await collectViewerDataJSON();

  const response = await fetch('save-data.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      song: song,
      data: jsonStr,
    }),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || 'Publish failed');
  }

  return result;
}

// グローバルに公開
window.viewerExport = { exportViewerData, publishViewerData };
