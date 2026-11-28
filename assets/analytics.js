/* Grainroom: Google Analytics 4 with a consent banner.
   1) Put your GA4 Measurement ID below (looks like G-ABC123XYZ9). Until you do, nothing loads and no banner shows.
   2) Google Analytics is loaded ONLY after the visitor clicks Accept. */
(function () {
  'use strict';
  var GA_ID = 'G-XXXXXXXXXX';
  if (!/^G-[A-Z0-9]{6,}$/.test(GA_ID) || GA_ID === 'G-XXXXXXXXXX') return;
  var KEY = 'gr-consent', fr = /^fr/i.test(document.documentElement.lang || '');
  var T = fr ? { t: 'Nous utilisons Google Analytics pour mesurer l’audience. Vos photos ne sont jamais envoyées.', a: 'Accepter', d: 'Refuser', m: 'En savoir plus' }
             : { t: 'We use Google Analytics to measure traffic. Your photos are never uploaded.', a: 'Accept', d: 'Decline', m: 'Learn more' };
  function get() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
  function set(v) { try { localStorage.setItem(KEY, v); } catch (e) { /* private mode */ } }
  var loaded = false;
  function load() {
    if (loaded) return; loaded = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', GA_ID, { anonymize_ip: true });
    var s = document.createElement('script'); s.async = true; s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID; document.head.appendChild(s);
  }
  function banner() {
    if (document.getElementById('gr-consent')) return;
    var b = document.createElement('div'); b.id = 'gr-consent'; b.setAttribute('role', 'dialog'); b.setAttribute('aria-label', 'Cookies');
    b.style.cssText = 'position:fixed;left:12px;right:12px;bottom:12px;max-width:460px;z-index:99999;background:#1a1815;color:#f2efe8;border:1px solid #2e2b26;border-radius:12px;padding:14px 16px;font:14px/1.45 "DM Sans",system-ui,sans-serif;box-shadow:0 10px 40px rgba(0,0,0,.5)';
    b.innerHTML = '<div style="margin-bottom:10px">' + T.t + ' <a href="/privacy" style="color:#ff6b3d">' + T.m + '</a></div>';
    function btn(txt, primary, fn) {
      var x = document.createElement('button'); x.type = 'button'; x.textContent = txt;
      x.style.cssText = 'font:600 13px "DM Sans",system-ui,sans-serif;padding:8px 14px;border-radius:8px;cursor:pointer;margin-right:8px;border:1px solid #2e2b26;' + (primary ? 'background:#ff6b3d;color:#1c0c05;border-color:#ff6b3d' : 'background:transparent;color:#f2efe8');
      x.onclick = function () { fn(); b.remove(); }; return x;
    }
    b.appendChild(btn(T.a, true, function () { set('granted'); load(); }));
    b.appendChild(btn(T.d, false, function () { set('denied'); }));
    document.body.appendChild(b);
  }
  function init() {
    var c = get();
    if (c === 'granted') load(); else if (c !== 'denied') banner();
    document.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('[data-gr-consent]');
      if (a) { e.preventDefault(); banner(); }
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
