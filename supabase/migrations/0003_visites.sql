-- =====================================================================
-- Ma Coordo — « Qui est prêt ? » : quand chaque intervenant ouvre son lien
-- À coller dans Supabase : SQL Editor > New query > Run
-- =====================================================================

-- Une ligne par intervenant : première et dernière ouverture de son lien.
-- (Table séparée, pour ne pas déclencher de mise à jour en direct
-- chez tout le monde à chaque ouverture.)
create table if not exists public.visites_liens (
  intervenant_id uuid primary key references public.intervenants (id) on delete cascade,
  premiere_visite timestamptz not null default now(),
  derniere_visite timestamptz not null default now(),
  nombre_visites int not null default 1
);
alter table public.visites_liens enable row level security;
revoke all on public.visites_liens from anon, authenticated;
grant select on public.visites_liens to authenticated;

drop policy if exists "visites de ses intervenants" on public.visites_liens;
create policy "visites de ses intervenants" on public.visites_liens
  for select to authenticated
  using (exists (
    select 1 from public.intervenants i
    where i.id = intervenant_id and public.est_proprietaire(i.mariage_id)));

-- Appelée par la page du lien personnel à chaque ouverture
create or replace function public.signaler_visite(p_jeton text)
returns void
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_intervenant uuid;
begin
  select id into v_intervenant from public.intervenants where jeton = p_jeton;
  if v_intervenant is null then
    return;
  end if;
  insert into public.visites_liens (intervenant_id)
  values (v_intervenant)
  on conflict (intervenant_id) do update
    set derniere_visite = now(),
        -- une ouverture toutes les 10 minutes au plus est comptée
        nombre_visites = visites_liens.nombre_visites
          + case when visites_liens.derniere_visite < now() - interval '10 minutes' then 1 else 0 end;
end;
$$;

revoke all on function public.signaler_visite(text) from public;
grant execute on function public.signaler_visite(text) to anon, authenticated;
