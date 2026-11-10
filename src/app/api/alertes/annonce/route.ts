import { NextResponse } from "next/server";
import { alertesConfigurees, envoyerAnnonces } from "@/lib/push-serveur";

// Appelé juste après l'envoi d'une annonce : notifie tout de suite les
// téléphones abonnés. Sans danger si quelqu'un d'autre l'appelle : une
// annonce n'est notifiée qu'une seule fois, et seulement si elle existe.
export async function POST(requete: Request) {
  if (!alertesConfigurees()) return NextResponse.json({ erreur: "Alertes non configurées" }, { status: 503 });
  const { id } = (await requete.json().catch(() => ({}))) as { id?: string };
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ erreur: "Demande incomplète" }, { status: 400 });
  return NextResponse.json(await envoyerAnnonces(id));
}
