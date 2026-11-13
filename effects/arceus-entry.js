/* Shared Arceus 10s entry + one-shot battle theme. Local actor owns game progression. */
(function(){
  'use strict';
  let activeOverlay = null;
  function removeOverlay(){
    if(activeOverlay){activeOverlay.remove();activeOverlay=null;}
  }
  window.stopArceusEntry = removeOverlay;
  window.playArceusEntry = function(done){
    removeOverlay();
    const root=document.createElement('div');
    root.id='arceusEntryOverlay';
    root.setAttribute('role','status');
    root.setAttribute('aria-label','アルセウス降臨・10秒間の登場演出');
    root.innerHTML='<div class="arceus-sky"></div><div class="arceus-aurora"></div><div class="arceus-stars"></div><div class="arceus-steps"></div><div class="arceus-rays"></div><div class="arceus-portal"><i class="arceus-ring" style="--inset:2%;--stroke:4px;--op:.85;--speed:18s"></i><i class="arceus-ring rune" style="--inset:16%;--stroke:3px;--op:.9;--speed:12s"></i><i class="arceus-ring" style="--inset:30%;--stroke:5px;--op:1;--speed:8s"></i></div><div class="arceus-halo"></div><div class="arceus-emblem"><svg viewBox="0 0 240 240" aria-hidden="true"><g fill="none" stroke="#fff8cf" stroke-width="5"><path d="M120 9 L142 65 L120 87 L98 65 Z M231 120 L175 142 L153 120 L175 98 Z M120 231 L98 175 L120 153 L142 175 Z M9 120 L65 98 L87 120 L65 142 Z"/><path d="M120 28 L160 80 L211 120 L160 160 L120 212 L80 160 L29 120 L80 80 Z" stroke-width="2"/><circle cx="120" cy="120" r="52" stroke-width="7"/><circle cx="120" cy="120" r="27" stroke-width="3"/></g><circle cx="120" cy="120" r="12" fill="#ffffff"/></svg></div><div class="arceus-caption">創造の光、降臨</div><div class="arceus-flash"></div>';
    const stars=root.querySelector('.arceus-stars');
    for(let i=0;i<95;i++){
      const star=document.createElement('i');
      star.style.setProperty('--x',((i*73.29)%100).toFixed(2)+'%');
      star.style.setProperty('--y',((i*41.71+i*i*.03)%100).toFixed(2)+'%');
      star.style.setProperty('--s',(1+(i%4))+'px');
      star.style.setProperty('--d',(1.1+(i%9)*.28)+'s');
      star.style.setProperty('--delay',((i%13)*.21)+'s');
      stars.appendChild(star);
    }
    const steps=root.querySelector('.arceus-steps');
    for(let i=0;i<13;i++){
      const stair=document.createElement('i');
      stair.style.setProperty('--bottom',(5+i*6.3)+'%');
      stair.style.setProperty('--width',Math.max(6,83-i*5.6)+'%');
      stair.style.setProperty('--height',Math.max(4,33-i*2.1)+'px');
      steps.appendChild(stair);
    }
    const rays=root.querySelector('.arceus-rays');
    for(let i=0;i<24;i++){
      const ray=document.createElement('i');
      ray.style.setProperty('--angle',i*15+'deg');
      rays.appendChild(ray);
    }
    document.body.appendChild(root);
    activeOverlay=root;
    // The game engine's shared BGM manager stops *all* previous themes,
    // plays the cry at t=0 and the one-shot song at t=10s, then restores normal BGM.
    // If a new character theme interrupts, cleanup removes the cut-in immediately.
    if(typeof window.startCharacterBgm!=='function'){
      const voice=new Audio('./effects/assets/arceus-cry.mp3');
      voice.play()?.catch(()=>{});
      const timer=setTimeout(()=>{voice.pause();removeOverlay();if(done)done();},10000);
      window.stopArceusEntry=()=>{clearTimeout(timer);voice.pause();removeOverlay();};
      return;
    }
    window.startCharacterBgm('./effects/assets/arceus-battle.mp3',{
      introSource:'./effects/assets/arceus-cry.mp3',
      introDurationMs:10000,
      baseVolume:0.7,
      introFinished:()=>{removeOverlay();if(done)done();},
      cleanup:removeOverlay
    });
  };
})();
