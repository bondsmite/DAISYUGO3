/* Full-viewport, two-second ice spell. Procedural facets scale to any screen. */
(()=>{
  let cancel=null;
  window.stopZomaEntry=()=>{if(cancel)cancel();};
  window.playZomaEntry=function(done){
    window.stopZomaEntry();
    const el=document.createElement('div');el.id='zomaEntryOverlay';
    el.setAttribute('role','status');el.setAttribute('aria-label','大魔王ゾーマの登場演出');
    el.style.cssText='position:fixed;inset:0;z-index:1000000;overflow:hidden;pointer-events:auto;background:radial-gradient(ellipse,#20618b,#020918 80%);';
    const shards=Array.from({length:72},(_,i)=>{
      const x=(i%9)*13-4,y=Math.floor(i/9)*15-6;
      const dx=(x-50)*2.4,dy=(y-50)*2.4;
      return `<i class="zoma-ice" style="left:${x}%;top:${y}%;--dx:${dx}vw;--dy:${dy}vh;--r:${(i*67)%360}deg;--d:${(i%7)*22}ms"><b></b></i>`;
    }).join('');
    el.innerHTML=`<style>
#zomaEntryOverlay{animation:zomaScene 2s linear both}
#zomaEntryOverlay .zoma-ice{position:absolute;width:24vw;height:35vh;display:block;background:linear-gradient(125deg,#f3ffff 0%,#79eaff 25%,#247bbbcf 46%,#d8ffff 49%,#91e9ff 54%,#175d99 90%);clip-path:polygon(45% 0,91% 26%,100% 66%,60% 100%,8% 80%,0 29%);filter:drop-shadow(0 0 18px #acfaff);transform-origin:50% 50%;animation:zomaShatter 2s cubic-bezier(.2,.75,.3,1) both;animation-delay:var(--d)}
#zomaEntryOverlay .zoma-ice b{position:absolute;inset:0;background:linear-gradient(65deg,transparent 49%,#eeffff 50%,transparent 52%);clip-path:polygon(45% 0,60% 100%,100% 66%)}
#zomaEntryOverlay .zoma-glow{position:absolute;inset:0;background:radial-gradient(ellipse,#efffff,#63deff66 45%,transparent 75%);animation:zomaGlow 2s both;pointer-events:none}
#zomaEntryOverlay .zoma-name{position:absolute;inset:40% 0 auto;text-align:center;color:white;font:bold clamp(36px,9vw,100px) serif;letter-spacing:.2em;text-shadow:0 0 8px #fff,0 0 24px #60dcff,0 4px 5px #003c69;animation:zomaName 2s both}
@keyframes zomaShatter{0%{opacity:0;transform:scale(.01) translateY(60vh) rotate(-30deg)}28%,54%{opacity:1;transform:scale(1.15)}62%{opacity:1;transform:scale(1.2) translate(0,0)}100%{opacity:0;transform:translate(var(--dx),var(--dy)) rotate(var(--r)) scale(.15)}}
@keyframes zomaGlow{0%,40%{opacity:0}52%{opacity:.3}62%{opacity:.9}78%,100%{opacity:0}}
@keyframes zomaName{0%,18%{opacity:0;transform:scale(1.7)}32%,56%{opacity:1;transform:scale(1)}73%,100%{opacity:0;transform:scale(1.15)}}
@keyframes zomaScene{0%{opacity:0}8%,80%{opacity:1}100%{opacity:0}}
</style>${shards}<div class="zoma-glow"></div>`;
    document.body.appendChild(el);
    const timer=setTimeout(()=>{cancel=null;el.remove();window.startZomaBgm?.();done?.();},2000);
    cancel=()=>{clearTimeout(timer);el.remove();cancel=null;};
  };
})();
