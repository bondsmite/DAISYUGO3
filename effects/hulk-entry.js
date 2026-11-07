/* Three-second, shared Hulk entry. SVG artwork remains crisp on mobile. */
(function(){
 let cancel=null;
 window.stopHulkEntry=()=>{if(cancel)cancel();};
 window.playHulkEntry=function(done){
  window.stopHulkEntry();
  const overlay=document.createElement('div');overlay.id='hulkEntryOverlay';overlay.setAttribute('role','status');overlay.setAttribute('aria-label','ハルクが岩を破壊！');
  overlay.style.cssText='position:fixed;inset:0;z-index:999999;background:#060d09;display:grid;place-items:center;overflow:hidden;pointer-events:auto';
  const shards=Array.from({length:24},(_,i)=>{const angle=(i*137.5)*Math.PI/180,dx=Math.cos(angle)*(130+i*9),dy=-100-Math.abs(Math.sin(angle))*240;return `<path class="hulk-shard" style="--dx:${dx}px;--dy:${dy}px;--rot:${i*43}deg" d="M${610+i%4*20} 430 l-22 -17 33 -18 24 27 -16 20Z" fill="${['#879783','#5b6b60','#b0bca0'][i%3]}" stroke="#233c31" stroke-width="3"/>`;}).join('');
  overlay.innerHTML=`<style>
#hulkEntryOverlay svg{width:100%;height:100%;max-height:100vh}
.hulk-body{transform-origin:450px 490px;animation:hulkLunge 3s both}
.hulk-arm{transform-origin:490px 267px;animation:hulkPunch 3s both}
.hulk-rock{animation:hulkRock 3s both}.hulk-crack{stroke-dasharray:500;stroke-dashoffset:500;animation:hulkCrack 3s both}
.hulk-shard{transform-box:fill-box;transform-origin:center;animation:hulkShards 3s both;opacity:0}
.hulk-ring{transform-origin:640px 420px;animation:hulkRing 3s both;opacity:0}
.hulk-flash{animation:hulkFlash 3s both;opacity:0}
.hulk-caption{animation:hulkCaption 3s both;opacity:0}
@keyframes hulkLunge{0%{transform:translateX(-150px) scale(.85);opacity:0}18%,30%{transform:translateX(-35px);opacity:1}40%,75%{transform:translateX(25px)}90%,100%{transform:translateX(25px);opacity:0}}
@keyframes hulkPunch{0%,28%{transform:rotate(-65deg)}40%,65%{transform:rotate(15deg)}85%,100%{transform:rotate(-8deg)}}
@keyframes hulkRock{0%,39%{opacity:1}46%,100%{opacity:0}}
@keyframes hulkCrack{0%,38%{stroke-dashoffset:500}43%,100%{stroke-dashoffset:0}}
@keyframes hulkShards{0%,39%{opacity:0;transform:translate(0,0)}41%{opacity:1}82%,100%{opacity:0;transform:translate(var(--dx),var(--dy)) rotate(var(--rot))}}
@keyframes hulkRing{0%,39%{opacity:0;transform:scale(.1)}41%{opacity:1}76%,100%{opacity:0;transform:scale(3)}}
@keyframes hulkFlash{0%,39%{opacity:0}40%{opacity:.8}46%,100%{opacity:0}}
@keyframes hulkCaption{0%,42%{opacity:0;transform:translateY(20px)}50%,80%{opacity:1;transform:translateY(0)}100%{opacity:0}}
</style><svg viewBox="0 0 1000 650" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
<defs><radialGradient id="hulkSky"><stop stop-color="#31542c"/><stop offset="1" stop-color="#060d09"/></radialGradient><linearGradient id="hulkSkin"><stop stop-color="#9bdc48"/><stop offset=".5" stop-color="#55a92e"/><stop offset="1" stop-color="#235423"/></linearGradient></defs>
<rect width="1000" height="650" fill="url(#hulkSky)"/><path d="M0 500 Q300 450 500 490 T1000 490V650H0Z" fill="#101c17"/><ellipse cx="540" cy="515" rx="320" ry="32" fill="#020704"/>
<g class="hulk-body" stroke="#153421" stroke-width="7" stroke-linejoin="round">
<path d="M350 383L335 480 382 506 420 422 455 500 510 490 480 370Z" fill="#6b3d83"/><path d="M335 477L312 517 390 520 389 493M455 488L455 522 539 522 508 482" fill="url(#hulkSkin)"/>
<path d="M357 232 Q405 195 476 225 Q524 258 492 325L477 397Q408 428 348 388L330 286Z" fill="url(#hulkSkin)"/>
<path d="M359 242Q300 236 280 287L255 368Q272 405 308 385L345 305" fill="url(#hulkSkin)"/><path d="M256 367L241 389 261 413 291 411 308 384" fill="url(#hulkSkin)"/>
<path d="M382 165Q419 135 453 165L459 220 430 246 395 225Z" fill="url(#hulkSkin)"/><path d="M379 183L376 151 397 155 405 140 419 150 435 142 454 154 463 186 444 170 414 175 395 167Z" fill="#10231b"/>
<path d="M395 193L411 198M432 197L447 190" stroke="#13261b"/><path d="M403 215L439 211 433 225 410 228Z" fill="#f0edce" stroke-width="3"/>
<path d="M354 276Q393 292 415 269M424 272Q461 292 489 267M416 284L414 379M365 328L400 335M433 333L469 322" fill="none" stroke="#2e7028" stroke-width="5"/>
<g class="hulk-arm"><path d="M476 234Q517 214 544 253L577 296 620 334 595 374 539 340 492 303Q466 281 476 234Z" fill="url(#hulkSkin)"/><path d="M598 330L634 321 666 342 675 375 655 396 615 393 588 366Z" fill="url(#hulkSkin)"/><path d="M628 333L632 363M646 338L649 367M661 347L663 372" stroke-width="4"/></g></g>
<g class="hulk-rock"><path d="M534 492L530 414 567 352 642 330 720 359 753 429 732 493Z" fill="#697b70" stroke="#263d32" stroke-width="8"/><path d="M567 352L605 411 642 330 675 414 720 359M530 414L605 411 587 492M675 414L732 493" fill="none" stroke="#99a995" stroke-width="4"/><path class="hulk-crack" d="M641 367L619 411 653 434 622 485M619 411L559 435M653 434L715 413" fill="none" stroke="#ddff9c" stroke-width="9"/></g>
${shards}<ellipse class="hulk-ring" cx="640" cy="420" rx="100" ry="50" fill="none" stroke="#bbf96c" stroke-width="8"/><rect class="hulk-flash" width="1000" height="650" fill="#dfffad"/>
<text class="hulk-caption" x="500" y="590" text-anchor="middle" fill="#c4ff6b" stroke="#132016" stroke-width="2" font-family="sans-serif" font-size="62" font-weight="1000">HULK SMASH!</text></svg>`;
  document.body.appendChild(overlay);
  const sound=new Audio('./effects/assets/hulk-smash.mp3');sound.preload='auto';sound.volume=1;
  try{const play=sound.play();play?.catch(()=>{});}catch(e){}
  let finished=false;
  const cleanup=()=>{if(finished)return;finished=true;clearTimeout(timer);sound.pause();overlay.remove();if(cancel===cleanup)cancel=null;};
  const timer=setTimeout(()=>{cleanup();if(done)done();},3000);cancel=cleanup;
 };
})();
