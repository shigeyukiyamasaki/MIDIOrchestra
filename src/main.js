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
  loopEndEnabled: false, // 終点ループ有効
  loopEndTime: 0,       // 終点時刻（秒）
  loopStartEnabled: false, // 始点ループ有効（2周目以降の開始位置）
  loopStartTime: 0,       // 始点時刻（秒）
};

// Three.js オブジェクト
let scene, camera, renderer, controls;
let noteGroup = null;   // ノート・タイムライン・アイコンをまとめるグループ
let noteFlowAngle = 0;  // ノート流れ角度（度）
let timelinePlane;      // 現在位置を示す平面
let gridHelper;         // グリッド
let floorPlane;         // 床画像用平面
let floorTexture;       // 床テクスチャ
let floor2Plane;        // 床2画像用平面
let floor2Texture;      // 床2テクスチャ
let floor3Plane;        // 床3画像用平面
let floor3Texture;      // 床3テクスチャ
let leftWallPlane;      // 左側面画像用平面
let leftWallTexture;    // 左側面テクスチャ
let rightWallPlane;     // 右側面画像用平面
let rightWallTexture;   // 右側面テクスチャ
let centerWallPlane;    // センター画像用平面
let centerWallTexture;  // センターテクスチャ
let backWallPlane;      // 奥側画像用平面
let backWallTexture;    // 奥側テクスチャ
let panel5WallPlane;    // パネル5画像用平面
let panel5WallTexture;  // パネル5テクスチャ
let panel6WallPlane;    // パネル6画像用平面
let panel6WallTexture;  // パネル6テクスチャ
let skyDome;            // スカイドーム（背景球体）
let skyDomeTexture;     // スカイドームテクスチャ
let skyDomeVideo;       // スカイドーム動画要素
let skyDomeIsVideo = false; // スカイドームが動画かどうか
let innerSkyDome;       // 近景スカイドーム
let innerSkyTexture;    // 近景スカイドームテクスチャ
let innerSkyVideo;      // 近景スカイドーム動画要素
let innerSkyIsVideo = false;
let floorAspect = 1;    // 床画像のアスペクト比（幅/高さ）
let floor2Aspect = 1;   // 床2画像のアスペクト比
let floor3Aspect = 1;   // 床3画像のアスペクト比
let leftWallAspect = 1; // 左側面画像のアスペクト比
let rightWallAspect = 1; // 右側面画像のアスペクト比
let centerWallAspect = 1; // センター画像のアスペクト比
let backWallAspect = 1; // 奥側画像のアスペクト比
let panel5WallAspect = 1; // パネル5画像のアスペクト比
let panel6WallAspect = 1; // パネル6画像のアスペクト比
let floorY = -50;
let floorCurvature = 0; // 床の曲率（0=フラット）       // 床のY位置（共有用、グリッドと同じ）
let floorDisplacementData = null; // ハイトマップのImageData
let floorDisplacementScale = 0;   // 起伏スケール
let floorAlphaData = null;        // 床画像のアルファチャンネルImageData
let floorCliffDepth = 0;          // 崖壁の深さ
let floorCliffMesh = null;        // 内部崖壁メッシュ
let floor2Curvature = 0; // 床2の曲率
let floor3Curvature = 0; // 床3の曲率
let floor2DisplacementData = null;
let floor2DisplacementScale = 0;
let floor2AlphaData = null;
let floor2CliffDepth = 0;
let floor2CliffMesh = null;
let floor3DisplacementData = null;
let floor3DisplacementScale = 0;
let floor3AlphaData = null;
let floor3CliffDepth = 0;
let floor3CliffMesh = null;
let timelineTotalDepth = 300; // タイムライン幕の奥行き（共有用）
let noteEdgeZ = -150;   // ノートのZ軸負方向の端（共有用）
let noteEdgeZPositive = 150; // ノートのZ軸正方向の端（共有用）
let backWallX = 0;    // 奥側画像のX位置（共有用）
let audioElement = null; // 音源再生用オーディオ要素
let audioSrcUrl = null;  // 音源のBlob URL（オーバーラップ用）

// スペクトラム
let audioContext = null;
let analyser = null;
let audioSource = null;
let vizConnectedElement = null; // AnalyserNode接続中のaudioElement参照
let vizBarsGroup = null;         // THREE.Group for visualizer bars
let vizFrequencyData = null;     // Uint8Array for frequency data
let vizPrevValues = new Float32Array(64); // smoothing用前フレーム値

// フェードアウト（終点ループ用）
let crossfadeStartTime = -1;
let fadeOutDuration = 0.1; // フェードアウト秒数（0.1〜1.0）
let overlapAudio = null;  // オーバーラップ用の先行再生Audio

// プリセット用メディア参照
window.currentMediaRefs = { midi: null, audio: null, skyDome: null, innerSky: null, floor: null, floor2: null, floor3: null, leftWall: null, rightWall: null, centerWall: null, backWall: null, panel5Wall: null, panel6Wall: null };

// 床・壁面の動画対応
let floorVideo = null, floorIsVideo = false;
let floor2Video = null, floor2IsVideo = false;
let floor3Video = null, floor3IsVideo = false;
let leftWallVideo = null, leftWallIsVideo = false;
let rightWallVideo = null, rightWallIsVideo = false;
let centerWallVideo = null, centerWallIsVideo = false;
let backWallVideo = null, backWallIsVideo = false;
let panel5WallVideo = null, panel5WallIsVideo = false;
let panel6WallVideo = null, panel6WallIsVideo = false;

// ロード済みメディアのblobを取得（Export用フォールバック）
window.getLoadedMediaBlob = async function(slot) {
  const slotMap = {
    skyDome:    { video: () => skyDomeVideo,    plane: () => skyDome,        isVideo: () => typeof skyDomeIsVideo !== 'undefined' && skyDomeIsVideo },
    innerSky:   { video: () => innerSkyVideo,   plane: () => innerSkyDome,   isVideo: () => typeof innerSkyIsVideo !== 'undefined' && innerSkyIsVideo },
    floor:      { video: () => floorVideo,      plane: () => floorPlane,     isVideo: () => floorIsVideo },
    floor2:     { video: () => floor2Video,     plane: () => floor2Plane,    isVideo: () => floor2IsVideo },
    floor3:     { video: () => floor3Video,     plane: () => floor3Plane,    isVideo: () => floor3IsVideo },
    leftWall:   { video: () => leftWallVideo,   plane: () => leftWallPlane,  isVideo: () => leftWallIsVideo },
    centerWall: { video: () => centerWallVideo, plane: () => centerWallPlane,isVideo: () => centerWallIsVideo },
    rightWall:  { video: () => rightWallVideo,  plane: () => rightWallPlane, isVideo: () => rightWallIsVideo },
    backWall:   { video: () => backWallVideo,   plane: () => backWallPlane,  isVideo: () => backWallIsVideo },
    panel5Wall: { video: () => panel5WallVideo, plane: () => panel5WallPlane, isVideo: () => panel5WallIsVideo },
    panel6Wall: { video: () => panel6WallVideo, plane: () => panel6WallPlane, isVideo: () => panel6WallIsVideo },
  };
  // ハイトマップはImageDataから直接blob化
  if (slot === 'heightmap') {
    if (!floorDisplacementData) { console.log('[Fallback] heightmap: no data'); return null; }
    try {
      const canvas = document.createElement('canvas');
      canvas.width = floorDisplacementData.width;
      canvas.height = floorDisplacementData.height;
      canvas.getContext('2d').putImageData(floorDisplacementData, 0, 0);
      const blob = await new Promise(r => canvas.toBlob(r, 'image/png'));
      return { blob, name: 'heightmap.png', mimeType: 'image/png' };
    } catch(e) { console.error('[Fallback] heightmap: canvas failed', e); return null; }
  }
  if (slot === 'heightmap2') {
    if (!floor2DisplacementData) { console.log('[Fallback] heightmap2: no data'); return null; }
    try {
      const canvas = document.createElement('canvas');
      canvas.width = floor2DisplacementData.width;
      canvas.height = floor2DisplacementData.height;
      canvas.getContext('2d').putImageData(floor2DisplacementData, 0, 0);
      const blob = await new Promise(r => canvas.toBlob(r, 'image/png'));
      return { blob, name: 'heightmap2.png', mimeType: 'image/png' };
    } catch(e) { console.error('[Fallback] heightmap2: canvas failed', e); return null; }
  }
  if (slot === 'heightmap3') {
    if (!floor3DisplacementData) { console.log('[Fallback] heightmap3: no data'); return null; }
    try {
      const canvas = document.createElement('canvas');
      canvas.width = floor3DisplacementData.width;
      canvas.height = floor3DisplacementData.height;
      canvas.getContext('2d').putImageData(floor3DisplacementData, 0, 0);
      const blob = await new Promise(r => canvas.toBlob(r, 'image/png'));
      return { blob, name: 'heightmap3.png', mimeType: 'image/png' };
    } catch(e) { console.error('[Fallback] heightmap3: canvas failed', e); return null; }
  }

  const info = slotMap[slot];
  if (!info) { console.log(`[Fallback] ${slot}: not in slotMap`); return null; }
  const plane = info.plane();
  if (!plane) { console.log(`[Fallback] ${slot}: plane is null`); return null; }
  if (!plane.visible) { console.log(`[Fallback] ${slot}: plane not visible`); return null; }
  console.log(`[Fallback] ${slot}: plane exists & visible, isVideo=${info.isVideo()}`);
  if (info.isVideo()) {
    const vid = info.video();
    console.log(`[Fallback] ${slot}: video element exists=${!!vid}, src=${vid?.src?.substring(0, 30)}`);
    if (vid && vid.src && vid.src.startsWith('blob:')) {
      try {
        const resp = await fetch(vid.src);
        const blob = await resp.blob();
        console.log(`[Fallback] ${slot}: video blob fetched, size=${blob.size}`);
        return { blob, name: slot + '.mp4', mimeType: 'video/mp4' };
      } catch(e) { console.error(`[Fallback] ${slot}: fetch failed`, e); return null; }
    }
  } else {
    // 画像: canvasに描画してblob化
    const tex = plane.material?.uniforms?.map?.value;
    if (tex && tex.image) {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = tex.image.width || tex.image.videoWidth || 512;
        canvas.height = tex.image.height || tex.image.videoHeight || 512;
        canvas.getContext('2d').drawImage(tex.image, 0, 0);
        const blob = await new Promise(r => canvas.toBlob(r, 'image/png'));
        return { blob, name: slot + '.png', mimeType: 'image/png' };
      } catch(e) { console.error(`[Fallback] ${slot}: canvas failed`, e); return null; }
    }
  }
  console.log(`[Fallback] ${slot}: no media data found`);
  return null;
};

// クロマキー設定（4面共通）
// 各面ごとのクロマキー設定（個別）

// タイミング同期設定
let syncConfig = { midiDelay: 0, audioDelay: 0 };
let audioDelayTimer = null;
let lastSyncCheck = 0; // 前回のドリフトチェック時刻

// ユーザー設定の背景テクスチャ（エフェクト終了後の復元用）
let userBackgroundTexture = null;

// 表示設定
const settings = {
  rippleEnabled: true,
  gridOpacity: 0.5,
  gridColor: '#444444',
  gridSize: 500,
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

// カメラシェイク設定（後方互換用）
let cameraShakeEnabled = false;
let cameraShakeIntensity = 0;
let cameraShakeDuration = 0.15; // シェイクの持続時間（秒）
let cameraShakeState = {
  active: false,
  startTime: 0,
  offsetX: 0,
  offsetY: 0,
};

// ブラーエフェクト設定（後方互換用）
let blurEffectEnabled = false;
let blurEffectIntensity = 0;
let blurEffectDuration = 0.12; // ブラーの持続時間（秒）
let blurEffectState = {
  active: false,
  startTime: 0,
};

// フラッシュエフェクト設定（後方互換用）
let flashEffectEnabled = false;
let flashEffectIntensity = 0;
let flashEffectDuration = 0.1; // フラッシュの持続時間（秒）
let flashEffectState = {
  active: false,
  startTime: 0,
  originalOpacity: 0,
};

// テンポ・ビート連動エフェクト
let tempoInfo = {
  bpm: 120,
  beatDuration: 0.5, // 1拍の長さ（秒）
  lastBeatTime: 0,
  currentBeat: 0,
  beatsPerBar: 4,
};

// エフェクト設定（統合版）
const effects = {
  // バスドラ専用
  curtainFlash: { intensity: 0 },  // 幕フラッシュ

  // テンポ専用
  cameraRotation: { intensity: 0 },    // カメラ回転
  backgroundPulse: { intensity: 0 },   // 背景パルス
  colorShift: { intensity: 0 },        // カラーシフト
  spacePulse: { intensity: 0 },        // 空間パルス
  strobe: { intensity: 0 },            // ストロボ

  // 選択式（トリガー切替可能）
  cameraShake: { trigger: 'bass', intensity: 0 },   // カメラ揺れ
  cameraZoom: { trigger: 'bass', intensity: 0 },    // カメラズーム
  flash: { trigger: 'bass', intensity: 0 },         // フラッシュ（画面）
  blur: { trigger: 'bass', intensity: 0 },          // ブラー
  crack: { trigger: 'bass', intensity: 0 },         // ひび割れ
  glitch: { trigger: 'bass', intensity: 0 },        // グリッチ
};

// 後方互換用（旧beatEffectsを参照しているコード向け）
const beatEffects = {
  cameraVibration: { enabled: false, intensity: 0 },
  cameraZoom: { enabled: false, intensity: 0 },
  cameraRotation: { enabled: false, intensity: 0 },
  beatFlash: { enabled: false, intensity: 0 },
  backgroundPulse: { enabled: false, intensity: 0 },
  colorShift: { enabled: false, intensity: 0 },
  strobe: { enabled: false, intensity: 0 },
  gridPulse: { enabled: false, intensity: 0 },
  spacePulse: { enabled: false, intensity: 0 },
  beatBlur: { enabled: false, intensity: 0 },
  vignette: { enabled: false, intensity: 0 },
  crack: { enabled: false, intensity: 0 },
  glitch: { enabled: false, intensity: 0 },
};

// ビートエフェクト状態
let beatEffectState = {
  phase: 0, // 0-1のビート位相
  barPhase: 0, // 0-1の小節位相
  originalCameraPos: null,
  originalFOV: 60,
  vignetteOverlay: null,
  chromaticEnabled: false,
};
let fadeOverlay = null; // フェード用オーバーレイ
let composer = null;    // EffectComposer（ブルーム用）
let bloomPass = null;   // UnrealBloomPass
let flareScene = null;  // レンズフレア用オーバーレイシーン
let flareCamera = null; // レンズフレア用正射影カメラ
let flareMeshes = [];   // フレア要素のメッシュ配列
let flareIntensity = 0; // レンズフレア強度
let flareBlur = 0;      // レンズフレアにじみ
let cloudShadowPlane = null;
let cloudShadowIntensity = 0;
let cloudShadowSpeed = 1;
let cloudShadowScale = 2;
let cloudShadowDirection = 45;
let bloomEnabled = true;
let noteBloomEnabled = true; // ノートにブルームを適用するか
let bloomThresholdRange = { min: 0.8, max: 0.8 };
let bloomThresholdTarget = 0.8;
let bloomThresholdCurrent = 0.8;
let flareEnabled = true;
let cloudShadowEnabled = true;
let cloudShadowContrast = 0;
let sunLight = null;    // DirectionalLight（光源位置操作用）
let shadowPlane = null; // 影受け用ShadowMaterialプレーン
let shadowEnabled = false; // 影ON/OFF
let weatherParticles = null; // 天候パーティクルシステム
let rainSplash = null; // 雨スプラッシュパーティクル
let weatherType = 'none'; // none / rain / snow
let weatherAmount = 3000;
let weatherSpeed = 1;
let weatherSpread = 400;
let weatherSplash = 3;  // スプラッシュ量 (0=無効, 1-20)
let weatherAngle = 0;   // 傾き角度(度) 0=真下, 80=ほぼ横
let weatherWindDir = 0;  // 風向(度) 0=+Z方向
let lightningFrequency = 0;  // 0=無効, 1-10 (回/分の目安)
let lightningIntensity = 0.5; // フラッシュ強度 0.1-1.0
let lightningColor = '#ffffff'; // 稲光の色
let lightningAmbientColor = '#ffffff'; // 周囲の色（グロー）
let lightningFlashOpacity = 0.5; // フラッシュ濃度 0.1-1.0
let lightningFlashDecay = 0.3;   // フラッシュ減衰時間(秒) 0.01-2.0
let lightningRandomness = 0.5;   // 間隔のばらつき 0=均等, 1=最大
let lightningBolts = [];      // 現在表示中のボルトオブジェクト配列
let lightningTimer = 0;       // 次の雷までのカウントダウン(ms)
let lightningLastTime = 0;    // 前フレームのタイムスタンプ
let waterSurfacePlane = null;
let waterSurfaceMaterial = null;
let waterTintPlane = null;
let waterTintMaterial = null;
let waterShadowPlane = null;
let waterSurfaceEnabled = false;
let waterSurfaceScale = 40;
let waterSurfaceSpeed = 1;
let waterSurfaceColor = '#1a3a6a';
let waterSurfaceOpacity = 0.6;
let waterSurfaceCaustic = 0.5;
let isSliderDragging = false; // カメラ位置スライダー操作中フラグ

// デバウンス用タイマー
let rebuildRafId = null;

// rAFデバウンスでノート再構築（次フレームで1回だけ実行）
function debouncedRebuildNotes() {
  if (rebuildRafId) return;
  rebuildRafId = requestAnimationFrame(() => {
    rebuildNotes();
    rebuildRafId = null;
  });
}

// 設定
const CONFIG = {
  // 空間のスケール
  timeScale: 50,        // 1秒 = 50単位（横軸）
  pitchScale: 1,        // 1半音 = 1単位（縦軸）
  noteYOffset: 0,       // ノート全体の高さオフセット
  trackSpacing: 6,      // トラック間の距離（奥行き）

  // ノートの見た目
  noteHeight: 0.8,      // ノートの高さ（Y方向の厚み）
  noteDepth: 1,         // ノートの奥行き（Z方向）
  noteOpacity: 0.85,    // ノートの透明度

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
  harp:       { name: 'Harp',        category: 'strings',    color: 0xe91e90, icon: '🪕', position: [10, 50] },
  dulcimer:   { name: 'Dulcimer',    category: 'strings',    color: 0xf06292, icon: '🪕', position: [12, 48] },

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

  // 打楽器（青系）- 最後方
  timpani:      { name: 'Timpani',       category: 'percussion', color: 0x1565c0, icon: '🥁', position: [50, 15] },
  snare:        { name: 'Snare Drum',    category: 'percussion', color: 0x42a5f5, icon: '🥁', position: [55, 20] },
  bassdrum:     { name: 'Bass Drum',     category: 'percussion', color: 0x0d47a1, icon: '🥁', position: [60, 20] },
  xylophone:    { name: 'Xylophone',     category: 'percussion', color: 0xab47bc, icon: '🎵', position: [65, 15] },
  marimba:      { name: 'Marimba',       category: 'percussion', color: 0x8e24aa, icon: '🎵', position: [67, 18] },
  vibraphone:   { name: 'Vibraphone',    category: 'percussion', color: 0xce93d8, icon: '🎵', position: [69, 15] },
  glocken:      { name: 'Glockenspiel',  category: 'percussion', color: 0xba68c8, icon: '🔔', position: [70, 15] },
  tubularbells: { name: 'Tubular Bells', category: 'percussion', color: 0x5c6bc0, icon: '🔔', position: [72, 18] },
  triangle:     { name: 'Triangle',      category: 'percussion', color: 0x90caf9, icon: '🔔', position: [74, 15] },
  windchimes:   { name: 'Wind Chimes',   category: 'percussion', color: 0x81d4fa, icon: '🎐', position: [76, 18] },
  tambourine:   { name: 'Tambourine',    category: 'percussion', color: 0x2979ff, icon: '🥁', position: [78, 15] },
  tamtam:       { name: 'Tam-tam',       category: 'percussion', color: 0x1a237e, icon: '🔔', position: [75, 20] },
  cymbals:         { name: 'Cymbals',          category: 'percussion', color: 0x448aff, icon: '🔔', position: [80, 15] },
  suspendedcymbal: { name: 'Suspended Cymbal', category: 'percussion', color: 0x536dfe, icon: '🔔', position: [81, 17] },
  hihat:           { name: 'Hi-Hat',           category: 'percussion', color: 0xbbdefb, icon: '🔔', position: [82, 18] },
  percussion:   { name: 'Percussion',    category: 'percussion', color: 0x1e88e5, icon: '🥁', position: [85, 20] },
  drums:        { name: 'Drums',         category: 'percussion', color: 0x1565c0, icon: '🥁', position: [88, 30] },

  // 鍵盤楽器（青系）- 左端
  piano:      { name: 'Piano',       category: 'keyboard',   color: 0x1976d2, icon: '🎹', position: [10, 70] },
  celesta:    { name: 'Celesta',     category: 'percussion', color: 0x9c27b0, icon: '🎵', position: [71, 17] },
  organ:      { name: 'Organ',       category: 'keyboard',   color: 0x0d47a1, icon: '🎹', position: [5, 60] },

  // その他
  other:      { name: 'Other',       category: 'other',      color: 0x9e9e9e, icon: '🎵', position: [50, 60] },
};

// トラック名から楽器を自動推定するためのキーワード
// 注意: 順番が重要！より具体的なキーワードを先に配置
const INSTRUMENT_KEYWORDS = [
  // 木管楽器（english hornをhornより先にチェック）
  { id: 'englishhorn', keywords: ['english horn', 'englishhorn', 'cor anglais', 'corno inglese', 'eng horn', 'e.h.'] },
  { id: 'piccolo',     keywords: ['piccolo', 'picc'] },
  { id: 'flute',       keywords: ['flute', 'flutes', 'flauto'] },
  { id: 'oboe',        keywords: ['oboe', 'oboes', 'oboi'] },
  { id: 'bassclarinet', keywords: ['bass clarinet', 'bassclarinet', 'bass cl', 'b.cl', 'bcl', 'clarinetto basso'] },
  { id: 'clarinet',     keywords: ['clarinet', 'clarinets', 'clarinetto'] },
  { id: 'bassoon',      keywords: ['bassoon', 'bassoons', 'fagotto'] },

  // 金管楽器
  { id: 'horn',       keywords: ['horn', 'horns', 'french horn', 'cor', 'corno'] },
  { id: 'trumpet',    keywords: ['trumpet', 'trumpets', 'tromba', 'trp'] },
  { id: 'trombone',   keywords: ['trombone', 'trombones', 'trb'] },
  { id: 'tuba',       keywords: ['tuba', 'tubas'] },
  { id: 'flugelhorn', keywords: ['flugelhorn', 'flugel', 'flügelhorn'] },

  // 弦楽器（violin1/2を先にチェック、その後violinの汎用マッチ）
  { id: 'violin1',    keywords: ['violin 1', 'violin i', 'vln 1', 'vln1', 'vn1', 'vn 1', '1st violin', 'violins 1'] },
  { id: 'violin2',    keywords: ['violin 2', 'violin ii', 'vln 2', 'vln2', 'vn2', 'vn 2', '2nd violin', 'violins 2'] },
  { id: 'violin1',    keywords: ['violin', 'vln', 'vn'] },
  { id: 'viola',      keywords: ['viola', 'vla', 'violas'] },
  { id: 'cello',      keywords: ['cello', 'vc', 'vlc', 'cellos', 'celli'] },
  { id: 'contrabass', keywords: ['contrabass', 'double bass', 'basses', 'contrabasses'] },
  { id: 'harp',       keywords: ['harp', 'harps'] },
  { id: 'dulcimer',   keywords: ['dulcimer'] },

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
  { id: 'celesta',    keywords: ['celesta', 'celeste'] },
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
  dulcimer: 44,
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

// トラック名別の音域フィルター永続化
const PITCH_FILTER_STORAGE_KEY = 'midiOrchestra_pitchFilters';

// オクターブ表記修正に伴う一回限りのマイグレーション（+12）
(function migratePitchFilters() {
  const MIGRATION_KEY = 'midiOrchestra_pitchFilterMigrated_v1';
  if (localStorage.getItem(MIGRATION_KEY)) return;
  const raw = localStorage.getItem(PITCH_FILTER_STORAGE_KEY);
  if (raw) {
    const filters = JSON.parse(raw);
    Object.keys(filters).forEach(name => {
      const f = filters[name];
      f.pitchMin = Math.min(127, f.pitchMin + 12);
      f.pitchMax = Math.min(127, f.pitchMax + 12);
    });
    localStorage.setItem(PITCH_FILTER_STORAGE_KEY, JSON.stringify(filters));
  }
  localStorage.setItem(MIGRATION_KEY, '1');
})();

function savePitchFilter(trackName, pitchMin, pitchMax) {
  const filters = JSON.parse(localStorage.getItem(PITCH_FILTER_STORAGE_KEY) || '{}');
  if (pitchMin === 0 && pitchMax === 127) {
    delete filters[trackName];
  } else {
    filters[trackName] = { pitchMin, pitchMax };
  }
  localStorage.setItem(PITCH_FILTER_STORAGE_KEY, JSON.stringify(filters));
}

function loadPitchFilter(trackName) {
  const filters = JSON.parse(localStorage.getItem(PITCH_FILTER_STORAGE_KEY) || '{}');
  return filters[trackName] || null;
}

// MIDIノート番号→ノート名変換
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
function midiToNoteName(midi) {
  const note = NOTE_NAMES[midi % 12];
  const octave = Math.floor(midi / 12) - 2; // Logic Pro準拠（C3 = MIDI 60）
  return `${note}${octave}`;
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
  initColorPickerHueFix();
  await preloadCustomIcons(); // カスタムアイコンを事前読み込み
  animate();

  // プリセットシステム初期化
  if (window.presetManager) {
    await window.presetManager.initPresetSystem();
  }

  // ビューアーモード: データ自動読み込み
  if (window.VIEWER_MODE && window.VIEWER_DATA) {
    await loadViewerData();
    // レイアウト確定後にリサイズ（横向きロード対応・複数回で確実に）
    onWindowResize();
  }

  // ビューアーエクスポートボタン
  const viewerExportBtn = document.getElementById('viewerExportBtn');
  if (viewerExportBtn && window.viewerExport) {
    viewerExportBtn.addEventListener('click', () => {
      window.viewerExport.exportViewerData();
    });
  }

  // 公開ボタン
  const publishBtn = document.getElementById('publishBtn');
  const publishModal = document.getElementById('publishModal');
  if (publishBtn && publishModal) {
    const songInput = document.getElementById('publishSongName');
    const statusDiv = document.getElementById('publishStatus');
    const confirmBtn = document.getElementById('publishConfirm');
    const cancelBtn = document.getElementById('publishCancel');

    let lastPublishedSong = localStorage.getItem('lastPublishedSong') || '';
    publishBtn.addEventListener('click', () => {
      statusDiv.style.display = 'none';
      if (lastPublishedSong) {
        songInput.value = lastPublishedSong;
      } else {
        const presetSelect = document.getElementById('presetSelect');
        const selected = presetSelect && presetSelect.selectedOptions[0];
        if (selected && selected.value) {
          songInput.value = selected.textContent;
        }
      }
      positionModalNearButton(publishModal, publishBtn);
      publishModal.style.display = 'flex';
      songInput.focus();
    });

    cancelBtn.addEventListener('click', () => {
      publishModal.style.display = 'none';
    });

    publishModal.addEventListener('click', (e) => {
      if (e.target === publishModal) publishModal.style.display = 'none';
    });

    confirmBtn.addEventListener('click', async () => {
      const song = songInput.value.trim();

      if (!song) {
        statusDiv.textContent = '曲名を入力してください';
        statusDiv.style.color = '#ff6b6b';
        statusDiv.style.display = 'block';
        return;
      }

      if (!/^[a-zA-Z0-9_-]{1,50}$/.test(song)) {
        statusDiv.textContent = '英数字・ハイフン・アンダースコアのみ（50文字以内）';
        statusDiv.style.color = '#ff6b6b';
        statusDiv.style.display = 'block';
        return;
      }

      confirmBtn.disabled = true;
      statusDiv.textContent = '公開中...';
      statusDiv.style.color = '#4fc3f7';
      statusDiv.style.display = 'block';

      try {
        const result = await window.viewerExport.publishViewerData(song, (msg) => {
          statusDiv.textContent = msg;
        });
        lastPublishedSong = song;
        localStorage.setItem('lastPublishedSong', song);
        let msg = '公開完了！<br><a href="' + result.url + '" target="_blank" style="color:#4fc3f7;">' + result.url + '</a>';
        if (result.skipped && result.skipped.length > 0) {
          msg += '<br><span style="color:#ffb74d;font-size:11px;">⚠ 大きすぎてスキップ: ' + result.skipped.join(', ') + '</span>';
        }
        statusDiv.innerHTML = msg;
        statusDiv.style.color = '#66bb6a';
        // バックグラウンドでNotion登録（失敗してもUIに影響させない）
        window.viewerExport.notifyNotion(song, result.url).catch(e => {
          console.warn('Notion notification failed:', e);
        });
      } catch (e) {
        statusDiv.textContent = 'エラー: ' + e.message;
        statusDiv.style.color = '#ff6b6b';
      } finally {
        confirmBtn.disabled = false;
      }
    });
  }

  // 作品リストコピーボタン
  document.getElementById('copyListBtn')?.addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    btn.style.color = '#aaa';
    try {
      const res = await fetch('notion-list.php');
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed');
      const lines = data.items.slice(1).map(item => {
        const t = item.title.includes('_') ? item.title.replace(/_(.+)/, '「$1」') : item.title;
        return t + '\n' + item.url;
      });
      const text = '【過去作品リスト】\n\n' + lines.join('\n\n');
      await navigator.clipboard.writeText(text);
      btn.style.color = '#66bb6a';
      setTimeout(() => btn.style.color = '#999', 1500);
    } catch (err) {
      console.error('Copy list failed:', err);
      btn.style.color = '#ff6b6b';
      setTimeout(() => btn.style.color = '#999', 1500);
    }
  });

  updateCreditsPosition();
  setupValueSpanDirectInput();
  console.log('MIDI Orchestra Visualizer initialized');
}

// ============================================
// スライダー値spanダブルクリックで直接入力
// ============================================
function setupValueSpanDirectInput() {
  const spans = document.querySelectorAll(
    '.setting-item span[id$="Value"], .control-row span[id$="Value"], .sync-row span[id$="Value"]'
  );

  spans.forEach(span => {
    // カメラ位置spanは除外
    if (span.classList.contains('pos-value')) return;

    // spanIDからスライダーIDを導出: xxxValue → xxx
    const sliderId = span.id.replace(/Value$/, '');
    const slider = document.getElementById(sliderId);
    if (!slider || slider.type !== 'range') return;

    span.style.cursor = 'pointer';
    span.title = 'ダブルクリックで直接入力';

    span.addEventListener('dblclick', () => {
      // 既に編集中なら何もしない
      if (span.style.display === 'none') return;

      const currentNum = parseFloat(span.textContent);
      if (isNaN(currentNum)) return;

      const input = document.createElement('input');
      input.type = 'number';
      input.value = currentNum;
      input.min = slider.min;
      input.max = slider.max;
      input.step = slider.step;

      // spanと同じ見た目にする
      const computed = getComputedStyle(span);
      input.style.cssText = `
        width: ${Math.max(span.offsetWidth + 10, 50)}px;
        font-size: ${computed.fontSize};
        font-family: ${computed.fontFamily};
        color: ${computed.color};
        background: rgba(255,255,255,0.1);
        border: 1px solid #4fc3f7;
        border-radius: 3px;
        padding: 0 2px;
        text-align: center;
        outline: none;
      `;

      const commit = () => {
        if (input._committed) return;
        input._committed = true;

        let val = parseFloat(input.value);
        if (isNaN(val)) val = currentNum;

        const min = parseFloat(slider.min);
        const max = parseFloat(slider.max);
        const step = parseFloat(slider.step);
        val = Math.max(min, Math.min(max, val));
        // stepに丸める
        val = Math.round((val - min) / step) * step + min;
        // 浮動小数点誤差を除去
        const decimals = (slider.step.split('.')[1] || '').length;
        val = parseFloat(val.toFixed(decimals));

        slider.value = val;
        slider.dispatchEvent(new Event('input', { bubbles: true }));

        input.remove();
        span.style.display = '';
      };

      const cancel = () => {
        if (input._committed) return;
        input._committed = true;
        input.remove();
        span.style.display = '';
      };

      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); commit(); }
        if (e.key === 'Escape') { e.preventDefault(); cancel(); }
      });
      input.addEventListener('input', () => {
        let val = parseFloat(input.value);
        if (isNaN(val)) return;
        const min = parseFloat(slider.min);
        const max = parseFloat(slider.max);
        val = Math.max(min, Math.min(max, val));
        slider.value = val;
        slider.dispatchEvent(new Event('input', { bubbles: true }));
      });
      input.addEventListener('blur', commit);

      span.style.display = 'none';
      span.parentNode.insertBefore(input, span.nextSibling);
      input.focus();
      input.select();
    });
  });
}

// 水面の波計算GLSL（vertex/fragment共通）
const waterWaveGLSL = `
  vec2 wRot(vec2 p, float a) {
    float c = cos(a), s = sin(a);
    return vec2(p.x * c - p.y * s, p.x * s + p.y * c);
  }
  float calcWave(vec2 uv, float time, float scale) {
    uv *= scale;
    vec2 uv1 = wRot(uv, 0.4);
    vec2 uv2 = wRot(uv, 1.2);
    vec2 uv3 = wRot(uv, 2.5);
    vec2 uv4 = wRot(uv, 3.7);
    vec2 uv5 = wRot(uv, 5.0);
    float w1 = sin(uv1.x * 0.8 + time * 1.2) * sin(uv1.y * 0.7 + time * 0.8);
    float w2 = sin(uv2.x * 1.3 - time * 0.9) * sin(uv2.y * 0.9 + time * 1.1) * 0.8;
    float w3 = sin(uv3.x * 0.6 + time * 1.4) * sin(uv3.y * 1.1 - time * 0.7) * 0.6;
    float w4 = sin(uv4.x * 1.7 + time * 0.5) * sin(uv4.y * 0.5 + time * 1.3) * 0.5;
    float w5 = sin(uv5.x * 1.0 - time * 1.0) * sin(uv5.y * 1.4 + time * 0.6) * 0.4;
    return clamp((w1 + w2 + w3 + w4 + w5) * 0.2 + 0.5, 0.0, 1.0);
  }
`;

// 水面エフェクト共通フラグメントシェーダーコード
const waterEffectsGLSL = `
  // フレネル効果: 水平に近い視線ほど不透明度を上げる
  float calcFresnelOpacity(vec2 uv, float time, float scale, float waveHeight, float planeSize,
                           vec3 camPosition, vec3 vWorldPos, float baseOpacity) {
    float eps = 1.0 / scale;
    float hL = calcWave(uv - vec2(eps, 0.0), time, scale);
    float hR = calcWave(uv + vec2(eps, 0.0), time, scale);
    float hD = calcWave(uv - vec2(0.0, eps), time, scale);
    float hU = calcWave(uv + vec2(0.0, eps), time, scale);
    float worldEps = eps * planeSize;
    float slopeX = (hR - hL) * waveHeight / (2.0 * worldEps);
    float slopeZ = (hD - hU) * waveHeight / (2.0 * worldEps);
    vec3 normal = normalize(vec3(-slopeX, 1.0, -slopeZ));
    vec3 viewDir = normalize(camPosition - vWorldPos);
    float cosAngle = abs(dot(normal, viewDir));
    float fresnel = pow(1.0 - cosAngle, 3.0);
    return clamp(baseOpacity + (1.0 - baseOpacity) * fresnel, 0.0, 1.0);
  }

  // スパークル用ハッシュ関数
  float hash(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
  }

  // コースティクス計算
  float calcCaustic(float combined, float causticIntensity, vec3 lightColor) {
    float caustic = pow(combined, 3.0 + (1.0 - causticIntensity) * 5.0);
    return caustic * causticIntensity * 2.0;
  }

  // サンパス・スパークル計算（返り値: 加算する明るさ色）
  vec3 calcSunEffects(vec2 vUv, vec3 vWorldPos, float time, float scale, float waveHeight, float planeSize,
                      vec3 sunPosition, vec3 camPosition, float sunPathIntensity, float sunPathSharpness,
                      vec3 sunPathColor, float sparkleIntensity, float sparkleRange, vec3 lightColor) {
    vec3 effects = vec3(0.0);
    if (sunPathIntensity <= 0.0) return effects;

    float eps = 1.0 / scale;
    float hL = calcWave(vUv - vec2(eps, 0.0), time, scale);
    float hR = calcWave(vUv + vec2(eps, 0.0), time, scale);
    float hD = calcWave(vUv - vec2(0.0, eps), time, scale);
    float hU = calcWave(vUv + vec2(0.0, eps), time, scale);
    float worldEps = eps * planeSize;
    float slopeX = (hR - hL) * waveHeight / (2.0 * worldEps);
    float slopeZ = (hD - hU) * waveHeight / (2.0 * worldEps);
    vec3 worldNormal = normalize(vec3(-slopeX, 1.0, -slopeZ));

    vec3 lightDir = normalize(sunPosition);
    vec3 viewDir = normalize(camPosition - vWorldPos);
    vec3 halfVec = normalize(lightDir + viewDir);
    float spec = pow(max(dot(worldNormal, halfVec), 0.0), sunPathSharpness);

    float fresnel = pow(1.0 - max(dot(worldNormal, viewDir), 0.0), 3.0);
    spec *= (0.3 + 0.7 * fresnel);

    effects += sunPathColor * spec * sunPathIntensity * lightColor;

    // スパークル
    if (sparkleIntensity > 0.0) {
      float sparkleSharp = mix(sunPathSharpness, sunPathSharpness * 0.1, sparkleRange);
      float specArea = pow(max(dot(worldNormal, halfVec), 0.0), sparkleSharp);
      float sparkleArea = specArea * (0.3 + 0.7 * fresnel);

      vec2 sparkleUv = vUv * scale * 1.5;
      vec2 cell = floor(sparkleUv);
      vec2 local = fract(sparkleUv);

      vec2 starPos = vec2(hash(cell), hash(cell + 71.7));
      vec2 delta = local - starPos;
      float dist = length(delta);
      float size = 0.25 + hash(cell + 99.3) * 0.6;

      float angle = atan(delta.y, delta.x) + hash(cell + 42.0) * 6.2832;
      float rays = pow(abs(cos(angle * 2.0)), 4.0);
      float starShape = mix(size * 0.3, size, rays);
      float sparkle = smoothstep(starShape, starShape * 0.15, dist);

      float phase = hash(cell + 13.37) * 6.2832;
      float speed = 1.5 + hash(cell + 57.1) * 3.0;
      float twinkle = pow(max(sin(time * speed + phase), 0.0), 4.0);

      sparkle *= twinkle * sparkleArea * sparkleIntensity * 3.0;
      effects += sunPathColor * sparkle * lightColor;
    }

    return effects;
  }
`;

// 水面共通uniforms生成
function createWaterUniforms() {
  return {
    time: { value: 0 },
    scale: { value: waterSurfaceScale },
    waveHeight: { value: 3.0 },
    colorDeep: { value: new THREE.Color(waterSurfaceColor) },
    colorShallow: { value: new THREE.Color('#4a9eed') },
    opacity: { value: waterSurfaceOpacity },
    causticIntensity: { value: waterSurfaceCaustic },
    lightColor: { value: new THREE.Color(0xffffff) },
    planeSize: { value: 500.0 },
    sunPosition: { value: new THREE.Vector3(50, 100, 50) },
    camPosition: { value: new THREE.Vector3(0, 50, 200) },
    sunPathIntensity: { value: 0.0 },
    sunPathSharpness: { value: 32.0 },
    sunPathColor: { value: new THREE.Color(0xffffff) },
    sparkleIntensity: { value: 0.0 },
    sparkleRange: { value: 0.5 },
  };
}

// 水面共通頂点シェーダー
const waterVertexShader = `
  uniform float time;
  uniform float scale;
  uniform float waveHeight;
  varying vec2 vUv;
  varying float vWave;
  varying vec3 vWorldPos;
  ${waterWaveGLSL}
  void main() {
    vUv = uv;
    vWave = calcWave(uv, time, scale);
    vec3 pos = position;
    pos.z += (vWave - 0.5) * waveHeight;
    vec4 worldPos = modelMatrix * vec4(pos, 1.0);
    vWorldPos = worldPos.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

// 水面共通フラグメントuniform宣言
const waterFragmentUniforms = `
  uniform vec3 colorDeep;
  uniform vec3 colorShallow;
  uniform float opacity;
  uniform float causticIntensity;
  uniform vec3 lightColor;
  uniform vec3 sunPosition;
  uniform vec3 camPosition;
  uniform float sunPathIntensity;
  uniform float sunPathSharpness;
  uniform vec3 sunPathColor;
  uniform float sparkleIntensity;
  uniform float sparkleRange;
  uniform float time;
  uniform float scale;
  uniform float waveHeight;
  uniform float planeSize;
  varying vec2 vUv;
  varying float vWave;
  varying vec3 vWorldPos;
  ${waterWaveGLSL}
  ${waterEffectsGLSL}
`;

// 乗算ティントレイヤー: 不透明度が低いとき背景を水色に染める
function createWaterTintMaterial() {
  return new THREE.ShaderMaterial({
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
    blending: THREE.CustomBlending,
    blendEquation: THREE.AddEquation,
    blendSrc: THREE.DstColorFactor,
    blendDst: THREE.ZeroFactor,
    uniforms: createWaterUniforms(),
    vertexShader: waterVertexShader,
    fragmentShader: `
      ${waterFragmentUniforms}
      void main() {
        float combined = vWave;
        vec3 baseColor = mix(colorDeep, colorShallow, combined) * lightColor;

        // フレネル効果で実効不透明度を計算
        float effOpacity = calcFresnelOpacity(vUv, time, scale, waveHeight, planeSize,
                                              camPosition, vWorldPos, opacity);

        // opacity=1: 白 → 乗算でも背景に影響なし（サーフェス層が覆う）
        // opacity=0: baseColor → 背景を水色に染める（透き通った水）
        vec3 tint = mix(baseColor, vec3(1.0), effOpacity);

        // コースティクス（不透明度が低いほど見える）
        float causticVal = calcCaustic(combined, causticIntensity, lightColor);
        tint += vec3(causticVal) * lightColor * (1.0 - effOpacity);

        // サンパス・スパークル（不透明度が低いほど見える）
        vec3 sunEffects = calcSunEffects(vUv, vWorldPos, time, scale, waveHeight, planeSize,
                                         sunPosition, camPosition, sunPathIntensity, sunPathSharpness,
                                         sunPathColor, sparkleIntensity, sparkleRange, lightColor);
        tint += sunEffects * (1.0 - effOpacity);

        gl_FragColor = vec4(tint, 1.0);
      }
    `
  });
}

// 水面サーフェスレイヤー: 不透明度が高いとき通常の水面として表示
function createWaterSurfaceMaterial() {
  return new THREE.ShaderMaterial({
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
    uniforms: createWaterUniforms(),
    vertexShader: waterVertexShader,
    fragmentShader: `
      ${waterFragmentUniforms}
      void main() {
        float combined = vWave;
        vec3 baseColor = mix(colorDeep, colorShallow, combined) * lightColor;

        // コースティクス
        float causticVal = calcCaustic(combined, causticIntensity, lightColor);
        baseColor += vec3(causticVal) * lightColor;

        // サンパス・スパークル
        vec3 sunEffects = calcSunEffects(vUv, vWorldPos, time, scale, waveHeight, planeSize,
                                         sunPosition, camPosition, sunPathIntensity, sunPathSharpness,
                                         sunPathColor, sparkleIntensity, sparkleRange, lightColor);
        baseColor += sunEffects;

        // フレネル効果で実効不透明度を計算
        float effOpacity = calcFresnelOpacity(vUv, time, scale, waveHeight, planeSize,
                                              camPosition, vWorldPos, opacity);

        // opacity=1: 完全不透明（下が見えない）
        // opacity=0: 完全透明（ティントレイヤーに任せる）
        gl_FragColor = vec4(baseColor, effOpacity);
      }
    `
  });
}

// クロマキー対応ShaderMaterial生成
function createChromaKeyMaterial(opacity = 0.8) {
  const mat = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([
      THREE.UniformsLib.lights,
      {
        map: { value: null },
        chromaKeyColor: { value: new THREE.Color(0x00ff00) },
        chromaKeyThreshold: { value: 0 },
        opacity: { value: opacity },
        warmTint: { value: 0.0 },
        receiveShadowFlag: { value: 0.0 },
        lightColor: { value: new THREE.Color(0xffffff) },
      }
    ]),
    vertexShader: `
      varying vec2 vUv;
      varying vec4 vShadowCoord;
      uniform mat4 directionalShadowMatrix[1];
      void main() {
        vUv = uv;
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vShadowCoord = directionalShadowMatrix[0] * worldPos;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D map;
      uniform vec3 chromaKeyColor;
      uniform float chromaKeyThreshold;
      uniform float opacity;
      uniform float warmTint;
      uniform float receiveShadowFlag;
      uniform vec3 lightColor;
      uniform sampler2D directionalShadowMap[1];
      varying vec2 vUv;
      varying vec4 vShadowCoord;

      float getShadow() {
        vec3 coord = vShadowCoord.xyz / vShadowCoord.w;
        coord = coord * 0.5 + 0.5;
        if (coord.x < 0.0 || coord.x > 1.0 || coord.y < 0.0 || coord.y > 1.0 || coord.z > 1.0) return 1.0;
        float depth = texture2D(directionalShadowMap[0], coord.xy).r;
        float bias = 0.003;
        return (coord.z - bias > depth) ? 0.5 : 1.0;
      }

      void main() {
        vec4 texColor = texture2D(map, vUv);
        float dist = distance(texColor.rgb, chromaKeyColor);
        if (dist < chromaKeyThreshold) discard;
        vec3 col = texColor.rgb;
        // 暖色シフト + ブルーム風輝き
        col.r = min(col.r + warmTint * 0.08, 1.0);
        col.g = min(col.g + warmTint * 0.03, 1.0);
        col.b = max(col.b - warmTint * 0.05, 0.0);
        float lum = dot(col, vec3(0.299, 0.587, 0.114));
        col += col * warmTint * 0.4 * (0.5 + lum);
        col = min(col, 1.0);
        // 影の適用
        if (receiveShadowFlag > 0.5) {
          col *= getShadow();
        }
        // 光源色の適用
        col *= lightColor;
        float alpha = texColor.a * opacity;
        if (alpha < 0.01) discard;
        gl_FragColor = vec4(col, alpha);
      }
    `,
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
    lights: true,
  });
  return mat;
}

// 影受けプレーン用マテリアル（ShadowMaterial + onBeforeCompile で床テクスチャマスクを注入）
function createShadowPlaneMaterial() {
  const mat = new THREE.ShadowMaterial({
    opacity: 0.3,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -6,
    polygonOffsetUnit: -6,
  });

  // カスタムuniformsをuserDataに保持（外部からアクセス可能）
  mat.userData.floorMap = { value: null };
  mat.userData.chromaKeyColor = { value: new THREE.Color(0x00ff00) };
  mat.userData.chromaKeyThreshold = { value: 0 };

  mat.onBeforeCompile = (shader) => {
    // uniformsをシェーダーに注入
    shader.uniforms.floorMap = mat.userData.floorMap;
    shader.uniforms.chromaKeyColor = mat.userData.chromaKeyColor;
    shader.uniforms.chromaKeyThreshold = mat.userData.chromaKeyThreshold;

    // 頂点シェーダーにUV varying追加
    shader.vertexShader = shader.vertexShader.replace(
      'void main() {',
      'varying vec2 vFloorUv;\nvoid main() {\nvFloorUv = uv;'
    );

    // フラグメントシェーダーに床テクスチャチェックを注入
    shader.fragmentShader = shader.fragmentShader.replace(
      'void main() {',
      'uniform sampler2D floorMap;\nuniform vec3 chromaKeyColor;\nuniform float chromaKeyThreshold;\nvarying vec2 vFloorUv;\nvoid main() {\n  vec4 floorTex = texture2D(floorMap, vFloorUv);\n  float chromaDist = distance(floorTex.rgb, chromaKeyColor);\n  if (chromaDist < chromaKeyThreshold) discard;\n  if (floorTex.a < 0.01) discard;'
    );
  };

  return mat;
}

// 天候パーティクルシステムの構築・再構築
// 雪用の丸テクスチャを生成
function generateSnowTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 32;
  canvas.height = 32;
  const ctx = canvas.getContext('2d');
  const g = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.5, 'rgba(255,255,255,0.6)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 32, 32);
  const tex = new THREE.CanvasTexture(canvas);
  return tex;
}

function buildWeatherParticles() {
  // 既存のパーティクルを除去
  if (weatherParticles) {
    scene.remove(weatherParticles);
    weatherParticles.geometry.dispose();
    weatherParticles.material.dispose();
    weatherParticles = null;
  }
  if (rainSplash) {
    scene.remove(rainSplash);
    rainSplash.geometry.dispose();
    rainSplash.material.dispose();
    rainSplash = null;
  }
  if (weatherType === 'none') return;

  const count = weatherAmount;
  const spread = weatherSpread;
  // 角度から水平・垂直成分を算出
  const angleRad = weatherAngle * Math.PI / 180;
  const windRad = weatherWindDir * Math.PI / 180;
  const horizComponent = Math.sin(angleRad); // 水平方向の強さ
  const vertComponent = Math.cos(angleRad);  // 垂直方向の強さ
  const windX = horizComponent * Math.sin(windRad);
  const windZ = horizComponent * Math.cos(windRad);

  if (weatherType === 'rain') {
    // 雨: LineSegmentsで縦長の棒状
    const positions = new Float32Array(count * 6); // 始点+終点 × 3
    const velocities = new Float32Array(count * 3);
    const streakLen = 10;
    // 雨粒の線分方向も風に沿わせる
    const dx = windX * streakLen;
    const dy = -vertComponent * streakLen;
    const dz = windZ * streakLen;

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const i6 = i * 6;
      const x = (Math.random() - 0.5) * spread * 2;
      const y = Math.random() * spread * 2 - 50;
      const z = (Math.random() - 0.5) * spread * 2;
      positions[i6]     = x;
      positions[i6 + 1] = y;
      positions[i6 + 2] = z;
      positions[i6 + 3] = x + dx;
      positions[i6 + 4] = y + dy;
      positions[i6 + 5] = z + dz;
      const baseSpeed = 3 + Math.random() * 2;
      velocities[i3]     = windX * baseSpeed;
      velocities[i3 + 1] = -vertComponent * baseSpeed;
      velocities[i3 + 2] = windZ * baseSpeed;
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geom._velocities = velocities;
    geom._spread = spread;
    geom._isRain = true;
    geom._streakDx = dx;
    geom._streakDy = dy;
    geom._streakDz = dz;

    const mat = new THREE.LineBasicMaterial({
      color: 0xaaccff,
      transparent: true,
      opacity: 0.4,
      depthWrite: false,
    });

    weatherParticles = new THREE.LineSegments(geom, mat);

    // スプラッシュパーティクルプール
    const splashCount = Math.min(Math.floor(count * 0.5), 8000);
    const splashPos = new Float32Array(splashCount * 3);
    const splashVel = new Float32Array(splashCount * 3);
    const splashLife = new Float32Array(splashCount); // 0=未使用, >0=残りライフ
    // 初期位置を画面外に
    for (let i = 0; i < splashCount; i++) {
      splashPos[i * 3 + 1] = -9999;
    }
    const splashGeom = new THREE.BufferGeometry();
    splashGeom.setAttribute('position', new THREE.BufferAttribute(splashPos, 3));
    splashGeom._velocities = splashVel;
    splashGeom._life = splashLife;
    splashGeom._nextIndex = 0;
    splashGeom._count = splashCount;
    const splashMat = new THREE.PointsMaterial({
      color: 0xaaccff,
      size: 2,
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
      sizeAttenuation: true,
    });
    rainSplash = new THREE.Points(splashGeom, splashMat);
    rainSplash.frustumCulled = false;
    scene.add(rainSplash);
  } else {
    // 雪: Pointsで丸い粒
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      positions[i3]     = (Math.random() - 0.5) * spread * 2;
      positions[i3 + 1] = Math.random() * spread * 2 - 50;
      positions[i3 + 2] = (Math.random() - 0.5) * spread * 2;
      const baseSpeed = 0.3 + Math.random() * 0.3;
      velocities[i3]     = (Math.random() - 0.5) * 0.3 + windX * baseSpeed;
      velocities[i3 + 1] = -vertComponent * baseSpeed;
      velocities[i3 + 2] = (Math.random() - 0.5) * 0.3 + windZ * baseSpeed;
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geom._velocities = velocities;
    geom._spread = spread;
    geom._isRain = false;

    const mat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 3,
      map: generateSnowTexture(),
      transparent: true,
      opacity: 0.8,
      depthWrite: false,
      sizeAttenuation: true,
    });

    weatherParticles = new THREE.Points(geom, mat);
  }

  weatherParticles.frustumCulled = false;
  // 現在の光源色・強度を反映
  if (sunLight && weatherParticles.material.color) {
    const scale = sunLight.intensity;
    const tint = new THREE.Color().copy(sunLight.color).multiplyScalar(scale);
    const base = weatherParticles.geometry._isRain ? new THREE.Color(0xaaccff) : new THREE.Color(0xffffff);
    weatherParticles.material.color.copy(base).multiply(tint);
  }
  scene.add(weatherParticles);
}

// 天候パーティクルの毎フレーム更新
function updateWeatherParticles() {
  if (!weatherParticles || weatherType === 'none') return;
  const geom = weatherParticles.geometry;
  const pos = geom.attributes.position.array;
  const vel = geom._velocities;
  const spread = geom._spread;
  const speed = weatherSpeed;
  const isRain = geom._isRain;

  const cx = camera ? camera.position.x : 0;
  const cz = camera ? camera.position.z : 0;

  if (isRain) {
    // 雨: 始点・終点ペア（6要素ごと）
    // 速度に比例して線の長さを変える（基準streakLen=10はspeed=1相当）
    const streakScale = Math.sqrt(speed);
    const sdx = geom._streakDx * streakScale;
    const sdy = geom._streakDy * streakScale;
    const sdz = geom._streakDz * streakScale;
    const count = vel.length / 3;
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const i6 = i * 6;
      const dxv = vel[i3]     * speed;
      const dy  = vel[i3 + 1] * speed;
      const dzv = vel[i3 + 2] * speed;
      pos[i6]     += dxv;    // 始点X
      pos[i6 + 1] += dy;     // 始点Y
      pos[i6 + 2] += dzv;    // 始点Z
      // 終点 = 始点 + 速度比例の線分オフセット
      pos[i6 + 3] = pos[i6]     + sdx;
      pos[i6 + 4] = pos[i6 + 1] + sdy;
      pos[i6 + 5] = pos[i6 + 2] + sdz;
      if (pos[i6 + 1] < -50) {
        // スプラッシュ生成
        if (rainSplash && weatherSplash > 0) {
          const sg = rainSplash.geometry;
          const sPos = sg.attributes.position.array;
          const sVel = sg._velocities;
          const sLife = sg._life;
          const splashX = pos[i6];
          const splashZ = pos[i6 + 2];
          // 2〜3個のスプラッシュ粒子を生成
          const numSplash = Math.floor(weatherSplash * (0.5 + Math.random() * 0.5));
          for (let s = 0; s < numSplash; s++) {
            const si = sg._nextIndex;
            const si3 = si * 3;
            sPos[si3]     = splashX;
            sPos[si3 + 1] = -50;
            sPos[si3 + 2] = splashZ;
            const angle = Math.random() * Math.PI * 2;
            const hSpeed = 0.3 + Math.random() * 0.7;
            sVel[si3]     = Math.cos(angle) * hSpeed;
            sVel[si3 + 1] = 0.8 + Math.random() * 1.2;
            sVel[si3 + 2] = Math.sin(angle) * hSpeed;
            sLife[si] = 1.0;
            sg._nextIndex = (si + 1) % sg._count;
          }
        }
        // 落下中の水平ドリフト分を風上側にオフセット
        const fallDist = spread * 2;
        const driftX = vel[i3] / Math.abs(vel[i3 + 1]) * fallDist;
        const driftZ = vel[i3 + 2] / Math.abs(vel[i3 + 1]) * fallDist;
        const x = cx + (Math.random() - 0.5) * spread * 2 - driftX;
        const y = spread * 2 - 50;
        const z = cz + (Math.random() - 0.5) * spread * 2 - driftZ;
        pos[i6]     = x;
        pos[i6 + 1] = y;
        pos[i6 + 2] = z;
        pos[i6 + 3] = x + sdx;
        pos[i6 + 4] = y + sdy;
        pos[i6 + 5] = z + sdz;
      }
    }
  } else {
    // 雪: 1頂点ずつ
    const count = pos.length / 3;
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      pos[i3]     += vel[i3]     * speed;
      pos[i3 + 1] += vel[i3 + 1] * speed;
      pos[i3 + 2] += vel[i3 + 2] * speed;
      if (pos[i3 + 1] < -50) {
        const fallDist = spread * 2;
        const driftX = vel[i3] / Math.abs(vel[i3 + 1]) * fallDist;
        const driftZ = vel[i3 + 2] / Math.abs(vel[i3 + 1]) * fallDist;
        pos[i3]     = cx + (Math.random() - 0.5) * spread * 2 - driftX;
        pos[i3 + 1] = spread * 2 - 50;
        pos[i3 + 2] = cz + (Math.random() - 0.5) * spread * 2 - driftZ;
      }
    }
  }
  geom.attributes.position.needsUpdate = true;

  // スプラッシュパーティクル更新
  if (rainSplash) {
    const sg = rainSplash.geometry;
    const sPos = sg.attributes.position.array;
    const sVel = sg._velocities;
    const sLife = sg._life;
    const gravity = 0.06;
    for (let i = 0; i < sg._count; i++) {
      if (sLife[i] <= 0) continue;
      const i3 = i * 3;
      sLife[i] -= 0.04;
      if (sLife[i] <= 0) {
        sPos[i3 + 1] = -9999;
        continue;
      }
      sVel[i3 + 1] -= gravity; // 重力
      sPos[i3]     += sVel[i3];
      sPos[i3 + 1] += sVel[i3 + 1];
      sPos[i3 + 2] += sVel[i3 + 2];
      // 地面で止める
      if (sPos[i3 + 1] < -50) {
        sPos[i3 + 1] = -9999;
        sLife[i] = 0;
      }
    }
    sg.attributes.position.needsUpdate = true;
  }
}

// クロマキー対応デプスマテリアル（影用：クロマキーで除去した部分の影を出さない）
// ノート用カスタムDepthMaterial（透明度に応じてディザリングで影を薄くする）
function createNoteShadowDepthMaterial(opacity) {
  return new THREE.ShaderMaterial({
    uniforms: {
      opacity: { value: opacity },
    },
    vertexShader: `
      void main() {
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      #include <packing>
      uniform float opacity;
      // ディザリング用ハッシュ
      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
      }
      void main() {
        if (hash(gl_FragCoord.xy) > opacity) discard;
        gl_FragColor = packDepthToRGBA(gl_FragCoord.z);
      }
    `,
    side: THREE.DoubleSide,
  });
}

function createChromaKeyDepthMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: {
      map: { value: null },
      chromaKeyColor: { value: new THREE.Color(0x00ff00) },
      chromaKeyThreshold: { value: 0 },
      opacity: { value: 1.0 },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      #include <packing>
      uniform sampler2D map;
      uniform vec3 chromaKeyColor;
      uniform float chromaKeyThreshold;
      uniform float opacity;
      varying vec2 vUv;
      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
      }
      void main() {
        vec4 texColor = texture2D(map, vUv);
        if (texColor.a < 0.01) discard;
        float dist = distance(texColor.rgb, chromaKeyColor);
        if (dist < chromaKeyThreshold) discard;
        if (hash(gl_FragCoord.xy) > opacity * texColor.a) discard;
        gl_FragColor = packDepthToRGBA(gl_FragCoord.z);
      }
    `,
    side: THREE.DoubleSide,
  });
}

// customDepthMaterialのuniformsを壁のマテリアルと同期
function syncDepthMaterialUniforms(plane) {
  if (!plane || !plane.customDepthMaterial) return;
  const depth = plane.customDepthMaterial;
  const main = plane.material;
  depth.uniforms.map.value = main.uniforms.map.value;
  depth.uniforms.chromaKeyColor.value.copy(main.uniforms.chromaKeyColor.value);
  depth.uniforms.chromaKeyThreshold.value = main.uniforms.chromaKeyThreshold.value;
  if (depth.uniforms.opacity && main.uniforms.opacity) {
    depth.uniforms.opacity.value = main.uniforms.opacity.value;
  }
}

function generateFlareTexture() {
  const size = 256;
  const cx = size / 2, cy = size / 2;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const imgData = ctx.createImageData(size, size);
  const d = imgData.data;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // 六角形の距離関数（正六角形）
      let dx = (x - cx) / cx, dy = (y - cy) / cy;
      const ax = Math.abs(dx), ay = Math.abs(dy);
      // hexagonal distance: max(|x|, (|x|+√3·|y|)/2)
      const hexDist = Math.max(ax, (ax + Math.sqrt(3) * ay) / 2);
      // ソフトな減衰
      const alpha = 1 - smoothstep(0.0, 1.0, hexDist);
      const glow = Math.exp(-hexDist * hexDist * 3);
      const t = alpha * 0.7 + glow * 0.3;
      const i = (y * size + x) * 4;
      d[i]     = 255;
      d[i + 1] = Math.round(220 + 35 * (1 - hexDist));
      d[i + 2] = Math.round(140 + 115 * (1 - hexDist));
      d[i + 3] = Math.round(t * 255);
    }
  }
  ctx.putImageData(imgData, 0, 0);
  return new THREE.CanvasTexture(canvas);
}
function smoothstep(edge0, edge1, x) {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function generateHaloTexture() {
  const size = 256;
  const cx = size / 2, cy = size / 2;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const imgData = ctx.createImageData(size, size);
  const d = imgData.data;
  const ringCenter = 0.7; // リングのピーク位置（0〜1）
  const ringWidth = 0.15; // リングの太さ
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (x - cx) / cx, dy = (y - cy) / cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      // リング型: ピーク位置からの距離でガウシアン減衰
      const ringDist = Math.abs(dist - ringCenter) / ringWidth;
      const ring = Math.exp(-ringDist * ringDist * 2);
      const i = (y * size + x) * 4;
      d[i]     = 220;
      d[i + 1] = 230;
      d[i + 2] = 255;
      d[i + 3] = Math.round(ring * 180);
    }
  }
  ctx.putImageData(imgData, 0, 0);
  return new THREE.CanvasTexture(canvas);
}

function generateCloudTexture(size = 512) {
  const perm = new Uint8Array(512);
  for (let i = 0; i < 256; i++) perm[i] = i;
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [perm[i], perm[j]] = [perm[j], perm[i]];
  }
  for (let i = 0; i < 256; i++) perm[256 + i] = perm[i];

  function fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
  function lerp(a, b, t) { return a + t * (b - a); }
  function grad(hash, x, y) {
    const h = hash & 3;
    const u = h < 2 ? x : y;
    const v = h < 2 ? y : x;
    return ((h & 1) ? -u : u) + ((h & 2) ? -v : v);
  }
  // タイル可能ノイズ: period で座標をラップして継ぎ目なし
  function noise(x, y, px, py) {
    const xi = Math.floor(x) % px, yi = Math.floor(y) % py;
    const xi1 = (xi + 1) % px, yi1 = (yi + 1) % py;
    const xf = x - Math.floor(x), yf = y - Math.floor(y);
    const u = fade(xf), v = fade(yf);
    const aa = perm[perm[xi] + yi], ab = perm[perm[xi] + yi1];
    const ba = perm[perm[xi1] + yi], bb = perm[perm[xi1] + yi1];
    return lerp(lerp(grad(aa, xf, yf), grad(ba, xf - 1, yf), u),
                lerp(grad(ab, xf, yf - 1), grad(bb, xf - 1, yf - 1), u), v);
  }

  const baseFreq = 4; // 1タイルあたりのノイズ周期数
  const canvas = document.createElement('canvas');
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext('2d');
  const imgData = ctx.createImageData(size, size);
  const d = imgData.data;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let val = 0, amp = 1, freq = 1, totalAmp = 0;
      for (let o = 0; o < 5; o++) {
        const p = baseFreq * freq; // 各オクターブの周期
        val += noise(x / size * p, y / size * p, p, p) * amp;
        totalAmp += amp;
        amp *= 0.5; freq *= 2;
      }
      val = (val / totalAmp + 1) * 0.5;
      val = smoothstep(0.3, 0.7, val);
      const i = (y * size + x) * 4;
      d[i] = 20;      // R — 青灰（空の散乱光）
      d[i+1] = 30;    // G
      d[i+2] = 70;    // B
      d[i+3] = Math.round(val * 255);
    }
  }
  ctx.putImageData(imgData, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
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
  camera.layers.enable(1); // ノートレイヤーも描画対象に
  window.appCamera = camera;

  // レンダラー
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(width, height);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  // EffectComposer（ブルーム用） - ステンシルバッファ付きレンダーターゲット
  const composerRT = new THREE.WebGLRenderTarget(
    width * renderer.getPixelRatio(),
    height * renderer.getPixelRatio(),
    { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBAFormat, stencilBuffer: true }
  );
  composer = new THREE.EffectComposer(renderer, composerRT);
  const renderPass = new THREE.RenderPass(scene, camera);
  composer.addPass(renderPass);
  bloomPass = new THREE.UnrealBloomPass(
    new THREE.Vector2(width, height),
    0,    // strength（初期0=オフ）
    0.4,  // radius
    0.8   // threshold
  );
  composer.addPass(bloomPass);

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
  window.appControls = controls;
  controls.enableDamping = true;       // 滑らかな動き
  controls.dampingFactor = 0.05;
  controls.screenSpacePanning = true;
  controls.minDistance = 10;           // 最小ズーム
  controls.maxDistance = 500;          // 最大ズーム
  controls.maxPolarAngle = Math.PI / 2; // 床の下に回り込めないよう制限
  // タッチデバイスは感度を下げる
  if ('ontouchstart' in window) {
    controls.rotateSpeed = 0.5;
    controls.zoomSpeed = 0.5;
    controls.panSpeed = 0.5;
  }

  // 照明
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  ambientLight.layers.enableAll(); // 全レイヤーで有効（ノートレイヤー含む）
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
  directionalLight.layers.enableAll();
  directionalLight.position.set(50, 100, 50);
  scene.add(directionalLight);
  sunLight = directionalLight;
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.width = 2048;
  sunLight.shadow.mapSize.height = 2048;
  sunLight.shadow.camera.left = -500;
  sunLight.shadow.camera.right = 500;
  sunLight.shadow.camera.top = 500;
  sunLight.shadow.camera.bottom = -500;
  sunLight.shadow.camera.near = 0.1;
  sunLight.shadow.camera.far = 2000;

  // レンズフレア（カスタムスクリーン空間実装）
  // dist: 0=光源, 0.5=画面中心, 1.0=反対側（ミラー）
  flareScene = new THREE.Scene();
  flareCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const haloTexture = generateHaloTexture();
  const flareDefs = [
    { size: 0.15, dist: 0,    color: [1, 0.95, 0.8],   halo: false }, // メインフレア
    { size: 0.02, dist: 0.2,  color: [0.8, 0.9, 1],    halo: true  }, // ゴースト
    { size: 0.04, dist: 0.35, color: [0.6, 0.8, 1],    halo: true  },
    { size: 0.03, dist: 0.5,  color: [0.9, 0.85, 1],   halo: true  }, // 画面中心
    { size: 0.06, dist: 0.65, color: [0.5, 0.7, 1],    halo: true  },
    { size: 0.02, dist: 0.8,  color: [0.7, 0.85, 1],   halo: true  },
    { size: 0.04, dist: 1.0,  color: [0.6, 0.75, 0.9], halo: true  }, // 反対側
  ];
  flareDefs.forEach(def => {
    const mat = new THREE.MeshBasicMaterial({
      map: generateFlareTexture(),
      color: new THREE.Color(def.color[0], def.color[1], def.color[2]),
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
    mesh.visible = false;
    mesh._flareDist = def.dist;
    mesh._flareBaseSize = def.size;
    mesh._flareBaseColor = new THREE.Color(def.color[0], def.color[1], def.color[2]);
    mesh._haloMesh = null;
    flareScene.add(mesh);
    flareMeshes.push(mesh);
    // ゴーストにハロー（輪）を追加
    if (def.halo) {
      const haloMat = new THREE.MeshBasicMaterial({
        map: haloTexture,
        color: new THREE.Color(def.color[0], def.color[1], def.color[2]),
        blending: THREE.AdditiveBlending,
        transparent: true,
        depthTest: false,
        depthWrite: false,
      });
      const haloMesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), haloMat);
      haloMesh.visible = false;
      flareScene.add(haloMesh);
      mesh._haloMesh = haloMesh;
    }
  });

  // スカイドーム（背景半球）- 前方180度のみ、初期は非表示
  // SphereGeometry(radius, widthSegments, heightSegments, phiStart, phiLength)
  const skyDomeGeometry = new THREE.SphereGeometry(2000, 64, 32, Math.PI / 2, Math.PI);
  const skyDomeMaterial = createChromaKeyMaterial(1.0);
  skyDomeMaterial.side = THREE.BackSide; // 内側からテクスチャを見る
  skyDome = new THREE.Mesh(skyDomeGeometry, skyDomeMaterial);
  skyDome.renderOrder = -1000; // 最初に描画
  skyDome.visible = false;
  skyDome.customDepthMaterial = createChromaKeyDepthMaterial();
  scene.add(skyDome);

  // 近景スカイドーム（内側、デフォルト半径500）
  const innerSkyGeometry = new THREE.SphereGeometry(500, 64, 32, Math.PI / 2, Math.PI);
  const innerSkyMaterial = createChromaKeyMaterial(1.0);
  innerSkyMaterial.side = THREE.BackSide;
  innerSkyDome = new THREE.Mesh(innerSkyGeometry, innerSkyMaterial);
  innerSkyDome.renderOrder = -999; // 遠景の手前に描画
  innerSkyDome.visible = false;
  innerSkyDome.customDepthMaterial = createChromaKeyDepthMaterial();
  scene.add(innerSkyDome);

  // グリッド（床 / 地面）
  const gridColor = new THREE.Color(settings.gridColor);
  gridHelper = new THREE.GridHelper(settings.gridSize, 50, gridColor, gridColor);
  gridHelper.position.y = -50; // 地面の位置（初期値、MIDI読み込み時に調整）
  // グリッドの透明度対応（materialは配列）
  if (Array.isArray(gridHelper.material)) {
    gridHelper.material.forEach(mat => {
      mat.transparent = true;
      mat.opacity = settings.gridOpacity;
    });
  } else {
    gridHelper.material.transparent = true;
    gridHelper.material.opacity = settings.gridOpacity;
  }
  scene.add(gridHelper);

  // 床画像用平面（初期は非表示）- セグメント分割で曲面対応
  const floorGeometry = new THREE.PlaneGeometry(300, 300, 64, 64);
  const floorMaterial = createChromaKeyMaterial(1);
  floorMaterial.side = THREE.FrontSide; // 裏面を非表示
  floorMaterial.shadowSide = THREE.DoubleSide; // 影パスでは両面描画
  floorMaterial.depthWrite = true; // 水面が床の下にあるとき正しく隠れるように
  // ステンシルは使用しない（影マスクはshadowPlaneシェーダーがfloorMapを参照して処理）
  floorPlane = new THREE.Mesh(floorGeometry, floorMaterial);
  floorPlane.rotation.x = -Math.PI / 2; // 水平に寝かせる
  floorPlane.position.y = -50; // グリッドと同じ高さ
  floorPlane.renderOrder = 0;
  floorPlane.visible = false; // 画像がロードされるまで非表示
  floorPlane.castShadow = true;
  floorPlane.customDepthMaterial = createChromaKeyDepthMaterial();
  scene.add(floorPlane);

  // 床2画像用平面（床の少し上に配置）
  const floor2Geometry = new THREE.PlaneGeometry(300, 300, 64, 64);
  const floor2Material = createChromaKeyMaterial(1);
  floor2Material.side = THREE.FrontSide;
  floor2Material.shadowSide = THREE.DoubleSide;
  floor2Material.depthWrite = true;
  // floor2はステンシルに書き込まない（shadowPlaneはfloor1のステンシルのみ使用）
  floor2Plane = new THREE.Mesh(floor2Geometry, floor2Material);
  floor2Plane.rotation.x = -Math.PI / 2;
  floor2Plane.position.y = -49.9;
  floor2Plane.renderOrder = 0;
  floor2Plane.visible = false;
  floor2Plane.castShadow = true;
  floor2Plane.customDepthMaterial = createChromaKeyDepthMaterial();
  scene.add(floor2Plane);

  // 床3画像用平面（床の少し上に配置）
  const floor3Geometry = new THREE.PlaneGeometry(300, 300, 64, 64);
  const floor3Material = createChromaKeyMaterial(1);
  floor3Material.side = THREE.FrontSide;
  floor3Material.shadowSide = THREE.DoubleSide;
  floor3Material.depthWrite = true;
  // floor3はステンシルに書き込まない（shadowPlaneはfloor1のステンシルのみ使用）
  floor3Plane = new THREE.Mesh(floor3Geometry, floor3Material);
  floor3Plane.rotation.x = -Math.PI / 2;
  floor3Plane.position.y = -49.8;
  floor3Plane.renderOrder = 0;
  floor3Plane.visible = false;
  floor3Plane.castShadow = true;
  floor3Plane.customDepthMaterial = createChromaKeyDepthMaterial();
  scene.add(floor3Plane);

  // 水面プレーン（2層構成: ティント層 + サーフェス層）
  const waterGeometry = new THREE.PlaneGeometry(500, 500, 128, 128);

  // ティント層（乗算ブレンド: 背景を水色に染める）
  waterTintMaterial = createWaterTintMaterial();
  waterTintPlane = new THREE.Mesh(waterGeometry, waterTintMaterial);
  waterTintPlane.rotation.x = -Math.PI / 2;
  waterTintPlane.position.y = -49.5;
  waterTintPlane.renderOrder = 1;
  waterTintPlane.visible = false;
  scene.add(waterTintPlane);

  // サーフェス層（通常アルファブレンド: 不透明な水面）
  waterSurfaceMaterial = createWaterSurfaceMaterial();
  waterSurfacePlane = new THREE.Mesh(waterGeometry, waterSurfaceMaterial);
  waterSurfacePlane.rotation.x = -Math.PI / 2;
  waterSurfacePlane.position.y = -49.5;
  waterSurfacePlane.renderOrder = 2;
  waterSurfacePlane.visible = false;
  scene.add(waterSurfacePlane);

  // 水面用の影受けプレーン（既存shadowPlaneとは独立、影パネルと連動）
  waterShadowPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(500, 500),
    new THREE.ShadowMaterial({ opacity: 0.3, depthWrite: false })
  );
  waterShadowPlane.rotation.x = -Math.PI / 2;
  waterShadowPlane.position.y = -49.4;
  waterShadowPlane.receiveShadow = true;
  waterShadowPlane.visible = false;
  scene.add(waterShadowPlane);

  // 雲の影メッシュ（床面max10000対応、曲率用256x256セグメント）
  const cloudGeom = new THREE.PlaneGeometry(10000, 10000, 256, 256);
  const cloudMat = new THREE.MeshBasicMaterial({
    map: generateCloudTexture(),
    transparent: true,
    opacity: 0,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -4,
    polygonOffsetUnit: -4,
  });
  cloudShadowPlane = new THREE.Mesh(cloudGeom, cloudMat);
  cloudShadowPlane.rotation.x = -Math.PI / 2;
  cloudShadowPlane.position.y = -49.5;
  cloudShadowPlane.renderOrder = 1;
  cloudShadowPlane.visible = false;
  scene.add(cloudShadowPlane);

  // 左側面画像用平面（初期は非表示）- 幕に垂直な壁
  const leftWallGeometry = new THREE.PlaneGeometry(300, 300);
  const leftWallMaterial = createChromaKeyMaterial(1);
  leftWallPlane = new THREE.Mesh(leftWallGeometry, leftWallMaterial);
  // 回転なし = XY平面に平行 = 幕に垂直
  // 床基準でY位置を設定（下端が床に接する）
  const initialWallSize = 300;
  leftWallPlane.position.set(0, floorY + initialWallSize / 2, -150); // 手前側に配置
  leftWallPlane.renderOrder = 10;
  leftWallPlane.visible = false;
  leftWallPlane.castShadow = true;
  leftWallPlane.customDepthMaterial = createChromaKeyDepthMaterial();
  scene.add(leftWallPlane);

  // 右側面画像用平面（初期は非表示）- 幕に垂直な壁（奥側）
  const rightWallGeometry = new THREE.PlaneGeometry(300, 300);
  const rightWallMaterial = createChromaKeyMaterial(1);
  rightWallPlane = new THREE.Mesh(rightWallGeometry, rightWallMaterial);
  rightWallPlane.position.set(0, floorY + initialWallSize / 2, 150); // 奥側に配置
  rightWallPlane.renderOrder = 10;
  rightWallPlane.visible = false;
  rightWallPlane.castShadow = true;
  rightWallPlane.customDepthMaterial = createChromaKeyDepthMaterial();
  scene.add(rightWallPlane);

  // センター画像用平面（初期は非表示）- 幕に垂直な壁（中央）
  const centerWallGeometry = new THREE.PlaneGeometry(300, 300);
  const centerWallMaterial = createChromaKeyMaterial(1);
  centerWallPlane = new THREE.Mesh(centerWallGeometry, centerWallMaterial);
  centerWallPlane.position.set(0, floorY + initialWallSize / 2, 0); // センターに配置
  centerWallPlane.renderOrder = 10;
  centerWallPlane.visible = false;
  centerWallPlane.castShadow = true;
  centerWallPlane.customDepthMaterial = createChromaKeyDepthMaterial();
  scene.add(centerWallPlane);

  // 奥側画像用平面（初期は非表示）- タイムライン幕と平行（YZ平面）
  const backWallGeometry = new THREE.PlaneGeometry(300, 300);
  const backWallMaterial = createChromaKeyMaterial(1);
  backWallPlane = new THREE.Mesh(backWallGeometry, backWallMaterial);
  backWallPlane.rotation.y = 90 * Math.PI / 180; // デフォルト90°（スライダーで制御）
  backWallPlane.position.set(0, floorY + initialWallSize / 2, 0); // スライダーデフォルトに合わせる
  backWallPlane.renderOrder = 10;
  backWallPlane.visible = false;
  backWallPlane.castShadow = true;
  backWallPlane.customDepthMaterial = createChromaKeyDepthMaterial();
  scene.add(backWallPlane);

  // パネル5画像用平面（初期は非表示）
  const panel5WallGeometry = new THREE.PlaneGeometry(300, 300);
  const panel5WallMaterial = createChromaKeyMaterial(1);
  panel5WallPlane = new THREE.Mesh(panel5WallGeometry, panel5WallMaterial);
  panel5WallPlane.rotation.y = 0;
  panel5WallPlane.position.set(0, floorY + initialWallSize / 2, 0);
  panel5WallPlane.renderOrder = 10;
  panel5WallPlane.visible = false;
  panel5WallPlane.castShadow = true;
  panel5WallPlane.customDepthMaterial = createChromaKeyDepthMaterial();
  scene.add(panel5WallPlane);

  // パネル6画像用平面（初期は非表示）
  const panel6WallGeometry = new THREE.PlaneGeometry(300, 300);
  const panel6WallMaterial = createChromaKeyMaterial(1);
  panel6WallPlane = new THREE.Mesh(panel6WallGeometry, panel6WallMaterial);
  panel6WallPlane.rotation.y = 0;
  panel6WallPlane.position.set(0, floorY + initialWallSize / 2, 0);
  panel6WallPlane.renderOrder = 10;
  panel6WallPlane.visible = false;
  panel6WallPlane.castShadow = true;
  panel6WallPlane.customDepthMaterial = createChromaKeyDepthMaterial();
  scene.add(panel6WallPlane);

  // 影受け用カスタムプレーン（床の直上に配置）- セグメント分割で曲面対応
  // 床テクスチャの透明/クロマキー領域では影を描画しない
  const shadowGeom = new THREE.PlaneGeometry(3000, 3000, 64, 64);
  const shadowMat = createShadowPlaneMaterial();
  shadowPlane = new THREE.Mesh(shadowGeom, shadowMat);
  shadowPlane.rotation.x = -Math.PI / 2;
  shadowPlane.position.y = floorY + 0.5;
  shadowPlane.renderOrder = 2;
  shadowPlane.receiveShadow = true;
  shadowPlane.visible = false; // デフォルトOFF
  scene.add(shadowPlane);

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
  noteGroup = new THREE.Group();
  scene.add(noteGroup);
  noteGroup.add(timelinePlane);

  // ウィンドウリサイズ対応
  window.addEventListener('resize', onWindowResize);
  // 画面回転時はCSSメディアクエリ反映後にリサイズ
  window.addEventListener('orientationchange', () => {
    setTimeout(onWindowResize, 200);
  });
  // ページロード完了時にもレイアウト更新（横向きリロード対応）
  window.addEventListener('load', () => {
    syncImagePanelHeight();
    syncDisplayPanelHeight();
    updateViewerSideControlsWidth();
    setTimeout(() => { syncImagePanelHeight(); syncDisplayPanelHeight(); updateViewerSideControlsWidth(); }, 500);
  });
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

// 画像パネルの高さに合わせてキャンバスコンテナのtopを自動調整
function syncImagePanelHeight() {
  const imagePanel = document.getElementById('image-panel');
  const canvasContainer = document.getElementById('canvas-container');
  if (!imagePanel || !canvasContainer) return;
  const panelBottom = imagePanel.offsetTop + imagePanel.offsetHeight;
  canvasContainer.style.top = panelBottom + 'px';
}

// 表示設定パネルの高さに合わせてキャンバスコンテナのbottomを自動調整
function syncDisplayPanelHeight() {
  const displayPanel = document.getElementById('display-settings-panel');
  const canvasContainer = document.getElementById('canvas-container');
  if (!displayPanel || !canvasContainer) return;
  canvasContainer.style.bottom = displayPanel.offsetHeight + 'px';
}

// 影受けプレーンの表示を更新（影ON/OFF＋床1の有無を考慮）
// shadowPlaneは床1の高さに配置されるため、床1のvisibilityのみに連動
function updateShadowPlaneVisibility() {
  const floor1Visible = floorPlane && floorPlane.visible;
  if (shadowPlane) shadowPlane.visible = shadowEnabled && floor1Visible;
  if (waterShadowPlane) waterShadowPlane.visible = shadowEnabled && waterSurfaceEnabled;
}

// ビューワー用: DOM値から壁面パネルの3Dオブジェクトを一括同期
// （エディターではイベントリスナーが処理するが、ビューワーにはないため）
function syncWallSettingsFromDOM() {
  // 壁面パネル: 位置・回転・透明度・反転
  const wallPanels = [
    { prefix: 'leftWall', plane: leftWallPlane, defaultZ: -150, defaultRotY: 0 },
    { prefix: 'rightWall', plane: rightWallPlane, defaultZ: 150, defaultRotY: 0 },
    { prefix: 'centerWall', plane: centerWallPlane, defaultZ: 0, defaultRotY: 0 },
    { prefix: 'backWall', plane: backWallPlane, defaultZ: 0, defaultRotY: 90 },
    { prefix: 'panel5Wall', plane: panel5WallPlane, defaultZ: 0, defaultRotY: 0 },
    { prefix: 'panel6Wall', plane: panel6WallPlane, defaultZ: 0, defaultRotY: 0 },
  ];
  wallPanels.forEach(({ prefix, plane, defaultZ, defaultRotY }) => {
    if (!plane) return;
    // X位置
    const xVal = parseFloat(document.getElementById(prefix + 'ImageX')?.value || 0);
    plane.position.x = xVal;
    // Z位置
    const zVal = parseFloat(document.getElementById(prefix + 'ImageZ')?.value || defaultZ);
    plane.position.z = zVal;
    // Y位置（サイズ基準で床に接する高さ + 高度オフセット）
    const currentSize = plane.geometry.parameters.height;
    const yOffset = parseFloat(document.getElementById(prefix + 'ImageY')?.value || 0);
    plane.position.y = floorY + currentSize / 2 + yOffset;
    // Y回転
    const rotY = parseFloat(document.getElementById(prefix + 'ImageRotY')?.value || defaultRotY);
    plane.rotation.y = rotY * Math.PI / 180;
    // 透明度
    const opacityVal = parseFloat(document.getElementById(prefix + 'ImageOpacity')?.value || 1);
    if (plane.material?.uniforms?.opacity) {
      plane.material.uniforms.opacity.value = opacityVal;
      syncDepthMaterialUniforms(plane);
    }
    // 反転
    const flipEl = document.getElementById(prefix + 'ImageFlip');
    if (flipEl) {
      plane.scale.x = flipEl.checked ? -1 : 1;
    }
  });

  // 床パネル: 透明度・反転
  const floorPanels = [
    { prefix: 'floor', plane: floorPlane },
    { prefix: 'floor2', plane: floor2Plane },
    { prefix: 'floor3', plane: floor3Plane },
  ];
  floorPanels.forEach(({ prefix, plane }) => {
    if (!plane) return;
    const opacityVal = parseFloat(document.getElementById(prefix + 'ImageOpacity')?.value || 1);
    if (plane.material?.uniforms?.opacity) {
      plane.material.uniforms.opacity.value = opacityVal;
      syncDepthMaterialUniforms(plane);
    }
    const flipEl = document.getElementById(prefix + 'ImageFlip');
    if (flipEl) {
      plane.scale.x = flipEl.checked ? -1 : 1;
    }
  });
}

function onWindowResize() {
  syncImagePanelHeight();
  syncDisplayPanelHeight();
  const container = document.getElementById('canvas-container');
  const { width, height } = calculateCanvasSize(container);

  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
  if (composer) composer.setSize(width, height);
  updateCreditsPosition();
  updateViewerSideControlsWidth();
}

// モバイル横向き: スライダーパネルを動画の左端まで伸ばす
function updateViewerSideControlsWidth() {
  const sideControls = document.querySelector('.viewer-side-controls');
  if (!sideControls) return;
  const isMobileLandscape = window.matchMedia('(max-width: 768px) and (orientation: landscape)').matches;
  if (!isMobileLandscape) {
    sideControls.style.width = '';
    return;
  }
  // DOM・レンダラーに依存せず、画面サイズとアスペクト比から計算
  const baseLeft = 140;
  const barHeight = 40;
  const containerWidth = window.innerWidth - baseLeft;
  const containerHeight = window.innerHeight - barHeight;
  let canvasWidth = containerWidth;
  if (aspectRatioMode === '16:9' || aspectRatioMode === '9:16') {
    const targetAspect = aspectRatioMode === '16:9' ? 16 / 9 : 9 / 16;
    const containerAspect = containerWidth / containerHeight;
    if (containerAspect > targetAspect) {
      canvasWidth = containerHeight * targetAspect;
    }
  }
  const videoLeft = baseLeft + (containerWidth - canvasWidth);
  sideControls.style.width = Math.max(baseLeft, videoLeft) + 'px';
}

// クレジットオーバーレイを描画エリア（canvas）の左下に合わせる
function updateCreditsPosition() {
  const overlay = document.getElementById('credits-overlay');
  if (!overlay || !renderer) return;
  const canvas = renderer.domElement;
  const container = canvas.parentElement;
  if (!container) return;
  const canvasLeft = canvas.offsetLeft;
  const canvasBottom = container.clientHeight - (canvas.offsetTop + canvas.clientHeight);
  overlay.style.left = (canvasLeft + 20) + 'px';
  const isMobileLandscape = window.innerHeight < 500 && window.innerWidth > window.innerHeight;
  const extraBottom = isMobileLandscape ? 40 : 0;
  overlay.style.bottom = (canvasBottom + 20 + extraBottom) + 'px';
}

// ============================================
// カラーピッカー色相保持（無彩色で色相が失われる問題の回避）
// ============================================
function initColorPickerHueFix() {
  function hexToHSL(hex) {
    const r = parseInt(hex.slice(1,3),16)/255, g = parseInt(hex.slice(3,5),16)/255, b = parseInt(hex.slice(5,7),16)/255;
    const max = Math.max(r,g,b), min = Math.min(r,g,b);
    let h = 0, s = 0, l = (max+min)/2;
    if (max !== min) {
      const d = max-min;
      s = l > 0.5 ? d/(2-max-min) : d/(max+min);
      if (max===r) h = ((g-b)/d+(g<b?6:0))/6;
      else if (max===g) h = ((b-r)/d+2)/6;
      else h = ((r-g)/d+4)/6;
    }
    return { h: h*360, s: s*100, l: l*100 };
  }
  function hslToHex(h, s, l) {
    s /= 100; l /= 100;
    const a = s * Math.min(l, 1-l);
    const f = n => {
      const k = (n + h/30) % 12;
      const c = l - a * Math.max(Math.min(k-3, 9-k, 1), -1);
      return Math.round(255*c).toString(16).padStart(2, '0');
    };
    return `#${f(0)}${f(8)}${f(4)}`;
  }
  document.querySelectorAll('input[type="color"]').forEach(input => {
    // 初期値から色相・彩度を取得
    const initHSL = hexToHSL(input.value);
    input._lastHue = initHSL.s > 1 ? initHSL.h : 0;
    input._lastSat = initHSL.s;
    // 色変更時に色相・彩度を記憶
    input.addEventListener('input', () => {
      const { h, s } = hexToHSL(input.value);
      if (s > 1) {
        input._lastHue = h;
        input._lastSat = s;
      }
    });
    // ピッカーを開く前に無彩色を近似色+色相に置換
    input.addEventListener('click', function() {
      const { s, l } = hexToHSL(this.value);
      if (s < 1) {
        // 無彩色: 微量の彩度を注入して色相を保持
        const safeSat = Math.max(this._lastSat, 2);
        const safeL = Math.min(Math.max(l, 1), 99);
        this.value = hslToHex(this._lastHue, safeSat, safeL);
      }
    });

    // chroma-key-row内のカラーピッカーはコード表示をスキップ（スペース不足）
    if (input.closest('.chroma-key-row')) return;

    // カラーコード表示 + コピーボタンを注入
    const wrapper = document.createElement('span');
    wrapper.style.cssText = 'display:inline-flex;align-items:center;gap:2px;margin-left:4px;';
    const codeSpan = document.createElement('span');
    codeSpan.textContent = input.value;
    codeSpan.style.cssText = 'font-size:10px;font-family:monospace;color:#ccc;user-select:all;min-width:58px;';
    const copyBtn = document.createElement('button');
    copyBtn.textContent = '\u{1F4CB}';
    copyBtn.title = 'コピー';
    copyBtn.style.cssText = 'background:none;border:none;cursor:pointer;padding:0 2px;font-size:11px;line-height:1;opacity:0.6;';
    copyBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      navigator.clipboard.writeText(input.value).then(() => {
        copyBtn.textContent = '\u2713';
        setTimeout(() => { copyBtn.textContent = '\u{1F4CB}'; }, 1000);
      });
    });
    wrapper.appendChild(codeSpan);
    wrapper.appendChild(copyBtn);
    input.insertAdjacentElement('afterend', wrapper);
    // 色変更時にコード更新
    input.addEventListener('input', () => { codeSpan.textContent = input.value; });
    input.addEventListener('change', () => { codeSpan.textContent = input.value; });
  });
}

// ============================================
// エフェクト同期ヘルパー
// ============================================
function syncSelectableEffect(effectName) {
  const effect = effects[effectName];
  const intensity = effect.intensity;
  const isBass = effect.trigger === 'bass';
  const isTempo = effect.trigger === 'tempo';
  const enabled = intensity > 0;

  switch (effectName) {
    case 'cameraShake':
      // バスドラ用
      cameraShakeEnabled = isBass && enabled;
      cameraShakeIntensity = intensity * 15;
      // テンポ用
      beatEffects.cameraVibration.enabled = isTempo && enabled;
      beatEffects.cameraVibration.intensity = intensity * 5;
      break;
    case 'cameraZoom':
      // テンポ用のみ（バスドラでも同じ処理を使用）
      beatEffects.cameraZoom.enabled = enabled;
      beatEffects.cameraZoom.intensity = intensity * 0.1;
      beatEffects.cameraZoom.trigger = effect.trigger;
      break;
    case 'flash':
      // テンポ用
      beatEffects.beatFlash.enabled = isTempo && enabled;
      beatEffects.beatFlash.intensity = intensity * 0.8;
      // バスドラ用（画面フラッシュ）
      effects.flash.bassEnabled = isBass && enabled;
      break;
    case 'blur':
      // バスドラ用
      blurEffectEnabled = isBass && enabled;
      blurEffectIntensity = intensity * 15;
      // テンポ用
      beatEffects.beatBlur.enabled = isTempo && enabled;
      beatEffects.beatBlur.intensity = intensity * 6;
      break;
    case 'crack':
      beatEffects.crack.enabled = enabled;
      beatEffects.crack.intensity = intensity;
      beatEffects.crack.trigger = effect.trigger;
      break;
    case 'glitch':
      beatEffects.glitch.enabled = enabled;
      beatEffects.glitch.intensity = intensity;
      beatEffects.glitch.trigger = effect.trigger;
      break;
  }
}

// ============================================
// 背景グラデーション生成・復元
// ============================================
function createBackgroundGradientTexture(topHex, bottomHex, midpoint = 0.5) {
  const canvas = document.createElement('canvas');
  canvas.width = 2;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createLinearGradient(0, 0, 0, 512);
  const topColor = new THREE.Color(topHex);
  const bottomColor = new THREE.Color(bottomHex);
  const blended = topColor.clone().lerp(bottomColor, 0.5);
  gradient.addColorStop(0, topHex);
  gradient.addColorStop(midpoint, '#' + blended.getHexString());
  gradient.addColorStop(1, bottomHex);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 2, 512);
  return new THREE.CanvasTexture(canvas);
}

function updateAndStoreBackground() {
  const topColor = document.getElementById('bgColorTop').value;
  const bottomColor = document.getElementById('bgColorBottom').value;
  const midpointEl = document.getElementById('bgGradientMidpoint');
  const midpoint = midpointEl ? parseInt(midpointEl.value) / 100 : 0.5;
  userBackgroundTexture = createBackgroundGradientTexture(topColor, bottomColor, midpoint);
  scene.background = userBackgroundTexture;
}

function restoreUserBackground() {
  if (userBackgroundTexture) {
    scene.background = userBackgroundTexture;
  }
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
      document.getElementById('midiClearBtn').style.display = '';
      if (window.presetManager) window.presetManager.handleFileUpload(file, 'midi');
      await loadMidi(file);
      e.target.value = '';
    }
  });

  // MIDIクリアボタン
  document.getElementById('midiClearBtn').addEventListener('click', (e) => {
    e.stopPropagation();
    clearMidi();
    midiInput.value = '';
  });

  // 再生コントロール
  document.getElementById('playBtn').addEventListener('click', togglePlay);
  document.getElementById('stopBtn').addEventListener('click', stop);
  const editorResetBtn = document.getElementById('resetBtn');
  if (editorResetBtn) editorResetBtn.addEventListener('click', reset);
  const rewBtn = document.getElementById('rewBtn');
  const ffBtn = document.getElementById('ffBtn');
  if (rewBtn) rewBtn.addEventListener('click', () => seekTo(state.currentTime - 10));
  if (ffBtn) ffBtn.addEventListener('click', () => seekTo(state.currentTime + 10));

  // エディタ用シークバー
  const editorSeek = document.getElementById('editorSeek');
  const editorDuration = document.getElementById('editorDuration');
  let editorIsSeeking = false;
  if (editorSeek) {
    editorSeek.addEventListener('mousedown', () => { editorIsSeeking = true; });
    editorSeek.addEventListener('touchstart', () => { editorIsSeeking = true; });
    editorSeek.addEventListener('input', () => {
      if (state.duration > 0) {
        seekTo((parseFloat(editorSeek.value) / 100) * state.duration);
      }
    });
    editorSeek.addEventListener('mouseup', () => { editorIsSeeking = false; });
    editorSeek.addEventListener('touchend', () => { editorIsSeeking = false; });
  }

  // ループ終点
  const loopEndSeek = document.getElementById('loopEndSeek');
  const loopEndEnabled = document.getElementById('loopEndEnabled');
  const loopEndTime = document.getElementById('loopEndTime');

  function updateLoopEndDisplay() {
    const m = Math.floor(state.loopEndTime / 60);
    const sec = (state.loopEndTime % 60).toFixed(1);
    if (loopEndTime) loopEndTime.textContent = `${m}:${sec.padStart(4, '0')}`;
    if (loopEndSeek && state.duration > 0) {
      loopEndSeek.value = (state.loopEndTime / state.duration) * 1000;
    }
  }

  if (loopEndSeek) {
    loopEndSeek.addEventListener('input', () => {
      if (state.duration > 0) {
        state.loopEndTime = (parseFloat(loopEndSeek.value) / 1000) * state.duration;
        updateLoopEndDisplay();
      }
    });
  }
  if (loopEndEnabled) {
    loopEndEnabled.addEventListener('change', () => {
      state.loopEndEnabled = loopEndEnabled.checked;
      if (loopEndEnabled.checked && state.duration > 0) {
        state.loopEndTime = (parseFloat(loopEndSeek.value) / 1000) * state.duration;
        updateLoopEndDisplay();
      } else {
        if (loopEndTime) loopEndTime.textContent = '-:--.--';
      }
    });
  }

  const loopEndDown = document.getElementById('loopEndDown');
  const loopEndUp = document.getElementById('loopEndUp');
  if (loopEndDown) {
    loopEndDown.addEventListener('click', () => {
      if (state.duration > 0) {
        state.loopEndTime = Math.max(0, state.loopEndTime - 0.1);
        updateLoopEndDisplay();
      }
    });
  }
  if (loopEndUp) {
    loopEndUp.addEventListener('click', () => {
      if (state.duration > 0) {
        state.loopEndTime = Math.min(state.duration, state.loopEndTime + 0.1);
        updateLoopEndDisplay();
      }
    });
  }

  // ループ始点（2周目以降の開始位置）
  const loopStartSeek = document.getElementById('loopStartSeek');
  const loopStartEnabled = document.getElementById('loopStartEnabled');
  const loopStartTime = document.getElementById('loopStartTime');

  function updateLoopStartDisplay() {
    const m = Math.floor(state.loopStartTime / 60);
    const sec = (state.loopStartTime % 60).toFixed(1);
    if (loopStartTime) loopStartTime.textContent = `${m}:${sec.padStart(4, '0')}`;
    if (loopStartSeek && state.duration > 0) {
      loopStartSeek.value = (state.loopStartTime / state.duration) * 1000;
    }
  }

  if (loopStartSeek) {
    loopStartSeek.addEventListener('input', () => {
      if (state.duration > 0) {
        state.loopStartTime = (parseFloat(loopStartSeek.value) / 1000) * state.duration;
        updateLoopStartDisplay();
      }
    });
  }
  if (loopStartEnabled) {
    loopStartEnabled.addEventListener('change', () => {
      state.loopStartEnabled = loopStartEnabled.checked;
      if (loopStartEnabled.checked && state.duration > 0) {
        state.loopStartTime = (parseFloat(loopStartSeek.value) / 1000) * state.duration;
        updateLoopStartDisplay();
      } else {
        if (loopStartTime) loopStartTime.textContent = '-:--.--';
      }
    });
  }

  const loopStartDown = document.getElementById('loopStartDown');
  const loopStartUp = document.getElementById('loopStartUp');
  if (loopStartDown) {
    loopStartDown.addEventListener('click', () => {
      if (state.duration > 0) {
        state.loopStartTime = Math.max(0, state.loopStartTime - 0.1);
        updateLoopStartDisplay();
      }
    });
  }
  if (loopStartUp) {
    loopStartUp.addEventListener('click', () => {
      if (state.duration > 0) {
        state.loopStartTime = Math.min(state.duration, state.loopStartTime + 0.1);
        updateLoopStartDisplay();
      }
    });
  }

  // フェードアウト秒数スライダー
  const fadeOutSlider = document.getElementById('fadeOutDuration');
  const fadeOutValue = document.getElementById('fadeOutValue');
  if (fadeOutSlider) {
    fadeOutSlider.addEventListener('input', () => {
      fadeOutDuration = parseInt(fadeOutSlider.value) / 10;
      if (fadeOutValue) fadeOutValue.textContent = fadeOutDuration.toFixed(1) + 's';
    });
  }

  // エディタ用シークバー＋Duration更新ループ
  function updateEditorSeek() {
    if (editorSeek && !editorIsSeeking && state.duration > 0) {
      editorSeek.value = (state.currentTime / state.duration) * 100;
    }
    if (editorDuration && state.duration > 0) {
      const dm = Math.floor(state.duration / 60);
      const ds = Math.floor(state.duration % 60);
      editorDuration.textContent = `/ ${dm}:${ds.toString().padStart(2, '0')}`;
    }
    requestAnimationFrame(updateEditorSeek);
  }
  updateEditorSeek();

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
        document.getElementById('midiClearBtn').style.display = '';
        if (window.presetManager) window.presetManager.handleFileUpload(file, 'midi');
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
        document.getElementById('midiClearBtn').style.display = '';
        if (window.presetManager) window.presetManager.handleFileUpload(file, 'midi');
        await loadMidi(file);
      } else {
        console.warn('MIDIファイル (.mid, .midi) をドロップしてください');
      }
    }
  });

  // 音源ファイル選択
  const audioInput = document.getElementById('audioInput');
  const audioFileName = document.getElementById('audioFileName');

  audioFileName.addEventListener('click', () => audioInput.click());

  audioInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      audioFileName.textContent = file.name;
      document.getElementById('audioClearBtn').style.display = '';
      if (window.presetManager) window.presetManager.handleFileUpload(file, 'audio');
      loadAudio(file);
    }
    e.target.value = '';
  });

  // 音源クリアボタン
  document.getElementById('audioClearBtn').addEventListener('click', (e) => {
    e.stopPropagation();
    clearAudio();
    audioInput.value = '';
  });

  // 音源ドロップゾーン
  const audioDropZone = document.getElementById('audioDropZone');

  audioDropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
    audioDropZone.classList.add('drag-over');
  });

  audioDropZone.addEventListener('dragleave', (e) => {
    e.preventDefault();
    e.stopPropagation();
    audioDropZone.classList.remove('drag-over');
  });

  audioDropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    e.stopPropagation();
    audioDropZone.classList.remove('drag-over');

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('audio/')) {
        document.getElementById('audioFileName').textContent = file.name;
        document.getElementById('audioClearBtn').style.display = '';
        if (window.presetManager) window.presetManager.handleFileUpload(file, 'audio');
        loadAudio(file);
      } else {
        console.warn('音声ファイルをドロップしてください');
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
    CONFIG.noteOpacity = value;
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

  // 縦スケール
  const pitchScaleInput = document.getElementById('pitchScale');
  const pitchScaleValue = document.getElementById('pitchScaleValue');
  pitchScaleInput.addEventListener('input', (e) => {
    const value = parseFloat(e.target.value);
    pitchScaleValue.textContent = value;
    CONFIG.pitchScale = value;
    debouncedRebuildNotes();
  });

  // 高さオフセット
  document.getElementById('noteYOffset')?.addEventListener('input', (e) => {
    const value = parseFloat(e.target.value);
    document.getElementById('noteYOffsetValue').textContent = value;
    CONFIG.noteYOffset = value;
    debouncedRebuildNotes();
  });

  // ノート回転
  document.getElementById('noteFlowAngle')?.addEventListener('input', (e) => {
    const v = parseInt(e.target.value);
    document.getElementById('noteFlowAngleValue').textContent = v;
    noteFlowAngle = v;
    if (noteGroup) noteGroup.rotation.y = v * Math.PI / 180;
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

  bgColorTopInput.addEventListener('input', updateAndStoreBackground);
  bgColorBottomInput.addEventListener('input', updateAndStoreBackground);
  document.getElementById('bgGradientMidpoint')?.addEventListener('input', updateAndStoreBackground);

  // 初期グラデーションを適用
  updateAndStoreBackground();

  // 背景色上下入替ボタン
  const bgColorSwapBtn = document.getElementById('bgColorSwap');
  bgColorSwapBtn.addEventListener('click', () => {
    const topColor = bgColorTopInput.value;
    const bottomColor = bgColorBottomInput.value;
    bgColorTopInput.value = bottomColor;
    bgColorBottomInput.value = topColor;
    updateAndStoreBackground();
  });

  // 幕の色
  const timelineColorInput = document.getElementById('timelineColor');
  timelineColorInput.addEventListener('input', (e) => {
    const color = e.target.value;
    if (timelinePlane) {
      timelinePlane.material.color = new THREE.Color(color);
    }
  });

  // 幕のX位置
  const timelineXInput = document.getElementById('timelineX');
  const timelineXValue = document.getElementById('timelineXValue');
  if (timelineXInput) {
    timelineXInput.addEventListener('input', (e) => {
      const val = parseInt(e.target.value);
      if (timelineXValue) timelineXValue.textContent = val;
    });
  }

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

  // グリッド透明度
  const gridOpacityInput = document.getElementById('gridOpacity');
  const gridOpacityValue = document.getElementById('gridOpacityValue');
  gridOpacityInput.addEventListener('input', (e) => {
    settings.gridOpacity = parseFloat(e.target.value);
    gridOpacityValue.textContent = settings.gridOpacity.toFixed(1);
    if (gridHelper) {
      const mats = Array.isArray(gridHelper.material) ? gridHelper.material : [gridHelper.material];
      mats.forEach(mat => { mat.opacity = settings.gridOpacity; });
      gridHelper.visible = settings.gridOpacity > 0;
    }
  });

  // グリッド色
  const gridColorInput = document.getElementById('gridColor');
  gridColorInput.addEventListener('input', (e) => {
    settings.gridColor = e.target.value;
    if (gridHelper) {
      const color = new THREE.Color(settings.gridColor);
      const mats = Array.isArray(gridHelper.material) ? gridHelper.material : [gridHelper.material];
      mats.forEach(mat => { mat.color.set(color); });
    }
  });

  // グリッド大きさ
  const gridSizeInput = document.getElementById('gridSize');
  const gridSizeValue = document.getElementById('gridSizeValue');
  gridSizeInput.addEventListener('input', (e) => {
    settings.gridSize = parseInt(e.target.value);
    gridSizeValue.textContent = settings.gridSize;
    if (gridHelper) {
      const oldY = gridHelper.position.y;
      scene.remove(gridHelper);
      const color = new THREE.Color(settings.gridColor);
      gridHelper = new THREE.GridHelper(settings.gridSize, 50, color, color);
      gridHelper.position.y = oldY;
      const mats = Array.isArray(gridHelper.material) ? gridHelper.material : [gridHelper.material];
      mats.forEach(mat => {
        mat.transparent = true;
        mat.opacity = settings.gridOpacity;
      });
      gridHelper.visible = settings.gridOpacity > 0;
      scene.add(gridHelper);
    }
  });

  // クレジット表示
  const creditsOverlay = document.getElementById('credits-overlay');
  if (creditsOverlay) {
    [1, 2, 3, 4].forEach(i => {
      document.getElementById(`creditsLine${i}`)?.addEventListener('input', (e) => {
        const line = document.getElementById(`credits-line${i}`);
        if (line) {
          line.textContent = e.target.value;
          const parent = line.closest('.credits-has-prefix');
          if (parent) parent.classList.toggle('credits-visible', e.target.value.length > 0);
        }
      });
      document.getElementById(`creditsSize${i}`)?.addEventListener('input', (e) => {
        const line = document.getElementById(`credits-line${i}`);
        if (line) {
          const target = line.closest('.credits-line') || line;
          target.style.fontSize = e.target.value + 'px';
        }
      });
    });
    document.getElementById('creditsColor')?.addEventListener('input', (e) => {
      creditsOverlay.querySelectorAll('.credits-line').forEach(el => { el.style.color = e.target.value; });
    });
    document.getElementById('creditsOpacity')?.addEventListener('input', (e) => {
      const v = parseFloat(e.target.value);
      document.getElementById('creditsOpacityValue').textContent = v;
      creditsOverlay.querySelectorAll('.credits-line').forEach(el => { el.style.opacity = v; });
    });
  }

  // デュアルレンジスライダーの初期化
  initDualRangeSliders();

  // 中心点X（カメラと注視点を同時に移動、角度維持）
  const cameraTargetXInput = document.getElementById('cameraTargetX');
  const cameraTargetXValue = document.getElementById('cameraTargetXValue');
  let lastXOffset = 0;
  if (cameraTargetXInput) {
    cameraTargetXInput.addEventListener('input', (e) => {
      const value = parseFloat(e.target.value);
      cameraTargetXValue.textContent = value;
      if (camera && controls) {
        const delta = value - lastXOffset;
        camera.position.x += delta;
        controls.target.x += delta;
        lastXOffset = value;
        controls.update();
      }
    });
  }

  // 中心点Y（既存の注視点Y → 同方式に統一）
  const cameraTargetYInput = document.getElementById('cameraTargetY');
  const cameraTargetYValue = document.getElementById('cameraTargetYValue');
  let lastYOffset = 0;
  cameraTargetYInput.addEventListener('input', (e) => {
    const value = parseFloat(e.target.value);
    cameraTargetYValue.textContent = value;
    if (camera && controls) {
      const delta = value - lastYOffset;
      camera.position.y += delta;
      controls.target.y += delta;
      lastYOffset = value;
      controls.update();
    }
  });

  // 中心点Z（カメラと注視点を同時に移動、角度維持）
  const cameraTargetZInput = document.getElementById('cameraTargetZ');
  const cameraTargetZValue = document.getElementById('cameraTargetZValue');
  let lastZOffset = 0;
  if (cameraTargetZInput) {
    cameraTargetZInput.addEventListener('input', (e) => {
      const value = parseFloat(e.target.value);
      cameraTargetZValue.textContent = value;
      if (camera && controls) {
        const delta = value - lastZOffset;
        camera.position.z += delta;
        controls.target.z += delta;
        lastZOffset = value;
        controls.update();
      }
    });
  }

  // カメラ状態の復元関数（presetManagerから呼ばれる）
  window.restoreCameraState = function(posX, posY, posZ, targetX, targetY, targetZ, sliderX, sliderY, sliderZ) {
    if (!camera || !controls) return;
    controls.target.set(targetX, targetY, targetZ);
    camera.position.set(posX, posY, posZ);
    // スライダーUIとlastOffset変数を同期（スライダー値=オフセット）
    if (cameraTargetXInput) { cameraTargetXInput.value = sliderX; cameraTargetXValue.textContent = sliderX; lastXOffset = sliderX; }
    if (cameraTargetYInput) { cameraTargetYInput.value = sliderY; cameraTargetYValue.textContent = sliderY; lastYOffset = sliderY; }
    if (cameraTargetZInput) { cameraTargetZInput.value = sliderZ; cameraTargetZValue.textContent = sliderZ; lastZOffset = sliderZ; }
    controls.update();
  };

  // カメラ下限角度
  document.getElementById('cameraFloorLimit')?.addEventListener('input', (e) => {
    const value = parseFloat(e.target.value);
    const floorLimitVal = document.getElementById('cameraFloorLimitValue');
    if (floorLimitVal) floorLimitVal.textContent = value;
    // 0 = フリー(Math.PI), 100 = 水平まで(Math.PI/2)
    controls.maxPolarAngle = Math.PI - (value / 100) * (Math.PI / 2);
  });

  // === エフェクト設定（統合版）===

  // バスドラ専用: 幕フラッシュ
  document.getElementById('flashEffectIntensity').addEventListener('input', (e) => {
    const value = parseFloat(e.target.value);
    document.getElementById('flashEffectIntensityValue').textContent = value;
    effects.curtainFlash.intensity = value;
    // 後方互換
    flashEffectEnabled = value > 0;
    flashEffectIntensity = value;
  });

  // テンポ専用: カメラ回転
  document.getElementById('beatCameraRotation').addEventListener('input', (e) => {
    const value = parseFloat(e.target.value);
    document.getElementById('beatCameraRotationValue').textContent = value;
    effects.cameraRotation.intensity = value;
    beatEffects.cameraRotation.enabled = value > 0;
    beatEffects.cameraRotation.intensity = value * 0.15;
  });

  // テンポ専用: 背景パルス
  document.getElementById('beatBackgroundPulse').addEventListener('input', (e) => {
    const value = parseFloat(e.target.value);
    document.getElementById('beatBackgroundPulseValue').textContent = value;
    effects.backgroundPulse.intensity = value;
    beatEffects.backgroundPulse.enabled = value > 0;
    beatEffects.backgroundPulse.intensity = value * 0.5;
    if (value === 0) restoreUserBackground();
  });

  // テンポ専用: カラーシフト
  document.getElementById('beatColorShift').addEventListener('input', (e) => {
    const value = parseFloat(e.target.value);
    document.getElementById('beatColorShiftValue').textContent = value;
    effects.colorShift.intensity = value;
    beatEffects.colorShift.enabled = value > 0;
    beatEffects.colorShift.intensity = value * 60;
    if (value === 0) restoreUserBackground();
  });

  // テンポ専用: 空間パルス
  document.getElementById('beatSpacePulse').addEventListener('input', (e) => {
    const value = parseFloat(e.target.value);
    document.getElementById('beatSpacePulseValue').textContent = value;
    effects.spacePulse.intensity = value;
    beatEffects.spacePulse.enabled = value > 0;
    beatEffects.spacePulse.intensity = value * 0.1;
  });

  // テンポ専用: ストロボ
  document.getElementById('beatStrobe').addEventListener('input', (e) => {
    const value = parseFloat(e.target.value);
    document.getElementById('beatStrobeValue').textContent = value;
    effects.strobe.intensity = value;
    beatEffects.strobe.enabled = value > 0;
    beatEffects.strobe.intensity = value;
    if (value === 0) restoreUserBackground();
  });

  // === 選択式エフェクト（ラジオボタン）===

  // カメラ揺れ
  document.querySelectorAll('input[name="effectCameraShakeTrigger"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      effects.cameraShake.trigger = e.target.value;
      syncSelectableEffect('cameraShake');
    });
  });
  document.getElementById('effectCameraShake').addEventListener('input', (e) => {
    const value = parseFloat(e.target.value);
    document.getElementById('effectCameraShakeValue').textContent = value;
    effects.cameraShake.intensity = value;
    syncSelectableEffect('cameraShake');
  });

  // カメラズーム
  document.querySelectorAll('input[name="effectCameraZoomTrigger"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      effects.cameraZoom.trigger = e.target.value;
      syncSelectableEffect('cameraZoom');
    });
  });
  document.getElementById('effectCameraZoom').addEventListener('input', (e) => {
    const value = parseFloat(e.target.value);
    document.getElementById('effectCameraZoomValue').textContent = value;
    effects.cameraZoom.intensity = value;
    syncSelectableEffect('cameraZoom');
  });

  // フラッシュ（画面）
  document.querySelectorAll('input[name="effectFlashTrigger"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      effects.flash.trigger = e.target.value;
      syncSelectableEffect('flash');
    });
  });
  document.getElementById('effectFlash').addEventListener('input', (e) => {
    const value = parseFloat(e.target.value);
    document.getElementById('effectFlashValue').textContent = value;
    effects.flash.intensity = value;
    syncSelectableEffect('flash');
  });

  // ブラー
  document.querySelectorAll('input[name="effectBlurTrigger"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      effects.blur.trigger = e.target.value;
      syncSelectableEffect('blur');
    });
  });
  document.getElementById('effectBlur').addEventListener('input', (e) => {
    const value = parseFloat(e.target.value);
    document.getElementById('effectBlurValue').textContent = value;
    effects.blur.intensity = value;
    syncSelectableEffect('blur');
  });

  // ひび割れ
  document.querySelectorAll('input[name="effectCrackTrigger"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      effects.crack.trigger = e.target.value;
      syncSelectableEffect('crack');
    });
  });
  document.getElementById('effectCrack').addEventListener('input', (e) => {
    const value = parseFloat(e.target.value);
    document.getElementById('effectCrackValue').textContent = value;
    effects.crack.intensity = value;
    syncSelectableEffect('crack');
  });

  // グリッチ
  document.querySelectorAll('input[name="effectGlitchTrigger"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      effects.glitch.trigger = e.target.value;
      syncSelectableEffect('glitch');
    });
  });
  document.getElementById('effectGlitch').addEventListener('input', (e) => {
    const value = parseFloat(e.target.value);
    document.getElementById('effectGlitchValue').textContent = value;
    effects.glitch.intensity = value;
    syncSelectableEffect('glitch');
  });

  // スペクトラム スタイル変更 → 再構築
  document.getElementById('audioVisualizerStyle')?.addEventListener('change', () => {
    if (analyser) setupAudioVisualizer();
  });

  // スペクトラム スケール値表示
  document.getElementById('audioVisualizerScale')?.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value);
    const span = document.getElementById('audioVisualizerScaleValue');
    if (span) span.textContent = val;
  });

  // スペクトラム 半径値表示
  document.getElementById('audioVisualizerRadius')?.addEventListener('input', (e) => {
    const val = parseInt(e.target.value);
    const span = document.getElementById('audioVisualizerRadiusValue');
    if (span) span.textContent = val;
  });

  // スペクトラム 本数変更 → 再構築
  document.getElementById('audioVisualizerBars')?.addEventListener('input', (e) => {
    const val = parseInt(e.target.value);
    const span = document.getElementById('audioVisualizerBarsValue');
    if (span) span.textContent = val;
    if (analyser) {
      vizPrevValues = new Float32Array(val);
      setupAudioVisualizer();
    }
  });

  // スペクトラム 透明度変更
  document.getElementById('audioVisualizerOpacity')?.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value);
    const span = document.getElementById('audioVisualizerOpacityValue');
    if (span) span.textContent = val;
    if (vizBarsGroup) {
      vizBarsGroup.traverse(child => {
        if (child.isMesh) child.material.opacity = val;
      });
    }
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

  // エフェクトON/OFF（日差しパネル — viewerモードではDOM不在のためnullチェック）
  document.getElementById('bloomEnabled')?.addEventListener('change', (e) => {
    bloomEnabled = e.target.checked;
  });
  document.getElementById('flareEnabled')?.addEventListener('change', (e) => {
    flareEnabled = e.target.checked;
  });
  document.getElementById('cloudShadowEnabled')?.addEventListener('change', (e) => {
    cloudShadowEnabled = e.target.checked;
  });
  document.getElementById('cloudShadowContrast')?.addEventListener('input', (e) => {
    const v = parseFloat(e.target.value);
    document.getElementById('cloudShadowContrastValue').textContent = v;
    cloudShadowContrast = v;
  });
  // ブルーム強度
  document.getElementById('bloomStrength')?.addEventListener('input', (e) => {
    const v = parseFloat(e.target.value);
    document.getElementById('bloomStrengthValue').textContent = v;
    if (bloomPass) bloomPass.strength = v;
  });
  // ブルーム半径
  document.getElementById('bloomRadius')?.addEventListener('input', (e) => {
    const v = parseFloat(e.target.value);
    document.getElementById('bloomRadiusValue').textContent = v;
    if (bloomPass) bloomPass.radius = v;
  });
  // ノートブルーム on/off
  document.getElementById('noteBloomEnabled')?.addEventListener('change', (e) => {
    noteBloomEnabled = e.target.checked;
  });
  // ブルーム閾値（デュアルレンジスライダー）
  initBloomThresholdRange();
  // レンズフレア強度
  document.getElementById('lensFlareIntensity')?.addEventListener('input', (e) => {
    const v = parseFloat(e.target.value);
    document.getElementById('lensFlareIntensityValue').textContent = v;
    flareIntensity = v;
  });
  // レンズフレアにじみ
  document.getElementById('lensFlareBlur')?.addEventListener('input', (e) => {
    const v = parseFloat(e.target.value);
    document.getElementById('lensFlareBlurValue').textContent = v;
    flareBlur = v;
  });
  // 雲の影
  document.getElementById('cloudShadowIntensity')?.addEventListener('input', (e) => {
    const v = parseFloat(e.target.value);
    document.getElementById('cloudShadowIntensityValue').textContent = v;
    cloudShadowIntensity = v;
  });
  document.getElementById('cloudShadowSpeed')?.addEventListener('input', (e) => {
    const v = parseFloat(e.target.value);
    document.getElementById('cloudShadowSpeedValue').textContent = v;
    cloudShadowSpeed = v;
  });
  document.getElementById('cloudShadowScale')?.addEventListener('input', (e) => {
    const v = parseFloat(e.target.value);
    document.getElementById('cloudShadowScaleValue').textContent = v;
    cloudShadowScale = v;
  });
  document.getElementById('cloudShadowDirection')?.addEventListener('input', (e) => {
    const v = parseFloat(e.target.value);
    document.getElementById('cloudShadowDirectionValue').textContent = v;
    cloudShadowDirection = v;
  });
  // 光源位置X
  document.getElementById('sunPosX')?.addEventListener('input', (e) => {
    const v = parseFloat(e.target.value);
    document.getElementById('sunPosXValue').textContent = v;
    if (sunLight) sunLight.position.x = v;
  });
  // 光源位置Y
  document.getElementById('sunPosY')?.addEventListener('input', (e) => {
    const v = parseFloat(e.target.value);
    document.getElementById('sunPosYValue').textContent = v;
    if (sunLight) sunLight.position.y = v;
  });
  // 光源位置Z
  document.getElementById('sunPosZ')?.addEventListener('input', (e) => {
    const v = parseFloat(e.target.value);
    document.getElementById('sunPosZValue').textContent = v;
    if (sunLight) sunLight.position.z = v;
  });
  // 光源色・強度をShaderMaterial/パーティクルに一括反映
  let _sunLightColorValue = '#ffffff'; // カラーピッカーの値を保持
  function syncLightToMaterials() {
    if (!sunLight) return;
    const colorEnabled = document.getElementById('sunLightColorEnabled')?.checked;
    const sliderIntensity = parseFloat(document.getElementById('sunLightIntensity')?.value ?? 1);
    if (colorEnabled) {
      sunLight.color.set(_sunLightColorValue);
      sunLight.intensity = sliderIntensity;
    } else {
      sunLight.color.set(0xffffff);
      sunLight.intensity = 1.0;
    }
    const tint = new THREE.Color().copy(sunLight.color).multiplyScalar(sunLight.intensity);
    // chromaKeyMaterial（床・壁・スカイドーム）
    [floorPlane, floor2Plane, floor3Plane, leftWallPlane, rightWallPlane, centerWallPlane, backWallPlane, panel5WallPlane, panel6WallPlane, skyDome, innerSkyDome].forEach(p => {
      if (p?.material?.uniforms?.lightColor) p.material.uniforms.lightColor.value.copy(tint);
    });
    // 水面（両レイヤー）
    if (waterSurfaceMaterial?.uniforms?.lightColor) waterSurfaceMaterial.uniforms.lightColor.value.copy(tint);
    if (waterTintMaterial?.uniforms?.lightColor) waterTintMaterial.uniforms.lightColor.value.copy(tint);
    // 天候パーティクル
    if (weatherParticles?.material?.color) {
      const base = weatherParticles.geometry._isRain ? new THREE.Color(0xaaccff) : new THREE.Color(0xffffff);
      weatherParticles.material.color.copy(base).multiply(tint);
    }
  }
  // 光源色ON/OFF
  document.getElementById('sunLightColorEnabled')?.addEventListener('change', () => {
    syncLightToMaterials();
  });
  // 光源色
  document.getElementById('sunLightColor')?.addEventListener('input', (e) => {
    _sunLightColorValue = e.target.value;
    syncLightToMaterials();
  });
  // 光源強度
  document.getElementById('sunLightIntensity')?.addEventListener('input', (e) => {
    const v = parseFloat(e.target.value);
    document.getElementById('sunLightIntensityValue').textContent = v;
    if (sunLight) sunLight.intensity = v;
    syncLightToMaterials();
  });
  // 影ON/OFF
  document.getElementById('shadowEnabled')?.addEventListener('change', (e) => {
    shadowEnabled = e.target.checked;
    updateShadowPlaneVisibility();
  });
  // 影の環境（屋内/屋外）
  document.querySelectorAll('input[name="shadowEnvironment"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      const rgb = e.target.value === 'outdoor' ? [20 / 255, 30 / 255, 70 / 255] : [0, 0, 0];
      if (shadowPlane) shadowPlane.material.color.setRGB(...rgb);
      if (waterShadowPlane) waterShadowPlane.material.color.setRGB(...rgb);
    });
  });
  // 影の濃さ
  document.getElementById('shadowOpacity')?.addEventListener('input', (e) => {
    const v = parseFloat(e.target.value);
    document.getElementById('shadowOpacityValue').textContent = v;
    if (shadowPlane) shadowPlane.material.opacity = v;
    if (waterShadowPlane) waterShadowPlane.material.opacity = v;
  });
  // ノートの影
  document.getElementById('noteShadowEnabled')?.addEventListener('change', (e) => {
    const enabled = e.target.checked;
    state.noteObjects.forEach(mesh => { mesh.castShadow = enabled; });
  });
  // 天候エフェクト
  document.getElementById('weatherType')?.addEventListener('change', (e) => {
    weatherType = e.target.value;
    buildWeatherParticles();
  });
  document.getElementById('weatherAmount')?.addEventListener('input', (e) => {
    const v = parseInt(e.target.value);
    document.getElementById('weatherAmountValue').textContent = v;
    weatherAmount = v;
    buildWeatherParticles();
  });
  document.getElementById('weatherSpeed')?.addEventListener('input', (e) => {
    const v = parseFloat(e.target.value);
    document.getElementById('weatherSpeedValue').textContent = v;
    weatherSpeed = v;
  });
  document.getElementById('weatherSplash')?.addEventListener('input', (e) => {
    const v = parseInt(e.target.value);
    document.getElementById('weatherSplashValue').textContent = v;
    weatherSplash = v;
  });
  document.getElementById('weatherAngle')?.addEventListener('input', (e) => {
    const v = parseInt(e.target.value);
    document.getElementById('weatherAngleValue').textContent = v;
    weatherAngle = v;
    buildWeatherParticles();
  });
  document.getElementById('weatherWindDir')?.addEventListener('input', (e) => {
    const v = parseInt(e.target.value);
    document.getElementById('weatherWindDirValue').textContent = v;
    weatherWindDir = v;
    buildWeatherParticles();
  });
  document.getElementById('weatherSpread')?.addEventListener('input', (e) => {
    const v = parseInt(e.target.value);
    document.getElementById('weatherSpreadValue').textContent = v;
    weatherSpread = v;
    buildWeatherParticles();
  });

  // 雷パラメータ
  document.getElementById('lightningFrequency')?.addEventListener('input', (e) => {
    const v = parseInt(e.target.value);
    document.getElementById('lightningFrequencyValue').textContent = v;
    lightningFrequency = v;
    if (v === 0) {
      // 無効化時にボルトを全除去
      for (const bolt of lightningBolts) {
        scene.remove(bolt);
        bolt.geometry.dispose();
        bolt.material.dispose();
        if (bolt._glow) {
          scene.remove(bolt._glow);
          bolt._glow.geometry.dispose();
          bolt._glow.material.dispose();
        }
      }
      lightningBolts = [];
      lightningLastTime = 0;
    }
  });
  document.getElementById('lightningIntensity')?.addEventListener('input', (e) => {
    const v = parseFloat(e.target.value);
    document.getElementById('lightningIntensityValue').textContent = v;
    lightningIntensity = v;
  });
  document.getElementById('lightningColor')?.addEventListener('input', (e) => {
    lightningColor = e.target.value;
  });
  document.getElementById('lightningAmbientColor')?.addEventListener('input', (e) => {
    lightningAmbientColor = e.target.value;
  });
  document.getElementById('lightningFlashOpacity')?.addEventListener('input', (e) => {
    const v = parseFloat(e.target.value);
    document.getElementById('lightningFlashOpacityValue').textContent = v;
    lightningFlashOpacity = v;
  });
  document.getElementById('lightningFlashDecay')?.addEventListener('input', (e) => {
    const v = parseFloat(e.target.value);
    document.getElementById('lightningFlashDecayValue').textContent = v;
    lightningFlashDecay = v;
  });
  document.getElementById('lightningRandomness')?.addEventListener('input', (e) => {
    const v = parseFloat(e.target.value);
    document.getElementById('lightningRandomnessValue').textContent = v;
    lightningRandomness = v;
  });

  // 水面パラメータ
  // 両水面マテリアルのuniformを同時更新するヘルパー
  function setWaterUniform(name, value) {
    if (waterSurfaceMaterial) waterSurfaceMaterial.uniforms[name].value = value;
    if (waterTintMaterial) waterTintMaterial.uniforms[name].value = value;
  }
  function setWaterUniformColor(name, colorStr) {
    if (waterSurfaceMaterial) waterSurfaceMaterial.uniforms[name].value.set(colorStr);
    if (waterTintMaterial) waterTintMaterial.uniforms[name].value.set(colorStr);
  }
  function copyWaterUniformColor(name, color) {
    if (waterSurfaceMaterial) waterSurfaceMaterial.uniforms[name].value.copy(color);
    if (waterTintMaterial) waterTintMaterial.uniforms[name].value.copy(color);
  }

  document.getElementById('waterSurfaceEnabled')?.addEventListener('change', (e) => {
    waterSurfaceEnabled = e.target.checked;
    if (waterSurfacePlane) waterSurfacePlane.visible = waterSurfaceEnabled;
    if (waterTintPlane) waterTintPlane.visible = waterSurfaceEnabled;
    if (waterShadowPlane) waterShadowPlane.visible = waterSurfaceEnabled && shadowEnabled;
  });
  document.getElementById('waterSurfaceScale')?.addEventListener('input', (e) => {
    const v = parseFloat(e.target.value);
    document.getElementById('waterSurfaceScaleValue').textContent = v;
    waterSurfaceScale = v;
    setWaterUniform('scale', v);
  });
  document.getElementById('waterSurfaceSpeed')?.addEventListener('input', (e) => {
    const v = parseFloat(e.target.value);
    document.getElementById('waterSurfaceSpeedValue').textContent = v;
    waterSurfaceSpeed = v;
  });
  document.getElementById('waterSurfaceColor')?.addEventListener('input', (e) => {
    waterSurfaceColor = e.target.value;
    setWaterUniformColor('colorDeep', e.target.value);
  });
  document.getElementById('waterSurfaceColor2')?.addEventListener('input', (e) => {
    setWaterUniformColor('colorShallow', e.target.value);
  });
  document.getElementById('waterSurfaceOpacity')?.addEventListener('input', (e) => {
    const v = parseFloat(e.target.value);
    document.getElementById('waterSurfaceOpacityValue').textContent = v;
    waterSurfaceOpacity = v;
    setWaterUniform('opacity', v);
  });
  document.getElementById('waterSurfaceCaustic')?.addEventListener('input', (e) => {
    const v = parseFloat(e.target.value);
    document.getElementById('waterSurfaceCausticValue').textContent = v;
    waterSurfaceCaustic = v;
    setWaterUniform('causticIntensity', v);
  });
  document.getElementById('waterSurfaceWaveHeight')?.addEventListener('input', (e) => {
    const v = parseFloat(e.target.value);
    document.getElementById('waterSurfaceWaveHeightValue').textContent = v;
    setWaterUniform('waveHeight', v);
  });
  document.getElementById('waterSurfaceHeight')?.addEventListener('input', (e) => {
    const v = parseFloat(e.target.value);
    document.getElementById('waterSurfaceHeightValue').textContent = v;
    if (waterSurfacePlane) waterSurfacePlane.position.y = -50 + v;
    if (waterTintPlane) waterTintPlane.position.y = -50 + v;
    if (waterShadowPlane) waterShadowPlane.position.y = -50 + v + 0.1;
  });
  document.getElementById('waterSurfaceSize')?.addEventListener('input', (e) => {
    const v = parseFloat(e.target.value);
    document.getElementById('waterSurfaceSizeValue').textContent = v;
    const newGeom = new THREE.PlaneGeometry(v, v, 128, 128);
    if (waterSurfacePlane) {
      waterSurfacePlane.geometry.dispose();
      waterSurfacePlane.geometry = newGeom;
    }
    if (waterTintPlane) {
      waterTintPlane.geometry = newGeom;
    }
    if (waterShadowPlane) {
      waterShadowPlane.geometry.dispose();
      waterShadowPlane.geometry = new THREE.PlaneGeometry(v, v);
    }
    setWaterUniform('planeSize', v);
  });
  document.getElementById('waterSunPathIntensity')?.addEventListener('input', (e) => {
    const v = parseFloat(e.target.value);
    document.getElementById('waterSunPathIntensityValue').textContent = v;
    setWaterUniform('sunPathIntensity', v);
  });
  document.getElementById('waterSunPathSharpness')?.addEventListener('input', (e) => {
    const v = parseFloat(e.target.value);
    document.getElementById('waterSunPathSharpnessValue').textContent = v;
    setWaterUniform('sunPathSharpness', v);
  });
  document.getElementById('waterSunPathColor')?.addEventListener('input', (e) => {
    setWaterUniformColor('sunPathColor', e.target.value);
  });
  document.getElementById('waterSparkleIntensity')?.addEventListener('input', (e) => {
    const v = parseFloat(e.target.value);
    document.getElementById('waterSparkleIntensityValue').textContent = v;
    setWaterUniform('sparkleIntensity', v);
  });
  document.getElementById('waterSparkleRange')?.addEventListener('input', (e) => {
    const v = parseFloat(e.target.value);
    document.getElementById('waterSparkleRangeValue').textContent = v;
    setWaterUniform('sparkleRange', v);
  });

  // ============================================
  // 画像パネル系イベントリスナー（viewerモードではDOM不在のためスキップ）
  // ============================================
  if (document.getElementById('image-panel')) {

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
      if (window.presetManager) window.presetManager.handleFileUpload(file, 'skyDome');
      loadSkyDomeImage(file);
    }
    e.target.value = '';
  });

  // スカイドーム透明度
  const skyDomeOpacityInput = document.getElementById('skyDomeOpacity');
  const skyDomeOpacityValue = document.getElementById('skyDomeOpacityValue');
  skyDomeOpacityInput.addEventListener('input', (e) => {
    const value = parseFloat(e.target.value);
    skyDomeOpacityValue.textContent = value;
    if (skyDome) {
      skyDome.material.uniforms.opacity.value = value;
      syncDepthMaterialUniforms(skyDome);
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

  document.getElementById('skyDomeOffsetY')?.addEventListener('input', (e) => {
    const value = parseFloat(e.target.value);
    document.getElementById('skyDomeOffsetYValue').textContent = value;
    if (skyDome) skyDome.position.y = value;
  });

  // スカイドーム画像クリア
  const skyDomeImageClearBtn = document.getElementById('skyDomeImageClear');
  skyDomeImageClearBtn.addEventListener('click', () => {
    clearSkyDomeImage();
  });

  // スカイドーム動画一時停止/再生
  document.getElementById('skyDomeVideoPause')?.addEventListener('click', () => {
    if (skyDomeVideo) {
      if (skyDomeVideo.paused) {
        skyDomeVideo.play();
        document.getElementById('skyDomeVideoPreview')?.play();
        document.getElementById('skyDomeVideoPause').innerHTML = '<i class="fa-solid fa-pause"></i>';
      } else {
        skyDomeVideo.pause();
        document.getElementById('skyDomeVideoPreview')?.pause();
        document.getElementById('skyDomeVideoPause').innerHTML = '<i class="fa-solid fa-play"></i>';
      }
    }
  });

  // スカイドーム画像/動画ドラッグ&ドロップ
  const skyDomeDropZone = document.getElementById('skyDomeDropZone');
  setupDropZone(skyDomeDropZone, loadSkyDomeImage, true, 'skyDome'); // 動画も許可

  // ============================================
  // 近景スカイドームのイベントリスナー
  // ============================================

  const innerSkyImageLabel = document.getElementById('innerSkyImageLabel');
  const innerSkyImageInput = document.getElementById('innerSkyImageInput');
  if (innerSkyImageLabel && innerSkyImageInput) {
    innerSkyImageLabel.addEventListener('click', () => innerSkyImageInput.click());
  }

  document.getElementById('innerSkyImageInput')?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      if (window.presetManager) window.presetManager.handleFileUpload(file, 'innerSky');
      loadInnerSkyImage(file);
    }
    e.target.value = '';
  });

  document.getElementById('innerSkyOpacity')?.addEventListener('input', (e) => {
    const value = parseFloat(e.target.value);
    document.getElementById('innerSkyOpacityValue').textContent = value;
    if (innerSkyDome) {
      innerSkyDome.material.uniforms.opacity.value = value;
      syncDepthMaterialUniforms(innerSkyDome);
    }
  });

  document.getElementById('innerSkyRange')?.addEventListener('input', (e) => {
    const degrees = parseFloat(e.target.value);
    document.getElementById('innerSkyRangeValue').textContent = degrees;
    if (innerSkyDome) {
      innerSkyDome.geometry.dispose();
      const phiLength = (degrees / 180) * Math.PI;
      const phiStart = Math.PI - phiLength / 2;
      const radius = parseFloat(document.getElementById('innerSkyRadius').value);
      innerSkyDome.geometry = new THREE.SphereGeometry(radius, 64, 32, phiStart, phiLength);
    }
  });

  document.getElementById('innerSkyRadius')?.addEventListener('input', (e) => {
    const radius = parseFloat(e.target.value);
    document.getElementById('innerSkyRadiusValue').textContent = radius;
    if (innerSkyDome) {
      innerSkyDome.geometry.dispose();
      const degrees = parseFloat(document.getElementById('innerSkyRange').value);
      const phiLength = (degrees / 180) * Math.PI;
      const phiStart = Math.PI - phiLength / 2;
      innerSkyDome.geometry = new THREE.SphereGeometry(radius, 64, 32, phiStart, phiLength);
    }
  });

  document.getElementById('innerSkyOffsetY')?.addEventListener('input', (e) => {
    const value = parseFloat(e.target.value);
    document.getElementById('innerSkyOffsetYValue').textContent = value;
    if (innerSkyDome) innerSkyDome.position.y = value;
  });

  document.getElementById('innerSkyImageClear')?.addEventListener('click', () => {
    clearInnerSkyImage();
  });

  document.getElementById('innerSkyVideoPause')?.addEventListener('click', () => {
    if (innerSkyVideo) {
      if (innerSkyVideo.paused) {
        innerSkyVideo.play();
        document.getElementById('innerSkyVideoPreview')?.play();
        document.getElementById('innerSkyVideoPause').innerHTML = '<i class="fa-solid fa-pause"></i>';
      } else {
        innerSkyVideo.pause();
        document.getElementById('innerSkyVideoPreview')?.pause();
        document.getElementById('innerSkyVideoPause').innerHTML = '<i class="fa-solid fa-play"></i>';
      }
    }
  });

  const innerSkyDropZone = document.getElementById('innerSkyDropZone');
  if (innerSkyDropZone) setupDropZone(innerSkyDropZone, loadInnerSkyImage, true, 'innerSky');

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
      if (window.presetManager) window.presetManager.handleFileUpload(file, 'floor');
      loadFloorImage(file);
    }
    e.target.value = '';
  });

  // 床画像サイズ
  const floorImageSizeInput = document.getElementById('floorImageSize');
  const floorImageSizeValue = document.getElementById('floorImageSizeValue');
  floorImageSizeInput.addEventListener('input', (e) => {
    const value = parseFloat(e.target.value);
    floorImageSizeValue.textContent = value;
    updateFloorImageSize(value);
  });

  // 床高度
  document.getElementById('floorHeight')?.addEventListener('input', (e) => {
    const value = parseFloat(e.target.value);
    document.getElementById('floorHeightValue').textContent = value;
    if (floorPlane) floorPlane.position.y = value;
    if (floorCliffMesh) floorCliffMesh.position.y = value;
    if (shadowPlane) shadowPlane.position.y = value + 0.5;
    if (cloudShadowPlane) cloudShadowPlane.position.y = value + 0.5;
  });

  // 床画像透明度
  const floorImageOpacityInput = document.getElementById('floorImageOpacity');
  const floorImageOpacityValue = document.getElementById('floorImageOpacityValue');
  floorImageOpacityInput.addEventListener('input', (e) => {
    const value = parseFloat(e.target.value);
    floorImageOpacityValue.textContent = value;
    if (floorPlane) {
      floorPlane.material.uniforms.opacity.value = value;
      syncDepthMaterialUniforms(floorPlane);
    }
  });

  // 床画像クリア
  const floorImageClearBtn = document.getElementById('floorImageClear');
  floorImageClearBtn.addEventListener('click', () => {
    clearFloorImage();
  });

  // 床動画一時停止/再生
  document.getElementById('floorVideoPause')?.addEventListener('click', () => {
    if (floorVideo) {
      if (floorVideo.paused) {
        floorVideo.play();
        document.getElementById('floorVideoPreview')?.play();
        document.getElementById('floorVideoPause').innerHTML = '<i class="fa-solid fa-pause"></i>';
      } else {
        floorVideo.pause();
        document.getElementById('floorVideoPreview')?.pause();
        document.getElementById('floorVideoPause').innerHTML = '<i class="fa-solid fa-play"></i>';
      }
    }
  });

  // 床画像ドラッグ&ドロップ
  const floorDropZone = document.getElementById('floorDropZone');
  setupDropZone(floorDropZone, loadFloorImage, true, 'floor');

  // 床曲率
  const floorCurvatureInput = document.getElementById('floorCurvature');
  const floorCurvatureValueEl = document.getElementById('floorCurvatureValue');
  if (floorCurvatureInput) {
    floorCurvatureInput.addEventListener('input', (e) => {
      const value = parseFloat(e.target.value);
      floorCurvatureValueEl.textContent = value;
      floorCurvature = value;
      applyFloorCurvature();
    });
  }

  // 起伏設定モーダル
  function openDisplacementModal() {
    const bg = document.getElementById('displacementModalBg');
    const modal = document.getElementById('displacementModal');
    if (bg) bg.style.display = 'block';
    if (modal) modal.style.display = 'flex';
    document.getElementById('canvas-container')?.classList.add('preview-above-modal');
    loadHeightmapLibrary();
  }
  function closeDisplacementModal() {
    const bg = document.getElementById('displacementModalBg');
    const modal = document.getElementById('displacementModal');
    if (bg) bg.style.display = 'none';
    if (modal) modal.style.display = 'none';
    document.getElementById('canvas-container')?.classList.remove('preview-above-modal');
  }
  document.getElementById('floorDisplacementOpenBtn')?.addEventListener('click', openDisplacementModal);
  document.getElementById('displacementModalClose')?.addEventListener('click', closeDisplacementModal);
  document.getElementById('displacementModalBg')?.addEventListener('click', closeDisplacementModal);

  // モーダルドラッグ移動
  {
    const modal = document.getElementById('displacementModal');
    const content = modal?.querySelector('.modal-content');
    const handle = modal?.querySelector('h3');
    if (handle && content) {
      handle.style.cursor = 'grab';
      let dragging = false, startX, startY, origX, origY;
      handle.addEventListener('mousedown', (e) => {
        dragging = true;
        handle.style.cursor = 'grabbing';
        const rect = content.getBoundingClientRect();
        startX = e.clientX; startY = e.clientY;
        origX = rect.left; origY = rect.top;
        content.style.position = 'fixed';
        content.style.margin = '0';
        content.style.left = origX + 'px';
        content.style.top = origY + 'px';
        e.preventDefault();
      });
      document.addEventListener('mousemove', (e) => {
        if (!dragging) return;
        content.style.left = (origX + e.clientX - startX) + 'px';
        content.style.top = (origY + e.clientY - startY) + 'px';
      });
      document.addEventListener('mouseup', () => {
        if (!dragging) return;
        dragging = false;
        handle.style.cursor = 'grab';
      });
    }
  }

  // 床ハイトマップ（起伏マップ）
  const floorHeightmapLabel = document.getElementById('floorHeightmapLabel');
  const floorHeightmapInput = document.getElementById('floorHeightmapInput');
  floorHeightmapLabel?.addEventListener('click', () => floorHeightmapInput?.click());
  floorHeightmapInput?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    applyHeightmapFromFile(file);
    // ライブラリに保存
    if (window.presetManager?.saveMediaToLibrary) {
      window.presetManager.saveMediaToLibrary(file, 'heightmap').then(() => {
        loadHeightmapLibrary();
      }).catch(err => console.warn('heightmap library save failed:', err));
    }
  });
  document.getElementById('floorHeightmapClear')?.addEventListener('click', () => {
    floorDisplacementData = null;
    const input = document.getElementById('floorHeightmapInput');
    if (input) input.value = '';
    // セグメント数を戻す
    if (floorPlane) {
      const p = floorPlane.geometry.parameters;
      floorPlane.geometry.dispose();
      floorPlane.geometry = new THREE.PlaneGeometry(p.width, p.height, 64, 64);
    }
    applyFloorCurvature();
  });
  document.getElementById('floorDisplacementScale')?.addEventListener('input', (e) => {
    floorDisplacementScale = parseFloat(e.target.value);
    const v = e.target.value;
    const mainVal = document.getElementById('floorDisplacementScaleValue');
    const modalVal = document.getElementById('floorDisplacementScaleValueModal');
    if (mainVal) mainVal.textContent = v;
    if (modalVal) modalVal.textContent = v;
    applyFloorCurvature();
  });
  // 側面深さ
  document.getElementById('floorCliffDepth')?.addEventListener('input', (e) => {
    floorCliffDepth = parseFloat(e.target.value);
    const v = e.target.value;
    const mainVal = document.getElementById('floorCliffDepthValue');
    const modalVal = document.getElementById('floorCliffDepthValueModal');
    if (mainVal) mainVal.textContent = v;
    if (modalVal) modalVal.textContent = v;
    updateFloorCliffs();
  });
  // ハイトマップをファイル/Blobから適用する共通関数（グローバルからも使う）
  window.applyHeightmapFromFile = applyHeightmapFromFile;
  function applyHeightmapFromFile(fileOrBlob) {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      floorDisplacementData = ctx.getImageData(0, 0, img.width, img.height);
      if (floorPlane) {
        const p = floorPlane.geometry.parameters;
        floorPlane.geometry.dispose();
        floorPlane.geometry = new THREE.PlaneGeometry(p.width, p.height, 256, 256);
      }
      applyFloorCurvature();
      URL.revokeObjectURL(img.src);
    };
    img.src = URL.createObjectURL(fileOrBlob);
  }

  // ハイトマップライブラリの読み込み・表示
  async function loadHeightmapLibrary() {
    const grid = document.getElementById('heightmapLibraryGrid');
    if (!grid || !window.presetManager?.getAllMediaByType) return;
    grid.innerHTML = '';
    try {
      const items = await window.presetManager.getAllMediaByType('heightmap');
      if (items.length === 0) {
        grid.innerHTML = '<div class="media-grid-empty">ライブラリは空です</div>';
        return;
      }
      items.sort((a, b) => b.createdAt - a.createdAt);
      items.forEach(item => {
        const div = document.createElement('div');
        div.className = 'media-grid-item';
        const img = document.createElement('img');
        img.src = URL.createObjectURL(item.blob);
        img.style.height = '60px';
        const name = document.createElement('div');
        name.className = 'media-name';
        name.textContent = item.name;
        const delBtn = document.createElement('button');
        delBtn.className = 'media-delete-btn';
        delBtn.textContent = '×';
        delBtn.addEventListener('click', async (e) => {
          e.stopPropagation();
          await window.presetManager.deleteMediaFromLibrary(item.id);
          loadHeightmapLibrary();
        });
        div.appendChild(delBtn);
        div.appendChild(img);
        div.appendChild(name);
        div.addEventListener('click', () => {
          applyHeightmapFromFile(item.blob);
        });
        grid.appendChild(div);
      });
    } catch (err) {
      console.warn('heightmap library load failed:', err);
    }
  }

  // 床画像左右反転
  const floorImageFlipInput = document.getElementById('floorImageFlip');
  floorImageFlipInput.addEventListener('change', (e) => {
    if (floorPlane) {
      floorPlane.scale.x = e.target.checked ? -1 : 1;
    }
  });

  // ============================================
  // 床2画像のイベントリスナー
  // ============================================

  const floor2ImageLabel = document.getElementById('floor2ImageLabel');
  const floor2ImageInput = document.getElementById('floor2ImageInput');
  if (floor2ImageLabel && floor2ImageInput) {
    floor2ImageLabel.addEventListener('click', () => floor2ImageInput.click());
  }

  if (floor2ImageInput) {
    floor2ImageInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        if (window.presetManager) window.presetManager.handleFileUpload(file, 'floor2');
        loadFloor2Image(file);
      }
      e.target.value = '';
    });
  }

  const floor2ImageSizeInput = document.getElementById('floor2ImageSize');
  const floor2ImageSizeValue = document.getElementById('floor2ImageSizeValue');
  if (floor2ImageSizeInput) {
    floor2ImageSizeInput.addEventListener('input', (e) => {
      const value = parseFloat(e.target.value);
      floor2ImageSizeValue.textContent = value;
      updateFloor2ImageSize(value);
    });
  }

  const floor2HeightInput = document.getElementById('floor2Height');
  const floor2HeightValue = document.getElementById('floor2HeightValue');
  if (floor2HeightInput) {
    floor2HeightInput.addEventListener('input', (e) => {
      const value = parseFloat(e.target.value);
      floor2HeightValue.textContent = value;
      if (floor2Plane) floor2Plane.position.y = value;
      if (floor2CliffMesh) floor2CliffMesh.position.y = value;
    });
  }

  const floor2ImageOpacityInput = document.getElementById('floor2ImageOpacity');
  const floor2ImageOpacityValue = document.getElementById('floor2ImageOpacityValue');
  if (floor2ImageOpacityInput) {
    floor2ImageOpacityInput.addEventListener('input', (e) => {
      const value = parseFloat(e.target.value);
      floor2ImageOpacityValue.textContent = value;
      if (floor2Plane) {
        floor2Plane.material.uniforms.opacity.value = value;
        syncDepthMaterialUniforms(floor2Plane);
      }
    });
  }

  const floor2ImageClearBtn = document.getElementById('floor2ImageClear');
  if (floor2ImageClearBtn) {
    floor2ImageClearBtn.addEventListener('click', () => {
      clearFloor2Image();
    });
  }

  document.getElementById('floor2VideoPause')?.addEventListener('click', () => {
    if (floor2Video) {
      if (floor2Video.paused) {
        floor2Video.play();
        document.getElementById('floor2VideoPreview')?.play();
        document.getElementById('floor2VideoPause').innerHTML = '<i class="fa-solid fa-pause"></i>';
      } else {
        floor2Video.pause();
        document.getElementById('floor2VideoPreview')?.pause();
        document.getElementById('floor2VideoPause').innerHTML = '<i class="fa-solid fa-play"></i>';
      }
    }
  });

  const floor2DropZone = document.getElementById('floor2DropZone');
  if (floor2DropZone) setupDropZone(floor2DropZone, loadFloor2Image, true, 'floor2');

  const floor2CurvatureInput = document.getElementById('floor2Curvature');
  const floor2CurvatureValueEl = document.getElementById('floor2CurvatureValue');
  if (floor2CurvatureInput) {
    floor2CurvatureInput.addEventListener('input', (e) => {
      const value = parseFloat(e.target.value);
      floor2CurvatureValueEl.textContent = value;
      floor2Curvature = value;
      applyFloor2Curvature();
    });
  }

  const floor2ImageFlipInput = document.getElementById('floor2ImageFlip');
  if (floor2ImageFlipInput) {
    floor2ImageFlipInput.addEventListener('change', (e) => {
      if (floor2Plane) {
        floor2Plane.scale.x = e.target.checked ? -1 : 1;
      }
    });
  }

  // 床2 起伏設定モーダル
  function openDisplacement2Modal() {
    const bg = document.getElementById('displacement2ModalBg');
    const modal = document.getElementById('displacement2Modal');
    if (bg) bg.style.display = 'block';
    if (modal) modal.style.display = 'flex';
    document.getElementById('canvas-container')?.classList.add('preview-above-modal');
    loadHeightmap2Library();
  }
  function closeDisplacement2Modal() {
    const bg = document.getElementById('displacement2ModalBg');
    const modal = document.getElementById('displacement2Modal');
    if (bg) bg.style.display = 'none';
    if (modal) modal.style.display = 'none';
    document.getElementById('canvas-container')?.classList.remove('preview-above-modal');
  }
  document.getElementById('floor2DisplacementOpenBtn')?.addEventListener('click', openDisplacement2Modal);
  document.getElementById('displacement2ModalClose')?.addEventListener('click', closeDisplacement2Modal);
  document.getElementById('displacement2ModalBg')?.addEventListener('click', closeDisplacement2Modal);

  // 床2モーダルドラッグ
  {
    const modal = document.getElementById('displacement2Modal');
    const content = modal?.querySelector('.modal-content');
    const handle = modal?.querySelector('h3');
    if (handle && content) {
      handle.style.cursor = 'grab';
      let dragging = false, startX, startY, origX, origY;
      handle.addEventListener('mousedown', (e) => {
        dragging = true;
        handle.style.cursor = 'grabbing';
        const rect = content.getBoundingClientRect();
        startX = e.clientX; startY = e.clientY;
        origX = rect.left; origY = rect.top;
        content.style.position = 'fixed';
        content.style.margin = '0';
        content.style.left = origX + 'px';
        content.style.top = origY + 'px';
        e.preventDefault();
      });
      document.addEventListener('mousemove', (e) => {
        if (!dragging) return;
        content.style.left = (origX + e.clientX - startX) + 'px';
        content.style.top = (origY + e.clientY - startY) + 'px';
      });
      document.addEventListener('mouseup', () => {
        if (!dragging) return;
        dragging = false;
        handle.style.cursor = 'grab';
      });
    }
  }

  // 床2ハイトマップ
  const floor2HeightmapLabel = document.getElementById('floor2HeightmapLabel');
  const floor2HeightmapInput = document.getElementById('floor2HeightmapInput');
  floor2HeightmapLabel?.addEventListener('click', () => floor2HeightmapInput?.click());
  floor2HeightmapInput?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    applyHeightmapForFloor2(file);
    if (window.presetManager?.saveMediaToLibrary) {
      window.presetManager.saveMediaToLibrary(file, 'heightmap').then(() => {
        loadHeightmap2Library();
      }).catch(err => console.warn('heightmap library save failed:', err));
    }
  });
  document.getElementById('floor2HeightmapClear')?.addEventListener('click', () => {
    floor2DisplacementData = null;
    const input = document.getElementById('floor2HeightmapInput');
    if (input) input.value = '';
    if (floor2Plane) {
      const p = floor2Plane.geometry.parameters;
      floor2Plane.geometry.dispose();
      floor2Plane.geometry = new THREE.PlaneGeometry(p.width, p.height, 64, 64);
    }
    applyFloor2Curvature();
  });
  document.getElementById('floor2DisplacementScale')?.addEventListener('input', (e) => {
    floor2DisplacementScale = parseFloat(e.target.value);
    const v = e.target.value;
    const modalVal = document.getElementById('floor2DisplacementScaleValueModal');
    if (modalVal) modalVal.textContent = v;
    applyFloor2Curvature();
  });
  document.getElementById('floor2CliffDepth')?.addEventListener('input', (e) => {
    floor2CliffDepth = parseFloat(e.target.value);
    const v = e.target.value;
    const modalVal = document.getElementById('floor2CliffDepthValueModal');
    if (modalVal) modalVal.textContent = v;
    updateFloor2Cliffs();
  });

  function applyHeightmapForFloor2(fileOrBlob) {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      floor2DisplacementData = ctx.getImageData(0, 0, img.width, img.height);
      if (floor2Plane) {
        const p = floor2Plane.geometry.parameters;
        floor2Plane.geometry.dispose();
        floor2Plane.geometry = new THREE.PlaneGeometry(p.width, p.height, 256, 256);
      }
      applyFloor2Curvature();
      URL.revokeObjectURL(img.src);
    };
    img.src = URL.createObjectURL(fileOrBlob);
  }
  window.applyHeightmapForFloor2 = applyHeightmapForFloor2;

  async function loadHeightmap2Library() {
    const grid = document.getElementById('heightmap2LibraryGrid');
    if (!grid || !window.presetManager?.getAllMediaByType) return;
    grid.innerHTML = '';
    try {
      const items = await window.presetManager.getAllMediaByType('heightmap');
      if (items.length === 0) {
        grid.innerHTML = '<div class="media-grid-empty">ライブラリは空です</div>';
        return;
      }
      items.sort((a, b) => b.createdAt - a.createdAt);
      items.forEach(item => {
        const div = document.createElement('div');
        div.className = 'media-grid-item';
        const img = document.createElement('img');
        img.src = URL.createObjectURL(item.blob);
        img.style.height = '60px';
        const name = document.createElement('div');
        name.className = 'media-name';
        name.textContent = item.name;
        const delBtn = document.createElement('button');
        delBtn.className = 'media-delete-btn';
        delBtn.textContent = '\u00d7';
        delBtn.addEventListener('click', async (e) => {
          e.stopPropagation();
          await window.presetManager.deleteMediaFromLibrary(item.id);
          loadHeightmap2Library();
        });
        div.appendChild(delBtn);
        div.appendChild(img);
        div.appendChild(name);
        div.addEventListener('click', () => {
          applyHeightmapForFloor2(item.blob);
        });
        grid.appendChild(div);
      });
    } catch (err) {
      console.warn('heightmap2 library load failed:', err);
    }
  }

  // ============================================
  // 床3画像のイベントリスナー
  // ============================================

  const floor3ImageLabel = document.getElementById('floor3ImageLabel');
  const floor3ImageInput = document.getElementById('floor3ImageInput');
  if (floor3ImageLabel && floor3ImageInput) {
    floor3ImageLabel.addEventListener('click', () => floor3ImageInput.click());
  }

  if (floor3ImageInput) {
    floor3ImageInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        if (window.presetManager) window.presetManager.handleFileUpload(file, 'floor3');
        loadFloor3Image(file);
      }
      e.target.value = '';
    });
  }

  const floor3ImageSizeInput = document.getElementById('floor3ImageSize');
  const floor3ImageSizeValue = document.getElementById('floor3ImageSizeValue');
  if (floor3ImageSizeInput) {
    floor3ImageSizeInput.addEventListener('input', (e) => {
      const value = parseFloat(e.target.value);
      floor3ImageSizeValue.textContent = value;
      updateFloor3ImageSize(value);
    });
  }

  const floor3HeightInput = document.getElementById('floor3Height');
  const floor3HeightValue = document.getElementById('floor3HeightValue');
  if (floor3HeightInput) {
    floor3HeightInput.addEventListener('input', (e) => {
      const value = parseFloat(e.target.value);
      floor3HeightValue.textContent = value;
      if (floor3Plane) floor3Plane.position.y = value;
      if (floor3CliffMesh) floor3CliffMesh.position.y = value;
    });
  }

  const floor3ImageOpacityInput = document.getElementById('floor3ImageOpacity');
  const floor3ImageOpacityValue = document.getElementById('floor3ImageOpacityValue');
  if (floor3ImageOpacityInput) {
    floor3ImageOpacityInput.addEventListener('input', (e) => {
      const value = parseFloat(e.target.value);
      floor3ImageOpacityValue.textContent = value;
      if (floor3Plane) {
        floor3Plane.material.uniforms.opacity.value = value;
        syncDepthMaterialUniforms(floor3Plane);
      }
    });
  }

  const floor3ImageClearBtn = document.getElementById('floor3ImageClear');
  if (floor3ImageClearBtn) {
    floor3ImageClearBtn.addEventListener('click', () => {
      clearFloor3Image();
    });
  }

  document.getElementById('floor3VideoPause')?.addEventListener('click', () => {
    if (floor3Video) {
      if (floor3Video.paused) {
        floor3Video.play();
        document.getElementById('floor3VideoPreview')?.play();
        document.getElementById('floor3VideoPause').innerHTML = '<i class="fa-solid fa-pause"></i>';
      } else {
        floor3Video.pause();
        document.getElementById('floor3VideoPreview')?.pause();
        document.getElementById('floor3VideoPause').innerHTML = '<i class="fa-solid fa-play"></i>';
      }
    }
  });

  const floor3DropZone = document.getElementById('floor3DropZone');
  if (floor3DropZone) setupDropZone(floor3DropZone, loadFloor3Image, true, 'floor3');

  const floor3CurvatureInput = document.getElementById('floor3Curvature');
  const floor3CurvatureValueEl = document.getElementById('floor3CurvatureValue');
  if (floor3CurvatureInput) {
    floor3CurvatureInput.addEventListener('input', (e) => {
      const value = parseFloat(e.target.value);
      floor3CurvatureValueEl.textContent = value;
      floor3Curvature = value;
      applyFloor3Curvature();
    });
  }

  const floor3ImageFlipInput = document.getElementById('floor3ImageFlip');
  if (floor3ImageFlipInput) {
    floor3ImageFlipInput.addEventListener('change', (e) => {
      if (floor3Plane) {
        floor3Plane.scale.x = e.target.checked ? -1 : 1;
      }
    });
  }

  // 床3 起伏設定モーダル
  function openDisplacement3Modal() {
    const bg = document.getElementById('displacement3ModalBg');
    const modal = document.getElementById('displacement3Modal');
    if (bg) bg.style.display = 'block';
    if (modal) modal.style.display = 'flex';
    document.getElementById('canvas-container')?.classList.add('preview-above-modal');
    loadHeightmap3Library();
  }
  function closeDisplacement3Modal() {
    const bg = document.getElementById('displacement3ModalBg');
    const modal = document.getElementById('displacement3Modal');
    if (bg) bg.style.display = 'none';
    if (modal) modal.style.display = 'none';
    document.getElementById('canvas-container')?.classList.remove('preview-above-modal');
  }
  document.getElementById('floor3DisplacementOpenBtn')?.addEventListener('click', openDisplacement3Modal);
  document.getElementById('displacement3ModalClose')?.addEventListener('click', closeDisplacement3Modal);
  document.getElementById('displacement3ModalBg')?.addEventListener('click', closeDisplacement3Modal);

  // 床3モーダルドラッグ
  {
    const modal = document.getElementById('displacement3Modal');
    const content = modal?.querySelector('.modal-content');
    const handle = modal?.querySelector('h3');
    if (handle && content) {
      handle.style.cursor = 'grab';
      let dragging = false, startX, startY, origX, origY;
      handle.addEventListener('mousedown', (e) => {
        dragging = true;
        handle.style.cursor = 'grabbing';
        const rect = content.getBoundingClientRect();
        startX = e.clientX; startY = e.clientY;
        origX = rect.left; origY = rect.top;
        content.style.position = 'fixed';
        content.style.margin = '0';
        content.style.left = origX + 'px';
        content.style.top = origY + 'px';
        e.preventDefault();
      });
      document.addEventListener('mousemove', (e) => {
        if (!dragging) return;
        content.style.left = (origX + e.clientX - startX) + 'px';
        content.style.top = (origY + e.clientY - startY) + 'px';
      });
      document.addEventListener('mouseup', () => {
        if (!dragging) return;
        dragging = false;
        handle.style.cursor = 'grab';
      });
    }
  }

  // 床3ハイトマップ
  const floor3HeightmapLabel = document.getElementById('floor3HeightmapLabel');
  const floor3HeightmapInput = document.getElementById('floor3HeightmapInput');
  floor3HeightmapLabel?.addEventListener('click', () => floor3HeightmapInput?.click());
  floor3HeightmapInput?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    applyHeightmapForFloor3(file);
    if (window.presetManager?.saveMediaToLibrary) {
      window.presetManager.saveMediaToLibrary(file, 'heightmap').then(() => {
        loadHeightmap3Library();
      }).catch(err => console.warn('heightmap library save failed:', err));
    }
  });
  document.getElementById('floor3HeightmapClear')?.addEventListener('click', () => {
    floor3DisplacementData = null;
    const input = document.getElementById('floor3HeightmapInput');
    if (input) input.value = '';
    if (floor3Plane) {
      const p = floor3Plane.geometry.parameters;
      floor3Plane.geometry.dispose();
      floor3Plane.geometry = new THREE.PlaneGeometry(p.width, p.height, 64, 64);
    }
    applyFloor3Curvature();
  });
  document.getElementById('floor3DisplacementScale')?.addEventListener('input', (e) => {
    floor3DisplacementScale = parseFloat(e.target.value);
    const v = e.target.value;
    const modalVal = document.getElementById('floor3DisplacementScaleValueModal');
    if (modalVal) modalVal.textContent = v;
    applyFloor3Curvature();
  });
  document.getElementById('floor3CliffDepth')?.addEventListener('input', (e) => {
    floor3CliffDepth = parseFloat(e.target.value);
    const v = e.target.value;
    const modalVal = document.getElementById('floor3CliffDepthValueModal');
    if (modalVal) modalVal.textContent = v;
    updateFloor3Cliffs();
  });

  function applyHeightmapForFloor3(fileOrBlob) {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      floor3DisplacementData = ctx.getImageData(0, 0, img.width, img.height);
      if (floor3Plane) {
        const p = floor3Plane.geometry.parameters;
        floor3Plane.geometry.dispose();
        floor3Plane.geometry = new THREE.PlaneGeometry(p.width, p.height, 256, 256);
      }
      applyFloor3Curvature();
      URL.revokeObjectURL(img.src);
    };
    img.src = URL.createObjectURL(fileOrBlob);
  }
  window.applyHeightmapForFloor3 = applyHeightmapForFloor3;

  async function loadHeightmap3Library() {
    const grid = document.getElementById('heightmap3LibraryGrid');
    if (!grid || !window.presetManager?.getAllMediaByType) return;
    grid.innerHTML = '';
    try {
      const items = await window.presetManager.getAllMediaByType('heightmap');
      if (items.length === 0) {
        grid.innerHTML = '<div class="media-grid-empty">ライブラリは空です</div>';
        return;
      }
      items.sort((a, b) => b.createdAt - a.createdAt);
      items.forEach(item => {
        const div = document.createElement('div');
        div.className = 'media-grid-item';
        const img = document.createElement('img');
        img.src = URL.createObjectURL(item.blob);
        img.style.height = '60px';
        const name = document.createElement('div');
        name.className = 'media-name';
        name.textContent = item.name;
        const delBtn = document.createElement('button');
        delBtn.className = 'media-delete-btn';
        delBtn.textContent = '\u00d7';
        delBtn.addEventListener('click', async (e) => {
          e.stopPropagation();
          await window.presetManager.deleteMediaFromLibrary(item.id);
          loadHeightmap3Library();
        });
        div.appendChild(delBtn);
        div.appendChild(img);
        div.appendChild(name);
        div.addEventListener('click', () => {
          applyHeightmapForFloor3(item.blob);
        });
        grid.appendChild(div);
      });
    } catch (err) {
      console.warn('heightmap3 library load failed:', err);
    }
  }

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
      if (window.presetManager) window.presetManager.handleFileUpload(file, 'leftWall');
      loadLeftWallImage(file);
    }
    e.target.value = '';
  });

  // 左側面画像サイズ
  const leftWallImageSizeInput = document.getElementById('leftWallImageSize');
  const leftWallImageSizeValue = document.getElementById('leftWallImageSizeValue');
  leftWallImageSizeInput.addEventListener('input', (e) => {
    const value = parseFloat(e.target.value);
    leftWallImageSizeValue.textContent = value;
    updateLeftWallImageSize(value);
  });

  // 左側面画像X位置
  document.getElementById('leftWallImageX')?.addEventListener('input', (e) => {
    const value = parseFloat(e.target.value);
    document.getElementById('leftWallImageXValue').textContent = value;
    if (leftWallPlane) leftWallPlane.position.x = value;
  });

  // 左側面画像Z位置
  document.getElementById('leftWallImageZ')?.addEventListener('input', (e) => {
    const value = parseFloat(e.target.value);
    document.getElementById('leftWallImageZValue').textContent = value;
    if (leftWallPlane) leftWallPlane.position.z = value;
  });

  // 左側面画像高度
  document.getElementById('leftWallImageY')?.addEventListener('input', (e) => {
    const value = parseFloat(e.target.value);
    document.getElementById('leftWallImageYValue').textContent = value;
    if (leftWallPlane) {
      const currentSize = leftWallPlane.geometry.parameters.height;
      leftWallPlane.position.y = floorY + currentSize / 2 + value;
    }
  });

  // 左側面画像Y回転
  document.getElementById('leftWallImageRotY')?.addEventListener('input', (e) => {
    const value = parseFloat(e.target.value);
    document.getElementById('leftWallImageRotYValue').textContent = value;
    if (leftWallPlane) leftWallPlane.rotation.y = value * Math.PI / 180;
  });

  // 左側面画像透明度
  const leftWallImageOpacityInput = document.getElementById('leftWallImageOpacity');
  const leftWallImageOpacityValue = document.getElementById('leftWallImageOpacityValue');
  leftWallImageOpacityInput.addEventListener('input', (e) => {
    const value = parseFloat(e.target.value);
    leftWallImageOpacityValue.textContent = value;
    if (leftWallPlane) {
      leftWallPlane.material.uniforms.opacity.value = value;
      syncDepthMaterialUniforms(leftWallPlane);
    }
  });

  // 左側面画像クリア
  const leftWallImageClearBtn = document.getElementById('leftWallImageClear');
  leftWallImageClearBtn.addEventListener('click', () => {
    clearLeftWallImage();
  });

  // 左側面動画一時停止/再生
  document.getElementById('leftWallVideoPause')?.addEventListener('click', () => {
    if (leftWallVideo) {
      if (leftWallVideo.paused) {
        leftWallVideo.play();
        document.getElementById('leftWallVideoPreview')?.play();
        document.getElementById('leftWallVideoPause').innerHTML = '<i class="fa-solid fa-pause"></i>';
      } else {
        leftWallVideo.pause();
        document.getElementById('leftWallVideoPreview')?.pause();
        document.getElementById('leftWallVideoPause').innerHTML = '<i class="fa-solid fa-play"></i>';
      }
    }
  });

  // 左側面画像ドラッグ&ドロップ
  const leftWallDropZone = document.getElementById('leftWallDropZone');
  setupDropZone(leftWallDropZone, loadLeftWallImage, true, 'leftWall');

  // 左側面画像左右反転
  const leftWallImageFlipInput = document.getElementById('leftWallImageFlip');
  leftWallImageFlipInput.addEventListener('change', (e) => {
    if (leftWallPlane) {
      leftWallPlane.scale.x = e.target.checked ? -1 : 1;
    }
  });

  // ============================================
  // センター画像のイベントリスナー
  // ============================================

  // 画像ラベルクリックでファイル選択を開く
  const centerWallImageLabel = document.getElementById('centerWallImageLabel');
  const centerWallImageInput = document.getElementById('centerWallImageInput');
  centerWallImageLabel?.addEventListener('click', () => centerWallImageInput?.click());

  // 画像ファイル選択
  centerWallImageInput?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      if (window.presetManager) window.presetManager.handleFileUpload(file, 'centerWall');
      loadCenterWallImage(file);
    }
    e.target.value = '';
  });

  // センター画像サイズ
  const centerWallImageSizeInput = document.getElementById('centerWallImageSize');
  const centerWallImageSizeValue = document.getElementById('centerWallImageSizeValue');
  centerWallImageSizeInput?.addEventListener('input', (e) => {
    const value = parseFloat(e.target.value);
    centerWallImageSizeValue.textContent = value;
    updateCenterWallImageSize(value);
  });

  // センター画像X位置
  document.getElementById('centerWallImageX')?.addEventListener('input', (e) => {
    const value = parseFloat(e.target.value);
    document.getElementById('centerWallImageXValue').textContent = value;
    if (centerWallPlane) centerWallPlane.position.x = value;
  });

  // センター画像Z位置
  document.getElementById('centerWallImageZ')?.addEventListener('input', (e) => {
    const value = parseFloat(e.target.value);
    document.getElementById('centerWallImageZValue').textContent = value;
    if (centerWallPlane) centerWallPlane.position.z = value;
  });

  // センター画像高度
  document.getElementById('centerWallImageY')?.addEventListener('input', (e) => {
    const value = parseFloat(e.target.value);
    document.getElementById('centerWallImageYValue').textContent = value;
    if (centerWallPlane) {
      const currentSize = centerWallPlane.geometry.parameters.height;
      centerWallPlane.position.y = floorY + currentSize / 2 + value;
    }
  });

  // センター画像Y回転
  document.getElementById('centerWallImageRotY')?.addEventListener('input', (e) => {
    const value = parseFloat(e.target.value);
    document.getElementById('centerWallImageRotYValue').textContent = value;
    if (centerWallPlane) centerWallPlane.rotation.y = value * Math.PI / 180;
  });

  // センター画像透明度
  const centerWallImageOpacityInput = document.getElementById('centerWallImageOpacity');
  const centerWallImageOpacityValue = document.getElementById('centerWallImageOpacityValue');
  centerWallImageOpacityInput?.addEventListener('input', (e) => {
    const value = parseFloat(e.target.value);
    centerWallImageOpacityValue.textContent = value;
    if (centerWallPlane) {
      centerWallPlane.material.uniforms.opacity.value = value;
      syncDepthMaterialUniforms(centerWallPlane);
    }
  });

  // センター画像クリア
  document.getElementById('centerWallImageClear')?.addEventListener('click', () => {
    clearCenterWallImage();
  });

  // センター動画一時停止/再生
  document.getElementById('centerWallVideoPause')?.addEventListener('click', () => {
    if (centerWallVideo) {
      if (centerWallVideo.paused) {
        centerWallVideo.play();
        document.getElementById('centerWallVideoPreview')?.play();
        document.getElementById('centerWallVideoPause').innerHTML = '<i class="fa-solid fa-pause"></i>';
      } else {
        centerWallVideo.pause();
        document.getElementById('centerWallVideoPreview')?.pause();
        document.getElementById('centerWallVideoPause').innerHTML = '<i class="fa-solid fa-play"></i>';
      }
    }
  });

  // センター画像ドラッグ&ドロップ
  const centerWallDropZone = document.getElementById('centerWallDropZone');
  if (centerWallDropZone) setupDropZone(centerWallDropZone, loadCenterWallImage, true, 'centerWall');

  // センター画像左右反転
  document.getElementById('centerWallImageFlip')?.addEventListener('change', (e) => {
    if (centerWallPlane) {
      centerWallPlane.scale.x = e.target.checked ? -1 : 1;
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
      if (window.presetManager) window.presetManager.handleFileUpload(file, 'rightWall');
      loadRightWallImage(file);
    }
    e.target.value = '';
  });

  // 右側面画像サイズ
  const rightWallImageSizeInput = document.getElementById('rightWallImageSize');
  const rightWallImageSizeValue = document.getElementById('rightWallImageSizeValue');
  rightWallImageSizeInput.addEventListener('input', (e) => {
    const value = parseFloat(e.target.value);
    rightWallImageSizeValue.textContent = value;
    updateRightWallImageSize(value);
  });

  // 右側面画像X位置
  document.getElementById('rightWallImageX')?.addEventListener('input', (e) => {
    const value = parseFloat(e.target.value);
    document.getElementById('rightWallImageXValue').textContent = value;
    if (rightWallPlane) rightWallPlane.position.x = value;
  });

  // 右側面画像Z位置
  document.getElementById('rightWallImageZ')?.addEventListener('input', (e) => {
    const value = parseFloat(e.target.value);
    document.getElementById('rightWallImageZValue').textContent = value;
    if (rightWallPlane) rightWallPlane.position.z = value;
  });

  // 右側面画像高度
  document.getElementById('rightWallImageY')?.addEventListener('input', (e) => {
    const value = parseFloat(e.target.value);
    document.getElementById('rightWallImageYValue').textContent = value;
    if (rightWallPlane) {
      const currentSize = rightWallPlane.geometry.parameters.height;
      rightWallPlane.position.y = floorY + currentSize / 2 + value;
    }
  });

  // 右側面画像Y回転
  document.getElementById('rightWallImageRotY')?.addEventListener('input', (e) => {
    const value = parseFloat(e.target.value);
    document.getElementById('rightWallImageRotYValue').textContent = value;
    if (rightWallPlane) rightWallPlane.rotation.y = value * Math.PI / 180;
  });

  // 右側面画像透明度
  const rightWallImageOpacityInput = document.getElementById('rightWallImageOpacity');
  const rightWallImageOpacityValue = document.getElementById('rightWallImageOpacityValue');
  rightWallImageOpacityInput.addEventListener('input', (e) => {
    const value = parseFloat(e.target.value);
    rightWallImageOpacityValue.textContent = value;
    if (rightWallPlane) {
      rightWallPlane.material.uniforms.opacity.value = value;
      syncDepthMaterialUniforms(rightWallPlane);
    }
  });

  // 右側面画像クリア
  const rightWallImageClearBtn = document.getElementById('rightWallImageClear');
  rightWallImageClearBtn.addEventListener('click', () => {
    clearRightWallImage();
  });

  // 右側面動画一時停止/再生
  document.getElementById('rightWallVideoPause')?.addEventListener('click', () => {
    if (rightWallVideo) {
      if (rightWallVideo.paused) {
        rightWallVideo.play();
        document.getElementById('rightWallVideoPreview')?.play();
        document.getElementById('rightWallVideoPause').innerHTML = '<i class="fa-solid fa-pause"></i>';
      } else {
        rightWallVideo.pause();
        document.getElementById('rightWallVideoPreview')?.pause();
        document.getElementById('rightWallVideoPause').innerHTML = '<i class="fa-solid fa-play"></i>';
      }
    }
  });

  // 右側面画像ドラッグ&ドロップ
  const rightWallDropZone = document.getElementById('rightWallDropZone');
  setupDropZone(rightWallDropZone, loadRightWallImage, true, 'rightWall');

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
      if (window.presetManager) window.presetManager.handleFileUpload(file, 'backWall');
      loadBackWallImage(file);
    }
    e.target.value = '';
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

  // 奥側画像Z位置
  document.getElementById('backWallImageZ')?.addEventListener('input', (e) => {
    const value = parseFloat(e.target.value);
    document.getElementById('backWallImageZValue').textContent = value;
    if (backWallPlane) backWallPlane.position.z = value;
  });

  // 奥側画像高度
  document.getElementById('backWallImageY')?.addEventListener('input', (e) => {
    const value = parseFloat(e.target.value);
    document.getElementById('backWallImageYValue').textContent = value;
    if (backWallPlane) {
      const currentSize = backWallPlane.geometry.parameters.height;
      backWallPlane.position.y = floorY + currentSize / 2 + value;
    }
  });

  // 奥側画像Y回転
  document.getElementById('backWallImageRotY')?.addEventListener('input', (e) => {
    const value = parseFloat(e.target.value);
    document.getElementById('backWallImageRotYValue').textContent = value;
    if (backWallPlane) backWallPlane.rotation.y = value * Math.PI / 180;
  });

  // 奥側画像透明度
  const backWallImageOpacityInput = document.getElementById('backWallImageOpacity');
  const backWallImageOpacityValue = document.getElementById('backWallImageOpacityValue');
  backWallImageOpacityInput.addEventListener('input', (e) => {
    const value = parseFloat(e.target.value);
    backWallImageOpacityValue.textContent = value;
    if (backWallPlane) {
      backWallPlane.material.uniforms.opacity.value = value;
      syncDepthMaterialUniforms(backWallPlane);
    }
  });

  // 奥側画像クリア
  const backWallImageClearBtn = document.getElementById('backWallImageClear');
  backWallImageClearBtn.addEventListener('click', () => {
    clearBackWallImage();
  });

  // 奥側動画一時停止/再生
  document.getElementById('backWallVideoPause')?.addEventListener('click', () => {
    if (backWallVideo) {
      if (backWallVideo.paused) {
        backWallVideo.play();
        document.getElementById('backWallVideoPreview')?.play();
        document.getElementById('backWallVideoPause').innerHTML = '<i class="fa-solid fa-pause"></i>';
      } else {
        backWallVideo.pause();
        document.getElementById('backWallVideoPreview')?.pause();
        document.getElementById('backWallVideoPause').innerHTML = '<i class="fa-solid fa-play"></i>';
      }
    }
  });

  // 奥側画像ドラッグ&ドロップ
  const backWallDropZone = document.getElementById('backWallDropZone');
  setupDropZone(backWallDropZone, loadBackWallImage, true, 'backWall');

  // 奥側画像左右反転
  const backWallImageFlipInput = document.getElementById('backWallImageFlip');
  backWallImageFlipInput.addEventListener('change', (e) => {
    if (backWallPlane) {
      backWallPlane.scale.x = e.target.checked ? -1 : 1;
    }
  });

  // ============================================
  // パネル5画像のイベントリスナー
  // ============================================

  // 画像ラベルクリックでファイル選択を開く
  document.getElementById('panel5WallImageLabel')?.addEventListener('click', () => {
    document.getElementById('panel5WallImageInput')?.click();
  });

  // 画像ファイル選択
  document.getElementById('panel5WallImageInput')?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      if (window.presetManager) window.presetManager.handleFileUpload(file, 'panel5Wall');
      loadPanel5WallImage(file);
    }
    e.target.value = '';
  });

  // パネル5画像サイズ
  document.getElementById('panel5WallImageSize')?.addEventListener('input', (e) => {
    const value = parseFloat(e.target.value);
    document.getElementById('panel5WallImageSizeValue').textContent = value;
    updatePanel5WallImageSize(value);
  });

  // パネル5画像X位置
  document.getElementById('panel5WallImageX')?.addEventListener('input', (e) => {
    const value = parseFloat(e.target.value);
    document.getElementById('panel5WallImageXValue').textContent = value;
    if (panel5WallPlane) {
      panel5WallPlane.position.x = value;
    }
  });

  // パネル5画像Z位置
  document.getElementById('panel5WallImageZ')?.addEventListener('input', (e) => {
    const value = parseFloat(e.target.value);
    document.getElementById('panel5WallImageZValue').textContent = value;
    if (panel5WallPlane) panel5WallPlane.position.z = value;
  });

  // パネル5画像高度
  document.getElementById('panel5WallImageY')?.addEventListener('input', (e) => {
    const value = parseFloat(e.target.value);
    document.getElementById('panel5WallImageYValue').textContent = value;
    if (panel5WallPlane) {
      const currentSize = panel5WallPlane.geometry.parameters.height;
      panel5WallPlane.position.y = floorY + currentSize / 2 + value;
    }
  });

  // パネル5画像Y回転
  document.getElementById('panel5WallImageRotY')?.addEventListener('input', (e) => {
    const value = parseFloat(e.target.value);
    document.getElementById('panel5WallImageRotYValue').textContent = value;
    if (panel5WallPlane) panel5WallPlane.rotation.y = value * Math.PI / 180;
  });

  // パネル5画像透明度
  document.getElementById('panel5WallImageOpacity')?.addEventListener('input', (e) => {
    const value = parseFloat(e.target.value);
    document.getElementById('panel5WallImageOpacityValue').textContent = value;
    if (panel5WallPlane) {
      panel5WallPlane.material.uniforms.opacity.value = value;
      syncDepthMaterialUniforms(panel5WallPlane);
    }
  });

  // パネル5画像クリア
  document.getElementById('panel5WallImageClear')?.addEventListener('click', () => {
    clearPanel5WallImage();
  });

  // パネル5動画一時停止/再生
  document.getElementById('panel5WallVideoPause')?.addEventListener('click', () => {
    if (panel5WallVideo) {
      if (panel5WallVideo.paused) {
        panel5WallVideo.play();
        document.getElementById('panel5WallVideoPreview')?.play();
        document.getElementById('panel5WallVideoPause').innerHTML = '<i class="fa-solid fa-pause"></i>';
      } else {
        panel5WallVideo.pause();
        document.getElementById('panel5WallVideoPreview')?.pause();
        document.getElementById('panel5WallVideoPause').innerHTML = '<i class="fa-solid fa-play"></i>';
      }
    }
  });

  // パネル5画像ドラッグ&ドロップ
  const panel5WallDropZone = document.getElementById('panel5WallDropZone');
  setupDropZone(panel5WallDropZone, loadPanel5WallImage, true, 'panel5Wall');

  // パネル5画像左右反転
  document.getElementById('panel5WallImageFlip')?.addEventListener('change', (e) => {
    if (panel5WallPlane) {
      panel5WallPlane.scale.x = e.target.checked ? -1 : 1;
    }
  });

  // ============================================
  // パネル6画像のイベントリスナー
  // ============================================

  // 画像ラベルクリックでファイル選択を開く
  document.getElementById('panel6WallImageLabel')?.addEventListener('click', () => {
    document.getElementById('panel6WallImageInput')?.click();
  });

  // 画像ファイル選択
  document.getElementById('panel6WallImageInput')?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      if (window.presetManager) window.presetManager.handleFileUpload(file, 'panel6Wall');
      loadPanel6WallImage(file);
    }
    e.target.value = '';
  });

  // パネル6画像サイズ
  document.getElementById('panel6WallImageSize')?.addEventListener('input', (e) => {
    const value = parseFloat(e.target.value);
    document.getElementById('panel6WallImageSizeValue').textContent = value;
    updatePanel6WallImageSize(value);
  });

  // パネル6画像X位置
  document.getElementById('panel6WallImageX')?.addEventListener('input', (e) => {
    const value = parseFloat(e.target.value);
    document.getElementById('panel6WallImageXValue').textContent = value;
    if (panel6WallPlane) {
      panel6WallPlane.position.x = value;
    }
  });

  // パネル6画像Z位置
  document.getElementById('panel6WallImageZ')?.addEventListener('input', (e) => {
    const value = parseFloat(e.target.value);
    document.getElementById('panel6WallImageZValue').textContent = value;
    if (panel6WallPlane) panel6WallPlane.position.z = value;
  });

  // パネル6画像高度
  document.getElementById('panel6WallImageY')?.addEventListener('input', (e) => {
    const value = parseFloat(e.target.value);
    document.getElementById('panel6WallImageYValue').textContent = value;
    if (panel6WallPlane) {
      const currentSize = panel6WallPlane.geometry.parameters.height;
      panel6WallPlane.position.y = floorY + currentSize / 2 + value;
    }
  });

  // パネル6画像Y回転
  document.getElementById('panel6WallImageRotY')?.addEventListener('input', (e) => {
    const value = parseFloat(e.target.value);
    document.getElementById('panel6WallImageRotYValue').textContent = value;
    if (panel6WallPlane) panel6WallPlane.rotation.y = value * Math.PI / 180;
  });

  // パネル6画像透明度
  document.getElementById('panel6WallImageOpacity')?.addEventListener('input', (e) => {
    const value = parseFloat(e.target.value);
    document.getElementById('panel6WallImageOpacityValue').textContent = value;
    if (panel6WallPlane) {
      panel6WallPlane.material.uniforms.opacity.value = value;
      syncDepthMaterialUniforms(panel6WallPlane);
    }
  });

  // パネル6画像クリア
  document.getElementById('panel6WallImageClear')?.addEventListener('click', () => {
    clearPanel6WallImage();
  });

  // パネル6動画一時停止/再生
  document.getElementById('panel6WallVideoPause')?.addEventListener('click', () => {
    if (panel6WallVideo) {
      if (panel6WallVideo.paused) {
        panel6WallVideo.play();
        document.getElementById('panel6WallVideoPreview')?.play();
        document.getElementById('panel6WallVideoPause').innerHTML = '<i class="fa-solid fa-pause"></i>';
      } else {
        panel6WallVideo.pause();
        document.getElementById('panel6WallVideoPreview')?.pause();
        document.getElementById('panel6WallVideoPause').innerHTML = '<i class="fa-solid fa-play"></i>';
      }
    }
  });

  // パネル6画像ドラッグ&ドロップ
  const panel6WallDropZone = document.getElementById('panel6WallDropZone');
  setupDropZone(panel6WallDropZone, loadPanel6WallImage, true, 'panel6Wall');

  // パネル6画像左右反転
  document.getElementById('panel6WallImageFlip')?.addEventListener('change', (e) => {
    if (panel6WallPlane) {
      panel6WallPlane.scale.x = e.target.checked ? -1 : 1;
    }
  });

  } // image-panel guard end

  // ============================================
  // メディアライブラリモーダル
  // ============================================
  const mediaLibraryModal = document.getElementById('mediaLibraryModal');
  const mediaLibraryGrid = document.getElementById('mediaLibraryGrid');
  const mediaLibraryCancel = document.getElementById('mediaLibraryCancel');
  let mediaLibraryTargetSlot = null;
  const mediaLibraryObjectURLs = [];

  const slotLoadMap = {
    midi: loadMidi,
    audio: loadAudio,
    skyDome: loadSkyDomeImage,
    innerSky: loadInnerSkyImage,
    floor: loadFloorImage,
    floor2: loadFloor2Image,
    floor3: loadFloor3Image,
    leftWall: loadLeftWallImage,
    centerWall: loadCenterWallImage,
    rightWall: loadRightWallImage,
    backWall: loadBackWallImage,
    panel5Wall: loadPanel5WallImage,
    panel6Wall: loadPanel6WallImage,
  };

  const slotMediaTypes = {
    midi: ['midi'],
    audio: ['audio'],
    skyDome: ['image', 'video'],
    floor: ['image', 'video'],
    floor2: ['image', 'video'],
    floor3: ['image', 'video'],
    leftWall: ['image', 'video'],
    rightWall: ['image', 'video'],
    backWall: ['image', 'video'],
    panel5Wall: ['image', 'video'],
    panel6Wall: ['image', 'video'],
  };

  function cleanupMediaLibraryURLs() {
    mediaLibraryObjectURLs.forEach(url => URL.revokeObjectURL(url));
    mediaLibraryObjectURLs.length = 0;
  }

  if (mediaLibraryModal) {
    // ライブラリボタンのクリック
    document.querySelectorAll('.library-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        mediaLibraryTargetSlot = btn.dataset.slot;
        if (!window.presetManager || !window.presetManager.getAllMediaByType) return;

        // スロットに応じたメディアタイプを取得
        const types = slotMediaTypes[mediaLibraryTargetSlot] || ['image', 'video'];
        const results = await Promise.all(types.map(t => window.presetManager.getAllMediaByType(t)));
        const allMedia = results.flat().sort((a, b) => b.createdAt - a.createdAt);

        cleanupMediaLibraryURLs();
        mediaLibraryGrid.innerHTML = '';
        const isListMode = mediaLibraryTargetSlot === 'midi' || mediaLibraryTargetSlot === 'audio';
        mediaLibraryGrid.classList.toggle('media-list', isListMode);

        if (allMedia.length === 0) {
          const empty = document.createElement('div');
          empty.className = 'media-grid-empty';
          empty.textContent = 'メディアがありません';
          mediaLibraryGrid.appendChild(empty);
        } else {
          allMedia.forEach(record => {
            const item = document.createElement('div');
            item.className = isListMode ? 'media-list-item' : 'media-grid-item';

            if (isListMode) {
              const icon = document.createElement('span');
              icon.className = 'media-list-icon';
              icon.innerHTML = record.type === 'midi' ? '<i class="fa-solid fa-music"></i>' : '<i class="fa-solid fa-volume-high"></i>';
              item.appendChild(icon);

              const name = document.createElement('span');
              name.className = 'media-list-name';
              name.textContent = record.name;
              name.title = record.name;
              item.appendChild(name);

              const d = new Date(record.createdAt);
              const date = document.createElement('span');
              date.className = 'media-list-date';
              date.textContent = `${d.getMonth()+1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2,'0')}`;
              item.appendChild(date);

              const deleteBtn = document.createElement('button');
              deleteBtn.className = 'media-list-delete';
              deleteBtn.innerHTML = '<i class="fa-solid fa-xmark"></i>';
              deleteBtn.title = '削除';
              deleteBtn.addEventListener('click', async (ev) => {
                ev.stopPropagation();
                if (!confirm(`「${record.name}」を削除しますか？`)) return;
                await window.presetManager.deleteMediaFromLibrary(record.id);
                item.remove();
                if (mediaLibraryGrid.children.length === 0) {
                  const empty = document.createElement('div');
                  empty.className = 'media-grid-empty';
                  empty.textContent = 'メディアがありません';
                  mediaLibraryGrid.appendChild(empty);
                }
              });
              item.appendChild(deleteBtn);
            } else {
              const isVideo = record.mimeType && record.mimeType.startsWith('video/');
              const url = URL.createObjectURL(record.blob);
              mediaLibraryObjectURLs.push(url);

              if (isVideo) {
                const vid = document.createElement('video');
                vid.src = url;
                vid.muted = true;
                vid.addEventListener('mouseenter', () => vid.play());
                vid.addEventListener('mouseleave', () => { vid.pause(); vid.currentTime = 0; });
                item.appendChild(vid);
              } else {
                const img = document.createElement('img');
                img.src = url;
                item.appendChild(img);
              }

              const dlBtn = document.createElement('button');
              dlBtn.className = 'media-download-btn';
              dlBtn.innerHTML = '<i class="fa-solid fa-download"></i>';
              dlBtn.title = 'ダウンロード';
              dlBtn.addEventListener('click', (ev) => {
                ev.stopPropagation();
                const a = document.createElement('a');
                a.href = url;
                a.download = record.name;
                a.click();
              });
              item.appendChild(dlBtn);

              const deleteBtn = document.createElement('button');
              deleteBtn.className = 'media-delete-btn';
              deleteBtn.innerHTML = '<i class="fa-solid fa-xmark"></i>';
              deleteBtn.title = '削除';
              deleteBtn.addEventListener('click', async (ev) => {
                ev.stopPropagation();
                if (!confirm(`「${record.name}」を削除しますか？`)) return;
                await window.presetManager.deleteMediaFromLibrary(record.id);
                item.remove();
                if (mediaLibraryGrid.children.length === 0) {
                  const empty = document.createElement('div');
                  empty.className = 'media-grid-empty';
                  empty.textContent = 'メディアがありません';
                  mediaLibraryGrid.appendChild(empty);
                }
              });
              item.appendChild(deleteBtn);

              const name = document.createElement('div');
              name.className = 'media-name';
              name.textContent = record.name;
              name.title = record.name;
              item.appendChild(name);

              const d = new Date(record.createdAt);
              const date = document.createElement('div');
              date.className = 'media-date';
              date.textContent = `${d.getMonth()+1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2,'0')}`;
              item.appendChild(date);
            }

            item.addEventListener('click', async () => {
              const loadFn = slotLoadMap[mediaLibraryTargetSlot];
              if (!loadFn) return;

              const fullRecord = await window.presetManager.getMediaFromLibrary(record.id);
              if (!fullRecord) return;

              const file = new File([fullRecord.blob], fullRecord.name, { type: fullRecord.mimeType });
              await loadFn(file);
              if (window.currentMediaRefs) window.currentMediaRefs[mediaLibraryTargetSlot] = record.id;

              // MIDI/音声のファイル名表示・クリアボタン更新
              if (mediaLibraryTargetSlot === 'midi') {
                document.getElementById('midiFileName').textContent = fullRecord.name;
                const btn = document.getElementById('midiClearBtn');
                if (btn) btn.style.display = '';
              } else if (mediaLibraryTargetSlot === 'audio') {
                document.getElementById('audioFileName').textContent = fullRecord.name;
                const btn = document.getElementById('audioClearBtn');
                if (btn) btn.style.display = '';
              }

              mediaLibraryModal.style.display = 'none';
              cleanupMediaLibraryURLs();
            });

            mediaLibraryGrid.appendChild(item);
          });
        }

        mediaLibraryModal.style.display = 'flex';
      });
    });

    // 閉じるボタン
    mediaLibraryCancel.addEventListener('click', () => {
      mediaLibraryModal.style.display = 'none';
      cleanupMediaLibraryURLs();
    });

    // モーダル外クリックで閉じる
    mediaLibraryModal.addEventListener('click', (e) => {
      if (e.target === mediaLibraryModal) {
        mediaLibraryModal.style.display = 'none';
        cleanupMediaLibraryURLs();
      }
    });
  }

  // ============================================
  // クロマキーのイベントリスナー（各面個別）
  // ============================================
  if (document.getElementById('floorChromaColor')) {
    const chromaKeyFaces = [
      { prefix: 'skyDome', plane: () => skyDome },
      { prefix: 'innerSky', plane: () => innerSkyDome },
      { prefix: 'floor', plane: () => floorPlane },
      { prefix: 'floor2', plane: () => floor2Plane },
      { prefix: 'floor3', plane: () => floor3Plane },
      { prefix: 'leftWall', plane: () => leftWallPlane },
      { prefix: 'centerWall', plane: () => centerWallPlane },
      { prefix: 'rightWall', plane: () => rightWallPlane },
      { prefix: 'backWall', plane: () => backWallPlane },
      { prefix: 'panel5Wall', plane: () => panel5WallPlane },
      { prefix: 'panel6Wall', plane: () => panel6WallPlane },
    ];
    chromaKeyFaces.forEach(({ prefix, plane }) => {
      const colorInput = document.getElementById(`${prefix}ChromaColor`);
      const thresholdInput = document.getElementById(`${prefix}ChromaThreshold`);
      const thresholdValueSpan = document.getElementById(`${prefix}ChromaThresholdValue`);
      if (!colorInput || !thresholdInput) return;
      colorInput.addEventListener('input', (e) => {
        const p = plane();
        if (p) {
          p.material.uniforms.chromaKeyColor.value.set(e.target.value);
          syncDepthMaterialUniforms(p);
          // 床1のクロマキー変更時は影プレーンにも同期
          if (prefix === 'floor' && shadowPlane) {
            shadowPlane.material.userData.chromaKeyColor.value.set(e.target.value);
          }
        }
      });
      thresholdInput.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        if (thresholdValueSpan) thresholdValueSpan.textContent = value;
        const p = plane();
        if (p) {
          p.material.uniforms.chromaKeyThreshold.value = value;
          syncDepthMaterialUniforms(p);
          // 床1のクロマキー変更時は影プレーンにも同期
          if (prefix === 'floor' && shadowPlane) {
            shadowPlane.material.userData.chromaKeyThreshold.value = value;
          }
        }
      });
    });
  }

  // MIDI遅延スライダー
  const midiDelayInput = document.getElementById('midiDelay');
  const midiDelayValue = document.getElementById('midiDelayValue');
  midiDelayInput.addEventListener('input', (e) => {
    syncConfig.midiDelay = parseFloat(e.target.value);
    midiDelayValue.textContent = syncConfig.midiDelay.toFixed(2) + '秒';
  });

  // 音源遅延スライダー
  const audioDelayInput = document.getElementById('audioDelay');
  const audioDelayValue = document.getElementById('audioDelayValue');
  audioDelayInput.addEventListener('input', (e) => {
    syncConfig.audioDelay = parseFloat(e.target.value);
    audioDelayValue.textContent = syncConfig.audioDelay.toFixed(2) + '秒';
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

  // テンポ情報を取得
  if (midi.header.tempos && midi.header.tempos.length > 0) {
    tempoInfo.bpm = midi.header.tempos[0].bpm;
  } else {
    tempoInfo.bpm = 120; // デフォルト
  }
  tempoInfo.beatDuration = 60 / tempoInfo.bpm;
  tempoInfo.beatsPerBar = midi.header.timeSignatures?.[0]?.timeSignature?.[0] || 4;
  tempoInfo.lastBeatTime = 0;
  tempoInfo.currentBeat = 0;

  console.log('MIDI loaded:', midi.name, 'Tracks:', midi.tracks.length, 'BPM:', tempoInfo.bpm);

  // トラック情報を抽出（楽器を自動推定）
  state.tracks = midi.tracks.map((track, index) => {
    const trackName = track.name || `Track ${index + 1}`;
    const instrumentId = guessInstrument(trackName);
    const instrument = INSTRUMENTS[instrumentId];

    const saved = loadPitchFilter(trackName);
    return {
      index,
      name: trackName,
      instrumentId: instrumentId,
      instrumentName: instrument.name,
      channel: track.channel,
      noteCount: track.notes.length,
      color: instrument.color,
      pitchMin: saved ? saved.pitchMin : 0,
      pitchMax: saved ? saved.pitchMax : 127,
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

// MIDIクリア
function clearMidi() {
  // 再生中なら停止
  if (state.isPlaying) stop();

  // ノートオブジェクトを削除
  state.noteObjects.forEach(obj => {
    noteGroup.remove(obj);
    if (obj.geometry) obj.geometry.dispose();
    if (obj.material) obj.material.dispose();
  });
  state.noteObjects = [];

  // アイコンスプライトを削除
  state.iconSprites.forEach(sprite => noteGroup.remove(sprite));
  state.iconSprites = [];

  // 波紋を削除
  clearRipples();

  // 状態をリセット
  state.midi = null;
  state.duration = 0;
  state.currentTime = 0;
  state.tracks = [];
  state.groupedTracks = [];
  state.triggeredNotes.clear();

  // UIをリセット
  document.getElementById('midiFileName').textContent = '未選択（ドロップ可）';
  document.getElementById('midiClearBtn').style.display = 'none';
  document.getElementById('playBtn').disabled = true;
  document.getElementById('stopBtn').disabled = true;
  const rb = document.getElementById('resetBtn');
  if (rb) rb.disabled = true;
  updateTimeDisplay();
  updateTrackPanel();

  // メディア参照をクリア
  if (window.currentMediaRefs) window.currentMediaRefs.midi = null;

  console.log('MIDI cleared');
}

// 音源クリア
function clearAudio() {
  cleanupCrossfade();
  if (audioElement) {
    audioElement.pause();
    audioElement.src = '';
    audioElement = null;
  }
  audioSrcUrl = null;
  document.getElementById('audioFileName').textContent = '未選択（ドロップ可）';
  document.getElementById('audioClearBtn').style.display = 'none';

  // メディア参照をクリア
  if (window.currentMediaRefs) window.currentMediaRefs.audio = null;

  console.log('Audio cleared');
}

// 音源ファイルの読み込み
function loadAudio(file) {
  // 既存のオーディオ要素があれば停止・削除
  if (audioElement) {
    audioElement.pause();
    audioElement.src = '';
    audioElement = null;
  }
  // MediaElementSourceは再利用不可なのでリセット
  audioSource = null;

  // 新しいオーディオ要素を作成
  audioElement = new Audio();
  audioElement.crossOrigin = 'anonymous';
  audioSrcUrl = URL.createObjectURL(file);
  audioElement.src = audioSrcUrl;
  audioElement.load();

  // ビジュアライザー接続
  setupAudioVisualizer();

  console.log(`Audio loaded: ${file.name}`);
}

// ============================================
// スペクトラム
// ============================================
function setupAudioVisualizer() {
  if (!audioElement || !scene) return;

  // AudioContext接続（audioElementが差し替わったら再接続）
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (!analyser) {
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 4096;
    analyser.smoothingTimeConstant = 0.4;
    analyser.minDecibels = -70;
    analyser.maxDecibels = -10;
    analyser.connect(audioContext.destination);
  }
  if (vizConnectedElement !== audioElement) {
    // 前のソースを切断
    if (audioSource) { try { audioSource.disconnect(); } catch(e) {} }
    audioSource = audioContext.createMediaElementSource(audioElement);
    audioSource.connect(analyser);
    vizConnectedElement = audioElement;
    vizFrequencyData = new Uint8Array(analyser.frequencyBinCount);
  }

  // 既存を削除
  if (vizBarsGroup) {
    (noteGroup || scene).remove(vizBarsGroup);
    vizBarsGroup.traverse(child => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) child.material.dispose();
    });
  }

  const style = document.getElementById('audioVisualizerStyle')?.value || 'bar';
  const barCount = parseInt(document.getElementById('audioVisualizerBars')?.value || 64);
  const baseRadius = parseInt(document.getElementById('audioVisualizerRadius')?.value || 18);
  const centerY = 0; // グループ自体がタイムライン中心に配置されるため内部オフセット不要

  vizBarsGroup = new THREE.Group();
  vizBarsGroup._vizStyle = style;
  vizBarsGroup._vizBarCount = barCount;
  vizPrevValues = new Float32Array(barCount);

  // --- グローテクスチャ（バー系スタイル用） ---
  const glowCanvas = document.createElement('canvas');
  glowCanvas.width = 128; glowCanvas.height = 4;
  const ctx = glowCanvas.getContext('2d');
  const imgData = ctx.createImageData(128, 4);
  for (let x = 0; x < 128; x++) {
    const t = (x - 63.5) / 63.5;
    const core = Math.exp(-t * t * 80);
    const glow = Math.exp(-t * t * 5);
    const a = Math.min(1, core + glow * 0.5);
    const w = Math.min(255, core * 255 + glow * 80);
    for (let y = 0; y < 4; y++) {
      const idx = (y * 128 + x) * 4;
      imgData.data[idx] = imgData.data[idx+1] = imgData.data[idx+2] = w;
      imgData.data[idx+3] = a * 255;
    }
  }
  ctx.putImageData(imgData, 0, 0);
  const glowTexture = new THREE.CanvasTexture(glowCanvas);

  // --- ドットテクスチャ（円形放射グロー） ---
  const dotCanvas = document.createElement('canvas');
  dotCanvas.width = 64; dotCanvas.height = 64;
  const dctx = dotCanvas.getContext('2d');
  const dGrad = dctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  dGrad.addColorStop(0, 'rgba(255,255,255,1)');
  dGrad.addColorStop(0.15, 'rgba(255,255,255,0.7)');
  dGrad.addColorStop(0.5, 'rgba(255,255,255,0.15)');
  dGrad.addColorStop(1, 'rgba(255,255,255,0)');
  dctx.fillStyle = dGrad;
  dctx.fillRect(0, 0, 64, 64);
  const dotTexture = new THREE.CanvasTexture(dotCanvas);

  const outerRadius = baseRadius + 60;
  const planeW = (2 * Math.PI * outerRadius / barCount) * 1.8;
  const vizOpacity = parseFloat(document.getElementById('audioVisualizerOpacity')?.value ?? 0.9);
  const additiveMat = () => new THREE.MeshBasicMaterial({
    map: glowTexture, color: 0xffffff, transparent: true, opacity: vizOpacity,
    blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
  });

  // ========== スタイル別ジオメトリ生成 ==========
  if (style === 'bar' || style === 'mirror' || style === 'dot') {
    // --- ピボット方式 ---
    for (let i = 0; i < barCount; i++) {
      const angle = (i / barCount) * Math.PI * 2;
      const pivot = new THREE.Group();
      pivot.position.set(0, centerY, 0);
      pivot.rotation.x = -angle;

      if (style === 'bar') {
        const geo = new THREE.PlaneGeometry(planeW, 1);
        const bar = new THREE.Mesh(geo, additiveMat());
        bar.rotation.y = Math.PI / 2;
        bar.position.y = baseRadius + 0.5;
        pivot.add(bar);
      } else if (style === 'mirror') {
        // 外向き
        const geoOut = new THREE.PlaneGeometry(planeW, 1);
        const barOut = new THREE.Mesh(geoOut, additiveMat());
        barOut.rotation.y = Math.PI / 2;
        barOut.position.y = baseRadius + 0.5;
        pivot.add(barOut);
        // 内向き
        const geoIn = new THREE.PlaneGeometry(planeW * 0.7, 1);
        const barIn = new THREE.Mesh(geoIn, additiveMat());
        barIn.rotation.y = Math.PI / 2;
        barIn.position.y = baseRadius - 0.5;
        pivot.add(barIn);
      } else if (style === 'dot') {
        // 連続ドットで棒状に（baseRadiusから外側に等間隔配置）
        const dotsPerBar = 20;
        const dotSpacing = 8;
        const dotSize = dotSpacing * 0.65;
        const dotGeo = new THREE.PlaneGeometry(dotSize, dotSize);
        const dotMat = new THREE.MeshBasicMaterial({
          map: dotTexture, color: 0xffffff, transparent: true, opacity: vizOpacity,
          blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
        });
        for (let d = 0; d < dotsPerBar; d++) {
          const dot = new THREE.Mesh(dotGeo, dotMat);
          dot.rotation.y = Math.PI / 2;
          dot.position.y = baseRadius + dotSpacing * (d + 0.5);
          dot.visible = false;
          pivot.add(dot);
        }
      }
      vizBarsGroup.add(pivot);
    }

  } else if (style === 'wave') {
    // --- 複数同心リボン（baseRadiusから振幅まで埋める） ---
    const ringCount = 6;
    const segCount = barCount;
    for (let r = 0; r < ringCount; r++) {
      const vertCount = (segCount + 1) * 2;
      const positions = new Float32Array(vertCount * 3);
      const uvs = new Float32Array(vertCount * 2);
      const indices = [];
      for (let i = 0; i <= segCount; i++) {
        const vi = i * 2;
        uvs[vi * 2] = 0;     uvs[vi * 2 + 1] = i / segCount;
        uvs[(vi+1) * 2] = 1; uvs[(vi+1) * 2 + 1] = i / segCount;
        if (i < segCount) {
          const a = vi, b = vi+1, c = vi+2, d = vi+3;
          indices.push(a, c, b, b, c, d);
        }
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
      geo.setIndex(indices);
      const ringOpacity = (0.5 + (r / (ringCount - 1)) * 0.4) * vizOpacity; // 内側薄め→外側濃め × 透明度
      const mat = new THREE.MeshBasicMaterial({
        map: glowTexture, color: 0xffffff, transparent: true, opacity: ringOpacity,
        blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(0, centerY, 0);
      vizBarsGroup.add(mesh);
    }

  }

  // 全メッシュ: フラスタムカリング無効化、床に遮蔽されないようdepthTest無効
  vizBarsGroup.traverse(child => {
    if (child.isMesh) {
      child.frustumCulled = false;
      child.renderOrder = 5;
      child.material.depthTest = false;
    }
  });

  // グループ位置（タイムライン幕の中心に配置）
  const tlOffset = document.getElementById('timelineX')?.value || 0;
  const groupY = (timelinePlane ? timelinePlane.position.y : floorY + 75) + (CONFIG.noteYOffset || 0);
  vizBarsGroup.position.set(parseInt(tlOffset), groupY, 0);
  (noteGroup || scene).add(vizBarsGroup);
  vizPrevValues.fill(0);
  console.log('Audio visualizer initialized: ' + style);
}

function updateAudioVisualizer() {
  if (!vizBarsGroup || !analyser || !vizFrequencyData) return;

  // audioElementが差し替わっていたら再接続（ループ時のオーバーラップ切替対応）
  if (audioElement && vizConnectedElement !== audioElement && audioContext) {
    if (audioSource) { try { audioSource.disconnect(); } catch(e) {} }
    audioSource = audioContext.createMediaElementSource(audioElement);
    audioSource.connect(analyser);
    vizConnectedElement = audioElement;
  }

  const enabled = document.getElementById('audioVisualizerEnabled')?.checked;
  if (!enabled) { vizBarsGroup.visible = false; return; }
  vizBarsGroup.visible = true;

  const tlOffset = document.getElementById('timelineX')?.value || 0;
  vizBarsGroup.position.x = parseInt(tlOffset);

  // タイムライン幕の中心に追従（高さオフセットも加算）
  if (timelinePlane) {
    vizBarsGroup.position.y = timelinePlane.position.y + (CONFIG.noteYOffset || 0);
  }

  const scaleVal = parseFloat(document.getElementById('audioVisualizerScale')?.value || 1);
  const maxHeight = 100 * scaleVal;
  const radius = parseInt(document.getElementById('audioVisualizerRadius')?.value || 18);
  const style = vizBarsGroup._vizStyle;
  const barCount = vizBarsGroup._vizBarCount;

  analyser.getByteFrequencyData(vizFrequencyData);

  // --- 対数マッピングで全バーの値を計算 ---
  const binCount = analyser.frequencyBinCount;
  const freqPerBin = audioContext.sampleRate / analyser.fftSize;
  const minFreq = 50, maxFreq = 8000;
  const values = new Float32Array(barCount);
  for (let i = 0; i < barCount; i++) {
    const f0 = minFreq * Math.pow(maxFreq / minFreq, i / barCount);
    const f1 = minFreq * Math.pow(maxFreq / minFreq, (i + 1) / barCount);
    const bin0 = Math.max(0, Math.floor(f0 / freqPerBin));
    const bin1 = Math.min(binCount - 1, Math.ceil(f1 / freqPerBin));
    let sum = 0, cnt = 0;
    for (let b = bin0; b <= bin1; b++) { sum += vizFrequencyData[b]; cnt++; }
    let raw = cnt > 0 ? (sum / cnt) / 255 : 0;
    // 高域ブースト: 周波数が上がるほどゲインを加算（高域のエネルギー不足を補正）
    const freqRatio = i / barCount;
    const boost = 1.0 + freqRatio * freqRatio * 4.0;
    raw = Math.min(raw * boost, 1.0);
    const smoothed = vizPrevValues[i] * 0.35 + raw * 0.65;
    vizPrevValues[i] = smoothed;
    values[i] = smoothed;
  }

  // ========== スタイル別更新 ==========
  const minTick = 2; // 無音時の最小目盛サイズ

  if (style === 'bar') {
    const pivots = vizBarsGroup.children;
    for (let i = 0; i < pivots.length; i++) {
      const bar = pivots[i].children[0];
      const h = Math.max(minTick, values[i] * maxHeight);
      bar.scale.y = h;
      bar.position.y = radius + h / 2;
    }

  } else if (style === 'mirror') {
    const pivots = vizBarsGroup.children;
    for (let i = 0; i < pivots.length; i++) {
      const h = Math.max(minTick, values[i] * maxHeight);
      const hIn = Math.min(Math.max(minTick * 0.7, values[i] * maxHeight * 0.5), radius - 2);
      const barOut = pivots[i].children[0];
      barOut.scale.y = h;
      barOut.position.y = radius + h / 2;
      const barIn = pivots[i].children[1];
      barIn.scale.y = hIn;
      barIn.position.y = radius - hIn / 2;
    }

  } else if (style === 'dot') {
    // 連続ドット: 振幅に応じてドットのvisibilityを切り替え（最低1個は常時表示）
    const pivots = vizBarsGroup.children;
    const dotSpacing = 8;
    for (let i = 0; i < pivots.length; i++) {
      const h = values[i] * maxHeight;
      const dots = pivots[i].children;
      for (let d = 0; d < dots.length; d++) {
        const dotDist = dotSpacing * (d + 0.5);
        dots[d].visible = d === 0 || dotDist <= h;
        dots[d].position.y = radius + dotDist; // 半径スライダー追従
      }
    }

  } else if (style === 'wave') {
    // 複数同心リング: 各リングがbaseRadius→振幅の間を分担（最小半径オフセットで目盛表示）
    const ringCount = vizBarsGroup.children.length;
    const ribbonW = 1.5 + scaleVal;
    for (let r = 0; r < ringCount; r++) {
      const mesh = vizBarsGroup.children[r];
      const pos = mesh.geometry.attributes.position.array;
      const fraction = (r + 1) / ringCount; // 0.167, 0.333, ... 1.0
      for (let i = 0; i <= barCount; i++) {
        const idx = i % barCount;
        const angle = (idx / barCount) * Math.PI * 2;
        const rr = radius + Math.max(minTick, values[idx] * maxHeight * fraction);
        const cosA = Math.cos(angle), sinA = Math.sin(angle);
        const vi = i * 2;
        pos[vi*3] = 0;     pos[vi*3+1] = (rr - ribbonW) * cosA; pos[vi*3+2] = (rr - ribbonW) * sinA;
        pos[(vi+1)*3] = 0; pos[(vi+1)*3+1] = (rr + ribbonW) * cosA; pos[(vi+1)*3+2] = (rr + ribbonW) * sinA;
      }
      mesh.geometry.attributes.position.needsUpdate = true;
      mesh.geometry.computeBoundingSphere();
    }

  }
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
    // グループ内の最初のトラックからpitchMin/pitchMaxを取得
    const firstTrackInfo = state.tracks[group.trackIndices[0]];
    const currentPitchMin = firstTrackInfo ? firstTrackInfo.pitchMin : 0;
    const currentPitchMax = firstTrackInfo ? firstTrackInfo.pitchMax : 127;

    item.innerHTML = `
      <div class="track-icon">${iconHtml}</div>
      <div class="track-color" style="background: #${instrument.color.toString(16).padStart(6, '0')}"></div>
      <div class="track-info">
        <div class="track-name">${group.name}</div>
        <select class="instrument-select" data-track-name="${group.name}">
          ${instrumentOptions}
        </select>
        <div class="track-pitch-filter">
          <label>音域</label>
          <input type="number" class="pitch-min" min="0" max="127" value="${currentPitchMin}" title="下限" data-track-name="${group.name}">
          <span class="pitch-note-name pitch-min-name">${midiToNoteName(currentPitchMin)}</span>
          〜
          <input type="number" class="pitch-max" min="0" max="127" value="${currentPitchMax}" title="上限" data-track-name="${group.name}">
          <span class="pitch-note-name pitch-max-name">${midiToNoteName(currentPitchMax)}</span>
        </div>
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

    // 音域フィルター変更イベント
    item.querySelector('.pitch-min')?.addEventListener('change', (e) => {
      const trackName = e.target.dataset.trackName;
      const val = Math.max(0, Math.min(127, parseInt(e.target.value) || 0));
      e.target.value = val;
      e.target.closest('.track-pitch-filter').querySelector('.pitch-min-name').textContent = midiToNoteName(val);
      let currentMax = 127;
      state.tracks.forEach(track => {
        if (track.name === trackName) { track.pitchMin = val; currentMax = track.pitchMax; }
      });
      savePitchFilter(trackName, val, currentMax);
      debouncedRebuildNotes();
    });
    item.querySelector('.pitch-max')?.addEventListener('change', (e) => {
      const trackName = e.target.dataset.trackName;
      const val = Math.max(0, Math.min(127, parseInt(e.target.value) || 127));
      e.target.value = val;
      e.target.closest('.track-pitch-filter').querySelector('.pitch-max-name').textContent = midiToNoteName(val);
      let currentMin = 0;
      state.tracks.forEach(track => {
        if (track.name === trackName) { track.pitchMax = val; currentMin = track.pitchMin; }
      });
      savePitchFilter(trackName, currentMin, val);
      debouncedRebuildNotes();
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
  const rb = document.getElementById('resetBtn');
  if (rb) rb.disabled = false;
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
  const md = syncConfig.midiDelay;

  // 各トラックが現在鳴っているかチェック
  const playingTrackNames = new Set();

  state.noteObjects.forEach(mesh => {
    const { trackIndex, startTime, endTime } = mesh.userData;
    if (currentTime >= startTime + md && currentTime <= endTime + md) {
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
    noteGroup.remove(obj);
    if (obj.geometry) obj.geometry.dispose();
    if (obj.material) obj.material.dispose();
  });
  state.noteObjects = [];

  const midi = state.midi;
  if (!midi) return;

  // 全トラックの音域を計算（中央揃え用）
  // 音域フィルター範囲外のノートは除外
  let minPitch = 127, maxPitch = 0;
  midi.tracks.forEach((track, trackIndex) => {
    const trackInfo = state.tracks[trackIndex];
    track.notes.forEach(note => {
      if (trackInfo && (note.midi < trackInfo.pitchMin || note.midi > trackInfo.pitchMax)) return;
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
      if (CONFIG.velocityFilter > 0 && note.velocity < CONFIG.velocityFilter / 127) return; // キースイッチ除外
      if (note.midi < trackInfo.pitchMin || note.midi > trackInfo.pitchMax) return; // 音域フィルター
      // ノートの位置とサイズ
      const x = note.time * CONFIG.timeScale;
      const width = note.duration * CONFIG.timeScale;
      // 地面基準で上に展開（最低音が床のすぐ上に来る）
      const floorOffset = 5; // 床からの余白
      const y = (note.midi - minPitch) * CONFIG.pitchScale + floorY + floorOffset + CONFIG.noteYOffset;

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
        opacity: CONFIG.noteOpacity,
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.layers.set(1); // ノートはレイヤー1のみ（ブルーム選択制御用）
      mesh.castShadow = !!document.getElementById('noteShadowEnabled')?.checked;
      mesh.customDepthMaterial = createNoteShadowDepthMaterial(CONFIG.noteOpacity);
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
        originalY: y,          // 元のY座標を保存（曲率補正用）
      };

      noteGroup.add(mesh);
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

  // 壁面・床パネルの位置/回転/透明度をDOM値から一括同期
  // （ここにインラインで書くとsyncWallSettingsFromDOMとの二重管理になるため関数に委譲）
  syncWallSettingsFromDOM();

  // カメラ位置はMIDI読み込み時に変更しない（setupThreeJSで設定した位置を維持）

  console.log(`Created ${state.noteObjects.length} note objects`);
}

// ============================================
// 3D楽器アイコン（タイムライン幕上）
// ============================================
function create3DInstrumentIcons() {
  // 既存のアイコンを削除
  state.iconSprites.forEach(sprite => noteGroup.remove(sprite));
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
  // ベロシティ10未満はキースイッチとして除外
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
    const tlXSlider = document.getElementById('timelineX');
    const tlX = tlXSlider ? parseInt(tlXSlider.value) : 0;
    sprite.position.set(tlX, yPosition, avgZPosition);
    sprite.scale.set(8, 8, 1);

    // グループ情報を保持
    sprite.userData = {
      instrumentId: group.instrumentId,
      trackIndices: group.trackIndices,
      baseScale: 8,
    };

    sprite.layers.set(1); // ノートと同じレイヤー（ブルーム対象）
    noteGroup.add(sprite);
    state.iconSprites.push(sprite);
  });

  console.log(`Created ${state.iconSprites.length} 3D instrument icons`);
}

// 3Dアイコンのハイライト更新
function update3DIconHighlights() {
  const currentTime = state.currentTime;
  const md = syncConfig.midiDelay;

  // 各トラックが現在鳴っているかチェック
  const playingTracks = new Set();

  state.noteObjects.forEach(mesh => {
    const { trackIndex, startTime, endTime } = mesh.userData;
    if (currentTime >= startTime + md && currentTime <= endTime + md) {
      playingTracks.add(trackIndex);
    }
  });

  // 各アイコンの状態を更新（グループ内のいずれかのトラックが鳴っていれば光る）
  const iconTlXSlider = document.getElementById('timelineX');
  const iconTlX = iconTlXSlider ? parseInt(iconTlXSlider.value) : 0;
  state.iconSprites.forEach(sprite => {
    const { trackIndices, baseScale } = sprite.userData;
    const isPlaying = trackIndices.some(idx => playingTracks.has(idx));
    sprite.position.x = iconTlX;

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

  noteGroup.add(ripple);
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
      noteGroup.remove(ripple);
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
  const tlXSlider2 = document.getElementById('timelineX');
  const tlX2 = tlXSlider2 ? parseInt(tlXSlider2.value) : 0;
  sprite.position.set(tlX2, y, z); // タイムライン上からスタート
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

  sprite.layers.set(1); // ノートと同じレイヤー（ブルーム制御対象）
  noteGroup.add(sprite);
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
      noteGroup.remove(icon);
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
  const md = syncConfig.midiDelay;

  state.noteObjects.forEach((mesh, index) => {
    const { startTime, originalColor, trackIndex } = mesh.userData;
    const noteId = index;

    // ノートがちょうどタイムラインを通過したとき（開始時）
    if (!state.triggeredNotes.has(noteId) && currentTime >= startTime + md && currentTime < startTime + md + 0.05) {
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

      // バスドラム検出でエフェクト発動
      if (trackInfo) {
        const instrumentId = trackInfo.instrumentId;
        if (instrumentId === 'bassdrum' || instrumentId === 'drums' || instrumentId === 'timpani') {
          const velocity = mesh.userData.velocity || 0.8; // 0-1の範囲
          triggerBassDrumEffects(velocity);
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
    if (currentTime < startTime + md) {
      state.triggeredNotes.delete(noteId);
    }
  });
}

// ============================================
// バスドラムエフェクト発動
// ============================================

function triggerBassDrumEffects(velocity = 1) {
  // バスドラ専用: 幕フラッシュ
  if (effects.curtainFlash.intensity > 0) {
    triggerFlashEffect(velocity);
  }

  // 選択式エフェクト（バスドラ選択時のみ）
  if (effects.cameraShake.trigger === 'bass' && effects.cameraShake.intensity > 0) {
    triggerCameraShake(velocity);
  }
  if (effects.cameraZoom.trigger === 'bass' && effects.cameraZoom.intensity > 0) {
    triggerBassZoom(velocity);
  }
  if (effects.flash.trigger === 'bass' && effects.flash.intensity > 0) {
    triggerBeatFlash(); // 画面フラッシュ
  }
  if (effects.blur.trigger === 'bass' && effects.blur.intensity > 0) {
    triggerBlurEffect(velocity);
  }
  if (effects.crack.trigger === 'bass' && effects.crack.intensity > 0) {
    triggerBassCrack(velocity);
  }
  if (effects.glitch.trigger === 'bass' && effects.glitch.intensity > 0) {
    triggerBassGlitch(velocity);
  }
}

// バスドラ用ズームエフェクト
function triggerBassZoom(velocity = 1) {
  if (!camera) return;
  const intensity = effects.cameraZoom.intensity * velocity;
  camera.fov = beatEffectState.originalFOV * (1 - intensity * 0.1);
  camera.updateProjectionMatrix();
  setTimeout(() => {
    camera.fov = beatEffectState.originalFOV;
    camera.updateProjectionMatrix();
  }, 100);
}

// バスドラ用ひび割れエフェクト
function triggerBassCrack(velocity = 1) {
  const amount = effects.crack.intensity * velocity;
  updateCrackEffect(amount);
  setTimeout(() => updateCrackEffect(0), 200);
}

// バスドラ用グリッチエフェクト
function triggerBassGlitch(velocity = 1) {
  const amount = effects.glitch.intensity * velocity;
  updateGlitchEffect(amount);
  setTimeout(() => updateGlitchEffect(0), 150);
}

// ============================================
// カメラシェイク
// ============================================

function triggerCameraShake(velocity = 1) {
  if (!camera || cameraTransition) return; // 遷移中はシェイクしない

  cameraShakeState.active = true;
  cameraShakeState.startTime = performance.now();
  cameraShakeState.velocity = velocity; // ベロシティを保存
}

// シェイクオフセットを計算（カメラ位置は変更しない）
function calculateCameraShakeOffset() {
  if (!cameraShakeState.active || !camera) {
    cameraShakeState.offsetX = 0;
    cameraShakeState.offsetY = 0;
    return;
  }

  const elapsed = (performance.now() - cameraShakeState.startTime) / 1000;

  if (elapsed >= cameraShakeDuration) {
    cameraShakeState.active = false;
    cameraShakeState.offsetX = 0;
    cameraShakeState.offsetY = 0;
    return;
  }

  // 減衰するランダムシェイク（ベロシティで強さを調整）
  const decay = 1 - (elapsed / cameraShakeDuration);
  const velocityScale = cameraShakeState.velocity || 1;
  const intensity = cameraShakeIntensity * decay * velocityScale;

  cameraShakeState.offsetX = (Math.random() - 0.5) * 2 * intensity;
  cameraShakeState.offsetY = (Math.random() - 0.5) * 2 * intensity;
}

// シェイクオフセットをカメラに適用
function applyCameraShakeOffset() {
  if (camera && (cameraShakeState.offsetX !== 0 || cameraShakeState.offsetY !== 0)) {
    camera.position.x += cameraShakeState.offsetX;
    camera.position.y += cameraShakeState.offsetY;
  }
}

// シェイクオフセットをカメラから除去
function removeCameraShakeOffset() {
  if (camera && (cameraShakeState.offsetX !== 0 || cameraShakeState.offsetY !== 0)) {
    camera.position.x -= cameraShakeState.offsetX;
    camera.position.y -= cameraShakeState.offsetY;
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
// ビート連動エフェクト
// ============================================

function updateBeatPhase() {
  if (!state.isPlaying || !state.midi) return;

  const currentTime = state.currentTime;
  const header = state.midi.header;
  const ppq = header.ppq;

  // MIDIテンポマップに基づく正確なtick位置を取得
  const currentTicks = header.secondsToTicks(currentTime);

  // tick基準でビート位相（0-1）を計算（PPQ = 1拍のtick数）
  const beatTicks = currentTicks % ppq;
  beatEffectState.phase = beatTicks / ppq;

  // 小節位相（0-1）を計算
  const barTicks = ppq * tempoInfo.beatsPerBar;
  beatEffectState.barPhase = (currentTicks % barTicks) / barTicks;

  // 新しいビートを検出（tick基準）
  const newBeat = Math.floor(currentTicks / ppq);
  if (newBeat !== tempoInfo.currentBeat) {
    tempoInfo.currentBeat = newBeat;
    onBeat(newBeat);
  }
}

function onBeat(beatNumber) {
  // 小節の頭かどうか
  const isBarStart = beatNumber % tempoInfo.beatsPerBar === 0;

  // テンポ専用エフェクト
  if (effects.strobe.intensity > 0) {
    triggerStrobe();
  }
  if (isBarStart && effects.colorShift.intensity > 0) {
    triggerColorShift();
  }

  // 選択式エフェクト（テンポ選択時のみ）
  if (effects.flash.trigger === 'tempo' && effects.flash.intensity > 0) {
    triggerBeatFlash();
  }
}

function updateBeatEffects() {
  if (!state.isPlaying) return;

  const phase = beatEffectState.phase;
  const easePhase = 1 - phase; // 減衰用（ビート直後が1、次のビート直前が0）

  // カメラ揺れ（テンポ選択時）
  const cameraShakeTempo = effects.cameraShake.trigger === 'tempo' && effects.cameraShake.intensity > 0;
  if (cameraShakeTempo && camera && !cameraShakeState.active) {
    const intensity = effects.cameraShake.intensity * 5 * easePhase * easePhase;
    if (intensity > 0.1) {
      const offsetX = (Math.random() - 0.5) * intensity;
      const offsetY = (Math.random() - 0.5) * intensity;
      camera.position.x += offsetX;
      camera.position.y += offsetY;
    }
  }

  // カメラズーム（テンポ選択時）
  const cameraZoomTempo = effects.cameraZoom.trigger === 'tempo' && effects.cameraZoom.intensity > 0;
  if (cameraZoomTempo && camera) {
    const zoomAmount = Math.sin(phase * Math.PI) * effects.cameraZoom.intensity * 0.1;
    camera.fov = beatEffectState.originalFOV * (1 - zoomAmount);
    camera.updateProjectionMatrix();
  }

  // カメラ回転（テンポ専用）
  if (effects.cameraRotation.intensity > 0 && camera) {
    const rotAmount = Math.sin(beatEffectState.barPhase * Math.PI * 2) * effects.cameraRotation.intensity * 0.15;
    const angle = rotAmount * Math.PI;
    camera.up.set(Math.sin(angle), Math.cos(angle), 0);
  } else if (camera) {
    camera.up.set(0, 1, 0);
  }

  // 背景パルス（テンポ専用）
  if (effects.backgroundPulse.intensity > 0 && scene) {
    const pulseAmount = easePhase * effects.backgroundPulse.intensity * 0.5;
    const topColor = document.getElementById('bgColorTop').value;
    const bottomColor = document.getElementById('bgColorBottom').value;

    const baseTop = new THREE.Color(topColor);
    const baseBottom = new THREE.Color(bottomColor);
    const pulseTop = baseTop.clone().multiplyScalar(1 + pulseAmount);
    const pulseBottom = baseBottom.clone().multiplyScalar(1 + pulseAmount);

    const midpointEl = document.getElementById('bgGradientMidpoint');
    const pulseMidpoint = midpointEl ? parseInt(midpointEl.value) / 100 : 0.5;
    scene.background = createBackgroundGradientTexture(
      '#' + pulseTop.getHexString(),
      '#' + pulseBottom.getHexString(),
      pulseMidpoint
    );
  }

  // 空間パルス（テンポ専用）
  if (effects.spacePulse.intensity > 0 && camera) {
    const fovChange = Math.sin(phase * Math.PI * 2) * effects.spacePulse.intensity * 0.1 * 10;
    camera.fov = beatEffectState.originalFOV + fovChange;
    camera.updateProjectionMatrix();
  }

  // ブラー（テンポ選択時）
  const blurTempo = effects.blur.trigger === 'tempo' && effects.blur.intensity > 0;
  if (blurTempo && renderer) {
    const blurAmount = easePhase * easePhase * effects.blur.intensity * 6;
    if (blurAmount > 0.1) {
      renderer.domElement.style.filter = `blur(${blurAmount}px)`;
    } else {
      renderer.domElement.style.filter = '';
    }
  } else if (renderer && !blurTempo) {
    // テンポブラーが無効の場合のみリセット（バスドラブラーと競合しないよう）
  }

  // ひび割れ（テンポ選択時）
  const crackTempo = effects.crack.trigger === 'tempo' && effects.crack.intensity > 0;
  if (crackTempo) {
    const amount = easePhase * effects.crack.intensity;
    updateCrackEffect(amount);
  }

  // グリッチ（テンポ選択時）
  const glitchTempo = effects.glitch.trigger === 'tempo' && effects.glitch.intensity > 0;
  if (glitchTempo) {
    const amount = easePhase * effects.glitch.intensity;
    updateGlitchEffect(amount);
  }
}

// ひび割れエフェクト
let crackPattern = null; // ひび割れパターンをキャッシュ

function updateCrackEffect(amount) {
  if (!renderer || !renderer.domElement) return;
  const canvas = renderer.domElement;
  const container = canvas.parentElement;
  if (!container) return;

  let crackCanvas = document.getElementById('crackOverlay');

  if (amount > 0.1) {
    if (!crackCanvas) {
      crackCanvas = document.createElement('canvas');
      crackCanvas.id = 'crackOverlay';
      crackCanvas.style.cssText = `
        position: absolute;
        pointer-events: none;
      `;
      container.appendChild(crackCanvas);
    }

    // キャンバス（アスペクト範囲）の位置とサイズに合わせる
    const rect = canvas.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    crackCanvas.style.left = (rect.left - containerRect.left) + 'px';
    crackCanvas.style.top = (rect.top - containerRect.top) + 'px';
    crackCanvas.style.width = rect.width + 'px';
    crackCanvas.style.height = rect.height + 'px';

    if (crackCanvas.width !== rect.width || crackCanvas.height !== rect.height) {
      crackCanvas.width = rect.width;
      crackCanvas.height = rect.height;
      crackPattern = null; // サイズ変更時にパターン再生成
    }

    const ctx = crackCanvas.getContext('2d');
    ctx.clearRect(0, 0, crackCanvas.width, crackCanvas.height);

    // ビートごとに新しいひび割れパターンを生成
    if (!crackPattern || Math.random() < 0.3) {
      crackPattern = generateCrackPattern(crackCanvas.width, crackCanvas.height, amount);
    }

    // ひび割れを描画
    ctx.strokeStyle = `rgba(255, 255, 255, ${amount * 0.8})`;
    ctx.lineWidth = 1 + amount * 2;
    ctx.lineCap = 'round';

    crackPattern.forEach(crack => {
      ctx.beginPath();
      ctx.moveTo(crack.startX, crack.startY);
      crack.points.forEach(point => {
        ctx.lineTo(point.x, point.y);
      });
      ctx.stroke();
    });

    crackCanvas.style.opacity = '1';
  } else {
    if (crackCanvas) {
      crackCanvas.style.opacity = '0';
    }
    crackPattern = null;
  }
}

function generateCrackPattern(width, height, intensity) {
  const cracks = [];
  const crackCount = Math.floor(3 + intensity * 8);

  for (let i = 0; i < crackCount; i++) {
    // ランダムな開始点（画面の中央寄り）
    const startX = width * (0.2 + Math.random() * 0.6);
    const startY = height * (0.2 + Math.random() * 0.6);

    const crack = {
      startX,
      startY,
      points: []
    };

    // ひび割れの長さと方向
    let x = startX;
    let y = startY;
    let angle = Math.random() * Math.PI * 2;
    const segmentCount = 5 + Math.floor(intensity * 15);

    for (let j = 0; j < segmentCount; j++) {
      // 少しずつ方向を変えながら進む
      angle += (Math.random() - 0.5) * 0.8;
      const length = 10 + Math.random() * 30 * intensity;

      x += Math.cos(angle) * length;
      y += Math.sin(angle) * length;

      crack.points.push({ x, y });

      // 分岐
      if (Math.random() < 0.3 * intensity && j > 2) {
        const branchAngle = angle + (Math.random() - 0.5) * 1.5;
        const branchLength = 5 + Math.random() * 20;
        crack.points.push({
          x: x + Math.cos(branchAngle) * branchLength,
          y: y + Math.sin(branchAngle) * branchLength
        });
        crack.points.push({ x, y }); // 元に戻る
      }
    }

    cracks.push(crack);
  }

  return cracks;
}

// グリッチエフェクト（映像乱れ）
function updateGlitchEffect(amount) {
  if (!renderer || !renderer.domElement) return;
  const canvas = renderer.domElement;

  if (amount > 0.2) {
    // ランダムなスライス効果
    const sliceCount = Math.floor(amount * 10);
    let clipPath = '';

    for (let i = 0; i < sliceCount; i++) {
      const y1 = Math.random() * 100;
      const y2 = y1 + Math.random() * 5;
      const offsetX = (Math.random() - 0.5) * amount * 30;

      if (i > 0) clipPath += ', ';
      clipPath += `inset(${y1}% ${offsetX < 0 ? -offsetX : 0}px ${100 - y2}% ${offsetX > 0 ? offsetX : 0}px)`;
    }

    // RGBずれ + スキャンライン
    const rgbShift = amount * 8;
    canvas.style.textShadow = `${rgbShift}px 0 rgba(255,0,0,0.5), -${rgbShift}px 0 rgba(0,255,255,0.5)`;
    canvas.style.filter = `contrast(${1 + amount * 0.3}) saturate(${1 + amount * 0.5})`;

    // 一瞬の位置ずれ
    if (Math.random() < amount * 0.3) {
      canvas.style.transform = `translateX(${(Math.random() - 0.5) * amount * 20}px)`;
    }
  } else {
    canvas.style.textShadow = '';
    canvas.style.filter = '';
    canvas.style.transform = '';
  }
}

function triggerBeatFlash() {
  // キャンバス（アスペクト範囲）内のフラッシュ
  if (!renderer || !renderer.domElement) return;
  const canvas = renderer.domElement;

  let flashOverlay = document.getElementById('beatFlashOverlay');
  if (!flashOverlay) {
    flashOverlay = document.createElement('div');
    flashOverlay.id = 'beatFlashOverlay';
    flashOverlay.style.cssText = `
      position: absolute;
      background: white;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.1s ease-out;
    `;
    canvas.parentElement.appendChild(flashOverlay);
  }

  // キャンバスの位置とサイズに合わせる
  const rect = canvas.getBoundingClientRect();
  const containerRect = canvas.parentElement.getBoundingClientRect();
  flashOverlay.style.left = (rect.left - containerRect.left) + 'px';
  flashOverlay.style.top = (rect.top - containerRect.top) + 'px';
  flashOverlay.style.width = rect.width + 'px';
  flashOverlay.style.height = rect.height + 'px';

  // フラッシュの強さに応じた透明度
  const intensity = beatEffects.beatFlash.intensity;
  flashOverlay.style.opacity = intensity;

  // フェードアウト
  setTimeout(() => {
    flashOverlay.style.opacity = '0';
  }, 50);
}

// ── 雷エフェクト ──

let lightningGlowTexture = null;
function getLightningGlowTexture() {
  if (lightningGlowTexture) return lightningGlowTexture;
  const size = 64;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.3, 'rgba(255,255,255,0.4)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  lightningGlowTexture = new THREE.CanvasTexture(c);
  return lightningGlowTexture;
}

function buildLightningBolt(branch = false, branchOrigin = null) {
  // スカイドームの半径を取得（DOM値 or デフォルト2000）
  const radiusEl = document.getElementById('skyDomeRadius');
  const domeRadius = radiusEl ? parseFloat(radiusEl.value) : 2000;
  // スカイドームのYオフセットを取得
  const offsetYEl = document.getElementById('skyDomeOffsetY');
  const domeOffsetY = offsetYEl ? parseFloat(offsetYEl.value) : 0;

  let startX, startY, startZ;
  if (branchOrigin) {
    startX = branchOrigin.x;
    startY = branchOrigin.y;
    startZ = branchOrigin.z;
  } else {
    // スカイドーム上部の球面上にランダムな開始点を取る
    const theta = (Math.random() - 0.5) * Math.PI * 0.6; // 水平角 ±54度
    const phi = Math.random() * Math.PI * 0.3 + Math.PI * 0.15; // 仰角 27〜54度（上部）
    startX = domeRadius * Math.sin(phi) * Math.sin(theta);
    startY = domeRadius * Math.cos(phi) + domeOffsetY;
    startZ = domeRadius * Math.sin(phi) * Math.cos(theta);
  }

  // 終点: 地面（Y=0）に向かう
  const endY = 0;
  const totalDrop = startY - endY;
  const segments = branch ? (3 + Math.floor(Math.random() * 3)) : (8 + Math.floor(Math.random() * 8));
  const points = [];
  let x = startX, y = startY, z = startZ;
  const stepY = totalDrop / segments;
  // ジグザグの大きさをドーム半径に比例させる
  const jitter = branch ? domeRadius * 0.01 : domeRadius * 0.02;

  for (let i = 0; i <= segments; i++) {
    points.push(new THREE.Vector3(x, y, z));
    if (i < segments) {
      y -= stepY;
      x += (Math.random() - 0.5) * jitter * 2;
      z += (Math.random() - 0.5) * jitter * 2;
    }
  }

  const positions = [];
  for (let i = 0; i < points.length - 1; i++) {
    positions.push(points[i].x, points[i].y, points[i].z);
    positions.push(points[i + 1].x, points[i + 1].y, points[i + 1].z);
  }

  // 分岐（枝）: 本幹のみ、30%の確率で追加
  const branches = [];
  if (!branch) {
    for (let i = 1; i < points.length - 1; i++) {
      if (Math.random() < 0.3) {
        const branchBolt = buildLightningBolt(true, points[i]);
        branches.push(branchBolt);
      }
    }
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  const mat = new THREE.LineBasicMaterial({
    color: new THREE.Color(lightningColor),
    transparent: true,
    opacity: branch ? 0.6 : 1.0,
    linewidth: 1,
    depthWrite: false,
  });
  const bolt = new THREE.LineSegments(geom, mat);

  // グロー（周囲の色）
  const glowPositions = [];
  for (const p of points) glowPositions.push(p.x, p.y, p.z);
  const glowGeom = new THREE.BufferGeometry();
  glowGeom.setAttribute('position', new THREE.Float32BufferAttribute(glowPositions, 3));
  const glowMat = new THREE.PointsMaterial({
    color: new THREE.Color(lightningAmbientColor),
    map: getLightningGlowTexture(),
    size: branch ? domeRadius * 0.06 : domeRadius * 0.1,
    sizeAttenuation: true,
    transparent: true,
    opacity: branch ? 0.3 : 0.5,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const glowPoints = new THREE.Points(glowGeom, glowMat);
  bolt._glow = glowPoints;

  bolt._branches = branches;
  bolt._createdAt = performance.now();
  bolt._lifetime = 200 + Math.random() * 200; // 200-400ms

  scene.add(bolt);
  scene.add(glowPoints);
  for (const b of branches) scene.add(b);

  return bolt;
}

function triggerLightningFlash() {
  if (!renderer || !renderer.domElement) return;
  const canvas = renderer.domElement;

  let flashOverlay = document.getElementById('beatFlashOverlay');
  if (!flashOverlay) {
    flashOverlay = document.createElement('div');
    flashOverlay.id = 'beatFlashOverlay';
    flashOverlay.style.cssText = `
      position: absolute;
      background: white;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.1s ease-out;
    `;
    canvas.parentElement.appendChild(flashOverlay);
  }

  const rect = canvas.getBoundingClientRect();
  const containerRect = canvas.parentElement.getBoundingClientRect();
  flashOverlay.style.left = (rect.left - containerRect.left) + 'px';
  flashOverlay.style.top = (rect.top - containerRect.top) + 'px';
  flashOverlay.style.width = rect.width + 'px';
  flashOverlay.style.height = rect.height + 'px';

  flashOverlay.style.transition = 'none';
  flashOverlay.style.opacity = lightningFlashOpacity;

  // decay=0: 1フレームだけ表示して即消去
  if (lightningFlashDecay <= 0) {
    requestAnimationFrame(() => {
      flashOverlay.style.opacity = '0';
    });
  } else {
    // 点灯維持 = decay の 1/3（最低16ms=1フレーム）
    const hold = Math.max(16, lightningFlashDecay * 333);
    setTimeout(() => {
      flashOverlay.style.transition = `opacity ${lightningFlashDecay}s ease-out`;
      flashOverlay.style.opacity = '0';
    }, hold);
  }
}

function triggerLightning() {
  // 1〜3本のボルト生成
  const count = 1 + Math.floor(Math.random() * 3);
  for (let i = 0; i < count; i++) {
    const bolt = buildLightningBolt();
    lightningBolts.push(bolt);
    for (const b of bolt._branches) {
      b._createdAt = bolt._createdAt;
      b._lifetime = bolt._lifetime;
      lightningBolts.push(b);
    }
  }
  // 白フラッシュ
  triggerLightningFlash();
}

function updateLightning() {
  if (lightningFrequency === 0) return;

  const now = performance.now();
  if (lightningLastTime === 0) {
    lightningLastTime = now;
    lightningTimer = 60000 / lightningFrequency * (1 - lightningRandomness + Math.random() * lightningRandomness * 2);
    return;
  }
  const dt = now - lightningLastTime;
  lightningLastTime = now;
  lightningTimer -= dt;

  if (lightningTimer <= 0) {
    triggerLightning();
    lightningTimer = 60000 / lightningFrequency * (1 - lightningRandomness + Math.random() * lightningRandomness * 2);
  }

  // 期限切れのボルトを除去
  for (let i = lightningBolts.length - 1; i >= 0; i--) {
    const bolt = lightningBolts[i];
    if (now - bolt._createdAt > bolt._lifetime) {
      scene.remove(bolt);
      bolt.geometry.dispose();
      bolt.material.dispose();
      if (bolt._glow) {
        scene.remove(bolt._glow);
        bolt._glow.geometry.dispose();
        bolt._glow.material.dispose();
      }
      lightningBolts.splice(i, 1);
    }
  }
}

function triggerStrobe() {
  if (!scene) return;
  const intensity = effects.strobe.intensity;
  // 強度で白の明るさをスケール（0.1→薄い白、1.0→純白）
  const brightness = intensity;
  scene.background = new THREE.Color(brightness, brightness, brightness);
  // 持続時間も強度に比例（20ms〜80ms）
  const duration = 20 + intensity * 60;
  setTimeout(() => {
    restoreUserBackground();
  }, duration);
}

function triggerColorShift() {
  if (!scene) return;
  const hue = (tempoInfo.currentBeat * beatEffects.colorShift.intensity) % 360;
  const topColor = document.getElementById('bgColorTop').value;
  const baseColor = new THREE.Color(topColor);
  const shiftColor = new THREE.Color().setHSL(hue / 360, 0.3, 0.1);
  baseColor.lerp(shiftColor, effects.colorShift.intensity);
  scene.background = baseColor;
}

function updateVignette(intensity) {
  if (!beatEffectState.vignetteOverlay) {
    beatEffectState.vignetteOverlay = document.createElement('div');
    beatEffectState.vignetteOverlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 1000;
    `;
    document.body.appendChild(beatEffectState.vignetteOverlay);
  }
  const amount = intensity * beatEffects.vignette.intensity * 100;
  beatEffectState.vignetteOverlay.style.boxShadow = `inset 0 0 ${amount}px rgba(0,0,0,0.8)`;
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
    if (mesh.customDepthMaterial && mesh.customDepthMaterial.uniforms.opacity) {
      mesh.customDepthMaterial.uniforms.opacity.value = opacity;
    }
  });
}

// 波紋をクリア
function clearRipples() {
  state.ripples.forEach(ripple => {
    noteGroup.remove(ripple);
    ripple.geometry.dispose();
    ripple.material.dispose();
  });
  state.ripples = [];
}

// ============================================
// ドラッグ&ドロップ共通関数
// ============================================

function setupDropZone(dropZone, loadCallback, allowVideo = false, mediaSlotName = null) {
  if (!dropZone) return;
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
        if (mediaSlotName && window.presetManager) window.presetManager.handleFileUpload(file, mediaSlotName);
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
      skyDome.material.uniforms.map.value = skyDomeTexture;
      syncDepthMaterialUniforms(skyDome);
      skyDome.visible = true;
      skyDomeIsVideo = false;

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
    skyDome.material.uniforms.map.value = skyDomeTexture;
    syncDepthMaterialUniforms(skyDome);
    skyDome.visible = true;
    skyDomeIsVideo = true;

    // 動画を再生
    skyDomeVideo.play();

    // ドロップゾーンにプレビューを表示
    const imagePreview = document.getElementById('skyDomeImagePreview');
    const videoPreview = document.getElementById('skyDomeVideoPreview');
    const text = document.getElementById('skyDomeDropZoneText');
    videoPreview.src = url;
    videoPreview.play();
    imagePreview.style.display = 'none';
    videoPreview.style.display = 'block';
    text.style.display = 'none';

    const pauseBtn = document.getElementById('skyDomeVideoPause');
    if (pauseBtn) {
      pauseBtn.style.display = '';
      pauseBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';
    }

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
  window.currentMediaRefs.skyDome = null;
  // メディアを破棄
  clearSkyDomeMedia();

  skyDome.material.uniforms.map.value = null;
  skyDome.visible = false;

  // 背景グラデーションを元に戻す
  restoreUserBackground();

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

  const pauseBtn = document.getElementById('skyDomeVideoPause');
  if (pauseBtn) pauseBtn.style.display = 'none';

  console.log('Sky dome cleared');
}

// ============================================
// 近景スカイドーム関連関数
// ============================================

function loadInnerSkyImage(file) {
  clearInnerSkyMedia();
  if (file.type.startsWith('video/')) {
    loadInnerSkyVideo(file);
  } else {
    loadInnerSkyImageFile(file);
  }
}

function loadInnerSkyImageFile(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      innerSkyTexture = new THREE.Texture(img);
      innerSkyTexture.needsUpdate = true;
      innerSkyDome.material.uniforms.map.value = innerSkyTexture;
      syncDepthMaterialUniforms(innerSkyDome);
      innerSkyDome.visible = true;
      innerSkyIsVideo = false;

      const imagePreview = document.getElementById('innerSkyImagePreview');
      const videoPreview = document.getElementById('innerSkyVideoPreview');
      const text = document.getElementById('innerSkyDropZoneText');
      if (imagePreview) { imagePreview.src = e.target.result; imagePreview.style.display = 'block'; }
      if (videoPreview) videoPreview.style.display = 'none';
      if (text) text.style.display = 'none';

      console.log('Inner sky image loaded:', file.name);
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function loadInnerSkyVideo(file) {
  const url = URL.createObjectURL(file);
  innerSkyVideo = document.createElement('video');
  innerSkyVideo.src = url;
  innerSkyVideo.loop = true;
  innerSkyVideo.muted = true;
  innerSkyVideo.playsInline = true;

  innerSkyVideo.onloadeddata = () => {
    innerSkyTexture = new THREE.VideoTexture(innerSkyVideo);
    innerSkyTexture.minFilter = THREE.LinearFilter;
    innerSkyTexture.magFilter = THREE.LinearFilter;
    innerSkyDome.material.uniforms.map.value = innerSkyTexture;
    syncDepthMaterialUniforms(innerSkyDome);
    innerSkyDome.visible = true;
    innerSkyIsVideo = true;
    innerSkyVideo.play();

    const imagePreview = document.getElementById('innerSkyImagePreview');
    const videoPreview = document.getElementById('innerSkyVideoPreview');
    const text = document.getElementById('innerSkyDropZoneText');
    if (videoPreview) { videoPreview.src = url; videoPreview.play(); videoPreview.style.display = 'block'; }
    if (imagePreview) imagePreview.style.display = 'none';
    if (text) text.style.display = 'none';

    const pauseBtn = document.getElementById('innerSkyVideoPause');
    if (pauseBtn) { pauseBtn.style.display = ''; pauseBtn.innerHTML = '<i class="fa-solid fa-pause"></i>'; }

    console.log('Inner sky video loaded:', file.name);
  };
  innerSkyVideo.load();
}

function clearInnerSkyMedia() {
  if (innerSkyTexture) { innerSkyTexture.dispose(); innerSkyTexture = null; }
  if (innerSkyVideo) {
    innerSkyVideo.pause();
    const src = innerSkyVideo.src;
    innerSkyVideo.src = '';
    if (src.startsWith('blob:')) URL.revokeObjectURL(src);
    innerSkyVideo = null;
  }
  innerSkyIsVideo = false;
}

function clearInnerSkyImage() {
  window.currentMediaRefs.innerSky = null;
  clearInnerSkyMedia();
  innerSkyDome.material.uniforms.map.value = null;
  innerSkyDome.visible = false;

  const input = document.getElementById('innerSkyImageInput');
  if (input) input.value = '';
  const imagePreview = document.getElementById('innerSkyImagePreview');
  const videoPreview = document.getElementById('innerSkyVideoPreview');
  const text = document.getElementById('innerSkyDropZoneText');
  if (imagePreview) { imagePreview.style.display = 'none'; imagePreview.src = ''; }
  if (videoPreview) { videoPreview.style.display = 'none'; videoPreview.pause(); videoPreview.src = ''; }
  if (text) text.style.display = 'block';
  const pauseBtn = document.getElementById('innerSkyVideoPause');
  if (pauseBtn) pauseBtn.style.display = 'none';
  console.log('Inner sky cleared');
}

// ============================================
// 床画像関連関数
// ============================================

// 床にファイルを読み込み（画像または動画）
function loadFloorImage(file) {
  // 既存メディアを破棄
  clearFloorMedia();

  if (file.type.startsWith('video/')) {
    loadFloorVideo(file);
  } else {
    loadFloorImageFile(file);
  }
}

// 床画像を読み込み
function loadFloorImageFile(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      // 新しいテクスチャを作成
      floorTexture = new THREE.Texture(img);
      floorTexture.needsUpdate = true;

      // アスペクト比を保存
      floorAspect = img.width / img.height;

      // アルファチャンネルを抽出（側面生成用）
      const alphaCanvas = document.createElement('canvas');
      alphaCanvas.width = img.width;
      alphaCanvas.height = img.height;
      const alphaCtx = alphaCanvas.getContext('2d');
      alphaCtx.drawImage(img, 0, 0);
      floorAlphaData = alphaCtx.getImageData(0, 0, img.width, img.height);
      updateFloorCliffs();

      // ShaderMaterialのuniformsにテクスチャを適用
      floorPlane.material.uniforms.map.value = floorTexture;
      syncDepthMaterialUniforms(floorPlane);
      // 影プレーンに床テクスチャを同期
      if (shadowPlane) shadowPlane.material.userData.floorMap.value = floorTexture;

      floorPlane.visible = true;
      updateShadowPlaneVisibility();
      floorIsVideo = false;

      // 現在のサイズでジオメトリを更新（アスペクト比を適用）
      const currentSize = parseFloat(document.getElementById('floorImageSize').value);
      updateFloorImageSize(currentSize);

      // ドロップゾーンにプレビューを表示
      const imagePreview = document.getElementById('floorImagePreview');
      const videoPreview = document.getElementById('floorVideoPreview');
      const text = document.getElementById('floorDropZoneText');
      imagePreview.src = e.target.result;
      imagePreview.style.display = 'block';
      videoPreview.style.display = 'none';
      text.style.display = 'none';

      console.log('Floor image loaded:', file.name, 'aspect:', floorAspect);
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

// 床動画を読み込み
function loadFloorVideo(file) {
  const url = URL.createObjectURL(file);
  floorVideo = document.createElement('video');
  floorVideo.src = url;
  floorVideo.loop = true;
  floorVideo.muted = true;
  floorVideo.playsInline = true;
  floorVideo.setAttribute('playsinline', '');
  floorVideo.setAttribute('webkit-playsinline', '');

  floorVideo.onloadeddata = () => {
    floorTexture = new THREE.VideoTexture(floorVideo);
    floorTexture.minFilter = THREE.LinearFilter;
    floorTexture.magFilter = THREE.LinearFilter;

    floorAspect = floorVideo.videoWidth / floorVideo.videoHeight;

    floorPlane.material.uniforms.map.value = floorTexture;
    syncDepthMaterialUniforms(floorPlane);
    // 影プレーンに床テクスチャを同期
    if (shadowPlane) shadowPlane.material.userData.floorMap.value = floorTexture;
    floorPlane.visible = true;
    updateShadowPlaneVisibility();
    floorIsVideo = true;

    floorVideo.play().catch(e => console.warn('Floor video autoplay blocked:', e));

    const currentSize = parseFloat(document.getElementById('floorImageSize').value);
    updateFloorImageSize(currentSize);

    // ドロップゾーンにプレビューを表示
    const imagePreview = document.getElementById('floorImagePreview');
    const videoPreview = document.getElementById('floorVideoPreview');
    const text = document.getElementById('floorDropZoneText');
    videoPreview.src = url;
    videoPreview.play();
    imagePreview.style.display = 'none';
    videoPreview.style.display = 'block';
    text.style.display = 'none';

    const pauseBtn = document.getElementById('floorVideoPause');
    if (pauseBtn) {
      pauseBtn.style.display = '';
      pauseBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';
    }

    console.log('Floor video loaded:', file.name, 'aspect:', floorAspect);
  };
  floorVideo.load();
}

// 床メディアを破棄
function clearFloorMedia() {
  if (floorTexture) {
    floorTexture.dispose();
    floorTexture = null;
  }
  if (floorVideo) {
    floorVideo.pause();
    const src = floorVideo.src;
    floorVideo.src = '';
    if (src.startsWith('blob:')) URL.revokeObjectURL(src);
    floorVideo = null;
  }
  floorIsVideo = false;
}

// 床画像サイズを更新
function updateFloorImageSize(size) {
  if (!floorPlane) return;

  // アスペクト比を維持してジオメトリを再作成（セグメント分割）
  const width = size * floorAspect;
  const height = size;
  const segs = floorDisplacementData ? 256 : 64;
  floorPlane.geometry.dispose();
  floorPlane.geometry = new THREE.PlaneGeometry(width, height, segs, segs);
  // 雲の影メッシュも床サイズに合わせてリサイズ
  if (cloudShadowPlane) {
    cloudShadowPlane.geometry.dispose();
    cloudShadowPlane.geometry = new THREE.PlaneGeometry(width, height, 256, 256);
  }
  // 影受けプレーンも床サイズに合わせてリサイズ
  if (shadowPlane) {
    shadowPlane.geometry.dispose();
    shadowPlane.geometry = new THREE.PlaneGeometry(width, height, 64, 64);
  }
  // 曲率を再適用
  applyFloorCurvature();
}

// 床の曲率・起伏を適用（頂点変形）
function applyFloorCurvature() {
  if (!floorPlane) return;
  const geom = floorPlane.geometry;
  const pos = geom.attributes.position;
  const params = geom.parameters;
  // PlaneGeometryはXY平面。rotation.x=-PI/2でXZ平面になる。
  // Z成分を変形すると、ワールドのY方向に膨らむ。
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    // 放物面: z = -curvature * (x² + y²)  中心が最も高く、端が下がる
    let z = -floorCurvature * (x * x + y * y);
    // ハイトマップによる起伏
    if (floorDisplacementData && floorDisplacementScale > 0) {
      const u = (x / params.width) + 0.5;
      const v = 1.0 - ((y / params.height) + 0.5); // Y反転
      const px = Math.min(Math.max(Math.floor(u * floorDisplacementData.width), 0), floorDisplacementData.width - 1);
      const py = Math.min(Math.max(Math.floor(v * floorDisplacementData.height), 0), floorDisplacementData.height - 1);
      const idx = (py * floorDisplacementData.width + px) * 4;
      const height = floorDisplacementData.data[idx] / 255;
      z += height * floorDisplacementScale;
    }
    pos.setZ(i, z);
  }
  pos.needsUpdate = true;
  geom.computeVertexNormals();
  updateFloorCliffs();
  applyShadowPlaneCurvature();
  applyCloudShadowCurvature();
}

// 内部崖壁を生成（床画像のアルファ境界に壁を作る — 起伏とは独立）
function updateFloorCliffs() {
  // 既存メッシュを削除
  if (floorCliffMesh) {
    scene.remove(floorCliffMesh);
    floorCliffMesh.geometry.dispose();
    floorCliffMesh.material.dispose();
    floorCliffMesh = null;
  }

  if (!floorPlane || !floorAlphaData || floorCliffDepth <= 0) return;

  const geom = floorPlane.geometry;
  const pos = geom.attributes.position;
  const params = geom.parameters;
  const W = params.widthSegments;
  const H = params.heightSegments;
  const stride = W + 1;
  const vertCount = stride * (H + 1);

  // --- Step 1: 床画像のアルファで地形判定（alpha > 128 = 地形） ---
  const isTerrain = new Uint8Array(vertCount);
  for (let iy = 0; iy <= H; iy++) {
    for (let ix = 0; ix <= W; ix++) {
      const vi = iy * stride + ix;
      const x = pos.getX(vi), y = pos.getY(vi);
      const u = (x / params.width) + 0.5;
      const v = 1.0 - ((y / params.height) + 0.5);
      const px = Math.min(Math.max(Math.floor(u * floorAlphaData.width), 0), floorAlphaData.width - 1);
      const py = Math.min(Math.max(Math.floor(v * floorAlphaData.height), 0), floorAlphaData.height - 1);
      const idx = (py * floorAlphaData.width + px) * 4 + 3;
      isTerrain[vi] = floorAlphaData.data[idx] > 128 ? 1 : 0;
    }
  }

  // --- Step 2: 境界地形頂点を検出（地形で、4近傍に透明がある） ---
  const isBoundary = new Uint8Array(vertCount);
  for (let iy = 0; iy <= H; iy++) {
    for (let ix = 0; ix <= W; ix++) {
      const vi = iy * stride + ix;
      if (!isTerrain[vi]) continue;
      if ((ix > 0 && !isTerrain[vi - 1]) ||
          (ix < W && !isTerrain[vi + 1]) ||
          (iy > 0 && !isTerrain[vi - stride]) ||
          (iy < H && !isTerrain[vi + stride])) {
        isBoundary[vi] = 1;
      }
    }
  }

  // --- Step 3: 2種類のエッジを収集 ---
  const edgeSet = new Set();
  const edges = [];
  function addEdge(a, b) {
    const key = a < b ? a * vertCount + b : b * vertCount + a;
    if (edgeSet.has(key)) return;
    edgeSet.add(key);
    edges.push([a, b]);
  }

  // (A) 境界エッジ: 地形と透明の境目
  for (let iy = 0; iy <= H; iy++) {
    for (let ix = 0; ix < W; ix++) {
      const a = iy * stride + ix, b = a + 1;
      if (isTerrain[a] !== isTerrain[b]) addEdge(a, b);
    }
  }
  for (let iy = 0; iy < H; iy++) {
    for (let ix = 0; ix <= W; ix++) {
      const a = iy * stride + ix, b = a + stride;
      if (isTerrain[a] !== isTerrain[b]) addEdge(a, b);
    }
  }

  // (B) チェーンエッジ: 隣接する境界地形頂点同士を連結
  for (let iy = 0; iy <= H; iy++) {
    for (let ix = 0; ix < W; ix++) {
      const a = iy * stride + ix, b = a + 1;
      if (isBoundary[a] && isBoundary[b]) addEdge(a, b);
    }
  }
  for (let iy = 0; iy < H; iy++) {
    for (let ix = 0; ix <= W; ix++) {
      const a = iy * stride + ix, b = a + stride;
      if (isBoundary[a] && isBoundary[b]) addEdge(a, b);
    }
  }

  if (edges.length === 0) return;

  // --- Step 4: 壁ジオメトリ構築（UV付き） ---
  const triVerts = edges.length * 6;
  const posArr = new Float32Array(triVerts * 3);
  const nrmArr = new Float32Array(triVerts * 3);
  const uvArr = new Float32Array(triVerts * 2);
  let vi = 0;

  for (const [idxA, idxB] of edges) {
    const ax = pos.getX(idxA), ay = pos.getY(idxA);
    const bx = pos.getX(idxB), by = pos.getY(idxB);
    const az_top = pos.getZ(idxA), bz_top = pos.getZ(idxB);
    const az_base = az_top - floorCliffDepth;
    const bz_base = bz_top - floorCliffDepth;

    // UV: 境界エッジでは透明側も地形側のUVを使う（透明ピクセルの白を回避）
    let au, av, bu, bv;
    if (isTerrain[idxA] && !isTerrain[idxB]) {
      au = (ax / params.width) + 0.5;
      av = (ay / params.height) + 0.5;
      bu = au; bv = av;
    } else if (!isTerrain[idxA] && isTerrain[idxB]) {
      bu = (bx / params.width) + 0.5;
      bv = (by / params.height) + 0.5;
      au = bu; av = bv;
    } else {
      au = (ax / params.width) + 0.5;
      av = (ay / params.height) + 0.5;
      bu = (bx / params.width) + 0.5;
      bv = (by / params.height) + 0.5;
    }

    // 法線
    const edgeX = bx - ax, edgeY = by - ay;
    const edgeLen = Math.sqrt(edgeX * edgeX + edgeY * edgeY) || 1;
    const nx = -edgeY / edgeLen, ny = edgeX / edgeLen;

    // 三角形1: A_top → B_top → B_base
    posArr[vi*3]=ax; posArr[vi*3+1]=ay; posArr[vi*3+2]=az_top;
    nrmArr[vi*3]=nx; nrmArr[vi*3+1]=ny; nrmArr[vi*3+2]=0;
    uvArr[vi*2]=au; uvArr[vi*2+1]=av; vi++;
    posArr[vi*3]=bx; posArr[vi*3+1]=by; posArr[vi*3+2]=bz_top;
    nrmArr[vi*3]=nx; nrmArr[vi*3+1]=ny; nrmArr[vi*3+2]=0;
    uvArr[vi*2]=bu; uvArr[vi*2+1]=bv; vi++;
    posArr[vi*3]=bx; posArr[vi*3+1]=by; posArr[vi*3+2]=bz_base;
    nrmArr[vi*3]=nx; nrmArr[vi*3+1]=ny; nrmArr[vi*3+2]=0;
    uvArr[vi*2]=bu; uvArr[vi*2+1]=bv; vi++;

    // 三角形2: A_top → B_base → A_base
    posArr[vi*3]=ax; posArr[vi*3+1]=ay; posArr[vi*3+2]=az_top;
    nrmArr[vi*3]=nx; nrmArr[vi*3+1]=ny; nrmArr[vi*3+2]=0;
    uvArr[vi*2]=au; uvArr[vi*2+1]=av; vi++;
    posArr[vi*3]=bx; posArr[vi*3+1]=by; posArr[vi*3+2]=bz_base;
    nrmArr[vi*3]=nx; nrmArr[vi*3+1]=ny; nrmArr[vi*3+2]=0;
    uvArr[vi*2]=bu; uvArr[vi*2+1]=bv; vi++;
    posArr[vi*3]=ax; posArr[vi*3+1]=ay; posArr[vi*3+2]=az_base;
    nrmArr[vi*3]=nx; nrmArr[vi*3+1]=ny; nrmArr[vi*3+2]=0;
    uvArr[vi*2]=au; uvArr[vi*2+1]=av; vi++;
  }

  const cliffGeom = new THREE.BufferGeometry();
  cliffGeom.setAttribute('position', new THREE.BufferAttribute(posArr, 3));
  cliffGeom.setAttribute('normal', new THREE.BufferAttribute(nrmArr, 3));
  cliffGeom.setAttribute('uv', new THREE.BufferAttribute(uvArr, 2));

  const cliffMat = new THREE.MeshStandardMaterial({
    map: floorTexture || null,
    color: floorTexture ? 0xffffff : 0x6b5a4a,
    side: THREE.DoubleSide,
    roughness: 0.8,
    metalness: 0.1
  });

  floorCliffMesh = new THREE.Mesh(cliffGeom, cliffMat);
  floorCliffMesh.position.copy(floorPlane.position);
  floorCliffMesh.rotation.copy(floorPlane.rotation);
  floorCliffMesh.scale.copy(floorPlane.scale);
  scene.add(floorCliffMesh);
}

// 影受けプレーンに床の曲率を反映
function applyShadowPlaneCurvature() {
  if (!shadowPlane) return;
  const geom = shadowPlane.geometry;
  const pos = geom.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = -floorCurvature * (x * x + y * y);
    pos.setZ(i, z);
  }
  pos.needsUpdate = true;
  geom.computeVertexNormals();
}

// 雲の影メッシュに床の曲率を反映（床の範囲内で同じ曲率、範囲外はフラット）
function applyCloudShadowCurvature() {
  if (!cloudShadowPlane || !floorPlane) return;
  const geom = cloudShadowPlane.geometry;
  const pos = geom.attributes.position;
  const fp = floorPlane.geometry.parameters;
  const halfW = fp.width / 2;
  const halfH = fp.height / 2;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    // 床の範囲内は同じ曲率、範囲外は床端の曲率で固定
    const cx = Math.max(-halfW, Math.min(halfW, x));
    const cy = Math.max(-halfH, Math.min(halfH, y));
    const z = -floorCurvature * (cx * cx + cy * cy);
    pos.setZ(i, z);
  }
  pos.needsUpdate = true;
  geom.computeVertexNormals();
}

// 床画像をクリア
function clearFloorImage() {
  window.currentMediaRefs.floor = null;
  clearFloorMedia();
  floorAlphaData = null;
  updateFloorCliffs();

  floorPlane.material.uniforms.map.value = null;
  syncDepthMaterialUniforms(floorPlane);
  // 影プレーンの床テクスチャもクリア
  if (shadowPlane) shadowPlane.material.userData.floorMap.value = null;
  floorPlane.visible = false;
  updateShadowPlaneVisibility();

  // アスペクト比をリセット
  floorAspect = 1;

  // UIをリセット
  document.getElementById('floorImageInput').value = '';

  // プレビューを非表示
  const imagePreview = document.getElementById('floorImagePreview');
  const videoPreview = document.getElementById('floorVideoPreview');
  const text = document.getElementById('floorDropZoneText');
  imagePreview.style.display = 'none';
  imagePreview.src = '';
  videoPreview.style.display = 'none';
  videoPreview.pause();
  videoPreview.src = '';
  text.style.display = 'block';

  const pauseBtn = document.getElementById('floorVideoPause');
  if (pauseBtn) pauseBtn.style.display = 'none';

  console.log('Floor image cleared');
}

// ============================================
// 床2画像関連関数
// ============================================

function loadFloor2Image(file) {
  clearFloor2Media();
  if (file.type.startsWith('video/')) {
    loadFloor2Video(file);
  } else {
    loadFloor2ImageFile(file);
  }
}

function loadFloor2ImageFile(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      floor2Texture = new THREE.Texture(img);
      floor2Texture.needsUpdate = true;
      floor2Aspect = img.width / img.height;
      // アルファチャンネルを抽出（側面生成用）
      const alphaCanvas = document.createElement('canvas');
      alphaCanvas.width = img.width;
      alphaCanvas.height = img.height;
      const alphaCtx = alphaCanvas.getContext('2d');
      alphaCtx.drawImage(img, 0, 0);
      floor2AlphaData = alphaCtx.getImageData(0, 0, img.width, img.height);
      updateFloor2Cliffs();
      floor2Plane.material.uniforms.map.value = floor2Texture;
      syncDepthMaterialUniforms(floor2Plane);
      floor2Plane.visible = true;
      updateShadowPlaneVisibility();
      floor2IsVideo = false;
      const currentSize = parseFloat(document.getElementById('floor2ImageSize')?.value || 300);
      updateFloor2ImageSize(currentSize);
      const imagePreview = document.getElementById('floor2ImagePreview');
      const videoPreview = document.getElementById('floor2VideoPreview');
      const text = document.getElementById('floor2DropZoneText');
      if (imagePreview) { imagePreview.src = e.target.result; imagePreview.style.display = 'block'; }
      if (videoPreview) videoPreview.style.display = 'none';
      if (text) text.style.display = 'none';
      console.log('Floor2 image loaded:', file.name, 'aspect:', floor2Aspect);
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function loadFloor2Video(file) {
  const url = URL.createObjectURL(file);
  floor2Video = document.createElement('video');
  floor2Video.src = url;
  floor2Video.loop = true;
  floor2Video.muted = true;
  floor2Video.playsInline = true;
  floor2Video.setAttribute('playsinline', '');
  floor2Video.setAttribute('webkit-playsinline', '');
  floor2Video.onloadeddata = () => {
    floor2Texture = new THREE.VideoTexture(floor2Video);
    floor2Texture.minFilter = THREE.LinearFilter;
    floor2Texture.magFilter = THREE.LinearFilter;
    floor2Aspect = floor2Video.videoWidth / floor2Video.videoHeight;
    floor2Plane.material.uniforms.map.value = floor2Texture;
    syncDepthMaterialUniforms(floor2Plane);
    floor2Plane.visible = true;
    updateShadowPlaneVisibility();
    floor2IsVideo = true;
    floor2Video.play().catch(e => console.warn('Floor2 video autoplay blocked:', e));
    const currentSize = parseFloat(document.getElementById('floor2ImageSize')?.value || 300);
    updateFloor2ImageSize(currentSize);
    const imagePreview = document.getElementById('floor2ImagePreview');
    const videoPreview = document.getElementById('floor2VideoPreview');
    const text = document.getElementById('floor2DropZoneText');
    if (videoPreview) { videoPreview.src = url; videoPreview.play(); }
    if (imagePreview) imagePreview.style.display = 'none';
    if (videoPreview) videoPreview.style.display = 'block';
    if (text) text.style.display = 'none';
    const pauseBtn = document.getElementById('floor2VideoPause');
    if (pauseBtn) {
      pauseBtn.style.display = '';
      pauseBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';
    }
    console.log('Floor2 video loaded:', file.name, 'aspect:', floor2Aspect);
  };
  floor2Video.load();
}

function clearFloor2Media() {
  if (floor2Texture) {
    floor2Texture.dispose();
    floor2Texture = null;
  }
  if (floor2Video) {
    floor2Video.pause();
    const src = floor2Video.src;
    floor2Video.src = '';
    if (src.startsWith('blob:')) URL.revokeObjectURL(src);
    floor2Video = null;
  }
  floor2IsVideo = false;
}

function updateFloor2ImageSize(size) {
  if (!floor2Plane) return;
  const width = size * floor2Aspect;
  const height = size;
  const segs = floor2DisplacementData ? 256 : 64;
  floor2Plane.geometry.dispose();
  floor2Plane.geometry = new THREE.PlaneGeometry(width, height, segs, segs);
  applyFloor2Curvature();
}

function applyFloor2Curvature() {
  if (!floor2Plane) return;
  const geom = floor2Plane.geometry;
  const pos = geom.attributes.position;
  const params = geom.parameters;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    let z = -floor2Curvature * (x * x + y * y);
    if (floor2DisplacementData && floor2DisplacementScale > 0) {
      const u = (x / params.width) + 0.5;
      const v = 1.0 - ((y / params.height) + 0.5);
      const px = Math.min(Math.max(Math.floor(u * floor2DisplacementData.width), 0), floor2DisplacementData.width - 1);
      const py = Math.min(Math.max(Math.floor(v * floor2DisplacementData.height), 0), floor2DisplacementData.height - 1);
      const idx = (py * floor2DisplacementData.width + px) * 4;
      const height = floor2DisplacementData.data[idx] / 255;
      z += height * floor2DisplacementScale;
    }
    pos.setZ(i, z);
  }
  pos.needsUpdate = true;
  geom.computeVertexNormals();
  updateFloor2Cliffs();
}

function updateFloor2Cliffs() {
  if (floor2CliffMesh) {
    scene.remove(floor2CliffMesh);
    floor2CliffMesh.geometry.dispose();
    floor2CliffMesh.material.dispose();
    floor2CliffMesh = null;
  }
  if (!floor2Plane || !floor2AlphaData || floor2CliffDepth <= 0) return;

  const geom = floor2Plane.geometry;
  const pos = geom.attributes.position;
  const params = geom.parameters;
  const W = params.widthSegments;
  const H = params.heightSegments;
  const stride = W + 1;
  const vertCount = stride * (H + 1);

  const isTerrain = new Uint8Array(vertCount);
  for (let iy = 0; iy <= H; iy++) {
    for (let ix = 0; ix <= W; ix++) {
      const vi = iy * stride + ix;
      const x = pos.getX(vi), y = pos.getY(vi);
      const u = (x / params.width) + 0.5;
      const v = 1.0 - ((y / params.height) + 0.5);
      const px = Math.min(Math.max(Math.floor(u * floor2AlphaData.width), 0), floor2AlphaData.width - 1);
      const py = Math.min(Math.max(Math.floor(v * floor2AlphaData.height), 0), floor2AlphaData.height - 1);
      const idx = (py * floor2AlphaData.width + px) * 4 + 3;
      isTerrain[vi] = floor2AlphaData.data[idx] > 128 ? 1 : 0;
    }
  }

  const isBoundary = new Uint8Array(vertCount);
  for (let iy = 0; iy <= H; iy++) {
    for (let ix = 0; ix <= W; ix++) {
      const vi = iy * stride + ix;
      if (!isTerrain[vi]) continue;
      if ((ix > 0 && !isTerrain[vi - 1]) || (ix < W && !isTerrain[vi + 1]) ||
          (iy > 0 && !isTerrain[vi - stride]) || (iy < H && !isTerrain[vi + stride])) {
        isBoundary[vi] = 1;
      }
    }
  }

  const edgeSet = new Set();
  const edges = [];
  function addEdge(a, b) {
    const key = a < b ? a * vertCount + b : b * vertCount + a;
    if (edgeSet.has(key)) return;
    edgeSet.add(key);
    edges.push([a, b]);
  }

  for (let iy = 0; iy <= H; iy++) {
    for (let ix = 0; ix < W; ix++) {
      const a = iy * stride + ix, b = a + 1;
      if (isTerrain[a] !== isTerrain[b]) addEdge(a, b);
    }
  }
  for (let iy = 0; iy < H; iy++) {
    for (let ix = 0; ix <= W; ix++) {
      const a = iy * stride + ix, b = a + stride;
      if (isTerrain[a] !== isTerrain[b]) addEdge(a, b);
    }
  }
  for (let iy = 0; iy <= H; iy++) {
    for (let ix = 0; ix < W; ix++) {
      const a = iy * stride + ix, b = a + 1;
      if (isBoundary[a] && isBoundary[b]) addEdge(a, b);
    }
  }
  for (let iy = 0; iy < H; iy++) {
    for (let ix = 0; ix <= W; ix++) {
      const a = iy * stride + ix, b = a + stride;
      if (isBoundary[a] && isBoundary[b]) addEdge(a, b);
    }
  }

  if (edges.length === 0) return;

  const triVerts = edges.length * 6;
  const posArr = new Float32Array(triVerts * 3);
  const nrmArr = new Float32Array(triVerts * 3);
  const uvArr = new Float32Array(triVerts * 2);
  let vi = 0;

  for (const [idxA, idxB] of edges) {
    const ax = pos.getX(idxA), ay = pos.getY(idxA);
    const bx = pos.getX(idxB), by = pos.getY(idxB);
    const az_top = pos.getZ(idxA), bz_top = pos.getZ(idxB);
    const az_base = az_top - floor2CliffDepth;
    const bz_base = bz_top - floor2CliffDepth;

    let au, av, bu, bv;
    if (isTerrain[idxA] && !isTerrain[idxB]) {
      au = (ax / params.width) + 0.5; av = (ay / params.height) + 0.5;
      bu = au; bv = av;
    } else if (!isTerrain[idxA] && isTerrain[idxB]) {
      bu = (bx / params.width) + 0.5; bv = (by / params.height) + 0.5;
      au = bu; av = bv;
    } else {
      au = (ax / params.width) + 0.5; av = (ay / params.height) + 0.5;
      bu = (bx / params.width) + 0.5; bv = (by / params.height) + 0.5;
    }

    const edgeX = bx - ax, edgeY = by - ay;
    const edgeLen = Math.sqrt(edgeX * edgeX + edgeY * edgeY) || 1;
    const nx = -edgeY / edgeLen, ny = edgeX / edgeLen;

    posArr[vi*3]=ax; posArr[vi*3+1]=ay; posArr[vi*3+2]=az_top;
    nrmArr[vi*3]=nx; nrmArr[vi*3+1]=ny; nrmArr[vi*3+2]=0;
    uvArr[vi*2]=au; uvArr[vi*2+1]=av; vi++;
    posArr[vi*3]=bx; posArr[vi*3+1]=by; posArr[vi*3+2]=bz_top;
    nrmArr[vi*3]=nx; nrmArr[vi*3+1]=ny; nrmArr[vi*3+2]=0;
    uvArr[vi*2]=bu; uvArr[vi*2+1]=bv; vi++;
    posArr[vi*3]=bx; posArr[vi*3+1]=by; posArr[vi*3+2]=bz_base;
    nrmArr[vi*3]=nx; nrmArr[vi*3+1]=ny; nrmArr[vi*3+2]=0;
    uvArr[vi*2]=bu; uvArr[vi*2+1]=bv; vi++;

    posArr[vi*3]=ax; posArr[vi*3+1]=ay; posArr[vi*3+2]=az_top;
    nrmArr[vi*3]=nx; nrmArr[vi*3+1]=ny; nrmArr[vi*3+2]=0;
    uvArr[vi*2]=au; uvArr[vi*2+1]=av; vi++;
    posArr[vi*3]=bx; posArr[vi*3+1]=by; posArr[vi*3+2]=bz_base;
    nrmArr[vi*3]=nx; nrmArr[vi*3+1]=ny; nrmArr[vi*3+2]=0;
    uvArr[vi*2]=bu; uvArr[vi*2+1]=bv; vi++;
    posArr[vi*3]=ax; posArr[vi*3+1]=ay; posArr[vi*3+2]=az_base;
    nrmArr[vi*3]=nx; nrmArr[vi*3+1]=ny; nrmArr[vi*3+2]=0;
    uvArr[vi*2]=au; uvArr[vi*2+1]=av; vi++;
  }

  const cliffGeom = new THREE.BufferGeometry();
  cliffGeom.setAttribute('position', new THREE.BufferAttribute(posArr, 3));
  cliffGeom.setAttribute('normal', new THREE.BufferAttribute(nrmArr, 3));
  cliffGeom.setAttribute('uv', new THREE.BufferAttribute(uvArr, 2));

  const cliffMat = new THREE.MeshStandardMaterial({
    map: floor2Texture || null,
    color: floor2Texture ? 0xffffff : 0x6b5a4a,
    side: THREE.DoubleSide,
    roughness: 0.8,
    metalness: 0.1
  });

  floor2CliffMesh = new THREE.Mesh(cliffGeom, cliffMat);
  floor2CliffMesh.position.copy(floor2Plane.position);
  floor2CliffMesh.rotation.copy(floor2Plane.rotation);
  floor2CliffMesh.scale.copy(floor2Plane.scale);
  scene.add(floor2CliffMesh);
}

function clearFloor2Image() {
  window.currentMediaRefs.floor2 = null;
  clearFloor2Media();
  floor2AlphaData = null;
  updateFloor2Cliffs();
  floor2Plane.material.uniforms.map.value = null;
  syncDepthMaterialUniforms(floor2Plane);
  floor2Plane.visible = false;
  updateShadowPlaneVisibility();
  floor2Aspect = 1;
  const input = document.getElementById('floor2ImageInput');
  if (input) input.value = '';
  const imagePreview = document.getElementById('floor2ImagePreview');
  const videoPreview = document.getElementById('floor2VideoPreview');
  const text = document.getElementById('floor2DropZoneText');
  if (imagePreview) { imagePreview.style.display = 'none'; imagePreview.src = ''; }
  if (videoPreview) { videoPreview.style.display = 'none'; videoPreview.pause(); videoPreview.src = ''; }
  if (text) text.style.display = 'block';
  const pauseBtn = document.getElementById('floor2VideoPause');
  if (pauseBtn) pauseBtn.style.display = 'none';
  console.log('Floor2 image cleared');
}

// ============================================
// 床3画像関連関数
// ============================================

function loadFloor3Image(file) {
  clearFloor3Media();
  if (file.type.startsWith('video/')) {
    loadFloor3Video(file);
  } else {
    loadFloor3ImageFile(file);
  }
}

function loadFloor3ImageFile(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      floor3Texture = new THREE.Texture(img);
      floor3Texture.needsUpdate = true;
      floor3Aspect = img.width / img.height;
      // アルファチャンネルを抽出（側面生成用）
      const alphaCanvas = document.createElement('canvas');
      alphaCanvas.width = img.width;
      alphaCanvas.height = img.height;
      const alphaCtx = alphaCanvas.getContext('2d');
      alphaCtx.drawImage(img, 0, 0);
      floor3AlphaData = alphaCtx.getImageData(0, 0, img.width, img.height);
      updateFloor3Cliffs();
      floor3Plane.material.uniforms.map.value = floor3Texture;
      syncDepthMaterialUniforms(floor3Plane);
      floor3Plane.visible = true;
      updateShadowPlaneVisibility();
      floor3IsVideo = false;
      const currentSize = parseFloat(document.getElementById('floor3ImageSize')?.value || 300);
      updateFloor3ImageSize(currentSize);
      const imagePreview = document.getElementById('floor3ImagePreview');
      const videoPreview = document.getElementById('floor3VideoPreview');
      const text = document.getElementById('floor3DropZoneText');
      if (imagePreview) { imagePreview.src = e.target.result; imagePreview.style.display = 'block'; }
      if (videoPreview) videoPreview.style.display = 'none';
      if (text) text.style.display = 'none';
      console.log('Floor3 image loaded:', file.name, 'aspect:', floor3Aspect);
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function loadFloor3Video(file) {
  const url = URL.createObjectURL(file);
  floor3Video = document.createElement('video');
  floor3Video.src = url;
  floor3Video.loop = true;
  floor3Video.muted = true;
  floor3Video.playsInline = true;
  floor3Video.setAttribute('playsinline', '');
  floor3Video.setAttribute('webkit-playsinline', '');
  floor3Video.onloadeddata = () => {
    floor3Texture = new THREE.VideoTexture(floor3Video);
    floor3Texture.minFilter = THREE.LinearFilter;
    floor3Texture.magFilter = THREE.LinearFilter;
    floor3Aspect = floor3Video.videoWidth / floor3Video.videoHeight;
    floor3Plane.material.uniforms.map.value = floor3Texture;
    syncDepthMaterialUniforms(floor3Plane);
    floor3Plane.visible = true;
    updateShadowPlaneVisibility();
    floor3IsVideo = true;
    floor3Video.play().catch(e => console.warn('Floor3 video autoplay blocked:', e));
    const currentSize = parseFloat(document.getElementById('floor3ImageSize')?.value || 300);
    updateFloor3ImageSize(currentSize);
    const imagePreview = document.getElementById('floor3ImagePreview');
    const videoPreview = document.getElementById('floor3VideoPreview');
    const text = document.getElementById('floor3DropZoneText');
    if (videoPreview) { videoPreview.src = url; videoPreview.play(); }
    if (imagePreview) imagePreview.style.display = 'none';
    if (videoPreview) videoPreview.style.display = 'block';
    if (text) text.style.display = 'none';
    const pauseBtn = document.getElementById('floor3VideoPause');
    if (pauseBtn) {
      pauseBtn.style.display = '';
      pauseBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';
    }
    console.log('Floor3 video loaded:', file.name, 'aspect:', floor3Aspect);
  };
  floor3Video.load();
}

function clearFloor3Media() {
  if (floor3Texture) {
    floor3Texture.dispose();
    floor3Texture = null;
  }
  if (floor3Video) {
    floor3Video.pause();
    const src = floor3Video.src;
    floor3Video.src = '';
    if (src.startsWith('blob:')) URL.revokeObjectURL(src);
    floor3Video = null;
  }
  floor3IsVideo = false;
}

function updateFloor3ImageSize(size) {
  if (!floor3Plane) return;
  const width = size * floor3Aspect;
  const height = size;
  const segs = floor3DisplacementData ? 256 : 64;
  floor3Plane.geometry.dispose();
  floor3Plane.geometry = new THREE.PlaneGeometry(width, height, segs, segs);
  applyFloor3Curvature();
}

function applyFloor3Curvature() {
  if (!floor3Plane) return;
  const geom = floor3Plane.geometry;
  const pos = geom.attributes.position;
  const params = geom.parameters;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    let z = -floor3Curvature * (x * x + y * y);
    if (floor3DisplacementData && floor3DisplacementScale > 0) {
      const u = (x / params.width) + 0.5;
      const v = 1.0 - ((y / params.height) + 0.5);
      const px = Math.min(Math.max(Math.floor(u * floor3DisplacementData.width), 0), floor3DisplacementData.width - 1);
      const py = Math.min(Math.max(Math.floor(v * floor3DisplacementData.height), 0), floor3DisplacementData.height - 1);
      const idx = (py * floor3DisplacementData.width + px) * 4;
      const height = floor3DisplacementData.data[idx] / 255;
      z += height * floor3DisplacementScale;
    }
    pos.setZ(i, z);
  }
  pos.needsUpdate = true;
  geom.computeVertexNormals();
  updateFloor3Cliffs();
}

function updateFloor3Cliffs() {
  if (floor3CliffMesh) {
    scene.remove(floor3CliffMesh);
    floor3CliffMesh.geometry.dispose();
    floor3CliffMesh.material.dispose();
    floor3CliffMesh = null;
  }
  if (!floor3Plane || !floor3AlphaData || floor3CliffDepth <= 0) return;

  const geom = floor3Plane.geometry;
  const pos = geom.attributes.position;
  const params = geom.parameters;
  const W = params.widthSegments;
  const H = params.heightSegments;
  const stride = W + 1;
  const vertCount = stride * (H + 1);

  const isTerrain = new Uint8Array(vertCount);
  for (let iy = 0; iy <= H; iy++) {
    for (let ix = 0; ix <= W; ix++) {
      const vi = iy * stride + ix;
      const x = pos.getX(vi), y = pos.getY(vi);
      const u = (x / params.width) + 0.5;
      const v = 1.0 - ((y / params.height) + 0.5);
      const px = Math.min(Math.max(Math.floor(u * floor3AlphaData.width), 0), floor3AlphaData.width - 1);
      const py = Math.min(Math.max(Math.floor(v * floor3AlphaData.height), 0), floor3AlphaData.height - 1);
      const idx = (py * floor3AlphaData.width + px) * 4 + 3;
      isTerrain[vi] = floor3AlphaData.data[idx] > 128 ? 1 : 0;
    }
  }

  const isBoundary = new Uint8Array(vertCount);
  for (let iy = 0; iy <= H; iy++) {
    for (let ix = 0; ix <= W; ix++) {
      const vi = iy * stride + ix;
      if (!isTerrain[vi]) continue;
      if ((ix > 0 && !isTerrain[vi - 1]) || (ix < W && !isTerrain[vi + 1]) ||
          (iy > 0 && !isTerrain[vi - stride]) || (iy < H && !isTerrain[vi + stride])) {
        isBoundary[vi] = 1;
      }
    }
  }

  const edgeSet = new Set();
  const edges = [];
  function addEdge(a, b) {
    const key = a < b ? a * vertCount + b : b * vertCount + a;
    if (edgeSet.has(key)) return;
    edgeSet.add(key);
    edges.push([a, b]);
  }

  for (let iy = 0; iy <= H; iy++) {
    for (let ix = 0; ix < W; ix++) {
      const a = iy * stride + ix, b = a + 1;
      if (isTerrain[a] !== isTerrain[b]) addEdge(a, b);
    }
  }
  for (let iy = 0; iy < H; iy++) {
    for (let ix = 0; ix <= W; ix++) {
      const a = iy * stride + ix, b = a + stride;
      if (isTerrain[a] !== isTerrain[b]) addEdge(a, b);
    }
  }
  for (let iy = 0; iy <= H; iy++) {
    for (let ix = 0; ix < W; ix++) {
      const a = iy * stride + ix, b = a + 1;
      if (isBoundary[a] && isBoundary[b]) addEdge(a, b);
    }
  }
  for (let iy = 0; iy < H; iy++) {
    for (let ix = 0; ix <= W; ix++) {
      const a = iy * stride + ix, b = a + stride;
      if (isBoundary[a] && isBoundary[b]) addEdge(a, b);
    }
  }

  if (edges.length === 0) return;

  const triVerts = edges.length * 6;
  const posArr = new Float32Array(triVerts * 3);
  const nrmArr = new Float32Array(triVerts * 3);
  const uvArr = new Float32Array(triVerts * 2);
  let vi = 0;

  for (const [idxA, idxB] of edges) {
    const ax = pos.getX(idxA), ay = pos.getY(idxA);
    const bx = pos.getX(idxB), by = pos.getY(idxB);
    const az_top = pos.getZ(idxA), bz_top = pos.getZ(idxB);
    const az_base = az_top - floor3CliffDepth;
    const bz_base = bz_top - floor3CliffDepth;

    let au, av, bu, bv;
    if (isTerrain[idxA] && !isTerrain[idxB]) {
      au = (ax / params.width) + 0.5; av = (ay / params.height) + 0.5;
      bu = au; bv = av;
    } else if (!isTerrain[idxA] && isTerrain[idxB]) {
      bu = (bx / params.width) + 0.5; bv = (by / params.height) + 0.5;
      au = bu; av = bv;
    } else {
      au = (ax / params.width) + 0.5; av = (ay / params.height) + 0.5;
      bu = (bx / params.width) + 0.5; bv = (by / params.height) + 0.5;
    }

    const edgeX = bx - ax, edgeY = by - ay;
    const edgeLen = Math.sqrt(edgeX * edgeX + edgeY * edgeY) || 1;
    const nx = -edgeY / edgeLen, ny = edgeX / edgeLen;

    posArr[vi*3]=ax; posArr[vi*3+1]=ay; posArr[vi*3+2]=az_top;
    nrmArr[vi*3]=nx; nrmArr[vi*3+1]=ny; nrmArr[vi*3+2]=0;
    uvArr[vi*2]=au; uvArr[vi*2+1]=av; vi++;
    posArr[vi*3]=bx; posArr[vi*3+1]=by; posArr[vi*3+2]=bz_top;
    nrmArr[vi*3]=nx; nrmArr[vi*3+1]=ny; nrmArr[vi*3+2]=0;
    uvArr[vi*2]=bu; uvArr[vi*2+1]=bv; vi++;
    posArr[vi*3]=bx; posArr[vi*3+1]=by; posArr[vi*3+2]=bz_base;
    nrmArr[vi*3]=nx; nrmArr[vi*3+1]=ny; nrmArr[vi*3+2]=0;
    uvArr[vi*2]=bu; uvArr[vi*2+1]=bv; vi++;

    posArr[vi*3]=ax; posArr[vi*3+1]=ay; posArr[vi*3+2]=az_top;
    nrmArr[vi*3]=nx; nrmArr[vi*3+1]=ny; nrmArr[vi*3+2]=0;
    uvArr[vi*2]=au; uvArr[vi*2+1]=av; vi++;
    posArr[vi*3]=bx; posArr[vi*3+1]=by; posArr[vi*3+2]=bz_base;
    nrmArr[vi*3]=nx; nrmArr[vi*3+1]=ny; nrmArr[vi*3+2]=0;
    uvArr[vi*2]=bu; uvArr[vi*2+1]=bv; vi++;
    posArr[vi*3]=ax; posArr[vi*3+1]=ay; posArr[vi*3+2]=az_base;
    nrmArr[vi*3]=nx; nrmArr[vi*3+1]=ny; nrmArr[vi*3+2]=0;
    uvArr[vi*2]=au; uvArr[vi*2+1]=av; vi++;
  }

  const cliffGeom = new THREE.BufferGeometry();
  cliffGeom.setAttribute('position', new THREE.BufferAttribute(posArr, 3));
  cliffGeom.setAttribute('normal', new THREE.BufferAttribute(nrmArr, 3));
  cliffGeom.setAttribute('uv', new THREE.BufferAttribute(uvArr, 2));

  const cliffMat = new THREE.MeshStandardMaterial({
    map: floor3Texture || null,
    color: floor3Texture ? 0xffffff : 0x6b5a4a,
    side: THREE.DoubleSide,
    roughness: 0.8,
    metalness: 0.1
  });

  floor3CliffMesh = new THREE.Mesh(cliffGeom, cliffMat);
  floor3CliffMesh.position.copy(floor3Plane.position);
  floor3CliffMesh.rotation.copy(floor3Plane.rotation);
  floor3CliffMesh.scale.copy(floor3Plane.scale);
  scene.add(floor3CliffMesh);
}

function clearFloor3Image() {
  window.currentMediaRefs.floor3 = null;
  clearFloor3Media();
  floor3AlphaData = null;
  updateFloor3Cliffs();
  floor3Plane.material.uniforms.map.value = null;
  syncDepthMaterialUniforms(floor3Plane);
  floor3Plane.visible = false;
  updateShadowPlaneVisibility();
  floor3Aspect = 1;
  const input = document.getElementById('floor3ImageInput');
  if (input) input.value = '';
  const imagePreview = document.getElementById('floor3ImagePreview');
  const videoPreview = document.getElementById('floor3VideoPreview');
  const text = document.getElementById('floor3DropZoneText');
  if (imagePreview) { imagePreview.style.display = 'none'; imagePreview.src = ''; }
  if (videoPreview) { videoPreview.style.display = 'none'; videoPreview.pause(); videoPreview.src = ''; }
  if (text) text.style.display = 'block';
  const pauseBtn = document.getElementById('floor3VideoPause');
  if (pauseBtn) pauseBtn.style.display = 'none';
  console.log('Floor3 image cleared');
}

// ============================================
// 左側面画像関連関数
// ============================================

// 左側面にファイルを読み込み（画像または動画）
function loadLeftWallImage(file) {
  clearLeftWallMedia();

  if (file.type.startsWith('video/')) {
    loadLeftWallVideo(file);
  } else {
    loadLeftWallImageFile(file);
  }
}

// 左側面画像を読み込み
function loadLeftWallImageFile(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      leftWallTexture = new THREE.Texture(img);
      leftWallTexture.needsUpdate = true;

      leftWallAspect = img.width / img.height;

      leftWallPlane.material.uniforms.map.value = leftWallTexture;
      syncDepthMaterialUniforms(leftWallPlane);
      leftWallIsVideo = false;

      const currentSize = parseFloat(document.getElementById('leftWallImageSize').value);
      updateLeftWallImageSize(currentSize);
      leftWallPlane.visible = true;
      onWindowResize();

      const imagePreview = document.getElementById('leftWallImagePreview');
      const videoPreview = document.getElementById('leftWallVideoPreview');
      const text = document.getElementById('leftWallDropZoneText');
      imagePreview.src = e.target.result;
      imagePreview.style.display = 'block';
      videoPreview.style.display = 'none';
      text.style.display = 'none';

      console.log('Left wall image loaded:', file.name, 'aspect:', leftWallAspect);
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

// 左側面動画を読み込み
function loadLeftWallVideo(file) {
  const url = URL.createObjectURL(file);
  leftWallVideo = document.createElement('video');
  leftWallVideo.src = url;
  leftWallVideo.loop = true;
  leftWallVideo.muted = true;
  leftWallVideo.playsInline = true;

  let textureReady = false;
  function onVideoReady() {
    if (textureReady) return;
    if (leftWallVideo.videoWidth === 0) return;
    textureReady = true;

    leftWallTexture = new THREE.VideoTexture(leftWallVideo);
    leftWallTexture.minFilter = THREE.LinearFilter;
    leftWallTexture.magFilter = THREE.LinearFilter;

    leftWallAspect = leftWallVideo.videoWidth / leftWallVideo.videoHeight;

    leftWallPlane.material.uniforms.map.value = leftWallTexture;
    syncDepthMaterialUniforms(leftWallPlane);
    leftWallIsVideo = true;

    leftWallVideo.play();

    const currentSize = parseFloat(document.getElementById('leftWallImageSize').value);
    updateLeftWallImageSize(currentSize);
    leftWallPlane.visible = true;
    onWindowResize();

    const imagePreview = document.getElementById('leftWallImagePreview');
    const videoPreview = document.getElementById('leftWallVideoPreview');
    const text = document.getElementById('leftWallDropZoneText');
    videoPreview.src = url;
    videoPreview.play();
    imagePreview.style.display = 'none';
    videoPreview.style.display = 'block';
    text.style.display = 'none';

    const pauseBtn = document.getElementById('leftWallVideoPause');
    if (pauseBtn) {
      pauseBtn.style.display = '';
      pauseBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';
    }

    console.log('Left wall video loaded:', file.name, 'aspect:', leftWallAspect);
  }
  leftWallVideo.addEventListener('loadedmetadata', onVideoReady);
  leftWallVideo.addEventListener('loadeddata', onVideoReady);
  leftWallVideo.addEventListener('canplay', onVideoReady);
  leftWallVideo.load();
}

// 左側面メディアを破棄
function clearLeftWallMedia() {
  if (leftWallTexture) {
    leftWallTexture.dispose();
    leftWallTexture = null;
  }
  if (leftWallVideo) {
    leftWallVideo.pause();
    const src = leftWallVideo.src;
    leftWallVideo.src = '';
    if (src.startsWith('blob:')) URL.revokeObjectURL(src);
    leftWallVideo = null;
  }
  leftWallIsVideo = false;
}

// 左側面画像サイズを更新（床基準で拡大、幕に隣接）
function updateLeftWallImageSize(size) {
  if (!leftWallPlane) return;

  // アスペクト比を維持してジオメトリを再作成（高さ基準）
  const width = size * leftWallAspect;
  const height = size;
  leftWallPlane.geometry.dispose();
  leftWallPlane.geometry = new THREE.PlaneGeometry(width, height);

  // Y位置を再計算（床基準：下端が床に接する + 高度オフセット）
  const yOffset = parseFloat(document.getElementById('leftWallImageY')?.value || 0);
  leftWallPlane.position.y = floorY + height / 2 + yOffset;

  // X位置はスライダーの値を維持
  const xVal = parseFloat(document.getElementById('leftWallImageX')?.value || 0);
  leftWallPlane.position.x = xVal;

  // Z位置はスライダーの値を維持
  const zVal = parseFloat(document.getElementById('leftWallImageZ')?.value || -150);
  leftWallPlane.position.z = zVal;
}

// 左側面画像をクリア
function clearLeftWallImage() {
  window.currentMediaRefs.leftWall = null;
  clearLeftWallMedia();

  leftWallPlane.material.uniforms.map.value = null;
  leftWallPlane.visible = false;

  leftWallAspect = 1;

  document.getElementById('leftWallImageInput').value = '';

  const imagePreview = document.getElementById('leftWallImagePreview');
  const videoPreview = document.getElementById('leftWallVideoPreview');
  const text = document.getElementById('leftWallDropZoneText');
  imagePreview.style.display = 'none';
  imagePreview.src = '';
  videoPreview.style.display = 'none';
  videoPreview.pause();
  videoPreview.src = '';
  text.style.display = 'block';

  const pauseBtn = document.getElementById('leftWallVideoPause');
  if (pauseBtn) pauseBtn.style.display = 'none';

  console.log('Left wall image cleared');
}

// ============================================
// 右側面画像関連関数
// ============================================

// 右側面にファイルを読み込み（画像または動画）
function loadRightWallImage(file) {
  clearRightWallMedia();

  if (file.type.startsWith('video/')) {
    loadRightWallVideo(file);
  } else {
    loadRightWallImageFile(file);
  }
}

// 右側面画像を読み込み
function loadRightWallImageFile(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      rightWallTexture = new THREE.Texture(img);
      rightWallTexture.needsUpdate = true;

      rightWallAspect = img.width / img.height;

      rightWallPlane.material.uniforms.map.value = rightWallTexture;
      syncDepthMaterialUniforms(rightWallPlane);
      rightWallIsVideo = false;

      const currentSize = parseFloat(document.getElementById('rightWallImageSize').value);
      updateRightWallImageSize(currentSize);
      rightWallPlane.visible = true;
      onWindowResize();

      const imagePreview = document.getElementById('rightWallImagePreview');
      const videoPreview = document.getElementById('rightWallVideoPreview');
      const text = document.getElementById('rightWallDropZoneText');
      imagePreview.src = e.target.result;
      imagePreview.style.display = 'block';
      videoPreview.style.display = 'none';
      text.style.display = 'none';

      console.log('Right wall image loaded:', file.name, 'aspect:', rightWallAspect);
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

// 右側面動画を読み込み
function loadRightWallVideo(file) {
  const url = URL.createObjectURL(file);
  rightWallVideo = document.createElement('video');
  rightWallVideo.src = url;
  rightWallVideo.loop = true;
  rightWallVideo.muted = true;
  rightWallVideo.playsInline = true;

  let textureReady = false;
  function onVideoReady() {
    if (textureReady) return;
    if (rightWallVideo.videoWidth === 0) return;
    textureReady = true;

    rightWallTexture = new THREE.VideoTexture(rightWallVideo);
    rightWallTexture.minFilter = THREE.LinearFilter;
    rightWallTexture.magFilter = THREE.LinearFilter;

    rightWallAspect = rightWallVideo.videoWidth / rightWallVideo.videoHeight;

    rightWallPlane.material.uniforms.map.value = rightWallTexture;
    syncDepthMaterialUniforms(rightWallPlane);
    rightWallIsVideo = true;

    rightWallVideo.play();

    const currentSize = parseFloat(document.getElementById('rightWallImageSize').value);
    updateRightWallImageSize(currentSize);
    rightWallPlane.visible = true;
    onWindowResize();

    const imagePreview = document.getElementById('rightWallImagePreview');
    const videoPreview = document.getElementById('rightWallVideoPreview');
    const text = document.getElementById('rightWallDropZoneText');
    videoPreview.src = url;
    videoPreview.play();
    imagePreview.style.display = 'none';
    videoPreview.style.display = 'block';
    text.style.display = 'none';

    const pauseBtn = document.getElementById('rightWallVideoPause');
    if (pauseBtn) {
      pauseBtn.style.display = '';
      pauseBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';
    }

    console.log('Right wall video loaded:', file.name, 'aspect:', rightWallAspect);
  }
  rightWallVideo.addEventListener('loadedmetadata', onVideoReady);
  rightWallVideo.addEventListener('loadeddata', onVideoReady);
  rightWallVideo.addEventListener('canplay', onVideoReady);
  rightWallVideo.load();
}

// 右側面メディアを破棄
function clearRightWallMedia() {
  if (rightWallTexture) {
    rightWallTexture.dispose();
    rightWallTexture = null;
  }
  if (rightWallVideo) {
    rightWallVideo.pause();
    const src = rightWallVideo.src;
    rightWallVideo.src = '';
    if (src.startsWith('blob:')) URL.revokeObjectURL(src);
    rightWallVideo = null;
  }
  rightWallIsVideo = false;
}

// 右側面画像サイズを更新（床基準で拡大、幕に隣接）
function updateRightWallImageSize(size) {
  if (!rightWallPlane) return;

  // アスペクト比を維持してジオメトリを再作成（高さ基準）
  const width = size * rightWallAspect;
  const height = size;
  rightWallPlane.geometry.dispose();
  rightWallPlane.geometry = new THREE.PlaneGeometry(width, height);

  // Y位置を再計算（床基準：下端が床に接する + 高度オフセット）
  const yOffset = parseFloat(document.getElementById('rightWallImageY')?.value || 0);
  rightWallPlane.position.y = floorY + height / 2 + yOffset;

  // X位置はスライダーの値を維持
  const xVal = parseFloat(document.getElementById('rightWallImageX')?.value || 0);
  rightWallPlane.position.x = xVal;

  // Z位置はスライダーの値を維持
  const zVal = parseFloat(document.getElementById('rightWallImageZ')?.value || 150);
  rightWallPlane.position.z = zVal;
}

// 右側面画像をクリア
function clearRightWallImage() {
  window.currentMediaRefs.rightWall = null;
  clearRightWallMedia();

  rightWallPlane.material.uniforms.map.value = null;
  rightWallPlane.visible = false;

  rightWallAspect = 1;

  document.getElementById('rightWallImageInput').value = '';

  const imagePreview = document.getElementById('rightWallImagePreview');
  const videoPreview = document.getElementById('rightWallVideoPreview');
  const text = document.getElementById('rightWallDropZoneText');
  imagePreview.style.display = 'none';
  imagePreview.src = '';
  videoPreview.style.display = 'none';
  videoPreview.pause();
  videoPreview.src = '';
  text.style.display = 'block';

  const pauseBtn = document.getElementById('rightWallVideoPause');
  if (pauseBtn) pauseBtn.style.display = 'none';

  console.log('Right wall image cleared');
}

// ============================================
// センター画像関連関数
// ============================================

// センターにファイルを読み込み（画像または動画）
function loadCenterWallImage(file) {
  clearCenterWallMedia();

  if (file.type.startsWith('video/')) {
    loadCenterWallVideo(file);
  } else {
    loadCenterWallImageFile(file);
  }
}

// センター画像を読み込み
function loadCenterWallImageFile(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      centerWallTexture = new THREE.Texture(img);
      centerWallTexture.needsUpdate = true;

      centerWallAspect = img.width / img.height;

      centerWallPlane.material.uniforms.map.value = centerWallTexture;
      syncDepthMaterialUniforms(centerWallPlane);
      centerWallIsVideo = false;

      const currentSize = parseFloat(document.getElementById('centerWallImageSize').value);
      updateCenterWallImageSize(currentSize);
      centerWallPlane.visible = true;
      onWindowResize();

      const imagePreview = document.getElementById('centerWallImagePreview');
      const videoPreview = document.getElementById('centerWallVideoPreview');
      const text = document.getElementById('centerWallDropZoneText');
      imagePreview.src = e.target.result;
      imagePreview.style.display = 'block';
      videoPreview.style.display = 'none';
      text.style.display = 'none';

      console.log('Center wall image loaded:', file.name, 'aspect:', centerWallAspect);
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

// センター動画を読み込み
function loadCenterWallVideo(file) {
  const url = URL.createObjectURL(file);
  centerWallVideo = document.createElement('video');
  centerWallVideo.src = url;
  centerWallVideo.loop = true;
  centerWallVideo.muted = true;
  centerWallVideo.playsInline = true;

  let textureReady = false;
  function onVideoReady() {
    if (textureReady) return;
    if (centerWallVideo.videoWidth === 0) return;
    textureReady = true;

    centerWallTexture = new THREE.VideoTexture(centerWallVideo);
    centerWallTexture.minFilter = THREE.LinearFilter;
    centerWallTexture.magFilter = THREE.LinearFilter;

    centerWallAspect = centerWallVideo.videoWidth / centerWallVideo.videoHeight;

    centerWallPlane.material.uniforms.map.value = centerWallTexture;
    syncDepthMaterialUniforms(centerWallPlane);
    centerWallIsVideo = true;

    centerWallVideo.play();

    const currentSize = parseFloat(document.getElementById('centerWallImageSize').value);
    updateCenterWallImageSize(currentSize);
    centerWallPlane.visible = true;
    onWindowResize();

    const imagePreview = document.getElementById('centerWallImagePreview');
    const videoPreview = document.getElementById('centerWallVideoPreview');
    const text = document.getElementById('centerWallDropZoneText');
    videoPreview.src = url;
    videoPreview.play();
    imagePreview.style.display = 'none';
    videoPreview.style.display = 'block';
    text.style.display = 'none';

    const pauseBtn = document.getElementById('centerWallVideoPause');
    if (pauseBtn) {
      pauseBtn.style.display = '';
      pauseBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';
    }

    console.log('Center wall video loaded:', file.name, 'aspect:', centerWallAspect);
  }
  centerWallVideo.addEventListener('loadedmetadata', onVideoReady);
  centerWallVideo.addEventListener('loadeddata', onVideoReady);
  centerWallVideo.addEventListener('canplay', onVideoReady);
  centerWallVideo.load();
}

// センターメディアを破棄
function clearCenterWallMedia() {
  if (centerWallTexture) {
    centerWallTexture.dispose();
    centerWallTexture = null;
  }
  if (centerWallVideo) {
    centerWallVideo.pause();
    const src = centerWallVideo.src;
    centerWallVideo.src = '';
    if (src.startsWith('blob:')) URL.revokeObjectURL(src);
    centerWallVideo = null;
  }
  centerWallIsVideo = false;
}

// センター画像サイズを更新（床基準で拡大）
function updateCenterWallImageSize(size) {
  if (!centerWallPlane) return;

  const width = size * centerWallAspect;
  const height = size;
  centerWallPlane.geometry.dispose();
  centerWallPlane.geometry = new THREE.PlaneGeometry(width, height);

  const yOffset = parseFloat(document.getElementById('centerWallImageY')?.value || 0);
  centerWallPlane.position.y = floorY + height / 2 + yOffset;

  const xVal = parseFloat(document.getElementById('centerWallImageX')?.value || 0);
  centerWallPlane.position.x = xVal;

  const zVal = parseFloat(document.getElementById('centerWallImageZ')?.value || 0);
  centerWallPlane.position.z = zVal;
}

// センター画像をクリア
function clearCenterWallImage() {
  window.currentMediaRefs.centerWall = null;
  clearCenterWallMedia();

  centerWallPlane.material.uniforms.map.value = null;
  centerWallPlane.visible = false;

  centerWallAspect = 1;

  const input = document.getElementById('centerWallImageInput');
  if (input) input.value = '';

  const imagePreview = document.getElementById('centerWallImagePreview');
  const videoPreview = document.getElementById('centerWallVideoPreview');
  const text = document.getElementById('centerWallDropZoneText');
  if (imagePreview) { imagePreview.style.display = 'none'; imagePreview.src = ''; }
  if (videoPreview) { videoPreview.style.display = 'none'; videoPreview.pause(); videoPreview.src = ''; }
  if (text) text.style.display = 'block';

  const pauseBtn = document.getElementById('centerWallVideoPause');
  if (pauseBtn) pauseBtn.style.display = 'none';

  console.log('Center wall image cleared');
}

// ============================================
// 奥側画像関連関数
// ============================================

// 奥側にファイルを読み込み（画像または動画）
function loadBackWallImage(file) {
  clearBackWallMedia();

  if (file.type.startsWith('video/')) {
    loadBackWallVideo(file);
  } else {
    loadBackWallImageFile(file);
  }
}

// 奥側画像を読み込み
function loadBackWallImageFile(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      backWallTexture = new THREE.Texture(img);
      backWallTexture.needsUpdate = true;

      backWallAspect = img.width / img.height;

      backWallPlane.material.uniforms.map.value = backWallTexture;
      syncDepthMaterialUniforms(backWallPlane);
      backWallIsVideo = false;

      const currentSize = parseFloat(document.getElementById('backWallImageSize').value);
      updateBackWallImageSize(currentSize);
      backWallPlane.visible = true;
      onWindowResize();

      const imagePreview = document.getElementById('backWallImagePreview');
      const videoPreview = document.getElementById('backWallVideoPreview');
      const text = document.getElementById('backWallDropZoneText');
      imagePreview.src = e.target.result;
      imagePreview.style.display = 'block';
      videoPreview.style.display = 'none';
      text.style.display = 'none';

      console.log('Back wall image loaded:', file.name, 'aspect:', backWallAspect);
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

// 奥側動画を読み込み
function loadBackWallVideo(file) {
  const url = URL.createObjectURL(file);
  backWallVideo = document.createElement('video');
  backWallVideo.src = url;
  backWallVideo.loop = true;
  backWallVideo.muted = true;
  backWallVideo.playsInline = true;

  let textureReady = false;
  function onVideoReady() {
    if (textureReady) return;
    if (backWallVideo.videoWidth === 0) return;
    textureReady = true;

    backWallTexture = new THREE.VideoTexture(backWallVideo);
    backWallTexture.minFilter = THREE.LinearFilter;
    backWallTexture.magFilter = THREE.LinearFilter;

    backWallAspect = backWallVideo.videoWidth / backWallVideo.videoHeight;

    backWallPlane.material.uniforms.map.value = backWallTexture;
    syncDepthMaterialUniforms(backWallPlane);
    backWallIsVideo = true;

    backWallVideo.play();

    const currentSize = parseFloat(document.getElementById('backWallImageSize').value);
    updateBackWallImageSize(currentSize);
    backWallPlane.visible = true;
    onWindowResize();

    const imagePreview = document.getElementById('backWallImagePreview');
    const videoPreview = document.getElementById('backWallVideoPreview');
    const text = document.getElementById('backWallDropZoneText');
    videoPreview.src = url;
    videoPreview.play();
    imagePreview.style.display = 'none';
    videoPreview.style.display = 'block';
    text.style.display = 'none';

    const pauseBtn = document.getElementById('backWallVideoPause');
    if (pauseBtn) {
      pauseBtn.style.display = '';
      pauseBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';
    }

    console.log('Back wall video loaded:', file.name, 'aspect:', backWallAspect);
  }
  backWallVideo.addEventListener('loadedmetadata', onVideoReady);
  backWallVideo.addEventListener('loadeddata', onVideoReady);
  backWallVideo.addEventListener('canplay', onVideoReady);
  backWallVideo.load();
}

// 奥側メディアを破棄
function clearBackWallMedia() {
  if (backWallTexture) {
    backWallTexture.dispose();
    backWallTexture = null;
  }
  if (backWallVideo) {
    backWallVideo.pause();
    const src = backWallVideo.src;
    backWallVideo.src = '';
    if (src.startsWith('blob:')) URL.revokeObjectURL(src);
    backWallVideo = null;
  }
  backWallIsVideo = false;
}

// 奥側画像サイズを更新（床基準で拡大）
function updateBackWallImageSize(size) {
  if (!backWallPlane) return;

  // アスペクト比を維持してジオメトリを再作成（高さ基準）
  const width = size * backWallAspect;
  const height = size;
  backWallPlane.geometry.dispose();
  backWallPlane.geometry = new THREE.PlaneGeometry(width, height);

  // Y位置を再計算（床基準：下端が床に接する + 高度オフセット）
  const yOffset = parseFloat(document.getElementById('backWallImageY')?.value || 0);
  backWallPlane.position.y = floorY + height / 2 + yOffset;

  // X位置はスライダーの値を維持
  const xVal = parseFloat(document.getElementById('backWallImageX')?.value || 0);
  backWallPlane.position.x = xVal;

  // Z位置はスライダーの値を維持
  const zVal = parseFloat(document.getElementById('backWallImageZ')?.value || 0);
  backWallPlane.position.z = zVal;
}

// 奥側画像をクリア
function clearBackWallImage() {
  window.currentMediaRefs.backWall = null;
  clearBackWallMedia();

  backWallPlane.material.uniforms.map.value = null;
  backWallPlane.visible = false;

  backWallAspect = 1;

  document.getElementById('backWallImageInput').value = '';

  const imagePreview = document.getElementById('backWallImagePreview');
  const videoPreview = document.getElementById('backWallVideoPreview');
  const text = document.getElementById('backWallDropZoneText');
  imagePreview.style.display = 'none';
  imagePreview.src = '';
  videoPreview.style.display = 'none';
  videoPreview.pause();
  videoPreview.src = '';
  text.style.display = 'block';

  const pauseBtn = document.getElementById('backWallVideoPause');
  if (pauseBtn) pauseBtn.style.display = 'none';

  console.log('Back wall image cleared');
}

// ============================================
// パネル5画像関連関数
// ============================================

// パネル5にファイルを読み込み（画像または動画）
function loadPanel5WallImage(file) {
  clearPanel5WallMedia();

  if (file.type.startsWith('video/')) {
    loadPanel5WallVideo(file);
  } else {
    loadPanel5WallImageFile(file);
  }
}

// パネル5画像を読み込み
function loadPanel5WallImageFile(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      panel5WallTexture = new THREE.Texture(img);
      panel5WallTexture.needsUpdate = true;

      panel5WallAspect = img.width / img.height;

      panel5WallPlane.material.uniforms.map.value = panel5WallTexture;
      syncDepthMaterialUniforms(panel5WallPlane);
      panel5WallIsVideo = false;

      const currentSize = parseFloat(document.getElementById('panel5WallImageSize').value);
      updatePanel5WallImageSize(currentSize);
      panel5WallPlane.visible = true;
      onWindowResize();

      const imagePreview = document.getElementById('panel5WallImagePreview');
      const videoPreview = document.getElementById('panel5WallVideoPreview');
      const text = document.getElementById('panel5WallDropZoneText');
      imagePreview.src = e.target.result;
      imagePreview.style.display = 'block';
      videoPreview.style.display = 'none';
      text.style.display = 'none';

      console.log('Panel5 wall image loaded:', file.name, 'aspect:', panel5WallAspect);
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

// パネル5動画を読み込み
function loadPanel5WallVideo(file) {
  const url = URL.createObjectURL(file);
  panel5WallVideo = document.createElement('video');
  panel5WallVideo.src = url;
  panel5WallVideo.loop = true;
  panel5WallVideo.muted = true;
  panel5WallVideo.playsInline = true;

  let textureReady = false;
  function onVideoReady() {
    if (textureReady) return;
    if (panel5WallVideo.videoWidth === 0) return;
    textureReady = true;

    panel5WallTexture = new THREE.VideoTexture(panel5WallVideo);
    panel5WallTexture.minFilter = THREE.LinearFilter;
    panel5WallTexture.magFilter = THREE.LinearFilter;

    panel5WallAspect = panel5WallVideo.videoWidth / panel5WallVideo.videoHeight;

    panel5WallPlane.material.uniforms.map.value = panel5WallTexture;
    syncDepthMaterialUniforms(panel5WallPlane);
    panel5WallIsVideo = true;

    panel5WallVideo.play();

    const currentSize = parseFloat(document.getElementById('panel5WallImageSize').value);
    updatePanel5WallImageSize(currentSize);
    panel5WallPlane.visible = true;
    onWindowResize();

    const imagePreview = document.getElementById('panel5WallImagePreview');
    const videoPreview = document.getElementById('panel5WallVideoPreview');
    const text = document.getElementById('panel5WallDropZoneText');
    videoPreview.src = url;
    videoPreview.play();
    imagePreview.style.display = 'none';
    videoPreview.style.display = 'block';
    text.style.display = 'none';

    const pauseBtn = document.getElementById('panel5WallVideoPause');
    if (pauseBtn) {
      pauseBtn.style.display = '';
      pauseBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';
    }

    console.log('Panel5 wall video loaded:', file.name, 'aspect:', panel5WallAspect);
  }
  panel5WallVideo.addEventListener('loadedmetadata', onVideoReady);
  panel5WallVideo.addEventListener('loadeddata', onVideoReady);
  panel5WallVideo.addEventListener('canplay', onVideoReady);
  panel5WallVideo.load();
}

// パネル5メディアを破棄
function clearPanel5WallMedia() {
  if (panel5WallTexture) {
    panel5WallTexture.dispose();
    panel5WallTexture = null;
  }
  if (panel5WallVideo) {
    panel5WallVideo.pause();
    const src = panel5WallVideo.src;
    panel5WallVideo.src = '';
    if (src.startsWith('blob:')) URL.revokeObjectURL(src);
    panel5WallVideo = null;
  }
  panel5WallIsVideo = false;
}

// パネル5画像サイズを更新（床基準で拡大）
function updatePanel5WallImageSize(size) {
  if (!panel5WallPlane) return;

  // アスペクト比を維持してジオメトリを再作成（高さ基準）
  const width = size * panel5WallAspect;
  const height = size;
  panel5WallPlane.geometry.dispose();
  panel5WallPlane.geometry = new THREE.PlaneGeometry(width, height);

  // Y位置を再計算（床基準：下端が床に接する + 高度オフセット）
  const yOffset = parseFloat(document.getElementById('panel5WallImageY')?.value || 0);
  panel5WallPlane.position.y = floorY + height / 2 + yOffset;

  // X位置はスライダーの値を維持
  const xVal = parseFloat(document.getElementById('panel5WallImageX')?.value || 0);
  panel5WallPlane.position.x = xVal;

  // Z位置はスライダーの値を維持
  const zVal = parseFloat(document.getElementById('panel5WallImageZ')?.value || 0);
  panel5WallPlane.position.z = zVal;
}

// パネル5画像をクリア
function clearPanel5WallImage() {
  window.currentMediaRefs.panel5Wall = null;
  clearPanel5WallMedia();

  panel5WallPlane.material.uniforms.map.value = null;
  panel5WallPlane.visible = false;

  panel5WallAspect = 1;

  document.getElementById('panel5WallImageInput').value = '';

  const imagePreview = document.getElementById('panel5WallImagePreview');
  const videoPreview = document.getElementById('panel5WallVideoPreview');
  const text = document.getElementById('panel5WallDropZoneText');
  imagePreview.style.display = 'none';
  imagePreview.src = '';
  videoPreview.style.display = 'none';
  videoPreview.pause();
  videoPreview.src = '';
  text.style.display = 'block';

  const pauseBtn = document.getElementById('panel5WallVideoPause');
  if (pauseBtn) pauseBtn.style.display = 'none';

  console.log('Panel5 wall image cleared');
}

// ============================================
// パネル6画像の読み込み・クリア
// ============================================

function loadPanel6WallImage(file) {
  clearPanel6WallMedia();

  if (file.type.startsWith('video/')) {
    loadPanel6WallVideo(file);
  } else {
    loadPanel6WallImageFile(file);
  }
}

// パネル6画像を読み込み
function loadPanel6WallImageFile(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      panel6WallTexture = new THREE.Texture(img);
      panel6WallTexture.needsUpdate = true;

      panel6WallAspect = img.width / img.height;

      panel6WallPlane.material.uniforms.map.value = panel6WallTexture;
      syncDepthMaterialUniforms(panel6WallPlane);
      panel6WallIsVideo = false;

      const currentSize = parseFloat(document.getElementById('panel6WallImageSize').value);
      updatePanel6WallImageSize(currentSize);
      panel6WallPlane.visible = true;
      onWindowResize();

      const imagePreview = document.getElementById('panel6WallImagePreview');
      const videoPreview = document.getElementById('panel6WallVideoPreview');
      const text = document.getElementById('panel6WallDropZoneText');
      imagePreview.src = e.target.result;
      imagePreview.style.display = 'block';
      videoPreview.style.display = 'none';
      text.style.display = 'none';

      console.log('Panel6 wall image loaded:', file.name, 'aspect:', panel6WallAspect);
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

// パネル6動画を読み込み
function loadPanel6WallVideo(file) {
  const url = URL.createObjectURL(file);
  panel6WallVideo = document.createElement('video');
  panel6WallVideo.src = url;
  panel6WallVideo.loop = true;
  panel6WallVideo.muted = true;
  panel6WallVideo.playsInline = true;

  let textureReady = false;
  function onVideoReady() {
    if (textureReady) return;
    if (panel6WallVideo.videoWidth === 0) return;
    textureReady = true;

    panel6WallTexture = new THREE.VideoTexture(panel6WallVideo);
    panel6WallTexture.minFilter = THREE.LinearFilter;
    panel6WallTexture.magFilter = THREE.LinearFilter;

    panel6WallAspect = panel6WallVideo.videoWidth / panel6WallVideo.videoHeight;

    panel6WallPlane.material.uniforms.map.value = panel6WallTexture;
    syncDepthMaterialUniforms(panel6WallPlane);
    panel6WallIsVideo = true;

    panel6WallVideo.play();

    const currentSize = parseFloat(document.getElementById('panel6WallImageSize').value);
    updatePanel6WallImageSize(currentSize);
    panel6WallPlane.visible = true;
    onWindowResize();

    const imagePreview = document.getElementById('panel6WallImagePreview');
    const videoPreview = document.getElementById('panel6WallVideoPreview');
    const text = document.getElementById('panel6WallDropZoneText');
    videoPreview.src = url;
    videoPreview.play();
    imagePreview.style.display = 'none';
    videoPreview.style.display = 'block';
    text.style.display = 'none';

    const pauseBtn = document.getElementById('panel6WallVideoPause');
    if (pauseBtn) {
      pauseBtn.style.display = '';
      pauseBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';
    }

    console.log('Panel6 wall video loaded:', file.name, 'aspect:', panel6WallAspect);
  }
  panel6WallVideo.addEventListener('loadedmetadata', onVideoReady);
  panel6WallVideo.addEventListener('loadeddata', onVideoReady);
  panel6WallVideo.addEventListener('canplay', onVideoReady);
  panel6WallVideo.load();
}

// パネル6メディアを破棄
function clearPanel6WallMedia() {
  if (panel6WallTexture) {
    panel6WallTexture.dispose();
    panel6WallTexture = null;
  }
  if (panel6WallVideo) {
    panel6WallVideo.pause();
    const src = panel6WallVideo.src;
    panel6WallVideo.src = '';
    if (src.startsWith('blob:')) URL.revokeObjectURL(src);
    panel6WallVideo = null;
  }
  panel6WallIsVideo = false;
}

// パネル6画像サイズを更新（床基準で拡大）
function updatePanel6WallImageSize(size) {
  if (!panel6WallPlane) return;

  // アスペクト比を維持してジオメトリを再作成（高さ基準）
  const width = size * panel6WallAspect;
  const height = size;
  panel6WallPlane.geometry.dispose();
  panel6WallPlane.geometry = new THREE.PlaneGeometry(width, height);

  // Y位置を再計算（床基準：下端が床に接する + 高度オフセット）
  const yOffset = parseFloat(document.getElementById('panel6WallImageY')?.value || 0);
  panel6WallPlane.position.y = floorY + height / 2 + yOffset;

  // X位置はスライダーの値を維持
  const xVal = parseFloat(document.getElementById('panel6WallImageX')?.value || 0);
  panel6WallPlane.position.x = xVal;

  // Z位置はスライダーの値を維持
  const zVal = parseFloat(document.getElementById('panel6WallImageZ')?.value || 0);
  panel6WallPlane.position.z = zVal;
}

// パネル6画像をクリア
function clearPanel6WallImage() {
  window.currentMediaRefs.panel6Wall = null;
  clearPanel6WallMedia();

  panel6WallPlane.material.uniforms.map.value = null;
  panel6WallPlane.visible = false;

  panel6WallAspect = 1;

  document.getElementById('panel6WallImageInput').value = '';

  const imagePreview = document.getElementById('panel6WallImagePreview');
  const videoPreview = document.getElementById('panel6WallVideoPreview');
  const text = document.getElementById('panel6WallDropZoneText');
  imagePreview.style.display = 'none';
  imagePreview.src = '';
  videoPreview.style.display = 'none';
  videoPreview.pause();
  videoPreview.src = '';
  text.style.display = 'block';

  const pauseBtn = document.getElementById('panel6WallVideoPause');
  if (pauseBtn) pauseBtn.style.display = 'none';

  console.log('Panel6 wall image cleared');
}

// ============================================
// 再生コントロール
// ============================================
// モバイル対応: 全動画要素を再生（ユーザー操作のコンテキストで呼ぶ）
function resumeAllVideos() {
  const videos = [skyDomeVideo, innerSkyVideo, floorVideo, floor2Video, floor3Video, leftWallVideo, centerWallVideo, rightWallVideo, backWallVideo, panel5WallVideo, panel6WallVideo];
  videos.forEach(v => {
    if (v && v.paused) {
      v.play().then(() => {
        // 再生成功後、テクスチャ未セットアップなら再試行
        if (v._retryTextureSetup) {
          setTimeout(() => v._retryTextureSetup(), 500);
        }
      }).catch(() => {});
    }
  });
}

function togglePlay() {
  if (state.isPlaying) {
    pause();
  } else {
    play();
  }
}

function cleanupCrossfade() {
  crossfadeStartTime = -1;
  if (audioElement) audioElement.volume = 1;
  if (overlapAudio) {
    overlapAudio.pause();
    overlapAudio.src = '';
    overlapAudio = null;
  }
}

function play() {
  if (!state.midi) return;
  state.isPlaying = true;
  state.lastFrameTime = performance.now();
  lastSyncCheck = performance.now();
  document.getElementById('playBtn').innerHTML = '<i class="fa-solid fa-pause"></i>';
  const vp = document.getElementById('viewerPlayBtn');
  if (vp) vp.innerHTML = '<i class="fa-solid fa-pause"></i>';
  // AudioContext resume（ブラウザのユーザージェスチャー要件）
  if (audioContext && audioContext.state === 'suspended') {
    audioContext.resume();
  }
  // 音源を再生（audioDelay適用）
  if (audioElement) {
    if (audioDelayTimer) clearTimeout(audioDelayTimer);
    if (state.currentTime < syncConfig.audioDelay) {
      // まだ音源開始前 → 遅延分待ってから再生
      const waitMs = (syncConfig.audioDelay - state.currentTime) * 1000;
      audioElement.currentTime = 0;
      audioDelayTimer = setTimeout(() => {
        if (state.isPlaying && audioElement) {
          audioElement.play();
        }
        audioDelayTimer = null;
      }, waitMs);
    } else {
      // 音源の開始位置を補正して即再生
      audioElement.currentTime = state.currentTime - syncConfig.audioDelay;
      audioElement.play();
    }
  }
  // モバイル対応: ユーザー操作を契機に全動画をplay
  resumeAllVideos();
}

function pause() {
  state.isPlaying = false;
  document.getElementById('playBtn').innerHTML = '<i class="fa-solid fa-play"></i>';
  const vp = document.getElementById('viewerPlayBtn');
  if (vp) vp.innerHTML = '<i class="fa-solid fa-play"></i>';
  if (audioDelayTimer) { clearTimeout(audioDelayTimer); audioDelayTimer = null; }
  cleanupCrossfade();
  // 音源を一時停止
  if (audioElement) {
    audioElement.pause();
  }
  // エフェクトで変更された背景を復元
  restoreUserBackground();
}

function stop() {
  state.isPlaying = false;
  state.currentTime = 0;
  state.triggeredNotes.clear();
  document.getElementById('playBtn').innerHTML = '<i class="fa-solid fa-play"></i>';
  const vp = document.getElementById('viewerPlayBtn');
  if (vp) vp.innerHTML = '<i class="fa-solid fa-play"></i>';
  updateTimeDisplay();
  if (audioDelayTimer) { clearTimeout(audioDelayTimer); audioDelayTimer = null; }
  cleanupCrossfade();
  // 音源を停止・最初に戻す
  if (audioElement) {
    audioElement.pause();
    audioElement.currentTime = 0;
  }
  // エフェクトで変更された背景を復元
  restoreUserBackground();
}

function reset() {
  state.currentTime = 0;
  state.triggeredNotes.clear();
  updateTimeDisplay();
  if (audioDelayTimer) { clearTimeout(audioDelayTimer); audioDelayTimer = null; }
  cleanupCrossfade();
  // 音源を最初に戻す
  if (audioElement) {
    audioElement.currentTime = 0;
  }
}

function seekTo(time) {
  time = Math.max(0, Math.min(time, state.duration));
  state.currentTime = time;
  state.triggeredNotes.clear();
  updateTimeDisplay();
  if (audioDelayTimer) { clearTimeout(audioDelayTimer); audioDelayTimer = null; }
  cleanupCrossfade();
  if (audioElement) {
    const audioTime = time - syncConfig.audioDelay;
    if (audioTime >= 0) {
      audioElement.currentTime = audioTime;
      if (state.isPlaying) audioElement.play();
    } else {
      audioElement.currentTime = 0;
      audioElement.pause();
      if (state.isPlaying) {
        audioDelayTimer = setTimeout(() => {
          if (state.isPlaying && audioElement) audioElement.play();
          audioDelayTimer = null;
        }, (-audioTime) * 1000);
      }
    }
  }
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
  // OrbitControlsの内部状態を現在のカメラ位置に再同期（maxPolarAngle制約を復元）
  if (controls) controls.update();
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
      controls.update(); // 内部状態を再同期（maxPolarAngle制約を維持）
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
      controls.update(); // 内部状態を再同期（maxPolarAngle制約を維持）
    }
  }
}

// ============================================
// アニメーションループ
// ============================================
// カメラ位置スライダーの更新
// デュアルレンジスライダーの初期化
// ブルーム閾値デュアルレンジスライダーの初期化
function initBloomThresholdRange() {
  const slider = document.getElementById('bloomThresholdRange');
  if (!slider) return;

  const min = parseFloat(slider.dataset.min);
  const max = parseFloat(slider.dataset.max);
  const range = max - min;

  const selected = slider.querySelector('.range-selected');
  const minHandle = slider.querySelector('.min-handle');
  const maxHandle = slider.querySelector('.max-handle');
  const currentMarker = slider.querySelector('.current-marker');

  let rangeMin = bloomThresholdRange.min;
  let rangeMax = bloomThresholdRange.max;

  function updatePositions() {
    const minPercent = ((rangeMin - min) / range) * 100;
    const maxPercent = ((rangeMax - min) / range) * 100;

    minHandle.style.left = minPercent + '%';
    maxHandle.style.left = maxPercent + '%';
    selected.style.left = minPercent + '%';
    selected.style.width = (maxPercent - minPercent) + '%';

    document.getElementById('bloomThresholdMinVal').textContent = rangeMin.toFixed(2);
    document.getElementById('bloomThresholdMaxVal').textContent = rangeMax.toFixed(2);

    bloomThresholdRange.min = rangeMin;
    bloomThresholdRange.max = rangeMax;

    // min=maxなら固定値を即時反映
    if (rangeMin === rangeMax && bloomPass) {
      bloomPass.threshold = rangeMin;
      bloomThresholdCurrent = rangeMin;
      bloomThresholdTarget = rangeMin;
    }
  }

  updatePositions();

  let activeHandle = null;

  function onMouseDown(e) {
    e.preventDefault();
    const rect = slider.getBoundingClientRect();
    const clickPercent = (e.clientX - rect.left) / rect.width;
    const clickValue = min + clickPercent * range;

    if (rangeMin === rangeMax) {
      // ハンドルが重なっている場合: 移動方向で判定
      activeHandle = { isMin: null, startValue: clickValue };
    } else {
      // 近い方のハンドルを掴む
      const distToMin = Math.abs(clickValue - rangeMin);
      const distToMax = Math.abs(clickValue - rangeMax);
      activeHandle = { isMin: distToMin <= distToMax };
    }
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }

  function onMouseMove(e) {
    if (!activeHandle) return;

    const rect = slider.getBoundingClientRect();
    let percent = (e.clientX - rect.left) / rect.width;
    percent = Math.max(0, Math.min(1, percent));
    let value = min + percent * range;
    value = Math.round(value * 100) / 100; // step=0.01

    // ハンドル重なり時: 最初の移動方向で min/max を決定
    if (activeHandle.isMin === null) {
      activeHandle.isMin = (value < activeHandle.startValue);
    }

    if (activeHandle.isMin) {
      rangeMin = Math.min(value, rangeMax);
    } else {
      rangeMax = Math.max(value, rangeMin);
    }

    updatePositions();
  }

  function onMouseUp() {
    activeHandle = null;
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
  }

  slider.addEventListener('mousedown', onMouseDown);

  slider._updateCurrentMarker = function(value) {
    const percent = ((value - min) / range) * 100;
    currentMarker.style.left = Math.max(0, Math.min(100, percent)) + '%';
  };

  slider._dualRange = {
    setRange: (newMin, newMax) => {
      rangeMin = newMin;
      rangeMax = newMax;
      updatePositions();
    }
  };
}

function initDualRangeSliders() {
  const sliders = document.querySelectorAll('.dual-range');

  sliders.forEach(slider => {
    const axis = slider.dataset.axis;
    if (!axis) return; // カメラ以外のデュアルレンジはスキップ
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

    // プリセット復元用の外部制御メソッド
    slider._dualRange = {
      setRange: (newMin, newMax) => {
        rangeMin = newMin;
        rangeMax = newMax;
        updatePositions();
      }
    };
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
  if (window._export360Active) return; // 360エクスポート中はスキップ

  // 前フレームのシェイクオフセットを除去（OrbitControlsが正しい位置で動作するため）
  removeCameraShakeOffset();

  // 自動カメラ遷移の更新
  updateCameraTransition();

  // ブラーエフェクトの更新
  updateBlurEffect();

  // フラッシュエフェクトの更新
  updateFlashEffect();

  // ビート連動エフェクトの更新
  if (state.isPlaying) {
    updateBeatPhase();
    updateBeatEffects();
  }

  // 動画テクスチャの再生チェック（5秒ごと）
  if (!window._lastVideoCheck) window._lastVideoCheck = 0;
  const now0 = performance.now();
  if (now0 - window._lastVideoCheck > 5000) {
    window._lastVideoCheck = now0;
    [skyDomeVideo, innerSkyVideo, floorVideo, floor2Video, floor3Video, leftWallVideo, centerWallVideo, rightWallVideo, backWallVideo, panel5WallVideo, panel6WallVideo].forEach(v => {
      if (v && v.paused && v.readyState >= 2) v.play().catch(() => {});
    });
  }

  // カメラ位置スライダーの更新（スライダー操作中でない場合）
  updateCameraPositionSliders();

  // 再生中なら時間を進める
  if (state.isPlaying && state.midi) {
    const now = performance.now();
    const delta = (now - state.lastFrameTime) / 1000;
    state.lastFrameTime = now;

    state.currentTime += delta;

    // 継続的ドリフト補正（2秒ごと）
    if (audioElement && !audioElement.paused && !audioDelayTimer) {
      const now2 = performance.now();
      if (now2 - lastSyncCheck > 2000) {
        lastSyncCheck = now2;
        const expectedMidiTime = audioElement.currentTime + syncConfig.audioDelay;
        const drift = Math.abs(state.currentTime - expectedMidiTime);
        if (drift > 0.05) {
          state.currentTime = expectedMidiTime;
        }
      }
    }

    // 終点ループまたは曲の終わりに達したらループ
    const loopPoint = (state.loopEndEnabled && state.loopEndTime > 0)
      ? state.loopEndTime
      : state.duration + syncConfig.midiDelay;

    // フェードアウト＋オーバーラップ処理（終点ループ＋音源ありの場合）
    const useFadeOut = state.loopEndEnabled && state.loopEndTime > 0 && audioElement;
    if (useFadeOut) {
      const timeToLoop = loopPoint - state.currentTime;
      // フェードアウト開始
      if (timeToLoop <= fadeOutDuration && timeToLoop > 0) {
        if (crossfadeStartTime < 0) crossfadeStartTime = state.currentTime;
        const elapsed = state.currentTime - crossfadeStartTime;
        const progress = Math.min(1, elapsed / fadeOutDuration);
        audioElement.volume = 1 - progress;
      }
      // オーバーラップ：終点の0.1秒前に次の音源を先行再生
      if (timeToLoop <= fadeOutDuration && timeToLoop > 0 && !overlapAudio && audioSrcUrl) {
        overlapAudio = new Audio(audioSrcUrl);
        overlapAudio.volume = 1;
        overlapAudio.currentTime = (state.loopStartEnabled && state.loopStartTime > 0) ? state.loopStartTime : 0;
        overlapAudio.play();
      }
    }

    if (state.currentTime >= loopPoint) {
      // ループ始点が設定されていれば2周目以降はそこから
      const loopStartSec = (state.loopStartEnabled && state.loopStartTime > 0) ? state.loopStartTime : 0;
      state.currentTime = loopStartSec;
      state.triggeredNotes.clear();
      // ループ時に音源も始点から（audioDelay考慮）
      if (audioElement) {
        if (audioDelayTimer) { clearTimeout(audioDelayTimer); audioDelayTimer = null; }
        crossfadeStartTime = -1;
        if (overlapAudio) {
          // オーバーラップ音源に切り替え
          audioElement.pause();
          audioElement.src = '';
          audioElement = overlapAudio;
          overlapAudio = null;
        } else {
          audioElement.volume = 1;
          if (syncConfig.audioDelay > 0) {
            audioElement.pause();
            audioElement.currentTime = loopStartSec;
            audioDelayTimer = setTimeout(() => {
              if (state.isPlaying && audioElement) {
                audioElement.play();
              }
              audioDelayTimer = null;
            }, syncConfig.audioDelay * 1000);
          } else {
            audioElement.currentTime = loopStartSec;
          }
        }
      }
    }

    updateTimeDisplay();
  }

  // ノート位置更新
  updateNotePositions();

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

  // 近景カメラY連動
  if (innerSkyDome && document.getElementById('innerSkyFollowCameraY')?.checked) {
    const baseY = parseFloat(document.getElementById('innerSkyOffsetY')?.value || 0);
    const polarAngle = controls.getPolarAngle(); // 0=真上, π/2=水平, π=真下
    const offsetFromHorizon = (Math.PI / 2 - polarAngle) * 150; // 水平基準で上向き=正
    innerSkyDome.position.y = baseY + offsetFromHorizon;
  }

  // 中心点・カメラが床の下に行かないよう制限（常時適用：手動・自動操縦とも）
  if (controls) {
    if (controls.target.y < floorY) {
      const correction = floorY - controls.target.y;
      controls.target.y = floorY;
      camera.position.y += correction;
    }
    if (camera.position.y < floorY) {
      camera.position.y = floorY;
    }
  }

  // シェイクオフセットを計算して適用（controls.update後、render前）
  calculateCameraShakeOffset();
  applyCameraShakeOffset();

  // 天候パーティクル更新
  updateWeatherParticles();
  updateLightning();

  // 水面アニメーション更新（両レイヤー同期）
  if (waterSurfacePlane && waterSurfacePlane.visible) {
    const timeDelta = 0.016 * waterSurfaceSpeed;
    waterSurfaceMaterial.uniforms.time.value += timeDelta;
    waterTintMaterial.uniforms.time.value = waterSurfaceMaterial.uniforms.time.value;
    // サンパス用: 太陽位置とカメラ位置を毎フレーム更新
    if (sunLight) {
      waterSurfaceMaterial.uniforms.sunPosition.value.copy(sunLight.position);
      waterTintMaterial.uniforms.sunPosition.value.copy(sunLight.position);
    }
    waterSurfaceMaterial.uniforms.camPosition.value.copy(camera.position);
    waterTintMaterial.uniforms.camPosition.value.copy(camera.position);
  }

  // 雲の影UVスクロール
  if (cloudShadowPlane && cloudShadowEnabled && cloudShadowIntensity > 0) {
    cloudShadowPlane.visible = true;
    cloudShadowPlane.material.opacity = cloudShadowIntensity;
    const t = performance.now() * 0.0001 * cloudShadowSpeed;
    const rad = cloudShadowDirection * Math.PI / 180;
    cloudShadowPlane.material.map.offset.set(t * Math.cos(rad), t * Math.sin(rad));
    cloudShadowPlane.material.map.repeat.set(cloudShadowScale, cloudShadowScale);
  } else if (cloudShadowPlane) {
    cloudShadowPlane.visible = false;
  }
  // 日向コントラスト: 床の暖色シフト
  if (floorPlane && floorPlane.material.uniforms.warmTint) {
    const warm = (cloudShadowContrast > 0 && cloudShadowEnabled && cloudShadowIntensity > 0)
      ? cloudShadowIntensity * cloudShadowContrast : 0;
    floorPlane.material.uniforms.warmTint.value = warm;
  }
  if (floor2Plane && floor2Plane.material.uniforms.warmTint) {
    const warm = (cloudShadowContrast > 0 && cloudShadowEnabled && cloudShadowIntensity > 0)
      ? cloudShadowIntensity * cloudShadowContrast : 0;
    floor2Plane.material.uniforms.warmTint.value = warm;
  }
  if (floor3Plane && floor3Plane.material.uniforms.warmTint) {
    const warm = (cloudShadowContrast > 0 && cloudShadowEnabled && cloudShadowIntensity > 0)
      ? cloudShadowIntensity * cloudShadowContrast : 0;
    floor3Plane.material.uniforms.warmTint.value = warm;
  }

  // ブルーム閾値ランダム変動
  if (bloomPass && bloomThresholdRange.min < bloomThresholdRange.max) {
    if (Math.abs(bloomThresholdCurrent - bloomThresholdTarget) < 0.005) {
      bloomThresholdTarget = bloomThresholdRange.min +
        Math.random() * (bloomThresholdRange.max - bloomThresholdRange.min);
    }
    bloomThresholdCurrent += (bloomThresholdTarget - bloomThresholdCurrent) * 0.05;
    bloomPass.threshold = bloomThresholdCurrent;
  } else if (bloomPass) {
    bloomPass.threshold = bloomThresholdRange.min;
    bloomThresholdCurrent = bloomThresholdRange.min;
  }
  const btSlider = document.getElementById('bloomThresholdRange');
  if (btSlider?._updateCurrentMarker) btSlider._updateCurrentMarker(bloomThresholdCurrent);

  // スペクトラム更新
  updateAudioVisualizer();

  if (composer && bloomPass && bloomEnabled && bloomPass.strength > 0) {
    if (!noteBloomEnabled && ((state.noteObjects && state.noteObjects.length > 0) || (state.iconSprites && state.iconSprites.length > 0) || (state.popIcons && state.popIcons.length > 0))) {
      // ノートをブルームから除外して描画
      camera.layers.disable(1);
      composer.render();
      camera.layers.enable(1);
      // ノートだけを上から描画
      const savedBg = scene.background;
      scene.background = null;
      camera.layers.set(1);
      renderer.autoClear = false;
      renderer.clearDepth();
      renderer.render(scene, camera);
      renderer.autoClear = true;
      scene.background = savedBg;
      camera.layers.set(0);
      camera.layers.enable(1);
    } else {
      composer.render();
    }
  } else {
    renderer.render(scene, camera);
  }

  // レンズフレアオーバーレイ（スクリーン空間）
  if (flareEnabled && flareIntensity > 0 && sunLight && flareScene) {
    // 光源方向を無限遠に投影（太陽のように振る舞う）
    const lightPos = sunLight.position.clone().normalize().multiplyScalar(10000);
    lightPos.project(camera);
    // カメラ背面なら非表示
    if (lightPos.z <= 1) {
      const aspect = renderer.domElement.width / renderer.domElement.height;
      const vecX = -lightPos.x * 2;
      const vecY = -lightPos.y * 2;
      const blurScale = 1 + flareBlur * 2;
      const blurOpacity = 1 / Math.sqrt(blurScale);
      flareMeshes.forEach(mesh => {
        mesh.visible = true;
        const d = mesh._flareDist;
        const px = lightPos.x + vecX * d;
        const py = lightPos.y + vecY * d;
        mesh.position.set(px, py, 0);
        const s = mesh._flareBaseSize * flareIntensity * blurScale;
        mesh.scale.set(s, s * aspect, 1);
        mesh.material.color.copy(mesh._flareBaseColor).multiplyScalar(Math.min(flareIntensity, 1) * blurOpacity);
        // ハロー（輪）
        if (mesh._haloMesh) {
          mesh._haloMesh.visible = true;
          mesh._haloMesh.position.set(px, py, 0);
          const hs = s * 2.5;
          mesh._haloMesh.scale.set(hs, hs * aspect, 1);
          mesh._haloMesh.material.color.copy(mesh._flareBaseColor).multiplyScalar(Math.min(flareIntensity, 1) * blurOpacity * 0.5);
        }
      });
      renderer.autoClear = false;
      renderer.render(flareScene, flareCamera);
      renderer.autoClear = true;
    } else {
      flareMeshes.forEach(mesh => {
        mesh.visible = false;
        if (mesh._haloMesh) mesh._haloMesh.visible = false;
      });
    }
  }
}

function updateTimeDisplay() {
  const minutes = Math.floor(state.currentTime / 60);
  const seconds = Math.floor(state.currentTime % 60);
  document.getElementById('currentTime').textContent =
    `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function updateNotePositions() {
  const timelineXSlider = document.getElementById('timelineX');
  const tlOffset = timelineXSlider ? parseInt(timelineXSlider.value) : 0;
  if (timelinePlane) {
    timelinePlane.position.x = tlOffset;
  }
  const delayOffset = syncConfig.midiDelay * CONFIG.timeScale;
  const timeOffset = state.currentTime * CONFIG.timeScale;
  const curv = floorCurvature;
  state.noteObjects.forEach(mesh => {
    const x = mesh.userData.originalX - timeOffset + delayOffset + tlOffset;
    mesh.position.x = x;
    if (curv !== 0) {
      // 床と同じ放物面: 距離の2乗に比例して沈む
      mesh.position.y = mesh.userData.originalY - curv * (x * x + mesh.position.z * mesh.position.z);
    } else {
      mesh.position.y = mesh.userData.originalY;
    }
  });
}

function updateNoteHighlights() {
  const currentTime = state.currentTime;
  const md = syncConfig.midiDelay;

  state.noteObjects.forEach(mesh => {
    const { startTime, endTime, originalColor } = mesh.userData;
    const isPlaying = currentTime >= startTime + md && currentTime <= endTime + md;

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
// ビューアーモード: データ自動読み込み
// ============================================

function base64ToBlob(base64, mimeType) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mimeType });
}

// URL参照の動画をストリーミング読み込み（メモリ節約・モバイル対応）
function loadVideoFromURL(slotName, url, loadFn) {
  return new Promise((resolve) => {
    // モバイル: _mobile版があれば使う（4K動画はモバイルでは再生困難）
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const originalUrl = url;
    if (isMobile && url.match(/\.\w+$/)) {
      url = url.replace(/(\.\w+)$/, '_mobile$1');
      console.log(`[Viewer] Mobile detected, trying: ${url}`);
    }
    console.log(`[Viewer] Streaming video ${slotName} from URL: ${url}`);
    const video = document.createElement('video');
    video.loop = true;
    video.muted = true;
    video.playsInline = true;
    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', '');
    video.setAttribute('muted', '');
    video.preload = 'auto';
    // DOMに追加（モバイルSafariで再生に必要）
    video.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0.01;pointer-events:none;z-index:-1;';
    document.body.appendChild(video);

    const slotSetup = {
      skyDome:    { setVideo: (v) => { skyDomeVideo = v; skyDomeIsVideo = true; },  getPlane: () => skyDome },
      innerSky:   { setVideo: (v) => { innerSkyVideo = v; innerSkyIsVideo = true; }, getPlane: () => innerSkyDome },
      floor:      { setVideo: (v) => { floorVideo = v; floorIsVideo = true; },       getPlane: () => floorPlane },
      floor2:     { setVideo: (v) => { floor2Video = v; floor2IsVideo = true; },     getPlane: () => floor2Plane },
      floor3:     { setVideo: (v) => { floor3Video = v; floor3IsVideo = true; },     getPlane: () => floor3Plane },
      leftWall:   { setVideo: (v) => { leftWallVideo = v; leftWallIsVideo = true; }, getPlane: () => leftWallPlane },
      centerWall: { setVideo: (v) => { centerWallVideo = v; centerWallIsVideo = true; }, getPlane: () => centerWallPlane },
      rightWall:  { setVideo: (v) => { rightWallVideo = v; rightWallIsVideo = true; }, getPlane: () => rightWallPlane },
      backWall:   { setVideo: (v) => { backWallVideo = v; backWallIsVideo = true; }, getPlane: () => backWallPlane },
      panel5Wall: { setVideo: (v) => { panel5WallVideo = v; panel5WallIsVideo = true; }, getPlane: () => panel5WallPlane },
      panel6Wall: { setVideo: (v) => { panel6WallVideo = v; panel6WallIsVideo = true; }, getPlane: () => panel6WallPlane },
    };

    // 即座にスロット変数に割り当て（resumeAllVideosで再生可能にするため）
    const setup = slotSetup[slotName];
    if (setup) {
      setup.setVideo(video);
    }

    let textureReady = false;
    function setupTexture() {
      if (textureReady) return;
      if (video.videoWidth === 0) return false;
      textureReady = true;
      const plane = setup ? setup.getPlane() : null;
      if (plane) {
        const texture = new THREE.VideoTexture(video);
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        plane.material.uniforms.map.value = texture;
        plane.visible = true;
        if (slotName === 'floor' || slotName === 'floor2' || slotName === 'floor3') {
          updateShadowPlaneVisibility();
        }

        if (slotName === 'floor') {
          floorTexture = texture;
          floorAspect = video.videoWidth / video.videoHeight;
          // 影プレーンに床テクスチャを同期
          if (shadowPlane) shadowPlane.material.userData.floorMap.value = texture;
          const sizeEl = document.getElementById('floorImageSize');
          if (sizeEl) updateFloorImageSize(parseFloat(sizeEl.value));
        }
        if (slotName === 'floor2') {
          floor2Texture = texture;
          floor2Aspect = video.videoWidth / video.videoHeight;
          const sizeEl = document.getElementById('floor2ImageSize');
          if (sizeEl) updateFloor2ImageSize(parseFloat(sizeEl.value));
        }
        if (slotName === 'floor3') {
          floor3Texture = texture;
          floor3Aspect = video.videoWidth / video.videoHeight;
          const sizeEl = document.getElementById('floor3ImageSize');
          if (sizeEl) updateFloor3ImageSize(parseFloat(sizeEl.value));
        }
      }
      console.log(`[Viewer] ${slotName} video texture ready (${video.videoWidth}x${video.videoHeight})`);
      return true;
    }

    // テクスチャ未セットアップ時のリトライ用（ユーザー操作後に呼ばれる）
    video._retryTextureSetup = () => {
      if (!textureReady && video.videoWidth > 0) {
        setupTexture();
      }
    };

    function onReady() {
      if (textureReady) return;
      if (video.videoWidth === 0) return;
      setupTexture();
      video.play().catch(e => console.warn(`[Viewer] ${slotName} autoplay blocked:`, e));
      resolve();
    }
    video.addEventListener('loadedmetadata', onReady);
    video.addEventListener('loadeddata', onReady);
    video.addEventListener('canplay', onReady);
    video.addEventListener('canplaythrough', onReady);

    video.onerror = (e) => {
      // モバイル版がない場合、オリジナルURLにフォールバック
      if (isMobile && url !== originalUrl) {
        console.warn(`[Viewer] ${slotName} mobile version not found, falling back to: ${originalUrl}`);
        url = originalUrl;
        video.src = originalUrl;
        video.load();
        return;
      }
      console.error(`[Viewer] ${slotName} video load error:`, e);
      resolve();
    };

    // タイムアウト: 30秒待ってもダメなら諦める
    setTimeout(() => {
      if (!textureReady) {
        console.warn(`[Viewer] ${slotName} video timeout (videoWidth=${video.videoWidth}, readyState=${video.readyState})`);
        video.play().then(() => {
          setTimeout(() => {
            setupTexture();
            resolve();
          }, 1000);
        }).catch(() => { resolve(); });
      }
    }, 30000);

    video.src = url;
    video.load();
  });
}

async function loadViewerData() {
  const data = window.VIEWER_DATA;
  if (!data) return;
  // 設定を適用
  if (data.settings && window.presetManager) {
    window.presetManager.applySettings(data.settings);
    // applySettingsはDOM値のみ設定しイベント未発火のため、内部変数を直接同期
    if (data.settings.loopEndEnabled !== undefined) {
      state.loopEndEnabled = data.settings.loopEndEnabled;
    }
    if (data.settings.loopEndTime !== undefined) {
      state.loopEndTime = data.settings.loopEndTime;
    }
    if (data.settings.loopStartEnabled !== undefined) {
      state.loopStartEnabled = data.settings.loopStartEnabled;
    }
    if (data.settings.loopStartTime !== undefined) {
      state.loopStartTime = data.settings.loopStartTime;
    }
    if (data.settings.fadeOutDuration !== undefined) {
      fadeOutDuration = parseInt(data.settings.fadeOutDuration) / 10;
    }

    // 天候パラメータをビューワー用に直接同期
    const s = data.settings;
    if (s.weatherType !== undefined) { weatherType = s.weatherType; }
    if (s.weatherAmount !== undefined) { weatherAmount = parseInt(s.weatherAmount); }
    if (s.weatherSpeed !== undefined) { weatherSpeed = parseFloat(s.weatherSpeed); }
    if (s.weatherSpread !== undefined) { weatherSpread = parseInt(s.weatherSpread); }
    if (s.weatherSplash !== undefined) { weatherSplash = parseInt(s.weatherSplash); }
    if (s.weatherAngle !== undefined) { weatherAngle = parseInt(s.weatherAngle); }
    if (s.weatherWindDir !== undefined) { weatherWindDir = parseInt(s.weatherWindDir); }
    if (weatherType !== 'none') buildWeatherParticles();

    // 雷パラメータをビューワー用に直接同期
    if (s.lightningFrequency !== undefined) { lightningFrequency = parseInt(s.lightningFrequency); }
    if (s.lightningIntensity !== undefined) { lightningIntensity = parseFloat(s.lightningIntensity); }
    if (s.lightningColor !== undefined) { lightningColor = s.lightningColor; }
    if (s.lightningAmbientColor !== undefined) { lightningAmbientColor = s.lightningAmbientColor; }
    if (s.lightningFlashOpacity !== undefined) { lightningFlashOpacity = parseFloat(s.lightningFlashOpacity); }
    if (s.lightningFlashDecay !== undefined) { lightningFlashDecay = parseFloat(s.lightningFlashDecay); }
    if (s.lightningRandomness !== undefined) { lightningRandomness = parseFloat(s.lightningRandomness); }

    // 起伏・側面パラメータを直接同期
    if (s.floorDisplacementScale !== undefined) { floorDisplacementScale = parseFloat(s.floorDisplacementScale); }
    if (s.floorCliffDepth !== undefined) { floorCliffDepth = parseFloat(s.floorCliffDepth); }
    if (s.floor2DisplacementScale !== undefined) { floor2DisplacementScale = parseFloat(s.floor2DisplacementScale); }
    if (s.floor2CliffDepth !== undefined) { floor2CliffDepth = parseFloat(s.floor2CliffDepth); }
    if (s.floor3DisplacementScale !== undefined) { floor3DisplacementScale = parseFloat(s.floor3DisplacementScale); }
    if (s.floor3CliffDepth !== undefined) { floor3CliffDepth = parseFloat(s.floor3CliffDepth); }

    // ノート回転を直接同期
    if (s.noteFlowAngle !== undefined) {
      noteFlowAngle = parseInt(s.noteFlowAngle);
      if (noteGroup) noteGroup.rotation.y = noteFlowAngle * Math.PI / 180;
    }
  }

  // メディアを読み込み
  const m = data.media || {};

  if (m.midi) {
    const blob = base64ToBlob(m.midi.data, m.midi.mimeType);
    const file = new File([blob], m.midi.name, { type: m.midi.mimeType });
    await loadMidi(file);
    document.getElementById('midiFileName').textContent = m.midi.name;
    const midiClearBtn = document.getElementById('midiClearBtn');
    if (midiClearBtn) midiClearBtn.style.display = '';
  }

  if (m.audio) {
    const blob = base64ToBlob(m.audio.data, m.audio.mimeType);
    const file = new File([blob], m.audio.name, { type: m.audio.mimeType });
    loadAudio(file);
    document.getElementById('audioFileName').textContent = m.audio.name;
    const audioClearBtn = document.getElementById('audioClearBtn');
    if (audioClearBtn) audioClearBtn.style.display = '';
  }

  const imageSlots = [
    { key: 'skyDome', loadFn: loadSkyDomeImage },
    { key: 'innerSky', loadFn: loadInnerSkyImage },
    { key: 'floor', loadFn: loadFloorImage },
    { key: 'floor2', loadFn: loadFloor2Image },
    { key: 'floor3', loadFn: loadFloor3Image },
    { key: 'leftWall', loadFn: loadLeftWallImage },
    { key: 'centerWall', loadFn: loadCenterWallImage },
    { key: 'rightWall', loadFn: loadRightWallImage },
    { key: 'backWall', loadFn: loadBackWallImage },
    { key: 'panel5Wall', loadFn: loadPanel5WallImage },
    { key: 'panel6Wall', loadFn: loadPanel6WallImage },
  ];

  // メディア読み込み（URL参照の動画はストリーミング、それ以外はblob変換）
  const mediaLoadPromises = [];
  for (const { key, loadFn } of imageSlots) {
    if (m[key]) {
      if (m[key].url && m[key].mimeType && m[key].mimeType.startsWith('video/')) {
        // 動画のURL参照: blobに変換せず直接URLをストリーミング
        const p = loadVideoFromURL(key, m[key].url, loadFn);
        mediaLoadPromises.push(p);
      } else if (m[key].url) {
        // 画像のURL参照: fetchしてblob変換
        const p = (async () => {
          try {
            console.log(`[Viewer] Fetching ${key} from URL: ${m[key].url}`);
            const resp = await fetch(m[key].url);
            const blob = await resp.blob();
            const file = new File([blob], m[key].name, { type: m[key].mimeType });
            loadFn(file);
            console.log(`[Viewer] ${key} loaded from URL`);
          } catch (e) {
            console.error(`[Viewer] Failed to fetch ${key}:`, e);
          }
        })();
        mediaLoadPromises.push(p);
      } else if (m[key].data) {
        // base64埋め込みデータ
        const blob = base64ToBlob(m[key].data, m[key].mimeType);
        const file = new File([blob], m[key].name, { type: m[key].mimeType });
        loadFn(file);
      }
    }
  }

  // ハイトマップを読み込み
  if (m.heightmap) {
    try {
      let blob;
      if (m.heightmap.url) {
        const resp = await fetch(m.heightmap.url);
        blob = await resp.blob();
      } else if (m.heightmap.data) {
        blob = base64ToBlob(m.heightmap.data, m.heightmap.mimeType);
      }
      if (blob) {
        window.applyHeightmapFromFile(blob);
        console.log('[Viewer] heightmap loaded');
      }
    } catch (e) {
      console.error('[Viewer] Failed to load heightmap:', e);
    }
  }

  // 床2ハイトマップを読み込み
  if (m.heightmap2) {
    try {
      let blob;
      if (m.heightmap2.url) {
        const resp = await fetch(m.heightmap2.url);
        blob = await resp.blob();
      } else if (m.heightmap2.data) {
        blob = base64ToBlob(m.heightmap2.data, m.heightmap2.mimeType);
      }
      if (blob) {
        window.applyHeightmapForFloor2(blob);
        console.log('[Viewer] heightmap2 loaded');
      }
    } catch (e) {
      console.error('[Viewer] Failed to load heightmap2:', e);
    }
  }

  // 床3ハイトマップを読み込み
  if (m.heightmap3) {
    try {
      let blob;
      if (m.heightmap3.url) {
        const resp = await fetch(m.heightmap3.url);
        blob = await resp.blob();
      } else if (m.heightmap3.data) {
        blob = base64ToBlob(m.heightmap3.data, m.heightmap3.mimeType);
      }
      if (blob) {
        window.applyHeightmapForFloor3(blob);
        console.log('[Viewer] heightmap3 loaded');
      }
    } catch (e) {
      console.error('[Viewer] Failed to load heightmap3:', e);
    }
  }

  // 全メディア読み込みを待つ
  if (mediaLoadPromises.length > 0) {
    await Promise.all(mediaLoadPromises);
  }

  // メディア読み込み後に設定を再適用（画像のロードは非同期なので遅延）
  if (data.settings && window.presetManager) {
    setTimeout(() => {
      window.presetManager.applySettings(data.settings);
      // ビューワーではimage-panelガード内のイベントリスナーが存在しないため、
      // DOM値を直接3Dオブジェクトに反映する
      syncWallSettingsFromDOM();
      updateShadowPlaneVisibility();
    }, 500);
  }

  // 読み込み完了: ぼかしオーバーレイを除去
  const loadingBlur = document.getElementById('viewer-loading-blur');
  if (loadingBlur) {
    // 動画のロードを少し待ってからフェードアウト
    setTimeout(() => {
      loadingBlur.classList.add('fade-out');
      setTimeout(() => loadingBlur.remove(), 1000);
    }, 800);
  }

  // モバイル対応: 初回タッチ時に全動画を再生開始
  function onFirstInteraction() {
    resumeAllVideos();
    document.removeEventListener('touchstart', onFirstInteraction);
    document.removeEventListener('click', onFirstInteraction);
  }
  document.addEventListener('touchstart', onFirstInteraction, { once: true });
  document.addEventListener('click', onFirstInteraction, { once: true });

  // ビューアーオーバーレイのイベント登録
  const playBtn = document.getElementById('viewerPlayBtn');
  const stopBtn = document.getElementById('viewerStopBtn');
  const rewBtn = document.getElementById('viewerRewBtn');
  const ffBtn = document.getElementById('viewerFfBtn');
  const timeSpan = document.getElementById('viewerTime');
  const durationSpan = document.getElementById('viewerDuration');
  const seekBar = document.getElementById('viewerSeek');

  if (playBtn) {
    playBtn.addEventListener('click', () => {
      togglePlay();
    });
  }
  if (stopBtn) {
    stopBtn.addEventListener('click', () => {
      stop();
      if (seekBar) seekBar.value = 0;
    });
  }
  if (rewBtn) {
    rewBtn.addEventListener('click', () => {
      seekTo(state.currentTime - 10);
    });
  }
  if (ffBtn) {
    ffBtn.addEventListener('click', () => {
      seekTo(state.currentTime + 10);
    });
  }

  // シークバー
  let isSeeking = false;
  if (seekBar) {
    seekBar.addEventListener('mousedown', () => { isSeeking = true; });
    seekBar.addEventListener('touchstart', () => { isSeeking = true; });
    seekBar.addEventListener('input', () => {
      const effectiveDuration = (state.loopEndEnabled && state.loopEndTime > 0) ? state.loopEndTime : state.duration;
      if (effectiveDuration > 0) {
        const targetTime = (parseFloat(seekBar.value) / 100) * effectiveDuration;
        seekTo(targetTime);
      }
    });
    seekBar.addEventListener('mouseup', () => { isSeeking = false; });
    seekBar.addEventListener('touchend', () => { isSeeking = false; });
  }

  // 時間・シークバー表示を更新するループ
  function updateViewerDuration() {
    if (durationSpan) {
      const effectiveDuration = (state.loopEndEnabled && state.loopEndTime > 0) ? state.loopEndTime : state.duration;
      const dm = Math.floor(effectiveDuration / 60);
      const ds = Math.floor(effectiveDuration % 60);
      durationSpan.textContent = `/ ${dm}:${ds.toString().padStart(2, '0')}`;
    }
  }
  updateViewerDuration();

  function updateViewerTime() {
    const effectiveDuration = (state.loopEndEnabled && state.loopEndTime > 0) ? state.loopEndTime : state.duration;
    if (timeSpan) {
      const minutes = Math.floor(state.currentTime / 60);
      const seconds = Math.floor(state.currentTime % 60);
      timeSpan.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
    if (seekBar && !isSeeking && effectiveDuration > 0) {
      seekBar.value = (state.currentTime / effectiveDuration) * 100;
    }
    requestAnimationFrame(updateViewerTime);
  }
  updateViewerTime();

  // ビューアー中心点スライダー → 隠しスライダーに連動
  const centerAxes = ['X', 'Y', 'Z'];
  centerAxes.forEach(axis => {
    const viewerSlider = document.getElementById('viewerCenter' + axis);
    const hiddenSlider = document.getElementById('cameraTarget' + axis);
    if (viewerSlider && hiddenSlider) {
      viewerSlider.value = hiddenSlider.value;
      viewerSlider.addEventListener('input', () => {
        hiddenSlider.value = viewerSlider.value;
        hiddenSlider.dispatchEvent(new Event('input'));
      });
    }
  });

  // ビューアー ノート・レイアウトスライダー → 隠しスライダーに連動
  const viewerDisplayMappings = [
    { viewer: 'viewerBounceScale', hidden: 'bounceScale' },
    { viewer: 'viewerBounceDuration', hidden: 'bounceDuration' },
    { viewer: 'viewerPopIconScale', hidden: 'popIconScale' },
    { viewer: 'viewerNoteHeight', hidden: 'noteHeight' },
    { viewer: 'viewerNoteDepth', hidden: 'noteDepth' },
    { viewer: 'viewerNoteOpacity', hidden: 'noteOpacity' },
    { viewer: 'viewerTrackSpacing', hidden: 'trackSpacing' },
    { viewer: 'viewerTimeScale', hidden: 'timeScale' },
    { viewer: 'viewerPitchScale', hidden: 'pitchScale' },
    { viewer: 'viewerNoteYOffset', hidden: 'noteYOffset' },
  ];
  viewerDisplayMappings.forEach(({ viewer, hidden }) => {
    const viewerSlider = document.getElementById(viewer);
    const hiddenSlider = document.getElementById(hidden);
    if (viewerSlider && hiddenSlider) {
      viewerSlider.value = hiddenSlider.value;
      viewerSlider.addEventListener('input', () => {
        hiddenSlider.value = viewerSlider.value;
        hiddenSlider.dispatchEvent(new Event('input'));
      });
    }
  });

  // 設定パネルトグル
  const settingsToggle = document.getElementById('viewerSettingsToggle');
  const sideControls = document.querySelector('.viewer-side-controls');
  if (settingsToggle && sideControls) {
    const updateTogglePos = () => {
      if (sideControls.classList.contains('open')) {
        const h = sideControls.offsetHeight;
        settingsToggle.style.top = (h + 5) + 'px';
      } else {
        settingsToggle.style.top = '10px';
      }
    };
    settingsToggle.addEventListener('click', () => {
      sideControls.classList.toggle('open');
      updateTogglePos();
    });
    // パネル外タップで閉じる
    document.addEventListener('click', (e) => {
      if (sideControls.classList.contains('open') &&
          !sideControls.contains(e.target) &&
          !settingsToggle.contains(e.target)) {
        sideControls.classList.remove('open');
        updateTogglePos();
      }
    });
  }

  // 和英切り替えボタン
  const langJP = document.getElementById('viewerLangJP');
  const langEN = document.getElementById('viewerLangEN');
  if (langJP && langEN) {
    const switchLang = (toEn) => {
      langJP.classList.toggle('active', !toEn);
      langEN.classList.toggle('active', toEn);
      document.querySelectorAll('.viewer-side-controls [data-en]').forEach(el => {
        if (!el.dataset.ja) el.dataset.ja = el.textContent;
        el.textContent = toEn ? el.dataset.en : el.dataset.ja;
      });
    };
    langJP.addEventListener('click', () => switchLang(false));
    langEN.addEventListener('click', () => switchLang(true));
  }

  // ローディング表示を消す
  const loadingEl = document.getElementById('viewerLoading');
  if (loadingEl) loadingEl.style.display = 'none';

  console.log('Viewer data loaded successfully');
}

// ============================================
// 起動
// ============================================
init();

// デバッグ用にグローバルに露出
window.state = state;
window.CONFIG = CONFIG;

// プリセット復元用に関数を公開
window.appFunctions = {
  loadMidi, loadAudio, clearMidi, clearAudio,
  loadSkyDomeImage, loadInnerSkyImage, loadFloorImage, loadFloor2Image, loadFloor3Image, loadLeftWallImage, loadCenterWallImage, loadRightWallImage, loadBackWallImage, loadPanel5WallImage, loadPanel6WallImage,
  clearSkyDomeImage, clearInnerSkyImage, clearFloorImage, clearFloor2Image, clearFloor3Image, clearLeftWallImage, clearCenterWallImage, clearRightWallImage, clearBackWallImage, clearPanel5WallImage, clearPanel6WallImage,
  updateTrackPanel, debouncedRebuildNotes,
};

// 360度エクスポート用にinternal関数・オブジェクトを公開
window.exportHelpers = {
  getRenderer: () => renderer,
  getScene: () => scene,
  getCamera: () => camera,
  getComposer: () => composer,
  getBloomPass: () => bloomPass,
  getFlareEnabled: () => flareEnabled,
  setFlareEnabled: (v) => { flareEnabled = v; },
  getSyncConfig: () => syncConfig,
  getTimelinePlane: () => timelinePlane,
  getAudioElement: () => audioElement,
  updateSceneForExport: (dt) => {
    updateNotePositions();
    updateNoteHighlights();
    updateNoteBounce(dt);
    updateOrchestraHighlights();
    checkNoteRipples();
    updateRipples(dt);
    updatePopIcons(dt);
    updateWeatherParticles();
    updateLightning();
    if (waterSurfacePlane && waterSurfacePlane.visible) {
      const timeDelta = 0.016 * waterSurfaceSpeed;
      waterSurfaceMaterial.uniforms.time.value += timeDelta;
      if (waterTintMaterial) waterTintMaterial.uniforms.time.value = waterSurfaceMaterial.uniforms.time.value;
    }
    if (cloudShadowPlane && cloudShadowEnabled && cloudShadowIntensity > 0) {
      cloudShadowPlane.visible = true;
      cloudShadowPlane.material.opacity = cloudShadowIntensity;
      const t = performance.now() * 0.0001 * cloudShadowSpeed;
      const rad = cloudShadowDirection * Math.PI / 180;
      cloudShadowPlane.material.map.offset.set(t * Math.cos(rad), t * Math.sin(rad));
      cloudShadowPlane.material.map.repeat.set(cloudShadowScale, cloudShadowScale);
    }
    // ブルーム閾値ランダム変動（エクスポート時）
    if (bloomPass && bloomThresholdRange.min < bloomThresholdRange.max) {
      if (Math.abs(bloomThresholdCurrent - bloomThresholdTarget) < 0.005) {
        bloomThresholdTarget = bloomThresholdRange.min +
          Math.random() * (bloomThresholdRange.max - bloomThresholdRange.min);
      }
      bloomThresholdCurrent += (bloomThresholdTarget - bloomThresholdCurrent) * 0.05;
      bloomPass.threshold = bloomThresholdCurrent;
    } else if (bloomPass) {
      bloomPass.threshold = bloomThresholdRange.min;
      bloomThresholdCurrent = bloomThresholdRange.min;
    }
  },
};
