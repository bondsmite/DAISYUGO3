/* Luxord: scatter exactly one playing card per targeted L follower. */
(function () {
  'use strict';
  let stopCurrent = null;
  window.stopLuxordEntry = function () { if (stopCurrent) stopCurrent(); };
  window.playLuxordEntry = function (targetCount, done, sourceCardId) {
    window.stopLuxordEntry();
    const origin = sourceCardId && Array.from(document.querySelectorAll('#field .card')).find(el=>el.dataset.id===sourceCardId);
    const rect = origin?.getBoundingClientRect();
    const x = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
    const y = rect ? rect.top + rect.height / 2 : window.innerHeight / 2;
    const layer = document.createElement('div');
    layer.id = 'luxordCardBurst';
    layer.setAttribute('role','status');
    layer.setAttribute('aria-label','ルクソードのカード演出');
    layer.style.cssText = 'position:fixed;inset:0;z-index:999999;pointer-events:auto;overflow:hidden;background:radial-gradient(ellipse at '+((x/window.innerWidth)*100).toFixed(1)+'% '+((y/window.innerHeight)*100).toFixed(1)+'%,rgba(254,213,116,.12),rgba(12,7,32,.25) 66%,rgba(7,4,17,.54))';
    const sourceGlow = document.createElement('div');
    sourceGlow.className='luxord-origin-glow';
    sourceGlow.style.left=x+'px';sourceGlow.style.top=y+'px';
    layer.appendChild(sourceGlow);
    const suits=['♠','♥','♦','♣'];
    const count=Math.max(0,Math.min(300,Math.floor(Number(targetCount)||0)));
    for(let i=0;i<count;i++){
      const angle=(2*Math.PI*i/Math.max(1,count))-Math.PI/2 + (i%3-1)*0.18;
      const radius=(Math.max(window.innerWidth,window.innerHeight)*0.48)*(0.76+0.24*((i*7)%11)/10);
      const endX=Math.cos(angle)*radius;
      const endY=Math.sin(angle)*radius;
      const suit=suits[i%4];
      const red=suit==='♥'||suit==='♦';
      const card=document.createElement('div');
      card.className='luxord-playing-card'+(red?' luxord-red':'');
      card.style.left=x+'px';card.style.top=y+'px';
      card.style.setProperty('--lx',endX.toFixed(1)+'px');
      card.style.setProperty('--ly',endY.toFixed(1)+'px');
      card.style.setProperty('--lx84',(endX*.84).toFixed(1)+'px');
      card.style.setProperty('--ly84',(endY*.84).toFixed(1)+'px');
      card.style.setProperty('--lr',((i%2?1:-1)*(290+(i*47)%390))+'deg');
      card.style.setProperty('--ld',(i%5)*0.035+'s');
      card.textContent=suit;
      layer.appendChild(card);
    }
    const audio=document.createElement('audio');
    audio.src='./effects/assets/luxord-cards.m4a';
    audio.preload='auto'; audio.volume=1; audio.loop=false;
    layer.appendChild(audio);
    document.body.appendChild(layer);
    try { const promise=audio.play(); if(promise?.catch)promise.catch(()=>{}); } catch(e) {}
    let finished=false;
    const cleanup=()=>{
      if(finished)return;
      finished=true;
      clearTimeout(timer);
      try{audio.pause();audio.currentTime=0;}catch(e){}
      layer.remove();
      if(stopCurrent===cleanup)stopCurrent=null;
    };
    const timer=setTimeout(()=>{cleanup();if(typeof done==='function')done();},3000);
    stopCurrent=cleanup;
  };
})();
