/* Shared presentation for solo, three-seat and four-seat matches. All queue data is serializable. */
function tribeIconHtml(tribe) {
  const names=['神種族','英種族','物種族','龍種族','霊種族','魔種族'], i=names.indexOf(tribe);
  return i<0?'':'<span class="tribe-icon tribe-'+i+'" role="img" aria-label="'+tribe+'" title="'+tribe+'"></span>';
}
function resultZones(){return G.players.map(p=>({hand:p.hand.map(c=>({...c})),deck:p.deck.map(c=>({...c})),grave:p.grave.map(c=>({...c}))}));}
function startEffectResults(owner,source){G.effectResultContext={effectId:(G.resultEffectSequence=(G.resultEffectSequence||0)+1),owner,source,zones:resultZones(),field:G.field.map(x=>({player:x.player,card:{...x.card}}))};}
function collectEffectResults(keep=false){
  const q=G?.effectResultContext;if(!q)return;
  G.effectResultBuffer=G.effectResultBuffer||[];
  G.players.forEach((p,i)=>{
    const old=q.zones[i];if(!old)return;
    const acquired=p.hand.filter(c=>!q.directDrawIds?.includes(c.id)&&!old.hand.some(x=>x.id===c.id)&&[...old.deck,...old.grave].some(x=>x.id===c.id));
    const destroyed=p.grave.filter(c=>!old.grave.some(x=>x.id===c.id)&&[...old.hand,...old.deck,...(q.field||[]).filter(x=>x.player===i).map(x=>x.card)].some(x=>x.id===c.id));
    for(const [cards,verb] of [[acquired,'を手札に加えた。'],[destroyed,'を破壊した。']])if(cards.length){
      const message=p.name+'：'+q.source+'の効果で'+cards.map(c=>'「'+c.name+'」').join('、')+verb;
      G.effectResultBuffer.push({effectId:q.effectId,verb,source:q.source,player:i,cards:cards.map(c=>({...c})),message});
    }
  });
  q.zones=resultZones();q.field=G.field.map(x=>({player:x.player,card:{...x.card}}));
  if(!keep&&!locked&&!hasPendingEffect())G.effectResultContext=null;
}
function startResultPresentation(owner){
  if(locked||hasPendingEffect()||!G.effectResultBuffer?.length)return false;
  const grouped=[];
  for(const event of G.effectResultBuffer.splice(0)){
    const key=[event.effectId,event.source,event.player,event.verb].join(':');
    let group=grouped.find(x=>x.key===key);
    if(!group){group={...event,key,cards:[]};grouped.push(group);}
    group.cards.push(...event.cards.filter(c=>!group.cards.some(x=>x.id===c.id)));
  }
  for(const event of grouped)event.message=G.players[event.player].name+'：'+event.source+'の効果で'+event.cards.map(c=>'「'+c.name+'」').join('、')+event.verb;
  G.resultPresentation={id:(G.resultPresentation?.id||0)+1,active:true,driver:activeHumanSeat(),owner,events:grouped};
  document.getElementById('ownHandViewer')?.remove();closeCardZoom();locked=true;render();return true;
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
 }else if(wrapper){document.getElementById('hand').before(panel);wrapper.remove();}
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
// A click updates the existing selection draft; details require a separate button.
document.addEventListener('click',event=>{
  const container=event.target.closest?.(selectionCardContainers);
  const node=event.target.closest?.('.card[data-id]')||event.target.closest?.('button')?.querySelector('.card[data-id]');
  if(!container||!node||!G)return;
  const card=[...G.players.flatMap(p=>[...p.hand,...p.deck,...p.grave]),...G.field.map(x=>x.card),...(G.pendingExcelChoice?.revealed||[])].find(c=>c.id===node.dataset.id);
  if(!card)return;
  const containerId=container.id;
  queueMicrotask(()=>{
    const list=document.getElementById(containerId);if(!list)return;
    let bar=list.parentElement.querySelector('.selection-detail-bar');
    if(!bar){bar=document.createElement('div');bar.className='selection-detail-bar';list.after(bar);}
    bar.replaceChildren();
    const label=document.createElement('span');label.textContent=card.name;
    const button=document.createElement('button');button.type='button';button.textContent='詳細を見る';
    button.onclick=()=>{openCardZoom(card);document.querySelector('#cardZoomDialog .zoom-play-card')?.remove();};
    bar.append(label,button);
  });
},true);
function costLightsHtml(cost){
 return '<span class="cost-lights" role="img" aria-label="残りコスト'+Math.max(0,Math.min(3,Number(cost)||0))+'"><i class="cost-light '+(cost>=1?'lit':'')+'"></i><i class="cost-light '+(cost>=2?'lit':'')+'"></i><i class="cost-light '+(cost>=3?'lit':'')+'"></i></span>';
}
let logNamePattern=null;
function linkedLogHtml(value){
 if(!logNamePattern){const names=[...new Set(DATA.catalog.map(c=>c.name))].sort((a,b)=>b.length-a.length);logNamePattern=new RegExp(names.map(n=>n.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|'),'g');}
 const text=String(value);let result='',at=0;
 for(const m of text.matchAll(logNamePattern)){result+=escapeHtml(text.slice(at,m.index))+'<button type="button" class="log-card-link" data-log-card="'+escapeHtml(m[0])+'">'+escapeHtml(m[0])+'</button>';at=m.index+m[0].length;}
 return result+escapeHtml(text.slice(at));
}
function showOwnHand(){
 if(!G)return;
 document.getElementById('ownHandViewer')?.remove();
 const modal=document.createElement('div');modal.id='ownHandViewer';modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');
 modal.innerHTML='<section><header><h2>自分の手札を確認</h2><button type="button" class="close-own-hand">選択画面に戻る</button></header><p>カードを押すと詳細を確認できます。</p><div class="own-hand-cards">'+G.players[activeHumanSeat()].hand.map(c=>cardHtml(c,false)).join('')+'</div></section>';
 modal.querySelector('.close-own-hand').onclick=()=>modal.remove();
 modal.onclick=e=>{if(e.target===modal)modal.remove();const node=e.target.closest('.card[data-id]');if(node){const card=G.players[activeHumanSeat()].hand.find(c=>c.id===node.dataset.id);if(card){openCardZoom(card);document.querySelector('#cardZoomDialog .zoom-play-card')?.remove();}}};
 document.body.appendChild(modal);
}
function installHandViewButtons(){
 for(const list of document.querySelectorAll(selectionCardContainers)){
  const parent=list.parentElement;if(parent.querySelector(':scope > .view-own-hand'))continue;
  const button=document.createElement('button');button.type='button';button.className='view-own-hand';button.textContent='自分の手札を確認';button.onclick=showOwnHand;list.before(button);
 }
}
document.addEventListener('click',e=>{const b=e.target.closest?.('[data-log-card]');if(b)openCardZoomByCatalogName(b.dataset.logCard);});
new MutationObserver(installHandViewButtons).observe(document.documentElement,{childList:true,subtree:true});
let matchOutcomeSession=null;
function resetMatchOutcome(){
 if(matchOutcomeSession){matchOutcomeSession.audio.pause();matchOutcomeSession.audio.remove();matchOutcomeSession=null;}
 document.getElementById('matchOutcomeBanner')?.remove();
}
function renderMatchOutcome(){
 if(!G?.winner||!gameStarted){resetMatchOutcome();return;}
 const key=G.matchId+':'+activeHumanSeat()+':'+G.winner.index;
 if(matchOutcomeSession?.key!==key){
  resetMatchOutcome();stopGameBgms();
  document.querySelectorAll('audio').forEach(a=>a.pause());
  const won=G.winner.index===activeHumanSeat();
  const banner=document.createElement('div');banner.id='matchOutcomeBanner';banner.className=won?'match-victory':'match-defeat';banner.setAttribute('role','status');banner.innerHTML='<span class="outcome-ring" aria-hidden="true"></span><span class="outcome-wings" aria-hidden="true"></span><strong class="outcome-title">'+(won?'勝利':'敗北')+'</strong><span class="outcome-sparks" aria-hidden="true">'+Array.from({length:16},(_,i)=>'<i style="--angle:'+i*22.5+'deg;--delay:'+(i%4)*.15+'s"></i>').join('')+'</span>';document.body.appendChild(banner);
  const audio=document.createElement('audio');audio.id='matchOutcomeAudio';audio.src='./effects/assets/'+(won?'victory':'defeat')+'.m4a';audio.preload='auto';audio.loop=false;audio.volume=0.7;audio.playbackRate=1;document.body.appendChild(audio);
  matchOutcomeSession={key,audio,played:false};
 }
 const s=matchOutcomeSession;
 if(!gameBgmEnabled){s.audio.pause();s.pausedForMute=true;return;}
 if(!s.played||s.pausedForMute){s.played=true;s.pausedForMute=false;try{const p=s.audio.play();if(p?.catch)p.catch(()=>{if(matchOutcomeSession===s)s.played=false;});}catch{s.played=false;}}
}
document.addEventListener('click',e=>{if(e.target.id==='bgmToggle')renderMatchOutcome();});
// A user gesture can retry audio if the browser initially blocks automatic playback.
document.addEventListener('pointerdown',()=>{if(G?.winner)renderMatchOutcome();});
