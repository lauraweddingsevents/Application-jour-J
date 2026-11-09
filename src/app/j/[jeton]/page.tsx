import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { VueIntervenant } from "./VueIntervenant";

export async function generateMetadata({ params }: PageProps<"/j/[jeton]">): Promise<Metadata> {
  const { jeton } = await params;
  return {
    title: "Mon déroulé du jour J",
    // Les liens personnels ne doivent pas apparaître dans les moteurs de recherche
    robots: { index: false, follow: false },
    referrer: "no-referrer",
    // Ajouté à l'écran d'accueil, le lien s'ouvre directement sur ce déroulé
    manifest: `/j/${encodeURIComponent(jeton)}/manifest.webmanifest`,
    appleWebApp: { capable: true, title: "Jour J", statusBarStyle: "default" },
  };
}

export const viewport: Viewport = { themeColor: "#F4EDE4" };

export default function PageLien() {
  return (
    <Suspense fallback={<p className="mt-20 text-center text-encre-doux">Chargement…</p>}>
      <VueIntervenant />
    </Suspense>
  );
}
