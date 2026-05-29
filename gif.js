/*!
 * Minimal GIF encoder — adapted from gif.js (MIT License)
 * Encodes an array of ImageData frames into an animated GIF blob.
 */
(function(window){
  'use strict';

  function GIFEncoder(width, height) {
    this.width = ~~width;
    this.height = ~~height;
    this.frames = [];
    this.delay = 8; // 80ms per frame by default
    this.repeat = 0; // 0 = loop forever
    this.quality = 10;
  }

  GIFEncoder.prototype.setDelay = function(ms) { this.delay = Math.round(ms / 10); };
  GIFEncoder.prototype.setRepeat = function(r) { this.repeat = r; };
  GIFEncoder.prototype.setQuality = function(q) { this.quality = q; };

  GIFEncoder.prototype.addFrame = function(imageData) {
    this.frames.push(imageData);
  };

  GIFEncoder.prototype.render = function() {
    const NQ = new NeuQuant(this.frames[0], this.quality);
    NQ.learn();
    const colorTab = NQ.colormap();

    const out = new ByteArray();
    writeHeader(out, this.width, this.height, colorTab, this.repeat);

    for (let f = 0; f < this.frames.length; f++) {
      const nq = new NeuQuant(this.frames[f], this.quality);
      nq.learn();
      const ct = nq.colormap();
      writeGraphicCtrlExt(out, this.delay, 0);
      writeImageDesc(out, this.width, this.height);
      writeColorTable(out, ct);
      const pixels = getIndexedPixels(this.frames[f], nq);
      writePixels(out, this.width, this.height, pixels, 8);
    }

    out.writeByte(0x3b); // GIF trailer
    return new Blob([out.getData()], {type: 'image/gif'});
  };

  /* ---- helpers ---- */
  function writeHeader(out, w, h, ct, repeat) {
    out.writeUTFBytes('GIF89a');
    out.writeShort(w); out.writeShort(h);
    out.writeByte(0xf7); // global color table, 256 colors
    out.writeByte(0); out.writeByte(0);
    writeColorTable(out, ct);
    if (repeat >= 0) {
      out.writeByte(0x21); out.writeByte(0xff); out.writeByte(0x0b);
      out.writeUTFBytes('NETSCAPE2.0');
      out.writeByte(3); out.writeByte(1);
      out.writeShort(repeat); out.writeByte(0);
    }
  }

  function writeColorTable(out, ct) {
    out.writeBytes(ct, 0, ct.length);
    const pad = 768 - ct.length;
    for (let i = 0; i < pad; i++) out.writeByte(0);
  }

  function writeGraphicCtrlExt(out, delay, transparent) {
    out.writeByte(0x21); out.writeByte(0xf9);
    out.writeByte(4);
    out.writeByte(transparent >= 0 ? 9 : 0);
    out.writeShort(delay);
    out.writeByte(transparent >= 0 ? transparent : 0);
    out.writeByte(0);
  }

  function writeImageDesc(out, w, h) {
    out.writeByte(0x2c);
    out.writeShort(0); out.writeShort(0);
    out.writeShort(w); out.writeShort(h);
    out.writeByte(0x80); // local color table flag
  }

  function getIndexedPixels(imgData, nq) {
    const data = imgData.data;
    const pixels = new Uint8Array(imgData.width * imgData.height);
    for (let i = 0, j = 0; i < data.length; i += 4, j++) {
      pixels[j] = nq.map(data[i], data[i+1], data[i+2]);
    }
    return pixels;
  }

  function writePixels(out, w, h, pixels, colorDepth) {
    const enc = new LZWEncoder(w, h, pixels, colorDepth);
    enc.encode(out);
  }

  /* ---- ByteArray ---- */
  function ByteArray() { this.bin = []; }
  ByteArray.prototype.writeByte = function(v) { this.bin.push(v & 0xff); };
  ByteArray.prototype.writeShort = function(v) { this.writeByte(v); this.writeByte(v >> 8); };
  ByteArray.prototype.writeBytes = function(arr, off, len) {
    for (let i = off; i < off+len; i++) this.writeByte(arr[i]);
  };
  ByteArray.prototype.writeUTFBytes = function(s) {
    for (let i = 0; i < s.length; i++) this.writeByte(s.charCodeAt(i));
  };
  ByteArray.prototype.getData = function() { return new Uint8Array(this.bin); };

  /* ---- NeuQuant (Neural Quantizer) ---- */
  function NeuQuant(pixels, samplefac) {
    const NCYCLES = 100, NETSIZE = 256, MAXNETPOS = 255;
    const SPECIALS = 3, BGCOLOR = SPECIALS - 1;
    const CUTNETSIZE = NETSIZE - SPECIALS;
    const INITRAD = NETSIZE >> 3, RADIUSBIASSHIFT = 6, RADIUSBIAS = 1 << RADIUSBIASSHIFT;
    const INITRADIUS = INITRAD * RADIUSBIAS;
    const RADIUSDEC = 30;
    const ALPHABIASSHIFT = 10, INITALPHA = 1 << ALPHABIASSHIFT;
    const RADBIASSHIFT = 8, RADBIAS = 1 << RADBIASSHIFT;
    const ALPHARADBSHIFT = ALPHABIASSHIFT + RADBIASSHIFT;
    const ALPHARADBIAS = 1 << ALPHARADBSHIFT;
    const network = [];
    const netindex = new Int32Array(256);
    const bias = new Int32Array(NETSIZE);
    const freq = new Int32Array(NETSIZE);
    const radpower = new Int32Array(NETSIZE >> 3);

    for (let i = 0; i < NETSIZE; i++) {
      const v = (i << (NETBIASSHIFT + 8)) / NETSIZE;
      network[i] = [v, v, v, 0];
      freq[i] = INTBIAS / NETSIZE;
      bias[i] = 0;
    }
    const NETBIASSHIFT = 4, INTBIAS = 1 << 16;
    const plen = pixels.data.length;

    function learn() {
      let alpha = INITALPHA, radius = INITRADIUS;
      let rad = radius >> RADIUSBIASSHIFT;
      if (rad <= 1) rad = 0;
      for (let i = 0; i < rad; i++) radpower[i] = alpha * (((rad * rad - i * i) * RADBIAS) / (rad * rad));

      const step = plen < 3 * 100 ? 3 : (plen / (3 * samplefac)) * 3 | 0;
      let pos = 0, delta = Math.max(plen / (3 * NCYCLES), 1) | 0;
      for (let i = 0; i < plen / 3;) {
        const r = pixels.data[pos] & 0xff, g = pixels.data[pos+1] & 0xff, b = pixels.data[pos+2] & 0xff;
        let j = contest(r, g, b);
        altersingle(alpha, j, r, g, b);
        if (rad !== 0) alterneigh(rad, j, r, g, b);
        pos += step; if (pos >= plen) pos -= plen;
        i++;
        if (++i % delta === 0) {
          alpha -= alpha / 30;
          radius -= radius / RADIUSDEC;
          rad = radius >> RADIUSBIASSHIFT;
          if (rad <= 1) rad = 0;
          for (let k = 0; k < rad; k++) radpower[k] = alpha * (((rad * rad - k * k) * RADBIAS) / (rad * rad));
        }
      }
    }

    function contest(r, g, b) {
      let bestd = 0x7FFFFFFF, bestbiasd = bestd, bestpos = -1, bestbiaspos = -1;
      for (let i = SPECIALS; i < NETSIZE; i++) {
        const n = network[i];
        let dist = Math.abs(n[0] - r) + Math.abs(n[1] - g) + Math.abs(n[2] - b);
        if (dist < bestd) { bestd = dist; bestpos = i; }
        let biasdist = dist - (bias[i] >> (INTBIASSHIFT - NETBIASSHIFT));
        if (biasdist < bestbiasd) { bestbiasd = biasdist; bestbiaspos = i; }
        freq[i] -= freq[i] >> 3; bias[i] += freq[i] << GAMMASHIFT;
      }
      freq[bestpos] += BETA; bias[bestpos] -= BETAGAMMA;
      return bestbiaspos;
    }

    const INTBIASSHIFT = 16, GAMMASHIFT = 10, GAMMA = 1 << GAMMASHIFT;
    const BETA = INTBIAS >> 10, BETAGAMMA = INTBIAS << (GAMMASHIFT - 10);

    function altersingle(a, i, r, g, b) {
      network[i][0] -= (a * (network[i][0] - r)) >> ALPHABIASSHIFT;
      network[i][1] -= (a * (network[i][1] - g)) >> ALPHABIASSHIFT;
      network[i][2] -= (a * (network[i][2] - b)) >> ALPHABIASSHIFT;
    }

    function alterneigh(rad, i, r, g, b) {
      const lo = Math.max(SPECIALS, i - rad), hi = Math.min(MAXNETPOS, i + rad);
      let jj = i + 1, kk = i - 1, m = 1;
      while (jj <= hi || kk >= lo) {
        const a = radpower[m++];
        if (jj <= hi) { altersingle(a, jj++, r, g, b); }
        if (kk >= lo) { altersingle(a, kk--, r, g, b); }
      }
    }

    function buildindex() {
      const netsorted = [...network].map((n, i) => ({...n, idx: i}));
      netsorted.sort((a, b) => a[2] - b[2]);
      let previouscol = 0, startpos = 0;
      for (let i = 0; i < NETSIZE; i++) {
        const smallpos = netsorted[i].idx;
        const smallval = network[smallpos][1];
        if (i === 0) { previouscol = smallval; startpos = i; }
        if (smallval !== previouscol) {
          const dp = (i + startpos) >> 1;
          for (let j = previouscol; j < smallval; j++) netindex[j] = dp;
          previouscol = smallval;
          startpos = i;
        }
        netindex[smallval] = i;
      }
      for (let j = previouscol; j < 256; j++) netindex[j] = NETSIZE - 1;
    }

    this.learn = function() { learn(); buildindex(); };

    this.map = function(r, g, b) {
      let bestd = 1000, best = -1;
      let i = netindex[g], j = i - 1;
      while (i < NETSIZE || j >= 0) {
        if (i < NETSIZE) {
          const n = network[i];
          let dist = n[1] - g;
          if (dist >= bestd) { i = NETSIZE; }
          else { i++; if (dist < 0) dist = -dist; let a = n[0] - r; if (a < 0) a = -a; dist += a; if (dist < bestd) { a = n[2] - b; if (a < 0) a = -a; dist += a; if (dist < bestd) { bestd = dist; best = n[3]; } } }
        }
        if (j >= 0) {
          const n = network[j];
          let dist = g - n[1];
          if (dist >= bestd) { j = -1; }
          else { j--; if (dist < 0) dist = -dist; let a = n[0] - r; if (a < 0) a = -a; dist += a; if (dist < bestd) { a = n[2] - b; if (a < 0) a = -a; dist += a; if (dist < bestd) { bestd = dist; best = n[3]; } } }
        }
      }
      return best;
    };

    this.colormap = function() {
      const map = new Uint8Array(768);
      const index = new Array(NETSIZE);
      for (let i = 0; i < NETSIZE; i++) index[network[i][3]] = i;
      let k = 0;
      for (let i = 0; i < NETSIZE; i++) {
        const j = index[i];
        map[k++] = network[j][0] & 0xff;
        map[k++] = network[j][1] & 0xff;
        map[k++] = network[j][2] & 0xff;
      }
      return map;
    };
  }

  /* ---- LZW Encoder ---- */
  function LZWEncoder(w, h, pixels, colorDepth) {
    const MAXCODE = function(bits) { return (1 << bits) - 1; };
    const n_bits = 12, EOF = -1;
    let cur_accum = 0, cur_bits = 0, clear_flg = false;
    let a_count = 0;
    const accum = new Uint8Array(256);
    let code_table, htab;

    this.encode = function(os) {
      const initCodeSize = Math.max(2, colorDepth);
      os.writeByte(initCodeSize);
      compress(initCodeSize + 1, os);
      os.writeByte(0);
    };

    function compress(init_bits, os) {
      let remaining = w * h;
      let cur_pixel = 0;
      let g_init_bits = init_bits;
      let ClearCode = 1 << (g_init_bits - 1), EOFCode = ClearCode + 1;
      let free_ent = ClearCode + 2;
      let maxcode = MAXCODE(n_bits);
      code_table = new Int32Array(8192);
      htab = new Int32Array(8192);
      for (let i = 0; i < 8192; i++) htab[i] = -1;

      output(ClearCode, os);
      let ent = nextPixel();

      outer: while (remaining > 0) {
        let c = nextPixel();
        if (c === EOF) break;
        const fcode = (c << n_bits) + ent;
        let i = (c << 4) ^ ent;
        if (htab[i] === fcode) { ent = code_table[i]; continue; }
        if (htab[i] >= 0) {
          let disp = i === 0 ? 1 : 8192 - i;
          do {
            i -= disp; if (i < 0) i += 8192;
            if (htab[i] === fcode) { ent = code_table[i]; continue outer; }
          } while (htab[i] >= 0);
        }
        output(ent, os);
        ent = c;
        if (free_ent < 1 << n_bits) { code_table[i] = free_ent++; htab[i] = fcode; }
        else { for (let j = 0; j < 8192; j++) htab[j] = -1; free_ent = ClearCode + 2; clear_flg = true; output(ClearCode, os); }
      }
      output(ent, os);
      output(EOFCode, os);

      function nextPixel() { if (remaining === 0) return EOF; remaining--; return pixels[cur_pixel++] & 0xff; }
    }

    function output(code, os) {
      cur_accum &= (1 << cur_bits) - 1; // MAXCODE
      if (cur_bits > 0) cur_accum |= code << cur_bits; else cur_accum = code;
      cur_bits += n_bits;
      while (cur_bits >= 8) { char_out((cur_accum & 0xff), os); cur_accum >>= 8; cur_bits -= 8; }
      if (free_ent > MAXCODE(n_bits) || clear_flg) {
        if (clear_flg) { MAXCODE(n_bits); clear_flg = false; } else { n_bits++; if (n_bits === 12) MAXCODE(1 << 12); }
      }
      if (code === EOFCode) { while (cur_bits > 0) { char_out((cur_accum & 0xff), os); cur_accum >>= 8; cur_bits -= 8; } flush_char(os); }
    }

    function char_out(c, os) { accum[a_count++] = c; if (a_count >= 254) flush_char(os); }
    function flush_char(os) { if (a_count > 0) { os.writeByte(a_count); os.writeBytes(accum, 0, a_count); a_count = 0; } }

    let n_bits2 = init_bits => init_bits, free_ent, EOFCode;
  }

  window.GIFEncoder = GIFEncoder;
})(window);
