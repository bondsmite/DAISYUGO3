/* ダセット登場演出：HTML本体とは分離して管理 */
(function () {
  'use strict';

  window.playDasetEntryEffect = function (onComplete) {
    const duration = 4500;
    const overlay = document.createElement('div');
    overlay.id = 'dasetEntryEffect';
    overlay.setAttribute('aria-hidden', 'false');
    overlay.style.cssText = [
      'position:fixed',
      'inset:0',
      'z-index:1000000',
      'display:flex',
      'align-items:center',
      'justify-content:center',
      'overflow:hidden',
      'pointer-events:all',
      'background:radial-gradient(ellipse at center,rgba(39,10,68,.68),rgba(3,2,12,.94) 72%)',
      'backdrop-filter:brightness(.48) blur(2px)',
      'animation:dasetDarkIn .25s ease-out both'
    ].join(';');

    const style = document.createElement('style');
    style.id = 'dasetEntryEffectStyle';
    style.textContent = `
      @keyframes dasetDarkIn { from { opacity:0 } to { opacity:1 } }
      @keyframes dasetNoteFloat {
        0% { transform:translate3d(0,35px,0) rotate(-18deg) scale(.45); opacity:0; filter:blur(5px); }
        18% { opacity:1; filter:blur(0); }
        55% { transform:translate3d(var(--dx),-35px,0) rotate(var(--rot)) scale(1.08); opacity:.95; }
        100% { transform:translate3d(calc(var(--dx) * -0.45),-115px,0) rotate(calc(var(--rot) * -1)) scale(.82); opacity:0; filter:blur(2px); }
      }
      @keyframes dasetPulse {
        0%,100% { opacity:.14; transform:scale(.92); }
        50% { opacity:.42; transform:scale(1.12); }
      }
      #dasetEntryEffect .daset-aura {
        position:absolute; width:min(78vw,680px); aspect-ratio:1;
        border-radius:50%; background:radial-gradient(circle,rgba(151,55,255,.24),rgba(83,21,156,.08) 42%,transparent 70%);
        animation:dasetPulse 1.1s ease-in-out infinite;
      }
      #dasetEntryEffect .daset-note {
        position:absolute; left:var(--x); top:var(--y);
        color:#c78aff; font-family:serif; font-size:var(--size);
        line-height:1; text-shadow:0 0 8px #9b42ff,0 0 22px #8c28ff,0 0 42px #5b16bd;
        animation:dasetNoteFloat var(--time) cubic-bezier(.2,.65,.3,1) var(--delay) both;
        user-select:none;
      }
@media (prefers-reduced-motion: reduce) {
        #dasetEntryEffect .daset-note, #dasetEntryEffect .daset-aura { animation-duration:1ms !important; }
      }
    `;
    overlay.innerHTML = '<div class="daset-aura"></div>';
    const notes = ['♫','♪','♬','♩','♬','♪','♫','♩','♪','♬'];
    notes.forEach((symbol, i) => {
      const note = document.createElement('span');
      note.className = 'daset-note';
      note.textContent = symbol;
      const x = 8 + ((i * 37) % 84);
      const y = 18 + ((i * 23) % 65);
      note.style.setProperty('--x', x + '%');
      note.style.setProperty('--y', y + '%');
      note.style.setProperty('--dx', ((i % 2 ? 1 : -1) * (24 + (i % 4) * 13)) + 'px');
      note.style.setProperty('--rot', ((i % 2 ? 1 : -1) * (12 + i * 3)) + 'deg');
      note.style.setProperty('--size', (34 + (i % 4) * 13) + 'px');
      note.style.setProperty('--time', (1.75 + (i % 3) * .35) + 's');
      note.style.setProperty('--delay', (i * .055) + 's');
      overlay.appendChild(note);
    });

    document.head.appendChild(style);
    document.body.appendChild(overlay);

    const audio = new Audio('./effects/daset-audio.mp3');
    audio.preload = 'auto';
    audio.volume = 1;
    const playResult = audio.play();
    if (playResult && typeof playResult.catch === 'function') {
      playResult.catch(() => {
        console.warn('ダセット演出音声を再生できませんでした。ブラウザの音声再生制限を確認してください。');
      });
    }

    let completed = false;
    const finish = () => {
      if (completed) return;
      completed = true;
      audio.pause();
      try { audio.currentTime = 0; } catch (_) {}
      overlay.remove();
      style.remove();
      if (typeof onComplete === 'function') onComplete();
    };
    window.setTimeout(finish, duration);
  };
})();
