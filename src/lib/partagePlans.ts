"use client";
// Partage des plans : liens, invitations, personnes ayant accès, commentaires
import { supabaseNavigateur } from "@/lib/supabase/navigateur";
import { lireProfil } from "@/lib/plans";
import type { PlanContenu } from "@/plan/types";

export type Role = "proprietaire" | "editeur" | "lecteur";
export const ROLES: { valeur: Role; texte: string; detail: string }[] = [
  { valeur: "lecteur", texte: "Lecteur", detail: "voit le plan et peut commenter" },
  { valeur: "editeur", texte: "Éditeur", detail: "peut modifier le plan" },
  { valeur: "proprietaire", texte: "Co-propriétaire", detail: "peut aussi partager le plan" },
];

const sb = () => supabaseNavigateur();
function verifier<T>(res: { data: T | null; error: unknown }): T {
  if (res.error) throw res.error;
  return res.data as T;
}

// ---------- Liens ----------
export type LienPlan = { id: string; jeton: string; role: "lecteur" | "editeur"; actif: boolean };

export async function listerLiens(planId: string): Promise<LienPlan[]> {
  return verifier(await sb().from("plans_liens").select("id, jeton, role, actif").eq("plan_id", planId).eq("actif", true));
}
export async function creerLien(planId: string, role: "lecteur" | "editeur"): Promise<LienPlan> {
  const { data } = await sb().auth.getSession();
  return verifier(
    await sb().from("plans_liens").insert({ plan_id: planId, role, cree_par: data.session?.user.id }).select("id, jeton, role, actif").single(),
  );
}
export async function desactiverLien(id: string) {
  verifier(await sb().from("plans_liens").update({ actif: false }).eq("id", id));
}
export const adresseLien = (jeton: string) => `${window.location.origin}/p/${jeton}`;

export type VuePlanParLien = {
  plan_id: string;
  nom: string;
  role: "lecteur" | "editeur";
  deja_membre: boolean;
  updated_at: string;
  contenu: PlanContenu | null;
};
export async function planParLien(jeton: string): Promise<VuePlanParLien | null> {
  return verifier(await sb().rpc("plan_par_lien", { p_jeton: jeton }));
}
export async function rejoindreParLien(jeton: string): Promise<string> {
  return verifier(await sb().rpc("rejoindre_plan_par_lien", { p_jeton: jeton }));
}

// ---------- Invitations ----------
export type Invitation = { id: string; email: string; role: Role; acceptee_le: string | null };

export async function listerInvitations(planId: string): Promise<Invitation[]> {
  return verifier(
    await sb().from("plans_invitations").select("id, email, role, acceptee_le").eq("plan_id", planId).is("acceptee_le", null).order("created_at"),
  );
}
export async function inviter(planId: string, email: string, role: Role) {
  const { data } = await sb().auth.getSession();
  verifier(
    await sb()
      .from("plans_invitations")
      .upsert({ plan_id: planId, email: email.trim().toLowerCase(), role, invite_par: data.session?.user.id, acceptee_le: null }, { onConflict: "plan_id,email" }),
  );
}
export async function annulerInvitation(id: string) {
  verifier(await sb().from("plans_invitations").delete().eq("id", id));
}
// À chaque visite de « Mes plans » : les invitations reçues à mon adresse sont acceptées
export async function accepterInvitations(): Promise<number> {
  const { data, error } = await sb().rpc("accepter_invitations");
  return error ? 0 : (data as number);
}

// ---------- Personnes ayant accès ----------
export type Membre = { user_id: string; role: Role; nom: string | null; email: string | null; createur: boolean };

export async function listerMembres(planId: string): Promise<Membre[]> {
  return verifier(await sb().rpc("membres_plan", { p_plan: planId }));
}
export async function changerRole(planId: string, userId: string, role: Role) {
  verifier(await sb().rpc("changer_role_plan", { p_plan: planId, p_user: userId, p_role: role }));
}
export async function retirerMembre(planId: string, userId: string) {
  verifier(await sb().rpc("retirer_membre_plan", { p_plan: planId, p_user: userId }));
}

// ---------- Commentaires ----------
export type Commentaire = {
  id: string;
  element_id: string | null;
  auteur_id: string | null;
  auteur_nom: string | null;
  texte: string;
  regle: boolean;
  created_at: string;
};

export async function listerCommentaires(planId: string): Promise<Commentaire[]> {
  const res = await sb()
    .from("plans_commentaires")
    .select("id, element_id, auteur_id, auteur_nom, texte, regle, created_at")
    .eq("plan_id", planId)
    .order("created_at");
  return res.error ? [] : (res.data as Commentaire[]);
}
export async function ajouterCommentaire(planId: string, elementId: string | null, texte: string) {
  const { data } = await sb().auth.getSession();
  const profil = await lireProfil().catch(() => null);
  verifier(
    await sb().from("plans_commentaires").insert({
      plan_id: planId,
      element_id: elementId,
      auteur_id: data.session?.user.id,
      auteur_nom: profil?.nom || data.session?.user.email?.split("@")[0] || null,
      texte: texte.trim(),
    }),
  );
}
export async function reglerCommentaire(id: string, regle: boolean) {
  verifier(await sb().from("plans_commentaires").update({ regle }).eq("id", id));
}
export async function supprimerCommentaire(id: string) {
  verifier(await sb().from("plans_commentaires").delete().eq("id", id));
}
