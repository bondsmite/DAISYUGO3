(()=>{
  const byId=id=>document.getElementById(id);
  const menu=byId('mainMenu'), panels=[...menu.querySelectorAll('.lobby-panel')];
  const frames=['NORMAL','RARE','SUPER RARE','LEGEND','MYTHIC'];
  const colors=['#bdc9d4','#64aff7','#bf86ff','#f7c559','#f097d8'];
  const storageKey='daishugo.lobby.';
  let opener=null,playing=false;
  const music=new Audio('./effects2/assets/lobby-theme.mp3');
  music.preload='auto';
  music.loop=true;
  music.dataset.channel='menu';
  function syncMusic(){
    const visible=!menu.hidden && menu.style.display!=='none' && !byId('onlineModeShell').classList.contains('open') && !document.hidden;
    const play=visible && window.DAISHUGO_AUDIO.level('menu')>0;
    if(play===playing)return;
    playing=play;
    if(play)music.play().catch(()=>{playing=false;});else music.pause();
  }
  const frame=byId('profileFrame');
  function refresh(){
    const title=selectedTitle(),name=loadPlayerName(),stats=loadTitleStats();
    const rank=t=>[1,10,30,50].filter(limit=>t.goal>limit).length;
    const earned=DAISHUGO_TITLES.filter(t=>stats[t.id]>=t.goal);
    const unlockedRanks=new Set([0,...earned.map(rank)]);
    frame.replaceChildren(new Option('装備中の称号に合わせる','auto'));
    frames.forEach((label,i)=>{if(unlockedRanks.has(i))frame.add(new Option(label,String(i)));});
    frame.value=localStorage.getItem(storageKey+'frame')||'auto';
    if(!frame.value)frame.value='auto';
    const tier=frame.value==='auto'?(title?rank(title):0):Number(frame.value);
    byId('openProfile').style.setProperty('--frame',colors[tier]);
    byId('avatar').dataset.rank=tier;
    byId('avatar').textContent=Array.from(name)[0];
    byId('lobbyName').textContent=name;
    byId('lobbyTitle').textContent=title?.name||'称号未設定';
  }
  frame.onchange=()=>{localStorage.setItem(storageKey+'frame',frame.value);refresh();};
  function show(id,trigger){
    for(const panel of panels)panel.hidden=panel.id!==id;
    if(id){opener=trigger;byId(id).querySelector('input,button').focus();}
    else opener?.focus();
  }
  for(const [button,panel] of [['openProfile','profilePanel'],['openMatches','matchPanel'],['openNews','newsPanel']])
    byId(button).onclick=e=>{refresh();show(panel,e.currentTarget);};
  menu.querySelectorAll('[data-back]').forEach(b=>b.onclick=()=>show(null));
  document.addEventListener('keydown',e=>{if(e.key==='Escape' && menu.contains(document.activeElement) && panels.some(p=>!p.hidden))show(null);});
  byId('profileOptions').onclick=()=>byId('menuOptionsBtn').click();
  const options=document.createElement('div');
  options.id='lobbyOptions';
  byId('optionsOverlay').querySelector('section').append(options);
  for(const [key,label] of [['menu','メニューBGM'],['battle','対戦BGM'],['voice','ボイス・効果音']]){
    const row=document.createElement('label');
    const slider=document.createElement('input'),out=document.createElement('output');
    slider.type='range';slider.min=0;slider.max=100;slider.step=5;
    slider.value=Math.round(window.DAISHUGO_AUDIO.level(key)*100);
    out.value=slider.value+'%';
    slider.oninput=()=>{window.DAISHUGO_AUDIO.setLevel(key,Number(slider.value)/100);out.value=slider.value+'%';syncMusic();};
    row.append(label,slider,out);options.append(row);
  }
  const motion=document.createElement('select');
  for(const [value,label] of [['full','通常'],['low','省エネ（静止）'],['off','背景演出なし']])motion.add(new Option(label,value));
  motion.value=localStorage.getItem(storageKey+'motion')||'full';
  menu.dataset.motion=motion.value;
  motion.onchange=()=>{menu.dataset.motion=motion.value;localStorage.setItem(storageKey+'motion',motion.value);};
  const row=document.createElement('label');row.append('背景演出',motion);options.append(row);
  const art=menu.querySelector('.lobby-art');
  for(let i=0;i<38;i++){
    const shape=document.createElement(i<8?'b':'em');
    shape.style.setProperty('--x',((i*37+3)%100)+'%');
    shape.style.setProperty('--y',((i*23+11)%100)+'%');
    shape.style.setProperty('--delay',-(i%9)+'s');art.append(shape);
  }
  const observer=new MutationObserver(()=>{refresh();syncMusic();});
  observer.observe(menu,{attributes:true,attributeFilter:['hidden','style']});
  observer.observe(byId('onlineModeShell'),{attributes:true,attributeFilter:['class']});
  observer.observe(byId('playerSaveStatus'),{childList:true});
  function recoverMenuMusic(){
    if(playing && music.paused && !window.DAISHUGO_AUDIO.isPending(music))playing=false;
    syncMusic();
  }
  document.addEventListener('visibilitychange',recoverMenuMusic);
  window.addEventListener('pageshow',recoverMenuMusic);
  for(const event of ['pointerdown','keydown'])document.addEventListener(event,recoverMenuMusic,true);
  // The shared audio player retries blocked playback on the first user gesture.
  syncMusic();
  refresh();
})();
