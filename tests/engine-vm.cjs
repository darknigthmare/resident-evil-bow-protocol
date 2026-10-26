'use strict';
/* Controlled DOM and native Canvas harness, adapted from the supplied CQC v0.60 test tools.
 * Loads the shipped HTML and its actual scripts. It is not a browser or CSS renderer. */
const fs=require('fs'),path=require('path'),vm=require('vm'),{fileURLToPath,pathToFileURL}=require('url');
let native;
try{native=require('@napi-rs/canvas');native.__binding='@napi-rs/canvas'}catch(firstError){
 const modules=process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES||'/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules';
 try{native=require(path.join(modules,'@napi-rs/canvas'));native.__binding='@napi-rs/canvas'}catch(secondError){
  const globalModules=process.env.NODE_GLOBAL_MODULES||path.resolve(path.dirname(process.execPath),'../lib/node_modules');
  const skia=require(path.join(globalModules,'skia-canvas'));
  native={...skia,createCanvas:(w,h)=>new skia.Canvas(w,h),__binding:'skia-canvas'};
 }
}
const decode=s=>String(s).replace(/&(?:amp|lt|gt|quot|#39|nbsp);/g,x=>({'&amp;':'&','&lt;':'<','&gt;':'>','&quot;':'"','&#39;':"'",'&nbsp;':' '})[x]);
class Target{constructor(){this.listeners={};}addEventListener(t,f){(this.listeners[t]??=[]).push(f);}removeEventListener(t,f){this.listeners[t]=(this.listeners[t]||[]).filter(x=>x!==f);}dispatchEvent(e){e.target??=this;e.currentTarget=this;e.preventDefault??=()=>{e.defaultPrevented=true};e.stopPropagation??=()=>{};for(const f of this.listeners[e.type]||[])f.call(this,e);this['on'+e.type]?.call(this,e);return !e.defaultPrevented;}}
// The shipped form selector moves real options through optgroups and fragments.
// Keep these DOM operations observable instead of skipping newer page scripts.
function dataAttribute(key){return'data-'+String(key).replace(/[A-Z]/g,x=>'-'+x.toLowerCase());}
function datasetFor(node){return new Proxy({},{get:(_,key)=>typeof key==='string'?node.getAttribute(dataAttribute(key))??undefined:undefined,set:(_,key,value)=>{node.setAttribute(dataAttribute(key),value);return true},deleteProperty:(_,key)=>{node.removeAttribute(dataAttribute(key));return true},ownKeys:()=>Object.keys(node.attributes).filter(key=>key.startsWith('data-')).map(key=>key.slice(5).replace(/-([a-z])/g,(_,letter)=>letter.toUpperCase())),getOwnPropertyDescriptor:(_,key)=>node.hasAttribute(dataAttribute(key))?{enumerable:true,configurable:true}:undefined});}
function notifyMutation(node,record){node.ownerDocument?._notifyMutation?.({target:node,...record});}
function mutationObserverClass(doc){
 const observers=new Set();
 doc._notifyMutation=record=>{
  for(const observer of observers){
   const entry=observer.targets.find(({target,options})=>(target===record.target||options.subtree&&target.contains(record.target))&&options[record.type]&&(record.type!=='attributes'||!options.attributeFilter||options.attributeFilter.includes(record.attributeName)));
   if(!entry)continue;
   observer.records.push({...record,oldValue:record.type==='attributes'&&entry.options.attributeOldValue?record.oldValue:null});
   if(!observer.scheduled){observer.scheduled=true;Promise.resolve().then(()=>{observer.scheduled=false;const records=observer.takeRecords();if(records.length)observer.callback(records,observer);});}
  }
 };
 return class MutationObserver{
  constructor(callback){if(typeof callback!=='function')throw TypeError('MutationObserver callback required');this.callback=callback;this.targets=[];this.records=[];this.scheduled=false;}
  observe(target,options={}){if(!target||!options.childList&&!options.attributes&&!options.characterData&&!options.attributeFilter&&!options.attributeOldValue)throw TypeError('Invalid mutation observation');const normalized={...options,attributes:options.attributes??!!(options.attributeFilter||options.attributeOldValue)};const existing=this.targets.find(entry=>entry.target===target);if(existing)existing.options=normalized;else this.targets.push({target,options:normalized});observers.add(this);}
  disconnect(){observers.delete(this);this.targets=[];this.records=[];}
  takeRecords(){return this.records.splice(0);}
 };
}
class Element extends Target{
 constructor(tag,doc){super();this.tagName=tag.toUpperCase();this.ownerDocument=doc;this.children=[];this.attributes={};this.dataset=datasetFor(this);this._text='';this._value=undefined;this.hidden=false;this.checked=false;this.disabled=false;this.open=false;this.scrollTop=0;this.style={setProperty(k,v){this[k]=v},removeProperty(k){delete this[k]}};this.classList={contains:x=>this.className.split(/\s+/).includes(x),add:(...a)=>this.className=[...new Set([...this.className.split(/\s+/).filter(Boolean),...a])].join(' '),remove:(...a)=>this.className=this.className.split(/\s+/).filter(x=>!a.includes(x)).join(' '),toggle:(x,v)=>{const on=v??!this.classList.contains(x);this.classList[on?'add':'remove'](x);return on}};if(tag.toLowerCase()==='canvas'){this._width=300;this._height=150;this.native=native.createCanvas(300,150);}if(tag.toLowerCase()==='iframe'){this.contentWindow={postMessage:()=>{}};}}
 get nodeType(){return this.tagName==='#DOCUMENT-FRAGMENT'?11:this.tagName==='TEXT'?3:1}get nodeName(){return this.tagName}get childNodes(){return this.children}get isConnected(){return!!this.ownerDocument?.documentElement?.contains(this)}
 get id(){return this.attributes.id||''}set id(x){this.setAttribute('id',x)}get className(){return this.attributes.class||''}set className(x){this.setAttribute('class',x)}
 get src(){return this.attributes.src||''}set src(x){this.setAttribute('src',x)}get href(){return this.attributes.href||''}set href(x){this.setAttribute('href',x)}get alt(){return this.attributes.alt||''}set alt(x){this.setAttribute('alt',x)}get target(){return this.attributes.target||''}set target(x){this.setAttribute('target',x)}get rel(){return this.attributes.rel||''}set rel(x){this.setAttribute('rel',x)}
 get width(){return this._width||Number(this.attributes.width)||1280}set width(x){this._width=Number(x);if(this.native)this.native.width=this._width}
 get height(){return this._height||Number(this.attributes.height)||720}set height(x){this._height=Number(x);if(this.native)this.native.height=this._height}
 get clientWidth(){return this.width}get clientHeight(){return this.height}get offsetParent(){return this.hidden?null:this.parentNode||this.ownerDocument.body}get offsetWidth(){return this.width}get scrollHeight(){return this.height}
 get options(){return this.tagName==='SELECT'||this.tagName==='DATALIST'?this.querySelectorAll('option'):undefined}get selectedOptions(){return this.tagName==='SELECT'?this.options.filter(option=>option.selected):undefined}
 get selectedIndex(){if(this.tagName!=='SELECT')return undefined;if(this._selectNoSelection)return-1;const options=this.options;if(this._value!==undefined)return options.findIndex(option=>option.value===this._value);const explicit=options.findIndex(option=>option.hasAttribute('selected'));return explicit>=0?explicit:options.findIndex(option=>!option.disabled&&!option.closest('optgroup')?.disabled)}
 set selectedIndex(index){if(this.tagName!=='SELECT')return;const option=this.options[Number(index)];this._value=option?.value;this._selectNoSelection=!option}
 get selected(){if(this.tagName!=='OPTION')return undefined;const select=this.closest('select');return select?select.options[select.selectedIndex]===this:this.hasAttribute('selected')}
 set selected(value){if(this.tagName!=='OPTION')return;const select=this.closest('select');if(select){if(value)select.value=this.value;else if(this.selected)select.selectedIndex=-1;}else if(value)this.setAttribute('selected','');else this.removeAttribute('selected')}
 get label(){return this.attributes.label??this.textContent}set label(value){this.setAttribute('label',value)}
 get value(){if(this.tagName==='SELECT')return this.options[this.selectedIndex]?.value||'';if(this._value!==undefined)return this._value;return this.attributes.value??(this.tagName==='OPTION'?this.textContent:'')}
 set value(x){this._value=String(x);if(this.tagName==='SELECT')this._selectNoSelection=!this.options.some(option=>option.value===this._value)}get type(){return this.attributes.type||''}set type(x){this.attributes.type=x}
 get textContent(){return this._text+this.children.map(x=>x.textContent).join('')}set textContent(x){this._text=String(x??'');this.children=[]}
 set innerHTML(s){this._text='';this.children=[];parse(String(s),this,this.ownerDocument)}get innerHTML(){return this.textContent}
 setAttribute(k,v){v=String(v);const oldValue=this.attributes[k]??null;this.attributes[k]=v;if(k==='width'||k==='height')this[k]=Number(v);if(['checked','disabled','hidden','open'].includes(k))this[k]=true;notifyMutation(this,{type:'attributes',attributeName:k,oldValue});}
 getAttribute(k){return this.attributes[k]??null}hasAttribute(k){return k in this.attributes}removeAttribute(k){if(!this.hasAttribute(k))return;const oldValue=this.attributes[k];delete this.attributes[k];if(['checked','disabled','hidden','open'].includes(k))this[k]=false;notifyMutation(this,{type:'attributes',attributeName:k,oldValue});}
 insertBefore(c,reference){if(typeof c==='string'){const text=new Element('text',this.ownerDocument);text._text=c;c=text;}if(c.nodeType===11){for(const child of [...c.children])this.insertBefore(child,reference);return c;}if(reference!==null&&!this.children.includes(reference))throw Error('Reference is not a child');c.remove?.();const index=reference===null?this.children.length:this.children.indexOf(reference);c.parentNode=this;this.children.splice(index,0,c);notifyMutation(this,{type:'childList',addedNodes:[c],removedNodes:[]});return c;}
 appendChild(c){return this.insertBefore(c,null)}append(...c){c.forEach(x=>this.appendChild(x))}add(c){return this.appendChild(c)}prepend(...c){const reference=this.firstChild;for(const child of c)this.insertBefore(child,reference)}
 before(...c){if(this.parentNode)for(const child of c)this.parentNode.insertBefore(child,this)}after(...c){if(this.parentNode){const reference=this.parentNode.children[this.parentNode.children.indexOf(this)+1]||null;for(const child of c)this.parentNode.insertBefore(child,reference);}}
 replaceChildren(...c){const removedNodes=[...this.children];for(const child of removedNodes)child.parentNode=null;this.children=[];this._text='';if(removedNodes.length)notifyMutation(this,{type:'childList',addedNodes:[],removedNodes});this.append(...c)}remove(){if(this.parentNode){const parent=this.parentNode;parent.children=parent.children.filter(x=>x!==this);this.parentNode=null;notifyMutation(parent,{type:'childList',addedNodes:[],removedNodes:[this]});}}
 get parentElement(){return this.parentNode}get firstChild(){return this.children[0]||null}get lastChild(){return this.children.at(-1)||null}
 matches(sel){return match(this,sel)}querySelectorAll(sel){const result=[];const visit=n=>{for(const x of n.children){if(match(x,sel))result.push(x);visit(x)}};visit(this);return result}querySelector(sel){return this.querySelectorAll(sel)[0]||null}closest(sel){for(let e=this;e;e=e.parentNode)if(match(e,sel))return e;return null}contains(el){return el===this||this.children.some(x=>x.contains(el))}
 focus(){this.ownerDocument.activeElement=this}blur(){this.ownerDocument.activeElement=this.ownerDocument.body}click(){if(!this.disabled)this.dispatchEvent({type:'click',isTrusted:false})}showModal(){this.open=true}close(){this.open=false;this.dispatchEvent({type:'close'})}scrollIntoView(){}setPointerCapture(){}releasePointerCapture(){}hasPointerCapture(){return true}
 getBoundingClientRect(){return {x:0,y:0,left:0,top:0,right:this.width,bottom:this.height,width:this.width,height:this.height}}
 getContext(){if(!this.native)throw Error('Not a canvas: '+this.tagName);if(!this.ctx){const raw=this.native.getContext('2d');this.ctx=new Proxy(raw,{get:(t,k)=>k==='canvas'?this:k==='drawImage'?((im,...args)=>t.drawImage(im?.native||im,...args)):typeof t[k]==='function'?t[k].bind(t):t[k],set:(t,k,v)=>{t[k]=v;return true}})}return this.ctx}
 toBuffer(...args){return this.native.toBuffer(...args)}toDataURL(...args){return this.native.toDataURL(...args)}
}
function match(el,selector){return selector.split(',').some(sel=>{sel=sel.trim();if(!sel)return false;const parts=sel.split(/\s+(?![^\[]*\])/);if(parts.length>1){if(!match(el,parts.pop()))return false;const rest=parts.join(' ');for(let p=el.parentNode;p;p=p.parentNode)if(match(p,rest))return true;return false}let okay=true;sel=sel.replace(/:not\(([^)]+)\)/g,(_,x)=>{if(match(el,x))okay=false;return ''});if(!okay)return false;sel=sel.replace(/\[([^\]=]+)(?:=["']?([^\]"']*)["']?)?\]/g,(_,k,v)=>{if(v===undefined?!el.hasAttribute(k):el.getAttribute(k)!==v)okay=false;return ''});if(!okay)return false;const tag=sel.match(/^[a-zA-Z][\w-]*/)?.[0];if(tag&&el.tagName!==tag.toUpperCase())return false;for(const [_,id] of sel.matchAll(/#([\w-]+)/g))if(el.id!==id)return false;for(const [_,cl] of sel.matchAll(/\.([\w-]+)/g))if(!el.classList.contains(cl))return false;return true})}
function parse(html,parent,doc){html=html.replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi,'').replace(/<style\b[^>]*>[\s\S]*?<\/style\s*>/gi,'').replace(/<!--[\s\S]*?-->/g,'');const stack=[parent];for(const m of html.matchAll(/<\/?[a-zA-Z][^>]*>|[^<]+/g)){const t=m[0];if(t.startsWith('</')){const tag=t.slice(2).match(/^\w+/)?.[0].toUpperCase();for(let i=stack.length-1;i>0;i--)if(stack[i].tagName===tag){stack.length=i;break}}else if(t.startsWith('<')){const tag=t.slice(1).match(/^[\w-]+/)[0],el=new Element(tag,doc);for(const a of t.slice(tag.length+1,-1).matchAll(/([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g))el.setAttribute(a[1],decode(a[2]??a[3]??a[4]??''));stack.at(-1).append(el);if(!/^(?:input|img|br|hr|meta|link|source|area|base|wbr)$/i.test(tag)&&!t.endsWith('/>'))stack.push(el)}else stack.at(-1)._text+=decode(t)}}
async function loadGame(htmlPath,{search='',parent,onMessage,storage,allowTimers=true}={}){
 htmlPath=path.resolve(htmlPath);const base=path.dirname(htmlPath),html=fs.readFileSync(htmlPath,'utf8'),doc=new Target();const MutationObserver=mutationObserverClass(doc);doc.createElement=tag=>new Element(tag,doc);doc.createDocumentFragment=()=>new Element('#document-fragment',doc);doc.createTextNode=t=>{const e=new Element('text',doc);e.textContent=t;return e};doc.documentElement=new Element('html',doc);doc.body=new Element('body',doc);doc.head=new Element('head',doc);doc.documentElement.append(doc.head,doc.body);parse(html,doc.body,doc);doc.querySelectorAll=s=>doc.documentElement.querySelectorAll(s);doc.querySelector=s=>doc.querySelectorAll(s)[0]||null;doc.getElementById=id=>doc.querySelector('#'+id);doc.hidden=false;doc.activeElement=doc.body;doc.readyState='complete';doc.baseURI=pathToFileURL(htmlPath).href;doc.fonts={ready:Promise.resolve()};
 let now=0,rafId=0,timerId=0;const rafs=new Map(),timers=new Map(),messages=[],imagePromises=[],imageErrors=[];const map=storage||new Map();const win=new Target();const context=Object.assign(win,{console,document:doc,MutationObserver,innerWidth:1280,innerHeight:720,devicePixelRatio:1,URL,URLSearchParams,TextEncoder,TextDecoder,AbortController,AbortSignal,Blob,Uint8Array,ArrayBuffer,Math,JSON,Date,Promise,Set,Map,Number,String,Boolean,Object,RegExp,Error,TypeError,structuredClone,crypto:require('crypto').webcrypto,performance:{now:()=>now},location:{search,href:'file://'+htmlPath+search,origin:'null',hash:'',pathname:htmlPath,replace:()=>{}},navigator:{getGamepads:()=>[],userAgent:'RE-ControlledNodeDOM/060'},localStorage:{getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,String(v)),removeItem:k=>map.delete(k)},atob:s=>Buffer.from(s,'base64').toString('binary'),btoa:s=>Buffer.from(s,'binary').toString('base64'),requestAnimationFrame:f=>{rafs.set(++rafId,f);return rafId},cancelAnimationFrame:i=>rafs.delete(i),setTimeout:(f,ms=0)=>{timers.set(++timerId,{f,at:now+ms,repeat:0});return timerId},clearTimeout:i=>timers.delete(i),setInterval:(f,ms=0)=>{timers.set(++timerId,{f,at:now+ms,repeat:ms||1});return timerId},clearInterval:i=>timers.delete(i),KeyboardEvent:class{constructor(type,o={}){Object.assign(this,{type,preventDefault(){this.defaultPrevented=true}},o)}},Event:class{constructor(type,o={}){Object.assign(this,{type},o)}},CustomEvent:class{constructor(type,o={}){Object.assign(this,{type},o)}},history:{back(){}},matchMedia:()=>({matches:false,addEventListener(){},removeEventListener(){}}),getComputedStyle:()=>({getPropertyValue:()=>'',display:'block'}),requestIdleCallback:f=>f(),focus(){},scrollTo(){},fetch:async()=>{throw Error('Network fetch unavailable in controlled harness')}});
 context.Option=function(text,value){const e=new Element('option',doc);e.textContent=text;e.value=value;return e};context.window=context;context.globalThis=context;context.self=context;context.parent=parent||{postMessage(m){messages.push(structuredClone(m));onMessage?.(m)}};context.top=context;context.frameElement=search.includes('embed=story55')?{dataset:{story55:'1'}}:null;doc.defaultView=context;context.addEventListener=win.addEventListener.bind(win);context.removeEventListener=win.removeEventListener.bind(win);context.dispatchEvent=win.dispatchEvent.bind(win);
 context.Image=class{
  constructor(){this.native=new native.Image();this.complete=false;this.naturalWidth=0;this.naturalHeight=0;this.sequence=0;}
  set src(value){
   const source=String(value),sequence=++this.sequence;this._src=source;this.complete=false;this.naturalWidth=this.naturalHeight=0;
   // Keep local sources as filenames. This Canvas binding can misidentify a PNG
   // Buffer containing an SVG text-metadata chunk as SVG; its filename/data-URL
   // loader correctly recognizes and decodes the very same bytes.
   // Wait for bitmap decode before emitting the simulated browser load event.
   // Keep data URLs intact too: loadImage(dataURL) internally makes a Buffer.
   const pending=Promise.resolve().then(()=>new Promise((resolve,reject)=>{
    const im=new native.Image();im.onload=()=>resolve(im);im.onerror=reject;
    im.src=source.startsWith('data:')?source:source.startsWith('file:')?fileURLToPath(source):path.resolve(base,source);
   })).then(im=>{
    if(sequence!==this.sequence)return;this.native=im;this.complete=true;this.naturalWidth=im.width;this.naturalHeight=im.height;this.onload?.();
   },error=>{
    if(sequence!==this.sequence)return;const label=source.startsWith('data:')?source.slice(0,60)+'…':source;
    this.complete=true;imageErrors.push(label+':'+error);this.onerror?.(error);
   });
   imagePromises.push(pending);pending.catch(()=>{});
  }
  get src(){return this._src}
  removeAttribute(name){if(name==='src'){this.sequence++;this.onload=null;this.onerror=null;this.native.onload=null;this.native.onerror=null;}}
  get width(){return this.native.width}get height(){return this.native.height}
 };
 const box=vm.createContext(context);for(const script of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)){const type=script[1].match(/type=["']([^"']+)/)?.[1];if(type&&type!=='text/javascript')continue;const src=script[1].match(/src=["']([^"']+)/)?.[1],filename=src?path.resolve(base,src):htmlPath+':inline';const code=src?fs.readFileSync(filename,'utf8'):script[2];doc.currentScript={src:pathToFileURL(filename).href};vm.runInContext(code,box,{filename,timeout:15000})}
 async function images(){for(let i=0;i<40;i++){const n=imagePromises.length;await Promise.all(imagePromises);await new Promise(r=>setImmediate(r));if(n===imagePromises.length&&!(context.RE_RENDERER?.diagnostics().loading)&&!(context.RE_RENDERER?.diagnostics().queued))break}}
 function tick(ms=1000/60){now+=ms;if(allowTimers)for(const [id,t]of [...timers])if(t.at<=now){if(t.repeat)t.at=now+t.repeat;else timers.delete(id);t.f()}const queued=[...rafs];rafs.clear();for(const [,f]of queued)f(now)}
 return {window:context,context:box,document:doc,messages,imageErrors,images,rafs,timers,storage:map,tick,eval:s=>vm.runInContext(s,box),message:(data,source=context.parent)=>context.dispatchEvent({type:'message',data,source}),key:(code,down=true)=>context.dispatchEvent(new context.KeyboardEvent(down?'keydown':'keyup',{code,key:code,repeat:false})),api:()=>context.RE_COMBAT||context.__CQC060Versus||context.__CQC058Versus||context.CQC60||context.CQC58,dispose(){rafs.clear();timers.clear();context.dispatchEvent({type:'pagehide'})}};
}
module.exports={loadGame,Element,native};
if(require.main===module)(async()=>{const env=await loadGame(process.argv[2]||path.join(__dirname,'../modules/versus.html'));await env.images();const api=env.api();console.log({loaded:!!api,release:api?.release||api?.version,fighters:api?.fighters?.length||api?.data?.fighters?.length,imageErrors:env.imageErrors});env.dispose()})().catch(e=>{console.error(e.stack);process.exitCode=1});
