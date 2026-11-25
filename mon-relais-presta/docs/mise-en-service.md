# Mise en service de Mon Relais Presta

## 0. Créer l'adresse Gmail de l'application
1. Créer une adresse Gmail dédiée (ex. `monrelaispresta@gmail.com` ou une variante libre).
   Elle sert à deux choses : posséder le projet Supabase et envoyer les e-mails.
2. Dans ce compte Google : Sécurité → activer la **validation en deux étapes**
   (obligatoire pour créer ensuite un « mot de passe d'application »).
3. Ranger ses identifiants en lieu sûr (gestionnaire de mots de passe).

## 1. Créer le projet Supabase (gratuit)
0. Se créer un compte Supabase **avec l'adresse Gmail de l'application** (votre compte
   habituel a déjà ses 2 projets gratuits). Ensuite, Organization settings → Team →
   « Invite member » : inviter votre adresse habituelle avec le rôle **Owner**, et accepter
   l'invitation : le projet apparaîtra aussi dans votre Supabase habituel.
1. supabase.com → « New project » → nom `mon-relais-presta`, région **Europe (Paris)**,
   choisir un mot de passe de base de données (à garder précieusement).
2. **SQL Editor** → exécuter, dans l'ordre, chaque fichier de `supabase/migrations/`
   (`0001` à `0007` : copier-coller le contenu, puis « Run »).
3. **Authentication → Sign In / Providers → Email** : laisser « Email » activé.
4. **Authentication → URL Configuration** : « Site URL » = l'adresse Vercel
   (étape 2), et ajouter `https://votre-adresse/**` dans « Redirect URLs ».
5. **Authentication → Emails** : personnaliser le modèle « Magic Link » (objet :
   « Votre lien de connexion à Mon Relais Presta »). Le code `{{ .Token }}` peut être
   ajouté dans l'e-mail pour la connexion par code.
6. **Authentication → Emails → SMTP Settings** : envoyer depuis Gmail
   (hôte `smtp.gmail.com`, port 465, identifiant = l'adresse Gmail de l'application, mot de passe =
   le mot de passe d'application « Mon Relais Presta » de l'étape 4a, nom d'expéditeur
   « Mon Relais Presta »).
   Sans cela, Supabase limite l'envoi à quelques e-mails par heure.

## 2. Créer le projet Vercel (gratuit)
1. vercel.com → « Add New → Project » → importer le dépôt GitHub `Application-jour-J`.
2. **Root Directory** : choisir `mon-relais-presta` (important : c'est ce qui sépare
   cette application de Ma Coordo).
3. **Environment Variables** :
   - `NEXT_PUBLIC_SUPABASE_URL` : Supabase → Project Settings → Data API → Project URL
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` : Supabase → Project Settings → API Keys → Publishable key
   - `NEXT_PUBLIC_SITE_URL` : l'adresse du site (ex. `https://mon-relais-presta.vercel.app`)
4. « Deploy ». Choisir le nom du projet `mon-relais-presta` pour obtenir l'adresse
   `mon-relais-presta.vercel.app`.

## 3. Devenir administratrice
1. Ouvrir l'application, se connecter avec son adresse e-mail et remplir sa fiche.
2. Supabase → SQL Editor → exécuter (en remplaçant l'adresse) :
   ```sql
   update public.membres set role = 'admin', admin_zones = '{}', statut = 'valide'
   where email = 'votre-adresse@exemple.fr';
   ```
3. Recharger l'application : le bouton « Administration » apparaît en haut.

## 3 bis. Nommer Mélanie administratrice
1. Mélanie s'inscrit dans l'application (son e-mail, sa fiche, la charte).
2. Administration → « À valider » → **Valider** son inscription.
3. Administration → « Membres » → sa fiche → **Nommer administrateur…**, puis choisir :
   - **Wedding Presta Club (PACA) uniquement** : elle valide les inscriptions, traite les
     signalements et voit les statistiques de la zone PACA seulement ;
   - ou **Toutes les zones** : mêmes droits que vous, y compris nommer d'autres administrateurs.
   Dans les deux cas, elle peut modifier la charte et la liste des métiers.
4. Elle recevra alors, comme vous, les e-mails « nouvelle inscription » et « signalement »
   de sa zone.

## 4. Notifications (e-mails, téléphone) et tâches automatiques
### 4a. Variables à ajouter dans Vercel (Settings → Environment Variables)
| Variable | Où la trouver |
|---|---|
| `SUPABASE_SECRET_KEY` | Supabase → Project Settings → API Keys → Secret key (**secret** : ne jamais la partager) |
| `SMTP_UTILISATEUR` | l'adresse Gmail de l'application (étape 0) |
| `SMTP_MOT_DE_PASSE` | un mot de passe d'application créé **depuis ce compte Gmail** (myaccount.google.com/apppasswords), nommé « Mon Relais Presta » |
| `EMAIL_EXPEDITEUR` | `Mon Relais Presta <adresse Gmail de l'application>` : les membres voient « Mon Relais Presta » comme expéditeur ; leurs éventuelles réponses arrivent dans cette boîte |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` et `VAPID_PRIVATE_KEY` | sur un ordinateur : `npx web-push generate-vapid-keys` (une seule fois ; garder la clé privée secrète) |
| `VAPID_CONTACT` | `mailto:` + votre adresse |
| `TACHES_SECRET` | une longue suite de lettres et chiffres au hasard (40 caractères) |

Puis « Redeploy » (les variables ne sont prises en compte qu'à la mise en ligne suivante).

Gmail permet environ 500 e-mails par jour : largement suffisant pour démarrer. Avec un
nom de domaine, passer à Resend (même réglages : `SMTP_HOTE=smtp.resend.com`, `SMTP_PORT=465`,
`SMTP_UTILISATEUR=resend`, `SMTP_MOT_DE_PASSE` = la clé Resend).

### 4b. Tâche automatique toutes les heures (Supabase)
Supabase → **Integrations** : activer **Cron** (pg_cron) et **pg_net**. Puis SQL Editor,
en remplaçant l'adresse et le secret (`TACHES_SECRET`) :
```sql
create extension if not exists pg_cron;
create extension if not exists pg_net;
select cron.schedule('relais-taches', '7 * * * *', $cron$
  select net.http_get(
    url := 'https://mon-relais-presta.vercel.app/api/taches',
    headers := jsonb_build_object('Authorization', 'Bearer VOTRE_SECRET_TACHES'),
    timeout_milliseconds := 60000
  );
$cron$);
```
Elle passe les demandes « Expirées », supprime les coordonnées des mariés 3 mois après le
mariage, envoie les rappels (20 h, 48 h, 15 jours) et les notifications restées en attente.
Elle maintient aussi le projet Supabase actif (un projet gratuit inactif une semaine est mis en pause).

Vérification : Supabase → SQL Editor →
`select status_code, content from net._http_response order by created desc limit 3;`
doit montrer `200` et un résumé du type `{"expirees":0,...}`.

## 5. Avant d'ouvrir aux membres (liste de vérification)
1. Avec deux adresses e-mail (la vôtre + une seconde) : inscription, validation dans
   « Administration », dépôt d'une demande, « Je suis dispo » depuis l'autre compte.
2. Vérifier la réception des e-mails (et pas dans les indésirables).
3. Sur un iPhone : ajouter à l'écran d'accueil, ouvrir depuis l'icône, Profil → « Activer
   sur ce téléphone », puis faire se positionner l'autre compte : la notification doit arriver.
4. Relire et adapter la charte (Administration → Charte).
5. Partager le lien dans les groupes WhatsApp des deux communautés.

## Les secrets (où ils sont rangés)
- Vercel → Environment Variables : `SUPABASE_SECRET_KEY`, `SMTP_MOT_DE_PASSE`,
  `VAPID_PRIVATE_KEY`, `TACHES_SECRET`.
- Supabase → la tâche planifiée contient `TACHES_SECRET`.
- Aucun secret n'est écrit dans le code ni sur GitHub.
