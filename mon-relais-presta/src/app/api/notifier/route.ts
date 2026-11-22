import { traiterEvenements } from "@/lib/serveur/notifications";

// Appelé par l'application juste après une action (dépôt, « Je suis dispo »…) :
// envoie aussitôt les notifications en attente. Sans danger : il ne fait que
// vider la file des événements déjà enregistrés par la base.
export async function POST() {
  try {
    const traites = await traiterEvenements();
    return Response.json({ traites });
  } catch (e) {
    console.error(e);
    return Response.json({ erreur: "notifications indisponibles" }, { status: 503 });
  }
}
