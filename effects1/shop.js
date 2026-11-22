(() => {
  'use strict';
  const KEY = 'daishugo.shopPurchases.v1';
  const TEST_KEY = 'daishugo.shopPurchases.test.v1';
  // Development-only local test account. Activate with ?shop_test=1.
  // Not an authenticated Firebase admin account: never use for public production rewards.
  const testMode = (() => {
    try {
      const self = new URLSearchParams(window.location.search).get('shop_test') === '1';
      const parent = window.parent !== window && new URLSearchParams(window.parent.location.search).get('shop_test') === '1';
      return self || parent;
    } catch (_) { return new URLSearchParams(window.location.search).get('shop_test') === '1'; }
  })();
  const activeKey = () => testMode ? TEST_KEY : KEY;
  const $ = id => document.getElementById(id);
  const items = () => window.DAISHUGO_SHOP_ITEMS || [];
  function ledger() {
    const raw = localStorage.getItem(activeKey());
    if (!raw) return { purchases: [] };
    const value = JSON.parse(raw);
    if (!Array.isArray(value.purchases) || !value.purchases.every(p => typeof p.cardName === 'string' && typeof p.id === 'string' && Number.isSafeInteger(p.price) && p.price >= 0)) throw Error('購入データを読み込めませんでした。');
    return value;
  }
  // Each unique earned title contributes once. Progress is already persisted by
  // the solo/online engines; refreshing or selecting a title cannot grant it twice.
  function wallet() {
    const stats = loadTitleStats();
    const earned = [...new Map(DAISHUGO_TITLES.filter(t => stats[t.id] >= t.goal).map(t => [t.id, t])).values()];
    const purchases = ledger().purchases;
    const loginPoints = loginTotal();
    const total = (testMode ? 9999 : earned.reduce((sum, t) => sum + t.rewardPoints, 0)) + loginPoints;
    const spent = purchases.reduce((sum, p) => sum + p.price, 0);
    return { total, spent, balance: Math.max(0, total - spent), earned, purchases, testMode, loginPoints };
  }
  function isUnlocked(name) {
    if (!items().some(item => item.cardName === name)) return true;
    try { return ledger().purchases.some(p => p.cardName === name); } catch (_) { return false; }
  }
  function refresh() {
    try {
      const state = wallet();
      document.querySelectorAll('[data-shop-balance]').forEach(el => el.textContent = state.balance.toLocaleString('ja-JP') + ' pt');
      if ($('shopSummary')) $('shopSummary').textContent = testMode
        ? `【テストモード】試験用 9,999 pt ／ 使用済み ${state.spent} pt（通常のポイント・購入履歴と別管理）`
        : `称号 ${state.earned.length}個・ログイン ${state.loginPoints} pt ／ 累計 ${state.total} pt獲得 ／ 使用済み ${state.spent} pt`;
      document.querySelectorAll('[data-shop-balance]').forEach(el => {
        if (testMode) el.title = 'テスト用のポイントです。通常残高には反映されません。';
      });
      if ($('shopModal') && !$('shopModal').hidden) renderShop();
    } catch (_) {
      document.querySelectorAll('[data-shop-balance]').forEach(el => el.textContent = '読込エラー');
    }
  }
  function renderShop() {
    const state = wallet(), root = $('shopItems');
    root.replaceChildren();
    if (!items().length) {
      root.innerHTML = '<div class="shop-empty"><span aria-hidden="true">◇</span><h3>ただいま入荷準備中</h3><p>ショップのカードは今後追加されます。<br>称号を集めてポイントを貯めておこう！</p></div>';
      return;
    }
    for (const item of items()) {
      const card = DATA.catalog.find(c => c.name === item.cardName);
      if (!card) continue;
      const owned = state.purchases.some(p => p.cardName === item.cardName);
      const valid = Number.isSafeInteger(item.price) && item.price > 0 && ONLINE_IMPLEMENTED_NAMES.has(item.cardName);
      const article = document.createElement('article'); article.className = 'shop-product';
      const preview=document.createElement('button');preview.type='button';preview.className='shop-card-preview';
      preview.setAttribute('aria-label',card.name+'の詳細を見る');
      preview.innerHTML=cardHtml({...card,id:'shop-'+item.id},false);
      preview.onclick=()=>openCardZoom({...card,id:'shop-'+item.id});
      article.append(preview);
      const price=document.createElement('strong');price.textContent=valid?item.price+' pt':'準備中';article.append(price);
      const button = document.createElement('button'); button.type = 'button'; button.className = 'menu-option';
      button.textContent = owned ? '購入済み' : !valid ? '準備中' : state.balance < item.price ? 'ポイント不足' : 'このカードを購入';
      button.disabled = owned || !valid || state.balance < item.price;
      button.onclick = () => confirmPurchase(item);
      article.append(button); root.append(article);
    }
  }
  function confirmPurchase(item) {
    $('shopConfirm').hidden = false;
    $('shopConfirmText').textContent = `「${item.cardName}」を ${item.price} ptで購入しますか？`;
    $('shopBuy').onclick = async () => {
      $('shopBuy').disabled = true;
      try { await purchase(item.id); $('shopStatus').textContent = `「${item.cardName}」を獲得しました。デッキ作成で使えます。`; }
      catch (error) { $('shopStatus').textContent = error.message; }
      finally { $('shopBuy').disabled = false; $('shopConfirm').hidden = true; refresh(); }
    };
  }
  async function purchase(id) {
    const commit = () => {
      const item = items().find(x => x.id === id);
      if (!item || !Number.isSafeInteger(item.price) || item.price <= 0 || !DATA.catalog.some(c => c.name === item.cardName) || !ONLINE_IMPLEMENTED_NAMES.has(item.cardName)) throw Error('このカードは現在購入できません。');
      const state = wallet();
      if (state.purchases.some(p => p.cardName === item.cardName || p.id === item.id)) throw Error('このカードは購入済みです。');
      if (state.balance < item.price) throw Error('ポイントが不足しています。');
      const next = { purchases: [...state.purchases, { id: item.id, cardName: item.cardName, price: item.price, purchasedAt: Date.now() }] };
      // Ownership and expenditure are one write: no partial charge on save failure.
      try { localStorage.setItem(activeKey(), JSON.stringify(next)); }
      catch (_) { throw Error('購入を保存できませんでした。ポイントは消費していません。'); }
      refresh(); return wallet();
    };
    // Same-origin tabs/online frames share a lock, preventing duplicate spending.
    return navigator.locks ? navigator.locks.request('daishugo-shop-purchase', commit) : commit();
  }
  function openShop() {
    $('shopModal').hidden = false; $('shopStatus').textContent = ''; $('shopConfirm').hidden = true;
    try { refresh(); renderShop(); } catch (_) { $('shopStatus').textContent = '購入データを読み込めませんでした。'; }
    $('closeShopBtn').focus();
  }
  function closeShop() { $('shopModal').hidden = true; $('menuShopBtn').focus(); }
  const loginPrefix = () => activeKey()+'.login.';
  const japanDay = (now=Date.now()) => new Date(now+9*60*60*1000).toISOString().slice(0,10);
  function loginTotal(){
    let total=0;
    for(let i=0;i<localStorage.length;i++){
      const key=localStorage.key(i);
      if(key?.startsWith(loginPrefix())&&/^\d{4}-\d{2}-\d{2}$/.test(key.slice(loginPrefix().length))&&localStorage.getItem(key)==='1')total++;
    }
    return total;
  }
  function showLoginBonus(){
    document.getElementById('dailyLoginBonus')?.remove();
    const el=document.createElement('div');el.id='dailyLoginBonus';el.setAttribute('role','status');
    el.innerHTML='<div class="login-bonus-rays"></div><div class="login-bonus-message">ログインボーナス<br><strong>ショップポイント1Pt獲得</strong></div>';
    for(let i=0;i<24;i++){const star=document.createElement('i');star.textContent='✦';star.style.cssText=`--angle:${i*15}deg;--delay:${(i%5)*.12}s;--distance:${90+(i%4)*28}px`;el.appendChild(star);}
    document.body.appendChild(el);setTimeout(()=>el.remove(),3800);
  }
  async function claimLoginBonus(now=Date.now()){
    const commit=()=>{
      const key=loginPrefix()+japanDay(now);
      if(localStorage.getItem(key)==='1')return false;
      // One immutable key per Japanese calendar day: concurrent tabs cannot add two points.
      localStorage.setItem(key,'1');
      refresh();showLoginBonus();return true;
    };
    try{return await (navigator.locks?navigator.locks.request('daishugo-daily-login',commit):commit());}
    catch(_){return false;}
  }
  window.DAISHUGO_SHOP = { wallet, purchase, refresh, isUnlocked, open: openShop, testMode, claimLoginBonus, japanDay };
  function init() {
    if (testMode) {
      const note = $('shopTestNotice');
      if (note) note.hidden = false;
    }
    $('menuShopBtn')?.addEventListener('click', openShop);
    $('closeShopBtn')?.addEventListener('click', closeShop);
    $('shopCancel')?.addEventListener('click', () => { $('shopConfirm').hidden = true; });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('shopModal').hidden) closeShop(); });
    window.addEventListener('storage', refresh); window.addEventListener('focus', refresh);
    refresh();
    // The menu owns startup when the online pages are embedded; direct online URLs work too.
    if(window.parent===window)claimLoginBonus();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
