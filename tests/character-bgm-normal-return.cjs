const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../effects/game-engine.js'),'utf8');
const begin=source.indexOf('// One-shot character BGM:');
const end=source.indexOf('function matchTurnOrder()',begin);
assert(begin>=0&&end>begin);
class Audio {
  constructor(src=''){this.src=src;this.id='';this.paused=true;this.currentTime=0;this.playCount=0;this.volume=1;this.onended=null;this.onerror=null;}
  pause(){this.paused=true;}
  play(){this.paused=false;this.playCount++;return Promise.resolve();}
  end(){const end=this.onended; if(end)end();}
}
const regular=new Audio('normal-bgm');regular.id='gameBgm1';regular.currentTime=23;regular.play();
const empty=new Audio('empty-bgm');empty.id='gameBgm2';
const roxas=new Audio('roxas');roxas.id='roxasBgm';
const el={gameBgm1:regular,gameBgm2:empty,roxasBgm:roxas};
const timers=new Map();let timeId=0;
let unlocked=0, announced=0, normalSelection=[];
const ctx={Audio,document:{getElementById:id=>el[id]||null},window:{showSanoEntryImage:()=>()=>{}},
  G:{players:[{deck:[1]},{deck:[2]}],winner:null,matchId:'m',effectSequence:1,actionLocked:true},
  locked:true,gameBgmEnabled:true,applyCharacterBgmMobileVolume:()=>{},
  playGameBgm:which=>{normalSelection.push(which); for(const a of [regular,empty])a.pause();el[which===2?'gameBgm2':'gameBgm1'].play();},
  afterAction:()=>unlocked++,notifyGameChanged:()=>announced++,setTimeout:(fn,ms)=>{const id=++timeId;timers.set(id,{fn,ms});return id;},clearTimeout:id=>timers.delete(id)};
vm.createContext(ctx);vm.runInContext(source.slice(begin,end),ctx);
const session=()=>vm.runInContext('zomaBgmSession',ctx);
const nextTimer=()=>{const [id,t]=[...timers][0]||[];assert(t);timers.delete(id);t.fn();return t.ms;};

// A previously playing Zoma theme must never return after Sano's song.
ctx.window.startZomaBgm();const zoma=session().audio;
ctx.window.startSanoEntry(0);assert(zoma.paused);assert.equal(nextTimer(),7000);
assert.equal(unlocked,1);assert.equal(announced,1);
const whiteNoise=session().audio;assert(whiteNoise.src.endsWith('sano-white-noise.mp3'));
whiteNoise.end();assert.equal(session(),null);assert.equal(zoma.playCount,1);
assert.deepEqual(normalSelection,[1]);assert.equal(regular.paused,false);

// A newer Tomodachi theme replaces White Noise permanently; it cannot return afterwards.
ctx.G.actionLocked=true;ctx.window.startSanoEntry(0);assert.equal(nextTimer(),7000);
const cancelledWhiteNoise=session().audio;
ctx.window.startTomodachiBgm();assert(cancelledWhiteNoise.paused);
const tomo=session().audio;assert(tomo.src.endsWith('tomodachi-bgm.mp3'));
tomo.end();assert.equal(session(),null);assert.equal(cancelledWhiteNoise.playCount,1);
assert.deepEqual(normalSelection,[1,1]);

// The normal empty-deck track is used when at least one player has no deck cards.
ctx.G.players[0].deck=[];
ctx.window.startZomaBgm();session().audio.end();assert.equal(session(),null);
assert.deepEqual(normalSelection,[1,1,2]);assert.equal(empty.paused,false);
console.log('PASS: character BGM never returns to an earlier character BGM, 7s Sano intro, normal deck/empty BGM resumes');
