#!/usr/bin/env python3
"""Assemble the V24 index/gallery from authored manifests; never rewrite images."""
from __future__ import annotations

import hashlib
import html
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
BASE = "246dbb81752c5fa41a55deb3aada3941ac966fec"
SPECS = {
    "characters": ("characters/ASSET_MANIFEST_CHARACTERS_V24.json", "Personnages", ["reports/INDEPENDENT_CHARACTERS_V24.json"]),
    "creatures": ("creatures/manifest.json", "Créatures", ["reports/INDEPENDENT_CREATURES_V24.json", "reports/INDEPENDENT_CREATURES_CORRECTION_V24.json"]),
    "projectiles": ("projectiles/ASSET_MANIFEST_PROJECTILES_V24.json", "Projectiles", ["reports/INDEPENDENT_PROJECTILES_V24.json"]),
    "stages": ("stages/manifest.json", "Décors", ["reports/INDEPENDENT_STAGES_V24.json"]),
}


def urls(values):
    found = []
    for value in values:
        if isinstance(value, str):
            found.append(value)
        elif isinstance(value, dict):
            found.extend(value[k] for k in ("page_url", "image_url") if value.get(k))
    return list(dict.fromkeys(found))


def build_manifest():
    assets = []
    manifests = []
    for domain, (rel, label, reports) in SPECS.items():
        raw = (ROOT / rel).read_bytes()
        doc = json.loads(raw)
        digest = hashlib.sha256(raw).hexdigest()
        manifests.append({"domain": domain, "path": rel, "sha256": digest, "assets": len(doc["assets"])})
        for source in doc["assets"]:
            dims = source["dimensions"]
            if isinstance(dims, dict):
                dims = [dims["width"], dims["height"]]
            limits = list(source.get("limitations", []))
            aid = source["asset_id"]
            if domain == "characters":
                limits.append("Revue indépendante : baseline variable et contours à vérifier dans le moteur ; les six poses n'atteignent pas toutes les marges demandées.")
            if aid == "REC_HELENA_RE6_DESELECT_KEY_V24":
                limits.append("Revue indépendante : regard vers la droite de l'image malgré le prompt vers la gauche ; correction ouverte.")
            if aid == "re4r_novistador_wingbeat_up_corrected_v24":
                limits.append("Les pointes arrière sont corrigées ; bruit de faible alpha et raccord à la pose basse toujours ouverts.")
            if domain == "stages":
                limits.append("Revue indépendante réalisée : les détails nouvellement visibles derrière les personnages de la source demeurent inférés.")
            entry = {
                "asset_id": aid, "domain": domain,
                "path": str(Path(rel).parent / source["path"]),
                "status": source["status"], "candidate": source["status"] != "superseded_trial",
                "name": source.get("name", aid), "edition": source["edition"],
                "state": source.get("state", "environment_master"),
                "dimensions": dims, "mode": source.get("mode", source.get("color_mode")),
                "file_bytes": source.get("file_bytes", source.get("bytes")),
                "sha256": source["sha256"], "git_blob_sha": source["git_blob_sha"],
                "alpha_range": source.get("alpha_range", source.get("alpha_extrema")),
                "source_manifest": rel, "source_manifest_sha256": digest,
                "sources": urls(source.get("sources", [])),
                "prompt": source.get("prompt"), "limitations": limits,
                "review_reports": reports,
                "engine_admitted": False, "animation_complete": False,
                "canonical_fidelity_1_1_certified": False,
                "post_generation_pixel_edits": False,
            }
            for key in ("hero_id", "uid", "runtime_target", "v1_actions", "superseded_by", "parallax_complete", "costume", "edition_key", "role"):
                if key in source:
                    entry[key] = source[key]
            assets.append(entry)
    counts = {}
    for domain in SPECS:
        group = [a for a in assets if a["domain"] == domain]
        counts[domain] = {"png": len(group), "candidates": sum(a["candidate"] for a in group), "superseded_trials": sum(not a["candidate"] for a in group)}
    assert len(assets) == 23 and sum(a["candidate"] for a in assets) == 20
    assert len({a["asset_id"] for a in assets}) == len(assets)
    result = {
        "schema": "rec-v24-consolidated-assets-1", "date": "2026-11-27", "timezone": "Europe/Paris",
        "base_commit": BASE,
        "scope": "Nouveaux candidats média hors moteur, états manquants et propositions de décors ; les essais remplacés sont conservés. Aucun statut historique clôturé par simple présence de PNG.",
        "path_base": "production-archives/rec-media/v24",
        "submanifests": manifests,
        "summary": {"png": len(assets), "candidates": 20, "superseded_trials": 3, "by_domain": counts,
                    "total_png_bytes": sum(a["file_bytes"] for a in assets), "new_character_identities": 0,
                    "new_creature_identities": 0, "complete_animations": 0, "completed_v1_projectile_actions": 0,
                    "completed_parallax_sets": 0, "engine_admissions": 0, "one_to_one_certifications": 0},
        "assets": assets,
        "independent_review_reports": list(dict.fromkeys(r for a in assets for r in a["review_reports"])),
        "ci_baseline_report": "reports/CI_BASELINE_V24.json",
        "progress": "PROGRESS_V24.json", "work_queue": "WORK_QUEUE_V24.md",
        "release_validation": "reports/QA_RELEASE_V24.json",
        "unchanged_rules": ["Sources et éditions distinctes ; aucune fusion remake/original/remaster sans preuve.",
                            "Aucun refus historique retenté, aucun inventaire ancien ou garde de provenance réécrit.",
                            "Les références tierces sont citées et hachées, leurs bitmaps ne sont pas livrés.",
                            "Les images sont les sorties natives du générateur, sans transformation de pixels après génération."],
    }
    (ROOT / "ASSET_MANIFEST_V24.json").write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return result


def build_gallery(doc):
    esc = html.escape
    cards = []
    nav = []
    for domain, (_, label, _) in SPECS.items():
        nav.append(f'<a href="#{domain}">{esc(label)}</a>')
        cards.append(f'<section id="{domain}"><h2>{esc(label)}</h2><div class="grid">')
        for a in [x for x in doc["assets"] if x["domain"] == domain]:
            width, height = a["dimensions"]
            badge = "Candidat · validation ouverte" if a["candidate"] else "Essai remplacé · archive"
            sources = "".join(f'<li><a href="{esc(url, quote=True)}" rel="noreferrer">{esc(url)}</a></li>' for url in a["sources"])
            limits = "".join(f'<li>{esc(item)}</li>' for item in a["limitations"])
            reports = " · ".join(f'<a href="{esc(p)}">Revue {i + 1}</a>' for i, p in enumerate(a["review_reports"]))
            prompt = a["prompt"] if isinstance(a["prompt"], str) else json.dumps(a["prompt"], ensure_ascii=False, indent=2)
            portrait = " portrait" if height > width else ""
            trial = " trial" if not a["candidate"] else ""
            cards.append(f'''<article class="card{trial}" id="asset-{esc(a['asset_id'])}">
<div class="asset{portrait}"><a href="{esc(a['path'])}"><img src="{esc(a['path'])}" width="{width}" height="{height}" alt="{esc(a['name'] + ' — ' + a['state'] + ' — ' + ('candidat' if a['candidate'] else 'essai remplacé'), quote=True)}" loading="lazy"></a></div>
<div class="body"><p class="badge">{badge}</p><h3>{esc(a['name'])}</h3>
<p>{esc(a['edition'])}<br><strong>{esc(a['state'])}</strong> · {width} × {height} · {esc(a['mode'])}</p>
<details><summary>Références, limites et traçabilité</summary><ul>{limits}</ul><h4>Sources</h4><ul class="sources">{sources}</ul>
<p><a href="{esc(a['source_manifest'])}">Manifeste de famille</a> · {reports}</p>
<p class="hash">SHA-256 : {esc(a['sha256'])}</p><details><summary>Prompt exécuté ou référence du prompt</summary><pre>{esc(prompt)}</pre></details></details></div></article>''')
        cards.append("</div></section>")
    css = '''
:root{color-scheme:dark;--bg:#101416;--panel:#1a2023;--line:#344347;--text:#eff3f1;--muted:#b1c1bf;--accent:#91c9b2}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font:16px/1.6 system-ui,sans-serif}header,main,footer{max-width:1440px;margin:auto;padding:28px}header{padding-top:56px}h1{font-size:clamp(2rem,4vw,3.8rem);line-height:1.12;margin:.3em 0}h2{font-size:1.9rem;margin:2em 0 .7em}h3{font-size:1.12rem;line-height:1.4;margin:.3em 0}h4{margin-bottom:.3em}p{margin:.7em 0}a{color:var(--accent);text-underline-offset:3px}a:focus-visible,summary:focus-visible{outline:3px solid #ffce7a;outline-offset:4px}.eyebrow{color:var(--accent);letter-spacing:.12em;text-transform:uppercase;font-size:.8rem}.intro{max-width:900px;color:var(--muted);font-size:1.1rem}.totals{display:flex;gap:24px;flex-wrap:wrap;margin:28px 0}.total strong{display:block;font-size:2rem;color:var(--text)}.total{color:var(--muted)}nav{display:flex;flex-wrap:wrap;gap:12px}nav a{border:1px solid var(--line);padding:7px 14px;border-radius:6px}.notice{border-left:4px solid #d5b67c;padding:10px 18px;margin:24px 0;background:#27251f;max-width:1000px}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,320px),1fr));gap:22px}.card{border:1px solid var(--line);background:var(--panel);border-radius:10px;overflow:hidden;align-self:start}.body{padding:18px}.asset{height:280px;display:flex;align-items:center;justify-content:center;background-color:#263033;background-image:linear-gradient(45deg,#303b3e 25%,transparent 25%),linear-gradient(-45deg,#303b3e 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#303b3e 75%),linear-gradient(-45deg,transparent 75%,#303b3e 75%);background-size:24px 24px;background-position:0 0,0 12px,12px -12px,-12px 0}.asset.portrait{height:440px}.asset a{display:block;width:100%;height:100%}.asset img{display:block;width:100%;height:100%;object-fit:contain}#stages .grid{grid-template-columns:repeat(auto-fit,minmax(min(100%,430px),1fr))}#stages .asset{height:auto;aspect-ratio:1672/941}.badge{font-size:.76rem;text-transform:uppercase;letter-spacing:.06em;color:var(--accent)}.trial{border-color:#816d48}.trial .badge{color:#e4c18a}summary{cursor:pointer;font-weight:600;padding:8px 0}details ul{padding-left:20px}li{margin-bottom:8px}.sources,.hash,pre{overflow-wrap:anywhere;word-break:break-word}.hash{font-size:.75rem;color:var(--muted)}pre{white-space:pre-wrap;font:12px/1.5 ui-monospace,monospace;max-height:380px;overflow:auto;padding:12px;background:#101416}footer{color:var(--muted);border-top:1px solid var(--line);margin-top:40px}section{scroll-margin-top:20px}@media(max-width:600px){header,main,footer{padding:20px}.asset.portrait{height:390px}}
'''
    out = f'''<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Resident Evil Combat — Galerie V24</title><style>{css}</style></head>
<body><header><p class="eyebrow">Resident Evil Combat · Archive de production · 27 novembre 2026</p><h1>Les états manquants prennent forme.</h1>
<p class="intro">V24 réunit des poses de sélection, des clés de mouvement de créatures, des orientations d'objets et trois propositions de décors. Chaque image garde sa source, son édition et ses limites de fidélité.</p>
<div class="totals"><div class="total"><strong>23</strong>PNG natifs</div><div class="total"><strong>20</strong>candidats</div><div class="total"><strong>3</strong>essais remplacés</div><div class="total"><strong>0</strong>admission moteur</div></div>
<div class="notice"><strong>Validation ouverte.</strong> Ces poses statiques ne constituent pas des animations complètes. Les décors sont des images aplaties de 1 672 × 941 pixels. Aucun fichier n'est certifié conforme 1:1 ; les zones reconstruites et les écarts observés sont décrits dans les revues.</div>
<nav aria-label="Familles d’assets">{''.join(nav)}</nav><p><a href="README.md">Notes du lot</a> · <a href="ASSET_MANIFEST_V24.json">Manifeste complet</a> · <a href="WORK_QUEUE_V24.md">Manquants et priorités</a> · <a href="reports/QA_RELEASE_V24.json">Contrôle des fichiers</a></p></header>
<main>{''.join(cards)}</main><footer>Galerie HTML statique sans script ni requête externe automatique. Les liens de référence ouvrent les sites sources. Les PNG sont les fichiers natifs livrés ; le damier est uniquement un fond CSS de prévisualisation. Le rendu en navigateur et dans le moteur n'a pas été vérifié dans ce lot.</footer></body></html>
'''
    (ROOT / "gallery.html").write_text(out, encoding="utf-8")


if __name__ == "__main__":
    manifest = build_manifest()
    build_gallery(manifest)
    print(json.dumps(manifest["summary"], ensure_ascii=False))
