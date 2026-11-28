/* Native streaming first; Web Audio is only a fallback, never a prerequisite. */
(()=>{
 'use strict';
 const nativePlay=HTMLMediaElement.prototype.play,nativePause=HTMLMediaElement.prototype.pause;
 const jobs=new Map(),buffers=new Map(),gains=new WeakMap();let context=null;
 const levels=new Map(), active=new Set(), media=new WeakMap();
 function level(channel){
   if(!levels.has(channel)){
     let raw=null;
     try{raw=window.localStorage?.getItem('daishugo.volume.'+channel)??null;}catch{}
     const n=raw===null?1:Number(raw);
     levels.set(channel,Number.isFinite(n)?Math.min(1,Math.max(0,n)):1);
   }
   return levels.get(channel);
 }
 function category(a){return a.dataset.channel||(/bgm|theme|solo-[12]|victory|defeat/i.test(a.id+' '+a.src)?'battle':'voice');}
 function track(a){
   if(!media.has(a)){
     const descriptor=Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype,'volume');
     if(!descriptor?.set)return;
     const state={base:a.volume,apply(){descriptor.set.call(a,state.base*level(category(a)));}};
     Object.defineProperty(a,'volume',{configurable:true,get:()=>state.base,set(v){state.base=v;state.apply();}});
     media.set(a,state);
     a.addEventListener('ended',()=>active.delete(a));
     // Native playback can stall after play() already succeeded.
     let stallTimer;
     const clearStall=()=>clearTimeout(stallTimer);
     for(const event of ['playing','timeupdate','pause','ended'])a.addEventListener(event,clearStall);
     const checkStall=()=>{
       clearStall();
       if(category(a)==='voice')return;
       stallTimer=setTimeout(()=>{
         if(!active.has(a)||a.ended||jobs.has(a)||document.hidden)return;
         const job={audio:a,url:a.currentSrc||a.src};
         jobs.set(a,job);
         fallback(job);
       },3500);
     };
     for(const event of ['waiting','stalled'])a.addEventListener(event,checkStall);
   }
   active.add(a);media.get(a).apply();
 }
 function setLevel(key,n){
   levels.set(key,n);localStorage.setItem('daishugo.volume.'+key,String(n));
   for(const a of active)if(category(a)===key){
     media.get(a).apply();
     const gain=jobs.get(a)?.gain;
     if(gain)gain.gain.value=a.muted?0:(gains.get(a)??a.volume)*n;
   }
 }
 window.addEventListener?.('storage',e=>{if(e.key?.startsWith('daishugo.volume.')){levels.clear();for(const a of active)media.get(a).apply();}});
 function ctx(){const C=window.AudioContext||window.webkitAudioContext;if(!context&&C){try{context=new C();context.addEventListener?.('statechange',()=>{if(context.state==='running')for(const job of jobs.values())job.start?.();});}catch{}}return context;}
 function resume(){const c=ctx();if(c&&c.state!=='running'){try{Promise.resolve(c.resume()).catch(()=>{});}catch{}}return c;}
 function blocked(job){if(jobs.get(job.audio)===job)job.blocked=true;}
 function stop(a){const j=jobs.get(a);jobs.delete(a);if(j){clearTimeout(j.timer);if(j.node){try{a.currentTime=(j.offset||0)+Math.max(0,context.currentTime-j.startedAt);}catch{}j.node.onended=null;try{j.node.stop();}catch{}}}}
 function decoded(url){if(!buffers.has(url))buffers.set(url,fetch(url).then(r=>{if(!r.ok)throw Error('audio '+r.status);return r.arrayBuffer();}).then(b=>ctx().decodeAudioData(b)).catch(e=>{buffers.delete(url);throw e;}));return buffers.get(url);}
 // These timed cues can start on a remote opponent's turn, long after the last tap.
 const entryCues=[
   ...['hulk-smash.mp3','doctor-doom-voice.mp3','gas-wish.mp3','kumagawa-voice.mp3','hoshino-ai-voice.mp3','lemon-chain.mp3','luxord-cards.mp3','light-yagami-plan.mp3','light-yagami-failed.mp3','madara-audio.mp3','sazae-voice.mp3','naruhodo-audio.mp3','madoka-entry.mp3',
       'nergigante-audio.mp3','tanjiro-hinokami.mp3','zenmai.mp3?v=2','tomodachi-voice.mp3',
       'sano-inaiyona.mp3','rufus-entry.mp3','rufus-impact.mp3','daset-audio.mp3']
       .map(name=>'./effects1/'+name),
   ...['captain-shield.mp3',
       'allmight-audio.mp3?v=2','ava-entry.m4a','surt-impact.mp3',
       'arceus-cry.mp3',
       'conan-voice.m4a','conan-miss.mp3',
       'bell-angel.m4a','homura-rewind.mp3'].map(name=>'./effects2/assets/'+name)
 ];
 const bufferedCues=[...entryCues,'./effects1/tanjiro-gurenge-bgm.mp3','./effects1/zoma-bgm.mp3']
   .map(path=>path.slice(1));
 let warmed=false;
 function warmVoices(){
   if(warmed)return;
   warmed=true;
   for(const name of ['ava-entry.jpg',
                      'conan-correct.jpg','conan-miss.png']){
     const image=new Image();
     image.src='./effects2/assets/'+name;
   }
   const audioContext=resume();
   for(const path of entryCues){
     const url=new URL(path,document.baseURI).href;
     if(audioContext){decoded(url).catch(()=>{});continue;}
     const audio=new Audio(url);
     audio.preload='auto';
     audio.load();
   }
 }
 for(const event of ['touchend','click','keydown'])document.addEventListener(event,warmVoices,{once:true,capture:true});
 function fallback(j){
  if(jobs.get(j.audio)!==j||j.decoding)return;
  const c=resume();if(!c){blocked(j);return;}j.decoding=true;
  decoded(j.url).then(buffer=>{
   if(/(?:gas-ellie-bgm|conan-theme|arceus-battle|gurenge-bgm|zoma-bgm|tomodachi-bgm|sano-white-noise|wicked-spirit|solo-empty|online-normal|online-empty|victory|defeat)\.mp3/.test(j.url))buffers.delete(j.url);
   if(jobs.get(j.audio)!==j||j.native)return;
   j.start=()=>{
    if(jobs.get(j.audio)!==j||j.node||j.native)return;
    if(c.state!=='running'){blocked(j);return;}
    nativePause.call(j.audio);const node=c.createBufferSource(),gain=c.createGain();j.node=node;j.gain=gain;j.blocked=false;clearTimeout(j.timer);
    node.buffer=buffer;node.loop=j.audio.loop;node.playbackRate.value=j.audio.playbackRate||1;gain.gain.value=j.audio.muted?0:(gains.get(j.audio)??j.audio.volume)*level(category(j.audio));
    node.connect(gain);gain.connect(c.destination);j.offset=Math.min(Number(j.audio.currentTime)||0,Math.max(0,buffer.duration-.01));j.startedAt=c.currentTime;
    node.onended=()=>{if(jobs.get(j.audio)!==j)return;jobs.delete(j.audio);j.audio.dispatchEvent(new Event('ended'));};
    node.start(0,j.offset);
   };j.start();
  }).catch(()=>{j.decoding=false;if(jobs.get(j.audio)!==j)return;if(j.preferBuffer){j.preferBuffer=false;attempt(j);}else blocked(j);});
 }
 function attempt(j){
  if(jobs.get(j.audio)!==j)return Promise.resolve();
  let p;try{p=nativePlay.call(j.audio);}catch(e){p=Promise.reject(e);}
  return Promise.resolve(p).then(()=>{
   if(jobs.get(j.audio)!==j)return;
   if(j.node){nativePause.call(j.audio);return;}
   j.native=true;j.blocked=false;clearTimeout(j.timer);
   jobs.delete(j.audio);
  }).catch(()=>{if(jobs.get(j.audio)===j)fallback(j);});
 }
 HTMLMediaElement.prototype.play=function(){
  track(this);
  if(jobs.has(this))return jobs.get(this).promise||Promise.resolve();
  resume();const j={audio:this,url:this.currentSrc||this.src};jobs.set(this,j);
  if(context?.state==='running' && bufferedCues.some(path=>j.url.endsWith(path))){
    j.preferBuffer=true;
    fallback(j);
    return Promise.resolve();
  }
  j.timer=setTimeout(()=>{if(jobs.get(this)===j&&!j.node)fallback(j);},2500);
  j.promise=attempt(j);return j.promise;
 };
 HTMLMediaElement.prototype.pause=function(){active.delete(this);stop(this);return nativePause.call(this);};
 function unlock(){resume();for(const j of [...jobs.values()]){if(j.node || (j.preferBuffer && j.decoding && !j.start))continue;if(j.start)j.start();if(!j.node)attempt(j);}setTimeout(()=>{for(const j of jobs.values())j.start?.();},0);}
 for(const name of ['pointerdown','pointerup','touchend','keydown','click'])document.addEventListener(name,unlock,true);
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')unlock();});
 window.DAISHUGO_AUDIO={context:ctx,resume,level,isPending:a=>jobs.has(a),setLevel,setGain(a,v){gains.set(a,v);if(jobs.get(a)?.gain)jobs.get(a).gain.gain.value=v*level(category(a));},buffer(a){return a;},stopAll(){for(const a of [...jobs.keys()])a.pause();}};
})();
