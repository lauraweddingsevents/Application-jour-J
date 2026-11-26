import { CONFIG, supabaseAdmin } from "@/lib/serveur/config";
import { traiterNotifications } from "@/lib/serveur/notifications";
import { supprimerCouple } from "@/lib/serveur/donnees";

export const maxDuration = 60;

// Tâche automatique, appelée toutes les heures par Supabase (pg_cron) :
// rappels (tâches, rendez-vous), ouverture des albums, suppression RGPD à 6 mois, envois en attente.
export async function GET(requete: Request) {
  const jeton = requete.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!CONFIG.secretTaches || jeton !== CONFIG.secretTaches) return Response.json({ erreur: "non autorisé" }, { status: 401 });

  const admin = supabaseAdmin();
  const erreurs: string[] = [];
  const [taches, rdv, albums] = await Promise.all([
    admin.rpc("creer_rappels_taches"),
    admin.rpc("creer_rappels_rdv"),
    admin.rpc("creer_notifications_album"),
  ]);
  for (const r of [taches, rdv, albums]) if (r.error) erreurs.push(r.error.message);

  let supprimes = 0;
  const { data: aSupprimer, error } = await admin.rpc("couples_a_supprimer");
  if (error) erreurs.push(error.message);
  for (const id of (aSupprimer ?? []) as string[]) {
    try {
      await supprimerCouple(admin, id);
      supprimes++;
    } catch (e) {
      erreurs.push(`suppression ${id} : ${(e as Error).message}`);
    }
  }

  const envoyees = await traiterNotifications().catch((e) => {
    erreurs.push((e as Error).message);
    return 0;
  });
  return Response.json({ rappelsTaches: taches.data, rappelsRdv: rdv.data, albumsOuverts: albums.data, couplesSupprimes: supprimes, envoyees, erreurs });
}
