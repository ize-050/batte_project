// Rendering only: interpolate known positions without changing simulation state.
class MotionFrames {
 constructor(){this.owner=null;this.frames=[];this.clock=null;}
 capture(game,time=game.t){
  if(this.owner!==game){this.owner=game;this.frames=[];this.clock=null;}
  const pick=u=>({x:u.x,y:u.y,angle:u.angle||0,stride:u.stride||0,walk:u.walk||0,status:u.status,horseId:u.horseId,form:u.form,inTraining:u.inTraining,hp:u.hp});
  const frame={time,units:new Map(game.units.map(u=>[u.id,pick(u)])),horses:new Map((game.horses||[]).map(u=>[u.id,pick(u)]))};
  if(this.frames.at(-1)?.time===time)this.frames.pop();
  this.frames.push(frame);if(this.frames.length>6)this.frames.shift();
  if(this.clock===null||Math.abs(time-this.clock)>.4)this.clock=time-.1;
 }
 advance(dt){if(!this.frames.length)return;const latest=this.frames.at(-1).time;this.clock=Math.min(latest,this.clock+Math.max(0,dt));}
 sample(game,item,kind,time){
  if(this.owner!==game||this.frames.length<2||item.hp<=0||item.inTraining)return item;
  let before=this.frames[0],after=this.frames.at(-1);
  for(let i=1;i<this.frames.length;i++)if(this.frames[i].time>=time){before=this.frames[i-1];after=this.frames[i];break;}
  const a=before[kind].get(item.id),b=after[kind].get(item.id);
  if(!a||!b||a.hp<=0||a.inTraining||a.status!==b.status||a.horseId!==b.horseId||a.form!==b.form||b.status!==item.status||b.horseId!==item.horseId||b.form!==item.form||Math.hypot(b.x-a.x,b.y-a.y)>120)return item;
  const alpha=Math.max(0,Math.min(1,(time-before.time)/(after.time-before.time||1)));
  const blend=key=>a[key]+(b[key]-a[key])*alpha;
  const angle=a.angle+Math.atan2(Math.sin(b.angle-a.angle),Math.cos(b.angle-a.angle))*alpha;
  return {...item,x:blend('x'),y:blend('y'),angle,stride:blend('stride'),walk:blend('walk'),_renderTime:time};
 }
}
const motionFrames=new MotionFrames();
function renderActor(u,kind='units'){
 const network=online?.active,time=network?motionFrames.clock:game.running?game.t-.05+simulationDebt:game.t;
 return motionFrames.sample(game,u,kind,time??game.t);
}
