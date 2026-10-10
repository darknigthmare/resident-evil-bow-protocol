"""Import reviewed source images and catalogue into the editable project data."""
import json, shutil, sys
from pathlib import Path
R=Path(__file__).resolve().parents[1]
source=Path(sys.argv[1]) if len(sys.argv)>1 else R.parent
load=lambda p,default:json.loads(p.read_text()) if p.exists() else default
whole=load(source/'re-fullbody.json',{'fighters':[]})['fighters']
curation={f['id']:f for f in load(source/'re-curation.json',{'fighters':[]})['fighters']}
catalog_data=load(R/'data/catalog-portraits.json',{'catalog':[]})
catalog={f['id']:f for f in catalog_data['catalog']}
for row in load(source/'re-missing-bosses.json',{'entries':[]})['entries']:
    ident=row['id']; row=dict(row)
    local=row.get('localPath')
    if local and Path(local).exists():
        ext=Path(local).suffix;target=f'assets/catalog/{ident}{ext}'
        shutil.copy2(local,R/target);row['portrait']=target
        row['assetStatus']='downloaded'
    row['assetUsage']='portraitOnly'
    catalog[ident]={**catalog.get(ident,{}),**row}

special={
 're7-flying-bug':('flying',54,48), 're7-little-crawler':('quadruped',78,94),
 'revillage-varcolac':('quadruped',156,200),
 'revillage-samca':('flying',210,145),
 'revillage-hauler':('soldat',218,84),
 'revillage-moroaica':('infected',218,84),
 'revillage-donna-angie':('mutant',230,96),
 'revillage-salvatore-moreau':('mutant',216,119),
 'revillage-salvatore-moreau-exposed':('mutant',218,150),
 'revillage-karl-heisenberg':('elite',235,94),
 'revillage-mother-miranda':('mutant',250,130),
 'revillage-mutated-miranda':('flying',295,190),
 're4-bitores-mendez-enemy':('mutant',276,112),
 're4r-bitores-mendez':('mutant',280,112),
 're4-osmund-saddler-enemy':('mutant',236,90),
 're4r-ramon-salazar':('mutant',152,65),
 're4-verdugo':('hunter',270,95), 're4r-verdugo':('hunter',280,99),
 're2-g-fourth-form':('birkin',180,225),
 're7-molded-fat':('molded',246,160),
 're7-mama-mold':('molded',294,170),
 're2-g-type-young':('quadruped',68,78),
 're2-g-type-adult':('birkin',225,192),
 're6-strelat':('hunter',165,169),
 'rerev2-glasp':('insect',142,160),
 're4-bitores-mendez-mutated':('mutant',335,162),
 're4-el-gigante':('executioner',360,186),
 're3r-hunter-gamma':('hunter',231,170),
 'recv-albinoid-adult':('aquatic',154,192),
 'recv-alexia':('mutant',240,80),
 'recv-alexia-ashford-third-form':('flying',240,195),
 'recv-bandersnatch':('mutant',267,160),
 'rerev-farfarello':('hunter',216,148),
 'rerev-globster':('quadruped',112,160),
 'rerev-rachael-ooze':('regenerator',240,85),
 'rerev-sea-creeper':('aquatic',116,126),
 'rerev-draghignazzo':('executioner',303,190),
}
attack_overrides={
 'revillage-karl-heisenberg':['Coup de marteau','Marteau engagé','Fauchage de marteau','Saisie','Percée au marteau','Impact au sol','Capture magnétique','Retrait','Décharge ferromagnétique'],
 'revillage-donna-angie':['Attaque de poupée','Impact de poupée','Passage bas','Agrippement','Assaut des poupées','Trouble perceptif','Poupée d’embuscade','Dissimulation','Hallucination collective'],
 'revillage-mutated-miranda':['Griffe ailée','Ailes tranchantes','Balayage d’ailes','Étreinte','Plongeon','Frappe descendante','Capture aérienne','Retrait ailé','Assaut de Miranda'],
 're4r-ramon-salazar':['Saisie parasite','Frappe parasite','Tentacule rasant','Agrippement','Extension parasite','Fauchage parasite','Capture parasite','Retrait','Éruption parasite'],
 're7-flying-bug':['Piqûre','Piqûre engagée','Rase-mottes','Ancrage','Piqué','Piqué rasant','Attaque d’ancrage','Écart aérien','Assaut de l’insecte'],
}
playable=[]
for original in whole:
    row=dict(original); extra=curation.get(row['id'],{})
    for key in ['morphologyDescription','canonicalAttacks','loreNote','sources','relativeSize']:
        if extra.get(key):row[key]=extra[key]
    row['bioAgent']=extra.get('pathogen') or row.get('pathogen')
    row['description']=row.get('morphologyDescription') or f"{row['name']}, dans son apparence de {row['game']}. La pose conserve la silhouette et les détails du rendu référencé."
    if row.get('formNote'):row['description']+=' '+row['formNote']
    row['morphology']=row['description']
    row['spriteSource']=row.get('sourcePage');row['sourcePage']=row.get('referencePage') or row['sourcePage']
    row['assetNote']=row.get('validation','Rendu de référence statique ; mouvements et effets adaptés au moteur 2D.')
    if row['id'] in special:
        kind,h,w=special[row['id']];row['archetypeKey']=kind
        row['visual']={**row.get('visual',{}),'height':h,'drawHeight':h,'width':w}
    if row['id'] in attack_overrides:row['moveNames']=attack_overrides[row['id']]
    # These human forms use a deliberately labelled simulation moveset.
    if row['id'] in ['re4r-ramon-salazar','revillage-donna-angie','re4-osmund-saddler-enemy']:
        row['assetNote']+=' Cette apparence ne possède pas un répertoire canonique de duel autonome : les techniques sont une adaptation de simulation.'
    dest=R/row['sprite'];dest.parent.mkdir(parents=True,exist_ok=True)
    shutil.copy2(original['localPath'],dest)
    old=catalog.get(row['id'],{})
    if old.get('portrait') and (R/old['portrait']).exists():row['portrait']=old['portrait']
    else:row['portrait']=row['sprite']
    playable.append(row)
    cat={**old,**{k:row[k] for k in ['id','name','game','gameKey','portrait','sourcePage','bioAgent','description']}}
    cat.update(playable=True,sprite=row['sprite'],spriteSource=row['spriteSource'],assetNote=row['assetNote'],assetStatus='downloaded',assetUsage='fullBody')
    catalog[row['id']]=cat

for row in catalog.values():
    row.setdefault('playable',False)
    row.setdefault('description','Référence documentaire de cet épisode. Consulter la source pour le détail des formes et de leur comportement.')
    row.pop('localPath',None)
catalog_data['catalog']=list(catalog.values())
(R/'data/catalog-portraits.json').write_text(json.dumps(catalog_data,ensure_ascii=False,indent=2))
(R/'data/playable.json').write_text(json.dumps(playable,ensure_ascii=False,indent=2))
(R/'data/curation.json').write_text('{}\n')
(R/'data/asset-sources.json').write_text(json.dumps({'scope':'Images de référence répertoriées avec leurs pages et empreintes. Les créations du moteur restent distinctes des ressources Resident Evil.','fighters':whole,'curation':list(curation.values())},ensure_ascii=False,indent=2))
print(json.dumps({'playable':len(playable),'catalog':len(catalog),'games':len(set(x['gameKey'] for x in catalog.values()))}))
