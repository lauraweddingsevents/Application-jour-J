"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bouton } from "@/components/ui/Bouton";
import { Carte } from "@/components/ui/Carte";
import { Champ } from "@/components/ui/Champ";
import { Selecteur } from "@/components/ui/Selecteur";
import { Protege } from "@/components/Protege";
import { messageErreur } from "@/lib/erreurs";
import { effacerMemoire } from "@/lib/memoire";
import { lireProfil, modifierProfil, type Profil } from "@/lib/plans";
import { supabaseNavigateur } from "@/lib/supabase/navigateur";
import { useSession } from "@/lib/useSession";
import { TYPES_COMPTE, type TypeCompte } from "@/plan/types";

export function Compte() {
  return (
    <Protege verifierType={false}>
      <Contenu />
    </Protege>
  );
}

function Contenu() {
  const router = useRouter();
  const session = useSession();
  const [profil, setProfil] = useState<Profil | null>(null);
  const [nom, setNom] = useState("");
  const [type, setType] = useState<TypeCompte | "">("");
  const [motDePasse, setMotDePasse] = useState("");
  const [message, setMessage] = useState("");
  const [erreur, setErreur] = useState("");
  const [depuisPlans, setDepuisPlans] = useState(false);
  const [nouveauMotDePasse, setNouveauMotDePasse] = useState(false);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    // Lecture de l'adresse : possible seulement une fois la page affichée
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDepuisPlans(p.get("depuis") === "plans");
    setNouveauMotDePasse(p.has("motdepasse"));
    lireProfil().then((pr) => {
      setProfil(pr);
      setNom(pr?.nom ?? "");
      setType(pr?.type_compte ?? "");
    });
  }, []);

  async function agir(action: () => Promise<void>, ok: string) {
    setMessage("");
    setErreur("");
    try {
      await action();
      setMessage(ok);
    } catch (e) {
      setErreur(messageErreur(e as Error));
    }
  }

  const retour = depuisPlans || (type && type !== "wedding_planner") ? { href: "/plans", texte: "Mes plans" } : { href: "/tableau", texte: "Mes mariages" };

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-6">
      <Link href={retour.href} className="flex min-h-[44px] items-center gap-1 text-or-fonce">
        <span aria-hidden>←</span> {retour.texte}
      </Link>
      <h1 className="mt-6 text-2xl font-medium">Mon compte</h1>
      <p className="mt-1 text-sm text-encre-doux">{session?.user.email}</p>

      {message && <p className="mt-4 rounded-2xl bg-succes/15 px-4 py-3 text-sm text-succes" role="status">{message}</p>}
      {erreur && <p className="mt-4 text-sm text-alerte">{erreur}</p>}

      <Carte className="mt-6 flex flex-col gap-4">
        <h2 className="font-medium">Mes informations</h2>
        <Champ id="nom" libelle="Prénom, nom ou société" value={nom} onChange={(e) => setNom(e.target.value)} autoComplete="name" />
        <Selecteur id="type" libelle="Type de compte" value={type} onChange={(e) => setType(e.target.value as TypeCompte)}>
          {!type && <option value="">— Choisir —</option>}
          {TYPES_COMPTE.map((t) => (
            <option key={t.valeur} value={t.valeur}>{t.texte}</option>
          ))}
        </Selecteur>
        <Bouton
          variante="secondaire"
          disabled={!type || !profil}
          onClick={() => agir(() => modifierProfil({ nom: nom.trim() || null, type_compte: type as TypeCompte }), "✓ Informations enregistrées.")}
        >
          Enregistrer
        </Bouton>
      </Carte>

      <Carte className={`mt-4 flex flex-col gap-4 ${nouveauMotDePasse ? "ring-2 ring-or" : ""}`}>
        <h2 className="font-medium">{nouveauMotDePasse ? "Choisissez votre nouveau mot de passe" : "Mot de passe"}</h2>
        <p className="text-sm text-encre-doux">
          Facultatif : vous pouvez toujours vous connecter avec un lien reçu par e-mail.
        </p>
        <Champ
          id="motdepasse"
          libelle="Nouveau mot de passe (8 caractères minimum)"
          type="password"
          autoComplete="new-password"
          value={motDePasse}
          onChange={(e) => setMotDePasse(e.target.value)}
          minLength={8}
        />
        <Bouton
          variante="secondaire"
          disabled={motDePasse.length < 8}
          onClick={() =>
            agir(async () => {
              const { error } = await supabaseNavigateur().auth.updateUser({ password: motDePasse });
              if (error) throw error;
              setMotDePasse("");
              setNouveauMotDePasse(false);
            }, "✓ Mot de passe enregistré.")
          }
        >
          Enregistrer le mot de passe
        </Bouton>
      </Carte>

      <Bouton
        variante="discret"
        className="mt-6 w-full"
        onClick={async () => {
          await supabaseNavigateur().auth.signOut();
          effacerMemoire();
          router.replace(depuisPlans ? "/plan-de-salle" : "/");
        }}
      >
        Se déconnecter
      </Bouton>
    </main>
  );
}
