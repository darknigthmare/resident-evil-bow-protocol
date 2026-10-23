(function (root) {
  'use strict';
  const sandbox = root.BOW_SANDBOX_R24, config = sandbox.config;
  const send = value => root.parent.postMessage({...value, channel: 'bow-r24-replay', token: config.token}, config.parentOrigin);
  let used = false;
  root.addEventListener('message', async event => {
    const data = event.data;
    if (event.source !== root.parent || event.origin !== config.parentOrigin || data?.channel !== 'bow-r24-replay' || data.token !== config.token || data.type !== 'verify' || used) return;
    used = true;
    try {
      const options = {yieldControl: () => new Promise(resolve => setTimeout(resolve, 0)), onProgress: detail => send({type: 'progress', detail})};
      const result = config.kind === 'main' ? await root.BOW_REPLAY_VERIFIER_R24.verifyMain(data.value, options) : await root.BOW_REPLAY_VERIFIER_R24.verifyCatalog(data.value, options);
      result.engineSource = {id: config.engineId, label: config.engineLabel, commit: config.sourceCommit || null};
      result.sandbox = sandbox.diagnostics();
      send({type: 'result', result});
    } catch (error) { send({type: 'error', message: String(error.message || error), sandbox: sandbox.diagnostics()}); }
  });
  send({type: 'ready', sandbox: sandbox.diagnostics()});
})(globalThis);
