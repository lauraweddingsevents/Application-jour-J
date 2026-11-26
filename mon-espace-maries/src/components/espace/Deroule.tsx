"use client";
import { Carte, Chargement, EnTetePage, Vide } from "@/components/ui";
import { useDonnees, useEspace } from "@/lib/espace";
import { derouleDefinitif, formatDate, formatHeure } from "@/lib/calculs";
import type { ReponseDeroule } from "@/lib/deroule";


// Repris de Ma Coordo, en lecture seule, à chaque ouverture
export function Deroule() {
  const { couple, t, langue, droits } = useEspace();
  const { donnees, erreur } = useDonnees(async () => {
    const r = await fetch(`/api/deroule?couple=${couple.id}`, { cache: "no-store" });
    if (!r.ok) throw new Error("deroule");
    return (await r.json()) as ReponseDeroule;
  }, [couple.id]);
  const td = t.deroule;
  const definitif = derouleDefinitif(couple.date_mariage);

  if (erreur) return <><EnTetePage titre={td.titre} /><Vide>{td.erreur}</Vide></>;
  if (!donnees) return <><EnTetePage titre={td.titre} /><Chargement texte={t.chargement} /></>;
  if (!donnees.disponible || donnees.moments.length === 0)
    return <><EnTetePage titre={td.titre} /><Vide>{droits.admin ? "Collez le lien personnel « Les mariés » de Ma Coordo dans la fiche du couple pour afficher le déroulé ici." : td.indisponible}</Vide></>;

  const jours = [...new Set(donnees.moments.map((m) => m.journee))].sort();
  return (
    <>
      <EnTetePage titre={td.titre} />
      <p className={`mb-4 rounded-xl px-3 py-2 text-sm ${definitif ? "bg-vert-pale text-vert" : "bg-orange-pale text-orange"}`}>{definitif ? td.definitif : td.provisoire}</p>
      <div className="flex flex-col gap-5">
        {jours.map((jour) => {
          const info = donnees.jours.find((j) => j.date === jour);
          return (
            <section key={jour}>
              {jours.length > 1 && (
                <h2 className="mb-2 font-titre text-2xl font-semibold first-letter:uppercase">
                  {info?.titre || formatDate(jour, langue, { weekday: "long", day: "numeric", month: "long" })}
                </h2>
              )}
              <Carte className="px-4 py-1 sm:px-5">
                <ol>
                  {donnees.moments.filter((m) => m.journee === jour).map((m) => (
                    <li key={m.id} className="flex gap-4 border-b border-trait-fin py-3 last:border-none">
                      <span className="w-20 shrink-0 font-titre text-xl font-semibold text-bordeaux">{formatHeure(m.debut, langue)}</span>
                      <span className="flex flex-col gap-0.5">
                        <span className="text-[15px] font-medium">{m.titre}</span>
                        {m.lieu && <span className="text-[13px] text-doux">{m.lieu}</span>}
                      </span>
                    </li>
                  ))}
                </ol>
              </Carte>
            </section>
          );
        })}
      </div>
    </>
  );
}
