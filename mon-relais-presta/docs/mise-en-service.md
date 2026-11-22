# Mise en service de Mon Relais Presta

## 1. Créer le projet Supabase (gratuit)
1. supabase.com → « New project » → nom `mon-relais-presta`, région **Europe (Paris)**,
   choisir un mot de passe de base de données (à garder précieusement).
2. **SQL Editor** → exécuter, dans l'ordre, chaque fichier de `supabase/migrations/`
   (copier-coller le contenu, puis « Run »).
3. **Authentication → Sign In / Providers → Email** : laisser « Email » activé.
4. **Authentication → URL Configuration** : « Site URL » = l'adresse Vercel
   (étape 2), et ajouter `https://votre-adresse/**` dans « Redirect URLs ».
5. **Authentication → Emails** : personnaliser le modèle « Magic Link » (objet :
   « Votre lien de connexion à Mon Relais Presta »). Le code `{{ .Token }}` peut être
   ajouté dans l'e-mail pour la connexion par code.
6. **Authentication → Emails → SMTP Settings** : envoyer depuis Gmail
   (hôte `smtp.gmail.com`, port 465, identifiant = l'adresse Gmail, mot de passe =
   un mot de passe d'application créé sur myaccount.google.com/apppasswords).
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
