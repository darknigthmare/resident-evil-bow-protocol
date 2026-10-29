/** Display only actual new R31 tool outputs with their retained exact source bindings. */
const $=id=>document.getElementById(id),repository=new URL('../../../',import.meta.url),api=globalThis.RE_COMBAT_SPRITES_R31;
let entries=[],selected=null,generation=0,visible=true,initialization=0;
const state={ready:false,failed:false,selected:null,variant:null,displayed:null,frames:0,animated:false};
const local=value=>{if(typeof value!=='string'||value.includes('\\'))throw Error('Chemin source invalide');const url=new URL(value,repository);if(url.origin!==repository.origin||!url.pathname.startsWith(repository.pathname)||url.search||url.hash)throw Error('Source extérieure refusée');return url;};
const text=(tag,value)=>{const node=document.createElement(tag);node.textContent=String(value);return node;};
function facts(entry){$('facts').replaceChildren();for(const [key,value] of [['Identité',entry.id],['Édition source',entry.sourceEdition],['Vue',entry.sourceFacing],['Nature',entry.sameEditionVariant?'Pose 2D adaptée, variante volontaire':'Présentation source frontale'],['Images / animation','1 / aucune animation'],['Corps visible','Silhouette complète revue ; anatomie cachée non certifiée'],['SHA-256',entry.sha256]])$('facts').append(text('dt',key),text('dd',value));}
async function choose(key){
 const entry=entries.find(item=>(item.variantId||item.id)===key);if(!entry)throw Error('Illustration inconnue');
 const token=++generation;selected=key;state.selected=entry.id;state.variant=entry.variantId||null;state.displayed=null;state.failed=false;state.frames=0;
 $('title').textContent=entry.label;$('scope').textContent=entry.sameEditionVariant?'Variante NakedZombie GameCube 2002 ; l’image du catalogue reste le choix initial dans le jeu. Pose fixe de profil droit, adaptation générée du modèle natif.':'Image générée depuis la présentation documentaire indiquée. La vue frontale ne fournit pas un idle latéral.';
 $('image').replaceChildren();$('message').textContent='Vérification et chargement de l’image…';facts(entry);$('notes').textContent=entry.limitations.join(' ');
 $('sources').replaceChildren(text('h3','Références et observation'));
 const links=[...entry.provenance.references.map((source,index)=>({path:source.path,label:'Image de référence '+(index+1)})),{path:entry.sourceCompletenessEvidence.path,label:'Observation corporelle et comparaison'},{path:'modules/fidelity-r31/sprites/review/'+entry.id+'-contact.png',label:'Comparaison source / R29 / R31'}];
 for(const source of links){const link=text('a',source.label);link.href=local(source.path);$('sources').append(link);}
 for(const button of $('choices').children)button.setAttribute('aria-current',String(button.dataset.key===key));
 api.selectVariant(entry.id,entry.variantId||null);
 try{const loaded=await api.load(entry.id);if(token!==generation||!visible)return;const image=loaded.image;image.alt=entry.label+' — '+entry.sourceVariantLabel;image.dataset.sha256=entry.sha256;image.id='generatedSpriteR31';$('image').replaceChildren(image);state.displayed=entry.sha256;state.frames=1;state.animated=false;$('message').textContent='PNG vérifié et affiché ; une seule image, sans animation.';}
 catch(error){if(token!==generation||!visible)return;state.failed=true;$('message').textContent='Image refusée ou indisponible : '+error.message;}
 const url=new URL(location.href);url.searchParams.set('identity',entry.id);if(entry.variantId)url.searchParams.set('variant',entry.variantId);else url.searchParams.delete('variant');history.replaceState(null,'',url);
}
async function initialize(){
 const token=++initialization;state.failed=false;
 $('message').textContent='Chargement des illustrations…';
 try{
 const ready=api&&await api.ready();if(token!==initialization||!visible)return;
 if(!ready)throw Error('Registre R31 indisponible');
 const active=api.list();
 entries=[...active.filter(entry=>entry.image.startsWith('modules/fidelity-r31/sprites/generated/')),...active.flatMap(entry=>api.availableVariants(entry.id))];
 if(entries.length!==3||new Set(entries.map(entry=>entry.variantId||entry.id)).size!==3)throw Error('Périmètre R31 invalide');
 $('summary').textContent='3 nouveaux PNG : 2 présentations corporelles revues et 1 variante de pose fixe. La pointe haute de Lucas reste à vérifier. 0 animation idle native ajoutée.';
 $('choices').replaceChildren(...entries.map(entry=>{const button=text('button',entry.label);button.type='button';button.dataset.key=entry.variantId||entry.id;button.append(text('small',entry.sameEditionVariant?'Variante de pose droite — GameCube2002':'Présentation frontale revue'));button.addEventListener('click',()=>choose(button.dataset.key));return button;}));
 state.ready=true;const query=new URL(location.href).searchParams,uid=query.get('identity'),variant=query.get('variant');
 const initial=entries.find(entry=>entry.id===uid&&(!variant||entry.variantId===variant));await choose(initial?.variantId||initial?.id||entries[0].id);
 }catch(error){if(token!==initialization||!visible)return;state.failed=true;$('message').textContent='Chargement refusé : '+error.message;}
}
globalThis.RE_SPRITE_GALLERY_R31=Object.freeze({state:()=>({...state}),choose});
addEventListener('pagehide',()=>{visible=false;generation++;initialization++;});addEventListener('pageshow',()=>{if(!visible){visible=true;if(state.ready&&selected)choose(selected);else initialize();}});
await initialize();
