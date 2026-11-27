# Mise en service de Mon Espace Mariés

Comptez environ une heure. Tout est gratuit tant que l'album photo n'est pas utilisé.

## 0. Adresse Gmail d'envoi
Utilisez l'adresse Gmail de Laura Weddings & Events (ou une adresse dédiée).
Dans ce compte Google : Sécurité → **validation en deux étapes** activée, puis
myaccount.google.com/apppasswords → créer un mot de passe d'application « Mon Espace Mariés ».

## 1. Projet Supabase (base, connexion, fichiers)
1. supabase.com → « New project » → nom `mon-espace-maries`, région **Europe (Paris)**.
   (Un compte gratuit a 2 projets : si les deux sont pris, créez le projet depuis un autre
   compte, puis invitez votre adresse habituelle comme **Owner**.)
2. **SQL Editor** → exécuter dans l'ordre le contenu de `supabase/migrations/0001_structure.sql`,
   `0002_actions_notifications.sql`, `0003_stockage.sql`, `0004_invitation_manuelle.sql`, `0005_responsable_etapes.sql` (copier-coller, puis « Run »).
3. Vous déclarer administratrice (en remplaçant l'adresse) :
   ```sql
   insert into public.personnes (role, prenom, email) values ('admin', 'Laura', 'votre-adresse@exemple.fr');
   ```
4. **Authentication → Sign In / Providers → Email** : laisser « Email » activé, et régler
   **Email OTP Expiration** sur **900** secondes (lien valable 15 minutes).
5. **Authentication → URL Configuration** : « Site URL » = l'adresse Vercel (étape 2), et
   ajouter `https://votre-adresse/**` dans « Redirect URLs ».
6. **Authentication → Emails → Templates → Magic Link** : objet « Votre lien de connexion à
   Mon Espace Mariés » ; ajouter `{{ .Token }}` dans le texte pour la connexion par code.
7. **Authentication → Emails → SMTP Settings** : hôte `smtp.gmail.com`, port 465,
   identifiant = l'adresse Gmail, mot de passe = le mot de passe d'application, expéditeur
   « Laura Weddings & Events ».
8. **Storage** : les dossiers `documents` et `album` sont créés par `0003_stockage.sql`.
   Pour l'album, passer en **Supabase Pro** (environ 25 $/mois) avant le premier mariage qui
   l'utilise, puis Storage → Settings → « Upload file size limit » = **300 MB**.
   (L'offre gratuite plafonne les fichiers à 50 Mo et le stockage à 1 Go.)

## 2. Projet Vercel (site)
1. vercel.com → « Add New → Project » → importer le dépôt `Application-jour-J`.
2. **Root Directory** : `mon-espace-maries`. Nom du projet : `mon-espace-maries`.
3. **Environment Variables** (modèle complet dans `.env.example`) :

| Variable | Où la trouver |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → Data API → Project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase → Project Settings → API Keys → Publishable key |
| `NEXT_PUBLIC_SITE_URL` | l'adresse du site, ex. `https://mon-espace-maries.vercel.app` |
| `SUPABASE_SECRET_KEY` | Supabase → API Keys → Secret key (**secret**) |
| `SMTP_UTILISATEUR`, `SMTP_MOT_DE_PASSE` | l'adresse Gmail et son mot de passe d'application |
| `EMAIL_EXPEDITEUR` | `Laura Weddings & Events <adresse Gmail>` |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` | sur un ordinateur : `npx web-push generate-vapid-keys` |
| `VAPID_CONTACT` | `mailto:` + votre adresse |
| `TACHES_SECRET` | une suite de 40 lettres et chiffres au hasard |
| `MA_COORDO_SUPABASE_URL`, `MA_COORDO_SUPABASE_PUBLISHABLE_KEY` | le projet Supabase **de Ma Coordo** : Project URL et Publishable key (clé publique) |

4. « Deploy ». Après toute modification des variables : « Redeploy ».

## 3. Tâche automatique toutes les heures
Supabase (projet Mon Espace Mariés) → Integrations : activer **Cron** et **pg_net**, puis
SQL Editor (en remplaçant l'adresse et le secret) :
```sql
create extension if not exists pg_cron;
create extension if not exists pg_net;
select cron.schedule('espace-maries-taches', '11 * * * *', $cron$
  select net.http_get(
    url := 'https://mon-espace-maries.vercel.app/api/taches',
    headers := jsonb_build_object('Authorization', 'Bearer VOTRE_SECRET_TACHES'),
    timeout_milliseconds := 60000
  );
$cron$);
```
Elle envoie les rappels (tâches à 3 jours, rendez-vous la veille), ouvre les albums le
lendemain à 10 h avec la demande d'avis, supprime les espaces 6 mois après le mariage et
envoie les notifications restées en attente. Vérification :
`select status_code, content from net._http_response order by created desc limit 3;` → `200`.

## 4. Réglages dans l'appli
1. Ouvrir l'appli, se connecter avec votre adresse : vous arrivez sur « Mes couples ».
2. **Réglages** : coller les liens d'avis Mariages.net et Google ; activer les notifications sur votre téléphone.
3. **Modèles types** : relire le rétroplanning, le budget et les questions.

## 5. Lien avec Ma Coordo (pour chaque couple)
Dans Ma Coordo, sur le mariage du couple : ajouter un intervenant « Les mariés »
(catégorie **proche**), copier son lien personnel, puis le coller dans
Mon Espace Mariés → fiche couple → « Lien Ma Coordo du déroulé ».

## 6. Avant le premier vrai couple (liste de vérification)
1. Créer un couple test par formule (Organisation complète, Coordination) avec deux de vos adresses.
2. Vérifier l'arrivée des e-mails d'invitation et de connexion (et pas dans les indésirables).
3. Avec chaque adresse : répondre au questionnaire, déclarer un virement, ajouter un rendez-vous ;
   vérifier vos alertes dans l'appli, par e-mail et sur téléphone.
4. Scanner le QR code avec un téléphone, envoyer une photo et une vidéo.
5. Relire la politique de confidentialité (`src/app/confidentialite/page.tsx`).
6. Supprimer les couples tests (fiche couple → « Supprimer maintenant »).

## Nom de domaine (plus tard)
Vercel → projet → Settings → Domains → ajouter `espace.votre-domaine.fr`, puis mettre à
jour `NEXT_PUBLIC_SITE_URL`, la « Site URL » et les « Redirect URLs » de Supabase, et
l'adresse de la tâche horaire. Les QR codes déjà imprimés gardent l'ancienne adresse
(`…vercel.app`), qui continue de fonctionner.

## Les secrets (où ils sont rangés)
- Vercel → Environment Variables : `SUPABASE_SECRET_KEY`, `SMTP_MOT_DE_PASSE`, `VAPID_PRIVATE_KEY`, `TACHES_SECRET`.
- Supabase → la tâche planifiée contient `TACHES_SECRET`.
- Aucun secret n'est écrit dans le code ni sur GitHub.
