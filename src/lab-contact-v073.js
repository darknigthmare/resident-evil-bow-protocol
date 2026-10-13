/* Contact inspector. The public link encodes only the laboratory configuration,
 * never saves, credentials, health, progress, or mutable runtime snapshots. */
(function(root){'use strict';
function readout(s,bench){
 const d=root.document,el=d?.getElementById('labContact'),a=s.lastImpact;
 if(el){const label=a?(a.blocked?'GARDE':a.zone?'ZONE CRITIQUE':a.kind==='blast'?'ZONE D’EFFET':'CORPS'):'AUCUN IMPACT MESURÉ';
  const text=a?label+' · F'+a.frame+' · '+a.amount+' DÉGÂTS · X '+a.x.toFixed(1)+' / Y '+a.y.toFixed(1)+(a.zone?' · '+a.zone:'')+(a.reason==='occluded'?' · NOYAU MASQUÉ PAR LE CORPS':''):label;
  // Avoid live-region announcements at every render when nothing has changed.
  if(el.textContent!==text)el.textContent=text;el.dataset.hit=a?.blocked?'guard':a?.zone?'critical':'body';
 }
 const link=d?.getElementById('labScenarioLink');if(!link)return;
 const q=new URLSearchParams({uid:s.uid,target:s.target,slot:s.slot,distance:String(bench.distance),face:String(bench.face),side:d.getElementById('labTargetSide').value,dummy:d.getElementById('labDummy').value,opening:s.testOpening?'1':'0'});
 link.href='?'+q.toString();
}
function draw(ctx,impact){if(!impact||![impact.x,impact.y].every(Number.isFinite))return;
 ctx.save();ctx.strokeStyle=impact.blocked?'#9ed4e4':impact.zone?'#ffe0a0':'#ed9572';ctx.lineWidth=2;
 if(impact.segment){const t=impact.segment;ctx.beginPath();ctx.moveTo(t.x0,t.y0);ctx.lineTo(t.x1,t.y1);ctx.stroke();}
 ctx.beginPath();ctx.arc(impact.x,impact.y,9,0,Math.PI*2);ctx.moveTo(impact.x-15,impact.y);ctx.lineTo(impact.x+15,impact.y);ctx.moveTo(impact.x,impact.y-15);ctx.lineTo(impact.x,impact.y+15);ctx.stroke();ctx.restore();
}
root.RE_LAB_CONTACT=Object.freeze({readout,draw});
})(globalThis);
