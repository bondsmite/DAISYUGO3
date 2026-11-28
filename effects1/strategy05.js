const strategyCores = {
  "ドゥームお父様": [
    "球磨川禊",
    "ベルエンジェル",
    "ホルス",
    "ぐら",
    "円堂守",
    "鹿目まどか",
    "ぜんまいざむらい",
    "ドクタードゥーム",
    "バターカップ",
    "ぐり",
    "バン",
    "ヒソカ",
    "碇ゲンドウ",
    "夜神月",
    "ウェスカー",
    "お父様",
    "アルセウスフォン",
    "ヴィブラニウム",
    "セレブロ"
  ],
  "キャプテン英種族": [
    "さくらももこ",
    "リボンちゃん",
    "ルクソード",
    "マリオ",
    "スパイダーマン",
    "竈門炭治郎",
    "ソラ",
    "ゾロリ",
    "円堂守",
    "バターカップ",
    "ぜんまいざむらい",
    "キャプテン・アメリカ",
    "ソニック",
    "アヴァ",
    "星野アイ",
    "ロクサス",
    "サイタマ",
    "ヴィブラニウム",
    "セレブロ"
  ],
  "千束たきなエクゾディア": [
    "さくらももこ",
    "リボンちゃん",
    "フグ田サザエ",
    "封印されしエクゾディア",
    "錦木千束",
    "ホルス",
    "ぐら",
    "封印されし者の右腕",
    "円堂守",
    "封印されし者の左腕",
    "ハルク",
    "ぜんまいざむらい",
    "封印されし者の右足",
    "井ノ上たきな",
    "ぐり",
    "封印されし者の左足",
    "ヴィブラニウム",
    "スーパーキノコ",
    "セレブロ"
  ],
  "佐野万次郎・抗争ロクサス": [
    "さくらももこ",
    "ベルエンジェル",
    "スヌーピー",
    "花垣武道",
    "スルト",
    "竈門炭治郎",
    "ソラ",
    "オールマイト",
    "円堂守",
    "ハルク",
    "バターカップ",
    "ヨッシー",
    "青眼の白龍",
    "雪ミク",
    "バロン・サメディ",
    "ロクサス",
    "佐野万次郎",
    "サイタマ",
    "鬼人薬"
  ],
  "ドゥーム・エクゾディア": [
    "さくらももこ",
    "フグ田サザエ",
    "封印されしエクゾディア",
    "錦木千束",
    "ホルス",
    "封印されし者の右腕",
    "鹿目まどか",
    "円堂守",
    "封印されし者の左腕",
    "ドクタードゥーム",
    "封印されし者の右足",
    "井ノ上たきな",
    "アルル",
    "封印されし者の左足",
    "ネク",
    "碇ゲンドウ",
    "お父様",
    "ヴィブラニウム",
    "スーパーキノコ"
  ],
  "ゾーマ革命": [
    "さくらももこ",
    "リボンちゃん",
    "球磨川禊",
    "ぐら",
    "梅喧",
    "鹿目まどか",
    "円堂守",
    "ソラ",
    "ぜんまいざむらい",
    "バターカップ",
    "大魔王ゾーマ",
    "ぐり",
    "アルル",
    "シェリー＆ブラゴ",
    "ネク",
    "ともだち",
    "うちはマダラ",
    "アルセウスフォン",
    "セレブロ"
  ]
};
const [fatherDeck, captainDeck, chizukuDeck, sanoDeck, doomExodiaDeck, zomaDeck] = Object.keys(strategyCores);
const bodyName = '封印されしエクゾディア';
function exodiaPlan(p) {
  return [chizukuDeck, doomExodiaDeck].includes(p.strategy) &&
    !p.grave.some(c => c.name === bodyName || currentNumberLabel(c) === 'L') &&
    (!p.grave.some(c => currentNumberLabel(c) === '7') ||
      (p.strategy === doomExodiaDeck && !p.doomResolved && [...p.deck,...p.hand].some(c=>c.name==='ドクタードゥーム')));
}
function buildStrategyDeck(strategy) {
  const names = strategyCores[strategy];
  const pool = DATA.catalog.filter(c => ONLINE_IMPLEMENTED_NAMES.has(c.name));
  const result = {};
  for (const group of ['1','2','3','4','5','6','7','L','S']) {
    const cards = pool.filter(c => (c.kind === 'spell' ? 'S' : String(c.number)) === group);
    const core = cards.filter(c => names.includes(c.name));
    const size = group === 'S' ? 5 : group === 'L' ? 2 : 4;
    const candidates = cards.filter(c => !names.includes(c.name) && !EXODIA_PARTS.includes(c.name) && c.name !== bodyName);
    const ranked = candidates.map(c => {
      let fit = 2 + (3-c.cost)*0.6;
      if (/引く|手札に加え/.test(c.effect)) fit += 2;
      if (strategy === captainDeck && c.tribe === '英種族' && c.cost <= 1) fit += 10;
      if (strategy === sanoDeck) fit += (c.bp || 0)/1300;
      if (strategy === zomaDeck && (c.tribe === '魔種族' || Number(c.number)<=3)) fit += 5;
      if ([doomExodiaDeck,chizukuDeck].includes(strategy) && /自分の手札.*破壊|墓地から.*手札/.test(c.effect)) fit += 5;
      if (strategy === fatherDeck && /引く|手札に加え|数字4/.test(c.effect)) fit += 4;
      if (c.name === '鬼人薬' && [sanoDeck,fatherDeck].includes(strategy)) fit += 12;
      if (c.name === 'ロクサス' && names.includes('ソラ')) fit += 15;
      return {c, key: -Math.log(1-Math.random()) / (fit*fit)};
    }).sort((a,b)=>a.key-b.key);
    result[group] = [...core,...ranked.slice(0,size-core.length).map(x=>x.c)].map(c=>c.name);
  }
  const validation=validateDeckNames(result,true,false);
  if (!validation.ok || !names.every(n=>Object.values(result).flat().includes(n))) throw Error('V0.5 デッキ構築：'+strategy);
  return result;
}
function openingPriority(c,p) {
  if(exodiaPlan(p)){
    if(p.strategy===doomExodiaDeck && c.number==='7' && p.hand.some(x=>['ドクタードゥーム','鹿目まどか'].includes(x.name)))return 120;
    if(EXODIA_PARTS.includes(c.name))return 100;
    if(['7','L'].includes(c.number) || c.name===bodyName)return -110;
  }
  if(c.name==='ソラ' && [...p.hand,...p.deck].some(x=>x.name==='ロクサス'))return 105;
  return -doomPriority(c,p);
}
function strategyPriority(c,p) {
  const has=n=>p.hand.some(x=>x.name===n);
  if(exodiaPlan(p)){
    if(c.name==='ドクタードゥーム' && !p.doomResolved)return 45;
    if(c.name===bodyName)return p.strategy===doomExodiaDeck && !p.doomResolved && !canWinWithExodia(p)?15:38;
    if(c.name==='錦木千束' && p.deck.some(x=>EXODIA_PARTS.includes(x.name)))return 40;
    if(c.name==='井ノ上たきな')return p.hand.some(x=>EXODIA_PARTS.includes(x.name))?42:22;
    if(EXODIA_PARTS.includes(c.name))return 25;
  }
  const order=p.strategy===captainDeck?['キャプテン・アメリカ','ゾロリ','さくらももこ','スパイダーマン']:
    p.strategy===sanoDeck?['佐野万次郎','花垣武道','ロクサス','鬼人薬']:
    p.strategy===zomaDeck?['大魔王ゾーマ','うちはマダラ','鹿目まどか','ネク']: [];
  const i=order.indexOf(c.name);
  if(i>=0 && !(c.name==='大魔王ゾーマ' && p.zomaPlayed))return 33-i*4;
  if(['ぐり','ぐら'].includes(c.name)&&has(c.name==='ぐり'?'ぐら':'ぐり'))return 18;
  return null;
}
// Estimate unseen rank slots from public original ranks. A rank can be in
// either hidden zone; use the public hand size to estimate immediate replies.
function opponentForecast(pi) {
  return G.players.flatMap((op,i)=>{
    if(i===pi || op.passed)return [];
    const unseen=[0,4,4,4,4,4,4,4,2];
    const visible=[...op.grave,...G.field.filter(e=>e.player===i).map(e=>e.card)];
    for(const c of visible)if(c.kind==='follower'){
      const rank=c.number==='L'?8:Number(c.number);
      unseen[rank]=Math.max(0,unseen[rank]-1);
    }
    const body=expectedNames(op,i).find(x=>x.name===bodyName);
    return [{unseen, body:body?.hand||0, hand:op.hand.length, deck:op.deck.length, cost:op.cost,
      parts:new Set(op.grave.filter(c=>EXODIA_PARTS.includes(c.name)).map(c=>c.name)).size,
      blocked:op.grave.some(c=>['7','L'].includes(currentNumberLabel(c)))}];
  });
}
function replyChance(c, opponents) {
  const rank=fieldNumber(c);
  let noReply=1;
  for(const o of opponents){
    const total=Math.max(1,o.hand+o.deck);
    let stronger=0;
    for(let n=1;n<=8;n++) {
      const wins=n===rank?0.45:n===8|| (rank!==8 && (G.revolution?n<rank:n>rank))?1:0;
      stronger+=o.unseen[n]*wins;
    }
    const fraction=G.conflict?Math.max(.05,1-(c.bp||0)/15000):stronger/total;
    noReply*=Math.pow(1-Math.min(.98,fraction*(o.cost+1)/4),o.hand);
  }
  return 1-noReply;
}
function strategyPlayScore(c,p,spell) {
  const name=c.name, h=p.hand, rank=fieldNumber(c);
  const parts=h.filter(x=>EXODIA_PARTS.includes(x.name)).length;
  if(exodiaPlan(p)){
    if(name===bodyName)return canWinWithExodia(p)?5000:-160;
    if(c.number==='L' || rank===7 && !(p.strategy===doomExodiaDeck && !p.doomResolved))return -70;
    if(name==='ドクタードゥーム' && !p.doomResolved)return 65;
    if(name==='錦木千束')return Math.min(3,p.deck.filter(x=>EXODIA_PARTS.includes(x.name)).length)*13;
    if(name==='井ノ上たきな')return parts?parts*21:-18;
    if(['ネク','ハルク','フグ田サザエ'].includes(name))return parts?25:h.some(x=>x.name===bodyName)&&name==='フグ田サザエ'?-70:0;
    if(EXODIA_PARTS.includes(name))return 12;
  }
  if(p.strategy===captainDeck){
    if(name==='キャプテン・アメリカ'){
      const partners=h.filter(x=>x!==c && x.tribe==='英種族' && effectiveCost(x,p)<=1);
      return partners.length?Math.min(2,partners.length)*14+(!G.field.length&&partners.some(x=>x.name==='ゾロリ')?30:0):-18;
    }
    if(name==='ゾロリ' && h.some(x=>x.name==='キャプテン・アメリカ'))return -18;
    if(name==='リボンちゃん' && p.grave.some(x=>x.name==='キャプテン・アメリカ'))return 25;
  }
  if(p.strategy===sanoDeck){
    if(name==='佐野万次郎')return G.conflict?-50:h.filter(x=>x.bp>=8000).length*10+5;
    if(name==='花垣武道' && !G.conflict)return 25;
    if(name==='ソラ' && !p.grave.some(x=>x.name==='ソラ'))return 14;
    if(G.conflict)return Math.min(10,(c.bp||0)/1200)+(spell?.name==='鬼人薬'?5:0);
  }
  if(p.strategy===zomaDeck){
    if(name==='大魔王ゾーマ')return p.zomaPlayed?0:45;
    const low=h.filter(x=>x!==c && x.kind==='follower' && fieldNumber(x)<=3).length;
    const high=h.filter(x=>x!==c && x.kind==='follower' && fieldNumber(x)>=6).length;
    if(name==='うちはマダラ'||name==='シェリー＆ブラゴ'||(name==='ともだち' && G.players.flatMap(o=>o.grave).filter(x=>x.number==='L').length===6))
      return (G.revolution?-1:1)*(low-high)*10-(p.zomaPlayed?0:14);
    if(!G.revolution && rank>=6 && c.number!=='L')return 15;
    if(p.zomaPlayed && !G.revolution && rank<=3)return -10;
  }
  return 0;
}
const primaryCards = {
  [fatherDeck]:['ドクタードゥーム','お父様'],[captainDeck]:['キャプテン・アメリカ'],
  [chizukuDeck]:['錦木千束','井ノ上たきな'],[sanoDeck]:['佐野万次郎'],
  [doomExodiaDeck]:['ドクタードゥーム','錦木千束'],[zomaDeck]:['大魔王ゾーマ','うちはマダラ']
};
// A public card shared by many decks is weaker evidence than a unique anchor.
function expectedNames(op, seat) {
  const seen=new Set([...op.grave,...G.field.filter(e=>e.player===seat).map(e=>e.card)].map(c=>c.name));
  const profiles=Object.values(strategyCores);
  const weights=profiles.map(core=>1+core.reduce((sum,name)=>{
    if(!seen.has(name))return sum;
    return sum+2/profiles.filter(other=>other.includes(name)).length;
  },0)**2);
  const total=weights.reduce((a,b)=>a+b,0), unknown=Math.max(1,op.hand.length+op.deck.length);
  const names=new Map();
  profiles.forEach((core,i)=>core.forEach(name=>{
    if(!seen.has(name))names.set(name,(names.get(name)||0)+weights[i]/total);
  }));
  return [...names].map(([name,present])=>({name,hand:present*op.hand.length/unknown,deck:present*op.deck.length/unknown}));
}
function predictedFollower(seat, pool) {
  const legal=new Set(pool.map(c=>c.name));
  return expectedNames(G.players[seat],seat).filter(x=>legal.has(x.name)).sort((a,b)=>b.hand-a.hand)[0]?.name;
}
function notePrediction(pi,p,pool) {
  const scores=new Map();
  G.players.forEach((op,i)=>{
    if(i===pi)return;
    for(const x of expectedNames(op,i)){
      let value=x.hand+x.deck*.8;
      if(hasFather(p) && ['ルクソード','ルーファウス'].includes(x.name))value+=2;
      if(x.name===bodyName && op.grave.some(c=>EXODIA_PARTS.includes(c.name)))value+=1;
      scores.set(x.name,(scores.get(x.name)||0)+value);
    }
  });
  return pool.filter(c=>scores.has(c.name) && !p.deck.some(x=>x.name===c.name))
    .sort((a,b)=>scores.get(b.name)-scores.get(a.name))[0]?.name;
}
