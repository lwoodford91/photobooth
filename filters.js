// filters.js — Canvas-based filter rendering

const Filters = {
  none(ctx, w, h) {
    // no-op, let video passthrough
  },
  bw(ctx, w, h) {
    const img = ctx.getImageData(0, 0, w, h);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const g = d[i] * 0.299 + d[i+1] * 0.587 + d[i+2] * 0.114;
      d[i] = d[i+1] = d[i+2] = g;
    }
    ctx.putImageData(img, 0, 0);
  },
  sepia(ctx, w, h) {
    const img = ctx.getImageData(0, 0, w, h);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const r = d[i], g = d[i+1], b = d[i+2];
      d[i]   = Math.min(255, r * 0.393 + g * 0.769 + b * 0.189);
      d[i+1] = Math.min(255, r * 0.349 + g * 0.686 + b * 0.168);
      d[i+2] = Math.min(255, r * 0.272 + g * 0.534 + b * 0.131);
    }
    ctx.putImageData(img, 0, 0);
  },
  vivid(ctx, w, h) {
    const img = ctx.getImageData(0, 0, w, h);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      d[i]   = Math.min(255, d[i]   * 1.3);
      d[i+1] = Math.min(255, d[i+1] * 1.15);
      d[i+2] = Math.min(255, d[i+2] * 1.3);
    }
    ctx.putImageData(img, 0, 0);
  },
  glam(ctx, w, h) {
    const img = ctx.getImageData(0, 0, w, h);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const r = d[i], g = d[i+1], b = d[i+2];
      const br = (r + g + b) / 3;
      const soft = 0.6;
      d[i]   = Math.min(255, r * (1 - soft) + br * soft + 15);
      d[i+1] = Math.min(255, g * (1 - soft) + br * soft + 5);
      d[i+2] = Math.min(255, b * (1 - soft) + br * soft + 25);
    }
    ctx.putImageData(img, 0, 0);
    // vignette
    const vignette = ctx.createRadialGradient(w/2, h/2, h*0.3, w/2, h/2, h*0.8);
    vignette.addColorStop(0, 'rgba(0,0,0,0)');
    vignette.addColorStop(1, 'rgba(0,0,0,0.35)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, w, h);
  },
  cool(ctx, w, h) {
    const img = ctx.getImageData(0, 0, w, h);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      d[i]   = Math.max(0, d[i]   - 20);
      d[i+2] = Math.min(255, d[i+2] + 30);
    }
    ctx.putImageData(img, 0, 0);
  },
  warm(ctx, w, h) {
    const img = ctx.getImageData(0, 0, w, h);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      d[i]   = Math.min(255, d[i]   + 30);
      d[i+1] = Math.min(255, d[i+1] + 10);
      d[i+2] = Math.max(0,   d[i+2] - 20);
    }
    ctx.putImageData(img, 0, 0);
  },
  vintage(ctx, w, h) {
    const img = ctx.getImageData(0, 0, w, h);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const r = d[i], g = d[i+1], b = d[i+2];
      d[i]   = Math.min(255, r * 0.9  + g * 0.1  + b * 0.0  + 20);
      d[i+1] = Math.min(255, r * 0.05 + g * 0.85 + b * 0.1  + 10);
      d[i+2] = Math.min(255, r * 0.0  + g * 0.0  + b * 0.8  - 20);
    }
    ctx.putImageData(img, 0, 0);
    // warm vignette overlay
    const vignette = ctx.createRadialGradient(w/2, h/2, h*0.2, w/2, h/2, h*0.9);
    vignette.addColorStop(0, 'rgba(0,0,0,0)');
    vignette.addColorStop(1, 'rgba(80,20,0,0.4)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, w, h);
  }
};

window.Filters = Filters;
