const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const engine=fs.readFileSync(path.join(root,'effects/game-engine.js'),'utf8');
const entry=fs.readFileSync(path.join(root,'effects/arceus-entry.js'),'utf8');
const online=fs.readFileSync(path.join(root,'effects/online-animations.js'),'utf8');
class Audio{
 constructor(src){this.src=src;this.paused=true;this.volume=1;this.currentTime=0;this.loop=false;this.onended=null;this.onerror=null;Audio.all.push(this);}
 play(){this.paused=false;this.plays=(this.plays||0)+1;return Promise.resolve();}
 pause(){this.paused=true;}
 end(){this.onended?.();}
}
Audio.all=[];
const timers=new Map();let seq=0;
const bgm1=new Audio('normal'),bgm2=new Audio('empty'),roxas=new Audio('roxas');
bgm1.id='gameBgm1';bgm2.id='gameBgm2';roxas.id='roxasBgm';
const nodes={'gameBgm1':bgm1,'gameBgm2':bgm2,'roxasBgm':roxas};
function node(tag){return {tagName:tag,style:{setProperty(){}},children:[],setAttribute(){},appendChild(c){this.children.push(c);return c;},remove(){this.removed=true;},querySelector(selector){return this.children.find(c=>c.className===selector.slice(1))||null;},set innerHTML(v){this.html=v;this.children=['arceus-stars','arceus-steps','arceus-rays'].map(className=>({...node('div'),className}));},get innerHTML(){return this.html||'';}}}
const body=node('body');
const ctx={Audio,document:{body,createElement:node,getElementById(id){return nodes[id]||null;}},window:{},G:{players:[{deck:[1]}],winner:null},gameBgmEnabled:true,clearTimeout(id){timers.delete(id)},setTimeout(fn,ms){const id=++seq;timers.set(id,{fn,ms});return id},applyCharacterBgmMobileVolume(a,v){a.volume=v},stabilizeBgmPlayback(){},playGameBgm(n){ctx.normalResumed=n;(n===1?bgm1:bgm2).play();},safeZomaPlay(a){a.play()}};
ctx.window=ctx;
ctx.DAISHUGO_AUDIO={buffer(){}};
vm.createContext(ctx);
const manager=engine.slice(engine.indexOf('let zomaBgmSession = null;'),engine.indexOf('function matchTurnOrder(){'));
vm.runInContext(manager,ctx);
vm.runInContext(entry,ctx);
assert.equal(typeof ctx.window.playArceusEntry,'function');
let done=0;bgm1.play();ctx.window.playArceusEntry(()=>done++);
assert(bgm1.paused,'normal music paused');
let session=vm.runInContext('zomaBgmSession',ctx);
assert(session.audio.src.endsWith('arceus-cry.mp3'));
assert.equal(session.stage,'intro');
assert.equal([...timers.values()][0].ms,10000);
assert.equal(body.children.length,1);
assert.equal(done,0);
// Voice end before 10s must not prematurely end cut-in.
session.audio.end();assert.equal(done,0);
const timer=[...timers.entries()][0];timers.delete(timer[0]);timer[1].fn();
assert.equal(done,1);
assert.equal(body.children[0].removed,true);
session=vm.runInContext('zomaBgmSession',ctx);
assert.equal(session.stage,'song');assert(session.audio.src.endsWith('arceus-battle.mp3'));assert.equal(session.audio.plays,1);
assert.equal(ctx.normalResumed,undefined);
session.audio.end();assert.equal(ctx.normalResumed,1);assert.equal(vm.runInContext('zomaBgmSession',ctx),null);
// Interrupt old theme: never resume old theme on completion.
ctx.window.playArceusEntry(()=>{});
const old=vm.runInContext('zomaBgmSession',ctx);
vm.runInContext("startCharacterBgm('./effects/assets/zoma-bgm.mp3')",ctx);
assert(old.audio.paused);old.audio.end();
assert(vm.runInContext('zomaBgmSession',ctx).audio.src.endsWith('zoma-bgm.mp3'));
// Static integration checks
assert(engine.includes('if (c.name === "アルセウス") {\n    const match = G, sequence = G.effectSequence;'));
assert(engine.includes('G.actionLocked = true;\n    log("アルセウス'));
assert(engine.includes('window.playArceusEntry?.(() => {'));
assert(online.includes('case "アルセウス":'));
for(const h of ['index.html','online-mode.html','online-mode-4.html']){
 const s=fs.readFileSync(path.join(root,h),'utf8');
 assert(s.includes('./effects/arceus-entry.js'));
 assert(s.includes('./effects/arceus-entry.css'));
}
for(const file of ['arceus-cry.mp3','arceus-battle.mp3'])assert(fs.statSync(path.join(root,'effects/assets',file)).size>10000);
console.log('PASS Arceus: cry+10s lock, one-shot theme, normal return, prior BGM interruption, all pages integration');
