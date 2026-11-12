/* Shared 3.5-second Ava entry; completion belongs to the acting client. */
(function () {
  let cancel = null;
  window.stopAvaEntry = () => { if (cancel) cancel(); };
  window.playAvaEntry = function (done) {
    window.stopAvaEntry();
    const overlay = document.createElement('div');
    overlay.id = 'avaEntryOverlay';
    overlay.setAttribute('role', 'status');
    overlay.setAttribute('aria-label', 'アヴァ 登場');
    overlay.style.cssText = 'position:fixed;inset:0;z-index:999999;background:#1a1022;display:grid;place-items:center;overflow:hidden;pointer-events:auto';
    const picture = document.createElement('img');
    picture.src = './effects/assets/ava-entry.jpg';
    picture.alt = 'アヴァ';
    picture.style.cssText = 'width:100%;height:100%;object-fit:contain;min-height:0';
    overlay.appendChild(picture);
    const sound = document.createElement('audio');
    sound.id = 'avaEntrySound';
    sound.src = './effects/assets/ava-entry.m4a';
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
    const timer = setTimeout(() => { cleanup(); if (done) done(); }, 3500);
    cancel = cleanup;
  };
})();
