// Page où revenir après la connexion (« ?suite=/plans »), en n'acceptant
// que des adresses internes au site.
export function suiteSure(valeur: string | null | undefined, parDefaut = "/tableau") {
  if (!valeur || !valeur.startsWith("/") || valeur.startsWith("//")) return parDefaut;
  return valeur;
}

export function lireSuite(parDefaut = "/tableau") {
  if (typeof window === "undefined") return parDefaut;
  return suiteSure(new URLSearchParams(window.location.search).get("suite"), parDefaut);
}

// Adresse de retour des e-mails de connexion
export function adresseConfirmation(suite: string) {
  return `${window.location.origin}/auth/confirm?suite=${encodeURIComponent(suite)}`;
}
