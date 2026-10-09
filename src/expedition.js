// Expedition rules are shared by the browser and authoritative multiplayer server.
Object.assign(BUILDINGS,{
 stable:{name:'คอกม้า',icon:'♞',rice:160,water:80,seconds:22,hp:800,w:112,h:86,description:'ชาวบ้านจับม้าป่าและพากลับคอก · ทหารมนุษย์ขึ้นขี่ 25 ข้าว / 10 น้ำ'},
 camp:{name:'ค่ายหน้า',icon:'⚑',rice:180,water:100,seconds:25,hp:700,w:92,h:76,description:'สร้างในพื้นที่มองเห็นได้แม้ไกลฐาน · รักษา 2 HP/วิ ระยะ 160 ใช้เสบียง · พักม้า'},
 workshop:{name:'โรงเครื่องยิง',icon:'➶',rice:200,water:120,seconds:28,hp:850,w:112,h:86,description:'ส่งชาวบ้านประจำเครื่องยิง · 140 ข้าว / 80 น้ำ · ตีอาคารแรง แต่แพ้ประชิด'}
});
const SPECIALISTS={
 scout:{name:'สายลับสอดแนม',building:'shrine',rice:80,water:50,seconds:16,max:120,damage:12,range:30,speed:105,ranged:false},
 spear:{name:'พลหอก',building:'dojo',rice:70,water:30,seconds:14,max:180,damage:22,range:48,speed:78,ranged:false},
 siege:{name:'หน่วยเครื่องยิง',building:'workshop',rice:140,water:80,seconds:24,max:220,damage:10,range:270,speed:52,ranged:true}
};
const RIDING={cost:{rice:25,water:10},speed:[145,155,170,150],captureSeconds:4};
class EconomyBattle extends VillageBattle {
 constructor(player=0,world=new World()){
  super(player,world);
  this.horses=STARTS.flatMap((b,team)=>Array.from({length:3},(_,i)=>({id:'horse-'+team+'-'+i,...world.free({x:b.x+(b.x<W/2?1:-1)*(300+i*45),y:b.y+(b.y<H/2?170:-170)}),status:'wild',team:null,handlerId:null,stableId:null,riderId:null,progress:0})));
  this.horseRandom=seeded(7319);
  this.horses.forEach((h,i)=>{this.releaseHorse(h);h.roamWait=1+(i%3)*.8;});
 }
 releaseHorse(h){
  Object.assign(h,{status:'wild',team:null,handlerId:null,stableId:null,riderId:null,progress:0,roamHome:{x:h.x,y:h.y},roamGoal:null,roamWait:2,roamTime:0,path:[],repath:0,speed:58,walk:0,movingUntil:0});
 }
 wildHorseStep(h,dt){
  if(!this.world.walkable(h)){Object.assign(h,this.world.free(h));this.releaseHorse(h);}
  if(h.roamWait>0){h.roamWait=Math.max(0,h.roamWait-dt);return;}
  if(!h.roamGoal){
   // Pick short, reachable walks around the herd, never across forest or water.
   for(let i=0;i<8;i++){
    const angle=this.horseRandom()*Math.PI*2,radius=45+this.horseRandom()*105;
    const p={x:h.roamHome.x+Math.cos(angle)*radius,y:h.roamHome.y+Math.sin(angle)*radius};
    if(!this.world.walkable(p)||dist(h,p)<35)continue;
    const path=this.world.path(h,p);
    if(!path.length||path.length*CELL>360||path.some(q=>dist(q,h.roamHome)>180))continue;
    h.roamGoal=path.at(-1);h.path=path;h.goalCell=this.world.cell(h.roamGoal);h.repath=1;h.roamTime=0;break;
   }
   if(!h.roamGoal){h.roamWait=2;return;}
  }
  h.roamTime+=dt;
  if(this.move(h,h.roamGoal,dt)||h.roamTime>8){h.roamGoal=null;h.path=[];h.roamWait=2+this.horseRandom()*3;h.movingUntil=0;}
 }
 makeWorker(u){super.makeWorker(u);u.damage=8;}
 observable(team,v){
  if(!v||v.hp<=0||v.inTraining)return false;
  if(v.team===team)return true;
  const visible=this.multiplayer&&this.views?this.canSee(team,v):team===this.player?this.visibleAt(v):true;
  if(!visible)return false;
  if(!v.stealth||v.revealed>0)return true;
  return this.alive(team).some(u=>dist(u,v)<=85)||this.structures.some(b=>b.team===team&&b.hp>0&&b.complete&&b.kind==='tower'&&dist(b,v)<=180);
 }
 targets(team){return super.targets(team).filter(v=>this.observable(team,v));}
 updateVision(){
  super.updateVision();
  for(const u of this.alive(this.player).filter(u=>u.special==='scout')){
   const r=430;for(let y=Math.max(0,Math.floor((u.y-r)/CELL));y<=Math.min(ROWS-1,Math.ceil((u.y+r)/CELL));y++)for(let x=Math.max(0,Math.floor((u.x-r)/CELL));x<=Math.min(COLS-1,Math.ceil((u.x+r)/CELL));x++){const i=y*COLS+x;if(dist(u,this.world.center(i))<=r)this.visible[i]=this.seen[i]=1;}
  }
 }
 nearest(u,r=260){if(u.stealth&&u.order!=='target'||['capture','mount'].includes(u.job?.type)||u.defending)return null;return super.nearest(u,r);}
 setTargetPriority(ids,priority){
  if(!['auto','units','buildings'].includes(priority))return false;
  const civilians=this.workers().filter(u=>ids.includes(u.id));for(const u of civilians)u.targetPriority=priority;
  return super.setTargetPriority(ids,priority)||civilians.length>0;
 }
 setJob(u,job){
  if(u.job?.type==='capture')this.releaseCapture(u);
  u.defending=false;u.resumeJob=null;
  return super.setJob(u,job);
 }
 issue(ids,mode,p){
  for(const u of this.alive(this.player).filter(u=>ids.includes(u.id))){if(u.job?.type==='capture')this.releaseCapture(u);u.defending=false;u.resumeJob=null;}
  return super.issue(ids,mode,p);
 }
 availableHorse(b){return this.horses?.find(h=>h.status==='stabled'&&h.stableId===b?.id&&h.team===b.team);}
 releaseCapture(u){const h=this.horses?.find(h=>h.handlerId===u.id&&['catching','leading'].includes(h.status));if(h)this.releaseHorse(h);}
 captureHorse(ids,horseId){
  const h=this.horses.find(h=>h.id===horseId&&h.status==='wild'&&this.visibleAt(h));
  const u=this.workers().filter(u=>ids.includes(u.id)&&u.job?.type!=='train').sort((a,b)=>dist(a,h||STARTS[this.player])-dist(b,h||STARTS[this.player]))[0];
  const stable=this.structures.find(b=>b.team===this.player&&b.kind==='stable'&&b.hp>0&&b.complete);
  if(!this.running||this.over||!h||!u||!stable)return{ok:false,reason:'เลือกชาวบ้านและม้าป่าที่มองเห็น · ต้องสร้างคอกม้าให้เสร็จก่อน'};
  if(!this.world.path(u,h).length)return{ok:false,reason:'เดินไปหาม้าไม่ได้'};
  this.setJob(u,{type:'capture',horseId:h.id,phase:'catch',elapsed:0});Object.assign(h,{status:'catching',handlerId:u.id,team:u.team,stableId:stable.id,path:[],roamGoal:null,movingUntil:0});
  return{ok:true};
 }
 mount(ids,stableId){
  const b=this.structures.find(b=>b.id===stableId&&b.team===this.player&&b.kind==='stable'&&b.complete&&b.hp>0);
  const u=this.warriors().find(u=>ids.includes(u.id)&&!u.horseId&&!u.form&&!['siege'].includes(u.special)&&!u.job);
  if(!this.running||this.over||!b||!u||!this.availableHorse(b))return{ok:false,reason:'ต้องมีม้าในคอก และเลือกทหารมนุษย์ที่ว่าง (ขั้น 1–2 / พลหอก / สายลับ)'};
  if(!this.affordable(RIDING.cost))return{ok:false,reason:'ขึ้นม้าใช้ 25 ข้าว / 10 น้ำ'};
  if(!this.world.path(u,this.door(b)).length)return{ok:false,reason:'เดินเข้าคอกม้าไม่ได้'};
  this.setJob(u,{type:'mount',buildingId:b.id});return{ok:true};
 }
 dismount(ids,returnToStable=false,team=this.player){
  let n=0;for(const u of this.units.filter(u=>u.team===team&&ids.includes(u.id)&&u.horseId)){
   const h=this.horses?.find(h=>h.id===u.horseId);const b=returnToStable&&this.structures.filter(b=>b.team===u.team&&b.kind==='stable'&&b.hp>0&&b.complete).sort((a,b)=>dist(a,u)-dist(b,u))[0];
   if(h)Object.assign(h,{...(b?this.door(b):this.world.free(u)),status:b?'stabled':'wild',stableId:b?b.id:null,team:b?u.team:null,riderId:null,handlerId:null,progress:0});
   if(h&&!b)this.releaseHorse(h);
   u.horseId=null;u.sprinting=false;u.charge=0;u.speed=u.baseSpeed||CLANS[u.team].speed;n++;
  }return n>0;
 }
 sprint(ids){let n=0;for(const u of this.alive(this.player).filter(u=>ids.includes(u.id)&&(u.horseId||u.form==='wolf'))){if((u.stamina??100)<20&&!u.sprinting)continue;u.sprinting=!u.sprinting;n++;}return n>0;}
 volley(team,ids=null){return super.volley(team,this.warriors(team).filter(u=>u.special!=='siege'&&(!ids||ids.includes(u.id))).map(u=>u.id));}
 toggleStealth(ids){
  let n=0;for(const u of this.warriors().filter(u=>ids.includes(u.id)&&u.special==='scout'&&!u.horseId&&!u.job)){
   if(u.revealed>0&&!u.stealth)continue;u.stealth=!u.stealth;u.target=null;u.order=u.dest?'move':'hold';n++;
  }return n>0;
 }
 sabotage(ids){
  const u=this.warriors().find(u=>ids.includes(u.id)&&u.special==='scout'&&u.team===1&&(u.sabotageCooldown||0)<=0);
  const b=u&&this.targets(u.team).find(b=>b.building&&['hq','store'].includes(b.kind)&&this.targetDistance(u,b)<90);
  if(!u||!b)return false;
  this.stock[b.team].rice=Math.max(0,this.stock[b.team].rice-40);this.stock[b.team].water=Math.max(0,this.stock[b.team].water-20);u.stealth=false;u.revealed=8;u.sabotageCooldown=45;
  this.effect('text',b.x,b.y-60,'#acd281',1,'เสบียงเสียหาย');return true;
 }
 trainSpecial(b,ids,role){
  const d=Object.hasOwn(SPECIALISTS,role)?SPECIALISTS[role]:null;const u=this.alive(this.player).find(u=>ids.includes(u.id)&&!u.inTraining&&!u.horseId&&!u.form&&!u.special&&u.job?.type!=='train'&&(u.worker||u.tier<=2));
  if(!this.running||this.over||!d||!b||b.kind!==d.building||b.team!==this.player||!b.complete||b.hp<=0||b.queue.length>=3||!u)return{ok:false,reason:'เลือกชาวบ้านหรือทหารมนุษย์ขั้น 1–2 และโรงฝึกที่พร้อมใช้งาน'};
  if(!this.world.path(u,this.door(b)).length)return{ok:false,reason:'เข้าโรงฝึกไม่ได้'};
  if(!this.affordable(d))return{ok:false,reason:'ข้าวหรือน้ำไม่พอ'};
  if(!this.setJob(u,{type:'train',buildingId:b.id}))return{ok:false,reason:'ยูนิตกำลังฝึก'};
  this.spend(d);b.queue.push({unitId:u.id,total:d.seconds,remaining:d.seconds,cost:{rice:d.rice,water:d.water},recipe:{...d,special:role,role,tier:1,schools:[]}});return{ok:true};
 }
 trainingRecipe(u,kind){return u?.special?null:super.trainingRecipe(u,kind);}
 finishTraining(u,d){
  if(u.horseId&&d.tier>=3)this.dismount([u.id],true,u.team);
  super.finishTraining(u,d);
  if(d.special)Object.assign(u,{special:d.special,className:d.name,damage:d.damage,range:d.range,ranged:d.ranged,speed:d.speed,max:d.max,stealth:false,revealed:0,baseSpeed:d.speed});
  else u.baseSpeed=u.speed;
 }
 attackInterval(u){return u.special==='siege'?3:u.ranged?1.5:.95;}
 shoot(u,v,damage=u.damage){u.stealth=false;u.revealed=5;u.lastCombat=this.t;super.shoot(u,v,damage);const p=this.projectiles.at(-1);if(p){p.special=u.special;p.mounted=!!u.horseId;}}
 hit(v,amount,source,pierce=false){
  if(v.hp<=0)return 0;
  if(!pierce&&source){
   const rider=source.horseId||source.mounted;
   if(source.special==='siege'&&v.building)amount*=6;
   if(source.special==='spear'&&v.horseId)amount*=2;
   if(v.horseId&&v.team===0)amount*=.85;
   if(rider&&source.team===1&&!v.building&&v.form!=='crane'&&v.immune<=0){v.venom=3;v.venomDps=2;}
   if(source.horseId&&source.sprinting&&!source.ranged&&(source.charge||0)<=0&&(source.stamina??100)>=20){amount+=source.team===0?25:15;source.stamina-=20;source.charge=8;this.effect('ring',v.x,v.y,'#f1d69c');}
   source.stealth=false;source.revealed=5;source.lastCombat=this.t;
  }
  v.lastCombat=this.t;v.revealed=5;
  // Workers briefly defend their workplace and then resume their economy job.
  if(v.worker&&source?.id!==undefined&&source.team!==v.team&&!v.inTraining&&v.job?.type==='gather'&&dist(v,source)<=95){v.resumeJob={...v.job};v.job=null;v.defending=true;v.defendTime=4;v.order='target';v.target=source;v.defendOrigin={x:v.x,y:v.y};}
  const result=super.hit(v,amount,source,pierce);
  if(v.hp<=0&&v.horseId){const h=this.horses?.find(h=>h.riderId===v.id);if(h){Object.assign(h,this.world.free(v));this.releaseHorse(h);}v.horseId=null;}
  return result;
 }
 workerStep(u,dt){
  const j=u.job;
  if(j?.type==='capture'){
   const h=this.horses.find(h=>h.id===j.horseId&&h.handlerId===u.id),b=h&&this.structures.find(b=>b.id===h.stableId&&b.hp>0&&b.complete);
   if(!h||!b){this.setJob(u,null);return;}
   if(u.cargo>0){this.deposit(u,dt);return;}
   if(j.phase==='catch'){
    if(dist(u,h)>35){this.move(u,h,dt);return;}j.elapsed+=dt;h.progress=j.elapsed/RIDING.captureSeconds;u.harvesting=false;u.walk+=dt*4;
    if(j.elapsed>=RIDING.captureSeconds){h.status='leading';j.phase='return';}return;
   }
   const p=this.door(b);this.move(u,p,dt);h.x=u.x-22;h.y=u.y+10;h.movingUntil=u.movingUntil;h.stride=u.stride;h.angle=u.angle;
   if(dist(u,p)<30){Object.assign(h,{...p,status:'stabled',handlerId:null,progress:1});u.job=null;u.order='hold';this.notify('พาม้าเข้าคอกแล้ว · เลือกทหารเพื่อขึ้นขี่');}return;
  }
  if(j?.type==='mount'){
   const b=this.structures.find(b=>b.id===j.buildingId&&b.hp>0&&b.complete);
   if(!b){this.setJob(u,null);return;}const p=this.door(b);if(dist(u,p)>28){this.move(u,p,dt);return;}
   const h=this.availableHorse(b);if(!h||!this.spend(RIDING.cost,u.team)){this.setJob(u,null);this.notify('ไม่มีม้าหรือเสบียงพอสำหรับขึ้นขี่');return;}
   u.baseSpeed=u.speed;Object.assign(u,{horseId:h.id,stamina:100,sprinting:false,stealth:false,job:null,order:'hold'});Object.assign(h,{status:'mounted',riderId:u.id});this.notify('ขึ้นม้าแล้ว · X เร่งความเร็ว');return;
  }
  return super.workerStep(u,dt);
 }
 formStep(dt){
  super.formStep(dt);
  for(const u of this.alive()){
   u.revealed=Math.max(0,(u.revealed||0)-dt);u.sabotageCooldown=Math.max(0,(u.sabotageCooldown||0)-dt);u.charge=Math.max(0,(u.charge||0)-dt);
   if(u.defending){u.defendTime-=dt;if(u.defendTime<=0||!u.target||u.target.hp<=0||dist(u,u.defendOrigin)>85||dist(u,u.target)>100){u.job=u.resumeJob;u.resumeJob=null;u.defending=false;u.target=null;u.order='work';u.path=[];}}
   if(u.horseId||u.form==='wolf'){
    u.stamina=clamp((u.stamina??100)+(u.sprinting?-18:(u.movingUntil||0)>this.t?4:10)*dt,0,100);if(u.stamina<=0)u.sprinting=false;
    const speed=u.horseId?RIDING.speed[u.team]:ASCENSIONS[3].speed*(u.awakened>0?1.3:1);u.speed=speed*(u.sprinting?1.4:1);
   }else if(u.special)u.speed=SPECIALISTS[u.special].speed*(u.stealth?.6:1);
  }
 }
 step(dt){
  if(!this.running||this.over)return;dt=Math.min(dt,.05);
  for(const u of this.alive().filter(u=>u.job?.type==='mount'))this.workerStep(u,dt);
  super.step(dt);
  for(const h of this.horses){
   if(h.status==='mounted'){const u=this.units.find(u=>u.id===h.riderId&&u.hp>0);if(!u)this.releaseHorse(h);else{h.x=u.x;h.y=u.y;}}
   if(['catching','leading'].includes(h.status)&&!this.units.some(u=>u.id===h.handlerId&&u.hp>0&&u.job?.type==='capture'))this.releaseHorse(h);
   if(h.status==='stabled'&&!this.structures.some(b=>b.id===h.stableId&&b.hp>0))this.releaseHorse(h);
   if(h.status==='wild')this.wildHorseStep(h,dt);
  }
  for(const u of this.alive()){
   const camp=this.structures.find(b=>b.kind==='camp'&&b.complete&&b.hp>0&&b.team===u.team&&dist(b,u)<160);if(!camp)continue;
   if((u.stamina??100)<100)u.stamina=Math.min(100,u.stamina+10*dt);
   if(u.hp<u.max&&this.t-(u.lastCombat??-99)>4){const hp=Math.min(2*dt,u.max-u.hp);if(this.spend({rice:hp*.08,water:hp*.04},u.team))u.hp+=hp;}
  }
 }
 setupExpedition(){
  this.setupShowcase();const home=STARTS[this.player];
  for(const kind of ['stable','camp','workshop']){
   const points=[];for(let y=home.y-450;y<=home.y+450;y+=40)for(let x=home.x-500;x<=home.x+500;x+=40)points.push({x,y});points.sort((a,b)=>dist(a,home)-dist(b,home));const p=points.map(p=>this.placement(kind,p)).find(r=>r.ok)?.point;if(p){this.addStructure(kind,p,this.player,true);this.rebuildObstacles();this.updateVision();}
  }
  const stable=this.structures.find(b=>b.team===this.player&&b.kind==='stable');
  if(stable){const h=this.horses.find(h=>h.id==='horse-'+this.player+'-0');Object.assign(h,{...this.door(stable),status:'stabled',stableId:stable.id,team:this.player});}
  const workers=this.workers();for(const [i,role]of ['scout','spear','siege'].entries()){const u=workers[i+3];if(u)this.finishTraining(u,{...SPECIALISTS[role],special:role,role,tier:1,schools:[]});}
  this.stock[this.player]={rice:600,water:400};this.updateVision();
 }
}
