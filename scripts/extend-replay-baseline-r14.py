#!/usr/bin/env python3
"""Retain the historical replay-preservation test with exact R14 hash successors."""
from pathlib import Path
import subprocess
R=Path(__file__).resolve().parents[1];p=R/'tests/verify-replay-vault-r13.mjs';s=p.read_text()
if 'import {r14Expected}' not in s:
 a="import fs from 'node:fs';";assert s.count(a)==1;s=s.replace(a,"import {r14Expected} from './r14-baseline.mjs';\n"+a)
 a=",expected,p);return{files:";assert s.count(a)==1;s=s.replace(a,",r14Expected(R,p,expected),p);return{files:")
 s=s.replace('Code and art preservation excludes only the reviewed controller change','R13 data and art preserved; R14 renderer successor checked against its exact predecessor');p.write_text(s)
# Stage this additional reviewed test, but the workflow commits only after QA.
subprocess.run(['git','add','tests/verify-replay-vault-r13.mjs'],cwd=R,check=True)
print('R13 preservation retained with the exact documented renderer delta; no data/art allowance added.')
