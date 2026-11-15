"use client";
// Partager un plan : personnes ayant accès, invitation par e-mail, liens
import { useCallback, useEffect, useState } from "react";
import { Bouton } from "@/components/ui/Bouton";
import { messageErreur } from "@/lib/erreurs";
import {
  ROLES,
  adresseLien,
  annulerInvitation,
  changerRole,
  creerLien,
  desactiverLien,
  inviter,
  listerInvitations,
  listerLiens,
  listerMembres,
  retirerMembre,
  type Invitation,
  type LienPlan,
  type Membre,
  type Role,
} from "@/lib/partagePlans";
import { useSession } from "@/lib/useSession";

const nomRole = (r: Role) => ROLES.find((x) => x.valeur === r)?.texte ?? r;

export function FenetrePartage({ planId, nomPlan, gestionnaire }: { planId: string; nomPlan: string; gestionnaire: boolean }) {
  const session = useSession();
  const [membres, setMembres] = useState<Membre[] | null>(null);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [liens, setLiens] = useState<LienPlan[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("editeur");
  const [message, setMessage] = useState("");
  const [erreur, setErreur] = useState("");

  const charger = useCallback(() => {
    listerMembres(planId).then(setMembres).catch(() => setMembres([]));
    if (gestionnaire) {
      listerInvitations(planId).then(setInvitations).catch(() => {});
      listerLiens(planId).then(setLiens).catch(() => {});
    }
  }, [planId, gestionnaire]);
  useEffect(charger, [charger]);

  async function agir(action: () => Promise<unknown>, ok = "") {
    setErreur("");
    setMessage("");
    try {
      await action();
      if (ok) setMessage(ok);
      charger();
    } catch (e) {
      setErreur(messageErreur(e as Error));
    }
  }

  // Ouvre la messagerie avec un message prêt à envoyer
  function ouvrirMessagerie(adresse: string, r: Role) {
    const lien = `${window.location.origin}/plans`;
    const sujet = `Plan de salle « ${nomPlan} »`;
    const corps =
      `Bonjour,\n\nJe vous invite à ${r === "lecteur" ? "consulter" : "modifier"} le plan de salle « ${nomPlan} » sur Mon plan de salle.\n\n` +
      `Ouvrez ce lien et connectez-vous avec cette adresse e-mail (${adresse}) : ${lien}\n` +
      `Le plan apparaîtra directement dans « Mes plans ».\n\nÀ bientôt !`;
    window.location.assign(`mailto:${adresse}?subject=${encodeURIComponent(sujet)}&body=${encodeURIComponent(corps)}`);
  }

  return (
    <div className="flex flex-col gap-5">
      <section>
        <h3 className="text-sm font-medium">Personnes ayant accès</h3>
        {membres === null && <p className="mt-2 text-sm text-encre-doux">Chargement…</p>}
        <ul className="mt-2 flex flex-col gap-1.5">
          {membres?.map((m) => {
            const moi = m.user_id === session?.user.id;
            return (
              <li key={m.user_id} className="flex items-center gap-2 rounded-xl bg-blanc px-3 py-2 ring-1 ring-or-clair/50">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">
                    {m.nom || m.email}
                    {moi && " (vous)"}
                  </span>
                  {m.nom && <span className="block truncate text-xs text-encre-doux">{m.email}</span>}
                </span>
                {gestionnaire && !m.createur && !moi ? (
                  <select
                    value={m.role}
                    onChange={(e) => agir(() => changerRole(planId, m.user_id, e.target.value as Role))}
                    aria-label={`Rôle de ${m.nom || m.email}`}
                    className="min-h-[36px] rounded-lg bg-creme px-2 text-xs"
                  >
                    {ROLES.map((r) => (
                      <option key={r.valeur} value={r.valeur}>{r.texte}</option>
                    ))}
                  </select>
                ) : (
                  <span className="text-xs text-encre-doux">{m.createur ? "Créatrice" : nomRole(m.role)}</span>
                )}
                {!m.createur && (gestionnaire || moi) && (
                  <button
                    type="button"
                    onClick={() => agir(() => retirerMembre(planId, m.user_id), moi ? "Vous avez quitté ce plan." : "Accès retiré.")}
                    aria-label={moi ? "Quitter ce plan" : `Retirer ${m.nom || m.email}`}
                    className="h-8 w-8 shrink-0 rounded-full text-encre-doux"
                  >
                    ×
                  </button>
                )}
              </li>
            );
          })}
          {invitations.map((i) => (
            <li key={i.id} className="flex items-center gap-2 rounded-xl bg-creme px-3 py-2">
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm">{i.email}</span>
                <span className="block text-xs text-encre-doux">Invitation en attente · {nomRole(i.role)}</span>
              </span>
              <button type="button" onClick={() => ouvrirMessagerie(i.email, i.role)} className="min-h-[32px] text-xs text-or-fonce underline underline-offset-4">
                Renvoyer
              </button>
              <button type="button" onClick={() => agir(() => annulerInvitation(i.id))} aria-label={`Annuler l'invitation de ${i.email}`} className="h-8 w-8 shrink-0 rounded-full text-encre-doux">
                ×
              </button>
            </li>
          ))}
        </ul>
      </section>

      {gestionnaire ? (
        <>
          <section className="rounded-2xl bg-creme p-3">
            <h3 className="text-sm font-medium">Inviter par e-mail</h3>
            <form
              className="mt-2 flex flex-col gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                const adresse = email.trim().toLowerCase();
                agir(async () => {
                  await inviter(planId, adresse, role);
                  setEmail("");
                  ouvrirMessagerie(adresse, role);
                }, "Invitation enregistrée : le plan apparaîtra dans ses plans dès qu'elle se connectera avec cette adresse.");
              }}
            >
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="adresse@exemple.fr"
                aria-label="Adresse e-mail"
                className="min-h-[48px] rounded-xl bg-blanc px-3 ring-1 ring-or-clair"
              />
              <select value={role} onChange={(e) => setRole(e.target.value as Role)} aria-label="Rôle" className="min-h-[48px] rounded-xl bg-blanc px-3 ring-1 ring-or-clair">
                {ROLES.map((r) => (
                  <option key={r.valeur} value={r.valeur}>{r.texte} — {r.detail}</option>
                ))}
              </select>
              <Bouton type="submit">Inviter</Bouton>
            </form>
            <p className="mt-2 text-xs text-encre-doux">Votre messagerie s&apos;ouvre avec un message prêt à envoyer.</p>
          </section>

          <section>
            <h3 className="text-sm font-medium">Liens de partage</h3>
            <div className="mt-2 flex flex-col gap-2">
              <LigneLien
                titre="Lecture seule"
                detail="Tout le monde peut voir le plan, sans compte (pratique pour un traiteur ou un loueur)."
                lien={liens.find((l) => l.role === "lecteur")}
                onCreer={() => agir(() => creerLien(planId, "lecteur"))}
                onDesactiver={(l) => agir(() => desactiverLien(l.id), "Lien désactivé : il ne fonctionne plus.")}
              />
              <LigneLien
                titre="Modification"
                detail="La personne crée un compte (ou se connecte), puis peut modifier le plan."
                lien={liens.find((l) => l.role === "editeur")}
                onCreer={() => agir(() => creerLien(planId, "editeur"))}
                onDesactiver={(l) => agir(() => desactiverLien(l.id), "Lien désactivé : il ne fonctionne plus.")}
              />
            </div>
          </section>
        </>
      ) : (
        <p className="text-sm text-encre-doux">Seules les co-propriétaires du plan peuvent le partager.</p>
      )}

      {message && <p className="rounded-xl bg-succes/15 px-3 py-2 text-sm text-succes" role="status">{message}</p>}
      {erreur && <p className="text-sm text-alerte">{erreur}</p>}
    </div>
  );
}

function LigneLien({
  titre,
  detail,
  lien,
  onCreer,
  onDesactiver,
}: {
  titre: string;
  detail: string;
  lien?: LienPlan;
  onCreer: () => void;
  onDesactiver: (l: LienPlan) => void;
}) {
  const [copie, setCopie] = useState(false);
  return (
    <div className="rounded-2xl bg-blanc p-3 ring-1 ring-or-clair/50">
      <p className="text-sm font-medium">{titre}</p>
      <p className="text-xs text-encre-doux">{detail}</p>
      {lien ? (
        <>
          <p className="mt-2 break-all rounded-lg bg-creme px-2 py-1.5 font-mono text-xs">{adresseLien(lien.jeton)}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={async () => {
                await navigator.clipboard.writeText(adresseLien(lien.jeton)).catch(() => {});
                setCopie(true);
                setTimeout(() => setCopie(false), 2000);
              }}
              className="min-h-[40px] rounded-full bg-or px-4 text-sm font-medium text-blanc"
            >
              {copie ? "✓ Copié" : "Copier le lien"}
            </button>
            {"share" in navigator && (
              <button
                type="button"
                onClick={() => navigator.share({ title: "Plan de salle", url: adresseLien(lien.jeton) }).catch(() => {})}
                className="min-h-[40px] rounded-full bg-creme px-4 text-sm ring-1 ring-or-clair"
              >
                Partager…
              </button>
            )}
            <button type="button" onClick={() => onDesactiver(lien)} className="min-h-[40px] px-2 text-sm text-encre-doux underline underline-offset-4">
              Désactiver
            </button>
          </div>
        </>
      ) : (
        <button type="button" onClick={onCreer} className="mt-2 min-h-[40px] rounded-full bg-creme px-4 text-sm font-medium ring-1 ring-or-clair">
          Créer le lien
        </button>
      )}
    </div>
  );
}
