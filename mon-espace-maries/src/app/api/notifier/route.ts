import { traiterNotifications } from "@/lib/serveur/notifications";

// Appelé par l'appli juste après une action : envoie aussitôt les notifications en attente.
// Sans danger : il ne fait que vider la file des notifications déjà enregistrées par la base.
export async function POST() {
  try {
    return Response.json({ envoyees: await traiterNotifications() });
  } catch (e) {
    console.error(e);
    return Response.json({ erreur: "notifications indisponibles" }, { status: 503 });
  }
}
