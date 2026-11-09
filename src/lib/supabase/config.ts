// Lit la configuration depuis le fichier .env.local (en local) ou depuis
// les réglages de l'hébergeur (en ligne). Aucune clé n'est écrite dans le code.
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_CLE_PUBLIQUE =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

if (!SUPABASE_URL || !SUPABASE_CLE_PUBLIQUE) {
  console.warn(
    "Configuration Supabase manquante : copiez .env.example en .env.local et remplissez-le.",
  );
}
