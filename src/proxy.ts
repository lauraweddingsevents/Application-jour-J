import { NextResponse, type NextRequest } from "next/server";
import { estAdressePlan } from "@/lib/marque";

// Sur l'adresse de « Mon plan de salle », l'application se présente seule :
// la page d'accueil, la connexion et l'icône d'écran d'accueil sont celles
// du plan de salle, et l'on ne tombe jamais sur Ma Coordo par erreur.
export function proxy(requete: NextRequest) {
  const plan = estAdressePlan(requete.headers.get("host"));
  const url = requete.nextUrl.clone();

  // Liens des e-mails de connexion / confirmation qui arrivent sur la page
  // d'accueil (modèles d'e-mail communs à plusieurs applications) :
  // on les envoie vers la page qui valide la connexion.
  const p = url.searchParams;
  if (url.pathname === "/" && (p.has("token_hash") || p.has("code") || p.has("error_description"))) {
    url.pathname = "/auth/confirm";
    if (!p.has("suite")) p.set("suite", plan ? "/plans" : "/tableau");
    return NextResponse.redirect(url);
  }

  if (!plan) return NextResponse.next();
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
