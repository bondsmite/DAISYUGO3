const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const code=fs.readFileSync(path.join(__dirname,'../effects/game-engine.js'),'utf8');
const a=code.indexOf('// One-shot character BGM:'), b=code.indexOf('function matchTurnOrder()',a);
assert(a>=0&&b>a);
class Audio{
 constructor(src=''){this.src=src;this.id='';this.paused=true;this.currentTime=0;this.playCount=0;this.onended=null;this.onerror=null;this.loop=false;}
 play(){this.paused=false;this.playCount++;return Promise.resolve();}
 pause(){this.paused=true;}
 end(){this.onended?.();}
}
const normal=new Audio('normal');normal.id='gameBgm1';normal.currentTime=38;normal.play();
const empty=new Audio('empty');empty.id='gameBgm2';
let state={visible:false,actions:0,changes:0};const timers=new Map();let n=0;
const ctx={Audio,document:{getElementById:id=>({gameBgm1:normal,gameBgm2:empty})[id]||null},window:{showSanoEntryImage:()=>{state.visible=true;return()=>{state.visible=false}}},G:{players:[{}],winner:null,matchId:'m',effectSequence:1,actionLocked:true},locked:true,gameBgmEnabled:true,stabilizeBgmPlayback:()=>{},applyCharacterBgmMobileVolume:()=>{},syncGameBgmToDecks:()=>{},playGameBgm:which=>({1:normal,2:empty}[which]).play(),afterAction:()=>{state.actions++},notifyGameChanged:()=>{state.changes++},setTimeout:(fn,ms)=>{const id=++n;timers.set(id,{fn,ms});return id},clearTimeout:id=>timers.delete(id)};
vm.createContext(ctx);vm.runInContext(code.slice(a,b),ctx);
const read=()=>vm.runInContext('zomaBgmSession',ctx);
function timer(){const [id,v]=[...timers][0];assert(v);timers.delete(id);v.fn();return v.ms;}
ctx.window.startSanoEntry(0);
assert(state.visible);assert(normal.paused);assert(read().audio.src.endsWith('sano-inaiyona.m4a'));
read().audio.end(); // the fixed-time intro must not finish early
assert.equal(state.actions,0);assert(ctx.G.actionLocked);
assert.equal(timer(),7000);
assert.equal(state.actions,1);assert.equal(state.changes,1);assert.equal(ctx.G.actionLocked,false);
assert(!state.visible);
assert(read().audio.src.endsWith('sano-white-noise.mp3'));
read().audio.end();
assert.equal(read(),null);assert.equal(normal.currentTime,38);assert(!normal.paused);
// A previously playing character soundtrack must NOT be restored.
ctx.window.startZomaBgm();const zoma=read().audio;zoma.currentTime=27;
ctx.G.actionLocked=true;ctx.locked=true;
ctx.window.startSanoEntry(0);assert(zoma.paused);assert.equal(timer(),7000);
const sano=read().audio;assert(sano.src.endsWith('sano-white-noise.mp3'));
sano.end();assert.equal(read(),null);
assert.equal(normal.currentTime,38);assert(!normal.paused);
assert.equal(zoma.playCount,1);
console.log('PASS: 7-second lock, intro-to-song, normal match BGM only; old character theme stays stopped');
