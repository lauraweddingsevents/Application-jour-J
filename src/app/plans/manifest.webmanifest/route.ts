import { manifeste, reponseManifeste } from "@/lib/manifeste";

// « Mon plan de salle » installé sur l'écran d'accueil : s'ouvre sur « Mes plans »
export function GET() {
  const contenu = manifeste({ nom: "Mon plan de salle", nomCourt: "Plan de salle", adresseDepart: "/plans", id: "/plans" });
  return reponseManifeste({ ...contenu, description: "Votre plan de salle, à l'échelle et partagé." });
}
