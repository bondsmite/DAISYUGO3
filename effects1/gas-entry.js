// Each screen plays the introduction. Only the seat driving the play resolves the card.
let lastGasEntryKey='';
function syncGasEntry(){
  const event=G?.pendingGasEntry;
  if(!event)return;
  const key=G.matchId+':'+event.sequence;
  if(key===lastGasEntryKey)return;
  lastGasEntryKey=key;
  const stage=document.createElement('div');
  stage.className='gas-entry';
  stage.setAttribute('role','status');
  stage.setAttribute('aria-label','ガス人間：白い煙が場を駆け巡る');
  const rect=document.getElementById('field').getBoundingClientRect();
  const center=Math.min(innerHeight*.74,Math.max(innerHeight*.22,rect.top+rect.height/2));
  stage.style.setProperty('--field-y',center+'px');
  for(let i=0;i<18;i++){
    const plume=document.createElement('i');
    plume.style.setProperty('--lag',(i*82)+'ms');
    plume.style.setProperty('--shift',(i%7-3)*9+'px');
    stage.appendChild(plume);
  }
  document.body.appendChild(stage);
  const song=new Audio('./effects1/gas-ellie-bgm.mp3');
  song.preload='auto';
  song.load();
  startCharacterBgm('./effects1/gas-ellie-bgm.mp3',{
    songAudio:song,
    introSource:'./effects1/gas-wish.mp3',
    introDurationMs:7500,
    introFinished:()=>stage.remove(),
    cleanup:()=>stage.remove()
  });
  if(event.driver===activeHumanSeat()){
    // The match timer is independent of sound permissions and audio loading.
    setTimeout(function finish(){
      if(!G?.pendingGasEntry || G.matchId+':'+G.pendingGasEntry.sequence!==key)return;
      if(!canOperateEffect(event.driver)){setTimeout(finish,50);return;}
      const played=G.field.find(entry=>entry.card.id===event.cardId);
      delete G.pendingGasEntry;
      locked=false;
      G.actionLocked=false;
      if(played && !G.winner)resolveFanfare(event.owner,played.card);
      if(!hasPendingEffect())checkWinner();
      if(!G.winner)afterAction(event.owner);else render();
      notifyGameChanged();
    },7500);
  }
}

function showGasDestruction(modal){
  for(const card of modal.querySelectorAll('.result-cards .card')){
    const cloud=document.createElement('span');
    cloud.className='gas-burst';
    cloud.setAttribute('aria-hidden','true');
    for(let i=0;i<9;i++){
      const puff=document.createElement('i');
      const angle=i*2*Math.PI/9;
      puff.style.setProperty('--dx',Math.cos(angle)*68+'px');
      puff.style.setProperty('--dy',Math.sin(angle)*62+'px');
      cloud.appendChild(puff);
    }
    card.appendChild(cloud);
  }
}
