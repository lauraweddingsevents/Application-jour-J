import { CONFIG, supabaseAdmin } from "@/lib/serveur/config";
import { traiterEvenements, traiterRappels } from "@/lib/serveur/notifications";

export const maxDuration = 60;

// Tâche automatique, appelée toutes les heures par Supabase (pg_cron) :
// statut « Expirée », suppression RGPD, rappels 20 h / 48 h / 15 jours,
// et notifications restées en attente.
export async function GET(requete: Request) {
  const jeton = requete.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!CONFIG.secretTaches || jeton !== CONFIG.secretTaches) {
    return Response.json({ erreur: "non autorisé" }, { status: 401 });
  }
  const admin = supabaseAdmin();
  const [expirees, purgees] = await Promise.all([admin.rpc("expirer_demandes"), admin.rpc("purger_coordonnees")]);
  const rappels = await traiterRappels();
  const evenements = await traiterEvenements();
  return Response.json({
    expirees: expirees.data,
    coordonneesSupprimees: purgees.data,
    ...rappels,
    evenements,
    erreurs: [expirees.error?.message, purgees.error?.message].filter(Boolean),
  });
}
