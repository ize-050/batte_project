const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const {randomBytes}=require('node:crypto');
const {WebSocketServer,WebSocket}=require('ws');
const {MultiplayerBattle}=require('./multiplayer.cjs');

function createGameServer(options={}){
  const rooms=new Map();
  const maxRooms=options.maxRooms??Number(process.env.MAX_ROOMS||8);
  const reconnectMs=options.reconnectMs??90000;
  const allowedOrigins=(options.allowedOrigins??process.env.ALLOWED_ORIGINS??'').split(',').map(s=>s.trim()).filter(Boolean);
  const page=path.join(__dirname,'dist/index.html');
  const server=http.createServer((req,res)=>{
    const url=new URL(req.url,'http://local');
    if(url.pathname==='/health'){res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({ok:true,rooms:rooms.size}));return;}
    if(!['/','/index.html','/battle-preview.html'].includes(url.pathname)){res.writeHead(404);res.end('Not found');return;}
    if(!fs.existsSync(page)){res.writeHead(503);res.end('Run npm run build first');return;}
    res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff','Referrer-Policy':'same-origin'});
    fs.createReadStream(page).pipe(res);
  });
  const wss=new WebSocketServer({noServer:true,maxPayload:8192,perMessageDeflate:{threshold:1024,serverNoContextTakeover:true,clientNoContextTakeover:true,concurrencyLimit:4,zlibDeflateOptions:{level:3}}});
  server.on('upgrade',(req,socket,head)=>{
    let valid=false;
    try{
      const origin=req.headers.origin;
      // Browser connections must be same-host or explicitly allowed. Node test clients omit Origin.
      valid=!origin||allowedOrigins.includes(origin)||new URL(origin).host===req.headers.host
        ||(['127.0.0.1:4179','localhost:4179'].includes(req.headers.host)&&['http://127.0.0.1:4178','http://localhost:4178'].includes(origin));
      if(new URL(req.url,'http://local').pathname!=='/ws')valid=false;
    }catch{}
    if(!valid||wss.clients.size>=64){socket.write('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');socket.destroy();return;}
    wss.handleUpgrade(req,socket,head,ws=>wss.emit('connection',ws,req));
  });
  const send=(ws,data)=>{if(ws?.readyState===WebSocket.OPEN){if(ws.bufferedAmount>1024*1024){ws.close(1013,'Connection too slow');return;}ws.send(JSON.stringify(data));}};
  const lobby=room=>({type:'lobby',code:room.code,host:room.host,status:room.status,players:room.players.map(p=>({id:p.id,name:p.name,team:p.team,ready:p.ready,connected:!!p.ws,defeated:room.game?room.game.bases[p.team].hp<=0:false}))});
  const broadcast=room=>{const data=lobby(room);for(const p of room.players)send(p.ws,data);};
  function detach(ws,explicit=false){
    const room=rooms.get(ws.roomCode),p=room?.players.find(p=>p.id===ws.playerId&&p.ws===ws);
    ws.roomCode=null;ws.playerId=null;if(!p)return;
    p.ws=null;p.disconnectedAt=Date.now();if(room.status==='lobby')p.ready=false;
    if(explicit){
      if(room.status==='playing'){room.game.surrender(p.team);p.departed=true;}
      else room.players=room.players.filter(x=>x!==p);
    }
    if(room.host===p.id&&!p.ws)room.host=room.players.find(x=>x.ws)?.id??room.host;
    if(!room.players.length)rooms.delete(room.code);else broadcast(room);
  }
  function enter(ws,room,p){
    p.ws?.close(4001,'Session resumed elsewhere');p.ws=ws;p.disconnectedAt=null;
    ws.roomCode=room.code;ws.playerId=p.id;
    send(ws,{type:'welcome',code:room.code,id:p.id,token:p.token,team:p.team});broadcast(room);
    if(room.game)send(ws,{type:'state',state:room.game.snapshot(p.team)});
  }
  function start(room){
    room.game=new MultiplayerBattle(room.players.map(p=>p.team));room.status='playing';room.startedAt=Date.now();broadcast(room);
    for(const p of room.players)send(p.ws,{type:'state',state:room.game.snapshot(p.team)});
  }
  wss.on('connection',ws=>{
    ws.isAlive=true;ws.connectedAt=Date.now();ws.rateAt=Date.now();ws.rate=0;
    ws.on('pong',()=>ws.isAlive=true);
    ws.on('error',()=>{});
    ws.on('close',()=>detach(ws));
    ws.on('message',raw=>{
      let m;
      try{
        if(Date.now()-ws.rateAt>1000){ws.rateAt=Date.now();ws.rate=0;}
        if(++ws.rate>40){ws.close(1008,'Too many commands');return;}
        m=JSON.parse(raw.toString());if(!m||typeof m!=='object')throw new Error('ข้อความไม่ถูกต้อง');
        if(m.type==='ping'){send(ws,{type:'pong',at:m.at});return;}
        if(m.type==='leave'){detach(ws,true);send(ws,{type:'left'});return;}
        if(m.type==='resume'){
          if(ws.roomCode)throw new Error('อยู่ในห้องแล้ว');
          const room=rooms.get(String(m.code||'').toUpperCase());
          const p=room?.players.find(p=>p.token===m.token&&!p.departed);
          if(!p)throw new Error('กลับเข้าห้องไม่ได้ ห้องหมดอายุหรือเซิร์ฟเวอร์เริ่มใหม่');
          enter(ws,room,p);return;
        }
        if(m.type==='create'||m.type==='join'){
          if(ws.roomCode)throw new Error('ออกจากห้องเดิมก่อน');
          const name=typeof m.name==='string'?m.name.trim().replace(/[\x00-\x1f<>]/g,'').slice(0,24):'';
          if(!name)throw new Error('กรุณาใส่ชื่อผู้เล่น');
          let room;
          if(m.type==='create'){
            if(rooms.size>=maxRooms)throw new Error('เซิร์ฟเวอร์เต็ม ลองใหม่ภายหลัง');
            let code;do{code=randomBytes(3).toString('hex').toUpperCase();}while(rooms.has(code));
            room={code,players:[],host:null,status:'lobby',createdAt:Date.now()};rooms.set(code,room);
          }else room=rooms.get(String(m.code||'').trim().toUpperCase());
          if(!room)throw new Error('ไม่พบห้อง ตรวจรหัส 6 ตัวอีกครั้ง');
          if(room.status!=='lobby')throw new Error('ห้องนี้เริ่มเล่นแล้ว');
          if(room.players.length>=4)throw new Error('ห้องเต็ม 4 คนแล้ว');
          const p={id:randomBytes(8).toString('hex'),token:randomBytes(24).toString('hex'),name,team:[0,1,2,3].find(t=>!room.players.some(p=>p.team===t)),ready:false,ws:null};
          room.players.push(p);room.host??=p.id;enter(ws,room,p);return;
        }
        const room=rooms.get(ws.roomCode),p=room?.players.find(p=>p.id===ws.playerId&&p.ws===ws);
        if(!room||!p)throw new Error('กรุณาเข้าห้องก่อน');
        if(m.type==='ready'){
          if(room.status!=='lobby')throw new Error('เริ่มรบแล้ว');p.ready=!!m.ready;broadcast(room);
        }else if(m.type==='clan'){
          if(room.status!=='lobby'||!Number.isInteger(m.team)||m.team<0||m.team>3||room.players.some(x=>x!==p&&x.team===m.team))throw new Error('เผ่านี้ไม่ว่าง');
          p.team=m.team;p.ready=false;broadcast(room);
        }else if(m.type==='start'){
          if(room.host!==p.id)throw new Error('เฉพาะเจ้าของห้องเริ่มเกมได้');
          if(room.status!=='lobby'||room.players.length<2||!room.players.every(p=>p.ready&&p.ws))throw new Error('ต้องมี 2–4 คนและกดพร้อมทุกคน');
          start(room);
        }else if(m.type==='command'){
          if(room.status!=='playing'||p.departed)throw new Error('ห้องยังไม่พร้อมรบ');
          const result=room.game.command(p.team,m.command);send(ws,{type:'ack',requestId:m.requestId,...result});
        }else throw new Error('ไม่รองรับข้อความนี้');
      }catch(error){send(ws,{type:'error',requestId:m?.requestId,requestType:m?.type,message:error.message});}
    });
  });
  let tick=0;
  const simulation=setInterval(()=>{
    const now=Date.now();
    for(const room of rooms.values()){
      if(room.status==='lobby'){
        const count=room.players.length;room.players=room.players.filter(p=>p.ws||now-p.disconnectedAt<=reconnectMs);
        if(!room.players.length){rooms.delete(room.code);continue;}
        if(count!==room.players.length)broadcast(room);
        if(now-room.createdAt>30*60*1000){for(const p of room.players)p.ws?.close(4002,'Lobby expired');rooms.delete(room.code);}continue;
      }
      for(const p of room.players)if(!p.ws&&!p.departed&&now-p.disconnectedAt>reconnectMs){if(room.status==='playing')room.game.surrender(p.team);p.departed=true;broadcast(room);}
      if(!room.players.some(p=>p.ws)&&room.players.every(p=>p.departed)){rooms.delete(room.code);continue;}
      room.game.step(.05);
      if(tick%2===0)for(const p of room.players)send(p.ws,{type:'state',state:room.game.snapshot(p.team)});
      if(room.game.over&&room.status!=='finished'){room.status='finished';room.finishedAt=now;broadcast(room);}
      if(room.finishedAt&&now-room.finishedAt>5*60*1000){for(const p of room.players)p.ws?.close(4002,'Match finished');rooms.delete(room.code);}
    }
    tick++;
  },50);
  const heartbeat=setInterval(()=>{for(const ws of wss.clients){if(!ws.isAlive||!ws.roomCode&&Date.now()-ws.connectedAt>120000){ws.terminate();continue;}ws.isAlive=false;ws.ping();}},30000);
  async function close(){clearInterval(simulation);clearInterval(heartbeat);for(const ws of wss.clients)ws.terminate();await new Promise(r=>wss.close(r));await new Promise(r=>server.close(r));}
  return{server,wss,rooms,close};
}
if(require.main===module){
  const app=createGameServer(),port=Number(process.env.PORT||4179);
  app.server.listen(port,'0.0.0.0',()=>console.log('Four Clans online listening on http://localhost:'+port));
  for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>app.close().then(()=>process.exit(0)));
}
module.exports={createGameServer};
