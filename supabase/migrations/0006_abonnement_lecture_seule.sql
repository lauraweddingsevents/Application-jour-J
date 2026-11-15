-- =====================================================================
-- Ma Coordo — abonnement et compte suspendu : lecture seule
-- À coller dans Supabase : SQL Editor > New query > Run
--
-- Prérequis : le script « 0001_comptes_abonnement.sql » de Ma Visite
-- Technique (comptes, administration, abonnement communs aux deux applis)
-- doit déjà avoir été exécuté sur ce projet.
--
-- Sans abonnement actif (ou compte suspendu), la créatrice garde l'accès
-- en lecture à ses mariages mais ne peut plus en créer ni les modifier.
-- Ce qui sert LE JOUR J reste toujours possible, pour ne jamais bloquer un
-- mariage en cours : les liens des intervenants, le bouton « retard »
-- et les annonces.
-- Peut être relancé sans risque.
-- =====================================================================

do $$
declare
  t text;
begin
  foreach t in array array['mariages', 'intervenants', 'moments', 'moment_intervenants', 'fiche_elements', 'journees']
  loop
    -- Règles « restrictives » : elles s'ajoutent aux règles existantes
    -- (chacun ne voit que ses mariages) sans les remplacer.
    execute format('drop policy if exists "abonnement : créer" on public.%I', t);
    execute format(
      'create policy "abonnement : créer" on public.%I as restrictive for insert to authenticated with check (public.peut_modifier())', t);
    execute format('drop policy if exists "abonnement : modifier" on public.%I', t);
    execute format(
      'create policy "abonnement : modifier" on public.%I as restrictive for update to authenticated using (true) with check (public.peut_modifier())', t);
  end loop;
end;
$$;
