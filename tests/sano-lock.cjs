const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const code=fs.readFileSync(path.join(__dirname,'../effects/game-engine.js'),'utf8');
const start=code.indexOf('// One-shot character BGM:');
const end=code.indexOf('function matchTurnOrder()',start);
assert(start>=0 && end>start);
class FakeAudio{
 constructor(src=''){this.src=src;this.currentTime=0;this.paused=true;this.id='';this.onended=null;this.onerror=null;}
 play(){this.paused=false;return Promise.resolve();}
 pause(){this.paused=true;}
 finish(){this.onended?.();}
}
const normal=new FakeAudio('normal');normal.id='gameBgm1';normal.paused=false;
let actions=0,changes=0,locked=true;
const ctx={Audio:FakeAudio,document:{getElementById:id=>id==='gameBgm1'?normal:null},window:{showSanoEntryImage:()=>()=>{}},G:{players:[{human:true}],winner:null,matchId:'m1',effectSequence:9,actionLocked:true},gameBgmEnabled:true,stabilizeBgmPlayback:()=>{},applyCharacterBgmMobileVolume:()=>{},syncGameBgmToDecks:()=>{},playGameBgm:()=>normal.play(),afterAction(owner){assert.equal(owner,0);actions++},notifyGameChanged(){changes++},setTimeout(fn){ctx.timeout=fn;return 1},clearTimeout(){ctx.timeout=null}};
vm.createContext(ctx);
vm.runInContext(code.slice(start,end),ctx);
ctx.window.startSanoEntry(0);
assert.equal(actions,0);assert(ctx.G.actionLocked);
const intro=vm.runInContext('zomaBgmSession.audio',ctx);
assert(intro.src.endsWith('sano-inaiyona.m4a'));
intro.finish();
assert.equal(actions,0);
ctx.timeout(); // exactly 7 seconds
assert.equal(actions,1);assert.equal(changes,1);assert.equal(ctx.G.actionLocked,false);
const song=vm.runInContext('zomaBgmSession.audio',ctx);assert(song.src.endsWith('sano-white-noise.mp3'));
song.finish();assert.equal(actions,1);
assert(code.includes('destroyedCount+=deck.length;'));
assert(code.includes("if(destroyHandCard(p,c,'夜神月','7'))destroyedCount++"));
assert(code.includes('G.lastDeathNote={owner:q.owner,name,destroyedCount'));
console.log('PASS Sano: action resumes after intro only; Light: actual destroyed cards tracked');
