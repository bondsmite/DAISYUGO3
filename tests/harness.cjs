const {JSDOM,VirtualConsole}=require('jsdom');const fs=require('fs');
const copy=x=>x==null?null:JSON.parse(JSON.stringify(x));
async function load(name,root=require("path").join(__dirname,"..")){const errors=[],vc=new VirtualConsole();vc.on('jsdomError',e=>{if(!/Not implemented.*(HTMLMediaElement|scrollTo)/s.test(e.message))errors.push(e.message)});
let html=fs.readFileSync(root+'/'+name,'utf8').replace(/<iframe[\s\S]*?<\/iframe>/g,'').replace(/<link rel="stylesheet" href="\.\/([^"]+)">/g,(_,p)=>'<style>'+fs.readFileSync(root+'/'+p,'utf8')+'</style>').replace(/<script src="\.\/([^"]+)"><\/script>/g,(_,p)=>'<script>'+fs.readFileSync(root+'/'+p,'utf8')+'</script>');
const dom=new JSDOM(html,{url:'http://game.test/'+name,runScripts:'dangerously',virtualConsole:vc,pretendToBeVisual:true,beforeParse(w){w.HTMLMediaElement.prototype.play=()=>Promise.resolve();w.HTMLMediaElement.prototype.pause=()=>{};w.HTMLMediaElement.prototype.load=()=>{};w.scrollTo=()=>{};}});await new Promise(r=>dom.window.addEventListener('load',()=>setTimeout(r,20)));return {w:dom.window,errors};}
class DB{
 constructor(){this.data={};this.listeners=[];}
 get(p){return p.split('/').filter(Boolean).reduce((o,k)=>o?.[k],this.data)??null;}
 put(p,v){const keys=p.split('/').filter(Boolean);let o=this.data;for(const k of keys.slice(0,-1))o=o[k]??={};if(v==null)delete o[keys.at(-1)];else o[keys.at(-1)]=copy(v);for(const x of this.listeners)if(p.startsWith(x.p)||x.p.startsWith(p)){const snap=this.snap(x.p);queueMicrotask(()=>{if(this.listeners.includes(x))x.cb(snap)})}}
 snap(p){const v=copy(this.get(p));return {val:()=>copy(v),exists:()=>v!==null};}
 ref(p){const db=this;return {child:k=>db.ref(p+'/'+k),once:async()=>db.snap(p),on:(type,cb)=>{db.listeners.push({p,cb});queueMicrotask(()=>cb(db.snap(p)));},off:()=>{},set:async v=>db.put(p,v),update:async v=>db.put(p,{...db.get(p),...v}),remove:async()=>db.put(p,null),transaction:async fn=>{const next=fn(copy(db.get(p)));if(next===undefined)return {committed:false,snapshot:db.snap(p)};db.put(p,next);const snapshot=db.snap(p);if(db.ackDelay)await new Promise(r=>setTimeout(r,db.ackDelay));return {committed:true,snapshot};}};}
 firebase(id){const db=this;return {database(){},initializeApp(){return {database:()=>db,auth:()=>({signInAnonymously:async()=>({user:{uid:id}})}),delete:async()=>{}};}};}
}
const tick=(ms=40)=>new Promise(r=>setTimeout(r,ms));
async function click(w,id){const el=w.document.getElementById(id);if(el.disabled)throw Error(id+' disabled: '+w.document.getElementById('olStatus')?.textContent);el.click();await tick();}
module.exports={load,DB,copy,tick,click};
