/* R9: bounded preferences and optional peripherals. Never touches campaign saves. */
(function(root){'use strict';
 const messages=new Map();let gamepadDenied=false;
 const record=x=>!!x&&typeof x==='object'&&!Array.isArray(x);
 const own=(x,k)=>Object.prototype.hasOwnProperty.call(x,k);
 function warn(id,text){if(messages.get(id)===text)return;messages.set(id,text);root.dispatchEvent?.(new root.CustomEvent('re:platformstatus',{detail:{id,text}}));}
 function clearWarning(id){if(!messages.delete(id))return;root.dispatchEvent?.(new root.CustomEvent('re:platformstatus',{detail:{id,text:''}}));}
 const validCode=code=>typeof code==='string'&&/^(Key[A-Z]|Digit[0-9]|Numpad(?:[0-9]|Add|Subtract|Multiply|Divide|Decimal)|Arrow(?:Left|Right|Up|Down)|Space|Shift(?:Left|Right)|Minus|Equal|Bracket(?:Left|Right)|Backslash|Semicolon|Quote|Backquote|Comma|Period|Slash)$/.test(code);
 function bindings(value,defaults){
  const result={p1:{...defaults.p1},p2:{...defaults.p2}};let repaired=false;
  if(value==null)return{value:result,repaired:false};
  if(!record(value))return{value:result,repaired:true};
  for(const player of ['p1','p2']){
   if(!record(value[player])){repaired=true;continue;}
   for(const action of Object.keys(defaults[player]))if(own(value[player],action)){
    if(validCode(value[player][action]))result[player][action]=value[player][action];else repaired=true;
   }
   if(Object.keys(value[player]).some(k=>!own(defaults[player],k)))repaired=true;
  }
  // Conflicting physical codes can disable movement/activate both players. A
  // complete default mapping is safer than silently making one action unbound.
  const codes=Object.values(result.p1).concat(Object.values(result.p2));
  if(new Set(codes).size!==codes.length)return{value:{p1:{...defaults.p1},p2:{...defaults.p2}},repaired:true};
  return{value:result,repaired};
 }
 const date=x=>typeof x==='string'&&x.length<=40&&/^\d{4}-\d{2}-\d{2}T/.test(x)&&Number.isFinite(Date.parse(x));
 function finishProgress(value,profiles){
  const known=new Map(Object.values(profiles||{}).flatMap(p=>(p.finishers||[]).map(f=>[f.id,{fin:f,name:p.fighterName}])));
  const next={done:{},history:[]};if(value==null)return{value:next,repaired:false};
  if(!record(value))return{value:next,repaired:true};
  if(record(value.done))for(const id of known.keys())if(own(value.done,id)&&date(value.done[id]))next.done[id]=value.done[id];
  if(Array.isArray(value.history))for(const item of value.history.slice(-120)){
   if(!record(item)||!known.has(item.id)||!date(item.date))continue;
   const k=known.get(item.id);next.history.push({id:item.id,fighter:k.name,name:k.fin.name,date:item.date});
  }
  return{value:next,repaired:JSON.stringify(next)!==JSON.stringify(value)};
 }
 function finishSettings(value){
  const out={mode:'stylized',window:300,captions:true};if(!record(value))return out;
  if(['off','stylized','cinematic'].includes(value.mode))out.mode=value.mode;
  if(Number.isInteger(value.window)&&value.window>=60&&value.window<=3600)out.window=value.window;
  if(typeof value.captions==='boolean')out.captions=value.captions;return out;
 }
 function readPreference(key){try{const raw=root.localStorage?.getItem(key);if(raw==null)return undefined;if(typeof raw!=='string'||raw.length>524288)throw Error('size');return JSON.parse(raw);}catch(_){warn('pref:'+key,'Préférence illisible : réglages de secours utilisés. Les sauvegardes de progression sont conservées.');return undefined;}}
 function gamepads(){
  if(gamepadDenied)return[];
  try{
   const api=root.navigator?.getGamepads;if(typeof api!=='function')return[];
   const list=api.call(root.navigator);if(!list||!Number.isInteger(list.length)||list.length<0||list.length>16)return[];
   return Array.from(list,g=>{if(!g)return null;try{return{index:g.index,id:String(g.id||'').slice(0,160),mapping:g.mapping,connected:g.connected!==false,axes:Array.from(g.axes||[]).slice(0,8).map(n=>Number.isFinite(n)?Math.max(-1,Math.min(1,n)):0),buttons:Array.from(g.buttons||[]).slice(0,32).map(b=>({pressed:!!b?.pressed,value:Number.isFinite(b?.value)?b.value:0}))};}catch(_){return null;}});
  }catch(_){gamepadDenied=true;warn('gamepad','Manette indisponible dans ce document. Clavier et commandes tactiles restent actifs.');return[];}
 }
 function retryGamepads(){gamepadDenied=false;clearWarning('gamepad');return gamepads();}
 root.RE_PLATFORM_SAFETY=Object.freeze({bindings,validCode,finishProgress,finishSettings,readPreference,gamepads,retryGamepads,warn,clearWarning,diagnostics:()=>({gamepadDenied,messages:[...messages].map(([id,text])=>({id,text}))})});
})(globalThis);
