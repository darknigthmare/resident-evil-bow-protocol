/* An evolution replay is reconstructed only with its exact frozen R28 source contract. */
import {parseStrict} from '../../fidelity-r23/persistence/inspector.js';
import {createVerification as legacyVerification} from '../../fidelity-r24/persistence/sandbox.js';
export const EVOLUTION_SCHEMA = 're.bow.evolution-duel-replay/1';
export const EVOLUTION_CONTRACT = 'a4bf5c42ebd70c803e99412113ce5e30a1b52ffb56cb7e5143fd75f2d5c63893';
export const EVOLUTION_MAX_BYTES = 4194304;
const ROOT = new URL('../../../', import.meta.url);
const CONTRACT_FILE = {path: 'modules/fidelity-r28/evolutions/contract.json', sha256: '441e4dbf4a40d613d143541f582c258d895845874b2bd265df4b3dda9212d38d'};
const EXTRA = [
  {path: 'modules/fidelity-r24/persistence/bootstrap.js', sha256: 'e3cb385be578dfa143e131dfebfbe000d0563b7bddfac8032e2d21d9cb623967'},
  {path: 'modules/fidelity-r28/evolutions/contract.js', sha256: 'ad4053134b4348bbb74ca7373e59e2192875abb4ccb658af21d10d32890c105d'}
];
const check = (ok, message) => {if (!ok) throw Error(message);};
export function inspectReplay(text) {
  const value = parseStrict(text, 33554432);
  if (value?.schema === EVOLUTION_SCHEMA) {
    check(new TextEncoder().encode(text).byteLength <= EVOLUTION_MAX_BYTES, 'Le replay avec évolutions dépasse 4 Mio.');
    check(value.contract === EVOLUTION_CONTRACT, 'Contrat d’évolutions inconnu : gardez le moteur d’origine.');
    return {value, kind: 'evolution-r28', contract: value.contract, engine: 'R28 · évolutions volontaires'};
  }
  check(value?.schema === 're.bow.catalog-duel-replay/1' || value?.meta && Array.isArray(value.frames), 'Choisissez un replay individuel R13, R7 ou R28. Les collections restent dans le lecteur historique.');
  return {value, kind: value.schema ? 'catalog-r7' : 'main-r13', contract: value.contract || value.meta.runtimeContract,
    engine: value.schema ? 'R7 · duel catalogue' : 'Versus · route du contrat enregistré'};
}
async function bounded(record, maximum = 4 * 1024 * 1024) {
  check(/^(src|modules)\/[A-Za-z0-9_./-]+\.(js|json)$/.test(record.path) && !record.path.includes('..'), 'Chemin source invalide.');
  const response = await fetch(new URL(record.path, ROOT), {credentials: 'same-origin'});
  check(response.ok && response.body?.getReader, 'Source du moteur indisponible.');
  const reader = response.body.getReader(), chunks = []; let total = 0;
  try {for (;;) {const part = await reader.read(); if (part.done) break; total += part.value.byteLength; check(total <= maximum, 'Source du moteur trop volumineuse.'); chunks.push(part.value);}}
  catch (error) {await reader.cancel().catch(() => {}); throw error;} finally {reader.releaseLock();}
  const bytes = new Uint8Array(total); let offset = 0; for (const part of chunks) {bytes.set(part, offset); offset += part.byteLength;}
  const hash = [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(n => n.toString(16).padStart(2, '0')).join('');
  check(hash === record.sha256, 'Source du moteur différente : ' + record.path);
  return new TextDecoder('utf-8', {fatal: true}).decode(bytes);
}
const inline = source => '<script>' + source.replace(/<\/script/gi, '<\\/script') + '</script>';
async function evolutionDocument(token) {
  const contract = JSON.parse(await bounded(CONTRACT_FILE));
  check(contract.digest === EVOLUTION_CONTRACT && contract.files.length === 9, 'Manifest du contrat R28 différent.');
  const texts = await Promise.all(contract.files.map(record => bounded(record)));
  const [bootstrap, seal] = await Promise.all(EXTRA.map(record => bounded(record)));
  const config = {kind: 'evolution', token, parentOrigin: location.origin, rootUrl: ROOT.href};
  const bootstrapText = bootstrap.replace('document.currentScript.dataset', JSON.stringify(config));
  const sources = contract.files.map((record, index) => record.path.endsWith('.js') ? inline(texts[index]) : '').join('\n');
  const origin = location.origin;
  const policy = "default-src 'none';script-src 'unsafe-inline';connect-src 'none';img-src 'none';media-src 'none';frame-src 'none';object-src 'none';form-action 'none';base-uri 'none'";
  const runner = `(function(){'use strict';const token=${JSON.stringify(token)},origin=${JSON.stringify(origin)},schema=${JSON.stringify(EVOLUTION_SCHEMA)};
const send=value=>parent.postMessage({...value,channel:'bow-r31-evolution',token},origin);let used=false;
addEventListener('message',async event=>{const data=event.data;if(event.source!==parent||event.origin!==origin||data?.channel!=='bow-r31-evolution'||data.token!==token||data.type!=='verify'||used)return;used=true;
try{const R=RE_EVOLUTION_REPLAY_R28,value=R.validate(data.value);let first=null;for(let pass=1;pass<=2;pass++){const player=R.createPlayer(value);while(!player.ended()){player.tick(Math.min(180,value.frames-player.frame()));send({type:'progress',detail:{pass,frames:player.frame(),total:value.frames}});await new Promise(resolve=>setTimeout(resolve,0));}
const state=player.getState(),actors=p=>{const{f,...rest}=p;return{uid:f.uid,...rest};},text=JSON.stringify({...state,a:actors(state.a),b:actors(state.b)});if(first===null)first=text;else if(first!==text)throw Error('Les deux reconstructions diffèrent.');}
send({type:'result',result:{schema:'re.bow.evolution-replay-verification-r31/1',kind:'evolution-r28',verified:true,engineContract:value.contract,commandFrames:value.frames,passes:2,exactFinalStatesEqual:true,storedStateDigest:value.stateDigest,storedStateDigestVerifiedByOriginalEngine:true,engineSource:{id:'evolution-r28',sourceFiles:9,sourceBytesShaVerified:true},sandbox:BOW_SANDBOX_R24.diagnostics(),readOnly:true}});
}catch(error){send({type:'error',message:String(error.message||error)});}});send({type:'ready',sandbox:BOW_SANDBOX_R24.diagnostics()});})();`;
  return '<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="' + policy + '"><title>Relecture R28 isolée</title></head><body>' + inline(bootstrapText) + sources + inline(seal) + inline(runner) + '</body></html>';
}
export async function createVerification(value, options = {}) {
  if (value?.schema !== EVOLUTION_SCHEMA) return legacyVerification(value, options);
  check(value.contract === EVOLUTION_CONTRACT, 'Contrat d’évolutions différent : aucune simulation lancée.');
  const token = crypto.randomUUID(), html = await evolutionDocument(token);
  const frame = document.createElement('iframe'); frame.hidden = true; frame.title = 'Relecture du contrat R28, sans stockage partagé';
  frame.setAttribute('sandbox', 'allow-scripts'); frame.setAttribute('referrerpolicy', 'no-referrer');
  let finish, timer, settled = false;
  const promise = new Promise((resolve, reject) => {
    const cleanup = () => {clearTimeout(timer); window.removeEventListener('message', receive); frame.remove();};
    finish = (error, result) => {if (settled) return; settled = true; cleanup(); error ? reject(error) : resolve(result);};
    const arm = () => {clearTimeout(timer); timer = setTimeout(() => finish(Error('Moteur sans réponse : relecture interrompue.')), 45000);};
    const receive = event => {
      const data = event.data;
      if (event.source !== frame.contentWindow || event.origin !== 'null' || data?.channel !== 'bow-r31-evolution' || data.token !== token) return;
      arm(); if (data.type === 'ready') {
        if (data.sandbox?.origin !== 'null' || !data.sandbox.isolatedStorage) {finish(Error('Isolation non confirmée.')); return;}
        frame.contentWindow.postMessage({channel: 'bow-r31-evolution', token, type: 'verify', value}, '*');
      } else if (data.type === 'progress') options.onProgress?.(data.detail);
      else if (data.type === 'result') finish(null, data.result);
      else if (data.type === 'error') finish(Error(data.message || 'Replay refusé par son moteur.'));
    };
    window.addEventListener('message', receive); arm(); frame.srcdoc = html; document.body.append(frame);
  });
  return Object.freeze({promise, cancel: () => finish(Error('Relecture annulée : aucune sauvegarde changée.'))});
}
