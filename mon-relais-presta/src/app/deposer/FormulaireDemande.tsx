"use client";
import { useEffect, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Bouton } from "@/components/ui/Bouton";
import { Carte } from "@/components/ui/Carte";
import { Case } from "@/components/ui/Case";
import { Champ } from "@/components/ui/Champ";
import { Choix } from "@/components/ui/Choix";
import { Liste } from "@/components/ui/Liste";
import { ZoneTexte } from "@/components/ui/ZoneTexte";
import { useMembre, nomMetier } from "@/lib/membre";
import { supabaseNavigateur } from "@/lib/supabase/navigateur";
import { messageErreur } from "@/lib/erreurs";
import { aujourdhuiIso, type DetailDemande, type ModeCoordonnees } from "@/lib/demandes";
import { DEPARTEMENTS, ZONES } from "@/lib/zones";

type Valeurs = {
  date: string;
  departement: string;
  lieu: string;
  metier: string;
  invites: string;
  budget: string;
  note: string;
  mode: ModeCoordonnees;
  nom: string;
  telephone: string;
  email: string;
  accord: boolean;
};

// Déposer une demande (aussi : modifier, ou dupliquer pour un autre métier)
export function FormulaireDemande() {
  const router = useRouter();
  const params = useSearchParams();
  const idModif = params.get("modifier");
  const idSource = params.get("dupliquer");
  const { membre, metiers } = useMembre();

  const [v, setV] = useState<Valeurs>({
    date: "",
    departement: membre?.departements.length === 1 ? membre.departements[0] : "",
    lieu: "",
    metier: "",
    invites: "",
    budget: "",
    note: "",
    mode: "renseignees",
    nom: "",
    telephone: "",
    email: "",
    accord: false,
  });
  const [source, setSource] = useState<DetailDemande | null>(null);
  const [pret, setPret] = useState(!idModif && !idSource);
  const [erreur, setErreur] = useState("");
  const [enCours, setEnCours] = useState(false);

  // Modification ou duplication : on reprend les informations de la demande d'origine
  useEffect(() => {
    const id = idModif ?? idSource;
    if (!id) return;
    supabaseNavigateur()
      .rpc("detail_demande", { p_id: id })
      .then(({ data, error }) => {
        const d = data as DetailDemande | null;
        if (error || !d || !d.je_suis_auteur) {
          setErreur(error ? messageErreur(error) : "Demande introuvable.");
          return setPret(true);
        }
        setSource(d);
        setV({
          date: d.date_mariage,
          departement: d.departement,
          lieu: d.lieu,
          metier: idModif ? String(d.metier_id) : "",
          invites: String(d.invites),
          budget: d.budget != null ? String(d.budget) : "",
          note: d.note,
          mode: d.mode_coordonnees,
          nom: d.coordonnees?.nom ?? "",
          telephone: d.coordonnees?.telephone ?? "",
          email: d.coordonnees?.email ?? "",
          accord: true,
        });
        setPret(true);
      });
  }, [idModif, idSource]);

  const maj = <K extends keyof Valeurs>(cle: K, valeur: Valeurs[K]) => setV((x) => ({ ...x, [cle]: valeur }));

  // Métiers déjà demandés pour ce mariage (duplication)
  const dejaDemandes = new Set<number>(source && idSource ? [source.metier_id, ...source.groupe.map((g) => g.metier_id)] : []);

  async function envoyer(e: FormEvent) {
    e.preventDefault();
    setErreur("");
    if (!v.metier) return setErreur("Choisissez le métier recherché.");
    if (!v.departement) return setErreur("Choisissez le département.");
    if (v.mode === "renseignees" && !v.telephone.trim() && !v.email.trim())
      return setErreur("Indiquez au moins le téléphone ou l'e-mail des mariés.");
    if (!v.accord) return setErreur("Cochez la case : les mariés doivent être d'accord.");

    const commun = {
      p_date: v.date,
      p_departement: v.departement,
      p_lieu: v.lieu,
      p_metier_id: Number(v.metier),
      p_invites: Number(v.invites),
      p_budget: v.budget ? Number(v.budget) : null,
      p_note: v.note,
      p_mode: v.mode,
      p_accord: v.accord,
      p_nom: v.mode === "renseignees" ? v.nom : "",
      p_telephone: v.mode === "renseignees" ? v.telephone : "",
      p_email: v.mode === "renseignees" ? v.email : "",
    };
    setEnCours(true);
    const supabase = supabaseNavigateur();
    if (idModif) {
      const { error } = await supabase.rpc("modifier_demande", { p_id: idModif, ...commun });
      setEnCours(false);
      if (error) return setErreur(messageErreur(error));
      fetch("/api/notifier", { method: "POST" }).catch(() => {});
      return router.replace(`/demande/${idModif}`);
    }
    const { data, error } = await supabase.rpc("deposer_demande", {
      ...commun,
      p_groupe_id: idSource && source ? source.groupe_id : null,
    });
    setEnCours(false);
    if (error) return setErreur(messageErreur(error));
    fetch("/api/notifier", { method: "POST" }).catch(() => {});
    router.replace(`/demande/${data}?nouvelle=1`);
  }

  if (!pret) return <p className="text-encre-doux">Chargement…</p>;

  const titre = idModif ? "Modifier la demande" : idSource ? "Dupliquer pour un autre métier" : "Déposer une demande";

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-light">{titre}</h1>
      {idSource && source && (
        <p className="text-encre-doux">
          Même mariage, mêmes informations : choisissez simplement le nouveau métier recherché. Cette nouvelle
          demande aura ses propres 3 places.
        </p>
      )}
      <Carte>
        <form onSubmit={envoyer} className="flex flex-col gap-5">
          <Liste id="metier" libelle="Métier recherché" required value={v.metier} onChange={(e) => maj("metier", e.target.value)}
            className={idSource ? "ring-2 ring-or" : ""}>
            <option value="">Choisir…</option>
            {metiers.filter((m) => (m.actif || String(m.id) === v.metier) && !dejaDemandes.has(m.id)).map((m) => (
              <option key={m.id} value={m.id}>{m.nom}</option>
            ))}
          </Liste>
          {idSource && dejaDemandes.size > 0 && (
            <p className="-mt-3 text-sm text-encre-doux">
              Déjà demandé pour ce mariage : {[...dejaDemandes].map((id) => nomMetier(metiers, id)).join(", ")}.
            </p>
          )}

          <Champ id="date" libelle="Date du mariage" type="date" required min={aujourdhuiIso()}
            value={v.date} onChange={(e) => maj("date", e.target.value)} />

          <Liste id="departement" libelle="Département" required value={v.departement} onChange={(e) => maj("departement", e.target.value)}>
            <option value="">Choisir…</option>
            {ZONES.map((z) => (
              <optgroup key={z.code} label={`${z.nom} · ${z.communaute}`}>
                {DEPARTEMENTS.filter((d) => d.zone === z.code).map((d) => (
                  <option key={d.code} value={d.code}>{d.code} · {d.nom}</option>
                ))}
              </optgroup>
            ))}
          </Liste>

          <Champ id="lieu" libelle="Commune ou lieu de réception" required minLength={2} maxLength={120}
            placeholder="Ex. Aix-en-Provence, Château de…" value={v.lieu} onChange={(e) => maj("lieu", e.target.value)} />

          <div className="grid grid-cols-2 gap-3">
            <Champ id="invites" libelle="Nombre d'invités" type="number" inputMode="numeric" required min={1} max={3000}
              value={v.invites} onChange={(e) => maj("invites", e.target.value)} />
            <Champ id="budget" libelle="Budget (€)" placeholder="Facultatif" type="number" inputMode="numeric" min={0}
              value={v.budget} onChange={(e) => maj("budget", e.target.value)} />
          </div>

          <ZoneTexte id="note" libelle="Note (facultatif)" maxLength={1500}
            placeholder="Style, horaires, contraintes…" value={v.note} onChange={(e) => maj("note", e.target.value)} />

          <Choix<ModeCoordonnees>
            libelle="Coordonnées des mariés"
            valeur={v.mode}
            onChange={(m) => maj("mode", m)}
            options={[
              { valeur: "renseignees", texte: "Je les renseigne" },
              { valeur: "par_auteur", texte: "Moi-même, sous 24 h" },
            ]}
          />
          {v.mode === "renseignees" ? (
            <div className="flex flex-col gap-4 rounded-2xl bg-creme-fonce/50 p-4">
              <p className="text-sm text-encre-doux">
                🔒 Masquées : visibles uniquement par les prestataires qui cliquent sur « Je suis dispo ».
              </p>
              <Champ id="nom-maries" libelle="Nom des mariés" maxLength={120} value={v.nom} onChange={(e) => maj("nom", e.target.value)} />
              <Champ id="tel-maries" libelle="Téléphone" type="tel" inputMode="tel" autoComplete="off" maxLength={40}
                value={v.telephone} onChange={(e) => maj("telephone", e.target.value)} />
              <Champ id="email-maries" libelle="E-mail" type="email" inputMode="email" autoComplete="off" maxLength={160}
                value={v.email} onChange={(e) => maj("email", e.target.value)} />
            </div>
          ) : (
            <p className="rounded-2xl bg-creme-fonce/50 p-4 text-sm text-encre-doux">
              Vous serez prévenu(e) à chaque prestataire positionné, et vous aurez 24 h pour lui transmettre les
              coordonnées des mariés. Il confirmera les avoir reçues.
            </p>
          )}

          <Case id="accord" coche={v.accord} onChange={(x) => maj("accord", x)}>
            Les mariés sont d&apos;accord pour que leurs coordonnées soient transmises.
          </Case>

          {erreur && <p className="text-sm text-alerte">{erreur}</p>}
          <Bouton type="submit" disabled={enCours}>
            {enCours ? "Enregistrement…" : idModif ? "Enregistrer les modifications" : "Déposer la demande"}
          </Bouton>
          {(idModif || idSource) && (
            <Link href={`/demande/${idModif ?? idSource}`} className="text-center text-sm text-encre-doux underline underline-offset-4">
              Annuler
            </Link>
          )}
        </form>
      </Carte>
    </div>
  );
}
