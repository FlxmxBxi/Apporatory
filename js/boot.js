/* Runs before first paint so the page never flashes the wrong theme.
   Order: ?theme= / ?motion= in the address, then the visitor's saved choice,
   then the device's light/dark and reduced-motion settings. */
(function () {
  var d = document.documentElement;
  var themes = ['light', 'dark', 'red-green', 'blue-yellow', 'greyscale', 'high-contrast'];
  var q, s = null, t, m;
  try { q = new URLSearchParams(location.search); } catch (e) { q = { get: function () { return null; } }; }
  try { s = window.localStorage; } catch (e) { s = null; }
  t = q.get('theme');
  if (themes.indexOf(t) < 0) t = s && s.getItem('apporatory:theme');
  if (themes.indexOf(t) < 0) t = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  d.setAttribute('data-theme', t);
  m = q.get('motion');
  if (m !== 'on' && m !== 'off') m = s && s.getItem('apporatory:motion');
  if (m !== 'on' && m !== 'off') m = matchMedia('(prefers-reduced-motion: reduce)').matches ? 'off' : 'on';
  d.setAttribute('data-motion', m);
})();
