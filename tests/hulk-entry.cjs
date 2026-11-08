const {load,tick}=require('./harness.cjs'),assert=require('assert');
(async()=>{const t=await load('index.html'),w=t.w;try{
w.eval(`newGame();G.initialLeadPending=false;G.current=0;G.field=[];G.winner=null;locked=false;G.players.forEach(p=>p.human=true);let n=0;function tc(name){return {...DATA.catalog.find(c=>c.name===name),id:'hulk'+n++};}G.players[0].hand=[tc('ハルク'),tc('ゴブリン')];doPlay(0,0);afterAction(0);`);
assert(w.eval('locked'));assert.equal(w.eval('G.current'),0);assert(!w.eval('G.pendingHulk'));assert(w.document.getElementById('hulkEntryOverlay'));assert(w.document.getElementById('passBtn').disabled);
await tick(3100);assert(!w.eval('locked'));assert(w.eval('G.pendingHulk'));assert.equal(w.eval('G.current'),0);assert(w.document.getElementById('classicPicker'));assert(!w.document.getElementById('hulkEntryOverlay'));
w.document.querySelector('#classicCards button').click();w.document.getElementById('classicConfirm').click();assert(w.eval('locked'));await tick(1100);assert.equal(w.eval('G.current'),1);
w.eval('window.playHulkEntry();window.stopHulkEntry()');assert(!w.document.getElementById('hulkEntryOverlay'));assert(!t.errors.length,t.errors.join('\n'));console.log('PASS 3s freeze, delayed Hulk choice, one turn advance, cancellation');
}finally{w.close();}})().catch(e=>{console.error(e.stack);process.exitCode=1});
