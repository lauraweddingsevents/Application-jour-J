"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Bouton, BoutonLien } from "@/components/ui/Bouton";
import { Carte } from "@/components/ui/Carte";
import { Case } from "@/components/ui/Case";
import { ZoneTexte } from "@/components/ui/ZoneTexte";
import { Pastille } from "@/components/demandes/Pastille";
import { Signaler } from "@/components/Signaler";
import { useMembre, nomMetier } from "@/lib/membre";
import { supabaseNavigateur } from "@/lib/supabase/navigateur";
import { messageErreur } from "@/lib/erreurs";
import { notifier } from "@/lib/notifier";
import {
  dateCourte, dateLongue, depart, dureeLisible, euros, lienWhatsApp, messageWhatsApp, resteAvantEcheance,
  type DetailDemande, type Positionne,
} from "@/lib/demandes";

const DELAI_RELANCE_MS = 48 * 3600_000;

export function FicheDemande({ id }: { id: string }) {
  const router = useRouter();
  const nouvelle = useSearchParams().get("nouvelle") === "1";
  const { metiers } = useMembre();
  const [d, setD] = useState<DetailDemande | null | undefined>(undefined);
  const [erreur, setErreur] = useState("");
  const [maintenant, setMaintenant] = useState(() => Date.now());

  const charger = useCallback(async () => {
    const { data, error } = await supabaseNavigateur().rpc("detail_demande", { p_id: id });
    if (error) setErreur(messageErreur(error));
    setD((data as DetailDemande | null) ?? null);
  }, [id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    charger();
    // Compte à rebours : mise à jour chaque minute
    const minuterie = setInterval(() => setMaintenant(Date.now()), 60_000);
    return () => clearInterval(minuterie);
  }, [charger]);

  // Exécute une action, prévient les personnes concernées, puis recharge la fiche
  async function agir(rpc: string, args: Record<string, unknown>) {
    setErreur("");
    const { error } = await supabaseNavigateur().rpc(rpc, args);
    if (error) {
      setErreur(messageErreur(error));
      return false;
    }
    notifier();
    await charger();
    return true;
  }

  if (d === undefined) return <p className="text-encre-doux">Chargement…</p>;
  if (d === null)
    return (
      <Carte className="flex flex-col gap-4 text-center">
        <p>Cette demande n&apos;existe pas ou plus.</p>
        <BoutonLien href="/demandes" variante="secondaire">Voir les demandes</BoutonLien>
      </Carte>
    );

  const metier = nomMetier(metiers, d.metier_id);
  const dep = depart(d.departement);
  const ouverte = d.statut === "ouverte" || d.statut === "transmise";
  const complete = ouverte && d.nb_positionnes >= d.places_max;
  const sansReponse = d.statut === "ouverte" && d.nb_positionnes === 0 && maintenant - new Date(d.cree_le).getTime() > DELAI_RELANCE_MS;
  const texteWhatsApp = messageWhatsApp(d, metier, sansReponse);

  return (
    <div className="flex flex-col gap-4">
      <Link href="/demandes" className="text-sm text-encre-doux">← Demandes</Link>

      {nouvelle && d.je_suis_auteur && (
        <Carte className="flex flex-col gap-3 bg-succes/10 ring-succes/30">
          <p className="font-medium text-succes">✓ Demande déposée</p>
          <p className="text-sm">Les membres concernés sont prévenus. Partagez-la aussi dans votre groupe WhatsApp :</p>
          <BoutonWhatsApp texte={texteWhatsApp} />
        </Carte>
      )}

      {/* En-tête */}
      <Carte className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-2xl font-light leading-tight">{metier}</h1>
          <Pastille statut={d.statut} complete={complete} />
        </div>
        <p className="text-lg font-medium text-or-fonce">{dateLongue(d.date_mariage)}</p>
        <dl className="flex flex-col gap-1.5">
          <Ligne titre="Lieu">{d.lieu} · {dep ? `${dep.code} · ${dep.nom}` : d.departement}</Ligne>
          <Ligne titre="Invités">{d.invites ?? "Non précisé"}</Ligne>
          {d.budget != null && <Ligne titre="Budget">{euros(d.budget)}</Ligne>}
          <Ligne titre="Transmise par">
            <Link href={`/membre/${d.auteur.id}`} className="text-or-fonce underline underline-offset-4">{d.auteur.nom}</Link>
            {d.auteur.entreprise && <span className="text-encre-doux"> · {d.auteur.entreprise}</span>}
          </Ligne>
          <Ligne titre="Coordonnées">
            {d.mode_coordonnees === "renseignees" ? "Renseignées (masquées)" : "Transmises par l'auteur sous 24 h"}
          </Ligne>
        </dl>
        {d.note && <p className="whitespace-pre-line rounded-2xl bg-creme-fonce/50 p-3">{d.note}</p>}
        <Places nb={d.nb_positionnes} max={d.places_max} />
        <p className="text-xs text-encre-doux">
          Déposée le {new Date(d.cree_le).toLocaleDateString("fr-FR")}
          {d.modifie_le !== d.cree_le && ` · modifiée le ${new Date(d.modifie_le).toLocaleDateString("fr-FR")}`}
        </p>
      </Carte>

      {erreur && <p className="rounded-2xl bg-alerte/10 p-3 text-sm text-alerte">{erreur}</p>}

      {/* Coordonnées des mariés (auteur et positionnés seulement) */}
      {(d.je_suis_auteur || d.je_suis_positionne) && <Coordonnees d={d} maintenant={maintenant} agir={agir} />}

      {/* Prestataire : se positionner */}
      {!d.je_suis_auteur && !d.je_suis_positionne && ouverte && !complete && (
        <JeSuisDispo onValider={(message) => agir("me_positionner", { p_id: d.id, p_message: message, p_engagement: true })} />
      )}
      {!d.je_suis_auteur && !d.je_suis_positionne && complete && (
        <Carte className="text-center text-encre-doux">
          Demande complète : 3 prestataires sont déjà positionnés. Elle se rouvrira si l&apos;un d&apos;eux se retire.
        </Carte>
      )}

      {/* Auteur : positionnés, statut, actions */}
      {d.je_suis_auteur && <EspaceAuteur d={d} maintenant={maintenant} agir={agir} metierDe={(i) => nomMetier(metiers, i)} />}

      {/* Partage WhatsApp */}
      {ouverte && !complete && !(nouvelle && d.je_suis_auteur) && (
        <div className="flex flex-col gap-2">
          {sansReponse && d.je_suis_auteur && (
            <p className="text-sm text-encre-doux">Aucun prestataire depuis 48 h : relancez votre groupe.</p>
          )}
          <BoutonWhatsApp texte={texteWhatsApp} libelle={sansReponse && d.je_suis_auteur ? "Relancer sur WhatsApp" : "Partager sur WhatsApp"} />
        </div>
      )}

      {/* Autres métiers demandés pour le même mariage */}
      {d.groupe.length > 0 && (
        <Carte className="flex flex-col gap-2">
          <h2 className="text-sm font-medium">Même mariage, autres métiers</h2>
          {d.groupe.map((g) => (
            <Link key={g.id} href={`/demande/${g.id}`} className="flex min-h-[44px] items-center justify-between gap-2 border-t border-or-clair/40 pt-2">
              <span>{nomMetier(metiers, g.metier_id)}</span>
              <Pastille statut={g.statut} />
            </Link>
          ))}
        </Carte>
      )}

      {/* Positionné : se retirer */}
      {d.je_suis_positionne && ouverte && (
        <Bouton
          variante="discret"
          onClick={async () => {
            if (!window.confirm("Vous retirer de cette demande ? Votre place sera libérée et vous n'aurez plus accès aux coordonnées des mariés.")) return;
            if (await agir("me_retirer", { p_id: d.id })) router.refresh();
          }}
        >
          Je ne suis plus disponible : me retirer
        </Bouton>
      )}

      {!d.je_suis_auteur && <Signaler cible="demande" id={d.id} />}
    </div>
  );
}

function Ligne({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-2">
      <dt className="w-28 shrink-0 text-sm text-encre-doux">{titre}</dt>
      <dd className="min-w-0">{children}</dd>
    </div>
  );
}

// Trois ronds : places prises / libres
function Places({ nb, max }: { nb: number; max: number }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex gap-1.5" aria-hidden>
        {Array.from({ length: max }, (_, i) => (
          <span key={i} className={`size-4 rounded-full ${i < nb ? "bg-or" : "border-2 border-or-clair"}`} />
        ))}
      </div>
      <span className="text-sm text-encre-doux">
        {nb}/{max} prestataire{nb > 1 ? "s" : ""} positionné{nb > 1 ? "s" : ""}
      </span>
    </div>
  );
}

function BoutonWhatsApp({ texte, libelle = "Partager sur WhatsApp" }: { texte: string; libelle?: string }) {
  return (
    <a
      href={lienWhatsApp(texte)}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-full bg-[#25D366] px-6 font-medium text-white shadow-sm active:opacity-90"
    >
      <svg viewBox="0 0 24 24" className="size-5" fill="currentColor" aria-hidden>
        <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2c-1.5 0-3-.4-4.3-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.2-.2-.5-.3Z" />
      </svg>
      {libelle}
    </a>
  );
}

// ---------- « Je suis dispo » ----------
function JeSuisDispo({ onValider }: { onValider: (message: string) => Promise<boolean> }) {
  const [ouvert, setOuvert] = useState(false);
  const [message, setMessage] = useState("");
  const [engagement, setEngagement] = useState(false);
  const [enCours, setEnCours] = useState(false);

  if (!ouvert) return <Bouton className="text-lg" onClick={() => setOuvert(true)}>Je suis dispo</Bouton>;
  return (
    <Carte className="flex flex-col gap-4 ring-2 ring-or">
      <h2 className="text-lg font-medium">Je suis dispo</h2>
      <ZoneTexte id="message-dispo" libelle="Message pour l'auteur (facultatif)" maxLength={800}
        placeholder="Ex. Je connais bien le lieu, je contacte les mariés aujourd'hui." value={message} onChange={(e) => setMessage(e.target.value)} />
      <Case id="engagement" coche={engagement} onChange={setEngagement}>
        Je confirme être disponible à cette date et pouvoir répondre au besoin.
      </Case>
      <Bouton
        disabled={!engagement || enCours}
        onClick={async () => {
          setEnCours(true);
          await onValider(message);
          setEnCours(false);
        }}
      >
        {enCours ? "Un instant…" : "Valider ma disponibilité"}
      </Bouton>
      <Bouton variante="discret" onClick={() => setOuvert(false)}>Annuler</Bouton>
    </Carte>
  );
}

type Agir = (rpc: string, args: Record<string, unknown>) => Promise<boolean>;

// ---------- Coordonnées des mariés ----------
function Coordonnees({ d, maintenant, agir }: { d: DetailDemande; maintenant: number; agir: Agir }) {
  if (d.coordonnees_supprimees_le)
    return <Carte className="text-sm text-encre-doux">Les coordonnées des mariés ont été supprimées (3 mois après le mariage).</Carte>;

  if (d.mode_coordonnees === "renseignees") {
    const c = d.coordonnees;
    if (!c) return null;
    return (
      <Carte className="flex flex-col gap-3 bg-blanc ring-2 ring-or-clair">
        <h2 className="font-medium">🔓 Coordonnées des mariés</h2>
        {c.nom && <p className="text-lg">{c.nom}</p>}
        <div className="flex flex-col gap-2">
          {c.telephone && (
            <a href={`tel:${c.telephone.replace(/\s/g, "")}`} className="flex min-h-[52px] items-center justify-center gap-2 rounded-full border border-or-clair bg-creme px-4 font-medium">
              📞 {c.telephone}
            </a>
          )}
          {c.email && (
            <a href={`mailto:${c.email}`} className="flex min-h-[52px] items-center justify-center gap-2 break-all rounded-full border border-or-clair bg-creme px-4 font-medium">
              ✉️ {c.email}
            </a>
          )}
        </div>
        {!d.je_suis_auteur && <p className="text-xs text-encre-doux">Merci de contacter les mariés rapidement, au nom de la communauté.</p>}
      </Carte>
    );
  }

  // Mode « l'auteur transmet lui-même » : vu par le prestataire positionné
  if (d.je_suis_positionne && d.mon_positionnement) {
    const p = d.mon_positionnement;
    const reste = resteAvantEcheance(p.cree_le, maintenant);
    return (
      <Carte className="flex flex-col gap-3 ring-2 ring-or-clair">
        <h2 className="font-medium">Coordonnées des mariés</h2>
        {p.coordonnees_recues_le ? (
          <p className="text-succes">✓ Vous avez confirmé les avoir reçues le {new Date(p.coordonnees_recues_le).toLocaleDateString("fr-FR")}.</p>
        ) : (
          <>
            <p>
              {d.auteur.nom} vous transmet les coordonnées des mariés{" "}
              {reste > 0 ? <>dans les <strong>{dureeLisible(reste)}</strong> qui viennent.</> : <>: le délai de 24 h est dépassé, n&apos;hésitez pas à le relancer.</>}
            </p>
            <Bouton onClick={() => agir("confirmer_coordonnees", { p_id: d.id })}>J&apos;ai reçu les coordonnées</Bouton>
          </>
        )}
      </Carte>
    );
  }
  return null;
}

// ---------- Espace de l'auteur ----------
function EspaceAuteur({ d, maintenant, agir, metierDe }: { d: DetailDemande; maintenant: number; agir: Agir; metierDe: (id: number | null) => string }) {
  const router = useRouter();
  const [choixSignee, setChoixSignee] = useState(false);
  const actifs = (d.positionnes ?? []).filter((p) => !p.retire_le);
  const retires = (d.positionnes ?? []).filter((p) => p.retire_le);
  const modifiable = d.statut === "ouverte" || d.statut === "transmise";

  return (
    <>
      <Carte className="flex flex-col gap-3">
        <h2 className="font-medium">Prestataires positionnés</h2>
        {actifs.length === 0 && <p className="text-encre-doux">Personne pour le moment. Vous serez prévenu(e) dès qu&apos;un membre se positionne.</p>}
        {actifs.map((p) => (
          <FichePositionne key={p.membre_id} p={p} metier={(p.metiers?.length ? p.metiers : [p.metier_id]).map(metierDe).filter(Boolean).join(" · ")} parAuteur={d.mode_coordonnees === "par_auteur"} maintenant={maintenant} />
        ))}
        {retires.length > 0 && (
          <p className="text-xs text-encre-doux">
            Retiré{retires.length > 1 ? "s" : ""} : {retires.map((p) => p.nom).join(", ")}
          </p>
        )}
      </Carte>

      {/* Statut final */}
      {d.transmise_le && d.statut !== "annulee" && (
        <Carte className="flex flex-col gap-3">
          <h2 className="font-medium">Que devient cette demande ?</h2>
          {d.statut === "signee" && (
            <p className="text-succes">
              ✓ Signée{d.signee_par && ` avec ${(d.positionnes ?? []).find((p) => p.membre_id === d.signee_par)?.nom ?? "un prestataire"}`}
            </p>
          )}
          {d.statut === "non_signee" && <p className="text-encre-doux">Non signée.</p>}
          {!choixSignee ? (
            <div className="grid grid-cols-2 gap-2">
              <Bouton variante={d.statut === "signee" ? "principal" : "secondaire"} onClick={() => setChoixSignee(true)}>Signée</Bouton>
              <Bouton variante={d.statut === "non_signee" ? "principal" : "secondaire"} onClick={() => agir("changer_statut_demande", { p_id: d.id, p_statut: "non_signee" })}>Non signée</Bouton>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <p className="text-sm">Avec quel prestataire ?</p>
              {(d.positionnes ?? []).map((p) => (
                <Bouton key={p.membre_id} variante="secondaire" onClick={async () => { await agir("changer_statut_demande", { p_id: d.id, p_statut: "signee", p_signee_par: p.membre_id }); setChoixSignee(false); }}>
                  {p.nom}
                </Bouton>
              ))}
              <Bouton variante="secondaire" onClick={async () => { await agir("changer_statut_demande", { p_id: d.id, p_statut: "signee", p_signee_par: null }); setChoixSignee(false); }}>
                Je ne sais pas
              </Bouton>
              <Bouton variante="discret" onClick={() => setChoixSignee(false)}>Annuler</Bouton>
            </div>
          )}
          {(d.statut === "signee" || d.statut === "non_signee") && (
            <Bouton variante="discret" onClick={() => agir("changer_statut_demande", { p_id: d.id, p_statut: "transmise" })}>
              Revenir à « Transmise »
            </Bouton>
          )}
        </Carte>
      )}

      {/* Actions */}
      <div className="flex flex-col gap-2">
        {modifiable && <BoutonLien href={`/deposer?modifier=${d.id}`} variante="secondaire">Modifier la demande</BoutonLien>}
        {d.statut !== "annulee" && (
          <BoutonLien href={`/deposer?dupliquer=${d.id}`} variante="secondaire">Dupliquer pour un autre métier</BoutonLien>
        )}
        {modifiable && (
          <Bouton
            variante="discret"
            className="text-alerte"
            onClick={async () => {
              const msg = actifs.length
                ? "Annuler cette demande ? Les prestataires positionnés seront prévenus et n'auront plus accès aux coordonnées."
                : "Annuler cette demande ?";
              if (!window.confirm(msg)) return;
              if (await agir("annuler_demande", { p_id: d.id })) router.refresh();
            }}
          >
            Annuler la demande
          </Bouton>
        )}
      </div>
    </>
  );
}

function FichePositionne({ p, metier, parAuteur, maintenant }: { p: Positionne; metier: string; parAuteur: boolean; maintenant: number }) {
  const reste = resteAvantEcheance(p.cree_le, maintenant);
  return (
    <div className="flex flex-col gap-1.5 border-t border-or-clair/40 pt-3">
      <div className="flex items-baseline justify-between gap-2">
        <Link href={`/membre/${p.membre_id}`} className="font-medium text-or-fonce underline underline-offset-4">{p.nom}</Link>
        <span className="text-xs text-encre-doux">{dateCourte(p.cree_le)}</span>
      </div>
      <p className="text-sm text-encre-doux">{[p.entreprise, metier].filter(Boolean).join(" · ")}</p>
      {p.message && <p className="rounded-xl bg-creme-fonce/50 p-2 text-sm">« {p.message} »</p>}
      <a href={`mailto:${p.email}`} className="text-sm text-or-fonce underline underline-offset-4">{p.email}</a>
      {parAuteur &&
        (p.coordonnees_recues_le ? (
          <p className="text-sm text-succes">✓ Coordonnées reçues</p>
        ) : reste > 0 ? (
          <p className="rounded-xl bg-or-clair/40 p-2 text-sm font-medium text-or-fonce">
            ⏳ Transmettez-lui les coordonnées des mariés : il reste {dureeLisible(reste)}
          </p>
        ) : (
          <p className="rounded-xl bg-alerte/10 p-2 text-sm font-medium text-alerte">
            ⏳ Délai de 24 h dépassé : transmettez vite les coordonnées
          </p>
        ))}
    </div>
  );
}
