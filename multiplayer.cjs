const engine = new Function(require('./engine-source.cjs')() + ';return {EconomyBattle,World,W,H,COLS,ROWS,BUILDINGS,dist};')();
const {EconomyBattle,World,W,H,COLS,ROWS,BUILDINGS,dist} = engine;
const copy = value => JSON.parse(JSON.stringify(value, (key, v) => ['target','path'].includes(key) ? undefined : v));
class MultiplayerBattle extends EconomyBattle {
  constructor(teams) {
    super(teams[0], new World());
    this.multiplayer = true;
    this.activeTeams = teams;
    this.aiWait.fill(Infinity);
    this.views = Array.from({length:4},()=>({seen:new Uint8Array(COLS*ROWS),visible:new Uint8Array(COLS*ROWS),alerts:[],lastAlert:-99}));
    this.units = this.units.filter(u=>teams.includes(u.team));
    for (const b of this.structures) if (!teams.includes(b.team)) b.hp=0;
    this.structures = this.structures.filter(b=>teams.includes(b.team));
    this.rebuildObstacles();
    this.running=this.started=true;
    this.refreshVision();
  }
  asTeam(team, fn) {
    const previous = {player:this.player,seen:this.seen,visible:this.visible,alerts:this.alerts,lastAlert:this.lastAlert};
    this.player=team;Object.assign(this,this.views[team]);
    try {return fn();} finally {
      this.views[team].alerts=this.alerts;this.views[team].lastAlert=this.lastAlert;
      Object.assign(this,previous);
    }
  }
  refreshVision(){for(const team of this.activeTeams)this.asTeam(team,()=>this.updateVision());}
  canSee(team,p){return !!this.views?.[team].visible[this.world.cell(p)];}
  hit(u,amount,source,pierce=false){return this.views?this.asTeam(u.team,()=>super.hit(u,amount,source,pierce)):super.hit(u,amount,source,pierce);}
  notify(){} // Network command replies and state drive each client's messages.
  finishMatch(){const survivors=this.bases.filter(b=>this.activeTeams.includes(b.team)&&b.hp>0);this.over=survivors.length<=1;this.winner=this.over?(survivors[0]?.team??null):null;if(this.over)this.running=false;}
  surrender(team){if(this.over)return;this.asTeam(team,()=>this.hit(this.bases[team],1e9,null,true));this.finishMatch();}
  step(dt){
    if(this.over)return;
    const team=this.activeTeams.find(t=>this.bases[t].hp>0);
    if(team===undefined){this.finishMatch();return;}
    this.asTeam(team,()=>{this.over=false;super.step(dt);});
    this.units=this.units.filter(u=>u.hp>0||this.t-(u.deadAt||0)<20);
    this.finishMatch();this.refreshVision();
  }
  command(team,c){
    if(!this.running||this.over||this.bases[team].hp<=0)throw new Error('การรบจบแล้ว หรือฐานของคุณถูกทำลาย');
    if(!c||typeof c!=='object')throw new Error('คำสั่งไม่ถูกต้อง');
    return this.asTeam(team,()=>{
      const ids=c.ids??[];
      if(!Array.isArray(ids)||ids.length>60||ids.some(id=>!Number.isInteger(id)||!this.units.some(u=>u.id===id&&u.team===team&&u.hp>0)))throw new Error('สั่งได้เฉพาะยูนิตของคุณ');
      const p=c.point;
      if(p&&(!Number.isFinite(p.x)||!Number.isFinite(p.y)||p.x<0||p.y<0||p.x>W||p.y>H))throw new Error('ตำแหน่งอยู่นอกแผนที่');
      const building=()=>{const b=this.structures.find(b=>b.id===c.buildingId&&b.team===team&&b.hp>0);if(!b)throw new Error('ไม่พบอาคารของคุณ');return b;};
      let result;
      switch(c.action){
        case 'issue': {
          if(!ids.length||!['hold','move','advance','target'].includes(c.mode))throw new Error('คำสั่งเดินไม่ถูกต้อง');
          let target=p;
          if(c.mode==='target'){target=this.targets(team).find(u=>u.id===c.targetId&&this.visibleAt(u));if(!target)throw new Error('เป้าหมายอยู่นอกระยะมองเห็น');}
          else if(c.mode!=='hold'&&!p)throw new Error('กรุณาเลือกปลายทาง');
          this.issue(ids,c.mode,target);result=true;break;
        }
        case 'targetPriority':if(!['auto','units','buildings'].includes(c.priority))throw new Error('ประเภทเป้าหมายไม่ถูกต้อง');result=this.setTargetPriority(ids,c.priority);break;
        case 'gather':{const r=this.resources.find(r=>r.id===c.resourceId&&this.visibleAt(r));if(!r)throw new Error('ยังไม่พบแหล่งทรัพยากร');result=this.assignGather(ids,r);break;}
        case 'build':if(!p||!Object.hasOwn(BUILDINGS,c.kind))throw new Error('เลือกอาคารและตำแหน่ง');result=this.build(c.kind,p,ids);break;
        case 'assignBuild':{const b=building();if(b.complete)throw new Error('อาคารสร้างเสร็จแล้ว');result=this.assignBuild(ids,b);break;}
        case 'train':result=this.train(building(),ids);break;
        case 'cancelTraining':result=this.cancelTraining(building());break;
        case 'cancelBuilding':result=this.cancelBuilding(building());break;
        case 'upgradeTower':result=this.upgradeTower(building());break;
        case 'repair':result=this.repair(building(),ids);break;
        case 'cast':result=this.cast(team,ids,p);break;
        case 'volley':result=this.volley(team,ids);break;
        case 'heroSkill':result=this.heroSkill(ids);break;
        default:throw new Error('ไม่รองรับคำสั่งนี้');
      }
      if(result===false||result===0||result?.ok===false)throw new Error(result?.reason||'คำสั่งยังไม่พร้อมใช้งาน');
      return {ok:true,action:c.action,buildingId:result?.building?.id};
    });
  }
  snapshot(team){return this.asTeam(team,()=>{
    const visible=p=>this.visibleAt(p);
    const units=this.units.filter(u=>u.team===team||(!u.inTraining&&visible(u))).map(u=>{
      const v=copy(u);if(u.team!==team){delete v.job;delete v.dest;delete v.goalCell;delete v.cargo;delete v.cargoType;}return v;
    });
    const structures=this.structures.filter(b=>b.team===team||visible(b)).map(b=>{const v=copy(b);if(b.team!==team){v.queue=[];delete v.spawn;delete v.upgrading;}return v;});
    // Spawn locations and defeated teams are public; hidden HQ health is not.
    const bases=this.bases.map(b=>b.team===team||visible(b)?copy(b):{id:b.id,team:b.team,x:b.x,y:b.y,hp:b.hp>0?1800:0,max:1800,kind:'hq',building:true,complete:true,w:110,h:80,queue:[]});
    return {t:this.t,over:this.over,winner:this.winner,running:this.running,started:true,units,structures,bases,
      resources:copy(this.resources.filter(r=>r.team===team||visible(r))),
      stock:this.stock.map((s,i)=>i===team?copy(s):{rice:0,water:0}),
      cooldowns:this.cooldowns.map((v,i)=>i===team?v:0),volleys:this.volleys.map((v,i)=>i===team?v:0),
      projectiles:copy(this.projectiles.filter(visible)),effects:copy(this.effects.filter(visible)),zones:copy(this.zones.filter(visible)),
      alerts:copy(this.alerts),events:[],seen:Buffer.from(this.seen).toString('base64'),visible:Buffer.from(this.visible).toString('base64')};
  });}
}
module.exports={MultiplayerBattle};
