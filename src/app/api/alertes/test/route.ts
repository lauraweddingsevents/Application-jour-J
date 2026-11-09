import { NextResponse } from "next/server";
import { SECRET_ALERTES, alertesConfigurees, envoyer, supabaseServeurAnonyme } from "@/lib/push-serveur";

// Envoie une alerte de test au téléphone qui la demande (et à lui seul)
export async function POST(requete: Request) {
  if (!alertesConfigurees()) {
    return NextResponse.json({ erreur: "Alertes non configurées" }, { status: 503 });
  }
  const { jeton, endpoint } = (await requete.json().catch(() => ({}))) as { jeton?: string; endpoint?: string };
  if (!jeton || !endpoint) return NextResponse.json({ erreur: "Demande incomplète" }, { status: 400 });

  const { data } = await supabaseServeurAnonyme().rpc("abonnement_pour_test", {
    p_secret: SECRET_ALERTES,
    p_jeton: jeton,
    p_endpoint: endpoint,
  });
  const abonnement = (data ?? [])[0] as { endpoint: string; p256dh: string; auth: string } | undefined;
  if (!abonnement) return NextResponse.json({ erreur: "Téléphone non abonné" }, { status: 404 });

  const statut = await envoyer(abonnement, {
    titre: "Les alertes fonctionnent ✓",
    texte: "Vous serez prévenu·e avant chacun de vos moments. Belle journée !",
    url: `/j/${jeton}`,
    etiquette: "test",
  });
  return NextResponse.json({ statut }, { status: statut === "ok" ? 200 : 502 });
}
