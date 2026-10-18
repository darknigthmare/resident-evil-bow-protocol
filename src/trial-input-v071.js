/* Shared rehearsal inputs: edge-trigger actions, per-pointer holds, no OS repeat.
 * Standard gamepad mapping only. getGamepads may be denied by browser policy. */
(function(root){'use strict';
const heldKeys={KeyA:'left',KeyQ:'left',ArrowLeft:'left',KeyD:'right',ArrowRight:'right',KeyS:'down',ArrowDown:'down',Space:'guard',ShiftLeft:'guard',ShiftRight:'guard'};
const edgeKeys={KeyW:'jump',KeyZ:'jump',ArrowUp:'jump',KeyX:'dash',KeyJ:'light',KeyK:'heavy',KeyM:'low',KeyI:'throw',KeyU:'super',KeyO:'utility',KeyL:'special'};
function create(){
 const held=new Set(),pointers=new Map(),pressed=new Set();let edges=[],padId=null,previous=[],lastPad=null;
 function key(code,down,repeat=false){if(down){if(repeat||pressed.has(code))return;pressed.add(code);if(heldKeys[code])held.add(code);if(edgeKeys[code])queue(edgeKeys[code]);}else{pressed.delete(code);held.delete(code);}}
 function queue(slot){if(edges.length<16)edges.push(slot);}
 function pointer(id,action,down){if(!down){pointers.delete(id);return;}if(pointers.has(id))return;pointers.set(id,action);if(!['left','right','down','guard'].includes(action))queue(action);}
 function samplePad(){
  let gp=null;try{gp=Array.from(root.RE_PLATFORM_SAFETY?root.RE_PLATFORM_SAFETY.gamepads():root.navigator?.getGamepads?.()||[]).find(p=>p&&p.connected!==false&&p.mapping==='standard')||null;}catch(e){gp=null;}
  if(!gp){padId=null;previous=[];lastPad=null;return{edges:[],held:{},connected:false};}
  const buttons=Array.from(gp.buttons||[],b=>!!b?.pressed||(Number(b?.value)||0)>.5),id=String(gp.index)+'|'+gp.id;
  if(id!==padId){padId=id;previous=buttons.slice();}
  const just=n=>buttons[n]&&!previous[n],axis=n=>Number.isFinite(gp.axes?.[n])?gp.axes[n]:0;
  const actions=[];for(const [n,a]of [[0,'jump'],[2,'light'],[3,'heavy'],[1,'special'],[6,'utility'],[7,'super'],[10,'throw'],[11,'dash'],[12,'low'],[9,'pause']])if(just(n))actions.push(a);
  const now={edges:actions,held:{left:axis(0)<-.3||!!buttons[14],right:axis(0)>.3||!!buttons[15],down:axis(1)>.4||!!buttons[13],guard:!!buttons[5]},connected:true};previous=buttons;lastPad=now;return now;
 }
 function consume(face=1,pad={edges:[],held:{}}){
  const input={left:false,right:false,down:false,guard:false,jump:false,dash:false,tech:false,slot:null};
  for(const key of held)input[heldKeys[key]]=true;for(const action of pointers.values())if(action in input&&['left','right','down','guard'].includes(action))input[action]=true;
  for(const [k,v]of Object.entries(pad.held||{}))if(v&&k in input)input[k]=true;
  for(const a of pad.edges||[])if(a!=='pause')queue(a);
  const take=edges.splice(0);for(const a of take){if(a==='jump'||a==='dash')input[a]=true;else if(a==='throw'){input.tech=true;if(!input.slot)input.slot='throw';}else if(!input.slot){input.slot=a==='special'?(input.down?'specialDown':input.left||input.right?(((input.right?1:-1)===face)?'specialForward':'specialBack'):'special'):a;}}
  return input;
 }
 function clear(){held.clear();pressed.clear();pointers.clear();edges=[];}
 return Object.freeze({key,queue,pointer,samplePad,consume,clear,controlled:code=>code in heldKeys||code in edgeKeys});
}
root.RE_TRIAL_INPUT=Object.freeze({create});
})(globalThis);
