let zenmaiScene=null;
function syncZenmaiEntry(){
  const captain=!!G?.pendingCaptainEntry;
  const duration=captain?3000:6500;
  const event=captain?G.pendingCaptainEntry:G?.pendingZenmaiEntry;
  if(zenmaiScene && zenmaiScene.id!==event?.id)zenmaiScene.stop();
  if(!event || zenmaiScene)return;
  const overlay=document.createElement('div');
  overlay.className=captain?'captain-entry':'zenmai-entry';
  overlay.setAttribute('role','status');
  if(captain){
    overlay.setAttribute('aria-label','キャプテン・アメリカの盾');
    overlay.innerHTML='<div class="shield-flight"><i class="captain-shield"></i></div>';
  }else{
  const image=document.createElement('img');
  image.loading='eager';
  image.alt='ぜんまいざむらいの効果発動';
  image.src='./effects1/zenmai.jpg';
  overlay.appendChild(image);
  }
  document.body.appendChild(overlay);
  const voice=new Audio(captain?'./effects2/assets/captain-shield.mp3':'./effects1/zenmai.mp3?v=2');
  const remaining=Math.max(0,Math.min(duration,(captain || activeHumanSeat()===event.driver) ? event.endsAt-Date.now() : duration));
  if(remaining>0){
    if(remaining<duration){try{voice.currentTime=(duration-remaining)/1000;}catch{}}
    try{voice.play()?.catch(()=>{});}catch{}
  }
  const timer=setTimeout(finish,remaining);
  zenmaiScene={id:event.id,stop(){
    clearTimeout(timer);voice.pause();overlay.remove();zenmaiScene=null;
  }};
  function finish(){
    overlay.remove();
    voice.pause();
    const key=captain?'pendingCaptainEntry':'pendingZenmaiEntry';
    if(G?.[key]?.id!==event.id || activeHumanSeat()!==event.driver)return;
    if(!canOperateEffect(event.driver)){setTimeout(finish,50);return;}
    delete G[key];
    locked=false;
    G.actionLocked=false;
    const ids=captain?event.ids:G.players[event.owner].deck.map(card=>card.id);
    if(captain)beginExcelChoice({owner:event.owner,source:'キャプテン・アメリカ',stage:'captain',ids,min:0,max:Math.min(2,ids.length)});
    else if(ids.length)beginExcelChoice({owner:event.owner,source:'ぜんまいざむらい',stage:'search',ids,min:1,max:1});
    afterAction(event.owner);
    notifyGameChanged();
  }
}
