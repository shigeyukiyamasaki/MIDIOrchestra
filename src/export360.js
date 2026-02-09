// ============================================
// 360度動画書き出し (Equirectangular WebM)
// ============================================

(function () {
  'use strict';

  // キューブマップ6面の方向定義
  // 順序: +X, -X, +Y, -Y, +Z, -Z
  const CUBE_FACES = [
    { name: '+X', dir: new THREE.Vector3(1, 0, 0), up: new THREE.Vector3(0, 1, 0) },
    { name: '-X', dir: new THREE.Vector3(-1, 0, 0), up: new THREE.Vector3(0, 1, 0) },
    { name: '+Y', dir: new THREE.Vector3(0, 1, 0), up: new THREE.Vector3(0, 0, -1) },
    { name: '-Y', dir: new THREE.Vector3(0, -1, 0), up: new THREE.Vector3(0, 0, 1) },
    { name: '+Z', dir: new THREE.Vector3(0, 0, 1), up: new THREE.Vector3(0, 1, 0) },
    { name: '-Z', dir: new THREE.Vector3(0, 0, -1), up: new THREE.Vector3(0, 1, 0) },
  ];

  // 6面テクスチャからequirectangularに変換するシェーダー
  const equirectShader = {
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D faceTexPX; // +X (右)
      uniform sampler2D faceTexNX; // -X (左)
      uniform sampler2D faceTexPY; // +Y (上)
      uniform sampler2D faceTexNY; // -Y (下)
      uniform sampler2D faceTexPZ; // +Z (前)
      uniform sampler2D faceTexNZ; // -Z (後)
      varying vec2 vUv;
      #define PI 3.14159265359

      vec4 sampleCube(vec3 dir) {
        vec3 absDir = abs(dir);
        float ma;
        vec2 uv;
        // Three.js PerspectiveCamera lookAt座標系に基づくUVマッピング
        if (absDir.x >= absDir.y && absDir.x >= absDir.z) {
          ma = absDir.x;
          if (dir.x > 0.0) {
            // +X: camera right=+Z, camera up=+Y
            uv = vec2(dir.z, dir.y) / ma * 0.5 + 0.5;
            return texture2D(faceTexPX, uv);
          } else {
            // -X: camera right=-Z, camera up=+Y
            uv = vec2(-dir.z, dir.y) / ma * 0.5 + 0.5;
            return texture2D(faceTexNX, uv);
          }
        } else if (absDir.y >= absDir.x && absDir.y >= absDir.z) {
          ma = absDir.y;
          if (dir.y > 0.0) {
            // +Y: camera right=-X, camera up=-Z
            uv = vec2(-dir.x, -dir.z) / ma * 0.5 + 0.5;
            return texture2D(faceTexPY, uv);
          } else {
            // -Y: camera right=-X, camera up=+Z
            uv = vec2(-dir.x, dir.z) / ma * 0.5 + 0.5;
            return texture2D(faceTexNY, uv);
          }
        } else {
          ma = absDir.z;
          if (dir.z > 0.0) {
            // +Z: camera right=-X, camera up=+Y
            uv = vec2(-dir.x, dir.y) / ma * 0.5 + 0.5;
            return texture2D(faceTexPZ, uv);
          } else {
            // -Z: camera right=+X, camera up=+Y
            uv = vec2(dir.x, dir.y) / ma * 0.5 + 0.5;
            return texture2D(faceTexNZ, uv);
          }
        }
      }

      void main() {
        float lon = vUv.x * 2.0 * PI - PI;
        float lat = vUv.y * PI - PI * 0.5;
        vec3 dir = vec3(
          cos(lat) * sin(lon),
          sin(lat),
          cos(lat) * cos(lon)
        );
        gl_FragColor = sampleCube(dir);
      }
    `,
  };

  let cancelRequested = false;

  // ============================================
  // 初期化: ボタン・モーダルのイベント登録
  // ============================================
  function initExport360() {
    const btn = document.getElementById('export360Btn');
    const modal = document.getElementById('export360Modal');
    const startBtn = document.getElementById('e360StartBtn');
    const cancelBtn = document.getElementById('e360CancelBtn');
    const closeBtn = document.getElementById('e360CloseBtn');

    if (!btn || !modal) return;

    btn.addEventListener('click', () => {
      const dur = window.state.duration || 0;
      const startInput = document.getElementById('e360Start');
      const endInput = document.getElementById('e360End');
      if (startInput) startInput.value = '0';
      if (endInput) endInput.value = dur.toFixed(1);
      // カメラ位置を現在値で初期化
      const cam = window.exportHelpers.getCamera();
      if (cam) {
        const cx = document.getElementById('e360CamX');
        const cy = document.getElementById('e360CamY');
        const cz = document.getElementById('e360CamZ');
        if (cx) cx.value = Math.round(cam.position.x);
        if (cy) cy.value = Math.round(cam.position.y);
        if (cz) cz.value = Math.round(cam.position.z);
      }
      modal.style.display = 'flex';
      const progressEl = document.getElementById('e360Progress');
      if (progressEl) progressEl.style.display = 'none';
      const statusEl = document.getElementById('e360StatusText');
      if (statusEl) statusEl.textContent = '';
      if (startBtn) startBtn.disabled = false;
    });

    closeBtn?.addEventListener('click', () => {
      modal.style.display = 'none';
    });

    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.style.display = 'none';
    });

    startBtn?.addEventListener('click', () => {
      const resolution = parseInt(document.getElementById('e360Resolution').value);
      const fps = parseInt(document.getElementById('e360Fps').value);
      const cubeSize = parseInt(document.getElementById('e360CubeSize').value);
      const camX = parseFloat(document.getElementById('e360CamX').value) || 0;
      const camY = parseFloat(document.getElementById('e360CamY').value) || 0;
      const camZ = parseFloat(document.getElementById('e360CamZ').value) || 0;
      const startTime = parseFloat(document.getElementById('e360Start').value) || 0;
      const endTime = parseFloat(document.getElementById('e360End').value) || window.state.duration;

      startBtn.disabled = true;
      cancelRequested = false;

      startExport360({
        width: resolution,
        height: Math.floor(resolution / 2),
        fps,
        cubeSize,
        cameraPos: new THREE.Vector3(camX, camY, camZ),
        startTime,
        endTime,
      });
    });

    cancelBtn?.addEventListener('click', () => {
      cancelRequested = true;
    });
  }

  // ============================================
  // 動画テクスチャのシーク＆待機
  // ============================================
  function seekVideoTextures(time) {
    const videos = [];
    const scene = window.exportHelpers.getScene();
    scene.traverse((obj) => {
      if (obj.material) {
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        mats.forEach(mat => {
          if (mat.map && mat.map.image instanceof HTMLVideoElement) {
            videos.push(mat.map.image);
          }
          if (mat.uniforms) {
            Object.values(mat.uniforms).forEach(u => {
              if (u.value && u.value.image instanceof HTMLVideoElement) {
                videos.push(u.value.image);
              }
            });
          }
        });
      }
    });

    if (videos.length === 0) return Promise.resolve();

    const unique = [...new Set(videos)];
    return Promise.all(unique.map(video => {
      return new Promise((resolve) => {
        video.currentTime = time;
        const onSeeked = () => {
          video.removeEventListener('seeked', onSeeked);
          resolve();
        };
        video.addEventListener('seeked', onSeeked);
        setTimeout(resolve, 500);
      });
    }));
  }

  // ============================================
  // メインエクスポートループ
  // ============================================
  async function startExport360(config) {
    const { width, height, fps, cubeSize, cameraPos, startTime, endTime } = config;
    const helpers = window.exportHelpers;
    const renderer = helpers.getRenderer();
    const scene = helpers.getScene();
    const origCamera = helpers.getCamera();
    const composer = helpers.getComposer();
    const bloomPass = helpers.getBloomPass();

    // UI
    const progressBar = document.getElementById('e360ProgressBar');
    const progressContainer = document.getElementById('e360Progress');
    const statusText = document.getElementById('e360StatusText');
    if (progressContainer) progressContainer.style.display = 'block';

    // 状態保存
    const savedState = {
      isPlaying: window.state.isPlaying,
      currentTime: window.state.currentTime,
      cameraPos: origCamera.position.clone(),
      rendererSize: new THREE.Vector2(),
      pixelRatio: renderer.getPixelRatio(),
      flareEnabled: helpers.getFlareEnabled(),
    };
    renderer.getSize(savedState.rendererSize);

    // エクスポート中フラグON
    window._export360Active = true;
    window.state.isPlaying = false;

    // レンズフレアOFF（360度では画面空間エフェクトが無意味）
    helpers.setFlareEnabled(false);

    // timelinePlane非表示（カメラ近くで巨大な黒い壁になるため）
    const timelinePlane = helpers.getTimelinePlane();
    const timelinePlaneWasVisible = timelinePlane ? timelinePlane.visible : false;
    if (timelinePlane) timelinePlane.visible = false;

    // performance.nowオーバーライド（決定論的時間）
    const origPerfNow = performance.now.bind(performance);

    // RenderPassのカメラ参照（try内で設定、finally内で復元）
    const renderPass = composer ? composer.passes[0] : null;
    const origRenderCamera = renderPass ? renderPass.camera : null;

    try {
      // --- 6面用レンダーターゲット ---
      const faceTargets = [];
      for (let i = 0; i < 6; i++) {
        faceTargets.push(new THREE.WebGLRenderTarget(cubeSize, cubeSize, {
          format: THREE.RGBAFormat,
          minFilter: THREE.LinearFilter,
          magFilter: THREE.LinearFilter,
        }));
      }

      // Equirectangular出力用
      const equirectTarget = new THREE.WebGLRenderTarget(width, height, {
        format: THREE.RGBAFormat,
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
      });

      // Equirectangularシェーダーマテリアル（6個のテクスチャを参照）
      const equirectMaterial = new THREE.ShaderMaterial({
        uniforms: {
          faceTexPX: { value: faceTargets[0].texture },
          faceTexNX: { value: faceTargets[1].texture },
          faceTexPY: { value: faceTargets[2].texture },
          faceTexNY: { value: faceTargets[3].texture },
          faceTexPZ: { value: faceTargets[4].texture },
          faceTexNZ: { value: faceTargets[5].texture },
        },
        vertexShader: equirectShader.vertexShader,
        fragmentShader: equirectShader.fragmentShader,
      });

      const equirectScene = new THREE.Scene();
      const equirectCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
      const equirectQuad = new THREE.Mesh(
        new THREE.PlaneGeometry(2, 2),
        equirectMaterial
      );
      equirectScene.add(equirectQuad);

      // 360度カメラ（90° FOV, アスペクト比1:1）
      const cam360 = new THREE.PerspectiveCamera(90, 1, 0.1, 10000);

      // --- 出力Canvas & MediaRecorder ---
      const outputCanvas = document.createElement('canvas');
      outputCanvas.width = width;
      outputCanvas.height = height;
      const ctx2d = outputCanvas.getContext('2d');

      // 音源をミュート（エクスポート中は再生しない）
      const audioEl = helpers.getAudioElement();
      if (audioEl) {
        audioEl.pause();
      }

      // 映像のみのMediaStream
      const videoStream = outputCanvas.captureStream(0);
      const videoTrack = videoStream.getVideoTracks()[0];

      // MediaRecorder（映像のみ）
      const chunks = [];
      let mimeType = 'video/webm;codecs=vp9';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm;codecs=vp8';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = 'video/webm';
        }
      }
      const recorder = new MediaRecorder(new MediaStream([videoTrack]), {
        mimeType,
        videoBitsPerSecond: 20_000_000,
      });
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      const recorderStopped = new Promise(resolve => {
        recorder.onstop = resolve;
      });

      recorder.start();

      // --- フレームループ ---
      const totalFrames = Math.ceil((endTime - startTime) * fps);
      const frameDuration = 1 / fps;

      // bloom結果コピー用のシーン（ループ外で1回だけ作成）
      const copyScene = new THREE.Scene();
      const copyCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
      const copyMat = new THREE.MeshBasicMaterial();
      const copyQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), copyMat);
      copyScene.add(copyQuad);

      if (statusText) statusText.textContent = '書き出し中...';

      for (let frame = 0; frame < totalFrames; frame++) {
        if (cancelRequested) {
          if (statusText) statusText.textContent = 'キャンセルしました';
          break;
        }

        const currentTime = startTime + frame * frameDuration;
        performance.now = () => currentTime * 1000;

        // シーン状態更新
        window.state.currentTime = currentTime;
        helpers.updateSceneForExport(frameDuration);

        // 動画テクスチャシーク
        await seekVideoTextures(currentTime);

        // 360度カメラを配置
        cam360.position.copy(cameraPos);

        // --- 6面レンダリング ---
        renderer.setPixelRatio(1);
        renderer.setSize(cubeSize, cubeSize, false);

        const useBloom = composer && bloomPass && bloomPass.strength > 0;
        if (useBloom) {
          composer.setSize(cubeSize, cubeSize);
          bloomPass.setSize(cubeSize, cubeSize);
        }

        for (let f = 0; f < 6; f++) {
          const face = CUBE_FACES[f];
          const target = cam360.position.clone().add(face.dir);
          cam360.up.copy(face.up);
          cam360.lookAt(target);
          cam360.updateMatrixWorld(true);

          if (useBloom) {
            renderPass.camera = cam360;
            // composer結果をscreen(canvas)ではなくreadBufferに保持させる
            const origRTS = composer.renderToScreen;
            composer.renderToScreen = false;
            composer.render();
            composer.renderToScreen = origRTS;
            // readBufferの内容をfaceTargetにコピー
            copyMat.map = composer.readBuffer.texture;
            copyMat.needsUpdate = true;
            renderer.setRenderTarget(faceTargets[f]);
            renderer.render(copyScene, copyCam);
            renderer.setRenderTarget(null);
          } else {
            // bloomなし: 直接faceTargetにレンダリング
            renderer.setRenderTarget(faceTargets[f]);
            renderer.render(scene, cam360);
            renderer.setRenderTarget(null);
          }
        }

        // RenderPassカメラ復元
        if (renderPass) renderPass.camera = origRenderCamera;

        // --- Equirectangular変換 ---
        renderer.setSize(width, height, false);
        // テクスチャ参照を更新（念のため）
        equirectMaterial.uniforms.faceTexPX.value = faceTargets[0].texture;
        equirectMaterial.uniforms.faceTexNX.value = faceTargets[1].texture;
        equirectMaterial.uniforms.faceTexPY.value = faceTargets[2].texture;
        equirectMaterial.uniforms.faceTexNY.value = faceTargets[3].texture;
        equirectMaterial.uniforms.faceTexPZ.value = faceTargets[4].texture;
        equirectMaterial.uniforms.faceTexNZ.value = faceTargets[5].texture;

        renderer.setRenderTarget(equirectTarget);
        renderer.render(equirectScene, equirectCamera);

        // equirectTargetからピクセルを読み取って出力canvasに描画
        const pixels = new Uint8Array(width * height * 4);
        renderer.readRenderTargetPixels(equirectTarget, 0, 0, width, height, pixels);
        renderer.setRenderTarget(null);

        // WebGLのピクセルは左下原点なので上下反転
        const imageData = ctx2d.createImageData(width, height);
        for (let y = 0; y < height; y++) {
          const srcRow = (height - 1 - y) * width * 4;
          const dstRow = y * width * 4;
          imageData.data.set(pixels.subarray(srcRow, srcRow + width * 4), dstRow);
        }
        ctx2d.putImageData(imageData, 0, 0);

        // MediaRecorderにフレーム送信
        if (videoTrack.requestFrame) {
          videoTrack.requestFrame();
        }

        // プログレス更新
        const progress = (frame + 1) / totalFrames;
        if (progressBar) progressBar.style.width = (progress * 100) + '%';
        if (statusText) {
          statusText.textContent = `${frame + 1}/${totalFrames}フレーム (${(progress * 100).toFixed(1)}%)`;
        }

        // UIをブロックしないようにyield
        await new Promise(r => setTimeout(r, 0));
      }

      // recorder停止
      recorder.stop();
      await recorderStopped;

      // Blob → ダウンロード
      const fileName = `360_export_${width}x${height}_${fps}fps.webm`;
      if (!cancelRequested && chunks.length > 0) {
        const blob = new Blob(chunks, { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        if (statusText) {
          statusText.innerHTML = '書き出し完了！（映像のみ）<br>'
            + '<span style="font-size:11px;color:#888;">音声結合: ffmpeg -i ' + fileName
            + ' -i audio.mp3 -c:v copy -c:a opus -shortest output.webm</span>';
        }
      }

      // クリーンアップ
      faceTargets.forEach(t => t.dispose());
      equirectTarget.dispose();
      equirectMaterial.dispose();
      copyMat.dispose();
      copyQuad.geometry.dispose();

    } catch (err) {
      console.error('360 export error:', err);
      if (statusText) statusText.textContent = 'エラー: ' + err.message;
    } finally {
      // performance.now復元
      performance.now = origPerfNow;

      // 状態復元
      renderer.setSize(savedState.rendererSize.x, savedState.rendererSize.y, false);
      renderer.setPixelRatio(savedState.pixelRatio);

      if (composer && bloomPass) {
        composer.setSize(savedState.rendererSize.x, savedState.rendererSize.y);
        bloomPass.setSize(savedState.rendererSize.x, savedState.rendererSize.y);
      }

      if (renderPass) renderPass.camera = origRenderCamera;

      window.state.currentTime = savedState.currentTime;
      window.state.isPlaying = savedState.isPlaying;
      helpers.setFlareEnabled(savedState.flareEnabled);
      if (timelinePlane) timelinePlane.visible = timelinePlaneWasVisible;
      origCamera.position.copy(savedState.cameraPos);

      window._export360Active = false;

      const startBtn = document.getElementById('e360StartBtn');
      if (startBtn) startBtn.disabled = false;
    }
  }

  // main.jsはtype="module"（deferred）のため、exportHelpersが準備できるまでポーリング
  function waitAndInit() {
    if (window.exportHelpers) {
      initExport360();
    } else {
      setTimeout(waitAndInit, 100);
    }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', waitAndInit);
  } else {
    waitAndInit();
  }
})();
