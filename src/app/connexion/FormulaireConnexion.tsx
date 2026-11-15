"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bouton } from "@/components/ui/Bouton";
import { Carte } from "@/components/ui/Carte";
import { Champ } from "@/components/ui/Champ";
import { Choix } from "@/components/ui/Choix";
import { supabaseNavigateur } from "@/lib/supabase/navigateur";
import { useSession } from "@/lib/useSession";
import { messageErreur } from "@/lib/erreurs";
import { adresseConfirmation, lireSuite } from "@/lib/suite";

type Mode = "lien" | "motdepasse";
type Etape = "saisie" | "lien-envoye" | "confirmer-inscription" | "reinitialisation-envoyee";

// Connexion par lien/code reçu par e-mail, ou par e-mail + mot de passe.
// « suiteParDefaut » : page où aller ensuite (Ma Coordo ou Mon plan de salle).
export function FormulaireConnexion({ suiteParDefaut = "/tableau" }: { suiteParDefaut?: string }) {
  const router = useRouter();
  const session = useSession();
  const [mode, setMode] = useState<Mode>("lien");
  const [creation, setCreation] = useState(false);
  const [email, setEmail] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [code, setCode] = useState("");
  const [etape, setEtape] = useState<Etape>("saisie");
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState("");

  const suite = () => lireSuite(suiteParDefaut);

  // Déjà connecté(e) ? On continue directement.
  useEffect(() => {
    if (session) router.replace(lireSuite(suiteParDefaut));
  }, [session, router, suiteParDefaut]);

  async function agir(action: () => Promise<void>) {
    setErreur("");
    setEnCours(true);
    try {
      await action();
    } catch (e) {
      setErreur(messageErreur(e as Error));
    } finally {
      setEnCours(false);
    }
  }

  const supabase = () => supabaseNavigateur().auth;

  const envoyerLien = () =>
    agir(async () => {
      const { error } = await supabase().signInWithOtp({
        email: email.trim(),
        options: { emailRedirectTo: adresseConfirmation(suite()), shouldCreateUser: true },
      });
      if (error) throw error;
      setEtape("lien-envoye");
    });

  const verifierCode = () =>
    agir(async () => {
      const { error } = await supabase().verifyOtp({ email: email.trim(), token: code.replace(/\s/g, ""), type: "email" });
      if (error) throw error;
      router.replace(suite());
    });

  const seConnecter = () =>
    agir(async () => {
      const { error } = await supabase().signInWithPassword({ email: email.trim(), password: motDePasse });
      if (error) throw error;
      router.replace(suite());
    });

  const creerCompte = () =>
    agir(async () => {
      if (motDePasse.length < 8) throw new Error("Password should be at least 8 characters");
      const { data, error } = await supabase().signUp({
        email: email.trim(),
        password: motDePasse,
        options: { emailRedirectTo: adresseConfirmation(suite()) },
      });
      if (error) throw error;
      // Adresse déjà utilisée : Supabase renvoie un compte sans « identité »
      if (data.user && data.user.identities?.length === 0) throw new Error("User already registered");
      if (data.session) router.replace(suite());
      else setEtape("confirmer-inscription");
    });

  const motDePasseOublie = () =>
    agir(async () => {
      if (!email.trim()) throw new Error("Unable to validate email address: invalid format");
      const { error } = await supabase().resetPasswordForEmail(email.trim(), {
        redirectTo: adresseConfirmation("/compte?motdepasse=1"),
      });
      if (error) throw error;
      setEtape("reinitialisation-envoyee");
    });

  const recommencer = () => {
    setEtape("saisie");
    setCode("");
    setErreur("");
  };

  if (etape === "lien-envoye") {
    return (
      <Carte className="mt-8 flex flex-col gap-5">
        <Message titre="Vérifiez votre boîte mail">
          Un e-mail vient d&apos;être envoyé à <strong>{email}</strong>. Cliquez sur le lien qu&apos;il contient, ou
          saisissez ci-dessous le code indiqué.
        </Message>
        <form onSubmit={(e) => { e.preventDefault(); verifierCode(); }} className="flex flex-col gap-4">
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
        <Bouton variante="discret" onClick={recommencer}>Utiliser une autre adresse</Bouton>
      </Carte>
    );
  }

  if (etape === "confirmer-inscription" || etape === "reinitialisation-envoyee") {
    return (
      <Carte className="mt-8 flex flex-col gap-5">
        <Message titre="Vérifiez votre boîte mail">
          {etape === "confirmer-inscription" ? (
            <>Pour terminer la création de votre compte, cliquez sur le lien envoyé à <strong>{email}</strong>.</>
          ) : (
            <>Un lien pour choisir un nouveau mot de passe a été envoyé à <strong>{email}</strong>.</>
          )}
          <br />
          Pensez à regarder dans les courriers indésirables.
        </Message>
        <Bouton variante="discret" onClick={recommencer}>Retour</Bouton>
      </Carte>
    );
  }

  return (
    <Carte className="mt-8 flex flex-col gap-4">
      <Choix<Mode>
        libelle="Me connecter avec"
        valeur={mode}
        onChange={(m) => { setMode(m); setErreur(""); }}
        options={[
          { valeur: "lien", texte: "Lien par e-mail" },
          { valeur: "motdepasse", texte: "Mot de passe" },
        ]}
      />
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (mode === "lien") envoyerLien();
          else if (creation) creerCompte();
          else seConnecter();
        }}
        className="flex flex-col gap-4"
      >
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
        {mode === "motdepasse" && (
          <Champ
            id="motdepasse"
            libelle={creation ? "Choisissez un mot de passe (8 caractères minimum)" : "Mot de passe"}
            type="password"
            autoComplete={creation ? "new-password" : "current-password"}
            value={motDePasse}
            onChange={(e) => setMotDePasse(e.target.value)}
            required
            minLength={creation ? 8 : undefined}
          />
        )}
        {erreur && <p className="text-sm text-alerte">{erreur}</p>}
        <Bouton type="submit" disabled={enCours}>
          {enCours
            ? "Un instant…"
            : mode === "lien"
              ? "Recevoir mon lien de connexion"
              : creation
                ? "Créer mon compte"
                : "Me connecter"}
        </Bouton>
      </form>
      {mode === "lien" ? (
        <p className="text-center text-sm text-encre-doux">Première visite ? Votre compte est créé automatiquement.</p>
      ) : (
        <div className="flex flex-col items-center gap-1 text-sm">
          <button type="button" onClick={() => { setCreation(!creation); setErreur(""); }} className="min-h-[40px] text-or-fonce underline underline-offset-4">
            {creation ? "J'ai déjà un compte" : "Pas encore de compte ? En créer un"}
          </button>
          {!creation && (
            <button type="button" onClick={motDePasseOublie} className="min-h-[40px] text-encre-doux underline underline-offset-4">
              Mot de passe oublié ?
            </button>
          )}
        </div>
      )}
    </Carte>
  );
}

function Message({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <div className="text-center">
      <p className="text-3xl" aria-hidden>✉️</p>
      <h2 className="mt-2 font-medium">{titre}</h2>
      <p className="mt-1 text-sm text-encre-doux">{children}</p>
    </div>
  );
}
