const assert=require('node:assert/strict');
const {EconomyBattle,World,ASCENSIONS}=new Function(require('./engine-source.cjs')()+';return {EconomyBattle,World,ASCENSIONS};')();
const {MultiplayerBattle}=require('./multiplayer.cjs');
const tick=(g,s)=>{for(let i=0;i<Math.ceil(s*20);i++)g.step(.05);};
function setup(team){const g=new EconomyBattle(team,new World());g.setupShowcase();g.running=true;g.aiWait.fill(Infinity);for(const b of g.structures)b.spawn=-10000;return g;}
for(let team=0;team<4;team++){
 const g=setup(team),elite=g.warriors().find(u=>u.tier===3),hero=g.warriors().find(u=>u.tier===4);
 assert.equal(elite.form,ASCENSIONS[team].form);assert.equal(hero.form,ASCENSIONS[team].form);
 assert.equal(elite.className,ASCENSIONS[team].name);assert.equal(hero.className,ASCENSIONS[team].hero);
 assert.equal(elite.speed,ASCENSIONS[team].speed);assert.equal(hero.speed,ASCENSIONS[team].speed);
 // Real queued promotion keeps the human form until training finishes, then changes the same unit.
 const unit=g.warriors().find(u=>u.tier===2),id=unit.id,health=unit.hp/unit.max,pop=g.population();
 const school=g.structures.find(b=>b.team===team&&b.complete&&g.trainingRecipe(unit,b.kind)?.tier===3);
 g.stock[team]={rice:600,water:400};Object.assign(unit,g.door(school));assert.equal(unit.form,null);
 assert(g.train(school,[id]).ok);tick(g,2);assert.equal(unit.form,null);assert(unit.inTraining);
 tick(g,20);assert.equal(unit.form,ASCENSIONS[team].form);assert.equal(unit.id,id);assert.equal(g.population(),pop);assert(Math.abs(unit.hp/unit.max-health)<.001);
 assert(g.effects.some(e=>e.type==='ascend')||unit.transformedAt>0);
 // Cancelling conversion does not grant a form, stats or cooldown reset.
 const cancelUnit=g.workers()[0];g.setJob(cancelUnit,null);const recipe=g.trainingRecipe(cancelUnit,'dojo');g.finishTraining(cancelUnit,recipe);g.finishTraining(cancelUnit,g.trainingRecipe(cancelUnit,'archery'));
 const shrine=g.structures.find(b=>b.team===team&&b.kind==='shrine');g.stock[team]={rice:600,water:400};Object.assign(cancelUnit,g.door(shrine));assert(g.train(shrine,[cancelUnit.id]).ok);tick(g,2);assert(g.cancelTraining(shrine));assert.equal(cancelUnit.form,null);assert.equal(cancelUnit.tier,2);
}
let g=setup(0),tiger=g.warriors().find(u=>u.tier===3),enemy=g.warriors(1)[0];
const hp=tiger.hp;g.hit(tiger,100,enemy);assert.equal(hp-tiger.hp,85,'tiger resists direct damage 15%');const next=tiger.hp;g.hit(tiger,10,null,true);assert.equal(next-tiger.hp,10,'poison bypasses tiger armor');
g=setup(1);let naga=g.warriors().find(u=>u.tier===3),victim=g.workers(0)[0];victim.hp=110;g.hit(victim,10,naga);assert.equal(victim.venom,3);assert.equal(victim.venomDps,3);
const venomHp=victim.hp;g.formStep(1);assert.equal(venomHp-victim.hp,3);g.hit(victim,1,naga);assert.equal(victim.venomDps,3,'repeated hits refresh instead of stack');
g.shoot(naga,victim);const p=g.projectiles.at(-1);assert.equal(p.form,'naga');g.hit(victim,1,p);assert.equal(victim.venom,3,'projectiles carry venom identity');
victim.immune=2;g.formStep(.05);assert.equal(victim.venom,0,'cleanse removes ongoing venom');
g=setup(2);const crane=g.warriors().find(u=>u.tier===3),craneHP=crane.hp;g.hit(crane,1,{team:1,form:'naga'});assert(!crane.venom);crane.venom=3;crane.venomDps=6;g.formStep(.05);assert.equal(crane.venom,0);assert.equal(crane.hp,craneHP-1);
const ch=g.warriors().find(u=>u.tier===4),ally=g.workers()[0];Object.assign(ally,{x:ch.x+20,y:ch.y});ally.hp=20;ally.venom=3;ally.venomDps=6;assert(g.heroSkill([ch.id]));assert.equal(ally.hp,110);assert.equal(ally.venom,0);assert.equal(ally.immune,6);
g=setup(3);const wolf=g.warriors().find(u=>u.tier===4);assert(g.heroSkill([wolf.id]),'wolf can enrage without a nearby enemy');assert.equal(wolf.awakened,8);g.formStep(.05);assert.equal(wolf.speed,104*1.3);
const target=g.workers(0)[0],before=target.hp;g.hit(target,40,wolf);assert.equal(before-target.hp,50);g.running=false;tick(g,2);assert(wolf.awakened>7,'pause freezes fury');g.running=true;for(let i=0;i<161;i++)g.formStep(.05);assert.equal(wolf.awakened,0);assert.equal(wolf.speed,104);assert(!g.heroSkill([wolf.id]),'hero cooldown prevents recast');
// Fog-filtered online state keeps the transformation and buff, but clients cannot invent them.
const online=new MultiplayerBattle([0,1,2,3]);for(let team=0;team<4;team++)online.asTeam(team,()=>online.setupShowcase());
for(let team=0;team<4;team++){const s=online.snapshot(team);assert(s.units.some(u=>u.team===team&&u.form===ASCENSIONS[team].form&&u.tier===4));assert.throws(()=>online.command(team,{action:'transform',ids:[team*10],tier:4}));}
const onlineWolf=online.warriors(3).find(u=>u.tier===4);online.command(3,{action:'heroSkill',ids:[onlineWolf.id]});assert.equal(online.snapshot(3).units.find(u=>u.id===onlineWolf.id).awakened,8);
console.log('PASS ascensions: four permanent forms, real queued transformations/cancellation, identity/population/health, tiger armor, projectile venom/refresh/cleanse, crane immunity/group heal, wolf fury/expiry/pause/cooldown, server-authoritative forms and buffs');
