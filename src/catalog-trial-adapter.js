/* Only loaded by isolated trial pages. Never load in operations, saves or versus. */
(function(root){'use strict';
 const base=root.RE_DATA,exp=root.RE_CATALOG_EXPANSION;
 if(!base||!exp)throw Error('Missing trial data');
 const stable=new Set(base.fighters.map(f=>f.uid));
 if(exp.fighters.some(f=>stable.has(f.uid)))throw Error('Catalog profile collides with a stable fighter');
 root.RE_BASE_DATA=base;
 root.RE_DATA={...base,fighters:[...base.fighters,...exp.fighters]};
 root.RE_CATALOG_TRIALS=Object.freeze({enabled:true,digest:exp.digest,progression:false});
})(globalThis);
