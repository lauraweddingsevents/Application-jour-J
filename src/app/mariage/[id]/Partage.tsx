"use client";
import { useState } from "react";
import { Bouton } from "@/components/ui/Bouton";
import { lienPersonnel, nomCourt, lienSms, lienWhatsApp, messageInvitation } from "@/lib/partage";
import type { Intervenant, Mariage } from "@/lib/types";

export function Partage({ intervenant, mariage }: { intervenant: Intervenant; mariage: Mariage }) {
  const [copie, setCopie] = useState(false);
  const lien = lienPersonnel(intervenant.jeton);
  const message = messageInvitation(intervenant, mariage);
  const partageNatif = typeof navigator !== "undefined" && "share" in navigator;

  async function copier() {
    try {
      await navigator.clipboard.writeText(lien);
    } catch {
      // Ancienne méthode si le presse-papiers est bloqué
      const zone = document.createElement("textarea");
      zone.value = lien;
      document.body.appendChild(zone);
      zone.select();
      document.execCommand("copy");
      zone.remove();
    }
    setCopie(true);
    setTimeout(() => setCopie(false), 2500);
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-encre-doux">
        Le lien personnel de <strong className="text-encre">{intervenant.nom}</strong>. Il ne
        montre que ses missions, le déroulé et la fiche pratique, jamais les coordonnées des
        autres.
      </p>
      <p className="break-all rounded-2xl bg-blanc px-4 py-3 font-mono text-sm ring-1 ring-or-clair">
        {lien}
      </p>
      <Bouton onClick={copier}>{copie ? "✓ Lien copié !" : "📋 Copier le lien"}</Bouton>
      <a
        href={lienSms(intervenant.telephone, message)}
        className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-full bg-blanc px-6 font-medium ring-1 ring-or-clair"
      >
        💬 Envoyer par SMS
      </a>
      <a
        href={lienWhatsApp(intervenant.telephone, message)}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-full bg-blanc px-6 font-medium ring-1 ring-or-clair"
      >
        🟢 Envoyer par WhatsApp
      </a>
      {partageNatif && (
        <Bouton
          variante="secondaire"
          onClick={() => navigator.share({ title: "Mon déroulé du jour J", text: message }).catch(() => {})}
        >
          ↗ Autres applications…
        </Bouton>
      )}
      <a
        href={lien}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-1 text-center text-sm text-or-fonce underline underline-offset-4"
      >
        Voir ce que voit {nomCourt(intervenant.nom)} ↗
      </a>
      {!intervenant.telephone && (
        <p className="text-center text-xs text-encre-doux">
          Astuce : ajoutez son téléphone pour pré-remplir le destinataire du SMS ou du WhatsApp.
        </p>
      )}
    </div>
  );
}
