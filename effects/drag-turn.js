(()=>{
 'use strict';let drag=null,suppressUntil=0,lastTurn=null,timer=null;
 function ready(){return G&&!G.winner&&!G.initialLeadPending&&!locked&&!G.actionLocked&&!hasPendingEffect()&&isLocalTurn()&&!window.DAISHUGO_ONLINE_ADAPTER?.busy;}
 function cleanup(){if(!drag)return;drag.ghost?.remove();document.getElementById('field')?.classList.remove('drag-target');drag=null;}
 document.addEventListener('dragstart',e=>{if(e.target.closest('#hand .card'))e.preventDefault();});
 document.addEventListener('pointerdown',e=>{
  if(e.button!==0||!ready())return;const el=e.target.closest('#hand .card[data-id]');if(!el)return;
  const c=G.players[activeHumanSeat()].hand.find(x=>x.id===el.dataset.id);if(c?.kind!=='follower')return;
  drag={id:c.id,pointer:e.pointerId,x:e.clientX,y:e.clientY,el,match:G.matchId,turn:G.turn,visit:G.players[activeHumanSeat()].turnVisits};
 });
 document.addEventListener('pointermove',e=>{
  if(!drag||e.pointerId!==drag.pointer)return;
  if(!ready()||G.matchId!==drag.match||G.turn!==drag.turn||G.players[activeHumanSeat()].turnVisits!==drag.visit){cleanup();return;}
  if(!drag.ghost&&Math.hypot(e.clientX-drag.x,e.clientY-drag.y)<9)return;
  e.preventDefault();
  if(!drag.ghost){drag.ghost=drag.el.cloneNode(true);drag.ghost.removeAttribute('id');drag.ghost.classList.add('drag-ghost');document.body.append(drag.ghost);}
  drag.ghost.style.left=e.clientX+'px';drag.ghost.style.top=e.clientY+'px';
  const f=document.getElementById('field'),r=f.getBoundingClientRect();f.classList.toggle('drag-target',e.clientX>=r.left&&e.clientX<=r.right&&e.clientY>=r.top&&e.clientY<=r.bottom);
 },{passive:false});
 document.addEventListener('pointerup',e=>{
  if(!drag||e.pointerId!==drag.pointer)return;const d=drag;
  if(!d.ghost){cleanup();return;}e.preventDefault();suppressUntil=Date.now()+400;
  const r=document.getElementById('field').getBoundingClientRect(),inside=e.clientX>=r.left&&e.clientX<=r.right&&e.clientY>=r.top&&e.clientY<=r.bottom;
  const valid=ready()&&G.matchId===d.match&&G.turn===d.turn&&G.players[activeHumanSeat()].turnVisits===d.visit;
  cleanup();if(!inside||!valid)return;
  const p=G.players[activeHumanSeat()],c=p.hand.find(x=>x.id===d.id),spell=p.hand.find(x=>x.id===selectedSpell);
  if(!c||!canPlay(c,p,spell)){document.getElementById('notice').textContent='このカードは今の場には出せません。';return;}
  // Keep the existing spell, cost, Sunraku and effect-choice validation path.
  selected=d.id;render();playCard();
 },true);
 document.addEventListener('click',e=>{if(Date.now()<suppressUntil){e.preventDefault();e.stopImmediatePropagation();}},true);
 document.addEventListener('pointercancel',cleanup);window.addEventListener('blur',cleanup);
 window.renderLocalTurnNotice=()=>{
  const p=G?.players?.[activeHumanSeat()];
  if(!onlineMode||!gameStarted||!G||G.winner||G.initialLeadPending||!p){lastTurn=null;document.getElementById('localTurnNotice')?.remove();return;}
  if(!isLocalTurn()){lastTurn=null;document.getElementById('localTurnNotice')?.remove();return;}
  if(locked||G.actionLocked||hasPendingEffect())return;
  const key=[G.matchId,G.turn,G.current,p.turnVisits||1].join(':');if(lastTurn===key)return;lastTurn=key;
  clearTimeout(timer);document.getElementById('localTurnNotice')?.remove();const el=document.createElement('div');el.id='localTurnNotice';el.setAttribute('role','status');el.textContent=p.name+'の番です（'+(p.turnVisits||1)+'週目）';document.body.append(el);timer=setTimeout(()=>el.remove(),1000);
 };
 const style=document.createElement('style');style.textContent=`#hand .card{touch-action:none;user-select:none;-webkit-user-select:none;cursor:grab} .drag-ghost{position:fixed!important;z-index:1000005;pointer-events:none!important;transform:translate(-50%,-50%) rotate(-4deg);opacity:.9;width:110px!important;box-shadow:0 12px 35px #000a}#field.drag-target{outline:3px solid #ffe29a;box-shadow:0 0 28px #ffda5b88}#localTurnNotice{position:fixed;inset:38% 12px auto;z-index:1000003;pointer-events:none;text-align:center;font-weight:900;font-size:clamp(25px,5vw,62px);color:#fff8d6;text-shadow:0 2px 6px #000,0 0 25px #ffc33b;padding:22px 8px;background:linear-gradient(90deg,transparent,#1b243bd9,transparent);animation:turnNotice 1s both}@keyframes turnNotice{0%{opacity:0;transform:scale(.9)}15%,80%{opacity:1;transform:scale(1)}100%{opacity:0}}`;
 document.head.append(style);
})();
