const {load,DB,copy,tick,click}=require('./harness.cjs'),assert=require('assert');
(async()=>{
const t=await load('index.html'),w=t.w;
try {
w.eval(`newGame(); G.players.forEach(p=>p.human=true); G.initialLeadPending=false; locked=false;
let testId=0; function tc(name){return {...DATA.catalog.find(c=>c.name===name),id:'excel-'+testId++};}
window.playZomaEntry=cb=>cb?.();
function fixture(){
 G.current=0;G.winner=null;G.field=[];G.turn=3;G.revolution=false;G.sherryRestoreRevolution=null;G.forbiddenNumber=null;G.forbiddenNumbers=[];
 G.gabrielBuffOwner=null;G.newWordBuffOwner=null;G.makimaActive=false;
 for(const k of Object.keys(G))if(k.startsWith('pending'))G[k]=false;
 G.players.forEach(p=>{p.human=true;p.cost=3;p.hand=[tc('ゴブリン'),tc('リュウ')];p.deck=[tc('ゴブリン'),tc('リュウ')];p.grave=[];p.playedLRounds=[];p.passed=false;});
}
function cast(name){const c=tc(name);G.players[0].hand.unshift(c);doPlay(0,0);return c;}
`);
assert.equal(w.eval('ONLINE_IMPLEMENTED_NAMES.size'),68);
assert(w.eval('validateDeckNames(STARTER_DECK_NAMES).ok'));
assert.equal(w.eval('mkDeck().length'),35);
for(const [name,bp,number] of [['ネート',5000,'1'],['リボンちゃん',3000,'1'],['スルト',8000,'2'],['ハルク',10000,'4']]){const c=w.eval(`tc(${JSON.stringify(name)})`);assert.equal(c.bp,bp);assert.equal(c.number,number);}
w.eval(`fixture();G.players[0].hand=[tc('スルト'),...Array.from({length:10},()=>tc('ゴブリン'))];`);assert.equal(w.eval('fieldNumber(G.players[0].hand[0])'),4);
w.eval(`fixture();cast('ヨッシー');`);assert.equal(w.eval('G.field[0].card.bp'),10000);w.eval('flow(0)');assert.equal(w.eval("G.players[0].grave.find(c=>c.name==='ヨッシー').bp"),4000);
w.eval(`fixture();G.players[1].hand.push(tc('マキマ'));G.players[2].deck.push(tc('ニューワード'));cast('ルクソード');`);assert.equal(w.eval('G.players.reduce((n,p)=>n+p.grave.filter(c=>c.number==="L").length,0)'),2);
w.eval(`fixture();G.players[0].playedLRounds=[2,3];G.players[1].hand.push(tc('マキマ'));cast('ルクソード');`);assert(w.eval('G.players[1].hand.some(c=>c.number==="L")'));
w.eval(`fixture();G.players[0].deck=[tc('リオレウス'),tc('青眼の白龍')];cast('リオレウス');`);assert(w.eval('!!G.pendingExcelChoice'));assert.equal(w.eval('G.current'),0);w.eval('G.pendingExcelChoice.selected=[G.pendingExcelChoice.ids[0]];finishExcelChoice()');if(w.eval('G.resultPresentation?.active'))await tick(w.eval('G.resultPresentation.events.length')*3000+100);assert.equal(w.eval('G.current'),1);assert(w.eval('G.players[0].hand.some(c=>c.name==="リオレウス")'));
w.eval(`fixture();G.players[0].hand=[tc('ゴブリン'),tc('ハルク')];cast('大魔王ゾーマ');`);assert.equal(w.eval('fieldNumber(G.players[0].hand[0])'),3);assert.equal(w.eval('fieldNumber(G.players[0].hand[1])'),2);assert.equal(w.eval('fieldNumber(G.players[1].hand[0])'),1);
w.eval(`fixture();cast('ともだち');`);assert(!w.eval('G.revolution'));w.eval(`fixture();G.players[0].grave=Array.from({length:6},()=>tc('マキマ'));resolveFanfare(0,tc('ともだち'));flow(0)`);assert(w.eval('G.revolution'));
w.eval(`fixture();G.players[0].hand=[tc('ゴブリン'),tc('球磨川禊'),tc('リュウ')];G.players[0].deck=[tc('ゴブリン'),tc('球磨川禊'),tc('リュウ')];cast('アルティメットまどか');`);assert.equal(w.eval('G.pendingExcelChoice.min'),0);w.eval('G.pendingExcelChoice.selected=G.pendingExcelChoice.ids.slice(0,2);finishExcelChoice()');assert.equal(w.eval('G.pendingExcelChoice.stage'),'search');assert.equal(w.eval('G.current'),0);w.eval('G.pendingExcelChoice.selected=G.pendingExcelChoice.ids;finishExcelChoice()');if(w.eval('G.resultPresentation?.active'))await tick(w.eval('G.resultPresentation.events.length')*3000+100);assert.equal(w.eval('G.current'),1);
w.eval(`fixture();cast('アルティメットまどか');G.pendingExcelChoice.selected=[];finishExcelChoice();`);if(w.eval('G.resultPresentation?.active'))await tick(w.eval('G.resultPresentation.events.length')*3000+100);assert.equal(w.eval('G.current'),1);
w.eval(`fixture();G.players[0].hand=[tc('ゴブリン'),tc('アルセウスフォン')];G.players[0].deck=[tc('アヤシシ')];doPlay(0,0,G.players[0].hand[1].id);`);assert.equal(w.eval('G.field.length'),0);w.eval('G.pendingExcelChoice.selected=G.pendingExcelChoice.ids;finishExcelChoice()');assert.equal(w.eval('G.field.length'),1);assert.equal(w.eval('G.players[0].cost'),2);assert(w.eval('G.players[0].hand.some(c=>c.name==="アヤシシ")'));
w.eval(`fixture();G.players[0].hand=[tc('リオレウス'),tc('サラマンダーブレス')];G.players[1].hand=[tc('マキマ'),tc('ゴジラ')];G.players[2].hand=[tc('ハルク'),tc('リュウ')];doPlay(0,0,G.players[0].hand[1].id);`);assert.equal(w.eval('G.players[1].grave[0].name'),'マキマ');assert.equal(w.eval('G.players[2].grave[0].name'),'ハルク');
w.eval(`fixture();G.players[0].human=false;G.players[0].deck=[tc('リオレウス')];cast('リオレウス');`);assert(!w.eval('G.pendingExcelChoice'));assert(w.eval('G.players[0].hand.some(c=>c.name==="リオレウス")'));
assert(!t.errors.length,t.errors.join('\n'));console.log('PASS Excel catalog, four revisions, eight effects, optional/mandatory choices, CPU, and field reset');
}finally{w.close();}
const db=new DB(),tabs=[];
try{
for(let i=0;i<3;i++){const t=await load('online-mode.html');tabs.push(t);t.w.firebase=db.firebase('excel'+i);t.w.document.getElementById('olConfig').value=JSON.stringify({apiKey:'test',authDomain:'test',databaseURL:'test',projectId:'test',appId:'test'});await click(t.w,'olSaveConfig');t.w.document.getElementById('olRoomCode').value='7890';await click(t.w,i?'olJoin':'olCreate');}
await click(tabs[0].w,'olStart');tabs.forEach(t=>t.w.eval('G.initialLeadChoices[activeHumanSeat()]=G.players[activeHumanSeat()].hand.find(c=>c.kind==="follower").id;renderInitialLead()'));tabs.forEach(t=>t.w.document.getElementById('initialLeadConfirm').click());await tick(100);
const key='daishugoRooms/7890/game',live=()=>JSON.parse(db.get(key).state);let id=0;const catalog=tabs[0].w.eval('DATA.catalog'),card=name=>({...copy(catalog.find(c=>c.name===name)),id:'net-'+id++});
for(const name of ['リオレウス','アルティメットまどか','アルセウスフォン']){
let g=live();g.current=2;g.winner=null;g.field=[];g.actionLocked=false;for(const k of Object.keys(g))if(k.startsWith('pending'))g[k]=false;
g.players.forEach(p=>{p.hand=[card('ゴブリン'),card('球磨川禊')];p.deck=[card('リオレウス'),card('アヤシシ'),card('ゴブリン')];p.grave=[];p.cost=3;p.passed=false;});g.players[2].hand.unshift(card(name));db.put(key,{revision:db.get(key).revision+1,state:JSON.stringify(g)});await tick();
const w=tabs[2].w;w.eval(name==='アルセウスフォン'?`selectCard(G.players[2].hand.find(c=>c.name==='アルセウスフォン').id);selectCard(G.players[2].hand.find(c=>c.name==='ゴブリン').id);`:`selectCard(G.players[2].hand.find(c=>c.name===${JSON.stringify(name)}).id);`);await click(w,'playBtn');assert(live().pendingExcelChoice,name);assert.equal(live().current,2);
// Simulate receiving the same pending state again, as on reconnect.
db.put(key,{revision:db.get(key).revision+1,state:JSON.stringify(live())});await tick();assert.equal(w.document.getElementById('excelChoiceModal').style.display,'flex');assert(!tabs[0].w.document.getElementById('excelChoiceModal'));
while(live().pendingExcelChoice){w.eval('G.pendingExcelChoice.selected=G.pendingExcelChoice.ids.slice(0,G.pendingExcelChoice.max);renderExcelChoice()');await click(w,'excelChoiceConfirm');}
if(live().resultPresentation?.active)await tick(live().resultPresentation.events.length*3000+150);assert.equal(live().current,0);for(const t of tabs)assert.equal(t.w.eval('JSON.stringify(G.players)'),JSON.stringify(live().players));
}
assert(tabs.every(t=>!t.errors.length),tabs.flatMap(t=>t.errors).join('\n'));console.log('PASS guest search / two-stage Madoka / spell: three-client sync, owner-only choice, restore, one turn advancement');
}finally{tabs.forEach(t=>t.w.close());}
})().catch(e=>{console.error(e.stack);process.exitCode=1});
