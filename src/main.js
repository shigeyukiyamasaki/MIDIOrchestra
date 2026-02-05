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
  popIcons: [],         // 飛び出すアイコンエフェクト
  triggeredNotes: new Set(), // 波紋を発生させたノートのID
  lastFrameTime: 0,     // 前フレームの時刻
  cameraInitialized: false, // カメラ初期化済みフラグ
};

// Three.js オブジェクト
let scene, camera, renderer, controls;
let timelinePlane;      // 現在位置を示す平面
let gridHelper;         // グリッド
let floorPlane;         // 床画像用平面
let floorTexture;       // 床テクスチャ
let leftWallPlane;      // 左側面画像用平面
let leftWallTexture;    // 左側面テクスチャ
let rightWallPlane;     // 右側面画像用平面
let rightWallTexture;   // 右側面テクスチャ
let backWallPlane;      // 奥側画像用平面
let backWallTexture;    // 奥側テクスチャ
let skyDome;            // スカイドーム（背景球体）
let skyDomeTexture;     // スカイドームテクスチャ
let skyDomeVideo;       // スカイドーム動画要素
let skyDomeIsVideo = false; // スカイドームが動画かどうか
let floorAspect = 1;    // 床画像のアスペクト比（幅/高さ）
let leftWallAspect = 1; // 左側面画像のアスペクト比
let rightWallAspect = 1; // 右側面画像のアスペクト比
let backWallAspect = 1; // 奥側画像のアスペクト比
let floorY = -50;       // 床のY位置（共有用、グリッドと同じ）
let timelineTotalDepth = 300; // タイムライン幕の奥行き（共有用）
let noteEdgeZ = -150;   // ノートのZ軸負方向の端（共有用）
let noteEdgeZPositive = 150; // ノートのZ軸正方向の端（共有用）
let backWallX = 500;    // 奥側画像のX位置（共有用）

// 表示設定
const settings = {
  rippleEnabled: true,
  gridEnabled: true,
  bounceScale: 1,
  bounceDuration: 0.2,
  popIconScale: 3,
};

// カメラプリセット（位置とターゲット）- 前方から後方の順
const CAMERA_PRESETS = [
  // 前方（ノートが飛んでくる方向を見る）
  { pos: { x: 0, y: 200, z: 300 }, target: { x: 0, y: 0, z: 0 }, name: '正面上方' },
  { pos: { x: 0, y: 50, z: 250 }, target: { x: 0, y: 0, z: 0 }, name: '正面低め' },
  { pos: { x: -150, y: 150, z: 200 }, target: { x: 0, y: 0, z: 0 }, name: '左斜め前方' },
  { pos: { x: 150, y: 150, z: 200 }, target: { x: 0, y: 0, z: 0 }, name: '右斜め前方' },
  // 側面・上方
  { pos: { x: -200, y: 50, z: 100 }, target: { x: 0, y: 0, z: 0 }, name: '左側面' },
  { pos: { x: 200, y: 100, z: 100 }, target: { x: 0, y: 0, z: 0 }, name: '右側面' },
  { pos: { x: 0, y: 300, z: 50 }, target: { x: 0, y: 0, z: 0 }, name: '真上' },
  // 後方
  { pos: { x: 150, y: 80, z: -100 }, target: { x: 0, y: 0, z: 0 }, name: '後方右' },
  { pos: { x: -100, y: 120, z: -150 }, target: { x: 0, y: 0, z: 0 }, name: '後方左' },
];

// 自動カメラ切り替え用
let autoCameraEnabled = false;
let autoCameraInterval = 5000; // ミリ秒
let autoCameraMode = 'continuous'; // 'continuous'=連続, 'cut'=カット
let autoCameraMovePercent = 50; // 連続モード: 移動時間の割合（%）
let autoCameraCrossfade = 1500; // カットモード: クロスフェード時間（ミリ秒）
// XYZベースのカメラ範囲
let autoCameraRangeX = { min: -200, max: 200 }; // X軸（左右）の範囲
let autoCameraRangeY = { min: 50, max: 300 }; // Y軸（高さ）の範囲
let autoCameraRangeZ = { min: 100, max: 300 }; // Z軸（前後）の範囲
let autoCameraTimer = null;
let cameraTransition = null; // 遷移中の情報

// アスペクト比設定
let aspectRatioMode = '16:9'; // '16:9', '9:16', 'free'

// カメラシェイク設定
let cameraShakeEnabled = true;
let cameraShakeIntensity = 5; // シェイクの強さ
let cameraShakeDuration = 0.15; // シェイクの持続時間（秒）
let cameraShakeState = {
  active: false,
  startTime: 0,
  originalPos: null,
};

// ブラーエフェクト設定
let blurEffectEnabled = true;
let blurEffectIntensity = 5; // ブラーの強さ（px）
let blurEffectDuration = 0.12; // ブラーの持続時間（秒）
let blurEffectState = {
  active: false,
  startTime: 0,
};

// フラッシュエフェクト設定
let flashEffectEnabled = true;
let flashEffectIntensity = 0.7; // フラッシュの強さ（透明度の増加量）
let flashEffectDuration = 0.1; // フラッシュの持続時間（秒）
let flashEffectState = {
  active: false,
  startTime: 0,
  originalOpacity: 0,
};
let fadeOverlay = null; // フェード用オーバーレイ
let isSliderDragging = false; // カメラ位置スライダー操作中フラグ

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
  trackSpacing: 6,      // トラック間の距離（奥行き）

  // ノートの見た目
  noteHeight: 0.8,      // ノートの高さ（Y方向の厚み）
  noteDepth: 1,         // ノートの奥行き（Z方向）

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
  contrabass: { name: 'Contrabass',  category: 'strings',    color: 0x4a3728, icon: '🎻', position: [88, 65] },
  harp:       { name: 'Harp',        category: 'strings',    color: 0xdaa520, icon: '🪕', position: [10, 50] },

  // 木管楽器（緑系）- 中央後方左
  flute:       { name: 'Flute',        category: 'woodwind',   color: 0x7cb342, icon: '🪈', position: [25, 35] },
  oboe:        { name: 'Oboe',         category: 'woodwind',   color: 0x558b2f, icon: '🪈', position: [35, 30] },
  englishhorn: { name: 'English Horn', category: 'woodwind',   color: 0x4a6741, icon: '🪈', position: [40, 35] },
  clarinet:     { name: 'Clarinet',      category: 'woodwind',   color: 0x33691e, icon: '🎷', position: [25, 50] },
  bassclarinet: { name: 'Bass Clarinet',category: 'woodwind',   color: 0x2e5016, icon: '🎷', position: [30, 55] },
  bassoon:      { name: 'Bassoon',      category: 'woodwind',   color: 0x827717, icon: '🎷', position: [35, 45] },
  piccolo:     { name: 'Piccolo',      category: 'woodwind',   color: 0x9ccc65, icon: '🪈', position: [20, 25] },

  // 金管楽器（金系）- 中央後方右
  horn:       { name: 'Horn',        category: 'brass',      color: 0xffc107, icon: '📯', position: [55, 35] },
  trumpet:    { name: 'Trumpet',     category: 'brass',      color: 0xffb300, icon: '🎺', position: [65, 30] },
  trombone:   { name: 'Trombone',    category: 'brass',      color: 0xff8f00, icon: '🎺', position: [75, 35] },
  tuba:       { name: 'Tuba',        category: 'brass',      color: 0xff6f00, icon: '📯', position: [65, 45] },
  flugelhorn: { name: 'Flugelhorn',  category: 'brass',      color: 0xffa000, icon: '🎺', position: [70, 40] },

  // 打楽器（グレー/シルバー系）- 最後方
  timpani:      { name: 'Timpani',       category: 'percussion', color: 0x78909c, icon: '🥁', position: [50, 15] },
  snare:        { name: 'Snare Drum',    category: 'percussion', color: 0x90a4ae, icon: '🥁', position: [55, 20] },
  bassdrum:     { name: 'Bass Drum',     category: 'percussion', color: 0x546e7a, icon: '🥁', position: [60, 20] },
  xylophone:    { name: 'Xylophone',     category: 'percussion', color: 0x8d6e63, icon: '🎵', position: [65, 15] },
  marimba:      { name: 'Marimba',       category: 'percussion', color: 0x6d4c41, icon: '🎵', position: [67, 18] },
  vibraphone:   { name: 'Vibraphone',    category: 'percussion', color: 0x7e57c2, icon: '🎵', position: [69, 15] },
  glocken:      { name: 'Glockenspiel',  category: 'percussion', color: 0xb0bec5, icon: '🔔', position: [70, 15] },
  tubularbells: { name: 'Tubular Bells', category: 'percussion', color: 0x9e9e9e, icon: '🔔', position: [72, 18] },
  triangle:     { name: 'Triangle',      category: 'percussion', color: 0xbdbdbd, icon: '🔔', position: [74, 15] },
  windchimes:   { name: 'Wind Chimes',   category: 'percussion', color: 0xc0c0c0, icon: '🎐', position: [76, 18] },
  tambourine:   { name: 'Tambourine',    category: 'percussion', color: 0xa1887f, icon: '🥁', position: [78, 15] },
  tamtam:       { name: 'Tam-tam',       category: 'percussion', color: 0x455a64, icon: '🔔', position: [75, 20] },
  cymbals:         { name: 'Cymbals',          category: 'percussion', color: 0xb0bec5, icon: '🔔', position: [80, 15] },
  suspendedcymbal: { name: 'Suspended Cymbal', category: 'percussion', color: 0xd4af37, icon: '🔔', position: [81, 17] },
  hihat:           { name: 'Hi-Hat',           category: 'percussion', color: 0xcfd8dc, icon: '🔔', position: [82, 18] },
  percussion:   { name: 'Percussion',    category: 'percussion', color: 0x607d8b, icon: '🥁', position: [85, 20] },
  drums:        { name: 'Drums',         category: 'percussion', color: 0x546e7a, icon: '🥁', position: [88, 30] },

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
  { id: 'flugelhorn', keywords: ['flugelhorn', 'flugel', 'flügelhorn'] },

  // 弦楽器
  { id: 'violin1',    keywords: ['violin 1', 'violin i', 'vln 1', 'vln1', 'vn1', 'vn 1', '1st violin', 'violins 1'] },
  { id: 'violin2',    keywords: ['violin 2', 'violin ii', 'vln 2', 'vln2', 'vn2', 'vn 2', '2nd violin', 'violins 2'] },
  { id: 'viola',      keywords: ['viola', 'vla', 'violas'] },
  { id: 'cello',      keywords: ['cello', 'vc', 'vlc', 'cellos', 'celli'] },
  { id: 'contrabass', keywords: ['contrabass', 'double bass', 'basses', 'contrabasses'] },
  { id: 'harp',       keywords: ['harp', 'harps'] },

  // 木管楽器
  { id: 'piccolo',     keywords: ['piccolo', 'picc'] },
  { id: 'flute',       keywords: ['flute', 'flutes', 'flauto'] },
  { id: 'englishhorn', keywords: ['english horn', 'englishhorn', 'cor anglais', 'corno inglese', 'eng horn', 'e.h.'] },
  { id: 'oboe',        keywords: ['oboe', 'oboes', 'oboi'] },
  { id: 'bassclarinet', keywords: ['bass clarinet', 'bassclarinet', 'bass cl', 'b.cl', 'bcl', 'clarinetto basso'] },
  { id: 'clarinet',     keywords: ['clarinet', 'clarinets', 'clarinetto'] },
  { id: 'bassoon',      keywords: ['bassoon', 'bassoons', 'fagotto'] },

  // 打楽器（具体的なものを先に）
  { id: 'timpani',      keywords: ['timpani', 'timp', 'kettle'] },
  { id: 'snare',        keywords: ['snare', 'snaredrum', 'snare drum', 'sd', 's.d.'] },
  { id: 'bassdrum',     keywords: ['bass drum', 'bassdrum', 'bd', 'b.d.', 'gran cassa'] },
  { id: 'marimba',      keywords: ['marimba'] },
  { id: 'vibraphone',   keywords: ['vibraphone', 'vibes', 'vibrafon'] },
  { id: 'xylophone',    keywords: ['xylophone', 'xylo'] },
  { id: 'glocken',      keywords: ['glockenspiel', 'glock', 'bells'] },
  { id: 'tubularbells', keywords: ['tubular bells', 'tubular', 'chimes', 'orchestral chimes'] },
  { id: 'triangle',     keywords: ['triangle', 'tri'] },
  { id: 'windchimes',   keywords: ['wind chimes', 'windchimes', 'wind chime', 'mark tree'] },
  { id: 'tambourine',   keywords: ['tambourine', 'tamb'] },
  { id: 'tamtam',       keywords: ['tam-tam', 'tamtam', 'tam tam', 'gong', '銅鑼', 'dora'] },
  { id: 'suspendedcymbal', keywords: ['suspended cymbal', 'sus cymbal', 'sus cym', 'susp cymbal', 'ride'] },
  { id: 'cymbals',         keywords: ['cymbal', 'cymbals', 'crash'] },
  { id: 'hihat',        keywords: ['hi-hat', 'hihat', 'hi hat', 'hh'] },
  { id: 'drums',        keywords: ['drums', 'drum', 'drum kit'] },
  { id: 'percussion',   keywords: ['percussion', 'perc'] },

  // 鍵盤楽器
  { id: 'piano',      keywords: ['piano'] },
  { id: 'celesta',    keywords: ['celesta'] },
  { id: 'organ',      keywords: ['organ'] },
];

// オーケストラスコア順のソート用（上から下への順番）
const ORCHESTRAL_ORDER = {
  // 木管楽器
  piccolo: 1,
  flute: 2,
  oboe: 3,
  englishhorn: 4,
  clarinet: 5,
  bassclarinet: 6,
  bassoon: 7,
  // 金管楽器
  horn: 10,
  trumpet: 11,
  flugelhorn: 12,
  trombone: 13,
  tuba: 14,
  // 打楽器
  timpani: 20,
  snare: 21,
  bassdrum: 22,
  xylophone: 23,
  marimba: 24,
  vibraphone: 25,
  glocken: 26,
  tubularbells: 27,
  triangle: 28,
  windchimes: 29,
  tambourine: 30,
  tamtam: 31,
  cymbals: 32,
  suspendedcymbal: 33,
  hihat: 34,
  percussion: 35,
  drums: 36,
  // 鍵盤楽器
  piano: 40,
  celesta: 41,
  organ: 42,
  harp: 43,
  // 弦楽器
  violin1: 50,
  violin2: 51,
  viola: 52,
  cello: 53,
  contrabass: 54,
  // その他
  other: 99,
};

// カスタムアイコン画像のパス（存在する楽器のみ）
// ファイル名は楽器ID.png（例: violin1.png, timpani.png）
const CUSTOM_ICON_PATH = 'assets/icons/';

// 読み込み済みのカスタムアイコンテクスチャをキャッシュ
const customIconCache = new Map();

// カスタムアイコンを読み込み（グリーンバック除去付き）
async function loadCustomIcon(instrumentId) {
  // キャッシュにあればそれを返す
  if (customIconCache.has(instrumentId)) {
    return customIconCache.get(instrumentId);
  }

  const imagePath = `${CUSTOM_ICON_PATH}${instrumentId}.png`;

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      // Canvasでグリーンバック除去
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);

      // ピクセルデータを取得
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      // ターゲットの緑色 #388f48
      const targetR = 0x38; // 56
      const targetG = 0x8f; // 143
      const targetB = 0x48; // 72

      // 緑色の許容範囲（閾値）
      const threshold = 60;

      // 各ピクセルをチェック
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        // ターゲット緑色との距離を計算
        const distance = Math.sqrt(
          Math.pow(r - targetR, 2) +
          Math.pow(g - targetG, 2) +
          Math.pow(b - targetB, 2)
        );

        // 閾値以内なら透明に
        if (distance < threshold) {
          data[i + 3] = 0; // alpha = 0
        }
      }

      // 処理後のデータを書き戻す
      ctx.putImageData(imageData, 0, 0);

      // キャッシュに保存
      customIconCache.set(instrumentId, canvas);
      resolve(canvas);
    };

    img.onerror = () => {
      // 画像が見つからない場合はnullを返す（絵文字フォールバック）
      customIconCache.set(instrumentId, null);
      resolve(null);
    };

    img.src = imagePath;
  });
}

// すべてのカスタムアイコンを事前読み込み
async function preloadCustomIcons() {
  const instrumentIds = Object.keys(INSTRUMENTS);
  const promises = instrumentIds.map(id => loadCustomIcon(id));
  await Promise.all(promises);
  console.log('Custom icons preloaded');
}

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
async function init() {
  setupThreeJS();
  setupEventListeners();
  await preloadCustomIcons(); // カスタムアイコンを事前読み込み
  animate();
  console.log('MIDI Orchestra Visualizer initialized');
}

function setupThreeJS() {
  const container = document.getElementById('canvas-container');
  const { width, height } = calculateCanvasSize(container);

  // シーン
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1a1a2e);

  // カメラ（斜め上から見下ろす視点）
  camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 10000);
  camera.position.set(-150, 150, 200);
  camera.lookAt(0, 0, 0);

  // レンダラー
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(width, height);
  renderer.setPixelRatio(window.devicePixelRatio);
  container.appendChild(renderer.domElement);

  // フェードオーバーレイ（クロスフェード用）
  fadeOverlay = document.createElement('div');
  fadeOverlay.style.cssText = `
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: black;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.1s linear;
    z-index: 10;
  `;
  container.appendChild(fadeOverlay);

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

  // スカイドーム（背景半球）- 前方180度のみ、初期は非表示
  // SphereGeometry(radius, widthSegments, heightSegments, phiStart, phiLength)
  const skyDomeGeometry = new THREE.SphereGeometry(2000, 64, 32, Math.PI / 2, Math.PI);
  const skyDomeMaterial = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    side: THREE.BackSide, // 内側からテクスチャを見る
    transparent: true,
    opacity: 1,
    depthWrite: false, // 他のオブジェクトに影響を与えない
  });
  skyDome = new THREE.Mesh(skyDomeGeometry, skyDomeMaterial);
  skyDome.renderOrder = -1000; // 最初に描画
  skyDome.visible = false;
  scene.add(skyDome);

  // グリッド（床 / 地面）
  gridHelper = new THREE.GridHelper(500, 50, 0x444444, 0x333333);
  gridHelper.position.y = -50; // 地面の位置（初期値、MIDI読み込み時に調整）
  scene.add(gridHelper);

  // 床画像用平面（初期は非表示）
  const floorGeometry = new THREE.PlaneGeometry(300, 300);
  const floorMaterial = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.8,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  floorPlane = new THREE.Mesh(floorGeometry, floorMaterial);
  floorPlane.rotation.x = -Math.PI / 2; // 水平に寝かせる
  floorPlane.position.y = -50; // グリッドと同じ高さ
  floorPlane.visible = false; // 画像がロードされるまで非表示
  scene.add(floorPlane);

  // 左側面画像用平面（初期は非表示）- 幕に垂直な壁
  const leftWallGeometry = new THREE.PlaneGeometry(300, 300);
  const leftWallMaterial = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.8,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  leftWallPlane = new THREE.Mesh(leftWallGeometry, leftWallMaterial);
  // 回転なし = XY平面に平行 = 幕に垂直
  // 床基準でY位置を設定（下端が床に接する）
  const initialWallSize = 300;
  leftWallPlane.position.set(0, floorY + initialWallSize / 2, -150); // 手前側に配置
  leftWallPlane.visible = false;
  scene.add(leftWallPlane);

  // 右側面画像用平面（初期は非表示）- 幕に垂直な壁（奥側）
  const rightWallGeometry = new THREE.PlaneGeometry(300, 300);
  const rightWallMaterial = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.8,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  rightWallPlane = new THREE.Mesh(rightWallGeometry, rightWallMaterial);
  rightWallPlane.position.set(0, floorY + initialWallSize / 2, 150); // 奥側に配置
  rightWallPlane.visible = false;
  scene.add(rightWallPlane);

  // 奥側画像用平面（初期は非表示）- タイムライン幕と平行（YZ平面）
  const backWallGeometry = new THREE.PlaneGeometry(300, 300);
  const backWallMaterial = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.8,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  backWallPlane = new THREE.Mesh(backWallGeometry, backWallMaterial);
  backWallPlane.rotation.y = Math.PI / 2; // 幕と同じ向きに回転
  backWallPlane.position.set(250, floorY + initialWallSize / 2, 0); // グリッドの端に配置
  backWallPlane.visible = false;
  scene.add(backWallPlane);

  // タイムライン平面（現在位置を示す「幕」）
  // PlaneGeometry(奥行き, 高さ) - MIDI読み込み後にサイズ更新
  const timelineGeometry = new THREE.PlaneGeometry(300, 150);
  const timelineMaterial = new THREE.MeshBasicMaterial({
    color: 0xff4444,
    transparent: true,
    opacity: 0.25,
    side: THREE.DoubleSide,
    depthWrite: false,  // 後ろのノートが見えるように
  });
  timelinePlane = new THREE.Mesh(timelineGeometry, timelineMaterial);
  timelinePlane.rotation.y = Math.PI / 2;
  // 初期位置：下端を床に揃える（高さ150の半分=75をfloorYに加算）
  timelinePlane.position.set(0, floorY + 75, 0);
  scene.add(timelinePlane);

  // ウィンドウリサイズ対応
  window.addEventListener('resize', onWindowResize);
}

// アスペクト比に基づいてキャンバスサイズを計算
function calculateCanvasSize(container) {
  const containerWidth = container.clientWidth;
  const containerHeight = container.clientHeight;

  let width, height;
  let targetAspect;

  if (aspectRatioMode === '9:16') {
    targetAspect = 9 / 16;
  } else if (aspectRatioMode === '16:9') {
    targetAspect = 16 / 9;
  } else {
    // フリー: コンテナサイズをそのまま使用
    container.classList.remove('aspect-locked');
    return { width: containerWidth, height: containerHeight };
  }

  const containerAspect = containerWidth / containerHeight;

  if (containerAspect > targetAspect) {
    // コンテナが横長なので、高さに合わせる
    height = containerHeight;
    width = height * targetAspect;
  } else {
    // コンテナが縦長なので、幅に合わせる
    width = containerWidth;
    height = width / targetAspect;
  }

  container.classList.add('aspect-locked');
  return { width, height };
}

function onWindowResize() {
  const container = document.getElementById('canvas-container');
  const { width, height } = calculateCanvasSize(container);

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
    // スペースキーは常に再生/一時停止（テキスト入力以外）
    if (e.code === 'Space') {
      // テキスト入力中のみスキップ
      const isTextInput = e.target.tagName === 'INPUT' &&
        (e.target.type === 'text' || e.target.type === 'search' || e.target.type === 'email' || e.target.type === 'password');
      const isTextArea = e.target.tagName === 'TEXTAREA';

      if (!isTextInput && !isTextArea) {
        e.preventDefault();
        togglePlay();
      }
    }
  });

  // ドラッグ&ドロップでMIDIファイルを読み込み
  const canvasContainer = document.getElementById('canvas-container');

  canvasContainer.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
    canvasContainer.style.outline = '3px dashed #4fc3f7';
  });

  canvasContainer.addEventListener('dragleave', (e) => {
    e.preventDefault();
    e.stopPropagation();
    canvasContainer.style.outline = 'none';
  });

  canvasContainer.addEventListener('drop', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    canvasContainer.style.outline = 'none';

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      // MIDIファイルかチェック
      if (file.name.match(/\.(mid|midi)$/i)) {
        document.getElementById('midiFileName').textContent = file.name;
        await loadMidi(file);
      } else {
        console.warn('MIDIファイル (.mid, .midi) をドロップしてください');
      }
    }
  });

  // MIDIドロップゾーン（上部のMIDI入力エリア）
  const midiDropZone = document.getElementById('midiDropZone');

  midiDropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
    midiDropZone.classList.add('drag-over');
  });

  midiDropZone.addEventListener('dragleave', (e) => {
    e.preventDefault();
    e.stopPropagation();
    midiDropZone.classList.remove('drag-over');
  });

  midiDropZone.addEventListener('drop', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    midiDropZone.classList.remove('drag-over');

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.name.match(/\.(mid|midi)$/i)) {
        document.getElementById('midiFileName').textContent = file.name;
        await loadMidi(file);
      } else {
        console.warn('MIDIファイル (.mid, .midi) をドロップしてください');
      }
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

  // Y軸スケール
  const pitchScaleInput = document.getElementById('pitchScale');
  const pitchScaleValue = document.getElementById('pitchScaleValue');
  pitchScaleInput.addEventListener('input', (e) => {
    const value = parseFloat(e.target.value);
    pitchScaleValue.textContent = value;
    CONFIG.pitchScale = value;
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

  // 背景グラデーション
  const bgColorTopInput = document.getElementById('bgColorTop');
  const bgColorBottomInput = document.getElementById('bgColorBottom');

  function updateBackgroundGradient() {
    const topColor = bgColorTopInput.value;
    const bottomColor = bgColorBottomInput.value;

    // Canvasでグラデーションを描画
    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    const gradient = ctx.createLinearGradient(0, 0, 0, 512);
    gradient.addColorStop(0, topColor);
    gradient.addColorStop(1, bottomColor);

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 2, 512);

    // テクスチャを作成して背景に設定
    const texture = new THREE.CanvasTexture(canvas);
    scene.background = texture;
  }

  bgColorTopInput.addEventListener('input', updateBackgroundGradient);
  bgColorBottomInput.addEventListener('input', updateBackgroundGradient);

  // 初期グラデーションを適用
  updateBackgroundGradient();

  // 背景色上下入替ボタン
  const bgColorSwapBtn = document.getElementById('bgColorSwap');
  bgColorSwapBtn.addEventListener('click', () => {
    const topColor = bgColorTopInput.value;
    const bottomColor = bgColorBottomInput.value;
    bgColorTopInput.value = bottomColor;
    bgColorBottomInput.value = topColor;
    updateBackgroundGradient();
  });

  // 幕の色
  const timelineColorInput = document.getElementById('timelineColor');
  timelineColorInput.addEventListener('input', (e) => {
    const color = e.target.value;
    if (timelinePlane) {
      timelinePlane.material.color = new THREE.Color(color);
    }
  });

  // アスペクト比選択
  const aspectRatioSelect = document.getElementById('aspectRatioSelect');
  aspectRatioSelect.addEventListener('change', (e) => {
    aspectRatioMode = e.target.value;
    onWindowResize(); // 即座に反映
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

  // デュアルレンジスライダーの初期化
  initDualRangeSliders();

  // 全体の高さ（カメラと注視点を同時に上下、角度維持）
  const cameraHeightOffsetInput = document.getElementById('cameraHeightOffset');
  const cameraHeightOffsetValue = document.getElementById('cameraHeightOffsetValue');
  let lastHeightOffset = 0;
  cameraHeightOffsetInput.addEventListener('input', (e) => {
    const value = parseFloat(e.target.value);
    cameraHeightOffsetValue.textContent = value;
    if (camera && controls) {
      const delta = value - lastHeightOffset;
      camera.position.y += delta;
      controls.target.y += delta;
      lastHeightOffset = value;
      controls.update();
    }
  });

  // カメラ注視点の高さ
  const cameraTargetYInput = document.getElementById('cameraTargetY');
  const cameraTargetYValue = document.getElementById('cameraTargetYValue');
  cameraTargetYInput.addEventListener('input', (e) => {
    const value = parseFloat(e.target.value);
    cameraTargetYValue.textContent = value;
    if (controls) {
      controls.target.y = value;
      controls.update();
    }
  });

  // カメラシェイク有効/無効
  const cameraShakeEnabledInput = document.getElementById('cameraShakeEnabled');
  cameraShakeEnabledInput.addEventListener('change', (e) => {
    cameraShakeEnabled = e.target.checked;
  });

  // カメラシェイク強度
  const cameraShakeIntensityInput = document.getElementById('cameraShakeIntensity');
  const cameraShakeIntensityValue = document.getElementById('cameraShakeIntensityValue');
  cameraShakeIntensityInput.addEventListener('input', (e) => {
    const value = parseFloat(e.target.value);
    cameraShakeIntensityValue.textContent = value;
    cameraShakeIntensity = value;
  });

  // ブラーエフェクト有効/無効
  const blurEffectEnabledInput = document.getElementById('blurEffectEnabled');
  blurEffectEnabledInput.addEventListener('change', (e) => {
    blurEffectEnabled = e.target.checked;
  });

  // ブラーエフェクト強度
  const blurEffectIntensityInput = document.getElementById('blurEffectIntensity');
  const blurEffectIntensityValue = document.getElementById('blurEffectIntensityValue');
  blurEffectIntensityInput.addEventListener('input', (e) => {
    const value = parseFloat(e.target.value);
    blurEffectIntensityValue.textContent = value;
    blurEffectIntensity = value;
  });

  // フラッシュエフェクト有効/無効
  const flashEffectEnabledInput = document.getElementById('flashEffectEnabled');
  flashEffectEnabledInput.addEventListener('change', (e) => {
    flashEffectEnabled = e.target.checked;
  });

  // フラッシュエフェクト強度
  const flashEffectIntensityInput = document.getElementById('flashEffectIntensity');
  const flashEffectIntensityValue = document.getElementById('flashEffectIntensityValue');
  flashEffectIntensityInput.addEventListener('input', (e) => {
    const value = parseFloat(e.target.value);
    flashEffectIntensityValue.textContent = value;
    flashEffectIntensity = value;
  });

  // 自動カメラ切り替え
  const autoCameraEnabledInput = document.getElementById('autoCameraEnabled');
  autoCameraEnabledInput.addEventListener('change', (e) => {
    autoCameraEnabled = e.target.checked;
    if (autoCameraEnabled) {
      startAutoCamera();
    } else {
      stopAutoCamera();
    }
  });

  // 自動カメラ切り替え間隔
  const autoCameraIntervalInput = document.getElementById('autoCameraInterval');
  const autoCameraIntervalValue = document.getElementById('autoCameraIntervalValue');
  autoCameraIntervalInput.addEventListener('input', (e) => {
    const value = parseFloat(e.target.value);
    autoCameraIntervalValue.textContent = value;
    autoCameraInterval = value * 1000; // 秒からミリ秒に変換
    // タイマーが動いている場合は再起動
    if (autoCameraEnabled) {
      stopAutoCamera();
      startAutoCamera();
    }
  });

  // 自動カメラモード切替
  const autoCameraModeSelect = document.getElementById('autoCameraMode');
  const continuousModeParams = document.getElementById('continuousModeParams');
  const cutModeParams = document.getElementById('cutModeParams');
  autoCameraModeSelect.addEventListener('change', (e) => {
    autoCameraMode = e.target.value;
    // パラメータ表示を切り替え
    if (autoCameraMode === 'continuous') {
      continuousModeParams.style.display = '';
      cutModeParams.style.display = 'none';
    } else {
      continuousModeParams.style.display = 'none';
      cutModeParams.style.display = '';
    }
  });

  // 連続モード: 移動時間(%)
  const autoCameraMovePercentInput = document.getElementById('autoCameraMovePercent');
  const autoCameraMovePercentValue = document.getElementById('autoCameraMovePercentValue');
  autoCameraMovePercentInput.addEventListener('input', (e) => {
    const value = parseInt(e.target.value);
    autoCameraMovePercentValue.textContent = value;
    autoCameraMovePercent = value;
  });

  // カットモード: クロスフェード時間
  const autoCameraCrossfadeInput = document.getElementById('autoCameraCrossfade');
  const autoCameraCrossfadeValue = document.getElementById('autoCameraCrossfadeValue');
  autoCameraCrossfadeInput.addEventListener('input', (e) => {
    const value = parseFloat(e.target.value);
    autoCameraCrossfadeValue.textContent = value;
    autoCameraCrossfade = value * 1000; // 秒→ミリ秒
  });

  // バウンスの大きさ
  const bounceScaleInput = document.getElementById('bounceScale');
  const bounceScaleValue = document.getElementById('bounceScaleValue');
  bounceScaleInput.addEventListener('input', (e) => {
    const value = parseFloat(e.target.value);
    bounceScaleValue.textContent = value;
    settings.bounceScale = value;
  });

  // バウンスの時間
  const bounceDurationInput = document.getElementById('bounceDuration');
  const bounceDurationValue = document.getElementById('bounceDurationValue');
  bounceDurationInput.addEventListener('input', (e) => {
    const value = parseFloat(e.target.value);
    bounceDurationValue.textContent = value;
    settings.bounceDuration = value;
  });

  // 飛び出すアイコンの大きさ
  const popIconScaleInput = document.getElementById('popIconScale');
  const popIconScaleValue = document.getElementById('popIconScaleValue');
  popIconScaleInput.addEventListener('input', (e) => {
    const value = parseFloat(e.target.value);
    popIconScaleValue.textContent = value;
    settings.popIconScale = value;
  });

  // ============================================
  // スカイドーム（背景）のイベントリスナー
  // ============================================

  // 画像ラベルクリックでファイル選択を開く
  const skyDomeImageLabel = document.getElementById('skyDomeImageLabel');
  const skyDomeImageInput = document.getElementById('skyDomeImageInput');
  skyDomeImageLabel.addEventListener('click', () => skyDomeImageInput.click());

  // 画像ファイル選択
  skyDomeImageInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      loadSkyDomeImage(file);
    }
  });

  // スカイドーム透明度
  const skyDomeOpacityInput = document.getElementById('skyDomeOpacity');
  const skyDomeOpacityValue = document.getElementById('skyDomeOpacityValue');
  skyDomeOpacityInput.addEventListener('input', (e) => {
    const value = parseFloat(e.target.value);
    skyDomeOpacityValue.textContent = value;
    if (skyDome) {
      skyDome.material.opacity = value;
    }
  });

  // スカイドーム範囲
  const skyDomeRangeInput = document.getElementById('skyDomeRange');
  const skyDomeRangeValue = document.getElementById('skyDomeRangeValue');
  skyDomeRangeInput.addEventListener('input', (e) => {
    const degrees = parseFloat(e.target.value);
    skyDomeRangeValue.textContent = degrees;
    if (skyDome) {
      // ジオメトリを再作成（センターを奥側に維持）
      skyDome.geometry.dispose();
      const phiLength = (degrees / 180) * Math.PI; // 度からラジアンに変換
      const phiStart = Math.PI - phiLength / 2; // 奥側センターを維持
      const radius = parseFloat(document.getElementById('skyDomeRadius').value);
      skyDome.geometry = new THREE.SphereGeometry(radius, 64, 32, phiStart, phiLength);
    }
  });

  // スカイドーム距離（半径）
  const skyDomeRadiusInput = document.getElementById('skyDomeRadius');
  const skyDomeRadiusValue = document.getElementById('skyDomeRadiusValue');
  skyDomeRadiusInput.addEventListener('input', (e) => {
    const radius = parseFloat(e.target.value);
    skyDomeRadiusValue.textContent = radius;
    if (skyDome) {
      skyDome.geometry.dispose();
      const degrees = parseFloat(document.getElementById('skyDomeRange').value);
      const phiLength = (degrees / 180) * Math.PI;
      const phiStart = Math.PI - phiLength / 2;
      skyDome.geometry = new THREE.SphereGeometry(radius, 64, 32, phiStart, phiLength);
    }
  });

  // スカイドーム画像クリア
  const skyDomeImageClearBtn = document.getElementById('skyDomeImageClear');
  skyDomeImageClearBtn.addEventListener('click', () => {
    clearSkyDomeImage();
  });

  // スカイドーム画像/動画ドラッグ&ドロップ
  const skyDomeDropZone = document.getElementById('skyDomeDropZone');
  setupDropZone(skyDomeDropZone, loadSkyDomeImage, true); // 動画も許可

  // ============================================
  // 床画像のイベントリスナー
  // ============================================

  // 画像ラベルクリックでファイル選択を開く
  const floorImageLabel = document.getElementById('floorImageLabel');
  const floorImageInput = document.getElementById('floorImageInput');
  floorImageLabel.addEventListener('click', () => floorImageInput.click());

  // 画像ファイル選択
  floorImageInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      loadFloorImage(file);
    }
  });

  // 床画像サイズ
  const floorImageSizeInput = document.getElementById('floorImageSize');
  const floorImageSizeValue = document.getElementById('floorImageSizeValue');
  floorImageSizeInput.addEventListener('input', (e) => {
    const value = parseFloat(e.target.value);
    floorImageSizeValue.textContent = value;
    updateFloorImageSize(value);
  });

  // 床画像透明度
  const floorImageOpacityInput = document.getElementById('floorImageOpacity');
  const floorImageOpacityValue = document.getElementById('floorImageOpacityValue');
  floorImageOpacityInput.addEventListener('input', (e) => {
    const value = parseFloat(e.target.value);
    floorImageOpacityValue.textContent = value;
    if (floorPlane) {
      floorPlane.material.opacity = value;
    }
  });

  // 床画像クリア
  const floorImageClearBtn = document.getElementById('floorImageClear');
  floorImageClearBtn.addEventListener('click', () => {
    clearFloorImage();
  });

  // 床画像ドラッグ&ドロップ
  const floorDropZone = document.getElementById('floorDropZone');
  setupDropZone(floorDropZone, loadFloorImage);

  // 床画像左右反転
  const floorImageFlipInput = document.getElementById('floorImageFlip');
  floorImageFlipInput.addEventListener('change', (e) => {
    if (floorPlane) {
      floorPlane.scale.x = e.target.checked ? -1 : 1;
    }
  });

  // ============================================
  // 左側面画像のイベントリスナー
  // ============================================

  // 画像ラベルクリックでファイル選択を開く
  const leftWallImageLabel = document.getElementById('leftWallImageLabel');
  const leftWallImageInput = document.getElementById('leftWallImageInput');
  leftWallImageLabel.addEventListener('click', () => leftWallImageInput.click());

  // 画像ファイル選択
  leftWallImageInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      loadLeftWallImage(file);
    }
  });

  // 左側面画像サイズ
  const leftWallImageSizeInput = document.getElementById('leftWallImageSize');
  const leftWallImageSizeValue = document.getElementById('leftWallImageSizeValue');
  leftWallImageSizeInput.addEventListener('input', (e) => {
    const value = parseFloat(e.target.value);
    leftWallImageSizeValue.textContent = value;
    updateLeftWallImageSize(value);
  });

  // 左側面画像透明度
  const leftWallImageOpacityInput = document.getElementById('leftWallImageOpacity');
  const leftWallImageOpacityValue = document.getElementById('leftWallImageOpacityValue');
  leftWallImageOpacityInput.addEventListener('input', (e) => {
    const value = parseFloat(e.target.value);
    leftWallImageOpacityValue.textContent = value;
    if (leftWallPlane) {
      leftWallPlane.material.opacity = value;
    }
  });

  // 左側面画像クリア
  const leftWallImageClearBtn = document.getElementById('leftWallImageClear');
  leftWallImageClearBtn.addEventListener('click', () => {
    clearLeftWallImage();
  });

  // 左側面画像ドラッグ&ドロップ
  const leftWallDropZone = document.getElementById('leftWallDropZone');
  setupDropZone(leftWallDropZone, loadLeftWallImage);

  // 左側面画像左右反転
  const leftWallImageFlipInput = document.getElementById('leftWallImageFlip');
  leftWallImageFlipInput.addEventListener('change', (e) => {
    if (leftWallPlane) {
      leftWallPlane.scale.x = e.target.checked ? -1 : 1;
    }
  });

  // ============================================
  // 右側面画像のイベントリスナー
  // ============================================

  // 画像ラベルクリックでファイル選択を開く
  const rightWallImageLabel = document.getElementById('rightWallImageLabel');
  const rightWallImageInput = document.getElementById('rightWallImageInput');
  rightWallImageLabel.addEventListener('click', () => rightWallImageInput.click());

  // 画像ファイル選択
  rightWallImageInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      loadRightWallImage(file);
    }
  });

  // 右側面画像サイズ
  const rightWallImageSizeInput = document.getElementById('rightWallImageSize');
  const rightWallImageSizeValue = document.getElementById('rightWallImageSizeValue');
  rightWallImageSizeInput.addEventListener('input', (e) => {
    const value = parseFloat(e.target.value);
    rightWallImageSizeValue.textContent = value;
    updateRightWallImageSize(value);
  });

  // 右側面画像透明度
  const rightWallImageOpacityInput = document.getElementById('rightWallImageOpacity');
  const rightWallImageOpacityValue = document.getElementById('rightWallImageOpacityValue');
  rightWallImageOpacityInput.addEventListener('input', (e) => {
    const value = parseFloat(e.target.value);
    rightWallImageOpacityValue.textContent = value;
    if (rightWallPlane) {
      rightWallPlane.material.opacity = value;
    }
  });

  // 右側面画像クリア
  const rightWallImageClearBtn = document.getElementById('rightWallImageClear');
  rightWallImageClearBtn.addEventListener('click', () => {
    clearRightWallImage();
  });

  // 右側面画像ドラッグ&ドロップ
  const rightWallDropZone = document.getElementById('rightWallDropZone');
  setupDropZone(rightWallDropZone, loadRightWallImage);

  // 右側面画像左右反転
  const rightWallImageFlipInput = document.getElementById('rightWallImageFlip');
  rightWallImageFlipInput.addEventListener('change', (e) => {
    if (rightWallPlane) {
      rightWallPlane.scale.x = e.target.checked ? -1 : 1;
    }
  });

  // ============================================
  // 奥側画像のイベントリスナー
  // ============================================

  // 画像ラベルクリックでファイル選択を開く
  const backWallImageLabel = document.getElementById('backWallImageLabel');
  const backWallImageInput = document.getElementById('backWallImageInput');
  backWallImageLabel.addEventListener('click', () => backWallImageInput.click());

  // 画像ファイル選択
  backWallImageInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      loadBackWallImage(file);
    }
  });

  // 奥側画像サイズ
  const backWallImageSizeInput = document.getElementById('backWallImageSize');
  const backWallImageSizeValue = document.getElementById('backWallImageSizeValue');
  backWallImageSizeInput.addEventListener('input', (e) => {
    const value = parseFloat(e.target.value);
    backWallImageSizeValue.textContent = value;
    updateBackWallImageSize(value);
  });

  // 奥側画像X位置
  const backWallImageXInput = document.getElementById('backWallImageX');
  const backWallImageXValue = document.getElementById('backWallImageXValue');
  backWallImageXInput.addEventListener('input', (e) => {
    const value = parseFloat(e.target.value);
    backWallImageXValue.textContent = value;
    backWallX = value;
    if (backWallPlane) {
      backWallPlane.position.x = value;
    }
  });

  // 奥側画像透明度
  const backWallImageOpacityInput = document.getElementById('backWallImageOpacity');
  const backWallImageOpacityValue = document.getElementById('backWallImageOpacityValue');
  backWallImageOpacityInput.addEventListener('input', (e) => {
    const value = parseFloat(e.target.value);
    backWallImageOpacityValue.textContent = value;
    if (backWallPlane) {
      backWallPlane.material.opacity = value;
    }
  });

  // 奥側画像クリア
  const backWallImageClearBtn = document.getElementById('backWallImageClear');
  backWallImageClearBtn.addEventListener('click', () => {
    clearBackWallImage();
  });

  // 奥側画像ドラッグ&ドロップ
  const backWallDropZone = document.getElementById('backWallDropZone');
  setupDropZone(backWallDropZone, loadBackWallImage);

  // 奥側画像左右反転
  const backWallImageFlipInput = document.getElementById('backWallImageFlip');
  backWallImageFlipInput.addEventListener('change', (e) => {
    if (backWallPlane) {
      backWallPlane.scale.x = e.target.checked ? -1 : 1;
    }
  });
}

// ============================================
// MIDI読み込み
// ============================================
async function loadMidi(file) {
  // カメラの現在状態を保存（ユーザーが調整した位置を維持）
  const savedPosition = camera.position.clone();
  const savedTarget = controls.target.clone();
  const savedZoom = camera.zoom;

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

  // オーケストラスコア順にソート
  state.groupedTracks.sort((a, b) => {
    const orderA = ORCHESTRAL_ORDER[a.instrumentId] || 99;
    const orderB = ORCHESTRAL_ORDER[b.instrumentId] || 99;
    return orderA - orderB;
  });

  console.log(`Grouped into ${state.groupedTracks.length} instruments`);

  // UIを更新
  updateTrackPanel();
  enableControls();

  // 3D空間にノートを配置
  createNoteObjects();

  // カメラの状態を復元（ユーザーが調整した位置を維持）
  camera.position.copy(savedPosition);
  controls.target.copy(savedTarget);
  camera.zoom = savedZoom;
  camera.updateProjectionMatrix();
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

  // 元のMIDIトラック名でグループ化（同名トラックをまとめる）
  const trackNameGroups = new Map();
  state.tracks.forEach(track => {
    if (track.noteCount === 0) return;

    if (!trackNameGroups.has(track.name)) {
      trackNameGroups.set(track.name, {
        name: track.name,
        instrumentId: track.instrumentId,
        trackIndices: [],
        totalNotes: 0,
      });
    }
    const group = trackNameGroups.get(track.name);
    group.trackIndices.push(track.index);
    group.totalNotes += track.noteCount;
  });

  // オーケストラ順にソート
  const sortedGroups = Array.from(trackNameGroups.values()).sort((a, b) => {
    const orderA = ORCHESTRAL_ORDER[a.instrumentId] || 99;
    const orderB = ORCHESTRAL_ORDER[b.instrumentId] || 99;
    return orderA - orderB;
  });

  // 表示
  sortedGroups.forEach((group) => {
    const instrument = INSTRUMENTS[group.instrumentId];

    // カスタムアイコンがあるかチェック
    const customIcon = customIconCache.get(group.instrumentId);
    let iconHtml;
    if (customIcon) {
      // カスタム画像をData URLに変換して使用
      iconHtml = `<img src="${customIcon.toDataURL()}" class="track-icon-img" alt="${instrument.name}">`;
    } else {
      // 絵文字フォールバック
      iconHtml = instrument.icon;
    }

    const item = document.createElement('div');
    item.className = 'track-item';
    item.id = `track-item-${group.name.replace(/[^a-zA-Z0-9]/g, '_')}`;
    item.dataset.trackName = group.name;
    item.dataset.trackIndices = JSON.stringify(group.trackIndices);
    item.innerHTML = `
      <div class="track-icon">${iconHtml}</div>
      <div class="track-color" style="background: #${instrument.color.toString(16).padStart(6, '0')}"></div>
      <div class="track-info">
        <div class="track-name">${group.name}</div>
        <select class="instrument-select" data-track-name="${group.name}">
          ${instrumentOptions}
        </select>
      </div>
      <div class="track-notes">${group.totalNotes}音</div>
    `;

    // 現在の楽器を選択状態にする
    const select = item.querySelector('.instrument-select');
    select.value = group.instrumentId;

    // 楽器変更イベント
    select.addEventListener('change', (e) => {
      const trackName = e.target.dataset.trackName;
      const newInstrumentId = e.target.value;
      updateTrackInstrument(trackName, newInstrumentId);
    });

    trackList.appendChild(item);
  });
}

// トラック名に基づいて楽器を変更
function updateTrackInstrument(trackName, newInstrumentId) {
  const newInstrument = INSTRUMENTS[newInstrumentId];

  // このトラック名を持つ全トラックを更新
  const trackIndices = [];
  state.tracks.forEach(track => {
    if (track.name === trackName) {
      track.instrumentId = newInstrumentId;
      track.instrumentName = newInstrument.name;
      track.color = newInstrument.color;
      trackIndices.push(track.index);
    }
  });

  // groupedTracksを再構築
  rebuildGroupedTracks();

  // ノートの色を更新
  const trackIndexSet = new Set(trackIndices);
  state.noteObjects.forEach(mesh => {
    if (trackIndexSet.has(mesh.userData.trackIndex)) {
      mesh.material.color.setHex(newInstrument.color);
      mesh.userData.originalColor = newInstrument.color;
    }
  });

  // トラックパネルを再生成
  updateTrackPanel();

  // 3Dノートを再構築（Z位置の更新）
  debouncedRebuildNotes();

  console.log(`Track "${trackName}" changed to ${newInstrumentId}`);
}

// groupedTracksを再構築
function rebuildGroupedTracks() {
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

  // オーケストラスコア順にソート
  state.groupedTracks.sort((a, b) => {
    const orderA = ORCHESTRAL_ORDER[a.instrumentId] || 99;
    const orderB = ORCHESTRAL_ORDER[b.instrumentId] || 99;
    return orderA - orderB;
  });
}

function enableControls() {
  document.getElementById('playBtn').disabled = false;
  document.getElementById('stopBtn').disabled = false;
  document.getElementById('resetBtn').disabled = false;
}


// アイコンのポップアニメーションをトリガー
function triggerIconPop(trackIndex) {
  // トラック名でアイテムを探す
  const trackInfo = state.tracks[trackIndex];
  if (!trackInfo) return;

  document.querySelectorAll('.track-item').forEach(item => {
    if (item.dataset.trackName === trackInfo.name) {
      const icon = item.querySelector('.track-icon');
      if (icon) {
        // アニメーションをリセットして再トリガー
        icon.classList.remove('pop');
        void icon.offsetWidth; // リフロー強制
        icon.classList.add('pop');
      }
    }
  });
}

// トラックリストのハイライト更新
function updateOrchestraHighlights() {
  const currentTime = state.currentTime;

  // 各トラックが現在鳴っているかチェック
  const playingTrackNames = new Set();

  state.noteObjects.forEach(mesh => {
    const { trackIndex, startTime, endTime } = mesh.userData;
    if (currentTime >= startTime && currentTime <= endTime) {
      const trackInfo = state.tracks[trackIndex];
      if (trackInfo) {
        playingTrackNames.add(trackInfo.name);
      }
    }
  });

  // 各トラックアイテムの状態を更新
  document.querySelectorAll('.track-item').forEach(item => {
    const trackName = item.dataset.trackName;
    const isPlaying = playingTrackNames.has(trackName);

    if (isPlaying) {
      item.classList.add('playing');
    } else {
      item.classList.remove('playing');
      const icon = item.querySelector('.track-icon');
      if (icon) icon.classList.remove('pop');
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

  // トラック名でユニークなZ位置を計算（オーケストラ順）
  const uniqueTrackNames = [];
  const trackNameToZIndex = new Map();

  // まずユニークなトラック名を収集してソート
  midi.tracks.forEach((track, trackIndex) => {
    if (track.notes.length === 0) return;
    if (!trackNameToZIndex.has(track.name)) {
      const trackInfo = state.tracks[trackIndex];
      uniqueTrackNames.push({
        name: track.name,
        instrumentId: trackInfo.instrumentId
      });
    }
  });

  // オーケストラ順にソート
  uniqueTrackNames.sort((a, b) => {
    const orderA = ORCHESTRAL_ORDER[a.instrumentId] || 99;
    const orderB = ORCHESTRAL_ORDER[b.instrumentId] || 99;
    return orderA - orderB;
  });

  // Z位置マッピングを作成
  uniqueTrackNames.forEach((item, idx) => {
    trackNameToZIndex.set(item.name, idx);
  });

  const totalUniqueNames = uniqueTrackNames.length;

  // トラックごとにノートを生成
  midi.tracks.forEach((track, trackIndex) => {
    if (track.notes.length === 0) return; // ノートがないトラックはスキップ

    const trackInfo = state.tracks[trackIndex];
    const color = trackInfo.color;
    // トラック名に基づいてZ位置を決定
    const zIdx = trackNameToZIndex.get(track.name) || 0;
    const zPosition = (zIdx - totalUniqueNames / 2) * CONFIG.trackSpacing;

    track.notes.forEach(note => {
      // ノートの位置とサイズ
      const x = note.time * CONFIG.timeScale;
      const width = note.duration * CONFIG.timeScale;
      // 地面基準で上に展開（最低音が床のすぐ上に来る）
      const floorOffset = 5; // 床からの余白
      const y = (note.midi - minPitch) * CONFIG.pitchScale + floorY + floorOffset;

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

  // タイムライン平面のサイズ（トラック数に応じて調整）
  const totalDepth = totalUniqueNames * CONFIG.trackSpacing + 20;
  const floorOffset = 5; // 床からの余白（ノートと同じ値）
  const noteRangeHeight = (maxPitch - minPitch) * CONFIG.pitchScale;
  const totalHeight = noteRangeHeight + 30;
  timelineTotalDepth = totalDepth; // グローバルに保存

  // 幕のジオメトリを再作成
  timelinePlane.geometry.dispose();
  timelinePlane.geometry = new THREE.PlaneGeometry(totalDepth, totalHeight);
  // 幕のY位置：下端を床に揃える
  timelinePlane.position.y = floorY + totalHeight / 2;

  // グリッドと床の位置は固定（MIDI読み込み時に変更しない）
  // 初期値: gridHelper.position.y = -50, floorPlane.position.y = -49

  // 幕のZ軸の端を保存
  noteEdgeZ = -totalDepth / 2;
  noteEdgeZPositive = totalDepth / 2;

  // 左側面画像の位置を調整（幕に垂直、手前側に配置、床基準、幕に隣接）
  if (leftWallPlane) {
    const currentSize = leftWallPlane.geometry.parameters.height;
    // 画像（平面）を幕の端に直接配置
    leftWallPlane.position.set(0, floorY + currentSize / 2, noteEdgeZ);
  }

  // 右側面画像の位置を調整（幕に垂直、奥側に配置、床基準、幕に隣接）
  if (rightWallPlane) {
    const currentSize = rightWallPlane.geometry.parameters.height;
    // 画像（平面）を幕の奥側端に直接配置
    rightWallPlane.position.set(0, floorY + currentSize / 2, noteEdgeZPositive);
  }

  // 奥側画像の位置を調整（スライダーの値を維持）
  if (backWallPlane) {
    const currentSize = backWallPlane.geometry.parameters.height;
    backWallPlane.position.set(backWallX, floorY + currentSize / 2, 0);
  }

  // カメラ位置はMIDI読み込み時に変更しない（setupThreeJSで設定した位置を維持）

  console.log(`Created ${state.noteObjects.length} note objects`);
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

// 飛び出すアイコンを生成
function createPopIcon(y, z, instrumentId) {
  // スケールが0ならスキップ
  if (settings.popIconScale <= 0) return;

  const instrument = INSTRUMENTS[instrumentId];
  if (!instrument) return;

  // アイコン用のCanvasテクスチャを作成
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 160;
  const ctx = canvas.getContext('2d');

  // 背景を透明にクリア
  ctx.clearRect(0, 0, 128, 160);

  // カスタムアイコンがあれば使用、なければ絵文字
  const customIcon = customIconCache.get(instrumentId);
  if (customIcon) {
    // カスタム画像を描画（中央に配置、サイズ調整）
    const iconSize = 90;
    const offsetX = (128 - iconSize) / 2;
    const offsetY = 5;
    ctx.drawImage(customIcon, offsetX, offsetY, iconSize, iconSize);
  } else {
    // 絵文字フォールバック
    ctx.font = '70px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(instrument.icon, 64, 55);
  }

  // 楽器名
  ctx.font = 'bold 24px sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 4;
  ctx.strokeText(instrument.name, 64, 135);
  ctx.fillText(instrument.name, 64, 135);

  // テクスチャ作成
  const texture = new THREE.CanvasTexture(canvas);
  texture.premultiplyAlpha = true;

  const spriteMaterial = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    opacity: 1,
    alphaTest: 0.1,
    depthWrite: false,
  });

  const sprite = new THREE.Sprite(spriteMaterial);
  sprite.position.set(0, y, z); // タイムライン上からスタート
  const baseScale = 3 * settings.popIconScale;
  sprite.scale.set(baseScale, baseScale, 1);

  sprite.userData = {
    age: 0,
    maxAge: 0.8,       // 0.8秒で消える
    startY: y,
    startZ: z,
    velocityY: 25 * settings.popIconScale,     // 上方向への速度（サイズに比例）
    velocityX: -20 * settings.popIconScale,    // 前方へ（サイズに比例）
    baseScale: baseScale,
  };

  scene.add(sprite);
  state.popIcons.push(sprite);
}

// 飛び出すアイコンを更新
function updatePopIcons(delta) {
  for (let i = state.popIcons.length - 1; i >= 0; i--) {
    const icon = state.popIcons[i];
    icon.userData.age += delta;

    const progress = icon.userData.age / icon.userData.maxAge;

    if (progress >= 1) {
      // アイコンを削除
      scene.remove(icon);
      icon.material.map.dispose();
      icon.material.dispose();
      state.popIcons.splice(i, 1);
    } else {
      // 泡のように上昇（減速しながら）
      const easeOut = 1 - progress; // 徐々に減速
      icon.position.y += icon.userData.velocityY * easeOut * delta;
      icon.position.x += icon.userData.velocityX * delta;

      // ポンっと膨らんで縮む（泡っぽい）
      const base = icon.userData.baseScale;
      let scale;
      if (progress < 0.2) {
        // 最初は急速に膨らむ
        scale = base + (progress / 0.2) * base * 1.67;
      } else {
        // その後ゆっくり縮む
        scale = base * 2.67 - ((progress - 0.2) / 0.8) * base;
      }
      icon.scale.set(scale, scale, 1);

      // 後半からフェードアウト
      if (progress > 0.5) {
        icon.material.opacity = 1 - ((progress - 0.5) / 0.5);
      }
    }
  }
}

function checkNoteRipples() {
  const currentTime = state.currentTime;

  state.noteObjects.forEach((mesh, index) => {
    const { startTime, originalColor, trackIndex } = mesh.userData;
    const noteId = index;

    // ノートがちょうどタイムラインを通過したとき（開始時）
    if (!state.triggeredNotes.has(noteId) && currentTime >= startTime && currentTime < startTime + 0.05) {
      state.triggeredNotes.add(noteId);

      // 波紋エフェクト
      if (settings.rippleEnabled) {
        createRipple(mesh.position.y, mesh.position.z, originalColor);
      }

      // 幕から飛び出すアイコン
      const trackInfo = state.tracks[trackIndex];
      if (trackInfo) {
        createPopIcon(mesh.position.y, mesh.position.z, trackInfo.instrumentId);
      }

      // 上部の楽器アイコンをポップさせる
      triggerIconPop(trackIndex);

      // バスドラム検出でカメラシェイク＆ブラー＆フラッシュ
      if (trackInfo) {
        const instrumentId = trackInfo.instrumentId;
        if (instrumentId === 'bassdrum' || instrumentId === 'drums' || instrumentId === 'timpani') {
          const velocity = mesh.userData.velocity || 0.8; // 0-1の範囲
          if (cameraShakeEnabled) {
            triggerCameraShake(velocity);
          }
          if (blurEffectEnabled) {
            triggerBlurEffect(velocity);
          }
          if (flashEffectEnabled) {
            triggerFlashEffect(velocity);
          }
        }
      }

      // ノートのバウンス開始（高さが0より大きい場合のみ）
      if (settings.bounceScale > 0) {
        mesh.userData.bounceTime = 0;
        mesh.userData.isBouncing = true;
        mesh.userData.baseY = mesh.position.y; // 元のY位置を保存
      }
    }

    // リセット用：ノートが再びタイムライン前に戻ったら
    if (currentTime < startTime) {
      state.triggeredNotes.delete(noteId);
    }
  });
}

// ============================================
// カメラシェイク
// ============================================

function triggerCameraShake(velocity = 1) {
  if (!camera || cameraTransition) return; // 遷移中はシェイクしない

  cameraShakeState.active = true;
  cameraShakeState.startTime = performance.now();
  cameraShakeState.originalPos = camera.position.clone();
  cameraShakeState.velocity = velocity; // ベロシティを保存
}

function updateCameraShake() {
  if (!cameraShakeState.active || !camera) return;

  const elapsed = (performance.now() - cameraShakeState.startTime) / 1000;

  if (elapsed >= cameraShakeDuration) {
    // シェイク終了、元の位置に戻す
    if (cameraShakeState.originalPos) {
      camera.position.copy(cameraShakeState.originalPos);
    }
    cameraShakeState.active = false;
    return;
  }

  // 減衰するランダムシェイク（ベロシティで強さを調整）
  const decay = 1 - (elapsed / cameraShakeDuration);
  const velocityScale = cameraShakeState.velocity || 1;
  const intensity = cameraShakeIntensity * decay * velocityScale;

  const offsetX = (Math.random() - 0.5) * 2 * intensity;
  const offsetY = (Math.random() - 0.5) * 2 * intensity;

  if (cameraShakeState.originalPos) {
    camera.position.x = cameraShakeState.originalPos.x + offsetX;
    camera.position.y = cameraShakeState.originalPos.y + offsetY;
  }
}

// ============================================
// ブラーエフェクト
// ============================================

function triggerBlurEffect(velocity = 1) {
  blurEffectState.active = true;
  blurEffectState.startTime = performance.now();
  blurEffectState.velocity = velocity; // ベロシティを保存
}

function updateBlurEffect() {
  if (!renderer) return;

  const canvas = renderer.domElement;

  if (!blurEffectState.active) {
    canvas.style.filter = '';
    return;
  }

  const elapsed = (performance.now() - blurEffectState.startTime) / 1000;

  if (elapsed >= blurEffectDuration) {
    // ブラー終了
    canvas.style.filter = '';
    blurEffectState.active = false;
    return;
  }

  // 減衰するブラー（ベロシティで強さを調整）
  const decay = 1 - (elapsed / blurEffectDuration);
  const velocityScale = blurEffectState.velocity || 1;
  const blurPx = blurEffectIntensity * decay * velocityScale;
  canvas.style.filter = `blur(${blurPx}px)`;
}

// ============================================
// フラッシュエフェクト
// ============================================

function triggerFlashEffect(velocity = 1) {
  if (!timelinePlane) return;

  // 設定された幕の透明度を取得（スライダーの値）
  const opacitySlider = document.getElementById('timelineOpacity');
  const baseOpacity = opacitySlider ? parseFloat(opacitySlider.value) : 0.25;

  flashEffectState.active = true;
  flashEffectState.startTime = performance.now();
  flashEffectState.velocity = velocity;
  flashEffectState.originalOpacity = baseOpacity;
}

function updateFlashEffect() {
  if (!flashEffectState.active || !timelinePlane) return;

  const elapsed = (performance.now() - flashEffectState.startTime) / 1000;

  if (elapsed >= flashEffectDuration) {
    // フラッシュ終了、元の透明度に戻す
    timelinePlane.material.opacity = flashEffectState.originalOpacity;
    flashEffectState.active = false;
    return;
  }

  // 減衰するフラッシュ（ベロシティで強さを調整）
  const decay = 1 - (elapsed / flashEffectDuration);
  const velocityScale = flashEffectState.velocity || 1;
  const flashAmount = flashEffectIntensity * decay * velocityScale;

  // 透明度を一時的に上げる（最大1.0まで）
  const newOpacity = Math.min(1.0, flashEffectState.originalOpacity + flashAmount);
  timelinePlane.material.opacity = newOpacity;
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
// ドラッグ&ドロップ共通関数
// ============================================

function setupDropZone(dropZone, loadCallback, allowVideo = false) {
  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.add('drag-over');
  });

  dropZone.addEventListener('dragleave', (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.remove('drag-over');
  });

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.remove('drag-over');

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      const isImage = file.type.startsWith('image/');
      const isVideo = file.type.startsWith('video/');

      if (isImage || (allowVideo && isVideo)) {
        loadCallback(file);
      } else {
        console.warn(allowVideo ? '画像または動画ファイルをドロップしてください' : '画像ファイルをドロップしてください');
      }
    }
  });
}

// ============================================
// スカイドーム（背景）関連関数
// ============================================

// スカイドームにファイルを読み込み（画像または動画）
function loadSkyDomeImage(file) {
  // 既存のテクスチャ・動画を破棄
  clearSkyDomeMedia();

  const isVideo = file.type.startsWith('video/');

  if (isVideo) {
    // 動画ファイルの場合
    loadSkyDomeVideo(file);
  } else {
    // 画像ファイルの場合
    loadSkyDomeImageFile(file);
  }
}

// スカイドーム画像を読み込み
function loadSkyDomeImageFile(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      // 新しいテクスチャを作成
      skyDomeTexture = new THREE.Texture(img);
      skyDomeTexture.needsUpdate = true;

      // マテリアルにテクスチャを適用
      skyDome.material.map = skyDomeTexture;
      skyDome.material.needsUpdate = true;
      skyDome.visible = true;
      skyDomeIsVideo = false;

      // 背景色を黒に（スカイドームの隙間対策）
      scene.background = new THREE.Color(0x000000);

      // ドロップゾーンにプレビューを表示
      const imagePreview = document.getElementById('skyDomeImagePreview');
      const videoPreview = document.getElementById('skyDomeVideoPreview');
      const text = document.getElementById('skyDomeDropZoneText');
      imagePreview.src = e.target.result;
      imagePreview.style.display = 'block';
      videoPreview.style.display = 'none';
      text.style.display = 'none';

      console.log('Sky dome image loaded:', file.name);
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

// スカイドーム動画を読み込み
function loadSkyDomeVideo(file) {
  const url = URL.createObjectURL(file);

  // video要素を作成
  skyDomeVideo = document.createElement('video');
  skyDomeVideo.src = url;
  skyDomeVideo.loop = true;
  skyDomeVideo.muted = true;
  skyDomeVideo.playsInline = true;

  skyDomeVideo.onloadeddata = () => {
    // VideoTextureを作成
    skyDomeTexture = new THREE.VideoTexture(skyDomeVideo);
    skyDomeTexture.minFilter = THREE.LinearFilter;
    skyDomeTexture.magFilter = THREE.LinearFilter;

    // マテリアルにテクスチャを適用
    skyDome.material.map = skyDomeTexture;
    skyDome.material.needsUpdate = true;
    skyDome.visible = true;
    skyDomeIsVideo = true;

    // 動画を再生
    skyDomeVideo.play();

    // 背景色を黒に
    scene.background = new THREE.Color(0x000000);

    // ドロップゾーンにプレビューを表示
    const imagePreview = document.getElementById('skyDomeImagePreview');
    const videoPreview = document.getElementById('skyDomeVideoPreview');
    const text = document.getElementById('skyDomeDropZoneText');
    videoPreview.src = url;
    videoPreview.play();
    imagePreview.style.display = 'none';
    videoPreview.style.display = 'block';
    text.style.display = 'none';

    console.log('Sky dome video loaded:', file.name);
  };

  skyDomeVideo.load();
}

// スカイドームのメディアを破棄
function clearSkyDomeMedia() {
  if (skyDomeTexture) {
    skyDomeTexture.dispose();
    skyDomeTexture = null;
  }
  if (skyDomeVideo) {
    skyDomeVideo.pause();
    skyDomeVideo.src = '';
    skyDomeVideo = null;
  }
  skyDomeIsVideo = false;
}

// スカイドーム画像をクリア
function clearSkyDomeImage() {
  // メディアを破棄
  clearSkyDomeMedia();

  skyDome.material.map = null;
  skyDome.material.needsUpdate = true;
  skyDome.visible = false;

  // 背景グラデーションを元に戻す
  const topColor = document.getElementById('bgColorTop').value;
  const bottomColor = document.getElementById('bgColorBottom').value;
  const canvas = document.createElement('canvas');
  canvas.width = 2;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createLinearGradient(0, 0, 0, 512);
  gradient.addColorStop(0, topColor);
  gradient.addColorStop(1, bottomColor);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 2, 512);
  scene.background = new THREE.CanvasTexture(canvas);

  // UIをリセット
  document.getElementById('skyDomeImageInput').value = '';

  // プレビューを非表示
  const imagePreview = document.getElementById('skyDomeImagePreview');
  const videoPreview = document.getElementById('skyDomeVideoPreview');
  const text = document.getElementById('skyDomeDropZoneText');
  imagePreview.style.display = 'none';
  imagePreview.src = '';
  videoPreview.style.display = 'none';
  videoPreview.pause();
  videoPreview.src = '';
  text.style.display = 'block';

  console.log('Sky dome cleared');
}

// ============================================
// 床画像関連関数
// ============================================

// 床画像を読み込み
function loadFloorImage(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      // 既存のテクスチャを破棄
      if (floorTexture) {
        floorTexture.dispose();
      }

      // 新しいテクスチャを作成
      floorTexture = new THREE.Texture(img);
      floorTexture.needsUpdate = true;

      // アスペクト比を保存
      floorAspect = img.width / img.height;

      // マテリアルにテクスチャを適用
      floorPlane.material.map = floorTexture;
      floorPlane.material.needsUpdate = true;
      floorPlane.visible = true;

      // 現在のサイズでジオメトリを更新（アスペクト比を適用）
      const currentSize = parseFloat(document.getElementById('floorImageSize').value);
      updateFloorImageSize(currentSize);

      // ドロップゾーンにプレビューを表示
      const preview = document.getElementById('floorImagePreview');
      const text = document.getElementById('floorDropZoneText');
      preview.src = e.target.result;
      preview.style.display = 'block';
      text.style.display = 'none';

      console.log('Floor image loaded:', file.name, 'aspect:', floorAspect);
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

// 床画像サイズを更新
function updateFloorImageSize(size) {
  if (!floorPlane) return;

  // アスペクト比を維持してジオメトリを再作成
  const width = size * floorAspect;
  const height = size;
  floorPlane.geometry.dispose();
  floorPlane.geometry = new THREE.PlaneGeometry(width, height);
}

// 床画像をクリア
function clearFloorImage() {
  if (floorTexture) {
    floorTexture.dispose();
    floorTexture = null;
  }

  floorPlane.material.map = null;
  floorPlane.material.needsUpdate = true;
  floorPlane.visible = false;

  // アスペクト比をリセット
  floorAspect = 1;

  // UIをリセット
  document.getElementById('floorImageInput').value = '';

  // プレビューを非表示
  const preview = document.getElementById('floorImagePreview');
  const text = document.getElementById('floorDropZoneText');
  preview.style.display = 'none';
  preview.src = '';
  text.style.display = 'block';

  console.log('Floor image cleared');
}

// ============================================
// 左側面画像関連関数
// ============================================

// 左側面画像を読み込み
function loadLeftWallImage(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      // 既存のテクスチャを破棄
      if (leftWallTexture) {
        leftWallTexture.dispose();
      }

      // 新しいテクスチャを作成
      leftWallTexture = new THREE.Texture(img);
      leftWallTexture.needsUpdate = true;

      // アスペクト比を保存
      leftWallAspect = img.width / img.height;

      // マテリアルにテクスチャを適用
      leftWallPlane.material.map = leftWallTexture;
      leftWallPlane.material.needsUpdate = true;
      leftWallPlane.visible = true;

      // 現在のサイズでジオメトリを更新（アスペクト比を適用）
      const currentSize = parseFloat(document.getElementById('leftWallImageSize').value);
      updateLeftWallImageSize(currentSize);

      // ドロップゾーンにプレビューを表示
      const preview = document.getElementById('leftWallImagePreview');
      const text = document.getElementById('leftWallDropZoneText');
      preview.src = e.target.result;
      preview.style.display = 'block';
      text.style.display = 'none';

      console.log('Left wall image loaded:', file.name, 'aspect:', leftWallAspect);
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

// 左側面画像サイズを更新（床基準で拡大、幕に隣接）
function updateLeftWallImageSize(size) {
  if (!leftWallPlane) return;

  // アスペクト比を維持してジオメトリを再作成（高さ基準）
  const width = size * leftWallAspect;
  const height = size;
  leftWallPlane.geometry.dispose();
  leftWallPlane.geometry = new THREE.PlaneGeometry(width, height);

  // Y位置を再計算（床基準：下端が床に接する）
  leftWallPlane.position.y = floorY + height / 2;

  // Z位置は幕の端に固定
  leftWallPlane.position.z = noteEdgeZ;
}

// 左側面画像をクリア
function clearLeftWallImage() {
  if (leftWallTexture) {
    leftWallTexture.dispose();
    leftWallTexture = null;
  }

  leftWallPlane.material.map = null;
  leftWallPlane.material.needsUpdate = true;
  leftWallPlane.visible = false;

  // アスペクト比をリセット
  leftWallAspect = 1;

  // UIをリセット
  document.getElementById('leftWallImageInput').value = '';

  // プレビューを非表示
  const preview = document.getElementById('leftWallImagePreview');
  const text = document.getElementById('leftWallDropZoneText');
  preview.style.display = 'none';
  preview.src = '';
  text.style.display = 'block';

  console.log('Left wall image cleared');
}

// ============================================
// 右側面画像関連関数
// ============================================

// 右側面画像を読み込み
function loadRightWallImage(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      // 既存のテクスチャを破棄
      if (rightWallTexture) {
        rightWallTexture.dispose();
      }

      // 新しいテクスチャを作成
      rightWallTexture = new THREE.Texture(img);
      rightWallTexture.needsUpdate = true;

      // アスペクト比を保存
      rightWallAspect = img.width / img.height;

      // マテリアルにテクスチャを適用
      rightWallPlane.material.map = rightWallTexture;
      rightWallPlane.material.needsUpdate = true;
      rightWallPlane.visible = true;

      // 現在のサイズでジオメトリを更新（アスペクト比を適用）
      const currentSize = parseFloat(document.getElementById('rightWallImageSize').value);
      updateRightWallImageSize(currentSize);

      // ドロップゾーンにプレビューを表示
      const preview = document.getElementById('rightWallImagePreview');
      const text = document.getElementById('rightWallDropZoneText');
      preview.src = e.target.result;
      preview.style.display = 'block';
      text.style.display = 'none';

      console.log('Right wall image loaded:', file.name, 'aspect:', rightWallAspect);
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

// 右側面画像サイズを更新（床基準で拡大、幕に隣接）
function updateRightWallImageSize(size) {
  if (!rightWallPlane) return;

  // アスペクト比を維持してジオメトリを再作成（高さ基準）
  const width = size * rightWallAspect;
  const height = size;
  rightWallPlane.geometry.dispose();
  rightWallPlane.geometry = new THREE.PlaneGeometry(width, height);

  // Y位置を再計算（床基準：下端が床に接する）
  rightWallPlane.position.y = floorY + height / 2;

  // Z位置は幕の奥側端に固定
  rightWallPlane.position.z = noteEdgeZPositive;
}

// 右側面画像をクリア
function clearRightWallImage() {
  if (rightWallTexture) {
    rightWallTexture.dispose();
    rightWallTexture = null;
  }

  rightWallPlane.material.map = null;
  rightWallPlane.material.needsUpdate = true;
  rightWallPlane.visible = false;

  // アスペクト比をリセット
  rightWallAspect = 1;

  // UIをリセット
  document.getElementById('rightWallImageInput').value = '';

  // プレビューを非表示
  const preview = document.getElementById('rightWallImagePreview');
  const text = document.getElementById('rightWallDropZoneText');
  preview.style.display = 'none';
  preview.src = '';
  text.style.display = 'block';

  console.log('Right wall image cleared');
}

// ============================================
// 奥側画像関連関数
// ============================================

// 奥側画像を読み込み
function loadBackWallImage(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      // 既存のテクスチャを破棄
      if (backWallTexture) {
        backWallTexture.dispose();
      }

      // 新しいテクスチャを作成
      backWallTexture = new THREE.Texture(img);
      backWallTexture.needsUpdate = true;

      // アスペクト比を保存
      backWallAspect = img.width / img.height;

      // マテリアルにテクスチャを適用
      backWallPlane.material.map = backWallTexture;
      backWallPlane.material.needsUpdate = true;
      backWallPlane.visible = true;

      // 現在のサイズでジオメトリを更新（アスペクト比を適用）
      const currentSize = parseFloat(document.getElementById('backWallImageSize').value);
      updateBackWallImageSize(currentSize);

      // ドロップゾーンにプレビューを表示
      const preview = document.getElementById('backWallImagePreview');
      const text = document.getElementById('backWallDropZoneText');
      preview.src = e.target.result;
      preview.style.display = 'block';
      text.style.display = 'none';

      console.log('Back wall image loaded:', file.name, 'aspect:', backWallAspect);
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

// 奥側画像サイズを更新（床基準で拡大）
function updateBackWallImageSize(size) {
  if (!backWallPlane) return;

  // アスペクト比を維持してジオメトリを再作成（高さ基準）
  const width = size * backWallAspect;
  const height = size;
  backWallPlane.geometry.dispose();
  backWallPlane.geometry = new THREE.PlaneGeometry(width, height);

  // Y位置を再計算（床基準：下端が床に接する）
  backWallPlane.position.y = floorY + height / 2;
}

// 奥側画像をクリア
function clearBackWallImage() {
  if (backWallTexture) {
    backWallTexture.dispose();
    backWallTexture = null;
  }

  backWallPlane.material.map = null;
  backWallPlane.material.needsUpdate = true;
  backWallPlane.visible = false;

  // アスペクト比をリセット
  backWallAspect = 1;

  // UIをリセット
  document.getElementById('backWallImageInput').value = '';

  // プレビューを非表示
  const preview = document.getElementById('backWallImagePreview');
  const text = document.getElementById('backWallDropZoneText');
  preview.style.display = 'none';
  preview.src = '';
  text.style.display = 'block';

  console.log('Back wall image cleared');
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
// 自動カメラ切り替え
// ============================================
function startAutoCamera() {
  if (autoCameraTimer) {
    clearInterval(autoCameraTimer);
  }
  // 最初の切り替えを即座に実行
  switchToNextPreset();
  // タイマーを開始
  autoCameraTimer = setInterval(() => {
    switchToNextPreset();
  }, autoCameraInterval);
}

function stopAutoCamera() {
  if (autoCameraTimer) {
    clearInterval(autoCameraTimer);
    autoCameraTimer = null;
  }
  cameraTransition = null;
}

function generateRandomCameraPosition() {
  // XYZ範囲内でランダムな位置を生成
  const x = autoCameraRangeX.min + Math.random() * (autoCameraRangeX.max - autoCameraRangeX.min);
  const y = autoCameraRangeY.min + Math.random() * (autoCameraRangeY.max - autoCameraRangeY.min);
  const z = autoCameraRangeZ.min + Math.random() * (autoCameraRangeZ.max - autoCameraRangeZ.min);
  return { x, y, z };
}

function switchToNextPreset() {
  // ランダムなカメラ位置を生成
  const newPos = generateRandomCameraPosition();
  const target = { x: 0, y: 0, z: 0 }; // 常に中心を見る

  if (autoCameraMode === 'continuous') {
    // 連続モード: カメラが物理的に移動する
    const moveDuration = autoCameraInterval * (autoCameraMovePercent / 100);
    cameraTransition = {
      mode: 'continuous',
      startPos: camera.position.clone(),
      startTarget: controls.target.clone(),
      endPos: new THREE.Vector3(newPos.x, newPos.y, newPos.z),
      endTarget: new THREE.Vector3(target.x, target.y, target.z),
      startTime: performance.now(),
      duration: moveDuration,
    };
  } else {
    // カットモード: クロスフェード（フェードアウト→切替→フェードイン）
    cameraTransition = {
      mode: 'cut',
      endPos: new THREE.Vector3(newPos.x, newPos.y, newPos.z),
      endTarget: new THREE.Vector3(target.x, target.y, target.z),
      startTime: performance.now(),
      duration: autoCameraCrossfade,
      cameraSwitched: false,
    };
  }
}

function updateCameraTransition() {
  if (!cameraTransition) return;

  const elapsed = performance.now() - cameraTransition.startTime;
  const progress = Math.min(elapsed / cameraTransition.duration, 1);

  if (cameraTransition.mode === 'continuous') {
    // 連続モード: カメラが物理的に移動
    // イージング（ease-in-out）
    const eased = progress < 0.5
      ? 2 * progress * progress
      : 1 - Math.pow(-2 * progress + 2, 2) / 2;

    // 位置を補間
    camera.position.lerpVectors(cameraTransition.startPos, cameraTransition.endPos, eased);
    controls.target.lerpVectors(cameraTransition.startTarget, cameraTransition.endTarget, eased);
    camera.lookAt(controls.target);

    // 遷移完了
    if (progress >= 1) {
      cameraTransition = null;
    }
  } else {
    // カットモード: クロスフェード（ディゾルブ）効果
    // 前半: フェードアウト（0→1）、後半: フェードイン（1→0）
    let overlayOpacity;
    if (progress < 0.5) {
      overlayOpacity = progress * 2;
    } else {
      overlayOpacity = (1 - progress) * 2;
    }

    // オーバーレイの透明度を更新
    if (fadeOverlay) {
      fadeOverlay.style.opacity = overlayOpacity;
    }

    // 50%地点でカメラを瞬時に切り替え
    if (progress >= 0.5 && !cameraTransition.cameraSwitched) {
      camera.position.copy(cameraTransition.endPos);
      controls.target.copy(cameraTransition.endTarget);
      camera.lookAt(controls.target);
      controls.update();
      cameraTransition.cameraSwitched = true;
    }

    // 遷移完了
    if (progress >= 1) {
      if (fadeOverlay) {
        fadeOverlay.style.opacity = 0;
      }
      cameraTransition = null;
    }
  }
}

// ============================================
// アニメーションループ
// ============================================
// カメラ位置スライダーの更新
// デュアルレンジスライダーの初期化
function initDualRangeSliders() {
  const sliders = document.querySelectorAll('.dual-range');

  sliders.forEach(slider => {
    const axis = slider.dataset.axis;
    const min = parseFloat(slider.dataset.min);
    const max = parseFloat(slider.dataset.max);
    const range = max - min;

    const track = slider.querySelector('.range-track');
    const selected = slider.querySelector('.range-selected');
    const minHandle = slider.querySelector('.min-handle');
    const maxHandle = slider.querySelector('.max-handle');
    const currentMarker = slider.querySelector('.current-marker');

    // 初期値を設定
    let rangeMin, rangeMax;
    if (axis === 'X') {
      rangeMin = autoCameraRangeX.min;
      rangeMax = autoCameraRangeX.max;
    } else if (axis === 'Y') {
      rangeMin = autoCameraRangeY.min;
      rangeMax = autoCameraRangeY.max;
    } else {
      rangeMin = autoCameraRangeZ.min;
      rangeMax = autoCameraRangeZ.max;
    }

    // 位置を更新する関数
    function updatePositions() {
      const minPercent = ((rangeMin - min) / range) * 100;
      const maxPercent = ((rangeMax - min) / range) * 100;

      minHandle.style.left = minPercent + '%';
      maxHandle.style.left = maxPercent + '%';
      selected.style.left = minPercent + '%';
      selected.style.width = (maxPercent - minPercent) + '%';

      // 値表示を更新
      document.getElementById(`cameraRange${axis}MinVal`).textContent = Math.round(rangeMin);
      document.getElementById(`cameraRange${axis}MaxVal`).textContent = Math.round(rangeMax);

      // グローバル変数を更新
      if (axis === 'X') {
        autoCameraRangeX.min = rangeMin;
        autoCameraRangeX.max = rangeMax;
      } else if (axis === 'Y') {
        autoCameraRangeY.min = rangeMin;
        autoCameraRangeY.max = rangeMax;
      } else {
        autoCameraRangeZ.min = rangeMin;
        autoCameraRangeZ.max = rangeMax;
      }
    }

    // 初期表示
    updatePositions();

    // ドラッグ処理
    let activeHandle = null;

    function onMouseDown(e, handle, isMin) {
      e.preventDefault();
      activeHandle = { handle, isMin };
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    }

    function onMouseMove(e) {
      if (!activeHandle) return;

      const rect = slider.getBoundingClientRect();
      let percent = (e.clientX - rect.left) / rect.width;
      percent = Math.max(0, Math.min(1, percent));
      const value = min + percent * range;

      if (activeHandle.isMin) {
        rangeMin = Math.min(value, rangeMax - 10);
      } else {
        rangeMax = Math.max(value, rangeMin + 10);
      }

      updatePositions();
    }

    function onMouseUp() {
      activeHandle = null;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    }

    minHandle.addEventListener('mousedown', (e) => onMouseDown(e, minHandle, true));
    maxHandle.addEventListener('mousedown', (e) => onMouseDown(e, maxHandle, false));

    // スライダーにデータを保存
    slider._updateCurrentMarker = function(value) {
      const percent = ((value - min) / range) * 100;
      currentMarker.style.left = Math.max(0, Math.min(100, percent)) + '%';
    };
    slider._axis = axis;
  });
}

// カメラ位置の表示を更新
function updateCameraPositionSliders() {
  if (!camera) return;

  const xValue = document.getElementById('cameraPosXValue');
  const yValue = document.getElementById('cameraPosYValue');
  const zValue = document.getElementById('cameraPosZValue');

  if (xValue) xValue.textContent = Math.round(camera.position.x);
  if (yValue) yValue.textContent = Math.round(camera.position.y);
  if (zValue) zValue.textContent = Math.round(camera.position.z);

  // 現在位置マーカーを更新
  const sliders = document.querySelectorAll('.dual-range');
  sliders.forEach(slider => {
    if (slider._updateCurrentMarker) {
      let value;
      if (slider._axis === 'X') value = camera.position.x;
      else if (slider._axis === 'Y') value = camera.position.y;
      else value = camera.position.z;
      slider._updateCurrentMarker(value);
    }
  });
}

function animate() {
  requestAnimationFrame(animate);

  // 自動カメラ遷移の更新
  updateCameraTransition();

  // カメラシェイクの更新
  updateCameraShake();

  // ブラーエフェクトの更新
  updateBlurEffect();

  // フラッシュエフェクトの更新
  updateFlashEffect();

  // カメラ位置スライダーの更新（スライダー操作中でない場合）
  updateCameraPositionSliders();

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

  // ノートのバウンス
  updateNoteBounce(0.016);

  // オーケストラアイコンのハイライト（2D）
  updateOrchestraHighlights();

  // 波紋エフェクト（常に更新）
  if (state.isPlaying) {
    checkNoteRipples();
  }
  updateRipples(0.016); // 約60fps想定
  updatePopIcons(0.016); // 飛び出すアイコン

  // カメラコントロール更新（遷移中はスキップ）
  if (controls && !cameraTransition) {
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
    } else {
      // それ以外は通常
      mesh.material.emissive = new THREE.Color(0x000000);
      mesh.material.emissiveIntensity = 0;
    }
  });
}

// ノートのバウンスを更新
function updateNoteBounce(delta) {
  state.noteObjects.forEach(mesh => {
    if (mesh.userData.isBouncing) {
      mesh.userData.bounceTime += delta;
      const progress = mesh.userData.bounceTime / settings.bounceDuration;

      if (progress >= 1) {
        // バウンス終了
        mesh.userData.isBouncing = false;
        mesh.position.y = mesh.userData.baseY; // 元の位置に戻す
      } else {
        // 縦方向バウンスアニメーション
        // sin波で上に跳ねて戻る
        const bounce = Math.sin(progress * Math.PI);
        const bounceHeight = bounce * settings.bounceScale * 3; // 高さ調整
        mesh.position.y = mesh.userData.baseY + bounceHeight;
      }
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
