# Décisions pour la version 1

Choix validés avec Laura, à respecter dans la suite du développement.

## Comptes et mise en ligne
- Supabase et Vercel : comptes à créer (étape 3), offres gratuites.
- Nom de domaine personnalisé souhaité (à acheter au moment de la mise en ligne).

## Intervenants
- Chaque intervenant a une **catégorie** : `prestataire` ou `proche` (témoins, famille).
- Un intervenant peut recevoir l'**accès coordination** : son lien lui permet alors de
  décaler les horaires (bouton « retard »), comme la créatrice.
- Téléphone et e-mail : visibles uniquement par la créatrice, sauf s'ils sont affichés
  dans la fiche pratique.

## Lien personnel
- « Voir tout le déroulé » : tout est visible, y compris le nom des autres intervenants.

## Fiche pratique
- Chaque élément a une visibilité : **tout le monde** ou **prestataires uniquement**.

## Alertes
- Délai par défaut réglé sur le mariage (15 min), **modifiable par chaque intervenant**
  depuis son lien.
- Niveau 1 : alerte dans la page (vibration + bandeau). Niveau 2 : notifications push
  (sur iPhone, nécessite l'ajout à l'écran d'accueil).

## Horaires
- Fuseau : Europe/Paris.
- Un moment après minuit (ex. 1 h du matin) appartient à la **même journée de mariage**.

## Mentions légales
- Éditeur : Laura Weddings & Events, SIRET 831 141 957 00033,
  laura.weddings.events@gmail.com. Adresse postale à compléter.

## Prévu plus tard (prévoir la structure)
- Modèles de déroulés, plusieurs jours, équipes / marque blanche, champ « formule »
  (paiements Stripe), vue invités, export PDF, version anglaise.

## Base de données (étape 3)
- Projet Supabase en région Europe (Paris).
- Structure dans `supabase/migrations/` (fichiers SQL à exécuter dans l'ordre dans le SQL Editor).
- Les horaires sont enregistrés en date + heure complètes. À la saisie, une heure entre
  0 h et 5 h 59 est rattachée à la nuit suivant la date du mariage.
- Les liens personnels passent par la fonction `vue_intervenant` (jamais d'accès direct
  aux tables, jamais de téléphone ni d'e-mail d'intervenant).
- Temps réel : chaque modification envoie un signal sur un canal secret propre au mariage.
