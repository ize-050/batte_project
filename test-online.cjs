const assert=require('node:assert/strict');
const {WebSocket}=require('ws');
const {createGameServer}=require('./server.cjs');
const {MultiplayerBattle}=require('./multiplayer.cjs');
const delay=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 const app=createGameServer({reconnectMs:350,maxRooms:5});await new Promise(r=>app.server.listen(0,'127.0.0.1',r));
 const url='ws://127.0.0.1:'+app.server.address().port+'/ws',clients=[];
 async function client(){
  const ws=new WebSocket(url),messages=[];ws.on('message',raw=>messages.push(JSON.parse(raw)));await new Promise((r,j)=>{ws.once('open',r);ws.once('error',j);});
  const c={ws,messages,send:m=>ws.send(JSON.stringify(m)),wait:async(type,predicate=()=>true)=>{for(let n=0;n<200;n++){const i=messages.findIndex(m=>m.type===type&&predicate(m));if(i>=0)return messages.splice(i,1)[0];await delay(10);}throw new Error('Timeout '+type);}};clients.push(c);return c;
 }
 try{
  const a=await client();a.send({type:'create',name:'Host'});const wa=await a.wait('welcome'),code=wa.code;
  const players=[a],welcomes=[wa];
  for(let i=1;i<4;i++){const c=await client();c.send({type:'join',code,name:'Player '+i});welcomes.push(await c.wait('welcome'));players.push(c);}
  assert.equal(new Set(welcomes.map(w=>w.team)).size,4);
  const extra=await client();extra.send({type:'join',code,name:'Fifth'});assert.match((await extra.wait('error')).message,/เต็ม/);
  a.send({type:'start'});assert.match((await a.wait('error')).message,/พร้อม/);
  players[1].send({type:'start'});assert.match((await players[1].wait('error')).message,/เจ้าของ/);
  players[1].send({type:'clan',team:0});assert.match((await players[1].wait('error')).message,/ไม่ว่าง/);
  for(const c of players)c.send({type:'ready',ready:true});
  await a.wait('lobby',m=>m.players.length===4&&m.players.every(p=>p.ready));a.send({type:'start'});
  const initial=await Promise.all(players.map(c=>c.wait('state')));
  for(let i=0;i<4;i++){const s=initial[i].state;assert(s.units.some(u=>u.team===i));assert(s.units.every(u=>u.team===i),'fog hides distant armies');assert.equal(s.stock[i].rice,360);assert.equal(s.stock[(i+1)%4].rice,0);}
  const game=app.rooms.get(code).game;
  // Commands for all four clients mutate one authoritative simulation.
  for(let i=0;i<4;i++)players[i].send({type:'command',requestId:i,command:{action:'gather',ids:game.workers(i).slice(0,4).map(u=>u.id),resourceId:'rice-'+i}});
  await Promise.all(players.map(c=>c.wait('ack')));
  a.send({type:'command',requestId:99,command:{action:'issue',ids:[10],mode:'move',point:{x:500,y:500}}});assert.match((await a.wait('error')).message,/เฉพาะ/);assert.equal(game.units.find(u=>u.id===10).job.type,'gather');
  a.send({type:'command',command:{action:'cancelTraining',buildingId:'hq-1'}});assert.match((await a.wait('error')).message,/อาคารของคุณ/);
  a.send({type:'command',command:{action:'issue',ids:[6],mode:'target',targetId:16}});assert.match((await a.wait('error')).message,/มองเห็น/);
  a.send({type:'command',command:{action:'issue',ids:[6],mode:'move',point:{x:-1,y:600}}});assert.match((await a.wait('error')).message,/นอกแผนที่/);
  a.send({type:'command',command:{action:'stock',rice:9999}});assert.match((await a.wait('error')).message,/รองรับ/);
  const moving=game.warriors(0)[0],before=moving.x;
  a.send({type:'command',requestId:51,command:{action:'issue',ids:[moving.id],mode:'move',point:{x:740,y:460}}});await a.wait('ack',m=>m.requestId===51);await delay(300);assert.notEqual(moving.x,before);
  // Simulate economy quickly after real sockets have issued the jobs.
  for(let i=0;i<600;i++)game.step(.05);
  for(let t=0;t<4;t++){assert(game.resources.find(r=>r.id==='rice-'+t).amount<480,'rice harvested team '+t);assert(game.stock[t].rice>360,'resources deposited team '+t);assert(game.population(t)>10,'hut spawns team '+t);}
  const snapshot=game.snapshot(0);assert.doesNotThrow(()=>JSON.stringify(snapshot));
  // Shared combat produces identical HP for both players whenever visible.
  const u=game.warriors(0)[0],v=game.warriors(1)[0];Object.assign(u,{x:1000,y:680,order:'hold'});Object.assign(v,{x:1020,y:680,order:'hold'});game.refreshVision();const hp=v.hp;for(let i=0;i<80;i++)game.step(.05);assert(v.hp<hp);assert.equal(game.snapshot(0).units.find(x=>x.id===v.id).hp,game.snapshot(1).units.find(x=>x.id===v.id).hp);assert(game.views[1].alerts.length);
  // Reconnect is authenticated by opaque token; wrong token cannot take a seat.
  players[3].ws.close();await delay(40);const resumed=await client();resumed.send({type:'resume',code,token:welcomes[3].token});assert.equal((await resumed.wait('welcome')).team,3);assert((await resumed.wait('state')).state.t>0);
  extra.send({type:'resume',code,token:'invalid'});assert.match((await extra.wait('error')).message,/กลับเข้าห้องไม่ได้/);
  // New rooms are isolated and the host transfers on leave.
  extra.send({type:'create',name:'Other host'});const wb=await extra.wait('welcome');assert.notEqual(wb.code,code);
  const other=await client();other.send({type:'join',code:wb.code,name:'Other guest'});const wo=await other.wait('welcome');extra.send({type:'leave'});await other.wait('lobby',m=>m.host===wo.id);assert.equal(app.rooms.get(code).game,game);
  players[2].ws.close();await delay(500);assert.equal(game.bases[2].hp,0,'disconnect grace forfeits only missing player');assert(game.bases[3].hp>0,'reconnected player survives');
  a.send({type:'leave'});await a.wait('left');assert.equal(game.bases[0].hp,0);assert(!game.over,'other two players continue after host leaves');
  players[1].send({type:'leave'});await players[1].wait('left');assert(game.over);assert.equal(game.winner,3);
  // Origins are enforced for browser sessions.
  const rejected=new WebSocket(url,{origin:'https://untrusted.example'});const rejectedStatus=await new Promise(resolve=>{rejected.on('unexpected-response',(req,res)=>{resolve(res.statusCode);res.resume();req.destroy();});rejected.on('error',()=>{});});assert.equal(rejectedStatus,403);
  console.log('PASS online: 4 sockets, room capacity/readiness/host/clans, synchronized economy/movement/combat, private fog, ownership/target validation, room isolation, reconnect, disconnect forfeit and victory');
 }finally{for(const c of clients)c.ws.terminate();await app.close();}
 // Multi-team construction, sequential training, tower costs and no client state injection.
 const g=new MultiplayerBattle([0,1,2,3]);
 for(let t=0;t<4;t++)g.asTeam(t,()=>{g.setupShowcase();});
 for(let t=0;t<4;t++){
  const tower=g.structures.find(b=>b.team===t&&b.kind==='tower');g.stock[t]={rice:600,water:400};
  assert(g.command(t,{action:'upgradeTower',buildingId:tower.id}).ok);
  const worker=g.workers(t)[0];g.setJob(worker,null);const school=g.structures.find(b=>b.team===t&&b.kind==='archery');Object.assign(worker,g.door(school));assert(g.command(t,{action:'train',buildingId:school.id,ids:[worker.id]}).ok);
 }
 for(let i=0;i<400;i++)g.step(.05);
 for(let t=0;t<4;t++){assert.equal(g.structures.find(b=>b.team===t&&b.kind==='tower').level,2);assert.equal(g.units.find(u=>u.id===t*10).className,'พลธนู');}
 console.log('PASS online progression: all four clans train and upgrade towers concurrently');
})().catch(e=>{console.error(e);process.exitCode=1;});
