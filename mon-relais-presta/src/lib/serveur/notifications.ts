import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { CONFIG, supabaseAdmin } from "./config";
import { envoyerEmail, type Message } from "./email";
import { envoyerPush } from "./push";
import { dateCourte, lienWhatsApp, messageWhatsApp } from "@/lib/demandes";
import { libelleDepartement } from "@/lib/zones";

type MembreN = {
  id: string;
  email: string;
  nom: string;
  statut: string;
  role: string;
  admin_zones: string[];
  zones: string[];
  metier_id: number | null;
  departements: string[];
  notif_email: boolean;
  notif_push: boolean;
};
type DemandeN = {
  id: string;
  auteur_id: string;
  date_mariage: string;
  departement: string;
  lieu: string;
  metier_id: number;
  invites: number;
  budget: number | null;
  note: string;
  mode_coordonnees: string;
  statut: string;
};
type Evenement = { id: number; type: string; demande_id: string | null; membre_id: string | null; donnees: Record<string, unknown> };

const COL_MEMBRE = "id, email, nom, statut, role, admin_zones, zones, metier_id, departements, notif_email, notif_push";
const COL_DEMANDE = "id, auteur_id, date_mariage, departement, lieu, metier_id, invites, budget, note, mode_coordonnees, statut";

class Contexte {
  private metiers = new Map<number, string>();
  constructor(public admin: SupabaseClient) {}

  async charger() {
    const { data } = await this.admin.from("metiers").select("id, nom");
    for (const m of data ?? []) this.metiers.set(m.id, m.nom);
  }
  metier(id: number | null) {
    return (id != null && this.metiers.get(id)) || "Prestataire";
  }
  async membre(id: string | null) {
    if (!id) return null;
    const { data } = await this.admin.from("membres").select(COL_MEMBRE).eq("id", id).maybeSingle();
    return data as MembreN | null;
  }
  async demande(id: string | null) {
    if (!id) return null;
    const { data } = await this.admin.from("demandes").select(COL_DEMANDE).eq("id", id).maybeSingle();
    return data as DemandeN | null;
  }
  async positionnesActifs(demandeId: string) {
    const { data } = await this.admin.from("positionnements").select("membre_id").eq("demande_id", demandeId).is("retire_le", null);
    const ids = (data ?? []).map((p) => p.membre_id as string);
    if (ids.length === 0) return [];
    const { data: m } = await this.admin.from("membres").select(COL_MEMBRE).in("id", ids);
    return (m ?? []) as MembreN[];
  }
  async admins(zones: string[]) {
    const { data } = await this.admin.from("membres").select(COL_MEMBRE).eq("role", "admin").eq("statut", "valide");
    return ((data ?? []) as MembreN[]).filter((a) => a.admin_zones.length === 0 || a.admin_zones.some((z) => zones.includes(z)));
  }

  // Résumé d'une demande pour les messages
  resume(d: DemandeN) {
    return `${this.metier(d.metier_id)} · ${dateCourte(d.date_mariage)} · ${d.lieu} (${d.departement})`;
  }
  lien(d: { id: string }) {
    return `${CONFIG.site}/demande/${d.id}`;
  }

  // Envoie e-mail + push, en respectant les choix de chaque membre
  async notifier(destinataires: (MembreN | null)[], m: Message, push: { titre: string; texte: string; url: string }, diffusion = false) {
    const valides = destinataires.filter((x): x is MembreN => !!x && x.statut === "valide");
    const emails = valides.filter((x) => x.notif_email).map((x) => x.email);
    const pushs = valides.filter((x) => x.notif_push).map((x) => x.id);
    const envois: Promise<unknown>[] = [envoyerPush(this.admin, pushs, push)];
    if (diffusion) envois.push(envoyerEmail(emails, m));
    else for (const e of emails) envois.push(envoyerEmail([e], m));
    const resultats = await Promise.allSettled(envois);
    for (const r of resultats) if (r.status === "rejected") console.error("Notification non envoyée :", r.reason);
  }
}

// ---------------- Événements (actions des membres) ----------------
async function traiterEvenement(c: Contexte, e: Evenement) {
  switch (e.type) {
    case "nouvelle_demande": {
      const d = await c.demande(e.demande_id);
      if (!d || d.statut !== "ouverte") return;
      const { data } = await c.admin
        .from("membres")
        .select(COL_MEMBRE)
        .eq("statut", "valide")
        .eq("metier_id", d.metier_id)
        .contains("departements", [d.departement])
        .neq("id", d.auteur_id);
      const auteur = await c.membre(d.auteur_id);
      await c.notifier(
        (data ?? []) as MembreN[],
        {
          sujet: `Nouvelle demande : ${c.resume(d)}`,
          titre: `Une demande pour vous : ${c.metier(d.metier_id)}`,
          paragraphes: [
            `📅 ${dateCourte(d.date_mariage)}`,
            `📍 ${d.lieu} · ${libelleDepartement(d.departement)}`,
            `👥 ${d.invites} invités${d.budget != null ? ` · budget ${d.budget.toLocaleString("fr-FR")} €` : ""}`,
            d.note ? `« ${d.note} »` : "",
            `Transmise par ${auteur?.nom ?? "un membre"}. 3 prestataires au maximum peuvent se positionner.`,
          ].filter(Boolean),
          bouton: { texte: "Voir la demande", url: c.lien(d) },
        },
        { titre: `Nouvelle demande · ${c.metier(d.metier_id)}`, texte: `${dateCourte(d.date_mariage)} · ${d.lieu} (${d.departement})`, url: `/demande/${d.id}` },
        true,
      );
      return;
    }

    case "positionnement": {
      const d = await c.demande(e.demande_id);
      const presta = await c.membre(e.membre_id);
      if (!d || !presta) return;
      const auteur = await c.membre(d.auteur_id);
      const parAuteur = d.mode_coordonnees === "par_auteur";
      const premier = Boolean(e.donnees?.premier);
      // À l'auteur : quelqu'un est dispo
      await c.notifier(
        [auteur],
        {
          sujet: `${presta.nom} est dispo pour votre demande ${c.metier(d.metier_id)} du ${dateCourte(d.date_mariage)}`,
          titre: `${presta.nom} est dispo !`,
          paragraphes: [
            `Pour votre demande : ${c.resume(d)}.`,
            premier ? "Votre demande est maintenant transmise." : "",
            typeof e.donnees?.message === "string" && e.donnees.message ? `« ${e.donnees.message} »` : "",
            parAuteur
              ? `⏳ Vous avez choisi de transmettre vous-même les coordonnées des mariés : vous avez 24 h pour les envoyer à ${presta.nom} (${presta.email}).`
              : "Les coordonnées des mariés lui sont maintenant visibles.",
          ].filter(Boolean),
          bouton: { texte: "Voir la demande", url: c.lien(d) },
        },
        { titre: `${presta.nom} est dispo`, texte: parAuteur ? "Transmettez-lui les coordonnées sous 24 h" : c.resume(d), url: `/demande/${d.id}` },
      );
      // Au prestataire : demande transmise
      await c.notifier(
        [presta],
        {
          sujet: `Demande transmise : ${c.resume(d)}`,
          titre: "La demande vous est transmise",
          paragraphes: [
            `${c.resume(d)}.`,
            parAuteur
              ? `${auteur?.nom ?? "L'auteur"} vous transmet les coordonnées des mariés sous 24 h. Dès réception, confirmez-le dans l'application (« J'ai reçu les coordonnées »).`
              : "Les coordonnées des mariés sont disponibles dans l'application. Merci de les contacter rapidement, au nom de la communauté.",
          ],
          bouton: { texte: "Ouvrir la demande", url: c.lien(d) },
        },
        { titre: "Demande transmise", texte: c.resume(d), url: `/demande/${d.id}` },
      );
      return;
    }

    case "retrait": {
      const d = await c.demande(e.demande_id);
      const presta = await c.membre(e.membre_id);
      if (!d || !presta) return;
      await c.notifier(
        [await c.membre(d.auteur_id)],
        {
          sujet: `${presta.nom} s'est retiré de votre demande ${c.metier(d.metier_id)}`,
          titre: `${presta.nom} n'est plus disponible`,
          paragraphes: [`Pour votre demande : ${c.resume(d)}.`, "Sa place est libérée : un autre membre peut se positionner."],
          bouton: { texte: "Voir la demande", url: c.lien(d) },
        },
        { titre: `${presta.nom} s'est retiré`, texte: c.resume(d), url: `/demande/${d.id}` },
      );
      return;
    }

    case "demande_modifiee":
    case "demande_annulee": {
      const d = await c.demande(e.demande_id);
      if (!d) return;
      const annulee = e.type === "demande_annulee";
      await c.notifier(
        await c.positionnesActifs(d.id),
        {
          sujet: `${annulee ? "Demande annulée" : "Demande modifiée"} : ${c.resume(d)}`,
          titre: annulee ? "Une demande sur laquelle vous êtes positionné(e) est annulée" : "Une demande sur laquelle vous êtes positionné(e) a été modifiée",
          paragraphes: [
            `${c.resume(d)}.`,
            annulee ? "Vous n'avez plus rien à faire pour cette demande." : "Vérifiez les nouvelles informations (date, lieu, nombre d'invités…).",
          ],
          bouton: { texte: "Voir la demande", url: c.lien(d) },
        },
        { titre: annulee ? "Demande annulée" : "Demande modifiée", texte: c.resume(d), url: `/demande/${d.id}` },
      );
      return;
    }

    case "inscription": {
      const m = await c.membre(e.membre_id);
      if (!m || m.statut !== "en_attente") return;
      await c.notifier(
        await c.admins(m.zones),
        {
          sujet: `Nouvelle inscription à valider : ${m.nom}`,
          titre: "Nouvelle inscription à valider",
          paragraphes: [`${m.nom} · ${c.metier(m.metier_id)}`, `Départements : ${m.departements.map(libelleDepartement).join(", ")}`],
          bouton: { texte: "Valider les inscriptions", url: `${CONFIG.site}/admin` },
        },
        { titre: "Inscription à valider", texte: m.nom, url: "/admin" },
      );
      return;
    }

    case "membre_valide": {
      const m = await c.membre(e.membre_id);
      if (!m) return;
      await c.notifier(
        [m],
        {
          sujet: "Bienvenue sur Mon Relais Presta : votre inscription est validée",
          titre: `Bienvenue, ${m.nom.split(" ")[0]} !`,
          paragraphes: [
            "Votre inscription est validée. Vous pouvez dès maintenant transmettre les demandes de mariés que vous ne pouvez pas prendre, et vous positionner sur celles des autres membres.",
            "Astuce : ajoutez l'application sur l'écran d'accueil de votre téléphone pour recevoir les notifications.",
          ],
          bouton: { texte: "Ouvrir Mon Relais Presta", url: `${CONFIG.site}/demandes` },
        },
        { titre: "Inscription validée", texte: "Bienvenue sur Mon Relais Presta !", url: "/demandes" },
      );
      return;
    }

    case "signalement": {
      const auteur = await c.membre(e.membre_id);
      const { data: s } = await c.admin.from("signalements").select("id, cible, demande_id, membre_id, motif").eq("id", Number(e.donnees?.signalement)).maybeSingle();
      if (!s) return;
      let zones: string[] = [];
      if (s.demande_id) {
        const d = await c.demande(s.demande_id);
        const { data: dep } = await c.admin.from("departements").select("zone").eq("code", d?.departement ?? "").maybeSingle();
        zones = dep ? [dep.zone] : [];
      } else zones = (await c.membre(s.membre_id))?.zones ?? [];
      await c.notifier(
        await c.admins(zones),
        {
          sujet: "Nouveau signalement sur Mon Relais Presta",
          titre: "Un membre a signalé un abus",
          paragraphes: [`Signalé par ${auteur?.nom ?? "un membre"} (${s.cible === "demande" ? "une demande" : "un profil"}).`, `« ${s.motif} »`],
          bouton: { texte: "Voir les signalements", url: `${CONFIG.site}/admin` },
        },
        { titre: "Nouveau signalement", texte: s.motif.slice(0, 80), url: "/admin" },
      );
      return;
    }
  }
}

export async function traiterEvenements() {
  const admin = supabaseAdmin();
  const c = new Contexte(admin);
  await c.charger();
  let total = 0;
  for (let tour = 0; tour < 10; tour++) {
    const { data, error } = await admin.rpc("prendre_evenements", { p_nombre: 25 });
    if (error) throw error;
    const evenements = (data ?? []) as Evenement[];
    if (evenements.length === 0) break;
    for (const e of evenements) {
      try {
        await traiterEvenement(c, e);
      } catch (err) {
        console.error("Événement", e.id, e.type, err);
      }
    }
    total += evenements.length;
  }
  return total;
}

// ---------------- Rappels automatiques (toutes les heures) ----------------
export async function traiterRappels() {
  const admin = supabaseAdmin();
  const c = new Contexte(admin);
  await c.charger();
  const compte = { rappels20h: 0, relances48h: 0, rappels15j: 0 };

  // 1. 20 h après un positionnement, coordonnées pas encore reçues (mode « je transmets moi-même »)
  const { data: r20 } = await admin.rpc("prendre_rappels_20h");
  for (const r of (r20 ?? []) as { demande_id: string; auteur_id: string; membre_id: string }[]) {
    const [d, presta] = [await c.demande(r.demande_id), await c.membre(r.membre_id)];
    if (!d || !presta) continue;
    compte.rappels20h++;
    await c.notifier(
      [await c.membre(r.auteur_id)],
      {
        sujet: `Rappel : transmettez les coordonnées des mariés à ${presta.nom}`,
        titre: "Plus que 4 h pour transmettre les coordonnées",
        paragraphes: [
          `${presta.nom} s'est positionné(e) sur votre demande ${c.resume(d)} il y a 20 h, et n'a pas encore confirmé avoir reçu les coordonnées des mariés.`,
          `Son e-mail : ${presta.email}`,
        ],
        bouton: { texte: "Voir la demande", url: c.lien(d) },
      },
      { titre: "Coordonnées à transmettre", texte: `${presta.nom} attend les coordonnées des mariés`, url: `/demande/${d.id}` },
    );
  }

  // 2. Aucun positionnement après 48 h : relancer sur WhatsApp
  const { data: r48 } = await admin.rpc("prendre_relances_48h");
  for (const r of (r48 ?? []) as { demande_id: string; auteur_id: string }[]) {
    const d = await c.demande(r.demande_id);
    if (!d) continue;
    compte.relances48h++;
    await c.notifier(
      [await c.membre(r.auteur_id)],
      {
        sujet: `Personne n'est encore dispo pour votre demande ${c.metier(d.metier_id)}`,
        titre: "Votre demande attend toujours un prestataire",
        paragraphes: [`${c.resume(d)}.`, "Aucun membre ne s'est positionné depuis 48 h. Relancez votre groupe WhatsApp en un clic : le message est déjà prêt."],
        bouton: { texte: "Relancer sur WhatsApp", url: lienWhatsApp(messageWhatsApp(d, c.metier(d.metier_id), true)) },
        boutonSecondaire: { texte: "Voir la demande", url: c.lien(d) },
      },
      { titre: "Aucun prestataire depuis 48 h", texte: "Relancez votre demande sur WhatsApp", url: `/demande/${d.id}` },
    );
  }

  // 3. 15 jours après la transmission : signée ou non ?
  const { data: r15 } = await admin.rpc("prendre_rappels_15j");
  for (const r of (r15 ?? []) as { demande_id: string; auteur_id: string }[]) {
    const d = await c.demande(r.demande_id);
    if (!d) continue;
    compte.rappels15j++;
    await c.notifier(
      [await c.membre(r.auteur_id)],
      {
        sujet: `Votre demande ${c.metier(d.metier_id)} du ${dateCourte(d.date_mariage)} : signée ou non ?`,
        titre: "Que devient votre demande ?",
        paragraphes: [`${c.resume(d)}.`, "Elle a été transmise il y a 15 jours. Indiquez si elle a été signée : cela fait vivre les statistiques de la communauté."],
        bouton: { texte: "Mettre à jour le statut", url: c.lien(d) },
      },
      { titre: "Signée ou non ?", texte: c.resume(d), url: `/demande/${d.id}` },
    );
  }
  return compte;
}
