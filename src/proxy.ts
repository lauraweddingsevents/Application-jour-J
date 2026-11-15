import { NextResponse, type NextRequest } from "next/server";
import { estAdressePlan } from "@/lib/marque";

// Sur l'adresse de « Mon plan de salle », l'application se présente seule :
// la page d'accueil, la connexion et l'icône d'écran d'accueil sont celles
// du plan de salle, et l'on ne tombe jamais sur Ma Coordo par erreur.
export function proxy(requete: NextRequest) {
  if (!estAdressePlan(requete.headers.get("host"))) return NextResponse.next();
  const url = requete.nextUrl.clone();
  switch (url.pathname) {
    case "/":
      url.pathname = "/plan-de-salle";
      return NextResponse.rewrite(url);
    case "/manifest.webmanifest":
      url.pathname = "/plans/manifest.webmanifest";
      return NextResponse.rewrite(url);
    case "/connexion":
      url.pathname = "/plans/connexion";
      return NextResponse.redirect(url);
    case "/tableau":
      url.pathname = "/plans";
      return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/manifest.webmanifest", "/connexion", "/tableau"],
};
