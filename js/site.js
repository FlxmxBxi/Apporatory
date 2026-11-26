/* Apporatory page behaviour: the scroll engine, the theme switcher with its
   whole-page regrade, Reduce motion and the pause controls, the roles strip,
   the click shockwave and the Coming soon page. */
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

  var word = document.querySelector('.wordmark');
  if (word && !motionOff()) word.classList.add('is-popping');

  // --------------------------------------------------------- pause motion --
  // Every pause button controls the same thing: the grid, the symbols and the
  // jobs strip all stop together.
  var pauseButtons = Array.prototype.slice.call(document.querySelectorAll('[data-motion-pause]'));
  function setPaused(on) {
    root.classList.toggle('is-motion-paused', on);
    pauseButtons.forEach(function (b) { b.setAttribute('aria-pressed', on ? 'true' : 'false'); });
    emit('apporatory:pause', { paused: on });
  }
  pauseButtons.forEach(function (b) {
    b.addEventListener('click', function () { setPaused(!root.classList.contains('is-motion-paused')); });
  });
  var syncHidden = function () { root.classList.toggle('is-hidden', document.hidden); };
  document.addEventListener('visibilitychange', syncHidden);
  syncHidden();

  // -------------------------------------------------------------- panels --
  // The Themes and Sound panels: one open at a time; Escape, Done or a click
  // outside closes it, and focus goes back to whatever opened it.
  var openPanelApi = null;
  function makePanel(button, box, firstFocus, onOpen) {
    if (!button || !box) return null;
    var opener = null;
    var api = {};
    function onKey(e) { if (e.key === 'Escape') { e.preventDefault(); api.close(true); } }
    function onOutside(e) { if (!box.contains(e.target) && !button.contains(e.target)) api.close(false); }
    api.open = function (from) {
      if (openPanelApi && openPanelApi !== api) openPanelApi.close(false);
      opener = from || button;
      if (onOpen) onOpen();
      box.hidden = false;
      button.setAttribute('aria-expanded', 'true');
      var f = firstFocus();
      if (f) f.focus();
      document.addEventListener('keydown', onKey);
      document.addEventListener('pointerdown', onOutside, true);
      openPanelApi = api;
    };
    api.close = function (returnFocus) {
      if (box.hidden) return;
      box.hidden = true;
      button.setAttribute('aria-expanded', 'false');
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onOutside, true);
      if (openPanelApi === api) openPanelApi = null;
      if (returnFocus && opener) opener.focus();
    };
    button.addEventListener('click', function () { if (box.hidden) api.open(button); else api.close(true); });
    Array.prototype.forEach.call(box.querySelectorAll('[data-close-themes], [data-close-panel]'), function (b) {
      b.addEventListener('click', function () { api.close(true); });
    });
    box.addEventListener('focusout', function (e) {
      if (!box.hidden && e.relatedTarget && !box.contains(e.relatedTarget) && e.relatedTarget !== button) api.close(false);
    });
    return api;
  }

  // -------------------------------------------------------- theme panel --
  var toggle = document.getElementById('theme-toggle');
  var panel = document.getElementById('theme-panel');
  var radios = panel ? Array.prototype.slice.call(panel.querySelectorAll('input[name="theme"]')) : [];
  var motionSwitch = document.getElementById('motion-switch');
  var regradeTimer = 0;

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

  var themesPanel = makePanel(toggle, panel, function () {
    return panel.querySelector('input[name="theme"]:checked') || radios[0];
  }, syncControls);
  if (themesPanel) {
    radios.forEach(function (r) {
      r.addEventListener('change', function () { setTheme(r.value, r.closest('.theme-opt'), true); });
    });
    if (motionSwitch) motionSwitch.addEventListener('click', function () { setMotion(!motionOff(), true); });
    Array.prototype.forEach.call(document.querySelectorAll('[data-open-themes]'), function (b) {
      b.addEventListener('click', function () { themesPanel.open(b); });
    });
  }
  makePanel(document.getElementById('sound-toggle'), document.getElementById('sound-panel'), function () {
    return document.getElementById('sound-switch');
  });
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

    // A tap holds the strip still for reading; another tap lets it go.
    viewport.addEventListener('pointerup', function (e) {
      if (e.pointerType === 'touch' || e.pointerType === 'pen') roles.classList.toggle('is-paused');
    });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        roles.classList.toggle('is-offscreen', !entries[entries.length - 1].isIntersecting);
      }).observe(viewport);
    }
  }

  // ----------------------------------------------------- click shockwave --
  var INTERACTIVE = 'a, button, input, select, textarea, label, summary, [role="button"], [role="switch"], [tabindex], .theme-panel, .bar__tools, .roles__viewport';
  var rings = [];
  document.addEventListener('click', function (e) {
    if (motionOff() || root.classList.contains('is-motion-paused') || e.detail === 0) return;
    if (e.target.closest && e.target.closest(INTERACTIVE)) return;
    var sel = window.getSelection && window.getSelection();
    if (sel && !sel.isCollapsed) return;
    var shock = document.createElement('span');
    shock.className = 'shock';
    shock.setAttribute('aria-hidden', 'true');
    shock.style.transform = 'translate(' + e.clientX + 'px, ' + e.clientY + 'px)';
    shock.innerHTML = '<i></i><i></i><i></i>';
    document.body.appendChild(shock);
    emit('apporatory:pop', { kind: 'shock' });
    rings.push(shock);
    if (rings.length > 8) rings.shift().remove();
    setTimeout(function () {
      shock.remove();
      var i = rings.indexOf(shock);
      if (i >= 0) rings.splice(i, 1);
    }, 760);
  });

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
        var value = still ? 'still' : 'plane ' + (1 - p * 0.12).toFixed(2) + ' copy ' + (p * -3).toFixed(2);
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
