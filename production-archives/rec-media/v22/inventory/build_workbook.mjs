/** Extend the V21 workbook with explicit V22 review tables; preserve its history.
 * Usage: node build_workbook.mjs /absolute/repo/production-archives/rec-media/v22 /absolute/preview-dir
 * Requires @oai/artifact-tool in the primary runtime. No images are edited.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { FileBlob, SpreadsheetFile } from '@oai/artifact-tool';

const base=process.argv[2];
if(!base||!path.isAbsolute(base))throw new Error('Pass an absolute V22 directory');
const out=process.argv[3]||path.join(base,'reports','workbook-previews');
await fs.mkdir(out,{recursive:true});
const baseline=path.join(base,'..','v21','inventory','Resident_Evil_Combat_Inventaire_V21_20261124.xlsx');
const inv=JSON.parse(await fs.readFile(path.join(base,'inventory','INVENTAIRE_COMPLET_V22_20261124.json'),'utf8'));
const manifest=inv.livraison_v22;
const wb=await SpreadsheetFile.importXlsx(await FileBlob.load(baseline));
const originalNames=['Synthese','Stages','BOW','Finition','Extensions','Costumes','Projectiles','Recuperation','Sources','LivresV21','Costumes_auditer'];
const palette={ink:'#213B49',muted:'#526777',blue:'#DDEFF6',amber:'#FFF0D5',red:'#FBE4E2',line:'#CDD9DF'};
const sheets={};const previews=[];
const join=value=>Array.isArray(value)?value.map(v=>typeof v==='string'?v:JSON.stringify(v)).join('\n'):value==null?'—':String(value);
const fileNames=value=>join((value||[]).map(v=>path.basename(typeof v==='string'?v:v.path||v.chemin||'')));
const statusLabels={static_candidate:'Candidat statique',visual_study:'Étude visuelle',rejected_trial:'Essai écarté'};
const catLabels={stage:'Décor',creature:'Créature',character:'Personnage',costume:'Costume',projectile:'Projectile / VFX'};
const col=n=>{let s='';for(;n;n=Math.floor((n-1)/26))s=String.fromCharCode(65+(n-1)%26)+s;return s;};

function sheet(name,title,subtitle,ncols){
 const s=wb.worksheets.add(name);sheets[name]=s;s.showGridLines=false;
 s.getRange(`A1:${col(ncols)}4`).format.font={name:'Arial',size:10,color:palette.ink};
 s.mergeCells(`A2:${col(Math.min(ncols,4))}2`);s.getRange('A2').values=[[title]];
 s.getRange('A2').format.font={name:'Arial',size:16,bold:true,color:palette.ink};
 s.getRange('A2').format.rowHeight=28;
 s.mergeCells(`A3:${col(Math.min(ncols,4))}3`);s.getRange('A3').values=[[subtitle]];
 s.getRange('A3').format.font={name:'Arial',size:10,italic:true,color:palette.muted};
 s.getRange('A3').format.wrapText=true;s.getRange('A3').format.rowHeight=32;
 s.freezePanes.freezeRows(6);s.freezePanes.freezeColumns(2);
 return s;
}
function table(s,start,headers,rows,widths,name,{maxHeight=260}={}){
 const ncols=headers.length,last=start+rows.length,range=s.getRange(`A${start}:${col(ncols)}${last}`);
 const matrix=[headers,...rows.map(r=>r.map(v=>v==null?'—':v))];
 if(matrix.some(r=>r.length!==ncols))throw new Error('Wrong width '+name);
 range.values=matrix;
 range.format.font={name:'Arial',size:10,color:palette.ink};range.format.wrapText=true;range.format.verticalAlignment='top';
 const t=s.tables.add(`A${start}:${col(ncols)}${last}`,true,name);t.style='TableStyleMedium2';t.showBandedRows=true;
 const head=s.getRange(`A${start}:${col(ncols)}${start}`);head.format={fill:palette.ink,font:{name:'Arial',size:10,bold:true,color:'#FFFFFF'},rowHeight:36,wrapText:true,verticalAlignment:'center'};
 for(let i=0;i<ncols;i++)s.getRange(`${col(i+1)}${start}:${col(i+1)}${last}`).format.columnWidth=widths[i];
 rows.forEach((r,i)=>{
   const lines=Math.max(...r.map((v,j)=>String(v??'').split('\n').reduce((n,line)=>n+Math.max(1,Math.ceil(line.length/Math.max(8,widths[j]-3))),0)));
   s.getRange(`A${start+i+1}:${col(ncols)}${start+i+1}`).format.rowHeight=Math.min(maxHeight,Math.max(42,lines*14+12));
 });
 return last;
}

const s0=wb.worksheets.getItem('Synthese');
s0.getRange('A2').values=[['Historique V21 — bilan actuel dans BilanV22']];
s0.getRange('A3').values=[['Classeur V22 du 24 novembre 2026. Les onze premiers onglets conservent l’état V21 ; les onglets V22 portent les observations actualisées.']];
s0.getRange('A3').format.wrapText=true;s0.getRange('A3').format.rowHeight=32;
previews.push({sheetName:'Synthese',range:'A1:D10',file:'historique.png'});

const refusals=manifest.tool_refusals.map(r=>({asset_id:r.asset_id||r.uid,name:r.name||r.character||r.costume||'Demande refusée',category:r.review_report.includes('creature')?'creature':r.review_report.includes('costume')?'costume':'projectile',edition:r.edition||r.game||'',direction:r.observed_direction||r.requested_direction||'',status:'refusal',path:null,dimensions:null,limitations:[r.reason||'Générateur : demande refusée, aucun PNG. Aucun nouvel essai de cette demande.'],sources:(r.source_urls||[]),review_report:r.review_report,request_id:r.request_id}));
const deliveries=[...manifest.assets,...refusals];
const deliveryRows=deliveries.map(a=>[a.asset_id,a.name,catLabels[a.category]||a.category,a.edition,a.direction||'Vue unique',statusLabels[a.status]||'Refus outil — aucun PNG',a.path?'Oui':'Non',a.dimensions?.join(' × ')||'Aucun PNG',a.runtime_id||a.spec_id||a.uid||a.catalogue_id||join(a.v1_actions)||'Complément',join(a.limitations),a.path||'—',join(a.sources),a.sha256||a.request_id||'—',a.review_report]);
const dl=sheet('LivresV22','Livraisons V22 — sorties réelles et refus','Une ligne par image ou demande refusée. Une pose statique ne constitue pas un combattant achevé.',14);
const dlast=table(dl,6,['ID sortie / demande','Nom','Catégorie','Édition','Direction observée','Qualification','PNG','Dimensions natives','Raccord de suivi','Limites de revue','Fichier','Sources visuelles','SHA-256 / request ID','Rapport'],deliveryRows,[48,38,22,48,22,28,10,22,47,92,81,92,70,32],'V22Livraisons');
dl.getRange(`F7:F${dlast}`).conditionalFormats.add('containsText',{text:'Refus',format:{fill:palette.red}});
dl.getRange(`F7:F${dlast}`).conditionalFormats.add('containsText',{text:'Essai',format:{fill:palette.amber}});
dl.getRange(`F7:F${dlast}`).conditionalFormats.add('containsText',{text:'Étude',format:{fill:palette.amber}});
previews.push({sheetName:'LivresV22',range:'A1:F10',file:'livraisons.png'});

const stages=sheet('StagesV22','Stages — 52 entrées runtime, observations V22','Les candidats ne changent pas le bitmap runtime. Les rendus procéduraux et l’historique V5/V21 sont conservés.',10);
table(stages,6,['ID runtime','Lieu','Représentation runtime','Bitmap actuel','État V22','Candidats V22','Essais V22','Besoin / raison précise','Antécédents V21','Éléments à valider'],inv.stages.map(r=>[r.id,r.nom,r.representation_runtime,r.bitmap_runtime||'Sans bitmap catalogue',r.statut_v22,fileNames(r.medias_v22),fileNames(r.essais_v22),r.note_v22,fileNames(r.medias_v21),'Géométrie, calques, parallaxe, collisions, lumière et intégration']),[43,42,29,43,37,82,82,105,82,65],'V22Stages');
previews.push({sheetName:'StagesV22',range:'A1:E11',file:'stages.png'});
const specs=sheet('SpecsStagesV22','Stages — 24 spécifications V1','Ces spécifications recoupent le catalogue runtime ; ne pas additionner leurs effectifs.',8);
table(specs,6,['ID V1','Lieu','Édition','Raccord runtime','État V22','Candidats V22','Repères visuels V1','Observation'],inv.specifications_stages_v1_non_cumulees.map(r=>[r.id,r.name,r.edition,r.catalogue_match||'Sans raccord déclaré',r.statut_v22,fileNames(r.medias_v22),r.visual_landmarks,r.note_v22]),[38,39,42,40,34,82,80,90],'V22SpecsStages');
previews.push({sheetName:'SpecsStagesV22',range:'A1:F10',file:'specs.png'});

const bow=sheet('BOWV22','Personnages / B.O.W. — 346 UID suivis','129 attentes de source V21 examinées ; refus historiques conservés. Aucun total de personnages achevés.',10);
table(bow,6,['UID','Nom','Édition','État historique','Observation V22','Candidats V22','Motif / besoin restant','Page de référence V22','Image source inspectée','Refus historique'],inv.bow.map(r=>[r.uid,r.nom,r.edition,r.statut,r.statut_v22,fileNames(r.medias_v22),r.note_v22,r.attente_v22?.source_page||manifest.assets.find(a=>a.uid===r.uid)?.sources.join('\n')||'Voir historique',r.attente_v22?(r.attente_v22.reference_visually_inspected?'Oui':'Non'):r.medias_v22.length?'Oui — limites dans le rapport':'Sans revue V22 requise / voir historique',r.refus_historique_conserve?'Oui — conservé':'Non indiqué']),[40,31,42,29,36,77,112,94,38,24],'V22BOW',{maxHeight:310});
previews.push({sheetName:'BOWV22',range:'A1:E10',file:'bow.png'},{sheetName:'BOWV22',range:'E7:J10',file:'bow_details.png'});

const variants=inv.catalogue_costumes_v22.variants;
const costumes=sheet('CostumesV22','Costumes — 38 variantes ciblées','Huit incarnations ciblées ; la présence nominale et une référence identifiée ne prouvent pas une absence globale.',12);
table(costumes,6,['ID de rapprochement','Personnage','Costume / nom relevé','Édition','État V22','Candidats V22','Qualification du nom / édition','Preuve source','Présence antérieure','Refus / attentes','Limites','Fiche V1'],variants.map(r=>[
 r.id,r.personnage,r.nom_releve,r.edition,r.status_v22||'À préciser',fileNames(r.v22_assets||[]),r.statut_documentaire,
 join(r.urls_sources),r.presence_assets,join([...(r.v22_refusals||[]),...(r.historique_refus||[])]),
 [r.note_v22,r.note_edition,r.comparaison_noms].filter(Boolean).join('\n'),r.fiche_v1
]),[45,28,34,50,37,81,65,95,60,85,100,30],'V22Costumes',{maxHeight:310});
previews.push({sheetName:'CostumesV22',range:'A1:F10',file:'costumes.png'});

const families=sheet('FamillesV22','Projectiles / VFX — 16 familles','Aucune famille complète. Objets, départs de tir, vol, impacts et explosions restent distincts.',8);
table(families,6,['ID famille','Nom','Actions V1','État V22','Raison / travail restant','Candidats V22','Études V22','Sources V22'],inv.projectile_families.map(r=>[r.id,r.nom,r.actions.length,r.statut_v22,r.note_v22,fileNames(r.medias_v22),fileNames(r.etudes_v22),join(r.sources_v22_urls)]),[42,39,14,34,120,82,82,100],'V22Familles',{maxHeight:310});
previews.push({sheetName:'FamillesV22',range:'A1:E10',file:'familles.png'});
const actions=sheet('ActionsV22','Projectiles / VFX — 44 actions','Les règles de simulation V1 ne sont pas toutes des attaques canoniques. Chaque raccord reste explicite.',9);
table(actions,6,['ID action','Personnage','Édition','Famille','Nom de l’action','Candidats / études V22','Refus V22','État / motif de la famille','Action complète'],inv.projectile_actions.map(r=>[r.id,r.combattant,r.edition,r.famille_id,r.nom,fileNames([...(r.medias_v22||[]),...(r.etudes_v22||[])]),join(r.refus_v22),r.note_famille_v22,'Non']),[38,28,44,40,40,81,85,112,20],'V22Actions');
previews.push({sheetName:'ActionsV22',range:'A1:F10',file:'actions.png'});

const bilan=sheet('BilanV22','Resident Evil Combat — bilan V22','24 novembre 2026 · images statiques documentées, sources et historique conservés · fidélité 1:1 non certifiée.',4);
const metrics=[
 ['PNG V22 documentés',`=COUNTIFS(LivresV22!G7:G${dlast},"Oui")`,'Candidats, études et essais : une image n’est pas une identité achevée.','LivresV22'],
 ['Candidats statiques',`=COUNTIFS(LivresV22!F7:F${dlast},"Candidat statique")`,'Images disponibles pour revue, détails et animations à compléter.','LivresV22'],
 ['Études visuelles',`=COUNTIFS(LivresV22!F7:F${dlast},"Étude visuelle")`,'Études partielles, exclues de la couverture candidate.','LivresV22'],
 ['Essais écartés',`=COUNTIFS(LivresV22!F7:F${dlast},"Essai écarté")`,'Conservés avec leurs limites et corrections.','LivresV22'],
 ['Refus sans PNG',`=COUNTIFS(LivresV22!F7:F${dlast},"Refus outil — aucun PNG")`,'Demandes non relancées ; distinctes des refus historiques.','LivresV22'],
 ...Object.entries(catLabels).map(([key,label])=>[`${label} — PNG`,`=COUNTIFS(LivresV22!C7:C${dlast},"${label}",LivresV22!G7:G${dlast},"Oui")`,'Compte toutes les sorties de cette catégorie.','LivresV22']),
 ['Stages runtime avec candidat V22',manifest.summary.runtime_stages_with_v22_candidate,'Correspondances proposées ; moteur inchangé.','StagesV22'],
 ['Spécifications V1 supplémentaires',manifest.summary.v1_extra_specs_with_v22_candidate,'Cinq compléments hors du catalogue runtime inspecté.','SpecsStagesV22'],
 ['UID de créature avec candidat V22',manifest.summary.creature_uids_with_v22_candidate,'Nombre d’UID distincts recevant une image, hors essais.','BOWV22'],
 ['Variantes de costume avec candidat',manifest.summary.costume_variants_with_v22_candidate,'Variantes ciblées distinctes, hors tenues de base.','CostumesV22'],
 ['Assets certifiés 1:1',0,'Aucune certification géométrique, pixel à pixel ou d’animation.','Manifeste'],
 ['Animations complètes / admissions moteur',0,'Aucune nouvelle animation complète ni intégration runtime.','Manifeste'],
 ['PNG cumulés documentés après V22',manifest.summary.png_archive_after_v22,'171 PNG avant V22 + les sorties réelles V22 ; essais inclus.','Historique + V22'],
 ];
table(bilan,6,['Mesure','Nombre','Portée exacte','Source'],metrics.map(r=>[r[0],typeof r[1]==='number'?r[1]:null,r[2],r[3]]),[47,14,99,28],'V22Bilan',{maxHeight:76});
metrics.forEach((r,i)=>{if(typeof r[1]==='string')bilan.getRange(`B${7+i}`).formulas=[[r[1]]];});
bilan.getRange(`B7:B${6+metrics.length}`).format.numberFormat='#,##0';
const scopes=[['Arènes runtime',52,'Ne pas additionner aux 24 spécifications V1.'],['UID du catalogue',346,'115 principaux et 231 prototypes ; les 43 contextes restent séparés.'],['Fiches de finition / extensions',84,'24 fiches et 60 propositions ; aucune absence déduite par addition.'],['Variantes de costume ciblées',38,'Huit incarnations ; pack Fan Design T-shirt non décomposé à part.'],['Actions / familles de projectiles',44,'44 actions réparties en 16 familles ; aucune action complète.'],['Refus historiques B.O.W. conservés',61,'Non relancés. Les nouveaux refus V22 sont décomptés au-dessus.']];
bilan.getRange('A26').values=[['Périmètre des listes — unités non additionnables']];bilan.getRange('A26').format.font={name:'Arial',size:12,bold:true,color:palette.ink};
table(bilan,28,['Ensemble','Entrées','Qualification'],scopes,[47,14,99],'V22Perimetre',{maxHeight:76});
previews.push({sheetName:'BilanV22',range:'A1:D22',file:'bilan.png'});

// Calculate once, then compare formula results to independent JavaScript counts.
wb.recalculate();
const expected=[manifest.summary.png_outputs,manifest.summary.static_candidates,manifest.summary.visual_studies,manifest.summary.rejected_trials,manifest.summary.tool_refusals_no_png,...Object.keys(catLabels).map(k=>manifest.summary.by_category[k]||0)];
const calculated=bilan.getRange(`B7:B${6+expected.length}`).values.map(r=>r[0]);
if(JSON.stringify(calculated)!==JSON.stringify(expected))throw new Error('Formula mismatch '+JSON.stringify({calculated,expected}));
const bad=[];
for(const s of Object.values(sheets)){
 const last=s===bilan?34:s===dl?dlast:s.name==='BOWV22'?352:s.name==='StagesV22'?58:s.name==='SpecsStagesV22'?30:s.name==='CostumesV22'?44:s.name==='FamillesV22'?22:50;
 const width=s===bilan?4:s===dl?14:s.name==='CostumesV22'?12:s.name==='ActionsV22'?9:s.name==='SpecsStagesV22'||s.name==='FamillesV22'?8:10;
 const values=s.getRange(`A1:${col(width)}${last}`).values;
 for(let i=0;i<values.length;i++)for(let j=0;j<values[i].length;j++)if(typeof values[i][j]==='string'&&/^#(REF!|DIV\/0!|VALUE!|N\/A|NAME\?|NUM!|SPILL!|CALC!)/.test(values[i][j]))bad.push([s.name,i+1,j+1,values[i][j]]);
}
if(bad.length)throw new Error('Formula errors '+JSON.stringify(bad));
for(const p of previews){
 const img=await wb.render({sheetName:p.sheetName,range:p.range,scale:1,format:'png'});
 await fs.writeFile(path.join(out,p.file),new Uint8Array(await img.arrayBuffer()));
}
const target=path.join(base,'inventory','Resident_Evil_Combat_Inventaire_V22_20261124.xlsx');
const xlsx=await SpreadsheetFile.exportXlsx(wb);await xlsx.save(target);
const qa={date:'2026-11-24',historical_sheets:originalNames,preserved_history:true,modified_historical_cells:['Synthese!A2','Synthese!A3'],new_sheets:Object.keys(sheets),formula_expected:expected,formula_calculated:calculated,formula_errors:bad,rendered_previews:previews,target,output_counts:manifest.summary,finalized_reports:manifest.generation_reports_finalized};
await fs.writeFile(path.join(base,'reports','WORKBOOK_QA_V22.json'),JSON.stringify(qa,null,2)+'\n');
console.log(JSON.stringify({target,sheets:originalNames.length+Object.keys(sheets).length,formula_checks:expected.length,previews:previews.length,counts:manifest.summary}));
