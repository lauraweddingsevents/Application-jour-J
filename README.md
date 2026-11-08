# Ma Coordo

**Le déroulé du jour J partagé en temps réel.**
Une création Laura Weddings & Events.

Ma Coordo permet à une wedding planner (ou aux mariés) de créer le déroulé d'un mariage
et d'envoyer à chaque prestataire et à chaque proche un lien personnel : il y voit ses
missions, ses horaires, et les changements en direct.

## Technologies

- **Next.js** (TypeScript) : l'application elle-même
- **Tailwind CSS** : la mise en forme (couleurs et police définies dans `src/app/globals.css`)
- **Supabase** : la base de données, la connexion par e-mail et le temps réel *(à venir)*
- **Vercel** : la mise en ligne *(à venir)*

## Lancer l'application sur un ordinateur

```bash
npm install
npm run dev
```

Puis ouvrir http://localhost:3000.

## Organisation des fichiers

- `src/app/` : les pages (une page = un dossier)
- `src/components/` : les éléments réutilisables (boutons, cartes, logo…)
- `public/icons/` : les icônes de l'application (régénérées avec `node scripts/generer-icones.mjs`)
- `docs/decisions.md` : les choix faits avec Laura pour la version 1
