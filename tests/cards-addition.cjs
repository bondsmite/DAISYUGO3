const {load,DB,copy,tick,click}=require('./harness.cjs'),assert=require('assert');
(async()=>{
for(const page of ['index.html','online-mode.html']){
 const {w,errors}=await load(page);
 try{
 w.eval(`onlineMode=false;newGame();let seq=0;function card(name){return {...DATA.catalog.find(c=>c.name===name),id:'new'+seq++};}
 function fixture(){newGame();G.initialLeadPending=false;G.current=0;G.field=[];G.winner=null;locked=false;G.players.forEach(p=>{p.human=true;p.cost=3;p.hand=[card('ゴブリン')];p.deck=Array.from({length:5},()=>card('リュウ'));p.grave=[];});}
 function cast(name,spell){const p=G.players[0];p.hand.unshift(card(name));if(spell)p.hand.push(card(spell));return doPlay(0,0,spell?p.hand.at(-1).id:null);}
 window.entries=0;window.playTomodachiEntry=cb=>{entries++;cb?.();};window.playZomaEntry=cb=>cb?.();
 `);
 assert.equal(w.eval('ONLINE_IMPLEMENTED_NAMES.size'),68);
 assert.equal(w.eval(`card('スルト').cost`),1);assert.equal(w.eval(`card('大魔王ゾーマ').tribe`),'魔種族');
 for(const n of [4,5,9,10]){
 w.eval(`fixture();G.players[0].hand=[card('スルト'),...Array.from({length:${n}},()=>card('ゴブリン'))];`);
 assert.equal(w.eval('fieldNumber(G.players[0].hand[0])'),2+Math.floor(n/5));
 w.eval('doPlay(0,0)');assert.equal(w.eval('fieldNumber(G.field.at(-1).card)'),2+Math.floor(n/5));
 }
 w.eval(`fixture();G.field=[{player:1,card:card('ヒソカ')}];G.players[0].hand=[card('メルゼナ'),card('キュリア')];selected=G.players[0].hand[0].id;selectedSpell=G.players[0].hand[1].id;render();`);
 assert(!w.document.getElementById('playBtn').disabled);w.eval('playCard()');assert.equal(w.eval('G.field.at(-1).card.name'),'メルゼナ');assert.equal(w.eval('fieldNumber(G.field.at(-1).card)'),7);
 w.eval(`G.field.at(-1).card.zomaBonus=-6;G.gabrielBuffOwner=0;G.newWordBuffOwner=0;G.field.at(-1).card.bigLightBoost=true;`);assert.equal(w.eval('fieldNumber(G.field.at(-1).card)'),7);
 w.eval(`G.players[1].hand=[card('メルゼナ'),card('リオレウス')];`);assert.equal(w.eval('fieldNumber(G.players[1].hand[0])'),7);assert.equal(w.eval('fieldNumber(G.players[1].hand[1])'),4);
 w.eval(`G.players[1].deck=[card('リオレウス')];`);assert.equal(w.eval('fieldNumber(G.players[1].deck[0])'),2);
 w.eval('flow(0)');assert.equal(w.eval('fieldNumber(G.players[1].hand[0])'),2);
 w.eval(`fixture();G.field=[{player:1,card:card('梅喧')}];G.players[0].hand=[card('ハルク'),card('青眼の白龍'),card('ヒソカ')];`);
 assert(!w.eval('canPlay(G.players[0].hand[0])'));assert(!w.eval('canPlay(G.players[0].hand[1])'));assert(w.eval('canPlay(G.players[0].hand[2])'));
 w.eval(`fixture();G.field=[{player:1,card:card('ゴブリン')}];cast('ハウル')`);assert.equal(w.eval('G.players[0].deck.length'),3);
 w.eval(`fixture();cast('ハウル')`);assert.equal(w.eval('G.players[0].deck.length'),5);
 w.eval(`fixture();G.field=[{player:1,card:card('リボンちゃん')}];cast('金木研')`);assert.equal(w.eval('G.players[0].deck.length'),4);
 w.eval(`fixture();G.players[0].hand.push(card('リオレウス'));cast('マガイマガド');G.pendingExcelChoice.selected=G.pendingExcelChoice.ids;finishExcelChoice()`);assert.equal(w.eval('G.players[0].grave[0].name'),'リオレウス');if(w.eval('G.resultPresentation?.active'))await tick(3100);assert.equal(w.eval('G.current'),1);
 for(const n of [0,1,2,3,4]){
 w.eval(`fixture();G.players[1].deck=Array.from({length:${n}},()=>card('リュウ'));cast('ルーファウス');G.pendingExcelChoice.selected=['1'];finishExcelChoice();`);
 if(n){assert.equal(w.eval('G.pendingExcelChoice.revealed.length'),Math.min(n,3));w.eval('G.pendingExcelChoice.selected=[G.pendingExcelChoice.ids[0]];finishExcelChoice()');}
 assert.equal(w.eval('G.players[1].deck.length'),Math.max(0,n-1));assert.equal(w.eval('G.players[1].grave.length'),n?1:0);if(w.eval('G.resultPresentation?.active'))await tick(3100);assert.equal(w.eval('G.current'),1);
 }
 for(const n of [0,2,5,6]){
 w.eval(`fixture();entries=0;G.players.forEach((p,i)=>p.grave=Array.from({length:Math.floor(${n}/3)+(i<${n}%3?1:0)},()=>card('マキマ')));cast('ともだち');`);
 assert.equal(w.eval('G.revolution'),n===6);assert.equal(w.eval('entries'),n===6?1:0);assert.equal(w.eval('G.playEvent.card.effectActivated'),n===6);
 }
 w.eval(`fixture();G.players[0].hand=[card('ゴブリン'),card('リュウ')];cast('大魔王ゾーマ')`);assert.equal(w.eval('fieldNumber(G.players[0].hand[0])'),3);assert.equal(w.eval('fieldNumber(G.players[0].hand[1])'),1);
 assert(!errors.length,errors.join('\n'));console.log('PASS '+page+': 7 additions, Surt boundaries, Zoma tribe, Qurio/Malzeno priority and expiry, choices, Tomodachi 0/2/5/6');
 }finally{w.close()}
}
const db=new DB(),tabs=[];
try{
 for(let i=0;i<3;i++){const t=await load('online-mode.html');tabs.push(t);t.w.firebase=db.firebase('add'+i);t.w.document.getElementById('olConfig').value=JSON.stringify({apiKey:'test',authDomain:'test',databaseURL:'test',projectId:'test',appId:'test'});await click(t.w,'olSaveConfig');t.w.document.getElementById('olRoomCode').value='7891';await click(t.w,i?'olJoin':'olCreate');}
 await click(tabs[0].w,'olStart');tabs.forEach(t=>t.w.eval('G.initialLeadChoices[activeHumanSeat()]=G.players[activeHumanSeat()].hand.find(c=>c.kind==="follower").id;renderInitialLead()'));tabs.forEach(t=>t.w.document.getElementById('initialLeadConfirm').click());await tick(100);
 const key='daishugoRooms/7891/game',live=()=>JSON.parse(db.get(key).state);let seq=0;const catalog=tabs[0].w.eval('DATA.catalog'),card=name=>({...copy(catalog.find(c=>c.name===name)),id:'netadd'+seq++});
 for(const name of ['ルーファウス','マガイマガド','メルゼナ','ともだち']){
 let g=live();g.current=2;g.winner=null;g.field=[];g.actionLocked=false;g.qurioUsed=false;g.qurioBonus=0;g.revolution=false;for(const k of Object.keys(g))if(k.startsWith('pending'))g[k]=false;
 g.players.forEach(p=>{p.hand=[card('リオレウス'),card('ゴブリン')];p.deck=[card('リュウ'),card('アヤシシ'),card('ゴブリン'),card('スルト')];p.grave=[];p.cost=3;p.passed=false;});g.players[2].hand.unshift(card(name));if(name==='メルゼナ')g.players[2].hand.push(card('キュリア'));
 db.put(key,{revision:db.get(key).revision+1,state:JSON.stringify(g)});await tick();
 for(const t of tabs)t.w.eval('window.entries=0;window.playTomodachiEntry=()=>{entries++}');
 const w=tabs[2].w;w.eval(`selectCard(G.players[2].hand.find(c=>c.name===${JSON.stringify(name)}).id)`);if(name==='メルゼナ')w.eval(`selectCard(G.players[2].hand.find(c=>c.name==='キュリア').id)`);await click(w,'playBtn');
 while(live().pendingExcelChoice){
 assert.equal(live().current,2);db.put(key,{revision:db.get(key).revision+1,state:JSON.stringify(live())});await tick();
 assert.equal(w.document.getElementById('excelChoiceModal').style.display,'flex');assert(!tabs[0].w.document.getElementById('excelChoiceModal'));
 w.eval('G.pendingExcelChoice.selected=G.pendingExcelChoice.ids.slice(0,G.pendingExcelChoice.max);renderExcelChoice()');await click(w,'excelChoiceConfirm');
 }
 if(live().resultPresentation?.active)await tick(live().resultPresentation.events.length*3000+150);assert.equal(live().current,0);for(const t of tabs){assert.equal(t.w.eval('JSON.stringify(G.players)'),JSON.stringify(live().players));if(name==='ともだち')assert.equal(t.w.eval('entries'),0);if(name==='メルゼナ')assert.equal(t.w.eval('fieldNumber(G.field.at(-1).card)'),7);}
 }
 assert(tabs.every(t=>!t.errors.length),tabs.flatMap(t=>t.errors).join('\n'));console.log('PASS three-client guest effects: targets, public reveal, destruction, restore, Malzeno, no Tomodachi animation without 6 L');
}finally{tabs.forEach(t=>t.w.close())}
})().then(()=>process.exit(0)).catch(e=>{console.error(e.stack);process.exit(1)});
