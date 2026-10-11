#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding='utf-8')


def write(path: str, content: str) -> None:
    (ROOT / path).write_text(content, encoding='utf-8')


index = read('index.html')
if 'id="familyGrid"' not in index:
    mode_anchor = '</div></section>\n<section class="incident-baker"'
    mode_markup = (
        '<a class="mode" href="operations.html?mode=family">'
        '<span class="mode-num">08</span><span class="mode-symbol">◉</span>'
        '<h3>E-001 FAMILY</h3>'
        '<p>Quatorze sujets de Dulvey réunis dans une route chronologique autour de l’influence d’Eveline.</p>'
        '<span class="mode-bottom family-mode-badge">PROTOCOLE E-001 <b>↗</b></span>'
        '</a></div></section>\n<section class="incident-baker"'
    )
    if mode_anchor not in index:
        raise SystemExit('Protocol grid anchor missing from index.html')
    index = index.replace(mode_anchor, mode_markup, 1)
    archive_anchor = '<section class="archive-banner">'
    family_markup = (
        '<section class="e001-family" aria-labelledby="familyHeading">'
        '<div class="e001-copy"><p class="eyebrow">EXTENSION DE CONFINEMENT · V0.5.0</p>'
        '<h2 id="familyHeading">E-001 · FAMILY PROTOCOL</h2>'
        '<p>Six formes humaines ou infectées de Dulvey rejoignent leurs mutations déjà répertoriées. '
        'Chaque incarnation conserve sa morphologie, son équipement, son agent et ses attaques.</p>'
        '<div class="e001-metrics"><span><b>6</b>NOUVEAUX SUJETS</span>'
        '<span><b>60</b>TECHNIQUES AUDITÉES</span><span><b>48</b>ESSAIS DE DOSSIER</span>'
        '<span><b>6</b>CHAMBRES DULVEY</span></div></div>'
        '<div id="familyGrid" class="e001-grid" aria-label="Nouvelles incarnations E-001 de Dulvey"></div>'
        '</section>\n'
    )
    if archive_anchor not in index:
        raise SystemExit('Archive banner anchor missing from index.html')
    index = index.replace(archive_anchor, family_markup + archive_anchor, 1)
write('index.html', index)

hub = read('src/hub.js')
if "const familyGrid=by('familyGrid')" not in hub:
    marker = "const apexGrid=by('apexGrid');"
    start = hub.find(marker)
    if start < 0:
        raise SystemExit('Apex grid marker missing from src/hub.js')
    end = hub.find('\n', start)
    if end < 0:
        end = len(hub)
    family_line = (
        "const familyGrid=by('familyGrid');"
        "if(familyGrid)familyGrid.innerHTML=family.map(f=>`"
        "<a class=\"e001-card\" href=\"movesets.html?uid=${encodeURIComponent(f.uid)}\">"
        "<img src=\"${f.sprite}\" alt=\"${f.name}\">"
        "<span><small>${f.source}</small><b>${f.name}</b>"
        "<em>${f.combat.role} · MOVESET 10/10</em></span></a>`).join('');\n"
    )
    hub = hub[:end + 1] + family_line + hub[end + 1:]
write('src/hub.js', hub)

ui = read('tests/verify-ui.mjs')
ui = ui.replace('APEX MUTATION / CQC', 'E-001 FAMILY PROTOCOL / CQC')
ui = ui.replace(
    'Home runtime fills public counters, Incident Baker and Apex Mutation cards',
    'Home runtime fills public counters, Incident Baker, Apex Mutation and E-001 Family cards',
)
ui = ui.replace(
    'Home screen initializes Incident Baker and the twelve-subject Apex Mutation panel',
    'Home screen initializes Incident Baker, Apex Mutation and the six-subject E-001 Family panel',
)
write('tests/verify-ui.mjs', ui)

print('v0.5.0 home container, runtime and UI assertions repaired')
