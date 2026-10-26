"""Review source-bound R27 claims without manufacturing completion of empty pages."""
import copy,gzip,hashlib,importlib.util,json
from pathlib import Path
import unittest
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('canonical_r27',ROOT/'scripts/build-canonical-evidence-r27.py');BUILD=importlib.util.module_from_spec(spec);spec.loader.exec_module(BUILD)
MODULE=ROOT/'modules/fidelity-r27/canonical'
class CanonicalEvidenceR27Tests(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.manifest=json.loads((MODULE/'manifest.json').read_text());cls.roster={r['id']:r for r in json.loads((ROOT/'data/roster.json').read_text())['catalog']};cls.sources={s['id']:s for s in cls.manifest['sources']};cls.pages={}
  for s in cls.sources.values():
   packed=(MODULE/s['snapshot']).read_bytes();assert hashlib.sha256(packed).hexdigest()==s['snapshot_sha256'];raw=gzip.decompress(packed);assert hashlib.sha256(raw).hexdigest()==s['raw_sha256']
   if s['publisher']=='Evil Resource':text=BUILD.TABLES.parse_page(raw,s['effective_url'])['article_text']
   else:
    visible=BUILD.RULES.VisibleText();visible.feed(raw.decode());text=' '.join(visible.parts)
   cls.pages[s['id']]=text
 def verify(self,claim):BUILD.verify_claim(claim,self.sources,self.pages,self.roster)
 def claim(self,uid):return next(c for c in self.manifest['claims'] if c['uid']==uid)
 def test_reproduces_all_eighty_four_quotes_and_thirty_six_source_hashes(self):
  self.assertEqual(BUILD.build(),self.manifest);self.assertEqual(len(self.manifest['claims']),84);self.assertEqual(len(self.manifest['sources']),36)
  for c in self.manifest['claims']:self.verify(c)
 def test_eighty_one_new_subjects_preserve_all_previous_reviews(self):
  prior=set()
  for release in ['r23','r24','r25','r26']:
   data=json.loads((ROOT/f'modules/fidelity-{release}/canonical/manifest.json').read_text());prior.update(e['id'] for e in data['entries'] if e['claims']) if release=='r23' else prior.update(c['uid'] for c in data['claims'])
  current={c['uid'] for c in self.manifest['claims']};self.assertEqual(len(prior),275);self.assertEqual(len(current),81);self.assertFalse(prior&current);self.assertEqual(len(prior|current),356)
  self.assertEqual({e['id'] for e in self.manifest['entries']},set(self.roster));self.assertEqual(len(json.loads((MODULE/'curation.json').read_text())['unreviewed_after_batch']),33)
 def test_2005_and_2023_mutations_cannot_share_a_citation(self):
  old=self.claim('re4-bitores-mendez-mutated');new=self.claim('re4r-bitores-mendez-first-mutation');self.assertIn('human face',old['evidence'][0]['excerpt']);self.assertIn('legs still look human',new['evidence'][0]['excerpt'])
  bad=copy.deepcopy(old);bad['evidence'][0]['game_key']=new['game_key']
  with self.assertRaisesRegex(ValueError,'boundary'):self.verify(bad)
 def test_human_and_mutated_bodies_keep_named_phases(self):
  for uid,term,phase in [('re7-lucas-baker-mutated','left hand','Not a Hero'),('re7-jack-baker-swamp-man','End of Zoe','End of Zoe'),('revillage-salvatore-moreau-exposed','cysts','retrait du manteau'),('re4r-plaga','eight legs','remake')]:
   c=self.claim(uid);self.assertIn(term,c['evidence'][0]['excerpt']);self.assertIn(phase,c['phase'])
 def test_negated_combat_is_not_changed_into_a_new_human_attack(self):
  c=self.claim('re7-lucas-baker');self.assertEqual(c['polarity'],'NEGATED');self.assertIn("doesn't even fight you",c['evidence'][0]['excerpt']);self.assertIn('jeu principal',c['phase'])
 def test_hypothesis_and_ambiguous_baby_remain_scope_gaps(self):
  for uid,term in [('rerequiem-the-commander','theorised'),('revillage-baby','never stated')]:
   c=self.claim(uid);self.assertEqual(c['type'],'scope');self.assertIn(term,c['evidence'][0]['excerpt'])
  self.assertIn('pas un alias HUNK certifié',self.claim('rerequiem-the-commander')['phase'])
 def test_replacing_quotes_or_claiming_complete_fidelity_is_refused(self):
  for k,v in [('canonical_fidelity_certified',True),('phase','')]:
   bad=copy.deepcopy(self.manifest['claims'][0]);bad[k]=v
   with self.assertRaises(ValueError):self.verify(bad)
  bad=copy.deepcopy(self.manifest['claims'][0]);bad['evidence'][0]['excerpt']='Undocumented laser beam.'
  with self.assertRaisesRegex(ValueError,'Quotation missing'):self.verify(bad)
 def test_no_body_dimensions_or_other_actor_can_be_invented(self):
  for k,v in [('type','dimension'),('actor_uid','re3r-nemesis')]:
   bad=copy.deepcopy(self.manifest['claims'][0]);bad[k]=v
   with self.assertRaises(ValueError):self.verify(bad)
 def test_previous_manifest_bytes_and_secondary_certification_are_exact(self):
  self.assertEqual(len(self.manifest['previous_manifests']),4)
  for p in self.manifest['previous_manifests']:self.assertEqual(hashlib.sha256((MODULE/p['path']).read_bytes()).hexdigest(),p['sha256'])
  for k in ['direct_primary_captures','independent_primary_corroborations','complete_move_sets','certified_body_scales','canonical_fidelity_certified']:self.assertEqual(self.manifest['summary'][k],0)
if __name__=='__main__':unittest.main()
