// The actor resolves the hand choice once. The other seats only present the cut-in.
let tanjiroSceneId=null;
function syncTanjiroEntry(){
  const event=G?.pendingTanjiroEntry;
  if(!event || tanjiroSceneId===event.id)return;
  tanjiroSceneId=event.id;
  const layer=document.createElement('div');
  layer.className='hinokami';
  layer.setAttribute('role','status');
  layer.innerHTML='<div class="hinokami-seal" aria-hidden="true"></div><div class="hinokami-type"><span>ヒノカミ神楽</span><strong>碧羅の天</strong></div>';
  const remaining=Math.max(1,Math.min(4000,activeHumanSeat()===event.driver ? event.endsAt-Date.now() : 4000));
  layer.style.setProperty('--elapsed',(remaining-4000)+'ms');
  document.body.appendChild(layer);
  setTimeout(()=>layer.remove(),remaining);
  startCharacterBgm('./effects1/tanjiro-gurenge-bgm.mp3',{
    introSource:'./effects1/tanjiro-hinokami.mp3',
    introOffset:(4000-remaining)/1000,
    introDurationMs:remaining
  });
  if(activeHumanSeat()!==event.driver)return;
  setTimeout(function finish(){
    if(G?.pendingTanjiroEntry?.id!==event.id)return;
    if(!canOperateEffect(event.driver)){setTimeout(finish,50);return;}
    delete G.pendingTanjiroEntry;
    locked=false;
    G.actionLocked=false;
    beginExcelChoice({owner:event.owner,source:'竈門炭治郎',stage:'tanjiroHand',ids:event.ids,min:1,max:1});
    afterAction(event.owner);
    notifyGameChanged();
  },remaining);
}
