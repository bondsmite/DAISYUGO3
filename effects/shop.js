(() => {
  'use strict';
  const KEY = 'daishugo.shopPurchases.v1';
  const $ = id => document.getElementById(id);
  const items = () => window.DAISHUGO_SHOP_ITEMS || [];
  function ledger() {
    const raw = localStorage.getItem(KEY);
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
    const total = earned.reduce((sum, t) => sum + t.rewardPoints, 0);
    const spent = purchases.reduce((sum, p) => sum + p.price, 0);
    return { total, spent, balance: Math.max(0, total - spent), earned, purchases };
  }
  function isUnlocked(name) {
    if (!items().some(item => item.cardName === name)) return true;
    try { return ledger().purchases.some(p => p.cardName === name); } catch (_) { return false; }
  }
  function refresh() {
    try {
      const state = wallet();
      document.querySelectorAll('[data-shop-balance]').forEach(el => el.textContent = state.balance.toLocaleString('ja-JP') + ' pt');
      if ($('shopSummary')) $('shopSummary').textContent = `称号 ${state.earned.length}個で ${state.total} pt獲得 ／ 使用済み ${state.spent} pt`;
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
      try { localStorage.setItem(KEY, JSON.stringify(next)); }
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
  window.DAISHUGO_SHOP = { wallet, purchase, refresh, isUnlocked, open: openShop };
  function init() {
    $('menuShopBtn')?.addEventListener('click', openShop);
    $('closeShopBtn')?.addEventListener('click', closeShop);
    $('shopCancel')?.addEventListener('click', () => { $('shopConfirm').hidden = true; });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('shopModal').hidden) closeShop(); });
    window.addEventListener('storage', refresh); window.addEventListener('focus', refresh);
    refresh();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
