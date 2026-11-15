import { NextResponse } from "next/server";
import { signatureValide, statutDepuisStripe, stripeConfigure, stripeLire, supabaseAdmin } from "@/lib/stripe-serveur";

type AbonnementStripe = {
  id: string;
  customer: string;
  status: string;
  cancel_at_period_end: boolean;
  current_period_end?: number;
  items?: { data?: { current_period_end?: number }[] };
  metadata?: { compte?: string };
};

// Stripe prévient ici à chaque changement d'abonnement (paiement, résiliation…)
export async function POST(requete: Request) {
  if (!stripeConfigure()) return NextResponse.json({ erreur: "Non configuré" }, { status: 503 });
  const corps = await requete.text();
  if (!signatureValide(corps, requete.headers.get("stripe-signature"))) {
    return NextResponse.json({ erreur: "Signature invalide" }, { status: 400 });
  }
  const evenement = JSON.parse(corps) as { type: string; data: { object: Record<string, unknown> } };
  const admin = supabaseAdmin();

  async function enregistrer(abo: AbonnementStripe, compte?: string) {
    const fin = abo.current_period_end ?? abo.items?.data?.[0]?.current_period_end;
    const maj = {
      stripe_client_id: abo.customer,
      stripe_abonnement_id: abo.id,
      abonnement_statut: statutDepuisStripe(abo.status, abo.cancel_at_period_end),
      abonnement_fin: fin ? new Date(fin * 1000).toISOString() : null,
    };
    const id = compte ?? abo.metadata?.compte;
    const requeteMaj = admin.from("profils").update(maj);
    const { error } = id ? await requeteMaj.eq("id", id) : await requeteMaj.eq("stripe_client_id", abo.customer);
    if (error) throw error;
  }

  try {
    switch (evenement.type) {
      case "checkout.session.completed": {
        const s = evenement.data.object as { client_reference_id?: string; subscription?: string };
        if (s.subscription) {
          const abo = await stripeLire<AbonnementStripe>(`subscriptions/${s.subscription}`);
          await enregistrer(abo, s.client_reference_id);
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await enregistrer(evenement.data.object as unknown as AbonnementStripe);
        break;
    }
  } catch (e) {
    console.error("Webhook Stripe :", e);
    return NextResponse.json({ erreur: "Enregistrement impossible" }, { status: 500 });
  }
  return NextResponse.json({ recu: true });
}
