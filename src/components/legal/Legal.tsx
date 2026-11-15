import type { ReactNode } from "react";

// Coordonnées de l'éditeur (pages légales de Mon plan de salle)
export const EDITEUR = {
  nom: "Laura Weddings & Events",
  siret: "831 141 957 00033",
  adresse: "2 rue Serge Sabatier, 13140 Miramas",
  email: "laura.weddings.events@gmail.com",
};

export function Section({ titre, children }: { titre: string; children: ReactNode }) {
  return (
    <section className="mt-8 space-y-3">
      <h2 className="text-lg font-medium text-or-fonce">{titre}</h2>
      {children}
    </section>
  );
}

export function Courriel() {
  return (
    <a className="underline underline-offset-4" href={`mailto:${EDITEUR.email}`}>
      {EDITEUR.email}
    </a>
  );
}
