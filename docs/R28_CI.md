# R28 — intégration continue

Le workflow `.github/workflows/source-fidelity-r28.yml` vérifie la livraison courante dans trois jobs : provenance, six parcours navigateur et construction statique. Il utilise Node 22.16.0, les mêmes versions de Pillow/openpyxl/Playwright/canvas que R27, et des actions épinglées à leurs commits. Les tests utilisent les sources locales livrées ; ils ne relancent ni acquisition Internet, ni génération d’images, ni rendu de nouvelles références.

## Preuves publiées et nouvelle exécution

Les constructeurs de sprites, évolutions, citations, audio et index Dossier doivent reproduire les fichiers publiés. Le résumé de validation, le suivi des dix-sept chantiers, le classeur réel, l’audit de conservation R28 et les huit groupes d’intégration sont vérifiés avant la régénération des rapports auxquels leurs empreintes sont liées.

Les sept rapports de tests Python/Node sont ensuite supprimés avant leur exécution. Les cinq suites Python passent par leurs vrais lanceurs : export, surcouche de sprites, corps sources, citations et archives audio. Le dernier lanceur est explicitement enveloppé dans `unittest` pour produire un rapport neuf à partir des succès/erreurs réels ; son module n’écrit pas lui-même de JSON. Les contrats du rendu et le moteur/replay d’évolution sont exécutés séparément, puis les assertions historiques restent actives avec `npm run verify`.

La matrice navigateur couvre la galerie, le mode d’évolution, les citations, l’audio, le suivi et le Dossier. Chaque rapport sélectionné est supprimé immédiatement après le checkout, avant l’installation des outils. Un résultat absent, vide, échoué ou ignoré fait échouer la recette. Les rapports d’échec sont copiés avant cette vérification pour conserver leurs détails et produire des annotations. Le helper d’annotations ne remplace pas le contrôle du code de sortie et de la présence du rapport.

La construction compare chaque fichier R28 exporté aux octets et empreintes du registre de livraison. Elle vérifie aussi les trois montages HTML et le classeur. Les artefacts sont les journaux et rapports réellement produits, conservés quatorze jours ; un rapport préexistant du checkout n’est pas publié comme preuve d’exécution.

## Conservation de la recette R27

L’auditeur R27 reste inchangé. Ses règles décrivent exactement la publication `0317da5f79e40af1b6b0e82b1ef9f311900ee76a`, notamment l’ajout de ses adaptateurs HTML. Le workflow R27 extrait ce commit avec `git archive` dans un dossier temporaire, initialise un index et un HEAD locaux et lit les objets Git du checkout en mode alternatif. Il exécute seulement cet ancien auditeur dans ce contexte, puis supprime le dossier. Aucun worktree n’est créé et aucun index du checkout courant n’est modifié. Les autres suites R27 continuent d’utiliser leurs sources historiques conservées.

La suite navigateur historique de sprites R27 fixe uniquement l’URL de son chargeur sur le vrai fichier R27 lors du routage des deux montages HTML courants. Toutes ses assertions et les autres scripts HTML restent actifs. Elle peut ainsi tester son manifeste R27, tandis que les suites R28 vérifient les vrais montages de production avec le chargeur R28.

La recette locale d’archive a effectivement passé l’auditeur R27 (1 295 fichiers, 1 017 783 745 octets) et ses onze groupes d’intégration. Le cas navigateur historique qui refuse une référence partielle a passé après le changement de fixture. La validation statique vérifie YAML, syntaxe Bash, blocs Python/JavaScript embarqués, chemins de commandes, matrices et épinglage des actions.

Ces contrôles locaux ne constituent pas un résultat d’exécution GitHub Actions. Les tests et la CI ne certifient ni fidélité globale 1:1, ni animations originales complètes, ni matériel physique.
