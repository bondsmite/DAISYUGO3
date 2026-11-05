/* 大集合：ソロ／オンライン共通ファンファーレ処理
 * UIや通信に依存しない共通効果をここへ集約する。
 * trueを返した場合、呼び出し元のresolveFanfareは以降の処理を行わない。
 */
(function(){
  'use strict';
  window.DAISHUGO_RESOLVE_SHARED_FANFARE = function(G, pi, c, api){
    if(!G || !c || !api) return false;
    const p = G.players && G.players[pi];
    if(!p) return false;
    const log = api.log;
    const drawCards = api.drawCards;

    if(c.name === 'うちはマダラ'){
      const wasRevolution = !!G.revolution;
      G.revolution = !wasRevolution;
      log('うちはマダラのファンファーレ：' + (G.revolution
        ? '場を革命状態にしました。数字の強さが逆転し、場が流れても継続します。'
        : '既に革命状態だったため、場を通常状態に戻しました。'));
      return true;
    }

    if(c.name === 'ネルギガンテ'){
      const returned = [];
      for(let i=G.field.length-1;i>=0;i--){
        const entry=G.field[i];
        if(!entry || !entry.card || entry.card.id===c.id || entry.card.kind!=='follower') continue;
        const owner=G.players[entry.player];
        if(owner){
          owner.hand.push(entry.card);
          returned.push({name:entry.card.name,player:owner.name});
          G.field.splice(i,1);
        }
      }
      log('ネルギガンテのファンファーレ：自身を除く場のフォロワー'+returned.length+'枚を、それぞれの持ち主の手札に戻しました。'+(returned.length?'（'+returned.map(x=>'「'+x.name+'」→'+x.player).join('、')+'）':''));
      return true;
    }

    if(c.name === '成歩堂龍一'){
      G.players.forEach(player=>{
        const returned=player.hand.length;
        player.deck=api.shuffle(player.deck.concat(player.hand));
        player.hand=[];
        log('成歩堂龍一のファンファーレ：'+player.name+'は手札'+returned+'枚を山札に戻してシャッフルしました。');
      });
      G.players.forEach(player=>{
        const drawn=drawCards(player,5);
        log('成歩堂龍一のファンファーレ：'+player.name+'は山札から'+drawn+'枚引きました。');
      });
      return true;
    }

    if(c.name === 'バターカップ'){
      const freeCost=c.buttercupFreeCostAtPlay===true;
      delete c.buttercupFreeCostAtPlay;
      const count=freeCost?2:1;
      const drawn=drawCards(p,count);
      log('バターカップのファンファーレ：'+(freeCost?'場にフォロワーが2枚以上ありコストが0だったため':'コストが0ではなかったため')+'山札からカードを'+drawn+'枚引きました。');
      return true;
    }

    if(c.name === 'トキメキ'){
      const numberCounts={};
      p.grave.filter(card=>card.kind==='follower'&&['1','2','3','4','5','6','7','L'].includes(String(card.number)))
        .forEach(card=>{const n=String(card.number);numberCounts[n]=(numberCounts[n]||0)+1;});
      const matched=Object.entries(numberCounts).find(([,count])=>count>=3);
      if(matched){
        if(pi===0&&G.titleMatchProgress) G.titleMatchProgress.tokimeki_effect++;
        const drawn=drawCards(p,2);
        log('トキメキのファンファーレ：墓地に数字'+matched[0]+'のフォロワーが'+matched[1]+'枚あるため、山札からカードを'+drawn+'枚引きました。');
      }else{
        log('トキメキのファンファーレ：墓地に同じ数字のフォロワーが3枚以上ないため、効果は発動しません。');
      }
      return true;
    }

    return false;
  };
})();
