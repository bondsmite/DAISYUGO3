/* Transport and seat ownership only. Card rules live in game-engine.js. */
(() => {
  "use strict";
  const $ = (id) => document.getElementById(id),
    CFGKEY = "daisyuugouFirebaseConfigV1";
  let app,
    db,
    uid,
    ref = null,
    seat = -1,
    host = false,
    started = false,
    applying = false,
    busy = false;
  let base = null,
    queued = null,
    changedQueued = false,
    cpuTimer = null,
    resolving = false,
    generation = 0,
    lastAnimation = 0,
    dirtyAfterWrite = false;
  const clone = (x) => JSON.parse(JSON.stringify(x));
  const status = (t) => {
    $("olStatus").textContent = t;
  };
  const seats = (s) => [0, 1, 2].map((i) => s?.[i] || null);
  function playerName() {
    try {
      if (window.parent !== window && window.parent.loadPlayerName)
        return window.parent.loadPlayerName();
    } catch {}
    return loadPlayerName();
  }
  function deckInfo() {
    try {
      if (window.parent !== window && window.parent.DAISHUGO_READ_MENU_DECK)
        return window.parent.DAISHUGO_READ_MENU_DECK();
    } catch (e) {
      throw e;
    }
    return readMenuDeckInfo();
  }
  function refreshProfile() {
    $("olName").value = playerName();
    try {
      const d = deckInfo();
      $("olDeckSummary").textContent = "持ち込みデッキ：" + d.name + "（35枚）";
    } catch (e) {
      $("olDeckSummary").textContent = e.message;
    }
  }
  function showLobby() {
    $("mainMenu").hidden = true;
    $("mainMenu").style.display = "none";
    refreshProfile();
    $("onlineLobby").style.display = "flex";
  }
  function closeLobby() {
    $("onlineLobby").style.display = "none";
  }
  function loadSdk() {
    return new Promise((resolve, reject) => {
      if (window.firebase?.database) {
        resolve();
        return;
      }
      const files = [
        "firebase-app-compat.js",
        "firebase-auth-compat.js",
        "firebase-database-compat.js",
      ];
      const next = () => {
        const f = files.shift();
        if (!f) {
          resolve();
          return;
        }
        const s = document.createElement("script");
        s.src = "https://www.gstatic.com/firebasejs/10.12.2/" + f;
        s.onload = next;
        s.onerror = () => reject(Error("Firebaseの読み込みに失敗しました。"));
        document.head.appendChild(s);
      };
      next();
    });
  }
  async function connect() {
    const config = JSON.parse($("olConfig").value.trim());
    for (const k of [
      "apiKey",
      "authDomain",
      "databaseURL",
      "projectId",
      "appId",
    ])
      if (!config[k]) throw Error("Firebase設定に" + k + "がありません。");
    if (ref) throw Error("設定変更の前にルームを退出してください。");
    await loadSdk();
    if (app) await app.delete();
    app = firebase.initializeApp(config, "daishugoSharedOnline");
    db = app.database();
    uid = (await app.auth().signInAnonymously()).user.uid;
    localStorage.setItem(CFGKEY, JSON.stringify(config));
    $("olLobbyControls").classList.remove("ol-hidden");
    status("接続しました。ルームを作成するか、番号で参加してください。");
  }
  function setSeats(data) {
    const ss = seats(data.seats);
    seat = ss.findIndex((s) => s?.uid === uid);
    window.onlineSeat = seat;
    host = data.hostUid === uid;
    window.onlineSeats = ss.map((s, i) =>
      s
        ? { ...s, human: true }
        : { name: "COM " + (i + 1), human: false, uid: null, deckNames: null },
    );
    $("olSeats").innerHTML = ss
      .map(
        (s, i) =>
          "席" +
          (i + 1) +
          "：" +
          (s
            ? escapeHtml(s.name) + (s.uid === uid ? "（あなた）" : "")
            : "参加待ち"),
      )
      .join("<br>");
    $("olStart").disabled = !(
      host &&
      ss.filter(Boolean).length >= 2 &&
      !data.started
    );
    $("olUpdateDeck").disabled = !!data.started;
  }
  function hidePickers() {
    [
      "madokaModal",
      "cureLemonadeModal",
      "takinaPicker",
      "fatherPicker",
      "hoshinoAiPicker",
      "cardZoomModal",
    ].forEach((id) => {
      const el = $(id);
      if (el) {
        el.classList.remove("open");
        el.style.display = "none";
        el.setAttribute("aria-hidden", "true");
      }
    });
  }
  function applyGame(packet) {
    if (!packet || !Number.isInteger(packet.revision)) return;
    if (base && packet.revision < base.revision) return;
    if (busy) {
      if (!queued || packet.revision >= queued.revision) queued = packet;
      return;
    }
    if (
      base &&
      packet.revision === base.revision &&
      packet.state === base.state
    )
      return;
    const sameEffect =
      G &&
      (G.effectSequence || 0) ===
        (JSON.parse(packet.state).effectSequence || 0);
    const draftNeku = sameEffect ? G.nekuSelections?.[seat] : null,
      draftOpening = sameEffect ? G.initialLeadChoices?.[seat] : null;
    const wasAiOpen =
      sameEffect &&
      G.pendingHoshinoAi &&
      $("hoshinoAiPicker")?.style.display === "flex";
    base = clone(packet);
    applying = true;
    try {
      G = JSON.parse(packet.state);
      locked = !!G.actionLocked;
      selected = null;
      selectedSpell = null;
      sunrakuState = null;
      pendingSuperMushroom = null;
      if (
        G.pendingNeku &&
        !G.nekuConfirmed[seat] &&
        draftNeku &&
        G.players[seat].hand.some((c) => c.id === draftNeku)
      )
        G.nekuSelections[seat] = draftNeku;
      if (G.initialLeadPending && !G.initialLeadConfirmed[seat] && draftOpening)
        G.initialLeadChoices[seat] = draftOpening;
      if (!(wasAiOpen && G.pendingHoshinoAi && !G.hoshinoAiConfirmed[seat]))
        hidePickers();
      render();
      restoreEffectUI();
      const event = G.playEvent;
      if (event && event.sequence !== lastAnimation) {
        lastAnimation = event.sequence;
        if (event.actor !== seat && !(host && !G.players[event.actor].human))
          window.DAISHUGO_PLAY_ONLINE_ANIMATION?.(event.card, event.below);
      }
    } finally {
      applying = false;
    }
    scheduleCpu();
    scheduleGroupResolution();
  }
  function onRoom(snap) {
    const data = snap.val();
    if (!data) {
      if (ref) leaveLocal();
      status("ルームが終了しました。");
      showLobby();
      return;
    }
    setSeats(data);
    if (data.started && data.game) {
      started = true;
      gameStarted = true;
      document.getElementById("mainMenu").style.display = "none";
      document.getElementById("mainMenu").hidden = true;
      closeLobby();
      applyGame(data.game);
    }
  }
  async function enter(create) {
    if (!db) throw Error("先にFirebaseへ接続してください。");
    if (ref) throw Error("現在のルームを退出してから入室してください。");
    const code = $("olRoomCode").value.trim();
    if (!/^\d{4}$/.test(code))
      throw Error("4桁のルーム番号を入力してください。");
    const d = deckInfo(),
      check = validateDeckNames(d.cards, true);
    if (!check.ok) throw Error(check.message);
    const mine = {
      uid,
      name: playerName(),
      deckNames: d.cards,
      deckName: d.name,
      deckSlot: d.slot,
    };
    const target = db.ref("daishugoRooms/" + code);
    const tx = await target.transaction((room) => {
      if (create) {
        if (room) return;
        return {
          schema: 5,
          hostUid: uid,
          started: false,
          seats: { 0: mine },
          createdAt: Date.now(),
        };
      }
      if (!room || room.started || room.schema !== 5) return;
      const ss = seats(room.seats);
      let ix = ss.findIndex((s) => s?.uid === uid);
      if (ix < 0) ix = ss.findIndex((s) => !s);
      if (ix < 0) return;
      room.seats = room.seats || {};
      room.seats[ix] = mine;
      return room;
    });
    if (!tx.committed)
      throw Error(
        create
          ? "その番号は使用中です。"
          : "入室できません。全員が今回の版を使い、未開始の新しいルームでお試しください。",
      );
    ref = target;
    base = null;
    queued = null;
    generation++;
    setSeats(tx.snapshot.val());
    ref.on("value", onRoom);
    $("olLeave").classList.remove("ol-hidden");
    status("ルーム " + code + " に入室しました。");
  }
  async function updateDeck() {
    if (!ref || seat < 0 || started)
      throw Error("対戦開始前に入室してから反映してください。");
    const d = deckInfo();
    const check = validateDeckNames(d.cards, true);
    if (!check.ok) throw Error(check.message);
    const tx = await ref.transaction((room) => {
      if (!room || room.started || room.seats?.[seat]?.uid !== uid) return;
      Object.assign(room.seats[seat], {
        name: playerName(),
        deckNames: d.cards,
        deckName: d.name,
        deckSlot: d.slot,
      });
      return room;
    });
    if (!tx.committed) throw Error("デッキを反映できませんでした。");
    refreshProfile();
    status("保存デッキを反映しました。");
  }
  async function start() {
    if (!ref || !host || started)
      throw Error("ルーム作成者が開始してください。");
    await updateDeck();
    const room = (await ref.once("value")).val();
    setSeats(room);
    if (seats(room.seats).filter(Boolean).length < 2)
      throw Error("人間のプレイヤーが2人必要です。");
    for (const s of seats(room.seats).filter(Boolean)) {
      const c = validateDeckNames(s.deckNames, true);
      if (!c.ok) throw Error(c.message);
    }
    applying = true;
    try {
      newGame();
      G.actionLocked = false;
    } finally {
      applying = false;
    }
    const packet = { revision: 0, state: JSON.stringify(G) };
    const tx = await ref.transaction((current) => {
      if (
        !current ||
        current.started ||
        current.hostUid !== uid ||
        JSON.stringify(current.seats) !== JSON.stringify(room.seats)
      )
        return;
      current.started = true;
      current.game = packet;
      return current;
    });
    if (!tx.committed)
      throw Error("入室情報が変わりました。もう一度開始してください。");
  }
  function allowedToWrite() {
    if (!base || seat < 0) return false;
    const b = JSON.parse(base.state);
    return (
      (resolving && host) ||
      b.current === seat ||
      (host && !b.players[b.current].human)
    );
  }
  async function commitState() {
    if (
      !ref ||
      !started ||
      applying ||
      busy ||
      !G ||
      !base ||
      !allowedToWrite()
    )
      return;
    const before = JSON.parse(base.state);
    // Simultaneous selections are merged by confirmChoice, never by a full snapshot.
    if (
      !resolving &&
      (before.initialLeadPending ||
        before.pendingNeku ||
        before.pendingHoshinoAi)
    )
      return;
    G.actionLocked = !!locked;
    const serialized = JSON.stringify(G);
    if (serialized === base.state) return;
    const expected = clone(base),
      target = ref,
      token = generation;
    busy = true;
    refreshActionPermissions();
    try {
      const tx = await target.child("game").transaction(
        (current) => {
          if (!current || current.revision !== expected.revision) return;
          return { revision: expected.revision + 1, state: serialized };
        },
        undefined,
        false,
      );
      if (token !== generation) return;
      if (tx.committed) {
        base = clone(tx.snapshot.val());
      } else {
        base = null;
        queued = tx.snapshot.val();
        status(
          "状態が更新されたため、最新の状態へ戻しました。もう一度操作してください。",
        );
      }
    } catch (e) {
      status("同期エラー：" + e.message);
      const snap = await target.child("game").once("value");
      base = null;
      queued = snap.val();
    } finally {
      if (token === generation) {
        busy = false;
        if (queued) {
          const q = queued;
          queued = null;
          applyGame(q);
        }
        applying = true;
        try {
          render();
        } finally {
          applying = false;
        }
        scheduleCpu();
        scheduleGroupResolution();
        if (dirtyAfterWrite) {
          dirtyAfterWrite = false;
          changed();
        }
      }
    }
  }
  function changed() {
    if (!started || applying) return;
    if (busy) {
      dirtyAfterWrite = true;
      return;
    }
    if (changedQueued) return;
    changedQueued = true;
    queueMicrotask(() => {
      changedQueued = false;
      commitState();
    });
  }
  async function confirmChoice(kind, ids) {
    if (!ref || !started || busy || seat < 0 || !base) return;
    const flags = {
      opening: [
        "initialLeadPending",
        "initialLeadChoices",
        "initialLeadConfirmed",
      ],
      neku: ["pendingNeku", "nekuSelections", "nekuConfirmed"],
      ai: ["pendingHoshinoAi", "hoshinoAiSelections", "hoshinoAiConfirmed"],
    }[kind];
    if (!flags) return;
    // Wait for the action that created the picker to be published first.
    if (changedQueued) {
      await Promise.resolve();
      if (busy) return;
    }
    const target = ref,
      token = generation,
      baseline = JSON.parse(base.state),
      effectId = baseline.effectSequence || 0;
    busy = true;
    refreshActionPermissions();
    try {
      const tx = await target.child("game").transaction(
        (packet) => {
          if (!packet) return;
          const state = JSON.parse(packet.state),
            p = state.players[seat];
          if (
            !state[flags[0]] ||
            (state.effectSequence || 0) !== effectId ||
            p.uid !== uid ||
            state[flags[2]]?.[seat]
          )
            return;
          const picks = [...new Set(ids.filter(Boolean))],
            cards = picks.map((id) => p.hand.find((c) => c.id === id));
          if (cards.some((c) => !c)) return;
          if (
            kind === "opening" &&
            (cards.length !== 1 || cards[0].kind !== "follower")
          )
            return;
          if (kind === "neku" && cards.length !== (p.hand.length ? 1 : 0))
            return;
          if (
            kind === "ai" &&
            (cards.length > 2 ||
              cards.some((c) => c.kind !== "follower" || c.tribe !== "英種族"))
          )
            return;
          state[flags[1]][seat] = kind === "ai" ? picks : picks[0] || "";
          state[flags[2]][seat] = true;
          return {
            revision: packet.revision + 1,
            state: JSON.stringify(state),
          };
        },
        undefined,
        false,
      );
      if (token === generation) {
        if (tx.committed) {
          const packet = tx.snapshot.val();
          if (!queued || packet.revision >= queued.revision) queued = packet;
        } else
          status("選択を確定できませんでした。最新状態を確認してください。");
      }
    } catch (e) {
      status("選択の同期エラー：" + e.message);
    } finally {
      if (token === generation) {
        busy = false;
        if (queued) {
          const q = queued;
          queued = null;
          applyGame(q);
        }
        refreshActionPermissions();
        scheduleGroupResolution();
      }
    }
  }
  let groupQueued = false;
  function scheduleGroupResolution() {
    if (!host || !started || busy || groupQueued || !G) return;
    const ready =
      (G.initialLeadPending && G.initialLeadConfirmed.every(Boolean)) ||
      (G.pendingNeku && G.nekuConfirmed.every(Boolean)) ||
      (G.pendingHoshinoAi && G.hoshinoAiConfirmed.every(Boolean));
    if (!ready) return;
    groupQueued = true;
    queueMicrotask(async () => {
      groupQueued = false;
      if (busy || !host || !started) return;
      resolving = true;
      try {
        locked = false;
        if (G.initialLeadPending) resolveOpeningChoices();
        else if (G.pendingNeku) resolveNekuChoices();
        else if (G.pendingHoshinoAi) resolveHoshinoAiChoices();
        render();
        await commitState();
      } finally {
        resolving = false;
      }
    });
  }
  function scheduleCpu() {
    if (
      cpuTimer ||
      !host ||
      !started ||
      busy ||
      !G ||
      G.winner ||
      G.initialLeadPending ||
      locked ||
      G.actionLocked ||
      hasPendingEffect() ||
      !isCpuTurn()
    )
      return;
    cpuTimer = setTimeout(() => {
      cpuTimer = null;
      if (
        !host ||
        !started ||
        busy ||
        !G ||
        G.winner ||
        locked ||
        hasPendingEffect() ||
        !isCpuTurn()
      )
        return;
      const pi = G.current,
        p = G.players[pi];
      if (p.passed) {
        G.current = (pi + 1) % 3;
        render();
        return;
      }
      const options = p.hand
        .map((c, i) => ({ c, i }))
        .filter((x) => canPlay(x.c, p))
        .sort(
          (a, b) =>
            cpuCardScore(b.c, p, pi, cpuDifficulty) -
            cpuCardScore(a.c, p, pi, cpuDifficulty),
        );
      if (options.length) {
        doPlay(pi, options[0].i);
        afterAction(pi);
      } else {
        doPass(pi);
        render();
      }
    }, 250);
  }
  function leaveLocal() {
    generation++;
    lastAnimation = 0;
    dirtyAfterWrite = false;
    if (ref) ref.off();
    ref = null;
    base = null;
    queued = null;
    seat = -1;
    window.onlineSeat = -1;
    host = false;
    started = false;
    busy = false;
    locked = false;
    G = null;
    sunrakuState = null;
    pendingSuperMushroom = null;
    if (cpuTimer) clearTimeout(cpuTimer);
    cpuTimer = null;
    hidePickers();
    $("initialLeadModal").style.display = "none";
    document.body.classList.remove("revolution-mode");
    stopGameBgms();
    $("olLeave").classList.add("ol-hidden");
    $("olStart").disabled = true;
  }
  async function leave() {
    const target = ref,
      mySeat = seat,
      wasHost = host;
    leaveLocal();
    if (target) {
      if (wasHost) await target.remove();
      else await target.child("seats/" + mySeat).remove();
    }
    showLobby();
    status("ルームから退出しました。");
  }
  window.DAISHUGO_ONLINE_ADAPTER = {
    changed,
    confirmChoice,
    scheduleCpu,
    get busy() {
      return busy;
    },
    leave,
  };
  const action = (fn) => async () => {
    try {
      await fn();
    } catch (e) {
      status(e.message);
    }
  };
  $("olSaveConfig").onclick = action(connect);
  $("olCreate").onclick = action(() => enter(true));
  $("olJoin").onclick = action(() => enter(false));
  $("olStart").onclick = action(start);
  $("olUpdateDeck").onclick = action(updateDeck);
  $("olLeave").onclick = action(leave);
  $("olClose").onclick = () => {
    if (started) {
      closeLobby();
      return;
    }
    if (window.parent !== window) {
      window.parent.document
        .getElementById("onlineModeShell")
        ?.classList.remove("open");
    } else window.location.href = "./index.html";
  };
  $("returnMenuBtn").onclick = showLobby;
  window.addEventListener("focus", refreshProfile);
  window.addEventListener("storage", refreshProfile);
  try {
    $("olConfig").value =
      localStorage.getItem(CFGKEY) ||
      localStorage.getItem("daishugo.firebase.config.v1") ||
      "";
  } catch {}
  showLobby();
})();
