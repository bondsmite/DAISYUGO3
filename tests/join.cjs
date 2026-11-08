const {load,DB,copy,tick,click}=require('./harness.cjs');
const assert=require('assert');
// Model a fresh Firebase client: transaction callback initially sees null,
// then receives server data after a hash conflict. Retry concurrent updates.
class ColdDB extends DB {
  constructor(){super();this.retries=0;}
  ref(p){
    const ref=super.ref(p),db=this;
    let cold=true;
    ref.transaction=async fn=>{
      let cached=cold?null:copy(db.get(p));
      cold=false;
      for(let i=0;i<20;i++){
        const before=JSON.stringify(cached),next=fn(copy(cached));
        if(next===undefined)return {committed:false,snapshot:db.snap(p)};
        await tick(2);
        if(before!==JSON.stringify(db.get(p))){cached=copy(db.get(p));db.retries++;continue;}
        db.put(p,next);return {committed:true,snapshot:db.snap(p)};
      }
      throw Error('transaction retry limit');
    };
    return ref;
  }
}
(async()=>{
  const db=new ColdDB(),tabs=[];
  async function client(id){
    const t=await load('online-mode.html',process.env.GAME_ROOT||undefined);tabs.push(t);
    t.w.firebase=db.firebase(id);
    t.w.localStorage.setItem('daishugo.playerName.v1',id);
    t.w.document.getElementById('olConfig').value=JSON.stringify({apiKey:'test',authDomain:'test',databaseURL:'test',projectId:'test',appId:'test'});
    await click(t.w,'olSaveConfig');return t.w;
  }
  const status=w=>w.document.getElementById('olStatus').textContent;
  async function enter(w,code,create=false){w.document.getElementById('olRoomCode').value=code;await click(w,create?'olCreate':'olJoin');}
  try{
    const host=await client('host'),a=await client('guest-a'),b=await client('guest-b');
    await enter(host,'4567',true);
    assert.match(status(host),/入室しました/);
    await Promise.all([enter(a,'4567'),enter(b,'4567')]);
    assert.match(status(a),/入室しました/);
    assert.match(status(b),/入室しました/);
    assert.equal(new Set(Object.values(db.get('daishugoRooms/4567/seats')).map(s=>s.uid)).size,3);
    assert(db.retries>=2);
    console.log('PASS cold-cache and simultaneous guest joins preserve all seats');
    const extra=await client('fourth');
    await enter(extra,'4567');assert.match(status(extra),/満員/);
    const full=JSON.stringify(db.get('daishugoRooms/4567'));
    await enter(extra,'4567',true);assert.match(status(extra),/使用中/);
    assert.equal(JSON.stringify(db.get('daishugoRooms/4567')),full);
    await enter(extra,'9999');assert.match(status(extra),/見つかりません/);
    assert.equal(db.get('daishugoRooms/9999'),null);
    db.put('daishugoRooms/1111',{schema:4,hostUid:'old',seats:{0:{uid:'old'}}});
    await enter(extra,'1111');assert.match(status(extra),/異なる版/);
    assert.equal(db.get('daishugoRooms/1111').seats[1],undefined);
    await click(host,'olStart');await tick(150);
    assert.equal(db.get('daishugoRooms/4567').started,true,status(host));
    assert.equal(a.eval('G.initialLeadPending'),true);
    assert.equal(b.eval('G.initialLeadPending'),true);
    await enter(extra,'4567');assert.match(status(extra),/対戦開始済み/);
    assert(tabs.every(t=>!t.errors.length),tabs.flatMap(t=>t.errors).join('\n'));
    console.log('PASS game start, missing/full/started/old rooms and duplicate creation');
  }finally{tabs.forEach(t=>t.w.close());}
})().catch(e=>{console.error(e.stack);process.exitCode=1});
