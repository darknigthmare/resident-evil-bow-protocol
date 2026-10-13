# Sources et périmètre — contacts et reprise v0.7.3

Sources primaires de cycle de vie consultées le 13 octobre 2026 :
- MDN, Window/pageshow_event : https://developer.mozilla.org/en-US/docs/Web/API/Window/pageshow_event
- MDN, Window/pagehide_event : https://developer.mozilla.org/fr/docs/Web/API/Window/pagehide_event
- MDN, Window/requestAnimationFrame : https://developer.mozilla.org/fr/docs/Web/API/Window/requestAnimationFrame

Ces sources décrivent les événements et le rythme de rendu du navigateur, pas le lore de Resident Evil. Les tests de page persistée déclenchent des événements synthétiques ; aucun retour réel de cache Safari ou téléphone physique n'est certifié.

Les corrections de contacts viennent de reproductions sur le moteur livré : un projectile peut traverser entièrement une cible au retour pendant une seule frame ; une boîte critique plus profonde ne doit pas être touchée après arrêt au premier corps. Les coordonnées et multiplicateurs restent des règles de jeu originales, pas des valeurs extraites de Capcom.

Aucune nouvelle capacité canonique n'est attribuée. Les 115 combattants principaux, 231 prototypes de l'annexe, 43 exercices abstraits et données du journal sont préservés. L'audit primaire exhaustif et les sprites/animations définitifs restent des travaux séparés.
