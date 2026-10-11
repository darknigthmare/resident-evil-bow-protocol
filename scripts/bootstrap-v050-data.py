#!/usr/bin/env python3
from pathlib import Path
from collections import Counter
import copy,json,hashlib
from PIL import Image,ImageDraw,ImageOps
R=Path(__file__).resolve().parents[1];V='0.5.0';U='https://blackjackrants.blogspot.com/2020/11/reviewing-monsters-resident-evil-7.html';S=['light','heavy','low','throw','special','specialDown','specialForward','specialBack','super','utility']
X=json.loads((R/'docs/v050-family-specs.json').read_text(encoding='utf-8'))['specs']

def L(p):return json.loads((R/p).read_text(encoding='utf-8'))
def W(p,d):q=R/p;q.parent.mkdir(parents=True,exist_ok=True);q.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
def spr(uid,i):
 a=Image.open(R/'assets/catalog'/f'{uid}.png').convert('RGBA');o=Image.new('RGBA',(620,1000));d=ImageDraw.Draw(o,'RGBA');c=[(170,151,125,255),(145,119,54,255),(67,57,51,255),(100,88,75,255),(38,42,46,255),(49,46,63,255)][i]
 d.ellipse((170,905,450,970),fill=(0,0,0,70));d.polygon([(215,280),(405,280),(440,650),(370,690),(245,680),(180,630)],fill=c);d.polygon([(235,650),(305,655),(292,930),(215,930)],fill=(34,32,34,255));d.polygon([(320,655),(390,648),(420,930),(340,930)],fill=(34,32,34,255));d.line((220,320,140,610),fill=(135,108,95,255),width=42);d.line((400,320,480,600),fill=(135,108,95,255),width=42)
 if i==0:d.rectangle((420,430,555,495),fill=(128,44,34,255));d.polygon([(535,445),(615,420),(615,452),(540,480)],fill=(175,180,178,255))
 if i==1:d.line((480,570,575,170),fill=(83,62,45,255),width=18);d.polygon([(548,145),(614,132),(620,198),(560,210)],fill=(130,134,132,255))
 if i==2:
  for z in (-35,35):d.line((445,555,580,310+z),fill=(82,78,73,255),width=28)
 if i==3:d.rectangle((450,635,540,760),fill=(80,59,39,255));d.ellipse((476,668,520,720),fill=(255,185,65,205))
 if i==4:d.rectangle((452,540,525,615),fill=(70,75,78,255));d.line((100,820,520,820),fill=(200,65,45,190),width=4)
 if i==5:
  for pts in [[(230,600),(140,700),(95,850)],[(390,600),(490,710),(540,850)]]:d.line(pts,fill=(30,26,35,200),width=15)
 f=ImageOps.fit(a,(164,180),method=Image.Resampling.LANCZOS,centering=(.5,.25));m=Image.new('L',f.size);ImageDraw.Draw(m).ellipse((4,2,160,178),fill=255);f.putalpha(m);o.alpha_composite(f,(228,78));p=R/'assets/specimens'/f'{uid}.png';o.save(p,optimize=True);return p.relative_to(R).as_posix()
def main():
 r=L('data/roster.json');p=L('data/playable.json');cp=L('data/catalog-portraits.json');a=L('data/asset-sources.json');ch=L('data/chronicles.json');fi=L('data/finishers-v053.json');ar=L('data/arenas.json');mi=L('data/missing-bosses.json');ids={x[0] for x in X};stids={x[5] for x in X}
 r['fighters']=[x for x in r['fighters'] if x['uid'] not in ids];p=[x for x in p if x.get('id') not in ids];a['fighters']=[x for x in a['fighters'] if x.get('id') not in ids];r['stages']=[x for x in r['stages'] if x['id'] not in stids];ar=[x for x in ar if x['id'] not in stids]
 for u in ids:ch['stories'].pop(u,None);fi['profiles'].pop(u,None)
 fm={x['uid']:x for x in r['fighters']};cpm={x['id']:x for x in cp['catalog']};cm={x['id']:x for x in r['catalog']};mm={x['id']:x for x in mi['entries']}
 for i,(u,t,n,role,res,stid,stname,names,canon,morph) in enumerate(X):
  f=copy.deepcopy(fm[t]);f.update(uid=u,id=u,name=n,ep='Resident Evil 7 biohazard (2017)',source='RE7 · 2017',game='resident-evil-7',role=role,bioAgent='Moisissure / E-001',morphology=f'{n}. {morph}',canonicalAttacks=canon,boss=True,portrait=f'assets/catalog/{u}.png',sprite=spr(u,i),reference=U,spriteSource=U,assetNote='Sprite composite original du fangame ; aucune animation propriétaire extraite.');f['visual'].update(kind='human',height=[220,246,250,226,232,166][i],width=[92,128,175,110,102,72][i],drawHeight=[220,246,250,226,232,166][i],fullBody=True,spriteCrop=[0,0,620,1000],morphology='humanoid');f['combat']['uid']=u;f['combat']['role']=role;f['combat']['resource'].update(label=res,max=100);f['combat']['sources']=[U];f['combat']['canonicalAttacks']=canon;f['combat']['fidelity']=f['fidelity'];f['combat']['passive'].update(id='lore-'+u,name=['Hôte instable','Bienvenue dans la famille','Moteur de la morgue','Matriarche du couvain','Maître de l’épreuve','Projection d’E-001'][i])
  for j,s in enumerate(S):m=f['combat']['moves'][s];m.update(id=f'{u}::{s}',slot=s,name=names[j],source=U,loreBasis=morph+' Actions : '+' / '.join(canon),adaptation='Commandes, frames, valeurs et duels croisés restent une adaptation originale du moteur 2D.');m['evidence']=m['lore']='canonical' if j in (0,1,4,6,8) else ('simulation' if j==7 or (u=='re7-lucas-baker' and j==3) else 'anatomical')
  r['fighters'].append(f);fm[u]=f;raw=(R/f['sprite']).read_bytes();im=Image.open(R/f['sprite']);meta={'width':im.width,'height':im.height,'format':'PNG','bytes':len(raw),'sha256':hashlib.sha256(raw).hexdigest(),'transparent':True,'alphaBox':list(im.getchannel('A').getbbox())};q=copy.deepcopy(next(x for x in p if x['id']==t));q.update(id=u,candidateId=u,name=n,game=f['ep'],gameKey='resident-evil-7',pathogen=f['bioAgent'],morphology=f['morphology'],sprite=f['sprite'],portrait=f['portrait'],localPath=f['sprite'],assetUsage='fullBody',fullBodyValidated=True,referencePage=U,sourcePage=U,sources=[U],canonicalAttacks=canon,bioAgent=f['bioAgent'],description=f['morphology'],assetNote=f['assetNote'],**meta);p.append(q);a['fighters'].append(copy.deepcopy(q))
  for z in (cpm[u],cm[u],mm[u]):z.update(sprite=f['sprite'],selected=True,playable=True,assetUsage='fullBody',fullBodyValidated=True,bioAgent=f['bioAgent'],canonicalAttacks=canon,sources=[U],description=f['morphology'],assetNote=f['assetNote'],**meta)
  st=copy.deepcopy(next(x for x in r['stages'] if x['id']=='baker_house'));st.update(id=stid,name=stname,ep='RE7 · 2017',scope='Reconstitution originale de '+stname);r['stages'].append(st);ar.append({k:st[k] for k in ['id','background','artwork','tint','representation','credit']})
  story=copy.deepcopy(ch['stories'][t]);story.update(uid=u,name=n,game=f['ep'],title=role,edition='v0.5.0 · E-001 Family Protocol',anchor=f['morphology'],meta=f['assetNote'],narrativeVersion='RE 0.5.0');opp=[x for x in list(ids)+['re7-molded','re7-molded-fat','re7-jack-baker-mutated','re7-marguerite-baker-mutated'] if x!=u][:8]
  for k,row in enumerate(story['route']):row.update(index=k,opponent=opp[k],stage=stid,stageName=stname,before=f'Essai {k+1}/8 : {n} entre dans {stname}.',after='La simulation E-001 prépare la chambre suivante.')
  ch['stories'][u]=story;pr=copy.deepcopy(fi['profiles'][t]);pr.update(uid=u,fighterName=n,episode=f['ep'],source=f['source'],basis=f['morphology'],visual=f['visual'],power=f['power'],speed=f['speed'],reach=f['reach'])
  for k,z in enumerate(pr['finishers']):z.update(id=f'{u}::finisher{k+1}',name=names[[8,5,6,1][k]]+' — Conclusion',description=n+' conclut le duel dans une séquence stylisée.',loreBasis=f['morphology'],sourceMoves=[names[[8,5,6,1][k]]])
  fi['profiles'][u]=pr
 ch['fighters']=copy.deepcopy(r['fighters']);ch['stages']=copy.deepcopy(r['stages']);N=len(r['fighters']);ev=Counter(m['evidence'] for f in r['fighters'] for m in f['combat']['moves'].values());C=dict(fighters=N,stories=len(ch['stories']),authored=len(ch['stories']),structured=len(ch['stories']),duels=len(ch['stories'])*8,introPanels=len(ch['stories'])*3,outroPanels=len(ch['stories'])*3,paragraphs=len(ch['stories'])*6,illustratedPortraits=N,paintedArenas=len(r['stages']),catalog=len(r['catalog']),finishers=sum(len(x['finishers']) for x in fi['profiles'].values()),loreProfiles=N,loreMoves=N*10,canonicalMoves=ev['canonical'],anatomicalMoves=ev['anatomical'],simulationMoves=ev['simulation']);r['version']=ch['version']=ch['sourceVersion']=fi['version']=V;r['counts'].update(C);ch['counts'].update(C);fi['fighterCount']=N;fi['finisherCount']=C['finishers']
 for path,data in [('data/roster.json',r),('data/playable.json',p),('data/catalog-portraits.json',cp),('data/asset-sources.json',a),('data/chronicles.json',ch),('data/finishers-v053.json',fi),('data/arenas.json',ar),('data/missing-bosses.json',mi)]:W(path,data)
 print(json.dumps({'version':V,'fighters':N,'moves':N*10,'stories':len(ch['stories']),'stages':len(r['stages'])}))
if __name__=='__main__':main()
