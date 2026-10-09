const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {EconomyBattle,World,Camera,STARTS,W,H,dist,clamp}=new Function(require('./engine-source.cjs')()+';return {EconomyBattle,World,Camera,STARTS,W,H,dist,clamp};')();
const g=new EconomyBattle();assert.equal(W,3520);assert.equal(H,2640);
assert.equal(g.horses.filter(h=>h.site==='home').length,8);assert.equal(g.horses.filter(h=>h.site==='flank').length,4);assert.equal(g.horses.filter(h=>h.site==='center').length,8);
for(const h of g.horses){assert(g.world.walkable(h));for(const b of STARTS)assert(g.world.path(b,h).length,'every clan can reach every horse');if(h.site==='center')assert(STARTS.every(b=>dist(b,h)>800),'contested horses are outside the starting bases');}
for(let team=1;team<4;team++)assert.deepEqual(new EconomyBattle(team).horses.map(h=>[h.id,h.x,h.y]),g.horses.map(h=>[h.id,h.x,h.y]),'all players share the same map');
const source=fs.readFileSync('src/controller.js','utf8'),handlers={};
const elements=new Map();function el(id){if(!elements.has(id))elements.set(id,{style:{},hidden:true,checked:false,value:'560',focus(){},addEventListener(name,fn){handlers[id+':'+name]=fn;},setPointerCapture(){},hasPointerCapture(){return true;},releasePointerCapture(){}});return elements.get(id);}
const camera=new Camera(800,400);camera.center({x:W/2,y:H/2});
let orders=0,ui=0;const units=[{id:1,x:camera.x+100,y:camera.y+100},{id:2,x:camera.x+200,y:camera.y+150}];
const c={canvas:el('field'),mini:el('mini'),$:el,local:e=>({x:e.clientX,y:e.clientY}),audioUnlock(){},camera,dist,clamp,W,H,renderActor:u=>u,drag:null,mouse:{x:0,y:0},panMode:false,pointerInside:true,mode:null,buildKind:null,selected:new Set([1]),selectedBuilding:null,keys:new Set(),command(){orders++;},cancelMode(){c.buildKind=null;},updateUI(){ui++;},message(){},game:{alive:()=>units,structures:[]},player:0,unitHit:(u,p)=>dist(u,p)<20,unitTitle:()=> 'same',choose:()=>{},centerSelection(){}};
vm.createContext(c);vm.runInContext(source.slice(source.indexOf("// A right click orders units"),source.indexOf('function keydown(e)')),c);
const event=(button,x,y,extra={})=>({button,clientX:x,clientY:y,pointerId:1,preventDefault(){},...extra});
function emit(type,button,x,y,extra){handlers['field:'+type](event(button,x,y,extra));}
const origin={x:camera.x,y:camera.y};
emit('pointerdown',2,300,200);emit('pointermove',2,420,240);emit('pointerup',2,420,240);assert.equal(orders,0);assert.equal(camera.x,origin.x-120);assert.equal(camera.y,origin.y-40);assert.deepEqual([...c.selected],[1]);
// Moving away and back must not accidentally issue an order.
emit('pointerdown',2,300,200);emit('pointermove',2,420,240);emit('pointermove',2,300,200);emit('pointerup',2,300,200);assert.equal(orders,0);
emit('pointerdown',2,300,200);emit('pointerup',2,300,200);assert.equal(orders,1);
c.buildKind='tower';emit('pointerdown',2,300,200);emit('pointerup',2,300,200);assert.equal(c.buildKind,null);assert.equal(orders,1);
const prior=camera.x;emit('pointerdown',0,300,200,{altKey:true});emit('pointermove',0,250,200);emit('pointerup',0,250,200);assert.equal(camera.x,prior+50);assert.deepEqual([...c.selected],[1]);
// Keyboard cannot move the world underneath an in-progress selection rectangle.
c.keys.add('d');const before=camera.x;emit('pointerdown',0,100,100);c.updateCamera(.1);assert.equal(camera.x,before);emit('pointercancel',0,100,100);c.keys.clear();
camera.center({x:W/2,y:H/2});c.keys.add('d');const x=camera.x;c.updateCamera(.1);const straight=camera.x-x;c.keys.add('s');const xy={x:camera.x,y:camera.y};c.updateCamera(.1);assert(Math.abs(dist(xy,camera)-straight)<.001,'diagonal camera speed equals straight movement');
c.keys.clear();c.mouse={x:1,y:1};const stopped={x:camera.x,y:camera.y};c.updateCamera(.1);assert.equal(dist(stopped,camera),0,'edge scrolling is opt-in');el('edge-scroll').checked=true;c.updateCamera(.1);assert(dist(stopped,camera)>0);
const under=camera.world({x:300,y:200});handlers['field:wheel']({...event(0,300,200),deltaY:120,deltaMode:0});assert(dist(under,camera.world({x:300,y:200}))<.001,'wheel keeps cursor on same terrain');
console.log('PASS expanded map: 20 distributed horses reachable by all clans; right click vs drag, Alt-pan, preserved selection, cancel, camera speed, opt-in edges and cursor zoom');
