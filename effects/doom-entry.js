/* Doctor Doom five-second screen cut-in; gameplay callback only after natural finish. */
(() => {
  'use strict';
  let active=null;
  window.stopDoomEntry=()=>{
    if(!active)return;
    const session=active; active=null;
    clearTimeout(session.timer);
    session.sound.pause();
    session.overlay.remove();
  };
  window.playDoomEntry=(onComplete)=>{
    window.stopDoomEntry();
    if(!document.getElementById('doomEntryStyles')){
      const style=document.createElement('style');style.id='doomEntryStyles';
      style.textContent=`#doomEntryOverlay{position:fixed;inset:0;z-index:1000025;display:flex;align-items:center;justify-content:center;overflow:hidden;background:#090d0e;animation:doomFade .25s ease-out both}
        #doomEntryOverlay img{width:100%;height:100%;max-width:100vw;max-height:100vh;object-fit:contain;animation:doomZoom 5s ease-out both}
        @keyframes doomFade{from{opacity:0}to{opacity:1}}@keyframes doomZoom{from{transform:scale(1.08);filter:brightness(.63)}35%{filter:brightness(1.16)}to{transform:scale(1);filter:brightness(1)}}
        @media(prefers-reduced-motion:reduce){#doomEntryOverlay,#doomEntryOverlay img{animation:none}}`;
      document.head.appendChild(style);
    }
    const overlay=document.createElement('div');overlay.id='doomEntryOverlay';
    overlay.setAttribute('role','status');overlay.setAttribute('aria-label','ドクタードゥーム 登場演出');
    const image=document.createElement('img');image.src='./effects/assets/doctor-doom-entry.webp';image.alt='ドクタードゥーム';
    overlay.appendChild(image);document.body.appendChild(overlay);
    const sound=new Audio('./effects/assets/doctor-doom-voice.m4a');sound.preload='auto';sound.loop=false;
    try{const p=sound.play();if(p?.catch)p.catch(()=>{});}catch(e){}
    const session={overlay,sound,timer:null};active=session;
    session.timer=setTimeout(()=>{
      if(active!==session)return;
      active=null;sound.pause();overlay.remove();
      if(typeof onComplete==='function')onComplete();
    },5000);
  };
})();
