# R15 — Ambiances originales pour les trois salles Baker

Base de la même PR12 : `4810b5e74f97e41f0fdddcec565246fa72003b01` (R14). Cette passe avance les lignes `S-baker_garage_2017-AMB`, `S-guest_house_attic_2017-AMB` et `S-testing_area_2017-AMB` du plan P1. Elles ne sont pas clôturées en fidélité 1:1.

## Production sonore

Trois compositions stéréo originales sont effectivement synthétisées et jouées, chacune avec trois couches :

- Garage : ventilation lente, pluie sur la fenêtre à droite, résonances métalliques espacées.
- Grenier : souffle sous le toit, craquements de charpente, frottement du voilage.
- Zone d’essai : installation électrique, souffle dans les conduits, signal discret de moniteur.

Les boucles durent 12 secondes, utilisent des oscillations et du bruit périodiques déterministes et ne sollicitent pas le hasard du combat. Les trois couches s’additionnent sans normalisation différente en mode solo. Les limites numériques, les composantes stéréo et le raccord périodique sont testés. Les WAV de preuve exportent le même mix à 24 kHz / 16 bits, avant les volumes du jeu. **Ce n’est ni un enregistrement Capcom ni une reconstitution de son mix d’origine.** Aucune musique commerciale, voix, cri ou asset tiers n’est incorporé.

Les mesures automatisées ne constituent pas une validation perceptive sur enceintes/casque. La balance artistique, l’acoustique des pièces et la fidélité des sons du lieu restent ouvertes. Conseiller un volume bas et donner un arrêt immédiat ne remplace pas une recette auditive humaine.

## Intégration effective

Le système sonore partagé du Versus principal et du parent Dossiers reconnaît exactement les trois IDs R14. Les autres stages conservent les six familles génériques précédentes, vérifiées au niveau de leurs échantillons. Le module est optionnel : son absence conserve le repli précédent, pas une scène silencieusement déclarée sonorisée.

Le volume d’ambiance reste indépendant des coups/annonces et du volume général. Le son est désactivé par défaut et ne crée pas de contexte sans activation utilisateur. Pause, fin de combat, changement de salle, visibilité perdue et fermeture interrompent les nœuds. La conservation d’une page utilise le comportement de suspension R9 ; aucun BFCache réel ni appareil physique supplémentaire n’est certifié.

L’offset initial ou de reprise provient de la frame. Pendant la lecture, Web Audio avance sur sa propre horloge ; un écart supérieur à 0,25 s est corrigé par un nouveau départ à l’offset voulu. Cela ne promet pas un verrouillage acoustique échantillon par échantillon sur chaque frame. Aucun nouveau événement, dégât, collision, résultat ou contrat de replay/journal.

Un seul nœud d’ambiance est actif à la fois. Le cache retient au maximum quatre boucles stéréo R15, soit environ 18,5 Mo à 48 kHz, plus les caches d’effets historiques. Les sources sont arrêtées et déconnectées lors des changements. Les trois boucles restent composées en mémoire, sans téléchargement de média.

## Atelier stages

Le panneau R15 propose activation/désactivation, mix complet ou couche, volume et écoute isolée de 12 secondes. L’écoute isolée fonctionne avec le décor figé, même en réduction des mouvements : elle ne fait pas avancer la simulation. Sa fin automatique n’est pas relancée par un réglage de volume. Les commandes de timeline, changement de salle/recherche/couche, pause et perte de focus arrêtent cette écoute. Le téléchargement du classeur est vérifié dans le test HTTP.

Aucune préférence, progression ou récompense n’est écrite par l’atelier. Les textes de statut ne sont remplacés que lorsqu’ils changent, pour éviter une annonce d’accessibilité à chaque frame. Le son de l’essai expérimental complet et les 49 autres décors ne sont pas ajoutés par cette passe.

## Suivi et sources

`docs/planning/BOW_AMBIANCES_BAKER_R15.xlsx` : cinq onglets, trois IDs P1, neuf couches, 21 contrôles locaux et les sources/limites. Créé avec artifact_tool ; quatre formules inspectées sans erreur. Les sept classeurs antérieurs restent inchangés. Les trois lignes AMB restent EN COURS ; voix, audio fidèle des créatures/armes et sons événementiels exacts restent à produire.

Références techniques consultées le 20 octobre 2026 :
- https://developer.mozilla.org/en-US/docs/Web/API/AudioBufferSourceNode/start — offset, durée et source non réutilisable.
- https://developer.mozilla.org/en-US/docs/Web/API/AudioContext/suspend — suspension sans destruction du contexte.
- https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices — contrôle utilisateur et audio facultatif.

Aucune nouvelle référence primaire sonore Capcom n’a été relevée. Le contexte RE7 et les salles restent ceux documentés en R14 ; il ne faut pas déduire leur bande-son exacte de ces descriptions.

## Preuves et limites

21 nouveaux groupes vérifient PCM, déterminisme, mix/solo, taux borné, cache, activation, offset, pause/seek, graphes, fin, fallback, pages réelles dans le DOM contrôlé et préservation. Un Web Audio simulé observe les appels de graphe ; il n’est pas présenté comme une écoute réelle. Les tests HTTP CI utilisent un véritable AudioContext, un véritable OfflineAudioContext, des clics/clavier natifs, un match au chronomètre configuré et le XLSX téléchargé. Les nombres finaux et verdicts appartiennent aux rapports exécutés, pas à une déduction depuis ce document.

La première suite locale complète a signalé le lien du classeur alors non créé ; elle ne compte pas comme succès. Le test initial d’offset et le lookup `__proto__` ont également été corrigés avant la livraison. La navigation HTTP du Chromium local est bloquée par sa politique (`ERR_BLOCKED_BY_ADMINISTRATOR`) ; aucun contournement essayé. Le workflow normal GitHub constitue un environnement distinct de validation.

Aucun nouveau sprite, clip de personnage, mouvement ou capacité canonique. Pas de fusion main, promotion Vercel ou nouvel upload Drive impliqué par cette livraison.

La seconde chaîne locale a atteint l’export des captures R14, où la bibliothèque de repli skia-canvas renvoie une promesse là où le test historique attend un Buffer. L’installation du backend natif exact a échoué sur la résolution DNS npm. Aucun test historique n’est supprimé ou relâché pour masquer cette différence. La CI installe la dépendance prévue et revalide l’ensemble ; les 21 tests R15 sont bien passés localement séparément.
