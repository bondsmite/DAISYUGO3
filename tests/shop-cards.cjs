const {load}=require('./harness.cjs'),assert=require('assert');
(async()=>{for(const page of ['index.html','online-mode.html','online-mode-4.html']){const t=await load(page),w=t.w;try{
const shop=w.DAISHUGO_SHOP;assert.equal(w.DAISHUGO_SHOP_ITEMS.length,3);assert(w.DAISHUGO_SHOP_ITEMS.every(x=>x.price===10));
await assert.rejects(shop.purchase('doctor-doom'),/不足/);
w.eval(`localStorage.setItem(DAISHUGO_TITLE_STATS_KEY,JSON.stringify(Object.fromEntries(DAISHUGO_TITLES.map(t=>[t.id,t.goal]))))`);
const before=shop.wallet().balance;
for(const item of w.DAISHUGO_SHOP_ITEMS){assert(!shop.isUnlocked(item.cardName));await shop.purchase(item.id);assert(shop.isUnlocked(item.cardName));await assert.rejects(shop.purchase(item.id),/購入済み/)}
assert.equal(shop.wallet().balance,before-30);
w.eval(`onlineMode=false;var seq=0;function cc(n){return {...DATA.catalog.find(c=>c.name===n),id:'s'+seq++}};function fixture(){newGame();G.initialLeadPending=false;G.current=0;G.field=[];locked=false;G.players.forEach(p=>{p.human=true;p.cost=3;p.hand=[cc('ゴブリン')];p.deck=[cc('リュウ')];p.grave=[]});}fixture();`);
for(const rev of [false,true]){w.eval(`fixture();G.revolution=${rev};G.sherryRestoreRevolution=true;resolveFanfare(0,cc('佐野万次郎'));render()`);assert(w.eval('G.conflict'));assert(!w.eval('G.revolution'));assert(w.document.body.classList.contains('conflict-mode'));w.eval(`resolveFanfare(0,cc('佐野万次郎'))`);assert(!w.eval('G.conflict||G.revolution'));assert.equal(w.eval('G.sherryRestoreRevolution'),null)}
w.eval(`fixture();G.conflict=true;G.field=[{player:1,card:cc('佐野万次郎')}];var high=cc('ゴブリン');high.bp=8000;var equal=cc('ゴブリン');equal.bp=7000;`);assert(w.eval('canPlay(high,G.players[0])'));assert(!w.eval('canPlay(equal,G.players[0])'));
w.eval(`fixture();G.players[0].hand=[cc('ドクタードゥーム'),cc('ゴブリン')];G.players[1].hand=[cc('ソラ'),cc('マキマ')];G.players[1].grave=[cc('ゴジラ')];doPlay(0,0);`);
assert.equal(w.eval('G.players[0].hand.length'),2);
assert(w.eval(`G.players.every(p=>[...p.hand,...p.deck,...p.grave].filter(c=>c.kind==='follower'&&c.number!=='L').every(c=>fieldNumber(c)===4))`));assert.equal(w.eval(`fieldNumber(G.players[1].hand[1])`),8);
w.eval(`G.makimaActive=true;G.qurioBonus=4;G.newWordBuffOwner=1;G.players[1].hand[0].zomaBonus=2;G.players[1].hand[0].bigLightBoost=true`);assert.equal(w.eval('fieldNumber(G.players[1].hand[0])'),4);
assert(w.eval(`cardHtml(G.players[0].hand.find(c=>c.name==='ゴブリン'),false).includes('sora-number-changed')`));assert(w.eval(`cardHtml(G.players[1].grave[0],false).includes('makima-negative-number')`));assert(w.eval(`cardHtml(G.players[1].grave[0],false).includes('data-num="4"')`));
w.eval(`applyNumberChange({source:'lower',priority:1,value:7})`);assert.equal(w.eval(`fieldNumber(cc('ゴブリン'))`),4);
w.eval(`applyNumberChange({source:'tie',priority:2,value:5})`);assert.equal(w.eval(`fieldNumber(cc('ゴブリン'))`),5);
w.eval(`applyNumberChange({source:'higher',priority:3,value:6});applyNumberChange({source:'later lower',priority:2,value:2})`);assert.equal(w.eval(`fieldNumber(cc('ゴブリン'))`),6);
w.eval(`fixture();G.players[0].hand=[cc('夜神月'),cc('ゴブリン')];G.players[1].hand=[cc('ゴブリン'),cc('リュウ')];G.players[1].deck=[cc('ゴブリン'),cc('夜神月')];doPlay(0,0);afterAction(0)`);assert(w.eval('G.pendingDeathNote'));assert(w.document.getElementById('passBtn').disabled);assert(!w.resolveDeathNote('   '));
// Exact comparison includes spaces; misspelling destroys nothing.
w.resolveDeathNote('ゴブリン ');assert.equal(w.eval('G.players[1].hand.length'),2);
w.eval(`fixture();G.players[0].hand=[cc('夜神月'),cc('リュウ')];G.players[1].hand=[cc('ゴブリン'),cc('リュウ')];G.players[1].deck=[cc('ゴブリン'),cc('夜神月')];G.players[2].hand=[cc('円堂守'),cc('ゴブリン')];G.players[2].deck=[cc('ゴブリン')];doPlay(0,0);afterAction(0);`);
assert(w.document.getElementById('deathNoteName'));w.resolveDeathNote('ゴブリン');assert.equal(w.eval('G.players[1].grave.length'),2);assert.equal(w.eval('G.players[2].grave[0].name'),'円堂守');assert.equal(w.eval('G.players[2].hand[0].name'),'ゴブリン');assert.equal(w.eval('G.players[2].deck[0].name'),'ゴブリン');assert(!w.eval('G.pendingDeathNote'));assert(w.eval('locked'));assert(!w.eval('G.resultPresentation?.active'));assert(w.document.getElementById('lightEntryOverlay'));await new Promise(r=>setTimeout(r,2150));assert(!w.document.getElementById('lightEntryOverlay'));assert(w.eval('G.resultPresentation.active'));assert(!t.errors.length,t.errors.join('\n'));
console.log('PASS '+page+': three purchases, ownership, conflict toggle/BP, Doom draw/global/priority/colors, notebook exact names/replacement/result pause');
}finally{w.close()}}})().catch(e=>{console.error(e.stack);process.exitCode=1});
