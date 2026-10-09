const assert=require('node:assert/strict');
const {EconomyBattle,World}=new Function(require('./engine-source.cjs')()+';return {EconomyBattle,World};')();
const {MultiplayerBattle}=require('./multiplayer.cjs');
const tick=(g,s)=>{for(let i=0;i<s*20;i++)g.step(.05);};
function arena(team=0){const g=new EconomyBattle(team,new World());g.running=true;g.aiWait.fill(Infinity);for(const b of g.structures){b.attack=1e6;b.spawn=-1e6;}const u=g.warriors()[0],enemy=g.warriors((team+1)%4)[0];g.units=[u,enemy];Object.assign(u,{x:800,y:400,hp:10000,max:10000});Object.assign(enemy,{x:850,y:400,attack:1e6});const tower=g.addStructure('tower',{x:960,y:400},enemy.team,true);tower.attack=1e6;g.rebuildObstacles();g.updateVision();return{g,u,enemy,tower};}
for(const team of [0,1,2,3]){
 const {g,u,enemy,tower}=arena(team);
 assert(g.setTargetPriority([u.id],'units'));assert.equal(g.nearest(u),enemy);
 assert(g.setTargetPriority([u.id],'buildings'));assert.equal(g.nearest(u),tower);
 g.issue([u.id],'advance',{x:1100,y:400});const hp=enemy.hp;tick(g,8);assert(tower.hp<tower.max,'melee attacks tower edge for clan '+team);assert.equal(enemy.hp,hp,'building mode skips people');
 assert(g.setTargetPriority([u.id],'units'));tower.hp=1;g.issue([u.id],'target',tower);tick(g,3);assert.equal(tower.hp,0,'explicit target overrides filter');
 g.issue([u.id],'advance',{x:800,y:400});tick(g,8);assert(enemy.hp<hp,'retargets people after tower destroyed');
 const before=u.targetPriority;assert.equal(g.setTargetPriority([u.id],'invalid'),false);assert.equal(u.targetPriority,before);
}
{
 const {g,u,enemy,tower}=arena();tower.hp=0;g.rebuildObstacles();g.setTargetPriority([u.id],'auto');g.issue([u.id],'move',{x:1100,y:400});const hp=enemy.hp;tick(g,2);assert.equal(enemy.hp,hp,'explicit move avoids combat');
 g.issue([u.id],'advance',{x:800,y:400});tick(g,5);assert(enemy.hp<hp,'attack move fights encountered enemies');
}
for(let team=0;team<4;team++){
 const g=new EconomyBattle(team);g.setupShowcase();g.running=true;const elite=g.warriors().find(u=>u.tier===3),hero=g.warriors().find(u=>u.tier===4),hall=g.structures.find(b=>b.team===team&&b.kind==='warhall');
 const ids=[hero.id,...g.warriors().map(u=>u.id)];let item=g.trainingOptions(ids).find(i=>i.kind==='warhall');assert(item.enabled);assert.equal(item.u.id,elite.id);
 g.stock[team]={rice:0,water:0};item=g.trainingOptions(ids).find(i=>i.kind==='warhall');assert.match(item.reason,/150.*100/);assert(!item.enabled);
 hall.queue=[{},{},{}];assert.match(g.trainingOptions(ids).find(i=>i.kind==='warhall').reason,/คิวเต็ม/);hall.queue=[];hall.hp=0;
 item=g.trainingOptions(ids).find(i=>i.kind==='warhall');assert(item.missing);assert.match(item.reason,/ต้องสร้าง/);
 assert.equal(g.trainingOptions([hero.id]).length,0,'max tier has no further promotion');
}
{
 const g=new MultiplayerBattle([0,1]);const u=g.warriors(0)[0],enemy=g.warriors(1)[0];
 assert.throws(()=>g.command(0,{action:'targetPriority',ids:[enemy.id],priority:'units'}));
 assert.throws(()=>g.command(0,{action:'targetPriority',ids:[u.id],priority:'invalid'}));
 g.command(0,{action:'targetPriority',ids:[u.id],priority:'buildings'});assert.equal(g.snapshot(0).units.find(v=>v.id===u.id).targetPriority,'buildings');
 Object.assign(u,{x:2600,y:380});g.refreshVision();assert(g.nearest(u)?.building);
 g.views[0].visible.fill(0);assert.equal(g.nearest(u),null,'priority cannot target hidden buildings');
}
console.log('PASS combat orders: filters, direct override, melee tower edge for four clans, retargeting, move vs attack-move, mixed-tier promotion guidance, online ownership and fog');
// Exercise the actual UI context-command function with mixed selections.
{
 const vm=require('node:vm'),source=require('node:fs').readFileSync(__dirname+'/src/controller.js','utf8');
 const {g,u}=arena(),worker={...u,id:999,worker:true};g.units.push(worker);const calls=[];g.issue=(ids,mode)=>calls.push({ids,mode});
 const context={game:g,mode:null,player:0,selected:new Set([u.id,worker.id]),own:()=>[u,worker],ownWorkers:()=>[worker],message:()=>{},updateUI:()=>{},TRAINING:{},CLANS:[],dist:(a,b)=>Math.hypot(a.x-b.x,a.y-b.y),unitHit:()=>false};
 vm.createContext(context);vm.runInContext(source.slice(source.indexOf('function command(p)'),source.indexOf('for(const [kind,d]of Object.entries(BUILDINGS))')),context);
 context.command({x:1200,y:700});assert.deepEqual(calls.map(c=>c.mode),['advance','move']);
 calls.length=0;context.mode='move';context.command({x:1200,y:700});assert.deepEqual(calls.map(c=>c.mode),['move','move']);
 calls.length=0;context.mode=null;context.unitHit=()=>true;context.CLANS=[{name:'A'},{name:'B'},{name:'C'},{name:'D'}];g.resources.push({id:'overlap',type:'rice',x:850,y:400});context.command({x:850,y:400});assert.equal(calls[0].mode,'target','enemy standing on a resource gets attacked instead of gathered');
 console.log('PASS UI context orders: mixed group right-click auto-attacks with soldiers; explicit move stays peaceful');
}
