const {load}=require('./harness.cjs'),assert=require('assert');
(async()=>{for(const page of ['index.html','online-mode.html','online-mode-4.html']){const t=await load(page),w=t.w;try{
const shop=w.DAISHUGO_SHOP; assert(shop);assert.equal(shop.wallet().balance,0);
w.document.getElementById('menuShopBtn').click();assert(!w.document.getElementById('shopModal').hidden);assert.equal(w.document.querySelectorAll('.shop-product').length,3);
w.eval(`localStorage.setItem(DAISHUGO_TITLE_STATS_KEY,JSON.stringify(Object.fromEntries(DAISHUGO_TITLES.map(t=>[t.id,t.goal]))))`);shop.refresh();
const total=w.eval('DAISHUGO_TITLES.length*10');assert.equal(shop.wallet().balance,total);shop.refresh();shop.refresh();assert.equal(shop.wallet().balance,total);
w.eval('renderTitles()');assert(w.document.getElementById('titlesList').textContent.includes('10 pt（受取済み）'));
// Replace the product list temporarily to exercise purchase failure cases.
w.DAISHUGO_SHOP_ITEMS=[{id:'test-one',cardName:'ゴブリン',price:10},{id:'test-two',cardName:'リュウ',price:total+1}];
assert(!shop.isUnlocked('ゴブリン'));shop.refresh();
w.eval(`var names={1:['ゴブリン'],2:[],3:[],4:[],5:[],6:[],7:[],L:[],S:[]}`);assert(!w.eval('validateDeckNames(names,false).ok'));
await assert.rejects(shop.purchase('test-two'),/不足/);assert.equal(shop.wallet().balance,total);
await assert.rejects(shop.purchase('missing'));assert.equal(shop.wallet().balance,total);
const outcomes=await Promise.allSettled([shop.purchase('test-one'),shop.purchase('test-one')]);assert.equal(outcomes.filter(x=>x.status==='fulfilled').length,1);
assert.equal(shop.wallet().balance,total-10);assert(shop.isUnlocked('ゴブリン'));assert(w.eval('validateDeckNames(names,false).ok'));assert.equal(shop.wallet().purchases.length,1);
// Module reload simulates a page reload with existing progress and purchase storage.
w.eval(require('fs').readFileSync(require('path').join(__dirname,'../effects/shop.js'),'utf8'));assert.equal(w.DAISHUGO_SHOP.wallet().balance,total-10);
w.DAISHUGO_SHOP_ITEMS.push({id:'fail',cardName:'ベルエンジェル',price:1});const set=w.Storage.prototype.setItem;w.Storage.prototype.setItem=function(){throw Error('quota')};await assert.rejects(w.DAISHUGO_SHOP.purchase('fail'),/保存/);w.Storage.prototype.setItem=set;assert.equal(shop.wallet().balance,total-10);assert(!shop.isUnlocked('ベルエンジェル'));
assert(!t.errors.length,t.errors.join('\n'));console.log('PASS '+page+': menu, three shop products, all titles, no duplicate rewards, purchase, ownership/deck validation, insufficient points, double click, reload, save failure');
}finally{w.close()}}})().catch(e=>{console.error(e);process.exitCode=1});
