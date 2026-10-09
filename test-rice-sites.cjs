const assert=require('node:assert/strict');
const {EconomyBattle,RICE_SITES,ricePatchPoint,STARTS,dist}=new Function(require('./engine-source.cjs')()+';return {EconomyBattle,RICE_SITES,ricePatchPoint,STARTS,dist};')();
const {MultiplayerBattle}=require('./multiplayer.cjs');
const tick=(g,s)=>{for(let i=0;i<s*20;i++)g.step(.05);};
const base=new EconomyBattle(),sites=base.resources.filter(r=>r.neutral);
assert.equal(base.resources.filter(r=>r.type==='rice').length,12);assert.equal(sites.length,8);
for(let team=0;team<4;team++){
 const g=new EconomyBattle(team);assert.deepEqual(g.resources.filter(r=>r.neutral),sites,'all clients share deterministic sites');
 for(const r of sites){assert(g.world.path(STARTS[team],r).length,'every team can reach '+r.id);for(let i=0;i<48;i++)assert(g.world.walkable(ricePatchPoint(r,i)),'all clumps on walkable terrain');}
}
for(let i=0;i<8;i++){
 const team=i%4,g=new EconomyBattle(team),r=g.resources.find(r=>r.id===sites[i].id),u=g.workers()[0];
 g.running=true;g.aiWait.fill(Infinity);g.units=[u];g.stock[team]={rice:0,water:0};for(const b of g.structures){b.attack=1e6;b.spawn=-1e6;}
 Object.assign(u,g.world.free(r));g.updateVision();assert(!g.placement('store',r).ok,'cannot pave over a paddy');
 const candidates=[];for(let y=r.y-240;y<=r.y+240;y+=20)for(let x=r.x-260;x<=r.x+260;x+=20)candidates.push({x,y});candidates.sort((a,b)=>dist(a,r)-dist(b,r));
 const spot=candidates.find(p=>g.placement('store',p).ok);assert(spot,'forward store site '+r.id);
 const store=g.addStructure('store',spot,team,true);g.rebuildObstacles();g.updateVision();
 assert.equal(g.nearestStore(u).id,store.id);g.assignGather([u.id],r);tick(g,35);
 assert(r.amount<r.max,'harvest neutral '+r.id);assert(g.stock[team].rice>0,'deliver to forward store '+r.id);assert(Math.abs(r.amount-r.patches.reduce((a,b)=>a+b,0))<.001);
 r.amount=0;r.patches.fill(0);g.riceStep(r,.05);assert.equal(r.stage,'fallow');g.running=false;const cycle=r.cycle;tick(g,2);assert.equal(r.cycle,cycle);
 g.riceStep(r,8);g.riceStep(r,22);assert.equal(r.amount,RICE_SITES[i].max);assert.equal(r.patches.length,48);
}
{
 const g=new MultiplayerBattle([0,1,2,3]),r=g.resources.find(r=>r.id==='rice-neutral-4'),a=g.workers(0)[0],b=g.workers(1)[0];
 assert(!g.snapshot(0).resources.some(v=>v.id===r.id),'undiscovered neutral stock is hidden');
 assert.throws(()=>g.command(0,{action:'gather',ids:[a.id],resourceId:r.id}));
 Object.assign(a,g.world.free(ricePatchPoint(r,0)));Object.assign(b,g.world.free(ricePatchPoint(r,47)));g.units=[a,b];g.refreshVision();
 assert(g.snapshot(0).resources.some(v=>v.id===r.id));assert(g.snapshot(1).resources.some(v=>v.id===r.id));
 for(const [team,u] of [[0,a],[1,b]])g.command(team,{action:'gather',ids:[u.id],resourceId:r.id});
 tick(g,2);assert(a.cargo>0&&b.cargo>0,'rival villagers harvest the same neutral field');
 assert(Math.abs(r.max-r.amount-a.cargo-b.cargo)<.001,'finite shared stock, not per-player copies');
 assert.equal(g.snapshot(0).resources.find(v=>v.id===r.id).amount,g.snapshot(1).resources.find(v=>v.id===r.id).amount);
 assert(!g.snapshot(2).resources.some(v=>v.id===r.id),'unrelated player cannot see stock changes');
}
console.log('PASS rice sites: 12 fields, deterministic/reachable layout, all 48 clumps, 8 remote harvest/delivery loops, forward stores, regrowth/pause, shared online stock and fog');
