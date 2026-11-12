const {load,tick}=require('./harness.cjs'),assert=require('assert');
(async()=>{const {w,errors}=await load('index.html');try{
w.eval(`newGame();G.initialLeadPending=false;G.current=0;G.field=[];G.winner=null;locked=false;G.players.forEach(p=>p.human=true);
for(const id of ['gameBgm1','gameBgm2','roxasBgm']){const a=document.getElementById(id);let paused=true;Object.defineProperty(a,'paused',{get:()=>paused});a.play=()=>{paused=false;return Promise.resolve()};a.pause=()=>{paused=true};}
playGameBgm(1);document.getElementById('gameBgm1').currentTime=42;startZomaBgm();zomaBgmSession.audio.currentTime=15;window.oldZoma=zomaBgmSession;startTomodachiBgm();`);
assert(w.eval('zomaBgmSession!==oldZoma'));assert(w.eval('oldZoma.audio.paused'));assert(!w.eval('zomaBgmSession.audio.loop'));
w.eval('syncGameBgmToDecks()');assert(w.document.getElementById('gameBgm1').paused);
w.eval('zomaBgmSession.audio.onended()');assert.equal(w.eval('zomaBgmSession'),null);assert(w.eval('oldZoma.audio.paused'));
assert.equal(w.eval('zomaBgmSession'),null);assert.equal(w.document.getElementById('gameBgm1').currentTime,42);assert(!w.document.getElementById('gameBgm1').paused);
w.eval('startTomodachiBgm();gameBgmEnabled=false;zomaBgmSession.audio.onended()');assert(w.document.getElementById('gameBgm1').paused);
w.eval('gameBgmEnabled=true;startTomodachiBgm();playTomodachiEntry();document.getElementById("returnMenuBtn").click()');
assert(!w.document.getElementById('tomodachiEntryOverlay'));assert.equal(w.eval('zomaBgmSession'),null);
assert(!errors.length,errors.join('\n'));console.log('PASS exclusive character themes, original playback position, mute and menu cleanup');
}finally{w.close();}})().then(()=>process.exit(0)).catch(e=>{console.error(e.stack);process.exit(1)});
