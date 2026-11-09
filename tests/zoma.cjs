const {load,tick}=require('./harness.cjs'),assert=require('assert');
(async()=>{for(const page of ['index.html']){
 const t=await load(page),w=t.w;
 try{
 w.eval(`newGame();G.initialLeadPending=false;G.current=0;G.field=[];G.winner=null;locked=false;G.players.forEach(p=>p.human=true);let zn=0;function zc(name){return {...DATA.catalog.find(c=>c.name===name),id:'z'+zn++};}G.players[0].hand=[zc('大魔王ゾーマ'),zc('ゴブリン'),zc('リュウ')];`);
 // Exercise media state rather than jsdom's no-op media methods.
 w.eval(`for(const id of ['gameBgm1','gameBgm2','roxasBgm']){const a=document.getElementById(id);let paused=true;Object.defineProperty(a,'paused',{get:()=>paused});a.play=()=>{paused=false;return Promise.resolve()};a.pause=()=>{paused=true};} playGameBgm(1);document.getElementById('gameBgm1').currentTime=37;doPlay(0,0);afterAction(0);`);
 assert(w.eval('locked'));assert.equal(w.eval('G.current'),0);assert(w.document.getElementById('zomaEntryOverlay'));
 assert.equal(w.eval('zomaBgmSession'),null);
 await tick(2100);
 assert(!w.eval('locked'));assert.equal(w.eval('G.current'),1);assert(!w.document.getElementById('zomaEntryOverlay'));
 assert(w.eval('!!zomaBgmSession'));assert(!w.eval('zomaBgmSession.audio.loop'));
 assert(w.document.getElementById('gameBgm1').paused);
 assert(w.eval(`cardHtml(G.players[0].hand[0]).includes('sora-number-changed')`));
 assert(w.eval(`cardHtml(G.players[0].hand[1]).includes('makima-negative-number')`));
 w.eval('syncGameBgmToDecks()');assert(w.document.getElementById('gameBgm1').paused);
 w.eval('zomaBgmSession.audio.onended()');assert.equal(w.eval('zomaBgmSession'),null);assert(!w.document.getElementById('gameBgm1').paused);assert.equal(w.document.getElementById('gameBgm1').currentTime,37);
 w.eval('startZomaBgm();startZomaBgm();zomaBgmSession.audio.onended()');assert.equal(w.document.getElementById('gameBgm1').currentTime,37);
 w.eval('playZomaEntry();stopZomaEntry()');assert(!w.document.getElementById('zomaEntryOverlay'));
 w.eval('startZomaBgm();stopGameBgms()');assert.equal(w.eval('zomaBgmSession'),null);
 assert(!t.errors.length,t.errors.join('\n'));console.log('PASS '+page+': Zoma colors, freeze/advance, one-shot, BGM position, repeat/cancel');
 }finally{w.close();}
}})().then(()=>process.exit(0)).catch(e=>{console.error(e.stack);process.exit(1)});
