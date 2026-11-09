const {load}=require('./harness.cjs'), assert=require('assert');
(async()=>{const t=await load('index.html'),w=t.w;try{
 w.eval(`newGame();G.initialLeadPending=false;locked=false;G.players.forEach(p=>p.human=true);G.current=0;G.winner=null;G.revolution=false;G.conflict=false;G.forbiddenNumber=null;G.forbiddenNumbers=[];G.qurioBonus=0;G.qurioUsed=false;G.players[0].cost=3;let testI=0;function tc(n){return {...DATA.catalog.find(c=>c.name===n),id:'demon'+testI++};}G.field=[{player:1,card:tc('サンラク')}];G.players[0].hand=[tc('ゴブリン'),tc('鬼人薬')];selected=G.players[0].hand[0].id;selectedSpell=null;`);
 assert.equal(w.eval('canPlay(G.players[0].hand[0])'),false,'without medicine, lower BP cannot beat same number');
 // Same-number comparison: ゴブリン(5000) vs サンラク(7000) is not same number.
 // Use a same-number 7000 BP top card to exercise BP tie-breaking.
 w.eval(`G.field[0].card={...G.field[0].card,number:'1',bp:7000};selectedSpell=G.players[0].hand[1].id;render();`);
 assert.equal(w.eval('canPlay(G.players[0].hand[0],G.players[0])'),true,'medicine boost must be counted when selected');
 assert.equal(w.eval('G.players[0].hand[0].bp'),5000,'preview must not mutate BP');
 assert.equal(w.document.getElementById('playBtn').disabled,false,'play button should be enabled');
 w.eval('selectedSpell=null;render()');assert.equal(w.eval('canPlay(G.players[0].hand[0])'),false,'canceling spell must restore original validation');
 w.eval('selectedSpell=G.players[0].hand[1].id;render()');
 assert.equal(w.eval('doPlay(0,0,selectedSpell)'),true,'actual play must pass validation');
 assert.equal(w.eval('G.field.at(-1).card.bp'),9000,'boost applied exactly once');
 assert.equal(w.eval('G.players[0].grave.some(c=>c.name===\'鬼人薬\')'),true,'spell is consumed');
 assert(!t.errors.length,t.errors.join('\n'));console.log('PASS medicine BP preview, selection cancel, play button and single consumption');
}finally{w.close();}})().catch(e=>{console.error(e.stack);process.exitCode=1});
