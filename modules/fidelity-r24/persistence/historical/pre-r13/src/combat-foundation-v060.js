/* CQC Versus 0.60 — deterministic combat rules, valid actions and authored CPU tactics. */
(function(root){'use strict';
const FLOOR=568,LEFT=65,RIGHT=1215,SLOTS=['light','heavy','low','throw','special','specialDown','specialForward','specialBack','super','utility'];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const copy=x=>JSON.parse(JSON.stringify(x));
const rule58=(s,id)=>{const m=s.options.mutators49||[];return(Array.isArray(m)?m:[m]).includes(id);};
const empty=()=>({left:false,right:false,down:false,guard:false,jump:false,dash:false,tech:false,slot:null});
const slotName={special:'I',specialDown:'↓ + I',specialForward:'AVANT + I',specialBack:'ARRIÈRE + I',super:'O',utility:'L',light:'J',heavy:'K',low:'↓ + J',throw:'U'};
function rand(s){let x=(s.seed>>>0)||0x6d2b79f5;x^=x<<13;x^=x>>>17;x^=x<<5;s.seed=x>>>0;return(s.seed>>>0)/4294967296;}
function event(s,type,actor,extra={}){const e={frame:s.frame,type,actor:actor?.slot??-1,...extra};s.events.push(e);if(s.events.length>180)s.events.shift();s.metrics[type]=(s.metrics[type]||0)+1;return e;}
function fx(s,x,y,kind,tag='tactical',text=''){s.fx.push({x,y,kind,tag,text,t:kind==='blast'?26:40,max:kind==='blast'?26:40});if(s.fx.length>100)s.fx.shift();}
function makeActor(f,slot){if(!f?.combat?.moves)throw Error('Missing authored combat profile: '+f?.uid);const c=f.combat,r=c.resource;return{
 f,slot,x:slot?900:380,y:FLOOR,vx:0,vy:0,face:slot?-1:1,life:10000,max:10000,gray:0,regenUsed:0,meter:0,guard:100,
 r:['heat','cost'].includes(r.kind)?0:r.max,resourceDelay:0,hit:0,blockstun:0,block:false,crouch:false,onGround:true,
 attack:null,state:'idle',stateT:0,cool:0,flash:0,projectiles:[],wins:0,ai:false,buffs:{},statuses:{},cooldowns:{},
 lastHit:-999,lastOffense:-999,still:0,steady:false,lastTech:-999,throwProtect:0,shockImmune:0,sleepImmune:0,drowsy:0,
 comboHits:0,comboStun:0,comboQuiet:0,sequence:0,lastStarted:null,lastActivation:null,chainDepth:0,chainQuiet:0,feedback:'',feedbackT:0,
 stats:{attempts:0,starts:0,activations:0,hits:0,damage:0,parries:0,blocked:0,healed:0,denied:0},cpuWait:0,cpuGuard:0
 };}
function create(a,b,options={}){const s={version:'0.60',a:makeActor(a,0),b:makeActor(b,1),frame:0,seed:(options.seed??987654321)>>>0,
 timerStart:options.training?0:(options.seconds??99)*60,timer:options.training?0:(options.seconds??99)*60,
 rounds:options.rounds??2,round:1,phase:options.training||options.skipIntro?'fight':'intro',phaseT:options.training||options.skipIntro?0:100,
 finished:false,roundWinner:null,winner:null,projectiles:[],traps:[],fx:[],events:[],metrics:{},nextId:1,
 lastImpact:null,options:{training:false,dummy:'idle',autoheal:false,freeMeter:false,freeResource:false,...options},idleTraining:0};
 s.b.ai=options.mode==='cpu';return s;}
function actors(s){return[s.a,s.b];}
function other(s,p){return p.slot===0?s.b:s.a;}
function reset(s,{keepWins=true}={}){const oldA=s.a,oldB=s.b;s.a=makeActor(oldA.f,0);s.b=makeActor(oldB.f,1);s.a.ai=oldA.ai;s.b.ai=oldB.ai;
 if(keepWins){s.a.wins=oldA.wins;s.b.wins=oldB.wins;}s.timer=s.timerStart;s.phase=s.options.training?'fight':'intro';s.phaseT=s.options.training?0:90;
 s.projectiles=[];s.traps=[];s.fx=[];s.roundWinner=null;s.idleTraining=0;s.lastImpact=null;if(rule58(s,'glass'))s.a.life=s.b.life=4000;if(rule58(s,'mirror_resource')){const ratio=Math.min(s.a.r/s.a.f.combat.resource.max,s.b.r/s.b.f.combat.resource.max);s.a.r=s.a.f.combat.resource.max*ratio;s.b.r=s.b.f.combat.resource.max*ratio;}event(s,'roundReset',null);return s;}
function box(p){const v=p.f.visual||{},w=Math.max(40,Math.min(280,v.width||78));let h=Math.max(45,Math.min(360,v.height||230));if(p.crouch||p.attack?.def.lowProfile)h*=.53;return{x:p.x-w/2,y:p.y-h,w,h};}
function overlap(a,b){return a&&b&&a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;}
function strikeWindow(a){
 if(!a)return -1;const age=a.t-a.def.startup;
 if(age<0||age>=a.def.active)return -1;
 return Array.isArray(a.def.hitWindows)?a.def.hitWindows.findIndex(w=>age>=w.start&&age<w.end):0;
}
function inActive(a){return strikeWindow(a)>=0;}
function hitbox(p){const a=p.attack;if(!inActive(a)||a.def.kind!=='melee')return null;const d=a.def,r=d.reach*clamp(p.f.reach||1,.85,1.25),lo=d.level==='low',h=lo?62:Math.min(155,d.height?d.height:155),top=d.height|| (lo?62:190);return{x:p.face>0?p.x:p.x-r,y:p.y-top,w:r,h};}
function isGun(m){return m.kind==='projectile'&&['ballistic','precision','tranq','rail','rocket'].includes(m.tag);}
function costAllowed(p,d){const r=p.f.combat.resource,c=d.cost||0;return ['heat','cost'].includes(r.kind)?p.r+c<=r.max+.001:p.r>=c;}
function denied(s,p,why){p.stats.denied++;p.feedback=why;p.feedbackT=48;event(s,'denied',p,{why});return false;}
// One predicate serves player commands, CPU choices and the training inspector.
// Looking up availability never consumes resources or writes combat telemetry.
function unavailableReason(s,p,slot){const d=p.f.combat.moves[slot];if(!d)return 'Technique inconnue';
 if(d.kind==='heal'&&p.f.combat.biology?.noHealingWhileBurning&&p.statuses.burn?.t>0)return 'Réassemblage interrompu par le feu';
 if(p.attack){const a=p.attack,link=p.f.combat.links?.some(l=>l[0]===a.name&&l[1]===slot);if(!(a.confirmed&&link&&p.chainDepth<2&&a.t>=a.def.startup&&a.t<a.def.startup+a.def.active+12))return 'busy';}
 if(p.hit>0||p.blockstun>0||p.cool>0||p.life<=0)return 'busy';
 if(rule58(s,'no_throws')&&d.level==='throw')return 'Saisies désactivées par le règlement';
 if(rule58(s,'no_super')&&slot==='super')return 'Super désactivée par le règlement';
 if(rule58(s,'no_projectiles')&&d.kind==='projectile')return 'Projectiles désactivés par le règlement';
 if(d.requiresStagger&&!(other(s,p).hit>0&&s.frame-other(s,p).lastHit<40))return 'Créer une ouverture par un impact de lame';
 if(d.level==='throw'&&!p.onGround)return 'Saisie au sol uniquement';
 if((d.launchSelf||d.blink||['reload','recover','heal','trap'].includes(d.kind))&&!p.onGround)return 'Action au sol uniquement';
 if(p.statuses.disarm?.t>0&&isGun(d))return 'Arme désarmée temporairement';
 if(p.cooldowns[slot]>0)return 'Technique en récupération';
 if((d.meter||0)>p.meter)return 'Jauge de furie insuffisante';
 if(!costAllowed(p,d))return p.f.combat.resource.kind==='ammo'?'Recharger avec L / H':'Ressource indisponible';
 return null;
}
function canStart(s,p,slot){return unavailableReason(s,p,slot)===null;}
function start(s,p,slot){p.stats.attempts++;const why=unavailableReason(s,p,slot);if(why)return why==='busy'?false:denied(s,p,why);
 const d=p.f.combat.moves[slot],cancelFrom=p.attack;
 if(cancelFrom){p.attack=null;p.chainDepth++;p.chainQuiet=0;event(s,'confirmCancel',p,{slot});}
 const old=p.r;p.r=clamp(p.r+(['heat','cost'].includes(p.f.combat.resource.kind)?1:-1)*(d.cost||0),0,p.f.combat.resource.max);p.meter-=d.meter||0;p.resourceDelay=80;
 p.cooldowns[slot]=d.cooldown||0;p.attack={name:slot,def:d,t:0,id:++p.sequence,hit:false,activated:false,confirmed:false,steady:p.steady,face:p.face};p.state='attack';p.block=false;p.vx=0;p.lastStarted=slot;p.stats.starts++;
 if(!['heal','recover','reload'].includes(d.kind)){p.lastOffense=s.frame;if(d.kind!=='buff'||d.buff!=='cloak')delete p.buffs.cloak;}
 if(d.kind==='projectile'||d.damage>0){p.steady=false;p.still=0;}event(s,'start',p,{slot,name:d.name,cost:d.cost,resourceBefore:old,resourceAfter:p.r});return true;}
function canParry(p,m,projectile){const a=p.attack;if(!inActive(a)||a.def.kind!=='parry'||m.level==='throw')return false;
 if(projectile)return a.def.parryMode==='projectile'&&!['explosive','fire','rocket'].includes(m.tag)&&!m.fuse;
 return a.def.parryMode==='melee';}
function heal(s,p,n,budget){if(p.f.combat.biology?.noHealingWhileBurning&&p.statuses.burn?.t>0)return 0;const cap=budget??(p.f.combat.passive.regenBudget||900);const amount=Math.max(0,Math.min(n,p.gray,10000-p.life,cap-p.regenUsed));if(!amount)return 0;p.life+=amount;p.gray-=amount;p.regenUsed+=amount;p.stats.healed+=amount;event(s,'heal',p,{amount});return amount;}
function buffHit(p,name){const b=p.buffs[name];if(!b||b.t<=0)return false;b.hits--;if(b.hits<=0)delete p.buffs[name];return true;}
function applyStatus(s,a,d,m){const machine=d.f.combat.passive.machine||d.f.visual?.kind==='machine',status=m.status;
 if(m.disarm){d.statuses.disarm={t:m.disarm};fx(s,d.x,d.y-245,'text','counter','DÉSARMÉ');event(s,'disarm',a,{target:d.slot,frames:m.disarm});}
 if(!status)return;
 if(status==='drowsy'){if(machine||d.sleepImmune>0)return;d.drowsy=clamp(d.drowsy+(m.potency||25),0,100);d.statuses.drowsy={t:120};event(s,'drowsy',a,{target:d.slot,gauge:d.drowsy});if(d.drowsy>=100){d.hit=Math.max(d.hit,14);d.drowsy=0;d.sleepImmune=180;fx(s,d.x,d.y-245,'text','tranq','ÉTOURDISSEMENT BREF');}return;}
 if(status==='poison'||status==='burn'){if(machine&&status==='poison')return;if(!d.statuses[status])d.statuses[status]={t:Math.min(210,m.duration||120),budget:status==='poison'?240:180};event(s,status,a,{target:d.slot});return;}
 if(status==='shock'){if(d.shockImmune>0)return;d.shockImmune=120;d.hit=clamp(d.hit+6,0,36);d.statuses.shock={t:36};if(machine){d.r=['heat','cost'].includes(d.f.combat.resource.kind)?Math.min(d.f.combat.resource.max,d.r+40):Math.max(0,d.r-40);d.buffs={};event(s,'emp',a,{target:d.slot});fx(s,d.x,d.y-130,'ring','electric','EMP');}else event(s,'shock',a,{target:d.slot});return;}
 if(status==='marked'){d.statuses.marked={t:m.duration||120};delete d.buffs.cloak;return;}
 if(status==='slow'){if(!d.statuses.slow)d.statuses.slow={t:clamp(m.duration||100,30,140)};event(s,'slow',a,{target:d.slot});}
}
function biologyDamage060(s,p,m,blocked,contact){
 const b=p.f.combat.biology;if(!b)return {factor:1,zone:null};
 const fire=m.tag==='fire'||m.status==='burn';
 if(!blocked&&fire&&b.exposeOnFire){p.statuses.exposed={t:Math.max(p.statuses.exposed?.t||0,b.exposeOnFire)};event(s,'coreExposed',p,{frames:b.exposeOnFire,by:'fire'});}
 const zone=root.RE_SPATIAL?.resolve(p,box(p),m,contact,blocked)||null;
 const open=zone?zone.critical:p.statuses.exposed?.t>0;
 return {factor:clamp(open?(b.exposed||1):(b.shell||1),.5,1.5)*(fire?clamp(b.fire||1,.5,2):1),zone};
}
// Read-only contact telemetry; values are collision coordinates, not sprite organs.
function impactDetails(s,a,d,m,contact,zone,blocked,amount){
 const body=box(d);let x=d.x,y=body.y+body.h/2,segment=null;
 if(contact?.kind==='projectile'&&root.RE_SPATIAL){
  const hit=root.RE_SPATIAL.sweep(contact.x0,contact.y0,contact.x1,contact.y1,body,contact.padX??8,contact.padY??7);
  if(hit){x=clamp(hit.x,body.x,body.x+body.w);y=clamp(hit.y,body.y,body.y+body.h);segment={x0:contact.x0,y0:contact.y0,x1:hit.x,y1:hit.y};}
 }else if(contact?.kind==='melee'&&overlap(contact.box,body)){
  const b=contact.box;x=(Math.max(b.x,body.x)+Math.min(b.x+b.w,body.x+body.w))/2;y=(Math.max(b.y,body.y)+Math.min(b.y+b.h,body.y+body.h))/2;
 }
 return {frame:s.frame,actor:a.slot,target:d.slot,x,y,kind:contact?.kind||'unlocalized',zone:zone?.critical?zone.id:null,reason:zone?.reason||null,blocked:!!blocked,amount,segment};
}
function damage(s,a,d,m,{projectile=null,forced=false,scale=1,contact=null}={}){if(d.life<=0)return {hit:false};const throwing=m.level==='throw';
 if(throwing&&(d.hit>0||d.blockstun>0||!d.onGround||d.throwProtect>0||!a.onGround))return{hit:false};
 if(throwing&&s.frame-d.lastTech<=7){d.throwProtect=a.throwProtect=65;a.hit=d.hit=10;a.attack=d.attack=null;a.vx=-a.face*4;d.vx=a.face*4;event(s,'throwTech',d);fx(s,(a.x+d.x)/2,FLOOR-160,'ring','counter','DÉCHOPE');return{hit:true,teched:true};}
 // A returning or ricocheting shot arrives from its current flight direction,
 // regardless of the original shooter's position.
 const flightVX=projectile?(projectile.flightVX??projectile.vx):0;
 const incomingX=projectile?(Math.abs(flightVX)>.001?d.x-Math.sign(flightVX)*32:projectile.x):a.x;
 const frontal=(incomingX-d.x)*d.face>=-8;
 if(!forced&&frontal&&canParry(d,m,!!projectile)){
  const par=d.attack.def;d.stats.parries++;d.meter=clamp(d.meter+10+(d.f.combat.passive.parryMeter||0),0,100);
  if(par.restoreOnParry) {d.r=clamp(d.r+par.restoreOnParry,0,d.f.combat.resource.max);}
  if(projectile&&projectile.reflections<1){projectile.owner=d.slot;projectile.vx=-projectile.vx;projectile.face=d.face;projectile.reflections++;projectile.hitTargets={};projectile.damageScale*=.85;projectile.x=d.x+d.face*62;event(s,'reflect',d,{projectile:projectile.id});}
  else{if(projectile)projectile.dead=true;a.hit=32;a.attack=null;a.vx=d.face*7;damage(s,d,a,{...par,kind:'melee',level:'mid',tag:'counter'}, {forced:true});event(s,'parry',d,{target:a.slot});}
  fx(s,d.x,d.y-140,'ring','counter','PARADE');d.attack=null;d.cool=16;return{hit:true,parried:true};
 }
 if(!forced&&projectile&&frontal&&d.buffs.barrier&& !['fire','explosive','rocket'].includes(m.tag)&&!m.fuse){buffHit(d,'barrier');projectile.dead=true;event(s,'barrier',d);fx(s,d.x,d.y-130,'ring','shield','DÉVIÉ');return{hit:true,blocked:true};}
 const blocking=!forced&&d.block&&frontal&&!throwing&&(m.level!=='low'||d.crouch);
 const armor=!forced&&!throwing&&!['electric','emp','rail'].includes(m.tag)&&!!d.buffs.armor;
 const reactive=!forced&&!throwing&&!['electric','emp','rail'].includes(m.tag)&&!!d.buffs.reactive;
 const bio=biologyDamage060(s,d,m,blocking||armor||reactive,contact);
 const base=Math.max(0,m.damage||0)*clamp(a.f.power||1,.85,1.18)*scale*(projectile?.damageScale||1)*(rule58(s,'double_damage')?2:1)*bio.factor;
 const precision=(m.tag==='precision'||m.tag==='rail')&&(projectile?.steady||a.attack?.steady)?1.15:1;
 const marked=!!d.statuses.marked&&(!!projectile||!!a.f.combat.passive.markMelee&&m.kind==='melee');
 const comboScale=clamp(1-.13*Math.max(0,d.comboHits),.35,1);let amount=Math.round(base*precision*(marked?1.12:1)*(a.buffs.power?1.24:1)*(a.buffs.taunt?1.16:1)*(d.buffs.taunt?1.2:1)*(d.buffs.power?1.08:1)*comboScale);
 if(blocking){amount=Math.max(1,Math.round(amount*.12));d.guard=Math.max(0,d.guard-(m.damage||0)/36);d.blockstun=Math.min(20,6+Math.round((m.damage||0)/170));d.stats.blocked++;event(s,'block',d,{damage:amount,level:m.level,slot:m.slot});if(d.guard<=0){d.hit=28;d.blockstun=0;d.guard=35;d.block=false;event(s,'guardBreak',a);}}
 if(armor){amount=Math.round(amount*.35);buffHit(d,'armor');event(s,'armor',d);}
 if(reactive){amount=Math.round(amount*.42);buffHit(d,'reactive');event(s,'reactive',d);if(Math.abs(a.x-d.x)<150){const rd=Math.min(300,a.life-1);a.life-=rd;a.hit=20;a.attack=null;}}
 if(blocking)amount=Math.min(amount,Math.max(0,d.life-1));else amount=Math.min(amount,d.life);
 d.life-=amount;d.gray=clamp(d.gray+Math.round(amount*.35),0,10000-d.life);d.lastHit=s.frame;d.steady=false;d.still=0;d.flash=7;
 delete d.buffs.cloak;delete d.buffs.focus;if(marked)delete d.statuses.marked;
 if(!blocking&&!armor&&!reactive){
  d.comboHits++;d.comboQuiet=0;const stun=Math.min(35,throwing?32:14+Math.round(amount/100));d.hit=Math.max(d.hit,stun);d.comboStun+=stun;d.block=false;d.attack=null;d.cool=0;
  d.vx=(projectile?Math.sign(flightVX):a.face)*(throwing?8:5);if(m.launch&&d.comboHits<4){d.vy=m.launch;d.onGround=false;}
  if(throwing){d.throwProtect=110;a.throwProtect=Math.max(a.throwProtect,30);d.x=clamp(d.x+a.face*48,LEFT,RIGHT);}
  if(d.comboStun>=105){d.hit=12;d.vx=(projectile?Math.sign(flightVX):a.face)*14;d.throwProtect=150;d.comboStun=0;event(s,'comboEscape',d);}
  applyStatus(s,a,d,m);
  a.meter=clamp(a.meter+6,0,100);d.meter=clamp(d.meter+4,0,100);
  if(a.f.combat.passive.bladeEnergy&&['blade','knife','tentacle'].includes(m.tag))a.r=clamp(a.r+a.f.combat.passive.bladeEnergy,0,a.f.combat.resource.max);
  if(m.restoreEnergy&&(d.f.combat.passive.machine||d.f.combat.passive.bladeEnergy||d.f.visual?.outfit==='cyborg')){a.r=clamp(a.r+m.restoreEnergy,0,a.f.combat.resource.max);const restored=heal(s,a,m.heal||0,600);event(s,'zandatsu',a,{restored});fx(s,a.x,a.y-220,'ring','electric','ABSORPTION');}
  if(a.attack)a.attack.confirmed=true;
 }
 a.stats.hits++;a.stats.damage+=amount;s.idleTraining=0;s.lastImpact=impactDetails(s,a,d,m,contact,bio.zone,blocking,amount);fx(s,s.lastImpact.x,s.lastImpact.y,blocking?'guard':'hit',m.tag);if(bio.zone?.critical&&amount>0)event(s,'weakpointHit',a,{target:d.slot,zone:bio.zone.id,amount});
 event(s,'damage',a,{target:d.slot,amount,blocked:blocking,slot:m.slot,tag:m.tag,weakpoint:bio.zone?.critical?bio.zone.id:null});
 return{hit:true,blocked:blocking,amount,weakpoint:bio.zone?.critical?bio.zone.id:null};
}
function explode(s,q){if(q.dead)return;q.dead=true;const a=actors(s)[q.owner],d=other(s,a),radius=q.def.radius||90;
 fx(s,q.x,q.y,'blast',q.def.tag,'');event(s,'explosion',a,{id:q.id,x:q.x,y:q.y,radius,tag:q.def.tag});
 const hb={x:q.x-radius,y:q.y-radius,w:radius*2,h:radius*2};if(overlap(hb,box(d)))damage(s,a,d,{...q.def,level:'mid'},{scale:q.def.detonateOnContact?1:q.damageScale||1,projectile:q.def.detonateOnContact?q:null,contact:{kind:'blast',box:hb,fromX:q.x}});
 for(const tr of s.traps)if(tr.owner!==q.owner&&overlap(hb,{x:tr.x-20,y:tr.y-35,w:40,h:35}))tr.dead=true;
}
function spawn(s,p,m,atk,i){if(rule58(s,'no_projectiles'))return null;const heavy=['rocket','rail','explosive','fire'].includes(m.tag);const q={id:s.nextId++,owner:p.slot,
 x:p.x+p.face*52,y:p.y-(m.height||Math.min(145,box(p).h*.75)),vx:p.face*(m.speed||15),vy:m.vy||0,
 def:m,damageScale:1,life:m.life||80,delay:i*(m.interval||0),age:0,kind:m.fuse?'grenade':m.tag==='psychic'?'orb':m.tag,
 face:p.face,reflections:0,bounces:m.bounces||0,returned:false,dead:false,hitTargets:{},steady:atk.steady,scheduled:m.sustainBurst===true&&i>0,burstIndex:i,
 burstId:atk.id,hitMax:m.returnAt?2:1};
 s.projectiles.push(q);event(s,'projectile',p,{id:q.id,slot:m.slot,index:i});if(s.projectiles.length>60)s.projectiles.shift();return q;}
// R11 devices occupy the existing trap list and use its destruction/reset paths.
// Only commands carrying lucasDevice opt in; legacy traps retain their behavior.
function fireDeviceR11(s,tr,cause){
 if(tr.dead||tr.deviceFired)return false;
 tr.deviceFired=true;tr.dead=true;
 const a=actors(s)[tr.owner];
 const direction=Math.sign(other(s,a).x-tr.x)||a.face;
 explode(s,{...tr,dead:false,exploded:false,vx:direction,flightVX:direction,damageScale:1,def:{...tr.def,radius:tr.def.blastRadius||140,detonateOnContact:true}});
 event(s,'deviceDetonated',a,{id:tr.id,mode:tr.def.lucasDevice,cause});return true;
}
function placeDevicesR11(s,p,d){
 const count=clamp(Math.trunc(d.deviceCount)||1,1,3),facing=p.attack?.face||p.face;
 for(let n=0;n<count;n++){
  const owned=s.traps.filter(t=>t.owner===p.slot&&!t.dead);
  while(owned.length>=3){const expired=owned.shift();expired.dead=true;event(s,'deviceRetired',p,{id:expired.id,cause:'capacity'});}
  const x=clamp(p.x+facing*((d.reach||120)+n*(d.spacing||0)),LEFT,RIGHT);
  s.traps.push({id:s.nextId++,owner:p.slot,x,y:FLOOR,age:0,life:d.duration||480,arm:d.arm||30,hp:d.hp||160,def:d,dead:false,deviceFired:false,deviceFuse:d.lucasDevice==='timed'?(d.fuse||125)+n*(d.fuseInterval||0):null,lastTargetX:other(s,p).x});
  event(s,'trapPlaced',p,{slot:d.slot,mode:d.lucasDevice,x});
 }
}
function stepDeviceR11(s,tr,a,d){
 if(a.life<=0){tr.dead=true;event(s,'deviceRetired',a,{id:tr.id,cause:'owner-ko'});return;}
 const previous=tr.lastTargetX;tr.lastTargetX=d.x;
 if(tr.age===tr.arm)event(s,'deviceArmed',a,{id:tr.id,mode:tr.def.lucasDevice});
 if(tr.age<tr.arm)return;
 if(tr.def.lucasDevice==='timed'){if(tr.age>=tr.deviceFuse)fireDeviceR11(s,tr,'timer');return;}
 if(tr.def.lucasDevice==='remote')return;
 const range=tr.def.triggerRadius||50,body=box(d);
 const near=tr.def.lucasDevice==='wire'?Math.min(previous,d.x)-body.w/2<tr.x+range&&Math.max(previous,d.x)+body.w/2>tr.x-range:Math.abs(tr.x-d.x)<range+body.w/2;
 if(near&&d.y>FLOOR-95)fireDeviceR11(s,tr,'proximity');
}
function activate(s,p,a){if(a.activated)return;a.activated=true;p.stats.activations++;p.lastActivation=a.name;const d=a.def,o=other(s,p);event(s,'activate',p,{slot:a.name,kind:d.kind,name:d.name});
 if(d.exposeSelf&&p.f.combat.biology){p.statuses.exposed={t:d.exposeSelf};event(s,'coreExposed',p,{frames:d.exposeSelf,by:a.name});}
 if(d.kind==='projectile'){for(let i=0;i<(d.count||1);i++)spawn(s,p,d,a,i);}
 if(d.kind==='trap'&&d.lucasDevice)placeDevicesR11(s,p,d);
 if(d.kind==='trap'&&!d.lucasDevice){
  const owned=s.traps.filter(t=>t.owner===p.slot&&!t.dead);while(owned.length>=(d.maxTraps||2)){owned.shift().dead=true;}
  s.traps.push({id:s.nextId++,owner:p.slot,x:clamp(p.x+p.face*(Math.min(d.reach||70,150)),LEFT,RIGHT),y:FLOOR,age:0,life:d.duration||360,arm:d.arm||40,hp:d.hp||160,def:d,dead:false});
  event(s,'trapPlaced',p,{slot:a.name});
 }
 if(d.kind==='detonate'){let count=0;for(const tr of s.traps)if(tr.owner===p.slot&&!tr.dead&&tr.age>=tr.arm){if(d.lucasDevice==='remote-trigger'){if(tr.def.lucasDevice==='remote'){fireDeviceR11(s,tr,'remote');count++;}}else{explode(s,{...tr,def:{...tr.def,radius:tr.def.reach||90}});tr.dead=true;count++;}}if(d.lucasDevice&&count===0){p.feedback='AUCUNE CHARGE TÉLÉCOMMANDÉE ARMÉE';p.feedbackT=80;}event(s,'detonator',p,{count});}
 if(d.kind==='buff'){const target=d.target==='enemy'?o:p;if(d.target!=='enemy'||Math.abs(o.x-p.x)<(d.reach||600)){target.buffs[d.buff]={t:d.duration||120,hits:d.hits||1};fx(s,target.x,target.y-120,'ring',d.tag,d.buff==='cloak'?'CAMOUFLAGE':d.buff==='power'?'SURACTIVITÉ':d.buff==='taunt'?'PROVOQUÉ':d.name);event(s,'buff:'+d.buff,p,{target:target.slot});}}
 if(d.kind==='heal'){const amount=heal(s,p,d.heal||250);fx(s,p.x,p.y-245,'text','recovery',amount?'+'+amount+' RÉCUPÉRABLE':'AUCUNE BLESSURE RÉCUPÉRABLE');}
 if(d.kind==='mark'){if(Math.abs(o.x-p.x)<(d.reach||600)){o.statuses.marked={t:d.duration||180};delete o.buffs.cloak;fx(s,o.x,o.y-250,'text','recon','MARQUÉ');event(s,'mark',p,{target:o.slot});}}
 if(d.kind==='reload'){p.r=p.f.combat.resource.max;fx(s,p.x,p.y-245,'text','reload','RECHARGÉ');event(s,'reload',p);}
 if(d.kind==='recover'){const r=p.f.combat.resource;p.r=clamp(p.r+(['heat','cost'].includes(r.kind)?-1:1)*(d.restore||28),0,r.max);event(s,'recover',p);}
 if(d.kind==='mobility'){
  if(d.blink){p.x=clamp(p.x+p.face*d.blink,LEFT,RIGHT);event(s,'reposition',p);fx(s,p.x,p.y-70,'ring','psychic');}
 }
 if(d.launchSelf&&p.onGround){p.vy=d.launchSelf;p.onGround=false;}
 if(d.selfDamage){p.life=Math.max(1,p.life-d.selfDamage);p.gray=Math.min(p.gray,10000-p.life);event(s,'selfDamage',p,{amount:d.selfDamage});}
}
function prepare(s,p,input){const o=other(s,p);if(!p.attack)p.face=s.options.training&&p.slot===1&&[-1,1].includes(s.options.dummyFacing)?s.options.dummyFacing:o.x>=p.x?1:-1;
 p.crouch=!!input.down&&p.onGround&&!p.attack;p.block=!!input.guard&&!p.attack&&!p.hit;
 if(input.tech||input.slot==='throw')p.lastTech=s.frame;
 if(p.hit||p.blockstun){p.state=p.hit?'hit':'guard';return;}
 if(input.slot)start(s,p,input.slot);
 if(p.attack){p.state='attack';p.block=false;return;}
 if(input.jump&&p.onGround){p.vy=-12.6;p.onGround=false;p.crouch=false;p.block=false;event(s,'jump',p);}
 const dir=(input.right?1:0)-(input.left?1:0);const slowed=p.statuses.slow||p.statuses.drowsy;
 if(p.onGround&&input.dash&&!p.cool){p.vx=(dir||p.face)*10*clamp(p.f.speed||1,.8,1.15);p.cool=14;event(s,'dash',p);}
 else if(!p.cool)p.vx=p.block?dir*1.2:dir*4.4*clamp(p.f.speed||1,.78,1.2)*(slowed?.68:1)*(p.crouch?.4:1);
 p.state=!p.onGround?'jump':p.block?'guard':p.crouch?'crouch':Math.abs(p.vx)>1?'walk':'idle';
}
function upkeep(s,p){for(const k of ['hit','blockstun','cool','flash','throwProtect','shockImmune','sleepImmune','resourceDelay','feedbackT'])p[k]=Math.max(0,(p[k]||0)-1);
 for(const k of Object.keys(p.cooldowns))p.cooldowns[k]=Math.max(0,p.cooldowns[k]-1);
 for(const [k,b] of Object.entries(p.buffs)){if(--b.t<=0)delete p.buffs[k];}
 for(const [k,v] of Object.entries(p.statuses)){
  if((k==='poison'||k==='burn')&&s.frame%6===0&&v.budget>0){const n=Math.min(k==='poison'?7:9,v.budget,p.life-1);if(n>0){p.life-=n;v.budget-=n;event(s,'dot',p,{amount:n,status:k});}}
  if(--v.t<=0)delete p.statuses[k];
 }
 if(!p.statuses.drowsy)p.drowsy=Math.max(0,p.drowsy-.24);
 const r=p.f.combat.resource,pa=p.f.combat.passive;
 if(p.resourceDelay<=0&&!p.attack){const sign=['heat','cost'].includes(r.kind)?-1:1;if(r.kind!=='ammo')p.r=clamp(p.r+sign*r.regen,0,r.max);}
 if(!p.hit&&!p.blockstun&&!p.attack&&!p.block&&s.frame-p.lastHit>90)p.guard=clamp(p.guard+(pa.guardRegen||.12),0,100);
 if(Math.abs(p.vx)<.2&&p.onGround&&!p.hit&&!p.attack){p.still++;if(pa.steady&&p.still>=36)p.steady=true;}else if(Math.abs(p.vx)>=.2||!p.onGround){p.still=0;p.steady=false;delete p.buffs.focus;}
 if(pa.regenGray&&s.frame-p.lastHit>180&&s.frame-p.lastOffense>180&&!p.attack&&!p.hit&&(!pa.stationaryRegen||p.still>180))heal(s,p,pa.regenGray,pa.regenBudget);
 if(!p.attack){p.chainQuiet++;if(p.chainQuiet>20)p.chainDepth=0;}else p.chainQuiet=0;
 if(!p.hit&&!p.blockstun){p.comboQuiet++;if(p.comboQuiet>40){p.comboHits=0;p.comboStun=0;}}
 if(s.options.training&&s.options.freeMeter)p.meter=100;
 if(s.options.freeResource)p.r=['heat','cost'].includes(r.kind)?0:r.max;
}
function action(s,p){const a=p.attack;if(!a)return;const d=a.def;a.t++;
 if(a.t===d.startup)activate(s,p,a);
 const window=strikeWindow(a);if(window>=0&&a.strikeWindow!==window){a.strikeWindow=window;a.hit=false;}
 if(a.t>=d.startup&&a.t<d.startup+d.active){
  if(d.travel&&!p.hit)p.x=clamp(p.x+p.face*d.travel,LEFT,RIGHT);
  if(d.kind==='mobility')p.state='walk';
 }
 if(a.t>=d.startup+d.active+d.recovery){p.attack=null;p.state='idle';}
}
function projectileStep(s){for(const q of s.projectiles){if(q.dead)continue;
 if(q.scheduled){
  const owner=actors(s)[q.owner],attack=owner.attack;
  if(owner.life<=0||!attack||attack.id!==q.burstId||attack.name!==q.def.slot){q.dead=true;event(s,'burstCancelled',owner,{id:q.id,index:q.burstIndex});continue;}
  if(q.delay<=0){q.x=owner.x+attack.face*52;q.y=owner.y-(q.def.height||Math.min(145,box(owner).h*.75));q.face=attack.face;q.vx=attack.face*(q.def.speed||15);q.scheduled=false;event(s,'burstRelease',owner,{id:q.id,index:q.burstIndex});}
 }
 if(q.delay>0){q.delay--;continue;}q.age++;q.life--;
 const m=q.def,a=actors(s)[q.owner],d=other(s,a),x0=q.x,y0=q.y,reflectionsAtMove=q.reflections;q.flightVX=q.vx;q.x+=q.vx;q.y+=q.vy;
 if(m.gravity)q.vy+=m.gravity;
 if(m.homing&&!d.buffs.cloak){const targetY=d.y-Math.min(box(d).h*.55,140),max=m.homing;q.vy=clamp(q.vy+clamp((targetY-q.y)*.001,-max,max),-3.6,3.6);}
 const turnAfterContact=m.returnAt&&q.age>=m.returnAt&&!q.returned;
 if(m.gravity&&q.y>=FLOOR-10){q.y=FLOOR-10;q.vy=-Math.abs(q.vy)*.46;q.vx*=.7;}
 if(m.fuse){if(q.age>=m.fuse){explode(s,q);continue;}}
 else{
  // Swept segment prevents a fast bullet skipping a narrow drone.
  const r={x:Math.min(q.x,x0)-8,y:Math.min(q.y,y0)-7,w:Math.abs(q.x-x0)+16,h:Math.abs(q.y-y0)+14};
  const crossing=root.RE_SPATIAL?root.RE_SPATIAL.sweep(x0,y0,q.x,q.y,box(d),8,7):overlap(r,box(d));
  // Re-arm the return BEFORE sweeping this frame. Waiting until after the
  // crossing loses fast return hits. Do not re-arm while still inside a body.
  if(m.returnAt&&q.returned&&q.hitTargets[d.slot]==='out'&&!overlap({x:x0-8,y:y0-7,w:16,h:14},box(d)))delete q.hitTargets[d.slot];
  if(crossing&&!q.hitTargets[d.slot]){
   if(m.detonateOnContact){if(typeof crossing==='object'){q.x=crossing.x;q.y=crossing.y;}explode(s,q);continue;}
   const ret=damage(s,a,d,m,{projectile:q,contact:{kind:'projectile',fromX:x0,x0,y0,x1:q.x,y1:q.y,padX:8,padY:7}});
   if(!ret.parried){q.hitTargets[d.slot]=q.returned?'return':'out';if(!m.returnAt||q.returned)q.dead=true;}
  }else if(m.returnAt&&q.returned&&q.hitTargets[d.slot]==='out'&&Math.abs(q.x-d.x)>90){delete q.hitTargets[d.slot];}
 }
 if(turnAfterContact&&!q.dead&&q.reflections===reflectionsAtMove){q.vx=-q.vx;q.returned=true;event(s,'return',a,{id:q.id});}
 if(q.x<LEFT-35||q.x>RIGHT+35){if(m.detonateOnContact){q.x=clamp(q.x,LEFT-35,RIGHT+35);explode(s,q);continue;}if(q.bounces>0){q.vx=-q.vx;q.bounces--;q.x=clamp(q.x,LEFT-35,RIGHT+35);event(s,'ricochet',a,{id:q.id});}else if(!m.returnAt||q.returned)q.dead=true;}
 if(q.life<=0){if(m.fuse)explode(s,q);else q.dead=true;}if(q.y>FLOOR+100||q.y<-140)q.dead=true;
 }
 s.projectiles=s.projectiles.filter(q=>!q.dead);
}
function objectsStep(s){for(const tr of s.traps){if(tr.dead)continue;tr.age++;tr.life--;const a=actors(s)[tr.owner],d=other(s,a);
 if(tr.life<=0){tr.dead=true;continue;}if(tr.def.lucasDevice){stepDeviceR11(s,tr,a,d);continue;}if(tr.age<tr.arm)continue;
 if(!tr.def.remoteOnly&&Math.abs(tr.x-d.x)<(tr.def.reach||90)&&d.y>FLOOR-95){const result=damage(s,a,d,{...tr.def,level:tr.def.tag==='snare'?'low':'mid'},{contact:{kind:'trap',fromX:tr.x}});if(result.hit){tr.dead=true;fx(s,tr.x,FLOOR-30,'blast',tr.def.tag);event(s,'trapTrigger',a);}}
 }s.traps=s.traps.filter(t=>!t.dead);}
function destroyObjects(s,p,hb,m){for(const tr of s.traps)if(tr.owner!==p.slot&&!tr.dead&&overlap(hb,{x:tr.x-22,y:tr.y-60,w:44,h:60})){tr.hp-=Math.max(140,m.damage);if(tr.hp<=0){tr.dead=true;event(s,'trapDestroyed',p);fx(s,tr.x,tr.y-30,'hit',tr.def.tag);}}
 for(const q of s.projectiles)if(q.owner!==p.slot&&!q.dead&&q.delay<=0&&overlap(hb,{x:q.x-16,y:q.y-12,w:32,h:24})&& !['rail','laser'].includes(q.def.tag)){q.dead=true;event(s,'projectileDestroyed',p);fx(s,q.x,q.y,'ring','counter');}
}
function roundEnd(s,winner){s.phase='roundEnd';s.phaseT=90;s.roundWinner=winner;if(winner>=0)actors(s)[winner].wins++;s.projectiles=[];s.traps=[];event(s,'roundEnd',winner<0?null:actors(s)[winner],{winner});}
function step(s,inputs=[empty(),empty()]){if(s.finished)return s;
 s.frame++;s.fx.forEach(x=>x.t--);s.fx=s.fx.filter(x=>x.t>0);
 if(s.phase==='intro'){if(--s.phaseT<=0)s.phase='fight';return s;}
 if(s.phase==='roundEnd'){if(--s.phaseT<=0){if(s.a.wins>=s.rounds||s.b.wins>=s.rounds){s.finished=true;s.winner=s.a.wins>s.b.wins?0:1;event(s,'matchEnd',actors(s)[s.winner]);}else{s.round++;reset(s);}}return s;}
 if(s.phase!=='fight')return s;
 if(!s.options.training&&s.timerStart>0)s.timer=Math.max(0,s.timer-1);
 const ps=actors(s);ps.forEach(p=>upkeep(s,p));ps.forEach((p,i)=>prepare(s,p,inputs[i]||empty()));ps.forEach(p=>action(s,p));
 for(const p of ps){if(p.hit||p.blockstun||p.cool)p.vx*=.82;p.x=clamp(p.x+p.vx,LEFT,RIGHT);if(!p.onGround)p.vy+=rule58(s,'low_gravity')?.38:.72;p.y+=p.vy;if(p.y>=FLOOR){p.y=FLOOR;p.vy=0;p.onGround=true;}else p.onGround=false;}
 const minGap=(box(s.a).w+box(s.b).w)*.30,gap=Math.abs(s.a.x-s.b.x);if(gap<minGap&&Math.abs(s.a.y-s.b.y)<110){
  const left=s.a.x<=s.b.x?s.a:s.b,right=left===s.a?s.b:s.a,shift=(minGap-gap)/2;
  left.x=Math.max(LEFT,left.x-shift);right.x=Math.min(RIGHT,right.x+shift);
  // If one actor reached a wall, the other takes the remaining displacement.
  const remaining=minGap-(right.x-left.x);if(remaining>0){if(left.x<=LEFT)right.x=Math.min(RIGHT,right.x+remaining);else left.x=Math.max(LEFT,left.x-remaining);}
 }
 // Collect before applying damage, allowing genuinely simultaneous active frames.
 const pending=[];for(const p of ps){const hb=hitbox(p),a=p.attack;if(!hb||!a||a.hit)continue;destroyObjects(s,p,hb,a.def);const o=other(s,p);if(overlap(hb,box(o))){pending.push({p,o,a,hb});}}
 for(const {p,o,a,hb} of pending){const hit=damage(s,p,o,a.def,{scale:a.def.hitWindows?.[a.strikeWindow]?.scale??1,contact:{kind:'melee',box:hb,fromX:p.x}});if(hit.hit){a.hit=true;a.confirmed=!hit.blocked&&!hit.parried;}}
 projectileStep(s);objectsStep(s);for(const p of ps)p.projectiles=s.projectiles.filter(q=>q.owner===p.slot&&!q.dead);
 if(s.options.training){s.idleTraining++;for(const p of ps)p.life=Math.max(1,p.life);if(s.options.autoheal&&s.idleTraining>=150){for(const p of ps){p.life=10000;p.gray=0;p.guard=100;p.statuses={};}s.idleTraining=0;}}
 else if(s.a.life<=0||s.b.life<=0)roundEnd(s,s.a.life===s.b.life?-1:s.a.life>s.b.life?0:1);
 else if(s.timerStart>0&&s.timer<=0)roundEnd(s,s.a.life===s.b.life?-1:s.a.life>s.b.life?0:1);
 return s;
}
const CPU_PROFILES59=['balanced','rushdown','zoner','grappler','turtle','whiff','sniper','trapper','parry','resource','evasive','boss'];
function cpu(s,p,o,settings={}){
 const profile=CPU_PROFILES59.includes(settings.profile)?settings.profile:'balanced',reaction=clamp(Number(settings.reaction)||18,6,32),aggression=clamp(Number(settings.aggression)||1,.5,2);
 const memory=p.cpu59||(p.cpu59={frame:-1,nextDecision:0,guardUntil:0,seenAttack:null,seenAt:0,projectileAt:null,recent:[],input:empty()});
 // A slow-motion presentation tick may query twice before the next physics step.
 if(memory.frame===s.frame)return {...memory.input};
 const i=empty(),d=Math.abs(o.x-p.x),dir=o.x>p.x?1:-1,finish=()=>{memory.frame=s.frame;memory.input={...i};p.cpuWait=Math.max(0,memory.nextDecision-s.frame);return i;};
 if(s.phase!=='fight'||s.finished||p.life<=0)return finish();
 const attack=o.attack,attackKey=attack?o.sequence+':'+attack.id:null;
 if(attackKey!==memory.seenAttack){memory.seenAttack=attackKey;memory.seenAt=s.frame;}
 const incoming=s.projectiles.filter(q=>!q.dead&&q.delay<=0&&q.owner!==p.slot&&(p.x-q.x)*q.vx>0&&Math.abs(q.x-p.x)<360&&q.y>p.y-box(p).h-20&&q.y<p.y+20).sort((a,b)=>Math.abs(a.x-p.x)-Math.abs(b.x-p.x))[0];
 if(!incoming)memory.projectileAt=null;else if(memory.projectileAt===null)memory.projectileAt=s.frame;
 const visibleThreat=attack&&s.frame-memory.seenAt>=reaction&&attack.t<attack.def.startup+attack.def.active&&d<(attack.def.reach||130)+105;
 const projectileThreat=incoming&&s.frame-memory.projectileAt>=reaction;
 if(p.hit>0)return finish();
 if(memory.guardUntil>s.frame||p.blockstun>0){i.guard=true;i.down=!!memory.low;return finish();}
 if(!p.attack&&(visibleThreat||projectileThreat)&&s.frame>=memory.nextDecision){
  const threat=visibleThreat?attack.def:incoming.def;
  if(threat.level==='throw'){i.left=dir>0;i.right=dir<0;i.tech=true;memory.nextDecision=s.frame+reaction;return finish();}
  const parries=Object.values(p.f.combat.moves).filter(m=>m.kind==='parry'&&canStart(s,p,m.slot)&&m.parryMode===(projectileThreat?'projectile':'melee'));
  if(profile==='parry'&&parries.length){i.slot=parries[0].slot;memory.nextDecision=s.frame+reaction;return finish();}
  if(rand(s)<clamp(.45+aggression*.15+(profile==='turtle'?.3:0),.4,.92)){memory.guardUntil=s.frame+8+Math.floor(rand(s)*reaction);memory.low=threat.level==='low';i.guard=true;i.down=memory.low;memory.nextDecision=memory.guardUntil;return finish();}
 }
 const target=box(o),available=Object.values(p.f.combat.moves).filter(m=>canStart(s,p,m.slot));
 const lineReaches=m=>{if(m.fuse||m.gravity||m.homing)return true;const y=p.y-(m.height||Math.min(145,box(p).h*.75));return y+7>=target.y&&y-7<=target.y+target.h;};
 const canFire=available.some(m=>m.kind==='projectile'&&lineReaches(m)),r=p.f.combat.resource,ratio=['heat','cost'].includes(r.kind)?1-p.r/r.max:p.r/r.max;
 let preferred={balanced:canFire?230:95,rushdown:80,zoner:canFire?320:95,grappler:65,turtle:canFire?260:110,whiff:145,sniper:canFire?450:105,trapper:180,parry:125,resource:canFire?280:110,evasive:canFire?280:140,boss:135}[profile];
 // A tactical label cannot invent a firearm or trap absent from this fighter's loadout.
 if(canFire){const ranges=available.filter(m=>m.kind==='projectile'&&lineReaches(m)).map(m=>(m.speed||15)*(m.life||80)+50);preferred=Math.min(preferred,Math.max(85,Math.max(...ranges)-40));}
 else if(!available.some(m=>m.kind==='trap')){const ranges=available.filter(m=>m.kind==='melee'&&m.level!=='throw').map(m=>(m.reach||100)*clamp(p.f.reach||1,.85,1.25)+target.w/2+(m.travel?Math.abs(m.travel)*Math.min(m.active,10):0));preferred=Math.min(preferred,Math.max(70,(ranges.length?Math.max(...ranges):140)-50));}
 const move=()=>{if(p.attack||p.cool)return;let direction=0;if(d>preferred+30)direction=dir;else if(d<preferred-55&&!['rushdown','grappler','boss'].includes(profile))direction=-dir;
  if(direction<0&&p.x<=LEFT+12||direction>0&&p.x>=RIGHT-12)direction=0;i.left=direction<0;i.right=direction>0;};
 const cancellable=!!p.attack?.confirmed&&available.length>0;
 if(p.attack&&!cancellable)return finish();
 if(s.frame<memory.nextDecision&&!cancellable){move();return finish();}
 memory.nextDecision=s.frame+Math.max(5,Math.round(reaction*(.7+rand(s)*.8)));
 const scores=[];
 for(const m of available){let weight=0;const reach=(m.reach||100)*clamp(p.f.reach||1,.85,1.25)+target.w/2+(m.travel?Math.abs(m.travel)*Math.min(m.active,10):0);
  if(m.level==='throw')weight=d<reach&&o.onGround&&!o.hit&&!o.blockstun&&!o.throwProtect?(profile==='grappler'?5:o.block?3.5:1.4):0;
  else if(m.kind==='melee'){
   const top=p.y-(m.height||(m.level==='low'?62:190)),height=m.level==='low'?62:Math.min(155,m.height||155);
   if(d<reach&&top<target.y+target.h&&top+height>target.y)weight=1.1+(m.damage||0)/1300+(m.startup<=10?.7:0)+(m.level==='low'&&o.block?1:0);
   if(weight&&profile==='whiff'&&attack&&attack.t>=attack.def.startup+attack.def.active)weight*=1.8;
  }else if(m.kind==='projectile')weight=d>120&&d<(m.speed||15)*(m.life||80)+50&&lineReaches(m)?(['zoner','sniper'].includes(profile)?3.2:1.3):0;
  else if(m.kind==='parry')weight=(visibleThreat&&m.parryMode==='melee'||projectileThreat&&m.parryMode==='projectile')?1.8:0;
  else if(m.kind==='reload'||m.kind==='recover')weight=ratio<.5&&d>170?2.5+(1-ratio)*3:0;
  else if(m.kind==='heal')weight=p.gray>150&&p.regenUsed<(p.f.combat.passive.regenBudget||900)&&d>240?1.1+p.gray/800:0;
  else if(m.kind==='buff'){const targetActor=m.target==='enemy'?o:p;weight=!targetActor.buffs[m.buff]&&d>170&&(m.target!=='enemy'||d<(m.reach||600))?1:0;}
  else if(m.kind==='mark')weight=!o.statuses.marked&&d>160&&d<(m.reach||600)?1.2:0;
  else if(m.kind==='trap')weight=d>110&&s.traps.filter(t=>t.owner===p.slot&&!t.dead).length<(m.maxTraps||2)?(profile==='trapper'?3:1):0;
  else if(m.kind==='detonate')weight=s.traps.some(t=>t.owner===p.slot&&!t.dead&&t.age>=t.arm&&(!m.lucasDevice||t.def.lucasDevice==='remote')&&Math.abs(t.x-o.x)<(t.def.blastRadius||t.def.reach||90)+target.w/2&&o.y>FLOOR-95)?4:0;
  else if(m.kind==='mobility'){const shift=m.blink||(m.travel||0)*(m.active||1),after=Math.abs(d-shift);weight=Math.abs(d-preferred)-Math.abs(after-preferred)>30?1.2:0;}
  if(m.slot==='super'&&weight)weight*=profile==='boss'?2:1.15;
  if(memory.recent.includes(m.slot))weight*=memory.recent[0]===m.slot?.36:.7;
  if(weight>0)scores.push({m,weight});
 }
 const total=scores.reduce((n,x)=>n+x.weight,0);
 if(total&&(cancellable||rand(s)<clamp(.66+aggression*.17,.7,.97))){let roll=rand(s)*total;for(const x of scores){roll-=x.weight;if(roll<=0){i.slot=x.m.slot;memory.recent=[x.m.slot,...memory.recent].slice(0,3);break;}}}
 if(!i.slot){move();if(p.onGround&&d>210&&d<500&&rand(s)<.08)i.jump=true;else if((i.left||i.right)&&p.onGround&&d>260&&rand(s)<.12)i.dash=true;}
 return finish();
}
function directionSlot(held,face){if(held.down)return'specialDown';const dir=(held.right?1:0)-(held.left?1:0);return dir===face?'specialForward':dir===-face?'specialBack':'special';}
const api={version:'0.60',FPS:60,FLOOR,SLOTS,slotName,create,step,start,canStart,unavailableReason,reset,box,hitbox,overlap,empty,cpu,cpuProfiles:CPU_PROFILES59,directionSlot,costAllowed,damage,heal,explode};
root.CQCCombat060=api;root.CQCCombat046=api;root.CQCCombat045=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
