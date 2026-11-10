/* Isolated character-music integration test; works without jsdom or a browser. */
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root,'effects/game-engine.js'), 'utf8');
const a = source.indexOf('// One-shot character BGM;');
const b = source.indexOf('function matchTurnOrder()',a);
assert(a>=0 && b>a);
class FakeAudio {
  constructor(src=''){this.src=src;this.paused=true;this.currentTime=0;this.playCount=0;this.pauseCount=0;this.onended=null;this.onerror=null;this.loop=false;this.id='';}
  play(){this.playCount++;this.paused=false;return Promise.resolve();}
  pause(){this.pauseCount++;this.paused=true;}
  finish(){this.onended?.();}
}
let imageVisible=false;
const base1=new FakeAudio('game1');base1.id='gameBgm1';
const base2=new FakeAudio('game2');base2.id='gameBgm2';
const roxas=new FakeAudio('roxas');roxas.id='roxasBgm';
const elements={gameBgm1:base1,gameBgm2:base2,roxasBgm:roxas};
const ctx={
  Audio:FakeAudio,
  window:{showSanoEntryImage:()=>{imageVisible=true;return ()=>{imageVisible=false;};}},
  document:{getElementById:id=>elements[id]||null},
  G:{players:[{deck:[1]},{deck:[1]}],winner:null},
  gameBgmEnabled:true,
  stabilizeBgmPlayback:()=>{},
  syncGameBgmToDecks:()=>{},
  setTimeout:(fn)=>{ctx.fallback=fn;return 42;},
  clearTimeout:()=>{ctx.fallback=null;}
};
vm.createContext(ctx);
vm.runInContext(source.slice(a,b),ctx);
const read=()=>vm.runInContext('zomaBgmSession',ctx);

// Normal track to Sano line/image to full OP to same track from its beginning.
base1.currentTime=43;base1.paused=false;
ctx.window.startSanoEntry();
assert(imageVisible);
assert(base1.paused);
let intro=read().audio;
assert(intro.src.endsWith('sano-inaiyona.m4a'));
assert.equal(intro.playCount,1);
intro.finish();
assert(!imageVisible);
let song=read().audio;
assert(song.src.endsWith('sano-white-noise.mp3'));
assert.equal(song.loop,false);
assert.equal(song.playCount,1);
assert.equal(base1.playCount,0);
song.finish();
assert.equal(read(),null);
assert.equal(base1.currentTime,0);
assert.equal(base1.playCount,1);
assert(!base1.paused);
assert(song.paused);

// Another character's interrupted theme must restart at 0, without playing both.
ctx.window.startZomaBgm();
const zoma=read().audio;
assert(zoma.src.endsWith('zoma-bgm.mp3'));
zoma.currentTime=14;
ctx.window.startSanoEntry();
assert(zoma.paused);
read().audio.finish(); // voice
read().audio.finish(); // OP
assert.equal(read().audio,zoma);
assert.equal(zoma.currentTime,0);
assert.equal(zoma.playCount,2);

// A new match/room departure must stop the sequence and remove the image.
ctx.window.startSanoEntry();
assert(imageVisible);
const interrupted=read().audio;
vm.runInContext('cancelZomaBgm()',ctx);
assert(!imageVisible);
assert(interrupted.paused);
assert.equal(read(),null);

// Another character played during the Sano intro cancels the old intro.
ctx.window.startSanoEntry();
assert(imageVisible);
const before=read().audio;
ctx.window.startZomaBgm();
assert(!imageVisible);
assert(before.paused);
assert(read().audio.src.endsWith('zoma-bgm.mp3'));
vm.runInContext('cancelZomaBgm()',ctx);

for(const page of ['index.html','online-mode.html','online-mode-4.html']){
  const html=fs.readFileSync(path.join(root,page),'utf8');
  assert(html.includes('<script src="./effects/sano-entry.js"></script>'));
}
assert(source.includes("window.startSanoEntry?.();"));
assert(fs.readFileSync(path.join(root,'effects/online-animations.js'),'utf8').includes('case "佐野万次郎":'));
for(const file of ['sano-manjirou-entry.jpg','sano-inaiyona.m4a','sano-white-noise.mp3'])assert(fs.existsSync(path.join(root,'effects/assets',file)));
console.log('PASS Sano: introduction, song once, BGM restart at 0, interrupted character track, cleanup, online pages/assets');
