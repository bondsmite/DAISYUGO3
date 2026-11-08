const {load,DB,copy,tick,click}=require('./harness.cjs'),assert=require('assert');
(async()=>{
const t=await load('index.html'),w=t.w;
try{
w.eval(`newGame();let tid=0;function tc(name){return {...DATA.catalog.find(c=>c.name===name),id:'title'+tid++};}
function fixture(){newGame();G.initialLeadPending=false;G.current=0;G.winner=null;G.field=[];locked=false;G.players.forEach(p=>{p.human=true;p.hand=[tc('ゴブリン')];p.deck=Array.from({length:20},()=>tc('リュウ'));p.grave=[];p.cost=3;});}
function cast(name){G.players[0].hand.unshift(tc(name));doPlay(0,0);afterAction(0);}
function count(k){return G.titleMatchProgress[k]||0;}
function effect(name){const c=tc(name);c.dasetEntryEffectPlayed=true;G.field.push({player:0,card:c});resolveFanfare(0,c);}
`);
const expected=[['buttercup_zero','最強の女の子',30],['nergigante_three','滅尽龍',30],['newword_seven','新たなる言葉',30],['makima_play','支配の悪魔',100],['hisoka_seven','そろそろ狩るか…♠',50],['ban_draw','強欲の罪',50],['wesker_recover','完全なる存在',50],['ultimate_combo','究極のコンボ',2]];
for(const [id,name,goal] of expected){const t=w.eval(`DAISHUGO_TITLES.find(x=>x.id==='${id}')`);assert.equal(t.name,name);assert.equal(t.goal,goal);}
w.eval(`fixture();cast('バターカップ');`);assert.equal(w.eval(`count('buttercup_zero')`),0);
w.eval(`fixture();G.field=[{player:1,card:tc('ゴブリン')},{player:2,card:tc('リュウ')}];cast('バターカップ');`);assert.equal(w.eval(`count('buttercup_zero')`),1);
for(const n of [2,3,5]){w.eval(`fixture();G.field=Array.from({length:${n}},(_,i)=>({player:i%3,card:tc('ゴブリン')}));effect('ネルギガンテ');`);assert.equal(w.eval(`count('nergigante_three')`),n>=3?1:0);}
for(const [name,bonus,expected] of [['青眼の白龍',0,1],['ヒソカ',0,1],['ジェネシスドラゴン',0,0],['青眼の白龍',2,0]]){
w.eval(`fixture();G.newWordBuffOwner=0;G.players[0].hand.unshift(tc('${name}'));G.players[0].hand[0].zomaBonus=${bonus};doPlay(0,0);afterAction(0);`);assert.equal(w.eval(`count('newword_seven')`),expected,name);}
w.eval(`fixture();G.newWordBuffOwner=0;G.qurioUsed=true;cast('メルゼナ');`);assert.equal(w.eval(`count('newword_seven')`),0);
w.eval(`fixture();cast('マキマ');`);assert.equal(w.eval(`count('makima_play')`),1);
for(const n of [6,7]){w.eval(`fixture();const below=tc('ゴブリン');below.number='${n}';below.bp=0;G.field=[{player:1,card:below}];cast('ヒソカ');`);assert.equal(w.eval(`count('hisoka_seven')`),n===7?1:0);}
for(const n of [0,1,3]){w.eval(`fixture();G.players[0].deck=Array.from({length:${n}},()=>tc('リュウ'));G.field=[{player:1,card:tc('ゴブリン')}];effect('バン');`);assert.equal(w.eval(`count('ban_draw')`),n?1:0);}
w.eval(`fixture();effect('ウェスカー');`);assert.equal(w.eval(`count('wesker_recover')`),0);
w.eval(`fixture();G.players[0].grave=[tc('ゴブリン')];effect('ウェスカー');resolveMadokaPick(G.players[0].grave[0].id);`);assert.equal(w.eval(`count('wesker_recover')`),1);
// Five real distinct draw effects; same-name repeats and another player's effects do not fill the set.
w.eval(`fixture();effect('アヤシシ');effect('アヤシシ');effect('碇ゲンドウ');effect('ダセット');effect('バターカップ');`);assert.equal(w.eval(`count('ultimate_combo')`),0);
w.eval(`G.field.push({player:1,card:tc('ソニック')});resolveFanfare(1,G.field.at(-1).card);`);assert.equal(w.eval(`count('ultimate_combo')`),0);
w.eval(`effect('ソニック');effect('スパイダーマン');`);assert.equal(w.eval(`count('ultimate_combo')`),1);
w.eval(`flow(0);effect('アヤシシ');effect('碇ゲンドウ');effect('ダセット');effect('バターカップ');effect('ソニック');`);assert.equal(w.eval(`count('ultimate_combo')`),2);
// Non-activating conditions, no-effect plays and standalone spell changes are not activations.
w.eval(`fixture();effect('ともだち');effect('ハウル');effect('ゴブリン');`);assert.equal(w.eval('Object.keys(G.titleComboBySeat||{}).length'),0);
// Async choice is counted after completion, once; repeat resolution cannot add another point.
w.eval(`fixture();G.players[0].grave=[tc('ゴブリン')];effect('ウェスカー');`);assert.equal(w.eval('Object.keys(G.titleComboBySeat||{}).length'),0);w.eval(`resolveMadokaPick(G.players[0].grave[0].id);`);assert(w.eval(`G.titleComboBySeat[0].names.includes('ウェスカー')`));
// Persist all new keys, preserve existing values, unlock and equip at the exact goals.
w.eval(`fixture();localStorage.setItem(DAISHUGO_TITLE_STATS_KEY,JSON.stringify({roxas_zero:17}));`);
for(const [id,,goal] of expected)w.eval(`G.titleMatchProgress['${id}']=${goal};`);
w.eval('commitTitleProgress();commitTitleProgress();');assert.equal(w.eval('loadTitleStats().roxas_zero'),17);
for(const [id,,goal] of expected){assert.equal(w.eval(`loadTitleStats()['${id}']`),goal);w.eval(`localStorage.setItem(DAISHUGO_SELECTED_TITLE_KEY,'${id}')`);assert.equal(w.eval('selectedTitle().id'),id);}
assert(!t.errors.length,t.errors.join('\n'));console.log('PASS 8 title definitions, thresholds, success/failure cases, distinct/owner/round combo, async choice, persistence, no double commit, equip');
}finally{w.close()}
const db=new DB(),tabs=[];
try{
for(let i=0;i<3;i++){const t=await load('online-mode.html');tabs.push(t);t.w.firebase=db.firebase('titles'+i);t.w.document.getElementById('olConfig').value=JSON.stringify({apiKey:'test',authDomain:'test',databaseURL:'test',projectId:'test',appId:'test'});await click(t.w,'olSaveConfig');t.w.document.getElementById('olRoomCode').value='8213';await click(t.w,i?'olJoin':'olCreate');}
await click(tabs[0].w,'olStart');tabs.forEach(t=>t.w.eval('G.initialLeadChoices[activeHumanSeat()]=G.players[activeHumanSeat()].hand.find(c=>c.kind==="follower").id;renderInitialLead()'));tabs.forEach(t=>t.w.document.getElementById('initialLeadConfirm').click());await tick(100);
const key='daishugoRooms/8213/game',live=()=>JSON.parse(db.get(key).state);let seq=0;const catalog=tabs[0].w.eval('DATA.catalog'),card=name=>({...copy(catalog.find(c=>c.name===name)),id:'nt'+seq++});
let g=live();g.current=2;g.winner=null;g.field=[];g.actionLocked=false;g.titleComboBySeat={2:{names:['アヤシシ','ソニック','碇ゲンドウ','ダセット'],awarded:false}};g.titleBySeat={};g.players.forEach(p=>{p.hand=[card('ゴブリン')];p.deck=[card('リュウ'),card('ゴブリン')];p.grave=[];p.cost=3;p.passed=false});g.players[2].hand.unshift(card('ウェスカー'));g.players[2].grave=[card('ゴブリン')];db.put(key,{revision:db.get(key).revision+1,state:JSON.stringify(g)});await tick();
const w=tabs[2].w;w.eval(`selectCard(G.players[2].hand[0].id)`);await click(w,'playBtn');assert(live().pendingMadoka);assert.equal(live().titleBySeat[2]?.ultimate_combo||0,0);
w.eval(`resolveMadokaPick(G.players[2].grave[0].id)`);await tick(100);assert.equal(live().titleBySeat[2].wesker_recover,1);assert.equal(live().titleBySeat[2].ultimate_combo,1);
g=live();g.winner={index:0};db.put(key,{revision:db.get(key).revision+1,state:JSON.stringify(g)});await tick();
for(const t of tabs)t.w.eval('commitOnlineTitles();commitOnlineTitles()');assert.equal(w.eval('loadTitleStats().wesker_recover'),1);assert.equal(w.eval('loadTitleStats().ultimate_combo'),1);assert.equal(tabs[0].w.eval('loadTitleStats().wesker_recover'),0);
assert(tabs.every(t=>!t.errors.length),tabs.flatMap(t=>t.errors).join('\n'));console.log('PASS three clients: guest async effect and fifth combo, synchronized owner progress, per-device commit and deduplication');
}finally{tabs.forEach(t=>t.w.close())}
})().then(()=>process.exit(0)).catch(e=>{console.error(e.stack);process.exit(1)});
