/* Apporatory backgrounds: the Deltarune grid (drawn in CSS, the default) or
   one of four EarthBound-style scenes drawn here. Each scene is two tiled
   pattern layers, drawn in code below, with slow palette cycling and a wavy
   scanline distortion (horizontal, interlaced or a vertical squish), blended
   together at about 320 pixels wide and scaled up with hard pixel edges.
   Colours are mixed from the current theme at low strength. Shuffle
   crossfades to another background about once a minute. Reduce motion and
   pause freeze the scene on a still frame, and nothing is drawn while the tab
   is hidden. */
(function () {
  'use strict';

  var root = document.documentElement;
  var KEY = 'apporatory:background';
  var CHOICES = ['grid', 'ripple', 'orbitals', 'vortex', 'signs', 'shuffle'];
  var SCENES = ['ripple', 'orbitals', 'vortex', 'signs'];
  var SHUFFLE_EVERY = 60;          // seconds of moving, visible time
  var FADE_PICK = 0.8, FADE_SHUFFLE = 2.5;
  var STILL_AT = 6;                // the frame shown when motion is reduced
  var PREVIEW_W = 64, PREVIEW_H = 36;

  var store = null;
  try { store = window.localStorage; store.getItem(KEY); } catch (e) { store = null; }
  var canvas = document.querySelector('.eb-bg');
  var radios = Array.prototype.slice.call(document.querySelectorAll('input[name="background"]'));

  // ------------------------------------------------------------- patterns --
  // Every tile is a square of palette indices 0-7. Cycling the palette makes
  // the bands travel: rings grow, spirals turn, outlines ripple.
  function tile(size, fn) {
    var data = new Uint8Array(size * size);
    for (var y = 0; y < size; y++) {
      for (var x = 0; x < size; x++) data[y * size + x] = ((Math.floor(fn(x, y)) % 8) + 8) % 8;
    }
    return { size: size, data: data };
  }
  // Plus, minus, times and divide, 16 x 16 each.
  var SIGNS = [
    '................' + '................' + '......####......' + '......####......' + '......####......' + '......####......' +
    '..############..' + '..############..' + '..############..' + '..############..' + '......####......' + '......####......' +
    '......####......' + '......####......' + '................' + '................',
    '................' + '................' + '................' + '................' + '................' + '................' +
    '..############..' + '..############..' + '..############..' + '..############..' + '................' + '................' +
    '................' + '................' + '................' + '................',
    '................' + '................' + '..##........##..' + '..###......###..' + '...###....###...' + '....###..###....' +
    '.....######.....' + '......####......' + '......####......' + '.....######.....' + '....###..###....' + '...###....###...' +
    '..###......###..' + '..##........##..' + '................' + '................',
    '................' + '................' + '......####......' + '......####......' + '......####......' + '................' +
    '..############..' + '..############..' + '..############..' + '..############..' + '................' + '......####......' +
    '......####......' + '......####......' + '................' + '................'
  ];
  function signsTile() {
    var size = 32, ink = [];
    SIGNS.forEach(function (art, k) {
      var ox = (k % 2) * 16, oy = Math.floor(k / 2) * 16;
      for (var i = 0; i < 256; i++) if (art.charAt(i) === '#') ink.push([ox + (i % 16), oy + Math.floor(i / 16)]);
    });
    return tile(size, function (x, y) {
      var d = 99;
      for (var i = 0; i < ink.length; i++) {
        var dx = Math.abs(ink[i][0] - x), dy = Math.abs(ink[i][1] - y);
        dx = Math.min(dx, size - dx); dy = Math.min(dy, size - dy);
        d = Math.min(d, Math.max(dx, dy));
      }
      return d === 0 ? 7 : Math.floor((d - 1) / 2) % 7;
    });
  }
  var ATOMS = [[8, 8], [40, 8], [24, 40], [56, 40]];
  var TILES = {
    diamonds: function () { return tile(64, function (x, y) { return (Math.abs(x - 31.5) + Math.abs(y - 31.5)) / 4; }); },
    checker: function () { return tile(16, function (x, y) { return (((x >> 3) + (y >> 3)) & 1) * 4 + ((((x & 7) + (y & 7)) >> 2) & 3); }); },
    orbitals: function () {
      return tile(64, function (x, y) {
        var d = 99;
        ATOMS.forEach(function (a) {
          var dx = Math.abs(a[0] - x), dy = Math.abs(a[1] - y);
          dx = Math.min(dx, 64 - dx); dy = Math.min(dy, 64 - dy);
          d = Math.min(d, Math.sqrt(dx * dx + dy * dy));
        });
        return d / 3;
      });
    },
    stripes: function () { return tile(32, function (x, y) { return (x + y) / 4; }); },
    spiral: function () {
      return tile(64, function (x, y) {
        var dx = x - 31.5, dy = y - 31.5;
        return Math.atan2(dy, dx) / (2 * Math.PI) * 8 + Math.sqrt(dx * dx + dy * dy) / 3 + 8;
      });
    },
    dots: function () {
      return tile(16, function (x, y) { var d = Math.sqrt((x - 7.5) * (x - 7.5) + (y - 7.5) * (y - 7.5)); return d < 2.6 ? 7 : (d / 2) % 7; });
    },
    signs: signsTile
  };

  // --------------------------------------------------------------- scenes --
  // warp: 1 horizontal, 2 interlaced (neighbouring lines move opposite ways),
  // 3 vertical squish. drift is in pixels a second, period in lines, speed in
  // radians a second, cycle in palette steps a second. inks pick the theme's
  // accents (1, 2, 3). Everything is slow: no pixel changes colour more than
  // about twice a second, and neighbouring palette steps are close in colour.
  var SCENE = {
    ripple: [
      { tile: 'diamonds', zoom: 1, drift: [5, 0], cycle: 0.5, warp: 1, amp: 6, period: 72, speed: 0.9, inks: [1, 2] },
      { tile: 'checker', zoom: 2, drift: [-4, 3], cycle: -0.3, warp: 3, amp: 5, period: 96, speed: 0.6, inks: [3, 1], alpha: 0.35 }
    ],
    orbitals: [
      { tile: 'orbitals', zoom: 1, drift: [0, -4], cycle: 0.45, warp: 2, amp: 4, period: 64, speed: 0.7, inks: [2, 3] },
      { tile: 'stripes', zoom: 1, drift: [6, 0], cycle: 0.25, warp: 1, amp: 5, period: 120, speed: 0.5, inks: [1, 2], alpha: 0.3 }
    ],
    vortex: [
      { tile: 'spiral', zoom: 2, drift: [3, 2], cycle: 0.6, warp: 3, amp: 8, period: 110, speed: 0.8, inks: [3, 1] },
      { tile: 'dots', zoom: 1, drift: [-5, -3], cycle: 0.3, warp: 2, amp: 3, period: 48, speed: 0.6, inks: [2, 3], alpha: 0.3 }
    ],
    signs: [
      { tile: 'signs', zoom: 2, drift: [-4, 0], cycle: 0.4, warp: 1, amp: 5, period: 90, speed: 0.7, inks: [1, 3] },
      { tile: 'diamonds', zoom: 1, drift: [0, 4], cycle: -0.35, warp: 2, amp: 3, period: 56, speed: 0.5, inks: [2, 1], alpha: 0.25 }
    ]
  };

  // --------------------------------------------------------------- colours --
  var probeCtx = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
  function rgb(value) {
    probeCtx.clearRect(0, 0, 1, 1);
    probeCtx.fillStyle = '#000';
    probeCtx.fillStyle = value.trim() || '#000';
    probeCtx.fillRect(0, 0, 1, 1);
    var d = probeCtx.getImageData(0, 0, 1, 1).data;
    return [d[0], d[1], d[2]];
  }
  function mixRGB(a, b, k) { return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k]; }
  // Low strength keeps the scenes calm behind the panels; dark pages need a
  // little more tint for the pattern to show at all.
  var STRENGTH = { light: 0.17, dark: 0.26, 'red-green': 0.17, 'blue-yellow': 0.17, greyscale: 0.2, 'high-contrast': 0.15 };
  var palette = {};
  // boost > 1 is for the picker's thumbnails, which are too small to read at
  // full-page strength.
  function buildPalettes(boost) {
    var cs = getComputedStyle(root);
    var bg = rgb(cs.getPropertyValue('--bg'));
    var inks = [null, rgb(cs.getPropertyValue('--accent')), rgb(cs.getPropertyValue('--accent-2')), rgb(cs.getPropertyValue('--accent-3'))];
    var s = Math.min(1, (STRENGTH[root.getAttribute('data-theme')] || 0.17) * (boost || 1));
    var steps = [0.3, 0.65, 1, 0.65];
    SCENES.forEach(function (id) {
      palette[id] = SCENE[id].map(function (layer) {
        var out = new Uint8Array(8 * 3);
        for (var i = 0; i < 8; i++) {
          var c = mixRGB(bg, inks[layer.inks[i < 4 ? 0 : 1]], s * steps[i % 4]);
          out[i * 3] = Math.round(c[0]); out[i * 3 + 1] = Math.round(c[1]); out[i * 3 + 2] = Math.round(c[2]);
        }
        return out;
      });
    });
  }

  // ---------------------------------------------------------------- WebGL --
  var gl = null;
  try {
    gl = canvas && canvas.getContext('webgl', { alpha: false, antialias: false, depth: false, stencil: false, premultipliedAlpha: false, powerPreference: 'low-power' });
  } catch (e) { gl = null; }

  var VERT = 'attribute vec2 a;void main(){gl_Position=vec4(a,0.0,1.0);}';
  var FRAG = [
    '#ifdef GL_FRAGMENT_PRECISION_HIGH',
    'precision highp float;',
    '#else',
    'precision mediump float;',
    '#endif',
    'uniform vec2 u_size;',
    'uniform float u_mix;',
    'uniform sampler2D u_t0, u_t1, u_t2, u_t3;',
    'uniform sampler2D u_p0, u_p1, u_p2, u_p3;',
    'uniform vec4 u_g0, u_g1, u_g2, u_g3;',   // drift x, drift y, tile size in pixels, opacity
    'uniform vec4 u_w0, u_w1, u_w2, u_w3;',   // warp kind, amplitude, frequency, phase
    'uniform vec4 u_c;',                      // palette offset of each layer
    'vec3 layer(sampler2D t, sampler2D p, vec4 g, vec4 w, float c, vec2 px) {',
    '  float off = w.y * sin(w.z * px.y + w.w);',
    '  vec2 q = px;',
    '  if (w.x < 1.5) q.x += off;',
    '  else if (w.x < 2.5) q.x += mod(floor(px.y), 2.0) < 0.5 ? off : -off;',
    '  else q.y += off;',
    '  q += g.xy;',
    '  float i = floor(texture2D(t, q / g.z).r * 7.0 + 0.5);',
    '  return texture2D(p, vec2((i + c + 0.5) / 8.0, 0.5)).rgb;',
    '}',
    'void main() {',
    '  vec2 px = vec2(floor(gl_FragCoord.x), u_size.y - 1.0 - floor(gl_FragCoord.y)) + 0.5;',
    '  vec3 a = mix(layer(u_t0, u_p0, u_g0, u_w0, u_c.x, px), layer(u_t1, u_p1, u_g1, u_w1, u_c.y, px), u_g1.w);',
    '  if (u_mix > 0.0) {',
    '    vec3 b = mix(layer(u_t2, u_p2, u_g2, u_w2, u_c.z, px), layer(u_t3, u_p3, u_g3, u_w3, u_c.w, px), u_g3.w);',
    '    a = mix(a, b, u_mix);',
    '  }',
    '  gl_FragColor = vec4(a, 1.0);',
    '}'
  ].join('\n');

  var prog = null, loc = {}, tileTex = {}, palTex = {}, fbo = null, fboTex = null;

  function compile(type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  }
  function setupGL() {
    prog = gl.createProgram();
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
    gl.useProgram(prog);
    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    var a = gl.getAttribLocation(prog, 'a');
    gl.enableVertexAttribArray(a);
    gl.vertexAttribPointer(a, 2, gl.FLOAT, false, 0, 0);
    ['u_size', 'u_mix', 'u_c', 'u_t0', 'u_t1', 'u_t2', 'u_t3', 'u_p0', 'u_p1', 'u_p2', 'u_p3',
      'u_g0', 'u_g1', 'u_g2', 'u_g3', 'u_w0', 'u_w1', 'u_w2', 'u_w3'].forEach(function (n) { loc[n] = gl.getUniformLocation(prog, n); });
    for (var k = 0; k < 4; k++) { gl.uniform1i(loc['u_t' + k], k); gl.uniform1i(loc['u_p' + k], 4 + k); }
    Object.keys(TILES).forEach(function (name) {
      var t = TILES[name]();
      var px = new Uint8Array(t.data.length);
      for (var i = 0; i < px.length; i++) px[i] = Math.round(t.data[i] * 255 / 7);
      var tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, t.size, t.size, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, px);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
      tileTex[name] = { tex: tex, size: t.size };
    });
    SCENES.forEach(function (id) {
      palTex[id] = SCENE[id].map(function () {
        var tex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
        return tex;
      });
    });
    fboTex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, fboTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, PREVIEW_W, PREVIEW_H, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, fboTex, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }
  function uploadPalettes() {
    SCENES.forEach(function (id) {
      palTex[id].forEach(function (tex, k) {
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, 8, 1, 0, gl.RGB, gl.UNSIGNED_BYTE, palette[id][k]);
      });
    });
  }

  var TAU = Math.PI * 2;
  function bindScene(id, slot, t) {
    SCENE[id].forEach(function (L, k) {
      var n = slot * 2 + k, info = tileTex[L.tile], span = info.size * L.zoom;
      gl.activeTexture(gl.TEXTURE0 + n);
      gl.bindTexture(gl.TEXTURE_2D, info.tex);
      gl.activeTexture(gl.TEXTURE4 + n);
      gl.bindTexture(gl.TEXTURE_2D, palTex[id][k]);
      gl.uniform4f(loc['u_g' + n], (L.drift[0] * t) % span, (L.drift[1] * t) % span, span, L.alpha || 1);
      gl.uniform4f(loc['u_w' + n], L.warp, L.amp, TAU / L.period, (L.speed * t) % TAU);
    });
  }
  function cycles(a, b, t) {
    var c = function (id, k) { return id ? ((SCENE[id][k].cycle * t) % 8 + 8) % 8 : 0; };
    gl.uniform4f(loc.u_c, c(a, 0), c(a, 1), c(b, 0), c(b, 1));
  }
  function render(a, b, mixK, t, w, h) {
    gl.viewport(0, 0, w, h);
    gl.uniform2f(loc.u_size, w, h);
    bindScene(a, 0, t);
    if (b && mixK > 0) bindScene(b, 1, t);
    cycles(a, b && mixK > 0 ? b : null, t);
    gl.uniform1f(loc.u_mix, b ? mixK : 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  // ----------------------------------------------------------------- state --
  var W = 0, H = 0;
  var choice = 'grid';         // what the visitor picked
  var showing = 'grid';        // what is on screen now
  var sceneA = null, sceneB = null, mixK = 0, fadeFrom = 0, fadeDur = 0;
  var base = 0, runStart = 0, running = false, raf = 0, frames = 0;
  var nextShuffle = SHUFFLE_EVERY, order = [], canvasTimer = 0, probe = null;

  function motionOn() { return root.getAttribute('data-motion') !== 'off'; }
  function paused() { return root.classList.contains('is-motion-paused'); }
  function clock() { return running ? base + (performance.now() - runStart) / 1000 : base; }

  function resize() {
    var vw = window.innerWidth || 1280, vh = window.innerHeight || 800;
    W = Math.max(160, Math.min(320, Math.round(vw / 4.5)));
    H = Math.max(90, Math.round(W * vh / vw));
    if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }
  }

  function draw() {
    if (!sceneA) return;
    var t = clock();
    if (sceneB) {
      mixK = fadeDur > 0 ? Math.min(1, (t - fadeFrom) / fadeDur) : 1;
      if (mixK >= 1) { sceneA = sceneB; sceneB = null; mixK = 0; }
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    render(sceneA, sceneB, mixK, motionOn() ? t : STILL_AT, W, H);
    frames++;
    canvas.setAttribute('data-frames', String(frames));
    if (probe) takeProbe();
  }

  function frame() {
    raf = 0;
    if (!running) return;
    if (sceneA) draw();
    if (choice === 'shuffle' && clock() >= nextShuffle) shuffleStep();
    raf = requestAnimationFrame(frame);
  }
  // Shuffle keeps the clock going while the grid is showing, to know when to move on.
  function update() {
    var should = (showing !== 'grid' || choice === 'shuffle') && motionOn() && !paused() && !document.hidden;
    if (should && !running) { running = true; runStart = performance.now(); raf = requestAnimationFrame(frame); }
    else if (!should && running) { base = clock(); running = false; if (raf) cancelAnimationFrame(raf); raf = 0; }
    if (!running && showing !== 'grid' && !document.hidden) draw();
    canvas.setAttribute('data-running', running ? 'true' : 'false');
  }

  // Shows a background: the grid by fading the canvas out, or a scene by
  // crossfading inside the canvas (scene to scene) or fading the canvas in.
  function show(id, fade) {
    if (id === showing) return;
    var instant = !motionOn() || paused() || document.hidden || !fade;
    var secs = instant ? 0 : fade;
    canvas.style.setProperty('--eb-fade', secs + 's');
    clearTimeout(canvasTimer);
    if (id === 'grid') {
      root.classList.remove('eb-solid');
      root.classList.remove('eb-on');
      showing = 'grid';
      canvasTimer = setTimeout(function () { if (showing === 'grid') { sceneA = null; sceneB = null; update(); } }, secs * 1000 + 50);
      update();
      return;
    }
    if (showing === 'grid' || !sceneA) {
      sceneA = id; sceneB = null; mixK = 0;
      showing = id;
      update();
      draw();
      root.classList.add('eb-on');
      canvasTimer = setTimeout(function () { if (showing !== 'grid') root.classList.add('eb-solid'); }, secs * 1000 + 50);
      return;
    }
    showing = id;
    if (secs === 0) { sceneA = id; sceneB = null; mixK = 0; }
    else { sceneB = id; fadeFrom = clock(); fadeDur = secs; mixK = 0; }
    update();
  }

  function shuffleStep() {
    if (!order.length) {
      order = CHOICES.filter(function (c) { return c !== 'shuffle' && c !== showing; });
      for (var i = order.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), x = order[i]; order[i] = order[j]; order[j] = x; }
    }
    var next = order.shift();
    if (next === showing) next = order.shift() || 'grid';
    nextShuffle = clock() + SHUFFLE_EVERY;
    show(next, FADE_SHUFFLE);
  }

  function pick(value, remember) {
    if (CHOICES.indexOf(value) < 0) value = 'grid';
    if (!gl && value !== 'grid') value = 'grid';
    choice = value;
    root.setAttribute('data-background', value);
    if (remember && store) try { store.setItem(KEY, value); } catch (e) { /* private mode */ }
    radios.forEach(function (r) { r.checked = r.value === value; });
    if (value === 'shuffle') {
      order = [];
      nextShuffle = clock() + SHUFFLE_EVERY;
      if (showing === 'grid') show(SCENES[Math.floor(Math.random() * SCENES.length)], remember ? FADE_PICK : 0);
      else update();
    } else {
      show(value, remember ? FADE_PICK : 0);
    }
  }

  // -------------------------------------------------------------- previews --
  var previews = Array.prototype.slice.call(document.querySelectorAll('canvas[data-preview]'));
  function renderPreview(id) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    render(id, null, 0, 3, PREVIEW_W, PREVIEW_H);
    var px = new Uint8Array(PREVIEW_W * PREVIEW_H * 4);
    gl.readPixels(0, 0, PREVIEW_W, PREVIEW_H, gl.RGBA, gl.UNSIGNED_BYTE, px);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    var img = new ImageData(PREVIEW_W, PREVIEW_H), row = PREVIEW_W * 4;
    for (var y = 0; y < PREVIEW_H; y++) img.data.set(px.subarray((PREVIEW_H - 1 - y) * row, (PREVIEW_H - y) * row), y * row);
    return img;
  }
  function drawPreviews() {
    if (!gl || !previews.length) return;
    var made = {};
    buildPalettes(2.6);
    uploadPalettes();
    SCENES.forEach(function (id) { made[id] = renderPreview(id); });
    buildPalettes(1);
    uploadPalettes();
    previews.forEach(function (c) {
      var id = c.getAttribute('data-preview'), ctx = c.getContext('2d');
      c.width = PREVIEW_W; c.height = PREVIEW_H;
      if (made[id]) { ctx.putImageData(made[id], 0, 0); return; }
      // Shuffle: a quarter of each scene.
      var hw = PREVIEW_W / 2, hh = PREVIEW_H / 2;
      SCENES.forEach(function (sid, k) { ctx.putImageData(made[sid], 0, 0, (k % 2) * hw, Math.floor(k / 2) * hh, hw, hh); });
    });
    if (sceneA) draw();
  }

  // ------------------------------------------------------- flash checking --
  // Test hook: records the colour of a spread of pixels on every frame.
  function takeProbe() {
    var px = new Uint8Array(W * H * 4);
    gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, px);
    var row = [], lin = function (v) { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    for (var gy = 0; gy < 12; gy++) {
      for (var gx = 0; gx < 20; gx++) {
        var x = Math.floor((gx + 0.5) * W / 20), y = Math.floor((gy + 0.5) * H / 12), i = (y * W + x) * 4;
        row.push(+(0.2126 * lin(px[i]) + 0.7152 * lin(px[i + 1]) + 0.0722 * lin(px[i + 2])).toFixed(4));
      }
    }
    probe.samples.push({ t: performance.now(), l: row });
    if (probe.samples.length >= probe.frames) { var p = probe; probe = null; p.resolve(p.samples); }
  }

  // ------------------------------------------------------------------ start --
  if (gl) {
    try { setupGL(); } catch (e) { gl = null; }
  }
  if (!gl) {
    root.classList.add('no-webgl');
    if (canvas) canvas.hidden = true;
  } else {
    resize();
    buildPalettes();
    uploadPalettes();
    var resizeTimer = 0;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () { resize(); if (sceneA) draw(); }, 150);
    });
    canvas.addEventListener('webglcontextlost', function (e) {
      e.preventDefault();
      root.classList.remove('eb-on', 'eb-solid');
      running = false; showing = 'grid'; sceneA = null;
    });
    canvas.addEventListener('webglcontextrestored', function () {
      try { setupGL(); uploadPalettes(); drawPreviews(); var c = choice; choice = 'grid'; pick(c, false); } catch (e) { /* keep the grid */ }
    });
    document.addEventListener('apporatory:theme', function () { buildPalettes(); uploadPalettes(); drawPreviews(); if (sceneA) draw(); });
    document.addEventListener('apporatory:motion', update);
    document.addEventListener('apporatory:pause', update);
    document.addEventListener('visibilitychange', update);
    radios.forEach(function (r) { r.addEventListener('change', function () { if (r.checked) pick(r.value, true); }); });
    drawPreviews();
  }
  pick(root.getAttribute('data-background') || 'grid', false);
  root.classList.add('eb-ready');

  window.ApporatoryBackground = {
    state: function () {
      return {
        webgl: !!gl, choice: choice, showing: showing, sceneA: sceneA, sceneB: sceneB, mix: +mixK.toFixed(3),
        running: running, frames: frames, size: [W, H], clock: +clock().toFixed(2), nextShuffleIn: +(nextShuffle - clock()).toFixed(1),
        palette: sceneA && palette[sceneA] ? Array.prototype.slice.call(palette[sceneA][0], 0, 6) : null
      };
    },
    probe: function (n) { return new Promise(function (resolve) { probe = { frames: n, samples: [], resolve: resolve }; if (!running) draw(); }); },
    shuffleNow: function () { if (choice === 'shuffle') shuffleStep(); }
  };
})();
