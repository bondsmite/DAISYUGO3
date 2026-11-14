(() => {
  let rewind=null;
  const meteorRuns=new Set();
  const sound=src=>{const a=new Audio(src);a.preload='auto';try{a.play()?.catch(()=>{});}catch{}return a;};
  window.stopHomuraRewind=()=>rewind?.();
  window.playHomuraRewind=(done,duration=5000)=>{
    window.stopHomuraRewind();
    const layer=document.createElement('div');layer.id='homuraRewindOverlay';layer.setAttribute('aria-hidden','true');
    // Pure geometry: no captions, letters, or dial numerals.
    layer.innerHTML='<div class="rewind-vortex"></div><div class="rewind-clock"><i class="rewind-hand long"></i><i class="rewind-hand short"></i><i class="rewind-core"></i></div>';
    for(let i=0;i<32;i++){const shard=document.createElement('i');shard.className='rewind-shard';shard.style.setProperty('--a',(i*137.5)+'deg');shard.style.setProperty('--delay',(-i*.13)+'s');layer.append(shard);}
    document.body.append(layer);
    const a=sound('./effects/assets/homura-rewind.mp3');
    let finished=false;
    const cleanup=()=>{if(finished)return;finished=true;clearTimeout(timer);a.pause();layer.remove();if(rewind===cleanup)rewind=null;};
    const timer=setTimeout(()=>{cleanup();done?.();},Math.max(0,duration));rewind=cleanup;
  };
  window.stopSurtMeteors=()=>{for(const stop of [...meteorRuns])stop();};
  window.playSurtMeteors=()=>{
    const field=document.getElementById('field');const rect=field?.getBoundingClientRect();
    const left=rect?.width?rect.left:innerWidth*.15, top=rect?.height?rect.top:innerHeight*.3;
    const width=rect?.width||innerWidth*.7,height=rect?.height||160;
    const layer=document.createElement('div');layer.className='surt-meteor-overlay';layer.setAttribute('aria-hidden','true');document.body.append(layer);
    const timers=[],audio=[];let stopped=false;
    const stop=()=>{if(stopped)return;stopped=true;timers.forEach(clearTimeout);audio.forEach(a=>a.pause());layer.remove();meteorRuns.delete(stop);};meteorRuns.add(stop);
    for(let i=0;i<5;i++){
      const impact=document.createElement('div');impact.className='surt-impact';impact.style.left=(left+width*(.12+i*.19))+'px';impact.style.top=(top+height*(.35+(i%2)*.3))+'px';
      impact.style.setProperty('--delay',(i*240)+'ms');
      impact.innerHTML='<i class="surt-meteor"></i><i class="surt-burst"></i><i class="surt-shockwave"></i>';
      layer.append(impact);
      timers.push(setTimeout(()=>{if(!stopped)audio.push(sound('./effects/assets/surt-impact.mp3'));},620+i*240));
    }
    timers.push(setTimeout(stop,3000));
  };
})();
