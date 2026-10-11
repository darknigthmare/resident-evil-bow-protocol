#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=name=>JSON.parse(fs.readFileSync(path.join(ROOT,name),'utf8'));
const Lore=read('data/lore-movesets.json'),Data=read('data/roster.json'),Playable=read('data/playable.json'),Package=read('package.json');
const slots=['light','heavy','low','throw','special','specialDown','specialForward','specialBack','super','utility'];
const allowed=new Set(['canonical','anatomical','simulation']);
const fighterIds=new Set(Data.fighters.map(f=>f.uid)),playableIds=new Set(Playable.map(f=>f.id)),profileIds=new Set(Object.keys(Lore.profiles));
const expectedFighters=Data.fighters.length,expectedMoves=expectedFighters*slots.length;
assert.equal(Data.version,Package.version);assert.equal(Lore.version,Package.version);assert.equal(Lore.schema,'re.bow.lore-movesets/2');
assert.equal(fighterIds.size,expectedFighters);assert.deepEqual([...profileIds].sort(),[...playableIds].sort(),'Every playable incarnation needs one lore profile');assert.deepEqual([...fighterIds].sort(),[...profileIds].sort(),'Compiled roster and lore profiles diverge');
assert.equal(Data.counts.loreProfiles,expectedFighters);assert.equal(Data.counts.loreMoves,expectedMoves);
const moveIds=new Set(),signatures=new Map(),evidence={canonical:0,anatomical:0,simulation:0};
for(const fighter of Data.fighters){
 const profile=Lore.profiles[fighter.uid];assert(profile,fighter.uid+' missing lore profile');assert.equal(profile.incarnation,fighter.ep,fighter.uid+' wrong incarnation');assert.equal(profile.fidelity.status,'lore-audited');assert(profile.source&&profile.sources.length,fighter.uid+' missing source');assert(profile.canonicalAttacks.length,fighter.uid+' missing canonical attack basis');assert.equal(fighter.combat.evidence,'lore-audited');assert.equal(fighter.fidelity.status,'lore-audited');assert.deepEqual(Object.keys(fighter.combat.moves),slots,fighter.uid+' wrong slot order/coverage');
 const names=[];let canonical=0;
 for(const slot of slots){const m=fighter.combat.moves[slot],authored=profile.moves[slot];assert(authored,fighter.uid+' missing authored '+slot);assert.equal(m.name,authored.name,fighter.uid+' did not compile authored '+slot);assert(m.id&&!moveIds.has(m.id),'duplicate move id '+m.id);moveIds.add(m.id);assert(allowed.has(m.evidence),m.id+' invalid evidence');assert.equal(m.lore,m.evidence,m.id+' legacy lore mismatch');assert.notEqual(m.evidence,'adaptation',m.id+' still generic');assert(m.loreBasis?.length>15,m.id+' missing lore basis');assert(m.adaptation?.length>25,m.id+' missing adaptation boundary');assert(/^https:\/\//.test(m.source),m.id+' missing source URL');assert(!/Reprendre souffle/i.test(m.name),m.id+' retained generic utility');evidence[m.evidence]++;if(m.evidence==='canonical')canonical++;names.push(m.name.toLocaleLowerCase('fr'));}
 assert(canonical>=1,fighter.uid+' has no canonical move');assert.equal(new Set(names).size,slots.length,fighter.uid+' has duplicate commands');const signature=names.join('|');assert(!signatures.has(signature),fighter.uid+' clones complete moveset from '+signatures.get(signature));signatures.set(signature,fighter.uid);
}
assert.equal(moveIds.size,expectedMoves);assert.equal(evidence.canonical,Data.counts.canonicalMoves);assert.equal(evidence.anatomical,Data.counts.anatomicalMoves);assert.equal(evidence.simulation,Data.counts.simulationMoves);assert.deepEqual(evidence,{canonical:Lore.counts.canonical,anatomical:Lore.counts.anatomical,simulation:Lore.counts.simulation});
const by=id=>Data.fighters.find(f=>f.uid===id)?.combat.moves;
assert.equal(by('re3r-nemesis').special.tag,'rocket');assert.equal(by('re3r-nemesis').utility.kind,'mark');assert.equal(by('re7-molded-fat').special.status,'poison');assert.equal(by('re7-mama-mold').specialForward.count,3);assert.equal(by('rerev2-glasp').specialBack.buff,'cloak');assert.equal(by('recv-albinoid-adult').special.status,'shock');assert.equal(by('revillage-sturm').specialDown.status,'burn');
assert.equal(by('re7-jack-baker-mutated').special.kind,'projectile');assert.equal(by('re7-jack-baker-mutated').utility.kind,'heal');assert.equal(by('re7-jack-baker-swamp-man').special.tag,'tentacle');assert.equal(by('re7-jack-baker-swamp-man').utility.kind,'heal');assert.equal(by('re7-marguerite-baker-mutated').special.count,3);assert.equal(by('re7-marguerite-baker-mutated').utility.kind,'trap');assert.equal(by('re7-lucas-baker-mutated').super.status,'poison');assert.equal(by('re7-lucas-baker-mutated').utility.kind,'heal');assert.equal(by('re7-eveline-final').specialBack.evidence,'simulation');assert.equal(by('re7-eveline-final').utility.kind,'heal');assert.equal(by('re7-fumer').utility.kind,'heal');assert.equal(by('re7-fumer').utility.evidence,'canonical');
for(const uid of ['re7-jack-baker-mutated','re7-jack-baker-swamp-man','re7-marguerite-baker-mutated','re7-lucas-baker-mutated','re7-eveline-final','re7-fumer']){const f=Data.fighters.find(x=>x.uid===uid);assert(f?.sprite&&fs.existsSync(path.join(ROOT,f.sprite)),uid+' sprite missing');assert.equal(f.game,'resident-evil-7');}
console.log(JSON.stringify({pass:true,version:Package.version,fighters:expectedFighters,moves:expectedMoves,uniqueSignatures:signatures.size,evidence,mechanics:19},null,2));
