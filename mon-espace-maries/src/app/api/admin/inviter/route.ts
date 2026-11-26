import { estAdminConnecte, estUuid, refus } from "@/lib/serveur/acces";
import { envoyerInvitations } from "@/lib/serveur/notifications";

// Laura : envoie (ou renvoie) l'e-mail d'invitation aux mariés d'un couple
export async function POST(requete: Request) {
  if (!(await estAdminConnecte())) return refus();
  const { couple } = await requete.json().catch(() => ({}));
  if (!estUuid(couple)) return refus("Couple invalide", 400);
  try {
    return Response.json({ envoyes: await envoyerInvitations(couple) });
  } catch (e) {
    console.error(e);
    return refus("L'e-mail n'a pas pu être envoyé.", 503);
  }
}
