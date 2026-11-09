"use client";
// Lecture et enregistrement des données de la créatrice.
// La sécurité est assurée par la base : chacune ne voit que ses mariages.
import { supabaseNavigateur } from "@/lib/supabase/navigateur";
import { decalerDeJours } from "@/lib/heures";
import { avecMemoire } from "@/lib/memoire";
import type { ElementFiche, Intervenant, Mariage, Moment } from "@/lib/types";

const CHAMPS_MARIAGE =
  "id, nom_marie_1, nom_marie_2, date_mariage, lieu_principal, fuseau_horaire, delai_alerte_defaut, canal";
const CHAMPS_INTERVENANT =
  "id, mariage_id, nom, role, categorie, telephone, email, jeton, acces_coordination, ordre";

function verifier<T>(res: { data: T | null; error: unknown }): T {
  if (res.error) throw res.error;
  return res.data as T;
}

// ---------- Mariages ----------
export async function listerMariages(): Promise<Mariage[]> {
  return avecMemoire("mariages", async () => verifier(
    await supabaseNavigateur()
      .from("mariages")
      .select(CHAMPS_MARIAGE)
      .order("date_mariage", { ascending: true }),
  ));
}

export async function lireMariage(id: string): Promise<Mariage | null> {
  return avecMemoire(`mariage:${id}`, async () => verifier(
    await supabaseNavigateur()
      .from("mariages")
      .select(CHAMPS_MARIAGE)
      .eq("id", id)
      .maybeSingle(),
  ));
}

export type MariageSaisi = Pick<
  Mariage,
  "nom_marie_1" | "nom_marie_2" | "date_mariage" | "lieu_principal" | "delai_alerte_defaut"
>;

export async function creerMariage(m: MariageSaisi): Promise<Mariage> {
  return verifier(
    await supabaseNavigateur().from("mariages").insert(m).select(CHAMPS_MARIAGE).single(),
  );
}

export async function modifierMariage(id: string, m: MariageSaisi): Promise<Mariage> {
  return verifier(
    await supabaseNavigateur()
      .from("mariages")
      .update(m)
      .eq("id", id)
      .select(CHAMPS_MARIAGE)
      .single(),
  );
}

export async function supprimerMariage(id: string) {
  verifier(await supabaseNavigateur().from("mariages").delete().eq("id", id));
}

// ---------- Intervenants ----------
export async function listerIntervenants(mariageId: string): Promise<Intervenant[]> {
  return avecMemoire(`intervenants:${mariageId}`, async () => verifier(
    await supabaseNavigateur()
      .from("intervenants")
      .select(CHAMPS_INTERVENANT)
      .eq("mariage_id", mariageId)
      .order("ordre")
      .order("nom"),
  ));
}

export type IntervenantSaisi = Pick<
  Intervenant,
  "nom" | "role" | "categorie" | "telephone" | "email" | "acces_coordination"
>;

export async function creerIntervenant(
  mariageId: string,
  i: IntervenantSaisi,
  ordre: number,
): Promise<Intervenant> {
  return verifier(
    await supabaseNavigateur()
      .from("intervenants")
      .insert({ ...i, mariage_id: mariageId, ordre })
      .select(CHAMPS_INTERVENANT)
      .single(),
  );
}

export async function modifierIntervenant(id: string, i: IntervenantSaisi): Promise<Intervenant> {
  return verifier(
    await supabaseNavigateur()
      .from("intervenants")
      .update(i)
      .eq("id", id)
      .select(CHAMPS_INTERVENANT)
      .single(),
  );
}

export async function supprimerIntervenant(id: string) {
  verifier(await supabaseNavigateur().from("intervenants").delete().eq("id", id));
}

// ---------- Moments du déroulé ----------

type MomentBrut = Omit<Moment, "intervenants"> & {
  moment_intervenants: { intervenant_id: string }[];
};

const CHAMPS_MOMENT =
  "id, mariage_id, titre, debut, fin, lieu, notes, ordre, moment_intervenants(intervenant_id)";

function versMoment({ moment_intervenants, ...m }: MomentBrut): Moment {
  return { ...m, intervenants: moment_intervenants.map((x) => x.intervenant_id) };
}

export async function listerMoments(mariageId: string): Promise<Moment[]> {
  return avecMemoire(`moments:${mariageId}`, async () => {
  const brut = verifier<MomentBrut[]>(
    await supabaseNavigateur()
      .from("moments")
      .select(CHAMPS_MOMENT)
      .eq("mariage_id", mariageId)
      .order("debut")
      .order("ordre"),
  );
  return brut.map(versMoment);
  });
}

export type MomentSaisi = Pick<Moment, "titre" | "debut" | "fin" | "lieu" | "notes" | "intervenants">;

async function enregistrerAssignations(momentId: string, intervenants: string[]) {
  const supabase = supabaseNavigateur();
  verifier(await supabase.from("moment_intervenants").delete().eq("moment_id", momentId));
  if (intervenants.length) {
    verifier(
      await supabase
        .from("moment_intervenants")
        .insert(intervenants.map((intervenant_id) => ({ moment_id: momentId, intervenant_id }))),
    );
  }
}

export async function creerMoment(mariageId: string, m: MomentSaisi, ordre: number) {
  const { intervenants, ...champs } = m;
  const cree = verifier<{ id: string }>(
    await supabaseNavigateur()
      .from("moments")
      .insert({ ...champs, mariage_id: mariageId, ordre })
      .select("id")
      .single(),
  );
  await enregistrerAssignations(cree.id, intervenants);
}

export async function modifierMoment(id: string, m: Partial<MomentSaisi>) {
  const { intervenants, ...champs } = m;
  if (Object.keys(champs).length) {
    verifier(await supabaseNavigateur().from("moments").update(champs).eq("id", id));
  }
  if (intervenants) await enregistrerAssignations(id, intervenants);
}

export async function supprimerMoment(id: string) {
  verifier(await supabaseNavigateur().from("moments").delete().eq("id", id));
}

// Décale tous les moments d'un mariage de N jours (quand on change la date)
export async function decalerJoursMoments(mariageId: string, jours: number, fuseau: string) {
  if (!jours) return;
  const moments = await listerMoments(mariageId);
  await Promise.all(
    moments.map((m) =>
      modifierMoment(m.id, {
        debut: decalerDeJours(m.debut, jours, fuseau),
        fin: m.fin ? decalerDeJours(m.fin, jours, fuseau) : null,
      }),
    ),
  );
}

// ---------- Fiche pratique ----------
const CHAMPS_FICHE = "id, mariage_id, categorie, titre, contenu, telephone, adresse, visibilite, ordre";

export async function listerFiche(mariageId: string): Promise<ElementFiche[]> {
  return avecMemoire(`fiche:${mariageId}`, async () => verifier(
    await supabaseNavigateur()
      .from("fiche_elements")
      .select(CHAMPS_FICHE)
      .eq("mariage_id", mariageId)
      .order("ordre")
      .order("created_at"),
  ));
}

export type ElementFicheSaisi = Pick<
  ElementFiche,
  "categorie" | "titre" | "contenu" | "telephone" | "adresse" | "visibilite"
>;

export async function creerElementFiche(mariageId: string, e: ElementFicheSaisi, ordre: number) {
  verifier(
    await supabaseNavigateur().from("fiche_elements").insert({ ...e, mariage_id: mariageId, ordre }),
  );
}

export async function modifierElementFiche(id: string, e: ElementFicheSaisi) {
  verifier(await supabaseNavigateur().from("fiche_elements").update(e).eq("id", id));
}

export async function supprimerElementFiche(id: string) {
  verifier(await supabaseNavigateur().from("fiche_elements").delete().eq("id", id));
}

// ---------- Retard ----------
export async function decalerMoments(momentId: string, minutes: number, suivants: boolean) {
  return verifier<number>(
    await supabaseNavigateur().rpc("decaler_moments", {
      p_moment: momentId,
      p_minutes: minutes,
      p_suivants: suivants,
    }),
  );
}

// ---------- Qui est prêt ? ----------
export type Preparation = {
  visites: Map<string, { premiere: string; derniere: string; nombre: number }>;
  alertes: Map<string, number>; // intervenant -> délai choisi (min)
};

// Renvoie null si l'information n'est pas disponible (script 0003 pas encore installé)
export async function lirePreparation(mariageId: string): Promise<Preparation | null> {
  const supabase = supabaseNavigateur();
  const [v, a] = await Promise.all([
    supabase
      .from("visites_liens")
      .select("intervenant_id, premiere_visite, derniere_visite, nombre_visites, intervenants!inner(mariage_id)")
      .eq("intervenants.mariage_id", mariageId),
    supabase
      .from("abonnements_push")
      .select("intervenant_id, delai_minutes, intervenants!inner(mariage_id)")
      .eq("intervenants.mariage_id", mariageId),
  ]);
  if (v.error) return null;
  const visites = new Map(
    (v.data ?? []).map((x) => [
      x.intervenant_id as string,
      { premiere: x.premiere_visite as string, derniere: x.derniere_visite as string, nombre: x.nombre_visites as number },
    ]),
  );
  const alertes = new Map<string, number>();
  for (const x of a.data ?? []) {
    const id = x.intervenant_id as string;
    alertes.set(id, Math.min(alertes.get(id) ?? Infinity, x.delai_minutes as number));
  }
  return { visites, alertes };
}
