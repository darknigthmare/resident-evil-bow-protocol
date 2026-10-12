#!/usr/bin/env python3
"""Curated per-incarnation catalog expansion. Offline, deterministic, no asset synthesis.
The original 115 combatants remain untouched. Experimental command mappings are
never labelled canonical; environmental entries do not gain humanoid attacks.
"""
from pathlib import Path
from collections import Counter
import json, copy, hashlib
R=Path(__file__).resolve().parents[1]
SLOTS=['light','heavy','low','throw','special','specialDown','specialForward','specialBack','super','utility']
def load(p):return json.loads((R/p).read_text(encoding='utf8'))
def save(p,d):
 q=R/p;q.parent.mkdir(parents=True,exist_ok=True);q.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
# Explicit roster assignments. The right-hand tag is a technical prototype family,
# NOT a claim that two incarnations have identical original-game movesets.
GROUPS={
'zombie':'''re3r-zombie re1r-zombie recv-zombie re1-zombie re2-zombie re2-marvin-branagh-zombie re2-brad-vickers-zombie re0-zombie re0-edward-dewey-zombie re2r-zombie re3-zombie reoutbreak-zombie reoutbreak2-zombie rerequiem-wrenwood-zombie rerequiem-zombie-doctor rerequiem-zombie-patient rerequiem-zombie-staff-member rerequiem-zombie-cleaner rerequiem-raccoon-city-zombie rerequiem-rpd-zombie rerequiem-ark-zombie''',
'fast-zombie':'''re1r-crimson-head re1r-crimson-head-prototype-1 re1r-forest-speyer-zombie recv-anatomist-zombie re1-forest-speyer-zombie rerequiem-blister-head''',
'pale':'''re3r-pale-head''',
'canid':'''re3r-zombie-dog re1r-cerberus recv-zombie-dog re2-zombie-dog re0-cerberus re2r-zombie-dog re3-zombie-dog rerev2-orthrus rerev-fenrir rerev-black-fenrir re6-zombie-dog reoutbreak-zombie-dog reoutbreak2-zombie-hyena reoutbreak2-zombie-lioness reoutbreak2-stalker reoutbreak2-zombie-dog rerequiem-garmr''',
'crow':'''re1r-crow re1-crow re2-crow re0-crow re3-crow reoutbreak-crow reoutbreak2-horn-bill reoutbreak2-crow''',
'bat':'''recv-bat re0-bat re0-giant-bat''',
'snake':'''re1r-adder re1-adder''',
'yawn':'''re1r-yawn re1-yawn''',
'spider':'''re1r-web-spinner re1r-black-tiger recv-black-widow recv-giant-black-widow re1-web-spinner re1-black-tiger re2-giant-spider re0-giant-spider re3-giant-spider reoutbreak-giant-spider reoutbreak2-giant-spider''',
'small-spider':'''re1-small-spider re3-small-spider rerev2-giant-whip-spider rerequiem-small-spider''',
'wasp':'''re1r-wasp re1-wasp reoutbreak-giant-wasp reoutbreak2-wasp''',
'moth':'''recv-moth re2-giant-moth reoutbreak-giant-moth''',
'larva':'''re2-large-roach re2-larvae re0-leech re3-sliding-worm reoutbreak-scissor-worm reoutbreak-baby-moth reoutbreak-g-embryo reoutbreak-small-leech''',
'hunter':'''re3r-hunter-beta re1r-hunter recv-hunter re0-hunter rerev-hunter reoutbreak-hunter reoutbreak2-hunter-mu''',
'sweeper':'''recv-sweeper''',
'licker':'''re3r-licker re2-evolved-licker re2r-licker reoutbreak-licker reoutbreak-regis-licker reoutbreak2-licker rerequiem-licker-beta2''',
'drain':'''re3-drain-deimos re3-brain-sucker''',
'parasite-grab':'''re3r-drain-deimos re2r-g-young re5-bui-kichwa''',
'cephalo':'''re3r-ne-alpha-parasite re5-cephalo''',
'burrower':'''recv-gulp-worm re3-grave-digger''',
'albinoid-infant':'''recv-albinoid-infant''',
'nosferatu':'''recv-nosferatu''',
'halberd':'''recv-mutated-steve''',
'stinger':'''re0-stinger''',
'centurion':'''re0-centurion''',
'plague-crawler':'''re0-plague-crawler''',
'eliminator':'''re0-eliminator''',
'amphibian':'''re0-lurker reoutbreak-hunter-gamma''',
'leech-queen':'''re0-queen-leech re0-queen-leech-second-form reoutbreak-queen-leech''',
'g-adult':'''re2r-g-adult reoutbreak-g-type''',
'ivy':'''re2r-ivy''',
'g1':'''re2r-g-first-form''',
'g2':'''re2r-g-second-form''',
'g3':'''re2r-g-third-form''',
'g4':'''re2r-g-fourth-form''',
'giant-mouth':'''re2-g-fifth-form re2r-g-fifth-form''',
'nemesis-rocket':'''re3-nemesis''',
'nemesis-tentacle':'''re3-nemesis-second-form''',
'ganado':'''re5-town-majini re4-village-ganado re4-castle-ganado re4-castle-ganado-leader-zealot re4r-villager re4r-zealot''',
'spear':'''re5-wetlands-majini''',
'club':'''re5-giant-majini re4-hammer-ganado re4r-brute revillage-urias-drac''',
'soldier':'''re5-base-majini re4-soldier-ganado re4r-soldier rerequiem-raccoon-city-bsaa-zombie rerequiem-elite-guard''',
'kipepeo':'''re5-kipepepeo''',
'duvalia':'''re5-duvalia''',
'afflicted':'''rerev2-afflicted''',
'rotten':'''rerev2-rotten''',
'revenant':'''rerev2-revenant''',
'drill':'''rerev2-mutant-pedro''',
'vulcanblubber':'''rerev2-vulcanblubber''',
'slinger':'''rerev2-slinger''',
'neil':'''rerev2-monster-neil''',
'dhurlga':'''rerev2-dhurlga''',
'alex':'''rerev2-monster-alex rerev2-monster-alex-2nd-fight''',
'chainsaw':'''re4-dr-salvador re4-bella-sisters re4r-chainsaw-villager re4r-chainsaw-sisters rerequiem-raccoon-city-chainsaw-zombie''',
'colmillos':'''re4-colmillos re4r-colmillos re4r-colmillos-strong-threat''',
'garrador':'''re4-garrador''',
'armadura':'''re4-armadura re4r-armadura re4r-armadura-strong-threat''',
'gatling':'''re4-jj''',
'krauser-mutated':'''re4-jack-krauser-enemy re4r-jack-krauser-mutated''',
'krauser':'''re4r-jack-krauser''',
'regenerator':'''re4-regenerator re4r-regenerador re4r-regenerador-strong-threat''',
'molded-crawler':'''re7-molded-crawler''',
'ooze':'''rerev-ooze''',
'ooze-shooter':'''rerev-tricorne-ooze''',
'ooze-pincer':'''rerev-pincer-ooze''',
'wall-blister':'''rerev-wall-blister''',
'ghiozzo':'''rerev-ghiozzo''',
'scagdead':'''rerev-scagdead''',
'scarmiglione':'''rerev-scarmiglione''',
'norman':'''rerev-norman-mutant''',
'daughter':'''revillage-bela-dimitrescu revillage-cassandra-dimitrescu revillage-daniela-dimitrescu''',
'javo':'''re6-javo''',
'meset':'''re6-meset''',
'napad':'''re6-napad''',
'lepotitsa':'''re6-lepotitsa''',
'iluzija':'''re6-iluzija''',
'rasklapanje':'''re6-rasklapanje''',
'ubistvo':'''re6-ubistvo''',
'bloodshot':'''re6-bloodshot''',
'shrieker':'''re6-shrieker rerequiem-zombie-singer''',
'whopper':'''re6-whopper rerequiem-chef-zombie rerequiem-chunk''',
'ogroman':'''re6-ogroman''',
'deborah':'''re6-deborah-harper''',
'mendez1':'''re4r-bitores-mendez-first-mutation''',
'mendez2':'''re4r-bitores-mendez-second-mutation''',
'elgigante':'''re4r-el-gigante''',
'novistador':'''re4r-novistador''',
'leech-man':'''reoutbreak-leech-man''',
'elephant':'''reoutbreak2-titan''',
'flea':'''reoutbreak2-giga-bite''',
'green-zombie':'''reoutbreak2-green-zombie''',
'scissor-tail':'''reoutbreak2-scissor-tail''',
'axe-man':'''reoutbreak2-axe-man''',
'nyx':'''reoutbreak2-nyx''',
'tyrant':'''re1-tyrant reoutbreak-thanatos reoutbreak2-tyrant rerequiem-tyrant-t-501''',
'super-tyrant':'''reoutbreak-thanatos-r reoutbreak2-tyrant-r rerequiem-super-tyrant-t-501''',
'blind-zombie':'''rerequiem-zombie-blind-patient''',
'commander':'''rerequiem-the-commander''',
# Contextual encounters cannot honestly be treated as ordinary 1v1 fighters.
'context-plant':'''re1r-fountain-plant re1-monster-plant re1r-plant-42 re1-plant-42 re2-vines recv-tentacle recv-alexia-ashford-second-form reoutbreak2-evil-shade rerequiem-plant-43''',
'context-water':'''re1r-neptune re1-neptune re2-giant-alligator re2r-alligator re4-del-lago rerev-malacoda re6-brzak reoutbreak-neptune reoutbreak2-alligator''',
'context-swarm':'''recv-ant re7-spider re7-bug-swarm re6-gnezdo''',
'context-cocoon':'''re6-chrysalid''',
'context-vehicle':'''re3-nicholai-ginovaef-helicopter re5-motorcycle-majini''',
'context-pursuit':'''re1r-lisa-trevor revillage-baby rerequiem-the-girl rerequiem-the-children rerequiem-titan-spinner''',
'context-explosion':'''rerev2-sploder rerev-chunk-ooze rerequiem-blister-borne''',
'context-phases':'''re3-nemesis-third-form re4-las-plagas re4-ramon-salazar-enemy re6-haos re6-carla-radames re6-derek-simmons re4r-plaga re4r-osmund-saddler''',
'context-sentinel':'''re6-oko re4r-zealot-staff'''
}
# Typographical checks are fatal rather than silently leaving an entry unassigned.
GROUPS['kipepeo']='re5-kipepeo'
# Original French capsule for each technical family: anatomy, behavior, limits.
FAMILY={}
def family(k,body,behavior,limit,attacks):FAMILY[k]=dict(body=body,behavior=behavior,limit=limit,attacks=attacks.split('|'))
family('zombie','Hôte humain infecté, morphologie de son épisode.','Approche au sol, agrippement et attaque de contact.','Ne pas lui donner automatiquement des armes, de la régénération active ou une mutation de remake.','Agrippement|Morsure|Avancée')
family('fast-zombie','Humanoïde infecté à mobilité accrue.','Poursuite rapide et agression rapprochée.','Crimson Head, Forest et Anatomist restent des identités différentes ; pas de langue de Licker.','Frappe rapprochée|Saisie|Course')
family('pale','Humanoïde pâle doté de régénération.','Avancée persistante et attaques de contact.','La régénération et les interruptions doivent être bornées dans la simulation ; pas de carapace NE-α sans infection distincte.','Agrippement|Frappe|Régénération')
family('canid','Quadrupède canin, hyénidé ou félin selon le sujet.','Approche rapide et bond de morsure.','L’espèce et la peau restent celles de la fiche ; aucune Plaga crânienne héritée des Colmillos.','Morsure|Bond|Course')
family('crow','Oiseau volant ; bec et serres.','Attaque en piqué, souvent en groupe.','Un individu d’essai ne représente pas une simulation de vol ou une volée complète.','Coup de bec|Piqué|Vol')
family('bat','Chiroptère avec ailes membraneuses.','Harcellement aérien et attaque au contact.','Ne pas importer l’écholocation d’Oko ni la taille du grand spécimen sur les petits.','Contact mordant|Piqué|Vol')
family('snake','Petit serpent rampant venimeux.','Morsure depuis le sol.','Aucun étranglement humanoïde ni taille de Yawn ; le venin n’est pas un projectile.','Morsure|Reptation|Repli')
family('yawn','Serpent géant du manoir.','Morsure et déplacement du corps dans l’espace clos.','La seconde rencontre ne possède pas nécessairement le poison de la première ; scénario et remèdes restent séparés.','Morsure|Avancée du corps|Repli')
family('spider','Arachnide à huit pattes ; forme propre à l’épisode.','Déplacement mural et attaques de morsure ou de sécrétion.','Pas de toile projectile inventée ; murs, plafond et descendance ne sont pas simulés par un simple duel au sol.','Morsure|Sécrétion|Déplacement')
family('small-spider','Arachnide de petite taille ou progéniture.','Contact bref et assaut en nombre.','Pas de pouvoirs du parent géant ; le modèle d’essai agrandit la silhouette pour rester lisible.','Contact|Bond bref|Déplacement bas')
family('wasp','Hyménoptère volant à aiguillon.','Piqûre et harcèlement.','La portée du dard n’est pas un tir ; l’essaim complet exige plusieurs individus.','Piqûre|Piqué|Vol')
family('moth','Lépidoptère infecté.','Vol, poussière toxique et selon l’incarnation larves.','La ponte sur le dos de Code Veronica n’est pas attribuée automatiquement aux autres épisodes.','Contact aérien|Poussière|Vol')
family('larva','Petit invertébré, larve ou jeune parasite selon la fiche.','Approche basse et accrochage.','La morsure d’essai ne constitue pas une mutation adulte ; aucune capacité du parent n’est héritée.','Contact|Accrochage|Reptation')
family('hunter','B.O.W. bipède à griffes, modèle défini par l’UID.','Griffures rapides et bond offensif.','Pas de poison de Sweeper ; les variantes α, β et μ ne sont pas fusionnées.','Griffure|Bond griffé|Course')
family('sweeper','Hunter violacé muni de griffes venimeuses.','Assauts rapides avec empoisonnement de contact.','Le venin provient des griffes, pas d’un souffle ou d’un projectile.','Griffure venimeuse|Bond griffé|Course')
family('licker','Humanoïde écorché, quadrupède, griffes et langue allongée.','Allonge linguale et bonds griffés.','L’escalade et la perception acoustique requièrent une scène adaptée ; pas de vision omnisciente revendiquée.','Langue|Griffure|Bond')
family('drain','Arthropode mutant à membres de saisie.','Accrochage et attaque parasitaire au contact.','Drain Deimos original et Brain Sucker ne possèdent pas l’implantation larvaire du remake.','Accrochage|Prélèvement au contact|Avancée')
family('parasite-grab','Créature basse capable de s’accrocher à une cible.','Bond et prise à courte distance.','La condition d’infection reste propre à l’espèce ; une jauge de poison commune ne la reproduit pas.','Bond|Accrochage|Déplacement bas')
family('cephalo','Hôte parasité doté d’un appendice extensible.','Fouettement à moyenne portée et maintien de l’hôte.','NE-α et Cephalo ne sont pas la même famille biologique ; aucune conversion d’adversaire dans le prototype.','Fouet de l’appendice|Balayage|Avancée')
family('burrower','Ver géant à corps allongé et bouche antérieure.','Attaque après approche souterraine.','Le duel représente une émergence, pas un réseau de galeries ni une téléportation.','Morsure|Percussion du corps|Émergence')
family('albinoid-infant','Jeune organisme issu d’une salamandre.','Déplacement rapide et choc faible au contact.','Ne pas lui donner le vaste champ électrique de l’adulte aquatique.','Contact électrique|Déplacement|Repli')
family('nosferatu','Alexander Ashford muté, torse exposé et appendices.','Allonge des appendices et émission de gaz.','Pas de pyrogénie d’Alexia ; le bord du toit et l’antidote propre à la scène restent contextuels.','Appendice|Gaz toxique|Balayage')
family('halberd','Steve muté, humanoïde massif armé d’une hallebarde.','Poursuite et grands coups d’arme.','La fuite scénarisée n’est pas remplacée par une mort canonique en duel.','Hallebarde|Charge|Coup vertical')
family('stinger','Scorpion géant blindé.','Pinces, percussion et dard.','Aucun tir de poison sans attestation ; les ouvertures de carapace ne sont pas des chiffres officiels.','Pince|Dard|Avancée')
family('centurion','Myriapode géant à corps annelé.','Percussion du corps et saisie d’une proie.','La capture de Rebecca relève de la scène ; elle ne devient pas une invocation.','Percussion|Saisie|Déplacement')
family('plague-crawler','Arthropode expérimental à grandes pattes coupantes.','Coupe à courte portée et pression au sol.','Pas d’attaque de dard ou de vol empruntée à d’autres insectes.','Patte coupante|Double coupe|Avancée')
family('eliminator','Primate infecté de petite taille.','Bond, griffures et poursuite nerveuse.','Pas de superforce de Tyrant ni de saisie par tentacule.','Griffure|Bond|Course')
family('amphibian','Amphibien mutant à gueule extensible.','Bond et capture à très courte portée.','Lurker et Hunter Gamma gardent leur anatomie ; une capture n’est pas toujours une langue.','Morsure|Capture|Bond')
family('leech-queen','Masse de sangsues ; forme et épisode verrouillés.','Allonge du corps et attaques de contact.','La reine de RE0 et la grande sangsue d’Outbreak ne partagent ni origine personnelle ni phases.','Frappe organique|Allonge|Prise')
family('g-adult','Descendance rejetée liée au virus G.','Frappe, saisie et production de jeunes selon la rencontre.','Ce n’est pas William Birkin ; les jeunes et les adultes gardent des entrées séparées.','Frappe|Saisie|Allonge')
family('ivy','Hôte humain envahi par la végétation de NEST.','Agrippement extrêmement dangereux ; repousses.','L’incinération définitive et les nodules spatiaux ne sont pas remplacés par une guérison illimitée.','Agrippement végétal|Appendice|Avancée')
family('g1','William Birkin, première forme ; bras hypertrophié.','Coups avec le bras et l’objet métallique de la rencontre.','Ne pas ajouter les quatre bras de G3 ni la charge quadrupède de G4.','Coup de barre|Bras hypertrophié|Saisie')
family('g2','William Birkin, deuxième forme à griffe hypertrophiée.','Griffure, percussion et poursuite.','Le conteneur de la grue est un élément du décor, pas une arme produite par G2.','Griffe|Percussion|Avancée')
family('g3','William Birkin, troisième forme à plusieurs bras.','Griffures et attaques amples des bras.','Les nodules oculaires sont propres à la forme ; pas de phase terminale instantanée.','Griffure multiple|Balayage|Percussion')
family('g4','William Birkin, quatrième forme quadrupède.','Charge, bond et attaque de la gueule.','Pas de barre de G1 ni de posture bipède G3 ; surfaces verticales encore simplifiées.','Morsure|Charge|Bond')
family('giant-mouth','Masse terminale G envahissant un wagon.','Progression du corps et attaque de la gueule.','La masse et le train sont comprimés par la représentation d’essai ; pas de taille réelle certifiée.','Gueule|Pression du corps|Avancée')
family('nemesis-rocket','Nemesis original équipé de son manteau et lance-roquettes.','Poursuite, saisie, coups et arme portée.','Pas de quadrupédie ni de lance-flammes du remake ; les munitions sont une contrainte de simulation.','Poing|Saisie|Roquette')
family('nemesis-tentacle','Deuxième forme de Nemesis original, limiteur perdu.','Allonge tentaculaire et coups de corps.','Pas de lance-roquettes conservé automatiquement ; pas de forme canine du remake.','Tentacule|Saisie|Balayage')
family('ganado','Hôte humanoïde sous contrôle de Las Plagas.','Outils, attaques rapprochées et tactiques coordonnées.','L’arme sélectionnée doit être visible dans une variante ; toutes les armes du groupe ne sont pas simultanées.','Outil de mêlée|Agrippement|Avancée')
family('spear','Hôte des marais armé d’une lance.','Estoc et pression collective.','Bouclier et lancer doivent rester liés à l’équipement ; pas de fusil par défaut.','Estoc|Balayage de hampe|Avancée')
family('club','Humanoïde massif porteur d’une arme lourde.','Balayage et écrasement.','L’arme reste propre au sujet : masse, marteau ou pièce de décor ; ne pas en déduire un pouvoir biologique.','Coup lourd|Balayage|Percussion')
family('soldier','Humanoïde équipé d’armes et parfois de protections.','Tirs et attaques de contact.','Séparer soldat humain, J’avo, zombie BSAA et Ganado ; pas de nouvelle mutation attribuée par équipement.','Frappe de crosse|Tir|Rechargement')
family('kipepeo','Plaga autonome munie de quatre ailes.','Vol et attaque de la queue.','Pas de piqûre de guêpe ni de morphologie de chauve-souris.','Queue fouettante|Piqué|Vol')
family('duvalia','Plaga à coque rétractile tenant l’hôte retourné.','Ouverture de la carapace et morsure.','La faiblesse exposée et l’hôte suspendu restent spécifiques ; pas de tir de laser.','Morsure|Coque|Avancée')
family('afflicted','Humain altéré par t-Phobos et les sévices.','Ruée, coups de bras et outils.','Ni zombie T standard ni Revenant Uroboros ; pas de régénération universelle.','Frappe|Agrippement|Ruée')
family('rotten','Reste réanimé d’un Afflicted.','Étranglement et coups sans équipement.','Ne pas lui rendre automatiquement les armes de l’Afflicted vivant.','Main|Étranglement|Avancée')
family('revenant','Assemblage expérimental de tissus et membres.','Attaques avec les membres, parfois armés.','Les noyaux doivent être traités séparément ; pas d’héritage de tous les pouvoirs Uroboros.','Membre greffé|Saisie|Balayage')
family('drill','Pedro muté conservant sa perceuse.','Perforation et avancée avec l’outil.','La perceuse reste mécanique ; ne pas transformer chaque œil en projectile.','Perceuse|Percussion|Avancée')
family('vulcanblubber','Créature massive portant un réservoir chimique.','Projection incendiaire et contact lourd.','Le feu vient du dispositif chimique, pas d’un souffle inné.','Percussion|Projectile incendiaire|Repositionnement')
family('slinger','Créature Uroboros à bras lanceur.','Jet d’un organisme parasitaire.','La production du projectile ne prouve pas une guérison du corps ni une quantité infinie dans le prototype.','Bras|Projectile organique|Repli')
family('neil','Neil muté par Uroboros.','Force de contact, allonge et noyau exposable.','L’exposition du noyau et les arrosages de la scène restent à distinguer des attaques.','Bras muté|Allonge|Charge')
family('dhurlga','Assemblage massif de cadavres de Revenants.','Avancée, appendices et noyau bas.','Le noyau inférieur n’est pas un point faible spatial implémenté dans le duel.','Appendice|Percussion|Allonge')
family('alex','Alex Wesker mutée ; rencontre précise verrouillée.','Griffures et déplacements au contact.','Ne pas mélanger la première confrontation et la seconde ni attribuer les armes de Barry.','Griffure|Bond|Allonge')
family('chainsaw','Hôte humanoïde armé d’une tronçonneuse.','Coupes à portée de lame et avancée.','Les sœurs restent deux adversaires dans l’œuvre ; le sujet d’essai ne simule qu’une combattante à la fois.','Tronçonneuse|Coupe haute|Avancée motorisée')
family('colmillos','Canidé parasité par Las Plagas.','Morsure, bond et appendice de parasite selon la variante.','Ne pas importer la Plaga d’un Colmillo dans un chien zombie T.','Morsure|Bond|Appendice')
family('garrador','Humanoïde aveugle armé de longues griffes.','Orientation au son et assaut tranchant.','Pas de vision surnaturelle ; le parasite dorsal exige une hitbox à venir.','Griffe|Charge|Balayage')
family('armadura','Plaga animant une armure sans hôte humain vivant.','Coups avec l’arme portée et mouvements rigides.','Les modèles différents restent distincts ; pas de saignement humain ou de guérison zombie.','Lame|Abattage|Avancée')
family('gatling','Hôte massif doté d’une mitrailleuse rotative.','Mise en rotation puis rafale.','Les projectiles sont balistiques ; la réserve et le rechargement sont adaptés au duel.','Crosse|Rafale|Alimentation')
family('krauser-mutated','Krauser sous sa mutation d’arme organique.','Coupes du membre transformé et mobilité offensive.','Le bras du jeu original et les formes du remake ne sont pas une animation commune certifiée.','Bras-lame|Percée|Bond')
family('krauser','Krauser avant sa mutation terminale.','Combat au couteau et mobilité de combattant humain.','Pas de bras-lame avant mutation ; les pièges de l’arène ne sont pas des organes.','Couteau|Coup de pied|Repositionnement')
family('regenerator','Humanoïde commandé par plusieurs parasites.','Prises, morsures et régénération.','Le nombre et la position des Plagas restent propres à l’édition et à la variante ; pas de pointes d’Iron Maiden ajoutées.','Prise|Morsure|Régénération')
family('molded-crawler','Mycomorphe quadrupède à griffes.','Bond rapide et griffure en saut.','Pas de crachat de Fat Molded ni de propriétés du Fumer blanc.','Griffure|Bond|Course basse')
family('ooze','Hôte t-Abyss au corps malléable.','Approche et attaques organiques de contact.','Pas de projectile osseux du Tricorne ni de faux du Pincer.','Bras|Saisie|Avancée')
family('ooze-shooter','Ooze doté d’un appendice de projection osseuse.','Tir d’un projectile depuis le membre.','Le projectile n’est pas une balle ni une sécrétion acide.','Appendice|Projectile osseux|Repli')
family('ooze-pincer','Ooze aux bras prolongés d’épines.','Coupe et large allonge.','Pas de tir osseux du Tricorne ou d’explosion du Chunk.','Pince|Fauchage|Allonge')
family('wall-blister','Organisme fixé au mur pendant sa dormance.','Sortie de coquille et charge tentaculaire.','La phase d’essai est éveillée ; aucune invulnérabilité permanente attribuée à un duel.','Tentacule|Charge|Capture')
family('ghiozzo','Poisson mutant denté capable de bonds hors de l’eau.','Morsure et saut.','Le prototype ne certifie pas la nage en 3D ; aucun venin ajouté.','Morsure|Bond|Repli')
family('scagdead','Humanoïde t-Abyss massif, bras-scie organique.','Capture et attaque de scie.','Le piège et l’exécution de la scène restent distincts d’une animation de fatalité certifiée.','Scie organique|Capture|Avancée')
family('scarmiglione','B.O.W. t-Abyss blindée intégrant des caractères de requin.','Appendices coupants et blindage.','Les tronçons séparés ne sont pas simulés par une régénération générique.','Pointe|Bouclier|Charge')
family('norman','Jack Norman transformé par t-Abyss.','Assauts physiques et mirages.','Le prototype de contact ne prétend pas reproduire les mirages ou la perception du jeu original.','Poing|Allonge|Charge')
family('daughter','Fille Dimitrescu constituée d’un essaim prenant forme humaine.','Faucille, saisie et dispersion.','Le froid dépend du lieu ; ne pas lui donner les griffes d’Alcina ni affirmer une invulnérabilité universelle.','Faucille|Saisie|Approche')
family('javo','Soldat infecté au virus C, encore capable d’utiliser des armes.','Tir et agression coordonnée.','Les mutations locales de bras/tête/jambes nécessitent des sous-profils ; aucune sélection aléatoire de pouvoir.','Frappe|Tir|Rechargement')
family('meset','Mutation ailée issue d’une chrysalide.','Vol et capture par les pattes.','Les objets transportés appartiennent à la scène ; pas d’invocation de soldats.','Serres|Piqué|Vol')
family('napad','Mutation C avec carapace épaisse.','Poursuite lourde et attaques des bras.','Distinguer carapace et point faible dorsal ; pas de faux d’Ubistvo.','Poing|Double frappe|Charge')
family('lepotitsa','Humanoïde couvert de pores émetteurs.','Gaz infectieux et menace de proximité.','Le gaz de la campagne n’est pas une conversion générique de toute espèce du versus.','Contact|Émission gazeuse|Avancée')
family('iluzija','Serpent géant capable de camouflage.','Morsure et poursuite depuis une position dissimulée.','Camouflage ne signifie pas invulnérabilité ; les plafonds restent une limitation de scène.','Morsure|Percussion|Reptation')
family('rasklapanje','Humanoïde C capable de dissociation corporelle.','Agrippement ; attaques de parties détachées dans l’œuvre.','Le prototype représente le corps entier uniquement ; pas de nouveaux membres simulés par magie.','Agrippement|Saisie|Avancée')
family('ubistvo','Humanoïde muni d’un organe en forme de tronçonneuse.','Coupe organique et poursuite.','Ne pas lui imposer des munitions de tronçonneuse mécanique ni un lance-roquettes.','Scie organique|Coupe|Avancée')
family('bloodshot','Humanoïde musculaire rouge issu d’un zombie C.','Bond agressif et attaques de contact.','Ne pas confondre avec Crimson Head T ; aucune conversion en Licker automatique.','Griffure|Bond|Morsure')
family('shrieker','Humanoïde vocal spécialisé.','Alerte sonore et menace de proximité.','Le cri ne prouve pas des dégâts ultrasoniques pour toutes les variantes.','Contact|Cri d’alerte|Avancée')
family('whopper','Humanoïde de forte masse, identité propre à la fiche.','Pression de contact, charge ou capture.','Chef, Chunk et Whopper ne partagent pas automatiquement le même agent ni les mêmes organes.','Percussion|Prise|Avancée lourde')
family('ogroman','B.O.W. C géante au point vulnérable dorsal.','Piétinement et coups amples.','Un duel réduit ne reproduit ni l’échelle réelle ni les actions d’escalade des protagonistes.','Poing géant|Piétinement|Saisie')
family('deborah','Deborah Harper mutée avec appendices supplémentaires.','Attaques d’appendices et bonds.','Les voies ferrées et le chariot ne sont pas des armes créées par le corps.','Appendice|Griffure|Bond')
family('mendez1','Méndez, première mutation avec colonne étirée.','Griffures et grands balayages du corps.','Ne pas fusionner avec le torse détaché de la seconde phase.','Griffe|Balayage|Saisie')
family('mendez2','Torse supérieur de Méndez suspendu aux poutres.','Allonge et attaques depuis les structures.','La posture au sol est une abstraction d’essai ; les poutres et projectiles de décor restent à produire.','Griffe|Allonge|Percussion')
family('elgigante','Hôte humanoïde géant porteur d’une Plaga.','Coups, charge et capture.','La Plaga dorsale n’est pas un projectile ; objets arrachés limités au décor existant.','Poing|Piétinement|Capture')
family('novistador','Créature insectoïde mobile à plusieurs membres.','Assaut griffé et sécrétion.','Camouflage et vol doivent être propres à la variante ; pas d’invulnérabilité générique.','Griffure|Sécrétion|Bond')
family('leech-man','Cadavre recouvert et animé par des sangsues.','Poursuite et contact drainant.','Le sang de la scène sert de leurre ; pas de transformation en James Marcus.','Saisie|Contact drainant|Avancée')
family('elephant','Éléphant du zoo infecté.','Charge, piétinement et trompe.','Pas de morsure canine ni de stature humanoïde ; obstacles du zoo nécessaires à une reproduction exacte.','Trompe|Charge|Piétinement')
family('flea','Arthropode géant du métro.','Bond et contact avec les membres.','La progéniture exige des acteurs séparés ; pas de crachement automatique.','Patte|Bond|Percussion')
family('green-zombie','Zombie envahi par une végétation toxique.','Attaque de zombie et émission de spores.','Les spores ne sont pas un pouvoir spectral ; ne pas confondre Evil Shade fixe et hôte mobile.','Saisie|Frappe|Spores')
family('scissor-tail','Insecte à pince caudale.','Pince de queue venimeuse et contact mordant.','La pince n’est ni une faux humanoïde ni un tir ; venin de contact seulement.','Pince caudale|Morsure|Avancée')
family('axe-man','Poursuivant à hache de Flashback.','Assauts lourds et retours après interruption.','Pas de pouvoirs surnaturels extrapolés ; sa mort de simulation ne change pas la scène.','Hache|Coup vertical|Poursuite')
family('nyx','Masse absorbante incorporant plusieurs organismes.','Allonge et capture de matière vivante.','Absorber dans l’histoire ne donne pas accès à toutes les techniques des victimes.','Appendice|Saisie|Pression du corps')
family('tyrant','B.O.W. humanoïde massive, modèle verrouillé.','Coups et saisies puissantes.','Le modèle T-002, Thanatos, T-0400TP ou T-501 ne change pas automatiquement de forme.','Bras|Saisie|Percussion')
family('super-tyrant','Tyrant libéré ou mutant terminal propre à sa lignée.','Griffures et charge.','Conserver le nombre de bras de Thanatos-R et les excroissances de chaque modèle.','Griffe|Charge|Balayage')
family('blind-zombie','Patient infecté au visage bandé.','Recherche au son et gestes de contact.','Aucune vision omnisciente ne doit être présentée comme son comportement canonique.','Frappe à l’aveugle|Saisie|Approche')
family('commander','Chef militaire humain masqué.','Combat rapproché d’un soldat entraîné.','L’identité HUNK est une hypothèse de la source, pas un fait ajouté au dossier.','Frappe|Prise|Repositionnement')
family('context-plant','Organisme enraciné, prolongement ou structure biologique.','Zone de danger liée à son support.','Aucune marche, roulade ou prise humanoïde inventée ; rencontre contextuelle, pas combattant libre.','Activation|Menace de zone|Retrait ou neutralisation')
family('context-water','Prédateur ou organisme lié à un milieu aquatique.','Approche dans l’eau et attaque vers une cible exposée.','Nage, bateau et géométrie d’arène nécessaires ; pas de poisson marchant sur un sol sec.','Approche|Attaque aquatique|Contre-mesure de scène')
family('context-swarm','Ensemble de petits organismes ou nid.','Pression collective, obstruction ou contact.','L’entité collective ne reçoit pas artificiellement les prises et gardes d’un humanoïde.','Détection|Contact collectif|Dispersion')
family('context-cocoon','Enveloppe de métamorphose C.','Résistance avant éclosion.','Aucun coup de poing du cocon ; le futur organisme doit posséder son propre UID.','Formation|Incubation|Éclosion')
family('context-vehicle','Véhicule piloté par un personnage ou un infecté.','Poursuite ou attaque avec équipement embarqué.','Le véhicule n’est pas une B.O.W. ; aucune biologie ou régénération ne lui est attribuée.','Approche|Attaque embarquée|Éloignement')
family('context-pursuit','Menace de poursuite propre à une scène.','Traque, interception et fuite du protagoniste.','La neutralisation et la perception dépendent du lieu ; pas de victoire canonique inventée par KO.','Détection|Poursuite|Échappée')
family('context-explosion','Créature dont l’attaque implique sa rupture.','Approche et explosion au contact ou après dommages.','La mort est consommée par l’explosion ; pas d’explosions répétées sans conséquence.','Approche|Armement|Rupture')
family('context-phases','Dossier couvrant une structure géante ou plusieurs états.','Actions dépendantes de la phase de la confrontation.','Les phases doivent être séparées avant un moveset jouable ; ne pas compiler toutes les capacités dans un seul corps.','Identification de phase|Action de rencontre|Transition')
family('context-sentinel','Entité de détection ou de soutien.','Alerte ou commande d’autres sujets.','Aucune arme ou dommage sonore non documenté ; le soutien requiert d’autres acteurs.','Détection|Signal|Repositionnement')

# Incarnation-specific notes override, rather than blend, the family template.
NOTES={}
def note(ids,facts,limits='',agent=None):
 for uid in ids.split(): NOTES[uid]={'facts':facts,'limits':limits,**({'agent':agent} if agent else {})}
note('re1r-crimson-head re1r-crimson-head-prototype-1','Le Crimson Head possède une agression et des griffes distinctes du zombie initial. Le prototype de la crypte reste une rencontre identifiée.','Le lien systématique Crimson Head → Licker est une théorie, pas une transformation certifiée.')
note('re1r-forest-speyer-zombie','Forest est un ancien membre de S.T.A.R.S. infecté. Son identité est conservée séparément des zombies anonymes.','Les grenades du mode One Dangerous Zombie ne sont pas ajoutées à la variante standard.')
note('re1-forest-speyer-zombie','Cette confrontation avec Forest concerne la version Director’s Cut en mode Arranged/Advanced.','Ce n’est pas un ennemi rencontré de cette façon dans tous les modes de Resident Evil (1996).')
note('recv-anatomist-zombie','Zombie spécifique de la zone médicale de Rockfort, identifié par son apparence et sa mise en scène.','Ni Crimson Head ni Licker ; conserver le modèle Code Veronica.')
note('re3r-pale-head','La régénération rend ce sujet difficile à arrêter avec des dégâts insuffisants.','Le noyau NE-α ne lui est pas attribué ; la page source consultée ne détaille pas un répertoire complet.')
note('re1r-yawn','Le serpent du manoir est rencontré à plusieurs moments. L’empoisonnement et le recours au sérum relèvent de la première confrontation.','Le prototype est un essai de morsure ; il n’applique pas automatiquement un poison à la seconde rencontre.')
note('re1r-lisa-trevor','Lisa poursuit avec ses entraves. Les armes ordinaires servent à gagner du temps plutôt qu’à obtenir un KO définitif.','La survie et la sortie de la scène sont les objectifs de l’essai, pas l’exécution de Lisa.', 'Historique expérimental complexe — pas une infection unique simplifiée')
note('re1r-fountain-plant re1-monster-plant','Plante enracinée qui bloque un passage avec ses appendices ; la résolution passe par le dispositif de la pièce.','Pas de marche, de saut ou de garde humanoïde.')
note('re1r-plant-42 re1-plant-42','La plante occupe la résidence. Tentacules et vulnérabilités sont liés à l’organisme et à la pièce.','Le V-JOLT et les résolutions par personnage doivent rester des interactions de scénario, pas des projectiles de la plante.')
note('re2-vines','Appendices végétaux obstruant la progression du laboratoire.','Une racine ou liane n’est pas un Ivy autonome.')
note('recv-tentacle','Tentacules associés au contrôle d’Alexia dans les zones de l’installation.','L’origine précise ne doit pas être déduite du seul nom de l’entrée.')
note('recv-alexia-ashford-second-form','Seconde mutation : une masse attachée au lieu avec appendices et caractéristiques de colonie.','Ne pas lui donner le vol de la troisième forme.', 'Virus T-Veronica')
note('reoutbreak2-evil-shade','Bulbes végétaux enracinés qui libèrent un nuage dangereux.','Le nom ne désigne pas un spectre ; l’organisme ne se téléporte pas.')
note('re1r-neptune re1-neptune reoutbreak-neptune','Requin infecté dépendant de son bassin. Les conditions de l’eau déterminent la menace.','Neptune ne peut pas courir hors de l’eau ; bassin, drainage et dispositifs restent propres au scénario.')
note('re2-giant-alligator re2r-alligator reoutbreak2-alligator','Crocodilien géant rencontré dans une section aquatique ou d’égout.','Les séquences originales, remake et Outbreak ne sont pas interchangeables ; bouteille de gaz et conduite de fuite sont des éléments de scène.')
note('recv-bat','Les petits chiroptères attaquent en groupe. La lumière du briquet constitue une réponse contextuelle dans Code Veronica.','Ce comportement n’est pas importé sur la chauve-souris géante de RE0.')
note('recv-sweeper','Variante de Hunter aux griffes venimeuses.','Le venin est de contact et n’est pas un crachat à distance.')
note('recv-albinoid-infant','Jeune organisme salamandroïde capable d’un choc électrique au contact.','Le grand champ électrique du bassin adulte est exclu.', 'Virus-T')
note('recv-nosferatu','Alexander Ashford transformé : appendices d’allonge, gaz et région thoracique exposée.','Aucune pyrogénie héritée d’Alexia ; toit, chute et antidote relèvent du contexte.', 'Virus T-Veronica')
note('recv-mutated-steve','Steve transforme son corps et poursuit avec une hallebarde.','La simulation de contact ne réécrit pas sa mort scénarisée et ne certifie pas un duel normalement gagnable.', 'Virus T-Veronica')
note('recv-moth','Le papillon peut laisser une larve sur un hôte dans les couloirs antarctiques.','La ponte et sa purge nécessitent un statut dédié ; ne pas la confondre avec les poussières des autres papillons.')
note('re0-stinger','Scorpion géant occupant le train ; les pinces et les ouvertures de la carapace conditionnent l’affrontement.','La géométrie du wagon est absente du banc d’essai.')
note('re0-centurion','Le myriapode géant saisit Rebecca dans une rencontre où l’autre personnage doit intervenir.','Le mannequin du banc d’essai n’est pas une reproduction de ce sauvetage.')
note('re0-lurker','Amphibien mutant doté d’une langue permettant de capturer une victime.','Ne pas donner cette langue à chaque Hunter Gamma.')
note('re0-queen-leech re0-queen-leech-second-form','Les formes de la Reine sangsue sont liées à la colonie et à l’histoire de Marcus.','Séparer la forme initiale de la masse terminale ; lumière et ouvertures de la scène ne sont pas des statistiques officielles.')
note('reoutbreak-queen-leech','La reine sangsue d’Outbreak est un organisme propre au scénario de l’hôpital.','Ce n’est ni James Marcus ni une phase de la Reine de RE0.')
note('re2r-g-adult re2r-g-young','Il s’agit de formes de descendance G, pas de William Birkin.','Adultes et jeunes possèdent des anatomies et un rôle séparés ; aucune progression automatique vers G3.', 'Virus-G')
note('reoutbreak-g-type reoutbreak-g-embryo','Créature G propre à Outbreak ; la petite forme et le sujet développé restent deux entrées.','Ne pas récupérer les armes et phases de Birkin.', 'Virus-G')
note('re2r-ivy','Sujet humain envahi par la végétation ; les nodules et l’incinération sont essentiels à la neutralisation.','Le prototype n’implémente pas les nodules comme hitboxes spatiales ni une mort définitive par feu.')
note('re2r-g-first-form','Première mutation de Birkin, avec bras hypertrophié et objet métallique porté.','Aucun des bras supplémentaires, bonds quadrupèdes ou gueules terminales des phases suivantes.', 'Virus-G')
note('re2r-g-second-form','Deuxième mutation de Birkin dotée d’une longue griffe ; le combat utilise une grue et un conteneur.','Le conteneur n’est pas une arme intrinsèque de la créature.', 'Virus-G')
note('re2r-g-third-form','Troisième mutation de Birkin : plusieurs bras et nodules oculaires exposables.','Les interactions avec les objets du laboratoire et le ciblage des yeux restent à spatialiser.', 'Virus-G')
note('re2r-g-fourth-form','Quatrième mutation de Birkin à locomotion quadrupède, gueule et charges.','Ne pas la redresser en G3 ni fusionner les déplacements du jeu de 1998.', 'Virus-G')
note('re2-g-fifth-form re2r-g-fifth-form','Masse G terminale qui envahit le train.','Le banc d’essai réduit l’échelle et la progression ; ce n’est pas une reproduction du wagon ni de la taille réelle.', 'Virus-G')
note('re3-drain-deimos','Le Drain Deimos original utilise ses appendices pour s’accrocher et se nourrir au contact.','Pas d’implantation de larves provenant du remake.')
note('re3-brain-sucker','Brain Sucker original, distinct du Drain Deimos malgré une silhouette voisine.','Le prélèvement au contact reste distinct de l’infection larvaire de RE3 remake.')
note('re3r-drain-deimos','L’accrochage permet l’implantation parasitaire ; la purge par herbe verte appartient aux règles de la rencontre.','La prise du prototype ne simule pas encore les larves internes et leur traitement.')
note('re3r-ne-alpha-parasite','Hôte zombie parasité par NE-α, avec appendice offensif et protection de l’hôte.','Ce n’est pas une Plaga Cephalo ; pas de conversion instantanée des adversaires.', 'Virus-T / parasite NE-α')
note('re3-nemesis','Nemesis de RE3 original, manteau et lance-roquettes porté.','Aucun lance-flammes, course quadrupède ou phase du remake dans ce profil.', 'Virus-T / NE-α')
note('re3-nemesis-second-form','Seconde forme originale, contrainte du manteau perdue et allonge tentaculaire.','Pas de lance-roquettes conservé automatiquement.', 'Virus-T / NE-α')
note('re3-nemesis-third-form','Masse terminale originale de Nemesis, abordée avec le canon expérimental de la pièce.','L’arme de la pièce n’est pas une capacité biologique de Nemesis.', 'Virus-T / NE-α')
note('re3-nicholai-ginovaef-helicopter','Hélicoptère piloté par Nicholai, armement embarqué et issue dépendant de la scène.','Véhicule et pilote ne sont pas classés comme organisme mutant.', 'Aucun agent biologique attribué au véhicule')
note('re5-town-majini','Majini de Kijuju, hôte de Plagas Type 2, manipulant des outils et armes locaux.',agent='Las Plagas Type 2')
note('re5-wetlands-majini re5-giant-majini','Majini des zones humides, équipement tribal et différence de masse selon le sujet.','Le géant utilise une arme portée ; les boucliers et lances ne sont pas des organes.', 'Las Plagas Type 3')
note('re5-base-majini','Majini équipé pour le combat militaire dans les installations.','Munitions et protections relèvent de l’équipement ; aucune sécrétion biologique déduite de l’arme.')
note('re5-cephalo','Plaga crânienne révélée par l’hôte, dotée d’une allonge fouettante.','Pas de mutation Duvalia ou Kipepeo cumulée dans la même posture.')
note('re5-duvalia','Mutation de l’hôte qui expose une grande mâchoire parasitaire à la place du haut du corps.','Ne pas lui conserver une arme à feu et une tête humaine complète.')
note('re5-kipepeo','Parasite volant à quatre ailes et appendice caudal.','Ce n’est pas une chauve-souris ou un drone mécanique.')
note('re5-bui-kichwa','Petit organisme parasitaire libre, capable d’approche basse et de saisie.','Le prototype n’attribue pas une grande toile d’araignée à sa simple morphologie.')
note('re5-motorcycle-majini','Hôte monté sur une moto au cours d’une poursuite ; attaques avec équipement transporté.','Le véhicule n’acquiert pas de régénération biologique ; la poursuite exige une logique propre.')
note('rerev2-afflicted rerev2-rotten','Infectés de l’île : distinguer les Afflicted et les Rotten, leur aspect et leur état.','Ne pas déclarer une mutation Uroboros sans l’entrée correspondante.', 'Virus t-Phobos')
note('rerev2-revenant rerev2-dhurlga','Assemblages de tissus liés à Uroboros avec noyau vulnérable ; Dhurlga est un assemblage plus massif.','Le noyau reste global dans ce prototype, pas un point faible anatomique précis.', 'Uroboros')
note('rerev2-mutant-pedro','Pedro conserve une perceuse portée après transformation.','La perceuse est un outil tenu, pas un os ou un tentacule.', 'Virus t-Phobos')
note('rerev2-vulcanblubber','Sujet massif manipulant un récipient et une source incendiaire.','La flamme appartient au dispositif ; aucune pyrogénie intrinsèque n’est affirmée.')
note('rerev2-slinger','Assemblage capable de rejeter un projectile organique, avec masse centrale vulnérable.','Pas de mitrailleuse invisible ni de projectiles traversant toutes les gardes.', 'Uroboros')
note('rerev2-monster-neil','Neil muté par Uroboros, bras hypertrophié et ouverture du noyau.','Ne pas importer les bras métalliques de Wesker final.', 'Uroboros')
note('rerev2-monster-alex rerev2-monster-alex-2nd-fight','Deux confrontations d’Alex sont indexées séparément ; apparence et phase de chaque entrée restent verrouillées.','La seconde confrontation n’est pas une simple couleur du premier profil.')
note('rerev2-sploder','Organisme explosif : la rupture consomme le corps attaquant.','Le mode d’essai ne peut pas répéter gratuitement la même explosion après consommation.')
note('re4-armadura re4r-armadura re4r-armadura-strong-threat','Armure animée par une Plaga ; pas nécessairement un corps humain complet à l’intérieur.','Nombre de parasites, résistance et apparence des requêtes spéciales doivent être confirmés pour chaque variante.')
note('re4-garrador','Combattant aveugle guidé par les sons, longues griffes et parasite dorsal.','Le banc d’essai n’est pas encore une simulation de perception acoustique.')
note('re4-dr-salvador re4-bella-sisters re4r-chainsaw-villager re4r-chainsaw-sisters','Hôtes portant une tronçonneuse ; la variante des sœurs représente plusieurs adversaires dans la scène.','Un profil d’essai individuel ne prétend pas reproduire la coordination des deux sœurs.')
note('re4-jj','Hôte armé d’une mitrailleuse rotative.','Le délai de mise en régime et les munitions du banc sont des choix de gameplay ; pas des paramètres extraits.')
note('re4-jack-krauser-enemy','Krauser de RE4 original : l’entrée couvre son affrontement et l’armement biologique de la phase mutée.','Le profil expérimental privilégie le bras muté ; le duel au couteau nécessite une phase distincte.')
note('re4r-jack-krauser','Krauser du remake avant mutation complète, équipement et combat rapproché.','Ne pas lui donner les deux armes biologiques de sa forme finale.')
note('re4r-jack-krauser-mutated','Forme mutée de Krauser du remake.','La mobilité, les appendices et les défenses ne sont pas une copie de la version 2005.')
note('re4-regenerator re4r-regenerador re4r-regenerador-strong-threat','Corps régénératif abritant plusieurs parasites.','Le nombre et la position exacts des parasites ne sont pas inventés ; aucun Iron Maiden sans mutation dédiée.')
note('re7-molded-crawler','Moulé quadrupède rapide, bond et griffes.','Pas d’armes humaines ni de projection mentale d’Eveline.', 'Moisissure / E-001')
note('re7-spider','Araignées fixées aux passages et objets, créant une obstruction dangereuse.','Elles ne sont pas transformées en un poursuivant humanoïde.', 'Organismes associés à Marguerite / E-001')
note('re7-bug-swarm','Insectes produits par les nids de la vieille maison, attaquant collectivement et gênant la perception.','Le nid et les individus constituent deux rôles distincts.', 'Organismes associés à Marguerite / E-001')
note('rerev-tricorne-ooze','Ooze qui projette des éléments osseux.','Le projectile n’est ni une balle de fusil ni une boule de feu.', 'Virus T-Abyss')
note('rerev-pincer-ooze','Ooze aux appendices supérieurs coupants.','Pas de tir Tricorne sur cette variante.', 'Virus T-Abyss')
note('rerev-chunk-ooze','Ooze explosif se rompant pour attaquer.','L’explosion est terminale, pas une technique régénérable à volonté.', 'Virus T-Abyss')
note('rerev-wall-blister','Sujet dormant sur une paroi puis menaçant lorsqu’il s’active.','L’invulnérabilité de l’état dormant n’est pas permanente dans le duel de diagnostic.', 'Virus T-Abyss')
note('rerev-ghiozzo','Poisson mutant capable d’attaquer en bondissant hors de l’eau.','Cette mobilité locale ne justifie pas une marche humanoïde.', 'Virus T-Abyss')
note('rerev-fenrir rerev-black-fenrir','Loups infectés propres à Revelations, variantes de taille et de comportement.','Ce ne sont pas les chiens Cerberus des premiers jeux.', 'Virus T-Abyss')
note('rerev-scagdead','Humanoïde muté présentant une mâchoire de capture et une structure tranchante.','Ne pas transformer sa structure organique en tronçonneuse à essence.', 'Virus T-Abyss')
note('rerev-scarmiglione','Sujet blindé incorporant des caractéristiques de requin, pouvant changer de comportement après séparation.','La séparation nécessite une phase dédiée, absente du modèle monobloc.', 'Virus T-Abyss')
note('rerev-norman-mutant','Norman muté utilise des feintes perceptives et un corps offensif.','Le banc de contact ne reproduit pas l’ensemble de ses mirages et téléportations.', 'Virus T-Abyss')
note('revillage-bela-dimitrescu revillage-cassandra-dimitrescu revillage-daniela-dimitrescu','Fille Dimitrescu identifiée individuellement, avec forme humanoïde et dissipation en insectes.','Les conditions de froid de chaque pièce restent une mécanique de rencontre ; aucune invulnérabilité universelle.', 'Expérimentation Cadou / colonie d’insectes')
note('revillage-baby','Menace de la maison Beneviento liée à une expérience perceptive ambiguë.','Ne pas la certifier comme B.O.W. physique autonome ; objectif de fuite, pas de KO.', 'Nature physique non établie par cette entrée')
note('revillage-urias-drac','Variante propre à Village, distincte d’Urias et d’Urias Strajer.','Ne pas fusionner le modèle, l’armement et les résistances des trois sujets.')
note('re6-chrysalid','Enveloppe de transformation pouvant donner plusieurs organismes C, notamment Napad, Meset, Strelat ou Gnezdo.','Aucun poing du cocon ; l’éclosion choisit un descendant distinct.', 'Virus-C')
note('re6-gnezdo','Colonie d’insectes rassemblée autour d’une reine.','Une barre de densité abstraite ne remplace pas la reine comme cible spatiale.', 'Virus-C')
note('re6-oko','Organisme sentinelle utilisé pour la détection et l’alerte.','Pas de dégâts soniques inventés ni d’armes naturelles non documentées.', 'Virus-C')
note('re6-javo','Hôte C utilisant des armes ; ses mutations locales doivent être séparées par forme.','Le profil de base n’agrège pas toutes les mutations de membres.', 'Virus-C')
note('re6-carla-radames re6-derek-simmons re6-haos','Dossier de rencontre dont le corps ou la phase change fortement.','Un seul UID de catalogue ne doit pas devenir un corps possédant simultanément toutes ses transformations.', 'Virus-C')
note('reoutbreak-leech-man','Cadavre utilisé par une colonie de sangsues dans l’hôpital.','Sang, conduite de fuite et incinération dépendent de la scène, pas d’un zombie générique.')
note('reoutbreak2-stalker','Stalker désigne ici le lion mâle infecté du zoo.','Ne pas le représenter comme un humain masqué ou comme un Tyrant.')
note('reoutbreak2-zombie-hyena reoutbreak2-zombie-lioness','Fauve infecté du zoo, espèce et anatomie propres.','Le profil technique quadrupède n’autorise pas à remplacer son image par un chien.')
note('reoutbreak2-titan','Éléphant infecté du zoo.','Échelle, attaque de trompe et espace de déplacement nécessitent une vraie arène ; le banc compresse sa taille.')
note('reoutbreak2-scissor-tail','Perce-oreille mutant : queue coupante et venimeuse, bond et morsure.','Ce n’est ni un scorpion ni un Hunter.')
note('reoutbreak2-green-zombie','Zombie avec prolifération végétale associée ; émission de spores.','Ne pas réduire cette symbiose à un poison transmis par chaque coup de poing.')
note('reoutbreak2-nyx','Masse assimilante d’Outbreak File #2.','L’assimilation ne donne pas automatiquement la totalité des movesets des victimes.')
note('reoutbreak-thanatos reoutbreak-thanatos-r','Thanatos et sa forme Reborn sont indexés séparément.','Reborn ne doit pas récupérer un membre perdu par simple symétrie de sprite.')
note('reoutbreak2-tyrant reoutbreak2-tyrant-r','Deux états du Tyrant du scénario End of the Road.','La levée du contrôle est une transition scénarisée, pas une combinaison permanente de formes.')
note('rerequiem-wrenwood-zombie rerequiem-zombie-doctor rerequiem-zombie-patient rerequiem-zombie-staff-member rerequiem-zombie-cleaner','Infecté de Requiem, identifié par son lieu ou son ancien rôle.','Les habitudes, objets portés et comportements doivent être confirmés individuellement ; le prototype garde seulement le contact commun.', 'Souche de virus-T du contexte Requiem')
note('rerequiem-zombie-blind-patient','Patient dont la perception dépend des sons.','Le mannequin du laboratoire ne fournit pas une véritable IA acoustique ; ne pas afficher une audition simulée si elle n’est pas exécutée.')
note('rerequiem-chef-zombie rerequiem-zombie-singer','Sujet identifié par son rôle avant infection.','Les animations et capacités spécifiques ne sont pas intégralement décrites par la source ; ne pas ajouter une arme ou une onde sonore sur la base du nom seul.')
note('rerequiem-chunk','Sujet massif lié à des expérimentations propres à Requiem.','Ne pas en faire un Whopper de RE6 recoloré ni une mutation universelle de zombie.')
note('rerequiem-the-girl','Menace de poursuite pouvant être affaiblie temporairement par les ultraviolets.','Les armes classiques ne constituent pas un KO définitif dans l’essai ; UV n’est pas une faiblesse importée sur les autres poursuivants.')
note('rerequiem-the-children','Menaces rencontrées dans les pièces de l’orphelinat avec des interactions de dissimulation.','La page de référence fournit surtout des lieux ; pas de moveset d’attaque complet attesté.')
note('rerequiem-titan-spinner rerequiem-small-spider','Titan Spinner est le grand arachnide ; les petites araignées sont ses descendants.','Taille, course sur les parois et menaces de groupe ne sont pas transférées au petit spécimen.')
note('rerequiem-plant-43','Organisme végétal dont les appendices affectent le passage et la scène ferroviaire.','Plante enracinée ; la page de référence ne fournit pas une liste d’attaques exhaustive.')
note('rerequiem-raccoon-city-bsaa-zombie','Infecté portant un équipement BSAA, pouvant manipuler des armes.','Les chargeurs et protections sont de l’équipement ; pas une capacité de sécrétion.')
note('rerequiem-raccoon-city-chainsaw-zombie','Zombie de Raccoon City portant une tronçonneuse.','L’outil ne justifie pas l’agent Plaga des tronçonneuses de RE4.')
note('rerequiem-garmr','Canidé mutant de grande taille et rapide.','Ni une évolution garantie de tous les Cerberus ni une créature aux tentacules de Colmillos.')
note('rerequiem-the-commander','Adversaire identifié comme le Commander dans le contexte ARK/Elpis.','L’identification avec HUNK reste une hypothèse ; elle n’est pas certifiée par cette fiche.', 'Agent biologique non établi par la référence')
note('rerequiem-elite-guard','Garde équipé associé à la confrontation d’ARK.','Ne pas le transformer automatiquement en zombie ; la source de base fournit surtout l’identification.', 'Aucun agent biologique confirmé pour ce garde')
note('rerequiem-blister-head rerequiem-blister-borne rerequiem-rpd-zombie rerequiem-ark-zombie rerequiem-tyrant-t-501 rerequiem-super-tyrant-t-501 rerequiem-licker-beta2','Incarnation répertoriée dans Requiem avec une référence propre.','Le texte descriptif récolté pour cette entrée est incomplet. La classification et le profil d’essai ne constituent pas une validation de ses capacités exactes.')

# Conservative numerical sandbox. New commands are all labelled simulation.
SMALL=set('larva small-spider snake'.split())
QUAD=set('canid colmillos spider small-spider molded-crawler amphibian ghiozzo eliminator licker drain parasite-grab g4 elephant kipepeo'.split())
AIR={'crow','bat','wasp','moth','meset','kipepeo'}
GIANT={'yawn','burrower','centurion','stinger','leech-queen','g-adult','g3','g4','giant-mouth','elgigante','ogroman','dhurlga','nyx','elephant'}
RANGED={'nemesis-rocket':('projectile','explosive'),'gatling':('projectile','ballistic'),'soldier':('projectile','ballistic'),'javo':('projectile','ballistic'),'slinger':('projectile','bio'),'ooze-shooter':('projectile','bone'),'vulcanblubber':('projectile','fire'),'spear':('melee','blade'),'shrieker':('melee','strike')}
HEAL={'pale','regenerator'}
TENTACLE={'licker','cephalo','nemesis-tentacle','leech-queen','g-adult','neil','dhurlga','ooze','nyx','alex','nosferatu'}
BLADES={'hunter','sweeper','g2','g3','garrador','chainsaw','drill','armadura','krauser-mutated','krauser','halberd','plague-crawler','ooze-pincer','scagdead','scarmiglione','ubistvo','axe-man','commander'}

def pathogen(c,k):
 if NOTES.get(c['id'],{}).get('agent'):return NOTES[c['id']]['agent']
 g=c['gameKey']
 if k=='context-vehicle':return 'Véhicule / équipement — agent de l’hôte à distinguer'
 if k=='context-pursuit' and c['id']=='revillage-baby':return 'Nature physique non établie'
 if g in ['resident-evil-4','resident-evil-4-remake','resident-evil-5']:return 'Las Plagas — variante propre à la fiche'
 if g=='resident-evil-revelations':return 'Virus T-Abyss'
 if g=='resident-evil-revelations-2':return 'Uroboros' if k in {'revenant','slinger','dhurlga','neil'} else 'Virus t-Phobos — détail du sujet à confirmer'
 if g=='resident-evil-6':return 'Virus-C — état propre à la fiche'
 if g=='resident-evil-7':return 'Moisissure / E-001'
 if g=='resident-evil-village':return 'Cadou / mutamycète — mécanisme propre au sujet'
 if g=='resident-evil-requiem':return 'Agent exact à confirmer dans les documents de cette incarnation'
 if c['id'].startswith('re2') and (k.startswith('g') or k=='giant-mouth'):return 'Virus-G'
 return 'Virus-T — variante et protocole expérimental non détaillés ici'

def profile(c,k,record):
 fam=FAMILY[k];uid=c['id'];h,w=(75,82) if k in SMALL else (110,136) if k in QUAD else (120,145) if k in AIR else (315,245) if k in GIANT else (220,103)
 if uid=='re0-giant-bat':h,w=250,270
 if uid=='reoutbreak2-titan':h,w=310,285
 if k in {'tyrant','super-tyrant','whopper','napad','club'}:h,w=285,170
 names=['Frappe de contact','Saisie de diagnostic','Avancée'] if uid=='rerequiem-zombie-singer' else fam['attacks'];tag='blade' if k in BLADES else 'tentacle' if k in TENTACLE else 'bite' if k in SMALL|QUAD|{'yawn','bat','moth'} else 'strike'
 ammo=k in {'soldier','gatling','nemesis-rocket','javo'};heat=k in {'chainsaw','drill'}
 moves={}
 for i,slot in enumerate(SLOTS):
  title=[names[0]+' · contact',names[0]+' · appui',names[0]+' · ligne basse','Accrochage d’essai' if k in SMALL|AIR else 'Prise de contact d’essai',names[0]+' · signature d’essai',names[0]+' · variante basse','Avancée offensive d’essai','Recul d’essai',names[0]+' · effort maximal d’essai','Gestion de réserve d’essai'][i]
  m=dict(id=uid+'::'+slot,slot=slot,name=title,kind='melee',startup=[8,21,13,16,25,23,19,14,39,36][i],active=[4,5,4,3,5,5,7,10,7,1][i],recovery=[16,28,23,32,30,30,28,21,53,27][i],damage=[285,670,380,740,780,690,710,0,1610,0][i],reach=[85,135,115,92,195,165,120,0,230,0][i],height=max(48,min(178,h*.72)),level='low' if i in (2,5) else 'throw' if i==3 else 'mid',tag=tag,cost=[0,0,0,0,20,17,16,10,24,0][i],meter=100 if i==8 else 0,cooldown=0,
    lore='simulation',evidence='simulation',source=c['sourcePage'],loreBasis='Prototype de la famille technique '+k+' ; confronter cette commande au dossier '+uid+'. Aucune certification canonique.',adaptation='Commande d’essai originale : portée, timings, dégâts et jauges sont adaptés au moteur 2D. Les limites propres à l’incarnation sont dans sa fiche. Le profil réutilise un modèle de famille, pas les animations originales.',counterplay='Lire le démarrage et punir la récupération. Les distances et valeurs sont propres au prototype.')
  if i==3:m['tag']='grapple'
  if i==7:m.update(kind='mobility',travel=-4.2,damage=0)
  if i==6:m['travel']=4.3 if k in QUAD|AIR else 3.1
  if i in (2,5):m['height']=min(70,h*.55)
  if i in (4,6) and k in AIR|{'hunter','sweeper','eliminator','molded-crawler','g4','colmillos','canid','parasite-grab'}:m.update(launchSelf=-8,travel=4.3)
  if i==4 and k in RANGED:
   kind,tg=RANGED[k];m.update(kind=kind,tag=tg,name=('Roquette' if k=='nemesis-rocket' else 'Rafale' if k in {'gatling','soldier','javo'} else 'Projectile osseux' if k=='ooze-shooter' else 'Dispositif incendiaire' if k=='vulcanblubber' else 'Projection organique')+' · tir d’essai' if kind=='projectile' else names[0]+' · allonge d’essai')
   if kind=='projectile':m.update(speed=12,life=82,reach=800,active=1,count=3 if k in {'gatling','soldier'} else 1,interval=7,damage=230 if k in {'gatling','soldier'} else 810,cooldown=125 if k=='gatling' else 70)
  if i==4 and k in TENTACLE:m.update(reach=290,tag='tentacle',name=names[0]+' · allonge')
  if i in (0,4) and k=='sweeper':m.update(status='poison',duration=110)
  if i==4 and k=='albinoid-infant':m.update(tag='shock',status='shock',duration=42,reach=80,damage=320)
  if i==4 and k=='nosferatu':m.update(kind='projectile',tag='bio',status='poison',duration=110,speed=5,life=70,count=1,reach=330,damage=280)
  if i==9:
   if ammo:m.update(kind='reload',name='Recharge d’essai',damage=0)
   elif k in HEAL:m.update(kind='heal',name='Réassemblage limité d’essai',heal=350,cost=24,damage=0,cooldown=300,startup=44)
   else:m.update(kind='recover',restore=32,name='Refroidissement d’essai' if heat else 'Reprise de réserve d’essai',damage=0,cooldown=180)
  # Do not infer a sonic attack from the name of the Requiem Singer.
  if uid=='rerequiem-zombie-singer':m['tag']='strike';m.pop('status',None)
  moves[slot]=m
 return dict(uid=uid,id=uid,name=c['name'].upper(),ep=c['game'],source=c['game'],game=c['gameKey'],role='ESSAI · '+k.upper(),archetype='catalog-'+k,power=.72 if k in SMALL else 1.06 if k in GIANT else .95,speed=1.15 if k in QUAD|AIR else .74 if k in GIANT else .94,reach=1,color='#727e73',accent='#b5a072',
  portrait=c['portrait'],sprite=c['portrait'],reference=c['sourcePage'],spriteSource=c['sourcePage'],assetNote='Portrait de référence provisoire. Corps complet et animations propres à cette incarnation non validés.',bioAgent=record['agent'],morphology=record['anatomy'],canonicalAttacks=[],
  visual=dict(kind='quadruped' if k in QUAD else 'human',height=h,width=w,drawHeight=h,sourceFacing='front',asymmetric=True,fullBody=False,maxDrawWidth=430,weapon='none',morphology='reference'),
  fidelity=dict(status='experimental',visualIncarnation=c['game'],rule='ESSAI HORS PROGRESSION : identité verrouillée ; commandes nouvelles classées simulation.',balanceBoundary=record['boundary'],visualStatus='reference-provisional'),
  combat=dict(key='catalog_'+uid,uid=uid,role=k.upper(),resource=dict(kind='ammo' if ammo else 'heat' if heat else 'energy',label='MUNITIONS D’ESSAI' if ammo else 'CHALEUR D’ESSAI' if heat else 'RÉSERVE D’ESSAI',max=100,regen=0 if ammo else .30,reload=0),passive=dict(id='catalog_'+k,name='Contrat expérimental',desc='Aucun bonus canonique implicite. '+('Réassemblage limité et interruptible.' if k in HEAL else '')),moves=moves,links=[['light','heavy'],['heavy','special']],sources=[c['sourcePage']],canonicalAttacks=[],evidence='simulation'),boss=k in GIANT|{'tyrant','super-tyrant','krauser','krauser-mutated','norman'},experimental=True)

def main():
 d=load('data/roster.json');known={f['uid'] for f in d['fighters']};missing=[c for c in d['catalog'] if c['id'] not in known]
 mapping={};
 for k,values in GROUPS.items():
  for uid in values.split():assert uid not in mapping,uid;mapping[uid]=k
 assert set(mapping)=={c['id'] for c in missing},'Catalog changed: review assignments'
 observations=load('data/catalog-source-review-v070.json');sources={x['id']:x for x in observations};assert set(sources)==set(mapping)
 records=[];fighters=[]
 for c in missing:
  k=mapping[c['id']];f=FAMILY[k];n=NOTES.get(c['id'],{});obs=sources[c['id']];context=k.startswith('context-')
  facts=n.get('facts',f['behavior']);limits=f['limit']+' '+n.get('limits','')
  r=dict(id=c['id'],name=c['name'],game=c['game'],gameKey=c['gameKey'],family=k,classification='contextual' if context else 'experimental',agent=pathogen(c,k),anatomy=f['body'],facts=facts,
    behavior=f['behavior'],referenceActions=f['attacks'],boundary=limits.strip(),source=c['sourcePage'],sourceReview=obs,
    evidence='secondary-reference' if obs['hasDescription'] else 'index-only-review-required',portrait=c['portrait'],assetStatus='reference-provisional',
    silhouette=dict(referenceWidth=c['width'],referenceHeight=c['height'],exactWorldSize=None,animation='Not authored per move'),
    implementation=dict(dossier=True,engine='context-state-machine' if context else 'cqc-sandbox',progressionEligible=False,canonicalMovesetComplete=False,finalArt=False),
    counterplay=('Observer la phase, employer la contre-mesure disponible et atteindre la sortie. Aucun KO canonique présumé.' if context else 'Tester la portée et la récupération dans le laboratoire. Les réponses exactes du jeu d’origine restent distinctes des règles du prototype.'),
    productionRemaining=['Animation latérale par action','Validation des phases et variantes dans le jeu source','Dimensions et points faibles spatiaux','QA visuelle finale'])
  if not obs['hasDescription']:r['productionRemaining'].insert(0,'Source descriptive ou capture de gameplay à compléter')
  if c['id']=='rerequiem-zombie-singer':
   r['referenceActions']=['Comportement vocal à confirmer','Contact de diagnostic'];r['behavior']='Le prototype ne déduit pas un pouvoir sonore du seul nom du sujet.'
  if context:
   r['encounter']=dict(kind=k.removeprefix('context-'),terminalExplosion=k=='context-explosion',immobile=k in {'context-plant','context-cocoon'},uv=c['id']=='rerequiem-the-girl',canonicalResolution=False,description='Exercice abstrait de lecture de menace et d’actions de scène. Les délais, jauges et conditions de succès sont des règles de simulation, pas le scénario original.')
  else:
   pf=profile(c,k,r);fighters.append(pf);r['movesetId']=c['id'];r['moveCount']=len(pf['combat']['moves'])
  records.append(r)
 out=dict(schema='re.bow.catalog-extension/1',version='0.7.0',baseVersion='0.6.1',baseFighters=len(known),catalogScope='389 entrées du catalogue existant — non exhaustif de la franchise',counts=dict(completedRecords=len(records),experimentalFighters=len(fighters),contextualEncounters=sum(r['classification']=='contextual' for r in records),experimentalCommands=len(fighters)*10,descriptiveReferences=sum(x['hasDescription'] for x in observations),indexOnlyReferences=sum(not x['hasDescription'] for x in observations)),records=records,fighters=fighters)
 def canonical(v):
  if isinstance(v,float):return int(v) if v.is_integer() else round(v,6)
  if isinstance(v,list):return [canonical(x) for x in v]
  if isinstance(v,dict):return {k:canonical(x) for k,x in v.items()}
  return v
 out=canonical(out)
 raw=json.dumps(out,ensure_ascii=False,separators=(',',':'));out['digest']=hashlib.sha256(raw.encode()).hexdigest();save('data/catalog-expansion-v070.json',out)
 (R/'src/catalog-expansion-data.js').write_text('/* Generated; simulation profiles are isolated from progression. */\nglobalThis.RE_CATALOG_EXPANSION='+json.dumps(out,ensure_ascii=False,separators=(',',':'))+';\n',encoding='utf8')
 # Human-readable table is a production ledger, not a claim of final animation.
 md=['# Registre des 274 dossiers — v0.7.0','', 'Tous les nouveaux profils de commande sont des simulations. Les 115 combattants de progression restent inchangés.','', '| Identifiant | Sujet | Classe | Description source |','|---|---|---|---|']
 for r in records:md.append('| '+r['id']+' | '+r['name']+' | '+r['classification']+' | '+('présente' if r['sourceReview']['hasDescription'] else 'à compléter')+' |')
 (R/'docs/CATALOG_REGISTER_v0.7.0.md').write_text('\n'.join(md)+'\n',encoding='utf8')
 record_map={r['id']:r for r in records}
 def enrich(rows):
  for c in rows:
   r=record_map.get(c.get('id'))
   if r:c.update(description=r['facts']+' '+r['behavior']+' '+r['boundary'],expansionStatus=r['classification'],expansionUrl='catalog.html?id='+r['id'],sourceSupport=r['evidence'])
 enrich(d['catalog']);d['counts'].update(catalogDossiersEnriched=len(records),experimentalFighters=len(fighters),contextualEncounters=out['counts']['contextualEncounters']);save('data/roster.json',d)
 for path,key in [('data/catalog-portraits.json','catalog'),('data/missing-bosses.json','entries')]:
  data=load(path);enrich(data[key]);save(path,data)
 save('data/coverage-v070.json',{'version':'0.7.0','productionFighters':len(known),'annex':out['counts'],'dossiers':[{'id':r['id'],'status':r['classification'],'finalArt':False,'canonComplete':False,'route':'catalog.html?id='+r['id']} for r in records]})
 print(json.dumps(out['counts']))
if __name__=='__main__':main()
