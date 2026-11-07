const {load}=require('./harness.cjs'),assert=require('assert');
(async()=>{for(const page of ['index.html','online-mode.html']){const t=await load(page),w=t.w;try{
if(page==='index.html'){assert(w.document.getElementById('gameBgm1').src.startsWith('data:'));continue;}
assert(w.document.getElementById('gameBgm1').src.endsWith('online-normal.mp3'));assert(w.document.getElementById('gameBgm2').src.endsWith('online-empty.mp3'));
w.eval(`G={players:[{deck:[1]},{deck:[1]},{deck:[1]}],winner:null};syncGameBgmToDecks()`);assert.equal(w.eval('activeGameBgm'),1);assert(w.document.getElementById('gameBgm1').loop);
w.eval('G.players[2].deck=[];syncGameBgmToDecks()');assert.equal(w.eval('activeGameBgm'),2);assert(w.document.getElementById('gameBgm2').loop);
w.eval('gameBgmEnabled=false;syncGameBgmToDecks()');assert.equal(w.eval('activeGameBgm'),0);w.eval('gameBgmEnabled=true;syncGameBgmToDecks()');assert.equal(w.eval('activeGameBgm'),2);
w.eval('G.winner={index:1};syncGameBgmToDecks()');assert.equal(w.eval('activeGameBgm'),0);assert(!t.errors.length,t.errors.join('\n'));
}finally{w.close();}}console.log('PASS online start, any seat empty, loop, mute/resume, end, solo sources unchanged');})().catch(e=>{console.error(e);process.exitCode=1});
