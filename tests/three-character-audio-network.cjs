const {load,tick,DB,copy,click}=require('./harness.cjs'),assert=require('assert');
(async()=>{for(const count of [3,4]){const db=new DB(),tabs=[],code='73'+count+'2';try{
for(let i=0;i<count;i++){const t=await load(count===4?'online-mode-4.html':'online-mode.html');tabs.push(t);t.w.firebase=db.firebase('audio'+i);t.w.document.getElementById('olConfig').value=JSON.stringify({apiKey:'x',authDomain:'x',databaseURL:'x',projectId:'x',appId:'x'});await click(t.w,'olSaveConfig');t.w.document.getElementById('olRoomCode').value=code;await click(t.w,i?'olJoin':'olCreate')}
await click(tabs[0].w,'olStart');const key='daishugoRooms/'+code+'/game',live=()=>JSON.parse(db.get(key).state),actor=tabs.at(-1).w;let id=0;const cat=actor.eval('DATA.catalog'),c=n=>({...copy(cat.find(c=>c.name===n)),id:'a'+id++});
for(const t of tabs){const timer=t.w.setTimeout.bind(t.w);t.w.setTimeout=(f,ms,...args)=>timer(f,[2000,7000].includes(ms)?150:ms,...args);}
for(const [name,tracks] of [['大魔王ゾーマ',['zoma-bgm.mp3']],['ともだち',['tomodachi-voice.m4a','tomodachi-bgm.mp3']],['佐野万次郎',['sano-inaiyona.m4a','sano-white-noise.mp3']]]){
const g=live();g.initialLeadPending=false;g.current=count-1;g.field=[];g.playEvents=[];g.playEvent=null;g.resultPresentation=null;g.effectResultContext=null;g.actionLocked=false;g.winner=null;g.players.forEach(p=>{p.hand=[c('ゴブリン')];p.deck=[c('リュウ'),c('ソラ')];p.grave=[];p.cost=3;p.passed=false});g.players.at(-1).hand=[c(name),c('ゴブリン')];if(name==='ともだち')g.players[0].grave=Array.from({length:6},()=>c('マキマ'));db.put(key,{revision:db.get(key).revision+1,state:JSON.stringify(g)});await tick();tabs.forEach(t=>t.w.__playedAudio.length=0);actor.eval('selected=G.players[activeHumanSeat()].hand[0].id;render()');await click(actor,'playBtn');await tick(350);
for(let i=0;i<count;i++)for(const track of tracks)assert(tabs[i].w.__playedAudio.some(s=>s.endsWith(track)),name+' seat '+i+' missing '+track);
assert(!live().actionLocked,name+' unlocks shared state');console.log('PASS '+count+' clients '+name+': voice/theme on actor and every peer');
}
assert(tabs.every(t=>!t.errors.length),tabs.flatMap(t=>t.errors).join('\n'));
}finally{tabs.forEach(t=>t.w.close())}}})().catch(e=>{console.error(e.stack);process.exitCode=1});
