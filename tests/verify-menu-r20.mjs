import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const scope = { console, window: {} }; vm.createContext(scope);
vm.runInContext(fs.readFileSync('src/menu-navigation-r20.js', 'utf8'), scope);
vm.runInContext(fs.readFileSync('src/interface-preferences-r20.js', 'utf8'), scope);
const input = scope.window.RE_MENU_INPUT_R20, prefs = scope.window.RE_INTERFACE_R20;
const clone = value => JSON.parse(JSON.stringify(value));
const checks = [];
function test(name, fn) { fn(); checks.push({ name, pass: true }); console.log('PASS ' + name); }
const pad = (buttons = [], axes = [0, 0]) => ({ index: 0, id: 'Fixture standard controller', mapping: 'standard', buttons: Array.from({length: 17}, (_, i) => ({ pressed: buttons.includes(i), value: buttons.includes(i) ? 1 : 0 })), axes });
test('A controller connected with confirm held cannot launch a mode', () => {
  const reader = input.create();
  for (const t of [0, 200, 1200]) assert.deepEqual(clone(reader.sample([pad([0])], t)), []);
  reader.sample([pad()], 1250); assert.deepEqual(clone(reader.sample([pad([0])], 1300)), ['confirm']);
  assert.deepEqual(clone(reader.sample([pad([0])], 2000)), []);
});
test('Directional repeats have a bounded delay; no held confirmation repeats', () => {
  const reader = input.create(); reader.sample([pad()], 0);
  assert.deepEqual(clone(reader.sample([pad([13, 0])], 10)), ['down', 'confirm']);
  assert.deepEqual(clone(reader.sample([pad([13, 0])], 339)), []);
  assert.deepEqual(clone(reader.sample([pad([13, 0])], 340)), ['down']);
  assert.deepEqual(clone(reader.sample([pad([13, 0])], 475)), ['down']);
});
test('Axes use a dead zone and only standard mappings are accepted', () => {
  assert.deepEqual(clone(input.commands(pad([], [.3, -.3]))), []);
  assert.deepEqual(clone(input.commands(pad([], [.8, -.8]))), ['up', 'right']);
  assert.deepEqual(clone(input.commands({...pad([0]), mapping: ''})), []);
});
test('Disconnect and visibility reset require neutral input before new actions', () => {
  const reader = input.create(); reader.sample([pad()], 0); reader.sample([pad([0])], 1);
  reader.sample([], 2); assert.deepEqual(clone(reader.sample([pad([0])], 3)), []);
  reader.reset(); assert.deepEqual(clone(reader.sample([pad([9])], 4)), []);
});
test('Two controllers cannot duplicate the same menu action in one frame', () => {
  const reader = input.create(), other = {...pad(), index: 1}; reader.sample([pad(), other], 0);
  assert.deepEqual(clone(reader.sample([pad([0]), {...pad([0]), index: 1}], 10)), ['confirm']);
});
test('Preferences are normalized and unrelated/prototype fields are dropped', () => {
  assert.deepEqual(clone(prefs.normalize({motion:'oops',text:'tiny',contrast:9,progress:100})), clone(prefs.defaults));
  assert.deepEqual(clone(prefs.normalize(JSON.parse('{"motion":"reduced","__proto__":{"polluted":true}}'))), {version:1,motion:'reduced',text:'normal',contrast:'standard'});
  assert.equal({}.polluted, undefined);
});
test('Corrupt and inaccessible preference storage uses safe defaults', () => {
  assert.deepEqual(clone(prefs.read({getItem(){return '{bad';}})), clone(prefs.defaults));
  assert.deepEqual(clone(prefs.read({getItem(){throw Error('denied');}})), clone(prefs.defaults));
});
test('Explicit preference saves touch exactly one isolated interface key', () => {
  const writes = []; const result = prefs.save({motion:'reduced',text:'large',contrast:'high'}, {setItem(k,v){writes.push([k,v]);}});
  assert.equal(result.persisted, true); assert.equal(writes.length, 1); assert.equal(writes[0][0], 're.bow.interface.r20');
  assert.equal(JSON.parse(writes[0][1]).motion, 'reduced');
});
test('Failed preference writes retain usable session settings without false success', () => {
  const result = prefs.save({motion:'reduced'}, {setItem(){throw Error('quota');}});
  assert.equal(result.persisted, false); assert.equal(prefs.get().motion, 'reduced');
});
console.log(JSON.stringify({ suite: 'menu-r20-unit', passed: checks.length, failed: 0 }));
