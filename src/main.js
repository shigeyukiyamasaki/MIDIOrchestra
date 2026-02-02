// ============================================
// MIDI Orchestra Visualizer - Main Entry
// ============================================

// グローバル状態
const state = {
  midi: null,           // パースしたMIDIデータ
  isPlaying: false,
  currentTime: 0,       // 秒
  duration: 0,          // 曲の長さ（秒）
  tracks: [],           // トラック情報（個別）
  groupedTracks: [],    // 楽器でグループ化されたトラック
  noteObjects: [],      // Three.jsのノートオブジェクト
  iconSprites: [],      // 3Dアイコンスプライト
  ripples: [],          // 波紋エフェクト
  triggeredNotes: new Set(), // 波紋を発生させたノートのID
  lastFrameTime: 0,     // 前フレームの時刻
};

// Three.js オブジェクト
let scene, camera, renderer, controls;
let timelinePlane;      // 現在位置を示す平面
let gridHelper;         // グリッド

// 表示設定
const settings = {
  rippleEnabled: true,
  gridEnabled: true,
};

// デバウンス用タイマー
let rebuildTimeout = null;

// デバウンス付きでノート再構築
function debouncedRebuildNotes() {
  if (rebuildTimeout) {
    clearTimeout(rebuildTimeout);
  }
  rebuildTimeout = setTimeout(() => {
    rebuildNotes();
    rebuildTimeout = null;
  }, 150); // 150ms後に実行
}

// 設定
const CONFIG = {
  // 空間のスケール
  timeScale: 50,        // 1秒 = 50単位（横軸）
  pitchScale: 1,        // 1半音 = 1単位（縦軸）
  trackSpacing: 3,      // トラック間の距離（奥行き）

  // ノートの見た目
  noteHeight: 0.8,      // ノートの高さ（Y方向の厚み）
  noteDepth: 3,         // ノートの奥行き（Z方向）

  // カメラ
  cameraDistance: 100,
};

// 楽器定義（カテゴリ別）- アイコンと配置位置付き
// position: [x%, y%] - オーケストラ配置エリア内の位置
const INSTRUMENTS = {
  // 弦楽器（茶系）- 前方
  violin1:    { name: 'Violin 1',    category: 'strings',    color: 0xc9784a, icon: '🎻', position: [25, 75] },
  violin2:    { name: 'Violin 2',    category: 'strings',    color: 0xd4956a, icon: '🎻', position: [40, 80] },
  viola:      { name: 'Viola',       category: 'strings',    color: 0x8b5a2b, icon: '🎻', position: [60, 80] },
  cello:      { name: 'Cello',       category: 'strings',    color: 0x6b4423, icon: '🎻', position: [75, 75] },
  contrabass: { name: 'Contrabass',  category: 'strings',    color: 0x4a3728, icon: '🎸', position: [88, 65] },
  harp:       { name: 'Harp',        category: 'strings',    color: 0xdaa520, icon: '🪕', position: [10, 50] },

  // 木管楽器（緑系）- 中央後方左
  flute:      { name: 'Flute',       category: 'woodwind',   color: 0x7cb342, icon: '🪈', position: [25, 35] },
  oboe:       { name: 'Oboe',        category: 'woodwind',   color: 0x558b2f, icon: '🪈', position: [35, 30] },
  clarinet:   { name: 'Clarinet',    category: 'woodwind',   color: 0x33691e, icon: '🎷', position: [25, 50] },
  bassoon:    { name: 'Bassoon',     category: 'woodwind',   color: 0x827717, icon: '🎷', position: [35, 45] },
  piccolo:    { name: 'Piccolo',     category: 'woodwind',   color: 0x9ccc65, icon: '🪈', position: [20, 25] },

  // 金管楽器（金系）- 中央後方右
  horn:       { name: 'Horn',        category: 'brass',      color: 0xffc107, icon: '📯', position: [55, 35] },
  trumpet:    { name: 'Trumpet',     category: 'brass',      color: 0xffb300, icon: '🎺', position: [65, 30] },
  trombone:   { name: 'Trombone',    category: 'brass',      color: 0xff8f00, icon: '🎺', position: [75, 35] },
  tuba:       { name: 'Tuba',        category: 'brass',      color: 0xff6f00, icon: '📯', position: [65, 45] },

  // 打楽器（グレー/シルバー系）- 最後方
  timpani:    { name: 'Timpani',     category: 'percussion', color: 0x78909c, icon: '🥁', position: [50, 15] },
  percussion: { name: 'Percussion',  category: 'percussion', color: 0x607d8b, icon: '🥁', position: [80, 20] },
  drums:      { name: 'Drums',       category: 'percussion', color: 0x546e7a, icon: '🥁', position: [85, 30] },
  cymbals:    { name: 'Cymbals',     category: 'percussion', color: 0xb0bec5, icon: '🔔', position: [90, 15] },

  // 鍵盤楽器（青系）- 左端
  piano:      { name: 'Piano',       category: 'keyboard',   color: 0x1976d2, icon: '🎹', position: [10, 70] },
  celesta:    { name: 'Celesta',     category: 'keyboard',   color: 0x64b5f6, icon: '🎹', position: [15, 60] },
  organ:      { name: 'Organ',       category: 'keyboard',   color: 0x0d47a1, icon: '🎹', position: [5, 60] },

  // その他
  other:      { name: 'Other',       category: 'other',      color: 0x9e9e9e, icon: '🎵', position: [50, 60] },
};

// トラック名から楽器を自動推定するためのキーワード
// 注意: 順番が重要！より具体的なキーワードを先に配置
const INSTRUMENT_KEYWORDS = [
  // 金管楽器（先にチェック - _CBなどの接尾辞に誤認識されないように）
  { id: 'horn',       keywords: ['horn', 'horns', 'french horn', 'cor', 'corno'] },
  { id: 'trumpet',    keywords: ['trumpet', 'trumpets', 'tromba', 'trp'] },
  { id: 'trombone',   keywords: ['trombone', 'trombones', 'trb'] },
  { id: 'tuba',       keywords: ['tuba', 'tubas'] },

  // 弦楽器
  { id: 'violin1',    keywords: ['violin 1', 'violin i', 'vln 1', 'vln1', 'vn1', 'vn 1', '1st violin', 'violins 1'] },
  { id: 'violin2',    keywords: ['violin 2', 'violin ii', 'vln 2', 'vln2', 'vn2', 'vn 2', '2nd violin', 'violins 2'] },
  { id: 'viola',      keywords: ['viola', 'vla', 'violas'] },
  { id: 'cello',      keywords: ['cello', 'vc', 'vlc', 'cellos', 'celli'] },
  { id: 'contrabass', keywords: ['contrabass', 'double bass', 'basses', 'contrabasses'] },
  { id: 'harp',       keywords: ['harp', 'harps'] },

  // 木管楽器
  { id: 'piccolo',    keywords: ['piccolo', 'picc'] },
  { id: 'flute',      keywords: ['flute', 'flutes', 'flauto'] },
  { id: 'oboe',       keywords: ['oboe', 'oboes', 'oboi'] },
  { id: 'clarinet',   keywords: ['clarinet', 'clarinets', 'clarinetto'] },
  { id: 'bassoon',    keywords: ['bassoon', 'bassoons', 'fagotto'] },

  // 打楽器
  { id: 'timpani',    keywords: ['timpani', 'timp', 'kettle'] },
  { id: 'percussion', keywords: ['percussion', 'perc', 'xylophone', 'marimba', 'vibraphone', 'glockenspiel', 'chimes', 'bells', 'triangle', 'snare', 'bass drum', 'tam-tam', 'gong'] },
  { id: 'drums',      keywords: ['drums', 'drum'] },
  { id: 'cymbals',    keywords: ['cymbal', 'cymbals'] },

  // 鍵盤楽器
  { id: 'piano',      keywords: ['piano'] },
  { id: 'celesta',    keywords: ['celesta'] },
  { id: 'organ',      keywords: ['organ'] },
];

// トラック名から楽器を推定
function guessInstrument(trackName) {
  const name = trackName.toLowerCase();

  for (const { id, keywords } of INSTRUMENT_KEYWORDS) {
    for (const keyword of keywords) {
      if (name.includes(keyword)) {
        return id;
      }
    }
  }

  return 'other';
}

// ============================================
// 初期化
// ============================================
function init() {
  setupThreeJS();
  setupEventListeners();
  animate();
  console.log('MIDI Orchestra Visualizer initialized');
}

function setupThreeJS() {
  const container = document.getElementById('canvas-container');
  const width = container.clientWidth;
  const height = container.clientHeight;

  // シーン
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1a1a2e);

  // カメラ（斜め上から見下ろす視点）
  camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 10000);
  camera.position.set(-50, 80, 100);
  camera.lookAt(0, 0, 0);

  // レンダラー
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(width, height);
  renderer.setPixelRatio(window.devicePixelRatio);
  container.appendChild(renderer.domElement);

  // カメラ操作（OrbitControls）
  controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;       // 滑らかな動き
  controls.dampingFactor = 0.05;
  controls.screenSpacePanning = true;
  controls.minDistance = 10;           // 最小ズーム
  controls.maxDistance = 500;          // 最大ズーム
  controls.maxPolarAngle = Math.PI;    // 上下回転の制限

  // 照明
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight.position.set(50, 100, 50);
  scene.add(directionalLight);

  // グリッド（床）
  gridHelper = new THREE.GridHelper(500, 50, 0x444444, 0x333333);
  gridHelper.position.y = -5;
  scene.add(gridHelper);

  // タイムライン平面（現在位置を示す「幕」）
  // PlaneGeometry(奥行き, 高さ) - MIDI読み込み後にサイズ更新
  const timelineGeometry = new THREE.PlaneGeometry(300, 150);
  const timelineMaterial = new THREE.MeshBasicMaterial({
    color: 0xff4444,
    transparent: true,
    opacity: 0.25,
    side: THREE.DoubleSide,
  });
  timelinePlane = new THREE.Mesh(timelineGeometry, timelineMaterial);
  timelinePlane.rotation.y = Math.PI / 2;
  timelinePlane.position.set(0, 30, 0);
  scene.add(timelinePlane);

  // ウィンドウリサイズ対応
  window.addEventListener('resize', onWindowResize);
}

function onWindowResize() {
  const container = document.getElementById('canvas-container');
  const width = container.clientWidth;
  const height = container.clientHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
}

// ============================================
// イベントリスナー
// ============================================
function setupEventListeners() {
  // ファイル選択
  const midiInput = document.getElementById('midiInput');
  const midiFileName = document.getElementById('midiFileName');

  // ファイル名表示部分をクリックでファイル選択
  midiFileName.addEventListener('click', () => midiInput.click());

  midiInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (file) {
      midiFileName.textContent = file.name;
      await loadMidi(file);
    }
  });

  // 再生コントロール
  document.getElementById('playBtn').addEventListener('click', togglePlay);
  document.getElementById('stopBtn').addEventListener('click', stop);
  document.getElementById('resetBtn').addEventListener('click', reset);

  // キーボードショートカット
  document.addEventListener('keydown', (e) => {
    // 入力フォーカス中は無視
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;

    if (e.code === 'Space') {
      e.preventDefault();
      togglePlay();
    }
  });

  // ============================================
  // 表示設定のイベントリスナー
  // ============================================

  // ノートの太さ
  const noteHeightInput = document.getElementById('noteHeight');
  const noteHeightValue = document.getElementById('noteHeightValue');
  noteHeightInput.addEventListener('input', (e) => {
    const value = parseFloat(e.target.value);
    noteHeightValue.textContent = value;
    CONFIG.noteHeight = value;
    debouncedRebuildNotes();
  });

  // ノートの奥行き
  const noteDepthInput = document.getElementById('noteDepth');
  const noteDepthValue = document.getElementById('noteDepthValue');
  noteDepthInput.addEventListener('input', (e) => {
    const value = parseFloat(e.target.value);
    noteDepthValue.textContent = value;
    CONFIG.noteDepth = value;
    debouncedRebuildNotes();
  });

  // ノートの透明度
  const noteOpacityInput = document.getElementById('noteOpacity');
  const noteOpacityValue = document.getElementById('noteOpacityValue');
  noteOpacityInput.addEventListener('input', (e) => {
    const value = parseFloat(e.target.value);
    noteOpacityValue.textContent = value;
    updateNoteOpacity(value);
  });

  // トラック間隔
  const trackSpacingInput = document.getElementById('trackSpacing');
  const trackSpacingValue = document.getElementById('trackSpacingValue');
  trackSpacingInput.addEventListener('input', (e) => {
    const value = parseFloat(e.target.value);
    trackSpacingValue.textContent = value;
    CONFIG.trackSpacing = value;
    debouncedRebuildNotes();
  });

  // 時間スケール
  const timeScaleInput = document.getElementById('timeScale');
  const timeScaleValue = document.getElementById('timeScaleValue');
  timeScaleInput.addEventListener('input', (e) => {
    const value = parseFloat(e.target.value);
    timeScaleValue.textContent = value;
    CONFIG.timeScale = value;
    debouncedRebuildNotes();
  });

  // 幕の透明度
  const timelineOpacityInput = document.getElementById('timelineOpacity');
  const timelineOpacityValue = document.getElementById('timelineOpacityValue');
  timelineOpacityInput.addEventListener('input', (e) => {
    const value = parseFloat(e.target.value);
    timelineOpacityValue.textContent = value;
    if (timelinePlane) {
      timelinePlane.material.opacity = value;
    }
  });

  // 背景色
  const bgColorInput = document.getElementById('bgColor');
  bgColorInput.addEventListener('input', (e) => {
    const color = e.target.value;
    scene.background = new THREE.Color(color);
  });

  // 幕の色
  const timelineColorInput = document.getElementById('timelineColor');
  timelineColorInput.addEventListener('input', (e) => {
    const color = e.target.value;
    if (timelinePlane) {
      timelinePlane.material.color = new THREE.Color(color);
    }
  });

  // 波紋エフェクト
  const rippleEnabledInput = document.getElementById('rippleEnabled');
  rippleEnabledInput.addEventListener('change', (e) => {
    settings.rippleEnabled = e.target.checked;
    if (!settings.rippleEnabled) {
      // 既存の波紋をクリア
      clearRipples();
    }
  });

  // グリッド表示
  const gridEnabledInput = document.getElementById('gridEnabled');
  gridEnabledInput.addEventListener('change', (e) => {
    settings.gridEnabled = e.target.checked;
    if (gridHelper) {
      gridHelper.visible = settings.gridEnabled;
    }
  });
}

// ============================================
// MIDI読み込み
// ============================================
async function loadMidi(file) {
  const arrayBuffer = await file.arrayBuffer();
  const midi = new Midi(arrayBuffer);

  state.midi = midi;
  state.duration = midi.duration;
  state.currentTime = 0;
  state.isPlaying = false;

  console.log('MIDI loaded:', midi.name, 'Tracks:', midi.tracks.length);

  // トラック情報を抽出（楽器を自動推定）
  state.tracks = midi.tracks.map((track, index) => {
    const trackName = track.name || `Track ${index + 1}`;
    const instrumentId = guessInstrument(trackName);
    const instrument = INSTRUMENTS[instrumentId];

    return {
      index,
      name: trackName,
      instrumentId: instrumentId,
      instrumentName: instrument.name,
      channel: track.channel,
      noteCount: track.notes.length,
      color: instrument.color,
    };
  });

  // 楽器IDでグループ化
  const groupMap = new Map();
  state.tracks.forEach(track => {
    if (track.noteCount === 0) return;

    if (!groupMap.has(track.instrumentId)) {
      const instrument = INSTRUMENTS[track.instrumentId];
      groupMap.set(track.instrumentId, {
        instrumentId: track.instrumentId,
        instrumentName: instrument.name,
        color: instrument.color,
        trackIndices: [],
        totalNotes: 0,
      });
    }
    const group = groupMap.get(track.instrumentId);
    group.trackIndices.push(track.index);
    group.totalNotes += track.noteCount;
  });
  state.groupedTracks = Array.from(groupMap.values());

  console.log(`Grouped into ${state.groupedTracks.length} instruments`);

  // UIを更新
  updateTrackPanel();
  enableControls();

  // 3D空間にノートを配置
  createNoteObjects();

  // オーケストラ配置エリアを生成
  createOrchestraArea();
}

// ============================================
// トラックパネルUI
// ============================================
function updateTrackPanel() {
  const trackList = document.getElementById('track-list');
  trackList.innerHTML = '';

  // 楽器選択オプションを生成
  const instrumentOptions = Object.entries(INSTRUMENTS)
    .map(([id, inst]) => `<option value="${id}">${inst.name}</option>`)
    .join('');

  // グループ化された楽器で表示
  state.groupedTracks.forEach((group) => {
    const instrument = INSTRUMENTS[group.instrumentId];

    const item = document.createElement('div');
    item.className = 'track-item';
    item.innerHTML = `
      <div class="track-color" id="color-group-${group.instrumentId}" style="background: #${group.color.toString(16).padStart(6, '0')}"></div>
      <div class="track-info">
        <div class="track-name">${group.instrumentName}</div>
        <select class="instrument-select" data-instrument="${group.instrumentId}">
          ${instrumentOptions}
        </select>
      </div>
      <div class="track-notes">${group.trackIndices.length}tr / ${group.totalNotes}音</div>
    `;

    // 現在の楽器を選択状態にする
    const select = item.querySelector('.instrument-select');
    select.value = group.instrumentId;

    // 楽器変更イベント
    select.addEventListener('change', (e) => {
      const oldInstrumentId = e.target.dataset.instrument;
      const newInstrumentId = e.target.value;
      updateGroupInstrument(oldInstrumentId, newInstrumentId);
    });

    trackList.appendChild(item);
  });
}

// グループの楽器を変更
function updateGroupInstrument(oldInstrumentId, newInstrumentId) {
  const newInstrument = INSTRUMENTS[newInstrumentId];

  // このグループに属する全トラックを更新
  state.tracks.forEach(track => {
    if (track.instrumentId === oldInstrumentId) {
      track.instrumentId = newInstrumentId;
      track.instrumentName = newInstrument.name;
      track.color = newInstrument.color;
    }
  });

  // グループ情報も更新
  const group = state.groupedTracks.find(g => g.instrumentId === oldInstrumentId);
  if (group) {
    group.instrumentId = newInstrumentId;
    group.instrumentName = newInstrument.name;
    group.color = newInstrument.color;
  }

  // 色表示を更新
  const colorEl = document.getElementById(`color-group-${oldInstrumentId}`);
  if (colorEl) {
    colorEl.id = `color-group-${newInstrumentId}`;
    colorEl.style.background = `#${newInstrument.color.toString(16).padStart(6, '0')}`;
  }

  // このグループに属するトラックのノートの色を更新
  const trackIndices = new Set(group ? group.trackIndices : []);
  state.noteObjects.forEach(mesh => {
    if (trackIndices.has(mesh.userData.trackIndex)) {
      mesh.material.color.setHex(newInstrument.color);
      mesh.userData.originalColor = newInstrument.color;
    }
  });

  // オーケストラエリアを再生成
  createOrchestraArea();

  // 3Dアイコンを再生成
  create3DInstrumentIcons();

  console.log(`Group ${oldInstrumentId} changed to ${newInstrumentId}`);
}

function enableControls() {
  document.getElementById('playBtn').disabled = false;
  document.getElementById('stopBtn').disabled = false;
  document.getElementById('resetBtn').disabled = false;
}

// ============================================
// オーケストラ配置エリア
// ============================================
function createOrchestraArea() {
  const stage = document.getElementById('orchestra-stage');
  stage.innerHTML = '';

  // 使用されている楽器を収集（重複排除）
  const usedInstruments = new Map();
  state.tracks.forEach(track => {
    if (track.noteCount > 0 && !usedInstruments.has(track.instrumentId)) {
      usedInstruments.set(track.instrumentId, {
        ...INSTRUMENTS[track.instrumentId],
        id: track.instrumentId,
        trackIndices: [],
      });
    }
    if (track.noteCount > 0) {
      usedInstruments.get(track.instrumentId).trackIndices.push(track.index);
    }
  });

  // 各楽器のアイコンを生成
  usedInstruments.forEach((inst, id) => {
    const iconEl = document.createElement('div');
    iconEl.className = 'instrument-icon';
    iconEl.id = `orchestra-icon-${id}`;
    iconEl.style.left = `${inst.position[0]}%`;
    iconEl.style.top = `${inst.position[1]}%`;
    iconEl.style.transform = 'translate(-50%, -50%)';

    const colorHex = `#${inst.color.toString(16).padStart(6, '0')}`;

    iconEl.innerHTML = `
      <div class="icon" style="border-color: ${colorHex}; color: ${colorHex};">${inst.icon}</div>
      <div class="label">${inst.name}</div>
    `;

    // データ属性にトラックインデックスを保存
    iconEl.dataset.trackIndices = JSON.stringify(inst.trackIndices);

    stage.appendChild(iconEl);
  });

  console.log(`Orchestra area created with ${usedInstruments.size} instruments`);
}

// オーケストラアイコンのハイライト更新
function updateOrchestraHighlights() {
  const currentTime = state.currentTime;

  // 各トラックが現在鳴っているかチェック
  const playingTracks = new Set();

  state.noteObjects.forEach(mesh => {
    const { trackIndex, startTime, endTime } = mesh.userData;
    if (currentTime >= startTime && currentTime <= endTime) {
      playingTracks.add(trackIndex);
    }
  });

  // 各楽器アイコンの状態を更新
  document.querySelectorAll('.instrument-icon').forEach(iconEl => {
    const trackIndices = JSON.parse(iconEl.dataset.trackIndices || '[]');
    const isPlaying = trackIndices.some(idx => playingTracks.has(idx));

    if (isPlaying) {
      iconEl.classList.add('playing');
      iconEl.style.transform = 'translate(-50%, -50%) scale(1.4)';
    } else {
      iconEl.classList.remove('playing');
      iconEl.style.transform = 'translate(-50%, -50%) scale(1)';
    }
  });
}

// ============================================
// 3Dノートオブジェクト生成
// ============================================
function createNoteObjects() {
  // 既存のノートオブジェクトを削除（メモリ解放）
  state.noteObjects.forEach(obj => {
    scene.remove(obj);
    if (obj.geometry) obj.geometry.dispose();
    if (obj.material) obj.material.dispose();
  });
  state.noteObjects = [];

  const midi = state.midi;
  if (!midi) return;

  // 全トラックの音域を計算（中央揃え用）
  let minPitch = 127, maxPitch = 0;
  midi.tracks.forEach(track => {
    track.notes.forEach(note => {
      minPitch = Math.min(minPitch, note.midi);
      maxPitch = Math.max(maxPitch, note.midi);
    });
  });
  const pitchCenter = (minPitch + maxPitch) / 2;

  // ノートがあるトラック数を計算（中央揃え用）
  const tracksWithNotes = midi.tracks.filter(t => t.notes.length > 0).length;
  let noteTrackIndex = 0;

  // トラックごとにノートを生成
  midi.tracks.forEach((track, trackIndex) => {
    if (track.notes.length === 0) return; // ノートがないトラックはスキップ

    const trackInfo = state.tracks[trackIndex];
    const color = trackInfo.color;
    // 中央揃え: トラックを中央を基準に配置
    const zPosition = (noteTrackIndex - tracksWithNotes / 2) * CONFIG.trackSpacing;
    noteTrackIndex++;

    track.notes.forEach(note => {
      // ノートの位置とサイズ
      const x = note.time * CONFIG.timeScale;
      const width = note.duration * CONFIG.timeScale;
      const y = (note.midi - pitchCenter) * CONFIG.pitchScale;

      // Box geometry
      const geometry = new THREE.BoxGeometry(
        Math.max(width, 0.5),  // 最小幅を確保
        CONFIG.noteHeight,
        CONFIG.noteDepth
      );

      // マテリアル
      const material = new THREE.MeshPhongMaterial({
        color: color,
        transparent: true,
        opacity: 0.85,
      });

      const mesh = new THREE.Mesh(geometry, material);
      const originalX = x + width / 2;
      mesh.position.set(originalX, y, zPosition);

      // ノート情報を保持（後でアニメーション用）
      mesh.userData = {
        trackIndex,
        startTime: note.time,
        endTime: note.time + note.duration,
        pitch: note.midi,
        velocity: note.velocity,
        originalColor: color,
        originalX: originalX,  // 元のX座標を保存
      };

      scene.add(mesh);
      state.noteObjects.push(mesh);
    });
  });

  // タイムライン平面のサイズをトラック範囲に合わせて更新
  const totalDepth = tracksWithNotes * CONFIG.trackSpacing + 20; // 余白を追加
  const totalHeight = (maxPitch - minPitch) * CONFIG.pitchScale + 20;

  // 既存のジオメトリを破棄して新しいサイズで作成
  timelinePlane.geometry.dispose();
  timelinePlane.geometry = new THREE.PlaneGeometry(totalDepth, totalHeight);
  timelinePlane.position.y = 0; // 中央に配置

  // カメラ位置を調整（タイムラインX=0、Z=0を中心に見る）
  // 斜め手前上から見下ろすアングル
  camera.position.set(-100, 80, 120);
  camera.lookAt(0, 0, 0);

  console.log(`Created ${state.noteObjects.length} note objects`);

  // 3Dアイコンを作成
  create3DInstrumentIcons();
}

// ============================================
// 3D楽器アイコン（タイムライン幕上）
// ============================================
function create3DInstrumentIcons() {
  // 既存のアイコンを削除
  state.iconSprites.forEach(sprite => scene.remove(sprite));
  state.iconSprites = [];

  const midi = state.midi;
  if (!midi) return;

  // トラックインデックス → Z位置のマップを作成
  const tracksWithNotes = midi.tracks.filter(t => t.notes.length > 0);
  const trackZPositions = new Map();
  let noteTrackIndex = 0;

  midi.tracks.forEach((track, trackIndex) => {
    if (track.notes.length === 0) return;
    const zPosition = (noteTrackIndex - tracksWithNotes.length / 2) * CONFIG.trackSpacing;
    trackZPositions.set(trackIndex, zPosition);
    noteTrackIndex++;
  });

  // 全トラックの音域を計算（Y位置用）
  let minPitch = 127, maxPitch = 0;
  midi.tracks.forEach(track => {
    track.notes.forEach(note => {
      minPitch = Math.min(minPitch, note.midi);
      maxPitch = Math.max(maxPitch, note.midi);
    });
  });
  const pitchCenter = (minPitch + maxPitch) / 2;
  const yPosition = (minPitch - pitchCenter) * CONFIG.pitchScale - 8;

  // グループ化された楽器ごとにアイコンを作成
  state.groupedTracks.forEach((group, groupIndex) => {
    const instrument = INSTRUMENTS[group.instrumentId];

    // このグループのZ位置（含まれるトラックのZ位置の平均）
    const zPositions = group.trackIndices
      .map(idx => trackZPositions.get(idx))
      .filter(z => z !== undefined);
    const avgZPosition = zPositions.length > 0
      ? zPositions.reduce((a, b) => a + b, 0) / zPositions.length
      : groupIndex * CONFIG.trackSpacing;

    // アイコン用のCanvasテクスチャを作成
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    // 背景円
    ctx.beginPath();
    ctx.arc(64, 64, 50, 0, Math.PI * 2);
    ctx.fillStyle = `#${instrument.color.toString(16).padStart(6, '0')}40`;
    ctx.fill();
    ctx.strokeStyle = `#${instrument.color.toString(16).padStart(6, '0')}`;
    ctx.lineWidth = 4;
    ctx.stroke();

    // アイコン（絵文字）
    ctx.font = '48px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(instrument.icon, 64, 64);

    // テクスチャ作成
    const texture = new THREE.CanvasTexture(canvas);
    const spriteMaterial = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
    });

    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.position.set(0, yPosition, avgZPosition); // X=0（タイムライン上）
    sprite.scale.set(8, 8, 1);

    // グループ情報を保持
    sprite.userData = {
      instrumentId: group.instrumentId,
      trackIndices: group.trackIndices,
      baseScale: 8,
    };

    scene.add(sprite);
    state.iconSprites.push(sprite);
  });

  console.log(`Created ${state.iconSprites.length} 3D instrument icons`);
}

// 3Dアイコンのハイライト更新
function update3DIconHighlights() {
  const currentTime = state.currentTime;

  // 各トラックが現在鳴っているかチェック
  const playingTracks = new Set();

  state.noteObjects.forEach(mesh => {
    const { trackIndex, startTime, endTime } = mesh.userData;
    if (currentTime >= startTime && currentTime <= endTime) {
      playingTracks.add(trackIndex);
    }
  });

  // 各アイコンの状態を更新（グループ内のいずれかのトラックが鳴っていれば光る）
  state.iconSprites.forEach(sprite => {
    const { trackIndices, baseScale } = sprite.userData;
    const isPlaying = trackIndices.some(idx => playingTracks.has(idx));

    if (isPlaying) {
      // 拡大＋明るく
      sprite.scale.set(baseScale * 1.5, baseScale * 1.5, 1);
      sprite.material.opacity = 1.0;
    } else {
      // 通常サイズ
      sprite.scale.set(baseScale, baseScale, 1);
      sprite.material.opacity = 0.7;
    }
  });
}

// ============================================
// 波紋エフェクト
// ============================================
function createRipple(y, z, color) {
  // リング状のジオメトリ
  const geometry = new THREE.RingGeometry(0.1, 0.5, 32);
  const material = new THREE.MeshBasicMaterial({
    color: color,
    transparent: true,
    opacity: 0.8,
    side: THREE.DoubleSide,
  });

  const ripple = new THREE.Mesh(geometry, material);
  ripple.position.set(0, y, z); // タイムライン上（X=0）
  ripple.rotation.y = Math.PI / 2; // 幕と平行に

  ripple.userData = {
    age: 0,
    maxAge: 0.8, // 秒
    maxScale: 6,
  };

  scene.add(ripple);
  state.ripples.push(ripple);
}

function updateRipples(delta) {
  // 波紋を更新
  for (let i = state.ripples.length - 1; i >= 0; i--) {
    const ripple = state.ripples[i];
    ripple.userData.age += delta;

    const progress = ripple.userData.age / ripple.userData.maxAge;

    if (progress >= 1) {
      // 波紋を削除
      scene.remove(ripple);
      ripple.geometry.dispose();
      ripple.material.dispose();
      state.ripples.splice(i, 1);
    } else {
      // 拡大しながらフェードアウト
      const scale = 1 + progress * ripple.userData.maxScale;
      ripple.scale.set(scale, scale, 1);
      ripple.material.opacity = 0.8 * (1 - progress);
    }
  }
}

function checkNoteRipples() {
  // 波紋が無効の場合はスキップ
  if (!settings.rippleEnabled) return;

  const currentTime = state.currentTime;

  state.noteObjects.forEach((mesh, index) => {
    const { startTime, originalColor } = mesh.userData;
    const noteId = index;

    // ノートがちょうどタイムラインを通過したとき（開始時）
    if (!state.triggeredNotes.has(noteId) && currentTime >= startTime && currentTime < startTime + 0.05) {
      state.triggeredNotes.add(noteId);
      // Y=ノートの高さ、Z=ノートのトラック位置（固定値）
      createRipple(mesh.position.y, mesh.position.z, originalColor);
    }

    // リセット用：ノートが再びタイムライン前に戻ったら
    if (currentTime < startTime) {
      state.triggeredNotes.delete(noteId);
    }
  });
}

// ============================================
// 設定適用ヘルパー関数
// ============================================

// ノートを再構築（設定変更時）
function rebuildNotes() {
  if (!state.midi) return;
  createNoteObjects();
}

// ノートの透明度を更新
function updateNoteOpacity(opacity) {
  state.noteObjects.forEach(mesh => {
    mesh.material.opacity = opacity;
  });
}

// 波紋をクリア
function clearRipples() {
  state.ripples.forEach(ripple => {
    scene.remove(ripple);
    ripple.geometry.dispose();
    ripple.material.dispose();
  });
  state.ripples = [];
}

// ============================================
// 再生コントロール
// ============================================
function togglePlay() {
  if (state.isPlaying) {
    pause();
  } else {
    play();
  }
}

function play() {
  if (!state.midi) return;
  state.isPlaying = true;
  state.lastFrameTime = performance.now();
  document.getElementById('playBtn').textContent = '⏸ 一時停止';
}

function pause() {
  state.isPlaying = false;
  document.getElementById('playBtn').textContent = '▶ 再生';
}

function stop() {
  state.isPlaying = false;
  state.currentTime = 0;
  state.triggeredNotes.clear();
  document.getElementById('playBtn').textContent = '▶ 再生';
  updateTimeDisplay();
}

function reset() {
  state.currentTime = 0;
  state.triggeredNotes.clear();
  updateTimeDisplay();
}

// ============================================
// アニメーションループ
// ============================================
function animate() {
  requestAnimationFrame(animate);

  // 再生中なら時間を進める
  if (state.isPlaying && state.midi) {
    const now = performance.now();
    const delta = (now - state.lastFrameTime) / 1000;
    state.lastFrameTime = now;

    state.currentTime += delta;

    // 曲の終わりに達したらループまたは停止
    if (state.currentTime >= state.duration) {
      state.currentTime = 0; // ループ
      // stop(); // 停止する場合はこちら
    }

    updateTimeDisplay();
  }

  // タイムライン平面は固定（X=0）
  if (timelinePlane) {
    timelinePlane.position.x = 0;
  }

  // ノートを左に流す
  const timeOffset = state.currentTime * CONFIG.timeScale;
  state.noteObjects.forEach(mesh => {
    mesh.position.x = mesh.userData.originalX - timeOffset;
  });

  // ノートのハイライト（現在再生中のノート）
  updateNoteHighlights();

  // オーケストラアイコンのハイライト（2D）
  updateOrchestraHighlights();

  // 3Dアイコンのハイライト
  update3DIconHighlights();

  // 波紋エフェクト（常に更新）
  if (state.isPlaying) {
    checkNoteRipples();
  }
  updateRipples(0.016); // 約60fps想定

  // カメラコントロール更新
  if (controls) {
    controls.update();
  }

  renderer.render(scene, camera);
}

function updateTimeDisplay() {
  const minutes = Math.floor(state.currentTime / 60);
  const seconds = Math.floor(state.currentTime % 60);
  document.getElementById('currentTime').textContent =
    `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function updateNoteHighlights() {
  const currentTime = state.currentTime;

  state.noteObjects.forEach(mesh => {
    const { startTime, endTime, originalColor } = mesh.userData;
    const isPlaying = currentTime >= startTime && currentTime <= endTime;

    if (isPlaying) {
      // 再生中のノートは明るく＋発光
      mesh.material.emissive = new THREE.Color(0xffffff);
      mesh.material.emissiveIntensity = 0.5;
      mesh.scale.setScalar(1.2); // 少し拡大
    } else {
      // それ以外は通常
      mesh.material.emissive = new THREE.Color(0x000000);
      mesh.material.emissiveIntensity = 0;
      mesh.scale.setScalar(1.0);
    }
  });
}

// ============================================
// 起動
// ============================================
init();

// デバッグ用にグローバルに露出
window.state = state;
window.CONFIG = CONFIG;
