// Reconnaît l'adresse « Mon plan de salle » (ex. mon-plan-de-salle.vercel.app,
// monplandesalle.fr) : même application que Ma Coordo, mais présentée seule.
export function estAdressePlan(hote: string | null | undefined) {
  return !!hote && /plan-?de-?salle/i.test(hote);
}
