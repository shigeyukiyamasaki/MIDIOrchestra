// ============================================
// プリセット管理 - IndexedDB メディアライブラリ
// ============================================

// モーダルをボタン付近に配置するユーティリティ
function positionModalNearButton(modal, button) {
  const content = modal.querySelector('.modal-content');
  if (!content) return;
  const rect = button.getBoundingClientRect();
  const top = rect.bottom + 8;
  content.style.position = 'absolute';
  content.style.margin = '0';
  content.style.top = top + 'px';
  content.style.left = rect.left + 'px';
  content.style.right = 'auto';
  requestAnimationFrame(() => {
    const cRect = content.getBoundingClientRect();
    if (cRect.right > window.innerWidth - 16) {
      content.style.left = 'auto';
      content.style.right = '16px';
    }
    if (cRect.bottom > window.innerHeight - 16) {
      content.style.top = Math.max(16, rect.top - cRect.height - 8) + 'px';
    }
  });
}

const DB_NAME = 'MIDIOrchestraDB';
const DB_VERSION = 1;

let db = null;

// ============================================
// IndexedDB 操作
// ============================================

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (e) => {
      const database = e.target.result;

      // メディアライブラリ
      if (!database.objectStoreNames.contains('mediaLibrary')) {
        const mediaStore = database.createObjectStore('mediaLibrary', { keyPath: 'id' });
        mediaStore.createIndex('name', 'name', { unique: false });
        mediaStore.createIndex('type', 'type', { unique: false });
        mediaStore.createIndex('createdAt', 'createdAt', { unique: false });
      }

      // プリセット
      if (!database.objectStoreNames.contains('presets')) {
        const presetStore = database.createObjectStore('presets', { keyPath: 'id' });
        presetStore.createIndex('name', 'name', { unique: true });
        presetStore.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };

    request.onsuccess = (e) => {
      db = e.target.result;
      resolve(db);
    };

    request.onerror = (e) => {
      console.error('IndexedDB open error:', e.target.error);
      reject(e.target.error);
    };
  });
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

// ============================================
// メディアライブラリ操作
// ============================================

async function findExistingMedia(name, size) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('mediaLibrary', 'readonly');
    const store = tx.objectStore('mediaLibrary');
    const index = store.index('name');
    const request = index.getAll(name);

    request.onsuccess = () => {
      const matches = request.result.filter(r => r.size === size);
      resolve(matches.length > 0 ? matches[0].id : null);
    };
    request.onerror = () => reject(request.error);
  });
}

async function saveMediaToLibrary(file, type) {
  // 同名・同タイプの既存メディアを削除
  const existing = await new Promise((resolve, reject) => {
    const tx = db.transaction('mediaLibrary', 'readonly');
    const store = tx.objectStore('mediaLibrary');
    const index = store.index('name');
    const request = index.getAll(file.name);
    request.onsuccess = () => resolve(request.result.filter(r => r.type === type));
    request.onerror = () => reject(request.error);
  });

  if (existing.length > 0) {
    await new Promise((resolve, reject) => {
      const tx = db.transaction('mediaLibrary', 'readwrite');
      const store = tx.objectStore('mediaLibrary');
      existing.forEach(r => store.delete(r.id));
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  const id = generateId();
  const record = {
    id,
    name: file.name,
    mimeType: file.type,
    type,
    size: file.size,
    blob: file,
    createdAt: Date.now(),
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction('mediaLibrary', 'readwrite');
    const store = tx.objectStore('mediaLibrary');
    const request = store.put(record);
    request.onsuccess = () => resolve(id);
    request.onerror = () => reject(request.error);
  });
}

async function getAllMediaByType(type) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('mediaLibrary', 'readonly');
    const store = tx.objectStore('mediaLibrary');
    const index = store.index('type');
    const request = index.getAll(type);
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

async function getMediaFromLibrary(id) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('mediaLibrary', 'readonly');
    const store = tx.objectStore('mediaLibrary');
    const request = store.get(id);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

async function deleteMediaFromLibrary(id) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('mediaLibrary', 'readwrite');
    const store = tx.objectStore('mediaLibrary');
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// ============================================
// プリセット操作
// ============================================

async function savePreset(name, settings, mediaRefs) {
  // 同名チェック
  const existing = await findPresetByName(name);

  const now = Date.now();
  const record = {
    id: existing ? existing.id : generateId(),
    name,
    createdAt: existing ? existing.createdAt : now,
    updatedAt: now,
    settings,
    media: { ...mediaRefs },
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction('presets', 'readwrite');
    const store = tx.objectStore('presets');
    const request = store.put(record);
    request.onsuccess = () => resolve(record.id);
    request.onerror = () => reject(request.error);
  });
}

async function findPresetByName(name) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('presets', 'readonly');
    const store = tx.objectStore('presets');
    const index = store.index('name');
    const request = index.get(name);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

async function listPresets() {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('presets', 'readonly');
    const store = tx.objectStore('presets');
    const index = store.index('createdAt');
    const request = index.getAll();
    request.onsuccess = () => {
      resolve(request.result.map(r => ({ id: r.id, name: r.name })));
    };
    request.onerror = () => reject(request.error);
  });
}

async function getPreset(id) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('presets', 'readonly');
    const store = tx.objectStore('presets');
    const request = store.get(id);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

async function deletePreset(id) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('presets', 'readwrite');
    const store = tx.objectStore('presets');
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// ============================================
// 設定値の収集
// ============================================

function collectCurrentSettings() {
  const s = {};

  // カメラ（デュアルレンジ）
  const sliders = document.querySelectorAll('.dual-range');
  sliders.forEach(slider => {
    const axis = slider._axis;
    if (axis && slider._dualRange) {
      s[`cameraRange${axis}Min`] = parseFloat(document.getElementById(`cameraRange${axis}MinVal`).textContent);
      s[`cameraRange${axis}Max`] = parseFloat(document.getElementById(`cameraRange${axis}MaxVal`).textContent);
    }
  });

  // ブルーム閾値（デュアルレンジ）
  const btMinEl = document.getElementById('bloomThresholdMinVal');
  const btMaxEl = document.getElementById('bloomThresholdMaxVal');
  if (btMinEl) s.bloomThresholdMin = parseFloat(btMinEl.textContent);
  if (btMaxEl) s.bloomThresholdMax = parseFloat(btMaxEl.textContent);

  // ヘルパー: range/numberの値を取得
  const getRangeValue = (id) => {
    const el = document.getElementById(id);
    return el ? parseFloat(el.value) : undefined;
  };
  const getCheckbox = (id) => {
    const el = document.getElementById(id);
    return el ? el.checked : undefined;
  };
  const getColorValue = (id) => {
    const el = document.getElementById(id);
    return el ? el.value : undefined;
  };
  const getSelectValue = (id) => {
    const el = document.getElementById(id);
    return el ? el.value : undefined;
  };
  const getRadioValue = (name) => {
    const checked = document.querySelector(`input[name="${name}"]:checked`);
    return checked ? checked.value : undefined;
  };

  // カメラ位置・ターゲット
  if (window.appCamera) {
    s.cameraPosX = window.appCamera.position.x;
    s.cameraPosY = window.appCamera.position.y;
    s.cameraPosZ = window.appCamera.position.z;
  }
  if (window.appControls) {
    s.cameraTargetActualX = window.appControls.target.x;
    s.cameraTargetActualY = window.appControls.target.y;
    s.cameraTargetActualZ = window.appControls.target.z;
  }
  s.cameraTargetX = getRangeValue('cameraTargetX');
  s.cameraTargetY = getRangeValue('cameraTargetY');
  s.cameraTargetZ = getRangeValue('cameraTargetZ');
  s.autoCameraEnabled = getCheckbox('autoCameraEnabled');
  s.autoCameraInterval = getRangeValue('autoCameraInterval');
  s.autoCameraMode = getSelectValue('autoCameraMode');
  s.autoCameraMovePercent = getRangeValue('autoCameraMovePercent');
  s.autoCameraCrossfade = getRangeValue('autoCameraCrossfade');

  // エフェクト
  s.bounceScale = getRangeValue('bounceScale');
  s.bounceDuration = getRangeValue('bounceDuration');
  s.popIconScale = getRangeValue('popIconScale');
  s.rippleEnabled = getCheckbox('rippleEnabled');
  s.flashEffectIntensity = getRangeValue('flashEffectIntensity');
  s.beatCameraRotation = getRangeValue('beatCameraRotation');
  s.beatBackgroundPulse = getRangeValue('beatBackgroundPulse');
  s.beatColorShift = getRangeValue('beatColorShift');
  s.beatSpacePulse = getRangeValue('beatSpacePulse');
  s.beatStrobe = getRangeValue('beatStrobe');

  // 選択式エフェクト（強度 + トリガー）
  s.effectCameraShake = getRangeValue('effectCameraShake');
  s.effectCameraShakeTrigger = getRadioValue('effectCameraShakeTrigger');
  s.effectCameraZoom = getRangeValue('effectCameraZoom');
  s.effectCameraZoomTrigger = getRadioValue('effectCameraZoomTrigger');
  s.effectFlash = getRangeValue('effectFlash');
  s.effectFlashTrigger = getRadioValue('effectFlashTrigger');
  s.effectBlur = getRangeValue('effectBlur');
  s.effectBlurTrigger = getRadioValue('effectBlurTrigger');
  s.effectCrack = getRangeValue('effectCrack');
  s.effectCrackTrigger = getRadioValue('effectCrackTrigger');
  s.effectGlitch = getRangeValue('effectGlitch');
  s.effectGlitchTrigger = getRadioValue('effectGlitchTrigger');

  // 表示
  s.noteHeight = getRangeValue('noteHeight');
  s.noteDepth = getRangeValue('noteDepth');
  s.noteOpacity = getRangeValue('noteOpacity');
  s.trackSpacing = getRangeValue('trackSpacing');
  s.timeScale = getRangeValue('timeScale');
  s.pitchScale = getRangeValue('pitchScale');
  s.noteYOffset = getRangeValue('noteYOffset');
  s.timelineOpacity = getRangeValue('timelineOpacity');
  s.timelineColor = getColorValue('timelineColor');
  s.timelineX = getRangeValue('timelineX');
  s.bgColorTop = getColorValue('bgColorTop');
  s.bgColorBottom = getColorValue('bgColorBottom');
  s.gridOpacity = getRangeValue('gridOpacity');
  s.gridSize = getRangeValue('gridSize');
  s.gridColor = getColorValue('gridColor');
  s.aspectRatioSelect = getSelectValue('aspectRatioSelect');

  // クレジット
  const getTextValue = (id) => { const el = document.getElementById(id); return el ? el.value : undefined; };
  s.creditsLine1 = getTextValue('creditsLine1');
  s.creditsLine2 = getTextValue('creditsLine2');
  s.creditsLine3 = getTextValue('creditsLine3');
  s.creditsLine4 = getTextValue('creditsLine4');
  s.creditsSize1 = getRangeValue('creditsSize1');
  s.creditsSize2 = getRangeValue('creditsSize2');
  s.creditsSize3 = getRangeValue('creditsSize3');
  s.creditsSize4 = getRangeValue('creditsSize4');
  s.creditsColor = getColorValue('creditsColor');
  s.creditsOpacity = getRangeValue('creditsOpacity');

  // 同期
  s.midiDelay = getRangeValue('midiDelay');
  s.audioDelay = getRangeValue('audioDelay');

  // ループ始点・終点
  s.loopStartEnabled = getCheckbox('loopStartEnabled');
  s.loopStartTime = window.state ? window.state.loopStartTime : 0;
  s.loopEndEnabled = getCheckbox('loopEndEnabled');
  s.loopEndTime = window.state ? window.state.loopEndTime : 0;
  s.fadeOutDuration = getRangeValue('fadeOutDuration');

  // 影
  s.shadowEnvironment = getRadioValue('shadowEnvironment');

  // 天候
  s.weatherType = getSelectValue('weatherType');

  // スカイドーム
  s.skyDomeOpacity = getRangeValue('skyDomeOpacity');
  s.skyDomeRange = getRangeValue('skyDomeRange');
  s.skyDomeRadius = getRangeValue('skyDomeRadius');

  // 床
  s.floorImageSize = getRangeValue('floorImageSize');
  s.floorImageOpacity = getRangeValue('floorImageOpacity');
  s.floorImageFlip = getCheckbox('floorImageFlip');
  s.floorChromaColor = getColorValue('floorChromaColor');
  s.floorChromaThreshold = getRangeValue('floorChromaThreshold');
  s.floorCurvature = getRangeValue('floorCurvature');

  // 左側面
  s.leftWallImageSize = getRangeValue('leftWallImageSize');
  s.leftWallImageOpacity = getRangeValue('leftWallImageOpacity');
  s.leftWallImageFlip = getCheckbox('leftWallImageFlip');
  s.leftWallChromaColor = getColorValue('leftWallChromaColor');
  s.leftWallChromaThreshold = getRangeValue('leftWallChromaThreshold');

  // 右側面
  s.rightWallImageSize = getRangeValue('rightWallImageSize');
  s.rightWallImageOpacity = getRangeValue('rightWallImageOpacity');
  s.rightWallImageFlip = getCheckbox('rightWallImageFlip');
  s.rightWallChromaColor = getColorValue('rightWallChromaColor');
  s.rightWallChromaThreshold = getRangeValue('rightWallChromaThreshold');

  // 奥側
  s.backWallImageSize = getRangeValue('backWallImageSize');
  s.backWallImageX = getRangeValue('backWallImageX');
  s.backWallImageOpacity = getRangeValue('backWallImageOpacity');
  s.backWallImageFlip = getCheckbox('backWallImageFlip');
  s.backWallChromaColor = getColorValue('backWallChromaColor');
  s.backWallChromaThreshold = getRangeValue('backWallChromaThreshold');

  // 音域フィルター（トラック別pitchMin/pitchMax）
  const pitchRaw = localStorage.getItem('midiOrchestra_pitchFilters');
  if (pitchRaw) {
    try { s.pitchFilters = JSON.parse(pitchRaw); } catch(e) {}
  }

  // 自動収集: 各パネル内のid付きinput/selectで未収集のものを自動追加
  ['controls', 'settings-container', 'image-panel'].forEach(containerId => {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.querySelectorAll('input[id], select[id]').forEach(el => {
      if (s[el.id] !== undefined) return; // 既に収集済み
      if (el.type === 'file') return; // ファイル入力は除外
      if (el.type === 'checkbox' || el.type === 'radio') {
        if (el.type === 'radio' && !el.checked) return;
        s[el.id] = el.type === 'checkbox' ? el.checked : el.value;
      } else if (el.type === 'color') {
        s[el.id] = el.value;
      } else {
        s[el.id] = parseFloat(el.value) || el.value;
      }
    });
  });

  return s;
}

// ============================================
// 設定値の適用
// ============================================

function setRangeValue(id, value) {
  const el = document.getElementById(id);
  if (el && value !== undefined) {
    el.value = value;
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }
}

function setCheckbox(id, checked) {
  const el = document.getElementById(id);
  if (el && checked !== undefined) {
    el.checked = checked;
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }
}

function setColorValue(id, color) {
  const el = document.getElementById(id);
  if (el && color !== undefined) {
    el.value = color;
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }
}

function setSelectValue(id, value) {
  const el = document.getElementById(id);
  if (el && value !== undefined) {
    el.value = value;
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }
}

function setRadioValue(name, value) {
  if (value === undefined) return;
  const radio = document.querySelector(`input[name="${name}"][value="${value}"]`);
  if (radio) {
    radio.checked = true;
    radio.dispatchEvent(new Event('change', { bubbles: true }));
  }
}

function applySettings(s) {
  // デュアルレンジスライダー（カメラ）
  const sliders = document.querySelectorAll('.dual-range');
  sliders.forEach(slider => {
    const axis = slider._axis;
    if (axis && slider._dualRange) {
      const minKey = `cameraRange${axis}Min`;
      const maxKey = `cameraRange${axis}Max`;
      if (s[minKey] !== undefined && s[maxKey] !== undefined) {
        slider._dualRange.setRange(s[minKey], s[maxKey]);
      }
    }
  });

  // ブルーム閾値デュアルレンジ
  const btSlider = document.getElementById('bloomThresholdRange');
  if (btSlider?._dualRange && s.bloomThresholdMin !== undefined && s.bloomThresholdMax !== undefined) {
    btSlider._dualRange.setRange(s.bloomThresholdMin, s.bloomThresholdMax);
  }

  // カメラ位置・ターゲット復元
  if (window.restoreCameraState && s.cameraPosX !== undefined && s.cameraTargetActualX !== undefined) {
    window.restoreCameraState(
      s.cameraPosX, s.cameraPosY, s.cameraPosZ,
      s.cameraTargetActualX, s.cameraTargetActualY, s.cameraTargetActualZ,
      s.cameraTargetX || 0, s.cameraTargetY || 0, s.cameraTargetZ || 0
    );
  } else {
    // フォールバック: スライダー経由
    setRangeValue('cameraTargetX', s.cameraTargetX);
    setRangeValue('cameraTargetY', s.cameraTargetY);
    setRangeValue('cameraTargetZ', s.cameraTargetZ);
    ['cameraTargetX', 'cameraTargetY', 'cameraTargetZ'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.dispatchEvent(new Event('input'));
    });
  }
  // クレジット復元
  [1, 2, 3, 4].forEach(i => {
    const lineKey = `creditsLine${i}`;
    const sizeKey = `creditsSize${i}`;
    const lineEl = document.getElementById(lineKey);
    const sizeEl = document.getElementById(sizeKey);
    if (lineEl && s[lineKey] !== undefined) {
      lineEl.value = s[lineKey];
      lineEl.dispatchEvent(new Event('input'));
    }
    if (sizeEl && s[sizeKey] !== undefined) {
      sizeEl.value = s[sizeKey];
      sizeEl.dispatchEvent(new Event('input'));
    }
  });
  setColorValue('creditsColor', s.creditsColor);
  setRangeValue('creditsOpacity', s.creditsOpacity);
  ['creditsColor', 'creditsOpacity'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.dispatchEvent(new Event('input'));
  });

  setCheckbox('autoCameraEnabled', s.autoCameraEnabled);
  setRangeValue('autoCameraInterval', s.autoCameraInterval);
  setSelectValue('autoCameraMode', s.autoCameraMode);
  setRangeValue('autoCameraMovePercent', s.autoCameraMovePercent);
  setRangeValue('autoCameraCrossfade', s.autoCameraCrossfade);

  // エフェクト
  setRangeValue('bounceScale', s.bounceScale);
  setRangeValue('bounceDuration', s.bounceDuration);
  setRangeValue('popIconScale', s.popIconScale);
  setCheckbox('rippleEnabled', s.rippleEnabled);
  setRangeValue('flashEffectIntensity', s.flashEffectIntensity);
  setRangeValue('beatCameraRotation', s.beatCameraRotation);
  setRangeValue('beatBackgroundPulse', s.beatBackgroundPulse);
  setRangeValue('beatColorShift', s.beatColorShift);
  setRangeValue('beatSpacePulse', s.beatSpacePulse);
  setRangeValue('beatStrobe', s.beatStrobe);

  // 選択式エフェクト
  setRadioValue('effectCameraShakeTrigger', s.effectCameraShakeTrigger);
  setRangeValue('effectCameraShake', s.effectCameraShake);
  setRadioValue('effectCameraZoomTrigger', s.effectCameraZoomTrigger);
  setRangeValue('effectCameraZoom', s.effectCameraZoom);
  setRadioValue('effectFlashTrigger', s.effectFlashTrigger);
  setRangeValue('effectFlash', s.effectFlash);
  setRadioValue('effectBlurTrigger', s.effectBlurTrigger);
  setRangeValue('effectBlur', s.effectBlur);
  setRadioValue('effectCrackTrigger', s.effectCrackTrigger);
  setRangeValue('effectCrack', s.effectCrack);
  setRadioValue('effectGlitchTrigger', s.effectGlitchTrigger);
  setRangeValue('effectGlitch', s.effectGlitch);

  // 表示
  setRangeValue('noteHeight', s.noteHeight);
  setRangeValue('noteDepth', s.noteDepth);
  setRangeValue('noteOpacity', s.noteOpacity);
  setRangeValue('trackSpacing', s.trackSpacing);
  setRangeValue('timeScale', s.timeScale);
  setRangeValue('pitchScale', s.pitchScale);
  setRangeValue('noteYOffset', s.noteYOffset);
  setRangeValue('timelineOpacity', s.timelineOpacity);
  setColorValue('timelineColor', s.timelineColor);
  setRangeValue('timelineX', s.timelineX);
  setColorValue('bgColorTop', s.bgColorTop);
  setColorValue('bgColorBottom', s.bgColorBottom);
  setRangeValue('gridOpacity', s.gridOpacity);
  setRangeValue('gridSize', s.gridSize);
  setColorValue('gridColor', s.gridColor);
  setSelectValue('aspectRatioSelect', s.aspectRatioSelect);

  // 同期
  setRangeValue('midiDelay', s.midiDelay);
  setRangeValue('audioDelay', s.audioDelay);

  // ループ始点・終点
  setCheckbox('loopStartEnabled', s.loopStartEnabled);
  setCheckbox('loopEndEnabled', s.loopEndEnabled);
  if (window.state) {
    if (s.loopStartEnabled !== undefined) window.state.loopStartEnabled = s.loopStartEnabled;
    if (s.loopStartTime !== undefined) window.state.loopStartTime = s.loopStartTime;
    if (s.loopEndEnabled !== undefined) window.state.loopEndEnabled = s.loopEndEnabled;
    if (s.loopEndTime !== undefined) window.state.loopEndTime = s.loopEndTime;
  }
  setRangeValue('fadeOutDuration', s.fadeOutDuration);
  // fadeOutDuration変数も直接同期
  if (s.fadeOutDuration !== undefined) {
    const foSlider = document.getElementById('fadeOutDuration');
    if (foSlider) foSlider.dispatchEvent(new Event('input'));
  }

  // 影
  setRadioValue('shadowEnvironment', s.shadowEnvironment);

  // 天候
  setSelectValue('weatherType', s.weatherType);

  // スカイドーム
  setRangeValue('skyDomeOpacity', s.skyDomeOpacity);
  setRangeValue('skyDomeRange', s.skyDomeRange);
  setRangeValue('skyDomeRadius', s.skyDomeRadius);

  // 床
  setRangeValue('floorImageSize', s.floorImageSize);
  setRangeValue('floorImageOpacity', s.floorImageOpacity);
  setCheckbox('floorImageFlip', s.floorImageFlip);
  setColorValue('floorChromaColor', s.floorChromaColor);
  setRangeValue('floorChromaThreshold', s.floorChromaThreshold);
  setRangeValue('floorCurvature', s.floorCurvature);

  // 左側面
  setRangeValue('leftWallImageSize', s.leftWallImageSize);
  setRangeValue('leftWallImageOpacity', s.leftWallImageOpacity);
  setCheckbox('leftWallImageFlip', s.leftWallImageFlip);
  setColorValue('leftWallChromaColor', s.leftWallChromaColor);
  setRangeValue('leftWallChromaThreshold', s.leftWallChromaThreshold);

  // 右側面
  setRangeValue('rightWallImageSize', s.rightWallImageSize);
  setRangeValue('rightWallImageOpacity', s.rightWallImageOpacity);
  setCheckbox('rightWallImageFlip', s.rightWallImageFlip);
  setColorValue('rightWallChromaColor', s.rightWallChromaColor);
  setRangeValue('rightWallChromaThreshold', s.rightWallChromaThreshold);

  // 奥側
  setRangeValue('backWallImageSize', s.backWallImageSize);
  setRangeValue('backWallImageX', s.backWallImageX);
  setRangeValue('backWallImageOpacity', s.backWallImageOpacity);
  setCheckbox('backWallImageFlip', s.backWallImageFlip);
  setColorValue('backWallChromaColor', s.backWallChromaColor);
  setRangeValue('backWallChromaThreshold', s.backWallChromaThreshold);

  // 自動復元: 明示的に処理されなかった設定値をDOMに反映
  const handled = new Set([
    'cameraTargetX','cameraTargetY','cameraTargetZ',
    'autoCameraEnabled','autoCameraInterval','autoCameraMode','autoCameraMovePercent','autoCameraCrossfade',
    'bounceScale','bounceDuration','popIconScale','rippleEnabled','flashEffectIntensity',
    'beatCameraRotation','beatBackgroundPulse','beatColorShift','beatSpacePulse','beatStrobe',
    'effectCameraShake','effectCameraShakeTrigger','effectCameraZoom','effectCameraZoomTrigger',
    'effectFlash','effectFlashTrigger','effectBlur','effectBlurTrigger',
    'effectCrack','effectCrackTrigger','effectGlitch','effectGlitchTrigger',
    'noteHeight','noteDepth','noteOpacity','trackSpacing','timeScale','pitchScale','noteYOffset',
    'timelineOpacity','timelineColor','timelineX','bgColorTop','bgColorBottom',
    'creditsLine1','creditsLine2','creditsLine3','creditsLine4',
    'creditsSize1','creditsSize2','creditsSize3','creditsSize4','creditsColor','creditsOpacity',
    'gridOpacity','gridSize','gridColor','aspectRatioSelect',
    'midiDelay','audioDelay','loopStartEnabled','loopStartTime','loopEndEnabled','loopEndTime','fadeOutDuration','shadowEnvironment','weatherType',
    'skyDomeOpacity','skyDomeRange','skyDomeRadius',
    'floorImageSize','floorImageOpacity','floorImageFlip','floorChromaColor','floorChromaThreshold','floorCurvature',
    'leftWallImageSize','leftWallImageOpacity','leftWallImageFlip','leftWallChromaColor','leftWallChromaThreshold',
    'rightWallImageSize','rightWallImageOpacity','rightWallImageFlip','rightWallChromaColor','rightWallChromaThreshold',
    'backWallImageSize','backWallImageX','backWallImageOpacity','backWallImageFlip','backWallChromaColor','backWallChromaThreshold',
  ]);
  Object.keys(s).forEach(key => {
    if (handled.has(key) || key.startsWith('cameraRange') || key.startsWith('bloomThreshold') || key === 'pitchFilters') return;
    if (s[key] === undefined) return;
    const el = document.getElementById(key);
    if (!el) return;
    if (el.type === 'checkbox') {
      setCheckbox(key, s[key]);
    } else if (el.type === 'color') {
      setColorValue(key, s[key]);
    } else if (el.tagName === 'SELECT') {
      setSelectValue(key, s[key]);
    } else {
      setRangeValue(key, s[key]);
    }
  });

  // 音域フィルター復元（localStorageに書き込み → state.tracksに反映）
  if (s.pitchFilters && typeof s.pitchFilters === 'object') {
    localStorage.setItem('midiOrchestra_pitchFilters', JSON.stringify(s.pitchFilters));
    if (window.state && window.state.tracks) {
      window.state.tracks.forEach(track => {
        const f = s.pitchFilters[track.name];
        if (f) {
          track.pitchMin = f.pitchMin;
          track.pitchMax = f.pitchMax;
        }
      });
    }
  }
}

// ============================================
// メディア復元
// ============================================

async function restoreMediaSlot(mediaId, loadFn, fileNameSpanId) {
  if (!mediaId) return;
  const record = await getMediaFromLibrary(mediaId);
  if (!record) return;

  const file = new File([record.blob], record.name, { type: record.mimeType });
  await loadFn(file);

  if (fileNameSpanId) {
    const span = document.getElementById(fileNameSpanId);
    if (span) span.textContent = record.name;
    // クリアボタンを表示
    const clearBtnId = fileNameSpanId === 'midiFileName' ? 'midiClearBtn'
                     : fileNameSpanId === 'audioFileName' ? 'audioClearBtn' : null;
    if (clearBtnId) {
      const btn = document.getElementById(clearBtnId);
      if (btn) btn.style.display = '';
    }
  }
}

// ============================================
// プリセット読み込みフロー
// ============================================

async function loadPreset(presetId) {
  const preset = await getPreset(presetId);
  if (!preset) {
    console.error('Preset not found:', presetId);
    return;
  }

  const app = window.appFunctions;
  if (!app) {
    console.error('appFunctions not available');
    return;
  }

  // 再生中なら停止
  if (window.state && window.state.isPlaying) {
    document.getElementById('stopBtn').click();
  }

  // 全素材クリア（画像・動画）
  app.clearSkyDomeImage();
  app.clearInnerSkyImage();
  app.clearFloorImage();
  app.clearLeftWallImage();
  app.clearCenterWallImage();
  app.clearRightWallImage();
  app.clearBackWallImage();

  // MIDI/Audioクリア
  app.clearMidi();
  app.clearAudio();

  // 設定適用
  applySettings(preset.settings);

  // メディア復元
  const media = preset.media || {};

  // currentMediaRefsを復元（Exportで使用）
  if (window.currentMediaRefs) {
    window.currentMediaRefs.midi = media.midi || null;
    window.currentMediaRefs.audio = media.audio || null;
    window.currentMediaRefs.skyDome = media.skyDome || null;
    window.currentMediaRefs.innerSky = media.innerSky || null;
    window.currentMediaRefs.floor = media.floor || null;
    window.currentMediaRefs.leftWall = media.leftWall || null;
    window.currentMediaRefs.centerWall = media.centerWall || null;
    window.currentMediaRefs.rightWall = media.rightWall || null;
    window.currentMediaRefs.backWall = media.backWall || null;
  }

  if (media.midi) {
    await restoreMediaSlot(media.midi, app.loadMidi, 'midiFileName');
  }

  // MIDI読み込み後にループUIを更新（durationが確定した後）
  if (preset.settings.loopStartTime !== undefined && window.state && window.state.duration > 0) {
    window.state.loopStartTime = preset.settings.loopStartTime;
    const loopStartSeek = document.getElementById('loopStartSeek');
    const loopStartTimeEl = document.getElementById('loopStartTime');
    if (loopStartSeek) {
      loopStartSeek.value = (window.state.loopStartTime / window.state.duration) * 1000;
    }
    if (loopStartTimeEl && preset.settings.loopStartEnabled) {
      const m = Math.floor(window.state.loopStartTime / 60);
      const sec = (window.state.loopStartTime % 60).toFixed(1);
      loopStartTimeEl.textContent = `${m}:${sec.padStart(4, '0')}`;
    }
  }
  if (preset.settings.loopEndTime !== undefined && window.state && window.state.duration > 0) {
    window.state.loopEndTime = preset.settings.loopEndTime;
    const loopEndSeek = document.getElementById('loopEndSeek');
    const loopEndTimeEl = document.getElementById('loopEndTime');
    if (loopEndSeek) {
      loopEndSeek.value = (window.state.loopEndTime / window.state.duration) * 1000;
    }
    if (loopEndTimeEl && preset.settings.loopEndEnabled) {
      const m = Math.floor(window.state.loopEndTime / 60);
      const sec = (window.state.loopEndTime % 60).toFixed(1);
      loopEndTimeEl.textContent = `${m}:${sec.padStart(4, '0')}`;
    }
  }

  if (media.audio) {
    await restoreMediaSlot(media.audio, app.loadAudio, 'audioFileName');
  }
  if (media.skyDome) {
    await restoreMediaSlot(media.skyDome, app.loadSkyDomeImage, null);
  }
  if (media.innerSky) {
    await restoreMediaSlot(media.innerSky, app.loadInnerSkyImage, null);
  }
  if (media.floor) {
    await restoreMediaSlot(media.floor, app.loadFloorImage, null);
  }
  if (media.leftWall) {
    await restoreMediaSlot(media.leftWall, app.loadLeftWallImage, null);
  }
  if (media.centerWall) {
    await restoreMediaSlot(media.centerWall, app.loadCenterWallImage, null);
  }
  if (media.rightWall) {
    await restoreMediaSlot(media.rightWall, app.loadRightWallImage, null);
  }
  if (media.backWall) {
    await restoreMediaSlot(media.backWall, app.loadBackWallImage, null);
  }

  console.log('Preset loaded:', preset.name);
}

// ============================================
// UI初期化
// ============================================

async function updatePresetDropdown() {
  const select = document.getElementById('presetSelect');
  const presets = await listPresets();

  // 先頭のオプション以外を削除
  while (select.options.length > 1) {
    select.remove(1);
  }

  presets.forEach(p => {
    const opt = document.createElement('option');
    opt.value = p.id;
    opt.textContent = p.name;
    select.appendChild(opt);
  });
}

async function initPresetSystem() {
  await openDatabase();
  await updatePresetDropdown();

  const saveBtn = document.getElementById('presetSaveBtn');
  const loadBtn = document.getElementById('presetLoadBtn');
  const deleteBtn = document.getElementById('presetDeleteBtn');
  const select = document.getElementById('presetSelect');
  const modal = document.getElementById('presetModal');
  const nameInput = document.getElementById('presetNameInput');
  const overwriteWarning = document.getElementById('presetOverwriteWarning');
  const confirmBtn = document.getElementById('presetSaveConfirm');
  const cancelBtn = document.getElementById('presetSaveCancel');

  // 保存ボタン → モーダルを開く
  saveBtn.addEventListener('click', async () => {
    const selectedOption = select.options[select.selectedIndex];
    if (select.value && selectedOption) {
      nameInput.value = selectedOption.textContent;
      overwriteWarning.style.display = 'block';
    } else {
      nameInput.value = '';
      overwriteWarning.style.display = 'none';
    }
    positionModalNearButton(modal, saveBtn);
    modal.style.display = 'flex';
    nameInput.focus();
    nameInput.select();
  });

  // プリセット名入力時に同名チェック
  nameInput.addEventListener('input', async () => {
    const name = nameInput.value.trim();
    if (!name) {
      overwriteWarning.style.display = 'none';
      return;
    }
    const existing = await findPresetByName(name);
    overwriteWarning.style.display = existing ? 'block' : 'none';
  });

  // 保存確定
  confirmBtn.addEventListener('click', async () => {
    const name = nameInput.value.trim();
    if (!name) return;

    const settings = collectCurrentSettings();
    const mediaRefs = window.currentMediaRefs || {};
    await savePreset(name, settings, mediaRefs);
    await updatePresetDropdown();

    // 保存したプリセットを選択状態にする
    for (let i = 0; i < select.options.length; i++) {
      if (select.options[i].textContent === name) {
        select.selectedIndex = i;
        break;
      }
    }

    modal.style.display = 'none';
    console.log('Preset saved:', name);
  });

  // キャンセル
  cancelBtn.addEventListener('click', () => {
    modal.style.display = 'none';
  });

  // モーダル外クリックで閉じる
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.style.display = 'none';
    }
  });

  // Enterキーで保存
  nameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      confirmBtn.click();
    }
  });

  // 読込ボタン
  loadBtn.addEventListener('click', async () => {
    const id = select.value;
    if (!id) return;
    await loadPreset(id);
  });

  // 削除ボタン
  deleteBtn.addEventListener('click', async () => {
    const id = select.value;
    if (!id) return;

    const selectedOption = select.options[select.selectedIndex];
    const name = selectedOption.textContent;

    if (!confirm(`プリセット「${name}」を削除しますか？`)) return;

    await deletePreset(id);
    await updatePresetDropdown();
    console.log('Preset deleted:', name);
  });
}

// ============================================
// メディアアップロードフック（main.jsから呼ばれる）
// ============================================

async function handleFileUpload(file, slotName) {
  if (!db || !slotName) return;

  let type = 'image';
  if (file.name.match(/\.(mid|midi)$/i)) type = 'midi';
  else if (file.type.startsWith('audio/')) type = 'audio';
  else if (file.type.startsWith('video/')) type = 'video';

  try {
    const mediaId = await saveMediaToLibrary(file, type);
    if (window.currentMediaRefs) {
      window.currentMediaRefs[slotName] = mediaId;
    }
  } catch (e) {
    console.error('Failed to save media to library:', e);
  }
}

// グローバルに公開
window.presetManager = {
  initPresetSystem,
  handleFileUpload,
  saveMediaToLibrary,
  collectCurrentSettings,
  applySettings,
  getMediaFromLibrary,
  getAllMediaByType,
  deleteMediaFromLibrary,
};
