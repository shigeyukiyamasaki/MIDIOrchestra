// ============================================================
// MIDI Orchestra - Split View (2×2 instrument category grid)
// 2D Canvas piano roll
// ============================================================

// --- Instrument definitions ---

const INSTRUMENTS = {
  violin1:    { name: 'Violin 1',    category: 'strings',    color: '#c9784a' },
  violin2:    { name: 'Violin 2',    category: 'strings',    color: '#d4956a' },
  viola:      { name: 'Viola',       category: 'strings',    color: '#8b5a2b' },
  cello:      { name: 'Cello',       category: 'strings',    color: '#6b4423' },
  contrabass: { name: 'Contrabass',  category: 'strings',    color: '#4a3728' },
  harp:       { name: 'Harp',        category: 'strings',    color: '#e91e90' },
  dulcimer:   { name: 'Dulcimer',    category: 'strings',    color: '#f06292' },
  flute:       { name: 'Flute',        category: 'woodwind',   color: '#7cb342' },
  oboe:        { name: 'Oboe',         category: 'woodwind',   color: '#558b2f' },
  englishhorn: { name: 'English Horn', category: 'woodwind',   color: '#4a6741' },
  clarinet:     { name: 'Clarinet',      category: 'woodwind',   color: '#33691e' },
  bassclarinet: { name: 'Bass Clarinet',category: 'woodwind',   color: '#2e5016' },
  bassoon:      { name: 'Bassoon',      category: 'woodwind',   color: '#827717' },
  piccolo:     { name: 'Piccolo',      category: 'woodwind',   color: '#9ccc65' },
  horn:       { name: 'Horn',        category: 'brass',      color: '#ffc107' },
  trumpet:    { name: 'Trumpet',     category: 'brass',      color: '#ffb300' },
  trombone:   { name: 'Trombone',    category: 'brass',      color: '#ff8f00' },
  tuba:       { name: 'Tuba',        category: 'brass',      color: '#ff6f00' },
  flugelhorn: { name: 'Flugelhorn',  category: 'brass',      color: '#ffa000' },
  timpani:      { name: 'Timpani',       category: 'percussion', color: '#1565c0' },
  snare:        { name: 'Snare Drum',    category: 'percussion', color: '#42a5f5' },
  bassdrum:     { name: 'Bass Drum',     category: 'percussion', color: '#0d47a1' },
  xylophone:    { name: 'Xylophone',     category: 'percussion', color: '#ab47bc' },
  marimba:      { name: 'Marimba',       category: 'percussion', color: '#8e24aa' },
  vibraphone:   { name: 'Vibraphone',    category: 'percussion', color: '#ce93d8' },
  glocken:      { name: 'Glockenspiel',  category: 'percussion', color: '#ba68c8' },
  tubularbells: { name: 'Tubular Bells', category: 'percussion', color: '#5c6bc0' },
  triangle:     { name: 'Triangle',      category: 'percussion', color: '#90caf9' },
  windchimes:   { name: 'Wind Chimes',   category: 'percussion', color: '#81d4fa' },
  tambourine:   { name: 'Tambourine',    category: 'percussion', color: '#2979ff' },
  tamtam:       { name: 'Tam-tam',       category: 'percussion', color: '#1a237e' },
  cymbals:         { name: 'Cymbals',          category: 'percussion', color: '#448aff' },
  suspendedcymbal: { name: 'Suspended Cymbal', category: 'percussion', color: '#536dfe' },
  hihat:           { name: 'Hi-Hat',           category: 'percussion', color: '#bbdefb' },
  percussion:   { name: 'Percussion',    category: 'percussion', color: '#1e88e5' },
  drums:        { name: 'Drums',         category: 'percussion', color: '#1565c0' },
  piano:      { name: 'Piano',       category: 'keyboard',   color: '#1976d2' },
  celesta:    { name: 'Celesta',     category: 'percussion', color: '#9c27b0' },
  organ:      { name: 'Organ',       category: 'keyboard',   color: '#0d47a1' },
  other:      { name: 'Other',       category: 'other',      color: '#9e9e9e' },
};

const INSTRUMENT_KEYWORDS = [
  { id: 'englishhorn', keywords: ['english horn', 'englishhorn', 'cor anglais', 'coranglais'] },
  { id: 'piccolo',     keywords: ['piccolo', 'picc'] },
  { id: 'flute',       keywords: ['flute', 'flauto', 'fl.', 'flauti'] },
  { id: 'oboe',        keywords: ['oboe', 'oboi', 'ob.'] },
  { id: 'bassclarinet', keywords: ['bass clarinet', 'bassclarinet', 'bass cl', 'bcl'] },
  { id: 'clarinet',    keywords: ['clarinet', 'clarinett', 'clar', 'cl.'] },
  { id: 'bassoon',     keywords: ['bassoon', 'fagott', 'bsn', 'fag'] },
  { id: 'horn',        keywords: ['horn', 'cor ', 'hn.', 'corni'] },
  { id: 'trumpet',     keywords: ['trumpet', 'tromb', 'trp', 'tr.', 'tromba', 'trombe'] },
  { id: 'trombone',    keywords: ['trombone', 'trbn', 'pos'] },
  { id: 'tuba',        keywords: ['tuba', 'tba'] },
  { id: 'flugelhorn',  keywords: ['flugelhorn', 'flugel', 'flghn'] },
  { id: 'violin1',     keywords: ['violin 1', 'violin i', 'vln1', 'vln 1', 'vn1', 'vn 1', 'violini i', '1st violin'] },
  { id: 'violin2',     keywords: ['violin 2', 'violin ii', 'vln2', 'vln 2', 'vn2', 'vn 2', 'violini ii', '2nd violin'] },
  { id: 'viola',       keywords: ['viola', 'vla', 'viole'] },
  { id: 'cello',       keywords: ['cello', 'violoncell', 'vcl', 'vc.', 'vlc'] },
  { id: 'contrabass',  keywords: ['contrabass', 'double bass', 'bass', 'kontrabass', 'cb.', 'bassi'] },
  { id: 'harp',        keywords: ['harp', 'arpa'] },
  { id: 'dulcimer',    keywords: ['dulcimer'] },
  { id: 'timpani',     keywords: ['timpani', 'timp', 'pauken'] },
  { id: 'snare',       keywords: ['snare', 'sd'] },
  { id: 'bassdrum',    keywords: ['bass drum', 'bassdrum', 'gran cassa', 'bd'] },
  { id: 'marimba',     keywords: ['marimba'] },
  { id: 'vibraphone',  keywords: ['vibraphone', 'vibes'] },
  { id: 'xylophone',   keywords: ['xylophone', 'xyl'] },
  { id: 'glocken',     keywords: ['glockenspiel', 'glock', 'glsp'] },
  { id: 'tubularbells', keywords: ['tubular bell', 'chime', 'campane'] },
  { id: 'triangle',    keywords: ['triangle', 'tri.'] },
  { id: 'windchimes',  keywords: ['wind chime'] },
  { id: 'tambourine',  keywords: ['tambourine', 'tamb'] },
  { id: 'tamtam',      keywords: ['tam-tam', 'tamtam', 'tam tam', 'gong'] },
  { id: 'suspendedcymbal', keywords: ['suspended cymbal', 'susp'] },
  { id: 'cymbals',     keywords: ['cymbal', 'piatti', 'becken'] },
  { id: 'hihat',       keywords: ['hi-hat', 'hihat', 'hh'] },
  { id: 'drums',       keywords: ['drum'] },
  { id: 'percussion',  keywords: ['percus', 'perc'] },
  { id: 'piano',       keywords: ['piano', 'pf.', 'pno'] },
  { id: 'celesta',     keywords: ['celesta', 'cel.'] },
  { id: 'organ',       keywords: ['organ'] },
];

function guessInstrument(trackName) {
  const name = trackName.toLowerCase();
  for (const { id, keywords } of INSTRUMENT_KEYWORDS) {
    for (const kw of keywords) {
      if (name.includes(kw)) return id;
    }
  }
  return 'other';
}

function categoryToPanel(category) {
  if (category === 'keyboard' || category === 'other') return 'percussion';
  return category;
}

// --- Helpers ---

// Distinct channel colors (hue-spaced)
const CHANNEL_COLORS = [
  '#e06c75', '#e5c07b', '#98c379', '#56b6c2',
  '#61afef', '#c678dd', '#d19a66', '#be5046',
  '#7ec8e3', '#f0a1c2', '#a9dc76', '#ff9e64',
  '#bb9af7', '#73daca', '#ff757f', '#c3e88d',
];

function getChannelColor(trackIndex) {
  return CHANNEL_COLORS[trackIndex % CHANNEL_COLORS.length];
}

// Parse hex to RGB
function hexToRgb(hex) {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

// Adjust saturation: 0 = grayscale, 1 = original, 2 = vivid
function adjustColor(hex, saturation, brightness) {
  const key = hex + '|' + saturation.toFixed(2) + '|' + brightness.toFixed(2);
  if (_colorCache[key]) return _colorCache[key];

  let [r, g, b] = hexToRgb(hex);

  // Saturation adjustment via luminance mix
  const lum = 0.299 * r + 0.587 * g + 0.114 * b;
  r = Math.round(Math.min(255, Math.max(0, lum + (r - lum) * saturation) * brightness));
  g = Math.round(Math.min(255, Math.max(0, lum + (g - lum) * saturation) * brightness));
  b = Math.round(Math.min(255, Math.max(0, lum + (b - lum) * saturation) * brightness));

  const result = `rgb(${r},${g},${b})`;
  _colorCache[key] = result;
  return result;
}

const _colorCache = {};

// Blend an rgb(...) string toward white by amount (0-1)
function blendToWhite(rgbStr, amount) {
  const m = rgbStr.match(/(\d+)/g);
  if (!m) return rgbStr;
  const r = Math.round(+m[0] + (255 - m[0]) * amount);
  const g = Math.round(+m[1] + (255 - m[1]) * amount);
  const b = Math.round(+m[2] + (255 - m[2]) * amount);
  return `rgb(${r},${g},${b})`;
}

// --- Config ---

const CONFIG = {
  timeScale: 40,       // pixels per second
  pitchScale: 4,       // pixels per semitone
  noteHeight: 3,       // note height in pixels
  noteOpacity: 1,
  saturation: 1,       // 0 = grayscale, 2 = vivid
  brightness: 1,       // color brightness multiplier
  bounceSize: 8,       // bounce amplitude in pixels
  bounceDuration: 0.3, // bounce duration in seconds
  bounceFlash: 0.5,    // 0 = no flash, 1 = full white
  parallax: 0.3,       // 0 = off, 1 = max
};

// --- State ---

const state = {
  midi: null,
  duration: 0,
  currentTime: 0,
  isPlaying: false,
  lastFrameTime: 0,
};

const syncConfig = { midiDelay: 0, audioDelay: 0 };
let audioElement = null;
let audioContext = null;
let audioDelayTimer = null;
let lastSyncCheck = 0;

// --- Panels ---

const SECTION_PANEL_KEYS = ['woodwind', 'brass', 'strings', 'percussion'];
let activePanelKeys = [...SECTION_PANEL_KEYS];
const panels = {};
let parsedTracksByPanel = null;
let parsedTracks = []; // all parsed tracks for track-split mode
let currentSplitMode = 'section';

function getSplitMode() {
  return document.getElementById('splitMode')?.value || 'section';
}

function initPanels() {
  for (const key of SECTION_PANEL_KEYS) {
    const canvas = document.getElementById(`canvas-${key}`);
    const ctx = canvas.getContext('2d');
    panels[key] = {
      canvas,
      ctx,
      notes: [],       // { x, y, w, h, color } in world coords (pixels)
      trackNames: [],
      minPitch: 60,
      maxPitch: 72,
    };
  }
  activePanelKeys = [...SECTION_PANEL_KEYS];
  updateCanvasSizes();
}

function switchToSectionMode() {
  // Remove track panels
  const grid = document.getElementById('grid');
  for (const key of activePanelKeys) {
    if (!SECTION_PANEL_KEYS.includes(key)) {
      const panel = document.getElementById(`panel-${key}`);
      if (panel) panel.remove();
      delete panels[key];
    }
  }
  // Show section panels
  for (const key of SECTION_PANEL_KEYS) {
    const panel = document.getElementById(`panel-${key}`);
    if (panel) panel.style.display = '';
  }
  // Reset grid
  grid.style.gridTemplateColumns = '1fr 1fr';
  grid.style.gridTemplateRows = '1fr 1fr';
  grid.style.aspectRatio = '16 / 9';
  activePanelKeys = [...SECTION_PANEL_KEYS];
  if (parsedTracksByPanel) buildNotes();
  updateCanvasSizes();
}

function switchToTrackMode() {
  if (parsedTracks.length === 0) return;

  const grid = document.getElementById('grid');

  // Hide section panels
  for (const key of SECTION_PANEL_KEYS) {
    const panel = document.getElementById(`panel-${key}`);
    if (panel) panel.style.display = 'none';
  }

  // Remove old track panels
  for (const key of activePanelKeys) {
    if (!SECTION_PANEL_KEYS.includes(key)) {
      const panel = document.getElementById(`panel-${key}`);
      if (panel) panel.remove();
      delete panels[key];
    }
  }

  const trackCount = parsedTracks.length;
  const cols = Math.ceil(Math.sqrt(trackCount));
  const rows = Math.ceil(trackCount / cols);

  grid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
  grid.style.gridTemplateRows = `repeat(${rows}, 1fr)`;
  grid.style.aspectRatio = '';

  activePanelKeys = [];

  for (let i = 0; i < trackCount; i++) {
    const t = parsedTracks[i];
    const panelKey = `track-${i}`;
    activePanelKeys.push(panelKey);

    const panelDiv = document.createElement('div');
    panelDiv.className = 'panel';
    panelDiv.id = `panel-${panelKey}`;

    const canvas = document.createElement('canvas');
    canvas.id = `canvas-${panelKey}`;
    panelDiv.appendChild(canvas);

    const label = document.createElement('div');
    label.className = 'panel-label';
    // Use category color
    const cat = t.instrument.category;
    const catClass = (cat === 'keyboard' || cat === 'other') ? 'percussion' : cat;
    label.classList.add(catClass);
    label.textContent = t.name;
    label.style.fontSize = trackCount > 12 ? '10px' : '13px';
    panelDiv.appendChild(label);

    grid.appendChild(panelDiv);

    const ctx = canvas.getContext('2d');
    panels[panelKey] = {
      canvas,
      ctx,
      notes: [],
      trackNames: [t.name],
      minPitch: 60,
      maxPitch: 72,
    };
  }

  buildNotesForTrackMode();
  updateCanvasSizes();
}

function buildNotesForTrackMode() {
  for (let i = 0; i < parsedTracks.length; i++) {
    const t = parsedTracks[i];
    const panelKey = `track-${i}`;
    const p = panels[panelKey];
    if (!p) continue;

    p.notes = [];

    let minPitch = 127, maxPitch = 0;
    for (const n of t.notes) {
      if (n.midi < minPitch) minPitch = n.midi;
      if (n.midi > maxPitch) maxPitch = n.midi;
    }
    if (minPitch > maxPitch) { minPitch = 60; maxPitch = 72; }
    p.minPitch = minPitch;
    p.maxPitch = maxPitch;

    const color = t.instrument.color;
    for (const note of t.notes) {
      p.notes.push({
        time: note.time,
        duration: note.duration,
        midi: note.midi,
        velocity: note.velocity !== undefined ? note.velocity : 0.8,
        color,
        depth: 0,
        trackIdx: 0,
      });
    }
  }
}

function updateCanvasSizes() {
  for (const key of activePanelKeys) {
    const p = panels[key];
    if (!p || !p.canvas.parentElement) continue;
    const rect = p.canvas.parentElement.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) continue;
    const dpr = window.devicePixelRatio || 1;
    p.canvas.width = Math.floor(rect.width * dpr);
    p.canvas.height = Math.floor(rect.height * dpr);
    p.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    p.displayWidth = rect.width;
    p.displayHeight = rect.height;
  }
}

// --- MIDI Loading ---

async function loadMidi(file) {
  const arrayBuffer = await file.arrayBuffer();
  const midi = new Midi(arrayBuffer);

  state.midi = midi;
  state.duration = midi.duration;
  state.currentTime = 0;

  const tracksByPanel = { woodwind: [], brass: [], strings: [], percussion: [] };
  parsedTracksByPanel = tracksByPanel;
  parsedTracks = [];

  midi.tracks.forEach((track, index) => {
    if (track.notes.length === 0) return;
    const trackName = track.name || `Track ${index + 1}`;
    const instrumentId = guessInstrument(trackName);
    const instrument = INSTRUMENTS[instrumentId];
    const panelKey = categoryToPanel(instrument.category);

    const trackData = {
      index,
      name: trackName,
      instrumentId,
      instrument,
      notes: track.notes,
    };

    tracksByPanel[panelKey].push(trackData);
    parsedTracks.push(trackData);
  });

  const mode = getSplitMode();
  if (mode === 'track') {
    switchToTrackMode();
  } else {
    buildNotes();
  }

  document.getElementById('playBtn').disabled = false;
  document.getElementById('stopBtn').disabled = false;
  updateTimeDisplay();
}

function buildNotes() {
  if (!parsedTracksByPanel) return;

  for (const key of SECTION_PANEL_KEYS) {
    const tracks = parsedTracksByPanel[key];
    const p = panels[key];
    p.notes = [];

    // Track names
    p.trackNames = tracks.map(t => t.instrument.name);
    const tracksEl = document.getElementById(`tracks-${key}`);
    if (tracksEl) {
      tracksEl.textContent = p.trackNames.length > 0 ? p.trackNames.join(' / ') : '(該当トラックなし)';
    }

    if (tracks.length === 0) continue;

    // Pitch range
    let minPitch = 127, maxPitch = 0;
    for (const t of tracks) {
      for (const n of t.notes) {
        if (n.midi < minPitch) minPitch = n.midi;
        if (n.midi > maxPitch) maxPitch = n.midi;
      }
    }
    if (minPitch > maxPitch) { minPitch = 60; maxPitch = 72; }
    p.minPitch = minPitch;
    p.maxPitch = maxPitch;

    // Build note rects with parallax depth per track
    // depth: 0 = frontmost (fastest scroll), 1 = deepest (slowest scroll)
    const trackCount = tracks.length;
    for (let ti = 0; ti < trackCount; ti++) {
      const t = tracks[ti];
      const color = getChannelColor(ti);
      const depth = trackCount > 1 ? ti / (trackCount - 1) : 0;
      for (const note of t.notes) {
        p.notes.push({
          time: note.time,
          duration: note.duration,
          midi: note.midi,
          velocity: note.velocity !== undefined ? note.velocity : 0.8,
          color,
          depth,
          trackIdx: ti,
        });
      }
    }

    // Sort back-to-front so foreground draws on top
    p.notes.sort((a, b) => b.depth - a.depth);
  }
}

// --- Audio Loading ---

function loadAudio(file) {
  if (audioElement) {
    audioElement.pause();
    audioElement.src = '';
  }
  audioElement = new Audio();
  audioElement.src = URL.createObjectURL(file);
  audioElement.load();
}

// --- Playback ---

function play() {
  if (!state.midi) return;
  state.isPlaying = true;
  state.lastFrameTime = performance.now();
  lastSyncCheck = performance.now();

  if (audioElement) {
    if (!audioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    const audioTime = state.currentTime - syncConfig.audioDelay;
    if (audioTime >= 0) {
      audioElement.currentTime = audioTime;
      audioElement.play().catch(() => {});
    } else {
      audioDelayTimer = 'waiting';
    }
  }

  document.getElementById('playBtn').innerHTML = '<i class="fa-solid fa-pause"></i>';
}

function pause() {
  state.isPlaying = false;
  if (audioElement) audioElement.pause();
  document.getElementById('playBtn').innerHTML = '<i class="fa-solid fa-play"></i>';
}

function stop() {
  state.isPlaying = false;
  state.currentTime = 0;
  if (audioElement) {
    audioElement.pause();
    audioElement.currentTime = 0;
  }
  audioDelayTimer = null;
  document.getElementById('playBtn').innerHTML = '<i class="fa-solid fa-play"></i>';
  updateTimeDisplay();
}

function togglePlay() {
  if (state.isPlaying) pause();
  else play();
}

// --- Rendering ---

function getDisplayMode() {
  return document.getElementById('displayMode')?.value || 'bar';
}

// Shared per-note computation: position, bounce, flash, color
function computeNote(note, cursorX, timeOffset, yOrigin, maxPitch) {
  const { timeScale, pitchScale, noteHeight, noteOpacity, parallax: parallaxStrength } = CONFIG;
  const d = note.depth;
  const scrollFactor = 1 - d * parallaxStrength;
  const x = cursorX + (note.time - timeOffset) * timeScale * scrollFactor;
  const w = Math.max(note.duration * timeScale * scrollFactor, 2);
  const sizeFactor = 1 - d * 0.3;
  const h = noteHeight * sizeFactor;
  const opacityFactor = 1 - d * 0.4;
  const brightnessFactor = 1 - d * 0.35;

  let y = yOrigin + (maxPitch - note.midi) * pitchScale - h / 2;

  // Bounce
  let bounceOffset = 0;
  const elapsed = timeOffset - note.time;
  if (CONFIG.bounceSize > 0 && CONFIG.bounceDuration > 0 && elapsed >= 0 && elapsed < CONFIG.bounceDuration) {
    const t = elapsed / CONFIG.bounceDuration;
    bounceOffset = CONFIG.bounceSize * Math.sin(t * Math.PI) * (1 - t);
  }
  y -= bounceOffset;

  // Color + flash
  const baseColor = adjustColor(note.color, CONFIG.saturation, brightnessFactor * CONFIG.brightness);
  let flashAmount = 0;
  if (CONFIG.bounceFlash > 0 && CONFIG.bounceDuration > 0 && elapsed >= 0 && elapsed < CONFIG.bounceDuration) {
    flashAmount = (1 - elapsed / CONFIG.bounceDuration) * CONFIG.bounceFlash;
  }
  const color = flashAmount > 0 ? blendToWhite(baseColor, flashAmount) : baseColor;
  const alpha = noteOpacity * opacityFactor;

  return { x, y, w, h, color, alpha, scrollFactor, sizeFactor, elapsed, bounceOffset };
}

function drawPanel(key) {
  const p = panels[key];
  const ctx = p.ctx;
  const W = p.displayWidth;
  const H = p.displayHeight;

  ctx.clearRect(0, 0, W, H);
  if (p.notes.length === 0) return;

  const { timeScale, pitchScale, noteHeight } = CONFIG;
  const { minPitch, maxPitch } = p;
  const pitchRange = maxPitch - minPitch + 1;
  const cursorX = W * 0.5;
  const timeOffset = state.currentTime + syncConfig.midiDelay;
  const totalPitchHeight = pitchRange * pitchScale;
  const yOrigin = (H - totalPitchHeight) / 2;

  // Cursor line (section mode only)
  if (currentSplitMode !== 'track') {
    ctx.strokeStyle = '#ff4444';
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = 0.6;
    ctx.beginPath();
    ctx.moveTo(cursorX, 0);
    ctx.lineTo(cursorX, H);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  const mode = getDisplayMode();

  // Modes that need per-track grouping
  if (mode === 'line' || mode === 'ribbon') {
    drawLineMode(ctx, p, cursorX, timeOffset, yOrigin, W, H, mode);
    return;
  }

  if (mode === 'rain') {
    drawRainMode(ctx, p, cursorX, timeOffset, W, H);
    return;
  }

  if (mode === 'spectrogram') {
    drawSpectrogramMode(ctx, p, cursorX, timeOffset, yOrigin, W, H);
    return;
  }

  // Per-note modes
  for (const note of p.notes) {
    const n = computeNote(note, cursorX, timeOffset, yOrigin, maxPitch);
    if (n.x + n.w < 0 || n.x > W) continue;

    ctx.globalAlpha = n.alpha;
    ctx.fillStyle = n.color;
    ctx.strokeStyle = n.color;

    switch (mode) {
      case 'bar':
        ctx.fillRect(n.x, n.y, n.w, n.h);
        break;

      case 'dot': {
        const r = Math.max(n.h * 0.8, 2) * (0.5 + note.velocity * 0.5);
        ctx.beginPath();
        ctx.arc(n.x, n.y + n.h / 2, r, 0, Math.PI * 2);
        ctx.fill();
        break;
      }

      case 'stem': {
        const stemH = Math.max(n.h * 3, 6);
        ctx.lineWidth = Math.max(n.h * 0.4, 1);
        ctx.beginPath();
        ctx.moveTo(n.x, n.y + n.h / 2 + stemH / 2);
        ctx.lineTo(n.x, n.y + n.h / 2 - stemH / 2);
        ctx.stroke();
        // Dot at top
        ctx.beginPath();
        ctx.arc(n.x, n.y + n.h / 2 - stemH / 2, Math.max(n.h * 0.5, 1.5), 0, Math.PI * 2);
        ctx.fill();
        break;
      }

      case 'diamond': {
        const dw = Math.max(n.w, n.h * 2);
        const dh = n.h * 1.5;
        const cx = n.x + dw / 2;
        const cy = n.y + n.h / 2;
        ctx.beginPath();
        ctx.moveTo(cx, cy - dh);
        ctx.lineTo(cx + dw / 2, cy);
        ctx.lineTo(cx, cy + dh);
        ctx.lineTo(cx - dw / 2, cy);
        ctx.closePath();
        ctx.fill();
        break;
      }

      case 'triangle': {
        const tw = Math.max(n.w, n.h * 2);
        const th = n.h * 2;
        const cx = n.x + tw / 2;
        const cy = n.y + n.h / 2;
        // Up triangle if pitch rising (just use pitch parity)
        const up = note.midi % 2 === 0;
        ctx.beginPath();
        if (up) {
          ctx.moveTo(cx, cy - th);
          ctx.lineTo(cx + tw / 2, cy + th / 2);
          ctx.lineTo(cx - tw / 2, cy + th / 2);
        } else {
          ctx.moveTo(cx, cy + th);
          ctx.lineTo(cx + tw / 2, cy - th / 2);
          ctx.lineTo(cx - tw / 2, cy - th / 2);
        }
        ctx.closePath();
        ctx.fill();
        break;
      }

      case 'wave': {
        ctx.lineWidth = Math.max(n.h * 0.5, 1);
        ctx.beginPath();
        const amp = n.h * 1.5;
        const freq = 8;
        for (let px = 0; px < n.w; px++) {
          const wy = n.y + n.h / 2 + Math.sin((px / n.w) * Math.PI * freq) * amp;
          if (px === 0) ctx.moveTo(n.x + px, wy);
          else ctx.lineTo(n.x + px, wy);
        }
        ctx.stroke();
        break;
      }

      case 'particle': {
        const elapsed = n.elapsed;
        const particleCount = Math.max(3, Math.floor(n.w / 2));
        const r = Math.max(n.h * 0.3, 1);
        if (elapsed >= 0 && elapsed < CONFIG.bounceDuration * 2) {
          // Exploding particles
          const spread = elapsed * 40;
          for (let i = 0; i < particleCount; i++) {
            const angle = (i / particleCount) * Math.PI * 2 + note.midi;
            const dist = spread * (0.5 + Math.sin(i * 7.3) * 0.5);
            const fade = Math.max(0, 1 - elapsed / (CONFIG.bounceDuration * 2));
            ctx.globalAlpha = n.alpha * fade;
            ctx.beginPath();
            ctx.arc(n.x + Math.cos(angle) * dist, n.y + n.h / 2 + Math.sin(angle) * dist, r, 0, Math.PI * 2);
            ctx.fill();
          }
        } else {
          // Static bar before trigger
          ctx.fillRect(n.x, n.y, n.w, n.h);
        }
        break;
      }

      case 'star': {
        const isActive = n.elapsed >= 0 && n.elapsed < CONFIG.bounceDuration;
        const baseR = Math.max(n.h * 0.6, 1.5);
        const starR = isActive ? baseR * (1 + 2 * (1 - n.elapsed / CONFIG.bounceDuration)) : baseR;
        const cx = n.x;
        const cy = n.y + n.h / 2;

        if (isActive) {
          // Glow
          ctx.globalAlpha = n.alpha * 0.3 * (1 - n.elapsed / CONFIG.bounceDuration);
          ctx.beginPath();
          ctx.arc(cx, cy, starR * 3, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = n.alpha;
        }

        // Star shape
        ctx.beginPath();
        for (let i = 0; i < 10; i++) {
          const a = (i * Math.PI) / 5 - Math.PI / 2;
          const sr = i % 2 === 0 ? starR : starR * 0.4;
          const sx = cx + Math.cos(a) * sr;
          const sy = cy + Math.sin(a) * sr;
          if (i === 0) ctx.moveTo(sx, sy);
          else ctx.lineTo(sx, sy);
        }
        ctx.closePath();
        ctx.fill();
        break;
      }

      case 'trail': {
        // Draw the note as a dot + fading trail behind it
        const r = Math.max(n.h * 0.6, 2);
        const cx = n.x;
        const cy = n.y + n.h / 2;
        // Trail (only for passed notes)
        if (n.elapsed >= 0) {
          const trailLen = Math.min(n.elapsed * timeScale * 0.5, 80);
          const grad = ctx.createLinearGradient(cx, cy, cx + trailLen, cy);
          grad.addColorStop(0, n.color);
          grad.addColorStop(1, 'transparent');
          ctx.fillStyle = grad;
          ctx.globalAlpha = n.alpha * 0.5;
          ctx.fillRect(cx, cy - r / 2, trailLen, r);
          ctx.globalAlpha = n.alpha;
          ctx.fillStyle = n.color;
        }
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();
        break;
      }

      default:
        ctx.fillRect(n.x, n.y, n.w, n.h);
    }
  }
  ctx.globalAlpha = 1;
}

// --- Line / Ribbon mode (connects notes per track) ---

function drawLineMode(ctx, p, cursorX, timeOffset, yOrigin, W, H, mode) {
  const { timeScale, pitchScale, noteHeight, noteOpacity, parallax: pStr } = CONFIG;
  const { maxPitch } = p;

  // Group notes by track
  const byTrack = {};
  for (const note of p.notes) {
    if (!byTrack[note.trackIdx]) byTrack[note.trackIdx] = [];
    byTrack[note.trackIdx].push(note);
  }

  for (const tidx of Object.keys(byTrack)) {
    const trackNotes = byTrack[tidx].sort((a, b) => a.time - b.time);
    if (trackNotes.length < 2) continue;

    const points = [];
    for (const note of trackNotes) {
      const n = computeNote(note, cursorX, timeOffset, yOrigin, maxPitch);
      points.push({ x: n.x, y: n.y + n.h / 2, color: n.color, alpha: n.alpha });
    }

    // Filter visible range with margin
    const visible = points.filter(pt => pt.x > -100 && pt.x < W + 100);
    if (visible.length < 2) continue;

    ctx.strokeStyle = visible[0].color;
    ctx.globalAlpha = visible[0].alpha;

    if (mode === 'ribbon') {
      // Draw as filled ribbon
      ctx.lineWidth = noteHeight * 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    } else {
      ctx.lineWidth = Math.max(noteHeight * 0.5, 1);
    }

    ctx.beginPath();
    ctx.moveTo(visible[0].x, visible[0].y);
    for (let i = 1; i < visible.length; i++) {
      // Smooth curve
      const prev = visible[i - 1];
      const cur = visible[i];
      const cpx = (prev.x + cur.x) / 2;
      ctx.quadraticCurveTo(prev.x, prev.y, cpx, (prev.y + cur.y) / 2);
    }
    const last = visible[visible.length - 1];
    ctx.lineTo(last.x, last.y);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

// --- Rain mode (vertical falling) ---

function drawRainMode(ctx, p, cursorX, timeOffset, W, H) {
  const { noteHeight, noteOpacity, parallax: pStr } = CONFIG;

  for (const note of p.notes) {
    const d = note.depth;
    const opacityFactor = 1 - d * 0.4;
    const brightnessFactor = 1 - d * 0.35;
    const sizeFactor = 1 - d * 0.3;

    // X = pitch mapped to width
    const x = ((note.midi - p.minPitch) / Math.max(p.maxPitch - p.minPitch, 1)) * W;

    // Y = time-based (falls down)
    const elapsed = timeOffset - note.time;
    const y = H * 0.2 + elapsed * 60;

    if (y < -20 || y > H + 20) continue;

    const fade = y > H * 0.7 ? Math.max(0, 1 - (y - H * 0.7) / (H * 0.3)) : 1;
    const r = Math.max(noteHeight * sizeFactor * 0.5, 1);
    const len = Math.max(note.duration * 30 * sizeFactor, 4);

    const baseColor = adjustColor(note.color, CONFIG.saturation, brightnessFactor * CONFIG.brightness);
    ctx.globalAlpha = noteOpacity * opacityFactor * fade;

    // Raindrop line
    ctx.strokeStyle = baseColor;
    ctx.lineWidth = r;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y - len);
    ctx.stroke();

    // Splash at bottom
    if (y > H * 0.7) {
      ctx.globalAlpha = noteOpacity * opacityFactor * (1 - fade) * 0.5;
      ctx.beginPath();
      ctx.arc(x, H * 0.7, r * 3 * (1 - fade), 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;
}

// --- Spectrogram mode ---

function drawSpectrogramMode(ctx, p, cursorX, timeOffset, yOrigin, W, H) {
  const { timeScale, pitchScale, noteOpacity, parallax: pStr } = CONFIG;
  const { minPitch, maxPitch } = p;

  for (const note of p.notes) {
    const d = note.depth;
    const scrollFactor = 1 - d * pStr;
    const x = cursorX + (note.time - timeOffset) * timeScale * scrollFactor;
    const w = Math.max(note.duration * timeScale * scrollFactor, 2);

    if (x + w < 0 || x > W) continue;

    // Map pitch to hue (low = red, high = blue)
    const pitchRatio = (note.midi - minPitch) / Math.max(maxPitch - minPitch, 1);
    const hue = pitchRatio * 270; // red → violet
    const lightness = 40 + note.velocity * 30;

    // Full height band per note
    const bandH = Math.max(pitchScale * 1.5, 3);
    const y = yOrigin + (maxPitch - note.midi) * pitchScale;

    const opacityFactor = 1 - d * 0.4;
    ctx.globalAlpha = noteOpacity * opacityFactor;
    ctx.fillStyle = `hsl(${hue}, 80%, ${lightness}%)`;
    ctx.fillRect(x, y, w, bandH);
  }
  ctx.globalAlpha = 1;
}

// --- Animation ---

function animate() {
  requestAnimationFrame(animate);

  if (state.isPlaying && state.midi) {
    const now = performance.now();
    let delta = (now - state.lastFrameTime) / 1000;
    state.lastFrameTime = now;
    if (delta > 0.5) delta = 0.016;

    state.currentTime += delta;

    // Delayed audio start
    if (audioDelayTimer === 'waiting' && audioElement && state.currentTime >= syncConfig.audioDelay) {
      audioDelayTimer = null;
      audioElement.currentTime = Math.max(0, state.currentTime - syncConfig.audioDelay);
      audioElement.play().catch(() => {});
    }

    // Drift correction
    if (audioElement && !audioElement.paused && !audioDelayTimer) {
      const now2 = performance.now();
      if (now2 - lastSyncCheck > 2000) {
        lastSyncCheck = now2;
        const expected = audioElement.currentTime + syncConfig.audioDelay;
        if (Math.abs(state.currentTime - expected) > 0.05) {
          state.currentTime = expected;
        }
      }
    }

    // End check
    if (state.currentTime >= state.duration + syncConfig.midiDelay) {
      stop();
      return;
    }

    updateTimeDisplay();
  }

  // Draw all panels
  for (const key of activePanelKeys) {
    drawPanel(key);
  }
}

function updateTimeDisplay() {
  const cur = state.currentTime;
  const dur = state.duration;
  const fmt = (t) => {
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };
  document.getElementById('timeDisplay').textContent = `${fmt(cur)} / ${fmt(dur)}`;
}

// --- File Library (IndexedDB persistent) ---

const DB_NAME = 'MIDIOrchestraSplitView';
const DB_VERSION = 1;
const STORE_NAME = 'files';

let db = null;
const fileLibrary = { midi: [], audio: [] };
let currentMidiName = null;
let currentAudioName = null;

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const d = e.target.result;
      if (!d.objectStoreNames.contains(STORE_NAME)) {
        const store = d.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
        store.createIndex('type', 'type', { unique: false });
        store.createIndex('name_type', ['name', 'type'], { unique: true });
      }
    };
    req.onsuccess = (e) => { db = e.target.result; resolve(db); };
    req.onerror = (e) => reject(e.target.error);
  });
}

async function loadLibraryFromDB() {
  if (!db) return;
  for (const type of ['midi', 'audio']) {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const idx = store.index('type');
    const req = idx.getAll(type);
    await new Promise((resolve) => {
      req.onsuccess = () => {
        fileLibrary[type] = req.result.map(r => ({
          id: r.id,
          name: r.name,
          blob: r.blob,
        }));
        if (fileLibrary[type].length > 0) {
          document.getElementById(`${type}LibBtn`).disabled = false;
        }
        resolve();
      };
    });
  }
}

async function addToLibrary(type, name, file) {
  if (fileLibrary[type].some(e => e.name === name)) return;

  const blob = file instanceof Blob ? file : new Blob([await file.arrayBuffer()]);
  const record = { type, name, blob, createdAt: Date.now() };

  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  const req = store.add(record);
  await new Promise((resolve) => {
    req.onsuccess = () => { record.id = req.result; resolve(); };
    req.onerror = () => resolve();
  });

  fileLibrary[type].push({ id: record.id, name, blob });
  document.getElementById(`${type}LibBtn`).disabled = false;
}

async function deleteFromLibrary(type, id) {
  const tx = db.transaction(STORE_NAME, 'readwrite');
  tx.objectStore(STORE_NAME).delete(id);
  await new Promise(r => { tx.oncomplete = r; });
  fileLibrary[type] = fileLibrary[type].filter(e => e.id !== id);
  if (fileLibrary[type].length === 0) {
    document.getElementById(`${type}LibBtn`).disabled = true;
  }
}

function blobToFile(blob, name) {
  return new File([blob], name, { type: blob.type });
}

function renderLibraryDropdown(type) {
  const dropdown = document.getElementById(`${type}LibDropdown`);
  dropdown.innerHTML = '';
  const currentName = type === 'midi' ? currentMidiName : currentAudioName;

  if (fileLibrary[type].length === 0) {
    const empty = document.createElement('div');
    empty.className = 'lib-empty';
    empty.textContent = '履歴なし';
    dropdown.appendChild(empty);
    return;
  }

  for (const entry of fileLibrary[type]) {
    const item = document.createElement('div');
    item.className = 'lib-item';
    if (entry.name === currentName) item.classList.add('active');

    const nameSpan = document.createElement('span');
    nameSpan.textContent = entry.name;
    nameSpan.style.flex = '1';
    nameSpan.style.overflow = 'hidden';
    nameSpan.style.textOverflow = 'ellipsis';
    item.appendChild(nameSpan);

    const delBtn = document.createElement('span');
    delBtn.textContent = '✕';
    delBtn.style.cssText = 'margin-left:8px;color:#666;font-size:10px;flex-shrink:0;cursor:pointer;';
    delBtn.addEventListener('click', async (ev) => {
      ev.stopPropagation();
      await deleteFromLibrary(type, entry.id);
      renderLibraryDropdown(type);
    });
    item.appendChild(delBtn);

    item.style.display = 'flex';
    item.style.alignItems = 'center';

    item.addEventListener('click', () => {
      dropdown.classList.remove('open');
      const file = blobToFile(entry.blob, entry.name);
      if (type === 'midi') {
        currentMidiName = entry.name;
        document.getElementById('midiFileName').textContent = entry.name;
        loadMidi(file);
      } else {
        currentAudioName = entry.name;
        document.getElementById('audioFileName').textContent = entry.name;
        loadAudio(file);
      }
    });
    dropdown.appendChild(item);
  }
}

function setupLibrary() {
  for (const type of ['midi', 'audio']) {
    const btn = document.getElementById(`${type}LibBtn`);
    const dropdown = document.getElementById(`${type}LibDropdown`);

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const otherType = type === 'midi' ? 'audio' : 'midi';
      document.getElementById(`${otherType}LibDropdown`).classList.remove('open');

      renderLibraryDropdown(type);
      dropdown.classList.toggle('open');
    });
  }

  document.addEventListener('click', () => {
    document.getElementById('midiLibDropdown').classList.remove('open');
    document.getElementById('audioLibDropdown').classList.remove('open');
  });
}

// --- Settings ---

function setupSettings() {
  // Split mode toggle
  document.getElementById('splitMode')?.addEventListener('change', () => {
    const mode = getSplitMode();
    if (mode === currentSplitMode) return;
    currentSplitMode = mode;
    if (mode === 'track') {
      switchToTrackMode();
    } else {
      switchToSectionMode();
    }
  });

  const sliders = [
    { id: 'noteHeight',  configKey: 'noteHeight' },
    { id: 'noteOpacity', configKey: 'noteOpacity' },
    { id: 'saturation',  configKey: 'saturation' },
    { id: 'brightness',  configKey: 'brightness' },
    { id: 'bounceSize',     configKey: 'bounceSize' },
    { id: 'bounceDuration', configKey: 'bounceDuration' },
    { id: 'bounceFlash',    configKey: 'bounceFlash' },
    { id: 'parallax',       configKey: 'parallax' },
    { id: 'timeScale',   configKey: 'timeScale' },
    { id: 'pitchScale',  configKey: 'pitchScale' },
  ];

  for (const s of sliders) {
    const el = document.getElementById(s.id);
    const valEl = document.getElementById(s.id + 'Value');
    el.addEventListener('input', () => {
      const v = parseFloat(el.value);
      CONFIG[s.configKey] = v;
      valEl.textContent = v;
    });
  }
}

// --- Event Listeners ---

function setupEvents() {
  document.getElementById('midiInput').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    currentMidiName = file.name;
    document.getElementById('midiFileName').textContent = file.name;
    addToLibrary('midi', file.name, file);
    loadMidi(file);
  });

  document.getElementById('audioInput').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    currentAudioName = file.name;
    document.getElementById('audioFileName').textContent = file.name;
    addToLibrary('audio', file.name, file);
    loadAudio(file);
  });

  document.getElementById('playBtn').addEventListener('click', togglePlay);
  document.getElementById('stopBtn').addEventListener('click', stop);

  document.addEventListener('keydown', (e) => {
    if (e.code === 'Space') { e.preventDefault(); togglePlay(); }
  });

  const midiDelaySlider = document.getElementById('midiDelay');
  const audioDelaySlider = document.getElementById('audioDelay');
  midiDelaySlider.addEventListener('input', () => {
    syncConfig.midiDelay = parseFloat(midiDelaySlider.value);
    document.getElementById('midiDelayValue').textContent = syncConfig.midiDelay.toFixed(2) + 's';
  });
  audioDelaySlider.addEventListener('input', () => {
    syncConfig.audioDelay = parseFloat(audioDelaySlider.value);
    document.getElementById('audioDelayValue').textContent = syncConfig.audioDelay.toFixed(2) + 's';
  });

  window.addEventListener('resize', updateCanvasSizes);

  setupLibrary();
  setupSettings();
}

// --- Init ---

(async () => {
  await openDB();
  await loadLibraryFromDB();
  initPanels();
  setupEvents();
  animate();
})();
