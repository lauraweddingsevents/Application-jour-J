import { estAdminConnecte, estUuid, refus } from "@/lib/serveur/acces";
import { supabaseAdmin } from "@/lib/serveur/config";
import { envoyerInvitations } from "@/lib/serveur/notifications";

// Laura : envoie (ou renvoie) l'e-mail d'invitation aux mariés d'un couple, quand l'espace est prêt
export async function POST(requete: Request) {
  if (!(await estAdminConnecte())) return refus();
  const { couple } = await requete.json().catch(() => ({}));
  if (!estUuid(couple)) return refus("Couple invalide", 400);
  try {
    const envoyes = await envoyerInvitations(couple);
    if (envoyes > 0) {
      const { error } = await supabaseAdmin().from("couples").update({ invitation_envoyee_le: new Date().toISOString() }).eq("id", couple);
      if (error) console.error("Date d'invitation non enregistrée (migration 0004 exécutée ?)", error.message);
    }
    return Response.json({ envoyes });
  } catch (e) {
    console.error(e);
    return refus("L'e-mail n'a pas pu être envoyé.", 503);
  }
}
