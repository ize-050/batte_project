const fs=require('node:fs'),assert=require('node:assert/strict');
const html=fs.readFileSync(__dirname+'/forest-rts.html','utf8');
const src=html.split('// ENGINE-BEGIN')[1].split('// ENGINE-END')[0];
const {EconomyBattle,World,TRAINING,ricePatchPoint}=new Function(src+';return{EconomyBattle,World,TRAINING,ricePatchPoint};')();
function tick(g,s){for(let i=0;i<s*20;i++)g.step(.05);}
function setup(clan=0){const g=new EconomyBattle(clan,new World());g.setupShowcase();g.running=true;for(const b of g.structures)b.spawn=-10000;return g;}
const permutations=[['dojo','archery','shrine'],['dojo','shrine','archery'],['archery','dojo','shrine'],['archery','shrine','dojo'],['shrine','dojo','archery'],['shrine','archery','dojo']];
for(let clan=0;clan<4;clan++){
 let g=setup(clan);for(const kind of ['dojo','archery','shrine','warhall','tower','well','store'])assert(g.structures.some(b=>b.team===clan&&b.kind===kind&&b.complete),'showcase building '+kind+' clan '+clan);
 for(const order of permutations){g=setup(clan);const u=g.workers()[0];g.setJob(u,null);const id=u.id,pop=g.population();u.hp=55;
  for(const [i,kind] of [...order,'warhall'].entries()){
   const b=g.structures.find(b=>b.team===clan&&b.kind===kind);g.stock[clan]={rice:800,water:500};Object.assign(u,g.door(b));assert(g.train(b,[id]).ok,kind+' accepts valid route');const before=u.tier||0;tick(g,1);assert(u.inTraining);assert.equal(u.tier||0,before);tick(g,28);assert.equal(u.tier,i+1);assert.equal(u.id,id);assert.equal(g.population(),pop);assert(Math.abs(u.hp/u.max-.5)<.001,'health preserved');assert(!g.train(b,[id]).ok,'same school cannot repeat');
  }
  assert.equal(u.tier,4);assert.equal(u.max,420);assert.equal(u.damage,55);assert(!g.trainingRecipe(u,'shrine'));
 }
 // Walking phase follows displacement and stops after arrival.
 g=setup(clan);const mover=g.warriors()[0],start={x:mover.x,y:mover.y};g.issue([mover.id],'move',g.door(g.structures.find(b=>b.team===clan&&b.kind==='dojo')));tick(g,1);assert(mover.stride>0&&mover.movingUntil>g.t);assert(Math.hypot(mover.x-start.x,mover.y-start.y)>1);tick(g,20);assert((mover.movingUntil||0)<g.t);
 // Harvesting depletes specific clumps while keeping total stock consistent.
 g=setup(clan);const field=g.resources.find(r=>r.id==='rice-'+clan);tick(g,25);assert(field.patches.some(n=>n<10));assert(field.patches.some(n=>n===0));assert(Math.abs(field.patches.reduce((a,b)=>a+b,0)-field.amount)<.001);assert(field.amount<field.max);assert(g.economyStats.rice>0);
}
let g=setup(),tower=g.structures.find(b=>b.kind==='tower'&&b.team===0),enemy=g.alive(1)[0];
Object.assign(enemy,g.world.free({x:tower.x+150,y:tower.y}));enemy.order='hold';enemy.damage=0;enemy.range=0;const hp=enemy.hp;g.updateVision();tick(g,2);assert(enemy.hp<hp,'tower projectiles hit an enemy in range');
g.stock[0]={rice:800,water:500};const balance=g.stock[0].rice;assert(g.upgradeTower(tower).ok);assert.equal(g.stock[0].rice,balance-130);assert(!g.upgradeTower(tower).ok);g.running=false;tick(g,20);assert.equal(tower.level,1);g.running=true;tick(g,17);assert.equal(tower.level,2);assert.equal(tower.range,350);assert(g.upgradeTower(tower).ok);tick(g,23);assert.equal(tower.level,3);assert.equal(tower.damage,52);assert(!g.upgradeTower(tower).ok);
// Repair has real worker travel and material cost, bounded at maximum health.
g=setup();tower=g.structures.find(b=>b.kind==='tower'&&b.team===0);tower.hp-=100;const u=g.workers()[0];g.setJob(u,null);Object.assign(u,g.door(tower));g.stock[0]={rice:300,water:180};assert(g.repair(tower,[u.id]));tick(g,4);assert.equal(tower.hp,tower.max);assert.equal(u.job,null);
// End-tier skill affects targets and enforces a cooldown; no cast when paused.
for(let clan=0;clan<4;clan++){g=setup(clan);const hero=g.warriors().find(u=>u.tier===4),foe=g.alive((clan+1)%4)[0];Object.assign(foe,g.world.free({x:hero.x+60,y:hero.y}));g.updateVision();hero.hp-=100;assert(g.heroSkill([hero.id]),'clan skill '+clan);assert.equal(hero.heroCooldown,30);assert(!g.heroSkill([hero.id]));if(clan===2)assert.equal(hero.hp,hero.max);if(clan===1)assert(g.zones.length>0);if(clan===0||clan===3)assert(foe.hp<110);g.running=false;tick(g,3);assert.equal(hero.heroCooldown,30);}
console.log('PASS: 24 complete tier 1–4 routes, 4-clan showcase buildings, walking phase, per-clump harvest accounting, tower damage/upgrades/pause, repairs, 4 hero skills and cooldowns');
for(let clan=0;clan<4;clan++){
  const full=setup(clan),r=full.resources.find(r=>r.id==='rice-'+clan);let emptied=false;
  for(let n=0;n<6000;n++){full.step(.05);if(r.stage==='fallow'){emptied=true;break;}}
  assert(emptied,'all rice patches reachable and fully harvestable for clan '+clan);assert.equal(r.amount,0);assert(r.patches.every(n=>n<.001));tick(full,31);assert.equal(r.stage,'ripe');assert(r.amount>0);
}
console.log('PASS: entire 48-patch field depleted and regrown by real gatherers for all four clans');
