import json,hashlib,shutil,sys
from pathlib import Path
from PIL import Image
B=Path('/workspace/scratch/39787b3268a6');V=B/'production-archives/rec-media/v22';P=V/'reports/stages.json';report=json.loads(P.read_text())
jobs=json.loads(Path(sys.argv[1]).read_text())
for s in jobs:
 p=V/'assets'/(s['asset_id']+'.png');o=Path(s['source_output_path']);shutil.copy2(o,p);b=p.read_bytes();im=Image.open(p);sha=hashlib.sha1(b'blob '+str(len(b)).encode()+b'\0'+b).hexdigest();assert sha==s['git_blob_sha']
 sources=[]
 for i,f in enumerate(s['refs']):
  sources.append({'url':s['source_pages'][min(i,len(s['source_pages'])-1)],'image_url':s['image_sources'][i],'edition':s['edition'],'chapter':s['chapter'],'role':'Capture du gameplay consultée pour les repères ; conversion latérale adaptée.','local_reference_paths':[str(B/'v22_work/references/stages'/f)],'visually_inspected':True})
 limits=['Composition latérale adaptée : géométrie exacte 1:1 non certifiée.','Largeur, distances et placement des accessoires adaptés pour le combat 2D.','Master opaque unique : aucune séparation en six couches et aucune animation.','Résolution native %s×%s ; ni 4K ni cible 7680×2160 atteinte.'%im.size,'Aucun import moteur, pivot, collision ou recette caméra validé.','Les21 masters annoncés V3/V4 ne sont pas récupérés ; absence historique totale non certifiée.']+s.get('extra_limits',[])
 a={'asset_id':s['asset_id'],'category':'stage','name':s['name'],'edition':s['edition'],'chapter':s['chapter'],'runtime_id':s['key'],'path':str(p.relative_to(B)),'source_output_path':str(o),'generation_reference_paths':s.get('generation_reference_paths',[str(B/'v22_work/references/stages'/f) for f in s['refs']]),'prompt':s['prompt'],'sources':sources,'dimensions':list(im.size),'mode':im.mode,'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest(),'git_blob_sha':sha,'local_git_blob_sha':sha,'git_blob_verified':True,'status':s.get('status','candidate_static_master'),'visually_reviewed':True,'observed_composition':s['observed_composition'],'limits':limits,'canonical_one_to_one_certified':False,'engine_admitted':False,'generator':'image_gen_builtin'}
 old=next((x for x in report['assets'] if x['asset_id']==a['asset_id']),None)
 if old:assert old['sha256']==a['sha256']
 else:report['assets'].append(a)
report['candidate_static_master_count']=sum(x['status']=='candidate_static_master' for x in report['assets']);report['trial_count']=sum(x['status']=='trial' for x in report['assets']);report['generated_png_count']=len(report['assets']);report['runtime_candidate_stage_count']=sum(x['status']=='candidate_static_master' and bool(x.get('runtime_id')) for x in report['assets']);report['extra_stage_candidate_count']=sum(x['status']=='candidate_static_master' and not x.get('runtime_id') for x in report['assets']);report['image_generation_call_count']=len(report['assets']);P.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');print(json.dumps({'png':len(report['assets']),'candidates':report['candidate_static_master_count'],'trials':report['trial_count']}))
