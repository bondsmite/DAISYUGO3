/* Shared Sano Manjirou still-image entry, displayed during the voice line only. */
(() => {
  'use strict';
  let hideCurrent = null;
  function ensureStyle() {
    if (document.getElementById('sanoEntryStyle')) return;
    const style = document.createElement('style');
    style.id = 'sanoEntryStyle';
    style.textContent = `
      #sanoEntryOverlay { position:fixed; inset:0; z-index:1000002; display:flex;
        justify-content:center; align-items:center; overflow:hidden; pointer-events:auto;
        background:radial-gradient(ellipse at 50% 35%,#1a2b36 0%,#020508 85%);
        animation:sanoEntryIn .22s ease-out both; }
      #sanoEntryOverlay img { width:100%; height:100%; max-width:100vw; max-height:100vh;
        object-fit:contain; display:block; animation:sanoEntryZoom 7s ease-out both; }
      #sanoEntryOverlay.sano-exit { opacity:0; transition:opacity .22s ease-in; pointer-events:none; }
      @keyframes sanoEntryIn { from{opacity:0} to{opacity:1} }
      @keyframes sanoEntryZoom { from{transform:scale(1.045);filter:brightness(.76)}
        30%{filter:brightness(1)} to{transform:scale(1);filter:brightness(1)} }
      @media(prefers-reduced-motion:reduce) { #sanoEntryOverlay, #sanoEntryOverlay img{animation:none} }
    `;
    document.head.appendChild(style);
  }
  window.hideSanoEntryImage = () => { if (hideCurrent) hideCurrent(); };
  window.showSanoEntryImage = () => {
    window.hideSanoEntryImage();
    ensureStyle();
    const overlay = document.createElement('div');
    overlay.id = 'sanoEntryOverlay';
    overlay.setAttribute('role', 'status');
    overlay.setAttribute('aria-label', '佐野万次郎 登場演出');
    const image = document.createElement('img');
    image.src = './effects/assets/sano-manjirou-entry.jpg';
    image.alt = '佐野万次郎';
    overlay.appendChild(image);
    document.body.appendChild(overlay);
    let hidden = false;
    const hide = () => {
      if (hidden) return;
      hidden = true;
      if (hideCurrent === hide) hideCurrent = null;
      overlay.classList.add('sano-exit');
      window.setTimeout(() => overlay.remove(), 240);
    };
    hideCurrent = hide;
    return hide;
  };
})();
