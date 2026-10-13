// A small command layer gives every match a clear reason to send an army out.
const relicStatus=document.createElement('div');relicStatus.id='r-relic-status';relicStatus.className='r-relic-status';$('battle-watch').after(relicStatus);
const armyOrders=root.querySelector('.r-army-extra');armyOrders.classList.add('r-army-orders');armyOrders.innerHTML='<button id="r-rally" class="cursor-interaction">⊙ รวมพล</button><button id="r-defend" class="cursor-interaction">⌂ ตั้งรับฐาน</button><button id="r-assault" class="cursor-interaction">⚔ บุกศาลากลาง</button><button id="r-retreat" class="cursor-interaction">↩ ถอยทั้งกอง</button>';
function commandWholeArmy(kind){
 const army=game.warriors().filter(u=>!u.inTraining);if(!game.running||game.over){message('เริ่มเกมก่อนจึงจะสั่งกองทัพได้');return;}if(!army.length){message('ยังไม่มีทหารให้สั่งการ');return;}
 selectedBuilding=null;selected=new Set(army.map(u=>u.id));const ids=[...selected],home=STARTS[player],side=home.x<W/2?1:-1;
 if(kind==='rally'){const point=game.world.free({x:home.x+side*170,y:home.y+(home.y<H/2?105:-105)});game.issue(ids,'move',point);message('รวมพลแล้ว · กองทัพกำลังตั้งขบวนหน้าฐาน');}
 if(kind==='defend'){game.issue(ids,'move',home);message('ตั้งรับฐาน · กองทัพกำลังกลับไปคุ้มกันศาลาบัญชาการ');}
 if(kind==='assault'){game.issue(ids,'advance',game.relic);message('บุกศาลากลาง · ยึด 6 วิ แล้วครองครบ 45 วิจะชนะทันที');}
 if(kind==='retreat'){game.issue(ids,'move',home);message('ถอยทั้งกองกลับฐาน');}
 updateUI();
}
$('rally').onclick=()=>commandWholeArmy('rally');$('defend').onclick=()=>commandWholeArmy('defend');$('assault').onclick=()=>commandWholeArmy('assault');$('retreat').onclick=()=>commandWholeArmy('retreat');
const updateCompactHUDBase=updateCompactHUD;updateCompactHUD=()=>{updateCompactHUDBase();relicStatus.textContent=game.relicStatus?.()||'ศาลากลาง · กำลังเตรียม';};
