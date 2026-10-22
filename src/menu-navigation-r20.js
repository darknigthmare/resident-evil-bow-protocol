/* Standard gamepad edge/repeat handling, isolated from combat input. */
(function (root) {
  'use strict';
  const pressed = b => !!(b && (b.pressed || b.value > .55));
  function commands(pad) {
    if (!pad || pad.mapping !== 'standard') return [];
    const b = pad.buttons || [], x = Number(pad.axes?.[0]) || 0, y = Number(pad.axes?.[1]) || 0;
    const out = [];
    if (pressed(b[12]) || y < -.55) out.push('up');
    if (pressed(b[13]) || y > .55) out.push('down');
    if (pressed(b[14]) || x < -.55) out.push('left');
    if (pressed(b[15]) || x > .55) out.push('right');
    if (pressed(b[0]) || pressed(b[9])) out.push('confirm');
    if (pressed(b[1])) out.push('back');
    return out;
  }
  function create() {
    let states = new Map();
    return {
      reset() { states = new Map(); },
      sample(pads, now) {
        const actions = [], connected = new Set();
        for (const pad of pads || []) {
          if (!pad || pad.mapping !== 'standard') continue;
          const key = String(pad.index) + ':' + pad.id; connected.add(key);
          const active = new Set(commands(pad));
          let state = states.get(key);
          if (!state) { state = { ready: active.size === 0, previous: active, next: new Map() }; states.set(key, state); continue; }
          if (!state.ready) { if (!active.size) state.ready = true; state.previous = active; continue; }
          for (const action of active) {
            const direction = ['up', 'down', 'left', 'right'].includes(action);
            if (!state.previous.has(action)) { actions.push(action); if (direction) state.next.set(action, now + 330); }
            else if (direction && now >= state.next.get(action)) { actions.push(action); state.next.set(action, now + 135); }
          }
          for (const action of state.previous) if (!active.has(action)) state.next.delete(action);
          state.previous = active;
        }
        for (const key of states.keys()) if (!connected.has(key)) states.delete(key);
        return [...new Set(actions)];
      }
    };
  }
  root.RE_MENU_INPUT_R20 = Object.freeze({ create, commands });
})(typeof window === 'undefined' ? globalThis : window);
