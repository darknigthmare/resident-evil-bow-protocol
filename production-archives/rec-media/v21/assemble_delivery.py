"""Assemble the review manifest and gallery from real, independently reviewed outputs.

This never edits image pixels or historic production records.
"""
from pathlib import Path
from PIL import Image
import collections
import hashlib
import html
import json

BASE = Path(__file__).resolve().parent
PREFIX = 'production-archives/rec-media/v21/'
assets, refusals, holds = [], [], []
expected_reports = ('root', 'humans', 'jessica', 'stages', 'stages_b')
missing_reports = [name for name in expected_reports if not (BASE / 'reports' / (name + '.json')).exists()]
assert not missing_reports, ('Incomplete delivery: missing reports', missing_reports)
for report_name in expected_reports:
    report_path = BASE / 'reports' / (report_name + '.json')
    report = json.loads(report_path.read_text())
    if report_name in ('stages', 'stages_b'):
        assert report.get('generation_complete') is True, ('Stage sublot not finalized', report_name)
    rows = report.get('assets', report.get('generated', []))
    for row in rows:
        relative = row['path'].removeprefix(PREFIX)
        path = BASE / relative
        raw = path.read_bytes()
        sha256 = hashlib.sha256(raw).hexdigest()
        git_sha = hashlib.sha1(b'blob ' + str(len(raw)).encode() + b'\0' + raw).hexdigest()
        assert git_sha == row['git_blob_sha'], (relative, 'Git blob mismatch')
        assert sha256 == row['sha256'], (relative, 'SHA256 mismatch')
        with Image.open(path) as im:
            im.load()
            dimensions = list(im.size)
            assert dimensions == row['dimensions'], (relative, 'dimension mismatch')
            alpha = im.getchannel('A') if 'A' in im.getbands() else None
            if alpha:
                alpha_range = list(alpha.getextrema())
                assert alpha_range == [0, 255], (relative, 'missing useful alpha')
                opaque_bbox = list(alpha.point(lambda x: 255 if x >= 128 else 0).getbbox())
            else:
                alpha_range, opaque_bbox = None, None
            mode = im.mode
        cat = row.get('category', '')
        if 'stage' in cat:
            category = 'stage'
        elif 'projectile' in cat:
            category = 'projectile'
        elif 'costume' in cat:
            category = 'costume'
        else:
            category = 'character'
        status = row.get('status', 'static_candidate')
        trial = 'trial' in status.lower() or 'rejected' in status.lower()
        study = status.lower() in ('visual_study', 'study', 'reference_study')
        name = row.get('name') or row.get('character') or row['asset_id']
        if 'CHRIS' in row['asset_id']:
            name = 'Chris Redfield — Safari'
        elif 'HAND_GRENADE' in row['asset_id']:
            name = 'Grenade de fragmentation — RE5'
        elif 'ROCKET' in row['asset_id']:
            name = 'Roquette en vol — RE5'
        direction = row.get('observed_direction') or row.get('direction') or row.get('requested_direction')
        references = row.get('references', row.get('sources', row.get('source_urls', [])))
        urls = []
        for ref in references:
            url = ref if isinstance(ref, str) else ref.get('url')
            if url and url not in urls:
                urls.append(url)
        limits = row.get('limitations', row.get('limits', row.get('review', [])))
        assets.append({
            'asset_id': row['asset_id'], 'name': name, 'category': category,
            'edition': row.get('edition', row.get('game', '')), 'costume': row.get('costume'),
            'direction': direction, 'runtime_id': row.get('runtime_id'), 'path': relative,
            'status': 'rejected_trial' if trial else ('visual_study' if study else 'static_candidate'),
            'dimensions': dimensions, 'mode': mode, 'file_bytes': len(raw),
            'alpha_range': alpha_range, 'bbox_alpha_ge128': opaque_bbox,
            'sha256': sha256, 'git_blob_sha': git_sha, 'sources': urls,
            'prompt': row.get('prompt'), 'review_report': 'reports/' + report_name + '.json',
            'limitations': limits, 'canonical_fidelity_1_1_certified': False,
            'engine_admitted': False, 'animation_complete': False,
            'image_pixels_modified_after_generation': False
        })
    for key in ('refusals', 'unfulfilled'):
        entries = report.get(key, [])
        if isinstance(entries, dict):
            entries = list(entries.values())
        for entry in entries:
            item = dict(entry)
            item['review_report'] = 'reports/' + report_name + '.json'
            if 'refus' in str(entry).lower() or 'moderation_blocked' in str(entry):
                refusals.append(item)
            else:
                holds.append(item)
    holds.extend(report.get('source_holds', []))

assert len({a['path'] for a in assets}) == len(assets)
assert {a['path'] for a in assets} == {str(p.relative_to(BASE)) for p in (BASE/'assets').glob('*.png')}, 'Unreported image'
counts = dict(collections.Counter(a['category'] for a in assets))
summary = {
    'png_outputs': len(assets), 'static_candidates': sum(a['status'] == 'static_candidate' for a in assets),
    'visual_studies': sum(a['status'] == 'visual_study' for a in assets),
    'rejected_trials': sum(a['status'] == 'rejected_trial' for a in assets),
    'by_category': counts, 'tool_refusals': len(refusals), 'source_holds': len(holds),
    'engine_admitted': 0, 'canonical_1_1_certified': 0, 'completed_animations': 0,
    'png_archive_before_v21': 142, 'png_archive_after_v21': 142 + len(assets)
}
manifest = {
    'schema': 'rec.media.v21/1', 'project': 'Resident Evil Combat', 'date': '2026-11-24',
    'timezone': 'Europe/Paris', 'repository': 'darknigthmare/resident-evil-bow-protocol',
    'pull_request': 24, 'base_head_before_v21': 'dac43f0e48d55eb754436b610e3fa3f34298baee',
    'summary': summary, 'assets': assets, 'tool_refusals': refusals, 'source_holds': holds,
    'scope': 'Generated static review assets. Does not complete all missing franchise content.',
    'source_policy': 'Third-party references were inspected and, where recorded in prompt logs, supplied as visual references to the generator; no third-party source bitmap published.',
    'historical_records_rewritten': False
}
(BASE/'ASSET_MANIFEST_V21.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2))
checks = {'date':'2026-11-24', 'result':'PASS', 'verified_images':len(assets),
          'checks':['Every delivered PNG decodes', 'Native dimensions match reports',
                    'SHA-256 matches independently recorded output', 'Git blob SHA matches staged bytes',
                    'Transparent sprites have useful alpha', 'No unreported PNG and no duplicate path'],
          'not_tested':['Gameplay', 'Runtime integration', 'Full animation', 'Canonical geometric 1:1 fidelity']}
(BASE/'reports/INTEGRITY_V21.json').write_text(json.dumps(checks, ensure_ascii=False, indent=2))

labels = {'stage':'Décors', 'character':'Personnages', 'costume':'Costumes', 'projectile':'Projectiles'}
cards = []
for a in assets:
    name = html.escape(a['name'])
    facing = 'Portrait trois-quarts' if 'portrait' in a['asset_id'].lower() else {'left':'gauche','right':'droite'}.get(a['direction'], a['direction'] or '')
    status = {'visual_study':'Étude — référence à compléter', 'rejected_trial':'Essai écarté — voir correction', 'static_candidate':'Candidat statique'}[a['status']]
    w,h = a['dimensions']
    refs = ''.join('<li><a href="'+html.escape(u,quote=True)+'" target="_blank" rel="noreferrer">'+html.escape(u)+'</a></li>' for u in a['sources'])
    limits = ''.join('<li>'+html.escape(str(t))+'</li>' for t in a['limitations'])
    search = html.escape(' '.join([a['name'],a['edition'],a['asset_id'],facing]).lower(), quote=True)
    cards.append(f'''<article class="card {a['category']}" data-category="{a['category']}" data-search="{search}">
<a class="picture" href="{a['path']}" target="_blank"><img src="{a['path']}" alt="{name} {facing}" loading="lazy"></a>
<div class="info"><p class="eyebrow">{labels[a['category']]} · {facing or 'Vue unique'}</p><h2>{name}</h2>
<p>{html.escape(a['edition'])}</p><p class="badge">{status}</p><p class="dimensions">{w} × {h} px · {a['mode']}</p>
<details><summary>Référence et revue</summary><ul>{limits}</ul><h3>Sources consultées</h3><ul class="sources">{refs}</ul><a href="{a['review_report']}">Rapport complet</a></details></div></article>''')
page = '''<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Resident Evil Combat — V21</title>
<style>
:root{color-scheme:dark;--bg:#101215;--panel:#191d22;--ink:#f2f4f5;--muted:#aeb8c2;--accent:#e1bd7a}*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.5 system-ui,sans-serif}header,main,footer{max-width:1360px;margin:auto;padding:28px}header{padding-top:56px}.eyebrow{font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:var(--accent)}h1{font-size:clamp(32px,5vw,56px);line-height:1.1;margin:12px 0}h2{font-size:21px;margin:7px 0}h3{font-size:15px}p{color:var(--muted)}a{color:var(--accent)}nav{display:flex;flex-wrap:wrap;gap:12px;margin:22px 0}.link,button,input{border:1px solid #40464e;border-radius:8px;padding:11px 14px;font:inherit;background:#20252b;color:var(--ink)}.link{text-decoration:none}button{cursor:pointer}button[aria-pressed=true]{background:var(--accent);color:#151719;border-color:var(--accent)}button:focus-visible,a:focus-visible,input:focus-visible,summary:focus-visible{outline:3px solid #80c7f0;outline-offset:3px}.toolbar{position:sticky;top:0;z-index:2;background:#101215ed;border-block:1px solid #353b43;padding:15px 0;backdrop-filter:blur(10px)}input{width:100%;margin-bottom:12px}.filters{display:flex;gap:8px;flex-wrap:wrap}.grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:20px;margin-top:24px}.card{background:var(--panel);border:1px solid #343b43;border-radius:12px;overflow:hidden}.picture{display:block;height:360px;background-color:#303943;background-image:linear-gradient(45deg,#39434f 25%,transparent 25%),linear-gradient(-45deg,#39434f 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#39434f 75%),linear-gradient(-45deg,transparent 75%,#39434f 75%);background-size:24px 24px;background-position:0 0,0 12px,12px -12px,-12px 0}.picture img{width:100%;height:100%;object-fit:contain;padding:12px}.stage{grid-column:span 2}.stage .picture{height:auto;aspect-ratio:2/1}.stage .picture img{padding:0;object-fit:cover}.projectile .picture img{padding:28px}.info{padding:20px}.info p{margin:6px 0}.badge{display:inline-block;border:1px solid #64604e;border-radius:4px;padding:3px 8px;font-size:13px;color:var(--accent)}.dimensions{font-size:13px}details{border-top:1px solid #3b424b;padding-top:12px;margin-top:15px}summary{cursor:pointer;font-weight:600}li{color:var(--muted);margin-bottom:7px}.sources{word-break:break-word;font-size:12px}footer{color:var(--muted);padding-bottom:48px}[hidden]{display:none!important}@media(max-width:950px){.grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:600px){.grid{grid-template-columns:1fr}.stage{grid-column:auto}header,main,footer{padding:20px}.picture{height:340px}}@media(prefers-reduced-motion:reduce){*{scroll-behavior:auto}}
</style><header><p class="eyebrow">Production V21 · 24 novembre 2026</p><h1>Resident Evil Combat</h1><p>Une image par asset. Personnages, costumes, décors et projectiles documentés pour la revue.</p>
<p>__COUNTS__</p><nav><a class="link" href="inventory/Resident_Evil_Combat_Inventaire_V21_20261124.xlsx">Inventaire Excel</a><a class="link" href="inventory/INVENTAIRE_COMPLET_V21_20261124.md">Liste détaillée</a><a class="link" href="ASSET_MANIFEST_V21.json">Manifeste</a><a class="link" href="https://github.com/darknigthmare/resident-evil-bow-protocol/pull/24">PR #24</a></nav>
<p>Les poses sont statiques et les décors sont des masters. Fidélité géométrique 1:1, animations, parallaxe et intégration restent à valider. Les refus ne sont pas comptés parmi les images.</p></header>
<main><section class="toolbar" aria-label="Filtres"><label for="search">Rechercher un asset</label><input id="search" type="search" placeholder="Personnage, lieu, édition…"><div class="filters">__BUTTONS__</div><p id="result" aria-live="polite"></p></section><section class="grid" aria-label="Images générées">__CARDS__</section><p id="empty" hidden>Aucune image ne correspond à ces filtres.</p></main><footer>Sorties natives conservées. Ouvrir une image pour afficher le PNG entier. Les vues opposées produites sont générées séparément ; les surfaces masquées restent interprétées.</footer>
<script>
const cards=[...document.querySelectorAll('.card')],buttons=[...document.querySelectorAll('[data-filter]')],search=document.querySelector('#search');let category='all';const norm=s=>s.normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').toLowerCase();function update(){let n=0;const q=norm(search.value.trim());for(const c of cards){const show=(category==='all'||category===c.dataset.category)&&norm(c.dataset.search).includes(q);c.hidden=!show;if(show)n++}document.querySelector('#result').textContent=n+' image'+(n>1?'s':'')+' affichée'+(n>1?'s':'')+' / '+cards.length;document.querySelector('#empty').hidden=n>0}for(const b of buttons)b.addEventListener('click',()=>{category=b.dataset.filter;for(const item of buttons)item.setAttribute('aria-pressed',String(item===b));update()});search.addEventListener('input',update);update();
</script></html>'''
buttons=''.join(f'<button type="button" data-filter="{key}" aria-pressed="{str(key=="all").lower()}">{label}</button>' for key,label in [('all','Tout'),*labels.items()])
page=page.replace('__COUNTS__',f"{len(assets)} PNG réels · {summary['static_candidates']} candidats statiques · {summary['visual_studies']} étude(s) · {summary['rejected_trials']} essai(s) écarté(s) · {len(refusals)} génération(s) refusée(s)").replace('__BUTTONS__',buttons).replace('__CARDS__','\n'.join(cards))
page=page.replace('<a class="link" href="ASSET_MANIFEST_V21.json">Manifeste</a>', '<a class="link" href="inventory/costumes-officiels-auditer.md">Catalogue des costumes</a><a class="link" href="ASSET_MANIFEST_V21.json">Manifeste</a>')
(BASE/'galerie.html').write_text(page)

stage_candidates = [a for a in assets if a['category'] == 'stage' and a['status'] == 'static_candidate']
mapped_stages = [a for a in stage_candidates if a['runtime_id']]
stage_rows = '\n'.join('| '+a['name']+' | '+a['edition']+' | '+('`'+a['runtime_id']+'`' if a['runtime_id'] else 'Complément hors des 16 absences runtime')+' | [PNG]('+a['path']+') |' for a in stage_candidates)
readme = f'''# Resident Evil Combat — livraison V21

Production du **24 novembre 2026** sur la [PR #24](https://github.com/darknigthmare/resident-evil-bow-protocol/pull/24), à partir du head antérieur à V21 `dac43f0e48d55eb754436b610e3fa3f34298baee`.

## Résultat livré

**{summary['png_outputs']} PNG réels : {summary['static_candidates']} candidats statiques, {summary['visual_studies']} étude et {summary['rejected_trials']} essais écartés.** {summary['tool_refusals']} demandes ont été refusées par le générateur et n'ont aucun PNG livré. Les essais restent documentés avec leur correction ; ils ne comptent pas comme candidats acceptés.

Ces fichiers complètent les archives de revue. Aucun nouvel asset V21 n'est admis dans le moteur, animé ou certifié conforme 1:1. Les dimensions, les références consultées, les limites visuelles et les empreintes de chaque image sont dans le manifeste et les rapports.

- [Galerie filtrable](galerie.html) — ouvrir avec le dossier `assets` à côté.
- [Inventaire complet, lisible](inventory/INVENTAIRE_COMPLET_V21_20261124.md)
- [Classeur Excel filtrable](inventory/Resident_Evil_Combat_Inventaire_V21_20261124.xlsx)
- [Inventaire structuré](inventory/INVENTAIRE_COMPLET_V21_20261124.json)
- [Catalogue des costumes à réconcilier](inventory/costumes-officiels-auditer.md) — 38 variantes ciblées, dont 25 noms/éditions étayés par source primaire et 13 à confirmer ; aucun manque global déduit.
- [Manifeste des fichiers livrés](ASSET_MANIFEST_V21.json)
- [Contrôle d'intégrité](reports/INTEGRITY_V21.json)

## Personnages et costumes

| Incarnation exacte | Sorties candidates | État restant |
| --- | --- | --- |
| Chris Redfield — RE5, Safari | Une vue gauche et une vue droite | Proportions, accessoires, marges et continuité à valider ; aucune animation. |
| Parker Luciani — Revelations HD PC 2013, combinaison de mission | Une vue gauche et une vue droite | Visage et surfaces cachées interprétés ; aucune animation. |
| Luis Sera — RE4 original 2005 | Une vue droite | Vue gauche refusée par l'outil ; incarnation distincte de RE4 remake. |
| Jessica Sherawat — Revelations HD PC 2013, plongée | Une vue gauche, une vue droite corrigée et un portrait | Un essai droit inversait l'asymétrie de la tenue. Le désaccord avec le portrait historique 2017 reste à réconcilier. |

Les neuf PNG de ce groupe comprennent huit candidats et l'essai de Jessica. Les vues opposées ont été générées séparément. L'asymétrie anatomique de la tenue de Jessica a été contrôlée ; une image opposée ne constitue pas à elle seule une validation du modèle complet.

## Décors

**{len(stage_candidates)} masters candidats**, dont **{len(mapped_stages)} associés aux 16 arènes RE5 sans bitmap renseigné dans le catalogue runtime**. Le décor Reaper / convoyeurs possède déjà une composition et trois calques candidats en V5 : il n'a pas été régénéré. Le Ship Deck du chapitre 6-1 est un complément distinct du Bridge Deck d'Aheri au chapitre 6-2.

| Lieu généré | Édition / chapitre | Correspondance proposée | Fichier |
| --- | --- | --- | --- |
{stage_rows}

Chaque master est une image native **1774 × 887**. Les six couches de parallaxe, les états animés, les collisions et l'import dans le moteur restent à produire ou valider. Le cadrage latéral, les distances et les zones cachées sont reconstruits : aucune reproduction géométrique 1:1 n'est certifiée. Pour Ndesu, transformer un combat depuis des tourelles en piste à pied constitue explicitement une adaptation. La scène d'Aheri avec du texte et le premier Shanty Town avec une grille mal placée ont été conservés comme essais ; leurs corrections sont distinctes.

## Projectiles

| Élément | Sortie | Qualification |
| --- | --- | --- |
| Grenade RE5 | Un PNG RGBA 1254 × 1254 | Candidat d'objet statique avec anneau ; aucune animation de vol ou d'explosion. |
| Roquette RE5 vers la droite | Un PNG RGBA 2172 × 724 | Étude seulement : partie arrière et effet de propulsion inférés d'une référence partielle. |
| Grenade incendiaire RE5 | Aucun PNG | Refus de l'outil, conservé dans le suivi. |
| Grenade flash RE5 | Aucun PNG | Refus de l'outil, conservé dans le suivi. |

Ces visuels RE5 ne valident pas automatiquement des projectiles d'autres jeux. Les 44 actions de la Bible V1 sont regroupées en 16 familles de travail ; ce sont des règles et besoins à rapprocher des références, pas 44 PNG manquants démontrés.

## Périmètre et travaux non clos

L'inventaire couvre 52 entrées de stages, 346 UID du catalogue suivi, 24 fiches de personnages V1, 60 propositions d'extension, 24 descriptions de tenues de base et les cibles V5. Ces populations se recoupent : aucun total global de personnages manquants ni pourcentage d'achèvement de la franchise n'est calculé.

- Les 16 champs bitmap des arènes RE5 restent vides dans le moteur tant que les candidats ne sont pas intégrés.
- Les 129 attentes de source du catalogue B.O.W. et ses 61 états de refus historiques sont conservés.
- Les costumes officiels supplémentaires sont recensés à part avec leur niveau de preuve. Une variante identifiée n'est pas automatiquement absente du projet.
- Les archives annoncées mais non récupérées, notamment V19 et les sorties V12/V13 non retrouvées, ne sont pas comptées comme de nouveaux fichiers livrés ou comme des absences certaines.
- Les surfaces masquées, les détails de visage, les proportions et certaines marges des sprites restent à revoir. La taille native principale est 1254 × 1254, sans agrandissement artificiel.

## Vérification et publication

Les PNG livrés décodent, leurs dimensions et empreintes SHA-256 correspondent aux rapports, et leurs SHA Git correspondent aux blobs publiés. Les sprites transparents possèdent un canal alpha utile. Les images sont copiées sans retouche depuis les sorties du générateur, une image par asset ou pose. Les bitmaps tiers utilisés comme références ne sont pas publiés dans ce lot.

Le contrôle de la galerie vérifie les liens locaux et la syntaxe JavaScript. Le rendu navigateur n'a pas pu être validé : Chromium était bloqué par les permissions de création de sockets de cet environnement. Ce contrôle n'équivaut pas à un test du jeu.

Au checkpoint V21, la garde R34 échoue sur le fichier préexistant `production-archives/rec-media/CI_CHECKPOINT2_20261120.json` ; voir le [relevé du checkpoint](reports/CHECKPOINT_PUBLICATION_V21.json). La PR reste en brouillon. L'état CI du dernier commit est à lire sur la PR ; aucun moteur, garde, workflow ni archive historique n'a été modifié pour contourner cet échec.
'''
(BASE/'README.md').write_text(readme)
print(json.dumps(summary, ensure_ascii=False, indent=2))
