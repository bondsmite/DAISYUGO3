const {load,tick}=require('./harness.cjs'),assert=require('assert');
(async()=>{for(const page of ['index.html','online-mode.html','online-mode-4.html']){
const t=await load(page),w=t.w;try{
w.eval(`onlineMode=false;newGame();let n=0;function sc(name){return {...DATA.catalog.find(c=>c.name===name),id:'sel'+n++}};function sf(){newGame();G.initialLeadPending=false;G.current=0;G.field=[];G.winner=null;locked=false;G.players.forEach(p=>{p.human=true;p.hand=[sc('ゴブリン')];p.deck=[sc('リュウ'),sc('ゴブリン')];p.grave=[];p.cost=3});}`);
w.eval(`sf();G.players[0].grave=[sc('ゴブリン')];resolveFanfare(0,sc('ウェスカー'));showMadokaDeck()`);
w.document.querySelector('#madokaList .card').click();await tick();assert(!w.document.getElementById('cardZoomModal').classList.contains('open'));assert(w.eval('!!selectedMadokaId'));w.document.querySelector('.selection-detail-bar button').click();assert(w.document.getElementById('cardZoomModal').classList.contains('open'));assert(w.eval('G.pendingMadoka'));w.eval('closeCardZoom()');
const prev=w.document.getElementById('handPreview');assert(prev.previousElementSibling.textContent.includes('スペルはフォロワーと同時に使用できます。'));
w.eval(`sf();selectCard(G.players[0].hand[0].id)`);assert(prev.classList.contains('visible'));assert(prev.textContent.includes('ゴブリン'));
w.eval(`sf();const r=sc('ルーファウス');G.players[0].hand.unshift(r);doPlay(0,0);G.pendingExcelChoice.selected=['1'];finishExcelChoice();G.pendingExcelChoice.selected=[G.pendingExcelChoice.ids[0]];finishExcelChoice()`);
assert(w.eval('G.resultPresentation.active && G.current===0'));assert(w.document.getElementById('effectResultModal').textContent.includes('ルーファウス'));assert(!w.document.getElementById('cardZoomModal').classList.contains('open'));await tick(3100);assert.equal(w.eval('G.current'),1);
w.eval(`sf();const d=sc('青眼の白龍'),s=sc('サラマンダーブレス');d.cost=0;s.cost=0;G.players[0].hand=[d,s,sc('ゴブリン')];doPlay(0,0,s.id);afterAction(0)`);
assert(w.eval('G.resultPresentation.active'));assert.equal(w.eval('G.resultPresentation.events.length'),2);assert(w.eval('G.resultPresentation.events.every(e=>e.source==="サラマンダーブレス")'));assert(w.document.getElementById('effectResultModal').textContent.includes('破壊した'));assert.equal(w.eval('G.current'),0);
assert(!t.errors.length,t.errors.join('\n'));console.log('PASS '+page+': select without popup, explicit details, preview position, Rufus immediate results, Salamander destruction queue');
}finally{w.close()}}
})().catch(e=>{console.error(e.stack);process.exitCode=1});
