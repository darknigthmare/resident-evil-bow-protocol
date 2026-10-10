(function(){'use strict';const d=window.RE_DATA,by=id=>document.getElementById(id);if(!d||!d.fighters.length)return;
by('fighterCount').textContent=d.fighters.length;by('arenaCount').textContent=d.stages.length;by('catalogCount').textContent=d.catalog.length;by('moveCount').textContent=d.counts?.loreMoves||d.fighters.reduce((n,f)=>n+Object.keys(f.combat?.moves||{}).length,0);
const hero=d.fighters.find(f=>/NEMESIS/.test(f.name)&&/2020/.test(f.ep))||d.fighters[0];by('heroSpecimen').src=hero.sprite;by('heroSpecimen').alt=hero.name+' — '+hero.ep;by('heroName').textContent=hero.name;by('heroEpisode').textContent=hero.ep;
by('fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch(_){by('fullscreen').title='Plein écran indisponible dans cette fenêtre';}};
})();
