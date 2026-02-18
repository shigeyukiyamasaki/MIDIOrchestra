// ============================================
// Viewer Export - viewer-data.js 生成 & 公開
// ============================================

const MAX_EMBED_SIZE = 50 * 1024 * 1024; // 50MB: base64埋め込みの上限
const MAX_UPLOAD_SIZE = 200 * 1024 * 1024; // 200MB: 個別アップロードの上限

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function yieldToUI() {
  return new Promise(r => setTimeout(r, 0));
}

// XHRで大容量ファイルをアップロード（進捗コールバック付き）
function uploadFileXHR(url, formData, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);

    if (onProgress) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          onProgress(e.loaded, e.total);
        }
      };
    }

    xhr.onload = () => {
      try {
        const result = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300 && result.success) {
          resolve(result);
        } else {
          reject(new Error(result.error || `HTTP ${xhr.status}`));
        }
      } catch (e) {
        reject(new Error(`Response parse error: ${xhr.status} ${xhr.responseText.substring(0, 200)}`));
      }
    };

    xhr.onerror = () => reject(new Error('Network error'));
    xhr.ontimeout = () => reject(new Error('Upload timeout'));
    xhr.timeout = 600000; // 10分
    xhr.send(formData);
  });
}

// メディアデータを収集
async function collectMediaData(onStatus) {
  if (onStatus) onStatus('設定を収集中...');
  const settings = window.presetManager.collectCurrentSettings();
  const refs = window.currentMediaRefs || {};
  const mediaSlots = ['midi', 'audio', 'skyDome', 'innerSky', 'floor', 'floor2', 'floor3', 'leftWall', 'centerWall', 'rightWall', 'backWall', 'panel5Wall', 'panel6Wall', 'heightmap'];

  const media = {};
  const largeFiles = {};

  for (const slot of mediaSlots) {
    await yieldToUI();

    const mediaId = refs[slot];
    let blob = null;
    let fileName = `${slot}.bin`;
    let mimeType = 'application/octet-stream';

    console.log(`[Export] ${slot}: mediaId=${mediaId || 'null'}`);

    if (mediaId) {
      try {
        const record = await window.presetManager.getMediaFromLibrary(mediaId);
        if (record && record.blob) {
          blob = record.blob;
          fileName = record.name || fileName;
          mimeType = record.mimeType || record.blob.type || mimeType;
          console.log(`[Export] ${slot}: DB hit, name=${fileName}, size=${blob.size}`);
        } else {
          console.warn(`[Export] ${slot}: DB returned no blob (record=${!!record})`);
        }
      } catch (e) {
        console.warn(`[Export] DB read failed for ${slot}:`, e);
      }
    }

    if (!blob && slot !== 'midi' && slot !== 'audio' && window.getLoadedMediaBlob) {
      console.log(`[Export] ${slot}: trying fallback from loaded media...`);
      try {
        const fallback = await window.getLoadedMediaBlob(slot);
        if (fallback) {
          blob = fallback.blob;
          fileName = fallback.name;
          mimeType = fallback.mimeType;
          console.log(`[Export] ${slot}: fallback OK, name=${fileName}, size=${blob.size}`);
        } else {
          console.warn(`[Export] ${slot}: fallback returned null`);
        }
      } catch (e) {
        console.warn(`[Export] Fallback failed for ${slot}:`, e);
      }
    }

    if (!blob) {
      media[slot] = null;
      continue;
    }

    const sizeMB = (blob.size / 1024 / 1024).toFixed(1);

    if (blob.size > MAX_EMBED_SIZE) {
      if (blob.size > MAX_UPLOAD_SIZE) {
        console.warn(`[Export] ${slot}: ${sizeMB}MB exceeds upload limit`);
        media[slot] = null;
        continue;
      }
      console.log(`[Export] ${slot}: ${sizeMB}MB → separate upload`);
      largeFiles[slot] = { blob, name: fileName, mimeType };
      media[slot] = { name: fileName, mimeType, url: '__pending__' };
      continue;
    }

    if (onStatus) onStatus(`${slot} をエンコード中 (${sizeMB}MB)...`);
    try {
      const data = await blobToBase64(blob);
      await yieldToUI();
      media[slot] = { name: fileName, mimeType, data };
    } catch (e) {
      console.error(`Failed to export media slot "${slot}":`, e);
      media[slot] = null;
    }
  }

  return { settings, media, largeFiles };
}

// ダウンロード用エクスポート
async function exportViewerData() {
  const { settings, media } = await collectMediaData();
  const jsonStr = JSON.stringify({ settings, media });
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

// サーバーに直接公開（onStatus: 進捗表示コールバック）
async function publishViewerData(song, onStatus) {
  const { settings, media, largeFiles } = await collectMediaData(onStatus);

  // 大容量ファイルを個別アップロード
  const largeSlots = Object.keys(largeFiles);
  for (const slot of largeSlots) {
    const { blob, name, mimeType } = largeFiles[slot];
    const sizeMB = (blob.size / 1024 / 1024).toFixed(0);

    const formData = new FormData();
    formData.append('song', song);
    formData.append('slot', slot);
    formData.append('file', blob, name);

    if (onStatus) onStatus(`${slot} をアップロード中 (${sizeMB}MB)... 0%`);

    const uploadResult = await uploadFileXHR('upload-media.php', formData, (loaded, total) => {
      const pct = Math.round((loaded / total) * 100);
      if (onStatus) onStatus(`${slot} をアップロード中 (${sizeMB}MB)... ${pct}%`);
    });

    media[slot] = { name, mimeType, url: uploadResult.url };
    console.log(`[Publish] ${slot} uploaded: ${uploadResult.url}`);

    await yieldToUI();
  }

  // JSON本体を保存
  if (onStatus) onStatus('データを保存中...');
  const jsonStr = JSON.stringify({ settings, media });

  const response = await fetch('save-data.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ song, data: jsonStr }),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || 'Publish failed');
  }

  if (largeSlots.length > 0) {
    result.uploadedSeparately = largeSlots;
  }

  return result;
}

// Notion データベースに公開情報を登録
async function notifyNotion(song, viewerUrl) {
  // メタデータ収集
  const presetSelect = document.getElementById('presetSelect');
  const presetName = presetSelect?.options[presetSelect.selectedIndex]?.textContent || '';
  const title = presetName || song;
  const composer = document.getElementById('creditsLine3')?.value || '';

  // Notion APIに登録
  const response = await fetch('notion-publish.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      song,
      title,
      composer,
      url: viewerUrl,
    }),
  });

  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.error || 'Notion publish failed');
  }

  console.log(`[Notion] ${result.action}: ${song}`);
  return result;
}

window.viewerExport = { exportViewerData, publishViewerData, notifyNotion };
