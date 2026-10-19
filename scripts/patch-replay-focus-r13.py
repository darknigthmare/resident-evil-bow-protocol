"""Keep historical R9 keyboard coverage after adding a second pause action."""
from pathlib import Path
R=Path(__file__).resolve().parents[1]
changes={
 'tests/verify-audit-r9.mjs':(
  "resume.focus();key(e,'Tab');assert.equal(e.document.activeElement,resume);",
  "resume.focus();key(e,'Tab');assert.equal(e.document.activeElement.className,'replayOpenR13');key(e,'Tab');assert.equal(e.document.activeElement.id,'resume43');"),
 'tests/browser-audit-r9.mjs':(
  "await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.activeElement.id),'resume43');await page.keyboard.press('Enter');",
  "await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.activeElement.className),'replayOpenR13');await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.activeElement.id),'resume43');await page.keyboard.press('Enter');")}
for name,(a,b) in changes.items():
 p=R/name;s=p.read_text()
 if b not in s:
  assert s.count(a)==1,(name,s.count(a));p.write_text(s.replace(a,b))
print('R9 focus checks now visit both actual pause buttons, then native Enter resumes.')
