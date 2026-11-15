# Modèles d'e-mails communs (Supabase)

Le projet Supabase est partagé par **Ma Coordo**, **Mon plan de salle** et
**Ma Visite Technique** : les modèles d'e-mails sont donc communs. Ils ne citent
aucune application et le bouton ramène toujours sur l'application d'où vient la
demande (`{{ .RedirectTo }}`).

Conventions (à respecter par les trois applications) :
- inscription et lien de connexion : `{{ .RedirectTo }}?token_hash=…`
- mot de passe oublié : `{{ .RedirectTo }}&token_hash=…` (l'adresse de retour
  contient déjà `?suite=…`)
- la page `/auth/confirm` de Ma Coordo / Mon plan de salle accepte les deux formes.

Supabase → Authentication → Emails → Templates : coller chaque fichier dans le
modèle correspondant, avec l'objet indiqué en tête de fichier.

Supabase → Authentication → URL Configuration → Redirect URLs doit contenir :
- `https://ma-coordo.vercel.app/**`
- `https://mon-plan-de-salle.vercel.app/**`
- `https://ma-visite-technique.vercel.app/**`
