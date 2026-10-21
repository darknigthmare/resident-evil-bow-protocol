#!/usr/bin/env python3
"""Explicit forward/rewind navigation is a journal discontinuity, not playback.
Forward seek can mutate the existing state object; identity alone is not enough.
"""
from pathlib import Path
import hashlib,json
R=Path(__file__).resolve().parents[1]
def change(name,old,new):
 p=R/name;s=p.read_text()
 if new in s:return
 assert s.count(old)==1,(name,old[:120],s.count(old));p.write_text(s.replace(old,new))
change('src/catalog-duel-v070.js','s=replay.seek(0);$(\'trialResult\')','s=replay.seek(0);root.RE_TRIAL_TEXT_PANEL?.reset();$(\'trialResult\')')
change('src/catalog-duel-v070.js','s=replay.seek(n);syncPresentationR9(false);','s=replay.seek(n);root.RE_TRIAL_TEXT_PANEL?.reset();syncPresentationR9(false);')
change('tests/verify-combat-text-r17.mjs',
"a.installReplay(recording);assert.equal(t.view().history.length,0);assert.equal(x.storage.size,0);",
"a.installReplay(recording);assert.equal(t.view().history.length,0);const seek=x.document.getElementById('trialReplaySeek');for(const frame of[120,240,40,180]){seek.value=String(frame);seek.dispatchEvent({type:'change'});assert.equal(a.getState().frame,frame);assert.equal(t.view().history.length,0,'Seek '+frame+' clears skipped annotations');assert(a.isPaused());}a.tick(30);const retained=JSON.stringify(t.view().history),sameState=JSON.stringify(a.getState());seek.value='999999';seek.dispatchEvent({type:'change'});assert.equal(JSON.stringify(a.getState()),sameState);assert.equal(JSON.stringify(t.view().history),retained);assert.equal(x.storage.size,0);")
change('tests/browser-combat-text-r17.mjs',
"assert.equal(await page.evaluate(()=>RE_TRIAL_TEXT_PANEL.view().history.length),0);\n   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);",
"assert.equal(await page.evaluate(()=>RE_TRIAL_TEXT_PANEL.view().history.length),0);\n   for(const frame of [200,40,180]){await page.fill('#trialReplaySeek',String(frame));await page.locator('#trialReplaySeek').dispatchEvent('change');assert.equal(await page.evaluate(()=>RE_CATALOG_DUEL.getState().frame),frame);assert.equal(await page.evaluate(()=>RE_TRIAL_TEXT_PANEL.view().history.length),0);}\n   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);")
p=R/'docs/COMBAT_TEXT_R17_CHANGES.json';data=json.loads(p.read_text());key='src/catalog-duel-v070.js';assert key in data['changed'];data['changed'][key]['after']=hashlib.sha256((R/key).read_bytes()).hexdigest();p.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
print('R17 explicit seek/reset regression: forward seek reuses its actor state and now resets the journal cursor, without deleting simulation/replay events.')
