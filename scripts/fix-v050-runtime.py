#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding='utf-8')


def write(path: str, content: str) -> None:
    (ROOT / path).write_text(content, encoding='utf-8')


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

print('v0.5.0 runtime and UI assertions repaired')
