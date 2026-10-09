const fs=require('node:fs'),assert=require('node:assert/strict');
const html=fs.readFileSync(__dirname+'/forest-rts.html','utf8');
const script=html.match(/<script>([\s\S]*?)<\/script>/)[1];new Function(script);
const source=script.split('// ENGINE-BEGIN')[1].split('// ENGINE-END')[0];
const {EconomyBattle,World,BUILDINGS}=new Function(source+';return {EconomyBattle,World,BUILDINGS};')();
const tick=(g,seconds)=>{for(let i=0;i<seconds*20;i++)g.step(.05);};
const game=()=>{const g=new EconomyBattle(0,new World());g.running=true;return g;};
function spot(g,kind){for(let y=180;y<750;y+=40)for(let x=140;x<1000;x+=40){const r=g.placement(kind,{x,y});if(r.ok)return r.point;}throw Error('No buildable spot');}
let g=game();assert.equal(g.workers().length,6);assert.equal(g.warriors().length,4);assert.equal(g.population(),10);assert.equal(g.capacity(),26);
const worker=g.workers()[0],rice=g.resources.find(r=>r.id==='rice-0'),water=g.resources.find(r=>r.id==='water-0');
g.assignGather([worker.id],rice);const initialRice=g.stock[0].rice;tick(g,2);assert.equal(g.stock[0].rice,initialRice,'carried rice must not credit before delivery');tick(g,25);assert(g.stock[0].rice>initialRice,'rice must be delivered to a store');assert(g.economyStats.rice>0);
g.assignGather([worker.id],water);const initialWater=g.stock[0].water;tick(g,40);assert(g.stock[0].water>initialWater,'water must be carried and deposited');
assert(g.workers().length>6,'hut should generate workers without buying');
g=game();const builder=g.workers()[0],before={...g.stock[0]};let result=g.build('dojo',g.bases[0],[builder.id]);assert(!result.ok,'overlap must reject placement');assert.deepEqual(g.stock[0],before,'invalid placement cannot charge');
result=g.build('dojo',spot(g,'dojo'),[builder.id]);assert(result.ok);const dojo=result.building;assert.equal(g.stock[0].rice,before.rice-BUILDINGS.dojo.rice);assert.equal(dojo.complete,false);tick(g,36);assert(dojo.complete,'builder must walk to foundation and finish construction');assert(g.world.blocked[g.world.cell(dojo)],'building footprint must block movement');
const peasants=g.workers().length,soldiers=g.warriors().length,pop=g.population(),res={...g.stock[0]};const training=g.train(dojo);assert(training.ok);assert.equal(g.stock[0].rice,res.rice-55);tick(g,25);assert.equal(training.unit.worker,false,'the original peasant must become a warrior');assert.equal(g.warriors().length,soldiers+1);assert.equal(dojo.queue.length,0);assert(g.population()>=pop,'training never consumes a population slot; huts may add workers');
g=game();result=g.build('archery',spot(g,'archery'),[g.workers()[0].id]);const school=result.building;tick(g,38);assert(school.complete);const tr=g.train(school);assert(tr.ok);const charged={...g.stock[0]};assert(g.cancelTraining(school));assert.equal(g.stock[0].rice,charged.rice+65);assert.equal(tr.unit.worker,true);assert.equal(tr.unit.job,null);
const ownBefore=g.alive(0).length;g.hit(school,100000,{team:1});assert.equal(g.alive(0).length,ownBefore,'destroying a school must not eliminate the entire clan');assert.equal(g.world.blocked[g.world.cell(school)],0,'destroyed footprint must become passable');
g=game();const foundation=g.build('hut',spot(g,'hut'),[g.workers()[0].id]).building;const money=g.stock[0].rice;assert(g.cancelBuilding(foundation));assert.equal(g.stock[0].rice,money+64);assert.equal(g.workers()[0].job,null);
g=game();g.stock[0]={rice:0,water:0};const count=g.structures.length;assert(!g.build('tower',spot(g,'tower'),[g.workers()[0].id]).ok);assert.equal(g.structures.length,count,'insufficient funds cannot place a building');
g=game();g.running=false;const t=g.t,spawn=g.structures.find(b=>b.kind==='hut'&&b.team===0).spawn;tick(g,10);assert.equal(g.t,t);assert.equal(g.structures.find(b=>b.kind==='hut'&&b.team===0).spawn,spawn);
g=game();g.stock[0].rice=g.storage().rice;g.assignGather([g.workers()[0].id],g.resources.find(r=>r.id==='rice-0'));tick(g,45);assert.equal(g.stock[0].rice,g.storage().rice,'full storage must not overflow');assert(g.workers()[0].cargo>0,'cargo is retained when the store is full');
for(let clan=0;clan<4;clan++){const check=new EconomyBattle(clan,new World());check.running=true;const r=check.resources.find(r=>r.id==='rice-'+clan),w=check.resources.find(r=>r.id==='water-'+clan);check.assignGather([check.workers()[0].id],r);check.assignGather([check.workers()[1].id],w);tick(check,50);assert(check.economyStats.rice>0&&check.economyStats.water>0,'every clan must have reachable rice and water');assert(check.alive().every(u=>check.world.walkable(u)),'units must remain on traversable cells');}
const ids=new Set([...html.matchAll(/id="([^"]+)"/g)].map(m=>m[1]));for(const m of script.matchAll(/\$\('([a-z-]+)'\)/g))assert(ids.has('r-'+m[1]),'missing DOM element r-'+m[1]);
console.log('PASS: gather/deliver, 4-clan resource access, costs, invalid placements, construction, conversion training, refunds, hut generation, storage cap, demolition, pause, DOM bindings');
// Finite crops cannot create rice during the empty/growing phase, and gatherers resume on maturity.
g=game();for(const b of g.structures)b.spawn=-1000;
const field=g.resources.find(r=>r.id==='rice-0'),harvester=g.workers()[0];
field.amount=1;Object.assign(harvester,{x:field.x,y:field.y});g.assignGather([harvester.id],field);
tick(g,1);assert.equal(field.amount,0);assert.equal(field.stage,'fallow');assert(Math.abs(harvester.cargo-1)<.001);
tick(g,9);assert.equal(field.stage,'growing');assert.equal(field.amount,0);const clock=field.cycle;g.running=false;tick(g,3);assert.equal(field.cycle,clock);g.running=true;
tick(g,23);assert.equal(field.stage,'ripe');assert(field.amount>0&&field.amount<=field.max);tick(g,10);assert(field.amount<field.max,'waiting gatherer resumes after maturity');
// Both training orders converge on a second-tier unit without replacing it or its population slot.
for(const kind of ['dojo','archery']){
  g=game();for(const b of g.structures)b.spawn=-1000;
  const b=g.addStructure(kind,spot(g,kind),0,true);g.rebuildObstacles();
  const u=g.warriors().find(u=>kind==='dojo'?u.ranged:!u.ranged);const id=u.id,population=g.population();u.hp=u.max/2;
  const before={...g.stock[0]};assert(g.train(b,[u.id]).ok);assert.equal(g.stock[0].rice,before.rice-85);assert.equal(g.stock[0].water,before.water-45);
  assert(!g.train(b,[u.id]).ok,'same unit cannot queue twice');tick(g,8);assert.equal(u.tier,1,'walking and training take time');tick(g,40);
  assert.equal(b.queue.length,0);assert.equal(u.id,id);assert.equal(u.tier,2);assert.equal(u.damage,28);assert.equal(u.hp/u.max,.5,'training preserves health ratio');assert.equal(g.population(),population);
  const balance={...g.stock[0]};assert(!g.train(b,[u.id]).ok,'tier 2 cannot train indefinitely or fall back to another worker');assert.deepEqual(g.stock[0],balance);
}
g=game();const upgradeSchool=g.addStructure('archery',spot(g,'archery'),0,true);g.rebuildObstacles();const fighter=g.warriors().find(u=>!u.ranged),prior={...g.stock[0]};
assert(g.train(upgradeSchool,[fighter.id]).ok);tick(g,8);assert(g.cancelTraining(upgradeSchool));assert.equal(fighter.tier,1);assert(!fighter.inTraining);assert.deepEqual(g.stock[0],prior);
const wrong=g.warriors().find(u=>u.ranged);assert(!g.train(upgradeSchool,[wrong.id]).ok,'same school must reject trained units');
assert(g.train(upgradeSchool,[fighter.id]).ok);tick(g,8);g.hit(upgradeSchool,100000,{team:1});assert(!fighter.inTraining);assert.equal(fighter.tier,1);assert.equal(fighter.job,null);
console.log('PASS: rice depletion, fallow, growth, pause, harvest resumption; both upgrade routes, unit identity, population, health, costs, invalid school, cancellation and destruction');
