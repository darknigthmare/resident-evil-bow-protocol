(function(){
'use strict';
const data=window.RE_DATA,grid=document.getElementById('uroborosGrid');
if(!grid||!data?.protocols?.uroboros)return;
for(const uid of data.protocols.uroboros.ids){
 const f=data.fighters.find(x=>x.uid===uid);if(!f)continue;
 const a=document.createElement('a');a.className='uroboros-card';a.href='movesets.html?uid='+encodeURIComponent(uid);
 const img=document.createElement('img');img.src=f.sprite;img.alt=f.name+' · illustration provisoire';img.loading='lazy';img.decoding='async';
 const body=document.createElement('span'),title=document.createElement('b'),note=document.createElement('small');title.textContent=f.name;note.textContent=f.combat.role+' / RÉFÉRENCE PROVISOIRE';body.append(title,note);a.append(img,body);grid.append(a);
}
const hero=data.fighters.find(f=>f.uid==='re5-uroboros-albert-wesker');
if(hero){document.getElementById('heroSpecimen').src=hero.sprite;document.getElementById('heroSpecimen').alt=hero.name+' · visuel de référence provisoire';document.getElementById('heroName').textContent=hero.name;document.getElementById('heroEpisode').textContent='RE5 · MUTATION FINALE / VISUEL PROVISOIRE';}
})();
