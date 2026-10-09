// Art is rendered from individual sprite regions; every unit and building remains a live simulation entity.
const walkAtlas=new Image();let walkReady=false;walkAtlas.onload=()=>{walkReady=true;};walkAtlas.src=ART_WALK;
const atlas=new Image(),groundArt=new Image(),pondArt=new Image();let artReady=false,groundReady=false,pondReady=false;
const SPRITES=[
 [0,0,329,318],[330,0,291,318],[622,0,315,319],[943,0,311,325],
 [0,313,348,311],[350,327,273,282],[628,322,306,294],[938,331,316,282],
 [0,622,309,282],[329,618,294,290],[640,602,292,310],[938,641,316,267],
 [5,918,241,320],[282,908,340,333],[630,918,237,323],[941,917,313,324]
];
function sprite(c,index,x,y,w,h,flip=false){const r=SPRITES[index];if(!artReady||!r)return false;const height=h||w*r[3]/r[2];c.save();c.translate(x,y);if(flip)c.scale(-1,1);c.drawImage(atlas,...r,-w/2,-height,w,height);c.restore();return true;}
const BUILD_ART={hq:4,hut:5,dojo:6,archery:7,well:8,store:9,tower:10,shrine:4,warhall:4,stable:5,camp:5,workshop:6};
// Four painted gait frames per role, driven by actual distance travelled.
function unitArtIndex(u){return u.worker?12:['adept','mystic'].includes(u.role)?15:u.ranged?14:13;}
function drawWalkingBody(u){
 if(drawExpeditionBody(u))return;
 if(u.form&&drawAscendedBody(ctx,u))return;
 const walking=(u.movingUntil||0)>game.t,frame=walking?Math.floor((u.stride||0)*.6)%4:0;
 const row=u.worker?0:['adept','mystic'].includes(u.role)?3:u.ranged?2:1;
 const bob=walking?-Math.abs(Math.sin(u.stride||0))*.6:0;
 ctx.save();if(Math.cos(u.angle)<-.1)ctx.scale(-1,1);
 if(u.tier>=3){ctx.fillStyle=CLANS[u.team].dark;ctx.beginPath();ctx.moveTo(-7,-34);ctx.lineTo(-13-(walking?Math.sin(u.stride)*3:0),-9);ctx.lineTo(6,-14);ctx.lineTo(8,-33);ctx.fill();ctx.strokeStyle=CLANS[u.team].color;ctx.lineWidth=1;ctx.stroke();}
 ctx.save();ctx.translate(0,bob);if(u.harvesting)ctx.rotate(Math.sin(u.walk*2)*.09);else if(u.anim>0)ctx.rotate(Math.sin(u.anim*12)*.08);
 if(walkReady){const cw=walkAtlas.width/4,ch=walkAtlas.height/4;ctx.drawImage(walkAtlas,frame*cw,row*ch,cw,ch,-29,-56,58,58);}else sprite(ctx,unitArtIndex(u),0,0,38,49);
 ctx.restore();
 if(u.special==='spear'){ctx.strokeStyle='#e5cf96';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(9,1);ctx.lineTo(25,-67);ctx.stroke();ctx.fillStyle='#ced9c3';ctx.beginPath();ctx.moveTo(21,-62);ctx.lineTo(29,-62);ctx.lineTo(29,-77);ctx.closePath();ctx.fill();}
 if(u.tier>=2){ctx.strokeStyle='#d5b65f';ctx.lineWidth=1.6;ctx.beginPath();ctx.moveTo(-7,-30);ctx.lineTo(-1,-27);ctx.lineTo(7,-32);ctx.stroke();}
 if(u.harvesting){ctx.strokeStyle='#f7e6ac';ctx.lineWidth=1.7;ctx.beginPath();ctx.arc(13,-12,10,Math.sin(u.walk)*.4,Math.PI*1.2);ctx.stroke();}
 if(u.cargo>0)ellipse(ctx,-6,-24,5,7,u.cargoType==='rice'?'#c6ad67':'#528d9c');
 ctx.restore();
}
function richUnit(u){if(!artReady)return false;
 if(u.hp<=0){ctx.save();ctx.globalAlpha=Math.max(0,.45-(game.t-u.deadAt)/15);ctx.translate(u.x,u.y);ctx.rotate(-Math.PI/2);if(u.form&&formsReady)formSprite(ctx,u.team,0,0,0,55);else sprite(ctx,unitArtIndex(u),0,0,34,39);ctx.restore();return true;}
 ctx.save();ctx.translate(u.x,u.y);ellipse(ctx,3,2,14,5,'#09110bb0');const picked=u.team===player&&selected.has(u.id);
 if(picked){ctx.strokeStyle='#e1c373';ctx.lineWidth=1.5;ctx.beginPath();ctx.ellipse(0,1,17,8,0,0,Math.PI*2);ctx.stroke();}
 drawWalkingBody(u);
 if(u.tier>1){ctx.fillStyle=u.tier===4?'#ffdd88':'#d8c276';ctx.font='bold 10px serif';ctx.textAlign='center';ctx.fillText(['','','II','III','IV'][u.tier],0,u.form?(u.tier===4?-99:-81):-61);}
 if(u.flash>0)ellipse(ctx,0,-27,13,16,'#fff5ca55');
 if(u.shield>0){ctx.strokeStyle='#dfc67699';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(0,-24,19,28,0,0,Math.PI*2);ctx.stroke();}
 if(u.poison>0)ellipse(ctx,-8,-14,5,3,'#94c66f99');
 if(picked||u.hp<u.max||u.team!==player){ctx.fillStyle='#04170d';ctx.fillRect(-16,u.form?(u.tier===4?-92:-75):-55,32,3);ctx.fillStyle=u.team===player?'#64c38b':'#d26f56';ctx.fillRect(-16,u.form?(u.tier===4?-92:-75):-55,32*u.hp/u.max,3);}
 ctx.restore();return true;
}
function richBuilding(b,ghost=false){if(!artReady||!b.complete&&!ghost)return false;const idx=BUILD_ART[b.kind];if(idx===undefined)return false;ctx.save();ctx.translate(b.x,b.y);if(b.hp<=0){ellipse(ctx,0,3,b.w*.7,b.h*.4,'#282d21');for(let i=0;i<8;i++){ctx.fillStyle=i%2?'#5e553b':'#3a3b2b';ctx.fillRect(-45+i*11,Math.sin(i*7)*13,19,7);}ctx.restore();return true;}
 const width={hq:214,hut:133,dojo:170,archery:172,well:87,store:147,tower:119,shrine:160,warhall:235,stable:170,camp:145,workshop:175}[b.kind];const height=width*SPRITES[idx][3]/SPRITES[idx][2]*.83;ellipse(ctx,12,10,width*.47,width*.16,'#0a100db0');if(selectedBuilding?.id===b.id&&!ghost){ctx.strokeStyle='#e9ce77';ctx.lineWidth=1.3;ctx.beginPath();ctx.ellipse(0,7,width*.48,width*.2,0,0,Math.PI*2);ctx.stroke();}sprite(ctx,idx,0,b.h/2+12,width,height);if(b.kind==='shrine'){ellipse(ctx,0,-30,12,6,'#8cd7ca99');ctx.fillStyle='#c7ffdc';ctx.font='24px serif';ctx.textAlign='center';ctx.fillText('✦',0,-35);}if(b.kind==='warhall'){ctx.fillStyle='#edc35a';ctx.font='25px serif';ctx.textAlign='center';ctx.fillText('♛',0,-62);}if(b.kind==='tower'){sprite(ctx,14,0,-39,22,29);ctx.fillStyle='#f8d379';ctx.font='bold 12px serif';ctx.textAlign='center';ctx.fillText('Lv.'+(b.level||1),0,-78);if(b.anim>0){ctx.strokeStyle='#fff0a3';ctx.beginPath();ctx.moveTo(7,-55);ctx.lineTo(27,-57);ctx.stroke();}}if(!ghost){const clan=CLANS[b.team];ctx.fillStyle='#091c13';ctx.fillRect(-31,-height+b.h/2,62,4);ctx.fillStyle=clan.color;ctx.fillRect(-31,-height+b.h/2,62*b.hp/b.max,4);ctx.fillStyle='#eadcb1';ctx.font='10px "Noto Sans Thai",sans-serif';ctx.textAlign='center';ctx.shadowColor='#000';ctx.shadowBlur=4;ctx.fillText(b.kind==='hq'?'ค่าย'+clan.name:BUILDINGS[b.kind].name,0,b.h/2+26);if(b.queue?.length)ctx.fillText('ฝึก '+b.queue.length+' คน',0,b.h/2+39);}ctx.restore();return true;
}
function richPortrait(item){if(!artReady||!item)return false;const g=pc.createLinearGradient(0,0,120,132);g.addColorStop(0,'#153626');g.addColorStop(1,'#040e08');pc.fillStyle=g;pc.fillRect(0,0,120,132);pc.strokeStyle='#a78b49';pc.strokeRect(4,4,112,124);if(item.building){const index=BUILD_ART[item.kind];sprite(pc,index,60,115,110,103);}else if((item.horseId||['scout','siege'].includes(item.special))&&expeditionArtReady){expeditionSprite(pc,item.horseId?1:item.special==='scout'?2:3,4,60,121,120);}else if(item.form&&formsReady){formSprite(pc,item.team,0,60,119,122);if(item.tier===4){pc.fillStyle='#edd89d';pc.font='11px serif';pc.textAlign='center';pc.fillText('IV · จอมทัพ',60,19);}}else{const index=unitArtIndex(item);const r=SPRITES[index];pc.save();pc.beginPath();pc.rect(6,6,108,120);pc.clip();pc.drawImage(atlas,r[0],r[1],r[2],r[3]*.63,9,9,103,137);pc.restore();}return true;}
function richTree(c,p){if(!artReady)return false;const index=Math.floor(p.x*3+p.y)%9===0?1:Math.floor(p.x+p.y)%4===0?2:0;const w=p.s*3.2;ellipse(c,p.x+13,p.y+4,w*.35,w*.14,'#05130970');sprite(c,index,p.x,p.y+8,w,w*(index===1?1.45:1.03));return true;}
function paintRichTerrain(){if(!artReady||!groundReady)return;const noise=seeded(3185);tc.clearRect(0,0,W,H);for(let y=0;y<H;y+=400)for(let x=0;x<W;x+=400){tc.save();tc.translate(x+200,y+200);tc.rotate(((x/400+y/400)%4)*Math.PI/2);tc.drawImage(groundArt,-200,-200,400,400);tc.restore();}tc.fillStyle='#30412b48';tc.fillRect(0,0,W,H);
 // Worn paths follow the same routes as the navigable map.
 const paths=[[{x:380,y:380},{x:800,y:480},{x:2400,y:480},{x:2820,y:380}],[{x:380,y:2020},{x:800,y:1920},{x:2400,y:1920},{x:2820,y:2020}],[{x:380,y:380},{x:260,y:1000},{x:760,y:1200},{x:1240,y:1510},{x:960,y:1730},{x:380,y:2020}],[{x:2820,y:380},{x:2990,y:900},{x:2800,y:1220},{x:2320,y:1200},{x:2820,y:2020}],[{x:760,y:1200},{x:2440,y:1200}]];
 for(const points of paths){tc.lineCap='round';tc.lineJoin='round';for(const [width,color]of [[100,'#463f2855'],[72,'#86744b50'],[46,'#aa95603a']]){tc.beginPath();points.forEach((p,i)=>i?tc.lineTo(p.x,p.y):tc.moveTo(p.x,p.y));tc.lineWidth=width;tc.strokeStyle=color;tc.stroke();}}
 for(const b of STARTS){const g=tc.createRadialGradient(b.x,b.y,15,b.x,b.y,210);g.addColorStop(0,'#b7995c66');g.addColorStop(1,'#94804c00');tc.fillStyle=g;tc.fillRect(b.x-220,b.y-220,440,440);}
 tc.beginPath();for(let y=-20;y<H+20;y+=10){const x=riverX(y);y===-20?tc.moveTo(x,y):tc.lineTo(x,y);}for(const [w,col]of [[185,'#273a2b'],[163,'#6b6c47'],[145,'#465c4e'],[115,'#344e47'],[68,'#384a3b']]){tc.lineWidth=w;tc.strokeStyle=col;tc.stroke();}for(let i=0;i<1600;i++){const y=noise()*H,x=riverX(y)+(noise()-.5)*132;tc.strokeStyle=i%4?'#a4ae8425':'#d2caa841';tc.lineWidth=.5+noise();tc.beginPath();tc.moveTo(x,y);tc.lineTo(x+2+noise()*8,y+5+noise()*20);tc.stroke();}
 for(const y of BRIDGES){const x=riverX(y);ellipse(tc,x+8,y+19,140,66,'#0d1c18aa');tc.fillStyle='#6d6d53';tc.fillRect(x-122,y-51,244,102);for(let row=0;row<5;row++)for(let col=0;col<12;col++){tc.fillStyle=['#7b7e60','#696e52','#8c8c6d','#5c6b4e'][(row+col)%4];tc.fillRect(x-119+col*20+(row%2?4:0),y-47+row*19,18,17);}for(const side of [-1,1])for(let i=0;i<13;i++){tc.fillStyle=i%3?'#727957':'#8a8c6a';tc.fillRect(x-127+i*20,y+side*54-13,18,23);tc.fillStyle='#485c36';tc.fillRect(x-127+i*20,y+side*54-14,18,5);}}
 for(let i=0;i<16000;i++){const x=noise()*W,y=noise()*H;if(world.water({x,y}))continue;tc.fillStyle=['#81905b30','#3b4a2435','#a3956538'][i%3];tc.fillRect(x,y,1+noise()*3,noise()*4);}
 for(const p of world.trees)richTree(tc,p);for(const p of EXPANSIONS){sprite(tc,3,p.x,p.y,115,117);}
 draw();
}
atlas.onload=()=>{artReady=true;paintRichTerrain();};groundArt.onload=()=>{groundReady=true;paintRichTerrain();};atlas.onerror=groundArt.onerror=()=>message('โหลดภาพไม่สำเร็จ · ลองรีเฟรชหน้าอีกครั้ง');
atlas.src=ART_ATLAS;groundArt.src=ART_GROUND;pondArt.onload=()=>{pondReady=true;};pondArt.src=ART_POND;

function paintCommandIcons(){for(const button of $('build-grid').children){const cv=button.querySelector('canvas');if(!cv||cv.dataset.painted)continue;const c=cv.getContext('2d');sprite(c,BUILD_ART[button.dataset.kind],36,44,66,42);cv.dataset.painted='true';}for(const button of $('roster').children){const cv=button.querySelector('canvas');if(!cv||cv.dataset.painted)continue;const u=game.units.find(u=>u.id===Number(button.dataset.id));if(!u)continue;const c=cv.getContext('2d'),r=SPRITES[unitArtIndex(u)];if((u.horseId||['scout','siege'].includes(u.special))&&expeditionArtReady){expeditionSprite(c,u.horseId?1:u.special==='scout'?2:3,4,20,40,44);cv.dataset.painted='true';continue;}if(u.form&&formsReady){formSprite(c,u.team,0,20,41,47);cv.dataset.painted='true';continue;}c.drawImage(atlas,r[0],r[1],r[2],r[3]*.65,0,0,40,44);cv.dataset.painted='true';}}
