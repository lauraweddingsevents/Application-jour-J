import { NextResponse } from "next/server";
import {
  SECRET_ALERTES,
  alertesConfigurees,
  envoyer,
  heureLocale,
  supabaseServeurAnonyme,
} from "@/lib/push-serveur";

type Alerte = {
  abonnement_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  jeton: string;
  moment_id: string;
  titre: string;
  debut: string;
  lieu: string | null;
  fuseau_horaire: string;
};

// Appelé chaque minute par Supabase : envoie les alertes dues
export async function POST(requete: Request) {
  if (!alertesConfigurees()) {
    return NextResponse.json({ erreur: "Alertes non configurées" }, { status: 503 });
  }
  if (requete.headers.get("authorization") !== `Bearer ${SECRET_ALERTES}`) {
    return NextResponse.json({ erreur: "Accès refusé" }, { status: 401 });
  }

  const supabase = supabaseServeurAnonyme();
  const { data, error } = await supabase.rpc("prendre_alertes", { p_secret: SECRET_ALERTES });
  if (error) return NextResponse.json({ erreur: error.message }, { status: 500 });

  const alertes = (data ?? []) as Alerte[];
  const maintenant = Date.now();
  const resultats = await Promise.all(
    alertes.map(async (a) => {
      const minutes = Math.max(0, Math.round((new Date(a.debut).getTime() - maintenant) / 60_000));
      const quand = minutes <= 0 ? "Maintenant" : `Dans ${minutes} min`;
      const statut = await envoyer(a, {
        titre: `${quand} : ${a.titre}`,
        texte: `${heureLocale(a.debut, a.fuseau_horaire)}${a.lieu ? ` · 📍 ${a.lieu}` : ""}`,
        url: `/j/${a.jeton}`,
        etiquette: `moment-${a.moment_id}`,
      });
      if (statut === "expire") {
        await supabase.rpc("oublier_abonnement", { p_secret: SECRET_ALERTES, p_endpoint: a.endpoint });
      }
      return statut;
    }),
  );

  return NextResponse.json({
    envoyees: resultats.filter((r) => r === "ok").length,
    expirees: resultats.filter((r) => r === "expire").length,
    erreurs: resultats.filter((r) => r === "erreur").length,
  });
}
