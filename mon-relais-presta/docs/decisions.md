# Décisions — Mon Relais Presta

## Organisation
- Application **séparée** de Ma Coordo (choix de Laura) : projet Supabase, projet Vercel et
  comptes propres. Le code est rangé dans le dossier `mon-relais-presta/` du dépôt.
- Une adresse Gmail dédiée à Mon Relais Presta (créée par Laura) : elle possède le projet
  Supabase (l'offre gratuite est limitée à 2 projets par compte ; Laura y est invitée comme
  « Owner » depuis son adresse habituelle) et envoie tous les e-mails (connexion et
  notifications), avec le nom d'expéditeur « Mon Relais Presta ». Passage à un service pro (Resend) avec le nom de domaine.
- Administration : Laura (toutes les zones), puis Mélanie (Wedding Presta Club), nommée
  depuis l'application une fois son inscription validée.

## Accès
- Connexion par **lien magique** (ou code à 6 chiffres reçu dans le même e-mail).
- Inscription = fiche (nom, entreprise, métier, zone(s), départements, Instagram/site)
  + acceptation de la **charte**. Statuts : en attente → validé / refusé ; suspendu.
- Rôles : membre, administrateur. Un administrateur peut être limité à une zone
  (il ne voit et ne valide que les membres de cette zone). Seule l'administratrice
  « toutes zones » peut nommer d'autres administrateurs.
- Charte modifiable par l'administration ; chaque nouvelle version doit être
  ré-acceptée par les membres à leur visite suivante.
- L'e-mail d'un membre n'est jamais visible des autres membres (seulement de l'administration).

## Zones
- PACA (Wedding Presta Club) : 04, 05, 06, 13, 83, 84.
- Rhône-Alpes (Wedding Social Hub) : 01, 07, 26, 38, 42, 69, 73, 74.
- Affichage « 13 · Bouches-du-Rhône ».

## Demandes (étapes 2 à 4)
- Une demande = un seul métier. « Dupliquer pour un autre métier » crée une nouvelle demande
  du même « groupe » (même date, lieu, infos et coordonnées) ; un métier ne peut être
  demandé qu'une fois par mariage. Chaque demande garde ses 3 places.
- Coordonnées des mariés : table verrouillée, lisible uniquement via la fonction
  `detail_demande` par l'auteur et les prestataires positionnés (pas même l'administration).
  Il faut au moins le téléphone ou l'e-mail. La case « accord des mariés » est obligatoire.
- « Je suis dispo » : case d'engagement obligatoire ; 3 positionnés au maximum (contrôle
  dans la base, avec verrou : deux clics simultanés ne peuvent pas dépasser la limite).
  « Complète » = 3 positionnés sur une demande Ouverte/Transmise (calculé, non enregistré).
- Le 1er positionnement fait passer la demande en « Transmise ». Si tous les positionnés
  se retirent, elle redevient « Ouverte ».
- Le métier ne peut plus être modifié une fois quelqu'un positionné (annuler et redéposer).
- L'auteur voit les positionnés (nom, entreprise, message, e-mail) ; les autres membres
  voient seulement le nombre.
- Mode « je transmets moi-même » : compte à rebours de 24 h pour chaque positionné,
  bouton « J'ai reçu les coordonnées » pour le prestataire.
- Statuts : Ouverte → Transmise → Signée / Non signée (l'auteur peut revenir en arrière).
  En « Signée », l'auteur peut indiquer avec quel prestataire (sert aux statistiques).
  « Expirée » : demande encore Ouverte dont la date est passée. Une demande Transmise dont
  la date est passée reste Transmise (rappel à 15 jours pour indiquer Signée / Non signée).
- Annulation : les coordonnées sont effacées aussitôt, les positionnés sont prévenus.

## Profils et signalements (étape 5)
- Compteur de réciprocité : « données » = demandes déposées (hors annulées) ;
  « reçues » = demandes sur lesquelles le membre s'est positionné (sans s'être retiré).
  Les mariages signés grâce à la communauté sont affichés en plus.
- « Signaler un abus » sur chaque demande et chaque profil : confidentiel, visible
  seulement de l'administration (de la zone concernée), qui peut retirer la demande,
  suspendre le membre, et marquer le signalement comme traité.

## Notifications (étape 6)
- Chaque action enregistre un « événement » dans la base ; le serveur (`/api/notifier`)
  les envoie aussitôt (e-mail + push), et la tâche horaire (`/api/taches`) rattrape ceux
  qui seraient restés en attente.
- Nouvelle demande : membres validés du même métier qui couvrent le département
  (un seul e-mail en copie cachée).
- Positionnement : l'auteur (« X est dispo », + rappel des 24 h en mode « je transmets ») et
  le prestataire (« demande transmise »). Retrait : l'auteur. Modification / annulation :
  les positionnés. Inscription et signalement : l'administration de la zone. Validation : le membre.
- Tâche horaire : demandes « Expirées », suppression RGPD des coordonnées (3 mois après le
  mariage), rappel 20 h (coordonnées non reçues), relance 48 h sans positionnement (bouton
  WhatsApp pré-rempli), rappel 15 jours après transmission (signée ou non ?).
- Chaque membre peut couper les e-mails et/ou les push dans « Mon profil ».
- Les e-mails ne contiennent jamais les coordonnées des mariés (seulement un lien).
