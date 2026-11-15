"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Bouton } from "@/components/ui/Bouton";
import { Carte } from "@/components/ui/Carte";
import { Feuille } from "@/components/ui/Feuille";
import { EnTete } from "@/components/EnTete";
import { Protege } from "@/components/Protege";
import { useDroits } from "@/lib/droits";
import { dateLongue } from "@/lib/dates";
import { messageErreur } from "@/lib/erreurs";
import { supabaseNavigateur } from "@/lib/supabase/navigateur";

// Petite pastille d'état
const TONS = { ok: "bg-[#e3ebe0] text-succes", attention: "bg-[#f6ecd6] text-[#a87a1f]", probleme: "bg-[#f5e1dd] text-alerte", neutre: "bg-creme-fonce text-encre" };
function Puce({ ton, children }: { ton: keyof typeof TONS; children: React.ReactNode }) {
  return <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${TONS[ton]}`}>{children}</span>;
}

function Confirmer({ question, bouton, ouverte, onAnnuler, onConfirmer }: { question: string; bouton: string; ouverte: boolean; onAnnuler: () => void; onConfirmer: () => void }) {
  return (
    <Feuille titre="Confirmer" ouverte={ouverte} onFermer={onAnnuler}>
      <p className="mb-6">{question}</p>
      <div className="grid grid-cols-2 gap-3">
        <Bouton variante="secondaire" onClick={onAnnuler}>Annuler</Bouton>
        <Bouton variante="danger" onClick={onConfirmer}>{bouton}</Bouton>
      </div>
    </Feuille>
  );
}

type CompteAdmin = {
  id: string;
  email: string;
  nom: string | null;
  inscrit_le: string;
  derniere_connexion: string | null;
  email_confirme: boolean;
  statut_compte: "actif" | "suspendu";
  est_admin: boolean;
  abonnement_statut: string;
  raison: string;
  fin_essai: string | null;
};

const jour = (iso?: string | null) => (iso ? dateLongue(iso.slice(0, 10)) : "jamais");

export function Administration() {
  return (
    <Protege>
      <Admin />
    </Protege>
  );
}

const ACCES: Record<string, { texte: string; ton: "ok" | "attention" | "probleme" | "neutre" }> = {
  admin: { texte: "Admin", ton: "ok" },
  lancement: { texte: "Accès complet", ton: "ok" },
  abonne: { texte: "Abonné", ton: "ok" },
  essai: { texte: "Essai", ton: "attention" },
  expire: { texte: "Essai terminé", ton: "probleme" },
  suspendu: { texte: "Suspendu", ton: "probleme" },
};

function Admin() {
  const droits = useDroits();
  const estAdmin = droits?.est_admin;
  const [info, setInfo] = useState("");
  const annoncer = (m: string) => setInfo(m);
  const [comptes, setComptes] = useState<CompteAdmin[] | null>(null);
  const [erreur, setErreur] = useState("");
  const [recherche, setRecherche] = useState("");
  const [aSuspendre, setASuspendre] = useState<CompteAdmin | null>(null);

  const charger = useCallback(async () => {
    setErreur("");
    const { data, error } = await supabaseNavigateur().rpc("admin_comptes");
    if (error) setErreur(messageErreur(error));
    else setComptes(data as CompteAdmin[]);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (estAdmin) charger();
  }, [estAdmin, charger]);

  const filtres = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    return (comptes ?? []).filter((c) => !q || c.email.toLowerCase().includes(q) || (c.nom ?? "").toLowerCase().includes(q));
  }, [comptes, recherche]);

  async function changerStatut(c: CompteAdmin, statut: "actif" | "suspendu") {
    const { error } = await supabaseNavigateur().rpc("admin_changer_statut", { p_compte: c.id, p_statut: statut });
    if (error) return annoncer(messageErreur(error));
    annoncer(statut === "actif" ? "Compte réactivé" : "Compte suspendu");
    charger();
  }

  async function prolonger(c: CompteAdmin) {
    const { error } = await supabaseNavigateur().rpc("admin_prolonger_essai", { p_compte: c.id, p_jours: 30 });
    if (error) return annoncer(messageErreur(error));
    annoncer("30 jours d'essai offerts");
    charger();
  }

  if (droits === undefined) return <p className="mt-20 text-center text-encre-doux">Chargement…</p>;
  if (!estAdmin) {
    return (
      <main className="mx-auto w-full max-w-xl flex-1 px-4 py-6">
        <EnTete retour={{ href: "/tableau", texte: "Mes mariages" }} />
        <Carte className="mt-6 text-center text-encre-doux">Cette page est réservée à l&apos;administratrice.</Carte>
      </main>
    );
  }

  const nbSuspendus = (comptes ?? []).filter((c) => c.statut_compte === "suspendu").length;
  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-4 py-6">
      <EnTete retour={{ href: "/tableau", texte: "Mes mariages" }} />
      <h1 className="mt-8 text-2xl font-medium">Administration des comptes</h1>
      <p className="mt-1 text-sm text-encre-doux">Comptes communs à Ma Coordo et Ma Visite Technique.</p>
      {info && <p className="mt-4 rounded-2xl bg-encre px-4 py-3 text-sm text-blanc" role="status">{info}</p>}
        {comptes && (
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <Carte className="p-3">
              <div className="text-2xl font-light">{comptes.length}</div>
              <div className="text-xs text-encre-doux">comptes</div>
            </Carte>
            <Carte className="p-3">
              <div className="text-2xl font-light">{comptes.filter((c) => c.raison === "abonne").length}</div>
              <div className="text-xs text-encre-doux">abonnés</div>
            </Carte>
            <Carte className="p-3">
              <div className="text-2xl font-light">{nbSuspendus}</div>
              <div className="text-xs text-encre-doux">suspendus</div>
            </Carte>
          </div>
        )}
        <input
          type="search"
          className="mt-4 min-h-[48px] w-full rounded-2xl border border-or-clair bg-blanc px-4 focus:border-or focus:outline-none"
          placeholder="Rechercher un e-mail ou un nom"
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
        />
        {erreur && <p className="mt-4 text-alerte">{erreur}</p>}
        {!comptes && !erreur && <p className="mt-8 text-center text-encre-doux">Chargement…</p>}
        <ul className="mt-4 flex flex-col gap-3">
          {filtres.map((c) => {
            const acces = ACCES[c.raison] ?? { texte: c.raison, ton: "neutre" as const };
            return (
              <li key={c.id}>
                <Carte>
                  <div className="flex items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{c.nom || c.email}</div>
                      {c.nom && <div className="truncate text-sm text-encre-doux">{c.email}</div>}
                    </div>
                    <Puce ton={acces.ton}>{acces.texte}</Puce>
                  </div>
                  <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-0.5 text-sm text-encre-doux">
                    <dt>Inscription</dt>
                    <dd>{jour(c.inscrit_le)}</dd>
                    <dt>Dernière connexion</dt>
                    <dd>{jour(c.derniere_connexion)}</dd>
                    <dt>Fin d&apos;essai</dt>
                    <dd>{jour(c.fin_essai)}</dd>
                    {!c.email_confirme && (
                      <>
                        <dt>E-mail</dt>
                        <dd className="text-attention">pas encore confirmé</dd>
                      </>
                    )}
                  </dl>
                  {!c.est_admin && (
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      {c.statut_compte === "suspendu" ? (
                        <Bouton className="min-h-[44px] px-3 text-sm" onClick={() => changerStatut(c, "actif")}>
                          Réactiver
                        </Bouton>
                      ) : (
                        <Bouton variante="secondaire" className="min-h-[44px] px-3 text-sm text-alerte" onClick={() => setASuspendre(c)}>
                          Suspendre
                        </Bouton>
                      )}
                      <Bouton variante="secondaire" className="min-h-[44px] px-3 text-sm" onClick={() => prolonger(c)}>
                        +30 j d&apos;essai
                      </Bouton>
                    </div>
                  )}
                </Carte>
              </li>
            );
          })}
        </ul>
        {comptes && (
          <Bouton variante="discret" className="mt-4 w-full" onClick={charger}>
            Actualiser
          </Bouton>
        )}
      <Confirmer
        ouverte={!!aSuspendre}
        question={`Suspendre le compte ${aSuspendre?.email} ? La personne gardera l'accès en lecture à ses visites mais ne pourra plus en créer ni les modifier.`}
        bouton="Suspendre"
        onAnnuler={() => setASuspendre(null)}
        onConfirmer={() => {
          if (aSuspendre) changerStatut(aSuspendre, "suspendu");
          setASuspendre(null);
        }}
      />
    </main>
  );
}
