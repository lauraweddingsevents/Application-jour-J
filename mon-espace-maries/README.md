# Mon Espace Mariés

**L'espace privé des mariés de Laura Weddings & Events.** Chaque couple suit son mariage
(avancée, budget, paiements, documents, rendez-vous, questionnaire à deux, album photo des
invités) ; Laura gère tous ses couples depuis l'administration. Sur téléphone comme sur
ordinateur (menu latéral sur grand écran), en français ou en anglais.

Application **indépendante** de Ma Coordo et de Mon Relais Presta : son propre projet
Supabase, son propre projet Vercel. Seul lien : le déroulé du jour J est lu dans Ma Coordo,
en lecture seule. Elle est simplement rangée dans ce dossier du dépôt.

## Documentation
- [Mise en service](docs/mise-en-service.md) : créer Supabase et Vercel, pas à pas
- [Décisions](docs/decisions.md) : les règles de fonctionnement validées
- Cahier des charges : le doc « Mon Espace Mariés — cahier des charges » de Laura

## Technologies
- **Next.js 16** (TypeScript) et **Tailwind CSS**
- **Supabase** (région Paris) : base de données, connexion par lien, stockage des fichiers, règles d'accès
- **Vercel** : hébergement (« Root Directory » = `mon-espace-maries`, fonctions à Paris)
- **E-mails** : Gmail (`nodemailer`) ; **téléphone** : `web-push` et `public/sw.js`
- **Tâche horaire** : Supabase (pg_cron) appelle `/api/taches`

## Lancer sur un ordinateur
1. `cd mon-espace-maries`, copier `.env.example` sous le nom `.env.local` et le remplir.
2. `npm install` puis `npm run dev`, et ouvrir http://localhost:3000.
3. `npm test` : tests des calculs (statuts, avancement, budget au centime, dates de Paris, album, Ma Coordo).
4. Tests des règles d'accès de la base (Postgres 16 local) : `supabase/tests/lancer.sh`.

## Organisation des fichiers
- `supabase/migrations/` : la base (à exécuter dans l'ordre) ; `supabase/tests/` : tests de sécurité
- `src/app/espace/` : l'espace mariés ; `src/app/admin/` : l'administration ;
  `src/app/invites/[jeton]` : la page du QR code ; `src/app/api/` : les fonctions serveur
- `src/components/espace/` : les écrans, partagés entre l'espace mariés et la fiche couple
- `src/lib/` : calculs, textes FR/EN (`i18n.ts`), notifications, accès à Supabase
- `src/app/globals.css` : **les couleurs de la charte** (un seul endroit à modifier)
