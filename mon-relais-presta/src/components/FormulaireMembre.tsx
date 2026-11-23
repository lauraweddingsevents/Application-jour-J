"use client";
import { useState, type FormEvent, type ReactNode } from "react";
import { Bouton } from "@/components/ui/Bouton";
import { Champ } from "@/components/ui/Champ";
import { Puces } from "@/components/ui/Puces";
import { useMembre } from "@/lib/membre";
import { DEPARTEMENTS, ZONES, type Zone } from "@/lib/zones";

export type ValeursMembre = {
  nom: string;
  entreprise: string;
  metiers: number[];
  zones: Zone[];
  departements: string[];
  lien: string;
};

// Fiche du membre : utilisée à l'inscription et dans « Mon profil »
export function FormulaireMembre({
  initial,
  texteBouton,
  enPlus,
  peutEnvoyer = true,
  onEnvoyer,
}: {
  initial: ValeursMembre;
  texteBouton: string;
  enPlus?: ReactNode;
  peutEnvoyer?: boolean;
  onEnvoyer: (v: ValeursMembre) => Promise<string | void>;
}) {
  const { metiers } = useMembre();
  const [v, setV] = useState<ValeursMembre>(initial);
  const [erreur, setErreur] = useState("");
  const [enCours, setEnCours] = useState(false);

  const maj = <K extends keyof ValeursMembre>(cle: K, valeur: ValeursMembre[K]) => setV((x) => ({ ...x, [cle]: valeur }));

  function changerZones(zones: Zone[]) {
    // On retire les départements qui ne font plus partie des zones choisies
    setV((x) => ({
      ...x,
      zones,
      departements: x.departements.filter((d) => DEPARTEMENTS.some((dep) => dep.code === d && zones.includes(dep.zone))),
    }));
  }

  async function envoyer(e: FormEvent) {
    e.preventDefault();
    setErreur("");
    if (v.metiers.length === 0) return setErreur("Choisissez au moins un métier.");
    if (v.metiers.length > 6) return setErreur("6 métiers au maximum.");
    if (v.zones.length === 0) return setErreur("Choisissez au moins une zone.");
    if (v.departements.length === 0) return setErreur("Choisissez au moins un département couvert.");
    setEnCours(true);
    const probleme = await onEnvoyer({ ...v, nom: v.nom.trim(), entreprise: v.entreprise.trim(), lien: v.lien.trim() });
    setEnCours(false);
    if (probleme) setErreur(probleme);
  }

  return (
    <form onSubmit={envoyer} className="flex flex-col gap-5">
      <Champ id="nom" libelle="Prénom et nom" autoComplete="name" required minLength={2} maxLength={80}
        value={v.nom} onChange={(e) => maj("nom", e.target.value)} />
      <Champ id="entreprise" libelle="Entreprise" autoComplete="organization" maxLength={100}
        value={v.entreprise} onChange={(e) => maj("entreprise", e.target.value)} />
      <Puces<string>
        libelle="Mes métiers"
        aide={v.metiers.length > 1
          ? `Métier principal (affiché en premier) : ${metiers.find((m) => m.id === v.metiers[0])?.nom ?? ""}. Vous recevrez les demandes de tous vos métiers.`
          : "Vous pouvez en choisir plusieurs (ex. DJ et chanteuse). Le premier choisi est votre métier principal."}
        options={metiers.filter((m) => m.actif || v.metiers.includes(m.id)).map((m) => ({ valeur: String(m.id), texte: m.nom }))}
        valeurs={v.metiers.map(String)}
        onChange={(x) => maj("metiers", x.map(Number))}
      />
      <Puces<Zone>
        libelle="Ma communauté"
        options={ZONES.map((z) => ({ valeur: z.code, texte: `${z.communaute} · ${z.nom}` }))}
        valeurs={v.zones}
        onChange={changerZones}
        aide="Vous pouvez faire partie des deux."
      />
      {v.zones.length > 0 && (
        <div className="flex flex-col gap-4">
          {ZONES.filter((z) => v.zones.includes(z.code)).map((z) => {
            const deps = DEPARTEMENTS.filter((d) => d.zone === z.code);
            const tous = deps.every((d) => v.departements.includes(d.code));
            return (
              <div key={z.code}>
                <Puces<string>
                  libelle={`Départements couverts · ${z.nom}`}
                  options={deps.map((d) => ({ valeur: d.code, texte: `${d.code} · ${d.nom}` }))}
                  valeurs={v.departements}
                  onChange={(x) => maj("departements", x)}
                />
                <button
                  type="button"
                  className="mt-2 min-h-[40px] text-sm text-or-fonce underline underline-offset-4"
                  onClick={() =>
                    maj(
                      "departements",
                      tous
                        ? v.departements.filter((d) => !deps.some((x) => x.code === d))
                        : [...new Set([...v.departements, ...deps.map((d) => d.code)])],
                    )
                  }
                >
                  {tous ? "Tout décocher" : `Toute la zone ${z.nom}`}
                </button>
              </div>
            );
          })}
        </div>
      )}
      <Champ id="lien" libelle="Instagram ou site internet" placeholder="@mon.compte ou www.mon-site.fr" maxLength={200}
        value={v.lien} onChange={(e) => maj("lien", e.target.value)} />
      {enPlus}
      {erreur && <p className="text-sm text-alerte">{erreur}</p>}
      <Bouton type="submit" disabled={enCours || !peutEnvoyer}>{enCours ? "Enregistrement…" : texteBouton}</Bouton>
    </form>
  );
}
