/* Apporatory sound: relaxing music picked at random from a small pool, and a
   soft pop for every shockwave and symbol burst. Off until the visitor turns
   it on in the Sound panel, where Master, Music and Sound effects sliders set
   the levels; everything is remembered on the device.

   Each time the music starts it picks a track at random, and when a track
   ends it fades into another one, never the same twice in a row. Only the
   track about to play is loaded. Music files play from plain audio elements
   with their volume set directly (Chrome silences file:// audio routed
   through Web Audio); the ambient chords and the pop are synthesised. Nothing
   is fetched, so it all works when the page is opened straight from disk. */
(function () {
  'use strict';

  var root = document.documentElement;
  var KEY = 'apporatory:sound', KEY_VOLUME = 'apporatory:volume';
  var DEFAULTS = { master: 100, music: 80, effects: 70 };
  var CHORDS_MAX = 1.0625;  // Music at 80% puts the ambient chords at 0.85, the level Damian chose
  var POP_MAX = 0.75;       // Sound effects at 70% puts the pop at 0.53
  var XFADE = 5;            // seconds of crossfade between tracks
  var CHORDS_SECONDS = 150; // how long the ambient chords play before the next track
  var TRACKS = [
    { id: 'ambient', title: 'Ambient chords', artist: 'Made in your browser', synth: true },
    { id: 'study-and-relax', title: 'Study And Relax', artist: 'Kevin MacLeod', src: 'audio/study-and-relax.mp3' },
    { id: 'cool-vibes', title: 'Cool Vibes', artist: 'Kevin MacLeod', src: 'audio/cool-vibes.mp3' },
    { id: 'bossa-antigua', title: 'Bossa Antigua', artist: 'Kevin MacLeod', src: 'audio/bossa-antigua.mp3' },
    { id: 'morning-coffee', title: 'Morning Coffee', artist: 'HoliznaCC0', src: 'audio/morning-coffee.mp3' }
  ];

  var store = null;
  try { store = window.localStorage; store.getItem(KEY); } catch (e) { store = null; }
  var AC = window.AudioContext || window.webkitAudioContext;
  var toggle = document.getElementById('sound-toggle');
  var sw = document.getElementById('sound-switch');
  var nowTitle = document.querySelector('[data-now-title]');
  var nowArtist = document.querySelector('[data-now-artist]');
  var sliders = Array.prototype.slice.call(document.querySelectorAll('input[data-volume]'));
  if (!AC || !window.HTMLAudioElement || !sw) { if (toggle) toggle.hidden = true; return; }

  // ------------------------------------------------------------- levels --
  var vol = { master: DEFAULTS.master, music: DEFAULTS.music, effects: DEFAULTS.effects };
  try {
    var savedVol = JSON.parse((store && store.getItem(KEY_VOLUME)) || 'null');
    if (savedVol) Object.keys(vol).forEach(function (k) { var v = +savedVol[k]; if (v >= 0 && v <= 100) vol[k] = Math.round(v); });
  } catch (e) { /* keep the defaults */ }
  function musicLevel() { return (vol.master / 100) * (vol.music / 100); }
  function effectsLevel() { return POP_MAX * (vol.master / 100) * (vol.effects / 100); }

  // ---------------------------------------------------------- the engine --
  var ctx = null, popOut = null, noise = null;
  var on = false, armed = false;
  var popsLive = 0, popsPlayed = 0, lastPop = -1;
  var decks = [null, null];
  var cur = null, nxt = null, last = null, mixer = 0, failed = {};

  function buildContext() {
    if (ctx) return;
    ctx = new AC();
    popOut = ctx.createGain();
    popOut.gain.value = effectsLevel();
    popOut.connect(ctx.destination);
    noise = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.05), ctx.sampleRate);
    var nd = noise.getChannelData(0);
    for (var j = 0; j < nd.length; j++) nd[j] = Math.random() * 2 - 1;
  }

  // The ambient chords: slow C major sevenths and ninths with a sparse
  // pentatonic bell on top, through a soft reverb.
  var CHORDS = [[48, 52, 55, 59, 62], [45, 48, 52, 55, 59], [41, 45, 48, 52, 57], [43, 47, 50, 52, 55]];
  var BELLS = [72, 74, 76, 79, 81, 84];
  var CHORD_EVERY = 8;
  var chords = null; // { out, music, scheduler, nextChord, chordIndex, nextBell, voices }
  function freq(m) { return 440 * Math.pow(2, (m - 69) / 12); }
  function buildChords() {
    if (chords) return;
    var out = ctx.createGain();
    out.gain.value = 0;
    out.connect(ctx.destination);
    var verb = ctx.createConvolver();
    var rate = ctx.sampleRate, len = Math.floor(rate * 2.4), buf = ctx.createBuffer(2, len, rate);
    for (var c = 0; c < 2; c++) {
      var d = buf.getChannelData(c);
      for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6);
    }
    verb.buffer = buf;
    var wet = ctx.createGain();
    wet.gain.value = 0.6;
    verb.connect(wet);
    wet.connect(out);
    var bus = ctx.createGain();
    bus.connect(out);
    bus.connect(verb);
    chords = { out: out, bus: bus, scheduler: 0, nextChord: 0, chordIndex: 0, nextBell: 0, voices: [] };
  }
  function track(src, end) {
    chords.voices.push(src);
    src.onended = function () { var k = chords.voices.indexOf(src); if (k >= 0) chords.voices.splice(k, 1); };
    src.stop(end);
  }
  function pad(t, notes) {
    var dur = CHORD_EVERY + 3;
    var filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.Q.value = 0.5;
    filter.frequency.setValueAtTime(650, t);
    filter.frequency.linearRampToValueAtTime(1150, t + dur * 0.5);
    filter.frequency.linearRampToValueAtTime(600, t + dur);
    var env = ctx.createGain();
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(0.06, t + 3);
    env.gain.setValueAtTime(0.06, t + dur - 4);
    env.gain.linearRampToValueAtTime(0, t + dur);
    filter.connect(env);
    env.connect(chords.bus);
    notes.forEach(function (m, i) {
      [['sine', 0.5, -5], ['triangle', 0.2, 5]].forEach(function (v) {
        var osc = ctx.createOscillator();
        osc.type = v[0];
        osc.frequency.value = freq(m);
        osc.detune.value = v[2] + (i % 2 ? 3 : -3);
        var g = ctx.createGain();
        g.gain.value = v[1];
        osc.connect(g);
        g.connect(filter);
        osc.start(t);
        track(osc, t + dur + 0.05);
      });
    });
  }
  function bell(t) {
    var osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq(BELLS[Math.floor(Math.random() * BELLS.length)]);
    var g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.04, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 2.4);
    osc.connect(g);
    g.connect(chords.bus);
    osc.start(t);
    track(osc, t + 2.5);
  }
  function chordTick() {
    if (!chords || !chords.scheduler || ctx.state !== 'running') return;
    var now = ctx.currentTime, ahead = now + 2.5;
    if (chords.nextChord < now - 1) chords.nextChord = now;
    if (chords.nextBell < now - 1) chords.nextBell = now + 1;
    while (chords.nextChord < ahead) { pad(chords.nextChord, CHORDS[chords.chordIndex++ % CHORDS.length]); chords.nextChord += CHORD_EVERY; }
    while (chords.nextBell < ahead) { bell(chords.nextBell); chords.nextBell += 2.5 + Math.random() * 3.5; }
  }
  function startChords() {
    buildChords();
    if (chords.scheduler) return;
    var t = ctx.currentTime + 0.05;
    chords.nextChord = t;
    chords.nextBell = t + 3;
    chords.scheduler = setInterval(chordTick, 400);
    chordTick();
  }
  function stopChords() {
    if (!chords) return;
    clearInterval(chords.scheduler);
    chords.scheduler = 0;
    var t = ctx.currentTime;
    chords.out.gain.cancelScheduledValues(t);
    chords.out.gain.setTargetAtTime(0, t, 0.15);
    chords.voices.slice().forEach(function (o) { try { o.stop(t + 0.8); } catch (e) { /* already stopped */ } });
  }

  // A playing track: a synth or an audio element, with its own fade (0 to 1).
  function deck(i) {
    if (!decks[i]) { decks[i] = document.createElement('audio'); decks[i].preload = 'auto'; }
    return decks[i];
  }
  function pick(avoid) {
    var choices = TRACKS.filter(function (t) { return t !== avoid && !failed[t.id]; });
    if (!choices.length) choices = TRACKS.filter(function (t) { return t.synth; });
    return choices[Math.floor(Math.random() * choices.length)];
  }
  // Must run inside a press, tap or key handler the first time: browsers only
  // allow sound after one.
  function begin(t, fadeSeconds) {
    var v = { track: t, fade: 0, from: 0, to: 1, t0: performance.now(), dur: fadeSeconds * 1000, started: performance.now() };
    if (t.synth) {
      v.deck = -1;
      startChords();
    } else {
      v.deck = cur && cur.deck === 0 ? 1 : 0;
      var el = deck(v.deck);
      el.onerror = function () { failed[t.id] = true; if (cur === v || nxt === v) skip(v); };
      el.src = t.src;
      el.volume = 0;
      var p = el.play();
      if (p && p.catch) p.catch(function () { /* blocked until the next press */ });
    }
    last = t;
    showNow(t);
    return v;
  }
  function stopVoice(v) {
    if (!v) return;
    if (v.deck < 0) stopChords();
    else { var el = decks[v.deck]; el.pause(); el.removeAttribute('src'); el.load(); }
  }
  function fadeVoice(v, to, seconds) { v.from = v.fade; v.to = to; v.t0 = performance.now(); v.dur = seconds * 1000; }
  function applyVoice(v) {
    var k = v.dur > 0 ? Math.min(1, (performance.now() - v.t0) / v.dur) : 1;
    v.fade = v.from + (v.to - v.from) * k;
    if (v.deck < 0) {
      chords.out.gain.setTargetAtTime(CHORDS_MAX * musicLevel() * v.fade, ctx.currentTime, 0.05);
    } else {
      decks[v.deck].volume = Math.max(0, Math.min(1, musicLevel() * v.fade));
    }
    return k >= 1;
  }
  function remaining(v) {
    if (v.deck < 0) return CHORDS_SECONDS - (performance.now() - v.started) / 1000;
    var el = decks[v.deck];
    return el.duration && isFinite(el.duration) ? el.duration - el.currentTime : Infinity;
  }
  function skip(v) {
    if (v === nxt) { stopVoice(nxt); nxt = null; return; }
    stopVoice(cur);
    cur = on ? begin(pick(cur.track), 1) : null;
  }
  function mix() {
    if (!cur || document.hidden) return;
    applyVoice(cur);
    if (nxt) {
      var done = applyVoice(nxt);
      if (done) { stopVoice(cur); cur = nxt; nxt = null; }
    } else if (remaining(cur) <= XFADE) {
      nxt = begin(pick(cur.track), XFADE);
      fadeVoice(cur, 0, XFADE);
    }
  }
  function startMusic() {
    if (!cur) cur = begin(pick(last), 1.5);
    else resumeMusic();
    if (!mixer) mixer = setInterval(mix, 100);
  }
  function resumeMusic() {
    [cur, nxt].forEach(function (v) {
      if (!v) return;
      if (v.deck < 0) startChords();
      else { var p = decks[v.deck].play(); if (p && p.catch) p.catch(function () { /* waits for a press */ }); }
    });
  }
  function pauseMusic() {
    if (nxt) { stopVoice(cur); cur = nxt; nxt = null; cur.fade = cur.to = 1; cur.dur = 0; }
    if (cur && cur.deck >= 0) decks[cur.deck].pause();
    if (cur && cur.deck < 0) stopChords();
  }
  function stopMusic() {
    clearInterval(mixer);
    mixer = 0;
    var gone = [cur, nxt];
    cur = nxt = null;
    gone.forEach(function (v) {
      if (!v) return;
      if (v.deck < 0) { stopChords(); return; }
      var el = decks[v.deck], start = el.volume, t0 = performance.now();
      var fader = setInterval(function () {
        if (cur && cur.deck >= 0 && decks[cur.deck] === el) { clearInterval(fader); return; }
        var k = Math.min(1, (performance.now() - t0) / 500);
        el.volume = start * (1 - k);
        if (k >= 1) { clearInterval(fader); el.pause(); }
      }, 40);
    });
    showNow(null);
  }

  // A soft pop: a sine that drops in pitch, plus a breath of filtered noise.
  function pop(kind) {
    if (!on || !ctx || ctx.state !== 'running') return;
    var t = ctx.currentTime;
    if (t - lastPop < 0.045 || popsLive >= 4) return; // one pop per click, and no pile-ups
    lastPop = t;
    var pitch = (kind === 'burst' ? 0.8 : 1) * (0.9 + Math.random() * 0.2);
    var osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(640 * pitch, t);
    osc.frequency.exponentialRampToValueAtTime(200 * pitch, t + 0.09);
    var g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.2, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.17);
    osc.connect(g);
    g.connect(popOut);
    var src = ctx.createBufferSource();
    src.buffer = noise;
    var band = ctx.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.value = 1800 * pitch;
    band.Q.value = 1.1;
    var ng = ctx.createGain();
    ng.gain.setValueAtTime(0.07, t);
    ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.045);
    src.connect(band);
    band.connect(ng);
    ng.connect(popOut);
    popsLive++;
    popsPlayed++;
    osc.onended = function () { popsLive--; };
    osc.start(t);
    osc.stop(t + 0.19);
    src.start(t);
    src.stop(t + 0.05);
  }

  function wake() {
    buildContext();
    var resumed = ctx.resume();
    if (!document.hidden) startMusic();
    return resumed;
  }
  function setOn(value) {
    on = value;
    armed = false;
    sw.setAttribute('aria-checked', value ? 'true' : 'false');
    root.classList.toggle('is-sound-on', value);
    if (store) try { store.setItem(KEY, value ? 'on' : 'off'); } catch (e) { /* private mode */ }
    if (value) { wake(); return; }
    stopMusic();
    if (ctx) setTimeout(function () { if (!on && ctx.state === 'running') ctx.suspend(); }, 700);
  }
  sw.addEventListener('click', function () { setOn(!on); });

  // --------------------------------------------------------- the panel --
  function showNow(t) {
    if (nowTitle) nowTitle.textContent = t ? t.title : 'Nothing yet';
    if (nowArtist) nowArtist.textContent = t ? t.artist : (on ? 'Starting…' : 'Turn sound on to start the music.');
  }
  function paintSlider(input) {
    var k = input.getAttribute('data-volume'), out = document.querySelector('[data-volume-out="' + k + '"]');
    input.value = String(vol[k]);
    input.style.setProperty('--fill', vol[k] + '%');
    input.setAttribute('aria-valuetext', vol[k] + '%');
    if (out) out.textContent = vol[k] + '%';
  }
  function applyLevels() {
    if (popOut) popOut.gain.setTargetAtTime(effectsLevel(), ctx.currentTime, 0.03);
    if (cur) applyVoice(cur);
    if (nxt) applyVoice(nxt);
  }
  sliders.forEach(function (input) {
    paintSlider(input);
    input.addEventListener('input', function () {
      vol[input.getAttribute('data-volume')] = Math.max(0, Math.min(100, Math.round(+input.value)));
      paintSlider(input);
      applyLevels();
      if (store) try { store.setItem(KEY_VOLUME, JSON.stringify(vol)); } catch (e) { /* private mode */ }
    });
    if (input.getAttribute('data-volume') !== 'music') input.addEventListener('change', function () { pop('shock'); });
  });
  showNow(null);

  // Remembered as on: wait for the first press, tap or key (touch screens only
  // allow sound when the finger lifts, hence the extra events).
  var GESTURES = ['pointerdown', 'pointerup', 'touchend', 'click', 'keydown'];
  function unlock(e) {
    if (e.target && e.target.closest && e.target.closest('#sound-switch, #sound-toggle')) return;
    if (!on || !armed) return;
    wake().then(function () {
      if (!on || !armed || ctx.state !== 'running') return;
      armed = false;
      GESTURES.forEach(function (type) { document.removeEventListener(type, unlock, true); });
    }).catch(function () { /* not allowed by this event; a later one will be */ });
  }
  if (store && store.getItem(KEY) === 'on') {
    on = true;
    armed = true;
    sw.setAttribute('aria-checked', 'true');
    root.classList.add('is-sound-on');
    showNow(null);
    GESTURES.forEach(function (type) { document.addEventListener(type, unlock, true); });
  }

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
      pauseMusic();
      if (ctx) ctx.suspend();
    } else if (on && !armed && ctx) {
      ctx.resume();
      resumeMusic();
    }
  });
  document.addEventListener('apporatory:pop', function (e) { pop(e.detail && e.detail.kind); });

  window.ApporatorySound = {
    state: function () {
      var el = cur && cur.deck >= 0 ? decks[cur.deck] : null;
      return {
        on: on, armed: armed, context: ctx ? ctx.state : 'none',
        track: cur ? cur.track.id : null, next: nxt ? nxt.track.id : null,
        music: !!cur && (cur.deck < 0 ? !!(chords && chords.scheduler) : !!el && !el.paused),
        musicTime: el ? +el.currentTime.toFixed(2) : 0, volume: el ? +el.volume.toFixed(2) : (cur && chords ? +chords.out.gain.value.toFixed(3) : 0),
        levels: { master: vol.master, music: vol.music, effects: vol.effects }, effects: +effectsLevel().toFixed(3),
        decksLoaded: decks.filter(function (d) { return d && d.getAttribute('src'); }).length,
        pops: popsPlayed, live: popsLive
      };
    },
    // Test hook: jump to near the end of the current track to see the crossfade.
    nearEnd: function (seconds) {
      if (!cur) return;
      if (cur.deck < 0) cur.started = performance.now() - (CHORDS_SECONDS - seconds) * 1000;
      else { var el = decks[cur.deck]; if (el.duration) el.currentTime = Math.max(0, el.duration - seconds); }
    }
  };
})();
