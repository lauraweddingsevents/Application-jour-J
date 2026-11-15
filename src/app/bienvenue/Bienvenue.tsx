"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bouton } from "@/components/ui/Bouton";
import { Champ } from "@/components/ui/Champ";
import { Protege } from "@/components/Protege";
import { messageErreur } from "@/lib/erreurs";
import { modifierProfil } from "@/lib/plans";
import { lireSuite } from "@/lib/suite";
import { TYPES_COMPTE, type TypeCompte } from "@/plan/types";

// Première connexion : on demande qui vous êtes (mariés, lieu…)
export function Bienvenue() {
  return (
    <Protege verifierType={false}>
      <Choix />
    </Protege>
  );
}

function Choix() {
  const router = useRouter();
  const [type, setType] = useState<TypeCompte | null>(null);
  const [nom, setNom] = useState("");
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState("");

  async function valider() {
    if (!type) return;
    setEnCours(true);
    setErreur("");
    try {
      await modifierProfil({ type_compte: type, nom: nom.trim() || null });
      router.replace(lireSuite(type === "wedding_planner" ? "/tableau" : "/plans"));
    } catch (e) {
      setErreur(messageErreur(e as Error));
      setEnCours(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-12">
      <h1 className="text-2xl font-medium">Bienvenue 👋</h1>
      <p className="mt-2 text-encre-doux">Pour adapter l&apos;outil, dites-nous qui vous êtes.</p>
      <div className="mt-6 flex flex-col gap-2" role="radiogroup" aria-label="Type de compte">
        {TYPES_COMPTE.map((t) => (
          <button
            key={t.valeur}
            type="button"
            role="radio"
            aria-checked={type === t.valeur}
            onClick={() => setType(t.valeur)}
            className={`rounded-carte p-4 text-left ring-1 transition-colors ${
              type === t.valeur ? "bg-or text-blanc ring-or" : "bg-blanc ring-or-clair/60"
            }`}
          >
            <span className="block font-medium">{t.texte}</span>
            <span className={`block text-sm ${type === t.valeur ? "text-blanc/85" : "text-encre-doux"}`}>{t.detail}</span>
          </button>
        ))}
      </div>
      <div className="mt-6">
        <Champ
          id="nom"
          libelle={type === "lieu" ? "Nom du lieu (facultatif)" : "Votre prénom ou votre société (facultatif)"}
          value={nom}
          onChange={(e) => setNom(e.target.value)}
          autoComplete="name"
        />
      </div>
      {erreur && <p className="mt-4 text-sm text-alerte">{erreur}</p>}
      <Bouton className="mt-6 w-full" disabled={!type || enCours} onClick={valider}>
        {enCours ? "Un instant…" : "Continuer"}
      </Bouton>
    </main>
  );
}
