/* R14 • Three authored RE7-inspired 2D sets.
 * Original geometry and passive animation, NOT a 1:1 map or Capcom artwork.
 * Pure rendering: no game RNG, actors, collisions, audio, clocks or storage.
 * Rain is restricted to the exterior aperture behind its glass and frames.
 */
(function(root){'use strict';
 const W=1280,H=720,FLOOR=568,LAYER_NAMES=Object.freeze(['all','architecture','props','light','ambient']);
 const source='https://news.capcomusa.com/lets/browse/the-family-is-waiting-for-you-resident-evil-7-biohazard-is-available-now';
 const def=(id,kind,motifs,moving)=>Object.freeze({id,kind,native:true,revision:'R14',interior:true,damaging:false,interactive:false,canonical:false,source,sourceCoverage:'Contexte et atmosphère de RE7 ; plans, caméra et placements exacts non vérifiés.',motifs:Object.freeze(motifs),moving:Object.freeze(moving),geometry:'Composition originale en couches pour le duel 2D ; pas une reconstruction Capcom certifiée 1:1.'});
 const SETS=Object.freeze({
  baker_garage_2017:def('baker_garage_2017','garage',['porte sectionnelle et rails','berline immobile en arrière-plan','établi, outils, bidons et rangement'],['ventilation','chaîne suspendue','lumière locale','pluie derrière la fenêtre']),
  guest_house_attic_2017:def('guest_house_attic_2017','attic',['pentes du toit et charpente','fenêtre encadrée et plan extérieur','échelle, coffre et mobilier couvert'],['suspension de lampe','voilage','poussières intérieures','pluie derrière la fenêtre']),
  testing_area_2017:def('testing_area_2017','testing',['couloir à cadres successifs','poste de contrôle et moniteur original','câblage mural et caisses inertes'],['balayage du moniteur','voyant lent','câble suspendu','poussières intérieures'])
 });
 const finite=(v,f=0)=>typeof v==='number'&&Number.isFinite(v)?v:f;
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 const wrap=(v,n)=>((v%n)+n)%n;
 const hash=s=>{let h=2166136261;for(const c of s){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;};
 // Stateless authored texture, independent of frame order and gameplay random.
 const noise=(seed,i)=>((Math.imul((seed^(i+1)*374761393)>>>0,668265263)>>>0)%10000)/10000;
 function describe(stage){const d=SETS[stage?.id];return d?{...d,layers:[...LAYER_NAMES],motifs:[...d.motifs],moving:[...d.moving],rainRegion:d.kind==='garage'?[1060,137,146,113]:d.kind==='attic'?[550,169,180,177]:null}:null;}
 function tools(c){
  const rect=(x,y,w,h,col)=>{c.fillStyle=col;c.fillRect(x,y,w,h);};
  const line=(x,y,u,v,col,w=1)=>{c.strokeStyle=col;c.lineWidth=w;c.beginPath();c.moveTo(x,y);c.lineTo(u,v);c.stroke();};
  const poly=(p,col)=>{c.fillStyle=col;c.beginPath();p.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fill();};
  const ellipse=(x,y,rx,ry,col)=>{c.fillStyle=col;c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fill();};
  const stroke=(x,y,w,h,col,n=1)=>{c.strokeStyle=col;c.lineWidth=n;c.strokeRect(x,y,w,h);};
  const text=(s,x,y,col='#b4b9a4',size=10)=>{c.font=size+'px monospace';c.textAlign='left';c.fillStyle=col;c.fillText(s,x,y);};
  const glow=(x,y,r,col,alpha)=>{const g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,col+Math.round(clamp(alpha,0,1)*255).toString(16).padStart(2,'0'));g.addColorStop(1,col+'00');rect(x-r,y-r,r*2,r*2,g);};
  const bolt=(x,y)=>{ellipse(x,y,2.2,2.2,'#899183');line(x-1,y,x+1,y,'#25352f');};
  const wood=(x,y,w,h,seed)=>{rect(x,y,w,h,'#514b3a');stroke(x,y,w,h,'#242b23',2);for(let i=0;i<4;i++){const yy=y+3+i*(h-6)/4;line(x+3,yy,x+w-4,yy+(noise(seed,i)-.5)*3,'#87735c45');}bolt(x+5,y+5);bolt(x+w-5,y+h-5);};
  const crate=(x,y,w,h,seed)=>{rect(x+5,y+h, w,5,'#060b09aa');rect(x,y,w,h,'#554c36');stroke(x,y,w,h,'#191d17',3);wood(x,y+3,w,9,seed);wood(x,y+h-13,w,10,seed);poly([[x+5,y+13],[x+17,y+13],[x+w-5,y+h-13],[x+w-17,y+h-13]],'#817151');line(x+18,y+17,x+w-14,y+h-16,'#c2b08333');};
  return {rect,line,poly,ellipse,stroke,text,glow,bolt,wood,crate};
 }
 function floor(T,kind,seed){const{rect,line,poly}=T;
  rect(0,474,W,246,kind==='attic'?'#3f3b2d':'#343f3a');
  if(kind==='attic'){
   for(let i=0;i<20;i++){const a=(i-4)*100;poly([[640+(a-640)*.7,474],[640+(a+97-640)*.7,474],[a+97,720],[a,720]],i%2?'#494030':'#40392b');line(640+(a-640)*.7,474,a,720,'#1d241a',2);}
   for(let j=0;j<6;j++){const y=490+j*j*6;line(0,y,W,y,'#1e251c',1.5);for(let i=0;i<11;i++)rect((i*137+j*17)%W,y+4,3,2,'#b6a17655');}
  }else{
   for(let i=0;i<18;i++){const x=i*145-530;line(640+(x-640)*.6,475,x,720,'#18221d',2);}
   for(const y of[487,515,561,628,718])line(0,y,W,y,'#1b2822',2);
   for(let i=0;i<58;i++){const x=noise(seed,i)*W,y=487+noise(seed,i+91)*227;line(x,y,x+10+noise(seed,i+127)*40,y+1,'#b9c6a511');}
   if(kind==='garage'){poly([[284,487],[680,487],[731,516],[238,516]],'#161d1855');line(67,489,47,712,'#a58c4b66',3);line(1212,489,1238,712,'#a58c4b66',3);}
  }
  line(0,474,W,474,'#8d967866',3); // visual depth boundary, not a collider
 }
 function architecture(c,T,d,t,seed){const{rect,line,poly,ellipse,stroke,wood,bolt}=T;
  const g=c.createLinearGradient(0,0,0,H);g.addColorStop(0,'#101915');g.addColorStop(.65,d.kind==='testing'?'#2c3023':'#303d32');g.addColorStop(1,'#0d1713');rect(0,0,W,H,g);
  if(d.kind==='garage'){
   rect(30,112,1220,360,'#364137');for(let j=0;j<10;j++)for(let i=0;i<18;i++){let x=i*77-(j%2)*38,y=116+j*36;rect(x+2,y+2,73,32,i%5===0?'#3c483b':'#333f35');line(x+5,y+3,x+68,y+3,'#68705a33');}
   rect(176,132,704,319,'#131e1b');rect(189,141,678,307,'#526055');
   for(let j=0;j<12;j++){const y=145+j*25;rect(195,y,666,23,j%2?'#48564b':'#455247');line(198,y,856,y,'#8e967e66');line(197,y+22,858,y+22,'#17251e',2);}
   for(const x of[222,444,664,843]){line(x,150,x,440,'#2a3b30',3);for(let y=168;y<420;y+=74){rect(x-5,y,10,5,'#778573');bolt(x,y+3);}}
   poly([[171,116],[889,116],[889,455],[874,455],[874,132],[187,132],[187,455],[170,455]],'#1a2b24');
   for(const x of[179,880]){poly([[x,128],[x-37,2],[x-25,2],[x+7,128]],'#75816a');line(x+2,127,x-28,3,'#1b3025',2);}
   rect(35,79,1210,24,'#24392c');line(40,81,1240,81,'#9ca38155',3);rect(459,91,165,35,'#26382f');rect(512,119,52,17,'#515d4e');
   // Exterior aperture; rain is drawn later inside this exact rectangle.
   rect(1046,122,174,142,'#152820');c.save();c.beginPath();c.rect(1060,137,146,113);c.clip();rect(1060,137,146,113,'#30443e');for(let i=0;i<9;i++)poly([[1050+i*20,250],[1060+i*20,155+noise(seed,i)*35],[1071+i*20,250]],'#1a2e28');c.restore();
   line(1133,137,1133,250,'#67765d',5);line(1060,192,1206,192,'#67765d',5);stroke(1054,130,158,127,'#899174',5);
   rect(914,281,113,186,'#1f3028');rect(924,290,93,165,'#3b4835');for(const x of[928,1009])line(x,294,x,449,'#69755a');ellipse(1000,377,4,4,'#aaa379');
   for(let x=18;x<1270;x+=312){rect(x,109,14,365,'#233328');line(x+2,110,x+2,471,'#78876a66',3);}
   // Pipe fixes the vent to the wall rather than floating in space.
   line(1219,277,1219,441,'#828571',6);line(1219,277,1126,277,'#828571',6);
  }else if(d.kind==='attic'){
   poly([[0,7],[639,61],[1280,7],[1280,462],[0,462]],'#353c2c');
   for(let i=0;i<21;i++){const x=i*65;poly([[x,60],[x+59,63],[x+59,471],[x,471]],i%3?'#45442f':'#3b3e2a');for(let y=75;y<448;y+=57)line(x+3,y,x+56,y+3,'#242d2077');}
   poly([[0,0],[640,37],[367,173],[0,329]],'#2a3327');poly([[640,37],[1280,0],[1280,329],[913,173]],'#2a3327');
   for(let i=0;i<6;i++){const y=10+i*42;line(0,y+44,640,39+i*6,'#69705766',3);line(640,39+i*6,1280,y+44,'#69705766',3);}
   // The view remains wide enough for the existing duel, with roof supports behind it.
   for(const [x,y]of [[50,299],[242,208],[446,118],[637,40],[834,118],[1037,208],[1230,299]]){line(x,y,x,475,'#222e21',24);line(x-5,y,x-5,474,'#6f705366',3);}
   line(0,300,640,38,'#1c2a1d',28);line(640,38,1280,300,'#1c2a1d',28);line(0,294,640,28,'#80846777',4);line(640,28,1280,294,'#80846777',4);
   rect(538,156,204,204,'#19281f');c.save();c.beginPath();c.rect(550,169,180,177);c.clip();rect(550,169,180,177,'#293b37');ellipse(682,202,17,17,'#9fa98c88');for(let i=0;i<13;i++)poly([[540+i*18,344],[552+i*18,238+noise(seed,i)*39],[564+i*18,344]],'#172d26');c.restore();
   stroke(545,165,190,187,'#797962',7);line(640,170,640,346,'#76735a',5);line(550,257,730,257,'#76735a',5);
   wood(530,350,222,16,seed);poly([[23,386],[310,363],[310,473],[23,473]],'#353d29');
  }else{
   rect(0,77,W,397,'#3d3e2a');
   for(let i=0;i<21;i++){const x=i*64;rect(x,84,61,389,i%3?'#4b4830':'#46462f');line(x+2,84,x+2,467,'#232e2077',2);for(let y=115;y<440;y+=61){line(x+7,y,x+53,y-2,'#77725055');bolt(x+8,y+10);}}
   const frames=[[166,77,763,397],[260,138,549,308],[340,187,388,233],[406,224,255,178]];
   poly([[170,80],[928,80],[655,245],[410,245]],'#1b261e');poly([[170,474],[927,474],[655,405],[409,405]],'#273023');
   poly([[170,80],[410,245],[410,405],[170,474]],'#353d2a');poly([[928,80],[655,245],[655,405],[928,474]],'#293624');
   rect(409,241,249,176,'#17261f');rect(456,263,147,140,'#373d2a');for(let j=0;j<6;j++)line(462,271+j*20,596,271+j*20,'#6b6b4566');
   for(const[x,y,w,h]of frames){stroke(x,y,w,h,'#151f18',16);stroke(x-3,y-4,w,h,'#72715877',2);line(x,y+32,x+w,y+32,'#82856b33',2);}
   for(let i=0;i<5;i++)line(170,94+i*12,409,246+i*4,'#6c665066',3);
   line(421,110,873,110,'#898164',5);line(872,109,1114,241,'#898164',5);line(1095,114,1245,114,'#76806b',7);line(1245,114,1245,372,'#76806b',7);
   rect(947,142,251,191,'#1c2c23');stroke(947,142,251,191,'#858065',8);for(let x=960;x<1195;x+=32)line(x,151,x,325,'#0f1b14',4);
   // Original inactive wiring in the rear plane, not a damage trigger.
   line(275,340,402,300,'#d2ae7066',1);line(662,310,804,375,'#d2ae7066',1);
  }
  floor(T,d.kind,seed);
 }
 function car(T){const{rect,line,poly,ellipse,stroke}=T;
  ellipse(443,468,261,15,'#07120c99');
  for(const x of[280,645]){ellipse(x,435,45,44,'#0d1913');ellipse(x,435,29,29,'#3d5042');ellipse(x,435,18,18,'#75826b');ellipse(x,435,8,8,'#22352a');for(let j=0;j<6;j++){const a=j*Math.PI/3;line(x+Math.cos(a)*9,435+Math.sin(a)*9,x+Math.cos(a)*24,435+Math.sin(a)*24,'#263b2d',5);}}
  poly([[183,406],[228,367],[294,355],[351,287],[538,287],[610,348],[684,363],[728,405],[719,442],[682,443],[672,416],[648,397],[628,396],[603,417],[595,444],[328,445],[318,412],[292,396],[270,396],[244,415],[234,445],[187,435]],'#607058');
  poly([[303,352],[363,296],[525,296],[594,350]],'#152c29');poly([[368,300],[382,300],[338,347],[321,347]],'#8b9a8466');line(447,295,447,354,'#7d8f72',7);line(529,301,584,349,'#798b7033',3);
  line(193,394,715,394,'#a5b09466',3);line(453,359,453,438,'#364e3c',2);rect(463,370,30,6,'#253b2d');rect(596,356,27,10,'#60765b');line(590,361,580,364,'#a5af8c');
  rect(186,405,36,17,'#c0b67a');rect(701,409,20,14,'#8e6645');line(187,430,230,435,'#acb191',6);line(685,435,719,430,'#acb191',6);
  for(let i=0;i<11;i++)line(206+i*9,382,211+i*9,387,'#3c513d',1);
  line(348,291,540,291,'#a5ae8866',3);line(603,396,692,405,'#344d3a',2);
 }
 function props(c,T,d,t,seed){const{rect,line,poly,ellipse,wood,crate,bolt,text,stroke}=T;
  if(d.kind==='garage'){
   for(const x of[43,804,975]){rect(x,343,166,16,'#797254');rect(x+4,359,8,113,'#303f2b');rect(x+148,359,8,113,'#303f2b');line(x,362,x+162,452,'#202f21',6);}
   rect(40,207,119,122,'#4b573f');for(let x=45;x<154;x+=10)for(let y=214;y<324;y+=11)rect(x,y,1.5,1.5,'#1b3023');
   for(let i=0;i<6;i++){const x=54+i*17;line(x,221,x+6,266+i%3*18,'#9a9d7b',4);ellipse(x-1,221,4,4,'#273e2b');}
   rect(63,378,107,91,'#633d2c');for(let i=0;i<5;i++){rect(68,384+i*15,96,12,'#744b31');line(94,389+i*15,139,389+i*15,'#ada078',3);}ellipse(75,474,7,5,'#18261b');ellipse(158,474,7,5,'#18261b');
   for(let i=0;i<4;i++){const x=827+i*23;rect(x,316-i%2*8,17,27+i%2*8,'#6d7043');rect(x+3,309-i%2*8,8,8,'#969466');}
   crate(979,385,126,85,seed);crate(1123,409,95,60,seed+1);ellipse(846,432,40,38,'#13221a');ellipse(846,432,25,24,'#425442');ellipse(846,432,16,15,'#17291d');
   car(T);
   c.save();c.translate(760,66);c.rotate(Math.sin(t*.48)*.018);for(let j=0;j<18;j++){c.strokeStyle=j%2?'#96997a':'#53654b';c.lineWidth=2;c.beginPath();c.ellipse(0,j*8,3,5,0,0,Math.PI*2);c.stroke();}line(0,142,13,154,'#a19b71',3);c.restore();
   text('ATELIER / ARRIÈRE-PLAN NON INTERACTIF',797,365,'#a8ad85',8);
  }else if(d.kind==='attic'){
   const dx=Math.sin(t*.43)*2;
   poly([[73,395],[96,354],[281,354],[311,391],[328,466],[54,466]],'#5c6650');poly([[87,377],[110,357],[270,357],[298,382],[314,453],[72,453]],'#85856a');
   for(let i=0;i<7;i++)line(95+i*30,373,77+i*37,452,'#4a5a40',2);line(89,421,296,423,'#adb09144');
   crate(919,394,183,77,seed);crate(989,335,127,59,seed+2);crate(850,428,94,45,seed+3);
   c.save();c.translate(807,281);c.rotate(-.21);for(const x of[0,68])wood(x,0,10,194,seed);for(let j=0;j<7;j++)wood(5,15+j*26,68,8,seed+j);c.restore();
   rect(382,397,105,72,'#524c35');stroke(382,397,105,72,'#2d3827',4);wood(377,391,115,17,seed);for(const x of[399,459])rect(x,391,7,74,'#252e23');rect(423,417,18,14,'#8f8661');
   // Veil movement is restrained; no sheet crosses the active foreground.
   poly([[549,166],[567,166],[564+dx,339],[535+dx,348]],'#a7ae8e55');poly([[713,166],[731,166],[745-dx,348],[717-dx,338]],'#a7ae8e44');
   for(const[x,y]of [[339,178],[996,262]]){poly([[x,y],[x+87,y+36],[x+43,y+115]],'#b2b59616');for(let j=0;j<5;j++)line(x,y,x+17*j,y+23*j,'#b7bf9827');}
  }else{
   crate(65,353,122,118,seed);crate(26,303,109,52,seed+2);crate(212,420,81,54,seed+3);
   rect(940,360,274,17,'#706044');rect(948,377,13,95,'#242f20');rect(1190,377,13,95,'#242f20');line(960,447,1189,447,'#594f37',8);
   rect(968,346,152,14,'#4b4b34');rect(971,335,140,11,'#828466');for(let i=0;i<14;i++)rect(978+i*9,338,5,4,'#222f20');
   // CRT frame and original abstract signal — no footage or Capcom texture.
   rect(975,246,163,92,'#313f31');stroke(975,246,163,92,'#647557',4);rect(985,254,127,72,'#182c25');rect(1121,260,8,34,'#869b6e');ellipse(1125,312,5,5,'#9cab7b');
   for(let j=0;j<7;j++)rect(990,261+j*8,112,3,j%2?'#4e725741':'#73926831');
   rect(1151,273,35,66,'#242f23');for(let j=0;j<6;j++)line(1157,281+j*8,1180,281+j*8,'#7c806366');
   line(935,362,904,390,'#858065',3);line(904,390,929,459,'#858065',3);
   ellipse(1157,439,36,32,'#1c2d23');for(let j=0;j<5;j++){c.strokeStyle='#70623f';c.lineWidth=3;c.beginPath();c.ellipse(1157,439,31-j*5,26-j*4,0,0,Math.PI*2);c.stroke();}
   c.save();c.translate(807,82);c.rotate(Math.sin(t*.35)*.025);line(0,0,0,178,'#222d20',5);line(0,178,15,193,'#90866c',3);c.restore();
   text('POSTE DE CONTRÔLE / SIGNAL ORIGINAL',945,390,'#a4a27e',8);
  }
 }
 function light(c,T,d,t){const{rect,line,poly,ellipse,glow}=T,pulse=.94+Math.sin(t*.55)*.035+Math.sin(t*.97)*.015;
  if(d.kind==='garage'){
   for(const x of[311,900]){line(x,0,x,80,'#364938',3);rect(x-57,78,114,15,'#294333');rect(x-49,84,98,5,'#e2dda2');glow(x,98,200,'#d8d699',.16*pulse);poly([[x-48,93],[x+48,93],[x+164,469],[x-164,469]],'#ced4910c');}
   glow(1130,192,158,'#8ca8a0',.09);
  }else if(d.kind==='attic'){
   c.save();c.translate(433,36);c.rotate(Math.sin(t*.4)*.021);line(0,0,0,181,'#7e7c56',2);poly([[-27,209],[-15,181],[16,181],[28,209]],'#626240');rect(-22,207,44,6,'#c8c481');glow(0,218,181,'#d9c17b',.17*pulse);c.restore();
   poly([[553,264],[730,270],[1074,472],[673,471]],'#95aaa418');glow(641,244,176,'#a7b6ad',.055);
  }else{
   for(const[x,y,r]of [[523,123,195],[524,221,63]]){rect(x-47,y,94,10,'#1f3225');rect(x-38,y+8,76,4,'#d8c586');glow(x,y+19,r,'#cec080',.14*pulse);}
   ellipse(930,203,5,5,'#cd9464');glow(930,203,40,'#c28659',(.10+.045*Math.sin(t*.6)));
   glow(1045,290,118,'#70a987',.12);rect(989,256+wrap(t*13,63),118,4,'#8ac09635');
  }
 }
 function ambient(c,T,d,t,seed){const{rect,line,ellipse}=T;
  if(d.kind==='garage'){
   c.save();c.beginPath();c.rect(1060,137,146,113);c.clip();for(let i=0;i<17;i++){const x=1060+wrap(i*31-t*19,146),y=137+wrap(i*17+t*86,113);line(x,y,x-2,y+13,'#b8cec13e');}c.restore();
   // Repaint bars after exterior rain: nothing rains through a window frame.
   line(1133,137,1133,250,'#67765d',5);line(1060,192,1206,192,'#67765d',5);
   rect(1069,300,93,72,'#23372b');c.save();c.beginPath();c.rect(1073,304,85,64);c.clip();c.translate(1115,336);c.rotate(t*.8);for(let i=0;i<4;i++){c.rotate(Math.PI/2);ellipse(17,0,24,7,'#6d806455');}c.restore();for(let j=0;j<6;j++)line(1072,309+j*10,1161,309+j*10,'#324631',3);
  }else if(d.kind==='attic'){
   c.save();c.beginPath();c.rect(550,169,180,177);c.clip();for(let i=0;i<19;i++){const x=550+wrap(i*27-t*13,180),y=169+wrap(i*21+t*62,177);line(x,y,x-2,y+9,'#c0d1bd33');}c.restore();line(640,170,640,346,'#76735a',5);line(550,257,730,257,'#76735a',5);
  }
  for(let i=0;i<18;i++){const x=70+noise(seed,i)*1120+Math.sin(t*.25+i)*7,y=95+wrap(noise(seed,i+50)*323+t*(.9+i%4),323);rect(x,y,i%4===0?2:1,1,'#c8d1a524');}
 }
 function draw(c,stage,time=0,camera=0,preview=false,options={}){
  const d=SETS[stage?.id];if(!c||!d)return false;
  const reduced=options.reducedMotion===true,t=reduced?0:wrap(Math.max(0,finite(time)),3600),pan=reduced?0:clamp(finite(camera)*.035,-12,12);
  const layer=LAYER_NAMES.includes(options.layer)?options.layer:'all',seed=hash(d.id),T=tools(c);
  c.save();try{
   c.globalAlpha=1;c.globalCompositeOperation='source-over';c.lineWidth=1;T.rect(0,0,W,H,'#101915');
   // Architecture is retained beneath isolated details, so a layer inspection
   // can still locate each prop or light within the actual room.
   c.save();c.translate(-pan,0);architecture(c,T,d,t,seed);
   if(layer==='all'||layer==='props')props(c,T,d,t,seed);
   if(layer==='all'||layer==='light')light(c,T,d,t);
   if(layer==='all'||layer==='ambient')ambient(c,T,d,t,seed);
   c.restore();
   if(!preview){const g=c.createRadialGradient(640,355,260,640,355,825);g.addColorStop(0,'#00000000');g.addColorStop(1,'#010705aa');T.rect(0,0,W,H,g);}
   T.rect(18,685,597,24,'#101d17dd');T.text('RE7 · '+d.kind.toUpperCase()+' / COMPOSITION 2D ORIGINALE — R14',28,701,'#acb99b',10);
  }finally{c.restore();}
  return true;
 }
 root.RE_BAKER_STAGES=Object.freeze({revision:'R14',ids:Object.freeze(Object.keys(SETS)),layers:LAYER_NAMES,describe,draw});
})(globalThis);
