/* Shared three-second Madoka entry; completion belongs to the acting client. */
(function () {
  let cancel = null;
  window.stopMadokaEntry = () => { if (cancel) cancel(); };
  window.playMadokaEntry = function (done) {
    window.stopMadokaEntry();
    const overlay = document.createElement('div');
    overlay.id = 'madokaEntryOverlay';
    overlay.setAttribute('role', 'status');
    overlay.setAttribute('aria-label', '鹿目まどか 登場');
    overlay.style.cssText = 'position:fixed;inset:0;z-index:999999;background:#120b18;display:grid;place-items:center;overflow:hidden;pointer-events:auto';
    const picture = document.createElement('img');
    picture.src = './effects/assets/madoka-entry.jpg';
    picture.alt = '鹿目まどか';
    picture.style.cssText = 'width:100%;height:100%;object-fit:contain;min-height:0';
    overlay.appendChild(picture);
    const sound = document.createElement('audio');
    sound.id = 'madokaEntrySound';
    sound.src = './effects/assets/madoka-entry.mp3';
    sound.preload = 'auto';
    sound.volume = 1;
    sound.playbackRate = 1;
    overlay.appendChild(sound);
    document.body.appendChild(overlay);
    try { sound.play()?.catch(() => {}); } catch (e) {}
    let finished = false;
    const cleanup = () => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      sound.pause();
      overlay.remove();
      if (cancel === cleanup) cancel = null;
    };
    const timer = setTimeout(() => { cleanup(); if (done) done(); }, 3000);
    cancel = cleanup;
  };
})();
