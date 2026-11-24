/* Seven-second image and voice entry; shared by local and online matches. */
(()=>{
  let cancel=null;
  window.stopTomodachiEntry=()=>{if(cancel)cancel();};
  window.playTomodachiEntry=function(done){
    window.stopTomodachiEntry();
    const overlay=document.createElement('div');overlay.id='tomodachiEntryOverlay';
    overlay.setAttribute('role','status');overlay.setAttribute('aria-label','ともだち：ケンヂ君');
    overlay.style.cssText='position:fixed;inset:0;z-index:1000000;background:#000;display:flex;align-items:center;justify-content:center;overflow:hidden;pointer-events:auto';
    overlay.innerHTML='<img src="./effects1/tomodachi.jpg" alt="ともだち" style="display:block;width:100%;height:100%;object-fit:contain">';
    document.body.appendChild(overlay);
    const song=new Audio('./effects1/tomodachi-bgm.mp3');
    song.preload='auto';
    song.load();
    const session=window.startTomodachiBgm({
      songAudio:song,
      introSource:'./effects1/tomodachi-voice.mp3',
      introDurationMs:7000,
      introFinished:()=>overlay.remove(),
      cleanup:()=>overlay.remove()
    });
    // The game clock also advances when audio is muted or interrupted.
    const timer=setTimeout(()=>{
      cancel=null;
      overlay.remove();
      done?.();
    },7000);
    cancel=()=>{
      clearTimeout(timer);
      cancel=null;
      overlay.remove();
      if(zomaBgmSession===session)cancelZomaBgm();
    };
  };
})();
