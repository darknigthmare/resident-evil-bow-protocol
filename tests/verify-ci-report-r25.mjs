import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {annotateReport, collectReportFiles, escapeWorkflowData, summarizeReport} from './ci-report-r25.mjs';

const passed = summarizeReport({checks: [{name: 'one', pass: true}, {name: 'two', pass: true}], passed: 2, failed: 0});
assert.deepEqual({passed: passed.passed, failed: passed.failed, total: passed.total}, {passed: 2, failed: 0, total: 2});
assert.deepEqual(annotateReport('qa-results/report.json', passed), []);
console.log('PASS Completed checks retain their exact pass and fail counts');

const failed = summarizeReport({checks: [{name: 'Pixel equality', pass: false, error: 'actual differs from original'}], failed: 1});
assert.equal(failed.failed, 1);
assert.match(annotateReport('qa-results/report.json', failed)[0], /Pixel equality: actual differs from original$/);
assert.equal(summarizeReport({checks: [{name: 'source metadata', sha256: 'abc'}]}), null);
assert.equal(summarizeReport({passed: 10, failed: 0}), null);
console.log('PASS Browser failures are annotated without treating source metadata as executed checks');

const malicious = summarizeReport({checks: [{name: 'x\n::warning::hidden', pass: false, error: '%0A\r\n::error::forged'}]});
const annotation = annotateReport('qa-evidence/a,b:c.json', malicious)[0];
assert.equal(annotation.split('\n').length, 1);
assert.match(annotation, /a%2Cb%3Ac\.json/);
assert.match(annotation, /%250A%0D%0A::error::forged/);
assert.equal(escapeWorkflowData('%\r\n'), '%25%0D%0A');
console.log('PASS Newlines, percent sequences and property separators cannot inject workflow commands');

const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'bow-r25-ci-report-'));
try {
  fs.mkdirSync(path.join(directory, 'qa-results'));
  fs.writeFileSync(path.join(directory, 'qa-results', 'result.json'), '{}');
  fs.writeFileSync(path.join(directory, 'outside.json'), '{}');
  fs.symlinkSync(path.join(directory, 'outside.json'), path.join(directory, 'qa-results', 'linked.json'));
  fs.writeFileSync(path.join(directory, 'qa-results', 'large.json'), Buffer.alloc(2 * 1024 * 1024 + 1));
  assert.deepEqual(collectReportFiles(directory, ['qa-results']).map(file => file.relative), ['qa-results/result.json']);
  assert.throws(() => collectReportFiles(directory, ['../outside']), /named qa-/);
  assert.deepEqual(collectReportFiles(directory, ['qa-unrun']), []);
  console.log('PASS Evidence stays bounded inside named checkout directories and skips symlinks or oversized files');
} finally { fs.rmSync(directory, {recursive: true, force: true}); }

const missingDetail = summarizeReport({checks: [{name: 'only reported item', pass: true}], failed: 2});
assert.equal(missingDetail.failed, 2);
assert.equal(missingDetail.failures.length, 1);
assert.match(missingDetail.failures[0].error, /records 2 failed/);
console.log('PASS A reported failure without individual details cannot disappear from the summary');
