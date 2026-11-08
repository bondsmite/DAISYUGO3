const {load,DB,copy,tick,click}=require('./harness.cjs'),assert=require('assert');
(async()=>{
for(const count of [3,4]){
 const db=new DB(),tabs=[],extra=[];const code=count===4?'8404':'8403',page=count===4?'online-mode-4.html':'online-mode.html';
 async function join(p=page,create=false){const t=await load(p);t.w.firebase=db.firebase('four'+(tabs.length+extra.length));t.w.document.getElementById('olConfig').value=JSON.stringify({apiKey:'test',authDomain:'test',databaseURL:'test',projectId:'test',appId:'test'});await click(t.w,'olSaveConfig');t.w.document.getElementById('olRoomCode').value=code;await click(t.w,create?'olCreate':'olJoin');return t;}
 try{
 tabs.push(await join(page,true));
 for(let i=1;i<count;i++){if(count===4)assert(tabs[0].w.document.getElementById('olStart').disabled);tabs.push(await join());}
 assert(!tabs[0].w.document.getElementById('olStart').disabled);
 if(count===4){extra.push(await join('online-mode.html'));assert(extra[0].w.document.getElementById('olStatus').textContent.includes('人数モード'));extra.push(await join());assert(extra[1].w.document.getElementById('olStatus').textContent.includes('満員'));}
 await click(tabs[0].w,'olStart');const key='daishugoRooms/'+code+'/game',live=()=>JSON.parse(db.get(key).state);
 assert.equal(live().players.length,count);assert(live().players.every(p=>p.human&&p.hand.length===5&&p.deck.length===30));
 for(let i=0;i<count;i++){assert.equal(tabs[i].w.eval('activeHumanSeat()'),i);tabs[i].w.eval('G.initialLeadChoices[activeHumanSeat()]=G.players[activeHumanSeat()].hand.find(c=>c.kind==="follower").id;renderInitialLead()');}
 for(let i=0;i<count-1;i++)await click(tabs[i].w,'initialLeadConfirm');assert(live().initialLeadPending);await click(tabs.at(-1).w,'initialLeadConfirm');await tick(100);assert(!live().initialLeadPending);
 let id=0;const catalog=tabs[0].w.eval('DATA.catalog'),card=name=>({...copy(catalog.find(c=>c.name===name)),id:'four'+id++});
 async function fixture(actor,name,change=()=>{}){const g=live();g.current=actor;g.winner=null;g.field=[];g.passes=0;g.actionLocked=false;g.revolution=false;g.sherryRestoreRevolution=null;g.forbiddenNumber=null;g.forbiddenNumbers=[];g.newWordBuffOwner=null;g.gabrielBuffOwner=null;g.makimaActive=false;g.qurioUsed=false;g.qurioBonus=0;g.titleEffectPending=null;g.effectResultContext=null;g.effectResultBuffer=[];g.resultPresentation=null;for(const k in g)if(k.startsWith('pending'))g[k]=false;g.players.forEach(p=>{p.cost=3;p.hand=[card('ゴブリン'),card('リュウ')];p.deck=Array.from({length:5},()=>card('リュウ'));p.grave=[];p.passed=false;});if(name)g.players[actor].hand.unshift(card(name));change(g);db.put(key,{revision:db.get(key).revision+1,state:JSON.stringify(g)});await tick();return tabs[actor].w;}
 async function play(w){w.eval('selectCard(G.players[activeHumanSeat()].hand[0].id)');await click(w,'playBtn');}
 // Cure modal: every seat, actual number buttons, state redelivery, observer hidden, one turn advancement.
 for(let actor=0;actor<count;actor++){
 const w=await fixture(actor,'キュアレモネード');await play(w);assert(live().pendingCureLemonade);
 const el=w.document.getElementById('cureLemonadeModal');assert.equal(el.style.display,'flex');assert.equal(w.getComputedStyle(el).display,'flex');assert(!el.hidden);
 for(let i=0;i<count;i++)if(i!==actor)assert.equal(tabs[i].w.document.getElementById('cureLemonadeModal').style.display,'none');
 el.querySelector('[data-cure-number="1"]').click();db.put(key,{revision:db.get(key).revision+1,state:JSON.stringify(live())});await tick();assert.deepEqual(Array.from(w.eval('G.cureLemonadeChoices')),['1']);
 el.querySelector('[data-cure-number="7"]').click();await click(w,'cureLemonadeConfirm');assert(!live().pendingCureLemonade);assert.deepEqual(live().forbiddenNumbers,['1','7']);assert.equal(live().current,(actor+1)%count);assert.equal(el.style.display,'none');
 for(const t of tabs)assert.deepEqual(Array.from(t.w.eval('G.forbiddenNumbers')),['1','7']);
 }
 if(count===4){
 await fixture(3,'ゴブリン');await play(tabs[3].w);assert.equal(live().current,0);
 const turn=live().turn;for(let i=0;i<2;i++){await click(tabs[i].w,'passBtn');assert(live().field.length);}await click(tabs[2].w,'passBtn');assert.equal(live().field.length,0);assert.equal(live().current,3);assert.equal(live().turn,turn+1);assert(live().players.every(p=>p.cost===3));
 // Four simultaneous decisions: wait for the fourth confirmation.
 const w=await fixture(3,'ネク');await play(w);assert.equal(live().nekuConfirmed.length,4);
 for(let i=0;i<3;i++){tabs[i].w.eval('selectCard(G.players[activeHumanSeat()].hand[0].id)');await click(tabs[i].w,'effectDoneBtn');}assert(live().pendingNeku);tabs[3].w.eval('selectCard(G.players[3].hand[0].id)');await click(tabs[3].w,'effectDoneBtn');await tick(100);assert(!live().pendingNeku);assert(live().resultPresentation.active);await tick(4100);assert.equal(live().current,0);assert(live().players.every(p=>p.grave.length===1));
 await fixture(3,'星野アイ');await play(w);await tick(2700);assert.equal(live().hoshinoAiConfirmed.length,4);
 for(let i=0;i<4;i++){tabs[i].w.eval('selectedHoshinoAiIds=G.players[activeHumanSeat()].hand.filter(c=>c.tribe==="英種族").slice(0,1).map(c=>c.id);confirmHoshinoAi()');await tick();if(i<3)assert(live().pendingHoshinoAi);}await tick(100);assert(!live().pendingHoshinoAi);await tick(live().resultPresentation.events.length*1000+100);assert.equal(live().current,0);
 // Four-player global effect must include seat four.
 await fixture(0,'ルクソード',g=>{g.turn=8;g.players.forEach(p=>{p.playedLRounds=[];p.hand.push(card('マキマ'));p.deck.push(card('ニューワード'))})});await play(tabs[0].w);assert(live().players.every(p=>p.grave.length===2));
 // Revolution toggles both ways when six L are present; same UI/media on all four clients.
 for(const initial of [false,true]){await fixture(3,'ともだち',g=>{g.revolution=initial;g.players.forEach((p,i)=>p.grave=Array.from({length:i<2?2:1},()=>card('マキマ')))});await play(w);assert(live().actionLocked);assert(tabs.every(t=>t.w.document.getElementById('tomodachiEntryOverlay')));await tick(7250);assert.equal(live().revolution,!initial);assert.equal(live().current,0);assert(!live().actionLocked);tabs.forEach(t=>t.w.eval('cancelZomaBgm()'));}
 await fixture(3,'ともだち',g=>{g.revolution=true;g.players[0].grave=Array.from({length:5},()=>card('マキマ'))});await play(w);assert(live().revolution);assert(!live().actionLocked);assert(tabs.every(t=>!t.w.document.getElementById('tomodachiEntryOverlay')));
 }
 assert(tabs.every(t=>!t.errors.length),tabs.flatMap(t=>t.errors).join('\n'));console.log('PASS '+count+' humans: rooms, seats, opening, all-seat Cure visibility/draft/restriction/advance'+(count===4?', wraparound, three passes, Neku/Ai four-way choices, global effects, Tomodachi toggle/animation':' (existing mode preserved)'));
 }finally{[...tabs,...extra].forEach(t=>t.w.close())}
}
})().then(()=>process.exit(0)).catch(e=>{console.error(e.stack);process.exit(1)});
