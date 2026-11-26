import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { CONFIG, supabaseAdmin } from "./config";
import { envoyerEmail, type Message } from "./email";
import { envoyerPush } from "./push";
import { texteNotificationAdmin, texteNotificationCouple } from "@/lib/textesNotifications";
import { dico } from "@/lib/i18n";
import type { Langue } from "@/lib/calculs";

type Ligne = { id: number; couple_id: string | null; pour_admin: boolean; type: string; donnees: Record<string, unknown>; lien: string };
type CoupleN = { id: string; prenom_1: string; prenom_2: string; langue: Langue };
type PersonneN = { id: string; email: string; prenom: string; couple_id: string | null; role: string };

const BOUTON = { fr: "Ouvrir mon espace", en: "Open my space" };

// Envoie par e-mail et sur téléphone les notifications enregistrées par la base
export async function traiterNotifications() {
  const admin = supabaseAdmin();
  let total = 0;
  const couples = new Map<string, CoupleN | null>();
  const couple = async (id: string | null) => {
    if (!id) return null;
    if (!couples.has(id)) {
      const { data } = await admin.from("couples").select("id, prenom_1, prenom_2, langue").eq("id", id).maybeSingle();
      couples.set(id, (data as CoupleN | null) ?? null);
    }
    return couples.get(id)!;
  };
  const { data: admins } = await admin.from("personnes").select("id, email, prenom, couple_id, role").eq("role", "admin");
  const { data: reglages } = await admin.from("reglages").select("lien_avis_google, lien_avis_mariagesnet").eq("id", 1).maybeSingle();

  for (let tour = 0; tour < 10; tour++) {
    const { data, error } = await admin.rpc("prendre_notifications", { p_nombre: 25 });
    if (error) throw error;
    const lignes = (data ?? []) as Ligne[];
    if (lignes.length === 0) break;
    for (const n of lignes) {
      try {
        await envoyer(admin, n, await couple(n.couple_id), (admins ?? []) as PersonneN[], reglages);
      } catch (e) {
        console.error("Notification", n.id, n.type, e);
      }
    }
    total += lignes.length;
  }
  return total;
}

async function envoyer(admin: SupabaseClient, n: Ligne, c: CoupleN | null, admins: PersonneN[], reglages: { lien_avis_google: string; lien_avis_mariagesnet: string } | null) {
  const noms = c ? `${c.prenom_1} & ${c.prenom_2}` : "";
  const url = n.lien || "/";
  if (n.pour_admin) {
    const { titre, texte } = texteNotificationAdmin(n, noms);
    await Promise.allSettled([
      envoyerPush(admin, admins.map((a) => a.id), { titre, texte, url }),
      ...admins.map((a) => envoyerEmail(a.email, { sujet: titre, titre, paragraphes: [texte], bouton: { texte: "Ouvrir la fiche du couple", url: CONFIG.site + url } })),
    ]);
    return;
  }
  if (!c) return;
  const langue = c.langue;
  const { titre, texte } = texteNotificationCouple(n, langue);
  const { data: maries } = await admin.from("personnes").select("id, email, prenom, couple_id, role").eq("couple_id", c.id);
  const message: Message = { sujet: titre, titre, paragraphes: [texte], bouton: { texte: BOUTON[langue], url: CONFIG.site + url }, langue };
  if (n.type === "album_ouvert") {
    const ta = dico(langue).accueil;
    message.paragraphes = [ta.merciTexte, ta.avisTexte];
    message.boutons = [
      ...(reglages?.lien_avis_mariagesnet ? [{ texte: ta.avisMariagesNet, url: reglages.lien_avis_mariagesnet }] : []),
      ...(reglages?.lien_avis_google ? [{ texte: ta.avisGoogle, url: reglages.lien_avis_google }] : []),
    ];
    message.bouton = { texte: dico(langue).nav.album, url: `${CONFIG.site}/espace/album` };
  }
  const liste = (maries ?? []) as PersonneN[];
  await Promise.allSettled([
    envoyerPush(admin, liste.map((m) => m.id), { titre, texte, url }),
    ...liste.map((m) => envoyerEmail(m.email, message)),
  ]);
}

// E-mail d'invitation (création de l'espace, ou « Renvoyer le lien de connexion »)
export async function envoyerInvitations(coupleId: string) {
  const admin = supabaseAdmin();
  const { data: c } = await admin.from("couples").select("prenom_1, prenom_2, langue").eq("id", coupleId).maybeSingle();
  const { data: maries } = await admin.from("personnes").select("email, prenom").eq("couple_id", coupleId);
  if (!c) return 0;
  let envoyes = 0;
  for (const m of maries ?? []) {
    const en = c.langue === "en";
    const lien = `${CONFIG.site}/connexion?email=${encodeURIComponent(m.email)}${en ? "&lang=en" : ""}`;
    const ok = await envoyerEmail(m.email, {
      langue: c.langue,
      sujet: en ? "Your wedding space is ready" : "Votre espace mariés est prêt",
      titre: en ? `Welcome, ${m.prenom || c.prenom_1}!` : `Bienvenue, ${m.prenom || c.prenom_1} !`,
      paragraphes: en
        ? ["Your private wedding space is ready: planning progress, budget, payments, documents and much more.", "To sign in, simply enter this email address: you'll receive a sign-in link, no password needed."]
        : ["Votre espace privé est prêt : avancée de l'organisation, budget, paiements, documents et bien plus.", "Pour vous connecter, saisissez simplement cette adresse e-mail : vous recevrez un lien de connexion, sans mot de passe."],
      bouton: { texte: en ? "Open my wedding space" : "Ouvrir mon espace mariés", url: lien },
    }).catch((e) => {
      console.error("Invitation", e);
      return false;
    });
    if (ok) envoyes++;
  }
  return envoyes;
}
