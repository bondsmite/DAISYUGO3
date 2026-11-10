const {load}=require('./harness.cjs'),assert=require('assert');
(async()=>{const {w,errors}=await load('index.html');try{
w.eval(`var seq=0;function cc(n){return {...DATA.catalog.find(c=>c.name===n),id:'doom'+seq++}};newGame();G.initialLeadPending=false;G.current=0;G.field=[];G.players.forEach(p=>{p.human=true;p.cost=3;p.hand=[cc('ゴブリン'),cc('ゴジラ')];p.deck=[cc('リュウ')];p.grave=[]});resolveFanfare(0,cc('ドクタードゥーム'));G.forbiddenNumber=4;`);
assert(!w.eval('canPlay(G.players[0].hand[0],G.players[0])'));
w.eval(`G.forbiddenNumber=null;G.field=[{player:1,card:cc('佐野万次郎')}];G.conflict=true;`);assert(!w.eval(`canPlay(cc('球磨川禊'),G.players[0])`));
w.eval(`G.field=[];G.conflict=false;G.pendingAruru=true;G.aruruSelections=[G.players[0].hand[0].id,G.players[0].hand[1].id];document.getElementById('effectDoneBtn').onclick();`);assert.equal(w.eval('G.players[0].grave.length'),2);
w.eval(`G.resultPresentation=null;locked=false;G.field=[{player:0,card:cc('ドクタードゥーム')}];flow(0);`);assert.equal(w.eval(`fieldNumber(G.players[1].hand[0])`),4);
w.eval(`G.numberChanges=[];G.pendingDeathNote={owner:0};G.players[0].human=false;resolveDeathNote('リュウ',true)`);assert(!w.eval('G.pendingDeathNote'));
assert(!errors.length,errors.join('\n'));console.log('PASS Doom: changed-number restriction, Aruru pairs, persistence across field clear; conflict excludes numeric special plays; CPU notebook resolves');
}finally{w.close()}})().catch(e=>{console.error(e.stack);process.exitCode=1});
