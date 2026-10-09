// Economy is layered over the tested combat, camera, vision and navigation engine.
const BUILDINGS = {
  hut:{name:'กระท่อมชาวบ้าน',icon:'⌂',rice:80,water:0,seconds:12,hp:550,w:76,h:64,description:'เกิดชาวบ้านอัตโนมัติทุก 30 วิ · ที่อยู่ +6'},
  dojo:{name:'โรงฝึกดาบ',icon:'⚔',rice:120,water:50,seconds:18,hp:850,w:100,h:80,description:'ฝึกวิชาดาบ · รวมกับธนูเป็นพลธนูเกราะ / รวมกับวิญญาณเป็นองครักษ์'},
  archery:{name:'โรงฝึกธนู',icon:'➶',rice:140,water:60,seconds:20,hp:750,w:100,h:80,description:'ฝึกวิชาธนู · รวมกับดาบเป็นพลธนูเกราะ / รวมกับวิญญาณเป็นนักธนูมนตรา'},
  shrine:{name:'สำนักวิญญาณ',icon:'✦',rice:160,water:90,seconds:22,hp:800,w:94,h:78,description:'ชาวบ้าน → ผู้ฝึกวิญญาณ · ฝึกครบ 3 วิชาเป็นยอดฝีมือขั้น 3'},
  warhall:{name:'หอจอมทัพ',icon:'♛',rice:220,water:140,seconds:30,hp:1250,w:112,h:90,description:'ต้องมีโรงดาบ โรงธนู และสำนักวิญญาณ · ยอดฝีมือขั้น 3 → จอมทัพขั้น 4'},
  well:{name:'บ่อน้ำ',icon:'◈',rice:100,water:70,seconds:16,hp:450,w:56,h:52,description:'จุดตักน้ำใกล้ฐาน · ต้องใช้ชาวบ้านเก็บ'},
  store:{name:'ยุ้งฉาง',icon:'▤',rice:100,water:40,seconds:15,hp:650,w:86,h:72,description:'สร้างในพื้นที่สำรวจเพื่อรับเสบียงใกล้อู่ข้าว · ความจุข้าว +300 / น้ำ +200'},
  tower:{name:'ป้อมธนู',icon:'♜',rice:130,water:80,seconds:22,hp:900,w:62,h:62,description:'ยิงศัตรูอัตโนมัติ · ระยะ 300 · อัปเกรดได้ 3 ระดับ'}
};
const TRAINING={
  dojo:{name:'นักดาบ',rice:55,water:20,seconds:10,ranged:false,role:'sword'},
  archery:{name:'พลธนู',rice:65,water:30,seconds:12,ranged:true,role:'archer'},
  shrine:{name:'ผู้ฝึกวิญญาณ',rice:70,water:40,seconds:12,ranged:true,role:'adept'},
  warhall:{name:'จอมทัพ',rice:150,water:100,seconds:24,ranged:false,tier:4}
};
const ADVANCED_TRAINING={name:'พลธนูเกราะ',rice:85,water:45,seconds:14,ranged:true,tier:2};
const COMBINATIONS={
 'archery,dojo':{name:'พลธนูเกราะ',role:'armored',ranged:true,max:200,damage:28,range:190},
 'dojo,shrine':{name:'องครักษ์วิญญาณ',role:'guardian',ranged:false,max:270,damage:35,range:36},
 'archery,shrine':{name:'นักธนูมนตรา',role:'mystic',ranged:true,max:175,damage:34,range:230}
};
const ASCENSIONS=[
 {form:'tiger',name:'พยัคฆ์ศึก',hero:'ราชันพยัคฆ์',speed:76,passive:'เกราะพยัคฆ์ · ลดดาเมจตรง 15% (ไม่ลดพิษ)',ability:'คำราม 90 รอบตัว + กำแพงโล่ให้ตัวเอง 6 วิ'},
 {form:'naga',name:'นักรบนาค',hero:'จ้าวนาคราช',speed:89,passive:'กระสุนพิษ · 3 HP/วิ นาน 3 วิ · ไม่ทบซ้อน',ability:'หมอกพิษวงใหญ่ 10 วิ + กระสุนพิษแรงขึ้นเป็น 6 HP/วิ นาน 10 วิ'},
 {form:'crane',name:'ผู้พิทักษ์กระเรียน',hero:'เซียนกระเรียน',speed:80,passive:'ปีกพิสุทธิ์ · ต้านทานพิษ · เคลื่อนที่ตามพื้น',ability:'รักษากลุ่ม 100 HP + ล้างพิษและกันพิษ 6 วิ'},
 {form:'wolf',name:'มนุษย์หมาป่า',hero:'จ่าฝูงหมาป่า',speed:104,passive:'ก้าวนักล่า · ความเร็ว 104 · ต่อสู้ด้วยกรงเล็บ',ability:'พุ่งโจมตี 140 + คลั่ง 8 วิ: เดินเร็วขึ้น 30% / ดาเมจเพิ่ม 25%'}
];
const ELITES=ASCENSIONS.map(f=>f.name);
const HERO_SKILLS=['พยัคฆ์คำราม','มหาหมอกพิษ','พรแห่งกระเรียน','คลั่งจ่าฝูง'];
const TOWER_LEVELS={1:{range:300,damage:27,interval:1.2},2:{range:350,damage:38,interval:.95,rice:130,water:70,seconds:16},3:{range:400,damage:52,interval:.8,rice:200,water:100,seconds:22}};
const RICE_PATCHES=48;
function ricePatchPoint(r,index){const row=Math.floor(index/8),col=index%8;return{x:r.x+(col-3.5)*16+(row-2.5)*15,y:r.y+(col-3.5)*7-(row-2.5)*9};}
function unitTitle(u){return u.worker?'ชาวบ้าน':u.className||TRAINING[u.ranged?'archery':'dojo'].name;}
const RICE_CYCLE={fallow:8,growing:22};
// Shared, deterministic neutral food sites: one expansion and one contested site per quadrant.
const RICE_SITES=[
 {x:900,y:650,name:'อู่ข้าวตะวันตกเฉียงเหนือ',max:720},{x:2300,y:650,name:'อู่ข้าวตะวันออกเฉียงเหนือ',max:720},
 {x:2300,y:1750,name:'อู่ข้าวตะวันออกเฉียงใต้',max:720},{x:900,y:1750,name:'อู่ข้าวตะวันตกเฉียงใต้',max:720},
 {x:1300,y:750,name:'อู่ข้าวกลางเหนือฝั่งตะวันตก',max:960},{x:1900,y:750,name:'อู่ข้าวกลางเหนือฝั่งตะวันออก',max:960},
 {x:1900,y:1650,name:'อู่ข้าวกลางใต้ฝั่งตะวันออก',max:960},{x:1300,y:1650,name:'อู่ข้าวกลางใต้ฝั่งตะวันตก',max:960}
];
const ECON_RESOURCES=STARTS.flatMap((b,team)=>{const s=b.x<W/2?1:-1;return[{id:'rice-'+team,type:'rice',x:b.x+s*180,y:b.y+(b.y<H/2?220:-200),amount:480,max:480,stage:'ripe',cycle:0,team},{id:'water-'+team,type:'water',x:b.x-s*125,y:b.y-70,visualX:b.x-s*190,visualY:b.y-70,amount:Infinity,team}];});
class VillageBattle extends Battle {
  constructor(player=0,world=new World()) {
    super(player,world);
    this.stock=CLANS.map(()=>({rice:360,water:180}));
    this.resources=ECON_RESOURCES.map(r=>({...r,...(r.type==='rice'?{patches:Array(RICE_PATCHES).fill(r.max/RICE_PATCHES)}:{})}));
    this.structures=this.bases;
    this.structures=this.bases.map((b,i)=>Object.assign(b,{id:'hq-'+i,kind:'hq',complete:true,w:110,h:80,queue:[],progress:1}));
    this.terrainBlocked=world.blocked.slice();
    for(const r of this.resources.filter(r=>r.type==='water'))for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++){const dx=(x*CELL+20-r.visualX)/48,dy=(y*CELL+20-r.visualY)/30;if(dx*dx+dy*dy<1)this.terrainBlocked[y*COLS+x]=1;}
    this.nextStructure=0;this.nextUnit=this.units.length;this.events=[];this.eventSerial=0;
    this.war=false;this.wave=0;this.economyStats={rice:0,water:0,built:0,trained:0,born:0};
    for(const u of this.units){const b=STARTS[u.team],s=b.x<W/2?1:-1,i=u.id%10;Object.assign(u,world.free({x:b.x+s*(140+i%3*36),y:b.y+Math.floor(i/3)*40}));u.order='hold';u.dest=null;u.raid=false;u.path=[];if(i<6)this.makeWorker(u);else this.makeSoldier(u,i>=8);}
    for(let team=0;team<4;team++){const b=STARTS[team],s=b.x<W/2?1:-1;this.addStructure('hut',{x:b.x-s*155,y:b.y+(b.y<H/2?150:-150)},team,true);}
    this.rebuildObstacles();this.addNeutralRice();this.updateVision();
  }
  addNeutralRice(){
    for(const [i,original] of RICE_SITES.entries()){
      const site={...original,x:original.x*W/3200,y:original.y*H/2400};
      const candidates=[];
      for(let y=site.y-280;y<=site.y+280;y+=20)for(let x=site.x-280;x<=site.x+280;x+=20)candidates.push({x,y});
      candidates.sort((a,b)=>dist(a,site)-dist(b,site));
      const p=candidates.find(p=>this.resources.every(r=>dist(r,p)>250)&&this.structures.every(b=>dist(b,p)>200)&&Array.from({length:RICE_PATCHES},(_,n)=>ricePatchPoint(p,n)).every(q=>this.world.walkable(q))&&[[-115,-75],[115,-75],[-115,75],[115,75]].every(([dx,dy])=>this.world.walkable({x:p.x+dx,y:p.y+dy}))&&this.world.path(STARTS[i%4],p).length);
      if(!p)throw new Error('No reachable neutral rice site: '+i);
      this.resources.push({id:'rice-neutral-'+i,type:'rice',...p,name:site.name,team:null,neutral:true,amount:site.max,max:site.max,patches:Array(RICE_PATCHES).fill(site.max/RICE_PATCHES),stage:'ripe',cycle:0});
    }
  }
  alive(team){return this.units.filter(u=>u.hp>0&&!u.inTraining&&(team===undefined||u.team===team));}
  population(team=this.player){return this.units.filter(u=>u.hp>0&&u.team===team).length;}
  capacity(team=this.player){return Math.min(60,20+this.structures.filter(b=>b.team===team&&b.kind==='hut'&&b.complete&&b.hp>0).length*6);}
  storage(team=this.player){const n=this.structures.filter(b=>b.team===team&&b.kind==='store'&&b.complete&&b.hp>0).length;return{rice:600+n*300,water:400+n*200};}
  workers(team=this.player){return this.alive(team).filter(u=>u.worker);}
  warriors(team=this.player){return this.alive(team).filter(u=>!u.worker);}
  targets(team){return [...this.alive().filter(u=>u.team!==team),...this.structures.filter(b=>b.team!==team&&b.hp>0)];}
  updateVision(){super.updateVision();for(const b of this.structures||[]){if(b.team!==this.player||b.hp<=0||!b.complete)continue;const radius=b.kind==='tower'?(TOWER_LEVELS[b.level||1].range+70):280;for(let y=Math.max(0,Math.floor((b.y-radius)/CELL));y<=Math.min(ROWS-1,Math.ceil((b.y+radius)/CELL));y++)for(let x=Math.max(0,Math.floor((b.x-radius)/CELL));x<=Math.min(COLS-1,Math.ceil((b.x+radius)/CELL));x++){const i=y*COLS+x;if(dist(b,this.world.center(i))<=radius)this.visible[i]=this.seen[i]=1;}}}
  acceptsTarget(u,v){return u.targetPriority==='units'?!v.building:u.targetPriority==='buildings'?!!v.building:true;}
  targetDistance(u,v){return v.building?Math.hypot(Math.max(0,Math.abs(u.x-v.x)-(v.w||70)/2),Math.max(0,Math.abs(u.y-v.y)-(v.h||70)/2)):dist(u,v);}
  attackPoint(u,v){
    if(!v.building)return v;
    // Approach a reachable edge, not the blocked center of a large building.
    const points=[],radius=Math.max(v.w||70,v.h||70)/2+u.range+CELL;
    for(let y=Math.max(0,Math.floor((v.y-radius)/CELL));y<=Math.min(ROWS-1,Math.ceil((v.y+radius)/CELL));y++)for(let x=Math.max(0,Math.floor((v.x-radius)/CELL));x<=Math.min(COLS-1,Math.ceil((v.x+radius)/CELL));x++){
      const p=this.world.center(y*COLS+x);if(this.world.walkable(p)&&this.targetDistance(p,v)<=u.range)points.push(p);
    }
    points.sort((a,b)=>dist(a,u)-dist(b,u));
    return points[0]||v;
  }
  nearest(u,r=260){
    if(u.worker&&u.job||u.job?.type==='train')return null;
    let best=null;for(const v of this.targets(u.team)){
      if(!this.acceptsTarget(u,v)||(this.multiplayer?!this.canSee(u.team,v):u.team===this.player&&!this.visibleAt(v)))continue;
      const d=this.targetDistance(u,v);if(d<r){r=d;best=v;}
    }return best;
  }
  setTargetPriority(ids,priority){
    if(!['auto','units','buildings'].includes(priority))return false;
    let count=0;for(const u of this.warriors().filter(u=>ids.includes(u.id))){
      u.targetPriority=priority;count++;
      if(u.order==='target'){u.order='advance';u.dest=u.target?this.world.free(u.target):u.dest;u.target=null;u.path=[];u.repath=0;}
    }return count>0;
  }
  trainingOptions(ids){
    const units=this.warriors().filter(u=>ids.includes(u.id)),items=[];
    for(const kind of Object.keys(TRAINING)){
      const candidates=units.map(u=>({u,d:this.trainingRecipe(u,kind)})).filter(v=>v.d?.tier>1).sort((a,b)=>b.d.tier-a.d.tier||a.u.id-b.u.id);
      if(!candidates.length)continue;const {u,d}=candidates[0];
      const schools=this.structures.filter(b=>b.kind===kind&&b.team===this.player&&b.hp>0);
      const b=schools.filter(b=>b.complete&&b.queue.length<3).sort((a,b)=>dist(a,u)-dist(b,u))[0];
      const missing=!schools.length;
      const reason=!b?(missing?'ต้องสร้าง '+BUILDINGS[kind].name:schools.some(b=>b.complete)?'คิวเต็ม · รอช่องว่าง':'อาคารกำลังก่อสร้าง'):!this.running?'เริ่มหรือเล่นเกมต่อก่อน':this.over?'การรบจบแล้ว':!this.affordable(d)?'ขาด '+Math.max(0,Math.ceil(d.rice-this.stock[this.player].rice))+' ข้าว / '+Math.max(0,Math.ceil(d.water-this.stock[this.player].water))+' น้ำ':'';
      items.push({kind,d,b,u,missing,reason,enabled:!reason});
    }return items;
  }
  move(u,p,dt,tolerance=8){const oldX=u.x,oldY=u.y;const waypoint=u.path?.[0];if(waypoint){const dx=waypoint.x-u.x,dy=waypoint.y-u.y,d=Math.hypot(dx,dy);if(d>8){const vx=dx/d,vy=dy/d;const blocked=this.alive().some(v=>v.id!==u.id&&dist(u,v)<32&&(v.x-u.x)*vx+(v.y-u.y)*vy>0);if(blocked){const step=u.speed*dt*.95;let next={x:u.x-vy*step,y:u.y+vx*step};if(!this.world.walkable(next))next={x:u.x+vy*step,y:u.y-vx*step};if(this.world.walkable(next)){u.x=next.x;u.y=next.y;}}}}const done=super.move(u,p,dt,tolerance);if(Math.hypot(u.x-oldX,u.y-oldY)>.01){u.movingUntil=this.t+.12;u.stride=(u.stride||0)+Math.hypot(u.x-oldX,u.y-oldY)*.22;}return done;}
  makeWorker(u){Object.assign(u,{worker:true,ranged:false,hp:110,max:110,damage:4,range:25,speed:94,cargo:0,cargoType:null,job:null,work:0,inTraining:false});}
  makeSoldier(u,ranged){const c=CLANS[u.team];Object.assign(u,{worker:false,ranged,className:ranged?'พลธนู':'นักดาบ',role:ranged?'archer':'sword',heroCooldown:0,form:null,awakened:0,venom:0,venomDps:0,tier:1,schools:[ranged?'archery':'dojo'],hp:ranged?130:c.hp,max:ranged?130:c.hp,damage:ranged?18:c.damage,range:ranged?180:31,speed:c.speed,job:null,inTraining:false,order:'hold',path:[],repath:0});}
  notify(text){this.events.push({id:++this.eventSerial,text,t:this.t});this.events=this.events.slice(-10);}
  addStructure(kind,p,team,complete=false){const d=BUILDINGS[kind],b={...p,id:'building-'+this.nextStructure++,kind,team,building:true,hp:complete?d.hp:80,max:d.hp,w:d.w,h:d.h,complete,progress:complete?1:0,queue:[],level:1,range:kind==='tower'?300:0,damage:kind==='tower'?27:0,spawn:0,attack:0,flash:0,cost:{rice:d.rice,water:d.water}};this.structures.push(b);return b;}
  affordable(cost,team=this.player){const r=this.stock[team];return r.rice>=cost.rice&&r.water>=cost.water;}
  spend(cost,team=this.player){if(!this.affordable(cost,team))return false;this.stock[team].rice-=cost.rice;this.stock[team].water-=cost.water;return true;}
  rebuildObstacles(){this.world.blocked.set(this.terrainBlocked);for(const b of this.structures.filter(b=>b.hp>0)){for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++){const p={x:x*CELL+20,y:y*CELL+20};if(Math.abs(p.x-b.x)<b.w/2&&Math.abs(p.y-b.y)<b.h/2)this.world.blocked[y*COLS+x]=1;}}for(const u of this.alive()){if(!this.world.walkable(u)){const p=this.world.free(u);if(p)Object.assign(u,p);}u.path=[];u.repath=0;}}
  door(b){return this.world.free({x:b.x,y:b.y+b.h/2+45});}
  buildRequirement(kind){return kind==='warhall'&&!['dojo','archery','shrine'].every(k=>this.structures.some(b=>b.team===this.player&&b.hp>0&&b.complete&&b.kind===k))?'ต้องสร้างโรงดาบ โรงธนู และสำนักวิญญาณให้เสร็จก่อน':null;}
  placement(kind,p){const required=this.buildRequirement(kind);if(required)return{ok:false,reason:required};const d=BUILDINGS[kind];if(!d)return{ok:false,reason:'ไม่พบอาคาร'};const point={x:Math.round(p.x/20)*20,y:Math.round(p.y/20)*20};if(!this.visibleAt(point))return{ok:false,point,reason:'ต้องสำรวจพื้นที่ก่อน'};if(!['camp','store'].includes(kind)&&!this.structures.some(b=>b.team===this.player&&b.complete&&b.hp>0&&dist(b,point)<650))return{ok:false,point,reason:'สร้างห่างจากอาคารของเราได้ไม่เกิน 650'};for(const dx of [-d.w/2-15,0,d.w/2+15])for(const dy of [-d.h/2-15,0,d.h/2+15])if(!this.world.walkable({x:point.x+dx,y:point.y+dy}))return{ok:false,point,reason:'พื้นที่ติดป่า แม่น้ำ หรือสิ่งก่อสร้าง'};if(this.structures.some(b=>b.hp>0&&Math.abs(b.x-point.x)<(b.w+d.w)/2+30&&Math.abs(b.y-point.y)<(b.h+d.h)/2+30))return{ok:false,point,reason:'เว้นระยะจากอาคารข้างเคียง'};if(this.resources.some(r=>r.type==='rice'?Math.abs(point.x-r.x)<115+d.w/2+15&&Math.abs(point.y-r.y)<75+d.h/2+15:dist(point,r)<85))return{ok:false,point,reason:'ต้องเว้นพื้นที่นาและจุดตักน้ำ'};return{ok:true,point};}
  build(kind,p,ids){if(!this.running||this.over)return{ok:false,reason:'กดเริ่มหมู่บ้านก่อน'};const workers=this.workers().filter(u=>ids.includes(u.id)&&u.job?.type!=='train');if(!workers.length)return{ok:false,reason:'เลือกชาวบ้านอย่างน้อย 1 คน'};const result=this.placement(kind,p);if(!result.ok)return result;const d=BUILDINGS[kind];if(!this.affordable(d))return{ok:false,reason:'ข้าวหรือน้ำไม่เพียงพอ'};if(!this.world.path(workers[0],{x:result.point.x,y:result.point.y+d.h/2+45}).length)return{ok:false,reason:'ชาวบ้านไปไม่ถึงจุดก่อสร้าง'};this.spend(d);const b=this.addStructure(kind,result.point,this.player);this.rebuildObstacles();for(const u of workers)this.setJob(u,{type:'build',buildingId:b.id});this.notify('เริ่มสร้าง'+d.name+' · หัก '+d.rice+' ข้าว / '+d.water+' น้ำ');return{ok:true,building:b};}
  cancelBuilding(b){if(!b||b.team!==this.player||b.complete||b.hp<=0)return false;this.stock[this.player].rice+=Math.floor(b.cost.rice*.8);this.stock[this.player].water+=Math.floor(b.cost.water*.8);b.hp=0;for(const u of this.workers())if(u.job?.buildingId===b.id)this.setJob(u,null);this.rebuildObstacles();this.notify('ยกเลิกก่อสร้าง · คืนทรัพยากร 80%');return true;}
  setJob(u,job){if(u.job?.type==='train')return false;u.harvesting=false;u.job=job;u.order=job?'work':'hold';u.dest=null;u.path=[];u.repath=0;u.work=0;return true;}
  assignGather(ids,resource){if(!resource)return 0;let n=0;for(const u of this.workers().filter(u=>ids.includes(u.id)))if(this.setJob(u,{type:'gather',resourceId:resource.id,phase:u.cargo?'return':'harvest'}))n++;return n;}
  assignBuild(ids,b){let n=0;for(const u of this.workers().filter(u=>ids.includes(u.id)))if(this.setJob(u,{type:'build',buildingId:b.id}))n++;return n;}
  issue(ids,mode,p){const available=ids.filter(id=>{const u=this.units.find(u=>u.id===id);return u&&u.hp>0&&u.team===this.player&&!u.inTraining&&u.job?.type!=='train';});for(const u of this.units.filter(u=>available.includes(u.id))){u.job=null;u.harvesting=false;}super.issue(available,mode,p);}
  nearestStore(u){return this.structures.filter(b=>b.hp>0&&b.complete&&b.team===u.team&&['hq','hut','store'].includes(b.kind)).sort((a,b)=>dist(a,u)-dist(b,u))[0];}
  deposit(u,dt){const b=this.nearestStore(u);if(!b)return false;const p=this.door(b);if(!p)return false;if(dist(u,p)>22){this.move(u,p,dt);return false;}const cap=this.storage(u.team)[u.cargoType],r=this.stock[u.team],amount=Math.min(u.cargo,Math.max(0,cap-r[u.cargoType]));r[u.cargoType]+=amount;u.cargo-=amount;if(u.team===this.player)this.economyStats[u.cargoType]+=amount;if(amount)this.effect('text',u.x,u.y-35,u.cargoType==='rice'?'#f1d47f':'#95d9ec',1,'+'+Math.round(amount));if(u.cargo<.001){u.cargo=0;u.cargoType=null;return true;}return false;}
  trainingRecipe(u,kind){
    if(!TRAINING[kind]||u.hp<=0||u.inTraining||u.job?.type==='train'||u.job?.type==='build')return null;
    if(kind==='warhall')return u.tier===3?{...TRAINING.warhall,name:ASCENSIONS[u.team].hero,role:'hero',schools:[...u.schools],max:420,damage:55,range:[40,250,240,38][u.team],ranged:u.team===1||u.team===2}:null;
    if(u.worker)return {...TRAINING[kind],tier:1,schools:[kind]};
    if(u.tier>=3||u.schools.includes(kind))return null;
    const schools=[...u.schools,kind].sort();
    if(schools.length===2)return {...ADVANCED_TRAINING,...COMBINATIONS[schools.join(',')],schools};
    return {name:ELITES[u.team],role:'elite',tier:3,schools,rice:110,water:70,seconds:18,max:[330,245,260,300][u.team],damage:[43,37,39,48][u.team],range:[38,225,215,35][u.team],ranged:u.team===1||u.team===2};
  }
  upgradeTarget(u){return this.structures.filter(b=>b.team===this.player&&b.hp>0&&b.complete&&b.queue.length<3&&this.trainingRecipe(u,b.kind)?.tier>1).sort((a,b)=>dist(a,u)-dist(b,u))[0];}
  train(b,chosenIds=[]){
    if(!this.running||this.over)return{ok:false,reason:'กดเริ่มหมู่บ้านก่อน'};
    if(!TRAINING[b?.kind]||!b.complete||b.hp<=0||b.team!==this.player)return{ok:false,reason:'ต้องเลือกโรงฝึกที่สร้างเสร็จแล้ว'};
    if(b.queue.length>=3)return{ok:false,reason:'คิวเต็ม 3 คนแล้ว'};
    const candidates=this.alive(this.player).filter(u=>(chosenIds.length?chosenIds.includes(u.id):u.worker)&&this.trainingRecipe(u,b.kind)).sort((a,c)=>dist(a,b)-dist(c,b));
    const u=candidates[0];if(!u)return{ok:false,reason:chosenIds.length?'ฝึกวิชานี้แล้วหรือยังไม่ถึงขั้นที่กำหนด · เปิดสายพัฒนาเพื่อดูเส้นทาง':'ไม่มีชาวบ้านว่างสำหรับฝึก'};
    const d=this.trainingRecipe(u,b.kind);
    if(!this.world.path(u,this.door(b)).length&&dist(u,this.door(b))>28)return{ok:false,reason:'ยูนิตเดินไปไม่ถึงโรงฝึก'};
    if(!this.spend(d))return{ok:false,reason:'ข้าวหรือน้ำไม่พอสำหรับฝึก'};
    this.setJob(u,{type:'train',buildingId:b.id});
    b.queue.push({unitId:u.id,remaining:d.seconds,total:d.seconds,cost:{rice:d.rice,water:d.water},recipe:d});
    this.notify('ส่งเข้า'+BUILDINGS[b.kind].name+' → '+d.name+' · '+d.seconds+' วิ');return{ok:true,unit:u};
  }
  finishTraining(u,recipe){
    const health=u.hp/u.max;this.makeSoldier(u,recipe.ranged);
    Object.assign(u,{tier:recipe.tier,schools:[...recipe.schools],className:recipe.name,role:recipe.role});
    if(recipe.max)Object.assign(u,{max:recipe.max,damage:recipe.damage,range:recipe.range});
    if(recipe.role==='adept')Object.assign(u,{max:125,damage:21,range:155});
    u.hp=Math.max(1,u.max*health);u.heroCooldown=0;
    if(u.tier>=3){const f=ASCENSIONS[u.team];u.form=f.form;u.speed=f.speed;u.transformedAt=this.t;this.effect('ascend',u.x,u.y,f.form==='crane'?'#c9f0ff':CLANS[u.team].color,1.5,f.name);}

  }
  upgradeTower(b){
    const d=TOWER_LEVELS[(b?.level||1)+1];
    if(!this.running||this.over||!b||b.kind!=='tower'||b.team!==this.player||b.hp<=0||!b.complete||b.upgrading||!d)return{ok:false,reason:'เลือกป้อมที่สร้างเสร็จ · สูงสุดระดับ 3'};
    if(!this.spend(d))return{ok:false,reason:'ข้าวหรือน้ำไม่พอ'};
    b.upgrading={remaining:d.seconds,total:d.seconds};this.notify('เริ่มอัปเกรดป้อมธนู → ระดับ '+(b.level+1));return{ok:true};
  }
  repair(b,ids){
    if(!this.running||this.over||!b||b.team!==this.player||b.hp<=0||!b.complete||b.hp>=b.max)return false;
    let n=0;for(const u of this.workers().filter(u=>ids.includes(u.id)))if(this.setJob(u,{type:'repair',buildingId:b.id}))n++;return n>0;
  }
  heroSkill(ids){
    if(!this.running||this.over)return false;
    const u=this.warriors().find(u=>ids.includes(u.id)&&u.tier===4&&u.heroCooldown<=0&&u.job?.type!=='train');if(!u)return false;
    const enemies=this.targets(u.team).filter(v=>this.visibleAt(v)&&dist(u,v)<(u.team===3?300:160));
    if((u.team===0||u.team===1)&&!enemies.length)return false;
    if(u.team===0){for(const v of enemies)this.hit(v,90,u);u.shield=Math.max(u.shield,6);}
    if(u.team===1){const v=enemies[0];this.zones.push({x:v.x,y:v.y,r:125,team:u.team,life:10});}
    if(u.team===2)for(const v of this.alive(u.team).filter(v=>dist(u,v)<240)){v.hp=Math.min(v.max,v.hp+100);v.venom=0;v.poison=0;v.immune=Math.max(v.immune,6);}
    if(u.team===3&&enemies.length){const v=enemies[0],p=this.world.free({x:v.x-25,y:v.y});if(p){const path=this.world.path(u,p);if(path.length&&path.length*CELL<=dist(u,p)*1.8+CELL){Object.assign(u,p);u.path=[];this.hit(v,140,u);}}}
    u.awakened=[6,10,6,8][u.team];u.heroCooldown=30;u.anim=.3;
    this.effect('ascend',u.x,u.y,CLANS[u.team].color,1.1,HERO_SKILLS[u.team]);this.notify(HERO_SKILLS[u.team]+'!');return true;
  }
  shoot(u,target,damage=u.damage){
    super.shoot(u,target,damage);const p=this.projectiles.at(-1);
    if(p&&u.form){p.form=u.form;p.awakened=u.awakened||0;}
  }
  formStep(dt){
    for(const u of this.alive()){
      if(u.form){u.awakened=Math.max(0,(u.awakened||0)-dt);u.speed=ASCENSIONS[u.team].speed*(u.form==='wolf'&&u.awakened>0?1.3:1);}
      if(u.form==='crane'){u.immune=Math.max(u.immune,.2);u.venom=0;u.poison=0;}
      if(u.venom>0){if(u.immune>0){u.venom=0;u.poison=0;}else{const elapsed=Math.min(dt,u.venom);u.venom=Math.max(0,u.venom-dt);u.poison=Math.max(u.poison,.15);this.hit(u,u.venomDps*elapsed,null,true);}}
    }
  }
  riceStep(r,dt){
    if(r.stage==='ripe'){if(r.amount>0)return;r.amount=0;r.stage='fallow';r.cycle=RICE_CYCLE.fallow;}
    r.cycle=Math.max(0,r.cycle-dt);
    if(r.cycle>0)return;
    if(r.stage==='fallow'){r.stage='growing';r.cycle=RICE_CYCLE.growing;}
    else{r.stage='ripe';r.amount=r.max;r.patches.fill(r.max/RICE_PATCHES);r.cycle=0;}
  }
  cancelTraining(b){if(!b?.queue?.length)return false;const item=b.queue.pop(),u=this.units.find(u=>u.id===item.unitId);this.stock[b.team].rice+=item.cost.rice;this.stock[b.team].water+=item.cost.water;if(u&&u.hp>0){u.job=null;u.inTraining=false;u.order='hold';Object.assign(u,this.door(b));}this.notify('ยกเลิกคิวล่าสุด · คืนข้าวและน้ำเต็มจำนวน');return true;}
  spawnWorker(b){const p=this.door(b);if(!p)return;const u={id:this.nextUnit++,team:b.team,...p,attack:0,shield:0,poison:0,immune:0,flash:0,anim:0,walk:0,angle:0,order:'hold',dest:null,path:[],repath:0,target:null};this.makeWorker(u);this.units.push(u);this.economyStats.born++;if(b.team===this.player)this.notify('ชาวบ้านใหม่พร้อมทำงาน · เลือกชาวบ้านว่าง [I]');}
  workerStep(u,dt){u.harvesting=false;const job=u.job;if(!job)return;u.order='work';const b=job.buildingId?this.structures.find(b=>b.id===job.buildingId&&b.hp>0):null;if(job.type!=='gather'&&u.cargo>0){this.deposit(u,dt);return;}if(job.type==='gather'){const r=this.resources.find(r=>r.id===job.resourceId);if(!r||r.buildingId&&!this.structures.some(b=>b.id===r.buildingId&&b.hp>0)){u.job=null;u.order='hold';return;}if(job.phase==='return'||u.cargo>=12){job.phase='return';if(this.deposit(u,dt))job.phase='harvest';return;}if(r.type==='rice'&&r.amount>0){if(job.patch===undefined||r.patches[job.patch]<=.001){job.patch=r.patches.map((n,i)=>({n,i,p:ricePatchPoint(r,i)})).filter(v=>v.n>.001&&this.world.walkable(v.p)).sort((a,b)=>dist(u,a.p)-dist(u,b.p))[0]?.i;}const target=this.world.free(job.patch===undefined?r:ricePatchPoint(r,job.patch));if(target&&dist(u,target)>18){this.move(u,target,dt);return;}}else if(dist(u,r)>35){this.move(u,r,dt);return;}if(r.amount<=0)return;u.harvesting=r.type==='rice';u.walk+=dt*4;const amount=Math.min(12-u.cargo,r.amount,r.type==='rice'?(r.patches[job.patch]||0):Infinity,(r.type==='rice'?3:4)*dt);if(amount>0){u.cargoType=r.type;u.cargo+=amount;r.amount=Math.max(0,r.amount-amount);if(r.type==='rice'){r.patches[job.patch]=Math.max(0,r.patches[job.patch]-amount);r.lastHarvest={patch:job.patch,t:this.t};if(r.amount<.001)r.amount=0;}}if(u.cargo>=11.999||r.amount<=0&&u.cargo>0)job.phase='return';return;}if(!b){u.job=null;u.inTraining=false;u.order='hold';return;}const p=this.door(b);if(!p)return;if(dist(u,p)>28){this.move(u,p,dt);return;}if(job.type==='repair'){if(b.hp>=b.max){this.setJob(u,null);return;}const gain=Math.min(35*dt,b.max-b.hp),cost={rice:gain*.08,water:gain*.03};if(this.spend(cost,u.team)){b.hp+=gain;u.walk+=dt*7;}return;}if(job.type==='build'){if(b.complete){u.job=null;u.order='hold';return;}const d=BUILDINGS[b.kind],gain=dt/d.seconds;b.progress=Math.min(1,b.progress+gain);b.hp=Math.min(b.max,b.hp+(b.max-80)*gain);u.walk+=dt*7;if(b.progress>=1){b.complete=true;this.economyStats.built++;if(b.kind==='well')this.resources.push({id:'well-'+b.id,type:'water',buildingId:b.id,x:p.x,y:p.y,amount:Infinity,team:b.team});this.notify(BUILDINGS[b.kind].name+' สร้างเสร็จแล้ว');this.setJob(u,null);}return;}if(job.type==='train'){u.inTraining=true;u.path=[];}}
  hit(u,amount,source,pierce=false){if(u.hp<=0)return 0;
    if(!pierce&&source?.team!==u.team&&source?.form==='wolf'&&source.awakened>0)amount*=1.25;
    if(!pierce&&u.form==='tiger')amount*=.85;
    if(!pierce&&!u.building&&u.form!=='crane'&&u.immune<=0&&source?.form==='naga'&&source.team!==u.team&&amount>0){u.venom=3;u.venomDps=source.awakened>0?6:3;u.poison=Math.max(u.poison,3);}
    const isBuilding=u.building,isHQ=u.kind==='hq';if(isBuilding&&!isHQ)u.building=false;const value=super.hit(u,amount,source,pierce);u.building=isBuilding;if(u.hp===0){if(isBuilding){while(u.queue?.length)this.cancelTraining(u);if(isHQ)for(const b of this.structures.filter(b=>b.team===u.team))b.hp=0;this.rebuildObstacles();}else if(u.job?.type==='train'){const b=this.structures.find(b=>b.id===u.job.buildingId);if(b)b.queue=b.queue.filter(q=>q.unitId!==u.id);}}return value;}
  cast(team,ids=null,point=null){return super.cast(team,(ids||this.warriors(team).map(u=>u.id)).filter(id=>this.units.some(u=>u.id===id&&!u.worker)),point);}
  callRaid(){if(!this.running||this.over)return false;if(this.war&&this.alive().some(u=>u.raid&&u.team!==this.player))return false;this.war=true;this.wave++;const team=(this.player+1)%4,b=STARTS[this.player],s=b.x<W/2?1:-1;for(let i=0;i<4;i++){const p=this.world.free({x:b.x+s*(690+i%2*45),y:b.y+(Math.floor(i/2)-.5)*50}),u={id:this.nextUnit++,team,...p,attack:0,shield:0,poison:0,immune:0,flash:0,anim:0,walk:0,angle:0,dest:{x:b.x,y:b.y},path:[],repath:0,target:null,raid:true};this.makeSoldier(u,i>=3);u.order='advance';this.units.push(u);}this.notify('หน่วยศัตรูกำลังบุกฐาน · เตรียมทหารและหอคอย');return true;}
  setupShowcase(){
    const home=STARTS[this.player],sx=home.x<W/2?1:-1,sy=home.y<H/2?1:-1;
    const plans=[['dojo',230,-160],['archery',420,0],['shrine',360,340],['tower',410,190],['store',-10,380],['well',-150,280],['warhall',-50,-200]];
    for(const [kind,dx,dy]of plans){const desired={x:home.x+sx*dx,y:home.y+sy*dy},candidates=[];for(let y=home.y-400;y<=home.y+400;y+=40)for(let x=home.x-480;x<=home.x+480;x+=40)candidates.push({x,y});candidates.sort((a,b)=>dist(a,desired)-dist(b,desired));const point=candidates.map(p=>this.placement(kind,p)).find(r=>r.ok)?.point;if(point){this.addStructure(kind,point,this.player,true);this.rebuildObstacles();this.updateVision();}}
    const soldiers=this.warriors(),advance=(u,k)=>{const d=this.trainingRecipe(u,k);if(d)this.finishTraining(u,d);};
    advance(soldiers[1],'shrine');advance(soldiers[2],'dojo');advance(soldiers[2],'shrine');advance(soldiers[3],'dojo');advance(soldiers[3],'shrine');advance(soldiers[3],'warhall');
    const workers=this.workers(),rice=this.resources.find(r=>r.id==='rice-'+this.player),water=this.resources.find(r=>r.id==='water-'+this.player);this.assignGather(workers.slice(0,4).map(u=>u.id),rice);this.assignGather(workers.slice(4).map(u=>u.id),water);this.stock[this.player]={rice:300,water:180};this.economyStats.built=plans.length;this.updateVision();
  }
  step(dt){if(!this.running||this.over)return;dt=Math.min(dt,.05);this.formStep(dt);for(const u of this.alive())u.heroCooldown=Math.max(0,(u.heroCooldown||0)-dt);for(const r of this.resources)if(r.type==='rice')this.riceStep(r,dt);for(const u of this.alive().filter(u=>(this.activeTeams||[this.player]).includes(u.team)&&(u.worker||u.job?.type==='train')))this.workerStep(u,dt);for(const b of this.structures.filter(b=>b.hp>0&&b.complete)){if(b.kind==='hut'&&(this.activeTeams||[this.player]).includes(b.team)&&this.population(b.team)<this.capacity(b.team)){b.spawn+=dt;if(b.spawn>=30){b.spawn-=30;this.spawnWorker(b);}}if(b.queue?.length){const q=b.queue[0],u=this.units.find(u=>u.id===q.unitId);if(!u||u.hp<=0){b.queue.shift();continue;}if(u.inTraining){q.remaining-=dt;if(q.remaining<=0){this.finishTraining(u,q.recipe);Object.assign(u,this.door(b));b.queue.shift();this.economyStats.trained++;this.notify(q.recipe.name+'ฝึกเสร็จ · กำลังคนเท่าเดิม');}}}if(b.kind==='tower'){if(b.upgrading){b.upgrading.remaining-=dt;if(b.upgrading.remaining<=0){const health=b.hp/b.max;b.level++;b.max+=350;b.hp=b.max*health;Object.assign(b,{range:TOWER_LEVELS[b.level].range,damage:TOWER_LEVELS[b.level].damage});b.upgrading=null;this.notify('ป้อมธนูระดับ '+b.level+' พร้อมยิง');}}const d=TOWER_LEVELS[b.level];b.attack-=dt;b.anim=Math.max(0,(b.anim||0)-dt);const v=this.nearest(b,d.range);if(v&&b.attack<=0){this.shoot(b,v,d.damage);b.attack=d.interval;}}}
    // Working peasants perform only their assigned economy job; they don't auto-chase.
    super.step(dt);
    // A surviving HQ and hut can recover even if every current unit is lost.
    if(this.bases[this.player].hp>0&&this.bases.filter(b=>b.hp>0).length>1)this.over=false;
    this.stock.forEach((r,t)=>{const cap=this.storage(t);r.rice=clamp(r.rice,0,cap.rice);r.water=clamp(r.water,0,cap.water);});
  }
}
