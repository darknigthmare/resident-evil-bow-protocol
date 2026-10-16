#!/usr/bin/env python3
"""Apply narrow, anchor-guarded presentation changes. Does not touch gameplay data."""
from pathlib import Path
import json
R=Path(__file__).resolve().parents[1]
def patch(file,old,new):
 p=R/file;s=p.read_text()
 if new in s:return
 assert s.count(old)==1,(file,'missing or ambiguous anchor',old[:80])
 p.write_text(s.replace(old,new,1))
patch('src/fighter-directions.js'," function protectedAsymmetry(f)"," function validReference(v){return !!v&&['left','right'].includes(v.facing)&&v.projection==='reference'&&v.reviewed===true&&safeAsset(v.path)&&Number.isInteger(v.width)&&v.width>1&&Number.isInteger(v.height)&&v.height>1&&validAnchor(v.anchor)&&(!v.crop||validCrop(v.crop,v.width,v.height));}\n function protectedAsymmetry(f)")
patch('src/fighter-directions.js',"const record=(root.RE_DIRECTIONAL_ART||{}).records?.[f?.uid||f?.id],state=poseState(pose);","const record=(root.RE_DIRECTIONAL_ART||{}).records?.[f?.uid||f?.id],state=poseState(pose);\n  const reference=validReference(record?.referenceImage)?record.referenceImage:null;")
patch('src/fighter-directions.js',"borderKey:record?.referenceBorderKey,path:f?.sprite||f?.visual?.sprite||f?.portrait||'',mirror:1,anchor:[.5,1],crop:f?.spriteCrop||f?.visual?.spriteCrop||null,","borderKey:reference?undefined:record?.referenceBorderKey,referenceOverride:!!reference,path:reference?.path||f?.sprite||f?.visual?.sprite||f?.portrait||'',mirror:1,anchor:reference?.anchor||[.5,1],crop:reference?.crop||f?.spriteCrop||f?.visual?.spriteCrop||null,")
patch('src/fighter-directions.js',"const native=side(record?.referenceFacing||f?.visual?.sourceFacing);","const native=side(reference?.facing||record?.referenceFacing||f?.visual?.sourceFacing);")
patch('src/fighter-directions.js',"audit,validView,validClip,validCrop,safeAsset","audit,validView,validClip,validReference,validCrop,safeAsset")
patch('src/fighter-directions.js',"version:'1.2.0'","version:'1.3.0'")
patch('scripts/compile-directions.mjs',"const R=path.resolve", "import {assertDistinctSides} from './directional-pair-validation.mjs';\nconst R=path.resolve")
patch('scripts/compile-directions.mjs'," for(const [dir,v]of Object.entries(r.views||{}))", " if(r.referenceImage){if(!A.validReference(r.referenceImage))throw Error('Invalid reviewed reference: '+uid);checkImage(r.referenceImage);}\n for(const [dir,v]of Object.entries(r.views||{}))")
patch('scripts/compile-directions.mjs',"  if(!A.states.includes(state)", "  assertDistinctSides(views.left,views.right,uid+' / '+state);\n  if(!A.states.includes(state)")
patch('src/re-renderer.js',"  const animationClock = root.RE_FIGHTER_DIRECTIONS.createClock();", "  const animationClock = root.RE_FIGHTER_DIRECTIONS.createClock();\n  const cinemaBindings = new WeakMap();")
patch('src/re-renderer.js',"    if (entry.cutout) { entry.cutout.width = entry.cutout.height = 1; entry.cutout = null; }\n", "    // The detached cutout was released above with the decoded image.\n")
patch('src/re-renderer.js',"    const face = plan.face;", "    if (entry?.state === 'error' && plan.referenceOverride && plan.path !== spritePath(f)) {\n      plan = { ...plan, path: spritePath(f), crop: f?.spriteCrop || f?.visual?.spriteCrop || null, anchor: [.5, 1], borderKey: undefined, referenceOverride: false, status: 'reference-asset-error', sideProfile: false, animated: false };\n      entry = requestAsset(plan.path, 'sprite');\n    }\n    const face = plan.face;")
patch('src/re-renderer.js',"    const time = options.motion === false ? 0 : now();", "    const time = options.motion === false ? 0 : Number.isFinite(options.time) ? Math.max(0, options.time) : now();\n    const sceneKey = JSON.stringify([story.uid, phase, index, page, other?.uid, canvas.id]);\n    let binding = cinemaBindings.get(canvas);\n    if (!binding || binding.key !== sceneKey) { binding = { key: sceneKey, subject: {}, opponent: {} }; cinemaBindings.set(canvas, binding); }\n    const cinemaState = phase === 'outro' || phase === 'post' ? 'win' : phase === 'defeat' ? 'lose' : phase === 'pre' ? 'guard' : 'idle';")
patch('src/re-renderer.js',"{ time, guard: phase === 'pre', hit: phase === 'post', reduceMotion: !time });", "{ time, animationKey: binding.opponent, animationState: phase === 'post' ? 'lose' : phase === 'defeat' ? 'win' : 'guard', guard: phase === 'pre', reduceMotion: !time });")
patch('src/re-renderer.js',"{ time, guard: phase === 'pre', hit: phase === 'defeat', reduceMotion: !time });", "{ time, animationKey: binding.subject, animationState: cinemaState, guard: phase === 'pre', reduceMotion: !time });")
patch('src/re-renderer.js',"    const paths = new Set([-1, 1].map(face => root.RE_FIGHTER_DIRECTIONS.resolve(f, face,\n      { ...pose, actor: null, opponentX: undefined, animationState: state }).path));", "    const paths = new Set();\n    for (const face of [-1, 1]) {\n      const sample = { ...pose, actor: null, opponentX: undefined, animationState: state };\n      paths.add(root.RE_FIGHTER_DIRECTIONS.resolve(f, face, sample).path);\n      paths.add(root.RE_FIGHTER_DIRECTIONS.resolve(f, face, sample, undefined, { skipClips: true }).path);\n    }")
# Content coverage expands by exactly two reviewed reference poses, not new animations.
patch('tests/verify-directional-r3.mjs',"assert.equal(api.counts.ready,3)","assert.equal(api.counts.ready,5)")
patch('tests/verify-directional-animation.mjs',"assert.equal(F.filter(f=>A.audit(f).ready).length,3)","assert.equal(F.filter(f=>A.audit(f).ready).length,5)")
p=R/'package.json';d=json.loads(p.read_text());extra=' && node tests/verify-directional-r4.mjs'
if extra not in d['scripts']['verify']:d['scripts']['verify']+=extra
p.write_text(json.dumps(d,indent=2,ensure_ascii=False)+'\n')
print('R4 presentation-only integration applied; generate reviewed PNGs and compile the registry next.')
