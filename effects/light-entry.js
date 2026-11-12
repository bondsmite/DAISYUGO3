/* Shared Light Yagami Death Note confirmation cut-in. No gameplay state is modified here. */
(() => {
  'use strict';
  let active=null;
  window.stopLightEntry = () => {
    if(!active)return;
    const session=active;
    active=null;
    clearTimeout(session.timer);
    session.sound.pause();
    session.overlay.remove();
    // Canceled animations must not advance an abandoned match.
  };
  window.playLightEntry = (sequence, onComplete, destroyedCount=1) => {
    if(active?.sequence===sequence)return;
    window.stopLightEntry();
    let style=document.getElementById('lightEntryStyles');
    if(!style){
      style=document.createElement('style');style.id='lightEntryStyles';
      style.textContent=`
        #lightEntryOverlay{position:fixed;inset:0;z-index:1000020;display:flex;align-items:center;justify-content:center;overflow:hidden;background:#040309;animation:lightCutin .16s ease-out both;}
        #lightEntryOverlay img{display:block;width:100%;height:100%;max-width:100vw;max-height:100vh;object-fit:contain;animation:lightZoom 3s ease-out both;}
        @keyframes lightCutin{from{opacity:0}to{opacity:1}}
        @keyframes lightZoom{from{transform:scale(1.09);filter:brightness(.6)}35%{filter:brightness(1.12)}to{transform:scale(1);filter:brightness(1)}}
        @media(prefers-reduced-motion:reduce){#lightEntryOverlay,#lightEntryOverlay img{animation:none}}
      `;
      document.head.appendChild(style);
    }
    const failed=Number(destroyedCount)===0;
    const overlay=document.createElement('div');overlay.id='lightEntryOverlay';
    overlay.setAttribute('role','status');overlay.setAttribute('aria-label',failed?'夜神月 破壊失敗 演出':'夜神月 計画通り 演出');
    const img=document.createElement('img');
    img.src=failed?'./effects/assets/light-yagami-failed.jpg':'./effects/assets/light-yagami-entry.jpg';
    img.alt=failed?'夜神月 ふざけるな':'夜神月 計画通り';
    overlay.appendChild(img);document.body.appendChild(overlay);
    const sound=new Audio(failed?'./effects/assets/light-yagami-failed.m4a':'./effects/assets/light-yagami-plan.m4a');sound.preload='auto';sound.loop=false;
    const play=sound.play();if(play?.catch)play.catch(()=>{});
    const session={sequence,overlay,sound,timer:null};active=session;
    session.timer=setTimeout(()=>{
      if(active!==session)return;
      active=null;
      sound.pause();overlay.remove();
      if(typeof onComplete==='function')onComplete();
    },failed?3000:2000);
  };
})();
