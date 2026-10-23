/* CQC v0.60 — deterministic defeat presentation. No timers, DOM, audio or game mutations. */
(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.CQC_DEFEAT_060 = api;
})(typeof globalThis === 'object' ? globalThis : this, function () {
  'use strict';

  const SANS = 'Arial, DejaVu Sans, sans-serif';
  const MONO = 'ui-monospace, DejaVu Sans Mono, monospace';
  const BASE_WIDTH = 1280;
  const BASE_HEIGHT = 720;
  const freeze = Object.freeze;
  const families = freeze({
    biohazard: freeze({id:'biohazard',label:'BIOHAZARD / SUJET NEUTRALISÉ',accent:'#c74c4c',second:'#725253',paper:'#eee4d7',ground:'#140c0e',shape:'terminal'}),
    retro: freeze({id:'retro', label:'RADIO / 8 BITS', accent:'#93efa8', second:'#477a68', paper:'#eaffdf', ground:'#081915', shape:'terminal'}),
    handheld: freeze({id:'handheld', label:'TRANSMISSION / PORTABLE', accent:'#cce49c', second:'#647d44', paper:'#f4ffd3', ground:'#172214', shape:'lcd'}),
    codec: freeze({id:'codec', label:'CODEC / INFILTRATION', accent:'#ff6d66', second:'#738d96', paper:'#f2e7db', ground:'#12191e', shape:'carrier'}),
    network: freeze({id:'network', label:'RÉSEAU / PLATEFORME', accent:'#87dbe2', second:'#ad4b52', paper:'#e9fcff', ground:'#10212b', shape:'network'}),
    survival: freeze({id:'survival', label:'OPÉRATION / SURVIE', accent:'#e8c982', second:'#a64c45', paper:'#fff1d6', ground:'#25231c', shape:'film'}),
    command: freeze({id:'command', label:'UNITÉ / COMMANDEMENT', accent:'#d9c78a', second:'#8f5748', paper:'#fbf2d9', ground:'#242922', shape:'dossier'}),
    tactical: freeze({id:'tactical', label:'TACTIQUE / CHAMP DE BATAILLE', accent:'#d7e3dc', second:'#ad554c', paper:'#ffffff', ground:'#23292b', shape:'tactical'}),
    phantom: freeze({id:'phantom', label:'OPÉRATION / EXTRACTION', accent:'#f68a79', second:'#6c7975', paper:'#fff2e8', ground:'#1d2223', shape:'bars'}),
    acid: freeze({id:'acid', label:'AC!D / TACTIQUE', accent:'#f291dc', second:'#83d9e7', paper:'#fff0fc', ground:'#271d34', shape:'cards'}),
    cyborg: freeze({id:'cyborg', label:'HF / CYBORG', accent:'#7be3ff', second:'#ff6767', paper:'#f3fbff', ground:'#111f2b', shape:'cut'}),
    survive: freeze({id:'survive', label:'EXPLORATION / SURVIE', accent:'#eec88a', second:'#88bdb6', paper:'#fff6dc', ground:'#263331', shape:'contour'}),
    online: freeze({id:'online', label:'UNITÉ / MULTIJOUEUR', accent:'#ffa686', second:'#98cdd2', paper:'#fff1de', ground:'#212c35', shape:'score'}),
    legacy: freeze({id:'legacy', label:'CQC / ARCHIVES', accent:'#dfccac', second:'#809496', paper:'#fff7e9', ground:'#24282a', shape:'terminal'})
  });

  // Reviewed mappings for all 31 released game groups and all 88 episode labels.
  const groupFamilies = freeze({
    "mg_msx": "retro",
    "mg_nes": "retro",
    "mg2": "retro",
    "snakes_revenge": "retro",
    "mgs1": "codec",
    "twin_snakes": "codec",
    "vr_missions": "codec",
    "mgs2": "network",
    "mgs3": "survival",
    "delta": "survival",
    "mpo": "command",
    "mpo_plus": "command",
    "pw": "command",
    "gz": "phantom",
    "tpp": "phantom",
    "mgs4": "tactical",
    "mgr": "cyborg",
    "rising_proto": "cyborg",
    "survive": "survive",
    "ghost_babel": "handheld",
    "acid": "acid",
    "acid2": "acid",
    "acid_mobile": "acid",
    "acid2_mobile": "acid",
    "mobile": "codec",
    "touch": "tactical",
    "mgo1": "survival",
    "mgo2": "tactical",
    "mgo3": "phantom",
    "arcade": "online",
    "social_ops": "command"
});
  const episodeFamilies = freeze({
    "MGS1 / RENFORTS": "codec",
    "MGS2 / RENFORTS": "network",
    "MGS3 / RENFORTS": "survival",
    "MGS4 / RENFORTS": "tactical",
    "GHOST / RENFORTS": "handheld",
    "MPO / RENFORTS": "command",
    "MGR / RENFORTS": "cyborg",
    "MG1 / RENFORTS": "retro",
    "MG2 / RENFORTS": "retro",
    "TPP / RENFORTS": "phantom",
    "METAL GEAR AC!D / ADAPTATION VERSUS": "acid",
    "METAL GEAR / INTRUDE N313": "retro",
    "METAL GEAR / SHOOT GUNNER": "retro",
    "METAL GEAR / OUTER HEAVEN": "retro",
    "METAL GEAR / COWARD DUCK": "retro",
    "METAL GEAR / COMMANDANT FINAL": "retro",
    "METAL GEAR 2 / ZANZIBAR LAND": "retro",
    "METAL GEAR 2 / BLACK COLOR": "retro",
    "METAL GEAR 2 / POURSUITE": "retro",
    "METAL GEAR 2 / DÉMOLITION": "retro",
    "METAL GEAR 2 / DUEL À MAINS NUES": "retro",
    "PORTABLE OPS / SAN HIERONYMO": "command",
    "PORTABLE OPS / PERFECT SOLDIER": "command",
    "PORTABLE OPS / FOX": "command",
    "PORTABLE OPS / FOX COMMANDER": "command",
    "GHOST BABEL / INFILTRATION": "handheld",
    "GHOST BABEL / BLACK CHAMBER": "handheld",
    "THE PHANTOM PAIN / DIAMOND DOGS": "phantom",
    "THE PHANTOM PAIN / TIREUSE": "phantom",
    "MGS4 / VÉTÉRAN CQC": "tactical",
    "MGS4 / DUEL CQC": "tactical",
    "REVENGEANCE / DESPERADO": "cyborg",
    "REVENGEANCE / NANOMACHINES": "cyborg",
    "MGS3 / COBRA UNIT": "survival",
    "SONS OF LIBERTY / SNEAKING SUIT": "network",
    "MGS2 / SONS OF LIBERTY": "network",
    "MGS2 / DEAD CELL": "network",
    "MGS1 / FOXHOUND": "codec",
    "THE JOY": "survival",
    "SNAKE EATER": "survival",
    "MGS3 / OCELOT UNIT": "survival",
    "GRU / THUNDERBOLT": "survival",
    "MGS1 / SHADOW MOSES": "codec",
    "MGS1 / CYBORG NINJA": "codec",
    "REVENGEANCE / CYBORG": "cyborg",
    "REVENGEANCE / MURASAMA": "cyborg",
    "PW / CONTENU 0.22": "command",
    "MGSV / CONTENU 0.22": "phantom",
    "MGS3 / CONTENU 0.22": "survival",
    "MPO / CONTENU 0.22": "command",
    "AC!D 2 / SIMULATION VERSUS": "acid",
    "SNAKE’S REVENGE / OPERATION 747": "retro",
    "MGS4 / RAT PATROL TEAM 01": "tactical",
    "MGS4": "tactical",
    "PEACE WALKER": "command",
    "MGSV": "phantom",
    "AC!D 2": "acid",
    "SURVIVE": "survive",
    "MGS1": "codec",
    "PORTABLE OPS": "command",
    "METAL GEAR NES": "retro",
    "THE TWIN SNAKES": "codec",
    "MGS DELTA": "survival",
    "VR MISSIONS": "codec",
    "MGS2 VR": "network",
    "MGS MOBILE": "codec",
    "MGS TOUCH": "tactical",
    "MGS RISING": "cyborg",
    "PORTABLE OPS PLUS": "command",
    "MGO1": "survival",
    "MGO2": "tactical",
    "MGO3": "phantom",
    "METAL GEAR ARCADE": "online",
    "SOCIAL OPS": "command",
    "AC!D MOBILE": "acid",
    "AC!D 2 MOBILE": "acid",
    "MG1": "retro",
    "MG2": "retro",
    "MGS2": "network",
    "SNAKE'S REVENGE": "retro",
    "GHOST BABEL": "handheld",
    "AC!D": "acid",
    "MGS3": "survival",
    "GROUND ZEROES": "phantom",
    "METAL GEAR 2": "retro",
    "METAL GEAR": "retro",
    "REVENGEANCE": "cyborg",
    "PORTABLE OPS+": "command"
});
  const finite = (v, fallback) => typeof v === 'number' && Number.isFinite(v) ? v : fallback;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  function safeText(v, fallback) {
    if (typeof v !== 'string') return fallback;
    return v.replace(/[\u0000-\u001f\u007f]/g,' ').trim().slice(0,240) || fallback;
  }
  function episodeOf(fighter) {
    return safeText(fighter && (fighter.ep || fighter.episode || fighter.game || fighter.origin || fighter.group), '');
  }
  function themeFor(fighter, override) {
    if (typeof override === 'string' && Object.prototype.hasOwnProperty.call(families,override)) return families[override];
    const episode = episodeOf(fighter);
    if(/^re[a-z0-9-]*-/i.test(fighter?.uid||fighter?.id||'')||/Resident Evil|BIOHAZARD|^RE\d/i.test(episode))return families.biohazard;
    if (Object.prototype.hasOwnProperty.call(episodeFamilies,episode)) return families[episodeFamilies[episode]];
    if (Object.prototype.hasOwnProperty.call(groupFamilies,episode)) return families[groupFamilies[episode]];
    const s = episode.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (/GHOST BABEL/.test(s)) return families.handheld;
    if (/AC[!I]D|ACID/.test(s)) return families.acid;
    if (/RISING|REVENGEANCE|RISING SON/.test(s)) return families.cyborg;
    if (/SURVIVE/.test(s)) return families.survive;
    if (/ONLINE|ARCADE/.test(s)) return families.online;
    if (/PORTABLE OPS|PEACE WALKER|SOCIAL OPS/.test(s)) return families.command;
    if (/GROUND ZERO|PHANTOM PAIN|MGS\s*V\b|MGS\s*5\b/.test(s)) return families.phantom;
    if (/MGS\s*4\b|SOLID\s*4\b|GUNS OF THE PATRIOTS|TOUCH/.test(s)) return families.tactical;
    if (/MGS\s*3\b|SOLID\s*3\b|SNAKE EATER|DELTA|Δ/.test(s)) return families.survival;
    if (/MGS\s*2\b|SOLID\s*2\b|SONS OF LIBERTY/.test(s)) return families.network;
    if (/MSX|NES|SNAKE.?S REVENGE|METAL GEAR 2|^MG2?\b/.test(s)) return families.retro;
    if (/MGS\s*1\b|METAL GEAR SOLID|TWIN SNAKES|VR MISSIONS|MOBILE|SPECIAL MISSIONS/.test(s)) return families.codec;
    return families.legacy;
  }
  function definition(actor) { return actor && (actor.f || actor.def || actor.fighter || actor.profile || actor); }
  function actorAt(state, slot) {
    return definition(state && (slot === 0 ? state.a : state.b));
  }
  function winnerOf(state) {
    if (!state) return null;
    if (state.winner === 0 || state.winner === 1) return state.winner;
    return null;
  }
  function describe(state, options) {
    options = options || {};
    const slot = options.localSlot;
    const winner = winnerOf(state);
    if (!state || state.finished !== true || (slot !== 0 && slot !== 1) || winner === null || winner === slot || options.finishPending === true) return null;
    const fighter = options.fighter || actorAt(state, slot) || {};
    const opponent = actorAt(state, winner) || {};
    const theme = themeFor(fighter, options.theme);
    const reducedMotion = options.reducedMotion === true || !!(state.options && state.options.reducedMotion55);
    const frame = reducedMotion ? 96 : clamp(Math.floor(finite(options.frame, 96)),0,96);
    const stage = frame < 24 ? 'rupture' : frame < 64 ? 'annonce' : 'stable';
    const progress = clamp(frame / 64, 0, 1);
    const actor = safeText(fighter.name || fighter.label, 'Combattant');
    const victor = safeText(opponent.name || opponent.label, 'Adversaire');
    const title = 'GAME OVER';
    const status = 'DUEL PERDU';
    return freeze({
      visible:true, version:'0.60', family:theme.id, theme, stage, frame, progress,
      localSlot:slot, winner, actor, victor,
      uid:safeText(fighter.uid || fighter.id, ''), episode:episodeOf(fighter),
      title, status, winnerLine:'Victoire : ' + victor,
      accessibleText:title + '. ' + actor + ' a perdu le duel. Victoire de ' + victor + '.',
      reducedMotion, noFlash:options.noFlash !== false,
      // This module never flashes, even when noFlash is false. Decorative motion is a one-shot reveal.
      flashOpacity:0, panel:freeze({x:130,y:173,width:1020,height:402}),
      controlsReserved:freeze({x:0,y:610,width:1280,height:110})
    });
  }
  function rect(c,x,y,w,h,color) { c.fillStyle=color; c.fillRect(x,y,w,h); }
  function line(c,x1,y1,x2,y2,color,width) {
    c.strokeStyle=color; c.lineWidth=width || 1; c.beginPath(); c.moveTo(x1,y1); c.lineTo(x2,y2); c.stroke();
  }
  function polygon(c,points,color) {
    c.fillStyle=color; c.beginPath(); c.moveTo(points[0][0],points[0][1]);
    for(let i=1;i<points.length;i++) c.lineTo(points[i][0],points[i][1]); c.closePath(); c.fill();
  }
  function fit(c,text,maxWidth,start,min,face,weight) {
    let size=start;
    while(size>min) { c.font=(weight || '700')+' '+size+'px '+face; if(c.measureText(text).width<=maxWidth) break; size--; }
    c.font=(weight || '700')+' '+size+'px '+face;
    return size;
  }
  function text(c,value,x,y,color,width,size,min,face,weight) {
    c.fillStyle=color; fit(c,value,width,size,min,face || SANS,weight); c.fillText(value,x,y,width);
  }
  function motif(c,m) {
    const t=m.theme, p=m.panel, a=t.accent, b=t.second, x=p.x, y=p.y, w=p.width, h=p.height;
    const slide = m.reducedMotion ? 0 : (1-m.progress)*26;
    c.save(); c.globalAlpha=.72;
    if(t.shape==='terminal') {
      for(let i=0;i<8;i++) rect(c,x+27+i*8,y+28,5,5,a);
      line(c,x+26,y+40,x+w-26,y+40,b,2);
      for(let j=0;j<5;j++) rect(c,x+w-94,y+79+j*26,48-(j%2)*15,3,b);
      line(c,x+26,y+h-36,x+w-26,y+h-36,b,2);
      rect(c,x+26,y+70,4,h-134,a);
    } else if(t.shape==='lcd') {
      c.lineWidth=8;c.strokeStyle=b;c.strokeRect(x+15,y+15,w-30,h-30);
      for(let i=0;i<10;i++) rect(c,x+38+i*18,y+37,10,6,a);
      for(let j=0;j<14;j++) line(c,x+w-53,y+61+j*21,x+w-33,y+61+j*21,b,2);
      rect(c,x+35,y+h-49,w-70,4,b);
    } else if(t.shape==='carrier') {
      for(let side=0;side<2;side++) { const ax=side?x+w-49:x+27; line(c,ax,y+24,ax,y+h-24,b,2); for(let j=0;j<8;j++) line(c,ax-7,y+42+j*42,ax+7,y+42+j*42,b,1); }
      const cy=y+207; c.strokeStyle=a;c.lineWidth=2;c.beginPath(); c.moveTo(x+36,cy);
      for(let i=1;i<=22;i++) c.lineTo(x+36+i*9,cy+(i>7&&i<13?(i%2?-20:20)*(1-m.progress):0)); c.stroke();
      line(c,x+w-242,cy,x+w-36,cy,a,2);
      line(c,x+94,y+28,x+w-94,y+28,b,1); line(c,x+94,y+h-28,x+w-94,y+h-28,b,1);
    } else if(t.shape==='network') {
      for(let i=0;i<7;i++) {const xx=x+36+i*142;line(c,xx,y+30,xx,y+h-30,b,1);}
      for(let j=0;j<4;j++) line(c,x+32,y+38+j*103,x+w-32,y+38+j*103,b,1);
      const nodes=[[x+36,y+38],[x+w-130,y+347],[x+320,y+38],[x+w-272,y+347]];
      for(const n of nodes) rect(c,n[0]-4,n[1]-4,8,8,a);
      rect(c,x+26,y+32,5,94*(1-.4*m.progress),a);rect(c,x+w-31,y+h-126,5,94,b);
    } else if(t.shape==='film') {
      rect(c,x,y,29,h,'#100f0d');rect(c,x+w-29,y,29,h,'#100f0d');
      for(let j=0;j<10;j++) {rect(c,x+8,y+13+j*39,13,20,b);rect(c,x+w-21,y+13+j*39,13,20,b);}
      line(c,x+47,y+35,x+w-47,y+35,a,1);line(c,x+47,y+h-35,x+w-47,y+h-35,a,1);
      polygon(c,[[x+55,y+h-69],[x+100,y+h-69],[x+83,y+h-52]],b);
    } else if(t.shape==='dossier') {
      rect(c,x+28,y+23,8,h-46,b);rect(c,x+46,y+23,2,h-46,a);
      for(let j=0;j<4;j++) line(c,x+67,y+h-44-j*8,x+252,y+h-44-j*8,b,2);
      polygon(c,[[x+w-194-slide,y+28],[x+w-32,y+28],[x+w-32,y+81],[x+w-140-slide,y+81]],b);
      for(let j=0;j<5;j++)line(c,x+w-80,y+118+j*40,x+w-40,y+118+j*40,b,2);
    } else if(t.shape==='tactical') {
      for(const xx of [x+26,x+w-26]) for(const yy of [y+27,y+h-27]) {line(c,xx-11,yy,xx+11,yy,a,2);line(c,xx,yy-11,xx,yy+11,a,2);}
      line(c,x+64,y+27,x+w-64,y+27,b,2);line(c,x+64,y+h-27,x+w-64,y+h-27,b,2);
      for(let j=0;j<12;j++)rect(c,x+w-58,y+72+j*22,12,4,j>3?b:a);
    } else if(t.shape==='bars') {
      rect(c,x+26,y+27,224,5,a); rect(c,x+26,y+44,123,2,b);
      for(let i=0;i<12;i++)rect(c,x+w-230+i*14+slide,y+h-47,6+(i%3)*2,18,b);
      polygon(c,[[x+w-70,y+27],[x+w-27,y+27],[x+w-27,y+70]],a);
      line(c,x+26,y+h-29,x+w-26,y+h-29,b,2);
    } else if(t.shape==='cards') {
      for(let i=0;i<3;i++){c.save();c.translate(x+83+i*12,y+194);c.rotate((i-1)*.13+(1-m.progress)*.08);c.strokeStyle=i===1?a:b;c.lineWidth=2;c.strokeRect(-34,-80,68,160);c.restore();}
      for(let i=0;i<3;i++){c.save();c.translate(x+w-84-i*12,y+194);c.rotate((1-i)*.13-(1-m.progress)*.08);c.strokeStyle=i===1?a:b;c.lineWidth=2;c.strokeRect(-34,-80,68,160);c.restore();}
      line(c,x+35,y+31,x+w-35,y+31,a,2);line(c,x+35,y+h-31,x+w-35,y+h-31,b,2);
    } else if(t.shape==='cut') {
      polygon(c,[[x+23,y+28],[x+213,y+28],[x+174,y+41],[x+23,y+41]],a);
      polygon(c,[[x+w-23,y+h-28],[x+w-213,y+h-28],[x+w-174,y+h-41],[x+w-23,y+h-41]],b);
      for(let i=0;i<4;i++)line(c,x+28+i*14,y+h-68,x+44+i*14,y+h-89,a,2);
      line(c,x+w-40,y+78,x+w-104-slide,y+155,a,2);line(c,x+40,y+h-78,x+104+slide,y+h-155,b,2);
    } else if(t.shape==='contour') {
      for(let i=0;i<5;i++) {c.strokeStyle=i%2?a:b;c.lineWidth=1;c.beginPath();c.moveTo(x+22+i*10,y+25);c.bezierCurveTo(x+110+i*13,y+83,x+4+i*7,y+210,x+57+i*8,y+h-27);c.stroke();}
      for(let i=0;i<4;i++) {c.strokeStyle=b;c.beginPath();c.moveTo(x+w-22-i*13,y+25);c.bezierCurveTo(x+w-100-i*13,y+158,x+w-30-i*8,y+260,x+w-82-i*8,y+h-27);c.stroke();}
    } else if(t.shape==='score') {
      for(let i=0;i<3;i++){polygon(c,[[x+25+i*22,y+26],[x+38+i*22,y+26],[x+52+i*22,y+46],[x+39+i*22,y+46]],a);}
      for(let i=0;i<4;i++)rect(c,x+w-147+i*26,y+h-52,17,17,i<2?a:b);
      line(c,x+24,y+62,x+w-24,y+62,b,2);line(c,x+24,y+h-62,x+w-24,y+h-62,b,2);
    }
    c.restore();
  }
  function draw(c,state,options) {
    const m=describe(state,options);
    if(!m || !c || typeof c.save!=='function') return m;
    const width=finite(options && options.width, finite(c.canvas && c.canvas.width,BASE_WIDTH));
    const height=finite(options && options.height, finite(c.canvas && c.canvas.height,BASE_HEIGHT));
    if(width<=0||height<=0) return m;
    c.save();
    const scale=Math.min(width/BASE_WIDTH,height/BASE_HEIGHT);
    c.translate((width-BASE_WIDTH*scale)/2,(height-BASE_HEIGHT*scale)/2);c.scale(scale,scale);
    const p=m.panel,t=m.theme;
    c.beginPath();c.rect(p.x-10,p.y-10,p.width+20,p.height+20);c.clip();
    c.globalAlpha=.94;rect(c,p.x,p.y,p.width,p.height,t.ground);c.globalAlpha=1;
    c.strokeStyle=t.second;c.lineWidth=1;c.strokeRect(p.x+.5,p.y+.5,p.width-1,p.height-1);
    motif(c,m);
    c.textAlign='center';c.textBaseline='alphabetic';
    const face=m.family==='retro'||m.family==='handheld'?MONO:SANS;
    text(c,t.label,640,235,t.accent,740,17,13,MONO,'500');
    // The full headline is always readable; only the rules and decorative geometry reveal over time.
    text(c,m.title,640,346,t.paper,790,m.family==='handheld'?76:88,60,face,'900');
    rect(c,640-258*(.3+.7*m.progress),365,516*(.3+.7*m.progress),3,t.accent);
    text(c,m.status,640,402,t.accent,730,19,16,MONO,'700');
    text(c,m.actor,640,449,t.paper,752,31,20,SANS,'700');
    text(c,m.winnerLine,640,489,t.paper,752,18,14,SANS,'400');
    c.globalAlpha=.7;
    text(c,m.episode || 'ARCHIVES CQC',640,538,t.paper,736,13,11,MONO,'400');
    c.restore();
    return m;
  }
  return freeze({version:'0.60',families,groupFamilies,episodeFamilies,themeFor,describe,draw});
});
