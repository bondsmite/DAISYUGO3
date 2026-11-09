/* Online shared card-entry animations. Triggered from authoritative Firebase game snapshots. */
(function () {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const timers = new Map();
  function audio(id) {
    let a = $(id);
    if (!a && id === "kumagawaOnlineSound") {
      a = document.createElement("audio");
      a.id = id;
      a.src = "./effects/assets/kumagawa-audio.m4a";
      document.body.appendChild(a);
    }
    if (!a) return;
    try {
      a.pause();
      a.currentTime = 0;
      const p = a.play();
      if (p && p.catch) p.catch(() => {});
    } catch (e) {}
  }
  function show(id, cls = "show", duration = 2000) {
    const el = $(id);
    if (!el) return;
    el.classList.remove(cls);
    void el.offsetWidth;
    el.classList.add(cls);
    el.setAttribute("aria-hidden", "false");
    clearTimeout(timers.get(id));
    timers.set(
      id,
      setTimeout(() => {
        el.classList.remove(cls);
        el.setAttribute("aria-hidden", "true");
      }, duration),
    );
  }
  function playKumagawa() {
    const old = $("kumagawaOnlineEntry");
    if (old) old.remove();
    const overlay = document.createElement("div");
    overlay.id = "kumagawaOnlineEntry";
    overlay.innerHTML =
      '<img src="./effects/assets/kumagawa-entry.png" alt="球磨川禊 登場演出">';
    overlay.style.cssText =
      "position:fixed;inset:0;z-index:999999;background:rgba(0,0,0,.94);display:flex;align-items:center;justify-content:center;opacity:0;animation:kumagawaOnlineFade .18s ease-out forwards;";
    const style = document.createElement("style");
    style.id = "kumagawaOnlineStyle";
    style.textContent =
      "@keyframes kumagawaOnlineFade{to{opacity:1}}#kumagawaOnlineEntry img{display:block;max-width:100vw;max-height:100vh;width:100%;height:100%;object-fit:contain;animation:kumagawaOnlineZoom 2s cubic-bezier(.16,.75,.25,1) both}@keyframes kumagawaOnlineZoom{0%{transform:scale(1.12);filter:brightness(.55)}35%{transform:scale(1);filter:brightness(1.12)}100%{transform:scale(1);filter:brightness(1)}}";
    document.head.appendChild(style);
    document.body.appendChild(overlay);
    audio("kumagawaOnlineSound");
    setTimeout(() => {
      overlay.remove();
      style.remove();
      const a = $("kumagawaOnlineSound");
      if (a) {
        a.pause();
        try {
          a.currentTime = 0;
        } catch (e) {}
      }
    }, 2000);
  }
  function playMadoka() {
    try { window.stopMadokaEntry?.(); } catch (e) {}
    const old = $("madokaEntryOverlay");
    if (old) old.remove();
    const oldStyle = $("madokaEntryStyle");
    if (oldStyle) oldStyle.remove();
    const overlay = document.createElement("div");
    overlay.id = "madokaEntryOverlay";
    overlay.innerHTML = '<div class="madoka-entry-backdrop"></div><img src="./effects/assets/madoka-entry.jpg" alt="鹿目まどか 登場演出">';
    overlay.style.cssText = "position:fixed;inset:0;z-index:999999;background:rgba(255,255,255,.78);display:flex;align-items:center;justify-content:center;overflow:hidden;opacity:0;animation:madokaEntryFade .18s ease-out forwards;";
    const style = document.createElement("style");
    style.id = "madokaEntryStyle";
    style.textContent = '@keyframes madokaEntryFade{to{opacity:1}}@keyframes madokaEntrySparkle{0%{transform:translateY(18px) scale(.7);opacity:0}20%{opacity:.95}100%{transform:translateY(-18px) scale(1.15);opacity:0}}@keyframes madokaEntryZoom{0%{transform:scale(1.1);filter:brightness(1.18) saturate(1.1)}35%{transform:scale(1.02);filter:brightness(1.08)}100%{transform:scale(1);filter:brightness(1)}}#madokaEntryOverlay .madoka-entry-backdrop{position:absolute;inset:0;background:radial-gradient(circle at 50% 35%,rgba(255,255,255,.98),rgba(255,255,255,.82) 28%,rgba(240,224,240,.68) 52%,rgba(210,190,210,.46) 72%,rgba(135,120,135,.52) 100%)}#madokaEntryOverlay img{position:relative;display:block;max-width:100vw;max-height:100vh;width:100%;height:100%;object-fit:contain;animation:madokaEntryZoom 3.5s cubic-bezier(.16,.75,.25,1) both;filter:drop-shadow(0 0 18px rgba(255,255,255,.95)) drop-shadow(0 0 34px rgba(255,192,232,.72))}#madokaEntryOverlay .sparkle{position:absolute;width:14px;height:14px;border-radius:50%;background:radial-gradient(circle,rgba(255,255,255,1) 0%,rgba(255,212,244,.95) 38%,rgba(255,255,255,0) 72%);box-shadow:0 0 16px rgba(255,255,255,.95),0 0 28px rgba(255,180,230,.75);animation:madokaEntrySparkle var(--dur,1.8s) ease-out var(--delay,0s) infinite;}';
    document.head.appendChild(style);
    for (let i = 0; i < 24; i++) {
      const s = document.createElement("i");
      s.className = "sparkle";
      s.style.left = (Math.random() * 100).toFixed(2) + "%";
      s.style.top = (Math.random() * 100).toFixed(2) + "%";
      s.style.setProperty("--delay", (Math.random() * 1.6).toFixed(2) + "s");
      s.style.setProperty("--dur", (1.3 + Math.random() * 1.5).toFixed(2) + "s");
      overlay.appendChild(s);
    }
    document.body.appendChild(overlay);
    let a = $("madokaEntrySound");
    if (!a) {
      a = document.createElement("audio");
      a.id = "madokaEntrySound";
      a.src = "./effects/assets/madoka-entry.mp3";
      document.body.appendChild(a);
    }
    audio("madokaEntrySound");
    const timer = setTimeout(() => {
      overlay.remove();
      style.remove();
      const au = $("madokaEntrySound");
      if (au) {
        au.pause();
        try { au.currentTime = 0; } catch (e) {}
      }
    }, 3500);
    window.stopMadokaEntry = () => {
      clearTimeout(timer);
      overlay.remove();
      style.remove();
      const au = $("madokaEntrySound");
      if (au) {
        au.pause();
        try { au.currentTime = 0; } catch (e) {}
      }
    };
  }

  function playNergigante() {
    const el = $("nergiganteThornStageOverlay");
    if (!el) return;
    el.innerHTML = "";
    el.classList.remove("show");
    void el.offsetWidth;
    const add = (tag, cls, style = "") => {
      const n = document.createElement(tag);
      n.className = cls;
      if (style) n.style.cssText = style;
      el.appendChild(n);
      return n;
    };
    add("i", "impact-core");
    add("i", "shockwave", "--delay:.22s");
    add("i", "shockwave", "--delay:.38s");
    add("i", "flash");
    for (let i = 0; i < 58; i++) {
      const t = document.createElement("i");
      t.className = "thorn";
      const side = i % 4,
        along = Math.random() * 112 - 6;
      const x =
        side === 0
          ? along
          : side === 1
            ? along
            : side === 2
              ? Math.random() * 22 - 11
              : 78 + Math.random() * 22;
      const y =
        side === 0
          ? Math.random() * 22 - 11
          : side === 1
            ? 78 + Math.random() * 22
            : along;
      const w = (18 + Math.random() * 48).toFixed(1) + "px",
        h = (170 + Math.random() * 310).toFixed(1) + "px",
        rot =
          (
            Math.random() * 110 -
            55 +
            (side === 1 || side === 3 ? 90 : 0)
          ).toFixed(1) + "deg",
        dx = ((50 - x) * (0.7 + Math.random() * 0.45)).toFixed(0) + "vw",
        dy = ((50 - y) * (0.7 + Math.random() * 0.45)).toFixed(0) + "vh",
        delay = (0.08 + Math.random() * 0.42).toFixed(3) + "s";
      t.style.cssText =
        "--x:" +
        x.toFixed(2) +
        "%;--y:" +
        y.toFixed(2) +
        "%;--w:" +
        w +
        ";--h:" +
        h +
        ";--rot:" +
        rot +
        ";--dx:" +
        dx +
        ";--dy:" +
        dy +
        ";--delay:" +
        delay +
        ";";
      el.appendChild(t);
    }
    el.classList.add("show");
    el.setAttribute("aria-hidden", "false");
    audio("nergiganteStageSound");
    setTimeout(() => {
      el.classList.remove("show");
      el.setAttribute("aria-hidden", "true");
      el.innerHTML = "";
      const a = $("nergiganteStageSound");
      if (a) {
        a.pause();
        try {
          a.currentTime = 0;
        } catch (e) {}
      }
    }, 4300);
  }
  window.DAISHUGO_PLAY_ONLINE_ANIMATION = function (card, below) {
    if (!card || !card.name) return;
    switch (card.name) {
      case "ともだち":
        if(card.effectActivated === true) window.playTomodachiEntry?.();
        break;
      case "大魔王ゾーマ":
        window.playZomaEntry?.();
        break;
      case "ハルク":
        window.playHulkEntry?.();
        break;
      case "ロクサス":
        playRoxasBgm();
        break;
      case "星野アイ":
        audio("hoshinoAiStageSound");
        show("hoshinoAiStageOverlay", "show", 2500);
        break;
      case "鹿目まどか":
        playMadoka();
        break;
      case "成歩堂龍一":
        audio("naruhodoObjectionSound");
        show("naruhodoObjectionOverlay", "show", 2000);
        break;
      case "オールマイト":
        if (below && below.kind === "follower" && Number(below.number) === 3) {
          audio("allMightEffectSound");
          show("allMightEffectOverlay", "show", 2000);
        }
        break;
      case "球磨川禊":
        if (below && String(below.number) === "L") playKumagawa();
        break;
      case "うちはマダラ":
        audio("madaraSharinganSound");
        show("madaraSharinganStage", "active", 2000);
        break;
      case "ネルギガンテ":
        playNergigante();
        break;
      case "ダセット":
        if (typeof window.playDasetEntryEffect === "function")
          window.playDasetEntryEffect();
        break;
    }
  };
})();
