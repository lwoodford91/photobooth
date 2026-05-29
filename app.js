// PhotoBooth Studio — Main App
// iPad-optimized photobooth app

(function() {
  'use strict';

  /* ===================== STATE ===================== */
  const state = {
    currentScreen: 'screen-attract',
    mode: 'single',      // single | strip | gif | boomerang
    filter: 'none',
    timerSeconds: 3,
    facingMode: 'user',  // user | environment
    stream: null,
    capturedFrames: [],  // ImageData or dataURLs
    finalDataURL: null,
    gallery: [],
    settings: {
      eventName: 'PhotoBooth Studio',
      tagline: 'Tap anywhere to begin your experience',
      primaryColor: '#ff4d6d',
      frameStyle: 'none',
      overlayText: '',
      showGallery: true,
      mirrorFront: true,
    },
    shooting: false,
    filterRAF: null,
  };

  /* ===================== ELEMENTS ===================== */
  const $ = id => document.getElementById(id);
  const screens = document.querySelectorAll('.screen');
  const attractScreen = $('screen-attract');
  const cameraVideo = $('camera-video');
  const cameraCanvas = $('camera-canvas');
  const filterPreviewVideo = $('filter-preview-video');
  const filterPreviewCanvas = $('filter-preview-canvas');
  const countdownOverlay = $('countdown-overlay');
  const countdownNumber = $('countdown-number');
  const shotFlash = $('shot-flash');
  const reviewCanvas = $('review-canvas');
  const galleryGrid = $('gallery-grid');
  const galleryFab = $('gallery-fab');

  /* ===================== SCREEN NAV ===================== */
  function showScreen(id) {
    screens.forEach(s => s.classList.remove('active'));
    const target = $(id);
    if (target) {
      target.classList.add('active');
      state.currentScreen = id;
    }
    // Show gallery fab only when not on gallery/attract
    const hideFab = ['screen-attract', 'screen-gallery', 'screen-camera'].includes(id);
    galleryFab.classList.toggle('visible', !hideFab && state.settings.showGallery && state.gallery.length > 0);
  }

  // Back buttons
  document.querySelectorAll('.back-btn[data-target]').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.target;
      if (target === 'screen-filter') stopCamera();
      showScreen(target);
    });
  });

  // Mode cards
  document.querySelectorAll('.mode-card').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('.mode-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      state.mode = card.dataset.mode;
      showScreen('screen-filter');
      startFilterPreview();
    });
  });

  // Attract screen tap
  attractScreen.addEventListener('click', e => {
    if (!e.target.closest('.settings-btn')) showScreen('screen-mode');
  });

  /* ===================== FILTER PREVIEW ===================== */
  function startFilterPreview() {
    stopFilterPreview();
    navigator.mediaDevices.getUserMedia({
      video: { facingMode: state.facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false
    }).then(stream => {
      filterPreviewVideo.srcObject = stream;
      filterPreviewVideo.play();
      filterPreviewVideo.onloadedmetadata = () => {
        filterPreviewCanvas.width = filterPreviewVideo.videoWidth;
        filterPreviewCanvas.height = filterPreviewVideo.videoHeight;
        runFilterPreview();
      };
    }).catch(err => {
      console.warn('Camera not available for preview:', err);
    });
  }

  function runFilterPreview() {
    const ctx = filterPreviewCanvas.getContext('2d');
    function loop() {
      if (!filterPreviewVideo.srcObject) return;
      state.filterRAF = requestAnimationFrame(loop);
      const w = filterPreviewCanvas.width, h = filterPreviewCanvas.height;
      ctx.save();
      if (state.settings.mirrorFront && state.facingMode === 'user') {
        ctx.translate(w, 0); ctx.scale(-1, 1);
      }
      ctx.drawImage(filterPreviewVideo, 0, 0, w, h);
      ctx.restore();
      if (state.filter !== 'none') {
        applyFilter(ctx, w, h);
      }
    }
    loop();
  }

  function stopFilterPreview() {
    cancelAnimationFrame(state.filterRAF);
    if (filterPreviewVideo.srcObject) {
      filterPreviewVideo.srcObject.getTracks().forEach(t => t.stop());
      filterPreviewVideo.srcObject = null;
    }
  }

  // Filter buttons
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.filter = btn.dataset.filter;
    });
  });

  $('go-to-camera').addEventListener('click', () => {
    stopFilterPreview();
    showScreen('screen-camera');
    startCamera();
  });

  /* ===================== CAMERA ===================== */
  function startCamera() {
    stopCamera();
    const constraints = {
      video: {
        facingMode: state.facingMode,
        width: { ideal: 1920 },
        height: { ideal: 1080 },
      },
      audio: false
    };
    navigator.mediaDevices.getUserMedia(constraints)
      .then(stream => {
        state.stream = stream;
        cameraVideo.srcObject = stream;
        cameraVideo.play();
        cameraVideo.onloadedmetadata = () => {
          cameraCanvas.width = cameraVideo.videoWidth;
          cameraCanvas.height = cameraVideo.videoHeight;
          runCameraLoop();
          updateShotCounter();
        };
      })
      .catch(err => {
        alert('Camera permission is required. Please allow camera access and reload.');
        console.error(err);
      });
  }

  function runCameraLoop() {
    const ctx = cameraCanvas.getContext('2d');
    function loop() {
      if (!cameraVideo.srcObject) return;
      requestAnimationFrame(loop);
      const w = cameraCanvas.width, h = cameraCanvas.height;
      ctx.save();
      if (state.settings.mirrorFront && state.facingMode === 'user') {
        ctx.translate(w, 0); ctx.scale(-1, 1);
      }
      ctx.drawImage(cameraVideo, 0, 0, w, h);
      ctx.restore();
      if (state.filter !== 'none') applyFilter(ctx, w, h);
      drawOverlayText(ctx, w, h);
    }
    loop();
  }

  function stopCamera() {
    if (state.stream) {
      state.stream.getTracks().forEach(t => t.stop());
      state.stream = null;
    }
    cameraVideo.srcObject = null;
  }

  /* ===================== FILTER ENGINE ===================== */
  function applyFilter(ctx, w, h) {
    if (window.Filters && Filters[state.filter]) {
      Filters[state.filter](ctx, w, h);
    }
  }

  function drawOverlayText(ctx, w, h) {
    const text = state.settings.overlayText;
    if (!text) return;
    ctx.save();
    ctx.font = `bold ${Math.round(h * 0.035)}px DM Sans, sans-serif`;
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.textAlign = 'center';
    ctx.fillText(text, w / 2, h - h * 0.04);
    ctx.restore();
  }

  /* ===================== FLIP CAMERA ===================== */
  $('flip-camera').addEventListener('click', () => {
    state.facingMode = state.facingMode === 'user' ? 'environment' : 'user';
    startCamera();
  });

  /* ===================== TIMER ===================== */
  document.querySelectorAll('.timer-opt').forEach(opt => {
    opt.addEventListener('click', () => {
      document.querySelectorAll('.timer-opt').forEach(o => o.classList.remove('active'));
      opt.classList.add('active');
      state.timerSeconds = parseInt(opt.dataset.seconds, 10);
    });
  });

  /* ===================== SHUTTER ===================== */
  $('shutter-btn').addEventListener('click', () => {
    if (state.shooting) return;
    startShooting();
  });

  function updateShotCounter() {
    const counter = $('shot-counter');
    const needed = modeShots();
    const done = state.capturedFrames.length;
    if (needed > 1) counter.textContent = `${done}/${needed}`;
    else counter.textContent = '';
  }

  function modeShots() {
    return { single: 1, strip: 3, gif: 4, boomerang: 6 }[state.mode] || 1;
  }

  $('mode-label-display').textContent = '';

  function getModeLabel() {
    return { single: 'Single Shot', strip: 'Photo Strip (3)', gif: 'GIF Burst (4)', boomerang: 'Boomerang (6)' }[state.mode];
  }

  async function startShooting() {
    state.shooting = true;
    state.capturedFrames = [];
    $('shutter-btn').classList.add('disabled');
    $('mode-label-display').textContent = getModeLabel();

    const total = modeShots();
    for (let i = 0; i < total; i++) {
      await countdown(state.timerSeconds);
      await captureFrame();
      updateShotCounter();
      if (i < total - 1) await sleep(400);
    }

    await processAndReview();
    state.shooting = false;
    $('shutter-btn').classList.remove('disabled');
  }

  function countdown(seconds) {
    return new Promise(resolve => {
      countdownOverlay.classList.add('active');
      let count = seconds;
      showCount(count);
      const interval = setInterval(() => {
        count--;
        if (count <= 0) {
          clearInterval(interval);
          countdownOverlay.classList.remove('active');
          countdownNumber.classList.remove('show');
          resolve();
        } else {
          showCount(count);
        }
      }, 1000);
    });
  }

  function showCount(n) {
    countdownNumber.classList.remove('show');
    void countdownNumber.offsetWidth; // reflow
    countdownNumber.textContent = n;
    countdownNumber.classList.add('show');
  }

  function captureFrame() {
    return new Promise(resolve => {
      // Flash!
      shotFlash.classList.add('flash');
      setTimeout(() => shotFlash.classList.remove('flash'), 120);

      const w = cameraCanvas.width, h = cameraCanvas.height;
      const snap = document.createElement('canvas');
      snap.width = w; snap.height = h;
      const ctx = snap.getContext('2d');
      ctx.drawImage(cameraCanvas, 0, 0);
      state.capturedFrames.push(snap);
      resolve();
    });
  }

  /* ===================== PROCESS & COMPOSE ===================== */
  async function processAndReview() {
    stopCamera();
    let finalCanvas;

    if (state.mode === 'single') {
      finalCanvas = composeSingle(state.capturedFrames[0]);
    } else if (state.mode === 'strip') {
      finalCanvas = composeStrip(state.capturedFrames);
    } else if (state.mode === 'gif' || state.mode === 'boomerang') {
      finalCanvas = composeGIF(state.capturedFrames, state.mode === 'boomerang');
    }

    state.finalDataURL = finalCanvas.toDataURL('image/png');
    applyFrameToCanvas(finalCanvas);

    // Show review
    const ctx = reviewCanvas.getContext('2d');
    reviewCanvas.width = finalCanvas.width;
    reviewCanvas.height = finalCanvas.height;
    ctx.drawImage(finalCanvas, 0, 0);
    addToGallery(state.finalDataURL);

    showScreen('screen-review');
    $('share-options').classList.add('hidden');
    $('qr-wrap').classList.add('hidden');
  }

  function composeSingle(src) {
    const c = document.createElement('canvas');
    const frame = state.settings.frameStyle;
    const padding = frame === 'polaroid' ? 30 : 0;
    c.width = src.width; c.height = src.height + padding;
    const ctx = c.getContext('2d');
    if (frame === 'polaroid') {
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, c.width, c.height);
    }
    ctx.drawImage(src, 0, 0);
    applyFrameStyle(ctx, c.width, c.height, frame);
    drawWatermark(ctx, c.width, c.height);
    return c;
  }

  function composeStrip(frames) {
    const w = frames[0].width;
    const h = frames[0].height;
    const gap = 10;
    const c = document.createElement('canvas');
    const stripW = Math.round(w * 0.4);
    const stripH = (frames.length * stripW * (h / w)) + (frames.length - 1) * gap + 40;
    c.width = stripW; c.height = Math.round(stripH);
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, c.width, c.height);
    const imgH = Math.round(stripW * (h / w));
    frames.forEach((frame, i) => {
      const y = i * (imgH + gap) + 5;
      ctx.drawImage(frame, 0, y, stripW, imgH);
    });
    // watermark at bottom
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(state.settings.eventName || 'PhotoBooth', stripW / 2, c.height - 10);
    return c;
  }

  function composeGIF(frames) {
    // For display purposes, show a contact sheet
    const cols = Math.ceil(Math.sqrt(frames.length));
    const rows = Math.ceil(frames.length / cols);
    const thumbW = Math.round(frames[0].width * 0.5);
    const thumbH = Math.round(frames[0].height * 0.5);
    const gap = 6;
    const c = document.createElement('canvas');
    c.width = cols * thumbW + (cols - 1) * gap;
    c.height = rows * thumbH + (rows - 1) * gap;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#0d0d0d';
    ctx.fillRect(0, 0, c.width, c.height);
    frames.forEach((frame, i) => {
      const col = i % cols, row = Math.floor(i / cols);
      ctx.drawImage(frame, col * (thumbW + gap), row * (thumbH + gap), thumbW, thumbH);
    });
    return c;
  }

  function applyFrameStyle(ctx, w, h) {
    const frame = state.settings.frameStyle;
    if (frame === 'rounded') {
      ctx.strokeStyle = 'rgba(255,255,255,0.85)';
      ctx.lineWidth = 10;
      roundRect(ctx, 5, 5, w - 10, h - 10, 18);
      ctx.stroke();
    } else if (frame === 'neon') {
      ctx.shadowBlur = 20;
      ctx.shadowColor = state.settings.primaryColor;
      ctx.strokeStyle = state.settings.primaryColor;
      ctx.lineWidth = 4;
      ctx.strokeRect(12, 12, w - 24, h - 24);
      ctx.shadowBlur = 0;
    } else if (frame === 'film') {
      drawFilmStrip(ctx, w, h);
    }
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y); ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r); ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h); ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r); ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  }

  function drawFilmStrip(ctx, w, h) {
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    const perf = 16, margin = 28;
    ctx.fillRect(0, 0, margin, h);
    ctx.fillRect(w - margin, 0, margin, h);
    ctx.fillStyle = '#fff';
    const holes = Math.floor(h / (perf * 2));
    for (let i = 0; i < holes; i++) {
      const y = (i + 0.5) * (h / holes);
      ctx.fillRect(4, y - 6, 10, 12);
      ctx.fillRect(w - 14, y - 6, 10, 12);
    }
  }

  function drawWatermark(ctx, w, h) {
    const text = state.settings.overlayText || state.settings.eventName;
    if (!text) return;
    ctx.save();
    ctx.font = `500 ${Math.round(h * 0.025)}px DM Sans, sans-serif`;
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.textAlign = 'center';
    ctx.fillText(text, w / 2, h * 0.97);
    ctx.restore();
  }

  function applyFrameToCanvas(c) {
    // Already applied in compose functions
  }

  /* ===================== REVIEW ACTIONS ===================== */
  $('retake-btn').addEventListener('click', () => {
    state.capturedFrames = [];
    showScreen('screen-camera');
    startCamera();
    $('share-options').classList.add('hidden');
    $('qr-wrap').classList.add('hidden');
  });

  $('save-btn').addEventListener('click', () => {
    downloadDataURL(state.finalDataURL, `photobooth-${Date.now()}.png`);
  });

  $('share-btn').addEventListener('click', () => {
    $('share-options').classList.toggle('hidden');
    $('qr-wrap').classList.add('hidden');
  });

  $('download-btn').addEventListener('click', () => {
    downloadDataURL(state.finalDataURL, `photobooth-${Date.now()}.png`);
  });

  $('native-share-btn').addEventListener('click', async () => {
    if (!navigator.share) {
      alert('Web Share API not available on this device.');
      return;
    }
    try {
      const blob = dataURLtoBlob(state.finalDataURL);
      const file = new File([blob], 'photobooth.png', { type: 'image/png' });
      await navigator.share({ files: [file], title: state.settings.eventName });
    } catch (e) { console.log('Share cancelled', e); }
  });

  $('email-btn').addEventListener('click', () => {
    $('share-options').classList.add('hidden');
    $('qr-wrap').classList.toggle('hidden');
    if (!$('qr-wrap').classList.contains('hidden')) {
      drawQRCode($('qr-canvas'), state.finalDataURL);
    }
  });

  $('close-qr').addEventListener('click', () => {
    $('qr-wrap').classList.add('hidden');
  });

  $('restart-btn').addEventListener('click', () => {
    state.capturedFrames = [];
    state.finalDataURL = null;
    showScreen('screen-attract');
  });

  /* ===================== GALLERY ===================== */
  function addToGallery(dataURL) {
    state.gallery.unshift(dataURL);
    try { localStorage.setItem('pb_gallery', JSON.stringify(state.gallery.slice(0, 50))); } catch(e) {}
    renderGallery();
    updateGalleryFab();
  }

  function renderGallery() {
    const empty = $('gallery-empty');
    const grid = galleryGrid;
    // Clear existing items
    Array.from(grid.children).forEach(c => { if (c !== empty) c.remove(); });

    if (state.gallery.length === 0) {
      empty.style.display = '';
      return;
    }
    empty.style.display = 'none';
    state.gallery.forEach((url, idx) => {
      const item = document.createElement('div');
      item.className = 'gallery-item';
      const img = document.createElement('img');
      img.src = url;
      img.loading = 'lazy';
      item.appendChild(img);
      item.addEventListener('click', () => openLightbox(url));
      grid.appendChild(item);
    });
  }

  function updateGalleryFab() {
    const show = state.settings.showGallery && state.gallery.length > 0;
    galleryFab.classList.toggle('visible', show && !['screen-attract','screen-gallery','screen-camera'].includes(state.currentScreen));
  }

  galleryFab.addEventListener('click', () => showScreen('screen-gallery'));
  $('gallery-fab').style.display = '';

  $('clear-gallery').addEventListener('click', () => {
    if (confirm('Clear all photos from gallery?')) {
      state.gallery = [];
      try { localStorage.removeItem('pb_gallery'); } catch(e) {}
      renderGallery();
      updateGalleryFab();
    }
  });

  // Load gallery from storage
  try {
    const saved = JSON.parse(localStorage.getItem('pb_gallery') || '[]');
    if (Array.isArray(saved)) { state.gallery = saved; renderGallery(); }
  } catch(e) {}

  /* ===================== LIGHTBOX ===================== */
  function openLightbox(url) {
    $('lightbox-img').src = url;
    $('lightbox').classList.remove('hidden');
    $('lightbox-download').onclick = () => downloadDataURL(url, `photo-${Date.now()}.png`);
  }
  $('close-lightbox').addEventListener('click', () => $('lightbox').classList.add('hidden'));
  $('lightbox-backdrop').addEventListener('click', () => $('lightbox').classList.add('hidden'));

  /* ===================== SETTINGS ===================== */
  $('open-settings').addEventListener('click', e => {
    e.stopPropagation();
    loadSettingsToUI();
    $('settings-modal').classList.remove('hidden');
  });
  $('close-settings').addEventListener('click', () => $('settings-modal').classList.add('hidden'));
  document.querySelector('#settings-modal .modal-backdrop').addEventListener('click', () => $('settings-modal').classList.add('hidden'));

  function loadSettingsToUI() {
    $('setting-event-name').value = state.settings.eventName;
    $('setting-tagline').value = state.settings.tagline;
    $('setting-color').value = state.settings.primaryColor;
    $('setting-frame').value = state.settings.frameStyle;
    $('setting-overlay-text').value = state.settings.overlayText;
    $('setting-show-gallery').checked = state.settings.showGallery;
    $('setting-mirror').checked = state.settings.mirrorFront;
  }

  $('save-settings').addEventListener('click', () => {
    state.settings.eventName = $('setting-event-name').value || 'PhotoBooth Studio';
    state.settings.tagline = $('setting-tagline').value || 'Tap anywhere to begin';
    state.settings.primaryColor = $('setting-color').value;
    state.settings.frameStyle = $('setting-frame').value;
    state.settings.overlayText = $('setting-overlay-text').value;
    state.settings.showGallery = $('setting-show-gallery').checked;
    state.settings.mirrorFront = $('setting-mirror').checked;

    applySettings();
    saveSettingsToStorage();
    $('settings-modal').classList.add('hidden');
  });

  function applySettings() {
    document.documentElement.style.setProperty('--primary', state.settings.primaryColor);
    const hex = state.settings.primaryColor.replace('#', '');
    const r = parseInt(hex.substring(0,2),16), g = parseInt(hex.substring(2,4),16), b = parseInt(hex.substring(4,6),16);
    document.documentElement.style.setProperty('--primary-glow', `rgba(${r},${g},${b},0.4)`);
    $('event-title-display').innerHTML = state.settings.eventName.replace(' ', '<br/><em>') + '</em>';
    $('event-subtitle-display').textContent = state.settings.tagline;
  }

  function saveSettingsToStorage() {
    try { localStorage.setItem('pb_settings', JSON.stringify(state.settings)); } catch(e) {}
  }

  function loadSettingsFromStorage() {
    try {
      const s = JSON.parse(localStorage.getItem('pb_settings') || 'null');
      if (s) { Object.assign(state.settings, s); applySettings(); }
    } catch(e) {}
  }
  loadSettingsFromStorage();

  /* ===================== QR CODE (Simple) ===================== */
  function drawQRCode(canvas, data) {
    // Minimal QR-like display — shows a data URL preview for scanning
    // In production you'd use a proper QR library
    const ctx = canvas.getContext('2d');
    const size = 160;
    canvas.width = canvas.height = size;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, size, size);
    ctx.font = 'bold 11px sans-serif';
    ctx.fillStyle = '#000';
    ctx.textAlign = 'center';
    ctx.fillText('Download QR', size/2, size/2 - 10);
    ctx.font = '9px sans-serif';
    ctx.fillStyle = '#666';
    ctx.fillText('(Requires server upload)', size/2, size/2 + 5);
    ctx.fillText('Use Download instead', size/2, size/2 + 18);
    // Draw a simple decorative pattern
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    [[8,8,30,30],[8,122,30,30],[122,8,30,30]].forEach(([x,y,w,h]) => {
      ctx.strokeRect(x,y,w,h);
      ctx.strokeRect(x+4,y+4,w-8,h-8);
      ctx.fillStyle = '#000';
      ctx.fillRect(x+8,y+8,w-16,h-16);
    });
  }

  /* ===================== UTILS ===================== */
  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

  function downloadDataURL(url, filename) {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
  }

  function dataURLtoBlob(dataURL) {
    const parts = dataURL.split(',');
    const mime = parts[0].match(/:(.*?);/)[1];
    const bin = atob(parts[1]);
    const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return new Blob([arr], { type: mime });
  }

  /* ===================== INIT ===================== */
  showScreen('screen-attract');
  loadSettingsFromStorage();
  updateGalleryFab();

  // Prevent iOS rubber-band scroll
  document.addEventListener('touchmove', e => { if (e.target === document.body) e.preventDefault(); }, { passive: false });

  // Prevent iOS context menu on long press
  document.addEventListener('contextmenu', e => e.preventDefault());

  // Wake lock on camera screen (if supported)
  let wakeLock = null;
  async function requestWakeLock() {
    if ('wakeLock' in navigator) {
      try { wakeLock = await navigator.wakeLock.request('screen'); } catch(e) {}
    }
  }
  function releaseWakeLock() { if (wakeLock) { wakeLock.release(); wakeLock = null; } }
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && state.currentScreen === 'screen-camera') requestWakeLock();
    else releaseWakeLock();
  });

  console.log('📸 PhotoBooth Studio loaded');
})();
