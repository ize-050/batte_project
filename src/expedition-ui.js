function updateExpeditionUI(){
 if(!game?.horses)return;
 const list=own(),workers=list.filter(u=>u.worker),humans=list.filter(u=>!u.worker&&!u.form&&!u.horseId&&u.special!=='siege'&&!u.job),riders=list.filter(u=>u.horseId),scouts=list.filter(u=>u.special==='scout'),b=selectedBuilding;
 const stables=game.structures.filter(b=>b.team===player&&b.kind==='stable'&&b.complete&&b.hp>0),horses=game.horses.filter(h=>h.team===player&&h.status==='stabled');
 $('combat-controls').hidden=!!b||!list.length;
 $('expedition-controls').hidden=!!b||!list.length;
 $('expedition-stock').textContent='♞ ม้าในคอก '+horses.length+' · กำลังขี่ '+game.warriors().filter(u=>u.horseId).length;
 for(const [id,visible]of [['capture',workers.length],['mount',humans.length],['dismount',riders.length],['sprint',riders.length||list.some(u=>u.form==='wolf')],['stealth',scouts.length],['sabotage',scouts.some(u=>u.team===1)]]){$(id).hidden=!visible;$(id).disabled=!game.running||game.over;}
 $('mount').disabled=!game.running||game.over||!horses.length||!game.affordable(RIDING.cost);
 $('capture').disabled=!game.running||game.over||!stables.length;
 $('stealth').textContent=scouts.some(u=>u.stealth)?'ออกจากลอบเร้น [Z]':'ลอบเร้น [Z]';
 $('sprint').textContent=list.some(u=>u.sprinting)?'หยุดเร่ง [X]':'เร่งความเร็ว [X]';
 const mobile=list.find(u=>u.horseId||u.form==='wolf'),scout=scouts[0];
 $('expedition-status').textContent=mobile?(mobile.horseId?'กำลังขี่ม้า':'ร่างหมาป่า')+' · แรง '+Math.floor(mobile.stamina??100)+'/100 · '+(mobile.sprinting?'กำลังเร่ง':'พร้อมเร่ง'):scout?(scout.horseId?'ลงจากม้าก่อนลอบเร้น':scout.stealth?'ลอบเร้น · ถูกพบในระยะคน 85 / ป้อม 180':scout.revealed>0?'ถูกเปิดเผย '+Math.ceil(scout.revealed)+' วิ':'ระยะมองเห็น 430 · Z ลอบเร้น'):'จับม้า: เลือกชาวบ้าน → คลิกขวาม้าป่า → พากลับคอก';
 const candidates=list.filter(u=>!u.horseId&&!u.form&&!u.special&&!u.inTraining&&u.job?.type!=='train'&&(u.worker||u.tier<=2));
 if(list.length&&list.every(u=>u.special))$('training-hint').textContent='หน่วยพิเศษใช้สายอาชีพนี้ถาวร · ไม่ต่อสายร่างวิวัฒน์ 4 ขั้น';
 $('special-training').hidden=!!b||!candidates.length;
 for(const role of Object.keys(SPECIALISTS)){
  const d=SPECIALISTS[role],school=game.structures.find(b=>b.team===player&&b.kind===d.building&&b.hp>0&&b.complete&&b.queue.length<3),button=$('special-'+role);
  button.textContent=d.name+' · '+d.rice+' ข้าว / '+d.water+' น้ำ · '+d.seconds+' วิ';button.disabled=!game.running||game.over||!school||!game.affordable(d)||!candidates.length;button.title=school?'ฝึกจากยูนิตที่เลือก 1 คน':'ต้องมี '+BUILDINGS[d.building].name+' ที่สร้างเสร็จและคิวไม่เต็ม';
 }
 $('expedition-building').hidden=!b||!['stable','camp','workshop','shrine','dojo'].includes(b.kind);
 if(b?.kind==='stable')$('expedition-building').textContent='ม้าในคอก '+game.horses.filter(h=>h.stableId===b.id&&h.status==='stabled').length+' ตัว · เลือกชาวบ้านคลิกขวาม้าป่าเพื่อจับ · เลือกทหารแล้วคลิกขวาคอกเพื่อขึ้นขี่';
 else if(b?.kind==='camp')$('expedition-building').textContent='รักษา 2 HP/วิ ระยะ 160 · 8 ข้าว / 4 น้ำ ต่อ 100 HP · หยุดรักษาเมื่อสู้หรือเสบียงหมด · ฟื้นแรงม้า';
 else if(b?.kind==='shrine'||b?.kind==='dojo')$('expedition-building').textContent='ฝึก'+(b.kind==='shrine'?'สายลับ':'พลหอก')+': เลือกชาวบ้านหรือทหารมนุษย์ → เปิด “ฝึกหน่วยพิเศษ”';
 else if(b?.kind==='workshop'){
  $('expedition-building').textContent='เลือกชาวบ้าน → ฝึกหน่วยพิเศษ → หน่วยเครื่องยิง · โจมตีอาคาร 60 / คน 10 · ยิงทุก 3 วิ';
  $('production').textContent=b.queue.map(q=>{const u=game.units.find(u=>u.id===q.unitId);return q.recipe.name+' · '+(u?.inTraining?Math.ceil(q.remaining)+' วิ':'เดินเข้าโรงฝึก');}).join(' / ')||'ยังไม่มีคิว';
 }
}
$('capture').onclick=()=>{const u=ownWorkers()[0],h=u&&game.horses.filter(h=>h.status==='wild'&&game.visibleAt(h)).sort((a,b)=>dist(a,u)-dist(b,u))[0];const r=h&&game.captureHorse([...selected],h.id);message(r?.ok?'กำลังจับม้าและพากลับคอก':r?.reason||'ยังไม่เห็นม้าป่า · ส่งชาวบ้านสำรวจรอบฐาน');updateUI();};
$('mount').onclick=()=>{const u=own().find(u=>!u.worker&&!u.form&&!u.horseId),b=u&&game.structures.filter(b=>b.team===player&&b.kind==='stable'&&b.complete&&b.hp>0&&game.availableHorse(b)).sort((a,b)=>dist(a,u)-dist(b,u))[0];const r=game.mount([...selected],b?.id);message(r.ok?'ทหารกำลังเดินไปขึ้นม้าที่คอก':r.reason);updateUI();};
$('dismount').onclick=()=>{message(game.dismount([...selected])?'ลงจากม้าแล้ว · ม้ารอให้ชาวบ้านจับกลับคอก':'เลือกทหารที่กำลังขี่ม้า');updateUI();};
$('sprint').onclick=()=>{message(game.sprint([...selected])?'ปรับการเร่งความเร็วแล้ว · ใช้แรง 18/วิ':'ต้องมีแรงอย่างน้อย 20 และเลือกม้าหรือร่างหมาป่า');updateUI();};
$('stealth').onclick=()=>{message(game.toggleStealth([...selected])?'เปลี่ยนโหมดลอบเร้นแล้ว':'เลือกสายลับที่ลงจากม้าและไม่อยู่ระหว่างถูกเปิดเผย');updateUI();};
$('sabotage').onclick=()=>{message(game.sabotage([...selected])?'วางยาเสบียงแล้ว · ถูกเปิดเผย 8 วิ':'สายลับอสรพิษต้องเข้าใกล้ยุ้งฉางหรือฐานศัตรู · คูลดาวน์ 45 วิ');updateUI();};
for(const role of Object.keys(SPECIALISTS))$('special-'+role).onclick=()=>{const d=SPECIALISTS[role],b=game.structures.find(b=>b.team===player&&b.kind===d.building&&b.complete&&b.hp>0&&b.queue.length<3),r=game.trainSpecial(b,[...selected],role);if(r.ok){selectedBuilding=b;selected.clear();}message(r.ok?'เริ่มฝึก'+d.name+' · ดูคิวที่อาคาร':r.reason);updateUI();};
$('expedition-demo').onclick=()=>{if(online?.active)return;reset();game.setupExpedition();game.running=game.started=true;$('start').textContent='พัก [P]';$('clan').disabled=true;$('intro').hidden=true;choose(game.warriors().filter(u=>!u.form));camera.center(game.structures.find(b=>b.team===player&&b.kind==='stable')||STARTS[player]);message('ทดลองกองบุก · มีม้าในคอก 1 ตัว / สายลับ / พลหอก / เครื่องยิง · เลือกยูนิตใช้คำสั่งใหม่');updateUI();};
