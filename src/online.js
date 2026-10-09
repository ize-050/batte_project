// Only commands travel upstream. The server owns every battle and resource change.
online=(()=>{
 const ui=id=>$('online-'+id),storageKey='four-clans-room-v1';
 let socket=null,session=null,lobby=null,attempt=0,retryTimer=null,pingTimer=null,requestId=0,latency=0,connectionPromise=null;
 const api={active:false,inMatch:false,connected:false,open,updateHUD};
 const status=text=>ui('status').textContent=text;
 function save(){try{session?sessionStorage.setItem(storageKey,JSON.stringify(session)):sessionStorage.removeItem(storageKey);}catch{}}
 function endpoint(){if(window.FOUR_CLANS_WS)return window.FOUR_CLANS_WS;const local=location.hostname==='127.0.0.1'||location.hostname==='localhost';const host=local&&location.port==='4178'?location.hostname+':4179':location.host;return(location.protocol==='https:'?'wss://':'ws://')+host+'/ws';}
 function send(data){if(socket?.readyState!==WebSocket.OPEN)return false;socket.send(JSON.stringify(data));return true;}
 function open(){ui('leave-confirm').hidden=true;$('online').hidden=false;keys.clear();pointerInside=false;if(!api.active)ui('name').focus();}
 function updateHUD(){
  if(!api.active)return;
  $('start').disabled=true;$('start').textContent=api.inMatch?'ออนไลน์ · '+latency+' ms':'รอในห้อง';
  for(const id of ['clan','reset','showcase','raid'])$(id).disabled=true;
  $('online-open').textContent=(api.connected?'● ':'○ ')+(lobby?.code||'กำลังเชื่อมต่อ');
  $('objective').textContent=api.inMatch?'ทำลายศาลาบัญชาการฝ่ายอื่น · ห้อง '+(lobby?.code||''):'รอเพื่อนและกดพร้อมรบในห้อง';
  root.querySelector('.r-prototype small').textContent=api.connected?'ONLINE · SERVER SYNC':'RECONNECTING';
  root.querySelector('.r-game-clock small').textContent='รบพร้อมกัน '+(lobby?.players.length||0)+' คน';
  if(api.inMatch&&game.over){$('intro').hidden=false;$('intro').replaceChildren();for(const text of [game.winner===player?'คุณครองป่าเงาจันทร์':game.winner===null?'จบการรบ':'ผู้ชนะ: ตระกูล'+CLANS[game.winner].name,'เปิดหน้าห้อง → ออกจากห้องเพื่อสร้างเกมใหม่']){const el=document.createElement('span');el.textContent=text;$('intro').append(el);}}
  else if(api.inMatch&&game.bases[player].hp<=0){$('intro').hidden=false;$('intro').textContent='ฐานของคุณถูกทำลาย · รอผลการรบ หรือออกจากห้อง';}
 }
 function renderLobby(){
  if(!lobby)return;
  ui('connect').hidden=true;ui('room').hidden=false;ui('room-code').textContent=lobby.code;
  const me=lobby.players.find(p=>p.id===session?.id);if(!me)return;
  ui('players').replaceChildren();
  for(let team=0;team<4;team++){
   const p=lobby.players.find(p=>p.team===team),card=document.createElement('div');card.className='r-online-seat'+(p?'':' empty');card.style.setProperty('--team',CLANS[team].color);
   const title=document.createElement('b');title.textContent='P'+(team+1)+' · '+CLANS[team].name;card.append(title);
   const name=document.createElement('small');name.textContent=p?p.name+(p.id===session.id?' (คุณ)':'')+(p.id===lobby.host?' · เจ้าของห้อง':''):'ที่ว่าง · ชวนเพื่อนเข้าร่วม';card.append(name);
   if(p){const state=document.createElement('small');state.className=p.ready?'ready':'';state.textContent=p.defeated?'ฐานถูกทำลาย':!p.connected?'เน็ตหลุด · รอเชื่อมต่อ':lobby.status!=='lobby'?'อยู่ในสนามรบ':p.ready?'✓ พร้อมรบ':'กำลังเตรียมตัว';card.append(state);}ui('players').append(card);
  }
  player=me.team;ui('clan').value=me.team;
  for(const option of ui('clan').options)option.disabled=lobby.players.some(p=>p.id!==me.id&&p.team===Number(option.value));
  const waiting=lobby.status==='lobby';
  ui('clan-label').hidden=!waiting;ui('ready').hidden=!waiting;ui('start').hidden=!waiting;ui('return').hidden=waiting;
  ui('ready').disabled=!api.connected;ui('ready').textContent=me.ready?'✓ พร้อมแล้ว · ยกเลิก':'พร้อมรบ';
  ui('start').disabled=!api.connected||lobby.host!==me.id||lobby.players.length<2||!lobby.players.every(p=>p.ready&&p.connected);
  ui('help').textContent=waiting?(lobby.players.length<2?'รอเพื่อนอย่างน้อย 1 คน · รองรับสูงสุด 4 คน':lobby.host===me.id?'เมื่อทุกคนพร้อม กดเริ่มรบได้เลย':'เมื่อทุกคนพร้อม เจ้าของห้องจะเริ่มรบ'):'รบพร้อมกัน ไม่มีการรอผลัด · เน็ตหลุดเกมยังเดินต่อ';
  updateHUD();
 }
 function command(action,args={}){
  if(!api.connected||!api.inMatch||game.over){message('ยังส่งคำสั่งไม่ได้ · ตรวจการเชื่อมต่อ');return false;}
  send({type:'command',requestId:++requestId,command:{action,...args}});return true;
 }
 function attachControls(){
  game.issue=(ids,mode,p)=>command('issue',{ids,mode,...(mode==='target'?{targetId:p?.id}:{point:p})});
  game.assignGather=(ids,r)=>r&&command('gather',{ids,resourceId:r.id})?ids.length:0;
  game.assignBuild=(ids,b)=>command('assignBuild',{ids,buildingId:b?.id});
  game.build=(kind,point,ids)=>{command('build',{kind,point,ids});return{ok:false,reason:'กำลังส่งคำสั่งก่อสร้าง…'};};
  game.train=(b,ids=[])=>({ok:command('train',{buildingId:b?.id,ids}),reason:'ยังไม่เชื่อมต่อ'});
  game.upgradeTower=b=>({ok:command('upgradeTower',{buildingId:b?.id}),reason:'ยังไม่เชื่อมต่อ'});
  for(const method of ['cancelTraining','cancelBuilding'])game[method]=b=>command(method,{buildingId:b?.id});
  game.repair=(b,ids)=>command('repair',{buildingId:b?.id,ids});
  game.cast=(team,ids,point)=>command('cast',{ids,point});game.volley=(team,ids)=>command('volley',{ids});game.heroSkill=ids=>command('heroSkill',{ids});
  game.step=dt=>{game.t=Math.min(game.t+dt,(game.snapshotTime||0)+.12);for(const u of game.units){if(u._netX===undefined)continue;const f=Math.min(1,dt*18);u.x+=(u._netX-u.x)*f;u.y+=(u._netY-u.y)*f;}};
 }
 let obstacleKey='';
 function applyState(state){
  if(!api.inMatch){
   player=session.team;world=new World();game=new EconomyBattle(player,world);api.inMatch=true;obstacleKey='';selected.clear();selectedBuilding=null;lastSoundId=lastEventId=0;camera.zoom=1.05;centerHome();
   $('intro').hidden=true;$('online').hidden=true;$('tech').hidden=true;attachControls();
  }
  const oldUnits=new Map(game.units.map(u=>[u.id,u])),buildingId=selectedBuilding?.id;
  const {seen,visible,...data}=state;
  for(const u of data.units){const previous=oldUnits.get(u.id);u._netX=u.x;u._netY=u.y;if(previous&&dist(previous,u)<100){u.x=previous.x;u.y=previous.y;}u.path=[];}
  Object.assign(game,data,{player,snapshotTime:state.t});
  game.seen=Uint8Array.from(atob(seen),c=>c.charCodeAt(0));game.visible=Uint8Array.from(atob(visible),c=>c.charCodeAt(0));
  for(const r of game.resources)if(r.type==='water')r.amount=Infinity;
  const key=game.structures.filter(b=>b.hp>0).map(b=>b.id).join(',');
  if(key!==obstacleKey){obstacleKey=key;world.blocked.set(game.terrainBlocked);for(const b of game.structures.filter(b=>b.hp>0))for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++)if(Math.abs(x*CELL+20-b.x)<b.w/2&&Math.abs(y*CELL+20-b.y)<b.h/2)world.blocked[y*COLS+x]=1;}
  selectedBuilding=game.structures.find(b=>b.id===buildingId)||null;
  if(!selected.size&&!selectedBuilding&&!game.over){const worker=game.workers()[0];if(worker)selected.add(worker.id);}
  updateUI();
 }
 async function connect(){
  if(socket?.readyState===WebSocket.OPEN)return;
  if(connectionPromise)return connectionPromise;
  connectionPromise=new Promise((resolve,reject)=>{
   status('กำลังเชื่อมต่อเซิร์ฟเวอร์… โฮสต์ฟรีอาจใช้เวลาปลุกประมาณ 1 นาที');
   const ws=new WebSocket(endpoint());socket=ws;
   const timeout=setTimeout(()=>{ws.close();reject(new Error('เชื่อมต่อช้า ลองใหม่อีกครั้ง'));},75000);
   ws.onopen=()=>{clearTimeout(timeout);api.connected=true;attempt=0;status('เชื่อมต่อแล้ว');clearInterval(pingTimer);pingTimer=setInterval(()=>send({type:'ping',at:Date.now()}),10000);resolve();if(session)send({type:'resume',code:session.code,token:session.token});renderLobby();};
   ws.onerror=()=>status('เชื่อมต่อไม่ได้ · ตรวจว่า backend เปิดอยู่และตั้งค่า URL / Origin ถูกต้อง');
   ws.onmessage=e=>{
    let data;try{data=JSON.parse(e.data);}catch{return;}
    if(data.type==='welcome'){session={code:data.code,id:data.id,team:data.team,token:data.token};save();api.active=true;game.running=false;status('เข้าห้องแล้ว · ส่งรหัสหรือลิงก์ให้เพื่อน');}
    if(data.type==='lobby'){lobby=data;const me=data.players.find(p=>p.id===session?.id);if(me){session.team=me.team;save();}renderLobby();}
    if(data.type==='state'){applyState(data.state);if(api.pendingBuilding){const built=game.structures.find(b=>b.id===api.pendingBuilding);if(built){selectedBuilding=built;api.pendingBuilding=null;updateUI();}}}
    if(data.type==='pong')latency=Math.max(0,Date.now()-data.at);
    if(data.type==='ack'&&data.action==='build'){api.pendingBuilding=data.buildingId;cancelMode();selected.clear();message('เซิร์ฟเวอร์รับคำสั่งก่อสร้างแล้ว');}
    if(data.type==='error'){status(data.message);message(data.message);if(data.requestType==='resume'){session=null;save();api.active=false;api.inMatch=false;lobby=null;reset();ui('connect').hidden=false;ui('room').hidden=true;open();}}
    if(data.type==='left')leaveLocal();
   };
   ws.onclose=e=>{
    clearTimeout(timeout);clearInterval(pingTimer);api.connected=false;connectionPromise=null;
    reject(new Error('การเชื่อมต่อปิดแล้ว'));
    if(e.code===4001){session=null;save();status('ห้องนี้ถูกเปิดจากแท็บอื่นแล้ว');api.active=false;api.inMatch=false;reset();open();return;}
    if(e.code===4002){session=null;save();leaveLocal();open();status('ห้องหมดอายุแล้ว สร้างห้องใหม่ได้');return;}
    if(session){status('การเชื่อมต่อหลุด · กำลังกลับเข้าห้องเดิม…');message('เน็ตหลุด · คำสั่งหยุดส่งจนกว่าจะเชื่อมต่อ');retryTimer=setTimeout(()=>connect().catch(()=>{}),Math.min(1000*2**attempt++,5000));}
    renderLobby();
   };
  });
  try{await connectionPromise;}finally{connectionPromise=null;}
 }
 function leaveLocal(){
  session=null;save();lobby=null;api.active=api.inMatch=false;clearTimeout(retryTimer);clearInterval(pingTimer);socket?.close();socket=null;api.connected=false;
  ui('connect').hidden=false;ui('room').hidden=true;$('online-open').textContent='ออนไลน์ 4 คน';
  root.querySelector('.r-prototype small').textContent='LOCAL PROTOTYPE';root.querySelector('.r-game-clock small').textContent='ฝึกหมู่บ้าน';
  for(const id of ['reset','showcase'])$(id).disabled=false;reset();status('ออกจากห้องแล้ว');
 }
 async function enter(type){
  const name=ui('name').value.trim();if(!name){status('กรุณาใส่ชื่อผู้เล่น');ui('name').focus();return;}
  if(type==='join'&&!/^[A-Fa-f0-9]{6}$/.test(ui('code').value.trim())){status('รหัสห้องต้องมี 6 ตัว');return;}
  ui('create').disabled=ui('join').disabled=true;
  try{await connect();send({type,name,code:ui('code').value.trim().toUpperCase()});}catch(error){status(error.message);}finally{ui('create').disabled=ui('join').disabled=false;}
 }
 $('online-open').onclick=open;ui('close').onclick=()=>{$('online').hidden=true;$('online-open').focus();};
 ui('create').onclick=()=>enter('create');ui('join').onclick=()=>enter('join');
 ui('ready').onclick=()=>{const me=lobby?.players.find(p=>p.id===session?.id);send({type:'ready',ready:!me?.ready});};
 ui('clan').onchange=()=>send({type:'clan',team:Number(ui('clan').value)});
 ui('start').onclick=()=>{audioUnlock();send({type:'start'});};
 ui('return').onclick=()=>{$('online').hidden=true;};
 ui('leave').onclick=()=>{if(api.inMatch&&!game.over&&game.bases[player].hp>0){ui('leave-confirm').hidden=false;return;}if(!send({type:'leave'}))leaveLocal();};
 ui('leave-yes').onclick=()=>{if(!send({type:'leave'}))leaveLocal();};ui('leave-no').onclick=()=>ui('leave-confirm').hidden=true;
 ui('copy').onclick=async()=>{const url=new URL(location.href);url.searchParams.set('room',lobby.code);try{await navigator.clipboard.writeText(url.href);status('คัดลอกลิงก์แล้ว · ส่งให้เพื่อนเพื่อเข้าห้อง');}catch{status('รหัสห้อง: '+lobby.code+' · เปิดเว็บเดียวกันแล้วใส่รหัสนี้');}};
 // Trap keyboard focus in the room dialog; do not send battlefield shortcuts beneath it.
 $('online').addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Escape'){ui('close').click();return;}if(e.key==='Tab'){const items=[...$('online').querySelectorAll('button,input,select')].filter(el=>!el.disabled&&el.getClientRects().length);const first=items[0],last=items.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}});
 const code=new URL(location.href).searchParams.get('room');if(code){ui('code').value=code;open();}
 try{session=JSON.parse(sessionStorage.getItem(storageKey)||'null');}catch{}
 if(session){api.active=true;game.running=false;open();connect().catch(()=>{});}
 return api;
})();
