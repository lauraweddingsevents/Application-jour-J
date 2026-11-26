# Décisions — Mon Espace Mariés

Choix validés avec Laura (cahier des charges et échanges du 26 novembre 2026).

## Principes
- Appli **gratuite**, réservée aux couples signés : seules les adresses saisies par Laura
  à la création d'un couple peuvent recevoir un lien de connexion. Aucun paiement dans l'appli.
- Nom : **Mon Espace Mariés** (au singulier).
- Téléphone **et** ordinateur : barre d'onglets en bas sur téléphone, menu latéral fixe sur
  ordinateur (à partir de 1 024 px), contenu sur deux colonnes.
- Pas de connexion à Notion. Lien avec Ma Coordo : déroulé en lecture seule.
- Tout est construit d'un coup (sections 3 à 6 du cahier des charges).

## Droits selon la formule
- **Organisation complète** : rétroplanning, budget, prestataires en lecture seule ; documents partagés par Laura.
- **Coordination** (jour J, 2 jours, 3 jours) : le couple modifie rétroplanning, budget,
  prestataires, et dépose ses devis et contrats (Laura les marque « Relu » avec un commentaire).
- Pour tous : rendez-vous, proches, questionnaire ; tâches cochées par le couple ;
  échéancier en lecture seule + « J'ai fait mon virement ».
- Changer la formule dans la fiche couple change les droits immédiatement
  (règles appliquées par la base elle-même, testées dans `supabase/tests/securite.sql`).

## Calculs
- Avancement = étapes principales « Terminé » / total. Statut d'une recherche calculé d'après ses 5 sous-étapes.
- Budget au centime : écart = réel − estimé ; budget réajusté = réel s'il est connu, sinon estimé.
- Échéancier : 6 versements au maximum ; alerte si le solde tombe moins d'un mois avant le mariage.
- Toutes les dates suivent l'heure de Paris (décompte J-X, rappels, ouverture de l'album).

## Questionnaire
- Un accès par marié. La réponse de l'autre n'est lisible qu'après avoir répondu soi-même
  (règle de la base) ; on voit seulement *que* l'autre a répondu.
- Verdicts proposés : « Vous êtes d'accord », « Des envies proches », « Deux idées qui se
  complètent », « Un équilibre à trouver » (et leur version anglaise), ou texte libre.

## Album et page invités
- QR code unique par mariage, téléchargeable (image) ou imprimable (PDF via l'impression).
- Invités sans compte, consentement obligatoire. 25 Mo par photo, 300 Mo par vidéo,
  50 fichiers par envoi, 40 Go par mariage. Les fichiers vont directement du téléphone au stockage.
- Album visible du couple le **lendemain du mariage à 10 h** ; Laura le voit toujours.
- « Tout télécharger » : archives ZIP de 400 Mo au plus.

## Ma Coordo
- Dans Ma Coordo, Laura ajoute « Les mariés » comme intervenant (catégorie proche) et colle
  son lien personnel `/j/…` dans la fiche couple. Le serveur lit le déroulé (horaires, moments,
  lieux) à chaque ouverture ; le lien n'est jamais montré aux mariés.
- Aperçu provisoire avant ; mention « version définitive » à partir d'un mois avant le mariage.

## RGPD
- Suppression automatique 6 mois après le mariage (fiche, accès, proches, documents, photos),
  par la tâche horaire. Export JSON et suppression immédiate depuis la fiche couple.
- Données et fichiers en Union européenne (Supabase Paris) ; fonctions Vercel à Paris (`vercel.json`).
- Politique de confidentialité FR/EN : `src/app/confidentialite/page.tsx` (à relire par Laura).

## Restent à fournir par Laura
- Codes couleurs exacts de la charte → `src/app/globals.css`.
- Nom de domaine du site (sous-domaine de l'appli).
- Liens d'avis Mariages.net et Google → Administration › Réglages.
- Un ou deux couples testeurs.
