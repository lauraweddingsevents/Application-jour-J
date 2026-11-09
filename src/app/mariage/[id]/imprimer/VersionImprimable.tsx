"use client";
import { Fragment, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Protege } from "@/components/Protege";
import { SECTIONS_FICHE } from "@/components/fiche/AffichageFiche";
import { lireMariage, listerFiche, listerIntervenants, listerMoments } from "@/lib/donnees";
import { dateLongue } from "@/lib/dates";
import { messageErreur } from "@/lib/erreurs";
import { dureeLisible, estApresMinuit, heureAffichee, minutesEntre } from "@/lib/heures";
import { nomMariage, trierMoments, type ElementFiche, type Intervenant, type Mariage, type Moment } from "@/lib/types";

type Donnees = { mariage: Mariage; moments: Moment[]; intervenants: Intervenant[]; fiche: ElementFiche[] };

export function VersionImprimable() {
  return (
    <Protege>
      <Contenu />
    </Protege>
  );
}

function Contenu() {
  const { id } = useParams<{ id: string }>();
  const [d, setD] = useState<Donnees | null>(null);
  const [erreur, setErreur] = useState("");
  const [avecTelephones, setAvecTelephones] = useState(true);
  const [avecNotes, setAvecNotes] = useState(true);
  const [avecPrestataires, setAvecPrestataires] = useState(true);

  useEffect(() => {
    Promise.all([lireMariage(id), listerMoments(id), listerIntervenants(id), listerFiche(id)])
      .then(([mariage, moments, intervenants, fiche]) => {
        if (!mariage) return setErreur("Ce mariage est introuvable.");
        setD({ mariage, moments: trierMoments(moments), intervenants, fiche });
      })
      .catch((e) => setErreur(messageErreur(e)));
  }, [id]);

  if (erreur) return <p className="mt-20 text-center text-alerte">{erreur}</p>;
  if (!d) return <p className="mt-20 text-center text-encre-doux">Préparation de la version imprimable…</p>;

  const tz = d.mariage.fuseau_horaire;
  const noms = new Map(d.intervenants.map((i) => [i.id, i.nom]));
  const fiche = d.fiche.filter((e) => avecPrestataires || e.visibilite === "tous");
  const maintenant = new Date().toLocaleString("fr-FR", { dateStyle: "long", timeStyle: "short" });

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6 print:max-w-none print:p-0">
      {/* Réglages, invisibles à l'impression */}
      <div className="mb-6 flex flex-col gap-3 rounded-carte bg-blanc p-4 ring-1 ring-or-clair/60 print:hidden">
        <Link href={`/mariage/${id}`} className="text-sm text-or-fonce">
          ← Retour au mariage
        </Link>
        <p className="text-sm text-encre-doux">
          Une copie papier, pour le jour J : à imprimer, ou à enregistrer en PDF
          (choisissez « Enregistrer au format PDF » comme imprimante).
        </p>
        <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
          <Case libelle="Téléphones des intervenants" valeur={avecTelephones} onChange={setAvecTelephones} />
          <Case libelle="Notes des moments" valeur={avecNotes} onChange={setAvecNotes} />
          <Case libelle="Infos réservées aux prestataires" valeur={avecPrestataires} onChange={setAvecPrestataires} />
        </div>
        <button
          type="button"
          onClick={() => window.print()}
          className="min-h-[52px] rounded-full bg-or px-6 font-medium text-blanc"
        >
          🖨 Imprimer ou enregistrer en PDF
        </button>
      </div>

      {/* La feuille */}
      <article className="rounded-carte bg-blanc p-6 text-[13px] leading-snug text-encre ring-1 ring-or-clair/60 print:rounded-none print:p-0 print:ring-0">
        <header className="border-b border-or pb-3">
          <p className="text-[11px] uppercase tracking-[0.2em] text-or-fonce">Déroulé du mariage de</p>
          <h1 className="text-2xl font-medium">{nomMariage(d.mariage)}</h1>
          <p className="text-encre-doux first-letter:uppercase">
            {dateLongue(d.mariage.date_mariage)}
            {d.mariage.lieu_principal && ` · ${d.mariage.lieu_principal}`}
          </p>
        </header>

        <h2 className="mt-5 text-sm font-medium uppercase tracking-wider text-or-fonce">Déroulé</h2>
        <table className="mt-2 w-full border-collapse">
          <thead>
            <tr className="border-b border-or-clair text-left text-[11px] uppercase tracking-wider text-encre-doux">
              <th className="w-16 py-1.5 pr-2 font-medium">Heure</th>
              <th className="py-1.5 pr-2 font-medium">Moment</th>
              <th className="w-[22%] py-1.5 pr-2 font-medium">Lieu</th>
              <th className="w-[26%] py-1.5 font-medium">Qui</th>
            </tr>
          </thead>
          <tbody>
            {d.moments.map((m, i) => {
              const nuit = estApresMinuit(m.debut, d.mariage.date_mariage, tz);
              const nuitAvant = i > 0 && estApresMinuit(d.moments[i - 1].debut, d.mariage.date_mariage, tz);
              return (
                <Fragment key={m.id}>
                  {nuit && !nuitAvant && (
                    <tr>
                      <td colSpan={4} className="pt-3 pb-1 text-[11px] uppercase tracking-wider text-encre-doux">
                        Après minuit
                      </td>
                    </tr>
                  )}
                  <tr className="break-inside-avoid border-b border-or-clair/50 align-top">
                    <td className="py-1.5 pr-2">
                      <span className="font-medium">{heureAffichee(m.debut, tz)}</span>
                      {m.fin && (
                        <span className="block whitespace-nowrap text-[11px] text-encre-doux">
                          → {heureAffichee(m.fin, tz)}
                          <br />
                          {dureeLisible(minutesEntre(m.debut, m.fin))}
                        </span>
                      )}
                    </td>
                    <td className="py-1.5 pr-2">
                      <span className="font-medium">{m.titre}</span>
                      {avecNotes && m.notes && (
                        <span className="block whitespace-pre-line text-[12px] text-encre-doux">{m.notes}</span>
                      )}
                    </td>
                    <td className="py-1.5 pr-2">{m.lieu}</td>
                    <td className="py-1.5 text-[12px]">
                      {m.intervenants.map((x) => noms.get(x)).filter(Boolean).join(", ")}
                    </td>
                  </tr>
                </Fragment>
              );
            })}
          </tbody>
        </table>

        <div className="mt-6 grid gap-6 print:grid-cols-2 sm:grid-cols-2">
          <section className="break-inside-avoid">
            <h2 className="text-sm font-medium uppercase tracking-wider text-or-fonce">Intervenants</h2>
            <table className="mt-2 w-full border-collapse">
              <tbody>
                {d.intervenants.map((i) => (
                  <tr key={i.id} className="border-b border-or-clair/50 align-top">
                    <td className="py-1 pr-2 font-medium">{i.nom}</td>
                    <td className="py-1 pr-2 text-encre-doux">{i.role}</td>
                    {avecTelephones && <td className="whitespace-nowrap py-1">{i.telephone}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          {fiche.length > 0 && (
            <section className="break-inside-avoid">
              <h2 className="text-sm font-medium uppercase tracking-wider text-or-fonce">Infos pratiques</h2>
              {SECTIONS_FICHE.map((s) => {
                const elements = fiche.filter((e) => e.categorie === s.categorie);
                if (!elements.length) return null;
                return (
                  <div key={s.categorie} className="mt-2">
                    <p className="text-[11px] uppercase tracking-wider text-encre-doux">{s.titre}</p>
                    <ul className="mt-1 space-y-1">
                      {elements.map((e) => (
                        <li key={e.id}>
                          <span className="font-medium">{e.titre}</span>
                          {e.telephone && ` · ${e.telephone}`}
                          {e.adresse && <span className="block text-[12px]">{e.adresse}</span>}
                          {e.contenu && (
                            <span className="block whitespace-pre-line text-[12px] text-encre-doux">{e.contenu}</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </section>
          )}
        </div>

        <footer className="mt-6 border-t border-or-clair pt-2 text-[10px] text-encre-doux">
          Imprimé le {maintenant} · Les horaires peuvent avoir changé depuis : la version à jour est sur Ma Coordo.
        </footer>
      </article>
    </div>
  );
}

function Case({ libelle, valeur, onChange }: { libelle: string; valeur: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex min-h-[40px] cursor-pointer items-center gap-2">
      <input
        type="checkbox"
        checked={valeur}
        onChange={(e) => onChange(e.target.checked)}
        className="h-5 w-5 accent-[#A07E5E]"
      />
      {libelle}
    </label>
  );
}
