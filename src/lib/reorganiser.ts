import { ajouterMinutes, minutesEntre } from "@/lib/heures";
import type { Moment } from "@/lib/types";

type Creneau = Pick<Moment, "debut" | "fin" | "ordre">;

// Échange deux moments qui se suivent (« avant » puis « apres ») :
// celui du dessous prend la place de celui du dessus, chacun garde sa durée.
export function echangerMoments(avant: Moment, apres: Moment): [Creneau, Creneau] {
  // Même heure de début : on échange seulement l'ordre d'affichage
  if (avant.debut === apres.debut) {
    return [
      { debut: apres.debut, fin: apres.fin, ordre: avant.ordre },
      { debut: avant.debut, fin: avant.fin, ordre: apres.ordre === avant.ordre ? avant.ordre + 1 : apres.ordre },
    ].reverse() as [Creneau, Creneau];
  }
  const dureeAvant = avant.fin ? minutesEntre(avant.debut, avant.fin) : null;
  const dureeApres = apres.fin ? minutesEntre(apres.debut, apres.fin) : null;
  const contigus = avant.fin !== null && avant.fin === apres.debut;

  const nouveauApresDebut = avant.debut;
  const nouveauApresFin = dureeApres !== null ? ajouterMinutes(nouveauApresDebut, dureeApres) : null;
  const nouveauAvantDebut =
    contigus && nouveauApresFin ? nouveauApresFin : apres.debut;
  const nouveauAvantFin = dureeAvant !== null ? ajouterMinutes(nouveauAvantDebut, dureeAvant) : null;

  // Résultat : [nouveau créneau de « avant », nouveau créneau de « apres »]
  return [
    { debut: nouveauAvantDebut, fin: nouveauAvantFin, ordre: apres.ordre },
    { debut: nouveauApresDebut, fin: nouveauApresFin, ordre: avant.ordre },
  ];
}
