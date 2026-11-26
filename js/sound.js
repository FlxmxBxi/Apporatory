/* Apporatory sound: a relaxing jazz loop, and a soft pop for every shockwave
   and symbol burst. Off until the visitor turns it on; the choice is
   remembered on the device. The music plays from a plain audio element and the
   pop is synthesised, so nothing is fetched and it also works when the page is
   opened straight from disk. */
(function () {
  'use strict';

  var root = document.documentElement;
  var KEY = 'apporatory:sound';
  var MUSIC_SRC = 'audio/study-and-relax-loop.mp3';
  // The file is mastered quiet, so phones that ignore volume changes still play it low.
  var MUSIC_VOLUME = 0.8;
  var store = null;
  try { store = window.localStorage; store.getItem(KEY); } catch (e) { store = null; }
  var AC = window.AudioContext || window.webkitAudioContext;
  var buttons = Array.prototype.slice.call(document.querySelectorAll('[data-sound-toggle]'));
  if (!AC || !window.HTMLAudioElement) { buttons.forEach(function (b) { b.hidden = true; }); return; }

  var music = null, fadeTimer = 0;
  var ctx = null, popOut = null, noise = null;
  var on = false, armed = false;
  var popsLive = 0, popsPlayed = 0, lastPop = -1;

  function makeMusic() {
    if (music) return;
    music = document.createElement('audio');
    music.src = MUSIC_SRC;
    music.loop = true;
    music.preload = 'auto';
    music.volume = 0;
  }

  // Volume fades in small steps; browsers that ignore volume simply skip them.
  function fadeTo(target, ms, done) {
    clearInterval(fadeTimer);
    var from = music.volume, t0 = performance.now();
    fadeTimer = setInterval(function () {
      var k = Math.min(1, (performance.now() - t0) / ms);
      music.volume = from + (target - from) * k;
      if (k >= 1) { clearInterval(fadeTimer); fadeTimer = 0; if (done) done(); }
    }, 40);
  }

  // Must run inside a press, tap or key handler: browsers only allow sound after one.
  function playMusic() {
    makeMusic();
    var started = music.play();
    fadeTo(MUSIC_VOLUME, 1800);
    return started && started.then ? started : Promise.resolve();
  }

  function stopMusic(now) {
    if (!music) return;
    if (now) { clearInterval(fadeTimer); fadeTimer = 0; music.pause(); return; }
    fadeTo(0, 500, function () { if (!on) music.pause(); });
  }

  function buildPops() {
    if (ctx) return;
    ctx = new AC();
    popOut = ctx.createGain();
    popOut.gain.value = 0.75;
    popOut.connect(ctx.destination);
    noise = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.05), ctx.sampleRate);
    var nd = noise.getChannelData(0);
    for (var j = 0; j < nd.length; j++) nd[j] = Math.random() * 2 - 1;
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
    buildPops();
    ctx.resume();
    if (!document.hidden) return playMusic();
    return Promise.resolve();
  }

  function setOn(value) {
    on = value;
    armed = false;
    buttons.forEach(function (b) { b.setAttribute('aria-pressed', value ? 'true' : 'false'); });
    root.classList.toggle('is-sound-on', value);
    if (store) try { store.setItem(KEY, value ? 'on' : 'off'); } catch (e) { /* private mode */ }
    if (value) wake().catch(function () { /* blocked; the next press retries */ });
    else {
      stopMusic(false);
      if (ctx) setTimeout(function () { if (!on && ctx.state === 'running') ctx.suspend(); }, 700);
    }
  }

  buttons.forEach(function (b) {
    b.addEventListener('click', function () { setOn(!on); });
  });

  // Remembered as on: sound can only start after the visitor does something,
  // so wait for the first press, tap or key. Touch screens only allow it when
  // the finger lifts, hence the extra events.
  var GESTURES = ['pointerdown', 'pointerup', 'touchend', 'click', 'keydown'];
  function unlock(e) {
    if (e.target && e.target.closest && e.target.closest('[data-sound-toggle]')) return;
    if (!on || !armed) return;
    wake().then(function () {
      if (!on || !armed || (music && music.paused)) return;
      armed = false;
      GESTURES.forEach(function (type) { document.removeEventListener(type, unlock, true); });
    }).catch(function () { /* not allowed by this event; a later one will be */ });
  }
  if (store && store.getItem(KEY) === 'on') {
    on = true;
    armed = true;
    buttons.forEach(function (b) { b.setAttribute('aria-pressed', 'true'); });
    root.classList.add('is-sound-on');
    makeMusic();
    GESTURES.forEach(function (type) { document.addEventListener(type, unlock, true); });
  }

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
      stopMusic(true);
      if (ctx) ctx.suspend();
    } else if (on && !armed) {
      if (ctx) ctx.resume();
      music.volume = 0;
      playMusic().catch(function () { /* resumes on the next press */ });
    }
  });
  document.addEventListener('apporatory:pop', function (e) { pop(e.detail && e.detail.kind); });

  window.ApporatorySound = {
    state: function () {
      return {
        on: on, armed: armed, context: ctx ? ctx.state : 'none',
        music: !!music && !music.paused, musicLoaded: !!music, musicTime: music ? +music.currentTime.toFixed(2) : 0,
        volume: music ? +music.volume.toFixed(2) : 0, pops: popsPlayed, live: popsLive, clock: ctx ? +ctx.currentTime.toFixed(3) : 0
      };
    }
  };
})();
