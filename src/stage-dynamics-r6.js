/* Original layered 2D sets and restrained environmental animation.
 * Locations identify inspiration; geometry is not a 1:1 Capcom reconstruction.
 * No gameplay collision, damage, RNG consumption or persistent state. */
(function(root){'use strict';
const W=1280,H=720,FLOOR=568;
const nativeSets=Object.freeze({nest_escape_2019:'lift',nest2_weapon_test_2020:'disposal',village_lake_2023:'lake',processing_area_morgue_2017:'morgue'});
const interior=new Set(['spencer_hall','spencer_lab','rpd_hall','nest','dead_factory','antarctic','salazar_castle','queen_zenobia','dimitrescu','heisenberg','ark','nest2_weapon_test_2020','castle_dungeon_2023','specimen_storage_2023','ancient_chantry_2023','guest_house_attic_2017','baker_garage_2017','processing_area_morgue_2017','old_house_lantern_2017','testing_area_2017','eveline_corridor_2017']);
const hash=s=>{let x=2166136261;for(const c of String(s||'')){x^=c.charCodeAt(0);x=Math.imul(x,16777619);}return x>>>0;};
function describe(stage){
 const kind=nativeSets[stage?.id]||null,inside=interior.has(stage?.id)||['lab','ship','furnace'].includes(stage?.re5Scene);
 const weather=String(stage?.weather||'none');
 return {id:stage?.id||'',kind,native:!!kind,interior:inside,precipitation:!inside&&/rain|snow|storm/.test(weather),
  motifs:kind==='lift'?['machinerie verticale','câbles','feux de maintenance']:kind==='disposal'?['cuve','volets techniques','indicateurs']:kind==='lake'?['rides de surface','jetée','brume']:kind==='morgue'?['tables','grilles','luminaires']:inside?['ventilation','éclairage local']:['ambiance extérieure'],
  geometry:'Scénographie originale adaptée au duel 2D ; géométrie non certifiée 1:1.',damaging:false};
}
function tools(c){
 return {
 rect:(x,y,w,h,col)=>{c.fillStyle=col;c.fillRect(x,y,w,h);},
 line:(x,y,u,v,col,width=1)=>{c.strokeStyle=col;c.lineWidth=width;c.beginPath();c.moveTo(x,y);c.lineTo(u,v);c.stroke();},
 poly:(pts,col)=>{c.fillStyle=col;c.beginPath();pts.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fill();},
 label:(txt,x,y,size=11,col='#b4b5a8')=>{c.fillStyle=col;c.font=size+'px monospace';c.textAlign='left';c.fillText(txt,x,y);},
 glow:(x,y,r,color,opacity)=>{const g=c.createRadialGradient(x,y,1,x,y,r);g.addColorStop(0,color+opacity);g.addColorStop(1,color+'00');c.fillStyle=g;c.fillRect(x-r,y-r,2*r,2*r);}
 };
}
function drawBase(c,stage,time=0,camera=0,preview=false,options={}){
 const d=describe(stage);if(!d.native)return false;
 const t=options.reducedMotion?0:Number.isFinite(time)?Math.max(0,time):0,seed=hash(d.id)%997,{rect,line,poly,label,glow}=tools(c);
 c.save();
 const sky=c.createLinearGradient(0,0,0,H);sky.addColorStop(0,d.kind==='lake'?'#263635':'#10181c');sky.addColorStop(1,'#060a0d');rect(0,0,W,H,sky);
 c.save();c.translate(-Math.max(-14,Math.min(14,(Number(camera)||0)*.035)),0);
 if(d.kind==='lift'){
  rect(114,0,1052,557,'#131f24');
  // Elevator shaft landmarks travel behind the platform, never through the fighters.
  const offset=(t*34)%190;
  for(let i=-1;i<4;i++){const y=i*190+offset;rect(142,y,996,12,'#3e4d4f');line(155,y+14,1100,y+150,'#344348',9);line(1100,y+14,155,y+150,'#26393f',7);rect(194,y+36,68,12,'#a87849');}
  for(const x of[82,130,1150,1198]){rect(x,0,9,566,'#526268');line(x+2,0,x+2,563,'#9aa09a',1);}
  for(const x of[58,1174]){rect(x,0,48,564,'#29383d');rect(x+6,0,5,564,'#748282');for(let y=30;y<520;y+=60){rect(x+18,y,9,15,'#111b20');}}
  rect(115,402,1046,5,'#a6aaa0');for(let x=120;x<1160;x+=91)line(x,404,x,486,'#687875',4);rect(115,446,1046,4,'#536567');
  for(const x of[202,1000]){rect(x,448,74,38,'#24383f');rect(x+9,457,48,6,'#b7854d');glow(x+28,460,62,'#b97b42','26');}
  label('NEST / ÉVACUATION',466,118,25,'#b5c6c3');label('ÉLÉVATEUR — SCÉNOGRAPHIE DE SIMULATION',420,143,12);
 }else if(d.kind==='disposal'){
  poly([[85,173],[305,82],[972,82],[1195,173],[1110,489],[171,489]],'#2c3c3a');
  for(let i=0;i<10;i++){const x=150+i*101;line(641,118,x,484,'#54605a',7);}
  c.fillStyle='#132320';c.beginPath();c.ellipse(640,318,418,154,0,0,Math.PI*2);c.fill();
  c.strokeStyle='#63776b';c.lineWidth=12;c.beginPath();c.ellipse(640,327,432,161,0,0,Math.PI*2);c.stroke();
  for(let i=0;i<11;i++){const a=Math.PI+i*Math.PI/10;line(640+Math.cos(a)*430,327+Math.sin(a)*161,640+Math.cos(a)*401,327+Math.sin(a)*146,'#a6a58d',4);}
  for(const x of[44,1116]){rect(x,273,120,209,'#364a49');for(let j=0;j<3;j++){rect(x+15,292+j*55,90,38,'#172729');rect(x+25,303+j*55,8,14,'#83a699');line(x+48,308+j*55,x+90,308+j*55,'#69796b',3);}}
  rect(358,465,562,38,'#253236');for(let x=372;x<900;x+=28)line(x,471,x+13,495,'#a39755',7);
  label('NEST 2 / CHAMBRE D’ESSAI',370,54,24,'#bdcbbf');label('INSTALLATIONS DE FOND — NON UTILISABLES COMME ARMES',373,78,10);
 }else if(d.kind==='lake'){
  const moon=c.createRadialGradient(973,114,4,973,114,160);moon.addColorStop(0,'#a6b7a533');moon.addColorStop(1,'#9caeaa00');rect(800,0,340,320,moon);
  for(let i=0;i<34;i++){const x=i*43-80,y=172+(Math.sin(i*3+seed)+1)*23;poly([[x,339],[x+27,y],[x+53,337]],i%2?'#172829':'#1d3030');}
  poly([[0,289],[169,282],[243,310],[412,302],[647,313],[956,281],[1280,287],[1280,375],[0,375]],'#273c36');
  rect(0,327,W,207,'#1c3e40');
  for(let i=0;i<44;i++){const y=331+i*4.3,x=(i*113+Math.sin(t*.31+i)*19)%1280;line(x,y,x+30+i*2.5,y,'#91a39936');}
  poly([[18,342],[37,283],[113,252],[203,296],[204,353]],'#2c3531');poly([[11,286],[115,235],[218,292]],'#444f47');rect(128,305,40,42,'#142425');
  for(const x of[116,323,907,1125]){rect(x,436,15,121,'#423d2d');rect(x+1,436,4,121,'#796e50');}
  line(114,471,324,455,'#8b8160',5);line(908,455,1140,472,'#8b8160',5);
  for(let i=0;i<5;i++){const x=430+i*80;line(x,448,x+20,449,'#bac8b33c',2);}
  label('VILLAGE / LAC',485,86,25,'#bec8b5');label('JETÉE DE SIMULATION — PROFONDEUR VISUELLE',420,110,12);
 }else if(d.kind==='morgue'){
  rect(0,134,W,346,'#30403c');for(let y=145;y<475;y+=34)line(0,y,1280,y,'#56615a');for(let x=0;x<1280;x+=70)line(x,135,x,474,'#4a5953');
  for(let i=0;i<3;i++){const x=44+i*224;rect(x,214,174,215,'#1b2627');rect(x+7,221,160,204,'#111c1d');for(let j=0;j<8;j++)line(x+16+j*20,223,x+16+j*20,425,'#697572',4);}
  for(const x of[155,580,998]){line(x,432,x-23,486,'#56625e',7);line(x+180,432,x+200,486,'#56625e',7);poly([[x-28,405],[x+176,405],[x+207,438],[x-47,438]],'#8b9490');rect(x-46,438,252,8,'#3b4c48');}
  rect(829,160,339,231,'#354643');for(let j=0;j<3;j++){rect(842,173+j*68,309,56,'#717e75');line(851,177+j*68,1138,177+j*68,'#b1b4a5');rect(957,199+j*68,68,9,'#303a36');}
  for(const x of[389,758]){line(x,0,x,195,'#8b8b73',2);c.strokeStyle='#8b8b73';c.lineWidth=3;c.beginPath();c.arc(x,204,9,-1.2,2.1);c.stroke();}
  label('DULVEY / ZONE DE TRAITEMENT',371,95,22,'#c8c7ab');label('MORGUE — COMPOSITION ORIGINALE POUR LE DUEL',414,118,11);
 }
 c.restore();
 const floor=c.createLinearGradient(0,492,0,H);floor.addColorStop(0,d.kind==='lake'?'#4d4936':'#425152');floor.addColorStop(1,'#0a1014');rect(0,490,W,H-490,floor);
 if(d.kind==='lake'){for(let y=500;y<720;y+=29){line(0,y,1280,y,'#1d2725',3);for(let i=0;i<8;i++){const x=i*181+(y%2)*14;line(x,y,x,y+26,'#202a27',2);rect(x+9,y+10,3,3,'#939174');}}}
 else{for(let x=-800;x<2000;x+=125)line(640+(x-640)*.3,490,x,720,'#17262c',2);for(const y of[510,548,601,678])line(0,y,W,y,'#17262c',2);}
 line(0,FLOOR,W,FLOOR,'#a5aa8a25');
 c.restore();return true;
}
function drawAmbient(c,stage,time=0,options={}){
 if(!c)return;const d=describe(stage),t=options.reducedMotion?0:Math.max(0,Number(time)||0),seed=hash(stage?.id)%991;
 const {rect,line,glow}=tools(c);c.save();
 if(d.interior){
  // Lamps modulate slowly and locally. Never simulate a strobe or add weather indoors.
  for(const x of[174,1106]){const intensity=.07+(Math.sin(t*.6+seed)+1)*.018;glow(x,80,104,'#c7c8a2',Math.round(intensity*255).toString(16).padStart(2,'0'));rect(x-29,72,58,3,'#b3b6a180');}
  if(['lab','furnace'].includes(stage?.re5Scene)||/nest|spencer_lab/.test(d.id)){
   c.save();c.translate(1114,155);c.rotate(t*.4);for(let j=0;j<3;j++){c.rotate(Math.PI*2/3);c.fillStyle='#75888720';c.beginPath();c.ellipse(15,0,22,6,0,0,Math.PI*2);c.fill();}c.restore();
  }
 }else if(options.precipitation!==false&&d.precipitation&&t){
  const snow=/snow/.test(stage.weather);c.strokeStyle='#abbcb72b';c.lineWidth=1;c.beginPath();
  for(let i=0;i<42;i++){const x=(i*173+seed+t*(snow?7:29))%1340-30,y=(i*87+t*(snow?17:267))%H;c.moveTo(x,y);c.lineTo(x+(snow?0:-5),y+(snow?2:18));}c.stroke();
 }
 if(!options.reducedMotion&&t&&/dust|ash|ember|spore/.test(String(stage?.weather||''))){
  const hot=/ember/.test(stage.weather);c.globalAlpha=.25;c.fillStyle=hot?'#c39762':'#b4b8a4';
  for(let i=0;i<18;i++){const x=(i*197+seed+Math.sin(t*.3+i)*12)%W,y=(i*73+t*(hot?-14:8)+1200)%480+20;c.fillRect(x,y,i%3?1:2,i%3?1:2);}
 }
 if(!d.interior&&!options.reducedMotion&&['lake','water'].includes(d.kind||stage?.re5Scene)){
  for(let i=0;i<3;i++){c.globalAlpha=.05;c.fillStyle='#aabbb0';c.beginPath();c.ellipse(((i*487+seed+t*7)%1800)-200,367+i*22,235,18,0,0,Math.PI*2);c.fill();}
 }
 c.restore();
}
root.RE_STAGE_DYNAMICS=Object.freeze({describe,drawBase,drawAmbient,nativeSets});
})(globalThis);
