// Local skirmishes use the same economic commands and costs as human players.
const BOT_LEVELS={easy:{name:'ง่าย',think:4,build:12,attack:240,wave:100},normal:{name:'ปกติ',think:2,build:8,attack:150,wave:65}};
class BotBattle extends EconomyBattle {
 constructor(player=0,world=new World(),count=1,difficulty='normal'){
  super(player,world);this.human=player;this.botMode=true;this.difficulty=Object.hasOwn(BOT_LEVELS,difficulty)?difficulty:'normal';
  this.botRules=BOT_LEVELS[this.difficulty];this.activeTeams=[player,...[1,2,3].slice(0,clamp(Math.floor(count)||1,1,3)).map(n=>(player+n)%4)];
  this.botTeams=this.activeTeams.filter(t=>t!==player);this.botViews=Array.from({length:4},()=>({seen:new Uint8Array(COLS*ROWS),visible:new Uint8Array(COLS*ROWS)}));
  this.botStates=this.botTeams.map(team=>({team,nextThink:0,nextBuild:0,nextAttack:this.botRules.attack,builds:0,trains:0,attacks:0}));this.aiWait.fill(Infinity);
  this.units=this.units.filter(u=>this.activeTeams.includes(u.team));for(const b of this.structures)if(!this.activeTeams.includes(b.team))b.hp=0;
  this.structures=this.structures.filter(b=>this.activeTeams.includes(b.team));this.rebuildObstacles();this.updateVision();this.refreshBots();
 }
 asBot(team,fn){
  const previous={player:this.player,seen:this.seen,visible:this.visible,botActing:this.botActing};this.player=team;this.botActing=true;Object.assign(this,this.botViews[team]);
  try{return fn();}finally{Object.assign(this,previous);}
 }
 notify(text){if(!this.botActing)super.notify(text);}
 refreshBots(){for(const team of this.botTeams)this.asBot(team,()=>this.updateVision());}
 observable(team,v){if(this.botViews&&team!==this.human&&v?.team!==team&&!this.botViews[team].visible[this.world.cell(v)])return false;return super.observable(team,v);}
 callRaid(){return false;}
 botBuild(state,kind,workers){
  const d=BUILDINGS[kind];if(!this.affordable(d)||this.buildRequirement(kind))return false;
  const u=workers.find(u=>!u.job)||workers.find(u=>u.job?.type==='gather');if(!u)return false;
  const home=STARTS[state.team],points=[];
  for(let y=home.y-420;y<=home.y+420;y+=60)for(let x=home.x-420;x<=home.x+420;x+=60)points.push({x,y});
  points.sort((a,b)=>dist(a,home)-dist(b,home));
  for(const p of points){if(!this.placement(kind,p).ok)continue;const r=this.build(kind,p,[u.id]);if(r.ok){state.builds++;return true;}}
  return false;
 }
 botThink(state){
  const team=state.team,home=STARTS[team],workers=this.workers(),army=this.warriors(),buildings=this.structures.filter(b=>b.team===team&&b.hp>0);
  const threats=this.targets(team).filter(v=>!v.building&&this.visibleAt(v)&&dist(v,home)<650);
  const fighters=army.filter(u=>!u.job);
  if(threats.length){const threat=threats.sort((a,b)=>dist(a,home)-dist(b,home))[0];for(const u of fighters)if(!u.dest||dist(u.dest,threat)>100||u.order==='hold')this.issue([u.id],'advance',threat);this.cast(team,fighters.map(u=>u.id),threat);this.volley(team,fighters.map(u=>u.id));}
  // Fill abandoned construction sites before opening new ones.
  const unfinished=buildings.find(b=>!b.complete);
  if(unfinished&&!workers.some(u=>u.job?.type==='build'&&u.job.buildingId===unfinished.id)){
   const u=workers.find(u=>!u.job||u.job.type==='gather');if(u)this.assignBuild([u.id],unfinished);
  }
  const rice=this.resources.filter(r=>r.type==='rice'&&this.visibleAt(r)).sort((a,b)=>(a.amount>0?0:1)-(b.amount>0?0:1)||dist(a,home)-dist(b,home))[0];
  const water=this.resources.filter(r=>r.type==='water'&&this.visibleAt(r)).sort((a,b)=>dist(a,home)-dist(b,home))[0];
  let waterCount=workers.filter(u=>u.job?.type==='gather'&&u.job.resourceId===water?.id).length;
  for(const u of workers.filter(u=>!u.job&&u.order!=='move'&&!u.defending)){const r=waterCount<2?water:rice;if(r){this.assignGather([u.id],r);if(r===water)waterCount++;}}
  const has=kind=>buildings.some(b=>b.kind===kind),count=kind=>buildings.filter(b=>b.kind===kind).length;
  const next=!has('dojo')?'dojo':!has('archery')?'archery':count('hut')<2?'hut':!has('tower')?'tower':!has('shrine')?'shrine':!has('store')?'store':!has('warhall')?'warhall':count('hut')<3?'hut':null;
  if(!unfinished&&next&&this.t>=state.nextBuild){state.nextBuild=this.t+this.botRules.build;this.botBuild(state,next,workers);}
  // Keep six workers to sustain food, water and construction. Recruit extras,
  // or send an existing nearby soldier to a school it has not learned yet.
  if(!threats.length){
   const candidates=[...workers.filter(u=>workers.length>6&&(!u.job||u.job.type==='gather')),...army.filter(u=>!u.job&&dist(u,home)<500&&u.order==='hold')];
   for(const u of candidates){
    const schools=buildings.filter(b=>b.complete&&b.queue.length===0&&TRAINING[b.kind]).map(b=>({b,d:this.trainingRecipe(u,b.kind)})).filter(v=>v.d);
    const option=schools.find(({d})=>this.affordable({rice:d.rice+(next?70:0),water:d.water+(next?30:0)}));
    if(option&&this.train(option.b,[u.id]).ok){state.trains++;break;}
   }
  }
  const ready=this.warriors().filter(u=>!u.job);
  if(!threats.length&&this.t>=state.nextAttack&&ready.length>=4){
   const enemy=this.bases.filter(b=>b.hp>0&&b.team!==team).sort((a,b)=>dist(a,home)-dist(b,home))[0];
   if(enemy){this.issue(ready.map(u=>u.id),'advance',enemy);state.nextAttack=this.t+this.botRules.wave;state.attacks++;}
  }
 }
 step(dt){
  if(!this.running||this.over)return;
  for(const state of this.botStates){if(this.bases[state.team].hp<=0||this.t<state.nextThink)continue;state.nextThink=this.t+this.botRules.think;this.asBot(state.team,()=>{this.updateVision();this.botThink(state);});}
  super.step(dt);
  const survivors=this.bases.filter(b=>this.activeTeams.includes(b.team)&&b.hp>0);this.over=this.bases[this.human].hp<=0||survivors.length<=1;this.winner=survivors.length===1?survivors[0].team:null;
  if(this.over)this.running=false;
 }
}
