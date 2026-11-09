"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bouton } from "@/components/ui/Bouton";
import { Carte } from "@/components/ui/Carte";
import { Champ } from "@/components/ui/Champ";
import { supabaseNavigateur } from "@/lib/supabase/navigateur";
import { useSession } from "@/lib/useSession";
import { messageErreur } from "@/lib/erreurs";

export function FormulaireConnexion() {
  const router = useRouter();
  const session = useSession();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [etape, setEtape] = useState<"email" | "envoye">("email");
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState("");

  // Déjà connectée ? On va directement au tableau de bord.
  useEffect(() => {
    if (session) router.replace("/tableau");
  }, [session, router]);

  async function envoyerLien(e: React.FormEvent) {
    e.preventDefault();
    setErreur("");
    setEnCours(true);
    const { error } = await supabaseNavigateur().auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/confirm`,
        shouldCreateUser: true,
      },
    });
    setEnCours(false);
    if (error) return setErreur(messageErreur(error));
    setEtape("envoye");
  }

  async function verifierCode(e: React.FormEvent) {
    e.preventDefault();
    setErreur("");
    setEnCours(true);
    const { error } = await supabaseNavigateur().auth.verifyOtp({
      email: email.trim(),
      token: code.replace(/\s/g, ""),
      type: "email",
    });
    setEnCours(false);
    if (error) return setErreur(messageErreur(error));
    router.replace("/tableau");
  }

  if (etape === "envoye") {
    return (
      <Carte className="mt-8 flex flex-col gap-5">
        <div className="text-center">
          <p className="text-3xl" aria-hidden>
            ✉️
          </p>
          <h2 className="mt-2 font-medium">Vérifiez votre boîte mail</h2>
          <p className="mt-1 text-sm text-encre-doux">
            Un e-mail vient d&apos;être envoyé à <strong>{email}</strong>.
            Cliquez sur le lien qu&apos;il contient, ou saisissez ci-dessous le
            code indiqué.
          </p>
        </div>
        <form onSubmit={verifierCode} className="flex flex-col gap-4">
          <Champ
            id="code"
            libelle="Code reçu par e-mail"
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="123456"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            required
            className="text-center text-xl tracking-[0.3em]"
          />
          {erreur && <p className="text-sm text-alerte">{erreur}</p>}
          <Bouton type="submit" disabled={enCours || code.length < 6}>
            {enCours ? "Vérification…" : "Valider le code"}
          </Bouton>
        </form>
        <Bouton
          variante="discret"
          onClick={() => {
            setEtape("email");
            setCode("");
            setErreur("");
          }}
        >
          Utiliser une autre adresse
        </Bouton>
      </Carte>
    );
  }

  return (
    <Carte className="mt-8">
      <form onSubmit={envoyerLien} className="flex flex-col gap-4">
        <Champ
          id="email"
          libelle="Votre adresse e-mail"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="prenom@exemple.fr"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        {erreur && <p className="text-sm text-alerte">{erreur}</p>}
        <Bouton type="submit" disabled={enCours}>
          {enCours ? "Envoi en cours…" : "Recevoir mon lien de connexion"}
        </Bouton>
        <p className="text-center text-sm text-encre-doux">
          Première visite ? Votre compte est créé automatiquement.
        </p>
      </form>
    </Carte>
  );
}
