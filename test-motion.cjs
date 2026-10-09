const assert=require('node:assert/strict'),fs=require('node:fs');
const {MotionFrames}=new Function(fs.readFileSync('src/motion.js','utf8')+';return {MotionFrames};')();
function scene(){return {t:0,units:[{id:1,x:0,y:0,hp:100,angle:0,stride:0}],horses:[{id:'h',x:0,y:20,status:'wild',angle:0,stride:0}]};}
for(const hz of [30,60,90,144]){
 const g=scene(),m=new MotionFrames();m.capture(g);let debt=0,last=null,positive=0,maxJump=0;
 for(let i=0;i<hz*3;i++){
  debt+=1/hz;while(debt>=.05){m.capture(g);g.t+=.05;g.units[0].x+=5;g.units[0].stride+=1;g.horses[0].x+=3;m.capture(g);debt-=.05;}
  const state=JSON.stringify(g),u=m.sample(g,g.units[0],'units',g.t-.05+debt),h=m.sample(g,g.horses[0],'horses',g.t-.05+debt);assert.equal(JSON.stringify(g),state,'drawing must not mutate authoritative positions');assert(u.x<=g.units[0].x);assert(h.x<=g.horses[0].x);
  if(last!==null&&i>hz/2){const delta=u.x-last;assert(delta>0,'moving actor advances each display frame');positive++;maxJump=Math.max(maxJump,delta);assert(Math.abs(delta-100/hz)<1e-8,'constant-speed simulation renders at constant speed');}last=u.x;
 }
 assert(positive>hz);console.log('PASS motion '+hz+' Hz: max movement/frame '+maxJump.toFixed(3)+' (raw simulation jumps 5 units)');
}
{
 const g=scene(),m=new MotionFrames();m.capture(g);m.advance(.1);g.t=.1;g.units[0].x=10;g.horses[0].x=6;m.capture(g);m.advance(.05);
 assert.equal(m.sample(g,g.units[0],'units',m.clock).x,5);assert.equal(m.sample(g,g.horses[0],'horses',m.clock).x,3);m.advance(3);assert.equal(m.sample(g,g.units[0],'units',m.clock).x,10,'network dropout cannot extrapolate through obstacles');
 g.units[0].hp=0;assert.equal(m.sample(g,g.units[0],'units',.05),g.units[0],'death is immediate');g.units[0].hp=100;g.units[0].horseId='h';assert.equal(m.sample(g,g.units[0],'units',.05),g.units[0],'mount transition is immediate');
 delete g.units[0].horseId;g.t=.2;g.units[0].x=500;m.capture(g);assert.equal(m.sample(g,g.units[0],'units',.15).x,500,'teleport is not interpolated');
 g.units=[];g.t=.3;m.capture(g);g.units=[{id:1,x:510,y:0,hp:100}];g.t=.4;m.capture(g);assert.equal(m.sample(g,g.units[0],'units',.35).x,510,'reappearance does not cross hidden fog');
 const other=scene();assert.equal(m.sample(other,other.units[0],'units',.2),other.units[0]);m.capture(other);assert.equal(m.frames.length,1,'new game clears history');
}
{
 const g=scene(),m=new MotionFrames();g.units[0].angle=Math.PI-.1;m.capture(g);g.t=.05;g.units[0].angle=-Math.PI+.1;m.capture(g);assert(Math.abs(Math.abs(m.sample(g,g.units[0],'units',.025).angle)-Math.PI)<1e-8,'rotation takes shortest route');
}
console.log('PASS rendering: local and network units/horses, non-mutating state, no extrapolation, reset, death, fog reappearance, mount, teleport and angle wrap');
