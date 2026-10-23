/* Original runtime scenery. These stages evoke RE5 locations, not extracted maps.
 * All randomness is seeded by stage; animation depends only on supplied time. */
(function (root) {
'use strict';
const THEMES=Object.freeze(['depot','settlement','ship','ruins','lab','quarry','water','furnace','volcano']);
function draw(ctx,stage,time=0,camera=0,preview=false){
 const theme=stage.re5Scene;if(!THEMES.includes(theme))return false;
 const t=Number.isFinite(time)?time:0,seed=(stage.re5Seed||0)+1;let rng=seed*2654435761>>>0;
 const rand=()=>{rng^=rng<<13;rng^=rng>>>17;rng^=rng<<5;return(rng>>>0)/4294967296;};
 const rect=(x,y,w,h,c)=>{ctx.fillStyle=c;ctx.fillRect(x,y,w,h);};
 const line=(x,y,u,v,c,w=1)=>{ctx.strokeStyle=c;ctx.lineWidth=w;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(u,v);ctx.stroke();};
 const poly=(pts,c)=>{ctx.fillStyle=c;ctx.beginPath();pts.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fill();};
 const text=(s,x,y,c='#b6b19e',size=11)=>{ctx.fillStyle=c;ctx.font=`${size}px monospace`;ctx.textAlign='left';ctx.fillText(s,x,y);};
 const lamp=(x,y,c='#dbaa56')=>{const g=ctx.createRadialGradient(x,y,0,x,y,82);g.addColorStop(0,c+'45');g.addColorStop(1,c+'00');rect(x-82,y-82,164,164,g);rect(x-18,y-4,36,8,c);};
 const beam=(x,y,w,h)=>{rect(x,y,w,h,'#273136');rect(x+3,y,3,h,'#607078');for(let yy=y+12;yy<y+h;yy+=70){rect(x+7,yy,4,4,'#9a9b86');rect(x+w-10,yy,4,4,'#9a9b86');}};
 const hazard=(x,y,w)=>{rect(x,y,w,16,'#aa8a37');ctx.save();ctx.beginPath();ctx.rect(x,y,w,16);ctx.clip();for(let xx=x-20;xx<x+w;xx+=30)poly([[xx,y],[xx+15,y],[xx+30,y+16],[xx+15,y+16]],'#1c2425');ctx.restore();};
 const box=(x,y,w,h,c='#655c45')=>{rect(x,y,w,h,c);ctx.strokeStyle='#1e2525';ctx.lineWidth=5;ctx.strokeRect(x,y,w,h);line(x+5,y+5,x+w-5,y+h-5,'#9b8c66',3);line(x+w-5,y+5,x+5,y+h-5,'#9b8c66',3);};
 const container=(x,y,w,h,c)=>{rect(x,y,w,h,c);for(let xx=x+8;xx<x+w;xx+=17){rect(xx,y+3,4,h-6,'#090e0e55');rect(xx+4,y+3,2,h-6,'#b2b8a61a');}rect(x,y,w,8,'#8c8e7740');rect(x,y+h-6,w,6,'#0b1112');};
 const pallet=(x,y,w)=>{for(let j=0;j<3;j++)rect(x,y+j*6,w,4,'#827251');};
 ctx.save();const sky=ctx.createLinearGradient(0,0,0,720),hot=theme==='volcano',inside=['lab','furnace','ship'].includes(theme);
 sky.addColorStop(0,hot?'#130f13':inside?'#080f15':'#354648');sky.addColorStop(.7,hot?'#76352a':inside?'#1b3436':'#9a8b62');sky.addColorStop(1,'#0b1013');rect(0,0,1280,720,sky);
 ctx.save();ctx.translate(-Math.max(-35,Math.min(35,camera*.06)),0);
 if(!inside){for(let i=0;i<13;i++){const x=i*115-80,y=260+rand()*80;poly([[x,400],[x+30,y],[x+65,y-60],[x+145,400]],hot?'#291d20':'#374843');}if(!hot){rect(0,394,1280,72,'#5c675744');for(let i=0;i<28;i++){const x=i*49;rect(x,327+rand()*50,35,115,'#343d3266');}}}
 else{rect(0,94,1280,400,'#172629');for(let x=0;x<1280;x+=158){rect(x+5,105,141,326,'#233235');line(x,100,x,455,'#577170',2);for(let y=133;y<414;y+=38)line(x+15,y,x+137,y,'#152223');}for(let j=0;j<3;j++){rect(0,46+j*16,1280,9,'#384b4b');rect(0,46+j*16,1280,2,'#8b8f7544');}}
 if(theme==='depot'){
 container(52,253,380,170,'#3d544d');container(438,294,330,137,'#76513d');container(794,234,388,195,'#435569');for(let x=26;x<1250;x+=220)beam(x,94,14,360);line(20,100,1240,100,'#171f21',13);line(360,100,610,270,'#171f21',5);line(1080,100,810,269,'#171f21',5);rect(472,312,72,24,'#d4be7a');text('K-12',482,330,'#393d32',14);pallet(105,445,142);box(115,372,82,70);box(1030,372,105,80);lamp(650,140);
 }else if(theme==='settlement'){
 for(let i=0;i<5;i++){const x=i*283-56,y=220+rand()*40;rect(x,y,247,223,i%2?'#796950':'#695c45');poly([[x-18,y],[x+122,y-48],[x+264,y+3]],'#493f33');container(x-16,y-8,280,20,'#65716b');rect(x+40,y+58,58,94,'#202c2a');rect(x+139,y+88,70,135,'#282b26');for(let yy=y+3;yy<y+215;yy+=22)line(x,yy,x+245,yy,'#362f2855');}for(let i=0;i<8;i++){const x=i*158;line(x,118,x+155,120+Math.sin(i)*15,'#161f24',2);poly([[x+28,122],[x+64,127],[x+49,153]],'#ae885c');}rect(587,273,101,174,'#263d37');text('STORAGE',594,294,'#bba475',12);box(27,374,83,78);box(1140,394,98,59);
 }else if(theme==='ship'){
 for(let x=40;x<1280;x+=260){beam(x,64,30,417);line(x,80,x+180,190,'#657172',9);}rect(166,192,327,228,'#354342');rect(182,208,295,196,'#0d171b');container(560,248,394,179,'#5f4a3a');for(let x=170;x<1130;x+=68)line(x,188,x,237,'#728182',4);line(160,188,1140,188,'#8a9993',5);line(160,237,1140,237,'#1b272c',12);lamp(230,134);lamp(1040,138);hazard(171,405,320);text('FREIGHT 06 / RESTRICTED',558,233,'#b49d70',16);
 }else if(theme==='ruins'){
 for(let i=0;i<9;i++)for(let j=0;j<5;j++){const x=i*159+(j%2)*-55;rect(x+3,190+j*49,150,43,['#5c6256','#646959','#535c52'][Math.floor(rand()*3)]);}for(const x of [73,355,892,1159]){rect(x-28,146,84,299,'#636957');rect(x-41,142,110,29,'#a09673');rect(x-39,412,105,40,'#393f39');for(let j=0;j<4;j++)line(x-17+j*18,180,x-17+j*18,409,'#8c8767',4);}poly([[465,444],[465,223],[548,153],[709,153],[792,223],[792,444]],'#1a2927');poly([[504,443],[504,252],[567,196],[687,196],[751,252],[751,443]],'#0c191c');text('MONARCH / RESEARCH ACCESS',466,130,'#bcb290',13);lamp(425,293,'#e4a34b');lamp(814,293,'#e4a34b');
 }else if(theme==='lab'){
 for(let i=0;i<6;i++){let x=38+i*207;rect(x,198,166,229,'#2a4145');rect(x+8,208,149,164,'#07303b');rect(x+15,218,134,142,'#153e40');for(let y=229;y<350;y+=9)line(x+18,y,x+144,y,'#839b6838');rect(x+18,385,72,14,'#60b29c');text('TRICELL '+(i+1),x+24,254,'#80b8a4',11);beam(x-13,140,9,305);}for(let x=110;x<1200;x+=230)lamp(x,134,'#77c8bf');text('BIOLOGICAL OBSERVATION / CONTAINMENT',350,110,'#8cb9b2',16);
 }else if(theme==='quarry'){
 for(let i=0;i<6;i++){const x=i*241-74;poly([[x,452],[x+22,181+rand()*70],[x+143,98+rand()*70],[x+254,449]],i%2?'#4b5248':'#62654f');line(x+40,290,x+218,425,'#838365',3);}beam(330,174,22,278);beam(914,174,22,278);line(320,176,955,176,'#596863',20);line(340,185,480,282,'#283e3c',7);rect(383,356,99,86,'#715d3b');container(712,345,135,99,'#616452');lamp(626,213);
 }else if(theme==='water'){
 rect(0,313,1280,176,'#264c50');for(let i=0;i<48;i++){const y=317+i*3.5,x=(i*97+Math.sin(t*.8+i)*26)%1280;line(x,y,x+80+i,y,'#82948d30',1.4);}for(let i=0;i<7;i++){const x=i*210;line(x,166,x,439,'#4e4d3b',14);poly([[x-65,271],[x,215],[x+98,267]],'#3d4b42');}line(5,243,1220,243,'#929575',4);for(let i=0;i<13;i++)line(i*100,243,i*100,292,'#656f5d',3);text('MARSHLAND / DOCK ACCESS',429,201,'#c4b286',15);box(30,397,87,74);box(1170,399,89,72);
 }else if(theme==='furnace'){
 for(let i=0;i<3;i++){const x=86+i*413;rect(x,165,284,287,'#415052');rect(x+14,180,256,256,'#121b20');rect(x+27,195,230,225,'#382a24');for(let b=0;b<12;b++)line(x+33+b*20,190,x+33+b*20,421,'#70716b',6);lamp(x+140,290,'#ec782f');hazard(x,436,283);text('THERMAL / 0'+(i+1),x+33,151,'#c9a773',13);}beam(25,90,26,380);beam(1240,90,26,380);rect(0,88,1280,29,'#334648');
 }else if(theme==='volcano'){
 for(let i=0;i<9;i++){const x=i*175-60;poly([[x,485],[x+43,166+rand()*120],[x+106,122+rand()*150],[x+219,480]],i%2?'#3a2826':'#211c21');}const lava=ctx.createLinearGradient(0,360,0,490);lava.addColorStop(0,'#5a3025');lava.addColorStop(1,'#d86929');rect(0,391,1280,110,lava);for(let i=0;i<23;i++){const x=rand()*1280,y=401+rand()*85;line(x,y,x+25+rand()*190,y+Math.sin(t+i)*3,'#ffc16665',2);}poly([[0,443],[120,397],[190,448],[340,419],[416,461],[660,419],[755,448],[952,412],[1080,451],[1280,414],[1280,580],[0,580]],'#1e2326');
 }
 ctx.restore();const floor=ctx.createLinearGradient(0,493,0,720);floor.addColorStop(0,hot?'#34312d':'#435354');floor.addColorStop(1,'#080d12');rect(0,493,1280,227,floor);rect(0,490,1280,6,hot?'#a36b44':'#89958b');for(let i=-6;i<15;i++)line(640+(i-4)*117,496,640+(i-4)*252,720,'#10191e',2);for(const y of [524,579,651,717])line(0,y,1280,y,'#131e24',2);for(let i=0;i<32;i++){const x=rand()*1280,y=540+rand()*160;rect(x,y,4+rand()*14,1,'#96a09726');}
 if(inside){for(let x=0;x<1280;x+=43)line(x,713,x+22,701,'#9c905455',4);beam(8,0,25,510);beam(1250,0,25,510);}
 rect(34,461,226,24,'#101b21bb');text((stage.name||'CHAMBRE TRICELL').slice(0,34),43,477,'#d0c392',10);text('SCÉNOGRAPHIE ORIGINALE · SIMULATION',926,477,'#adb4a0',9);
 if(!preview){const gl=ctx.createRadialGradient(640,330,270,640,360,780);gl.addColorStop(0,'#00000000');gl.addColorStop(1,'#000000b0');rect(0,0,1280,720,gl);}
 if(hot&&!preview)for(let i=0;i<24;i++){const x=(i*83+seed*39)%1280,y=465-((t*20+i*37)%355);rect(x+Math.sin(t+i)*9,y,2,4,'#da8c46');}
 ctx.restore();return true;
}
root.RE5_SCENES=Object.freeze({draw,themes:THEMES});
})(typeof window==='undefined'?globalThis:window);
