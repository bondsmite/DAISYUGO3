const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
let nextId=0;
const children=[];
const elements=[];
const fakeDoc={
  head:{appendChild(el){elements.push(el)}},body:{appendChild(el){elements.push(el)}},
  createElement(tag){const el={tag,id:'',attributes:{},style:{},children:[],setAttribute(k,v){this.attributes[k]=v},appendChild(child){this.children.push(child)},remove(){elements.splice(elements.indexOf(this),1)}};return el},
  getElementById(id){return elements.find(e=>e.id===id)||null},
};
let finished=null;
let audioPlayed=0;
function Audio(src){this.src=src;this.pause=()=>{};this.play=()=>{audioPlayed++;return Promise.resolve()}}
const ctx={document:fakeDoc,Audio,setTimeout(fn,ms){assert.equal(ms,2000);finished=fn;return ++nextId},clearTimeout(){finished=null},window:{},console};ctx.window.window=ctx.window;
vm.createContext(ctx);vm.runInContext(fs.readFileSync(path.join(__dirname,'../effects/light-entry.js'),'utf8'),ctx);
let completed=0;
ctx.window.playLightEntry(1,()=>completed++);
assert.equal(audioPlayed,1);
assert.equal(fakeDoc.getElementById('lightEntryOverlay').children[0].src,'./effects/assets/light-yagami-entry.jpg');
assert.equal(completed,0);assert.equal(typeof finished,'function');
finished();assert.equal(completed,1);assert.equal(fakeDoc.getElementById('lightEntryOverlay'),null);
ctx.window.playLightEntry(2,()=>completed++);ctx.window.stopLightEntry();assert.equal(completed,1);assert.equal(fakeDoc.getElementById('lightEntryOverlay'),null);
for(const file of ['index.html','online-mode.html','online-mode-4.html'])assert(fs.readFileSync(path.join(__dirname,'..',file),'utf8').includes('effects/light-entry.js'));
const js=fs.readFileSync(path.join(__dirname,'../effects/game-engine.js'),'utf8');
assert(js.includes('G.actionLocked=true;'));assert(js.includes('window.playLightEntry?.(G.lastDeathNote.sequence'));assert(js.includes('afterAction(q.owner); // The existing card-by-card'));
console.log('PASS Light entry: 2-second cut-in, uploaded media, cleanup/cancel, deferred result, three pages');
