/* 大集合 V0.7: independent CPU policy. Only public opponent counts are consulted. */
(function () {
  'use strict';
  const allowed = () => new Set(window.DAISHUGO_ONLINE_CARD_NAMES || []);
  const draws = {'アヤシシ':1,'ソニック':1,'バン':3,'ダセット':1,'碇ゲンドウ':2,'涼宮ハルヒ':3,'マキマ':2,'スパイダーマン':1};
  const disruptive = new Set(['ネート','ハルク','ネク','スパイダーマン','球磨川禊','うちはマダラ','お父様']);
  function choose({game, playerIndex, canPlay, effectiveCost, strength}) {
    if (!game || !game.players || !game.players[playerIndex]) return null;
    const p=game.players[playerIndex], opponents=game.players.filter((_,i)=>i!==playerIndex);
    const urgent=Math.min(...opponents.map(x=>x.hand.length+x.deck.length));
    const own=p.hand.length+p.deck.length;
    const top=game.field.length ? game.field[game.field.length-1] : null;
    const legal=p.hand.map((card,index)=>({card,index})).filter(x=>allowed().has(x.card.name) && canPlay(x.card,p));
    if (!legal.length) return {type:'pass',reason:'no-legal-card'};
    const rank=c=>{try{return strength(c);}catch(_){return Number(c.number)||0;}};
    function score({card,index}) {
      const cost=effectiveCost(card,p), rest=p.hand.filter((_,i)=>i!==index);
      const remainingCost=Math.max(0,p.cost-cost);
      let value=16 - cost*1.4;
      // The win condition counts BOTH deck and hand. Drawing moves deck cards to hand, not out of game.
      if (p.deck.length===0 && p.hand.length===1) value+=100000;
      if (p.deck.length===0) value+=Math.max(0,7-p.hand.length)*2.5;
      const draw=Math.min(p.deck.length,draws[card.name]||0);
      value+=draw*(p.deck.length>0 && p.hand.length<5 ? 0.8 : -0.5);
      if (disruptive.has(card.name)) value+=urgent<=6?7:2;
      if (card.name==='ロクサス' && p.grave.some(x=>x.name==='ソラ')) value+=4;
      if (card.name==='ジェネシスドラゴン' && !p.deck.length) value+=5;
      if (card.name==='アルル' && rest.some(x=>String(x.number)===String(card.number))) value+=2;
      if (card.name==='ゴジラ' && rest.some(x=>Number(x.cost)===3 && Number(x.number)>=5)) value+=2;
      if (card.name==='鹿目まどか' || card.name==='ぐら') value+=p.deck.length?1.2:0;
      if (card.name==='ネート') value+=opponents.reduce((v,x)=>v+Math.min(x.hand.length,4),0)*0.5;
      // Preserve flexible low-cost followers and avoid trapping the hand after a high-ranked play.
      const future=rest.filter(x=>x.kind==='follower' && allowed().has(x.name) && effectiveCost(x,p)<=remainingCost && rank(x)>rank(card));
      value+=Math.min(3,future.length)*1.7;
      const affordable=rest.filter(x=>x.kind==='follower' && allowed().has(x.name) && effectiveCost(x,p)<=remainingCost);
      if (!future.length && affordable.length>=2 && top) value-=1.2;
      const same=rest.filter(x=>x.kind==='follower' && String(x.number)===String(card.number));
      if (same.length && !game.conflict) value+=0.5;
      if (top && rank(card)>rank(top.card)+2 && urgent>5) value-=1.5;
      if (urgent<=4) value+=2.5;
      return value;
    }
    const ranked=legal.map(x=>({...x,score:score(x)})).sort((a,b)=>b.score-a.score || a.index-b.index);
    const best=ranked[0];
    // Pass only if another player owns the field, there is no immediate threat, and
    // the available response would squander a valuable high-cost card.
    const passSafe=!!top && top.player!==playerIndex && urgent>9 && p.deck.length>0 && p.hand.length>2;
    const costlyOnly=legal.every(x=>effectiveCost(x.card,p)>=2);
    if (passSafe && costlyOnly && best.score<12 && p.cost<=2)
      return {type:'pass',reason:'preserve-expensive-response',candidates:ranked};
    return {type:'play',index:best.index,score:best.score,reason:'v07-public-state-evaluation',candidates:ranked};
  }
  window.DAISHUGO_AI_V07={choose};
})();
