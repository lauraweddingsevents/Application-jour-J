import { NextResponse } from "next/server";
import { PRIX_STRIPE, stripe, stripeConfigure, supabaseAdmin, utilisateurDeLaRequete } from "@/lib/stripe-serveur";

// Ouvre la page de paiement Stripe pour démarrer l'abonnement mensuel
export async function POST(requete: Request) {
  if (!stripeConfigure()) {
    return NextResponse.json({ erreur: "Le paiement en ligne n'est pas encore activé." }, { status: 503 });
  }
  const utilisateur = await utilisateurDeLaRequete(requete);
  if (!utilisateur) return NextResponse.json({ erreur: "Merci de vous reconnecter." }, { status: 401 });

  const admin = supabaseAdmin();
  const { data: param } = await admin.from("parametres_abonnement").select("paiement_actif").eq("id", 1).maybeSingle();
  if (!param?.paiement_actif) {
    return NextResponse.json({ erreur: "Le paiement en ligne n'est pas encore activé." }, { status: 503 });
  }
  const { data: profil } = await admin.from("profils").select("stripe_client_id").eq("id", utilisateur.id).maybeSingle();

  const origine = new URL(requete.url).origin;
  const parametres: Record<string, string> = {
    mode: "subscription",
    "line_items[0][price]": PRIX_STRIPE,
    "line_items[0][quantity]": "1",
    client_reference_id: utilisateur.id,
    "subscription_data[metadata][compte]": utilisateur.id,
    "metadata[compte]": utilisateur.id,
    locale: "fr",
    allow_promotion_codes: "true",
    success_url: `${origine}/compte`,
    cancel_url: `${origine}/compte`,
  };
  if (profil?.stripe_client_id) parametres.customer = profil.stripe_client_id;
  else if (utilisateur.email) parametres.customer_email = utilisateur.email;

  try {
    const session = await stripe<{ url: string }>("checkout/sessions", parametres);
    return NextResponse.json({ url: session.url });
  } catch (e) {
    console.error("Stripe :", e);
    return NextResponse.json({ erreur: "Le paiement n'a pas pu être préparé. Réessayez plus tard." }, { status: 502 });
  }
}
