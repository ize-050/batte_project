// Short synthesized effects, not recorded character voices. No external audio assets.
const combatSoundCursor={game:null,id:0,next:0};
let combatNoise=null;
function combatSoundStyle(e){
 if(e.kind==='fall')return {frequency:100,end:38,duration:.2,noise:.6,type:'triangle'};
 if(e.voice==='siege')return {frequency:85,end:32,duration:.24,noise:.9,type:'triangle'};
 if(['naga','crane'].includes(e.voice))return {frequency:e.voice==='crane'?640:240,end:120,duration:.18,noise:.12,type:'sine'};
 if(['wolf','tiger'].includes(e.voice))return {frequency:110,end:45,duration:.17,noise:.6,type:'sawtooth'};
 if(e.kind==='shot')return {frequency:520,end:160,duration:.10,noise:.45,type:'triangle'};
 return {frequency:e.voice==='worker'?180:1000,end:110,duration:.09,noise:.65,type:'triangle'};
}
function nextCombatSounds(events,cursor,time,enabled,visible){
 const fresh=events.filter(e=>e.id>cursor.id);for(const e of fresh)cursor.id=Math.max(cursor.id,e.id);
 if(!enabled)return [];
 return fresh.filter(e=>time-e.t>=-.01&&time-e.t<.3&&visible(e)).slice(-2);
}
function playCombatAudio(){
 if(combatSoundCursor.game!==game){combatSoundCursor.game=game;combatSoundCursor.id=0;combatSoundCursor.next=0;}
 const enabled=game.running&&!document.hidden&&$('sound').checked&&soundContext?.state==='running'&&Number($('volume').value)>0;
 if(enabled&&soundContext.currentTime<combatSoundCursor.next)return;
 const events=nextCombatSounds(game.combatEvents||[],combatSoundCursor,game.t,enabled,e=>game.visibleAt(e)&&inView(e));
 if(!events.length)return;
 combatSoundCursor.next=soundContext.currentTime+.1;
 for(const e of events)playCombatEffect(e);
}
function playCombatEffect(e){
 try{
  const audio=soundContext,s=combatSoundStyle(e),t=audio.currentTime,gain=audio.createGain(),pan=audio.createStereoPanner();
  const screenX=(e.x-camera.x)*camera.zoom/camera.w,screenY=(e.y-camera.y)*camera.zoom/camera.h;
  const distance=Math.hypot(screenX-.5,screenY-.5),volume=Number($('volume').value)/100*.14*Math.max(.25,1-distance);
  gain.gain.setValueAtTime(.001,t);gain.gain.linearRampToValueAtTime(volume,t+.008);gain.gain.exponentialRampToValueAtTime(.001,t+s.duration);
  pan.pan.value=Math.max(-.85,Math.min(.85,(screenX-.5)*1.7));gain.connect(pan);pan.connect(audio.destination);
  const osc=audio.createOscillator();osc.type=s.type;osc.frequency.setValueAtTime(s.frequency,t);osc.frequency.exponentialRampToValueAtTime(s.end,t+s.duration);osc.connect(gain);osc.start(t);osc.stop(t+s.duration);
  if(!combatNoise){combatNoise=audio.createBuffer(1,Math.ceil(audio.sampleRate*.3),audio.sampleRate);const data=combatNoise.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;}
  const noise=audio.createBufferSource(),filter=audio.createBiquadFilter(),noiseGain=audio.createGain();noise.buffer=combatNoise;filter.type='bandpass';filter.frequency.value=e.kind==='shot'?2400:s.frequency*2;noiseGain.gain.value=s.noise;noise.connect(filter);filter.connect(noiseGain);noiseGain.connect(gain);noise.start(t);noise.stop(t+s.duration);
  osc.onended=()=>osc.disconnect();noise.onended=()=>{noise.disconnect();filter.disconnect();noiseGain.disconnect();gain.disconnect();pan.disconnect();};
 }catch{}
}
