import { estAdminConnecte, estUuid, refus } from "@/lib/serveur/acces";
import { supabaseAdmin } from "@/lib/serveur/config";
import { supprimerCouple } from "@/lib/serveur/donnees";

export const maxDuration = 60;

// Laura : suppression immédiate de tout l'espace d'un couple
export async function POST(requete: Request) {
  if (!(await estAdminConnecte())) return refus();
  const { couple } = await requete.json().catch(() => ({}));
  if (!estUuid(couple)) return refus("Couple invalide", 400);
  try {
    await supprimerCouple(supabaseAdmin(), couple);
    return Response.json({ supprime: true });
  } catch (e) {
    console.error(e);
    return refus("La suppression n'a pas pu aboutir. Réessayez.", 500);
  }
}
