/* Apporatory hero: maths and science symbols drawn in dots, each one flowing
   into the next. Plus, flask, square root, atom, pi, DNA helix, then round
   again. It draws only during a morph, stops whenever the hero is off screen,
   the tab is hidden or the visitor pauses it, and shows one still symbol when
   motion is reduced. */
(function () {
  'use strict';

  var canvas = document.querySelector('canvas.morph');
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext('2d');
  var root = document.documentElement;

  var HOLD = 4000;
  var MORPH = 1500;
  var GATHER = 1900;
  var WAVE = 900;
  var STILL = 1; // the flask stands in for the whole loop when motion is off
  var TAU = Math.PI * 2;

  function bar(c, x, y, w, h, r) {
    c.beginPath();
    if (c.roundRect) c.roundRect(x, y, w, h, r); else c.rect(x, y, w, h);
    c.fill();
  }
  function dot(c, x, y, r) { c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); }

  // Each symbol is drawn into a 240 x 240 box; the sampler turns its ink into dots.
  var SYMBOLS = [
    { name: 'plus', subject: 'maths', draw: function (c) {
      bar(c, 99, 36, 42, 168, 13);
      bar(c, 36, 99, 168, 42, 13);
    } },
    { name: 'flask', subject: 'chemistry', draw: function (c) {
      c.lineWidth = 12;
      c.beginPath();
      c.moveTo(88, 34); c.lineTo(152, 34);
      c.moveTo(102, 36); c.lineTo(102, 92);
      c.lineTo(48, 188); c.quadraticCurveTo(40, 206, 62, 206);
      c.lineTo(178, 206); c.quadraticCurveTo(200, 206, 192, 188);
      c.lineTo(138, 92); c.lineTo(138, 36);
      c.stroke();
      c.beginPath();
      c.moveTo(66, 156);
      c.bezierCurveTo(90, 142, 108, 170, 128, 156);
      c.bezierCurveTo(146, 144, 160, 160, 174, 156);
      c.lineTo(190, 190); c.quadraticCurveTo(194, 200, 180, 200);
      c.lineTo(60, 200); c.quadraticCurveTo(46, 200, 50, 190);
      c.closePath();
      c.fill();
      dot(c, 112, 128, 7);
      dot(c, 129, 108, 5);
    } },
    { name: 'square root', subject: 'maths', draw: function (c) {
      c.lineWidth = 15;
      c.beginPath();
      c.moveTo(24, 132); c.lineTo(50, 118); c.lineTo(90, 204); c.lineTo(136, 40); c.lineTo(218, 40);
      c.stroke();
      c.lineWidth = 12;
      c.beginPath();
      c.moveTo(156, 88); c.lineTo(204, 148);
      c.moveTo(204, 88); c.lineTo(156, 148);
      c.stroke();
    } },
    { name: 'atom', subject: 'physics', draw: function (c) {
      c.lineWidth = 8;
      for (var k = 0; k < 3; k++) {
        c.beginPath();
        c.ellipse(120, 120, 102, 36, k * Math.PI / 3, 0, TAU);
        c.stroke();
      }
      dot(c, 120, 120, 17);
      [[0, 0.7], [1, 2.5], [2, 4.4]].forEach(function (e) {
        var a = e[0] * Math.PI / 3;
        var x = 102 * Math.cos(e[1]);
        var y = 36 * Math.sin(e[1]);
        dot(c, 120 + x * Math.cos(a) - y * Math.sin(a), 120 + x * Math.sin(a) + y * Math.cos(a), 9);
      });
    } },
    { name: 'pi', subject: 'maths', draw: function (c) {
      c.lineWidth = 22;
      c.beginPath(); c.moveTo(42, 82); c.quadraticCurveTo(50, 62, 78, 62); c.lineTo(202, 62); c.stroke();
      c.beginPath(); c.moveTo(96, 66); c.quadraticCurveTo(98, 150, 70, 202); c.stroke();
      c.beginPath(); c.moveTo(154, 66); c.lineTo(154, 176); c.quadraticCurveTo(156, 204, 186, 196); c.stroke();
    } },
    { name: 'DNA helix', subject: 'biology', draw: function (c) {
      c.save();
      c.translate(120, 120); c.rotate(-0.42); c.translate(-120, -120);
      var wave = function (y) { return 54 * Math.sin((y - 20) / 200 * TAU * 1.5); };
      c.lineWidth = 9;
      for (var s = -1; s <= 1; s += 2) {
        c.beginPath();
        for (var y = 20; y <= 220; y += 3) {
          var x = 120 + s * wave(y);
          if (y === 20) c.moveTo(x, y); else c.lineTo(x, y);
        }
        c.stroke();
      }
      c.lineWidth = 5;
      for (var y2 = 30; y2 < 216; y2 += 15) {
        var dx = wave(y2);
        if (Math.abs(dx) > 16) { c.beginPath(); c.moveTo(120 - dx, y2); c.lineTo(120 + dx, y2); c.stroke(); }
      }
      c.restore();
    } }
  ];

  function rng(seed) {
    return function () {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function morton(x, y) {
    var z = 0;
    for (var b = 0; b < 6; b++) z |= ((x >> b) & 1) << (2 * b) | ((y >> b) & 1) << (2 * b + 1);
    return z;
  }

  // Ink becomes an even, hexagonal dot grid with exactly n dots, ordered so that
  // neighbouring dots in one symbol travel to neighbouring places in the next.
  function sample(sym, n) {
    var S = 240;
    var off = document.createElement('canvas');
    off.width = off.height = S;
    var c = off.getContext('2d', { willReadFrequently: true });
    c.fillStyle = c.strokeStyle = '#000';
    c.lineCap = 'round';
    c.lineJoin = 'round';
    sym.draw(c);
    var a = c.getImageData(0, 0, S, S).data;
    var grid = function (step, out) {
      var count = 0;
      var h = step * 0.866;
      for (var row = 0, y = h / 2; y < S; y += h, row++) {
        for (var x = row % 2 ? step : step / 2; x < S; x += step) {
          if (a[((y | 0) * S + (x | 0)) * 4 + 3] > 140) {
            count++;
            if (out) out.push(x, y);
          }
        }
      }
      return count;
    };
    var lo = 1.2, hi = 40;
    for (var i = 0; i < 22; i++) {
      var mid = (lo + hi) / 2;
      if (grid(mid) >= n) lo = mid; else hi = mid;
    }
    var pts = [];
    grid(lo, pts);
    var m = pts.length / 2;
    var keep = [];
    for (var k = 0; k < n; k++) {
      var j = Math.min(m - 1, Math.floor(k * m / n));
      keep.push([pts[2 * j], pts[2 * j + 1]]);
    }
    keep.sort(function (p, q) {
      return morton(Math.min(63, p[0] / S * 64 | 0), Math.min(63, p[1] / S * 64 | 0)) -
             morton(Math.min(63, q[0] / S * 64 | 0), Math.min(63, q[1] / S * 64 | 0));
    });
    var out = new Float32Array(n * 2);
    for (var p = 0; p < n; p++) {
      out[2 * p] = (keep[p][0] - S / 2) / (S / 2);
      out[2 * p + 1] = (keep[p][1] - S / 2) / (S / 2);
    }
    return out;
  }

  // ------------------------------------------------------------ geometry --
  var W = 0, H = 0, dpr = 1, cx = 0, cy = 0, scale = 0, radius = 2, n = 0;
  var shapes = [], curl, jitter, start, P;

  function seedDots() {
    var r = rng(20261126);
    curl = new Float32Array(n);
    jitter = new Float32Array(n);
    start = new Float32Array(n * 2);
    P = new Float32Array(n * 2);
    for (var i = 0; i < n; i++) {
      curl[i] = r() * 2 - 1;
      jitter[i] = r();
      var ang = r() * TAU, rad = 1.05 + r() * 0.55;
      start[2 * i] = Math.cos(ang) * rad;
      start[2 * i + 1] = Math.sin(ang) * rad;
    }
  }

  function layout() {
    var w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return false;
    W = w; H = h;
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var size = Math.min(W, H);
    cx = W / 2; cy = H / 2;
    scale = size * 0.44;
    radius = Math.max(1.4, Math.min(2.6, size / 230)); // half the side of each square dot
    var count = size >= 470 ? 860 : size >= 340 ? 660 : 480;
    if (count !== n) {
      n = count;
      shapes = SYMBOLS.map(function (s) { return sample(s, n); });
      seedDots();
    }
    return true;
  }

  // ------------------------------------------------------------- colours --
  var probe = document.createElement('canvas').getContext('2d');
  function parse(str) {
    probe.fillStyle = '#000';
    probe.fillStyle = (str || '').trim() || '#000';
    var v = probe.fillStyle;
    if (v.charAt(0) === '#') return [parseInt(v.slice(1, 3), 16), parseInt(v.slice(3, 5), 16), parseInt(v.slice(5, 7), 16)];
    var m = v.match(/[\d.]+/g);
    return m ? [+m[0], +m[1], +m[2]] : [0, 0, 0];
  }
  var palette = null, alpha = 0.5;
  function readPalette() {
    var cs = getComputedStyle(canvas);
    var p = {};
    ['maths', 'physics', 'chemistry', 'biology'].forEach(function (k) {
      p[k] = parse(cs.getPropertyValue('--morph-' + k));
    });
    alpha = parseFloat(cs.getPropertyValue('--dot-alpha')) || 0.5;
    return p;
  }
  function mix(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
  function css(c) { return 'rgb(' + (c[0] | 0) + ' ' + (c[1] | 0) + ' ' + (c[2] | 0) + ')'; }

  // --------------------------------------------------------------- clock --
  // A virtual clock that only advances while the morph is allowed to run, so a
  // pause, a hidden tab or scrolling away resumes exactly where it left off.
  var base = 0, runStart = 0, running = false;
  function now() { return running ? base + (performance.now() - runStart) : base; }

  var idx = 0, phase = 'gather', phaseStart = 0, wave = null;
  var userPaused = root.classList.contains('is-motion-paused'), onScreen = true, tabVisible = !document.hidden;
  var raf = 0, timer = 0, frames = 0;

  function motionOn() { return root.getAttribute('data-motion') !== 'off'; }
  function allowed() { return motionOn() && !userPaused && onScreen && tabVisible && phase !== 'still'; }

  function easeInOut(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function easeOut(t) { return 1 - Math.pow(1 - t, 3); }

  function positions(t) {
    var A = shapes[idx], B = shapes[(idx + 1) % shapes.length], i;
    if (phase === 'gather') {
      for (i = 0; i < n; i++) {
        var g = easeOut(Math.min(1, Math.max(0, (t - jitter[i] * 0.42) / 0.58)));
        P[2 * i] = cx + (start[2 * i] + (A[2 * i] - start[2 * i]) * g) * scale;
        P[2 * i + 1] = cy + (start[2 * i + 1] + (A[2 * i + 1] - start[2 * i + 1]) * g) * scale;
      }
      return;
    }
    if (phase !== 'morph') {
      var S = shapes[phase === 'still' ? STILL : idx];
      for (i = 0; i < n; i++) {
        P[2 * i] = cx + S[2 * i] * scale;
        P[2 * i + 1] = cy + S[2 * i + 1] * scale;
      }
      return;
    }
    for (i = 0; i < n; i++) {
      var ax = A[2 * i], ay = A[2 * i + 1], bx = B[2 * i], by = B[2 * i + 1];
      var d = (ax + 1) / 2 * 0.36 + jitter[i] * 0.08;
      var e = easeInOut(Math.min(1, Math.max(0, (t - d) / 0.56)));
      var dx = bx - ax, dy = by - ay, len = Math.sqrt(dx * dx + dy * dy) || 1;
      var k = Math.sin(Math.PI * e) * curl[i] * 0.2 * Math.min(1, len);
      P[2 * i] = cx + (ax + dx * e - dy / len * k) * scale;
      P[2 * i + 1] = cy + (ay + dy * e + dx / len * k) * scale;
    }
  }

  function colourFor(pal, t) {
    if (phase === 'still') return pal[SYMBOLS[STILL].subject];
    var a = pal[SYMBOLS[idx].subject];
    if (phase !== 'morph') return a;
    return mix(a, pal[SYMBOLS[(idx + 1) % SYMBOLS.length].subject], easeInOut(Math.min(1, t)));
  }

  function draw() {
    if (!n || !W) return;
    var vt = now();
    var t = phase === 'gather' ? (vt - phaseStart) / GATHER : phase === 'morph' ? (vt - phaseStart) / MORPH : 1;
    positions(Math.min(1, t));
    ctx.clearRect(0, 0, W, H);
    var a = alpha;
    if (phase === 'gather') a *= Math.min(1, t * 1.8);
    ctx.globalAlpha = a;
    var current = colourFor(palette, t);
    var i, b;
    if (wave) {
      // The signature regrade: dots take the new theme's colour in a sweep.
      var w = (vt - wave.at) / WAVE;
      var old = colourFor(wave.from, t);
      for (b = 0; b <= 5; b++) {
        ctx.beginPath();
        ctx.fillStyle = css(mix(old, current, b / 5));
        for (i = 0; i < n; i++) {
          var f = Math.min(1, Math.max(0, (w - (P[2 * i] / W) * 0.5) / 0.5));
          if (Math.round(f * 5) !== b) continue;
          ctx.rect(P[2 * i] - radius, P[2 * i + 1] - radius, radius * 2, radius * 2);
        }
        ctx.fill();
      }
    } else {
      ctx.beginPath();
      ctx.fillStyle = css(current);
      for (i = 0; i < n; i++) {
        ctx.rect(P[2 * i] - radius, P[2 * i + 1] - radius, radius * 2, radius * 2);
      }
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    frames++;
    canvas.setAttribute('data-frames', frames);
  }

  function report() {
    canvas.setAttribute('data-state', phase === 'still' ? 'still' : running ? phase : userPaused ? 'paused' : 'stopped');
    canvas.setAttribute('data-symbol', SYMBOLS[phase === 'still' ? STILL : idx].name);
  }

  function advance() {
    var vt = now();
    if (phase === 'gather' && vt - phaseStart >= GATHER) { phase = 'hold'; phaseStart = vt; }
    else if (phase === 'morph' && vt - phaseStart >= MORPH) { idx = (idx + 1) % SYMBOLS.length; phase = 'hold'; phaseStart = vt; }
    else if (phase === 'hold' && vt - phaseStart >= HOLD) { phase = 'morph'; phaseStart = vt; }
    if (wave && vt - wave.at >= WAVE) wave = null;
  }

  function frame() {
    raf = 0;
    advance();
    draw();
    schedule();
  }

  function schedule() {
    cancelAnimationFrame(raf); raf = 0;
    clearTimeout(timer); timer = 0;
    report();
    if (!running) return;
    if (phase === 'gather' || phase === 'morph' || wave) { raf = requestAnimationFrame(frame); return; }
    if (phase === 'hold') {
      timer = setTimeout(function () { timer = 0; frame(); }, Math.max(0, HOLD - (now() - phaseStart)));
    }
  }

  function setRunning(on) {
    if (on && !running) { runStart = performance.now(); running = true; }
    else if (!on && running) { base = now(); running = false; }
    schedule();
  }
  function update() { setRunning(allowed()); }

  // A pause lands on a whole symbol, never a half-made one.
  function settle() {
    if (phase === 'morph') { idx = (idx + 1) % SYMBOLS.length; }
    if (phase === 'morph' || phase === 'gather') { phase = 'hold'; phaseStart = now(); }
    wave = null;
    draw();
  }

  function applyMotion() {
    if (!motionOn()) {
      setRunning(false);
      phase = 'still';
      wave = null;
      draw();
      report();
      return;
    }
    if (phase === 'still') { idx = STILL; phase = 'hold'; phaseStart = now(); draw(); }
    update();
  }

  function init() {
    if (!layout()) return;
    palette = readPalette();
    if (!motionOn()) { phase = 'still'; draw(); report(); }
    else { phase = 'gather'; phaseStart = 0; draw(); update(); }

    document.addEventListener('apporatory:pause', function (e) {
      userPaused = !!(e.detail && e.detail.paused);
      if (userPaused) { setRunning(false); settle(); report(); }
      else update();
    });

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        onScreen = entries[entries.length - 1].isIntersecting;
        update();
      }).observe(canvas);
    }
    document.addEventListener('visibilitychange', function () {
      tabVisible = !document.hidden;
      update();
    });
    document.addEventListener('apporatory:theme', function () {
      var from = palette;
      palette = readPalette();
      if (running && phase !== 'still') { wave = { from: from, at: now() }; schedule(); }
      else draw();
    });
    document.addEventListener('apporatory:motion', applyMotion);

    var resizeTimer = 0;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () { if (layout()) draw(); }, 150);
    });
  }

  window.ApporatoryMorph = {
    state: function () { return { phase: phase, symbol: SYMBOLS[phase === 'still' ? STILL : idx].name, running: running, dots: n, frames: frames }; }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
