const expeditionAtlas=new Image();let expeditionArtReady=false;
expeditionAtlas.onload=()=>{expeditionArtReady=true;for(const cv of root.querySelectorAll('#r-roster canvas,#r-build-grid canvas'))delete cv.dataset.painted;};expeditionAtlas.src=ART_EXPEDITION;
function expeditionSprite(c,row,frame,x,y,size,flip=false){if(!expeditionArtReady)return false;const cw=expeditionAtlas.width/6,ch=expeditionAtlas.height/4;c.save();c.translate(x,y);if(flip)c.scale(-1,1);c.drawImage(expeditionAtlas,frame*cw,row*ch,cw,ch,-size/2,-size*.94,size,size);c.restore();return true;}
function drawExpeditionBody(u){
 if(!expeditionArtReady||!u.horseId&&!['scout','siege'].includes(u.special))return false;
 const row=u.horseId?1:u.special==='scout'?2:3,moving=(u.movingUntil||0)>game.t,frame=u.anim>0?(u.anim>.17?4:5):moving?Math.floor((u.stride||0)*.4)%4:4,size=u.horseId?90:u.special==='siege'?88:61;
 ctx.save();if(u.stealth)ctx.globalAlpha=.45;
 expeditionSprite(ctx,row,frame,0,moving?-Math.abs(Math.sin(u.stride||0))*.6:0,size,Math.cos(u.angle)<-.1);
 ctx.fillStyle=CLANS[u.team].color;ctx.fillRect(-6,-size*.47,12,3);
 if(u.horseId){ctx.fillStyle='#1c281b';ctx.fillRect(-20,-87,40,3);ctx.fillStyle=u.sprinting?'#efd078':'#96c9dd';ctx.fillRect(-20,-87,40*(u.stamina??100)/100,3);}
 if(u.stealth){ctx.fillStyle='#a7d2ca';ctx.font='10px system-ui';ctx.textAlign='center';ctx.fillText('ลอบเร้น',0,-61);}ctx.restore();return true;
}
function drawHorse(h){
 if(!['wild','catching','leading'].includes(h.status))return;
 const frame=(h.movingUntil||0)>game.t?Math.floor((h.stride||0)*.4)%4:4;
 ctx.save();ctx.translate(h.x,h.y);ellipse(ctx,0,1,25,8,'#0a160c77');expeditionSprite(ctx,0,frame,0,0,72,Math.cos(h.angle||0)<-.1);
 ctx.font='10px system-ui';ctx.textAlign='center';ctx.fillStyle='#ecd7a5';ctx.fillText(h.status==='wild'?'ม้าป่า · คลิกขวาเพื่อจับ':h.status==='catching'?'กำลังจับ '+Math.floor(h.progress*100)+'%':'พากลับคอก',0,-72);
 if(h.status==='leading'){const u=game.units.find(u=>u.id===h.handlerId);if(u){ctx.strokeStyle='#bdac7d';ctx.beginPath();ctx.moveTo(20,-33);ctx.lineTo(u.x-h.x,u.y-h.y-18);ctx.stroke();}}ctx.restore();
}
function expeditionBuildingDetails(b){
 if(!b.complete||b.hp<=0)return;
 ctx.save();ctx.translate(b.x,b.y);
 if(b.kind==='stable'){
  ctx.strokeStyle='#b99b6a';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-55,25);ctx.lineTo(55,25);for(let i=-55;i<=55;i+=22){ctx.moveTo(i,14);ctx.lineTo(i,35);}ctx.stroke();expeditionSprite(ctx,0,4,23,23,50);
  const n=game.horses?.filter(h=>h.stableId===b.id&&h.status==='stabled').length||0;ctx.fillStyle='#f0d394';ctx.font='11px system-ui';ctx.textAlign='center';ctx.fillText('♞ '+n+' ตัว',0,-78);
 }else if(b.kind==='camp'){
  ctx.strokeStyle=CLANS[b.team].color;ctx.setLineDash([4,6]);if(selectedBuilding?.id===b.id){ctx.beginPath();ctx.arc(0,0,160,0,Math.PI*2);ctx.stroke();}ctx.setLineDash([]);ctx.fillStyle='#b9ddc6';ctx.font='22px serif';ctx.fillText('✚',-8,-38);
 }else if(b.kind==='workshop')expeditionSprite(ctx,3,4,20,25,66);
 ctx.restore();
}
