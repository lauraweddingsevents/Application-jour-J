import { manifeste, reponseManifeste } from "@/lib/manifeste";

// Application de la créatrice : s'ouvre sur « Mes mariages »
export function GET() {
  return reponseManifeste(
    manifeste({ nom: "Ma Coordo", nomCourt: "Ma Coordo", adresseDepart: "/tableau", id: "/tableau" }),
  );
}
