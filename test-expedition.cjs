const assert=require('node:assert/strict');
const {EconomyBattle,SPECIALISTS,dist}=new Function(require('./engine-source.cjs')()+';return {EconomyBattle,SPECIALISTS,dist};')();
const {MultiplayerBattle}=require('./multiplayer.cjs');
const tick=(g,s)=>{for(let i=0;i<Math.ceil(s*20);i++)g.step(.05);};
function demo(team=0){const g=new EconomyBattle(team);g.setupExpedition();g.running=true;g.aiWait.fill(Infinity);for(const b of g.structures){b.spawn=-1e6;b.attack=1e6;}for(const u of g.workers())g.setJob(u,null);return g;}
function building(g,kind,team=g.player){return g.structures.find(b=>b.team===team&&b.kind===kind);}
for(let team=0;team<4;team++){
 const g=demo(team),stable=building(g,'stable'),u=g.workers()[0],h=g.horses.find(h=>h.status==='wild'&&h.id.startsWith('horse-'+team));
 assert(stable&&building(g,'camp')&&building(g,'workshop'));
 Object.assign(u,g.world.free(h));g.updateVision();assert(g.captureHorse([u.id],h.id).ok);
 assert(!g.captureHorse([g.workers()[1].id],h.id).ok,'one handler per horse');
 tick(g,2);assert.equal(h.status,'catching');const progress=h.progress;g.running=false;tick(g,2);assert.equal(h.progress,progress);g.running=true;
 tick(g,35);assert.equal(h.status,'stabled','caught horse actually walks home, clan '+team);assert.equal(u.job,null);
 const rider=g.warriors().find(u=>!u.form&&!u.special);Object.assign(rider,g.door(stable));const funds=g.stock[team].rice;
 assert(g.mount([rider.id],stable.id).ok);tick(g,.1);assert(rider.horseId);assert.equal(g.stock[team].rice,funds-25);const mount=rider.horseId;
 assert(g.sprint([rider.id]));tick(g,1);assert(rider.speed>190);assert(rider.stamina<100);assert(g.dismount([rider.id]));assert(!rider.horseId);assert.equal(g.horses.find(h=>h.id===mount).status,'wild');
 assert(!g.mount([g.warriors().find(u=>u.form).id],stable.id).ok,'evolved forms cannot mount');
 assert(!g.mount([g.warriors().find(u=>u.special==='siege').id],stable.id).ok,'ballista cannot mount');
 for(const role of Object.keys(SPECIALISTS)){
  const trainee=g.workers()[0],d=SPECIALISTS[role],b=building(g,d.building),id=trainee.id,pop=g.population();
  Object.assign(trainee,g.door(b));trainee.hp=trainee.max/2;trainee.lastCombat=Infinity;g.stock[team]={rice:500,water:400};
  assert(g.trainSpecial(b,[id],role).ok);assert.equal(g.stock[team].rice,500-d.rice);tick(g,d.seconds+1);
  assert.equal(trainee.special,role);assert.equal(trainee.id,id);assert.equal(g.population(),pop);assert.equal(trainee.hp/trainee.max,.5);assert.equal(g.trainingRecipe(trainee,'warhall'),null);
 }
}
console.log('PASS expedition: all four clans catch/lead/stable/mount/dismount, stamina, evolved restrictions, specialist training with real queues/costs and preserved health');
{
 const g=demo(),u=g.workers()[0],h=g.horses.find(h=>h.status==='wild'&&h.id==='horse-0-1');
 // A cancelled order, handler death, or destroyed stable releases reservations.
 Object.assign(u,g.world.free(h));g.updateVision();assert(g.captureHorse([u.id],h.id).ok);g.issue([u.id],'hold');assert.equal(h.status,'wild');
 assert(g.captureHorse([u.id],h.id).ok);u.hp=0;tick(g,.1);assert.equal(h.status,'wild');u.hp=110;
 assert(g.captureHorse([u.id],h.id).ok);building(g,'stable').hp=0;tick(g,.1);assert.equal(h.status,'wild');assert.equal(u.job,null);
}
{
 const g=demo(),u=g.workers()[0],b=building(g,'shrine');Object.assign(u,g.door(b));g.stock[0]={rice:500,water:300};
 assert(!g.trainSpecial(b,[u.id],'constructor').ok);assert(g.trainSpecial(b,[u.id],'scout').ok);tick(g,1);assert(g.cancelTraining(b));assert.equal(g.stock[0].rice,500);assert(u.worker&&!u.inTraining);
 g.stock[0]={rice:0,water:0};assert(!g.trainSpecial(b,[u.id],'scout').ok);
}
{
 const g=demo(),u=g.workers()[0],enemy=g.workers(1)[0];g.units=[u,enemy];Object.assign(u,{x:800,y:400});Object.assign(enemy,{x:820,y:400,attack:1e6});g.updateVision();
 const hp=enemy.hp;g.issue([u.id],'target',enemy);tick(g,2);assert(enemy.hp<hp,'villager obeys explicit attack');
 const r=g.resources.find(r=>r.team===0&&r.type==='rice');g.assignGather([u.id],r);const job={...u.job};g.hit(u,1,enemy);assert(u.defending);assert.equal(u.job,null);tick(g,1);assert(enemy.hp<hp-8,'gatherer fights back');
 Object.assign(enemy,{x:1200,y:400});tick(g,.1);assert(!u.defending);assert.equal(u.job.resourceId,job.resourceId,'returns to original gathering task');
}
{
 const g=demo(),siege=g.warriors().find(u=>u.special==='siege'),spear=g.warriors().find(u=>u.special==='spear'),enemy=g.warriors(1)[0],tower=building(g,'hq',1);
 let hp=tower.hp;g.hit(tower,10,siege);assert.equal(hp-tower.hp,60);hp=enemy.hp;g.hit(enemy,10,siege);assert.equal(hp-enemy.hp,10);
 enemy.horseId='fixture';hp=enemy.hp;g.hit(enemy,22,spear);assert.equal(hp-enemy.hp,44);assert.equal(g.volley(0,[siege.id]),false);
 const camp=building(g,'camp'),u=g.workers()[0];Object.assign(u,g.door(camp));u.hp=50;g.stock[0]={rice:100,water:100};tick(g,2);assert(Math.abs(u.hp-54)<.001);assert(Math.abs(g.stock[0].rice-99.68)<.001);
 g.stock[0]={rice:0,water:0};tick(g,1);assert(Math.abs(u.hp-54)<.001,'no free healing');
 g.stock[0]={rice:100,water:100};u.lastCombat=g.t;tick(g,2);assert(Math.abs(u.hp-54)<.001,'cannot heal during combat');
}
{
 const g=new MultiplayerBattle([0,1,2,3]),scout=g.warriors(1)[0],viewer=g.warriors(0)[0];g.finishTraining(scout,{...SPECIALISTS.scout,special:'scout',role:'scout',tier:1,schools:[]});
 Object.assign(viewer,{x:800,y:400,order:'hold'});Object.assign(scout,{x:1000,y:400,order:'hold'});g.refreshVision();g.command(1,{action:'toggleStealth',ids:[scout.id]});
 assert(g.canSee(0,scout));assert(!g.snapshot(0).units.some(u=>u.id===scout.id),'enemy scout omitted even on explored visible ground');assert(g.snapshot(1).units.some(u=>u.id===scout.id));
 assert.throws(()=>g.command(0,{action:'issue',ids:[viewer.id],mode:'target',targetId:scout.id}));
 Object.assign(viewer,{x:940,y:400});g.refreshVision();assert(g.observable(0,scout),'close units detect');Object.assign(viewer,{x:800,y:400});
 const tower=g.addStructure('tower',{x:1020,y:500},0,true);g.refreshVision();assert(g.observable(0,scout),'tower detects');tower.hp=0;g.refreshVision();assert(!g.observable(0,scout));
 g.hit(viewer,1,scout);assert(g.observable(0,scout),'attacking reveals');assert(!scout.stealth);
 assert.throws(()=>g.command(0,{action:'toggleStealth',ids:[scout.id]}),'ownership check');
 for(let team=0;team<4;team++){
  const u=g.warriors(team).find(u=>!u.special),stable=g.addStructure('stable',g.world.free({x:u.x+120,y:u.y+100}),team,true),h=g.horses[team*3];
  Object.assign(h,{team,status:'stabled',stableId:stable.id});Object.assign(u,g.door(stable));g.stock[team]={rice:400,water:300};
  g.command(team,{action:'mount',ids:[u.id],buildingId:stable.id});tick(g,.1);assert(u.horseId);
  g.finishTraining(u,{name:'evolved',tier:3,schools:['dojo','archery','shrine'],max:300,damage:30,range:35,ranged:false});assert(!u.horseId);assert.equal(h.status,'stabled','promotion returns horse for team '+team);
 }
}
console.log('PASS expedition: cancellation/death/refunds, villagers fight and resume gathering, siege/spear counters, paid camp healing, server stealth/detection/ownership and four-team mounted promotion');
{
 const g=demo(1),spy=g.warriors().find(u=>u.special==='scout'),hq=building(g,'hq',0);Object.assign(spy,g.door(hq));g.updateVision();const rice=g.stock[0].rice;
 assert(g.sabotage([spy.id]));assert.equal(g.stock[0].rice,rice-40);assert(!g.sabotage([spy.id]));assert.equal(spy.revealed,8);assert.equal(spy.sabotageCooldown,45);
 const foe=g.warriors(0)[0],rider=g.warriors().find(u=>!u.form&&!u.special);rider.horseId='fixture';g.hit(foe,1,rider);assert.equal(foe.venom,3);
 const scout=g.warriors().find(u=>u.special==='scout');Object.assign(scout,g.world.free({x:1200,y:500}));g.updateVision();
 const points=[];for(let y=250;y<=800;y+=40)for(let x=950;x<=1450;x+=40)points.push({x,y});
 const p=points.find(p=>g.placement('camp',p).ok&&!g.placement('stable',p).ok&&g.structures.every(b=>b.team!==1||dist(b,p)>650));
 assert(p,'forward camp can be built in scouted territory beyond normal base radius');
}
console.log('PASS expedition: Naga sabotage costs enemy supplies, enforces cooldown/reveal, mounted venom, and forward placement requires scouted territory');
// The local render loop must advance the same fixed simulation step at different display rates.
{
 const fs=require('node:fs'),vm=require('node:vm'),s=fs.readFileSync(__dirname+'/src/render.js','utf8');
 const loop=s.slice(s.indexOf('if(online?.active){simulationDebt=0;'),s.indexOf('draw();uiElapsed+=dt;'));
 for(const hz of [30,60,90,144]){const steps=[],c={online:null,simulationDebt:0,dt:1/hz,game:{step:dt=>steps.push(dt)}};vm.createContext(c);for(let i=0;i<hz*10;i++)vm.runInContext(loop,c);assert(steps.length>=199&&steps.length<=200);assert(steps.every(d=>d===.05));}
 console.log('PASS local simulation: 30/60/90/144 Hz displays use the same 20 Hz game rules');
}
