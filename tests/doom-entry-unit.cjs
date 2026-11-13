const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const added=[];let t=[],playing=[];
function element(tag){return {tag,id:'',children:[],attributes:{},setAttribute(k,v){this.attributes[k]=v},appendChild(c){this.children.push(c);added.push(c);return c},remove(){this.removed=true}};}
const dom={getElementById(id){return added.find(x=>x.id===id&&!x.removed)||null},head:element('head'),body:element('body'),createElement:element};
const ctx={window:{},document:dom,Audio:class {constructor(src){this.src=src;playing.push(this);}play(){return Promise.resolve()}pause(){this.paused=true}},setTimeout(fn,ms){assert.equal(ms,5000);t.push(fn);return t.length},clearTimeout(){}};
vm.createContext(ctx);vm.runInContext(fs.readFileSync(__dirname+'/../effects/doom-entry.js','utf8'),ctx);
let completed=0;ctx.window.playDoomEntry(()=>completed++);
assert.equal(completed,0);assert.equal(playing.at(-1).src,'./effects/assets/doctor-doom-voice.m4a');
assert.equal(dom.getElementById('doomEntryOverlay').children[0].src,'./effects/assets/doctor-doom-entry.webp');
t.shift()();assert.equal(completed,1);assert.equal(dom.getElementById('doomEntryOverlay'),null);
ctx.window.playDoomEntry(()=>completed++);ctx.window.stopDoomEntry();assert.equal(completed,1);
console.log('Doom cut-in test passed');
