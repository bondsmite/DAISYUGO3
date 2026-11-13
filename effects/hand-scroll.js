(() => {
  function init() {
    const hand = document.getElementById('hand');
    if (!hand || document.getElementById('handScroll')) return;
    const bar = document.createElement('input');
    bar.type = 'range'; bar.id = 'handScroll'; bar.className = 'hand-scroll-control';
    bar.min = '0'; bar.max = '0'; bar.step = '1'; bar.value = '0';
    bar.setAttribute('aria-label', '手札を横にスクロール');
    bar.setAttribute('aria-controls', 'hand');
    hand.after(bar);
    function sync() {
      const max = Math.max(0, hand.scrollWidth - hand.clientWidth);
      bar.max = String(max); bar.disabled = max === 0;
      bar.value = String(Math.max(0, Math.min(max, hand.scrollLeft)));
    }
    bar.addEventListener('input', () => { hand.scrollLeft = Number(bar.value); });
    hand.addEventListener('scroll', sync, { passive: true });
    window.addEventListener('resize', sync);
    new MutationObserver(sync).observe(hand, { childList: true, subtree: true });
    if (window.ResizeObserver) new ResizeObserver(sync).observe(hand);
    document.fonts?.ready?.then(sync);
    window.syncHandScroll = sync;
    sync();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
