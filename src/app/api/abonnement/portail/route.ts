import { NextResponse } from "next/server";
import { stripe, stripeConfigure, supabaseAdmin, utilisateurDeLaRequete } from "@/lib/stripe-serveur";

// Espace client Stripe : changer de carte, voir les factures, résilier
export async function POST(requete: Request) {
  if (!stripeConfigure()) {
    return NextResponse.json({ erreur: "Le paiement en ligne n'est pas encore activé." }, { status: 503 });
  }
  const utilisateur = await utilisateurDeLaRequete(requete);
  if (!utilisateur) return NextResponse.json({ erreur: "Merci de vous reconnecter." }, { status: 401 });
  const { data: profil } = await supabaseAdmin()
    .from("profils")
    .select("stripe_client_id")
    .eq("id", utilisateur.id)
    .maybeSingle();
  if (!profil?.stripe_client_id) return NextResponse.json({ erreur: "Aucun abonnement trouvé." }, { status: 404 });
  try {
    const session = await stripe<{ url: string }>("billing_portal/sessions", {
      customer: profil.stripe_client_id,
      return_url: `${new URL(requete.url).origin}/compte`,
      locale: "fr",
    });
    return NextResponse.json({ url: session.url });
  } catch (e) {
    console.error("Stripe :", e);
    return NextResponse.json({ erreur: "L'espace abonnement n'est pas disponible. Réessayez plus tard." }, { status: 502 });
  }
}
