import { estAdminConnecte, estUuid, refus } from "@/lib/serveur/acces";
import { supabaseAdmin } from "@/lib/serveur/config";
import { exporterCouple } from "@/lib/serveur/donnees";

// Laura : téléchargement de toutes les données d'un couple (fichier JSON)
export async function GET(requete: Request) {
  if (!(await estAdminConnecte())) return refus();
  const couple = new URL(requete.url).searchParams.get("couple");
  if (!estUuid(couple)) return refus("Couple invalide", 400);
  const donnees = await exporterCouple(supabaseAdmin(), couple);
  if (!donnees.couple) return refus("Couple introuvable", 404);
  const nom = `export-${donnees.couple.prenom_1}-${donnees.couple.prenom_2}-${donnees.couple.date_mariage}`
    .normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9-]+/g, "-").toLowerCase();
  return new Response(JSON.stringify(donnees, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${nom}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
