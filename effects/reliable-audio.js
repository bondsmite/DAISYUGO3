/* Native streaming first; Web Audio is only a fallback, never a prerequisite. */
(()=>{
 'use strict';
 const nativePlay=HTMLMediaElement.prototype.play,nativePause=HTMLMediaElement.prototype.pause;
 const jobs=new Map(),buffers=new Map(),gains=new WeakMap();let context=null;
 function ctx(){const C=window.AudioContext||window.webkitAudioContext;if(!context&&C){try{context=new C();context.addEventListener?.('statechange',()=>{if(context.state==='running')for(const job of jobs.values())job.start?.();});}catch{}}return context;}
 function resume(){const c=ctx();if(c&&c.state!=='running'){try{Promise.resolve(c.resume()).catch(()=>{});}catch{}}return c;}
 function clearButton(){if(![...jobs.values()].some(j=>j.blocked))document.getElementById('resumeGameAudio')?.remove();}
 function blocked(job){if(jobs.get(job.audio)!==job)return;job.blocked=true;if(document.getElementById('resumeGameAudio'))return;const b=document.createElement('button');b.id='resumeGameAudio';b.type='button';b.textContent='音声を再開';b.style.cssText='position:fixed;right:12px;bottom:12px;z-index:1000010;padding:12px 18px;background:#172231;color:#fff;border:2px solid #e2c061;border-radius:10px';b.onclick=unlock;document.body.append(b);}
 function stop(a){const j=jobs.get(a);jobs.delete(a);if(j){clearTimeout(j.timer);if(j.node){try{a.currentTime=(j.offset||0)+Math.max(0,context.currentTime-j.startedAt);}catch{}j.node.onended=null;try{j.node.stop();}catch{}}}clearButton();}
 function decoded(url){if(!buffers.has(url))buffers.set(url,fetch(url).then(r=>{if(!r.ok)throw Error('audio '+r.status);return r.arrayBuffer();}).then(b=>ctx().decodeAudioData(b)).catch(e=>{buffers.delete(url);throw e;}));return buffers.get(url);}
 function fallback(j){
  if(jobs.get(j.audio)!==j||j.decoding)return;
  const c=resume();if(!c){blocked(j);return;}j.decoding=true;
  decoded(j.url).then(buffer=>{
   if(jobs.get(j.audio)!==j||j.native)return;
   j.start=()=>{
    if(jobs.get(j.audio)!==j||j.node||j.native)return;
    if(c.state!=='running'){blocked(j);return;}
    nativePause.call(j.audio);const node=c.createBufferSource(),gain=c.createGain();j.node=node;j.gain=gain;j.blocked=false;clearTimeout(j.timer);
    node.buffer=buffer;node.loop=j.audio.loop;node.playbackRate.value=j.audio.playbackRate||1;gain.gain.value=j.audio.muted?0:(gains.get(j.audio)??j.audio.volume);
    node.connect(gain);gain.connect(c.destination);j.offset=Math.min(Number(j.audio.currentTime)||0,Math.max(0,buffer.duration-.01));j.startedAt=c.currentTime;
    node.onended=()=>{if(jobs.get(j.audio)!==j)return;jobs.delete(j.audio);clearButton();j.audio.dispatchEvent(new Event('ended'));};
    node.start(0,j.offset);clearButton();
   };j.start();
  }).catch(()=>{j.decoding=false;if(jobs.get(j.audio)===j)blocked(j);});
 }
 function attempt(j){
  if(jobs.get(j.audio)!==j)return Promise.resolve();
  let p;try{p=nativePlay.call(j.audio);}catch(e){p=Promise.reject(e);}
  return Promise.resolve(p).then(()=>{
   if(jobs.get(j.audio)!==j)return;
   j.native=true;j.blocked=false;clearTimeout(j.timer);
   if(j.node){j.node.onended=null;try{j.node.stop();}catch{}j.node=null;}
   jobs.delete(j.audio);clearButton();
  }).catch(()=>{if(jobs.get(j.audio)===j)fallback(j);});
 }
 HTMLMediaElement.prototype.play=function(){
  if(jobs.has(this))return jobs.get(this).promise||Promise.resolve();
  resume();const j={audio:this,url:this.currentSrc||this.src};jobs.set(this,j);
  j.timer=setTimeout(()=>{if(jobs.get(this)===j&&!j.node)fallback(j);},2500);
  j.promise=attempt(j);return j.promise;
 };
 HTMLMediaElement.prototype.pause=function(){stop(this);return nativePause.call(this);};
 function unlock(){resume();for(const j of [...jobs.values()]){if(j.node)continue;if(j.start)j.start();if(!j.node)attempt(j);}setTimeout(()=>{for(const j of jobs.values())j.start?.();},0);}
 for(const name of ['pointerdown','pointerup','touchend','keydown'])document.addEventListener(name,unlock,true);
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')unlock();});
 window.DAISHUGO_AUDIO={context:ctx,resume,setGain(a,v){gains.set(a,v);if(jobs.get(a)?.gain)jobs.get(a).gain.gain.value=v;},buffer(a){return a;},stopAll(){for(const a of [...jobs.keys()])a.pause();}};
})();
