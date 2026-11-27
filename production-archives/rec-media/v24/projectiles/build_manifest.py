#!/usr/bin/env python3
"""Measure native PNG outputs and record provenance; never rewrite image pixels."""
from pathlib import Path
from PIL import Image
import argparse
import hashlib
import json

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[3]
BASE = '246dbb81752c5fa41a55deb3aada3941ac966fec'

def digest(data):
    return hashlib.sha256(data).hexdigest()

def measure(path):
    data = path.read_bytes()
    with Image.open(path) as image:
        image.load()
        alpha = image.getchannel('A')
        histogram = alpha.histogram()
        box = alpha.point(lambda x: 255 if x >= 128 else 0).getbbox()
        width, height = image.size
        return {
            'dimensions': [width, height], 'mode': image.mode,
            'file_bytes': len(data), 'sha256': digest(data),
            'git_blob_sha': hashlib.sha1(b'blob '+str(len(data)).encode()+b'\0'+data).hexdigest(),
            'alpha_range': list(alpha.getextrema()), 'fully_transparent_pixels': histogram[0],
            'low_alpha_1_to_15_pixels': sum(histogram[1:16]),
            'bbox_alpha_nonzero': list(alpha.getbbox()), 'bbox_alpha_ge128': list(box),
            'margins_alpha_ge128_px': dict(zip(['left','top','right','bottom'],[box[0],box[1],width-box[2],height-box[3]])),
        }

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--reference-dir', type=Path, required=True)
    args=parser.parse_args()
    sources=[
        {'source_id':'re4r_native_bolts','file':'re4r_bolts_native.png','url':'https://www.evilresource.com/resident-evil-4-remake/weaponry/bolts','image_url':'https://www.evilresource.com/images/data/full/re4remake/bolts.png?6ffd99c6=',
         'sha256':'15d2000721e1226f035c6e9f890c86c0b2819d12b683dc7dfa1277f2dcdfac07','kind':'native_inventory_render_reproduced_by_third_party','edition':'Resident Evil 4 Remake (2023)',
         'observed':'Bundle of plain blue bolts; pointed dark tips and black fletching are visible. No silver clips on the shafts.','limits':'Several bolts overlap. A single complete side view is reconstructed, not extracted.','redistributed':False},
        {'source_id':'re0_native_molotov','file':'re0_molotov_native.png','url':'https://www.evilresource.com/resident-evil-zero/weaponry/molotov-cocktail','image_url':'https://www.evilresource.com/images/data/full/re0/molotov-cocktail.png?27512703=',
         'sha256':'c5a31f6e55d5080eef86803437de6a77ec5e332d11a163a7721ac5f323da3da3','kind':'native_inventory_render_reproduced_by_third_party','edition':'Resident Evil Zero (2002 catalogue; platform of the pictured render unspecified)',
         'observed':'One complete unlit green bottle with pale cloth, worn red/cream label and diagonal orientation.','limits':'Source is low definition; small lettering and HD2016 details are not certified.','redistributed':False},
    ]
    lookup={}
    for source in sources:
        path=args.reference_dir/source['file']
        assert digest(path.read_bytes()) == source['sha256'], source['file']
        with Image.open(path) as image: source['dimensions']=list(image.size)
        lookup[str(path)]={'source_id':source['source_id'],'sha256':source['sha256'],'kind':source['kind'],'url':source['url']}
    for filename in ['REC_OBJ_RE4R_2023_BOLT_RIGHT_V22.png','REC_OBJ_RE0_MOLOTOV_UNLIT_V22.png']:
        path=args.reference_dir/filename
        lookup[str(path)]={'kind':'generated_v22_candidate','path':'production-archives/rec-media/v22/assets/'+filename,'source_commit':BASE,'sha256':digest(path.read_bytes())}
    jobs=[]
    for path in sorted((HERE/'prompts').glob('*.json')):
        for job in json.loads(path.read_text())['jobs']:
            job['prompt_file']=path.relative_to(HERE).as_posix()
            jobs.append(job)
    trial=HERE/'assets/trials/re4r_bolt_left_v24.png'
    lookup['/workspace/scratch/37b119cd013c/generated_images/exec-641c218f-e40b-40cd-b495-979532c737e5.png']={'kind':'superseded_v24_trial','path':'production-archives/rec-media/v24/projectiles/assets/trials/re4r_bolt_left_v24.png','sha256':digest(trial.read_bytes())}
    descriptions={
        'REC_OBJ_RE4R_BOLT_LEFT_V24':('Carreau simple RE4R — gauche, premier essai','left','superseded_trial'),
        'REC_OBJ_RE4R_BOLT_LEFT_CORRECTED_V24':('Carreau simple RE4R — gauche, sans attaches ajoutées','left','orientation_key_candidate'),
        'REC_OBJ_RE4R_BOLT_ASCENDING_V24':('Carreau simple RE4R — inclinaison montante','upper_right','orientation_key_candidate'),
        'REC_OBJ_RE0_MOLOTOV_HORIZONTAL_V24':('Bouteille RE0 non allumée — horizontale','neck_left','orientation_key_candidate'),
        'REC_OBJ_RE0_MOLOTOV_UPRIGHT_V24':('Bouteille RE0 non allumée — verticale','neck_up','orientation_key_candidate'),
        'REC_OBJ_RE0_MOLOTOV_TURNING_V24':('Bouteille RE0 non allumée — rotation opposée','neck_lower_right','orientation_key_candidate'),
    }
    assets=[]
    for job in jobs:
        name,state,status=descriptions[job['id']]
        path=HERE/'assets'/('trials' if status=='superseded_trial' else '')/job['file']
        measurements=measure(path)
        assert measurements['mode']=='RGBA' and measurements['alpha_range'][0]==0
        assert path.read_bytes()==Path(job['output_path']).read_bytes(), 'Changed native tool bytes'
        is_bolt='BOLT' in job['id']
        source=sources[0 if is_bolt else 1]
        limits=['Orientation statique adaptée ; pas de frame extraite du jeu ni de séquence animée complète.',
                'Échelle, ancrage et contours à vérifier dans le moteur ; pixels de très faible alpha résiduels.',
                'Les marges demandées ne sont pas atteintes sur tous les côtés ; aucune silhouette utile n’est rognée.']
        limits.append('Carreau simple de Leon : ne remplace pas les Blast Arrows d’Ada ni les flèches de Krauser. Les fins détails et angles sont reconstruits.' if is_bolt else 'Objet non allumé ; plateforme source non précisée. Aucun allumage, éclatement ou feu d’impact produit, aucun marquage fin certifié.')
        if status=='superseded_trial': limits.append('Essai remplacé : deux attaches métalliques sans support dans le rendu natif.')
        assets.append({'asset_id':job['id'],'name':name,'category':'projectile','state':state,'edition':source['edition'],
                       'path':path.relative_to(HERE).as_posix(),'status':status,**measurements,
                       'sources':[source['url']],'reference_inputs':[lookup[x] for x in job['refs']],
                       'prompt':job['prompt'],'prompt_file':job['prompt_file'],'tool':'image_gen.imagegen','generation_mode':'edit',
                       'transparent_background_requested':True,'native_output':job['output_path'],'native_output_bytes_verified':True,
                       'v1_actions':[] if is_bolt else ['REC_REBECCA_RE0__SP2'],
                       'role':'additional_arsenal_orientation' if is_bolt else 'partial_orientation_key_for_existing_action',
                       'limitations':limits,'engine_admitted':False,'animation_complete':False,'canonical_fidelity_1_1_certified':False,
                       'image_pixels_modified_after_generation':False,
                       **({'superseded_by':'assets/re4r_bolt_left_corrected_v24.png'} if status=='superseded_trial' else {})})
    assert len(assets)==6 and len({x['sha256'] for x in assets})==6
    report={'schema':'rec-v24-projectiles-1','date':'2026-11-27','timezone':'Europe/Paris','base_commit':BASE,
            'assets':assets,'sources':sources,'summary':{'png':6,'candidate_orientation_keys':5,'superseded_trials':1,'complete_v1_actions':0,'complete_animations':0},
            'recovery_note':'Upright PNG was returned without output_hint; exact tool base64 bytes decoded, no re-encoding or pixel modification.',
            'historical_refusals_retried':False,'pixel_editing_performed':False,'scope':'Five orientation candidates, including three partial keys for RE0 SP2 and two additional Leon arsenal orientations. No closure of the 44 V1 actions.'}
    (HERE/'ASSET_MANIFEST_PROJECTILES_V24.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps(report['summary']))

if __name__=='__main__': main()
