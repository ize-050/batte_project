// Equal-cell atlas: rows tiger / naga / crane / wolf; four gait + two attack frames.
const formAtlas=new Image();let formsReady=false;
formAtlas.onload=()=>{formsReady=true;for(const cv of root.querySelectorAll('#r-roster canvas'))delete cv.dataset.painted;paintAscensionCards();};
formAtlas.onerror=()=>message('โหลดภาพร่างวิวัฒน์ไม่สำเร็จ · ลองรีเฟรชหน้า');formAtlas.src=ART_FORMS;
function formSprite(c,team,frame,x,y,size,flip=false){
 if(!formsReady)return false;
 const w=formAtlas.width/6,h=formAtlas.height/4;
 c.save();c.translate(x,y);if(flip)c.scale(-1,1);c.drawImage(formAtlas,frame*w,team*h,w,h,-size/2,-size*.94,size,size);c.restore();return true;
}
function drawAscendedBody(c,u){
 if(!formsReady)return false;
 const walking=(u.movingUntil||0)>game.t,attacking=u.anim>0;
 const frame=attacking?(u.anim>.17?4:5):walking?Math.floor((u.stride||0)*.5)%4:0;
 const empowered=u.awakened>0,size=u.tier===4?91:78,flip=Math.cos(u.angle)<-.1;
 c.save();
 if(u.tier===4||empowered){const color=CLANS[u.team].color;c.strokeStyle=color;c.globalAlpha=empowered?.75:.3;c.lineWidth=empowered?2:1;c.beginPath();c.ellipse(0,1,empowered?26:21,empowered?10:7,0,0,Math.PI*2);c.stroke();c.globalAlpha=1;}
 if(empowered){c.shadowColor=CLANS[u.team].color;c.shadowBlur=10+Math.sin(game.t*8)*3;}
 const bob=walking?-Math.abs(Math.sin(u.stride||0))*(u.form==='naga'?.7:1.8):Math.sin(game.t*2+u.id)*.35;
 const age=game.t-(u.transformedAt??-99),emerging=age<1.3;
 if(emerging){c.globalAlpha=.35+.65*Math.min(1,age/1.3);c.shadowColor=CLANS[u.team].color;c.shadowBlur=16;}
 formSprite(c,u.team,frame,0,bob,size,flip);
 c.shadowBlur=0;c.globalAlpha=1;
 if(empowered){c.font='bold 9px system-ui';c.textAlign='center';c.fillStyle='#f6e2a1';c.fillText((u.form==='wolf'?'คลั่ง ':u.form==='tiger'?'เกราะ ':u.form==='naga'?'พิษ ': 'พร ')+Math.ceil(u.awakened)+'s',0,-110);}
 c.restore();return true;
}
function paintAscensionCards(){
 for(const cv of root.querySelectorAll('canvas[data-form-team]')){
  const team=Number(cv.dataset.formTeam),c=cv.getContext('2d');c.clearRect(0,0,cv.width,cv.height);
  const g=c.createRadialGradient(60,62,5,60,62,65);g.addColorStop(0,CLANS[team].dark+'bb');g.addColorStop(1,'#09170d00');c.fillStyle=g;c.fillRect(0,0,120,120);
  formSprite(c,team,0,60,109,112);
 }
}
