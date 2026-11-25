import "server-only";
import { createClient } from "@supabase/supabase-js";
import { SITE_URL, SUPABASE_URL } from "@/lib/supabase/config";

// Réglages privés, lus dans les variables d'environnement de l'hébergeur (jamais dans le code)
export const CONFIG = {
  cleSecrete: process.env.SUPABASE_SECRET_KEY ?? "",
  smtp: {
    hote: process.env.SMTP_HOTE || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT || 465),
    utilisateur: process.env.SMTP_UTILISATEUR ?? "",
    motDePasse: process.env.SMTP_MOT_DE_PASSE ?? "",
    expediteur: process.env.EMAIL_EXPEDITEUR || `Mon Relais Presta <${process.env.SMTP_UTILISATEUR ?? ""}>`,
  },
  vapid: {
    publique: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "",
    privee: process.env.VAPID_PRIVATE_KEY ?? "",
    contact: process.env.VAPID_CONTACT || "mailto:contact@example.com",
  },
  secretTaches: process.env.TACHES_SECRET ?? "",
  site: SITE_URL.replace(/\/$/, ""),
};

// Accès complet à la base, réservé au serveur (envoi des notifications)
export function supabaseAdmin() {
  if (!CONFIG.cleSecrete) throw new Error("SUPABASE_SECRET_KEY manquante");
  return createClient(SUPABASE_URL, CONFIG.cleSecrete, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
