const assert=require('node:assert/strict');
const {EconomyBattle,dist}=new Function(require('./engine-source.cjs')()+';return {EconomyBattle,dist};')();
const {MultiplayerBattle}=require('./multiplayer.cjs');
const tick=(g,s)=>{for(let i=0;i<Math.ceil(s*20);i++)g.step(.05);};
function quiet(g){g.running=true;g.aiWait.fill(Infinity);for(const b of g.structures){b.spawn=-1e6;b.attack=1e6;}return g;}
{
 const g=quiet(new EconomyBattle()),origins=g.horses.map(h=>({...h})),moved=new Set(),rested=new Set();
 for(let i=0;i<1200;i++){
  g.step(.05);
  for(const h of g.horses){
   assert(g.world.walkable(h),'horse must stay out of buildings, forest and water');
   assert(dist(h,h.roamHome)<=185,'horse stays near its herd');
   if(dist(h,origins.find(p=>p.id===h.id))>30)moved.add(h.id);
   if(moved.has(h.id)&&h.roamWait>0)rested.add(h.id);
  }
 }
 assert.equal(moved.size,12);assert.equal(rested.size,12);
 const paused=JSON.stringify(g.horses);g.running=false;tick(g,3);assert.equal(JSON.stringify(g.horses),paused);
 g.running=true;g.over=true;tick(g,3);assert.equal(JSON.stringify(g.horses),paused);
}
{
 const g=quiet(new EconomyBattle());g.setupExpedition();for(const u of g.workers())g.setJob(u,null);
 tick(g,4);const h=g.horses.find(h=>h.id==='horse-0-1'),u=g.workers()[0];assert(h.stride>0,'capture an already wandering horse');
 Object.assign(u,g.world.free({x:h.x-90,y:h.y}));g.updateVision();assert(g.captureHorse([u.id],h.id).ok);
 const caught={x:h.x,y:h.y};tick(g,.5);assert.equal(h.status,'catching');assert.equal(dist(caught,h),0,'horse stops wandering during capture');
 g.issue([u.id],'hold');assert.equal(h.status,'wild');assert.equal(dist(h,h.roamHome),0,'release starts a new local roaming area');tick(g,6);assert(dist(h,caught)>20,'cancelled capture resumes wandering');
 Object.assign(u,g.world.free(h));g.updateVision();assert(g.captureHorse([u.id],h.id).ok);tick(g,40);assert.equal(h.status,'stabled');
 const p={x:h.x,y:h.y};tick(g,8);assert.equal(dist(h,p),0,'stabled horse never wanders');
 const b=g.structures.find(b=>b.id===h.stableId);b.hp=0;g.rebuildObstacles();tick(g,6);assert.equal(h.status,'wild');assert(dist(h,p)>20,'destroyed stable releases horse to roam');
 // A newly placed building across a horse's route cannot trap it or make it clip through walls.
 const wild=g.horses.find(h=>h.status==='wild');g.addStructure('stable',{x:wild.x,y:wild.y},0,true);g.rebuildObstacles();tick(g,.05);assert(g.world.walkable(wild));
 tick(g,10);assert(g.world.walkable(wild));
}
{
 const g=quiet(new MultiplayerBattle([0,1,2,3])),h=g.horses[0],before={x:h.x,y:h.y};tick(g,4);assert(dist(h,before)>20,'server advances wild horses');
 for(const team of [0,1])Object.assign(g.warriors(team)[0],{x:h.x+40,y:h.y});g.refreshVision();
 const a=g.snapshot(0).horses.find(v=>v.id===h.id),b=g.snapshot(1).horses.find(v=>v.id===h.id);
 assert(a&&b);assert.equal(a.x,b.x);assert.equal(a.y,b.y);assert.equal(a.stride,b.stride);assert.equal(a.angle,b.angle);
 assert(!g.snapshot(2).horses.some(v=>v.id===h.id),'horse remains hidden outside sight');
}
console.log('PASS wild horses: all 12 walk/rest within herd, avoid obstacles, pause/end freeze, capture/cancel/stable/release, shared server positions and fog');
