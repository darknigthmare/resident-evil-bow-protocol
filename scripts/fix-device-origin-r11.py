#!/usr/bin/env python3
"""Opt-in devices use the explosion location for guard and knockback, not their owner."""
from pathlib import Path
import subprocess
R=Path(__file__).resolve().parents[1]
p=R/'src/combat-foundation-v060.js';s=p.read_text()
a=" explode(s,{...tr,dead:false,exploded:false,def:{...tr.def,radius:tr.def.blastRadius||140}});"
b=" const direction=Math.sign(other(s,a).x-tr.x)||a.face;\n explode(s,{...tr,dead:false,exploded:false,vx:direction,flightVX:direction,damageScale:1,def:{...tr.def,radius:tr.def.blastRadius||140,detonateOnContact:true}});"
if b not in s:
 assert s.count(a)==1;s=s.replace(a,b);p.write_text(s)
p=R/'tests/verify-lucas-r11.mjs';s=p.read_text();a="step(s,300);assert.equal(s.metrics.explosion,1);});"
b="""step(s,300);assert.equal(s.metrics.explosion,1);
 for(const side of[-1,1])for(const guarded of[false,true]){const t=fresh();execute(t,'special');const charge=t.traps[0];t.b.x=charge.x+side*60;t.b.face=-side;t.options.dummyFacing=-side;t.b.block=guarded;assert(C.start(t,t.a,'utility'));for(let n=0;n<F.combat.moves.utility.startup;n++)step(t,1,{...C.empty(),guard:guarded});assert.equal(t.lastImpact.blocked,guarded);if(!guarded)assert.equal(Math.sign(t.b.vx),side,'Push away from charge, independent of original shooter');}
});"""
if b not in s:
 assert s.count(a)==1;s=s.replace(a,b);p.write_text(s)
for name in ['contract.mjs','catalog-replay-contract.mjs']:
 subprocess.run(['node','scripts/'+name,'--write'],cwd=R,check=True)
subprocess.run(['node','scripts/finalize-lucas-r11.mjs'],cwd=R,check=True)
print('R11 charge origin regression: both sides and guards; legacy projectiles unchanged.')
