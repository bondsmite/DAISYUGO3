/* Seven-second image and voice entry; shared by local and online matches. */
(()=>{
  let cancel=null;
  window.stopTomodachiEntry=()=>{if(cancel)cancel();};
  window.playTomodachiEntry=function(done){
    window.stopTomodachiEntry();
    const overlay=document.createElement('div');overlay.id='tomodachiEntryOverlay';
    overlay.setAttribute('role','status');overlay.setAttribute('aria-label','ともだち：ケンヂ君');
    overlay.style.cssText='position:fixed;inset:0;z-index:1000000;background:#000;display:flex;align-items:center;justify-content:center;overflow:hidden;pointer-events:auto';
    overlay.innerHTML='<img src="./effects/assets/tomodachi.jpg" alt="ともだち" style="display:block;width:100%;height:100%;object-fit:contain">';
    document.body.appendChild(overlay);
    const sound=new Audio('./effects/assets/tomodachi-voice.m4a');sound.preload='auto';sound.volume=1;sound.loop=false;
    try{const p=sound.play();if(p?.catch)p.catch(()=>{});}catch(e){}
    const clear=()=>{overlay.remove();sound.pause();sound.currentTime=0;};
    const timer=setTimeout(()=>{cancel=null;clear();window.startTomodachiBgm?.();done?.();},7000);
    cancel=()=>{clearTimeout(timer);clear();cancel=null;};
  };
})();
