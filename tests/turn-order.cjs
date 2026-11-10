const {load,tick,DB,copy,click}=require('./harness.cjs'),assert=require('assert');
(async()=>{
for(const count of [3,4]){const db=new DB(),tabs=[],code='94'+count+'0';try{
for(let i=0;i<count;i++){const t=await load(count===4?'online-mode-4.html':'online-mode.html');tabs.push(t);t.w.firebase=db.firebase('order'+i);t.w.document.getElementById('olConfig').value=JSON.stringify({apiKey:'x',authDomain:'x',databaseURL:'x',projectId:'x',appId:'x'});await click(t.w,'olSaveConfig');t.w.document.getElementById('olRoomCode').value=code;await click(t.w,i?'olJoin':'olCreate')}
await click(tabs[0].w,'olStart');const key='daishugoRooms/'+code+'/game',live=()=>JSON.parse(db.get(key).state);const g=live(),rank=count===4?[2,0,3,1]:[1,2,0];let seq=0;const template=copy(tabs[0].w.eval("DATA.catalog.find(c=>c.name==='ゴブリン')"));g.players.forEach((p,i)=>{p.hand=[{...template,id:'ord'+seq++,number:String(count-rank.indexOf(i)),bp:1000},{...template,id:'ord'+seq++}];p.cost=3;p.passed=false});g.initialLeadChoices=g.players.map(()=>null);g.initialLeadConfirmed=g.players.map(()=>false);db.put(key,{revision:db.get(key).revision+1,state:JSON.stringify(g)});await tick();
for(const t of tabs){t.w.eval('G.initialLeadChoices[activeHumanSeat()]=G.players[activeHumanSeat()].hand[0].id;renderInitialLead()');await click(t.w,'initialLeadConfirm')}
await tick(100);assert.deepEqual(live().turnOrder,rank);assert.equal(live().current,rank[0]);assert(live().players.every(p=>p.grave.length===1));for(const t of tabs)assert.deepEqual(Array.from(t.w.eval('G.turnOrder')),rank);
for(let i=0;i<count;i++){tabs[rank[i]].w.eval('afterAction(activeHumanSeat())');await tick(100);assert.equal(live().current,rank[(i+1)%count])}
// Skip a passed seat using the same order.
let s=live();s.players[rank[1]].passed=true;db.put(key,{revision:db.get(key).revision+1,state:JSON.stringify(s)});await tick();tabs[rank[0]].w.eval('afterAction(activeHumanSeat())');await tick(100);assert.equal(live().current,rank[2]);
// A cleared field starts from its owner, then preserves the original order.
tabs[rank[2]].w.eval('flow(activeHumanSeat());render()');await tick(100);assert.equal(live().current,rank[2]);assert.deepEqual(live().turnOrder,rank);
for(const t of tabs){t.w.eval('G.winner={index:activeHumanSeat()};renderMatchOutcome()');assert(t.w.document.querySelector('#matchOutcomeBanner.match-victory .outcome-ring'));assert.equal(t.w.document.querySelectorAll('.outcome-sparks i').length,16);assert.equal(t.w.document.querySelector('.outcome-title').textContent,'勝利')}
assert(tabs.every(t=>!t.errors.length),tabs.flatMap(t=>t.errors).join('\n'));console.log('PASS '+count+' clients: full strength ranking, synchronized fixed seat identities, cyclic turns, passed-seat skip, field restart and ornate result DOM');
}finally{tabs.forEach(t=>t.w.close())}}
const t=await load('index.html'),w=t.w;try{w.eval(`newGame();G.players.forEach((p,i)=>{p.human=true;p.hand=[{...DATA.catalog.find(c=>c.name==='ゴブリン'),id:'tie'+i,number:'3',bp:i===1?9000:1000}];});G.initialLeadChoices=G.players.map(p=>p.hand[0].id);G.initialLeadConfirmed=[true,true,true];resolveOpeningChoices()`);assert.equal(w.eval('G.turnOrder[0]'),1);assert.equal(w.eval('new Set(G.turnOrder).size'),3);console.log('PASS same-number BP comparison and tied ranks produce a complete permutation');}finally{w.close()}
})().catch(e=>{console.error(e.stack);process.exitCode=1});
