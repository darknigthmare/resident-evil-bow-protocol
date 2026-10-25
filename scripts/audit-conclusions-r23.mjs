/** Exhaustive read-only audit of the actual inherited policy and presentation API. */
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const target = path.join(root, 'docs/R23_CONCLUSIONS_MATRIX.json');
const sources = ['src/re-data.js', 'src/finishers-v053.js', 'src/finisher-compatibility-r10.js',
  'src/match-sequences-r8.js', 'src/fighter-directions.js', 'src/combat-foundation-v060.js',
  'data/directional-art.json', 'data/roster.json'];
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
const digest = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const clone = value => JSON.parse(JSON.stringify(value));

export function auditConclusions() {
  const context = {console};
  context.globalThis = context; context.window = context;
  context.RE_DIRECTIONAL_ART = JSON.parse(read('data/directional-art.json'));
  vm.createContext(context);
  for (const file of sources.filter(name => name.endsWith('.js'))) vm.runInContext(read(file), context, {filename:file});
  const {RE_DATA:data, CQC_FINISHERS_053:finishers, RE_FINISHER_COMPATIBILITY:policy,
    RE_MATCH_SEQUENCES:sequences, CQCCombat060:engine} = context;
  const fighters = data.fighters;
  assert.equal(fighters.length, 115, 'Expected the 115 main fighters, not expansion/context entries');
  const beforeData = JSON.stringify({data,finishers,art:context.RE_DIRECTIONAL_ART});
  const summary = {fighters:115,orderedPairs:0,conclusionVerdicts:0,prototypeCompatiblePairs:0,
    prototypeAllowedVerdicts:0,blockedVerdicts:0,canonicalConclusionsCertified:0,
    finalArtCertified:0,readyPresentationStatePairs:0};
  const reasonCatalog = {}, rigCounts = {}, reasonCounts = {}, anatomyPairs = {}, bodies = [], rows = [], coverage = [];
  for (const fighter of fighters) {
    const body = clone(policy.body(fighter.uid));
    bodies.push({name:fighter.name,game:fighter.game || fighter.source,...body});
    rigCounts[body.rig] = (rigCounts[body.rig] || 0) + 1;
    const art = clone(sequences.coverage(fighter));
    assert.equal(art.length, 8);
    summary.readyPresentationStatePairs += art.filter(item => item.ready).length;
    coverage.push({uid:fighter.uid,states:art});
  }
  for (const attacker of fighters) {
    const profile = finishers.profiles[attacker.uid];
    assert(profile?.finishers?.length > 0, 'Every attacker needs an actual profile');
    const row = {attacker:attacker.uid,conclusions:profile.finishers.map(item => ({id:item.id,name:item.name,
      phases:clone(item.phases),canonical:item.canonical,evidence:item.evidence})),victims:[]};
    for (const victim of fighters) {
      const results = profile.finishers.map(conclusion => clone(policy.evaluate(attacker.uid,victim.uid,conclusion.id)));
      const compatible = results.some(result => result.allowed);
      const anatomy = `${policy.body(attacker.uid).rig}/${policy.body(victim.uid).rig}`;
      const group = anatomyPairs[anatomy] ||= {orderedPairs:0,prototypeCompatiblePairs:0};
      group.orderedPairs++; group.prototypeCompatiblePairs += Number(compatible);
      for (const result of results) {
        assert.equal(result.canonical,false);
        assert.equal(typeof result.allowed,'boolean');
        assert(result.code && result.reason && result.scope);
        const reason = {allowed:result.allowed,reason:result.reason,scope:result.scope,canonical:false};
        if (reasonCatalog[result.code]) assert.deepEqual(reasonCatalog[result.code],reason);
        else reasonCatalog[result.code] = reason;
        reasonCounts[result.code] = (reasonCounts[result.code] || 0) + 1;
        summary.conclusionVerdicts++;
        summary.prototypeAllowedVerdicts += Number(result.allowed);
        summary.blockedVerdicts += Number(!result.allowed);
      }
      row.victims.push({uid:victim.uid,prototypeCompatible:compatible,verdictCodes:results.map(result=>result.code)});
      summary.orderedPairs++; summary.prototypeCompatiblePairs += Number(compatible);
    }
    rows.push(row);
  }
  assert.equal(summary.orderedPairs,115*115);
  assert.equal(summary.conclusionVerdicts,summary.prototypeAllowedVerdicts+summary.blockedVerdicts);
  assert(summary.prototypeAllowedVerdicts>0 && summary.blockedVerdicts>0);
  const checks = [{name:'Exhaustive ordered pair and conclusion policy audit',pass:true,
    orderedPairs:summary.orderedPairs,conclusionVerdicts:summary.conclusionVerdicts,
    all115VictimsPerAttacker:rows.every(row=>row.victims.length===115),canonicalCertificates:0}];
  const firstConclusion = uid => finishers.profiles[uid].finishers[0].id;
  assert.equal(policy.evaluate('re3r-nemesis','re1-hunter',firstConclusion('re3r-nemesis')).allowed,true);
  assert.equal(policy.evaluate('re3r-nemesis','re7-eveline',firstConclusion('re3r-nemesis')).allowed,false);
  assert.equal(policy.evaluate('re3r-nemesis','revillage-donna-angie',firstConclusion('re3r-nemesis')).allowed,false);
  assert.equal(policy.evaluate('re7-lucas-baker','re1-hunter',firstConclusion('re7-lucas-baker')).code,'lucas-review-required');
  assert.equal(policy.evaluate('re1-cerberus','re1-hunter',firstConclusion('re3r-nemesis')).code,'unknown-conclusion');
  assert.equal(JSON.stringify({data,finishers,art:context.RE_DIRECTIONAL_ART}),beforeData);
  checks.push({name:'Real policy rejects missing anatomy and cross-incarnation conclusions without mutating source profiles',pass:true,
    controls:['projection','collective','lucas-review-required','unknown-conclusion'],profilesUnchanged:true});
  function snapshot(state,label,options={}) {
    const before = JSON.stringify(state);
    const result = {label,frame:state.frame,phase:state.phase,round:state.round,finished:state.finished,
      roundWinner:state.roundWinner,winner:state.winner,wins:[state.a.wins,state.b.wins],
      presentation:[clone(sequences.describe(state,0,options)),clone(sequences.describe(state,1,options))],
      canFinish:[sequences.canFinish(state,state.a),sequences.canFinish(state,state.b)]};
    assert.equal(JSON.stringify(state),before,'Presentation queries must not advance or mutate the match');
    return result;
  }
  function advance(state,count) { for(let tick=0;tick<count;tick++) engine.step(state); }
  const engineScenarios = [];
  for(const winner of [0,1]) {
    const state = engine.create(fighters[0],fighters[1],{seed:2300+winner,rounds:2});
    const trace = [snapshot(state,'Initial engine intro')];
    assert.equal(trace[0].presentation[winner].state,'intro');
    advance(state,100); assert.equal(state.phase,'fight');
    (winner===0?state.b:state.a).life=0; engine.step(state);
    trace.push(snapshot(state,'Controlled first KO accepted by engine'));
    assert.equal(trace.at(-1).presentation[1-winner].state,'roundLose');
    assert.equal(trace.at(-1).presentation[1-winner].reversible,true);
    assert.deepEqual(trace.at(-1).canFinish,[false,false]);
    advance(state,90); trace.push(snapshot(state,'Engine resets nondecisive round'));
    assert.equal(state.round,2); assert.equal(state.phase,'intro'); assert.equal(state.finished,false);
    advance(state,90); assert.equal(state.phase,'fight');
    (winner===0?state.b:state.a).life=0; engine.step(state);
    trace.push(snapshot(state,'Decisive KO still waits for round countdown'));
    assert.deepEqual(trace.at(-1).canFinish,[false,false]);
    assert.equal(trace.at(-1).presentation[1-winner].state,'roundLose');
    advance(state,89); assert.equal(state.finished,false);
    engine.step(state); trace.push(snapshot(state,'Actual engine matchEnd'));
    assert.equal(state.finished,true); assert.equal(state.winner,winner);
    assert.equal(trace.at(-1).presentation[winner].state,'matchWin');
    assert.equal(trace.at(-1).presentation[1-winner].state,'matchLose');
    assert.equal(trace.at(-1).canFinish[winner],true); assert.equal(trace.at(-1).canFinish[1-winner],false);
    assert.equal(sequences.canFinish(state,{...(winner===0?state.a:state.b)}),false);
    trace.push(snapshot(state,'Final presentation tick89',{finalTick:89}));
    trace.push(snapshot(state,'Separate outro tick90',{finalTick:90}));
    assert.equal(trace.at(-1).presentation[winner].state,'outro');
    assert.equal(trace.at(-1).presentation[winner].tick,0);
    assert.equal(trace.at(-1).presentation[1-winner].state,'matchLose');
    assert.deepEqual(clone(sequences.describe(state,winner,{finishPending:true})),null);
    assert.equal(sequences.describe(state,winner,{finalTick:300,reducedMotion:true}).tick,0);
    state._resultSent55=true;
    assert.equal(sequences.canFinish(state,winner===0?state.a:state.b),false);
    const events = clone(state.events).filter(event=>['roundEnd','roundReset','matchEnd'].includes(event.type));
    assert.deepEqual(events.map(event=>event.type),['roundEnd','roundReset','roundEnd','matchEnd']);
    engineScenarios.push({winner,fixture:'Real engine with controlled zero-life KO states; no full match or art verification.',trace,events});
    checks.push({name:`Actual engine round and decisive result transitions, winner slot${winner}`,pass:true,
      reversibleFirstLoss:true,nondecisiveConclusionBlocked:true,decisiveConclusionWaitsForCountdown:true,
      winnerObjectAndSlotRequired:true,outroSeparate:true,finalResultSentBlocksRepeat:true});
  }
  const draw = engine.create(fighters[0],fighters[1],{seed:2399,rounds:2,skipIntro:true});
  draw.a.life=draw.b.life=0; engine.step(draw);
  const drawTrace = [snapshot(draw,'Actual engine tied KO round')];
  assert.equal(drawTrace[0].presentation[0].state,'roundDraw');
  assert.equal(drawTrace[0].presentation[1].state,'roundDraw');
  assert.deepEqual(drawTrace[0].canFinish,[false,false]);
  advance(draw,90); drawTrace.push(snapshot(draw,'Actual tied round resets; match remains unfinished'));
  assert.equal(draw.finished,false); assert.equal(draw.round,2);
  const presentationDraw = {...draw,finished:true,winner:-1};
  const syntheticDraw = snapshot(presentationDraw,'Presentation-only terminal draw fixture');
  assert(syntheticDraw.presentation.every(item=>item.state==='matchDraw'));
  assert.deepEqual(syntheticDraw.canFinish,[false,false]);
  for(const bad of [undefined,null,2,'0']) {
    presentationDraw.winner=bad;
    assert.equal(sequences.describe(presentationDraw,0),null);
    assert.equal(sequences.canFinish(presentationDraw,presentationDraw.a),false);
  }
  checks.push({name:'Actual tied round, separate presentation draw, invalid results and art coverage',pass:true,
    terminalDrawObservedFromEngine:false,presentationDrawSupported:true,all115EightStateCoverageChecked:true,
    readyPresentationStatePairs:summary.readyPresentationStatePairs});
  assert.equal(JSON.stringify({data,finishers,art:context.RE_DIRECTIONAL_ART}),beforeData);
  return clone({schema:'re.bow.conclusions-matrix-r23/1',scope:'Actual engine and technical-prototype policy. Compatible does not mean anatomically canonical or artistically available.',
    canonicalFidelityCertified:false,artisticConclusionsDelivered:0,summary,rigCounts,reasonCounts,reasonCatalog,
    anatomyPairs,bodies,rows,presentationCoverage:coverage,engineScenarios,
    drawScenario:{fixture:'Controlled tied KO through actual engine; terminal matchDraw exercised only as presentation fixture.',
      trace:drawTrace,syntheticTerminalPresentation:syntheticDraw,
      limitation:'A tied round resets in this engine. No terminal tied match was observed through actual engine steps.'},
    checks,validation:{groups:checks.length,passed:checks.filter(check=>check.pass).length,failed:0,readOnlyQueries:true,
      physicalDevicesTested:false,fullCampaignPlayed:false},
    sourceFiles:sources.map(name=>({path:name,sha256:digest(fs.readFileSync(path.join(root,name)))})),
    limitations:['Body height and width are authored simulation envelopes, not documented measurements from the original games.',
      'Verdict codes refer to inherited prototype choreography; all conclusions remain noncanonical.',
      'The matrix covers only115mainfighters and every existing conclusion, not231experimental fighters or43contexts.',
      'No final victory, defeat, draw, intro, outro or victim-pair artwork is created by this audit.']});
}

if(process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const report = auditConclusions();
  if(process.argv.includes('--check')) assert.deepEqual(JSON.parse(fs.readFileSync(target,'utf8')),report,'Committed conclusions matrix differs from current source APIs');
  else fs.writeFileSync(target,JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({mode:process.argv.includes('--check')?'read-only-check':'export',...report.summary,validation:report.validation}));
}
