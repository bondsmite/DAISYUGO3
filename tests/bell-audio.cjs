const {load}=require('./harness.cjs'),assert=require('assert');
(async()=>{for(const page of ['index.html','online-mode.html','online-mode-4.html']){const {w,errors}=await load(page);try{
let plays=0;w.HTMLMediaElement.prototype.play=function(){if(this.src.endsWith('/bell-angel.m4a'))plays++;return new Promise(()=>{});};
w.eval(`onlineMode=false;newGame();G.initialLeadPending=false;locked=false;var n=0;function bc(name){return {...DATA.catalog.find(c=>c.name===name),id:'belltest'+n++}};var p=G.players[0];p.hand=[bc('ベルエンジェル')];p.deck=[bc('ゴブリン'),bc('リュウ')];p.grave=[];destroyHandCard(p,p.hand[0],'ハルク',4);`);
assert.equal(plays,1);assert.equal(w.eval('p.hand.length'),2);assert.equal(w.eval('locked'),false);
w.eval('render();render()');assert.equal(plays,1);
w.eval(`p.hand=[bc('ベルエンジェル')];destroyHandCard(p,p.hand[0],'マキマ','L');`);assert.equal(plays,1);
// Simulate receiving another seat's serialized state, then a duplicate update.
w.eval(`G=JSON.parse(JSON.stringify({...G,bellAngelSoundCount:2}));render();render();`);assert.equal(plays,2);
w.eval(`G=JSON.parse(JSON.stringify({...G,matchId:'rejoined',bellAngelSoundCount:4}));render();`);assert.equal(plays,2);
w.HTMLMediaElement.prototype.play=function(){throw Error('blocked audio')};
w.eval(`p=G.players[0];p.hand=[bc('ベルエンジェル')];p.deck=[bc('ゴブリン')];destroyHandCard(p,p.hand[0],'ハルク',4)`);assert.equal(w.eval('p.hand.length'),1);assert.equal(w.eval('locked'),false);
assert(!errors.length,errors.join('\n'));console.log('PASS '+page+': trigger, L exclusion, nonblocking playback, remote sync, dedup, rejoin, playback failure');
}finally{w.close()}}})().catch(e=>{console.error(e);process.exitCode=1});
