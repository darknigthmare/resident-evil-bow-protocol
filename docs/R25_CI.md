# R25 — diagnostics CI et conservation des contrôles

Les résultats distants de la PR 15 ne sont pas tous verts au début de R25.
Les workflows historiques de QA et les navigateurs R9 à R20 ont réussi, ainsi
que les statuts de déploiement. R22, R23 et R24 ont aussi des échecs dans leurs
étapes navigateur ; une autre exécution R24 a atteint la limite de 35 minutes
pendant l’installation, avant tout navigateur. Les unités, exports et contrôles
d’armatures du run R24 non annulé ont réussi.

Les API GitHub de jobs et annotations sont accessibles, mais les hôtes de
téléchargement des logs et artefacts répondent HTTP 403 via le proxy configuré.
Aucun contournement n’est tenté. Les annotations existantes disent seulement
« exit code 1 » ; elles ne prouvent pas quelle assertion a échoué. Le détail
observé figure dans [R25_CI_DIAGNOSTIC.json](R25_CI_DIAGNOSTIC.json).

Les workflows R22/R23/R24 bornent désormais l’installation des outils à dix
minutes, les requêtes npm à 60 secondes et deux reprises, et épinglent Pillow
et openpyxl aux versions locales vérifiées. Les suites navigateur R23 et R24
sont séparées en étapes nommées. Leurs assertions restent inchangées.

Le nouveau `tests/ci-report-r25.mjs` lit seulement les rapports JSON terminés
dans des dossiers QA désignés. Il publie les véritables assertions échouées en
annotations GitHub, qui restent consultables par l’API même si les logs sont
inaccessibles. Les suites absentes restent non exécutées ; elles ne reçoivent
pas un résultat réussi. Les fichiers sont bornés, les liens symboliques ignorés
et les séquences susceptibles d’injecter une commande GitHub sont échappées.

Les cinq contrôles locaux du helper réussissent : comptes exacts, erreurs
publiées, injection refusée, fichiers bornés et erreurs non détaillées conservées.
Ce diagnostic ne prétend pas réparer une assertion encore inconnue. Le résultat
du prochain run distant doit être vérifié séparément.

Le premier run avec ces annotations a précisé deux défauts du harnais.
Le contrôle R22 laissait l’horloge installée avancer pendant les échanges
d’automatisation : il pause maintenant cette horloge avant la navigation et
vérifie exactement 240 ms, soit l’image 6 à 40 ms, sans changer le lecteur.
Ses huit groupes passent dans une copie isolée.

Le contrôle R23 supposait qu’un curseur désactivé perdait immédiatement le
focus vers `BODY`. Le comportement varie suivant Chrome. Le scénario impose
maintenant sa précondition de manière contrôlée : le focus doit d’abord rester
sur le curseur désactivé ou `BODY`, puis le curseur est explicitement défocalisé
si nécessaire. Les assertions concernant Tab, le choix volontaire du focus,
son retour après chargement et la page cachée restent strictes. Les sept groupes
passent dans la copie isolée ; aucun lecteur ni fichier source n’est modifié.

Les rapports de régression sont [R25_CI_R22_REGRESSION.json](R25_CI_R22_REGRESSION.json)
et [R25_CI_R23_REGRESSION.json](R25_CI_R23_REGRESSION.json). La vérification
distante de ces corrections reste distincte de leurs résultats locaux.

Au commit `dd288ab`, les deux exécutions R22, les deux R23 et les deux R24
terminent avec **SUCCESS**. La correction des harnais R22/R23 est donc confirmée
sur GitHub. Les suites R24, y compris le stress cadencé, passent avec leurs
assertions inchangées ; cela ne prétend pas expliquer la panne R24 initiale.
Les fonctionnalités R25 non encore poussées restent à valider séparément.

Les deux statuts de déploiement Vercel du même commit échouent séparément
avec « Deployment rate limited — retry in 24 hours. » Il s’agit d’un quota
externe, distinct des workflows GitHub réussis et du build local. Aucun nouvel
essai anticipé ni changement de forfait n’est effectué.

```sh
node tests/verify-ci-report-r25.mjs
node tests/ci-report-r25.mjs qa-models-r24-browser qa-access-r24
```
