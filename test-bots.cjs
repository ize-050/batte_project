const assert=require('node:assert/strict');
const {BotBattle,EconomyBattle,BOT_LEVELS,STARTS}=new Function(require('./engine-source.cjs')()+';return {BotBattle,EconomyBattle,BOT_LEVELS,STARTS};')();
const tick=(g,s)=>{for(let i=0;i<s*20;i++)g.step(.05);};
for(let player=0;player<4;player++)for(const count of [1,2,3]){
 const g=new BotBattle(player,undefined,count);assert.equal(g.botTeams.length,count);assert.equal(g.bases.filter(b=>b.hp>0).length,count+1);assert(g.units.every(u=>g.activeTeams.includes(u.team)));assert(!g.botTeams.includes(player));
 assert.deepEqual(g.stock[player],{rice:360,water:180});assert.equal(g.visibleAt(STARTS[g.botTeams[0]]),false);
 g.running=true;tick(g,5);for(const team of g.botTeams){assert(g.workers(team).some(u=>u.job?.type==='gather'));assert(g.structures.some(b=>b.team===team&&b.kind==='dojo'));assert(g.stock[team].rice<360,'construction spends real funds');}
 assert.equal(g.player,player);const t=g.t,stock=JSON.stringify(g.stock);g.running=false;tick(g,5);assert.equal(g.t,t);assert.equal(JSON.stringify(g.stock),stock);
}
const g=new BotBattle(0,undefined,3);g.running=true;let income=0,paid=0;const deposit=g.deposit.bind(g),spend=g.spend.bind(g);
g.deposit=(u,dt)=>{const before={...g.stock[u.team]},r=deposit(u,dt);if(u.team!==0)income+=g.stock[u.team].rice-before.rice+g.stock[u.team].water-before.water;return r;};
g.spend=(cost,team=g.player)=>{const result=spend(cost,team);if(result&&team!==0)paid+=(cost.rice||0)+(cost.water||0);return result;};
tick(g,240);assert(income>500);assert(paid>1000);for(const s of g.botStates){assert(s.builds>=3);assert(s.trains>=2);assert(s.attacks>=1);}
assert(g.stats.hits>0,'bot armies fight using the real combat simulation');assert.equal(g.bases[0].hp,0,'idle human base can lose to a bot raid');assert(g.over);assert(!g.running);assert(g.stock.every(s=>s.rice>=0&&s.water>=0));
{
 const b=new BotBattle(2,undefined,1,'easy');b.running=true;assert(BOT_LEVELS.easy.attack>BOT_LEVELS.normal.attack);const team=b.botTeams[0],u=b.warriors(team)[0],enemy=b.warriors(2)[0];
 Object.assign(u,{x:1400,y:1300});Object.assign(enemy,{x:1410,y:1300});b.botViews[team].visible.fill(0);assert(!b.observable(team,enemy),'bots do not see through fog');b.refreshBots();assert(b.observable(team,enemy));
 const seen=b.seen,visible=b.visible;b.asBot(team,()=>{assert.equal(b.player,team);});assert.equal(b.player,2);assert.equal(b.seen,seen);assert.equal(b.visible,visible);
 b.hit(b.bases[team],1e9,null,true);tick(b,.05);assert(b.over);assert.equal(b.winner,2);assert(!b.running);
}
{
 const b=new BotBattle(0,undefined,1);b.running=true;const team=b.botTeams[0];b.stock[team]={rice:0,water:0};tick(b,1);assert.equal(b.botStates[0].builds,0,'no free buildings when broke');assert.equal(b.botStates[0].trains,0);
 const demo=new EconomyBattle();assert(!demo.botMode,'peaceful practice remains separate');
}
console.log('PASS bots: all clans/counts, paid gathering/building/training, real raids/combat/defeat/victory, pause, fog, context restoration, no free resources and peaceful practice');
