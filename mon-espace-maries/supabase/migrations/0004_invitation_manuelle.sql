-- =====================================================================
-- Mon Espace Mariés — invitation envoyée quand Laura le décide
-- (la création d'un espace n'envoie plus d'e-mail aux mariés)
-- À exécuter après 0003_stockage.sql
-- =====================================================================
alter table public.couples add column if not exists invitation_envoyee_le timestamptz;
