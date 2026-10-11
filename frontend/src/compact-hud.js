// Compact command categories keep the battlefield large without removing orders.
const commandPanel=root.querySelector('.r-commands');
let lastHUDSelection='',battleWatchIndex=0;
function selectCommandDeck(deck){
 commandPanel.dataset.deck=deck;
 for(const b of commandPanel.querySelectorAll('.r-command-tabs [data-deck]'))b.setAttribute('aria-pressed',String(b.dataset.deck===deck));
 commandPanel.scrollTop=0;
}
for(const b of commandPanel.querySelectorAll('.r-command-tabs [data-deck]'))b.onclick=()=>selectCommandDeck(b.dataset.deck);
$('hud-size').onclick=()=>{const expanded=root.classList.toggle('r-hud-expanded');$('hud-size').setAttribute('aria-expanded',String(expanded));$('hud-size').title=expanded?'ย่อแผง เพิ่มพื้นที่สนามรบ':'ขยายแผงคำสั่ง';};
function currentBattleSignals(){return online?.active?(game.battleActivity||[]).filter(e=>game.t-e.t<6):game.battleSignals();}
$('battle-watch').onclick=()=>{const signals=currentBattleSignals();if(!signals.length)return;const signal=signals[battleWatchIndex++%signals.length];camera.center(signal);message(signal.own?'จุดปะทะของฝ่ายเรา':'พบการรบของฝ่ายอื่นบริเวณนี้ · ส่งหน่วยสำรวจเพื่อเห็นรายละเอียด');};
function updateCompactHUD(){
 const type=selectedBuilding?'building':ownWorkers().length&&own().every(u=>u.worker)?'worker':own().length?'army':'empty';
 if(type!==lastHUDSelection){lastHUDSelection=type;selectCommandDeck('main');}
 commandPanel.querySelector('[data-deck="build"]').disabled=type!=='worker';
 commandPanel.querySelector('[data-deck="train"]').disabled=type!=='army';
 commandPanel.querySelector('[data-deck="horse"]').disabled=type==='empty'||type==='building';
 const signals=currentBattleSignals();$('battle-watch').disabled=!signals.length;$('battle-watch').textContent=signals.length?'⚔ จุดปะทะ '+signals.length+' · คลิกดู':'⚔ ยังไม่มีการปะทะ';
}
function drawBattleSignals(context){
 for(const a of currentBattleSignals()){
  const x=a.x/W*240,y=a.y/H*180;
  context.save();context.strokeStyle=context.fillStyle=a.own?'#ff6254':'#ffbd66';context.globalAlpha=.65+.35*Math.sin(game.t*7)**2;context.lineWidth=1.8;
  context.beginPath();context.arc(x,y,6+(game.t*2%1)*5,0,Math.PI*2);context.stroke();context.font='bold 11px sans-serif';context.textAlign='center';context.fillText('⚔',x,y+4);context.restore();
 }
}
