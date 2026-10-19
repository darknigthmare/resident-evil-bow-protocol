# R9 — Six correctifs techniques et recette restante

Le classeur `BOW_PR11_CLOTURES_AUDIT_R9.xlsx` complète le P1 et la matrice R8 sans remplacer leurs inventaires. La matrice R8 est conservée à l’octet près. Il compte cinq onglets : synthèse, six correctifs, travaux ouverts, preuves R9 et sources.

## Fermeture technique
AUD-01 : clavier/focus des menus ; AUD-02 : refus Gamepad non bloquant ; AUD-03 : raccourcis corrompus normalisés ; AUD-04 : historique des conclusions réparé et crédit unique ; AUD-05 : victoire/outro expérimentale sur horloge séparée ; AUD-06 : audio suspendu et réactivable lorsqu’une page est conservée.

Ces correctifs existent au commit 28841f7bd295b50fb2bc19738afc93ca74a25baa, descendant de la PR R8 ba4e3cc82f2c9af7c7324420a0cc4409c599fd1a. Le workflow 39165523754 a exécuté les 26 régressions R9 et dix scénarios Chromium HTTP, en plus des suites historiques. Le packaging final réexécute la validation ; ses résultats font foi pour la livraison finale.

Le test audio a utilisé un vrai AudioContext et une navigation historique, mais pas une restauration BFCache réelle. Les événements persisted sont synthétiques. QA-BFCACHE et les essais sur appareils physiques restent ouverts. Certains verdicts de conclusion et les données corrompues sont explicitement préparés. Le duel CPU de contrôle de l’outro utilise le vrai moteur et termine un combat complet.

## Préservation
115 combattants principaux + 231 prototypes + 43 exercices = 389 identités. 508 ressources inchangées. Aucun nouveau dessin, clip final, répertoire canonique ou conclusion lore-compatible n’est ajouté. Les 3 830 lots globaux du P1 ne sont pas clôturés par cette passe. L’intro expérimentale reste sautée pour conserver le contrat du replay expérimental.

## Reproductibilité du fichier Excel
Le classeur a été créé et calculé avec artifact_tool. Son export comporte 20 composants XML, cinq feuilles et quatre formules dont les caches ont été vérifiés (6, 26, 10 et 8). `r9-workbook-xml.xz.b64` transporte ces composants exportés, sans les modifier. `scripts/materialize-r9-tracker.py` vérifie le SHA-256, les chemins et la taille, puis recompose un XLSX déterministe. Il ne télécharge rien et n’exécute pas de contenu du classeur.

Sources techniques consultées le 19 octobre 2026 :
- https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/
- https://developer.mozilla.org/en-US/docs/Web/API/Navigator/getGamepads
- https://developer.mozilla.org/en-US/docs/Web/API/AudioContext/suspend
- https://web.dev/articles/bfcache

PR #11 maintenue ouverte en brouillon : pas de fusion dans main, pas de promotion Vercel. Aucun nouvel upload Drive n’est revendiqué ; les restrictions de transfert antérieures ne sont pas contournées.
