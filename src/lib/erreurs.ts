// Traduit les messages d'erreur techniques en phrases claires, en français.
type ErreurBrute = { message?: string; code?: string } | null | undefined;

export function messageErreur(erreur: ErreurBrute): string {
  if (!erreur) return "";
  const m = (erreur.message ?? "").toLowerCase();
  const code = erreur.code ?? "";

  if (code === "over_email_send_rate_limit" || m.includes("rate limit") || m.includes("security purposes"))
    return "Trop d'e-mails envoyés en peu de temps. Patientez quelques minutes avant de réessayer.";
  if (code === "invalid_credentials" || m.includes("invalid login credentials"))
    return "E-mail ou mot de passe incorrect.";
  if (code === "email_not_confirmed" || m.includes("email not confirmed"))
    return "Confirmez d'abord votre adresse : cliquez sur le lien de l'e-mail que nous vous avons envoyé.";
  if (code === "user_already_exists" || m.includes("already registered"))
    return "Un compte existe déjà avec cette adresse. Connectez-vous, ou utilisez « Mot de passe oublié ».";
  if (code === "weak_password" || (m.includes("password") && (m.includes("least") || m.includes("weak"))))
    return "Mot de passe trop court ou trop simple : 8 caractères au minimum.";
  if (code === "same_password")
    return "Ce mot de passe est déjà le vôtre : choisissez-en un autre.";
  if (code === "otp_expired" || ((m.includes("token") || m.includes("otp") || m.includes("link")) && (m.includes("expired") || m.includes("invalid"))))
    return "Ce lien ou ce code n'est plus valable. Demandez-en un nouveau.";
  if (code === "email_address_invalid" || (m.includes("email") && m.includes("invalid") && !m.includes("credentials")))
    return "Cette adresse e-mail ne semble pas valide.";
  if (m.includes('policy "abonnement'))
    return "Votre compte est en lecture seule (abonnement inactif ou compte suspendu) : modification impossible. Voir « Mon compte ».";
  if (code === "42501" || m.includes("row-level security") || m.includes("permission denied"))
    return "Vous n'avez pas accès à cette information.";
  if (code === "23505")
    return "Cet élément existe déjà (par exemple, ce jour fait déjà partie du mariage).";
  if (code === "23514" || code === "22007" || code === "22008")
    return "Une des valeurs saisies n'est pas valide. Vérifiez le formulaire.";
  if (m.includes("failed to fetch") || m.includes("network") || m.includes("load failed"))
    return "Impossible de joindre le serveur. Vérifiez votre connexion internet.";
  return "Une erreur est survenue. Merci de réessayer.";
}

// Vrai si l'identifiant demandé n'a pas le bon format (lien abîmé)
export function estIdentifiantInvalide(erreur: ErreurBrute) {
  return erreur?.code === "22P02";
}
