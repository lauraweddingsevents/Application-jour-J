-- =====================================================================
-- Mon Relais Presta — nombre d'invités facultatif
-- (beaucoup de prestataires ne le connaissent pas au moment de la demande)
-- À exécuter dans Supabase → SQL Editor, AVANT de fusionner la mise à jour.
-- =====================================================================
alter table public.demandes alter column invites drop not null;
-- La règle « entre 1 et 3 000 » reste valable quand le nombre est indiqué
