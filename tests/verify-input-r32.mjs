/** R32: actual trial input consumption agrees with the established combat direction rules. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const inputs = ['src/trial-input-v071.js', 'src/combat-foundation-v060.js', 'tests/verify-input-r32.mjs'];
const checks = [];
function test(name, run) {
  try {checks.push({name, pass: true, detail: run()}); console.log('PASS ' + name);}
  catch (error) {checks.push({name, pass: false, error: error.stack}); console.error('FAIL ' + name + ': ' + error.message);}
}
function fixture() {
  const pad = {index: 0, id: 'R32 standard pad fixture', connected: true, mapping: 'standard', axes: [0, 0],
    buttons: Array.from({length: 17}, () => ({pressed: false, value: 0}))};
  const sandbox = {navigator: {getGamepads: () => [pad]}};
  vm.createContext(sandbox);
  for (const file of inputs.slice(0, 2)) vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), sandbox, {filename: file});
  return {controls: sandbox.RE_TRIAL_INPUT.create(), combat: sandbox.CQCCombat060, pad};
}
const cases = [
  {name: 'neutral', held: {}, facingRight: 'special', facingLeft: 'special'},
  {name: 'left', held: {left: true}, facingRight: 'specialBack', facingLeft: 'specialForward'},
  {name: 'right', held: {right: true}, facingRight: 'specialForward', facingLeft: 'specialBack'},
  {name: 'opposite', held: {left: true, right: true}, facingRight: 'special', facingLeft: 'special'},
  {name: 'down', held: {down: true}, facingRight: 'specialDown', facingLeft: 'specialDown'},
  {name: 'left-down', held: {left: true, down: true}, facingRight: 'specialDown', facingLeft: 'specialDown'},
  {name: 'right-down', held: {right: true, down: true}, facingRight: 'specialDown', facingLeft: 'specialDown'},
  {name: 'opposite-down', held: {left: true, right: true, down: true}, facingRight: 'specialDown', facingLeft: 'specialDown'},
];
function expected(row, face) {return face === 1 ? row.facingRight : row.facingLeft;}
function verifyResult(f, row, face, result) {
  assert.equal(result.slot, expected(row, face), row.name + ', facing ' + face);
  assert.equal(result.slot, f.combat.directionSlot(result, face), 'Trial input and combat disagree');
  for (const direction of ['left', 'right', 'down']) assert.equal(result[direction], !!row.held[direction], 'Held source state changed');
}
for (const device of ['keyboard', 'pointers', 'standard-gamepad']) {
  test(device + ': neutral, opposing directions, crouch and both facings match combat', () => {
    for (const row of cases) for (const face of [-1, 1]) {
      const f = fixture(); let sampled;
      if (device === 'keyboard') {
        for (const [direction, code] of Object.entries({left: 'KeyQ', right: 'KeyD', down: 'KeyS'})) if (row.held[direction]) f.controls.key(code, true);
        f.controls.key('KeyL', true);
      } else if (device === 'pointers') {
        for (const [index, direction] of ['left', 'right', 'down'].entries()) if (row.held[direction]) f.controls.pointer(index, direction, true);
        f.controls.pointer(10, 'special', true);
      } else {
        f.controls.samplePad(); // Establish the connected device before its first button edge.
        for (const [direction, index] of Object.entries({left: 14, right: 15, down: 13})) f.pad.buttons[index].pressed = !!row.held[direction];
        f.pad.buttons[1].pressed = true; sampled = f.controls.samplePad();
      }
      verifyResult(f, row, face, f.controls.consume(face, sampled));
      assert.equal(f.controls.consume(face, device === 'standard-gamepad' ? f.controls.samplePad() : undefined).slot, null, 'One press must be consumed once');
    }
    return {directionCases: cases.length, facings: 2, combinations: 16, syntheticDevice: device !== 'keyboard'};
  });
}
test('Opposed directions across keyboard, pointer and gamepad resolve neutrally', () => {
  const mixtures = [
    f => {f.controls.key('KeyQ', true); f.controls.pointer(1, 'right', true); return undefined;},
    f => {f.controls.key('ArrowLeft', true); f.pad.axes[0] = 1; return f.controls.samplePad();},
    f => {f.controls.pointer(1, 'right', true); f.pad.axes[0] = -1; return f.controls.samplePad();},
  ];
  for (const mix of mixtures) for (const face of [-1, 1]) {
    const f = fixture(), pad = mix(f); f.controls.queue('special');
    verifyResult(f, cases[3], face, f.controls.consume(face, pad));
  }
  return {devicePairs: 3, facings: 2};
});
test('Releasing one opposite direction restores the surviving direction and respects a facing change', () => {
  const f = fixture(); f.controls.key('KeyA', true); f.controls.key('KeyQ', true); f.controls.key('KeyD', true);
  f.controls.queue('special'); assert.equal(f.controls.consume(1).slot, 'special');
  f.controls.key('KeyA', false); f.controls.queue('special'); assert.equal(f.controls.consume(1).slot, 'special', 'AZERTY alias remains held');
  f.controls.key('KeyQ', false); f.controls.queue('special'); assert.equal(f.controls.consume(1).slot, 'specialForward');
  f.controls.queue('special'); assert.equal(f.controls.consume(-1).slot, 'specialBack');
  return {leftAliasesIndependent: true, facingReadAtConsumption: true};
});
test('Repeated keydowns cannot repeat a special, and clear removes pending actions and held sources', () => {
  const f = fixture(); f.controls.key('KeyL', true); assert.equal(f.controls.consume().slot, 'special');
  f.controls.key('KeyL', true, true); f.controls.key('KeyL', true); assert.equal(f.controls.consume().slot, null);
  f.controls.key('KeyL', false); f.controls.key('KeyL', true); f.controls.key('KeyQ', true); f.controls.pointer(1, 'right', true);
  f.controls.clear(); const input = f.controls.consume();
  assert.equal(input.slot, null); assert.equal(input.left, false); assert.equal(input.right, false);
  return {noOperatingSystemRepeat: true, pendingActionCleared: true};
});
test('Guard, throw escape, jump and dash retain their original action semantics', () => {
  const f = fixture(); f.controls.key('Space', true); f.controls.queue('jump'); f.controls.queue('dash'); f.controls.queue('throw');
  const input = f.controls.consume(); assert.equal(input.guard, true); assert.equal(input.jump, true);
  assert.equal(input.dash, true); assert.equal(input.tech, true); assert.equal(input.slot, 'throw');
  const next = f.controls.consume(); assert.equal(next.guard, true); assert.equal(next.jump, false); assert.equal(next.dash, false); assert.equal(next.slot, null);
  return {heldGuardPreserved: true, discreteActionsConsumedOnce: true};
});

const sha = file => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex');
const report = {schema: 're.bow.input-r32/1', passed: checks.filter(row => row.pass).length,
  failed: checks.filter(row => !row.pass).length, checks, inputs: inputs.map(file => ({path: file, sha256: sha(file)})),
  scope: 'Real trial-input and combat direction resolver in Node VM. Device events are fixtures; physical controllers and a full browser match are separate checks.'};
fs.mkdirSync(path.join(root, 'qa-gamedev-r32'), {recursive: true});
fs.writeFileSync(path.join(root, 'qa-gamedev-r32/input.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({passed: report.passed, failed: report.failed}));
if (report.failed) process.exitCode = 1;
