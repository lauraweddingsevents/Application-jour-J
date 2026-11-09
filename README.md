# Ma Coordo

**Le déroulé du jour J partagé en temps réel.** Une création Laura Weddings & Events.

La créatrice (wedding planner ou mariés) prépare le déroulé ; chaque prestataire
et chaque proche reçoit un lien personnel (`/j/xxxx`) : ses missions, le moment
en cours, les infos pratiques, les changements d'horaire en direct, des alertes
avant ses moments, et un affichage qui reste disponible sans réseau.

## Documentation
- [Guide de l'organisatrice](docs/guide-organisatrice.md)
- [Guide pour les prestataires et les proches](docs/guide-intervenants.md)
- [Mise en service](docs/mise-en-service.md)
- [Décisions de la version 1](docs/decisions.md)

## Technologies
- **Next.js 16** (TypeScript) et **Tailwind CSS** : l'application
- **Supabase** : base de données (région Paris), connexion par e-mail, temps réel, tâche planifiée des alertes
- **Vercel** : hébergement
- **Web push** (bibliothèque `web-push`) : notifications sur téléphone
- **Service worker** (`public/sw.js`) : fonctionnement hors connexion et réception des notifications

## Lancer l'application sur un ordinateur
1. Copier `.env.example` sous le nom `.env.local` et le remplir (jamais envoyé sur GitHub).
2. `npm install` puis `npm run dev`, et ouvrir http://localhost:3000.
3. `npm test` lance les tests des calculs d'horaires.

## Base de données
Les scripts de `supabase/migrations/` sont à exécuter dans l'ordre dans le SQL Editor de Supabase.

## Organisation des fichiers
- `src/app/` : les pages (`tableau` = mes mariages, `mariage/[id]` = un mariage, `j/[jeton]` = lien personnel, `api/alertes` = envoi des notifications)
- `src/components/` : éléments réutilisables
- `src/lib/` : données, horaires, temps réel, hors connexion, alertes
- `public/icons/` : icônes (régénérées avec `node scripts/generer-icones.mjs`)
