const {load,DB,copy,tick,click}=require('./harness.cjs'),assert=require('assert');
(async()=>{
const t=await load('index.html'),w=t.w;
try{
w.eval(`newGame();let uid=0;function card(n){return {...DATA.catalog.find(c=>c.name===n),id:'ui'+uid++}};function fixture(){newGame();G.initialLeadPending=false;G.current=0;G.field=[];locked=false;G.players.forEach(p=>{p.human=true;p.hand=[card('ゴブリン')];p.deck=[card('リュウ'),card('ゴブリン')];p.grave=[];p.cost=3})}`);
assert(!w.document.body.textContent.includes('ルール早見表'));
for(const tribe of ['神種族','英種族','物種族','龍種族','霊種族','魔種族'])assert(w.eval(`cardHtml({...card('ゴブリン'),tribe:'${tribe}'},false)`).includes('tribe-icon'));
assert(!w.eval(`cardHtml(card('ヴィブラニウム'),false)`).includes('tribe-icon'));
w.eval(`fixture();G.players[0].hand.unshift(card('ウェスカー'));G.players[0].grave=[card('ゴブリン')];doPlay(0,0);resolveMadokaPick(G.players[0].grave[0].id);`);
assert(w.eval('locked && G.current===0 && G.resultPresentation.active'));assert(w.document.getElementById('effectResultModal').textContent.includes('ウェスカーの効果で'));
await tick(650);assert.equal(w.eval('G.current'),0);await tick(450);assert.equal(w.eval('G.current'),1);assert(!w.document.getElementById('effectResultModal'));
w.eval(`fixture();G.pendingFather=true;G.fatherOwner=0;showFatherNumberPicker()`);w.document.querySelector('[data-father-number="1"]').click();assert.equal(w.document.getElementById('fatherCards').style.display,'none');w.document.getElementById('fatherConfirm').click();assert.equal(w.document.getElementById('fatherCards').style.display,'grid');
// Winning draw must wait for the result presentation.
w.eval(`fixture();G.players[0].hand=[];G.players[0].deck=[card('ヴィブラニウム')];resolveFanfare(0,card('ソニック'));checkWinner();afterAction(0)`);assert.equal(w.eval('G.winner'),null);await tick(1100);assert.equal(w.eval('G.winner.index'),0);
assert(!t.errors.length,t.errors.join('\n'));console.log('PASS icons, rules removal, grave recovery pause, explicit number confirmation, deferred winner');
}finally{w.close()}
for(const count of [3,4]){
 const db=new DB(),tabs=[],code='91'+count+'0';
 try{
 for(let i=0;i<count;i++){const t=await load(count===4?'online-mode-4.html':'online-mode.html');tabs.push(t);t.w.firebase=db.firebase('ui'+i);t.w.document.getElementById('olConfig').value=JSON.stringify({apiKey:'x',authDomain:'x',databaseURL:'x',projectId:'x',appId:'x'});await click(t.w,'olSaveConfig');t.w.document.getElementById('olRoomCode').value=code;await click(t.w,i?'olJoin':'olCreate')}
 await click(tabs[0].w,'olStart');const key='daishugoRooms/'+code+'/game',live=()=>JSON.parse(db.get(key).state);let id=0;const cat=tabs[0].w.eval('DATA.catalog'),c=n=>({...copy(cat.find(c=>c.name===n)),id:'netui'+id++});
 const g=live();g.initialLeadPending=false;g.current=count-1;g.winner=null;g.field=[];g.actionLocked=false;g.players.forEach(p=>{p.human=true;p.hand=[c('ゴブリン'),c('リュウ')];p.deck=[c('ゴブリン'),c('リュウ')];p.grave=[];p.cost=3;p.passed=false});g.players.at(-1).hand.unshift(c('ネク'));db.put(key,{revision:db.get(key).revision+1,state:JSON.stringify(g)});await tick();
 const actor=tabs.at(-1).w;actor.eval('selectCard(G.players[activeHumanSeat()].hand[0].id)');await click(actor,'playBtn');assert(live().pendingNeku);
 for(const t of tabs){t.w.document.querySelector('#classicCards button').click();await click(t.w,'classicConfirm')}
 await tick(100);assert(live().resultPresentation.active);assert.equal(live().resultPresentation.events.length,count);assert.equal(live().current,count-1);
 for(let n=0;n<count;n++){
  for(const t of tabs){assert(t.w.document.getElementById('effectResultModal'));assert(t.w.document.getElementById('effectResultModal').textContent.includes('効果処理 '+(n+1)+' / '+count));}
  if(n<count-1)await tick(1000);
 }
 await tick(1050);assert(!live().resultPresentation.active);assert.equal(live().current,0);
 const visits=live().players[0].turnVisits;db.put(key,{revision:db.get(key).revision+1,state:JSON.stringify(live())});await tick(100);assert.equal(live().players[0].turnVisits,visits);assert(tabs.every(t=>!t.w.document.getElementById('effectResultModal')));assert(tabs.every(t=>!t.errors.length),tabs.flatMap(t=>t.errors).join('\n'));
 console.log('PASS '+count+' clients: host resolves guest effect, per-player 1-second queue, synchronized pause/resume, no replay or double turn');
 }finally{tabs.forEach(t=>t.w.close())}
}
})().catch(e=>{console.error(e.stack);process.exitCode=1});
