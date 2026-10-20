/* R15 — original, deterministic sound design for the three R14 sets.
 * No recording/sample/music from a commercial game; no gameplay RNG or I/O.
 * All oscillation/noise tiles are periodic over 12 seconds. This is authored
 * simulation ambience, not evidence of the original game's soundtrack.
 */
(function(root){'use strict';
 const TAU=2*Math.PI,DURATION=12;
 const freeze=o=>{Object.values(o).forEach(x=>{if(x&&typeof x==='object')freeze(x);});return Object.freeze(o);};
 const rooms=freeze({
  baker_garage_2017:{name:'Garage — ventilation, pluie et métal',layers:[{id:'vent',name:'Ventilation lente',pan:-.28},{id:'rain',name:'Pluie sur la fenêtre',pan:.7},{id:'metal',name:'Résonances métalliques',pan:-.5}]},
  guest_house_attic_2017:{name:'Grenier — air, charpente et tissu',layers:[{id:'draft',name:'Souffle sous le toit',pan:.15},{id:'wood',name:'Craquements de charpente',pan:-.55},{id:'cloth',name:'Frottement du voilage',pan:.4}]},
  testing_area_2017:{name:'Zone d’essai — installation et moniteur',layers:[{id:'power',name:'Installation électrique',pan:-.3},{id:'pipe',name:'Souffle dans les conduits',pan:.6},{id:'monitor',name:'Signal discret du moniteur',pan:.1}]}
 });
 const finite=(n,d)=>typeof n==='number'&&Number.isFinite(n)?n:d;
 function describe(stage){const id=typeof stage==='string'?stage:stage?.id;const r=typeof id==='string'&&Object.prototype.hasOwnProperty.call(rooms,id)?rooms[id]:null;return r?{id,...r,duration:DURATION,provenance:'Synthèse originale R15 ; aucun son Capcom extrait, aucune fidélité 1:1 certifiée.'}:null;}
 function seed(text){let h=2166136261;for(const c of text)h=Math.imul(h^c.charCodeAt(0),16777619);return h>>>0||1;}
 function noiseTile(s,n){const a=new Float32Array(n);let h=s;for(let i=0;i<n;i++){h^=h<<13;h^=h>>>17;h^=h<<5;a[i]=(h>>>0)/2147483648-1;}return a;}
 function noise(a,p){const x=((p%a.length)+a.length)%a.length,i=Math.floor(x),f=x-i;return a[i]*(1-f)+a[(i+1)%a.length]*f;}
 function pulse(t,start,length){const u=(t-start+DURATION)%DURATION;return u<length?Math.sin(Math.PI*u/length)**2:0;}
 function sampleLayer(id,t,n,u){const sin=c=>Math.sin(TAU*c*u),slow=noise(n,u*n.length);
  switch(id){
   case 'vent':return .07*(sin(720)+.28*sin(1440))*(.78+.14*sin(36))+.038*noise(n,u*n.length)*(.8+.15*sin(3));
   case 'rain':return .075*noise(n,u*n.length*16)*(.77+.16*sin(4))+.022*noise(n,u*n.length*7)*(.8+.18*sin(11));
   case 'metal':return (.040*sin(3840)+.026*sin(6036))*(pulse(t,2.4,.5)+pulse(t,7.7,.8));
   case 'draft':return .09*slow*(.65+.28*sin(2))+.014*sin(264)*(.6+.2*sin(3));
   case 'wood':return (.044*sin(1104)+.029*sin(1872)+.024*noise(n,u*n.length*3))*(pulse(t,1.1,.8)+pulse(t,8.2,1.2));
   case 'cloth':return .072*noise(n,u*n.length*2)*(pulse(t,3,2.3)+pulse(t,9.1,1.7));
   case 'power':return .055*sin(600)+.019*sin(1200)+.008*sin(3600)*(.7+.15*sin(5));
   case 'pipe':return .062*noise(n,u*n.length*4)*(.73+.17*sin(3))+.017*sin(408)*(.7+.2*sin(2));
   case 'monitor':return .042*(sin(5280)+.18*sin(7920))*(pulse(t,4.2,.14)+pulse(t,10.4,.22));
   default:return 0;
  }
 }
 function synthesize(stage,sampleRate=48000,layer='all'){
  const room=describe(stage);if(!room)throw TypeError('Unknown authored ambience');
  if(layer!=='all'&&!room.layers.some(x=>x.id===layer))throw TypeError('Unknown ambience layer');
  const rate=Math.max(8000,Math.min(48000,Math.round(finite(sampleRate,48000)))),length=rate*DURATION;
  const channels=[new Float32Array(length),new Float32Array(length)];
  for(const l of room.layers){if(layer!=='all'&&layer!==l.id)continue;const tile=noiseTile(seed(room.id+':'+l.id),['draft','vent'].includes(l.id)?512:4096),left=Math.cos((l.pan+1)*Math.PI/4),right=Math.sin((l.pan+1)*Math.PI/4);
   for(let i=0;i<length;i++){const u=i/length,v=sampleLayer(l.id,i/rate,tile,u);channels[0][i]+=v*left;channels[1][i]+=v*right;}
  }
  return{cue:'baker:'+room.id+':'+layer,stage:room.id,layer,sampleRate:rate,duration:DURATION,channels};
 }
 root.RE_BAKER_AMBIENCE=Object.freeze({version:'R15',duration:DURATION,ids:Object.freeze(Object.keys(rooms)),describe,synthesize});
})(globalThis);
