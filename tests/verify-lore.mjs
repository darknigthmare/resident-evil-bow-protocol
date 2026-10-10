#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = name => JSON.parse(fs.readFileSync(path.join(ROOT, name), 'utf8'));
const Lore = read('data/lore-movesets.json');
const Data = read('data/roster.json');
const Playable = read('data/playable.json');
const slots = ['light','heavy','low','throw','special','specialDown','specialForward','specialBack','super','utility'];
const allowed = new Set(['canonical','anatomical','simulation']);
const fighterIds = new Set(Data.fighters.map(f => f.uid));
const playableIds = new Set(Playable.map(f => f.id));
const profileIds = new Set(Object.keys(Lore.profiles));

assert.equal(Lore.version, '0.2.0');
assert.equal(Lore.schema, 're.bow.lore-movesets/2');
assert.equal(fighterIds.size, 75);
assert.deepEqual([...profileIds].sort(), [...playableIds].sort(), 'Every playable incarnation needs one lore profile');
assert.deepEqual([...fighterIds].sort(), [...profileIds].sort(), 'Compiled roster and lore profiles diverge');
assert.equal(Data.counts.loreProfiles, 75);
assert.equal(Data.counts.loreMoves, 750);

const moveIds = new Set();
const signatures = new Map();
const evidence = { canonical: 0, anatomical: 0, simulation: 0 };
for (const fighter of Data.fighters) {
  const profile = Lore.profiles[fighter.uid];
  assert(profile, fighter.uid + ' missing lore profile');
  assert.equal(profile.incarnation, fighter.ep, fighter.uid + ' wrong incarnation');
  assert.equal(profile.fidelity.status, 'lore-audited');
  assert(profile.source && profile.sources.length, fighter.uid + ' missing source');
  assert(profile.canonicalAttacks.length, fighter.uid + ' missing canonical attack basis');
  assert.equal(fighter.combat.evidence, 'lore-audited');
  assert.equal(fighter.fidelity.status, 'lore-audited');
  assert.deepEqual(Object.keys(fighter.combat.moves), slots, fighter.uid + ' wrong slot order/coverage');
  const names = [];
  let canonical = 0;
  for (const slot of slots) {
    const move = fighter.combat.moves[slot];
    const authored = profile.moves[slot];
    assert(authored, fighter.uid + ' missing authored ' + slot);
    assert.equal(move.name, authored.name, fighter.uid + ' did not compile authored ' + slot);
    assert(move.id && !moveIds.has(move.id), 'duplicate move id ' + move.id); moveIds.add(move.id);
    assert(allowed.has(move.evidence), move.id + ' invalid evidence');
    assert.equal(move.lore, move.evidence, move.id + ' legacy lore mismatch');
    assert.notEqual(move.evidence, 'adaptation', move.id + ' still generic');
    assert(move.loreBasis?.length > 15, move.id + ' missing lore basis');
    assert(move.adaptation?.length > 25, move.id + ' missing adaptation boundary');
    assert(/^https:\/\//.test(move.source), move.id + ' missing source URL');
    assert(!/Reprendre souffle/i.test(move.name), move.id + ' retained generic utility');
    evidence[move.evidence]++; if (move.evidence === 'canonical') canonical++;
    names.push(move.name.toLocaleLowerCase('fr'));
  }
  assert(canonical >= 1, fighter.uid + ' has no canonical move');
  assert.equal(new Set(names).size, 10, fighter.uid + ' has duplicate commands');
  const signature = names.join('|');
  assert(!signatures.has(signature), fighter.uid + ' clones complete moveset from ' + signatures.get(signature));
  signatures.set(signature, fighter.uid);
}
assert.equal(moveIds.size, 750);
assert.equal(evidence.canonical, Data.counts.canonicalMoves);
assert.equal(evidence.anatomical, Data.counts.anatomicalMoves);
assert.equal(evidence.simulation, Data.counts.simulationMoves);
assert.deepEqual(evidence, { canonical: Lore.counts.canonical, anatomical: Lore.counts.anatomical, simulation: Lore.counts.simulation });

const by = id => Data.fighters.find(f => f.uid === id).combat.moves;
assert.equal(by('re3r-nemesis').special.tag, 'rocket');
assert.equal(by('re3r-nemesis').utility.kind, 'mark');
assert.equal(by('re7-molded-fat').special.kind, 'projectile');
assert.equal(by('re7-molded-fat').special.status, 'poison');
assert.equal(by('re7-mama-mold').specialForward.count, 3);
assert.equal(by('re6-strelat').special.count, 3);
assert.equal(by('rerev2-glasp').specialBack.buff, 'cloak');
assert.equal(by('rerev-farfarello').specialBack.buff, 'cloak');
assert.equal(by('re4-novistador').specialBack.buff, 'cloak');
assert.equal(by('recv-albinoid-adult').special.status, 'shock');
assert.equal(by('revillage-soldat-jet').special.kind, 'mobility');
assert.equal(by('revillage-sturm').specialDown.status, 'burn');
assert.equal(by('revillage-alcina-dimitrescu').utility.kind, 'heal');
assert.equal(Data.fighters.find(f => f.uid === 'revillage-soldat-eins').combat.resource.kind, 'heat');

console.log(JSON.stringify({ pass: true, fighters: fighterIds.size, moves: moveIds.size, uniqueSignatures: signatures.size, evidence, mechanics: 13 }, null, 2));
