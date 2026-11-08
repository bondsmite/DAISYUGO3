/* Shared presentation for solo, three-seat and four-seat matches. All queue data is serializable. */
function tribeIconHtml(tribe) {
  const names=['神種族','英種族','物種族','龍種族','霊種族','魔種族'], i=names.indexOf(tribe);
  return i<0?'':'<span class="tribe-icon tribe-'+i+'" role="img" aria-label="'+tribe+'" title="'+tribe+'"></span>';
}
function resultZones(){return G.players.map(p=>({hand:p.hand.map(c=>({...c})),deck:p.deck.map(c=>({...c})),grave:p.grave.map(c=>({...c}))}));}
function startEffectResults(owner,source){G.effectResultContext={owner,source,zones:resultZones(),field:G.field.map(x=>({player:x.player,card:{...x.card}}))};}
function collectEffectResults(keep=false){
  const q=G?.effectResultContext;if(!q)return;
  G.effectResultBuffer=G.effectResultBuffer||[];
  G.players.forEach((p,i)=>{
    const old=q.zones[i];if(!old)return;
    const acquired=p.hand.filter(c=>!q.directDrawIds?.includes(c.id)&&!old.hand.some(x=>x.id===c.id)&&[...old.deck,...old.grave].some(x=>x.id===c.id));
    const destroyed=p.grave.filter(c=>!old.grave.some(x=>x.id===c.id)&&[...old.hand,...old.deck,...(q.field||[]).filter(x=>x.player===i).map(x=>x.card)].some(x=>x.id===c.id));
    for(const [cards,verb] of [[acquired,'を手札に加えた。'],[destroyed,'を破壊した。']])if(cards.length){
      const message=p.name+'：'+q.source+'の効果で'+cards.map(c=>'「'+c.name+'」').join('、')+verb;
      G.effectResultBuffer.push({source:q.source,player:i,cards:cards.map(c=>({...c})),message});
    }
  });
  q.zones=resultZones();q.field=G.field.map(x=>({player:x.player,card:{...x.card}}));
  if(!keep&&!locked&&!hasPendingEffect())G.effectResultContext=null;
}
function startResultPresentation(owner){
  if(!G.effectResultBuffer?.length)return false;
  const events=G.effectResultBuffer.splice(0);
  G.resultPresentation={id:(G.resultPresentation?.id||0)+1,active:true,driver:activeHumanSeat(),owner,events};
  locked=true;render();return true;
}
let resultDisplayKey='',resultDisplayTimer=null,resultDisplayIndex=0;
function renderResultPresentation(){
  const q=G?.resultPresentation;
  if(!q){clearTimeout(resultDisplayTimer);resultDisplayKey='';document.getElementById('effectResultModal')?.remove();return;}
  const key=(G.matchId||'solo')+':'+q.id;
  if(key===resultDisplayKey)return;
  resultDisplayKey=key;resultDisplayIndex=0;clearTimeout(resultDisplayTimer);
  const show=()=>{
    if(!G || ((G.matchId||'solo')+':'+G.resultPresentation?.id)!==key)return;
    if(resultDisplayIndex>=q.events.length){
      document.getElementById('effectResultModal')?.remove();
      if(G.resultPresentation.active && (!onlineMode||activeHumanSeat()===q.driver)){
        // Wait for the queue's initial transaction to complete before advancing its owner.
        if(window.DAISHUGO_ONLINE_ADAPTER?.busy){resultDisplayTimer=setTimeout(show,30);return;}
        G.resultPresentation.active=false;locked=false;G.actionLocked=false;
        checkWinner();afterAction(q.owner);render();
      }
      return;
    }
    const e=q.events[resultDisplayIndex++];
    let modal=document.getElementById('effectResultModal');
    if(!modal){modal=document.createElement('div');modal.id='effectResultModal';modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');document.body.appendChild(modal);}
    modal.innerHTML='<section><p class="result-count">効果処理 '+resultDisplayIndex+' / '+q.events.length+'</p><h2>'+escapeHtml(e.message)+'</h2><div class="result-cards">'+e.cards.map(c=>cardHtml(c,false)).join('')+'</div></section>';
    resultDisplayTimer=setTimeout(show,3000);
  };
  // A completed historical queue must not replay on reconnect.
  if(q.active)show();
}
function placeUnifiedPickers(){
 const panel=document.getElementById('sunrakuPanel');if(!panel)return;
 let wrapper=document.getElementById('sunrakuPickerModal');
 if(sunrakuState?.mode==='pick'){
  if(!wrapper){wrapper=document.createElement('div');wrapper.id='sunrakuPickerModal';document.body.appendChild(wrapper);}
  wrapper.appendChild(panel);wrapper.style.display='flex';
 }else if(wrapper){document.getElementById('handPreview').before(panel);wrapper.remove();}
}
// Keep music at its original speed and pitch, including resumes after character themes.
function stabilizeBgmPlayback(audio){
  if(!audio)return;
  if(audio.defaultPlaybackRate!==1)audio.defaultPlaybackRate=1;
  if(audio.playbackRate!==1)audio.playbackRate=1;
  audio.preservesPitch=true;audio.webkitPreservesPitch=true;audio.mozPreservesPitch=true;
  if(!audio.dataset.normalRateBound){
    audio.dataset.normalRateBound='1';
    for(const event of ['ratechange','loadedmetadata','play'])audio.addEventListener(event,()=>stabilizeBgmPlayback(audio));
  }
}
const selectionCardContainers='#madokaList,#classicCards,#excelChoiceCards,#takinaPickerList,#fatherCards,#hoshinoAiList,#sunrakuPickList,#initialLeadChoices';
// Existing selection handlers still own their drafts. Detail viewing never confirms a choice.
document.addEventListener('click',event=>{
  const tile=event.target.closest?.(selectionCardContainers+'');
  const cardNode=event.target.closest?.('.card[data-id]') || event.target.closest?.('button')?.querySelector('.card[data-id]');
  if(!tile||!cardNode||!G)return;
  const id=cardNode.dataset.id;
  const card=[...G.players.flatMap(p=>[...p.hand,...p.deck,...p.grave]),...G.field.map(x=>x.card),...(G.pendingExcelChoice?.revealed||[])].find(c=>c.id===id);
  if(!card)return;
  queueMicrotask(()=>{
    openCardZoom(card);
    document.querySelector('#cardZoomDialog .zoom-play-card')?.remove();
  });
},true);
