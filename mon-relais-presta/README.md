# Mon Relais Presta

**L'entraide entre prestataires mariage.** Les membres de **Wedding Presta Club** (PACA) et
de **Wedding Social Hub** (Rhône-Alpes) transmettent les demandes de mariés qu'ils ne peuvent
pas prendre, et suivent ce que devient chaque demande. L'outil complète les groupes WhatsApp.

Application **indépendante** de Ma Coordo : son propre projet Supabase, son propre projet
Vercel, ses propres comptes. Elle est simplement rangée dans ce dossier du dépôt.

## Documentation
- [Mise en service](docs/mise-en-service.md) : créer Supabase et Vercel, pas à pas
- [Décisions](docs/decisions.md) : les règles de fonctionnement validées
- [Guide des membres](docs/guide-membres.md) : à partager avec les communautés

## Technologies
- **Next.js 16** (TypeScript) et **Tailwind CSS**
- **Supabase** : base de données (région Paris), connexion par lien magique, règles d'accès
- **Vercel** : hébergement (réglage « Root Directory » = `mon-relais-presta`)
- **E-mails** : Gmail (bibliothèque `nodemailer`) ; **push** : bibliothèque `web-push` et `public/sw.js`
- **Tâche horaire** : Supabase (pg_cron) appelle `/api/taches`

## Lancer sur un ordinateur
1. `cd mon-relais-presta`, copier `.env.example` sous le nom `.env.local` et le remplir.
2. `npm install` puis `npm run dev`, et ouvrir http://localhost:3000.

## Base de données
Les scripts de `supabase/migrations/` sont à exécuter dans l'ordre dans le SQL Editor de Supabase.

## Organisation des fichiers
- `src/app/` : les pages (`demandes`, `deposer`, `demande/[id]`, `mes-demandes`, `profil`, `admin`…)
- `src/components/` : éléments réutilisables (`ui/` = boutons, champs…)
- `src/lib/` : données, zones et départements, connexion à Supabase
- `public/icons/` : icônes (régénérées avec `node scripts/generer-icones.mjs`)
