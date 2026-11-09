import { manifeste, reponseManifeste } from "@/lib/manifeste";

// Chaque lien personnel est une « application » distincte qui s'ouvre
// directement sur le déroulé de l'intervenant.
export async function GET(_requete: Request, { params }: RouteContext<"/j/[jeton]/manifest.webmanifest">) {
  const { jeton } = await params;
  const adresse = `/j/${encodeURIComponent(jeton)}`;
  return reponseManifeste(
    manifeste({ nom: "Ma Coordo – Mon jour J", nomCourt: "Jour J", adresseDepart: adresse, id: adresse }),
  );
}
