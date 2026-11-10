const {load,tick,DB,copy,click}=require('./harness.cjs'),assert=require('assert');
(async()=>{
const t=await load('index.html'),w=t.w;
try{
w.eval(`newGame();G.initialLeadPending=false;G.current=0;locked=false;G.players.forEach(p=>{p.human=true;p.cost=3});let n=0;function mc(name){return {...DATA.catalog.find(c=>c.name===name),id:'m'+n++}};var f={...mc('ゴブリン'),bp:5000};var drug=mc('鬼人薬');G.players[0].hand=[f,drug];G.field=[{owner:1,card:{...mc('ゴブリン'),bp:8000}}];`);
assert(!w.eval('canPlay(f,G.players[0])'));assert(w.eval('canPlay(f,G.players[0],drug)'));assert.equal(w.eval('f.bp'),5000);
w.eval('selected=f.id;selectedSpell=drug.id;render()');assert(!w.document.getElementById('playBtn').disabled);assert(w.eval('doPlay(0,0,drug.id)'));assert.equal(w.eval('G.field.at(-1).card.bp'),9000);
w.eval('window.playMadokaEntry();window.stopMadokaEntry()');assert(!w.document.getElementById('madokaEntryOverlay'));assert(!t.errors.length,t.errors.join('\n'));
console.log('PASS 鬼人薬 preview, playable button, single BP bonus, cancellation');
}finally{w.close()}
for(const count of [3,4]){const db=new DB(),tabs=[],code='87'+count+'0';try{
for(let i=0;i<count;i++){const t=await load(count===4?'online-mode-4.html':'online-mode.html');tabs.push(t);t.w.firebase=db.firebase('mad'+i);t.w.document.getElementById('olConfig').value=JSON.stringify({apiKey:'x',authDomain:'x',databaseURL:'x',projectId:'x',appId:'x'});await click(t.w,'olSaveConfig');t.w.document.getElementById('olRoomCode').value=code;await click(t.w,i?'olJoin':'olCreate')}
await click(tabs[0].w,'olStart');const key='daishugoRooms/'+code+'/game',live=()=>JSON.parse(db.get(key).state);let id=0;const cat=tabs[0].w.eval('DATA.catalog'),c=n=>({...copy(cat.find(c=>c.name===n)),id:'mad'+id++});const g=live();g.initialLeadPending=false;g.current=count-1;g.field=[];g.players.forEach(p=>{p.hand=[c('ゴブリン')];p.deck=[c('リュウ')];p.cost=3});g.players.at(-1).hand=[c('鹿目まどか'),c('ゴブリン')];g.players.at(-1).deck=[{...c('ゴブリン'),tribe:'魔種族'}];db.put(key,{revision:db.get(key).revision+1,state:JSON.stringify(g)});await tick();
const actor=tabs.at(-1).w;actor.eval('selectCard(G.players[activeHumanSeat()].hand[0].id)');await click(actor,'playBtn');assert(live().actionLocked);assert(!live().pendingMadoka);for(const t of tabs){assert(t.w.document.getElementById('madokaEntryOverlay'));assert(t.w.document.getElementById('madokaEntrySound').src.endsWith('/madoka-entry.mp3'));assert(t.w.document.getElementById('passBtn').disabled)}
await tick(3100);assert(!live().actionLocked);assert(live().pendingMadoka);assert.equal(live().current,count-1);for(const t of tabs)assert(!t.w.document.getElementById('madokaEntryOverlay'));assert(tabs.every(t=>!t.errors.length),tabs.flatMap(t=>t.errors).join('\n'));console.log('PASS '+count+' clients: image/audio, 3s lock, delayed effect, observer cleanup');
}finally{tabs.forEach(t=>t.w.close())}}
})().catch(e=>{console.error(e.stack);process.exitCode=1});
