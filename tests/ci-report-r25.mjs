/** Publish bounded browser evidence in annotations when log/artifact hosts are unavailable. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

export function escapeWorkflowData(value) {
  return String(value).replaceAll('%', '%25').replaceAll('\r', '%0D').replaceAll('\n', '%0A');
}
export function escapeWorkflowProperty(value) {
  return escapeWorkflowData(value).replaceAll(':', '%3A').replaceAll(',', '%2C');
}
export function summarizeReport(report) {
  if (!report || typeof report !== 'object' || Array.isArray(report)) return null;
  const checks = Array.isArray(report.checks) ? report.checks.filter(check =>
    check && typeof check === 'object' && typeof check.pass === 'boolean') : [];
  if (!checks.length) return null;
  const failures = checks.filter(check => !check.pass).map(check => ({
    name: String(check.name || 'Unnamed browser check').slice(0, 300),
    error: String(check.error || 'The browser check did not pass.').replace(/\x1b\[[0-9;]*m/g, '').slice(0, 1800),
  }));
  if (Number.isSafeInteger(report.failed) && report.failed > failures.length) {
    failures.push({name: 'Unitemized report failure', error: `The report records ${report.failed} failed checks, including failures without individual details.`});
  }
  return {total: checks.length, passed: checks.filter(check => check.pass).length,
    failed: Math.max(checks.filter(check => !check.pass).length, Number.isSafeInteger(report.failed) ? report.failed : 0), failures};
}
export function collectReportFiles(root, directories) {
  root = fs.realpathSync(root);
  const files = [];
  function visit(candidate, depth) {
    const info = fs.lstatSync(candidate);
    if (info.isSymbolicLink()) return;
    const resolved = fs.realpathSync(candidate), relative = path.relative(root, resolved);
    if (relative === '..' || relative.startsWith('..' + path.sep) || path.isAbsolute(relative)) throw Error('CI reports must stay inside the checkout.');
    if (info.isDirectory()) {
      if (depth > 4) return;
      for (const name of fs.readdirSync(candidate).sort()) visit(path.join(candidate, name), depth + 1);
    } else if (info.isFile() && candidate.endsWith('.json') && info.size <= 2 * 1024 * 1024) {
      if (files.length >= 100) throw Error('Too many CI evidence files.');
      files.push({path: resolved, relative: relative.split(path.sep).join('/')});
    }
  }
  for (const directory of directories) {
    if (!/^qa-[a-zA-Z0-9_-]+$/.test(directory)) throw Error('Use a named qa-* evidence directory.');
    const candidate = path.join(root, directory);
    if (fs.existsSync(candidate)) visit(candidate, 0);
  }
  return files;
}
export function annotateReport(relative, summary) {
  return summary.failures.map(failure => `::error file=${escapeWorkflowProperty(relative)},title=Fidelity browser failure::${escapeWorkflowData(failure.name + ': ' + failure.error)}`);
}
function main() {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const directories = process.argv.slice(2);
  const reports = [];
  for (const file of collectReportFiles(root, directories)) {
    let report;
    try { report = JSON.parse(fs.readFileSync(file.path, 'utf8')); } catch { continue; }
    const summary = summarizeReport(report);
    if (!summary) continue;
    reports.push({path: file.relative, ...summary});
    for (const annotation of annotateReport(file.relative, summary)) process.stdout.write(annotation + '\n');
  }
  const lines = ['### Executed fidelity browser evidence', '', '| Report | Passed | Failed |', '| --- | ---: | ---: |',
    ...reports.map(report => `| ${report.path.replace(/[|<>\r\n]/g, '_')} | ${report.passed} | ${report.failed} |`), '',
    'Only completed JSON checks from this job are listed. Missing suites remain unrun; this summary does not certify original-game fidelity.', ''];
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, lines.join('\n'));
  process.stdout.write(JSON.stringify({reports: reports.length, completedChecks: reports.reduce((sum, r) => sum + r.total, 0),
    failedChecks: reports.reduce((sum, r) => sum + r.failed, 0)}) + '\n');
}
if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) main();
