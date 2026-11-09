const assert=require('node:assert/strict');
let selected=null,selectedSpell=null,G={qurioBonus:0,qurioUsed:false,field:[{card:{name:'ゴブリン',number:'1',bp:7000}}],players:[{hand:[],cost:3}],conflict:false,revolution:false,forbiddenNumber:null,forbiddenNumbers:[]};
function activeHumanSeat(){return 0;}
function effectiveCost(c){return c.cost;}
function availableCost(p){return p.cost;}
function fieldNumber(c){return Number(c.number);}
function strength(c){return G.conflict?c.bp:Number(c.number);}
function canPlay(c, p = G.players[G.current], spell = null) {
  if (!spell && p === G.players[activeHumanSeat()] && c?.id === selected)
    spell = p.hand.find(x=>x.id===selectedSpell);
  const bonus=G.qurioBonus, used=G.qurioUsed;
  // 鬼人薬は同時使用するフォロワーのBP+4000で出札可否を判定する。
  // プレビュー判定ではカード本体を変更せず、実際の加算はdoPlayで一度だけ行う。
  const originalBp=c?.bp;
  if(spell?.name==='キュリア'){G.qurioBonus=(bonus||0)+2;G.qurioUsed=true;}
  if(spell?.name==='鬼人薬' && c?.kind==='follower')c.bp=Number(c.bp||0)+4000;
  try{return canPlayBase(c,p);}finally{
    if(spell?.name==='鬼人薬' && c?.kind==='follower')c.bp=originalBp;
    G.qurioBonus=bonus;G.qurioUsed=used;
  }
}
function canPlayBase(c, p) {
  if (c.kind !== "follower") return false;
  if (effectiveCost(c, p) > availableCost(p)) return false;
  if (
    G.forbiddenNumber !== null &&
    String(c.number) === String(G.forbiddenNumber)
  )
    return false;
  if (
    Array.isArray(G.forbiddenNumbers) &&
    G.forbiddenNumbers.includes(String(c.number))
  )
    return false;
  if (!G.field.length) return true;
  let top = G.field[G.field.length - 1].card;
  if (top.name === "梅喧" && [4,5].includes(fieldNumber(c))) return false;
  if (top.number === "L" && c.name === "球磨川禊") return true;
  if (top.name === "雪ミク" && Number(c.bp) <= Number(top.bp)) return false;
  if (top.number === "7" && c.name === "ヒソカ") return true;
  let a = strength(c),
    b = strength(top);
  if (a !== b) return a > b;
  if (G.conflict || G.revolution || a === b) return c.bp > top.bp;
  return false;
}

const follower={id:'a',name:'ゴブリン',kind:'follower',number:'1',bp:5000,cost:0};const spell={id:'b',name:'鬼人薬',kind:'spell',cost:0};G.players[0].hand=[follower,spell];selected=follower.id;
assert.equal(canPlay(follower,G.players[0]),false);
selectedSpell=spell.id;assert.equal(canPlay(follower,G.players[0]),true);
assert.equal(follower.bp,5000);assert.equal(canPlay(follower,G.players[0],spell),true);assert.equal(follower.bp,5000);
selectedSpell=null;assert.equal(canPlay(follower,G.players[0]),false);
G.field[0].card.bp=9000;selectedSpell=spell.id;assert.equal(canPlay(follower,G.players[0]),false,'equal BP cannot play');
G.field[0].card.name='雪ミク';G.field[0].card.bp=7000;assert.equal(canPlay(follower,G.players[0]),true,'Snow Miku threshold includes boosted BP');
assert.equal(follower.bp,5000);console.log('PASS medicine preview no mutation, disabled after cancel, BP ties and Snow Miku');
