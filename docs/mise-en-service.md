# Mise en service de Ma Coordo

## Ce qui est déjà en place
| Élément | Service | Coût |
|---|---|---|
| Site en ligne | Vercel (offre Hobby) | gratuit |
| Base de données, connexion, temps réel | Supabase (offre Free, région Paris) | gratuit |
| E-mails de connexion | Gmail de Laura (via Supabase) | gratuit |
| Alertes sur téléphone | Web push + tâche Supabase chaque minute | gratuit |

## Avant un vrai mariage (liste de vérification)
1. Faire un essai complet la semaine précédente avec le mariage de démonstration.
2. Vérifier que les e-mails de connexion arrivent (et pas dans les spams).
3. Envoyer les liens une semaine avant, puis un rappel la veille.
4. Le jour J : garder le téléphone chargé, et tester un « retard » de 5 minutes
   dans la matinée pour vérifier le réseau du lieu.

## Nom de domaine (ex. macoordo.fr) — environ 10 €/an
1. Acheter le domaine chez un registraire (OVHcloud, Gandi, ou directement
   dans Vercel : projet → Settings → Domains → « Buy »).
2. Vercel → projet ma-coordo → Settings → Domains → « Add » → saisir le domaine,
   puis suivre les instructions (enregistrements DNS à copier chez le registraire).
3. Supabase → Authentication → URL Configuration : remplacer la « Site URL » par
   la nouvelle adresse et ajouter `https://nouvelle-adresse/**` aux « Redirect URLs ».
4. Supabase → SQL Editor : mettre à jour l'adresse des alertes :
   `update public.reglages_prives set valeur = 'https://nouvelle-adresse/api/alertes' where cle = 'adresse_alertes';`
5. Les anciens liens en `ma-coordo.vercel.app` continuent de fonctionner.

## E-mails professionnels (avec le nom de domaine)
Remplacer Gmail par un service d'envoi professionnel, par exemple Resend
(3 000 e-mails/mois gratuits) : adresse du type `bonjour@macoordo.fr`, meilleure
arrivée en boîte de réception. Configuration dans Supabase → Authentication →
Emails → SMTP Settings.

## Quand Ma Coordo deviendra payant
- Vercel Hobby est réservé à un usage non commercial : passer à Vercel Pro
  (environ 20 $/mois) avant de facturer.
- Supabase Free suffit pour démarrer (500 Mo, 50 000 utilisateurs/mois).
  Un projet inactif plus d'une semaine peut être mis en pause : la tâche des
  alertes, qui tourne chaque minute, le maintient actif.
- Paiements (Stripe) : le champ « formule » (gratuite / couple / pro) est déjà
  prévu sur chaque compte.

## Les secrets (où ils sont rangés)
- Vercel → Settings → Environment Variables : `VAPID_PRIVATE_KEY`, `ALERTES_SECRET`
  (et les réglages publics Supabase et `NEXT_PUBLIC_VAPID_PUBLIC_KEY`).
- Supabase → table `reglages_prives` : secret et adresse des alertes.
- Gmail → mot de passe d'application « Ma Coordo » (révocable à tout moment
  sur myaccount.google.com/apppasswords).
- Aucun secret n'est écrit dans le code ni sur GitHub.
