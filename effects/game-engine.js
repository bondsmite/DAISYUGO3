/* Both modes load this file. Add/change card rules here, never in online-mode.html. */
let onlineMode = !!window.DAISHUGO_ONLINE_PAGE;
function activeHumanSeat() {
  return onlineMode
    ? Number.isInteger(window.onlineSeat) && window.onlineSeat >= 0
      ? window.onlineSeat
      : 0
    : 0;
}
function isLocalTurn() {
  return (
    !!G &&
    (!onlineMode || window.onlineSeat >= 0) &&
    G.current === activeHumanSeat()
  );
}
function isCpuTurn() {
  return !!G && !!G.players[G.current] && !G.players[G.current].human;
}
function hasPendingEffect() {
  return (
    !!G &&
    (Object.keys(G).some((k) => k.startsWith("pending") && !!G[k]) ||
      !!sunrakuState ||
      !!pendingSuperMushroom)
  );
}
function canOperateEffect(owner) {
  return (
    !onlineMode ||
    (!window.DAISHUGO_ONLINE_ADAPTER?.busy && owner === activeHumanSeat())
  );
}
function notifyGameChanged() {
  if (window.DAISHUGO_ONLINE_ADAPTER) window.DAISHUGO_ONLINE_ADAPTER.changed();
}

const DATA = window.DAISHUGO_CARD_DATA;
const COLORS = {};
let G = null,
  selected = null,
  selectedSpell = null,
  locked = false;
let cpuDifficulty = localStorage.getItem("daishugo.cpuDifficulty") || "normal";
let sunrakuState = null;
let pendingSuperMushroom = null;
function shuffle(a) {
  a = [...a];
  for (let i = a.length - 1; i > 0; i--) {
    let j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function cloneCard(c, id) {
  return { ...c, id: id + "-" + Math.random().toString(36).slice(2, 8) };
}
const STARTER_DECK_NAMES = {
  1: ["ネート", "アヤシシ", "球磨川禊", "ベルエンジェル"],
  2: ["リュウ", "ぐら", "スパイダーマン", "スルト"],
  3: ["涼宮ハルヒ", "カレーパンマン", "ソラ", "鹿目まどか"],
  4: ["ハルク", "くちぱっち", "ガブリエル", "仮面ライダーダブル"],
  5: ["ぐり", "アルル", "ソニック", "雪ミク"],
  6: ["ヒソカ", "ダセット", "ネク", "バン"],
  7: ["碇ゲンドウ", "ジェネシスドラゴン", "ゴジラ", "ロクサス"],
  L: ["マキマ", "ニューワード"],
  S: [
    "ビッグライト",
    "鬼人薬",
    "スーパーキノコ",
    "ヴィブラニウム",
    "ハッスルねじ",
  ],
};
function buildComDeckNames() {
  const pool = DATA.catalog.filter((c) => ONLINE_IMPLEMENTED_NAMES.has(c.name));
  const chosen = [],
    used = new Set();
  const effectText = (c) => String(c.effect || c.text || c.description || "");
  const tags = (c) => {
    const t = effectText(c),
      out = [];
    for (const [k, re] of Object.entries({
      draw: /ドロー|引く|手札に加え/,
      grave: /墓地|破壊|捨てる/,
      deck: /山札|デッキ/,
      cost: /コスト|軽減/,
      field: /場|フォロワー/,
      number: /数字|階段|革命|抗争/,
      buff: /BP|強化|上昇/,
    }))
      if (re.test(t)) out.push(k);
    return out;
  };
  const cost = (c) => Math.max(0, Math.min(3, Number(c.cost) || 0));
  const score = (c, group) => {
    const t = effectText(c),
      tg = tags(c);
    let v = 4 + Math.random() * 4;
    // 低コストは行動の自由度を確保。高コストは効果の大きさで補う。
    v += cost(c) === 0 ? 3 : cost(c) === 1 ? 2 : cost(c) === 2 ? 0 : -2;
    if (/ドロー|引く|手札に加え/.test(t)) v += 3;
    if (/墓地.*手札|墓地から.*加え|山札.*手札/.test(t)) v += 2.5;
    if (/破壊|消滅/.test(t)) v += 1.5;
    if (/全員|すべて|全て/.test(t)) v += 1;
    if (/条件|場合|なら/.test(t)) v -= 0.5;
    if (group === "S" && /チェーン/.test(t)) v += 1.5;
    // すでに選んだカードとの効果・種族シナジー
    for (const x of chosen) {
      const xt = tags(x);
      v += tg.filter((k) => xt.includes(k)).length * 0.45;
      if (c.tribe && x.tribe && c.tribe === x.tribe) v += 1.1;
    }
    return v;
  };
  const pick = (group, count) => {
    const candidates = pool.filter((c) =>
      group === "S"
        ? c.kind === "spell"
        : group === "L"
          ? c.kind === "follower" && String(c.number) === "L"
          : c.kind === "follower" && String(c.number) === group,
    );
    if (candidates.length < count)
      throw new Error(
        "COMデッキ構築エラー：" +
          group +
          "の候補カードが" +
          candidates.length +
          "枚しかありません。",
      );
    for (let n = 0; n < count; n++) {
      const available = candidates.filter((c) => !used.has(c.name));
      available.sort((a, b) => score(b, group) - score(a, group));
      // 上位候補からランダムに選び、強さと構築の多様性を両立
      const top = available.slice(
        0,
        Math.min(
          Math.max(3, Math.ceil(available.length * 0.35)),
          available.length,
        ),
      );
      const c = top[Math.floor(Math.random() * top.length)];
      used.add(c.name);
      chosen.push(c);
    }
  };
  for (const n of ["1", "2", "3", "4", "5", "6", "7"]) pick(n, 4);
  pick("L", 2);
  pick("S", 5);
  return {
    1: chosen
      .filter((c) => c.kind === "follower" && String(c.number) === "1")
      .map((c) => c.name),
    2: chosen
      .filter((c) => c.kind === "follower" && String(c.number) === "2")
      .map((c) => c.name),
    3: chosen
      .filter((c) => c.kind === "follower" && String(c.number) === "3")
      .map((c) => c.name),
    4: chosen
      .filter((c) => c.kind === "follower" && String(c.number) === "4")
      .map((c) => c.name),
    5: chosen
      .filter((c) => c.kind === "follower" && String(c.number) === "5")
      .map((c) => c.name),
    6: chosen
      .filter((c) => c.kind === "follower" && String(c.number) === "6")
      .map((c) => c.name),
    7: chosen
      .filter((c) => c.kind === "follower" && String(c.number) === "7")
      .map((c) => c.name),
    L: chosen
      .filter((c) => c.kind === "follower" && String(c.number) === "L")
      .map((c) => c.name),
    S: chosen.filter((c) => c.kind === "spell").map((c) => c.name),
  };
}
function mkDeck(customNames = null) {
  const d = [];
  const deckNames = customNames || {
    1: ["ネート", "アヤシシ", "球磨川禊", "ベルエンジェル"],
    2: ["リュウ", "ぐら", "スパイダーマン", "スルト"],
    3: ["涼宮ハルヒ", "カレーパンマン", "ソラ", "鹿目まどか"],
    4: ["ハルク", "くちぱっち", "ガブリエル", "仮面ライダーダブル"],
    5: ["ぐり", "アルル", "ソニック", "雪ミク"],
    6: ["ヒソカ", "ダセット", "ネク", "バン"],
    7: ["碇ゲンドウ", "ジェネシスドラゴン", "ゴジラ", "ロクサス"],
    L: ["マキマ", "ニューワード"],
    S: [
      "ビッグライト",
      "鬼人薬",
      "スーパーキノコ",
      "ヴィブラニウム",
      "ハッスルねじ",
    ],
  };
  for (const n of ["1", "2", "3", "4", "5", "6", "7", "L", "S"]) {
    for (const name of deckNames[n]) {
      const c = DATA.catalog.find(
        (x) =>
          x.name === name &&
          ((n === "S" && x.kind === "spell") ||
            (n !== "S" && x.kind === "follower" && String(x.number) === n)),
      );
      if (!c)
        throw new Error(
          "指定デッキのカードが見つかりません：" + name + "（" + n + "）",
        );
      d.push(c);
    }
  }
  if (d.length !== 35)
    throw new Error("デッキ構成エラー：" + d.length + "枚（35枚必要）");
  if (new Set(d.map((c) => c.name)).size !== 35)
    throw new Error("デッキ構成エラー：同名カードが重複しています。");
  return shuffle(d.map((c, i) => cloneCard(c, "d" + i)));
}
function log(s) {
  G.logs.unshift(s);
  G.logs = G.logs.slice(0, 80);
}
function resetSunrakuEffect(card) {
  if (card?.yoshiBoost) { card.bp -= 6000; delete card.yoshiBoost; }
  if (card && card.name === "サンラク") {
    card.number = "1";
    card.cost = card.arceusDiscount?0:1;
    delete card.sunrakuBoost;
  }
}
function renderSunrakuPanel() {
  const panel = document.getElementById("sunrakuPanel");
  if (!panel) return;
  const active = !!sunrakuState;
  panel.style.display = active ? "block" : "none";
  if (!active) return;
  const p = G.players[activeHumanSeat()],
    state = sunrakuState,
    card = p.hand.find((c) => c.id === state.cardId);
  if (!card) {
    sunrakuState = null;
    panel.style.display = "none";
    return;
  }
  const followers = p.hand.filter(
    (c) => c.kind === "follower" && c.id !== card.id,
  );
  document.getElementById("sunrakuChoices").style.display =
    state.mode === "choice" ? "flex" : "none";
  document.getElementById("sunrakuPickList").style.display =
    state.mode === "pick" ? "flex" : "none";
  document.getElementById("sunrakuConfirmBtn").style.display =
    state.mode === "pick" ? "inline-block" : "none";
  document.getElementById("sunrakuCancelBtn").style.display =
    state.mode === "pick" ? "inline-block" : "none";
  document.getElementById("sunrakuDescription").textContent =
    state.mode === "choice"
      ? "手札のフォロワー3枚を山札に戻すと、サンラクの数字が+4（最大7）になります。戻さずに出すこともできます。"
      : "戻すフォロワーを3枚選択してください。選択中：" +
        state.selected.length +
        "/3";
  document.getElementById("sunrakuPickList").innerHTML =
    followers
      .map(
        (c) =>
          '<button type="button" data-sunraku-pick="' +
          c.id +
          '" class="' +
          (state.selected.includes(c.id) ? "primary" : "") +
          '">' +
          cardHtml(c,false) + "</button>",
      )
      .join("") || "<span>選択できるフォロワーがありません。</span>";
  document.getElementById("sunrakuConfirmBtn").disabled =
    state.selected.length !== 3;
  document.getElementById("playBtn").disabled = true;
  document.getElementById("passBtn").disabled = true;
  document.getElementById("spellBtn").disabled = true;
}
function finishSunraku(returnCards) {
  if (window.DAISHUGO_ONLINE_ADAPTER?.busy) return;
  if (!G || !sunrakuState || !isLocalTurn() || G.winner) return;
  const p = G.players[activeHumanSeat()],
    state = sunrakuState,
    card = p.hand.find((x) => x.id === state.cardId);
  if (!card) {
    sunrakuState = null;
    render();
    return;
  }
  if (returnCards) {
    if (state.selected.length !== 3) return;
    const chosen = state.selected.map((id) => p.hand.find((x) => x.id === id));
    if (chosen.some((x) => !x || x.kind !== "follower" || x.id === card.id))
      return;
    for (const x of chosen) p.hand = p.hand.filter((y) => y.id !== x.id);
    p.deck.push(...chosen);
    p.deck = shuffle(p.deck);
    log(
      "サンラクの効果：手札のフォロワー3枚を山札に戻し、山札をシャッフルしました。",
    );
  }
  const idx = p.hand.findIndex((x) => x.id === state.cardId);
  if (idx < 0) {
    sunrakuState = null;
    render();
    return;
  }
  if (returnCards) {
    const played = p.hand[idx];
    played.sunrakuOriginalNumber = String(played.number);
    played.number = String(Math.min(7, (Number(played.number) || 0) + 4));
    played.sunrakuBoost = true;
    log(
      "サンラクの効果：数字が+4され、数字" +
        played.number +
        "として場に出ます。",
    );
  }
  const spellId = state.spellId;
  sunrakuState = null;
  selected = p.hand[idx].id;
  selectedSpell = spellId;
  const spell = spellId ? p.hand.find((x) => x.id === spellId) : null;
  const total = effectiveCost(p.hand[idx], p) + (spell ? spell.cost : 0);
  if (!canPlay(p.hand[idx], p) || total > availableCost(p, spell)) {
    selected = null;
    selectedSpell = null;
    render();
    document.getElementById("notice").textContent =
      "サンラクを出す条件が満たせません。カードは手札に残っています。";
    return;
  }
  const playedSuccessfully = doPlay(activeHumanSeat(), idx, spellId);
  if(playedSuccessfully&&returnCards)recordFollowerEffect(activeHumanSeat(),"サンラク");
  if (playedSuccessfully && p.hand.length === 0 && G.titleMatchProgress)
    addTitleProgress(activeHumanSeat(), "sunraku_empty");
  selected = null;
  selectedSpell = null;
  if (
    G.pendingGodzilla ||
    G.pendingHulk ||
    G.pendingAruru ||
    G.pendingNeku ||
    G.pendingHoshinoAi ||
    G.pendingMadoka ||
    G.pendingGuri ||
    G.pendingGura ||
    G.pendingNeito ||
    G.pendingSpiderMan
  ) {
    render();
    return;
  }
  afterAction(activeHumanSeat());
}
function newGame() {
  resetMatchOutcome();
  window.stopLightEntry?.();
  window.stopDoomEntry?.();
  window.stopHulkEntry?.();
  window.stopMadokaEntry?.();
  window.stopAvaEntry?.();
  window.stopLuxordEntry?.();
  window.stopArceusEntry?.();
  window.stopHomuraRewind?.();
  window.stopSurtMeteors?.();
  window.stopZomaEntry?.();
  window.stopTomodachiEntry?.();
  cancelZomaBgm();
  cpuDifficulty=localStorage.getItem("daishugo.cpuDifficulty")||cpuDifficulty;
  sunrakuState = null;
  pendingSuperMushroom = null;
  G = {
    matchId: Date.now()+"-"+Math.random(),
    players: [
      {
        name: "あなた",
        human: true,
        hand: [],
        deck: [],
        grave: [],
        cost: 3,
        passed: false,
        activated: false,
      },
      {
        name: "CPU A",
        hand: [],
        deck: [],
        grave: [],
        cost: 3,
        passed: false,
        activated: false,
      },
      {
        name: "CPU B",
        hand: [],
        deck: [],
        grave: [],
        cost: 3,
        passed: false,
        activated: false,
      },
    ],
    field: [],
    current: 0,
    lead: 0,
    passes: 0,
    turn: 0,
    revolution: false,
    sherryRestoreRevolution: null,
    conflict: false,
    forbiddenNumber: null,
    forbiddenNumbers: [],
    pendingCureLemonade: false,
    cureLemonadeOwner: null,
    cureLemonadeChoices: [],
    winner: null,
    pendingGodzilla: false,
    godzillaResolved: false,
    pendingGuri: false,
    pendingGura: false,
    pendingMadoka: false,
    pendingVibranium: null,
    madokaPickMode: "madoka",
    madokaOwner: null,
    pendingHulk: false,
    hulkResolved: false,
    pendingAruru: false,
    aruruSelections: [],
    aruruResolved: false,
    pendingNeku: false,
    pendingHoshinoAi: false,
    hoshinoAiOwner: null,
    hoshinoAiSelections: [[], [], []],
    nekuSelections: [null, null, null],
    nekuConfirmed: [false, false, false],
    pendingNeito: false,
    pendingSpiderMan: false,
    neitoChoice: "",
    gabrielBuffOwner: null,
    gabrielPendingOwner: null,
    newWordBuffOwner: null,
    newWordPendingOwner: null,
    makimaPending: false,
    makimaActive: false,
    logs: [],
    titleMatchProgress: {
      ...Object.fromEntries(DAISHUGO_NEW_TITLE_IDS.map(k=>[k,0])),
      roxas_zero: 0,
      neito_play: 0,
      horus_gendo: 0,
      surt_4plus: 0,
      sunraku_empty: 0,
      spiderman_english: 0,
      kumagawa_l: 0,
      madoka_play: 0,
      five_six_deck: 0,
      kuchipatchi_field: 0,
      tokimeki_effect: 0,
      chizuko_takina_combo: 0,
      curry_field: 0,
      haruhi_target: 0,
      extreme_double_flow: 0,
      wandering_fighter_ryu: 0,
      bell_angel_effect: 0,
      barrier_rush_ayashishi: 0,
    },
    titleProgressCommitted: false,
  };
  if (onlineMode) {
    if (!window.onlineSeats)
      throw new Error("オンラインの席情報がありません。");
    G.players = window.onlineSeats.map((seat, i) => ({
      name: seat.name,
      uid: seat.uid || null,
      human: !!seat.human,
      hand: [],
      deck: [],
      grave: [],
      cost: 3,
      passed: false,
      activated: false,
    }));
  } else G.players[0].name = loadPlayerName();
  G.nekuSelections=G.players.map(()=>null);
  G.nekuConfirmed=G.players.map(()=>false);
  G.hoshinoAiSelections=G.players.map(()=>[]);
  G.hoshinoAiConfirmed=G.players.map(()=>false);
  G.players.forEach((p, i) => {
    const names = p.human
      ? onlineMode
        ? window.onlineSeats[i].deckNames
        : readMenuDeckInfo().cards
      : buildComDeckNames();
    const deck = mkDeck(names);
    p.hand = deck.splice(0, 5);
    p.deck = deck;
  });
  G.players.forEach((p,i)=>{p.turnVisits=0;p.titleName=onlineMode?window.onlineSeats[i].titleName||"":i===0?selectedTitle()?.name||"":"";});
  selected = null;
  selectedSpell = null;
  log(
    "COMはデッキ作成画面の実装済み全カードから、相性・効果・コストバランスを考慮して35枚デッキをランダム構築しました。",
  );
  log(
    "ゲーム開始。各プレイヤーは5枚引きました。実装済みのカード効果が有効です。",
  );
  initialLead();
  render();
}
function initialLead() {
  G.initialLeadPending = true;
  G.initialLeadChoices = G.players.map((p) => {
    if (p.human) return null;
    const cards = p.hand.filter((c) => c.kind === "follower");
    return (
      cards.reduce(
        (best, c) => (!best || compareStart(c, best) > 0 ? c : best),
        null,
      )?.id || null
    );
  });
  G.initialLeadConfirmed = G.players.map(
    (p, i) => !p.human && !!G.initialLeadChoices[i],
  );
  log("先攻決定：各プレイヤーが手札からフォロワーを1枚選んでいます。");
  renderInitialLead();
}
function renderInitialLead() {
  const modal = document.getElementById("initialLeadModal");
  if (!modal) return;
  modal.style.display = G?.initialLeadPending ? "flex" : "none";
  if (!G?.initialLeadPending) return;
  const seat = activeHumanSeat(),
    p = G.players[seat],
    done = !!G.initialLeadConfirmed[seat];
  document.getElementById("initialLeadChoices").innerHTML = p.hand
    .filter((c) => c.kind === "follower")
    .map(
      (c) =>
        `<button type="button" class="initial-lead-card ${G.initialLeadChoices[seat] === c.id ? "primary" : ""}" data-initial-lead-card="${c.id}" ${done ? "disabled" : ""}>${cardHtml(c,false)}</button>`,
    )
    .join("");
  document.getElementById("initialLeadConfirm").disabled =
    done || !G.initialLeadChoices[seat];
  document.getElementById("initialLeadConfirm").textContent = done
    ? "他のプレイヤーの確定を待っています"
    : "このカードで先攻を決定";
}
function bindInitialLeadControls() {
  document
    .getElementById("initialLeadChoices")
    .addEventListener("click", (e) => {
      const detail = e.target.closest("[data-card-detail-id]");
      if (detail) {
        openCardZoomById(detail.dataset.cardDetailId);
        return;
      }
      const button = e.target.closest("[data-initial-lead-card]");
      if (!button || !G?.initialLeadPending) return;
      const seat = activeHumanSeat();
      if (G.initialLeadConfirmed[seat]) return;
      G.initialLeadChoices[seat] = button.dataset.initialLeadCard;
      renderInitialLead();
    });
  document.getElementById("initialLeadConfirm").onclick = confirmInitialLead;
}
function confirmInitialLead() {
  if (!G?.initialLeadPending) return;
  const seat = activeHumanSeat(),
    id = G.initialLeadChoices[seat];
  if (!id) return;
  if (onlineMode) {
    window.DAISHUGO_ONLINE_ADAPTER.confirmChoice("opening", [id]);
    return;
  }
  G.initialLeadConfirmed[seat] = true;
  resolveOpeningChoices();
  render();
  if (isCpuTurn()) cpuLoop();
}
function resolveOpeningChoices() {
  if (!G?.initialLeadPending || !G.initialLeadConfirmed.every(Boolean))
    return false;
  const chosen = G.players.map((p, i) =>
    p.hand.find((c) => c.id === G.initialLeadChoices[i]),
  );
  if (chosen.some((c) => !c || c.kind !== "follower")) return false;
  const bestCards = shuffle(chosen.map((c,i)=>({c,i})))
    .sort((a,b)=>compareStart(b.c,a.c));
  G.turnOrder=bestCards.map(x=>x.i);
  const best=G.turnOrder[0];
  G.players.forEach((p, i) => {
    p.hand = p.hand.filter((c) => c.id !== chosen[i].id);
    resetSunrakuEffect(chosen[i]);
    p.grave.push(chosen[i]);
    if (!p.hand.length && p.deck.length) p.hand.push(p.deck.pop());
  });
  G.players[best].turnVisits=1;
  G.current = best;
  G.lead = best;
  G.initialLeadPending = false;
  log(
    "先攻決定：" +
      G.turnOrder.map((seat,rank)=>(rank+1)+"番目："+G.players[seat].name).join(" → ") +
      "。各プレイヤーが選んだフォロワーを墓地へ置きました。",
  );
  return true;
}
// Serializable number changes: higher priority wins, ties use the newest effect.
function applyNumberChange(change) {
  G.numberChangeSequence=(G.numberChangeSequence||0)+1;
  G.numberChanges=G.numberChanges||[];
  G.numberChanges.push({...change, priority:Number(change.priority)||0, sequence:G.numberChangeSequence});
}
function activeNumberChange(c) {
  if(!G || c.kind!=='follower' || c.number==='L')return null;
  return (G.numberChanges||[]).filter(x=>!x.cardIds||x.cardIds.includes(c.id))
    .reduce((best,x)=>!best||x.priority>best.priority||(x.priority===best.priority&&x.sequence>best.sequence)?x:best,null);
}
function fieldNumber(c) {
 if(c.number==='L')return 8;
 if(c.kind!=='follower')return 0;
 let n=Number(c.number)||1;
 if(!G)return n;
 const override=activeNumberChange(c);
 if(override && override.priority>=0)return Math.max(1,Math.min(7,Number(override.value)));
 const entry=G.field.find(x=>x.card.id===c.id), owner=G.players.findIndex(p=>p.hand.some(x=>x.id===c.id));
 const seat=owner>=0?owner:entry?.player;
 if(c.name==='仮面ライダーダブル' && entry)n=6;
 n+=c.zomaBonus||0;
 if(G.makimaActive)n+=c.tribe==='英種族'?2:c.tribe==='魔種族'?-2:0;
 if(c.bigLightBoost)n+=1;
 if(seat!=null && seat>=0){
  if(G.gabrielBuffOwner===seat)n++;
  if(G.newWordBuffOwner===seat)n+=2;
  if(c.name==='スルト')n+=Math.floor(G.players[seat].hand.filter(x=>x.id!==c.id).length/5);
 }
 if(c.tribe==='龍種族'&&(entry||owner>=0))n+=G.qurioBonus||0;
 if(c.name==='メルゼナ'&&(entry||owner>=0)&&G.qurioUsed)return 7;
 if(c.name==='ソラ'&&(entry||owner>=0))n+=G.field.filter(x=>x.card.id!==c.id&&x.card.kind==='follower'&&x.card.tribe==='英種族').length;
 return Math.max(1,Math.min(7,n));
}
function currentNumberLabel(c){return c.number==='L'||c.kind!=='follower'?String(c.number):String(fieldNumber(c));}
function num(c) {
  return fieldNumber(c);
}
function compareStart(a, b) {
  let na = num(a),
    nb = num(b);
  if (na !== nb) return na - nb;
  return a.bp - b.bp;
}
function strength(c) {
  const n = fieldNumber(c);
  if (G.conflict) return c.bp;
  if (G.revolution) {
    if (c.number === "L") return 9;
    return 8 - n;
  }
  return n;
}
function effectiveCost(c, p) {
  if (c.name === "ロクサス" && p.grave.some((x) => x.name === "ソラ")) return 0;
  if (c.name === "ジェネシスドラゴン" && p.deck.length === 0) return 0;
  if (
    c.name === "バターカップ" &&
    G &&
    G.field.filter((x) => x.card && x.card.kind === "follower").length >= 2
  )
    return 0;
  return Number(c.cost);
}
function canPlay(c, p = G.players[G.current], spell = null) {
  if (!spell && p === G.players[activeHumanSeat()] && c?.id === selected)
    spell = p.hand.find(x=>x.id===selectedSpell);
  const bonus=G.qurioBonus, used=G.qurioUsed;
  if(spell?.name==='キュリア'){G.qurioBonus=(bonus||0)+2;G.qurioUsed=true;}
  const preview=spell?.name==='鬼人薬' ? {...c,bp:Number(c.bp||0)+4000} : c;
  try{return canPlayBase(preview,p);}finally{G.qurioBonus=bonus;G.qurioUsed=used;}
}
function canPlayBase(c, p) {
  if (c.kind !== "follower") return false;
  if (effectiveCost(c, p) > availableCost(p)) return false;
  if (
    G.forbiddenNumber !== null &&
    currentNumberLabel(c) === String(G.forbiddenNumber)
  )
    return false;
  if (
    Array.isArray(G.forbiddenNumbers) &&
    G.forbiddenNumbers.includes(currentNumberLabel(c))
  )
    return false;
  if (!G.field.length) return c.name!=="暁美ほむら";
  let top = G.field[G.field.length - 1].card;
  if (top.name === "梅喧" && [4,5].includes(fieldNumber(c))) return false;
  if (!G.conflict && top.number === "L" && c.name === "球磨川禊") return true;
  if (top.name === "雪ミク" && Number(c.bp) <= Number(top.bp)) return false;
  if (!G.conflict && fieldNumber(top) === 7 && c.name === "ヒソカ") return true;
  let a = strength(c),
    b = strength(top);
  if (a !== b) return a > b;
  if (G.conflict || G.revolution || a === b) return c.bp > top.bp;
  return false;
}
function render() {
  syncGameBgmToDecks();
  if (!G) return;
  syncBellAngelEffectSound();
  renderInitialLead();
  document.body.classList.toggle("revolution-mode", !!G.revolution && !G.conflict);
  document.body.classList.toggle("conflict-mode", !!G.conflict);
  document.getElementById("players").innerHTML = G.players
    .map(
      (p, i) =>
        `<div class="player ${i === G.current && !G.winner ? "active" : ""}"><h3>${p.titleName ? `<div style="font-size:12px;color:#ffe08a;margin-bottom:4px">『${escapeHtml(p.titleName)}』</div>` : ""}${escapeHtml(p.name)}${i === G.current && !G.winner ? " ◀" : ""}</h3><div class="stats">${G.turnOrder ? `<span class="turn-order-rank">${G.turnOrder.indexOf(i)+1}番目</span>` : ""}<span>手札 <b>${p.hand.length}</b></span><span>山札 <b>${p.deck.length}</b></span><span>残りフォロワー <b>${p.hand.filter((c) => c.kind === "follower").length + p.deck.filter((c) => c.kind === "follower").length}</b></span><button class="grave-count" type="button" onclick="openGraveyard(${i})" aria-label="${escapeHtml(p.name)}の墓地を確認">墓地 <b>${p.grave.length}</b> <span aria-hidden="true">↗</span></button><span>コスト <b>${p.cost}/3</b>${costLightsHtml(p.cost)}</span></div></div>`,
    )
    .join("");
  document.getElementById("turnTag").textContent = G.winner
    ? G.players[G.winner.index].name + "の勝利"
    : G.players[G.current].name + "の番";
  document.getElementById("stateTag").textContent =
    (G.revolution ? "革命状態" : G.conflict ? "抗争状態" : "通常状態") +
    (G.forbiddenNumber !== null ? "｜プレイ禁止：" + G.forbiddenNumber : "") +
    (G.forbiddenNumbers?.length
      ? "｜プレイ禁止：" + G.forbiddenNumbers.join("・")
      : "") +
    "｜連続パス " +
    G.passes +
    "/" + G.players.length;
  document.getElementById("deckCount").textContent =
    "山札合計 " + G.players.reduce((a, p) => a + p.deck.length, 0);
  document.getElementById("field").innerHTML = G.field.length
    ? G.field.map((x) => cardHtml(x.card, false, true)).join("")
    : '<div class="field-label">場は空です。フォロワーを出せます。</div>';
  let p = G.players[activeHumanSeat()];
  document.getElementById("handCount").textContent = p.hand.length + "枚";
  document.getElementById("hand").innerHTML = p.hand
    .map((c) => cardHtml(c, true))
    .join("");
  let previewCard =
    p.hand.find((c) => c.id === selected) ||
    p.hand.find((c) => c.id === selectedSpell);
  let preview = document.getElementById("handPreview");
  if (previewCard) {
    preview.classList.add("visible");
    preview.innerHTML =
      cardHtml(previewCard, false, true) +
      '<div class="hand-preview-info"><strong>' +
      escapeHtml(previewCard.name) +
      "</strong><br><strong>カードの効果</strong><br>" +
      escapeHtml(previewCard.effect || "効果なし") +
      "</div>";
  } else {
    preview.classList.remove("visible");
    preview.innerHTML = "";
  }
  document.getElementById("log").innerHTML = G.logs
    .map((x) => "<div>" + linkedLogHtml(x) + "</div>")
    .join("");
  document.getElementById("notice").textContent = G.winner
    ? "ゲーム終了！「新しいゲーム」で再戦できます。"
    : G.pendingGodzilla ||
        G.pendingHulk ||
        G.pendingAruru ||
        G.pendingNeku ||
        G.pendingMadoka ||
        G.pendingGuri ||
        G.pendingGura
      ? G.pendingGuri
        ? "ぐりの効果処理中です。赤く光っている「ぐら」を選択してください。"
        : G.pendingGura
          ? "ぐらの効果処理中です。赤く光っている「ぐり」を選択してください。"
          : G.pendingGodzilla
            ? "ゴジラの効果処理中です。対象を選択し、完了ボタンを押してください。"
            : G.pendingHulk
              ? "ハルクの効果処理中です。破壊するカードを選択し、完了ボタンを押してください."
              : G.pendingAruru
                ? "アルルの効果処理中です。同じ数字のフォロワーを2枚選び、確認ボタンを押してください。"
                : "ネクの効果処理中です。自分の手札から1枚選び、確認ボタンを押してください。CPUも選択・確認するまでゲームは進行しません。"
      : G.pendingNeito
        ? "ネートの効果処理中です。禁止する数字を選び、効果処理ボタンを押してください。"
        : !isLocalTurn()
          ? "CPUが考えています…"
          : "";
  let chosen = p.hand.find((c) => c.id === selected),
    spell = p.hand.find((c) => c.id === selectedSpell && c.kind === "spell");
  document.getElementById("playBtn").disabled =
    G.winner ||
    !isLocalTurn() ||
    !chosen ||
    !canPlay(chosen, p) ||
    effectiveCost(chosen, p) + (spell ? spell.cost : 0) > availableCost(p, spell);
  document.getElementById("passBtn").disabled = G.winner || !isLocalTurn();
  document.getElementById("spellBtn").disabled =
    G.winner || !isLocalTurn() || !selectedSpell;
  const effectDoneBtn = document.getElementById("effectDoneBtn");
  effectDoneBtn.style.display =
    G.pendingGodzilla ||
    G.pendingHulk ||
    G.pendingAruru ||
    G.pendingNeku ||
    G.pendingMadoka ||
    G.pendingGuri ||
    G.pendingGura
      ? "inline-block"
      : "none";
  document.getElementById("godzillaSkipBtn").style.display =
    G.pendingGodzilla && !G.godzillaResolved && isLocalTurn() && !G.winner
      ? "inline-block"
      : "none";
  effectDoneBtn.disabled = G.pendingAruru
    ? G.aruruSelections.length !== 2 || G.aruruResolved
    : G.pendingNeku
      ? !G.nekuSelections[activeHumanSeat()] ||
        G.nekuConfirmed[activeHumanSeat()]
      : !(G.pendingGodzilla || G.pendingHulk) ||
        !(G.godzillaResolved || G.hulkResolved);
  effectDoneBtn.textContent = G.pendingAruru
    ? "選択した2枚を確定して破壊"
    : G.pendingNeku
      ? "選択したカードを確定して破壊"
      : G.pendingHulk
        ? "ハルクの効果処理完了・次のプレイヤーへ"
        : "効果処理完了・次のプレイヤーへ";
  const neitoPanel = document.getElementById("neitoPanel");
  neitoPanel.style.display = G.pendingNeito ? "block" : "none";
  document.getElementById("restrictionTitle").textContent = G.pendingSpiderMan
    ? "スパイダーマンの効果処理"
    : "ネートの効果処理";
  document.getElementById("restrictionDescription").textContent =
    G.pendingSpiderMan
      ? "スパイダーマンの効果で数字7が自動選択されています。「効果処理」を押して確定してください。確定するまでゲームは進行しません。"
      : "禁止する数字を1〜7から1つ選び、「効果処理」ボタンを押してください。選択するまでゲームは進行しません。";
  document.getElementById("neitoNumbers").innerHTML = (
    G.pendingSpiderMan ? [7] : [1, 2, 3, 4, 5, 6, 7]
  )
    .map(
      (n) =>
        '<button type="button" data-neito-number="' +
        n +
        '" class="' +
        (String(G.neitoChoice) === String(n) ? "primary" : "") +
        '" ' +
        (G.pendingSpiderMan ? "disabled" : "") +
        ">" +
        n +
        "</button>",
    )
    .join("");
  document.getElementById("neitoDoneBtn").disabled =
    !(G.pendingNeito || G.pendingSpiderMan) || !G.neitoChoice;
  document.getElementById("playBtn").disabled =
    document.getElementById("playBtn").disabled ||
    G.pendingGodzilla ||
    G.pendingHulk ||
    G.pendingAruru ||
    G.pendingNeku ||
    G.pendingMadoka ||
    G.pendingGuri ||
    G.pendingGura ||
    G.pendingNeito ||
    G.pendingSpiderMan;
  document.getElementById("passBtn").disabled =
    document.getElementById("passBtn").disabled ||
    G.pendingGodzilla ||
    G.pendingHulk ||
    G.pendingAruru ||
    G.pendingNeku ||
    G.pendingMadoka ||
    G.pendingGuri ||
    G.pendingGura ||
    G.pendingNeito ||
    G.pendingSpiderMan ||
    !!pendingSuperMushroom;
  document.getElementById("spellBtn").disabled =
    document.getElementById("spellBtn").disabled ||
    G.pendingGodzilla ||
    G.pendingHulk ||
    G.pendingAruru ||
    G.pendingNeku ||
    G.pendingMadoka ||
    G.pendingGuri ||
    G.pendingGura ||
    G.pendingNeito ||
    G.pendingSpiderMan ||
    !!pendingSuperMushroom;
  if (pendingSuperMushroom) {
    document.getElementById("notice").textContent =
      "スーパーキノコの効果処理中です。出すフォロワーとスペル以外の手札を1枚タップして破壊してください。";
  }
  const bellAngelCanTrigger = (card) =>
    card && card.name === "ベルエンジェル" && card.kind === "follower";
  const bellAngelTargetIds = new Set();
  if (isLocalTurn() && !G.winner) {
    if (G.pendingHulk && !G.hulkResolved) {
      p.hand
        .filter((c) => bellAngelCanTrigger(c))
        .forEach((c) => bellAngelTargetIds.add(c.id));
    }
    if (G.pendingNeku) {
      p.hand
        .filter((c) => bellAngelCanTrigger(c))
        .forEach((c) => bellAngelTargetIds.add(c.id));
    }
    if (G.pendingAruru && G.aruruSelections.length < 2) {
      // アルルは同じ数字のフォロワー2枚が必要。ベルエンジェルは数字1。
      const selectedCards = G.aruruSelections
        .map((id) => p.hand.find((c) => c.id === id))
        .filter(Boolean);
      const hasNumberOne = p.hand.some(
        (c) => c.name === "ベルエンジェル" && !G.aruruSelections.includes(c.id),
      );
      const first = selectedCards[0];
      if (hasNumberOne && (!first || currentNumberLabel(first) === "1")) {
        p.hand
          .filter(
            (c) =>
              c.name === "ベルエンジェル" && !G.aruruSelections.includes(c.id),
          )
          .forEach((c) => bellAngelTargetIds.add(c.id));
      }
    }
  }
  document.querySelectorAll(".hand .card").forEach((el) => {
    el.classList.toggle(
      "selected",
      el.dataset.id === selected || el.dataset.id === selectedSpell,
    );
    const target =
      (G.pendingGodzilla &&
        !G.godzillaResolved &&
        G.players[activeHumanSeat()].hand.some(
          (c) =>
            c.id === el.dataset.id &&
            c.kind === "follower" &&
            fieldNumber(c) >= 5,
        )) ||
      (G.pendingHulk &&
        !G.hulkResolved &&
        G.players[activeHumanSeat()].hand.some(
          (c) => c.id === el.dataset.id,
        )) ||
      (G.pendingNeku &&
        !G.nekuSelections[activeHumanSeat()] &&
        G.players[activeHumanSeat()].hand.some((c) => c.id === el.dataset.id));
    el.classList.toggle("godzilla-target", !!target);
    const bellTarget = bellAngelTargetIds.has(el.dataset.id);
    el.classList.toggle("bell-angel-target", bellTarget);
    if (bellTarget)
      el.title =
        "ベルエンジェルの効果が発動する破壊対象候補です（Lフォロワーの効果を除く）。";
    else if (target)
      el.title = "ゴジラの効果で破壊できるカード：クリックして選択";
  });
  renderResultPresentation();
  placeUnifiedPickers();
  renderSunrakuPanel();
  if (onlineMode && G.winner) commitOnlineTitles();
  renderClassicPicker();
  renderDeathNote();
  renderExcelChoice();
  if(G.pendingCureLemonade && (!onlineMode || G.cureLemonadeOwner===activeHumanSeat()))showCureLemonadePicker();
  else {const el=document.getElementById('cureLemonadeModal');if(el){el.style.display='none';el.classList.remove('open');}}
  refreshActionPermissions();
  renderMatchOutcome();
  syncHomuraRewind();
  window.renderLocalTurnNotice?.();
  notifyGameChanged();
}
let selectedMadokaId = null;
let selectedMadokaIds = [];
function isChizukoNoEffectFollower(card) {
  return (
    !!card &&
    card.kind === "follower" &&
    [
      "ゴブリン",
      "リュウ",
      "カレーパンマン",
      "くちぱっち",
      "青眼の白龍",
      "封印されし者の右腕",
      "封印されし者の左腕",
      "封印されし者の右足",
      "封印されし者の左足",
    ].includes(String(card.name || "").trim())
  );
}
function showMadokaDeck() {
  if (onlineMode && (!G || !canOperateEffect(G.madokaOwner))) return;
  if (!G || !G.pendingMadoka) return;
  const p = G.players[G.madokaOwner];
  const mode = G.madokaPickMode || "madoka";
  const isRibbon = mode === "ribbon",
    isWesker = mode === "wesker",
    isGura = mode === "gura",
    isHorus = mode === "horus",
    isVibranium = mode === "vibranium",
    isChizuko = mode === "chizuko";
  const modal = document.getElementById("madokaModal");
  selectedMadokaId = null;
  selectedMadokaIds = [];
  document.getElementById("madokaTitle").textContent = isChizuko
    ? "錦木千束：山札から「効果なし」のフォロワーを最大3枚選択"
    : isRibbon
      ? "リボンちゃん：墓地から数字5・6のフォロワーを選択"
      : isWesker
        ? "ウェスカー：墓地から数字5以下の魔種族フォロワーを選択"
        : isVibranium
          ? "ヴィブラニウム：山札から数字3以下のフォロワーを選択"
          : isHorus
            ? "ホルス：山札から神種族フォロワーを選択"
            : isGura
              ? "ぐら：山札からカードを選択"
              : "鹿目まどか：山札から魔種族フォロワーを選択";
  const source = isRibbon || isWesker ? p.grave : p.deck;
  document.getElementById("madokaSummary").textContent =
    (isRibbon || isWesker ? "墓地：" : "山札：") +
    source.length +
    "枚｜" +
    (isChizuko
      ? "効果なしのフォロワーを1〜3枚選択してください。選択後「手札に加える」を押してください。"
      : isRibbon
        ? "数字5または6のフォロワーを選択してください。"
        : isWesker
          ? "数字5以下の魔種族フォロワーを1枚選択してください。"
          : "");
  document.getElementById("ribbonPickLayout").style.display =
    "block";
  document.getElementById("madokaAddBtn").textContent = "手札に加える";
  const weskerSkip = document.getElementById("weskerSkipBtn");
  if (weskerSkip) weskerSkip.style.display = isWesker ? "inline-block" : "none";
  document.getElementById("madokaList").innerHTML =
    source
      .map((c) => {
        const noEffect =
          !String(c.effect || "").trim() ||
          /^(（効果なし）|\(効果なし\)|効果なし|（なし）|なし)$/.test(
            String(c.effect || "").trim(),
          );
        const eligible =
          isGura || c.kind === "follower" &&
          (isChizuko
            ? isChizukoNoEffectFollower(c)
            : isRibbon
              ? ["5", "6"].includes(currentNumberLabel(c))
              : isWesker
                ? c.tribe === "魔種族" && fieldNumber(c) <= 5
                : isVibranium
                  ? fieldNumber(c) <= 3
                  : isHorus
                    ? c.tribe === "神種族"
                    : isGura || c.tribe === "魔種族");
        let html = cardHtml(c, false);
        html = html.replace(
          'class="card  ',
          'class="card madoka-pick-card ' +
            (eligible ? "madoka-eligible" : "madoka-ineligible") +
            " ",
        );
        html = html.replace(
          'data-id="' + c.id + '"',
          'data-id="' +
            c.id +
            '" data-madoka-id="' +
            c.id +
            '" role="button" tabindex="0" onclick="selectMadokaDeckCard(\'' +
            c.id +
            "')\" " +
            (eligible
              ? 'title="クリックして選択"'
              : 'aria-disabled="true" title="選択不可"'),
        );
        return html;
      })
      .join("") ||
    '<div class="grave-empty">' +
      (isRibbon ? "墓地にカードがありません。" : "山札がありません。") +
      "</div>";
  document.getElementById("ribbonDetail").innerHTML =
    '<div class="muted"></div>';
  document.getElementById("madokaAddBtn").disabled = true;
  modal.hidden = false;
  modal.style.display = "flex";
  modal.style.visibility = "visible";
  modal.style.pointerEvents = "auto";
  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
}
function selectMadokaDeckCard(id) {
  if (onlineMode && (!G || !canOperateEffect(G.madokaOwner))) return;
  if (!G || !G.pendingMadoka) return;
  const p = G.players[G.madokaOwner],
    mode = G.madokaPickMode || "madoka",
    isRibbon = mode === "ribbon",
    isWesker = mode === "wesker",
    isChizuko = mode === "chizuko",
    source = isRibbon || isWesker ? p.grave : p.deck,
    c = source.find((x) => x.id === id);
  if (!c) return;
  const noEffect =
    !String(c.effect || "").trim() ||
    /^(（効果なし）|\(効果なし\)|効果なし|（なし）|なし)$/.test(
      String(c.effect || "").trim(),
    );
  const eligible =
    mode === "gura" || c.kind === "follower" &&
    (isChizuko
      ? isChizukoNoEffectFollower(c)
      : isRibbon
        ? ["5", "6"].includes(currentNumberLabel(c))
        : isWesker
          ? c.tribe === "魔種族" && fieldNumber(c) <= 5
          : mode === "vibranium"
            ? fieldNumber(c) <= 3
            : mode === "gura" ||
              (mode === "horus" ? c.tribe === "神種族" : c.tribe === "魔種族"));
  if (eligible && isChizuko) {
    if (selectedMadokaIds.includes(id))
      selectedMadokaIds = selectedMadokaIds.filter((x) => x !== id);
    else if (selectedMadokaIds.length < 3) selectedMadokaIds.push(id);
    selectedMadokaId = selectedMadokaIds[0] || null;
    document
      .querySelectorAll("#madokaList [data-madoka-id]")
      .forEach((el) =>
        el.classList.toggle(
          "madoka-selected",
          selectedMadokaIds.includes(el.dataset.madokaId),
        ),
      );
    document.getElementById("madokaAddBtn").disabled =
      selectedMadokaIds.length === 0;
    document.getElementById("madokaSummary").textContent =
      "選択中：" + selectedMadokaIds.length + " / 3枚｜「手札に加える」で確定";
  } else if (eligible) {
    selectedMadokaId = id;
    document
      .querySelectorAll("#madokaList [data-madoka-id]")
      .forEach((el) =>
        el.classList.toggle("madoka-selected", el.dataset.madokaId === id),
      );
    document.getElementById("madokaAddBtn").disabled = false;
    document.getElementById("madokaSummary").textContent =
      "選択中：" + c.name + "｜「手札に加える」を押してください。";
  }
  if (isRibbon || isWesker) {
    document.getElementById("ribbonDetail").innerHTML =
      cardHtml(c, false) +
      '<div class="ribbon-detail-info"><strong>' +
      escapeHtml(c.name) +
      "</strong><p>数字：" +
      escapeHtml(currentNumberLabel(c)) +
      "｜コスト：" +
      escapeHtml(String(c.cost)) +
      "</p><p>種族：" +
      escapeHtml(c.tribe || "種族なし") +
      "<br>BP：" +
      Number(c.bp || 0).toLocaleString() +
      "</p><p><strong>効果テキスト</strong><br>" +
      escapeHtml(c.effect || "効果なし") +
      "</p></div>";
  }
}
function skipWeskerPick() {
  if (onlineMode && (!G || !canOperateEffect(G.madokaOwner))) return;
  if (!G || !G.pendingMadoka || G.madokaPickMode !== "wesker") return;
  const pi = G.madokaOwner;
  G.pendingMadoka = false;
  G.madokaOwner = null;
  G.madokaPickMode = "madoka";
  selectedMadokaId = null;
  selectedMadokaIds = [];
  const modal = document.getElementById("madokaModal");
  modal.classList.remove("open");
  modal.hidden = true;
  modal.style.display = "none";
  modal.style.visibility = "hidden";
  modal.style.pointerEvents = "none";
  modal.setAttribute("aria-hidden", "true");
  closeCardZoom();
  selected = null;
  selectedSpell = null;
  log(
    "ウェスカーのファンファーレ：墓地からフォロワーを手札に加えないことを選択しました。",
  );
  checkWinner();
  render();
  if (!G.winner) afterAction(pi);
}
function confirmMadokaPick() {
  if (G && G.madokaPickMode === "chizuko") {
    if (!selectedMadokaIds.length) return;
    resolveMadokaPick(selectedMadokaIds.slice());
    return;
  }
  if (!selectedMadokaId) return;
  resolveMadokaPick(selectedMadokaId);
}
function resolveMadokaPick(id) {
  if(G?.pendingMadoka && !G.effectResultContext)startEffectResults(G.madokaOwner,({vibranium:"ヴィブラニウム",wesker:"ウェスカー",ribbon:"リボンちゃん",chizuko:"錦木千束",horus:"ホルス",gura:"ぐら"})[G.madokaPickMode]||"鹿目まどか");
  if (onlineMode && (!G || !canOperateEffect(G.madokaOwner))) return;
  if (!G || !G.pendingMadoka) return;
  const pi = G.madokaOwner,
    p = G.players[pi],
    mode = G.madokaPickMode || "madoka",
    isRibbon = mode === "ribbon",
    isWesker = mode === "wesker",
    isGura = mode === "gura",
    isHorus = mode === "horus",
    isVibranium = mode === "vibranium",
    isChizuko = mode === "chizuko",
    source = isRibbon || isWesker ? p.grave : p.deck;
  if (isChizuko) {
    const ids = Array.isArray(id) ? id : [id];
    const unique = [...new Set(ids)].slice(0, 3);
    const chosen = unique
      .map((x) => source.find((c) => c.id === x))
      .filter((c) => isChizukoNoEffectFollower(c));
    if (!chosen.length) return;
    chosen.forEach((c) => {
      c.chizukoTitleMarked = true;
      const ix = source.findIndex((x) => x.id === c.id);
      if (ix >= 0) {
        source.splice(ix, 1);
        p.hand.push(c);
      }
    });
    p.deck = shuffle(p.deck);
    G.pendingMadoka = false;
    G.madokaOwner = null;
    G.madokaPickMode = "madoka";
    selectedMadokaId = null;
    selectedMadokaIds = [];
    const pickModal = document.getElementById("madokaModal");
    pickModal.classList.remove("open");
    pickModal.hidden = true;
    pickModal.style.display = "none";
    pickModal.style.visibility = "hidden";
    pickModal.style.pointerEvents = "none";
    pickModal.setAttribute("aria-hidden", "true");
    closeCardZoom();
    selected = null;
    selectedSpell = null;
    log(
      "錦木千束のファンファーレ：山札から「効果なし」のフォロワー" +
        chosen.length +
        "枚（" +
        chosen.map((c) => "「" + c.name + "」").join("、") +
        "）を手札に加え、その後山札をシャッフルしました。",
    );
    checkWinner();
    render();
    if (!G.winner) afterAction(pi);
    return;
  }
  const ix = source.findIndex((c) => c.id === id);
  if (ix < 0) return;
  const c = source[ix];
  if (
    (!isGura && c.kind !== "follower") ||
    (isRibbon
      ? !["5", "6"].includes(currentNumberLabel(c))
      : isWesker
        ? c.tribe !== "魔種族" || fieldNumber(c) > 5
        : isVibranium
          ? fieldNumber(c) > 3
          : isHorus
            ? c.tribe !== "神種族"
            : !isGura && c.tribe !== "魔種族")
  )
    return;
  source.splice(ix, 1);
  p.hand.push(c);
  if(isWesker) { addTitleProgress(pi,"wesker_recover"); recordFollowerEffect(pi,"ウェスカー"); }
  if (pi >= 0 && isHorus && c.name === "碇ゲンドウ" && G.titleMatchProgress)
    addTitleProgress(pi, "horus_gendo");
  if (!isRibbon && !isWesker) p.deck = shuffle(p.deck);
  G.pendingMadoka = false;
  G.madokaOwner = null;
  G.madokaPickMode = "madoka";
  selectedMadokaId = null;
  selectedMadokaIds = [];
  const pickModal = document.getElementById("madokaModal");
  pickModal.classList.remove("open");
  pickModal.hidden = true;
  pickModal.style.display = "none";
  pickModal.style.visibility = "hidden";
  pickModal.style.pointerEvents = "none";
  pickModal.setAttribute("aria-hidden", "true");
  closeCardZoom();
  if (isVibranium) {
    collectEffectResults();G.effectResultContext=null;
    const pending = G.pendingVibranium;
    G.pendingVibranium = null;
    log(
      "ヴィブラニウムの効果：山札から数字" +
        c.number +
        "のフォロワー「" +
        c.name +
        "」を相手に見せて手札に加え、その後山札をシャッフルしました。",
    );
    selected = null;
    selectedSpell = null;
    const idx = p.hand.findIndex((x) => x.id === pending.followerId);
    if (idx >= 0 && doPlay(pi, idx, pending.spellId)) {
      render();
      if (!G.winner) afterAction(pi);
    } else {
      render();
      document.getElementById("notice").textContent =
        "ヴィブラニウムの効果は解決しましたが、フォロワーを出せませんでした。";
    }
    return;
  }
  selected = null;
  selectedSpell = null;
  log(
    isRibbon
      ? "リボンちゃんのファンファーレ：墓地から数字" +
          c.number +
          "のフォロワー「" +
          c.name +
          "」を手札に加えました。"
      : isWesker
        ? "ウェスカーのファンファーレ：墓地から数字" +
          c.number +
          "の魔種族フォロワー「" +
          c.name +
          "」を手札に加えました。"
        : isHorus
          ? "ホルスのファンファーレ：山札から神種族フォロワー「" +
            c.name +
            "」を手札に加え、その後山札をシャッフルしました。"
          : isGura
            ? "ぐらのファンファーレ：山札からカード「" +
              c.name +
              "」を手札に加え、その後山札をシャッフルしました。"
            : "鹿目まどかのファンファーレ：山札から魔種族フォロワー「" +
              c.name +
              "」を手札に加えました。その後、山札をシャッフルしました。",
  );
  checkWinner();
  render();
  if (!G.winner) afterAction(pi);
}
function sortHandByNumber() {
  if (!G || !G.players || !G.players[activeHumanSeat()]) return;
  const hand = G.players[activeHumanSeat()].hand;
  const rank = (c) => {
    if (c.kind === "spell" || c.number === "S") return 9;
    if (currentNumberLabel(c).toUpperCase() === "L") return 8;
    const n = fieldNumber(c);
    return Number.isFinite(n) ? n : 10;
  };
  hand.sort((a, b) => rank(a) - rank(b));
  render();
  document.getElementById("notice").textContent =
    "手札を数字の低い順に並べ替えました。";
}
function cardHtml(c, hand, zoomable = false) {
  const game = G || {
    players: [],
    field: [],
    gabrielBuffOwner: null,
    newWordBuffOwner: null,
    makimaActive: false,
  };
  const emptyOwner = { hand: [], grave: [], deck: [] };
  const fieldEntry = game.field.find((x) => x.card.id === c.id);
  const owner = hand
    ? game.players[activeHumanSeat()] || emptyOwner
    : fieldEntry
      ? game.players[fieldEntry.player] || emptyOwner
      : game.players[activeHumanSeat()] || emptyOwner;
  const freeRoxas =
    c.name === "ロクサス" && owner.grave.some((x) => x.name === "ソラ");
  const freeGenesis =
    c.name === "ジェネシスドラゴン" && owner.deck.length === 0;
  const freeButtercup =
    c.name === "バターカップ" &&
    hand &&
    game.field.filter((x) => x.card && x.card.kind === "follower").length >= 2;
  const freeCost = freeRoxas || freeGenesis || freeButtercup;
  const shownCost = freeCost ? 0 : Number(c.cost);
  const arceusReduced = !!c.arceusDiscount && c.kind === "follower" && Number(c.cost) < Number(DATA.catalog.find(x=>x.name===c.name)?.cost ?? c.cost);
  const guriTarget = !!(
    hand &&
    ((game.pendingGuri && c.name === "ぐら") ||
      (game.pendingGura && c.name === "ぐり"))
  );
  const blocked = !!(
    hand &&
    game.forbiddenNumber !== null &&
    c.kind === "follower" &&
    currentNumberLabel(c) === String(game.forbiddenNumber)
  );
  const effectSelection = !!(
    hand &&
    (game.pendingGodzilla ||
      game.pendingHulk ||
      game.pendingAruru ||
      game.pendingNeku)
  );
  const selectableForEffect = !!(
    effectSelection &&
    (game.pendingHulk ||
      game.pendingNeku ||
      (game.pendingGodzilla &&
        c.kind === "follower" &&
        fieldNumber(c) >= 5) ||
      (game.pendingAruru &&
        c.kind === "follower" &&
        !game.aruruSelections.includes(c.id) &&
        (!game.aruruSelections.length ||
          game.players[activeHumanSeat()].hand.some(
            (x) => x.id === game.aruruSelections[0] && currentNumberLabel(x) === currentNumberLabel(c),
          ))))
  );
  const unplayable = !!(
    hand &&
    c.kind === "follower" &&
    !(
      game.players[activeHumanSeat()] &&
      canPlay(c, game.players[activeHumanSeat()])
    ) &&
    !selectableForEffect
  );
  const soraActive =
    c.name === "ソラ" &&
    (game.players.some((p) => p.hand.some((x) => x.id === c.id)) ||
      game.field.some((x) => x.card.id === c.id));
  const changedSora = soraActive && fieldNumber(c) !== Number(c.number);
  const surtActive =
    c.name === "スルト" &&
    (game.players.some((p) => p.hand.some((x) => x.id === c.id)) ||
      game.field.some((x) => x.card.id === c.id));
  const changedSurt = surtActive && fieldNumber(c) !== Number(c.number);
  const changedBigLight =
    !!c.bigLightBoost && fieldNumber(c) !== Number(c.number);
  const doubleOnField =
    c.name === "仮面ライダーダブル" &&
    game.field.some((x) => x.card.id === c.id);
  const gabrielChanged =
    game.gabrielBuffOwner !== null &&
    c.kind === "follower" &&
    c.number !== "L" &&
    (game.players[game.gabrielBuffOwner]?.hand.some((x) => x.id === c.id) ||
      game.field.some(
        (x) => x.card.id === c.id && x.player === game.gabrielBuffOwner,
      )) &&
    fieldNumber(c) !== Number(c.number);
  const newWordChanged =
    game.newWordBuffOwner !== null &&
    c.kind === "follower" &&
    c.number !== "L" &&
    (game.players[game.newWordBuffOwner]?.hand.some((x) => x.id === c.id) ||
      game.field.some(
        (x) => x.card.id === c.id && x.player === game.newWordBuffOwner,
      )) &&
    fieldNumber(c) !== Number(c.number);
  const makimaChanged =
    game.makimaActive &&
    c.kind === "follower" &&
    c.number !== "L" &&
    (c.tribe === "英種族" || c.tribe === "魔種族") &&
    fieldNumber(c) !== Number(c.number);
  const negativeMakima =
    makimaChanged && c.tribe === "魔種族" && fieldNumber(c) < Number(c.number);
  const zomaChanged = !!c.zomaBonus && c.kind === 'follower' && c.number !== 'L';
  const zomaUp = zomaChanged && fieldNumber(c) > Number(c.number);
  const zomaDown = zomaChanged && fieldNumber(c) < Number(c.number);
  const numberOverride=activeNumberChange(c);
  const doomColor=numberOverride?.source==='ドクタードゥーム';
  const originalNumber=Number(c.sunrakuOriginalNumber || c.number);
  const overrideUp=numberOverride && fieldNumber(c)>originalNumber;
  const overrideDown=numberOverride && fieldNumber(c)<originalNumber;
  const shownNumber = c.kind === "spell" ? "術" : c.number === "L" ? "L" : fieldNumber(c);
  const avaDecorated = !!(c.avaBlessedByAva && fieldEntry);
  const click = hand
    ? "onclick=\"selectCard('" + c.id + "')\""
    : zoomable
      ? "onclick=\"openCardZoomById('" + c.id + "')\""
      : "";
  return `<div class="card ${avaDecorated ? "ava-blessing" : ""} ${overrideUp || (!numberOverride && (zomaUp || changedSora || changedSurt || changedBigLight || doubleOnField || gabrielChanged || newWordChanged || !!c.sunrakuBoost || (makimaChanged && !negativeMakima))) ? "sora-number-changed" : ""} ${overrideDown || (!numberOverride && (zomaDown || negativeMakima)) ? "makima-negative-number" : ""} ${c.bp > (DATA.catalog.find(x=>x.name===c.name)?.bp ?? c.bp) ? "demon-drug-boost" : ""} ${guriTarget ? "guri-target-glow" : ""} ${hand && selected === c.id ? "selected" : ""} ${blocked ? "neito-blocked" : ""} ${unplayable ? "unplayable" : ""}" data-num="${doomColor ? "4" : c.kind === "spell" ? "S" : c.sunrakuBoost && c.sunrakuOriginalNumber ? c.sunrakuOriginalNumber : c.number}" data-id="${c.id}" ${click} title="${blocked ? "効果によりプレイ不可。場が流れるまで禁止。 " : ""}${escapeHtml(c.effect)}"><span class="cost ${freeCost || arceusReduced ? "roxas-free" : ""}" data-cost="${shownCost}" title="${freeRoxas ? "墓地にソラがあるためコスト0" : freeGenesis ? "山札が0枚のためコスト0" : freeButtercup ? "場にフォロワーが2枚以上あるためコスト0" : arceusReduced ? "アルセウスの効果でコスト−1" : ""}">${shownCost}</span><div class="num">${shownNumber}</div><div class="name">${escapeHtml(c.name)}</div><div class="meta">${c.kind === "spell" ? "スペル" : c.tribe ? escapeHtml(c.tribe) : "種族なし"}</div><div class="meta bp-meta">${c.number === "S" ? "スペル" : "BP " + c.bp.toLocaleString()}</div><div class="effect">${escapeHtml(c.effect || "効果なし")}</div>${c.kind === "follower" ? tribeIconHtml(c.tribe) : ""}</div>`;
}
function openCardZoom(card) {
  if (!card) return;
  const modal = document.getElementById("cardZoomModal");
  const dialog = document.getElementById("cardZoomDialog");
  if (!modal || !dialog) return;
  /* iPhone Safari: deckOverlayの内側に残すと重なり順やスクロールで隠れるため、必ずbody直下に移す */ if (
    modal.parentElement !== document.body
  )
    document.body.appendChild(modal);
  const isHandCard = !!(
    G &&
    G.players &&
    G.players.some((p) => p.hand.some((c) => c.id === card.id))
  );
  dialog.innerHTML =
    cardHtml(card, false) +
    '<div class="card-zoom-info"><strong>' +
    escapeHtml(card.name) +
    "</strong><p>数字：" +
    escapeHtml(card.number === "S" ? "スペル" : card.number) +
    "｜コスト：" +
    escapeHtml(String(card.cost)) +
    "</p><p>" +
    (card.kind === "follower"
      ? "種族：" +
        escapeHtml(card.tribe || "種族なし") +
        "<br>BP：" +
        Number(card.bp || 0).toLocaleString()
      : "種類：スペル") +
    "</p><p><strong>効果テキスト</strong><br>" +
    escapeHtml(card.effect || "効果なし") +
    "</p>" +
    (isHandCard &&
    G.players[activeHumanSeat()].hand.some((c) => c.id === card.id)
      ? '<button type="button" class="zoom-play-card" onclick="closeCardZoom();selectCard(\'' +
        card.id +
        "')\">このカードを選択／プレイ</button>"
      : "") +
    "</div>";
  modal.style.setProperty("display", "flex", "important");
  modal.style.setProperty("position", "fixed", "important");
  modal.style.setProperty("inset", "0", "important");
  modal.style.setProperty("z-index", "99999", "important");
  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
  document.body.classList.add("card-zoom-open");
}
function openCardZoomById(id) {
  if (!G) return;
  let card = G.field.map((x) => x.card).find((c) => c.id === id);
  if (!card)
    for (const p of G.players) {
      card =
        p.hand.find((c) => c.id === id) || p.grave.find((c) => c.id === id);
      if (card) break;
    }
  if (card) openCardZoom(card);
}
function openCardZoomByCatalogName(name) {
  const card = DATA.catalog.find((c) => c.name === name);
  if (card) openCardZoom(card);
}
function closeCardZoom() {
  const modal = document.getElementById("cardZoomModal");
  if (!modal) return;
  modal.classList.remove("open");
  modal.style.removeProperty("display");
  modal.style.removeProperty("position");
  modal.style.removeProperty("inset");
  modal.style.removeProperty("z-index");
  modal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("card-zoom-open");
}
function escapeHtml(s) {
  return String(s).replace(
    /[&<>"']/g,
    (x) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        x
      ],
  );
}
function selectCard(id) {
  // Browsing an owned card never changes the opponent's turn or effect selection.
  if(G && !G.initialLeadPending && !isLocalTurn() && !G.pendingNeku){
    const ownCard=G.players[activeHumanSeat()]?.hand.find(c=>c.id===id);
    if(ownCard)openCardZoom(ownCard);
    return;
  }

  if (
    !G ||
    G.initialLeadPending ||
    (onlineMode &&
      (locked ||
        window.DAISHUGO_ONLINE_ADAPTER?.busy ||
        (!isLocalTurn() && !G.pendingNeku)))
  )
    return;
  if (sunrakuState && sunrakuState.mode === "pick") {
    const p = G.players[activeHumanSeat()],
      c = p.hand.find((x) => x.id === id);
    if (!c || c.kind !== "follower" || c.id === sunrakuState.cardId) {
      document.getElementById("notice").textContent =
        "サンラク以外のフォロワーを選択してください。";
      return;
    }
    const at = sunrakuState.selected.indexOf(id);
    if (at >= 0) sunrakuState.selected.splice(at, 1);
    else if (sunrakuState.selected.length < 3) sunrakuState.selected.push(id);
    render();
    return;
  }
  if (sunrakuState) {
    document.getElementById("notice").textContent =
      "サンラクの効果処理中です。";
    return;
  }
  if (G.pendingMadoka) return;
  if ((!isLocalTurn() && !G.pendingNeku && !G.pendingAruru) || G.winner) return;
  let p = G.players[activeHumanSeat()],
    c = p.hand.find((x) => x.id === id);
  if (!c) return;
  if (pendingSuperMushroom) {
    if (
      c.id === pendingSuperMushroom.followerId ||
      c.id === pendingSuperMushroom.spellId
    ) {
      document.getElementById("notice").textContent =
        "スーパーキノコでは、出すフォロワーと使用スペル以外の手札を選んでください。";
      return;
    }
    const state = pendingSuperMushroom;
    startEffectResults(activeHumanSeat(),"スーパーキノコ");
    destroyHandCard(p, c, "スーパーキノコ", "S");
    log("スーパーキノコの効果：手札から「" + c.name + "」を破壊しました。");
    pendingSuperMushroom = null;
    collectEffectResults();G.effectResultContext=null;
    const fi = p.hand.findIndex((x) => x.id === state.followerId),
      si = p.hand.findIndex((x) => x.id === state.spellId);
    if (fi < 0 || si < 0) {
      selected = null;
      selectedSpell = null;
      render();
      document.getElementById("notice").textContent =
        "選択対象が見つからないため、フォロワーのプレイを中止しました。";
      return;
    }
    doPlay(activeHumanSeat(), fi, state.spellId);
    selected = null;
    selectedSpell = null;
    if (
      G.pendingGodzilla ||
      G.pendingHulk ||
      G.pendingAruru ||
      G.pendingNeku ||
      G.pendingMadoka ||
      G.pendingGuri ||
      G.pendingGura ||
      G.pendingNeito ||
      G.pendingSpiderMan
    ) {
      render();
      return;
    }
    checkWinner();
    render();
    if (!G.winner) afterAction(activeHumanSeat());
    return;
  }
  if (
    G.forbiddenNumber !== null &&
    c.kind === "follower" &&
    currentNumberLabel(c) === String(G.forbiddenNumber) &&
    !(
      G.pendingHulk ||
      G.pendingAruru ||
      G.pendingNeku ||
      G.pendingGodzilla ||
      G.pendingGuri ||
      G.pendingGura
    )
  ) {
    document.getElementById("notice").textContent =
      "効果により「" +
      G.forbiddenNumber +
      "」のフォロワーは、場が流れるまで手札から場に出せません。ただし、効果の対象として選び破壊することはできます。";
    return;
  }
  if (G.pendingGuri) {
    if (c.name !== "ぐら") {
      document.getElementById("notice").textContent =
        "赤く光っている「ぐら」を選択してください。";
      return;
    }
    destroyHandCard(p, c, "ぐり", "5");
    const drawn = drawCards(p, 3);
    G.pendingGuri = false;
    selected = null;
    selectedSpell = null;
    log(
      "ぐりのファンファーレ：手札の「ぐら」を破壊し、山札からカードを" +
        drawn +
        "枚引きました。",
    );
    checkWinner();
    render();
    if (!G.winner) afterAction(activeHumanSeat());
    return;
  }
  if (G.pendingGura) {
    if (c.name !== "ぐり") {
      document.getElementById("notice").textContent =
        "赤く光っている「ぐり」を選択してください。";
      return;
    }
    destroyHandCard(p, c, "ぐら", "2");
    G.pendingGura = false;
    const eligible = p.deck;
    if (!eligible.length) {
      log(
        "ぐらのファンファーレ：手札の「ぐり」を破壊しましたが、山札にカードがないためカードを加えられません。",
      );
      selected = null;
      selectedSpell = null;
      checkWinner();
      render();
      if (!G.winner) afterAction(activeHumanSeat());
      return;
    }
    G.pendingMadoka = true;
    G.madokaPickMode = "gura";
    G.madokaOwner = activeHumanSeat();
    selected = null;
    selectedSpell = null;
    showMadokaDeck();
    log(
      "ぐらのファンファーレ：手札の「ぐり」を破壊しました。山札から好きなカードを1枚選んでください。",
    );
    render();
    return;
  }
  if (G.pendingAruru) {
    if (c.kind !== "follower") {
      document.getElementById("notice").textContent =
        "アルルではフォロワーを2枚選んでください。";
      return;
    }
    if (G.aruruSelections.includes(id)) {
      G.aruruSelections = G.aruruSelections.filter((x) => x !== id);
    } else if (G.aruruSelections.length === 0) {
      G.aruruSelections = [id];
    } else {
      const first = p.hand.find((x) => x.id === G.aruruSelections[0]);
      if (first && currentNumberLabel(first) === currentNumberLabel(c) && G.aruruSelections.length < 2)
        G.aruruSelections.push(id);
      else {
        document.getElementById("notice").textContent =
          "最初に選んだカードと同じ数字のフォロワーを選んでください。";
        return;
      }
    }
    selected = G.aruruSelections[G.aruruSelections.length - 1] || null;
    selectedSpell = null;
    log("アルルの効果：" + G.aruruSelections.length + "枚選択中。");
    render();
    return;
  }
  if (G.pendingNeku) {
    G.nekuSelections[activeHumanSeat()] = id;
    selected = id;
    selectedSpell = null;
    log(
      "ネクの効果：あなたは「" +
        c.name +
        "」を破壊対象に選びました。確認ボタンを押すまで破壊されません。",
    );
    render();
    return;
  }
  if (G.pendingHulk && !G.hulkResolved) {
    destroyHandCard(p, c, "ハルク", "4");
    G.hulkResolved = true;
    selected = null;
    selectedSpell = null;
    log(
      "ハルクのファンファーレ：手札から「" +
        c.name +
        "」を選択して破壊しました。",
    );
    log(
      "効果処理が完了したら「ハルクの効果処理完了・次のプレイヤーへ」を押してください。",
    );
    render();
    return;
  }
  if (G.pendingGodzilla && !G.godzillaResolved) {
    if (c.kind !== "follower" || fieldNumber(c) < 5) {
      document.getElementById("notice").textContent =
        "黄色く光っているフォロワーを選んでください。";
      return;
    }
    destroyHandCard(p, c, "ゴジラ", "7");
    G.godzillaResolved = true;
    selected = null;
    selectedSpell = null;
    log(
      "ゴジラのファンファーレ：手札の「" +
        c.name +
        "」（数字" +
        c.number +
        "）を選択して破壊しました。",
    );
    log(
      "効果処理が完了したら「効果処理完了・次のプレイヤーへ」を押してください。",
    );
    render();
    return;
  }
  if (c.kind === "spell") {
    selectedSpell = selectedSpell === id ? null : id;
  } else {
    selected = selected === id ? null : id;
  }
  document.getElementById("notice").textContent =
    c.name +
    (c.kind === "spell"
      ? "をスペルとして選択（効果なし）"
      : "をフォロワーとして選択");
  render();
}
function playCard() {
  if (
    onlineMode &&
    (locked || G?.initialLeadPending || window.DAISHUGO_ONLINE_ADAPTER?.busy)
  )
    return;
  if (!G || G.winner || G.pendingExcelChoice) return;
  if (sunrakuState) {
    document.getElementById("notice").textContent =
      "サンラクの効果処理中です。選択を完了してください。";
    return;
  }
  if (!G || G.winner) return;
  if (G.pendingAruru || G.pendingNeku) {
    document.getElementById("notice").textContent =
      "ネク／アルルの効果処理中です。効果処理が完了するまでカードを場に出せません。";
    return;
  }
  if (!selected || !isLocalTurn()) return;
  let p = G.players[activeHumanSeat()],
    idx = p.hand.findIndex((c) => c.id === selected),
    c = p.hand[idx],
    spell = selectedSpell ? p.hand.find((x) => x.id === selectedSpell) : null;
  let total = effectiveCost(c, p) + (spell ? spell.cost : 0);
  if (spell && spell.name === "ヴィブラニウム") {
    if (total > availableCost(p, spell)) {
      document.getElementById("notice").textContent =
        "合計コストが足りません。";
      return;
    }
    const eligible = p.deck.some(
      (x) => x.kind === "follower" && fieldNumber(x) <= 3,
    );
    if (!eligible) {
      document.getElementById("notice").textContent =
        "山札に数字3以下のフォロワーがいないため、ヴィブラニウムを使用できません。";
      return;
    }
    G.pendingVibranium = { followerId: c.id, spellId: spell.id };
    G.pendingMadoka = true;
    G.madokaPickMode = "vibranium";
    G.madokaOwner = activeHumanSeat();
    selected = null;
    selectedSpell = null;
    showMadokaDeck();
    render();
    document.getElementById("notice").textContent =
      "ヴィブラニウムの効果：山札から数字3以下のフォロワーを選び、相手に見せて手札に加えてください。選択後、山札をシャッフルしてフォロワーを場に出します。";
    log(
      "ヴィブラニウムをフォロワーと同時使用。山札から数字3以下のフォロワーを選択してください。",
    );
    return;
  }
  if (spell && spell.name === "スーパーキノコ" && p.hand.length - 1 >= 3) {
    if (total > availableCost(p, spell)) {
      document.getElementById("notice").textContent =
        "合計コストが足りません。";
      return;
    }
    pendingSuperMushroom = { followerId: c.id, spellId: spell.id };
    selected = null;
    selectedSpell = null;
    render();
    document.getElementById("notice").textContent =
      "スーパーキノコの効果処理：出すフォロワーとスペル以外の手札を1枚選んで破壊してください。効果解決後にフォロワーを場に出します。";
    log(
      "スーパーキノコをフォロワーと同時使用。先に効果を処理します。手札から破壊するカードを選んでください。",
    );
    return;
  }
  if (c.name === "サンラク") {
    if (total > availableCost(p, spell)) {
      document.getElementById("notice").textContent =
        "合計コストが足りません。";
      return;
    }
    sunrakuState = {
      cardId: c.id,
      spellId: spell ? spell.id : null,
      mode: "choice",
      selected: [],
    };
    selected = null;
    selectedSpell = null;
    render();
    document.getElementById("notice").textContent =
      "サンラクを出す前に、手札のフォロワー3枚を山札に戻すか選択してください。";
    return;
  }
  const bigLightPreview = !!(
    spell &&
    spell.name === "ビッグライト" &&
    c.kind === "follower" &&
    c.number !== "L"
  );
  if (bigLightPreview) c.bigLightBoost = true;
  if (!canPlay(c, p, spell) || total > availableCost(p, spell)) {
    if (bigLightPreview) delete c.bigLightBoost;
    document.getElementById("notice").textContent =
      "強さ条件または合計コストが足りません。";
    return;
  }
  doPlay(activeHumanSeat(), idx, spell ? spell.id : null);
  selected = null;
  selectedSpell = null;
  if (locked) {
    render();
    return;
  }
  if (
    G.pendingGodzilla ||
    G.pendingHulk ||
    G.pendingAruru ||
    G.pendingNeku ||
    G.pendingMadoka ||
    G.pendingGuri ||
    G.pendingGura ||
    G.pendingNeito ||
    G.pendingSpiderMan
  ) {
    render();
    return;
  }
  afterAction(activeHumanSeat());
}
let activeGameBgm = 0;
let gameBgmEnabled = true;
// iOS/SafariではHTMLAudioElement.volumeの変更が反映されないため、Web AudioのGainNodeで音量を調整する。
let gameBgmAudioContext = null;
const gameBgmGainNodes = {};
const mobileBgmMultiplier = (/iPhone|iPad|iPod|Android|Mobile/i.test(navigator.userAgent) || (/Macintosh/i.test(navigator.userAgent) && navigator.maxTouchPoints > 1)) ? 0.5 : 1;
// iOS Safari ignores HTMLAudioElement.volume; GainNode is necessary for character BGM.
let characterBgmAudioContext=null;
const characterBgmSources=new WeakMap();
function applyCharacterBgmMobileVolume(audio,base=0.7){
  // Keep native streaming audible even if Web Audio is suspended or unavailable.
  audio.volume=base*mobileBgmMultiplier;
  window.DAISHUGO_AUDIO?.setGain(audio,base*mobileBgmMultiplier);
}
function applyGameBgmVolume(audio, id) {
  stabilizeBgmPlayback(audio);
  window.DAISHUGO_AUDIO?.setGain(audio,(onlineMode?0.2*Math.pow(10,(id==="gameBgm2"?5.63:4.60)/20):0.2)*mobileBgmMultiplier);
  // Solo tracks use the media element directly to avoid shared AudioContext resampling.
  if(!onlineMode){audio.volume=0.2*mobileBgmMultiplier;return null;}
  const loudnessMatch = onlineMode ? (id === "gameBgm2" ? Math.pow(10, 5.63/20) : Math.pow(10, 4.60/20)) : 1;
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
      audio.volume = 0.04 * loudnessMatch * mobileBgmMultiplier;
      return null;
    }
    if (!gameBgmAudioContext) gameBgmAudioContext = (window.DAISHUGO_AUDIO?.context() || new AudioContextClass());
    if (!gameBgmGainNodes[id]) {
      const source = gameBgmAudioContext.createMediaElementSource(audio);
      const gain = gameBgmAudioContext.createGain();
      gain.gain.value = 0.2 * loudnessMatch * mobileBgmMultiplier;
      source.connect(gain);
      gain.connect(gameBgmAudioContext.destination);
      gameBgmGainNodes[id] = gain;
    }
    // GainNode側で元音量の20%にする。要素側は1にしてiOSのvolume制限を回避。
    audio.volume = 1;
    return gameBgmAudioContext;
  } catch (e) {
    // Web Audioが利用できない環境では従来のHTMLAudio音量設定にフォールバック。
    try {
      audio.volume = 0.04 * loudnessMatch * mobileBgmMultiplier;
    } catch (ignore) {}
    return null;
  }
}
function stopGameBgms() {
  cancelZomaBgm();
  ["gameBgm1", "gameBgm2"].forEach((id) => {
    const a = document.getElementById(id);
    if (a) {
      a.pause();
      try {
        a.currentTime = 0;
      } catch (e) {}
    }
  });
  activeGameBgm = 0;
}
function playGameBgm(which) {
  if(zomaBgmSession)return;
  if (!gameBgmEnabled) {
    stopGameBgms();
    return;
  }
  const id = which === 2 ? "gameBgm2" : "gameBgm1";
  if (activeGameBgm === which) {
    const current = document.getElementById(id);
    if(current)stabilizeBgmPlayback(current);
    if (current && !current.paused) return;
  }
  ["gameBgm1", "gameBgm2"].forEach((otherId) => {
    const a = document.getElementById(otherId);
    if (a && otherId !== id) {
      a.pause();
      try {
        a.currentTime = 0;
      } catch (e) {}
    }
  });
  const audio = document.getElementById(id);
  if (!audio) return;
  const context = applyGameBgmVolume(audio, id);
  audio.loop = true;
  activeGameBgm = which;
  if (context && context.state === "suspended") {
    context.resume().catch(() => {});
  }
  const result = audio.play();
  if (result && typeof result.catch === "function") result.catch(() => {});
}
function syncGameBgmToDecks() {
  if(G?.winner){stopGameBgms();return;}
  if(zomaBgmSession){ if(!G || G.winner)cancelZomaBgm(); else return; }
  if (onlineMode) {
    if (!G || !gameBgmEnabled || G.winner) { if(activeGameBgm)stopGameBgms(); return; }
    if (!G.players?.length) return;
    const which=G.players.some(p=>Array.isArray(p.deck)&&p.deck.length===0)?2:activeGameBgm===2?2:1;
    playGameBgm(which);
    return;
  }
  if (!gameBgmEnabled || !G || !Array.isArray(G.players) || !G.players.length)
    return;
  if (G.players.some((p) => Array.isArray(p.deck) && p.deck.length === 0)) {
    if (activeGameBgm !== 2) playGameBgm(2);
  }
}
function drawCards(p, count) {
  let drawn = 0;
  for (let i = 0; i < count && p.deck.length > 0; i++) {
    const drawnCard=p.deck.pop();
    p.hand.push(drawnCard);
    if(G.effectResultContext)(G.effectResultContext.directDrawIds ||= []).push(drawnCard.id);
    drawn++;
  }
  if (drawn < count)
    log(p.name + "の山札が足りず、" + drawn + "枚だけドローしました。");
  syncGameBgmToDecks();
  return drawn;
}
// One replacement per opponent effect, covering all its destruction batches.
function preventEndoDestruction(p, sourceName, actor = G.effectResultContext?.owner ?? G.current) {
  const target=G.players.indexOf(p);
  if(actor===target)return false;
  const key=[G.effectSequence||0,actor,target,sourceName].join(':');
  if(G.endoPreventedEffects?.includes(key))return true;
  const guard=p.hand.find(x=>x.name==='円堂守');
  if(!guard)return false;
  (G.endoPreventedEffects ||= []).push(key);
  collectEffectResults(true);
  const context=G.effectResultContext, originalSource=context?.source;
  if(context)context.source='円堂守';
  p.hand=p.hand.filter(x=>x.id!==guard.id);
  resetSunrakuEffect(guard);p.grave.push(guard);
  collectEffectResults(true);
  if(context)context.source=originalSource;
  recordFollowerEffect(target,'円堂守');
  log(p.name+'の円堂守を身代わりに破壊し、'+sourceName+'による自分の手札・山札の破壊を無効にしました。');
  return true;
}
const EXODIA_PARTS=['封印されし者の右腕','封印されし者の左腕','封印されし者の右足','封印されし者の左足'];
function canWinWithExodia(p){
  return !p.grave.some(c=>['7','L'].includes(currentNumberLabel(c))) && EXODIA_PARTS.every(name=>p.grave.some(c=>c.name===name));
}
function destroyHandCard(p, card, sourceName, sourceNumber) {
  if (!card || !p.hand.some(x=>x.id===card.id)) return false;
  if (preventEndoDestruction(p, sourceName)) return false;
  collectEffectResults(true);
  p.hand = p.hand.filter((x) => x.id !== card.id);
  resetSunrakuEffect(card);
  p.grave.push(card);
  collectEffectResults(true);
  log(
    p.name +
      "は「" +
      card.name +
      "」を" +
      sourceName +
      "の効果で破壊し、墓地へ置きました。",
  );
  if (card.name === "ベルエンジェル" && String(sourceNumber) !== "L") {
    if (p.human && G && G.titleMatchProgress)
      addTitleProgress(G.players.indexOf(p), "bell_angel_effect");
    collectEffectResults(true);
    const resultContext=G.effectResultContext,originalSource=resultContext?.source;
    if(resultContext)resultContext.source="ベルエンジェル";
    const drawn = drawCards(p, 2);
    collectEffectResults(true);
    if(resultContext)resultContext.source=originalSource;
    syncBellAngelEffectSound();
    G.bellAngelSoundCount = (G.bellAngelSoundCount || 0) + 1;
    syncBellAngelEffectSound();
    recordFollowerEffect(G.players.indexOf(p),"ベルエンジェル");
    log(
      "ベルエンジェルの効果：L以外のフォロワー「" +
        sourceName +
        "」の効果で手札から破壊されたため、山札からカードを" +
        drawn +
        "枚引きました。",
    );
  }
  return true;
}
function applyNeitoNumber(n, pi = 0, source = "ネート") {
  G.forbiddenNumber = String(n);
  G.pendingNeito = false;
  G.pendingSpiderMan = false;
  G.neitoChoice = "";
  if (G.players[pi].human && selected) {
    const chosen = G.players[pi].hand.find((card) => card.id === selected);
    if (
      chosen &&
      chosen.kind === "follower" &&
      currentNumberLabel(chosen) === String(n)
    )
      selected = null;
  }
  const targetLabel =
    String(n) === "L" ? "Lフォロワー" : "数字" + n + "のフォロワー";
  log(
    source +
      "の効果：場が流れるまで、全プレイヤーは" +
      targetLabel +
      "を手札から出せません（効果によるプレイも含む）。",
  );
  G.players.forEach((pl) => {
    if (
      pl.hand.some(
        (card) => card.kind === "follower" && currentNumberLabel(card) === String(n),
      )
    )
      log(pl.name + "の手札に禁止された" + targetLabel + "があります。");
  });
}
function showCureLemonadePicker() {
  if (!G?.pendingCureLemonade || (onlineMode && G.cureLemonadeOwner!==activeHumanSeat())) return;
  const modal = document.getElementById("cureLemonadeModal");
  document.getElementById("neitoPanel").after(modal);
  const list = document.getElementById("cureLemonadeNumbers");
  const summary = document.getElementById("cureLemonadeSummary");
  const confirm = document.getElementById("cureLemonadeConfirm");
  if (!modal || !list || !confirm) return;
  G.cureLemonadeChoices = G.cureLemonadeChoices || [];
  list.innerHTML = [1, 2, 3, 4, 5, 6, 7]
    .map(
      (n) =>
        `<button type="button" class="cure-number-btn" data-cure-number="${n}">${n}</button>`,
    )
    .join("");
  list.querySelectorAll("[data-cure-number]").forEach((btn) =>
    btn.addEventListener("click", () => {
      if (!G?.pendingCureLemonade || !canOperateEffect(G.cureLemonadeOwner)) return;
      const n = String(btn.dataset.cureNumber);
      if (G.cureLemonadeChoices.includes(n))
        G.cureLemonadeChoices = G.cureLemonadeChoices.filter((x) => x !== n);
      else if (G.cureLemonadeChoices.length < 2) G.cureLemonadeChoices.push(n);
      list
        .querySelectorAll("[data-cure-number]")
        .forEach((b) =>
          b.classList.toggle(
            "selected",
            G.cureLemonadeChoices.includes(String(b.dataset.cureNumber)),
          ),
        );
      summary.textContent =
        "選択中：" +
        (G.cureLemonadeChoices.length
          ? G.cureLemonadeChoices.join("・")
          : "なし") +
        "（2つ選択）";
      confirm.disabled = G.cureLemonadeChoices.length !== 2;
    }),
  );
  list.querySelectorAll('[data-cure-number]').forEach(b=>{
    b.classList.toggle('selected',G.cureLemonadeChoices.includes(b.dataset.cureNumber));
    b.disabled=!canOperateEffect(G.cureLemonadeOwner);
  });
  summary.textContent='選択中：'+(G.cureLemonadeChoices.join('・')||'なし')+'（2つ選択）';
  confirm.disabled=G.cureLemonadeChoices.length!==2||!canOperateEffect(G.cureLemonadeOwner);
  modal.hidden=false;modal.style.display='flex';
  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
}
function confirmCureLemonade() {
  if (onlineMode && (!G || !canOperateEffect(G.cureLemonadeOwner))) return;
  if (!G || !G.pendingCureLemonade || G.cureLemonadeChoices.length !== 2)
    return;
  const owner=G.cureLemonadeOwner;
  const nums = [...new Set(G.cureLemonadeChoices)];
  if(nums.length!==2 || nums.some(n=>!/[1-7]/.test(n)||n.length!==1))return;
  G.forbiddenNumbers = nums;
  G.pendingCureLemonade = false;
  G.cureLemonadeOwner = null;
  G.cureLemonadeChoices = [];
  const modal = document.getElementById("cureLemonadeModal");
  modal.classList.remove("open");
  modal.style.display="none";
  modal.setAttribute("aria-hidden", "true");
  log(
    "キュアレモネードのファンファーレ：数字" +
      nums.join("と") +
      "を宣言しました。場が流れるまで全プレイヤーはその数字のフォロワーを出せません。",
  );
  render();
  if (!G.winner) afterAction(owner);
}
document
  .getElementById("cureLemonadeConfirm")
  .addEventListener("click", confirmCureLemonade);
const TAKINA_DESTROYABLE_NAMES = [
  "ゴブリン",
  "リュウ",
  "カレーパンマン",
  "くちぱっち",
  "青眼の白龍",
  "封印されし者の右腕",
  "封印されし者の左腕",
  "封印されし者の右足",
  "封印されし者の左足",
];
function isTakinaDestroyable(card) {
  return (
    !!card &&
    card.kind === "follower" &&
    TAKINA_DESTROYABLE_NAMES.includes(String(card.name || "").trim())
  );
}
let selectedTakinaIds = [];
function showTakinaPicker() {
  if (onlineMode && (!G || !canOperateEffect(G.takinaOwner))) return;
  if (!G || !G.pendingTakina) return;
  let modal = document.getElementById("takinaPicker");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "takinaPicker";
    modal.style.cssText =
      "position:fixed;inset:0;z-index:5000;background:#000d;display:flex;align-items:center;justify-content:center;padding:14px;box-sizing:border-box;";
    modal.innerHTML =
      '<div style="width:min(900px,100%);max-height:90vh;overflow:auto;background:#172231;color:#fff;border:2px solid #d5b45b;border-radius:14px;padding:18px;box-sizing:border-box"><h2 style="margin:0 0 8px">井ノ上たきな：破壊するカードを選択</h2><p id="takinaPickerSummary" style="margin:0 0 12px;color:#d5deea">手札にある対象カードを好きな枚数選択できます。選ばない場合は「破壊せず終了」を押してください。</p><div id="takinaPickerList" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(125px,1fr));gap:9px"></div><div style="display:flex;gap:10px;justify-content:flex-end;margin-top:16px;flex-wrap:wrap"><button type="button" id="takinaCancel" style="padding:10px 16px">破壊せず終了</button><button type="button" id="takinaConfirm" style="padding:10px 18px;background:#b52e2e;color:white;border:0;border-radius:7px;font-weight:bold">選択したカードを破壊</button></div></div>';
    document.body.appendChild(modal);
    document
      .getElementById("takinaCancel")
      .addEventListener("click", () => confirmTakinaDestroy(true));
    document
      .getElementById("takinaConfirm")
      .addEventListener("click", () => confirmTakinaDestroy(false));
  }
  selectedTakinaIds = [];
  const p = G.players[G.takinaOwner];
  const targets = p.hand.filter(isTakinaDestroyable);
  document.getElementById("takinaPickerList").innerHTML =
    targets
      .map((card) => {
        let html = cardHtml(card, false).replace(
          'class="card ',
          'class="card takina-pick-card ',
        );
        return (
          '<div data-takina-id="' +
          String(card.id).replace(/"/g, "&quot;") +
          '" onclick="toggleTakinaSelection(this.dataset.takinaId)" style="cursor:pointer;border:2px solid #53657b;border-radius:8px;padding:4px">' +
          html +
          "</div>"
        );
      })
      .join("") || "<p>破壊できるカードがありません。</p>";
  document.getElementById("takinaPickerSummary").textContent =
    "対象カード" + targets.length + "枚｜選択中：0枚";
  modal.style.display = "flex";
}
function toggleTakinaSelection(id) {
  if (onlineMode && (!G || !canOperateEffect(G.takinaOwner))) return;
  if (!G || !G.pendingTakina) return;
  selectedTakinaIds = selectedTakinaIds.includes(id)
    ? selectedTakinaIds.filter((x) => x !== id)
    : selectedTakinaIds.concat(id);
  document
    .querySelectorAll("#takinaPickerList [data-takina-id]")
    .forEach((el) => {
      const selected = selectedTakinaIds.includes(el.dataset.takinaId);
      el.style.borderColor = selected ? "#ffd84d" : "#53657b";
      el.style.boxShadow = selected ? "0 0 12px #ffd84d" : "none";
    });
  document.getElementById("takinaPickerSummary").textContent =
    "選択中：" + selectedTakinaIds.length + "枚";
}
function confirmTakinaDestroy(skip) {
  if (onlineMode && (!G || !canOperateEffect(G.takinaOwner))) return;
  if (!G || !G.pendingTakina) return;
  const pi = G.takinaOwner,
    p = G.players[pi],
    chosen = skip
      ? []
      : selectedTakinaIds
          .map((id) => p.hand.find((c) => c.id === id))
          .filter(isTakinaDestroyable);
  const chizukoMarked = chosen.filter((card) => card.chizukoTitleMarked);
  chosen.forEach((card) => {
    const ix = p.hand.findIndex((c) => c.id === card.id);
    if (ix >= 0) {
      p.hand.splice(ix, 1);
      p.grave.push(card);
    }
  });
  if (
    pi >= 0 &&
    chosen.length === 3 &&
    chizukoMarked.length === 3 &&
    G.titleMatchProgress
  )
    addTitleProgress(activeHumanSeat(), "chizuko_takina_combo");
  G.pendingTakina = false;
  G.takinaOwner = null;
  selectedTakinaIds = [];
  const modal = document.getElementById("takinaPicker");
  if (modal) modal.style.display = "none";
  log(
    "井ノ上たきなのファンファーレ：" +
      (chosen.length
        ? "手札の「" +
          chosen.map((c) => c.name).join("」「") +
          "」" +
          chosen.length +
          "枚を破壊しました。"
        : "カードを破壊しませんでした。"),
  );
  checkWinner();
  if (!G.winner) afterAction(pi);
  else render();
}
let selectedHoshinoAiIds = [];
function showHoshinoAiPicker() {
  if (!G || !G.pendingHoshinoAi || G.hoshinoAiConfirmed?.[activeHumanSeat()])
    return;
  let modal = document.getElementById("hoshinoAiPicker");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "hoshinoAiPicker";
    modal.style.cssText =
      "position:fixed;inset:0;z-index:5100;background:#000d;display:flex;align-items:center;justify-content:center;padding:14px;box-sizing:border-box;";
    modal.innerHTML =
      '<div style="width:min(900px,100%);max-height:90vh;overflow:auto;background:#172231;color:#fff;border:2px solid #d5b45b;border-radius:14px;padding:18px;box-sizing:border-box"><h2 style="margin:0 0 8px">星野アイ：破壊する英種族フォロワーを選択</h2><p id="hoshinoAiSummary" style="margin:0 0 12px;color:#d5deea">0〜2枚まで選択できます。1枚も選ばずに確定することもできます。</p><div id="hoshinoAiList" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(125px,1fr));gap:9px"></div><div style="display:flex;gap:10px;justify-content:flex-end;margin-top:16px"><button type="button" id="hoshinoAiConfirm" style="padding:10px 18px;background:#b52e2e;color:white;border:0;border-radius:7px;font-weight:bold">選択を確定</button></div></div>';
    document.body.appendChild(modal);
    document
      .getElementById("hoshinoAiConfirm")
      .addEventListener("click", confirmHoshinoAi);
  }
  selectedHoshinoAiIds = [];
  const p = G.players[activeHumanSeat()],
    targets = p.hand.filter(
      (card) => card.kind === "follower" && card.tribe === "英種族",
    );
  document.getElementById("hoshinoAiList").innerHTML =
    targets
      .map((card) => {
        const html = cardHtml(card, false).replace(
          'class="card ',
          'class="card hoshino-ai-pick-card ',
        );
        return (
          '<div data-hoshino-ai-id="' +
          String(card.id).replace(/"/g, "&quot;") +
          '" onclick="toggleHoshinoAiSelection(this.dataset.hoshinoAiId)" style="cursor:pointer;border:2px solid #53657b;border-radius:8px;padding:4px">' +
          html +
          "</div>"
        );
      })
      .join("") || "<p>手札に英種族フォロワーがありません。</p>";
  document.getElementById("hoshinoAiSummary").textContent =
    "あなたの手札：対象" + targets.length + "枚｜選択中：0 / 2枚";
  modal.style.display = "flex";
}
function toggleHoshinoAiSelection(id) {
  if (!G || !G.pendingHoshinoAi) return;
  if (selectedHoshinoAiIds.includes(id))
    selectedHoshinoAiIds = selectedHoshinoAiIds.filter((x) => x !== id);
  else if (selectedHoshinoAiIds.length < 2) selectedHoshinoAiIds.push(id);
  document
    .querySelectorAll("#hoshinoAiList [data-hoshino-ai-id]")
    .forEach((el) => {
      const yes = selectedHoshinoAiIds.includes(el.dataset.hoshinoAiId);
      el.style.borderColor = yes ? "#ffd84d" : "#53657b";
      el.style.boxShadow = yes ? "0 0 12px #ffd84d" : "none";
    });
  document.getElementById("hoshinoAiSummary").textContent =
    "あなたの手札：選択中 " + selectedHoshinoAiIds.length + " / 2枚";
}
function confirmHoshinoAi() {
  if (!G?.pendingHoshinoAi) return;
  if (onlineMode) {
    window.DAISHUGO_ONLINE_ADAPTER.confirmChoice(
      "ai",
      selectedHoshinoAiIds.slice(),
    );
    return;
  }
  G.hoshinoAiSelections[activeHumanSeat()] = selectedHoshinoAiIds.slice();
  resolveHoshinoAiChoices();
}
let selectedFatherIds = [];
function showFatherNumberPicker() {
  if (onlineMode && (!G || !canOperateEffect(G.fatherOwner))) return;
  if (!G || !G.pendingFather) return;
  let modal = document.getElementById("fatherPicker");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "fatherPicker";
    modal.style.cssText =
      "position:fixed;inset:0;z-index:5200;background:#000d;display:flex;align-items:center;justify-content:center;padding:14px;box-sizing:border-box;";
    modal.innerHTML =
      '<div style="width:min(900px,100%);max-height:90vh;overflow:auto;background:#172231;color:#fff;border:2px solid #d5b45b;border-radius:14px;padding:18px;box-sizing:border-box"><h2 id="fatherTitle" style="margin:0 0 8px">お父様：数字を選択</h2><p id="fatherSummary" style="margin:0 0 12px;color:#d5deea">破壊するフォロワーの数字を1〜7から1つ選んでください。</p><div id="fatherNumbers" style="display:grid;grid-template-columns:repeat(7,minmax(35px,1fr));gap:8px"></div><div id="fatherCards" style="display:none;grid-template-columns:repeat(auto-fill,minmax(125px,1fr));gap:9px;margin-top:14px"></div><div style="display:flex;gap:10px;justify-content:flex-end;margin-top:16px"><button type="button" id="fatherBack" style="display:none;padding:10px 18px;background:#53657b;color:white;border:0;border-radius:7px">数字を選び直す</button><button type="button" id="fatherConfirm" style="display:none;padding:10px 18px;background:#b52e2e;color:white;border:0;border-radius:7px;font-weight:bold">選択を確定</button></div></div>';
    document.body.appendChild(modal);
    document
      .getElementById("fatherConfirm")
      .addEventListener("click", confirmFatherSelection);
    document
      .getElementById("fatherBack")
      .addEventListener("click", showFatherNumberPicker);
  }
  document.getElementById("neitoPanel").after(modal);modal.classList.add("number-inline");
  selectedFatherIds = [];
  G.fatherNumber = null;
  document.getElementById("fatherTitle").textContent = "お父様：数字を選択";
  document.getElementById("fatherSummary").textContent =
    "破壊するフォロワーの数字を1〜7から1つ選んでください。";
  document.getElementById("fatherNumbers").style.display = "grid";
  document.getElementById("fatherCards").style.display = "none";
  document.getElementById("fatherBack").style.display = "none";
  document.getElementById("fatherConfirm").style.display = "inline-block";
  document.getElementById("fatherConfirm").disabled=true;
  document.getElementById("fatherNumbers").innerHTML = [1, 2, 3, 4, 5, 6, 7]
    .map(
      (n) =>
        '<button type="button" data-father-number="' +
        n +
        '" style="padding:14px 4px;background:#263b55;color:white;border:1px solid #8295aa;border-radius:8px;font-size:20px;font-weight:bold">' +
        n +
        "</button>",
    )
    .join("");
  document
    .querySelectorAll("#fatherNumbers [data-father-number]")
    .forEach((btn) =>
      btn.addEventListener("click", () =>
        { G.fatherNumber=String(btn.dataset.fatherNumber); document.querySelectorAll("[data-father-number]").forEach(b=>b.classList.toggle("primary",b===btn)); document.getElementById("fatherConfirm").disabled=false; },
      ),
    );
  modal.style.display = "flex";
}
function showFatherCards(number) {
  if (onlineMode && (!G || !canOperateEffect(G.fatherOwner))) return;
  if (!G || !G.pendingFather) return;
  const modal=document.getElementById("fatherPicker");document.body.appendChild(modal);modal.classList.remove("number-inline");
  G.fatherNumber = String(number);
  selectedFatherIds = [];
  const p = G.players[G.fatherOwner],
    targets = p.hand.filter(
      (card) =>
        card.kind === "follower" && currentNumberLabel(card) === String(number),
    );
  document.getElementById("fatherTitle").textContent =
    "お父様：数字" + number + "のフォロワー";
  document.getElementById("fatherSummary").textContent =
    "破壊するカードを好きな枚数選択してください。0枚でも確定できます。対象：" +
    targets.length +
    "枚";
  document.getElementById("fatherNumbers").style.display = "none";
  const list = document.getElementById("fatherCards");
  list.style.display = "grid";
  list.innerHTML =
    targets
      .map(
        (card) =>
          '<div data-father-id="' +
          String(card.id).replace(/"/g, "&quot;") +
          '" onclick="toggleFatherSelection(this.dataset.fatherId)" style="cursor:pointer;border:2px solid #53657b;border-radius:8px;padding:4px">' +
          cardHtml(card, false) +
          "</div>",
      )
      .join("") || "<p>該当するフォロワーは手札にありません。</p>";
  document.getElementById("fatherBack").style.display = "inline-block";
  document.getElementById("fatherConfirm").style.display = "inline-block";
}
function toggleFatherSelection(id) {
  if (onlineMode && (!G || !canOperateEffect(G.fatherOwner))) return;
  if (!G || !G.pendingFather) return;
  selectedFatherIds = selectedFatherIds.includes(id)
    ? selectedFatherIds.filter((x) => x !== id)
    : selectedFatherIds.concat(id);
  document.querySelectorAll("#fatherCards [data-father-id]").forEach((el) => {
    const yes = selectedFatherIds.includes(el.dataset.fatherId);
    el.style.borderColor = yes ? "#ffd84d" : "#53657b";
    el.style.boxShadow = yes ? "0 0 12px #ffd84d" : "none";
  });
  document.getElementById("fatherSummary").textContent =
    "数字" +
    G.fatherNumber +
    "｜選択中：" +
    selectedFatherIds.length +
    "枚（0枚でも確定できます）";
}
function confirmFatherSelection() {
  if(document.getElementById("fatherNumbers")?.style.display!=="none"){if(G?.fatherNumber)showFatherCards(G.fatherNumber);return;}
  if (onlineMode && (!G || !canOperateEffect(G.fatherOwner))) return;
  if (!G || !G.pendingFather) return;
  const pi = G.fatherOwner,
    p = G.players[pi],
    number = String(G.fatherNumber),
    chosen = selectedFatherIds
      .map((id) => p.hand.find((card) => card.id === id))
      .filter(
        (card) =>
          card && card.kind === "follower" && currentNumberLabel(card) === number,
      );
  chosen.forEach((card) => destroyHandCard(p, card, "お父様", "L"));
  G.pendingFather = false;
  G.fatherOwner = null;
  G.fatherNumber = null;
  selectedFatherIds = [];
  const modal = document.getElementById("fatherPicker");
  if (modal) modal.style.display = "none";
  log(
    "お父様のファンファーレ：数字" +
      number +
      "を宣言し、該当するフォロワー" +
      chosen.length +
      "枚を破壊しました。",
  );
  locked = false;
  checkWinner();
  if (!G.winner) afterAction(pi);
  else render();
}
let effectResolutionDepth=0;
function resolveFanfare(pi,c) {
  if(!G.titleEffectPending)beginFollowerEffect(pi,c);
  effectResolutionDepth++;
  try{return resolveFanfareCore(pi,c);}finally{effectResolutionDepth--;finishFollowerEffect();}
}
function applySherryState(){
  if(G.sherryRestoreRevolution==null){G.sherryRestoreRevolution=!!G.revolution;G.sherryRestoreConflict=!!G.conflict;}
  G.revolution=G.conflict?true:!G.revolution;G.conflict=false;
  log('シェリー＆ブラゴ：場が流れるまで'+(G.revolution?'革命':'通常')+'状態。場が流れたら発動前の状態に戻します。');
}
function resolveFanfareCore(pi, c) {
  const p = G.players[pi];
  if (resolveExcelFanfare(pi, c)) return;
  const effect = String(c.effect || "");
  if (!effect.includes("ファンファーレ：")) return;
  const text = effect
    .split("ファンファーレ：")
    .slice(1)
    .join("ファンファーレ：")
    .trim();
  if (/^シェリー[＆&]ブラ[コゴ]$/.test(String(c.name || ""))) { applySherryState(); return; }
  if (c.name === "うちはマダラ") {
    const wasRevolution = !!G.revolution;
    G.revolution = G.conflict ? true : !wasRevolution;
    G.conflict = false;
    G.sherryRestoreRevolution = null;
    G.sherryRestoreConflict = null;
    log(
      "うちはマダラのファンファーレ：" +
        (G.revolution
          ? "場を革命状態にしました。数字の強さが逆転し、場が流れても継続します。"
          : "既に革命状態だったため、場を通常状態に戻しました。"),
    );
    return;
  }
  if (c.name === "お父様") {
    if (p.human) {
      G.pendingFather = true;
      G.fatherOwner = pi;
      G.fatherNumber = null;
      G.fatherSelected = [];
      showFatherNumberPicker();
      log("お父様のファンファーレ：数字を1〜7から1つ選んでください。");
    } else {
      const n = String(1 + Math.floor(Math.random() * 7));
      const targets = p.hand.filter(
        (card) => card.kind === "follower" && currentNumberLabel(card) === n,
      );
      targets.forEach((card) => destroyHandCard(p, card, "お父様", "L"));
      log(
        "お父様のファンファーレ：COMは数字" +
          n +
          "を宣言し、該当するフォロワー" +
          targets.length +
          "枚を破壊しました。",
      );
    }
    return;
  }
  if (c.name === "ネルギガンテ") {
    const returned = [];
    for (let i = G.field.length - 1; i >= 0; i--) {
      const entry = G.field[i];
      if (
        !entry ||
        !entry.card ||
        entry.card.id === c.id ||
        entry.card.kind !== "follower"
      )
        continue;
      const owner = G.players[entry.player];
      if (owner) {
        owner.hand.push(entry.card);
        returned.push({ name: entry.card.name, player: owner.name });
        G.field.splice(i, 1);
      }
    }
    if(returned.length>=3)addTitleProgress(pi,"nergigante_three");
    log(
      "ネルギガンテのファンファーレ：自身を除く場のフォロワー" +
        returned.length +
        "枚を、それぞれの持ち主の手札に戻しました。" +
        (returned.length
          ? "（" +
            returned.map((x) => "「" + x.name + "」→" + x.player).join("、") +
            "）"
          : ""),
    );
    return;
  }
  if (c.name === "キュアレモネード") {
    if (p.human) {
      G.pendingCureLemonade = true;
      G.cureLemonadeOwner = pi;
      G.cureLemonadeChoices = [];
      showCureLemonadePicker();
      log(
        "キュアレモネードのファンファーレ：禁止する数字を1〜7から重複なしで2つ選び、確定してください。確定するまでゲーム進行は停止します。",
      );
    } else {
      const nums = [1, 2, 3, 4, 5, 6, 7]
        .sort(() => Math.random() - 0.5)
        .slice(0, 2)
        .map(String);
      G.forbiddenNumbers = nums;
      log(
        "キュアレモネードのファンファーレ：数字" +
          nums.join("と") +
          "を宣言しました。場が流れるまで全プレイヤーはその数字のフォロワーを出せません。",
      );
    }
    return;
  }
  if (c.name === "ネート") {
    if (p.human) {
      G.pendingNeito = true;
      G.neitoChoice = "";
      log(
        "ネートの効果：禁止する数字を1〜7から1つ選び、「効果処理」ボタンを押してください。選択中はゲーム進行が停止します。",
      );
    } else {
      const n = String(1 + Math.floor(Math.random() * 7));
      applyNeitoNumber(n, pi);
    }
    return;
  }
  if (c.name === "チャク") {
    const changed = !!(G.revolution || G.conflict);
    if (changed) {
      G.revolution = false;
      G.conflict = false;
      G.sherryRestoreRevolution = null;
      G.sherryRestoreConflict = null;
      const drawn = drawCards(p, 2);
      log("チャク：場を通常状態に戻し、山札からカードを" + drawn + "枚引きました。");
    } else log("チャク：場が通常状態のため、カードを引きません。");
    return;
  }
  if (c.name === "ソニック") {
    // 出札処理でソニック自身が場に置かれた直後のため、
    // 場に自身しかなければ「場にカードが1枚もない状態で出した」と判定する。
    const emptyFieldAtPlay =
      G.field.length === 1 && G.field[0].card.id === c.id;
    const count = emptyFieldAtPlay ? 2 : 1;
    const drawn = drawCards(p, count);
    log(
      "ソニックのファンファーレ：" +
        (emptyFieldAtPlay ? "場が空の状態で出したため" : "通常効果で") +
        "山札からカードを" +
        drawn +
        "枚引きました。",
    );
    return;
  }
  if (c.name === "井ノ上たきな") {
    const eligible = p.hand.filter((card) => isTakinaDestroyable(card));
    if (!eligible.length) {
      log(
        "井ノ上たきなのファンファーレ：破壊できる対象カードが手札にありません。",
      );
      return;
    }
    if (p.human) {
      G.pendingTakina = true;
      G.takinaOwner = pi;
      G.takinaSelected = [];
      showTakinaPicker();
      log(
        "井ノ上たきなのファンファーレ：手札の対象カードを好きな枚数選択してください。",
      );
    } else {
      eligible.forEach((card) => {
        const ix = p.hand.findIndex((x) => x.id === card.id);
        if (ix >= 0) {
          p.hand.splice(ix, 1);
          p.grave.push(card);
        }
      });
      log(
        "井ノ上たきなのファンファーレ：CPUは対象カード" +
          eligible.length +
          "枚（" +
          eligible.map((x) => "「" + x.name + "」").join("、") +
          "）を破壊しました。",
      );
    }
    return;
  }
  if (c.name === "星野アイ" && !c.hoshinoAiStageSkipOnce) {
    // このファンファーレ処理中の再呼び出しだけ演出をスキップする。一度手札に戻って再使用した場合は再演出する。
    locked = true;
    const stageOverlay = document.getElementById("hoshinoAiStageOverlay");
    const stageAudio = document.getElementById("hoshinoAiStageSound");
    if (stageOverlay) {
      stageOverlay.classList.add("show");
      stageOverlay.setAttribute("aria-hidden", "false");
    }
    if (stageAudio) {
      try {
        // HTMLの loop は boolean 属性なので loop="false" でも有効になる。
        // 属性とプロパティの両方を無効化してから再生する。
        stageAudio.pause();
        stageAudio.loop = false;
        stageAudio.removeAttribute("loop");
        stageAudio.currentTime = 0;
        const playPromise = stageAudio.play();
        if (playPromise && typeof playPromise.catch === "function")
          playPromise.catch(() =>
            log(
              "星野アイの演出音声：ブラウザの再生制限により音声を再生できませんでした。",
            ),
          );
      } catch (e) {
        log("星野アイの演出音声を再生できませんでした。");
      }
    }
    log("星野アイのステージ演出を2.5秒間再生します。");
    render();
    // 音声の ended イベントには依存せず、必ずタイマーで演出を終了する。
    window.setTimeout(() => {
      try {
        if (stageOverlay) {
          stageOverlay.classList.remove("show");
          stageOverlay.setAttribute("aria-hidden", "true");
        }
        if (stageAudio) {
          stageAudio.pause();
          stageAudio.loop = false;
          stageAudio.removeAttribute("loop");
          try {
            stageAudio.currentTime = 0;
          } catch (e) {}
        }
      } finally {
        locked = false;
        if (G && !G.winner) {
          // 演出終了後に効果本体を1回だけ解決する。
          c.hoshinoAiStageSkipOnce = true;
          resolveFanfare(pi, c);
          checkWinner();
        }
        if (G && !G.winner) {
          afterAction(pi);
        } else {
          render();
        }
      }
    }, 2500);
    return true;
  }
  if (c.name === "星野アイ" && c.hoshinoAiStageSkipOnce) {
    delete c.hoshinoAiStageSkipOnce;
  }
  if (c.name === "成歩堂龍一") {
    G.players.forEach((player) => {
      const returned = player.hand.length;
      player.deck = shuffle(player.deck.concat(player.hand));
      player.hand = [];
      log(
        "成歩堂龍一のファンファーレ：" +
          player.name +
          "は手札" +
          returned +
          "枚を山札に戻してシャッフルしました。",
      );
    });
    G.players.forEach((player) => {
      const drawn = drawCards(player, 5);
      log(
        "成歩堂龍一のファンファーレ：" +
          player.name +
          "は山札から" +
          drawn +
          "枚引きました。",
      );
    });
    return;
  }
  if (c.name === "バターカップ") {
    const freeCost = c.buttercupFreeCostAtPlay === true;
    delete c.buttercupFreeCostAtPlay;
    const count = freeCost ? 2 : 1;
    const drawn = drawCards(p, count);
    log(
      "バターカップのファンファーレ：" +
        (freeCost
          ? "場にフォロワーが2枚以上ありコストが0だったため"
          : "コストが0ではなかったため") +
        "山札からカードを" +
        drawn +
        "枚引きました。",
    );
    return;
  }
  if (c.name === "トキメキ") {
    const numberCounts = {};
    p.grave
      .filter(
        (card) =>
          card.kind === "follower" &&
          ["1", "2", "3", "4", "5", "6", "7", "L"].includes(
            currentNumberLabel(card),
          ),
      )
      .forEach((card) => {
        const n = currentNumberLabel(card);
        numberCounts[n] = (numberCounts[n] || 0) + 1;
      });
    const matched = Object.entries(numberCounts).find(
      ([, count]) => count >= 3,
    );
    if (matched) {
      if (pi >= 0 && G.titleMatchProgress)
        addTitleProgress(pi, "tokimeki_effect");
      const drawn = drawCards(p, 2);
      log(
        "トキメキのファンファーレ：墓地に数字" +
          matched[0] +
          "のフォロワーが" +
          matched[1] +
          "枚あるため、山札からカードを" +
          drawn +
          "枚引きました。",
      );
    } else {
      log(
        "トキメキのファンファーレ：墓地に同じ数字のフォロワーが3枚以上ないため、効果は発動しません。",
      );
    }
    return;
  }
  if (c.name === "バン") {
    const below = G.field.length >= 2 ? G.field[G.field.length - 2].card : null;
    if (below && below.kind === "follower" && Number(below.cost) === 0) {
      const drawn = drawCards(p, 3);
      if(drawn>0)addTitleProgress(pi,"ban_draw");
      log(
        "バンのファンファーレ：下にあるフォロワーのコストが0のため、山札からカードを" +
          drawn +
          "枚引きました。",
      );
    } else {
      log(
        "バンのファンファーレ：場にある一番上のフォロワーのコストが0ではないため、効果は発動しません。",
      );
    }
    return;
  }
  if (c.name === "スパイダーマン") {
    const drawn = drawCards(p, 1);
    if (
      pi >= 0 &&
      drawn === 1 &&
      p.hand.length &&
      p.hand[p.hand.length - 1].kind === "follower" &&
      p.hand[p.hand.length - 1].tribe === "英種族" &&
      G.titleMatchProgress
    )
      addTitleProgress(pi, "spiderman_english");
    log(
      "スパイダーマンのファンファーレ①：山札からカードを" +
        drawn +
        "枚引きました。",
    );
    applyNeitoNumber("7", pi, "スパイダーマン");
    log(
      "スパイダーマンのファンファーレ②：効果処理を自動完了しました。試合進行は停止しません。",
    );
    return;
  }
  if (c.name === "雪ミク") {
    log(
      "雪ミクの効果：雪ミクの上には通常ルールに加えてBPが雪ミクより高いフォロワーのみ出せます。",
    );
    return;
  }
  if (c.name === "ダセット" && !c.dasetEntryEffectPlayed) {
    locked = true;
    log("ダセットの登場演出：紫色の音符と音声を3秒間再生します。");
    render();
    window.playDasetEntryEffect(() => {
      c.dasetEntryEffectPlayed = true;
      locked = false;
      if (G && !G.winner) {
        resolveFanfare(pi, c);
        checkWinner();
      }
      if (G && !G.winner) {
        afterAction(pi);
      } else {
        render();
      }
    });
    return;
  }
  if (c.name === "ダセット") {
    const drawn = drawCards(p, 1);
    log("ダセットの機動①：山札からカードを" + drawn + "枚引きました。");
    applyNeitoNumber("L", pi, "ダセット");
    log(
      "ダセットの機動②：場が流れるまで全プレイヤーのLフォロワーを自動的に禁止しました。試合進行は停止しません。",
    );
    return;
  }
  if (c.name === "涼宮ハルヒ") {
    const counts = G.players.map((pl, i) => ({ i, count: pl.hand.length }));
    const min = Math.min(...counts.map((x) => x.count));
    const targets = counts.filter((x) => x.count === min);
    if (targets.length >= 2) {
      targets.forEach(x => addTitleProgress(x.i, "haruhi_target"));
      G.players.forEach((pl, i) => {
        const drawn = drawCards(pl, 3);
        log(
          "涼宮ハルヒのファンファーレ：手札最少が複数人（" +
            min +
            "枚）だったため、" +
            pl.name +
            "が" +
            drawn +
            "枚ドローしました。",
        );
      });
    } else {
      const target = targets[0];
      if (G.titleMatchProgress)
        addTitleProgress(target.i, "haruhi_target");
      const drawn = drawCards(G.players[target.i], 3);
      log(
        "涼宮ハルヒのファンファーレ：手札が最も少ない" +
          G.players[target.i].name +
          "（" +
          min +
          "枚）が" +
          drawn +
          "枚ドローしました。",
      );
    }
    return;
  }
  if (c.name === "ぐら") {
    const eligible = p.hand.filter((card) => card.name === "ぐり");
    if (!eligible.length) {
      log(
        "ぐらのファンファーレ：手札に「ぐり」がないため、効果は発動しません。",
      );
      return;
    }
    if (p.human) {
      G.pendingGura = true;
      log(
        "ぐらのファンファーレ：赤く光っている手札の「ぐり」をクリックして破壊してください。",
      );
    } else {
      const chosen = eligible[Math.floor(Math.random() * eligible.length)];
      destroyHandCard(p, chosen, "ぐら", "2");
      const deckFollowers = p.deck;
      if (deckFollowers.length) {
        const pick =
          deckFollowers[Math.floor(Math.random() * deckFollowers.length)];
        p.deck = p.deck.filter((card) => card.id !== pick.id);
        p.hand.push(pick);
        p.deck = shuffle(p.deck);
        log(
          "ぐらのファンファーレ：CPUは山札からカード「" +
            pick.name +
            "」を手札に加え、山札をシャッフルしました。",
        );
      } else
        log(
          "ぐらのファンファーレ：山札にカードがないため、カードを加えられません。",
        );
    }
    return;
  }
  if (c.name === "ぐり") {
    const eligible = p.hand.filter((card) => card.name === "ぐら");
    if (!eligible.length) {
      log(
        "ぐりのファンファーレ：手札に「ぐら」がないため、効果は発動しません。",
      );
      return;
    }
    if (p.human) {
      G.pendingGuri = true;
      log(
        "ぐりのファンファーレ：赤く光っている手札の「ぐら」をクリックして破壊してください。",
      );
    } else {
      const chosen = eligible[Math.floor(Math.random() * eligible.length)];
      destroyHandCard(p, chosen, "ぐり", "5");
      const drawn = drawCards(p, 3);
      log(
        "ぐりのファンファーレ：手札の「ぐら」を破壊し、山札からカードを" +
          drawn +
          "枚引きました。",
      );
    }
    return;
  }
  if (c.name === "ゴジラ") {
    const eligible = p.hand.filter(
      (card) =>
        card.kind === "follower" &&
        fieldNumber(card) >= 5 &&
        true,
    );
    if (!eligible.length) {
      log(
        "ゴジラのファンファーレ：手札に「数字5以上」のフォロワーがいないため、破壊しません。",
      );
      return;
    }
    if (p.human) {
      G.pendingGodzilla = true;
      G.godzillaResolved = false;
      log(
        "ゴジラのファンファーレ：対象を選んで破壊するか、「破壊しない」を選んでください。",
      );
    } else {
      const chosen = eligible[Math.floor(Math.random() * eligible.length)];
      destroyHandCard(p, chosen, "ゴジラ", "7");
      log(
        "ゴジラのファンファーレ：手札の「" +
          chosen.name +
          "」（数字" +
          chosen.number +
          "）を破壊しました。",
      );
    }
    return;
  }
  if (c.name === "ウェスカー") {
    const eligible = p.grave.filter(
      (card) =>
        card.kind === "follower" &&
        card.tribe === "魔種族" &&
        fieldNumber(card) <= 5,
    );
    if (!eligible.length) {
      log(
        "ウェスカーのファンファーレ：墓地に数字5以下の魔種族フォロワーがいないため、効果を終了します。",
      );
      return;
    }
    if (p.human) {
      G.pendingMadoka = true;
      G.madokaOwner = pi;
      G.madokaPickMode = "wesker";
      showMadokaDeck();
      log(
        "ウェスカーのファンファーレ：墓地から数字5以下の魔種族フォロワーを1枚選んで手札に加えてください。選択するまでゲームは停止します。",
      );
    } else {
      const chosen = eligible[Math.floor(Math.random() * eligible.length)];
      p.grave = p.grave.filter((card) => card.id !== chosen.id);
      p.hand.push(chosen);
      addTitleProgress(pi,"wesker_recover");
      log(
        "ウェスカーのファンファーレ：CPUは墓地から数字" +
          chosen.number +
          "の魔種族フォロワー「" +
          chosen.name +
          "」を手札に加えました。",
      );
    }
    return;
  }
  if (c.name === "リボンちゃん") {
    const eligible = p.grave.filter(
      (card) =>
        card.kind === "follower" && ["5", "6"].includes(currentNumberLabel(card)),
    );
    if (!eligible.length) {
      log(
        "リボンちゃんのファンファーレ：墓地に数字5または6のフォロワーがいないため、効果を終了します。",
      );
      return;
    }
    if (p.human) {
      G.pendingMadoka = true;
      G.madokaOwner = pi;
      G.madokaPickMode = "ribbon";
      showMadokaDeck();
      log(
        "リボンちゃんのファンファーレ：墓地から数字5または6のフォロワーを1枚選んで手札に加えてください。選択するまでゲームは停止します。",
      );
    } else {
      const chosen = eligible[Math.floor(Math.random() * eligible.length)];
      p.grave = p.grave.filter((card) => card.id !== chosen.id);
      p.hand.push(chosen);
      log(
        "リボンちゃんのファンファーレ：CPUは墓地から数字" +
          chosen.number +
          "のフォロワー「" +
          chosen.name +
          "」を手札に加えました。",
      );
    }
    return;
  }
  if (c.name === "錦木千束") {
    const eligible = p.deck.filter((card) => isChizukoNoEffectFollower(card));
    if (!eligible.length) {
      log(
        "錦木千束のファンファーレ：山札に「効果なし」のフォロワーがいないため、効果を終了します。",
      );
      return;
    }
    if (p.human) {
      G.pendingMadoka = true;
      G.madokaOwner = pi;
      G.madokaPickMode = "chizuko";
      showMadokaDeck();
      log(
        "錦木千束のファンファーレ：山札から「効果なし」のフォロワーを最大3枚選んで手札に加えてください。1〜3枚で確定できます。",
      );
    } else {
      const chosen = shuffle(eligible.slice()).slice(0, 3);
      chosen.forEach((card) => {
        card.chizukoTitleMarked = true;
        p.deck = p.deck.filter((x) => x.id !== card.id);
        p.hand.push(card);
      });
      p.deck = shuffle(p.deck);
      log(
        "錦木千束のファンファーレ：CPUは山札から「効果なし」のフォロワー" +
          chosen.length +
          "枚を手札に加え、その後山札をシャッフルしました。",
      );
    }
    return;
  }
  if (c.name === "鹿目まどか") {
    const eligible = p.deck.filter(
      (card) => card.kind === "follower" && card.tribe === "魔種族",
    );
    if (!eligible.length) {
      log(
        "鹿目まどかのファンファーレ：山札に選択できる魔種族フォロワーがいないため、効果を終了します。",
      );
      return;
    }
    if (p.human) {
      G.pendingMadoka = true;
      G.madokaOwner = pi;
      showMadokaDeck();
      log(
        "鹿目まどかのファンファーレ：山札を確認し、魔種族フォロワーを1枚選んでください。選択するまでゲームは停止します。",
      );
    } else {
      const chosen = eligible[Math.floor(Math.random() * eligible.length)];
      p.deck = p.deck.filter((card) => card.id !== chosen.id);
      p.hand.push(chosen);
      p.deck = shuffle(p.deck);
      log(
        "鹿目まどかのファンファーレ：CPUは山札から魔種族フォロワー「" +
          chosen.name +
          "」を手札に加え、山札をシャッフルしました。",
      );
    }
    return;
  }
  if (c.name === "ホルス") {
    const eligible = p.deck.filter(
      (card) => card.kind === "follower" && card.tribe === "神種族",
    );
    if (!eligible.length) {
      log(
        "ホルスのファンファーレ：山札に選択できる神種族フォロワーがいないため、効果を終了します。",
      );
      return;
    }
    if (p.human) {
      G.pendingMadoka = true;
      G.madokaPickMode = "horus";
      G.madokaOwner = pi;
      showMadokaDeck();
      log(
        "ホルスのファンファーレ：山札を確認し、神種族フォロワーを1枚選んでください。選択するまでゲームは停止します。",
      );
    } else {
      const chosen = eligible[Math.floor(Math.random() * eligible.length)];
      p.deck = p.deck.filter((card) => card.id !== chosen.id);
      p.hand.push(chosen);
      p.deck = shuffle(p.deck);
      log(
        "ホルスのファンファーレ：CPUは山札から神種族フォロワー「" +
          chosen.name +
          "」を手札に加え、山札をシャッフルしました。",
      );
    }
    return;
  }
  if (c.name === "星野アイ") {
    G.pendingHoshinoAi = true;
    G.hoshinoAiOwner = pi;
    G.hoshinoAiSelections = G.players.map(()=>[]);
    G.hoshinoAiConfirmed = G.players.map((pl) => !pl.human);
    locked = !onlineMode;
    G.players.forEach((pl, i) => {
      const eligible = pl.hand.filter(
        (card) => card.kind === "follower" && card.tribe === "英種族",
      );
      if (pl.human) return;
      const count = Math.min(eligible.length, Math.floor(Math.random() * 3));
      G.hoshinoAiSelections[i] = shuffle(eligible)
        .slice(0, count)
        .map((card) => card.id);
      log(
        pl.name +
          "は星野アイの効果で英種族フォロワーを" +
          count +
          "枚選択しました。",
      );
    });
    showHoshinoAiPicker();
    log(
      "星野アイのファンファーレ：全プレイヤーの選択が終わるまで試合を一時停止します。各プレイヤーは手札の英種族フォロワーを0〜2枚破壊できます。",
    );
    return;
  }
  if (c.name === "ネク") {
    G.nekuOwner = pi;
    G.pendingNeku = true;
    G.nekuSelections = G.players.map(()=>null);
    G.nekuConfirmed = G.players.map(()=>false);
    G.players.forEach((pl, i) => {
      if (pl.human) {
        if (pl.hand.length === 0) {
          G.nekuSelections[i] = "";
          G.nekuConfirmed[i] = true;
          log(pl.name + "は手札がないためネクの効果をスキップします。");
        }
      } else {
        if (pl.hand.length === 0) {
          G.nekuSelections[i] = "";
          G.nekuConfirmed[i] = true;
          log(pl.name + "は手札がないためネクの効果をスキップします。");
        } else {
          const chosen = pl.hand[Math.floor(Math.random() * pl.hand.length)];
          G.nekuSelections[i] = chosen.id;
          G.nekuConfirmed[i] = true;
          log(
            pl.name +
              "は手札から「" +
              chosen.name +
              "」を選択し、効果処理を確認しました。",
          );
        }
      }
    });
    log(
      "ネクのファンファーレ：ネクは場に残ります。ゲーム進行を一時停止し、全プレイヤーが手札から1枚ずつ選びます。CPUは選択・確認済みです。あなたは手札を選び、確認ボタンを押してください。全員の確認後に破壊し、次のプレイヤーの番になります。",
    );
    return;
  }
  if (c.name === "アルル") {
    const groups = {};
    p.hand
      .filter((card) => card.kind === "follower")
      .forEach((card) => (groups[currentNumberLabel(card)] ??= []).push(card));
    const pairs = Object.values(groups).filter((arr) => arr.length >= 2);
    if (!pairs.length) {
      log(
        "アルルのファンファーレ：手札に同じ数字のフォロワーが2枚以上ないため、効果は発動しません。",
      );
      return;
    }
    if (p.human) {
      G.pendingAruru = true;
      G.aruruSelections = [];
      G.aruruResolved = false;
      log(
        "アルルのファンファーレ：アルルは場に残ります。ゲーム進行を一時停止し、手札から同じ数字のフォロワーを2枚選んでください。効果処理完了後、次のプレイヤーの番になります。",
      );
    } else {
      const pair = pairs[Math.floor(Math.random() * pairs.length)];
      const chosen = shuffle(pair).slice(0, 2);
      chosen.forEach((card) => destroyHandCard(p, card, "アルル", "5"));
      log(
        "アルルのファンファーレ：CPUは同じ数字（" +
          chosen[0].number +
          "）のフォロワー「" +
          chosen[0].name +
          "」「" +
          chosen[1].name +
          "」を破壊しました。",
      );
    }
    return;
  }
  if (c.name === "ハルク") {
    if (!p.hand.length) {
      log(
        "ハルクのファンファーレ：破壊できる手札がないため、効果を処理しません。",
      );
      return;
    }
    if (p.human) {
      G.pendingHulk = true;
      G.hulkResolved = false;
      log(
        "ハルクのファンファーレ：破壊したい手札のカードを1枚クリックしてください。カードの種類や数字は問いません。",
      );
    } else {
      const chosen = p.hand[Math.floor(Math.random() * p.hand.length)];
      destroyHandCard(p, chosen, "ハルク", "4");
      log(
        "ハルクのファンファーレ：手札から「" +
          chosen.name +
          "」を選んで破壊しました。",
      );
    }
    return;
  }
  const m = text.match(/^(?:自分の)?山札からカードを(\d+)枚引く。?$/);
  if (m) {
    const count = Number(m[1]);
    const drawn = drawCards(p, count);
    log("ファンファーレ発動：「" + c.name + "」で" + drawn + "枚ドロー。");
    return;
  }
  if (/山札からカードを\d+枚引く|山札からカードを1枚引く/.test(text))
    log(
      "「" +
        c.name +
        "」のファンファーレは未実装の追加条件を含むため、まだ処理していません。",
    );
}
function playRoxasBgm() {
  // Roxas is a character BGM too, so it overrides any ongoing theme.
  const audio=document.getElementById("roxasBgm");
  if(!audio)return;
  startCharacterBgm(audio.getAttribute('src')||audio.src,{baseVolume:1});
}
let allMightAudioContext = null;
let allMightAudioBuffer = null;
let allMightAudioReady = null;
let allMightAudioUnlocked = false;
function prepareAllMightEffectSound() {
  const audio = document.getElementById("allMightEffectSound");
  if (!audio) return;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return;
  try {
    if (!allMightAudioContext) allMightAudioContext = (window.DAISHUGO_AUDIO?.context() || new AudioContextClass());
    if (!allMightAudioReady) {
      allMightAudioReady = fetch(audio.src)
        .then((r) => r.arrayBuffer())
        .then((data) => allMightAudioContext.decodeAudioData(data))
        .then((buffer) => {
          allMightAudioBuffer = buffer;
          return buffer;
        })
        .catch(() => {
          allMightAudioReady = null;
        });
    }
  } catch (e) {}
}
function unlockAllMightAudio() {
  prepareAllMightEffectSound();
  if (!allMightAudioContext) return;
  try {
    const resumePromise = allMightAudioContext.resume();
    allMightAudioUnlocked = true;
    if (resumePromise && typeof resumePromise.catch === "function")
      resumePromise.catch(() => {
        allMightAudioUnlocked = false;
      });
  } catch (e) {}
}
document.addEventListener("pointerdown", unlockAllMightAudio, true);
document.addEventListener("touchstart", unlockAllMightAudio, true);
document.addEventListener("keydown", unlockAllMightAudio, true);
function playAllMightEffectSound() {
  prepareAllMightEffectSound();
  if (allMightAudioContext && allMightAudioBuffer && allMightAudioUnlocked) {
    try {
      if (allMightAudioContext.state !== "running")
        allMightAudioContext.resume();
      const source = allMightAudioContext.createBufferSource();
      source.buffer = allMightAudioBuffer;
      source.connect(allMightAudioContext.destination);
      source.start(0);
      return;
    } catch (e) {}
  }
  const audio = document.getElementById("allMightEffectSound");
  if (!audio) return;
  try {
    audio.pause();
    audio.currentTime = 0;
    const result = audio.play();
    if (result && typeof result.catch === "function")
      result.catch(() =>
        log(
          "オールマイト効果音：音声の準備またはブラウザの再生許可が間に合いませんでした。",
        ),
      );
  } catch (e) {
    log("オールマイト効果音を再生できませんでした。");
  }
}
function doPlay(pi, idx, spellId = null, effectPlay = false) {
  G.effectSequence = (G.effectSequence || 0) + 1;
  let p = G.players[pi],
    c = p.hand[idx];
  if (!effectPlay && !canPlay(c, p, p.hand.find(x=>x.id===spellId))) return false;
  const buttercupFreeCostAtPlay =
    c.name === "バターカップ" && effectiveCost(c, p) === 0;
  if (c.name === "バターカップ")
    c.buttercupFreeCostAtPlay = buttercupFreeCostAtPlay;
  const allMightBelow = G.field.length
    ? G.field[G.field.length - 1].card
    : null;
  const allMightFlowTrigger =
    c.name === "オールマイト" &&
    allMightBelow &&
    allMightBelow.kind === "follower" &&
    Number(fieldNumber(allMightBelow)) === 3;
  let spell = spellId ? p.hand.find((x) => x.id === spellId) : null;
  let total = effectPlay ? 0 : effectiveCost(c, p) + (spell ? spell.cost : 0);
  if (total > availableCost(p, spell)) return false;
  if (spell?.name === "アルセウスフォン" && !spell.excelResolved) {
    const choices = p.deck.filter(x => x.kind === "follower" && x.tribe === "霊種族");
    if (choices.length) {
      beginExcelChoice({owner:pi, source:spell.name, stage:"phone", ids:choices.map(x=>x.id), min:1, max:1, followerId:c.id, spellId:spell.id});
      return true;
    }
  }
  if(spell?.name==='キラー'&&!spell.excelResolved&&p.deck.length){
    beginExcelChoice({owner:pi,source:spell.name,stage:'killer',ids:['add','destroy'],revealed:[p.deck[p.deck.length-1]],min:1,max:1,followerId:c.id,spellId:spell.id});return true;
  }
  p.victoryBlockedByL=c.number === "L";
  if (c.number === "L") p.playedLRounds = [...new Set([...(p.playedLRounds || []), G.turn])].filter(n => n >= G.turn - 1);
  if (pi >= 0 && G.titleMatchProgress) {
    if (
      c.name === "ロクサス" &&
      effectiveCost(c, p) === 0 &&
      p.grave.some((x) => x.name === "ソラ")
    )
      addTitleProgress(pi, "roxas_zero");
    if (c.name === "ネート") addTitleProgress(pi, "neito_play");
    if (
      c.name === "球磨川禊" &&
      allMightBelow &&
      String(allMightBelow.number) === "L"
    )
      addTitleProgress(pi, "kumagawa_l");
    if (c.name === "鹿目まどか") addTitleProgress(pi, "madoka_play");
    if (
      c.name === "くちぱっち" &&
      G.field.some((entry) => entry.card && entry.card.kind === "follower")
    )
      addTitleProgress(pi, "kuchipatchi_field");
    if (
      c.name === "カレーパンマン" &&
      G.field.some((entry) => entry.card && entry.card.kind === "follower")
    )
      addTitleProgress(pi, "curry_field");
    if (
      c.name === "リュウ" &&
      G.field.some((entry) => entry.card && entry.card.kind === "follower")
    )
      addTitleProgress(pi, "wandering_fighter_ryu");
    if (c.name === "アヤシシ") addTitleProgress(pi, "barrier_rush_ayashishi");
    const owned = [
      ...p.hand,
      ...p.deck,
      ...p.grave,
      ...G.field
        .filter((entry) => entry.player === pi)
        .map((entry) => entry.card),
    ];
    const fiveCount = owned.filter(
      (card) => card.kind === "follower" && String(card.number) === "5",
    ).length;
    const sixCount = owned.filter(
      (card) => card.kind === "follower" && String(card.number) === "6",
    ).length;
    if (fiveCount === 4 && sixCount === 4) addTitleProgress(pi, "five_six_deck");
  }
  if(buttercupFreeCostAtPlay)addTitleProgress(pi,'buttercup_zero');
  if(c.name==='マキマ')addTitleProgress(pi,'makima_play');
  if(c.name==='ヒソカ'&&allMightBelow?.kind==='follower'&&fieldNumber(allMightBelow)===7)addTitleProgress(pi,'hisoka_seven');
  G.playEvent = {
    sequence: G.effectSequence,
    playedAt: Date.now(),
    actor: pi,
    card: { id: c.id, name: c.name, number: c.number, effectActivated: c.name === "ともだち" ? tomodachiCanActivate() : true },
    below: allMightBelow
      ? {
          kind: allMightBelow.kind,
          name: allMightBelow.name,
          number: String(fieldNumber(allMightBelow)),
        }
      : null,
  };
  G.playEvents=[...(G.playEvents||[]),G.playEvent].slice(-64);
  let ids = [c.id];
  if (spell) ids.push(spell.id);
  p.hand = p.hand.filter((x) => !ids.includes(x.id));
  p.cost = availableCost(p, spell) - total;
  G.players.forEach((x) => (x.passed = false));
  G.passes = 0;
  p.activated = false;
  if (spell && spell.name === "鬼人薬") {
    c.bp = Number(c.bp || 0) + 4000;
    c.demonDrugBoost = true;
    c.demonDrugBonus = (Number(c.demonDrugBonus)||0) + 4000;
    log(
      "鬼人薬の効果：" +
        c.name +
        "のBPが+4000され、BP " +
        Number(c.bp).toLocaleString() +
        "で場に出ます。",
    );
  }
  if (
    spell &&
    spell.name === "ビッグライト" &&
    c.kind === "follower" &&
    c.number !== "L"
  ) {
    c.bigLightBoost = true;
    log(
      "ビッグライトの効果：" +
        c.name +
        "の数字が" +
        c.number +
        "から" +
        fieldNumber(c) +
        "に+1され、数字が発光表示されます。",
    );
  }
  if(spell?.name==='キュリア') {
    G.qurioBonus=(G.qurioBonus||0)+2; G.qurioUsed=true;
    log('キュリア：場が流れるまで全員の手札・場の龍種族は数字+2。メルゼナは優先的に7になります。');
  }
  G.field.push({ player: pi, card: c });
  if(c.name==='スルト'){
    const surtNumber=fieldNumber(c);
    G.playEvent.card.surtMeteorActive=surtNumber>=3 && surtNumber!==Number(c.number);
    if(G.playEvent.card.surtMeteorActive)window.playSurtMeteors?.();
  }
  if(G.newWordBuffOwner===pi&&c.number!=='L'&&fieldNumber(c)===7){
    const owner=G.newWordBuffOwner;G.newWordBuffOwner=null;
    const without=fieldNumber(c);G.newWordBuffOwner=owner;
    if(without<7)addTitleProgress(pi,'newword_seven');
  }
  if (spell?.name === "サラマンダーブレス" && c.tribe === "龍種族") {
    collectEffectResults();startEffectResults(pi,spell.name);
    G.players.forEach((op, oi) => {
      if (oi === pi) return;
      const followers = op.hand.filter(x=>x.kind === "follower");
      const highest = Math.max(...followers.map(x=>x.number === "L" ? Infinity : fieldNumber(x)));
      const choices = followers.filter(x=>(x.number === "L" ? Infinity : fieldNumber(x)) === highest);
      if (choices.length) destroyHandCard(op, choices[Math.floor(Math.random()*choices.length)], spell.name, "S");
    });
    collectEffectResults(true);G.effectResultContext=null;
  }
  if (
    c.name === "球磨川禊" &&
    allMightBelow &&
    String(allMightBelow.number) === "L"
  ) {
    locked = true;
    const overlay = document.createElement("div");
    recordFollowerEffect(pi,c.name);
    overlay.id = "kumagawaEntryOverlay";
    overlay.innerHTML =
      '<img src="./effects/assets/kumagawa-entry.png" alt="球磨川禊 登場演出">';
    overlay.style.cssText =
      "position:fixed;inset:0;z-index:999999;background:rgba(0,0,0,.94);display:flex;align-items:center;justify-content:center;opacity:0;animation:kumagawaEntryFade .18s ease-out forwards;";
    const style = document.createElement("style");
    style.id = "kumagawaEntryStyle";
    style.textContent =
      "@keyframes kumagawaEntryFade{to{opacity:1}}#kumagawaEntryOverlay img{display:block;max-width:100vw;max-height:100vh;width:100%;height:100%;object-fit:contain;animation:kumagawaEntryZoom 2s cubic-bezier(.16,.75,.25,1) both}@keyframes kumagawaEntryZoom{0%{transform:scale(1.12);filter:brightness(.55)}35%{transform:scale(1);filter:brightness(1.12)}100%{transform:scale(1);filter:brightness(1)}}";
    document.head.appendChild(style);
    document.body.appendChild(overlay);
    const entryAudio = new Audio("./effects/assets/kumagawa-audio.m4a");
    entryAudio.preload = "auto";
    entryAudio.volume = 1;
    entryAudio
      .play()
      .catch(() =>
        log(
          "球磨川禊の登場音声を再生できませんでした。ブラウザの音声再生設定を確認してください。",
        ),
      );
    log("球磨川禊の登場演出：画像と音声を2秒間再生します。");
    render();
    window.setTimeout(() => {
      entryAudio.pause();
      try {
        entryAudio.currentTime = 0;
      } catch (e) {}
      overlay.remove();
      style.remove();
      locked = false;
      if (G && !G.winner) {
        checkWinner();
        if (!G.winner) afterAction(pi);
        else render();
      } else render();
    }, 2000);
    return true;
  }
  if (
    pi >= 0 &&
    G.titleMatchProgress &&
    c.name === "スルト" &&
    Number(fieldNumber(c)) >= 4
  )
    addTitleProgress(pi, "surt_4plus");
  if (c.name === "ロクサス") {
    playRoxasBgm();
    log("ロクサスが手札から場に出たため、BGMの6:50〜6:55を再生しました。");
  }
  if (spell) {
    p.grave.push(spell);
    if (
      spell.name === "キュリア" ||
      spell.name === "ハッスルねじ" ||
      spell.name === "アルセウスフォン" ||
      spell.name === "サラマンダーブレス" ||
      spell.name === "スーパーキノコ" ||
      spell.name === "鬼人薬" ||
      spell.name === "ヴィブラニウム" ||
      spell.name === "ビッグライト"
    ) {
      log(
        p.name +
          "はスペル「" +
          spell.name +
          "」をフォロワーと同時使用し、効果を解決しました。",
      );
    } else {
      log(
        p.name +
          "はスペル「" +
          spell.name +
          "」をフォロワーと同時使用（効果未実装）。",
      );
    }
  }
  G.passes = 0;
  log(
    p.name +
      "が「" +
      c.name +
      "」（数字 " +
      c.number +
      " / BP " +
      c.bp +
      " / コスト" +
      c.cost +
      "）を出しました。",
  );
  beginFollowerEffect(pi,c);
  const intrinsicActive = (c.name==='スルト'&&p.hand.length>=5)
    || (c.name==='ソラ'&&G.field.some(x=>x.card.id!==c.id&&x.card.tribe==='英種族'))
    || (c.name==='メルゼナ'&&G.qurioUsed)
    || (c.name==='ロクサス'&&effectiveCost(c,p)===0)
    || (c.name==='ジェネシスドラゴン'&&p.deck.length===0)
    || (c.name==='ヒソカ'&&allMightBelow?.kind==='follower'&&fieldNumber(allMightBelow)===7)
    || (c.name==='球磨川禊'&&allMightBelow?.number==='L')
    || ['仮面ライダーダブル','梅喧','雪ミク'].includes(c.name)
    || buttercupFreeCostAtPlay;
  if(intrinsicActive)recordFollowerEffect(pi,c.name);
  if (c.name === "仮面ライダーダブル") {
    log(
      "仮面ライダーダブルのファンファーレ：場に出たため数字が4から6に変化しました。",
    );
  }
  if (c.name === "ガブリエル") {
    G.gabrielPendingOwner = pi;
    log(
      "ガブリエルの効果待機：ガブリエルを場に出しました。他のプレイヤー全員がパスして場が流れると、効果が発動します。",
    );
    return true;
  }
  if (c.name === "ニューワード") {
    G.newWordPendingOwner = pi;
    log(
      "ニューワードの効果待機：ニューワードを場に出しました。残りのプレイヤーがパスして場が流れると、次の自分の番の数字上昇効果が発動します。",
    );
    return true;
  }
  if (/^シェリー[＆&]ブラ[コゴ]$/.test(String(c.name || ""))) { applySherryState(); render(); return true; }
  if (c.name === "オールマイト") {
    const drawn = drawCards(p, 1);
    log(
      "オールマイトのファンファーレ：山札からカードを" +
        drawn +
        "枚引きました。",
    );
    if (allMightFlowTrigger) {
      locked = true;
      playAllMightEffectSound();
      const overlay = document.getElementById("allMightEffectOverlay");
      if (overlay) {
        overlay.classList.add("show");
        overlay.setAttribute("aria-hidden", "false");
      }
      log(
        "オールマイトの効果発動：直下のフォロワーの数字が3のため、2秒後にパス状況に関係なく場を流します。「私が来た！」",
      );
      render();
      setTimeout(() => {
        if (overlay) {
          overlay.classList.remove("show");
          overlay.setAttribute("aria-hidden", "true");
        }
        if (G && !G.winner) {
          flow(pi);
        }
        locked = false;
        render();
        if (G && !G.winner && !isLocalTurn()) cpuLoop();
      }, 2000);
      checkWinner();
      return true;
    }
    checkWinner();
    return true;
  }
  if (c.name === "ネルギガンテ") {
    locked = true;
    const thornOverlay = document.getElementById("nergiganteThornStageOverlay");
    const thornAudio = document.getElementById("nergiganteStageSound");
    if (thornAudio) {
      try {
        thornAudio.pause();
        thornAudio.currentTime = 0;
        const playPromise = thornAudio.play();
        if (playPromise && typeof playPromise.catch === "function")
          playPromise.catch(() =>
            log(
              "ネルギガンテの演出音声：ブラウザの再生制限により音声を再生できませんでした。",
            ),
          );
      } catch (e) {
        log("ネルギガンテの演出音声を再生できませんでした。");
      }
    }
    if (thornOverlay) {
      thornOverlay.innerHTML = "";
      const addEffect = (tag, cls, style = "") => {
        const el = document.createElement(tag);
        el.className = cls;
        if (style) el.style.cssText = style;
        thornOverlay.appendChild(el);
        return el;
      };
      addEffect("i", "impact-core");
      addEffect("i", "shockwave", "--delay:.22s");
      addEffect("i", "shockwave", "--delay:.38s");
      addEffect("i", "flash");
      // 画面の外周から中心へ、巨大な黒棘が時間差で一斉に突き刺さる
      for (let i = 0; i < 58; i++) {
        const thorn = document.createElement("i");
        thorn.className = "thorn";
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
        const w = (18 + Math.random() * 48).toFixed(1) + "px";
        const h = (170 + Math.random() * 310).toFixed(1) + "px";
        const rot =
          (
            Math.random() * 110 -
            55 +
            (side === 1 || side === 3 ? 90 : 0)
          ).toFixed(1) + "deg";
        const dx = ((50 - x) * (0.7 + Math.random() * 0.45)).toFixed(0) + "vw";
        const dy = ((50 - y) * (0.7 + Math.random() * 0.45)).toFixed(0) + "vh";
        const delay = (0.08 + Math.random() * 0.42).toFixed(3) + "s";
        thorn.style.cssText =
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
        thornOverlay.appendChild(thorn);
      }
      // 爆風で飛び散る岩片・棘の破片
      for (let i = 0; i < 52; i++) {
        const debris = document.createElement("i");
        debris.className = "debris";
        const angle = Math.random() * Math.PI * 2,
          dist = 25 + Math.random() * 65;
        const tx = (Math.cos(angle) * dist).toFixed(1) + "vw",
          ty = (Math.sin(angle) * dist).toFixed(1) + "vh";
        const size = (5 + Math.random() * 22).toFixed(1) + "px";
        const delay = (0.28 + Math.random() * 0.28).toFixed(3) + "s";
        debris.style.cssText =
          "--x:" +
          (45 + Math.random() * 10).toFixed(2) +
          "%;--y:" +
          (42 + Math.random() * 16).toFixed(2) +
          "%;--size:" +
          size +
          ";--tx:" +
          tx +
          ";--ty:" +
          ty +
          ";--spin:" +
          (Math.random() * 720 - 360).toFixed(0) +
          "deg;--delay:" +
          delay +
          ";";
        thornOverlay.appendChild(debris);
      }
      thornOverlay.classList.remove("show");
      void thornOverlay.offsetWidth;
      thornOverlay.classList.add("show");
      thornOverlay.setAttribute("aria-hidden", "false");
    }
    log(
      "ネルギガンテの登場演出：巨大な衝撃波と閃光が広がり、黒い棘と岩片が画面全体へ炸裂します。専用音声とともに4.3秒間、試合進行を停止します。",
    );
    render();
    window.setTimeout(() => {
      if (thornAudio) {
        thornAudio.pause();
        try {
          thornAudio.currentTime = 0;
        } catch (e) {}
      }
      if (thornOverlay) {
        thornOverlay.classList.remove("show");
        thornOverlay.setAttribute("aria-hidden", "true");
        thornOverlay.innerHTML = "";
      }
      locked = false;
      if (G && !G.winner) {
        resolveFanfare(pi, c);
        checkWinner();
      }
      if (G && !G.winner) {
        afterAction(pi);
      } else {
        render();
      }
    }, 4300);
    return true;
  }
  if (c.name === "成歩堂龍一") {
    locked = true;
    const objectionOverlay = document.getElementById(
      "naruhodoObjectionOverlay",
    );
    const objectionAudio = document.getElementById("naruhodoObjectionSound");
    if (objectionOverlay) {
      objectionOverlay.classList.add("show");
      objectionOverlay.setAttribute("aria-hidden", "false");
    }
    if (objectionAudio) {
      try {
        objectionAudio.currentTime = 0;
        const playPromise = objectionAudio.play();
        if (playPromise && typeof playPromise.catch === "function")
          playPromise.catch(() =>
            log(
              "成歩堂龍一の効果音：ブラウザの再生制限により音声を再生できませんでした。",
            ),
          );
      } catch (e) {
        log("成歩堂龍一の効果音を再生できませんでした。");
      }
    }
    log("成歩堂龍一の演出：「異議あり！」。2秒間、試合進行を停止します。");
    render();
    setTimeout(() => {
      if (objectionOverlay) {
        objectionOverlay.classList.remove("show");
        objectionOverlay.setAttribute("aria-hidden", "true");
      }
      if (objectionAudio) {
        objectionAudio.pause();
        objectionAudio.currentTime = 0;
      }
      locked = false;
      if (G && !G.winner) {
        resolveFanfare(pi, c);
        checkWinner();
      }
      if (G && !G.winner) {
        // 演出中は doPlay 後の通常ターン進行が保留されるため、
        // 効果解決後に通常の afterAction で次のプレイヤーへ番を渡す。
        afterAction(pi);
      } else {
        render();
      }
    }, 2000);
    return true;
  }
  if (c.name === "マキマ") {
    G.makimaPending = true;
    log(
      "マキマの効果待機：山札から2枚引き、場が流れた後に全プレイヤーの手札・場の英種族を+2、魔種族を-2します。",
    );
    const drawn = drawCards(p, 2);
    log("マキマのファンファーレ：山札からカードを" + drawn + "枚引きました。");
    return true;
  }
  if (c.name === "うちはマダラ") {
    locked = true;
    const stage = document.getElementById("madaraSharinganStage");
    const sound = document.getElementById("madaraSharinganSound");
    if (stage) {
      stage.classList.remove("active");
      void stage.offsetWidth;
      stage.classList.add("active");
      stage.setAttribute("aria-hidden", "false");
    }
    if (sound) {
      try {
        sound.pause();
        sound.currentTime = 0;
        sound.volume = 1;
        const playPromise = sound.play();
        if (playPromise && typeof playPromise.catch === "function")
          playPromise.catch(() =>
            log("うちはマダラの演出音声を再生できませんでした。"),
          );
      } catch (e) {
        log("うちはマダラの演出音声を再生できませんでした。");
      }
    }
    log("うちはマダラの登場演出：写輪眼が発動。2秒間、試合を停止します。");
    render();
    setTimeout(() => {
      if (stage) {
        stage.classList.remove("active");
        stage.setAttribute("aria-hidden", "true");
      }
      if (sound) {
        sound.pause();
        try {
          sound.currentTime = 0;
        } catch (e) {}
      }
      locked = false;
      if (G && !G.winner) {
        resolveFanfare(pi, c);
        checkWinner();
      }
      if (G && !G.winner) {
        afterAction(pi);
      } else {
        render();
      }
    }, 2000);
    return true;
  }
  if (c.name === "ルクソード" && luxordCanActivate(pi)) {
    const count = luxordTargetCount();
    // The event is transmitted with the same count to all online seats.
    if (G.playEvent?.card) {
      G.playEvent.card.luxordTargetCount = count;
      G.playEvent.card.effectActivated = true;
    }
    const match = G, sequence = G.effectSequence;
    locked = true;
    G.actionLocked = true;
    log('ルクソード：破壊対象Lフォロワー' + count + '枚のカードを散らし、3秒間試合を停止します。');
    render();
    window.playLuxordEntry?.(count, () => {
      if (G !== match || G.effectSequence !== sequence) return;
      locked = false;
      G.actionLocked = false;
      if (!G.winner) resolveFanfare(pi, c);
      if (!hasPendingEffect()) checkWinner();
      if (!G.winner) afterAction(pi); else render();
      notifyGameChanged();
    }, c.id);
    return true;
  }
  if (c.name === "ルクソード" && G.playEvent?.card) {
    G.playEvent.card.effectActivated = false;
    G.playEvent.card.luxordTargetCount = 0;
  }
  if (c.name === "アルセウス") {
    const match = G, sequence = G.effectSequence;
    locked = true;
    G.actionLocked = true;
    log("アルセウス：鳴き声と創造の光を10秒間再生し、試合を停止します。");
    render();
    window.playArceusEntry?.(() => {
      if (G !== match || G.effectSequence !== sequence) return;
      locked = false;
      G.actionLocked = false;
      if (!G.winner) resolveFanfare(pi, c);
      if (!hasPendingEffect()) checkWinner();
      if (!G.winner) afterAction(pi); else render();
      notifyGameChanged();
    });
    return true;
  }
  if (c.name === "ドクタードゥーム") {
    const match = G, sequence = G.effectSequence;
    locked = true;
    G.actionLocked = true;
    log("ドクタードゥーム：登場演出を5秒間再生します。");
    window.playDoomEntry?.(() => {
      if (G !== match || G.effectSequence !== sequence) return;
      locked = false;
      G.actionLocked = false;
      if (!G.winner) resolveFanfare(pi, c);
      if (!hasPendingEffect()) checkWinner();
      if (!G.winner) afterAction(pi); else render();
      notifyGameChanged();
    });
    render();
    return true;
  }
  if (c.name === "ともだち" && tomodachiCanActivate()) {
    const matchId=G.matchId, sequence=G.effectSequence;
    locked=true;G.actionLocked=true;
    log("ともだち：ケンヂ君。7秒間、試合を停止します。");
    window.playTomodachiEntry(()=>{
      if(!G || G.matchId!==matchId || G.effectSequence!==sequence)return;
      locked=false;G.actionLocked=false;
      if(!G.winner)resolveFanfare(pi,c);
      if(!hasPendingEffect())checkWinner();
      if(!G.winner)afterAction(pi);else render();
    });
    render();
    return true;
  }
  if (c.name === "大魔王ゾーマ") {
    const matchId=G.matchId, sequence=G.effectSequence;
    locked=true;G.actionLocked=true;
    log("大魔王ゾーマ：2秒間、試合を停止します。");
    window.playZomaEntry(()=>{
      if(!G || G.matchId!==matchId || G.effectSequence!==sequence)return;
      locked=false;G.actionLocked=false;
      if(!G.winner)resolveFanfare(pi,c);
      if(!hasPendingEffect())checkWinner();
      if(!G.winner)afterAction(pi);else render();
    });
    render();
    return true;
  }
  if (c.name === "鹿目まどか") {
    const match=G, sequence=G.effectSequence;
    locked=true;
    log("鹿目まどかの登場演出：3秒間、試合を停止します。");
    window.playMadokaEntry(()=>{
      if(G!==match || G.effectSequence!==sequence)return;
      locked=false;
      if(!G.winner)resolveFanfare(pi,c);
      if(!hasPendingEffect())checkWinner();
      if(!G.winner)afterAction(pi);else render();
    });
    render();
    return true;
  }
  if (c.name === "アヴァ") {
    const match=G, sequence=G.effectSequence;
    locked=true;
    log("アヴァの登場演出：3.5秒間、試合を停止します。");
    window.playAvaEntry?.(()=>{
      if(G!==match || G.effectSequence!==sequence)return;
      locked=false;
      if(!G.winner)resolveFanfare(pi,c);
      if(!hasPendingEffect())checkWinner();
      if(!G.winner)afterAction(pi);else render();
    });
    render();
    return true;
  }
  if (c.name === "ハルク") {
    const match=G, sequence=G.effectSequence;
    locked=true;
    log("ハルクの登場演出：岩を破壊！3秒間、試合を停止します。");
    window.playHulkEntry(()=>{
      if(G!==match || G.effectSequence!==sequence)return;
      locked=false;
      if(!G.winner)resolveFanfare(pi,c);
      if(!hasPendingEffect())checkWinner();
      if(!G.winner)afterAction(pi);else render();
    });
    render();
    return true;
  }
  resolveFanfare(pi, c);
  if (!hasPendingEffect()) checkWinner();
  return true;
}
function pass() {
  if (
    !G ||
    G.winner ||
    locked ||
    G.initialLeadPending ||
    hasPendingEffect() ||
    !isLocalTurn() ||
    window.DAISHUGO_ONLINE_ADAPTER?.busy
  )
    return;
  const flowed = doPass(activeHumanSeat());
  if (flowed) {
    render();
    if (isCpuTurn()) cpuLoop();
  } else afterAction(activeHumanSeat());
}
function doPass(pi) {
  let p = G.players[pi];
  p.passed = true;
  G.passes++;
  log(p.name + "はパス。");
  let lastPlayer = G.field.length ? G.field[G.field.length - 1].player : -1;
  let allOpponentsPassed =
    lastPlayer >= 0 &&
    G.players.every((pl, i) => i === lastPlayer || pl.passed);
  if (G.passes >= G.players.length || allOpponentsPassed) {
    flow(lastPlayer >= 0 ? lastPlayer : pi);
    return true;
  }
  G.current = nextTurnSeat(pi);
  return false;
}
function flow(flowPlayer) {
  const top=G.field.at(-1);
  const homura=top && top.player===flowPlayer && top.card.name==='暁美ほむら' && !top.card.homuraFlowDecided && !top.card.avaReturn ? top : null;
  if(homura){beginExcelChoice({owner:homura.player,source:'暁美ほむら',stage:'homuraReturn',ids:[homura.card.id],min:0,max:1,flowPlayer});return;}

  collectEffectResults();
  G.effectResultContext=null;
  // A follower that clears the field belongs to the ending round.
  if(G.titleEffectPending&&G.field.length)recordFollowerEffect(G.titleEffectPending.owner,G.titleEffectPending.name);
  G.titleEffectPending=null;
  G.titleComboBySeat={};
  // Expire round-limited spell modifiers in every zone, including returned cards.
  const roundCards=[...G.field.map(x=>x.card),...G.players.flatMap(p=>[...p.hand,...p.deck,...p.grave])];
  for(const card of new Set(roundCards)){
    delete card.bigLightBoost;
    if(card.demonDrugBoost || card.demonDrugBonus){
      card.bp=Number(card.bp)-(Number(card.demonDrugBonus)||4000);
      delete card.demonDrugBoost;delete card.demonDrugBonus;
    }
  }
  G.qurioBonus=0; G.qurioUsed=false;
  log("全員がパス。場が流れました。");
  if (
    G.titleMatchProgress &&
    G.field.length === 1 &&
    G.field[0].player >= 0 &&
    G.field[0].card &&
    G.field[0].card.name === "仮面ライダーダブル"
  )
    addTitleProgress(G.field[0].player, "extreme_double_flow");
  if (G.sherryRestoreRevolution !== null) {
    G.revolution = G.sherryRestoreRevolution;
    G.conflict = !!G.sherryRestoreConflict;
    G.sherryRestoreConflict=null;
    G.sherryRestoreRevolution = null;
    log(
      "シェリー＆ブラコの効果終了：場が流れたため、革命状態を効果発動前に戻しました。",
    );
  }
  const activateGabriel = G.gabrielPendingOwner !== null;
  const endGabriel = G.gabrielBuffOwner !== null;
  const activateNewWord = G.newWordPendingOwner !== null;
  const endNewWord = G.newWordBuffOwner !== null;
  const activateMakima = G.makimaPending;
  const endMakima = G.makimaActive;
  G.field.forEach((x) => {
    resetSunrakuEffect(x.card);
    const returnToHand=x.card.avaReturn||x.card.homuraReturn;
    delete x.card.avaReturn;delete x.card.avaBlessedByAva;delete x.card.homuraReturn;delete x.card.homuraFlowDecided;
    G.players[x.player][returnToHand?'hand':'grave'].push(x.card);
  });
  G.field = [];
  if (activateGabriel) {
    G.gabrielBuffOwner = G.gabrielPendingOwner;
    G.gabrielPendingOwner = null;
    log(
      "ガブリエルの効果発動：場が流れたため、次に場が流れるまで自分の手札・場のフォロワーの数字が+1されます（最大7）。",
    );
  } else if (endGabriel) {
    log(
      "ガブリエルの効果終了：もう一度場が流れたため、数字+1の効果がなくなりました。",
    );
    G.gabrielBuffOwner = null;
  }
  if (activateNewWord) {
    G.newWordBuffOwner = G.newWordPendingOwner;
    G.newWordPendingOwner = null;
    log(
      "ニューワードの効果発動：場が流れたため、次に場が流れるまで自分の手札・場のフォロワーの数字が+2されます（最大7）。",
    );
  } else if (endNewWord) {
    log(
      "ニューワードの効果終了：もう一度場が流れたため、数字+2の効果がなくなりました。",
    );
    G.newWordBuffOwner = null;
  }
  if (activateMakima) {
    G.makimaActive = true;
    G.makimaPending = false;
    log(
      "マキマの効果発動：次に場が流れるまで、全プレイヤーの手札・場にある英種族フォロワーの数字を+2、魔種族フォロワーの数字を-2します。",
    );
  } else if (endMakima) {
    G.makimaActive = false;
    log("マキマの効果終了：数字変更効果がなくなりました。");
  }
  G.players.forEach((p) => {
    p.cost = 3;
    p.turnVisits = 0;
    p.passed = false;
    p.activated = false;
    if (p.deck.length) p.hand.push(p.deck.pop());
    else log(p.name + "の山札は0枚です。");
  });
  G.passes = 0;
  G.forbiddenNumber = null;
  G.forbiddenNumbers = [];
  G.players[flowPlayer].turnVisits=1;
  G.current = flowPlayer;
  G.lead = flowPlayer;
  G.turn++;
  checkWinner();
  if (!G.winner) log(G.players[G.current].name + "から再開。コストは3に回復。");
}
function checkWinner() {
  if(!G||G.winner||effectResolutionDepth>0||locked||hasPendingEffect()||G.initialLeadPending)return;
  finishFollowerEffect();
  G.players.forEach(p=>{if([...p.hand,...p.deck].some(c=>c.kind==="follower"))p.victoryBlockedByL=false;});
  if(startResultPresentation(G.current))return;
  if(Number.isInteger(G.exodiaVictoryOwner)){
    const owner=G.exodiaVictoryOwner;delete G.exodiaVictoryOwner;
    if(canWinWithExodia(G.players[owner])){
      G.winner={index:owner,reason:'exodia'};commitTitleProgress();
      log('勝利！'+G.players[owner].name+'は封印されしエクゾディアの効果で特殊勝利しました。');return;
    }
  }
  let winners = G.players
    .map((p, i) => ({ p, i }))
    .filter(
      (x) =>
        !x.p.victoryBlockedByL && ![...x.p.hand,...x.p.deck].some((c) => c.kind === "follower"),
    );
  if (winners.length) {
    winners.sort(
      (a, b) => turnDistance(a.i,G.current)-turnDistance(b.i,G.current),
    );
    G.winner = { index: winners[0].i };
    commitTitleProgress();
    log(
      "勝利！" +
        winners[0].p.name +
        "は手札・山札のフォロワーが0枚になりました（スペルは残っていても勝利）。",
    );
  }
}
function afterAction(pi) {
  finishFollowerEffect();
  if (!locked && !hasPendingEffect()) {startResultPresentation(pi);checkWinner();}
  if (locked || hasPendingEffect() || G.winner) {
    render();
    return;
  }
  G.current = nextTurnSeat(pi);
  let skipped = 0;
  while (G.players[G.current].passed && skipped < G.players.length) {
    G.current = nextTurnSeat(G.current);
    skipped++;
  }
  G.players[G.current].turnVisits=(G.players[G.current].turnVisits||0)+1;
  render();
  if (isCpuTurn()) cpuLoop();
}
function komatsungoEffectValue(card, p, pi) {
  // 実装済みカード効果の価値を、勝利条件・相手の残り枚数・効果の実行可能性から評価する。
  const opponents = G.players
    .map((op, i) => ({ op, i }))
    .filter((x) => x.i !== pi);
  const minOppRemaining = Math.min(
    ...opponents.map((x) => x.op.deck.length + x.op.hand.length),
  );
  const ownRemaining = p.deck.length + p.hand.length;
  const deck = p.deck.length,
    hand = p.hand.length;
  const canDraw = Math.min(
    deck,
    {
      アヤシシ: 1,
      ソニック: 1,
      バン: 3,
      ダセット: 1,
      碇ゲンドウ: 2,
      戸愚呂弟: 3,
      涼宮ハルヒ: 3,
      マキマ: 2,
      スパイダーマン: 1,
    }[card.name] || 0,
  );
  let v = 0;
  // ドローは山札を減らして勝利条件へ進む。山札切れ後は価値がない。
  v += canDraw * (deck <= 3 ? 5.0 : deck <= 8 ? 3.4 : 2.1);
  if (card.name === "ジェネシスドラゴン" && deck === 0) v += 7;
  if (card.name === "ロクサス" && p.grave.some((c) => c.name === "ソラ"))
    v += 5;
  if (card.name === "ネート") {
    const freq = {};
    opponents.forEach(({ op }) =>
      op.hand
        .filter((c) => c.kind === "follower")
        .forEach((c) => {
          freq[String(c.number)] = (freq[String(c.number)] || 0) + 1;
        }),
    );
    v += Math.max(0, ...Object.values(freq)) * 1.6;
    if (minOppRemaining <= ownRemaining + 3) v += 2.5;
  }
  if (card.name === "スパイダーマン") {
    const n7 = opponents.reduce(
      (s, { op }) =>
        s +
        op.hand.filter((c) => c.kind === "follower" && String(c.number) === "7")
          .length,
      0,
    );
    v += n7 * 1.7 + (minOppRemaining <= ownRemaining + 3 ? 2 : 0);
  }
  if (card.name === "ハルク")
    v += opponents.reduce((s, { op }) => s + (op.hand.length ? 2.0 : 0), 0);
  if (card.name === "アルル") {
    const pairs = p.hand
      .filter((c) => c.kind === "follower")
      .reduce(
        (a, c) => ((a[String(c.number)] = (a[String(c.number)] || 0) + 1), a),
        {},
      );
    if (Object.values(pairs).some((n) => n >= 2)) v += 3.5;
  }
  if (card.name === "ネク")
    v += opponents.reduce((s, { op }) => s + (op.hand.length ? 2.4 : 0), 0);
  if (
    card.name === "ゴジラ" &&
    p.hand.some(
      (c) =>
        c.kind === "follower" && fieldNumber(c) >= 5,
    )
  )
    v += 2.5;
  if (card.name === "鹿目まどか" && deck > 0) v += 2.0;
  if (card.name === "ぐら" && deck > 0) v += 2.0;
  if (card.name === "マキマ") v += 2.5;
  if (card.name === "ニューワード") v += 2.0;
  if (card.name === "ガブリエル") v += 1.7;
  // 終盤は手札を減らす価値が高い。ただし、勝利判定に残るフォロワーをむやみに残さない。
  if (deck === 0 && card.kind === "follower") v += 5.0;
  if (hand <= 3 && card.kind === "follower") v += 2.0;
  return v;
}
function komatsungoSearchScore(card, p, pi) {
  // V0.4：現局面・次の一手・相手の圧力・再始動力を比較する浅い先読み。
  // ゲーム状態を一時的に差し替え、探索終了時に必ず復元する。
  const ownRemaining = p.deck.length + p.hand.length;
  const opponents = G.players
    .map((op, i) => ({ op, i }))
    .filter((x) => x.i !== pi);
  const minOppRemaining = Math.min(
    ...opponents.map((x) => x.op.deck.length + x.op.hand.length),
  );
  const cost = effectiveCost(card, p),
    baseEffect = komatsungoEffectValue(card, p, pi);
  const playableBefore = p.hand.filter((c) => canPlay(c, p)).length;
  const top = G.field.length ? G.field[G.field.length - 1] : null;
  let immediate = 100 + baseEffect * 2.2 - cost * 1.25;
  // 場を取れること、次の相手がパスしそうな状況、勝利までの残り枚数を評価。
  if (!top) immediate += 3;
  else {
    const tn = fieldNumber(top.card),
      cn = fieldNumber(card);
    if (cn > tn) immediate += 2.5;
    if (cn === tn && Number(card.bp) > Number(top.card.bp)) immediate += 1.5;
    if (card.name === "雪ミク" && Number(card.bp) >= Number(top.card.bp))
      immediate += 1.8;
  }
  immediate += Math.max(0, 8 - ownRemaining) * 0.65;
  immediate += Math.max(0, 5 - p.deck.length) * 0.55;
  immediate += Math.max(0, 7 - minOppRemaining) * 0.3;
  if (card.kind === "follower" && card.number !== "L") {
    const same = p.grave.filter(
      (c) => c.kind === "follower" && String(c.number) === String(card.number),
    ).length;
    if (same === 0) immediate += 0.25;
  }
  // 仮想着手：実際の場の比較・コスト・手札枚数を反映し、次の候補の質を探索。
  const oldHand = p.hand,
    oldField = G.field,
    oldCost = p.cost;
  const ix = oldHand.findIndex((c) => c.id === card.id);
  if (ix >= 0) {
    const nextHand = oldHand.slice();
    nextHand.splice(ix, 1);
    p.hand = nextHand;
    p.cost = Math.max(0, oldCost - cost);
    G.field = oldField.concat([{ card, player: pi }]);
    let nextBest = 0,
      nextCount = 0;
    for (const c of p.hand) {
      if (canPlay(c, p)) {
        nextCount++;
        const v =
          komatsungoEffectValue(c, p, pi) * 1.6 -
          effectiveCost(c, p) * 0.9 +
          (G.field.length &&
          fieldNumber(c) > fieldNumber(G.field[G.field.length - 1].card)
            ? 1.4
            : 0);
        if (v > nextBest) nextBest = v;
      }
    }
    immediate += Math.min(8, nextBest) * 0.7 + Math.min(3, nextCount) * 0.35;

    // V0.4：相手の合法手・場の維持・次ラウンドの再始動力を評価。
    const fieldTop = G.field.length ? G.field[G.field.length - 1] : null;
    const nextPlayers = G.players.map((_,i)=>(pi+i+1)%G.players.length).slice(0,-1);
    let rivalPressure = 0;
    for (const oi of nextPlayers) {
      const op = G.players[oi];
      if (!op || op.passed) continue;
      const legal = op.hand.filter((x) => canPlay(x, op));
      rivalPressure += Math.min(3, legal.length) * 0.55;
      if (
        legal.some(
          (x) => fieldTop && fieldNumber(x) > fieldNumber(fieldTop.card),
        )
      )
        rivalPressure += 0.8;
    }
    immediate += Math.min(3, nextCount) * 0.3 - rivalPressure * 0.45;
    const remainingCost = Math.max(0, p.cost - cost);
    if (remainingCost >= 1 && nextCount > 0) immediate += 0.35;
    if (minOppRemaining <= ownRemaining + 2) immediate += baseEffect * 0.18;
    // 勝利条件に直結する最後のフォロワーを残す判断も含める。
    if (p.deck.length === 0 && !p.hand.some((c) => c.kind === "follower"))
      immediate += 10000;
  }
  p.hand = oldHand;
  p.cost = oldCost;
  G.field = oldField;
  // 同点時の乱数は極小にし、判断を安定させる。
  return immediate + Math.random() * 0.0001;
}
function cpuCardScore(card, p, pi, level) {
  const cost = effectiveCost(card, p),
    n = fieldNumber(card),
    top = G.field.length ? G.field[G.field.length - 1].card : null;
  const playableCount = p.hand.filter((c) => canPlay(c, p)).length;
  const deckRatio = p.deck.length,
    handCount = p.hand.length;
  const drawValue =
    {
      アヤシシ: 1,
      ソニック: 1,
      バン: 3,
      ダセット: 1,
      碇ゲンドウ: 2,
      戸愚呂弟: 3,
      涼宮ハルヒ: 3,
      マキマ: 2,
      スパイダーマン: 1,
    }[card.name] || 0;
  const knownDraw = drawValue > 0 ? drawValue * 2.2 : 0;
  if (level === "weak") return 10 - cost * 0.2 + Math.random() * 0.3;
  let score = 20 - cost * 1.6 + knownDraw;
  score += p.deck.length <= 5 ? drawValue * 1.8 : 0;
  score += handCount <= 3 ? 2 : 0;
  if (card.name === "ジェネシスドラゴン" && p.deck.length === 0) score += 8;
  if (card.name === "ロクサス" && p.grave.some((c) => c.name === "ソラ"))
    score += 5;
  if (level === "normal") return score + Math.random() * 0.15;
  const opponents = G.players
    .map((op, i) => ({ op, i }))
    .filter((x) => x.i !== pi);
  const threat = Math.max(
    ...opponents.map(
      (x) => Math.max(0, 10 - x.op.deck.length) * 1.5 + x.op.hand.length * 0.2,
    ),
  );
  score += threat * 0.18;
  if (card.name === "ネート")
    score += Math.max(...opponents.map((x) => x.op.hand.length)) * 0.4;
  if (level === "strong") return score + Math.random() * 0.05;
  const ownRemaining = p.deck.length + p.hand.length;
  const oppThreats = opponents.map(({ op }) => ({
    remaining: op.deck.length + op.hand.length,
    lowDeck: op.deck.length,
    graveCounts: op.grave.reduce(
      (a, c) => ((a[String(c.number)] = (a[String(c.number)] || 0) + 1), a),
      {},
    ),
    handNumbers: op.hand
      .filter((c) => c.kind === "follower")
      .map((c) => String(c.number)),
  }));
  const nearest = Math.min(...oppThreats.map((x) => x.remaining));
  score += nearest < ownRemaining ? -3 : 2;
  score += p.deck.length === 0 ? drawValue * 4 : 0;
  score += p.deck.length <= 2 ? drawValue * 3 : 0;
  score += Math.min(6, playableCount) * 0.35;
  if (top && G.revolution && n < Number(top.number)) score += 1;
  if (card.name === "ネート") {
    score += Math.max(...oppThreats.map((x) => x.handNumbers.length)) * 0.5;
    const freq = {};
    oppThreats.forEach((x) =>
      x.handNumbers.forEach((n) => (freq[n] = (freq[n] || 0) + 1)),
    );
    score += Math.max(0, ...Object.values(freq)) * 1.4;
  }
  if (card.kind === "follower" && card.number !== "L") {
    const sameInGrave = p.grave.filter(
      (c) => c.kind === "follower" && String(c.number) === String(card.number),
    ).length;
    score += sameInGrave === 0 ? 0.7 : 0;
  }
  if (level === "komatsungo") return komatsungoSearchScore(card, p, pi);
  return score + Math.random() * 0.01;
}
function cpuLoop() {
  if (onlineMode) {
    window.DAISHUGO_ONLINE_ADAPTER?.scheduleCpu();
    return;
  }
  if (locked || !G || G.winner || isLocalTurn()) return;
  let guard = 0;
  while (!locked && !isLocalTurn() && !G.winner && guard++ < 10) {
    let pi = G.current,
      p = G.players[pi];
    if (p.passed) {
      G.current = nextTurnSeat(pi);
      continue;
    }
    let opts = p.hand.map((c, i) => ({ c, i })).filter((x) => canPlay(x.c, p));
    if (opts.length) {
      if (cpuDifficulty === "weak") {
        opts.sort((a, b) => effectiveCost(a.c, p) - effectiveCost(b.c, p));
      } else {
        opts.sort(
          (a, b) =>
            cpuCardScore(b.c, p, pi, cpuDifficulty) -
            cpuCardScore(a.c, p, pi, cpuDifficulty),
        );
      }
      const pick = opts[0];
      doPlay(pi, pick.i);
      if (G.winner || locked) break;
      G.current = nextTurnSeat(pi);
      render();
      continue;
    } else {
      let flowed = doPass(pi);
      render();
      if (flowed) continue;
    }
  }
  if (isLocalTurn() || G.winner) render();
  else if (guard >= 10) {
    log("CPU処理の安全上限に到達しました。進行を停止しました。");
    render();
  }
}
document.getElementById("cpuDifficulty").addEventListener("change", (e) => {
  cpuDifficulty = e.target.value;
  localStorage.setItem("daishugo.cpuDifficulty", cpuDifficulty);
  const names = {
    weak: "弱い",
    normal: "普通",
    strong: "強い",
    strongest: "最強",
    komatsungo: "V0.4（先読みAI）",
  };
  if (G) log("COMの強さを「" + names[cpuDifficulty] + "」に変更しました。");
  render();
});
document.getElementById("newGame").onclick = () => {
  if (onlineMode) {
    alert("再戦はルームを退出して、新しいルームで開始してください。");
    return;
  }
  stopGameBgms();
  playGameBgm(1);
  newGame();
};
document.getElementById("sortHandBtn").onclick = sortHandByNumber;
document.getElementById("playBtn").onclick = playCard;
document.getElementById("spellBtn").onclick = playCard;
document.getElementById("passBtn").onclick = pass;
document.getElementById("neitoNumbers").addEventListener("click", (e) => {
  const b = e.target.closest("[data-neito-number]");
  if (!b || !G || !G.pendingNeito) return;
  G.neitoChoice = String(b.dataset.neitoNumber);
  render();
});
document.getElementById("neitoDoneBtn").onclick = () => {
  if (window.DAISHUGO_ONLINE_ADAPTER?.busy) return;
  if (
    !G ||
    (!G.pendingNeito && !G.pendingSpiderMan) ||
    !isLocalTurn() ||
    G.winner ||
    !["1", "2", "3", "4", "5", "6", "7"].includes(String(G.neitoChoice))
  )
    return;
  const isSpider = G.pendingSpiderMan;
  const n = String(isSpider ? "7" : G.neitoChoice);
  applyNeitoNumber(
    n,
    activeHumanSeat(),
    isSpider ? "スパイダーマン" : "ネート",
  );
  log(
    (isSpider ? "スパイダーマンの数字7指定" : "ネートの数字指定") +
      "を確定しました。効果処理完了。次のプレイヤーへ進みます。",
  );
  afterAction(activeHumanSeat());
};
document.getElementById("effectDoneBtn").onclick = () => {
  if (
    onlineMode &&
    (window.DAISHUGO_ONLINE_ADAPTER?.busy ||
      (!isLocalTurn() && !G?.pendingNeku))
  )
    return;
  if (
    !G ||
    (!G.pendingGodzilla &&
      !G.pendingHulk &&
      !G.pendingAruru &&
      !G.pendingNeku) ||
    (!isLocalTurn() && !G.pendingNeku && !G.pendingAruru) ||
    G.winner
  )
    return;
  if (G.pendingAruru) {
    if (G.aruruSelections.length !== 2) return;
    const chosen = G.aruruSelections.map((id) =>
      G.players[activeHumanSeat()].hand.find((card) => card.id === id),
    );
    if (
      chosen.some((card) => !card) ||
      chosen[0].kind !== "follower" ||
      chosen[1].kind !== "follower" ||
      currentNumberLabel(chosen[0]) !== currentNumberLabel(chosen[1])
    )
      return;
    chosen.forEach((card) =>
      destroyHandCard(G.players[activeHumanSeat()], card, "アルル", "5"),
    );
    G.pendingAruru = false;
    G.aruruSelections = [];
    G.aruruResolved = false;
    selected = null;
    selectedSpell = null;
    log("アルルの効果処理完了。");
    afterAction(activeHumanSeat());
    return;
  }
  if (G.pendingNeku) {
    if (onlineMode) {
      window.DAISHUGO_ONLINE_ADAPTER.confirmChoice("neku", [
        G.nekuSelections[activeHumanSeat()],
      ]);
      return;
    }
    if (
      !G.nekuSelections[activeHumanSeat()] &&
      G.players[activeHumanSeat()].hand.length
    )
      return;
    G.nekuConfirmed[activeHumanSeat()] = true;
    resolveNekuChoices();
    return;
  }
  if (G.pendingHulk) {
    if (!G.hulkResolved) return;
    G.pendingHulk = false;
    G.hulkResolved = false;
    log("ハルクの効果処理完了。次のプレイヤーへ進みます。");
  } else {
    if (!G.godzillaResolved) return;
    G.pendingGodzilla = false;
    G.godzillaResolved = false;
    log("ゴジラの効果処理完了。次のプレイヤーへ進みます。");
  }
  afterAction(activeHumanSeat());
};
document.getElementById("godzillaSkipBtn").onclick = () => {
  if (
    !G ||
    !G.pendingGodzilla ||
    !canOperateEffect(activeHumanSeat()) ||
    G.godzillaResolved ||
    !isLocalTurn() ||
    G.winner
  )
    return;
  G.pendingGodzilla = false;
  G.godzillaResolved = false;
  selected = null;
  selectedSpell = null;
  log("ゴジラのファンファーレ：手札を破壊しないことを選択しました。");
  afterAction(activeHumanSeat());
}; // ルールボタンはメイン画面から削除しました。

function openGraveyard(playerIndex) {
  if (!G || !G.players[playerIndex]) return;
  const p = G.players[playerIndex];
  document.getElementById("graveTitle").textContent = p.name + "の墓地";
  document.getElementById("graveSummary").textContent =
    "墓地 " + p.grave.length + "枚｜数字ごとに分類（各カードを色分け表示）";
  const list = document.getElementById("graveList");
  if (!p.grave.length) {
    list.innerHTML =
      '<div class="grave-empty">墓地にカードはありません。</div>';
  } else {
    const order = (n) => (n === "S" ? 9 : n === "L" ? 8 : Number(n) || 10);
    const cards = p.grave
      .map((c, idx) => ({ ...c, _graveIndex: idx }))
      .sort(
        (a, b) =>
          order(a.number) - order(b.number) || b._graveIndex - a._graveIndex,
      );
    const groups = [];
    cards.forEach((c) => {
      const key =
        c.kind === "spell"
          ? "スペル"
          : c.number === "L"
            ? "L"
            : `数字${c.number}`;
      let g = groups.find((x) => x.key === key);
      if (!g) {
        g = { key, number: c.kind === "spell" ? "S" : c.number, cards: [] };
        groups.push(g);
      }
      g.cards.push(c);
    });
    list.innerHTML = groups
      .map(
        (g) =>
          `<section class="grave-group"><h3 class="grave-group-title"><span>${escapeHtml(g.key)}</span><span>${g.cards.length}枚</span></h3><div class="grave-group-cards">${g.cards.map((c) => cardHtml(c, false, true)).join("")}</div></section>`,
      )
      .join("");
  }
  const modal = document.getElementById("graveModal");
  modal.hidden = false;
  modal.style.display = "flex";
  modal.style.visibility = "visible";
  modal.style.pointerEvents = "auto";
  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
}
function closeGraveyard() {
  const modal = document.getElementById("graveModal");
  if (!modal) return;
  modal.classList.remove("open");
  modal.style.display = "none";
  modal.setAttribute("aria-hidden", "true");
}
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    closeGraveyard();
    closeCardZoom();
  }
});
const ONLINE_IMPLEMENTED_NAMES = new Set(
  window.DAISHUGO_ONLINE_CARD_NAMES || [],
);
const DAISHUGO_DECK_KEY = "daishugo.customDeck.v1";
const DAISHUGO_DECKS_KEY = "daishugo.customDecks.v1";
const DAISHUGO_ACTIVE_DECK_KEY = "daishugo.activeDeckSlot.v1";
let activeDeckSlot = 1;
const DAISHUGO_PLAYER_NAME_KEY = "daishugo.playerName.v1";
function loadPlayerName() {
  try {
    return (
      (localStorage.getItem(DAISHUGO_PLAYER_NAME_KEY) || "")
        .trim()
        .slice(0, 20) || "あなた"
    );
  } catch (e) {
    return "あなた";
  }
}
function savePlayerName() {
  const input = document.getElementById("playerNameInput");
  const name = (input.value || "").trim().slice(0, 20);
  if (!name) {
    document.getElementById("playerSaveStatus").textContent =
      "名前を入力してください";
    return false;
  }
  try {
    localStorage.setItem(DAISHUGO_PLAYER_NAME_KEY, name);
    input.value = name;
    document.getElementById("playerSaveStatus").textContent =
      "「" + name + "」を保存しました";
    if (G && G.players && G.players[activeHumanSeat()]) {
      G.players[activeHumanSeat()].name = name;
      render();
    }
    return true;
  } catch (e) {
    document.getElementById("playerSaveStatus").textContent =
      "保存できませんでした";
    return false;
  }
}
const DAISHUGO_TITLE_STATS_KEY = "daishugo.titleStats.v1";
const DAISHUGO_SELECTED_TITLE_KEY = "daishugo.selectedTitle.v1";
const DAISHUGO_NEW_TITLE_IDS = ["buttercup_zero", "nergigante_three", "newword_seven", "makima_play", "hisoka_seven", "ban_draw", "wesker_recover", "ultimate_combo"];
const DAISHUGO_TITLES = [
{"id": "buttercup_zero", "name": "最強の女の子", "description": "バターカップをコスト0で場に出した回数", "goal": 30},
{"id": "nergigante_three", "name": "滅尽龍", "description": "ネルギガンテの効果で3枚以上のフォロワーを同時に手札に戻した回数", "goal": 30},
{"id": "newword_seven", "name": "新たなる言葉", "description": "ニューワードの効果で数字7に強化されたフォロワーを場に出した回数", "goal": 30},
{"id": "makima_play", "name": "支配の悪魔", "description": "マキマを場に出した回数", "goal": 100},
{"id": "hisoka_seven", "name": "そろそろ狩るか…♠", "description": "ヒソカを数字7のフォロワーの上に出した回数", "goal": 50},
{"id": "ban_draw", "name": "強欲の罪", "description": "バンの効果で山札からカードを引いた回数（1回の効果につき1回）", "goal": 50},
{"id": "wesker_recover", "name": "完全なる存在", "description": "ウェスカーの効果で魔種族フォロワーを手札に戻した回数", "goal": 50},
{"id": "ultimate_combo", "name": "究極のコンボ", "description": "場が流れるまでに自分の異なるフォロワー5種類の効果を発動した回数（1つの場につき1回）", "goal": 2},
  {
    id: "roxas_zero",
    name: "めぐりあう鍵",
    description: "「ロクサス」の効果でコストを0にした回数",
    goal: 100,
  },
  {
    id: "neito_play",
    name: "世界の織り手",
    description: "「ネート」を手札から場に出した回数",
    goal: 100,
  },
  {
    id: "com_normal_win",
    name: "かけだしプレイヤー",
    description: "COM（普通）に勝利した回数",
    goal: 1,
  },
  {
    id: "horus_gendo",
    name: "くそコンボ",
    description: "「ホルス」の効果で「碇ゲンドウ」を手札に加えた回数",
    goal: 100,
  },
  {
    id: "surt_4plus",
    name: "End of days",
    description: "「スルト」を数字4以上で場に出した回数",
    goal: 20,
  },
  {
    id: "sunraku_empty",
    name: "クソゲーハンター",
    description: "「サンラク」の効果使用後、手札が0枚になった回数",
    goal: 3,
  },
  {
    id: "spiderman_english",
    name: "親愛なる隣人",
    description:
      "「スパイダーマン」の効果で引いたカードが英種族フォロワーだった回数",
    goal: 20,
  },
  {
    id: "kumagawa_l",
    name: "僕は悪くない",
    description: "「球磨川禊」をLフォロワーの上に出した回数",
    goal: 50,
  },
  {
    id: "madoka_play",
    name: "もう絶望する必要なんてない！",
    description: "「鹿目まどか」を場に出した回数",
    goal: 100,
  },
  {
    id: "kuchipatchi_field",
    name: "好物は小松菜とオムライス",
    description: "場にフォロワーがある状態で「くちぱっち」を場に出した回数",
    goal: 50,
  },
  {
    id: "tokimeki_effect",
    name: "歴史は愛　愛は世界♪",
    description: "「トキメキ」のファンファーレ効果が発動した回数",
    goal: 50,
  },
  {
    id: "chizuko_takina_combo",
    name: "魚ー！チンアナゴ＝！",
    description:
      "「錦木千束」で山札から手札に加えたフォロワー3枚を「井ノ上たきな」の効果で破壊した回数",
    goal: 15,
  },
  {
    id: "curry_field",
    name: "辛さ100倍",
    description: "場にフォロワーがある状態で「カレーパンマン」を場に出した回数",
    goal: 50,
  },
  {
    id: "haruhi_target",
    name: "God knows",
    description: "「涼宮ハルヒ」の効果で自分が効果の対象になった回数",
    goal: 30,
  },
  {
    id: "extreme_double_flow",
    name: "エクストリーム",
    description: "自分の「仮面ライダーダブル」1枚だけで場を流した回数",
    goal: 20,
  },
  {
    id: "wandering_fighter_ryu",
    name: "放浪の格闘家",
    description: "自分の場にフォロワーがある状態で「リュウ」を場に出した回数",
    goal: 50,
  },
  {
    id: "bell_angel_effect",
    name: "リンゴンリンゴン♪",
    description: "自分の「ベルエンジェル」の効果が発動した回数",
    goal: 30,
  },
  {
    id: "barrier_rush_ayashishi",
    name: "「バリアーラッシュ",
    description: "「アヤシシ」を場に出した回数",
    goal: 50,
  },
].map(title => ({ ...title, rewardPoints: 10 }));
function loadTitleStats() {
  try {
    const x = JSON.parse(
      localStorage.getItem(DAISHUGO_TITLE_STATS_KEY) || "{}",
    );
    return {
      ...Object.fromEntries(DAISHUGO_NEW_TITLE_IDS.map(k=>[k,Math.max(0,Number(x[k])||0)])),
      roxas_zero: Math.max(0, Number(x.roxas_zero) || 0),
      neito_play: Math.max(0, Number(x.neito_play) || 0),
      com_normal_win: Math.max(0, Number(x.com_normal_win) || 0),
      horus_gendo: Math.max(0, Number(x.horus_gendo) || 0),
      surt_4plus: Math.max(0, Number(x.surt_4plus) || 0),
      sunraku_empty: Math.max(0, Number(x.sunraku_empty) || 0),
      spiderman_english: Math.max(0, Number(x.spiderman_english) || 0),
      kumagawa_l: Math.max(0, Number(x.kumagawa_l) || 0),
      madoka_play: Math.max(0, Number(x.madoka_play) || 0),
      five_six_deck: Math.max(0, Number(x.five_six_deck) || 0),
      kuchipatchi_field: Math.max(0, Number(x.kuchipatchi_field) || 0),
      tokimeki_effect: Math.max(0, Number(x.tokimeki_effect) || 0),
      chizuko_takina_combo: Math.max(0, Number(x.chizuko_takina_combo) || 0),
      curry_field: Math.max(0, Number(x.curry_field) || 0),
      haruhi_target: Math.max(0, Number(x.haruhi_target) || 0),
      extreme_double_flow: Math.max(0, Number(x.extreme_double_flow) || 0),
      wandering_fighter_ryu: Math.max(0, Number(x.wandering_fighter_ryu) || 0),
      bell_angel_effect: Math.max(0, Number(x.bell_angel_effect) || 0),
      barrier_rush_ayashishi: Math.max(
        0,
        Number(x.barrier_rush_ayashishi) || 0,
      ),
    };
  } catch (e) {
    return {
      ...Object.fromEntries(DAISHUGO_NEW_TITLE_IDS.map(k=>[k,0])),
      roxas_zero: 0,
      neito_play: 0,
      com_normal_win: 0,
      horus_gendo: 0,
      surt_4plus: 0,
      sunraku_empty: 0,
      spiderman_english: 0,
      kumagawa_l: 0,
      madoka_play: 0,
      five_six_deck: 0,
      kuchipatchi_field: 0,
      tokimeki_effect: 0,
      chizuko_takina_combo: 0,
      curry_field: 0,
      haruhi_target: 0,
      extreme_double_flow: 0,
      wandering_fighter_ryu: 0,
      bell_angel_effect: 0,
      barrier_rush_ayashishi: 0,
    };
  }
}
function selectedTitle() {
  try {
    const id = localStorage.getItem(DAISHUGO_SELECTED_TITLE_KEY) || "",
      stats = loadTitleStats();
    return (
      DAISHUGO_TITLES.find((t) => t.id === id && stats[t.id] >= t.goal) || null
    );
  } catch (e) {
    return null;
  }
}
function openTitles() {
  const m = document.getElementById("titlesModal");
  const menu = document.getElementById("mainMenu");
  if (!m) return;
  renderTitles();
  ["optionsOverlay", "deckOverlay"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) {
      el.style.display = "none";
      el.setAttribute("aria-hidden", "true");
    }
  });
  if (menu) {
    menu.hidden = true;
    menu.style.display = "none";
  }
  m.hidden = false;
  m.style.display = "block";
  m.style.visibility = "visible";
  m.style.pointerEvents = "auto";
  m.setAttribute("aria-hidden", "false");
  window.scrollTo(0, 0);
}
function closeTitles() {
  const m = document.getElementById("titlesModal");
  if (m) {
    m.style.display = "none";
    m.hidden = true;
    m.setAttribute("aria-hidden", "true");
  }
  const menu = document.getElementById("mainMenu");
  if (menu) {
    menu.hidden = false;
    menu.style.display = "";
  }
  window.scrollTo(0, 0);
}
function chooseTitle(id) {
  const stats = loadTitleStats(),
    t = DAISHUGO_TITLES.find((x) => x.id === id);
  if (!t || stats[id] < t.goal) return;
  try {
    localStorage.setItem(DAISHUGO_SELECTED_TITLE_KEY, id);
    document.getElementById("titleSaveStatus").textContent =
      "称号「" + t.name + "」を設定しました。";
    renderTitles();
    if (G) render();
  } catch (e) {
    document.getElementById("titleSaveStatus").textContent =
      "称号を保存できませんでした。";
  }
}
function renderTitles() {
  window.DAISHUGO_SHOP?.refresh();
  const stats = loadTitleStats(),
    sel = selectedTitle(),
    root = document.getElementById("titlesList");
  if (!root) return;
  root.innerHTML = DAISHUGO_TITLES.map((t) => {
    const n = stats[t.id],
      pct = Math.min(100, Math.floor((n / t.goal) * 100)),
      earned = n >= t.goal;
    return `<article style="margin:14px 0;padding:14px;border:1px solid ${earned ? "#d5b45c" : "#40536b"};border-radius:12px;background:#0d1724"><div style="display:flex;justify-content:space-between;gap:8px;align-items:center"><strong style="color:${earned ? "#ffe08a" : "#edf3fa"}">${t.name}</strong><span style="font-size:12px;color:${earned ? "#ffe08a" : "#9bb0c8"}">${earned ? "獲得済み" : "未獲得"}</span></div><p style="margin:8px 0;font-size:13px;color:#b9c9dc">${t.description}</p><p style="color:#ffe08a;font-size:13px">${earned ? "獲得報酬：10 pt（受取済み）" : "獲得報酬：10 pt"}</p><div style="height:10px;border-radius:99px;background:#29384b;overflow:hidden"><div style="height:100%;width:${pct}%;background:${earned ? "#e5bd56" : "#58a6ff"};border-radius:99px"></div></div><div style="display:flex;justify-content:space-between;margin-top:7px;font-size:13px"><span>${Math.min(n, t.goal).toLocaleString("ja-JP")} / ${t.goal}</span><strong>${pct}%</strong></div><button type="button" ${earned ? "" : "disabled"} onclick="chooseTitle('${t.id}')" style="margin-top:10px;width:100%;padding:10px;border-radius:8px;border:1px solid #52667e;background:${sel && sel.id === t.id ? "#426b91" : "#223348"};color:#fff;opacity:${earned ? 1 : 0.55}">${earned ? (sel && sel.id === t.id ? "選択中" : "この称号を選ぶ") : "目標達成で選択可能"}</button></article>`;
  }).join("");
}
function commitTitleProgress() {
  if (onlineMode) { commitOnlineTitles(); return; }
  if (!G || G.titleProgressCommitted) return;
  G.titleProgressCommitted = true;
  const add = G.titleMatchProgress || {},
    stats = loadTitleStats();
  for(const k of DAISHUGO_NEW_TITLE_IDS)stats[k]+=Math.max(0,Number(add[k])||0);
  stats.roxas_zero += Math.max(0, Number(add.roxas_zero) || 0);
  stats.neito_play += Math.max(0, Number(add.neito_play) || 0);
  stats.horus_gendo += Math.max(0, Number(add.horus_gendo) || 0);
  stats.surt_4plus += Math.max(0, Number(add.surt_4plus) || 0);
  stats.sunraku_empty += Math.max(0, Number(add.sunraku_empty) || 0);
  stats.spiderman_english += Math.max(0, Number(add.spiderman_english) || 0);
  stats.kumagawa_l += Math.max(0, Number(add.kumagawa_l) || 0);
  stats.madoka_play += Math.max(0, Number(add.madoka_play) || 0);
  stats.five_six_deck += Math.max(0, Number(add.five_six_deck) || 0);
  stats.kuchipatchi_field += Math.max(0, Number(add.kuchipatchi_field) || 0);
  stats.tokimeki_effect += Math.max(0, Number(add.tokimeki_effect) || 0);
  stats.chizuko_takina_combo += Math.max(
    0,
    Number(add.chizuko_takina_combo) || 0,
  );
  stats.curry_field += Math.max(0, Number(add.curry_field) || 0);
  stats.haruhi_target += Math.max(0, Number(add.haruhi_target) || 0);
  stats.extreme_double_flow += Math.max(
    0,
    Number(add.extreme_double_flow) || 0,
  );
  stats.wandering_fighter_ryu += Math.max(
    0,
    Number(add.wandering_fighter_ryu) || 0,
  );
  stats.bell_angel_effect += Math.max(0, Number(add.bell_angel_effect) || 0);
  stats.barrier_rush_ayashishi += Math.max(
    0,
    Number(add.barrier_rush_ayashishi) || 0,
  );
  if (G.winner && G.winner.index === 0 && cpuDifficulty === "normal")
    stats.com_normal_win += 1;
  try {
    localStorage.setItem(DAISHUGO_TITLE_STATS_KEY, JSON.stringify(stats));
    window.DAISHUGO_SHOP?.refresh();
  } catch (e) {}
}
function initPlayerProfile() {
  const input = document.getElementById("playerNameInput");
  if (input) {
    input.value = loadPlayerName() === "あなた" ? "" : loadPlayerName();
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        savePlayerName();
      }
    });
    input.addEventListener("change", () => {
      if (input.value.trim()) savePlayerName();
    });
  }
  const save = document.getElementById("savePlayerNameBtn");
  if (save) save.addEventListener("click", savePlayerName);
  const deckMenuButton = document.getElementById("menuDeckBtn");
  if (deckMenuButton)
    deckMenuButton.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      const menu = document.getElementById("mainMenu");
      if (menu) {
        menu.hidden = true;
        menu.style.display = "none";
      }
      openDeckBuilder();
    });
  document.addEventListener(
    "click",
    function (e) {
      const el =
        e.target && e.target.closest
          ? e.target.closest(
              "#menuDeckBtn,#menuSoloBtn,#menuOptionsBtn,#menuOnlineBtn,#menuOnline4Btn,#menuTitlesBtn,#closeTitlesBtn",
            )
          : null;
      if (!el) return;
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      const menu = document.getElementById("mainMenu");
      if (el.id === "menuDeckBtn") {
        if (menu) {
          menu.hidden = true;
          menu.style.display = "none";
        }
        openDeckBuilder();
        return;
      }
      if (el.id === "menuSoloBtn") {
        if (menu) {
          menu.hidden = true;
          menu.style.display = "none";
        }
        gameStarted = true;
        stopGameBgms();
        playGameBgm(1);
        newGame();
        return;
      }
      if (el.id === "menuOptionsBtn") {
        const o = document.getElementById("optionsOverlay");
        const t = document.getElementById("bgmToggle");
        const l = document.getElementById("bgmToggleLabel");
        if (t) t.checked = gameBgmEnabled;
        if (l) l.textContent = gameBgmEnabled ? "オン" : "オフ";
        o.classList.add("open");
        o.style.display = "flex";
        o.setAttribute("aria-hidden", "false");
        return;
      }
      if (el.id === "menuOnlineBtn" || el.id === "menuOnline4Btn") {
        const onlineShell = document.getElementById("onlineModeShell");
        if (onlineShell) {
          const frame=document.getElementById("onlineModeFrame");
          const path=el.id==="menuOnline4Btn"?"./online-mode-4.html":"./online-mode.html";
          if(frame && frame.getAttribute("src")!==path)frame.setAttribute("src",path);
          onlineShell.classList.add("open");
          onlineShell.setAttribute("aria-hidden", "false");
        } else {
          alert(
            "オンライン画面を読み込めません。ページを再読み込みしてください。",
          );
        }
        return;
      }
      if (el.id === "menuTitlesBtn") {
        openTitles();
        return;
      }
      if (el.id === "closeTitlesBtn") {
        closeTitles();
        return;
      }
    },
    true,
  );
}
function cloneStarterNames() {
  const out = {};
  for (const n of ["1", "2", "3", "4", "5", "6", "7", "L", "S"])
    out[n] = STARTER_DECK_NAMES[n].filter((name) =>
      ONLINE_IMPLEMENTED_NAMES.has(name),
    );
  return out;
}
function cardKey(c) {
  return c.name;
}
function validateDeckNames(names, requireCounts = true, checkOwnership = true) {
  if (!names || typeof names !== "object")
    return { ok: false, message: "デッキデータを読み取れません。" };
  const rules = { 1: 4, 2: 4, 3: 4, 4: 4, 5: 4, 6: 4, 7: 4, L: 2, S: 5 };
  let all = [];
  for (const n of Object.keys(rules)) {
    if (!Array.isArray(names[n]))
      return {
        ok: false,
        message: `${n === "S" ? "スペル" : n === "L" ? "L" : "数字" + n}の選択内容が不正です。`,
      };
    if (requireCounts && names[n].length !== rules[n])
      return {
        ok: false,
        message: `${n === "S" ? "スペル" : n === "L" ? "L" : "数字" + n}は${rules[n]}枚選んでください（現在${names[n].length}枚）。`,
      };
    if (names[n].length > rules[n])
      return {
        ok: false,
        message: `${n === "S" ? "スペル" : n === "L" ? "L" : "数字" + n}は最大${rules[n]}枚です。`,
      };
    for (const name of names[n]) {
      const c = DATA.catalog.find(
        (x) =>
          x.name === name &&
          ONLINE_IMPLEMENTED_NAMES.has(x.name) &&
          ((n === "S" && x.kind === "spell") ||
            (n !== "S" && x.kind === "follower" && x.number === n)),
      );
      if (!c)
        return {
          ok: false,
          message: `カード「${name}」がオンライン実装対象のカード一覧に見つかりません。`,
        };
      if (checkOwnership && window.DAISHUGO_SHOP && !window.DAISHUGO_SHOP.isUnlocked(name)) return {ok:false,message:`カード「${name}」はショップで購入すると使えます。`};
      all.push(name);
    }
  }
  if (new Set(all).size !== all.length)
    return { ok: false, message: "同じカード名が重複しています。" };
  if(all.some(name=>EXODIA_PARTS.includes(name)) && !all.includes("封印されしエクゾディア"))
    return {ok:false,message:"封印パーツを入れるには、封印されしエクゾディアを同じデッキに入れてください。"};
  const count = all.length;
  if (requireCounts && count !== 35)
    return { ok: false, message: `デッキは35枚必要です（現在${count}枚）。` };
  return { ok: true, count };
}
function loadDeckSlots() {
  let slots = {};
  try {
    slots = JSON.parse(localStorage.getItem(DAISHUGO_DECKS_KEY) || "{}") || {};
  } catch (e) {
    slots = {};
  }
  if (!slots["1"]) {
    try {
      const old = JSON.parse(localStorage.getItem(DAISHUGO_DECK_KEY) || "null");
      if (old && validateDeckNames(old, true).ok)
        slots["1"] = { name: "デッキ1", cards: old };
    } catch (e) {}
  }
  return slots;
}
// 1人用とオンラインで同じ保存デッキを解決する。
function readMenuDeckInfo() {
  let slot = Number(localStorage.getItem(DAISHUGO_ACTIVE_DECK_KEY) || 1);
  if (!Number.isInteger(slot) || slot < 1 || slot > 6) slot = 1;
  const slots = loadDeckSlots(),
    selected = slots[String(slot)];
  if (selected && selected.cards) {
    const check = validateDeckNames(selected.cards, true);
    if (!check.ok) throw new Error(check.message);
    return {
      cards: JSON.parse(JSON.stringify(selected.cards)),
      name: selected.name || "デッキ" + slot,
      slot,
      source: "saved",
    };
  }
  const raw = localStorage.getItem(DAISHUGO_DECK_KEY);
  if (raw) {
    const cards = JSON.parse(raw),
      check = validateDeckNames(cards, true);
    if (!check.ok) throw new Error(check.message);
    const savedSlot = Object.keys(slots).find(
      (k) => JSON.stringify(slots[k].cards) === JSON.stringify(cards),
    );
    return {
      cards,
      name: savedSlot
        ? slots[savedSlot].name || "デッキ" + savedSlot
        : "保存デッキ",
      slot: savedSlot ? Number(savedSlot) : slot,
      source: "legacy",
    };
  }
  return {
    cards: cloneStarterNames(),
    name: "初期デッキ",
    slot,
    source: "starter",
  };
}
window.DAISHUGO_READ_MENU_DECK = readMenuDeckInfo;
window.DAISHUGO_OPEN_MENU_DECK = function () {
  const shell = document.getElementById("onlineModeShell");
  if (shell) {
    shell.classList.remove("open");
    shell.setAttribute("aria-hidden", "true");
  }
  openDeckBuilder();
};
function persistDeckSlots(slots) {
  localStorage.setItem(DAISHUGO_DECKS_KEY, JSON.stringify(slots));
}
function selectedDeckSlot() {
  return String(
    Math.max(
      1,
      Math.min(6, Number(document.getElementById("deckSlotSelect").value) || 1),
    ),
  );
}
function refreshDeckSlotOptions() {
  const slots = loadDeckSlots(),
    sel = document.getElementById("deckSlotSelect");
  [...sel.options].forEach((o) => {
    const d = slots[o.value];
    o.textContent = `デッキ${o.value}${d ? "：" + (d.name || "保存済み") : "（未保存）"}`;
  });
  sel.value = String(activeDeckSlot);
  const d = slots[String(activeDeckSlot)];
  document.getElementById("deckNameInput").value =
    d?.name || `デッキ${activeDeckSlot}`;
}
function loadDeckSlotIntoEditor() {
  activeDeckSlot = Number(selectedDeckSlot());
  try {
    localStorage.setItem(DAISHUGO_ACTIVE_DECK_KEY, String(activeDeckSlot));
  } catch (e) {}
  const d = loadDeckSlots()[String(activeDeckSlot)];
  renderDeckBuilder(
    d && validateDeckNames(d.cards, true).ok ? d.cards : cloneStarterNames(),
  );
  document.getElementById("deckNameInput").value =
    d?.name || `デッキ${activeDeckSlot}`;
  setDeckStatus(
    d
      ? "「" + (d.name || "デッキ" + activeDeckSlot) + "」を読み込みました。"
      : "未保存スロットです。カードを選んで保存してください。",
    true,
  );
}
function openDeckBuilder() {
  if (
    onlineMode &&
    window.parent !== window &&
    window.parent.DAISHUGO_OPEN_MENU_DECK
  ) {
    window.parent.DAISHUGO_OPEN_MENU_DECK();
    return;
  }
  const overlay = document.getElementById("deckOverlay");
  if (!overlay) return;
  try {
    activeDeckSlot = Number(
      localStorage.getItem(DAISHUGO_ACTIVE_DECK_KEY) || 1,
    );
    if (activeDeckSlot < 1 || activeDeckSlot > 6) activeDeckSlot = 1;
  } catch (e) {
    activeDeckSlot = 1;
  }
  try {
    refreshDeckSlotOptions();
    loadDeckSlotIntoEditor();
  } catch (e) {
    console.error("デッキ作成画面の初期化エラー", e);
    try {
      renderDeckBuilder(cloneStarterNames());
      refreshDeckStatus();
    } catch (err) {
      console.error(err);
    }
  }
  overlay.hidden = false;
  overlay.style.display = "flex";
  overlay.classList.add("open");
  overlay.setAttribute("aria-hidden", "false");
}
function renderDeckBuilder(names) {
  const groups = document.getElementById("deckGroups");
  const order = ["1", "2", "3", "4", "5", "6", "7", "L", "S"];
  groups.innerHTML = order
    .map((n) => {
      const cards = DATA.catalog
        .filter(
          (c) =>
            ONLINE_IMPLEMENTED_NAMES.has(c.name) &&
            (!window.DAISHUGO_SHOP || window.DAISHUGO_SHOP.isUnlocked(c.name)) &&
            (n === "S"
              ? c.kind === "spell"
              : c.kind === "follower" && String(c.number) === n),
        )
        .sort((a, b) => a.name.localeCompare(b.name, "ja"));
      const title = n === "S" ? "スペル" : n === "L" ? "Lカード" : "数字" + n;
      return `<section class="deck-group" data-group="${n}"><h3>${title} <span class="muted" id="deckGroupCount${n}"></span></h3>${cards.map((c) => `<div class="deck-option"><input type="checkbox" data-deck-number="${n}" data-deck-name="${escapeHtml(c.name)}" ${names[n].includes(c.name) ? "checked" : ""}><span><button type="button" class="deck-card-name" data-preview-card="${escapeHtml(c.name)}">${escapeHtml(c.name)}</button><small>${n === "S" ? "スペル" : `BP ${c.bp}｜コスト ${c.cost}`}｜${escapeHtml(c.tribe || "")}</small></span></div>`).join("")}</section>`;
    })
    .join("");
  groups.querySelectorAll("[data-preview-card]").forEach((btn) => {
    btn.setAttribute("aria-haspopup", "dialog");
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const name = btn.getAttribute("data-preview-card");
      if (name) openCardZoomByCatalogName(name);
    });
  });
  groups.querySelectorAll("input[type=checkbox]").forEach((el) =>
    el.addEventListener("change", () => {
      const n = el.dataset.deckNumber;
      const max = { 1: 4, 2: 4, 3: 4, 4: 4, 5: 4, 6: 4, 7: 4, L: 2, S: 5 }[n];
      const checked = [
        ...groups.querySelectorAll(`input[data-deck-number="${n}"]:checked`),
      ];
      if (checked.length > max) {
        el.checked = false;
        setDeckStatus(
          `${n === "S" ? "スペル" : n === "L" ? "L" : "数字" + n}は最大${max}枚です。`,
          false,
        );
        return;
      }
      refreshDeckStatus();
    }),
  );
  refreshDeckStatus();
}
function collectDeckNames() {
  const out = {};
  for (const n of ["1", "2", "3", "4", "5", "6", "7", "L", "S"])
    out[n] = [
      ...document.querySelectorAll(
        `#deckGroups input[data-deck-number="${n}"]:checked`,
      ),
    ].map((el) => el.dataset.deckName);
  return out;
}
function setDeckStatus(msg, ok) {
  const el = document.getElementById("deckStatus");
  el.textContent = msg;
  el.className = "deck-status " + (ok ? "ok" : "error");
}
function refreshDeckStatus() {
  const names = collectDeckNames();
  const result = validateDeckNames(names, true);
  for (const n of ["1", "2", "3", "4", "5", "6", "7", "L", "S"]) {
    const el = document.getElementById("deckGroupCount" + n);
    if (el)
      el.textContent = `${names[n].length}/${{ 1: 4, 2: 4, 3: 4, 4: 4, 5: 4, 6: 4, 7: 4, L: 2, S: 5 }[n]}枚`;
  }
  const total = Object.values(names).reduce((a, v) => a + v.length, 0);
  setDeckStatus(
    result.ok
      ? `保存可能：${total}/35枚。`
      : `現在 ${total}/35枚。${result.message}`,
    result.ok,
  );
}
function saveCustomDeck() {
  const names = collectDeckNames();
  const result = validateDeckNames(names, true);
  if (!result.ok) {
    setDeckStatus(result.message, false);
    return;
  }
  try {
    activeDeckSlot = Number(selectedDeckSlot());
    const slots = loadDeckSlots();
    const name =
      (document.getElementById("deckNameInput").value || "")
        .trim()
        .slice(0, 24) || `デッキ${activeDeckSlot}`;
    slots[String(activeDeckSlot)] = { name, cards: names };
    persistDeckSlots(slots);
    localStorage.setItem(DAISHUGO_ACTIVE_DECK_KEY, String(activeDeckSlot));
    localStorage.setItem(DAISHUGO_DECK_KEY, JSON.stringify(names));
    refreshDeckSlotOptions();
    document.getElementById("deckNameInput").value = name;
    setDeckStatus(
      "「" +
        name +
        "」をデッキ" +
        activeDeckSlot +
        "に保存しました。次回ブラウザ起動時も保存されます。新しいゲームでは選択中のデッキを使用します。",
      true,
    );
  } catch (e) {
    setDeckStatus(
      "保存できませんでした。ブラウザのプライベート設定や保存容量を確認してください。",
      false,
    );
  }
}
function resetCustomDeck() {
  renderDeckBuilder(cloneStarterNames());
  document.getElementById("deckNameInput").value =
    `デッキ${selectedDeckSlot()}`;
  setDeckStatus(
    "初期デッキを表示しています。保存済みデッキは削除されていません。保存すると選択スロットを上書きします。",
    true,
  );
}
function deleteSelectedDeckSlot() {
  const slot = selectedDeckSlot();
  const slots = loadDeckSlots();
  if (!slots[slot]) {
    setDeckStatus("このスロットには保存済みデッキがありません。", false);
    return;
  }
  delete slots[slot];
  try {
    persistDeckSlots(slots);
    if (Number(slot) === activeDeckSlot) {
      activeDeckSlot = 1;
      localStorage.setItem(DAISHUGO_ACTIVE_DECK_KEY, "1");
    }
    refreshDeckSlotOptions();
    loadDeckSlotIntoEditor();
    setDeckStatus("デッキ" + slot + "を削除しました。", true);
  } catch (e) {
    setDeckStatus("削除できませんでした。", false);
  }
}
function closeDeckBuilder() {
  const el = document.getElementById("deckOverlay");
  el.classList.remove("open");
  el.style.display = "none";
  el.setAttribute("aria-hidden", "true");
  if (!gameStarted) {
    const menu = document.getElementById("mainMenu");
    menu.hidden = false;
    menu.style.display = "";
  }
}
let gameStarted = false;
const optionsOverlay = document.getElementById("optionsOverlay");
const bgmToggle = document.getElementById("bgmToggle");
const bgmToggleLabel = document.getElementById("bgmToggleLabel");
function closeOptions() {
  optionsOverlay.classList.remove("open");
  optionsOverlay.style.display = "none";
  optionsOverlay.setAttribute("aria-hidden", "true");
}

document.getElementById("optionsClose").addEventListener("click", closeOptions);
optionsOverlay.addEventListener("click", (e) => {
  if (e.target === optionsOverlay) closeOptions();
});
bgmToggle.addEventListener("change", () => {
  gameBgmEnabled = bgmToggle.checked;
  bgmToggleLabel.textContent = gameBgmEnabled ? "オン" : "オフ";
  if(zomaBgmSession){
    if(gameBgmEnabled)safeZomaPlay(zomaBgmSession.audio);else zomaBgmSession.audio.pause();
    return;
  }
  if (!gameBgmEnabled) stopGameBgms();
  else if (G && !G.winner)
    playGameBgm(
      G.players.some((p) => Array.isArray(p.deck) && p.deck.length === 0)
        ? 2
        : 1,
    );
});
initPlayerProfile();
document
  .getElementById("deckClose")
  .addEventListener("click", closeDeckBuilder);
document.getElementById("deckSave").addEventListener("click", saveCustomDeck);
document.getElementById("deckReset").addEventListener("click", resetCustomDeck);
document
  .getElementById("deckSlotSelect")
  .addEventListener("change", loadDeckSlotIntoEditor);
document
  .getElementById("deckLoadSlot")
  .addEventListener("click", loadDeckSlotIntoEditor);
document
  .getElementById("deckDeleteSlot")
  .addEventListener("click", deleteSelectedDeckSlot);
document.getElementById("deckOverlay").addEventListener("click", (e) => {
  if (e.target.id === "deckOverlay") closeDeckBuilder();
});

function showFieldStatus() {
  if (!G) return;
  const esc = (v) =>
    String(v ?? "").replace(
      /[&<>"']/g,
      (ch) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[ch],
    );
  const effects = [];
  if (G.revolution) effects.push("革命：数字の強さが逆転（1が最強）");
  if (G.conflict) effects.push("抗争：数字を使わずBPのみで比較");
  if (G.forbiddenNumber !== null)
    effects.push("プレイ禁止：数字" + G.forbiddenNumber + "のカードを出せない");
  if (G.makimaActive)
    effects.push("マキマ：英種族の数字+2、魔種族の数字-2（範囲1〜7）");
  if (G.gabrielBuffOwner !== null)
    effects.push(
      "ガブリエル：" +
        (G.players[G.gabrielBuffOwner]?.name || "プレイヤー") +
        "の対象カードの数字が上昇",
    );
  if (G.newWordBuffOwner !== null)
    effects.push(
      "ニューワード：" +
        (G.players[G.newWordBuffOwner]?.name || "プレイヤー") +
        "の対象カードの数字が上昇",
    );
  if (G.pendingGodzilla) effects.push("ゴジラ：効果処理待ち");
  if (G.pendingHulk) effects.push("ハルク：効果処理待ち");
  if (G.pendingAruru) effects.push("アルル：効果処理待ち");
  if (G.pendingNeku) effects.push("ネク：効果処理待ち");
  if (G.pendingMadoka) effects.push("まどか：効果処理待ち");
  if (G.pendingGuri) effects.push("グリ：効果処理待ち");
  if (G.pendingGura) effects.push("グラ：効果処理待ち");
  if (G.pendingNeito) effects.push("ネート：数字指定の効果処理待ち");
  if (G.pendingSpiderMan)
    effects.push("スパイダーマン：数字7指定の効果処理待ち");
  let html =
    '<section style="padding:12px;border:1px solid #40536b;border-radius:12px;margin-bottom:14px"><h3 style="margin:0 0 8px">全体に適用中の状態・効果</h3>';
  html += effects.length
    ? '<ul style="margin:0;padding-left:22px">' +
      effects.map((x) => "<li>" + esc(x) + "</li>").join("") +
      "</ul>"
    : '<p style="margin:0;color:#aab8ca">現在、全体に適用中として記録されている特殊状態・効果はありません。</p>';
  html += "</section>";
  html +=
    '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px">';
  G.players.forEach((p, i) => {
    const own = [];
    own.push("コスト：" + p.cost + "/3");
    own.push(p.passed ? "この場ではパス済み" : "この場では未パス");
    own.push(p.activated ? "アクティベイト使用済み" : "アクティベイト未使用");
    if (G.gabrielBuffOwner === i) own.push("ガブリエルの数字上昇効果の対象");
    if (G.newWordBuffOwner === i) own.push("ニューワードの数字上昇効果の対象");
    if (G.makimaActive) own.push("マキマの種族別数字変動が適用");
    const grantCards = p.grave.filter((c) =>
      /付与/.test(String(c.effect || c.text || c.description || "")),
    );
    if (grantCards.length)
      own.push("墓地の付与カード：" + grantCards.map((c) => c.name).join("、"));
    const fieldCards = G.field
      .filter((x) => x.player === i)
      .map((x) => x.card?.name)
      .filter(Boolean);
    html +=
      '<section style="padding:12px;border:1px solid #40536b;border-radius:12px"><h3 style="margin:0 0 8px">' +
      esc(p.name) +
      '</h3><ul style="margin:0;padding-left:20px">' +
      own.map((x) => "<li>" + esc(x) + "</li>").join("") +
      '</ul><p style="margin:8px 0 0;color:#aab8ca;font-size:13px">場のカード：' +
      (fieldCards.length ? fieldCards.map(esc).join("、") : "なし") +
      "</p></section>";
  });
  html +=
    '</div><p style="font-size:12px;color:#9baec4;margin:12px 0 0">※実装済みの効果状態を表示します。カード固有の継続効果のうち、内部状態として管理されていないものは、場・墓地のカード情報として確認してください。</p>';
  document.getElementById("fieldStatusContent").innerHTML = html;
  const overlay = document.getElementById("fieldStatusOverlay");
  overlay.style.display = "flex";
  overlay.setAttribute("aria-hidden", "false");
}
function closeFieldStatus() {
  const overlay = document.getElementById("fieldStatusOverlay");
  overlay.style.display = "none";
  overlay.setAttribute("aria-hidden", "true");
}

// サンラク効果の選択UIイベント（PC・タッチ端末共通）
document.getElementById("sunrakuReturnBtn").addEventListener("click", () => {
  if (!sunrakuState) return;
  sunrakuState.mode = "pick";
  sunrakuState.selected = [];
  render();
});
document
  .getElementById("sunrakuSkipBtn")
  .addEventListener("click", () => finishSunraku(false));
document
  .getElementById("sunrakuConfirmBtn")
  .addEventListener("click", () => finishSunraku(true));
document.getElementById("sunrakuCancelBtn").addEventListener("click", () => {
  if (!sunrakuState) return;
  sunrakuState.mode = "choice";
  sunrakuState.selected = [];
  render();
});
document.getElementById("sunrakuPickList").addEventListener("click", (e) => {
  const btn = e.target.closest("[data-sunraku-pick]");
  if (!btn || !sunrakuState || sunrakuState.mode !== "pick") return;
  selectCard(btn.dataset.sunrakuPick);
});
document
  .getElementById("fieldStatusBtn")
  .addEventListener("click", showFieldStatus);
document
  .getElementById("fieldStatusClose")
  .addEventListener("click", closeFieldStatus);
document.getElementById("fieldStatusOverlay").addEventListener("click", (e) => {
  if (e.target.id === "fieldStatusOverlay") closeFieldStatus();
});
document.getElementById("returnMenuBtn").addEventListener("click", () => {
  resetMatchOutcome();
  window.stopLightEntry?.();
  window.stopDoomEntry?.();
  window.stopHulkEntry?.();
  window.stopMadokaEntry?.();
  window.stopAvaEntry?.();
  window.stopLuxordEntry?.();
  window.stopArceusEntry?.();
  window.stopHomuraRewind?.();
  window.stopSurtMeteors?.();
  window.stopZomaEntry?.();
  window.stopTomodachiEntry?.();
  cancelZomaBgm();
  closeFieldStatus();
  // メニューへ戻る際は革命状態の画面演出を必ず解除する
  document.body.classList.remove("revolution-mode","conflict-mode");
  document.getElementById("deathNoteModal")?.remove();
  gameStarted = false;
  stopGameBgms();
  window.DAISHUGO_AUDIO?.stopAll();
  [
    "classicPicker",
    "excelChoiceModal",
    "deckOverlay",
    "optionsOverlay",
    "titlesModal",
    "graveModal",
    "madokaModal",
    "cardZoomModal",
    "initialLeadModal",
  ].forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.remove("open");
    el.hidden = true;
    el.style.display = "none";
    el.setAttribute("aria-hidden", "true");
  });
  const menu = document.getElementById("mainMenu");
  if (menu) {
    menu.hidden = false;
    menu.style.display = "flex";
    menu.style.visibility = "visible";
    menu.style.pointerEvents = "auto";
  }
  window.scrollTo(0, 0);
});

// These hooks adapt presentation/ownership, never duplicate a card effect.
function refreshActionPermissions() {
  if (!G) return;
  const busy = !!window.DAISHUGO_ONLINE_ADAPTER?.busy;
  const blocked = !!(
    G.winner ||
    G.initialLeadPending ||
    locked ||
    G.actionLocked ||
    busy ||
    !isLocalTurn()
  );
  const pass = document.getElementById("passBtn");
  pass.disabled = blocked || hasPendingEffect();
  if (blocked || hasPendingEffect()) {
    document.getElementById("playBtn").disabled = true;
    document.getElementById("spellBtn").disabled = true;
  }
  if (onlineMode) {
    document.getElementById("turnTag").textContent = G.winner
      ? G.players[G.winner.index].name + "の勝利"
      : G.players[G.current].name + "の番";
    if (!isLocalTurn() && !G.pendingNeku && !G.pendingHoshinoAi && !G.winner)
      document.getElementById("notice").textContent = "相手の手番です。";
    if (G.pendingNeku) {
      const seat = activeHumanSeat(),
        done = G.nekuConfirmed[seat];
      document.getElementById("effectDoneBtn").disabled =
        busy ||
        done ||
        (!G.nekuSelections[seat] && G.players[seat].hand.length > 0);
      document.getElementById("effectDoneBtn").textContent = done
        ? "全員の確定を待っています"
        : "自分の選択を確定";
    } else if (!isLocalTurn())
      document.getElementById("effectDoneBtn").disabled = true;
  }
}
function restoreEffectUI() {
  if (!G) return;
  const seat = activeHumanSeat();
  if (G.pendingMadoka && G.madokaOwner === seat) showMadokaDeck();
  if (G.pendingCureLemonade && G.cureLemonadeOwner === seat)
    showCureLemonadePicker();
  if (G.pendingTakina && G.takinaOwner === seat) showTakinaPicker();
  if (G.pendingFather && G.fatherOwner === seat) showFatherNumberPicker();
  if (
    G.pendingHoshinoAi &&
    !G.hoshinoAiConfirmed?.[seat] &&
    document.getElementById("hoshinoAiPicker")?.style.display !== "flex"
  )
    showHoshinoAiPicker();
}
function resolveNekuChoices() {
  if (!G?.pendingNeku || !G.nekuConfirmed.every(Boolean)) return false;
  const owner = G.nekuOwner;
  G.players.forEach((p, i) => {
    const c = p.hand.find((c) => c.id === G.nekuSelections[i]);
    if (c) destroyHandCard(p, c, "ネク", "6");
  });
  G.pendingNeku = false;
  G.nekuSelections = G.players.map(()=>null);
  G.nekuConfirmed = G.players.map(()=>false);
  G.nekuOwner = null;
  selected = null;
  selectedSpell = null;
  checkWinner();
  afterAction(owner);
  return true;
}
function resolveHoshinoAiChoices() {
  if (!G?.pendingHoshinoAi) return false;
  const owner = G.hoshinoAiOwner;
  let total = 0;
  G.players.forEach((p, i) => {
    const cards = (G.hoshinoAiSelections[i] || [])
      .map((id) => p.hand.find((c) => c.id === id))
      .filter((c) => c && c.kind === "follower" && c.tribe === "英種族")
      .slice(0, 2);
    const destroyedCount=cards.reduce((n,c)=>n+(destroyHandCard(p,c,"星野アイ","5")?1:0),0);
    total += destroyedCount;
    log(
      "星野アイの効果：" +
        p.name +
        "は英種族フォロワーを" +
        destroyedCount +
        "枚破壊しました。",
    );
  });
  const drawn = drawCards(G.players[owner], total);
  log(
    "星野アイの効果：" +
      G.players[owner].name +
      "は山札から" +
      drawn +
      "枚引きました。",
  );
  G.pendingHoshinoAi = false;
  G.hoshinoAiOwner = null;
  G.hoshinoAiSelections = G.players.map(()=>[]);
  G.hoshinoAiConfirmed = G.players.map(()=>false);
  selectedHoshinoAiIds = [];
  const modal = document.getElementById("hoshinoAiPicker");
  if (modal) modal.style.display = "none";
  locked = false;
  checkWinner();
  afterAction(owner);
  return true;
}

// Excel 2026-11-07: shared choices are serializable, so reconnects restore them.
function beginExcelChoice(choice) {
  if(!G.effectResultContext)startEffectResults(choice.owner,choice.source);
  G.pendingExcelChoice = {...choice, selected: []};
  if (!G.players[choice.owner].human) {
    G.pendingExcelChoice.selected = choice.ids.slice(0, choice.max);
    finishExcelChoice(true);
  } else renderExcelChoice();
}
function renderExcelChoice() {
  let modal = document.getElementById('excelChoiceModal');
  const q = G?.pendingExcelChoice;
  if (!q || q.owner !== activeHumanSeat()) { if (modal) modal.remove(); return; }
  if (!modal) {
    modal = document.createElement('div'); modal.id = 'excelChoiceModal';
    modal.style.cssText = 'position:fixed;inset:0;z-index:5300;background:#000d;display:flex;align-items:center;justify-content:center;padding:16px';
    document.body.appendChild(modal);
  }
  modal.style.display = 'flex';
  const p = G.players[q.owner], cards = q.stage==='killer' ? [{id:'add',name:'手札に加える'},{id:'destroy',name:'破壊する'}] : q.stage==='homuraReturn' ? G.field.filter(x=>q.ids.includes(x.card.id)).map(x=>x.card) : q.stage==='rufusTarget'
    ? q.ids.map(id=>({id,name:G.players[Number(id)].name}))
    : q.stage==='rufusDestroy' ? q.revealed : [...p.hand,...p.deck,...p.grave].filter(c=>q.ids.includes(c.id));
  const instructions=q.stage==='homuraReturn'?'手札に戻すならカードを選択。戻さない場合は未選択で確定':q.stage==='ava'?'このカードの上に出すフォロワーを1枚選択':q.stage==='killer'?'山札の一番上：'+q.revealed[0].name+'。手札に加えるか破壊するか選択':q.stage==='sazaeDestroy'?'破壊するコスト3のフォロワーを1枚選択':q.stage==='rufusTarget'?'相手プレイヤーを1人選択':q.stage==='rufusDestroy'?'公開したカードから破壊する1枚を選択':q.stage==='dragonDestroy'?'破壊する龍種族フォロワーを1枚選択':q.stage==='destroy'?'破壊する魔種族フォロワーを0〜2枚選択':'手札に加えるフォロワーを'+q.min+'枚選択';
  modal.innerHTML = '<section style="background:#172231;color:white;padding:20px;border-radius:14px;max-width:950px;max-height:85vh;overflow:auto"><h2>'+escapeHtml(q.source)+'</h2><p>'+instructions+'</p>'+(q.stage==='killer'?cardHtml(q.revealed[0],false):'')+'<div id="excelChoiceCards" style="display:flex;gap:8px;flex-wrap:wrap"></div><button id="excelChoiceConfirm" style="padding:12px;margin-top:16px">選択を確定</button></section>';
  const list = modal.querySelector('#excelChoiceCards');
  cards.forEach(c=>{
    const b=document.createElement('button'); b.type='button'; b.innerHTML=['rufusTarget','killer'].includes(q.stage)?escapeHtml(c.name):cardHtml(c,false);
    b.style.cssText='width:140px;border:3px solid '+(q.selected.includes(c.id)?'#ffd84d':'#53657b');
    b.disabled=!canOperateEffect(q.owner);
    b.onclick=()=>{ if(!canOperateEffect(q.owner))return; q.selected=q.selected.includes(c.id)?q.selected.filter(id=>id!==c.id):q.selected.length<q.max?[...q.selected,c.id]:q.selected; renderExcelChoice(); };
    list.appendChild(b);
  });
  const confirm=modal.querySelector('#excelChoiceConfirm');
  confirm.disabled=!canOperateEffect(q.owner)||q.selected.length<q.min||q.selected.length>q.max;
  confirm.onclick=()=>finishExcelChoice();
}
function finishExcelChoice(cpu = false) {
  const q=G?.pendingExcelChoice;
  if(!q || (!cpu && !canOperateEffect(q.owner)))return;
  const p=G.players[q.owner], zone=q.stage==='killer'?q.ids.map(id=>({id})):q.stage==='homuraReturn'?G.field.map(x=>x.card):q.stage==='ava'?p.hand:q.stage==='takemichi'?[...p.deck,...p.grave]:q.stage==='rufusTarget'?q.ids.map(id=>({id})):q.stage==='rufusDestroy'?q.revealed:['destroy','dragonDestroy','sazaeDestroy'].includes(q.stage)?p.hand:p.deck;
  const ids=[...new Set(q.selected)];
  if(ids.length<q.min || ids.length>q.max || ids.some(id=>!q.ids.includes(id)||!zone.some(c=>c.id===id)))return;
  G.pendingExcelChoice=null;
  document.getElementById('excelChoiceModal')?.remove();
  if(q.stage==='homuraReturn') {
    const card=G.field.find(x=>x.card.id===q.ids[0])?.card;
    if(card){card.homuraFlowDecided=true;card.homuraReturn=ids.length>0;}
    if(card && ids.length){
      G.field=G.field.filter(x=>x.card.id!==card.id);
      delete card.homuraReturn;delete card.homuraFlowDecided;
      G.players[q.owner].hand.push(card);
      G.homuraRewindSerial=(G.homuraRewindSerial||0)+1;
      G.pendingHomuraRewind={id:String(G.matchId)+':'+G.homuraRewindSerial,driver:onlineMode?activeHumanSeat():q.owner,flowPlayer:q.flowPlayer,endsAt:Date.now()+5000};
      G.actionLocked=true;locked=true;render();return;
    }
    flow(q.flowPlayer);render();if(!cpu&&isCpuTurn()&&!hasPendingEffect())cpuLoop();return;
  } else if(q.stage==='ava') {
    const card=p.hand.find(x=>x.id===ids[0]);
    if(!card||card.kind!=='follower'||fieldNumber(card)>5||effectiveCost(card,p)>2)return;
    card.avaReturn=true;
    card.avaBlessedByAva=true;
    log('アヴァ：'+card.name+'をコストを払わず場に出しました。場が流れたら手札に戻します。');
    doPlay(q.owner,p.hand.findIndex(x=>x.id===card.id),null,true);
  } else if(q.stage==='takemichi') {
    const chosen=[...p.deck,...p.grave].find(x=>x.id===ids[0]);
    p.deck=shuffle(p.deck.filter(x=>x.id!==chosen.id));p.grave=p.grave.filter(x=>x.id!==chosen.id);p.hand.push(chosen);
    log('花垣武道：佐野万次郎を手札に加えました。');
  } else if(q.stage==='killer') {
    const top=p.deck[p.deck.length-1];
    if(top?.id===q.revealed[0].id){p.deck.pop();if(ids[0]==='destroy'){resetSunrakuEffect(top);p.grave.push(top);}else p.hand.push(top);}
    collectEffectResults();G.effectResultContext=null;
    const spell=p.hand.find(x=>x.id===q.spellId);spell.excelResolved=true;
    doPlay(q.owner,p.hand.findIndex(x=>x.id===q.followerId),q.spellId);delete spell.excelResolved;
  } else if(q.stage==='rufusTarget') {
    const target=Number(ids[0]), op=G.players[target];
    const revealed=op.deck.slice(-3).reverse();
    log('ルーファウス：'+op.name+'の山札上から公開：'+(revealed.map(c=>c.name).join('、')||'カードなし'));
    if(revealed.length){
      beginExcelChoice({owner:q.owner,source:q.source,stage:'rufusDestroy',target,revealed,ids:revealed.map(c=>c.id),min:1,max:1});
      if(!cpu)render();
      return;
    }
  } else if(q.stage==='rufusDestroy') {
    const op=G.players[q.target], chosen=q.revealed.find(c=>c.id===ids[0]);
    const prevented=preventEndoDestruction(op,q.source,q.owner);
    op.deck=op.deck.filter(c=>!q.ids.includes(c.id));
    if(!prevented){resetSunrakuEffect(chosen);op.grave.push(chosen);}
    op.deck.unshift(...shuffle(q.revealed.filter(c=>prevented||c.id!==chosen.id)));
    log('ルーファウス：'+(prevented?'破壊は無効になり、公開したカードを':'選んだカードを破壊し、残りを')+'ランダムに山札の下へ戻しました。');
  } else if(q.stage==='sazaeDestroy') {
    if(destroyHandCard(p,p.hand.find(c=>c.id===ids[0]),q.source,'1')) {
      const count=drawCards(p,2);log(q.source+'：山札から'+count+'枚引きました。');
    }
  } else if(q.stage==='dragonDestroy') {
    ids.forEach(id=>destroyHandCard(p,p.hand.find(c=>c.id===id),q.source,'6'));
  } else if(q.stage==='destroy') {
    ids.forEach(id=>destroyHandCard(p,p.hand.find(c=>c.id===id),q.source,'L'));
    const candidates=p.deck.filter(c=>c.kind==='follower'&&c.tribe==='魔種族');
    const count=Math.min(ids.length,candidates.length);
    if(count) {
      beginExcelChoice({owner:q.owner,source:q.source,stage:'search',ids:candidates.map(c=>c.id),min:count,max:count});
      if(!cpu)render();
      return;
    }
    p.deck=shuffle(p.deck);
  } else {
    const chosen=ids.map(id=>p.deck.find(c=>c.id===id));
    p.deck=p.deck.filter(c=>!ids.includes(c.id)); p.hand.push(...chosen);
    if(q.stage!=='phone')p.deck=shuffle(p.deck);
    log(q.source+'：'+chosen.map(c=>'「'+c.name+'」').join('、')+'を手札に加えました。');
    if(q.stage==='phone') {
      collectEffectResults();G.effectResultContext=null;
      const spell=p.hand.find(c=>c.id===q.spellId);
      spell.excelResolved=true;
      doPlay(q.owner,p.hand.findIndex(c=>c.id===q.followerId),q.spellId);
      delete spell.excelResolved;
    }
  }
  if(!cpu) { if(!hasPendingEffect())checkWinner(); afterAction(q.owner); }
}
function tomodachiCanActivate() {
  return G.players.reduce((n,p)=>n+p.grave.filter(c=>c.kind==='follower'&&c.number==='L').length,0)===6;
}
function luxordCanActivate(pi) {
  return !(G.players[pi].playedLRounds || []).includes(G.turn - 1);
}
function luxordTargetCount() {
  return G.players.reduce((n, p) => n + p.hand.filter(c => c.kind === 'follower' && c.number === 'L').length + p.deck.filter(c => c.kind === 'follower' && c.number === 'L').length, 0);
}
function resolveExcelFanfare(pi,c) {
  const p=G.players[pi];
  switch(c.name) {
    case 'アルセウス': {
      const pool=DATA.catalog.filter(x=>ONLINE_IMPLEMENTED_NAMES.has(x.name));
      p.deck=p.deck.map((old,i)=>{
        const choices=pool.filter(x=>x.kind===old.kind&&(x.kind==='spell'||String(x.number)===String(old.number)));
        if(!choices.length)return old;
        const card=cloneCard(choices[Math.floor(Math.random()*choices.length)],'arceus-'+G.turn+'-'+pi+'-'+i);
        if(card.kind==='follower'){card.cost=Math.max(0,Number(card.cost)-1);card.arceusDiscount=true;}
        return card;
      });
      log('アルセウス：山札を数字別・スペルの枚数を維持してランダムに変化させ、変化したフォロワーのコストを1下げました。');return true;
    }
    case 'スヌーピー':
    case '花垣武道':
    case 'アヴァ': {
      const choices=c.name==='スヌーピー'?p.deck.filter(x=>x.kind==='follower'&&Number(x.cost)===0):c.name==='花垣武道'?[...p.deck,...p.grave].filter(x=>x.name==='佐野万次郎'):p.hand.filter(x=>x.kind==='follower'&&fieldNumber(x)<=5&&effectiveCost(x,p)<=2);
      if(choices.length)beginExcelChoice({owner:pi,source:c.name,stage:c.name==='アヴァ'?'ava':c.name==='花垣武道'?'takemichi':'search',ids:choices.map(x=>x.id),min:1,max:1});
      else if(c.name!=='アヴァ')p.deck=shuffle(p.deck);
      return true;
    }
    case '佐野万次郎':
      G.conflict=!G.conflict;G.revolution=false;G.sherryRestoreRevolution=null;G.sherryRestoreConflict=null;
      log('佐野万次郎：場を'+(G.conflict?'抗争状態（BPのみで比較）':'通常状態')+'にしました。');
      // セリフ再生中のみ番を停止する。BGM本編は操作を再開してから流す。
      locked=true;
      G.actionLocked=true;
      window.startSanoEntry?.(pi);
      return true;
    case 'ドクタードゥーム':
      // Excel原文：自分の山札・場・墓地にあるフォロワーのみ（L以外）。
      // 発動時の対象カードIDを記録して永続適用し、手札と相手のカードは対象外とする。
      const doomTargets=[
        ...p.deck,
        ...p.grave,
        ...G.field.filter(entry=>entry.player===pi).map(entry=>entry.card),
      ].filter(card=>card && card.kind==='follower' && String(card.number)!=='L');
      applyNumberChange({source:c.name,value:4,priority:2,cardIds:[...new Set(doomTargets.map(card=>card.id))]});
      drawCards(p,1);
      log('ドクタードゥーム：1枚ドロー。発動時に自分の山札・場・墓地にあるフォロワー（L以外）の数字を永続で4にしました（優先度+2）。');
      return true;
    case '夜神月':
      G.pendingDeathNote={owner:pi};
      if(!p.human){
        const pool=DATA.catalog.filter(x=>x.kind==='follower'&&ONLINE_IMPLEMENTED_NAMES.has(x.name)&&!p.hand.some(h=>h.name===x.name));
        G.pendingDeathNote.cpuName=(pool[Math.floor(Math.random()*pool.length)]||c).name;
      }
      renderDeathNote();
      return true;
    case '封印されしエクゾディア':
      if(canWinWithExodia(p)){G.exodiaVictoryOwner=pi;recordFollowerEffect(pi,c.name);log('封印されしエクゾディア：特殊勝利条件を満たしました。');}
      else log('封印されしエクゾディア：墓地の封印パーツ4種、数字7・Lが0枚の条件を満たしていません。');
      return true;
    case 'フグ田サザエ': {
      const choices=p.hand.filter(x=>x.kind==='follower'&&Number(x.cost)===3);
      if(choices.length)beginExcelChoice({owner:pi,source:c.name,stage:'sazaeDestroy',ids:choices.map(x=>x.id),min:1,max:1});
      else log('フグ田サザエ：手札にコスト3のフォロワーがないため、カードは引きません。');
      return true;
    }
    case 'ハウル': {
      const at=G.field.findIndex(x=>x.card.id===c.id), below=G.field[at-1]?.card;
      if(below?.tribe==='魔種族')drawCards(p,2);
      return true;
    }
    case '金木研': {
      const at=G.field.findIndex(x=>x.card.id===c.id), below=G.field[at-1]?.card;
      if(below)drawCards(p,Number(below.cost)||0);
      return true;
    }
    case 'マガイマガド': {
      const choices=p.hand.filter(x=>x.kind==='follower'&&x.tribe==='龍種族');
      if(choices.length)beginExcelChoice({owner:pi,source:c.name,stage:'dragonDestroy',ids:choices.map(x=>x.id),min:1,max:1});
      return true;
    }
    case 'ルーファウス':
      beginExcelChoice({owner:pi,source:c.name,stage:'rufusTarget',ids:G.players.map((_,i)=>String(i)).filter(i=>Number(i)!==pi),min:1,max:1});
      return true;
    case 'ルクソード':
      if(luxordCanActivate(pi)) {
        G.players.forEach(op=>{
          op.hand.filter(x=>x.kind==='follower'&&x.number==='L').forEach(x=>destroyHandCard(op,x,c.name,c.number));
          const doomed=op.deck.filter(x=>x.kind==='follower'&&x.number==='L');
          if(doomed.length && !preventEndoDestruction(op,c.name,pi)){op.deck=op.deck.filter(x=>!doomed.includes(x)); op.grave.push(...doomed);}
        });
        log('ルクソード：全員の手札・山札のLフォロワーを破壊しました。');
      } else log('ルクソード：前の番にLを出していたため効果は発動しません。');
      return true;
    case 'リオレウス': {
      const choices=p.deck.filter(x=>x.kind==='follower'&&x.tribe==='龍種族'&&fieldNumber(x)<=5);
      if(choices.length)beginExcelChoice({owner:pi,source:c.name,stage:'search',ids:choices.map(x=>x.id),min:1,max:1});
      else { p.deck=shuffle(p.deck); log('リオレウス：山札に対象がありません。'); }
      return true;
    }
    case 'ヨッシー':
      if(!c.yoshiBoost && G.field.some(x=>x.card.id===c.id)) { c.bp+=6000; c.yoshiBoost=true; }
      log('ヨッシー：場にある間BPを6000上げます。'); return true;
    case '大魔王ゾーマ':
      [...p.hand,...p.deck].filter(x=>x.kind==='follower'&&x.number!=='L').forEach(x=>{x.zomaBonus=(x.zomaBonus||0)+(x.tribe==='魔種族'?2:-2);});
      log('大魔王ゾーマ：自分の手札・山札の魔種族は数字+2、それ以外は-2。'); return true;
    case 'ともだち':
      if(tomodachiCanActivate()) {
        recordFollowerEffect(pi,c.name);
        G.revolution=!G.revolution;
        if(G.sherryRestoreRevolution!=null)G.sherryRestoreRevolution=G.revolution;
        log('ともだち：全員の墓地にLが合計6枚あるため'+(G.revolution?'革命状態':'通常状態')+'にしました。');
      } else log('ともだち：墓地のLが合計6枚ではないため効果は発動しません。');
      return true;
    case 'アルティメットまどか': {
      const choices=p.hand.filter(x=>x.kind==='follower'&&x.tribe==='魔種族');
      if(choices.length)beginExcelChoice({owner:pi,source:c.name,stage:'destroy',ids:choices.map(x=>x.id),min:0,max:Math.min(2,choices.length)});
      else p.deck=shuffle(p.deck);
      return true;
    }
  }
  return false;
}

function availableCost(p, spell=null){
 spell=spell||p.hand.find(c=>c.id===selectedSpell);
 return spell?.name==='ハッスルねじ' && (p.turnVisits||1)>=3 ? Math.min(3,p.cost+3) : p.cost;
}
document.getElementById('cpuDifficulty').value=cpuDifficulty;
let classicDraft=[], classicKey='';
function renderClassicPicker(){
 const seat=activeHumanSeat(), p=G?.players[seat];
 const kind=G?.pendingNeku&&!G.nekuConfirmed?.[seat]?'ネク':isLocalTurn()&&G?.pendingAruru?'アルル':isLocalTurn()&&G?.pendingHulk&&!G.hulkResolved?'ハルク':isLocalTurn()&&G?.pendingGodzilla&&!G.godzillaResolved?'ゴジラ':isLocalTurn()&&G?.pendingGuri?'ぐり':isLocalTurn()&&G?.pendingGura?'ぐら':isLocalTurn()&&pendingSuperMushroom?'スーパーキノコ':null;
 let modal=document.getElementById('classicPicker');
 if(!kind){modal?.remove();classicKey='';return;}
 const key=(G.effectSequence||0)+kind+seat;
 if(key!==classicKey){classicDraft=[];classicKey=key;}
 if(!modal){modal=document.createElement('div');modal.id='classicPicker';document.body.appendChild(modal);}
 modal.style.cssText='position:fixed;inset:0;z-index:5100;background:#000d;display:flex;align-items:center;justify-content:center;padding:14px';
 modal.innerHTML='<section style="background:#172231;color:white;padding:20px;max-height:85vh;overflow:auto;max-width:900px"><h2>'+kind+'：破壊するカードを選択</h2><p>カードを選び、確定してください。確定前は選び直せます。</p><div id="classicCards" style="display:flex;flex-wrap:wrap;gap:8px"></div><button id="classicConfirm">選択を確定</button></section>';
 p.hand.filter(c=>kind==='ゴジラ'?c.kind==='follower'&&fieldNumber(c)>=5:kind==='ぐり'?c.name==='ぐら':kind==='ぐら'?c.name==='ぐり':kind==='スーパーキノコ'?![pendingSuperMushroom.followerId,pendingSuperMushroom.spellId].includes(c.id):kind!=='アルル'||c.kind==='follower').forEach(c=>{
 const b=document.createElement('button');b.innerHTML=cardHtml(c,false);b.style.cssText='width:140px;border:3px solid '+(classicDraft.includes(c.id)?'#ffd84d':'#53657b');
 b.onclick=()=>{if(!canOperateEffect(seat))return; if(classicDraft.includes(c.id))classicDraft=classicDraft.filter(id=>id!==c.id);else if(kind!=='アルル')classicDraft=[c.id];else if(classicDraft.length<2&&(!classicDraft.length||currentNumberLabel(p.hand.find(x=>x.id===classicDraft[0]))===currentNumberLabel(c)))classicDraft.push(c.id);renderClassicPicker();};modal.querySelector('#classicCards').appendChild(b);
 });
 if(kind==='ゴジラ'){
   const skip=document.createElement('button');skip.id='classicGodzillaSkip';skip.textContent='破壊しない';
   skip.disabled=!canOperateEffect(seat);
   skip.onclick=()=>{if(!canOperateEffect(seat))return;document.getElementById('godzillaSkipBtn').onclick();};
   modal.querySelector('section').appendChild(skip);
 }
 const btn=modal.querySelector('#classicConfirm');btn.disabled=!canOperateEffect(seat)||classicDraft.length!==(kind==='アルル'?2:p.hand.length?1:0);
 btn.onclick=()=>{if(btn.disabled||!canOperateEffect(seat))return;const ids=[...classicDraft];modal.remove();
 if(['ゴジラ','ぐり','ぐら','スーパーキノコ'].includes(kind)){selectCard(ids[0]);if(kind==='ゴジラ')document.getElementById('effectDoneBtn').onclick();return;}
 if(kind==='ネク')G.nekuSelections[seat]=ids[0]||null;
 if(kind==='アルル')G.aruruSelections=ids;
 if(kind==='ハルク'){destroyHandCard(p,p.hand.find(c=>c.id===ids[0]),'ハルク','4');G.hulkResolved=true;}
 document.getElementById('effectDoneBtn').onclick();};
}


function followerEffectSnapshot(){
  const card=c=>[c.id,c.number,c.bp,c.cost,c.tribe,c.zomaBonus||0,c.bigLightBoost||false];
  const flags=['numberChanges','revolution','conflict','forbiddenNumber','forbiddenNumbers','gabrielPendingOwner','newWordPendingOwner','makimaPending','gabrielBuffOwner','newWordBuffOwner','makimaActive'];
  return JSON.stringify({players:G.players.map(p=>({hand:p.hand.map(card),deck:p.deck.map(card),grave:p.grave.map(card),cost:p.cost})),field:G.field.map(x=>[x.player,card(x.card)]),flags:flags.map(k=>G[k]??null)});
}
function beginFollowerEffect(owner,c){
  collectEffectResults();
  startEffectResults(owner,c.name);
  G.titleEffectPending={owner,name:c.name,before:followerEffectSnapshot()};
}
function recordFollowerEffect(owner,name){
  if(!G||owner<0||!name)return;
  G.titleComboBySeat=G.titleComboBySeat||{};
  const q=G.titleComboBySeat[owner]||(G.titleComboBySeat[owner]={names:[],awarded:false});
  if(!q.names.includes(name))q.names.push(name);
  if(q.names.length>=5&&!q.awarded){q.awarded=true;addTitleProgress(owner,'ultimate_combo');}
}
function finishFollowerEffect(){
  collectEffectResults();
  const q=G?.titleEffectPending;if(!q)return;
  if(q.before!==followerEffectSnapshot())recordFollowerEffect(q.owner,q.name);
  if(!locked&&!hasPendingEffect())G.titleEffectPending=null;
}

function addTitleProgress(owner,key){
 if(!G || owner<0)return;
 if(!onlineMode){if(owner===0)G.titleMatchProgress[key]=(G.titleMatchProgress[key]||0)+1;return;}
 G.titleBySeat=G.titleBySeat||{};
 const stats=G.titleBySeat[owner]||(G.titleBySeat[owner]={});stats[key]=(stats[key]||0)+1;
}
function commitOnlineTitles(){
 if(!G?.winner || !G.matchId || activeHumanSeat()<0)return;
 const key='daishugo.titleCommitted.'+G.matchId+'.'+activeHumanSeat();
 if(localStorage.getItem(key))return;
 const stats=loadTitleStats(),add=G.titleBySeat?.[activeHumanSeat()]||{};
 for(const [k,v] of Object.entries(add))if(k!=='com_normal_win')stats[k]=(stats[k]||0)+v;
 localStorage.setItem(DAISHUGO_TITLE_STATS_KEY,JSON.stringify(stats));localStorage.setItem(key,'1');window.DAISHUGO_SHOP?.refresh();
}

// One-shot character BGM: newer card audio takes priority.
// When a character theme ends, return to the ordinary match BGM, never another character theme.
let zomaBgmSession = null;
function safeZomaPlay(audio) {
  if(["gameBgm1","gameBgm2"].includes(audio.id))stabilizeBgmPlayback(audio);
  try { const p=audio.play(); if(p?.catch)p.catch(()=>{}); } catch(e) {}
}
function cancelZomaBgm() {
  const session=zomaBgmSession;
  zomaBgmSession=null;
  if(session){
    session.dispose?.();
    session.audio.onended=null;
    session.audio.onerror=null;
    session.audio.pause();
  }
  // The short Roxas track is also a character soundtrack.
  document.getElementById('roxasBgm')?.pause();
}
function startCharacterBgm(source,options={}){
  const old=zomaBgmSession;
  // Only one character theme may play at a time. The normal match BGM
  // remains paused in the background until the current theme finishes.
  if(old){
    zomaBgmSession=null;
    old.dispose?.();
    old.audio.onended=null;old.audio.onerror=null;old.audio.pause();
  }
  ['gameBgm1','gameBgm2','roxasBgm'].forEach(id=>document.getElementById(id)?.pause());
  const audio=new Audio(options.introSource||source);
  window.DAISHUGO_AUDIO?.buffer(audio);
  audio.loop=false;audio.preload='auto';
  if(options.introSource)audio.volume=1;else applyCharacterBgmMobileVolume(audio,options.baseVolume??0.7);
  const session={audio,source,stage:options.introSource?'intro':'song'};
  zomaBgmSession=session;
  let introTimer=null,disposed=false,stage=options.introSource?'intro':'song';
  const dispose=()=>{
    if(disposed)return;
    disposed=true;
    if(introTimer!==null){clearTimeout(introTimer);introTimer=null;}
    options.cleanup?.();
  };
  session.dispose=dispose;
  const finish=()=>{
    if(zomaBgmSession!==session)return;
    dispose();
    session.audio.pause();session.audio.onended=null;session.audio.onerror=null;
    zomaBgmSession=null;
    if(!G || G.winner)return;
    if(!gameBgmEnabled)return;
    // Never reinstate Zoma, Sano, Tomodachi, Roxas or any other old
    // character track. Restore only the appropriate normal battle BGM.
    const normalTrack = G.players?.some(p => Array.isArray(p.deck) && p.deck.length === 0) ? 2 : 1;
    playGameBgm(normalTrack);
  };
  const beginSong=()=>{
    if(zomaBgmSession!==session || stage!=='intro')return;
    stage='song';
    session.stage='song';
    if(introTimer!==null){clearTimeout(introTimer);introTimer=null;}
    audio.onended=null;audio.onerror=null;audio.pause();
    options.introFinished?.();
    const music=new Audio(source);window.DAISHUGO_AUDIO?.buffer(music);music.loop=false;music.preload='auto';
    applyCharacterBgmMobileVolume(music,options.baseVolume??0.7);
    session.audio=music;
    music.onended=finish;music.onerror=finish;
    if(!gameBgmEnabled){finish();return;}
    try{const promise=music.play();if(promise?.catch)promise.catch(finish);}catch(e){finish();}
  };
  if(options.introSource){
    // An explicitly fixed introduction duration does not end early if the voice is short.
    audio.onended=options.introDurationMs?null:beginSong;audio.onerror=options.introDurationMs?null:beginSong;
    introTimer=setTimeout(beginSong,options.introDurationMs||options.introMaxMs||8100);
    try{const promise=audio.play();if(promise?.catch)promise.catch(()=>{if(!options.introDurationMs)beginSong();});}catch(e){if(!options.introDurationMs)beginSong();}
  }else{
    audio.onended=finish;audio.onerror=finish;
    if(Number.isFinite(options.resumeAt) && options.resumeAt>0){try{audio.currentTime=options.resumeAt;}catch(e){}}
    if(gameBgmEnabled)safeZomaPlay(audio);
  }
  return session;
}
window.startZomaBgm=()=>startCharacterBgm('./effects/assets/zoma-bgm.mp3');
window.startTomodachiBgm=()=>startCharacterBgm('./effects/assets/tomodachi-bgm.mp3');
window.startSanoEntry=(owner)=>{
  const hide=window.showSanoEntryImage?.();
  // 他のオンライン席では画像・音だけを再生。対戦状態は操作権限のある席が進める。
  const authoritative=Number.isInteger(owner) && !!G?.players?.[owner];
  const matchId=G?.matchId;
  const effectSequence=G?.effectSequence;
  let completed=false;
  const finishIntro=()=>{
    hide?.();
    if(!authoritative || completed)return;
    completed=true;
    if(!G || G.matchId!==matchId || G.effectSequence!==effectSequence || G.winner)return;
    if(!G.actionLocked)return;
    locked=false;
    G.actionLocked=false;
    afterAction(owner);
    notifyGameChanged();
  };
  startCharacterBgm('./effects/assets/sano-white-noise.mp3',{
    introSource:'./effects/assets/sano-inaiyona.m4a',
    introFinished:finishIntro,cleanup:hide,introDurationMs:8000
  });
};

function matchTurnOrder(){
 const order=G?.turnOrder;
 return order?.length===G.players.length&&new Set(order).size===G.players.length&&order.every(i=>Number.isInteger(i)&&i>=0&&i<G.players.length)?order:G.players.map((_,i)=>i);
}
function nextTurnSeat(seat){const order=matchTurnOrder();return order[(order.indexOf(seat)+1)%order.length];}
function turnDistance(seat,from){const order=matchTurnOrder();return (order.indexOf(seat)-order.indexOf(from)+order.length)%order.length;}

// Sound-only effect: shared counter reaches every seat without locking gameplay.
let bellAngelSoundMatch = null;
let bellAngelSoundSeen = 0;
function syncBellAngelEffectSound() {
  if (!G) return;
  const count = G.bellAngelSoundCount || 0;
  if (bellAngelSoundMatch !== G.matchId) {
    bellAngelSoundMatch = G.matchId;
    bellAngelSoundSeen = count;
    return; // Joining/reloading a match must not replay old effects.
  }
  if (count <= bellAngelSoundSeen) return;
  const pending = count - bellAngelSoundSeen;
  bellAngelSoundSeen = count;
  for (let i = 0; i < pending; i++) {
    try {
      const sound = new Audio('./effects/assets/bell-angel.m4a');
      sound.loop = false;
      const playing = sound.play();
      if (playing?.catch) playing.catch(() => {});
    } catch (_) {} // A playback failure must never interrupt the effect or turn.
  }
}

// The notebook is owner-editable; only the confirmed, exact name enters game state.
function renderDeathNote(){
  scheduleCpuDeathNote();
  const q=G?.pendingDeathNote;let modal=document.getElementById('deathNoteModal');
  if(!q){modal?.remove();return;}
  const owner=q.owner===activeHumanSeat();
  if(!modal){
    modal=document.createElement('div');modal.id='deathNoteModal';modal.className='death-note-overlay';
    modal.innerHTML='<section class="death-note-book" role="dialog" aria-modal="true" aria-labelledby="deathNoteTitle"><h2 id="deathNoteTitle">DEATH NOTE</h2><p id="deathNoteGuide"></p><label for="deathNoteName">フォロワーの名前</label><input id="deathNoteName" maxlength="120" autocomplete="off" spellcheck="false" placeholder="名前をここに記す"><p class="death-note-help">入力した名前と完全に一致するフォロワーを、全員の手札・山札から破壊します。</p><button id="deathNoteConfirm" type="button">この名前を確定する</button><p id="deathNoteError" role="status"></p></section>';
    document.body.appendChild(modal);
    modal.querySelector('#deathNoteConfirm').onclick=()=>resolveDeathNote(modal.querySelector('#deathNoteName').value);
    modal.querySelector('#deathNoteName').addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.isComposing)resolveDeathNote(e.target.value);});
    modal.querySelector('#deathNoteName').addEventListener('input',e=>{
      if(G?.pendingDeathNote?.owner!==activeHumanSeat()||!G.players[activeHumanSeat()]?.human)return;
      window.DAISHUGO_ONLINE_ADAPTER?.publishDeathNoteDraft?.(e.target.value,G.pendingDeathNote.owner);
    });
  }
  const editable=owner && G.players[q.owner]?.human && canOperateEffect(q.owner);
  modal.querySelector('#deathNoteGuide').textContent=editable?'名前を1つ記してください。':G.players[q.owner].name+'が名前を記しています…';
  const input=modal.querySelector('#deathNoteName');
  input.readOnly=!editable;
  input.placeholder=editable?'名前をここに記す':'記入中…';
  if(!editable)input.value=String(q.draft??window.DAISHUGO_DEATH_NOTE_DRAFT??'');
  modal.querySelector('#deathNoteConfirm').disabled=!editable;
}
window.DAISHUGO_SHOW_DEATH_NOTE_DRAFT=function(text){
  window.DAISHUGO_DEATH_NOTE_DRAFT=String(text||'');
  const input=document.querySelector('#deathNoteModal #deathNoteName');
  if(input&&input.readOnly)input.value=window.DAISHUGO_DEATH_NOTE_DRAFT;
};
function resolveDeathNote(name,cpu=false){
  const q=G?.pendingDeathNote;
  if(!q||(!cpu&&(q.owner!==activeHumanSeat()||!canOperateEffect(q.owner))))return false;
  if(typeof name!=='string'||!name.trim()||name.length>120){
    const error=document.getElementById('deathNoteError');if(error)error.textContent='フォロワーの名前を入力してください。';return false;
  }
  // Snapshot all targets before any Bell Angel draw/replacement effect resolves.
  const targets=G.players.map(p=>({p,hand:p.hand.filter(c=>c.kind==='follower'&&c.name===name),deck:p.deck.filter(c=>c.kind==='follower'&&c.name===name)}));
  let destroyedCount=0;
  for(const {p,hand,deck} of targets){
    if(!hand.length&&!deck.length)continue;
    if(preventEndoDestruction(p,'夜神月',q.owner))continue;
    p.deck=p.deck.filter(c=>!deck.includes(c));deck.forEach(c=>{resetSunrakuEffect(c);p.grave.push(c);});
    destroyedCount+=deck.length;
    collectEffectResults(true);
    hand.forEach(c=>{if(destroyHandCard(p,c,'夜神月','7'))destroyedCount++;});
  }
  log('夜神月：ノートに「'+name+'」と記し、全員の手札・山札から同名のフォロワーを破壊しました。');
  // Collect targets immediately, but delay all result cards until the 2-second cut-in ends.
  const matchId=G.matchId, sequence=G.effectSequence;
  G.lastDeathNote={owner:q.owner,name,destroyedCount,sequence:(G.deathNoteAnimationSequence||0)+1};
  G.deathNoteAnimationSequence=G.lastDeathNote.sequence;
  G.pendingDeathNote=null;
  window.DAISHUGO_DEATH_NOTE_DRAFT='';
  window.DAISHUGO_ONLINE_ADAPTER?.publishDeathNoteDraft?.('',q.owner);
  document.getElementById('deathNoteModal')?.remove();
  locked=true;
  G.actionLocked=true;
  window.playLightEntry?.(G.lastDeathNote.sequence,()=>{
    if(!G || G.matchId!==matchId || G.effectSequence!==sequence || G.winner)return;
    locked=false;
    G.actionLocked=false;
    afterAction(q.owner); // The existing card-by-card destruction results play after the image.
    notifyGameChanged();
  }, destroyedCount);
  render();
  notifyGameChanged(); // Publish the cut-in to all online participants before it completes.
  return true;
}

let homuraRewindSeen=null;
function syncHomuraRewind(){
  const event=G?.pendingHomuraRewind;
  if(!event){window.stopHomuraRewind?.();homuraRewindSeen=null;return;}
  if(homuraRewindSeen===event.id)return;
  homuraRewindSeen=event.id;
  const remaining=Math.max(0,event.endsAt-Date.now());
  window.playHomuraRewind?.(()=>{
    if(!G || G.pendingHomuraRewind?.id!==event.id)return;
    if(onlineMode && activeHumanSeat()!==event.driver)return;
    G.pendingHomuraRewind=null;G.actionLocked=false;locked=false;
    flow(event.flowPlayer);render();
    if(isCpuTurn()&&!hasPendingEffect())cpuLoop();
  },remaining);
}

let cpuDeathNoteTimer=null;
function scheduleCpuDeathNote(){
  const q=G?.pendingDeathNote;
  if(!q || G.winner || G.players[q.owner]?.human || (onlineMode&&!window.DAISHUGO_ONLINE_ADAPTER?.isHost))return;
  if(cpuDeathNoteTimer!==null)return;
  const matchId=G.matchId,sequence=G.effectSequence,owner=q.owner;
  cpuDeathNoteTimer=setTimeout(function typeNext(){
    cpuDeathNoteTimer=null;
    const live=G?.pendingDeathNote;
    if(!G || G.matchId!==matchId || G.effectSequence!==sequence || live?.owner!==owner){scheduleCpuDeathNote();return;}
    if(G.winner||G.players[owner]?.human||(onlineMode&&!window.DAISHUGO_ONLINE_ADAPTER?.isHost))return;
    if(onlineMode&&window.DAISHUGO_ONLINE_ADAPTER.busy){scheduleCpuDeathNote();return;}
    // The state object may be replaced by a synchronized snapshot at any time.
    if(!live.cpuName)live.cpuName='ゴブリン';
    const name=live.cpuName;
    if((live.draft||'').length>=name.length){resolveDeathNote(name,true);return;}
    live.draft=name.slice(0,(live.draft||'').length+1);
    window.DAISHUGO_SHOW_DEATH_NOTE_DRAFT?.(live.draft);
    window.DAISHUGO_ONLINE_ADAPTER?.publishDeathNoteDraft?.(live.draft,owner);
    scheduleCpuDeathNote();
  },250);
}
