/* Apporatory page behaviour: the scroll engine, the theme switcher with its
   whole-page regrade, the Reduce motion setting, the roles strip and the
   Coming soon page. */
(function () {
  'use strict';

  var root = document.documentElement;
  var THEMES = ['light', 'dark', 'red-green', 'blue-yellow', 'greyscale', 'high-contrast'];
  var KEY_THEME = 'apporatory:theme';
  var KEY_MOTION = 'apporatory:motion';
  var store = null;
  try { store = window.localStorage; store.getItem(KEY_THEME); } catch (e) { store = null; }
  var params = new URLSearchParams(location.search);
  var reduceMQ = matchMedia('(prefers-reduced-motion: reduce)');
  var darkMQ = matchMedia('(prefers-color-scheme: dark)');

  function save(key, value) { if (store) try { store.setItem(key, value); } catch (e) { /* private mode */ } }
  function saved(key) { return store ? store.getItem(key) : null; }
  function motionOff() { return root.getAttribute('data-motion') === 'off'; }
  function emit(name, detail) { document.dispatchEvent(new CustomEvent(name, { detail: detail })); }

  if (window.ScrollCraft) window.apporatoryScroll = window.ScrollCraft.mount(document.body);

  // ------------------------------------------------------------ wordmark --
  var word = document.querySelector('.wordmark');
  if (word && !motionOff()) word.classList.add('is-popping');

  // On narrow screens the symbol plane is anchored to the bottom of the name.
  var heroInner = document.querySelector('.hero__inner');
  var letters = document.querySelector('.wordmark__letters');
  var placePlane = function () {
    if (!heroInner || !letters) return;
    var bottom = letters.getBoundingClientRect().bottom - heroInner.getBoundingClientRect().top;
    heroInner.style.setProperty('--word-bottom', Math.round(bottom) + 'px');
  };
  placePlane();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(placePlane);
  window.addEventListener('resize', placePlane);

  // -------------------------------------------------------- theme panel --
  var toggle = document.getElementById('theme-toggle');
  var panel = document.getElementById('theme-panel');
  var radios = panel ? Array.prototype.slice.call(panel.querySelectorAll('input[name="theme"]')) : [];
  var motionSwitch = document.getElementById('motion-switch');
  var regradeTimer = 0;
  var lastOpener = null;

  function currentTheme() { return root.getAttribute('data-theme') || 'light'; }
  function syncControls() {
    radios.forEach(function (r) { r.checked = r.value === currentTheme(); });
    if (motionSwitch) motionSwitch.setAttribute('aria-checked', motionOff() ? 'true' : 'false');
  }

  function setTheme(name, origin, remember) {
    if (THEMES.indexOf(name) < 0 || name === currentTheme()) return;
    if (remember) save(KEY_THEME, name);
    var swap = function () {
      root.setAttribute('data-theme', name);
      syncControls();
      emit('apporatory:theme', { theme: name });
    };
    if (motionOff()) { swap(); return; }
    if (document.startViewTransition) {
      var box = (origin || toggle || document.body).getBoundingClientRect();
      root.style.setProperty('--regrade-x', Math.round(box.left + box.width / 2) + 'px');
      root.style.setProperty('--regrade-y', Math.round(box.top + box.height / 2) + 'px');
      document.startViewTransition(swap);
      return;
    }
    root.classList.add('is-regrading');
    swap();
    clearTimeout(regradeTimer);
    regradeTimer = setTimeout(function () { root.classList.remove('is-regrading'); }, 460);
  }

  function setMotion(off, remember) {
    root.setAttribute('data-motion', off ? 'off' : 'on');
    if (remember) save(KEY_MOTION, off ? 'off' : 'on');
    syncControls();
    if (word && off) word.classList.remove('is-popping');
    emit('apporatory:motion', { off: off });
  }

  function onKey(e) {
    if (e.key === 'Escape') { e.preventDefault(); closePanel(true); }
  }
  function onOutside(e) {
    if (!panel.contains(e.target) && !(toggle && toggle.contains(e.target))) closePanel(false);
  }
  function openPanel(opener) {
    if (!panel) return;
    lastOpener = opener || toggle;
    syncControls();
    panel.hidden = false;
    if (toggle) toggle.setAttribute('aria-expanded', 'true');
    var checked = panel.querySelector('input[name="theme"]:checked') || radios[0];
    if (checked) checked.focus();
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onOutside, true);
  }
  function closePanel(returnFocus) {
    if (!panel || panel.hidden) return;
    panel.hidden = true;
    if (toggle) toggle.setAttribute('aria-expanded', 'false');
    document.removeEventListener('keydown', onKey);
    document.removeEventListener('pointerdown', onOutside, true);
    if (returnFocus && lastOpener) lastOpener.focus();
  }

  if (toggle && panel) {
    toggle.addEventListener('click', function () {
      if (panel.hidden) openPanel(toggle); else closePanel(true);
    });
    radios.forEach(function (r) {
      r.addEventListener('change', function () { setTheme(r.value, r.closest('.theme-opt'), true); });
    });
    if (motionSwitch) {
      motionSwitch.addEventListener('click', function () { setMotion(!motionOff(), true); });
    }
    var done = panel.querySelector('[data-close-themes]');
    if (done) done.addEventListener('click', function () { closePanel(true); });
    panel.addEventListener('focusout', function (e) {
      if (!panel.hidden && e.relatedTarget && !panel.contains(e.relatedTarget) && e.relatedTarget !== toggle) closePanel(false);
    });
    Array.prototype.forEach.call(document.querySelectorAll('[data-open-themes]'), function (b) {
      b.addEventListener('click', function () { openPanel(b); });
    });
  }
  syncControls();

  // Until the visitor chooses, follow the device.
  var follow = function (mq, fn) {
    if (mq.addEventListener) mq.addEventListener('change', fn); else if (mq.addListener) mq.addListener(fn);
  };
  follow(darkMQ, function () {
    if (saved(KEY_THEME) || params.get('theme')) return;
    setTheme(darkMQ.matches ? 'dark' : 'light', null, false);
  });
  follow(reduceMQ, function () {
    if (saved(KEY_MOTION) || params.get('motion')) return;
    setMotion(reduceMQ.matches, false);
  });

  // -------------------------------------------------------- roles strip --
  var roles = document.querySelector('[data-roles]');
  if (roles) {
    var track = roles.querySelector('.roles__track');
    var list = roles.querySelector('.roles__list');
    var viewport = roles.querySelector('.roles__viewport');
    var rolesPause = roles.querySelector('[data-roles-pause]');
    var echo = function (source) {
      var c = source.cloneNode(true);
      c.setAttribute('aria-hidden', 'true');
      c.removeAttribute('aria-label');
      c.removeAttribute('id');
      return c;
    };
    track.appendChild(echo(list));

    // A second row, in a different order, drifting the other way. Screen
    // readers only ever hear the first list.
    var listB = echo(list);
    var items = Array.prototype.slice.call(listB.children);
    items.slice(0, Math.floor(items.length / 2)).forEach(function (li) { listB.appendChild(li); });
    var trackB = document.createElement('div');
    trackB.className = 'roles__track roles__track--b';
    trackB.setAttribute('aria-hidden', 'true');
    trackB.appendChild(listB);
    trackB.appendChild(echo(listB));
    viewport.appendChild(trackB);

    var pace = function () {
      var speed = window.innerWidth < 640 ? 26 : 36; // px per second: slow enough to read
      [[track, list], [trackB, listB]].forEach(function (pair, i) {
        var width = pair[1].getBoundingClientRect().width;
        if (width) pair[0].style.setProperty('--roles-dur', Math.round(width / (speed * (i ? 0.8 : 1))) + 's');
      });
    };
    pace();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(pace);
    var paceTimer = 0;
    window.addEventListener('resize', function () { clearTimeout(paceTimer); paceTimer = setTimeout(pace, 200); });

    var setPaused = function (on) {
      roles.classList.toggle('is-paused', on);
      if (rolesPause) rolesPause.setAttribute('aria-pressed', on ? 'true' : 'false');
    };
    if (rolesPause) rolesPause.addEventListener('click', function () { setPaused(!roles.classList.contains('is-paused')); });
    viewport.addEventListener('pointerup', function (e) {
      if (e.pointerType === 'touch' || e.pointerType === 'pen') setPaused(!roles.classList.contains('is-paused'));
    });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        roles.classList.toggle('is-offscreen', !entries[entries.length - 1].isIntersecting);
      }).observe(viewport);
    }
  }

  // ------------------------------------------- scroll states for the harness --
  // The hero's movement is CSS driven from --sc-p, so publish what it paints.
  var stages = Array.prototype.slice.call(document.querySelectorAll('[data-sc-verify-state]'));
  if (stages.length) {
    var pending = false;
    var publish = function () {
      pending = false;
      stages.forEach(function (stage) {
        var act = stage.closest('[data-sc-act]');
        var p = act ? parseFloat(act.style.getPropertyValue('--sc-p')) || 0 : 0;
        var still = motionOff() || reduceMQ.matches;
        var value = still ? 'still' : 'plane ' + (1 - p * 0.12).toFixed(2) + ' word ' + (1 - p * 0.06).toFixed(3);
        if (stage.getAttribute('data-sc-verify-state') !== value) stage.setAttribute('data-sc-verify-state', value);
      });
    };
    window.addEventListener('scroll', function () {
      if (!pending) { pending = true; requestAnimationFrame(publish); }
    }, { passive: true });
    publish();
  }

  // --------------------------------------------------------- coming soon --
  var soonTitle = document.querySelector('[data-soon-title]');
  if (soonTitle) {
    var pages = { explore: 'Explore', 'log-in': 'Log in', about: 'About', contact: 'Contact', privacy: 'Privacy' };
    var page = pages[params.get('page')];
    if (page) {
      soonTitle.textContent = page + ' is coming soon';
      document.title = page + ' is coming soon · Apporatory';
    }
  }
})();
