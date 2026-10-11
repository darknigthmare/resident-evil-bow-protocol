#!/usr/bin/env python3
from pathlib import Path
import argparse,hashlib,json
ROOT=Path(__file__).resolve().parents[1]
def read(p): return json.loads((ROOT/p).read_text(encoding='utf-8'))
def write(p,d): (ROOT/p).write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
a=argparse.ArgumentParser();a.add_argument('--deployment-id',required=True);a.add_argument('--deployment-url',required=True);a.add_argument('--verified-code-commit',required=True);a.add_argument('--production-url',default='https://resident-evil-bow-protocol.vercel.app/');x=a.parse_args()
d=read('docs/deployment.json');d.update(productionStatus='READY_V040_PRODUCTION',verificationDeploymentId=x.deployment_id,verificationDeploymentUrl=x.deployment_url,verifiedCodeCommit=x.verified_code_commit,productionUrl=x.production_url);write('docs/deployment.json',d)
p=read('docs/source-provenance.json');p['deployment']={'projectId':d['vercelProjectId'],'verificationDeploymentId':x.deployment_id,'verificationDeploymentUrl':x.deployment_url,'verifiedCodeCommit':x.verified_code_commit,'productionAlias':x.production_url,'status':d['productionStatus']};write('docs/source-provenance.json',p)
m=read('docs/RELEASE_MANIFEST_v0.4.0.json');files=[]
for q in sorted(ROOT.rglob('*')):
 if q.is_file():
  rel=q.relative_to(ROOT).as_posix()
  if not rel.startswith(('dist/','node_modules/','.git/')) and rel!='docs/RELEASE_MANIFEST_v0.4.0.json': files.append({'path':rel,'bytes':q.stat().st_size,'sha256':hashlib.sha256(q.read_bytes()).hexdigest()})
m['files']=files;m['production']={'status':d['productionStatus'],'verificationDeploymentId':x.deployment_id,'verificationDeploymentUrl':x.deployment_url,'verifiedCodeCommit':x.verified_code_commit,'productionUrl':x.production_url};write('docs/RELEASE_MANIFEST_v0.4.0.json',m)
print(json.dumps({'status':d['productionStatus'],'manifestFiles':len(files)}))
