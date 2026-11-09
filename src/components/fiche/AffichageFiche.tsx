// Affichage de la fiche pratique (utilisé par la créatrice et sur les liens personnels)
import { Carte } from "@/components/ui/Carte";
import {
  lienGoogleMaps,
  lienTelephone,
  type CategorieFiche,
  type ElementFiche,
} from "@/lib/types";

export const SECTIONS_FICHE: { categorie: CategorieFiche; titre: string; icone: string }[] = [
  { categorie: "contact", titre: "Contacts utiles", icone: "📞" },
  { categorie: "adresse", titre: "Adresses", icone: "📍" },
  { categorie: "meteo", titre: "Plan B météo", icone: "☔" },
  { categorie: "note", titre: "Notes", icone: "📝" },
];

type Element = Pick<
  ElementFiche,
  "id" | "categorie" | "titre" | "contenu" | "telephone" | "adresse" | "visibilite"
>;

export function AffichageFiche({
  elements,
  onChoisir,
  montrerVisibilite,
}: {
  elements: Element[];
  onChoisir?: (id: string) => void;
  montrerVisibilite?: boolean;
}) {
  return (
    <div className="flex flex-col gap-6">
      {SECTIONS_FICHE.map((s) => {
        const liste = elements.filter((e) => e.categorie === s.categorie);
        if (!liste.length) return null;
        return (
          <section key={s.categorie}>
            <h2 className="mb-3 text-sm font-medium uppercase tracking-wider text-encre-doux">
              <span aria-hidden>{s.icone}</span> {s.titre}
            </h2>
            <ul className="flex flex-col gap-2">
              {liste.map((e) => (
                <li key={e.id}>
                  <CarteElement element={e} onChoisir={onChoisir} montrerVisibilite={montrerVisibilite} />
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

function CarteElement({
  element: e,
  onChoisir,
  montrerVisibilite,
}: {
  element: Element;
  onChoisir?: (id: string) => void;
  montrerVisibilite?: boolean;
}) {
  return (
    <Carte className="flex flex-col gap-3 py-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium">{e.titre}</p>
          {e.adresse && <p className="mt-0.5 text-sm text-encre-doux">{e.adresse}</p>}
          {e.contenu && <p className="mt-1 whitespace-pre-line text-sm text-encre-doux">{e.contenu}</p>}
          {montrerVisibilite && e.visibilite === "prestataires" && (
            <p className="mt-2 inline-block rounded-full bg-or/15 px-2.5 py-0.5 text-xs font-medium text-or-fonce">
              🔒 Prestataires uniquement
            </p>
          )}
        </div>
        {onChoisir && (
          <button
            type="button"
            onClick={() => onChoisir(e.id)}
            className="min-h-[44px] shrink-0 rounded-full px-3 text-sm text-or-fonce ring-1 ring-or-clair"
          >
            Modifier
          </button>
        )}
      </div>
      {(e.telephone || e.adresse) && (
        <div className="flex flex-wrap gap-2">
          {e.telephone && (
            <a
              href={lienTelephone(e.telephone)}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-or px-4 text-sm font-medium text-blanc"
            >
              📞 Appeler · {e.telephone}
            </a>
          )}
          {e.adresse && (
            <a
              href={lienGoogleMaps(e.adresse)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-blanc px-4 text-sm font-medium text-encre ring-1 ring-or-clair"
            >
              🗺️ Itinéraire Google Maps
            </a>
          )}
        </div>
      )}
    </Carte>
  );
}
