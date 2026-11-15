-- =====================================================================
-- Mon plan de salle — étape 2 : historique des versions d'un plan
-- À coller dans Supabase : SQL Editor > New query > Run
-- =====================================================================

create table if not exists public.plans_versions (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.plans (id) on delete cascade,
  version int not null,
  contenu jsonb not null,
  libelle text,                       -- nom donné à la main (« Avant la visite du lieu »)
  auteur_id uuid references auth.users (id) on delete set null,
  auteur_nom text,
  automatique boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists plans_versions_plan on public.plans_versions (plan_id, created_at desc);

alter table public.plans_versions enable row level security;
revoke all on public.plans_versions from anon;

drop policy if exists "voir l'historique" on public.plans_versions;
create policy "voir l'historique" on public.plans_versions
  for select to authenticated using (public.role_plan(plan_id) is not null);
drop policy if exists "enregistrer une version" on public.plans_versions;
create policy "enregistrer une version" on public.plans_versions
  for insert to authenticated
  with check (public.role_plan(plan_id) in ('proprietaire', 'editeur') and auteur_id = auth.uid());

-- Copie automatique : avant une modification du contenu, l'ancienne version
-- est gardée si la dernière copie date de plus de 15 minutes.
-- On garde les 60 dernières copies automatiques (les versions nommées : toutes).
create or replace function public.plan_copie_auto()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.contenu is distinct from old.contenu and not exists (
    select 1 from public.plans_versions
    where plan_id = old.id and created_at > now() - interval '15 minutes') then
    insert into public.plans_versions (plan_id, version, contenu, auteur_id, auteur_nom, automatique, created_at)
    values (old.id, old.version, old.contenu, old.modifie_par,
            (select nom from public.profils where id = old.modifie_par), true, old.updated_at);
    delete from public.plans_versions
    where plan_id = old.id and automatique and id not in (
      select id from public.plans_versions where plan_id = old.id and automatique
      order by created_at desc limit 60);
  end if;
  return new;
end;
$$;
drop trigger if exists plan_copie_auto on public.plans;
create trigger plan_copie_auto before update on public.plans
  for each row execute function public.plan_copie_auto();

-- Mises à jour en direct d'un plan ouvert sur plusieurs appareils :
-- signal sur un canal propre au plan (le contenu n'y circule pas)
create or replace function public.plan_prevenir()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  begin
    perform realtime.send(
      jsonb_build_object('version', new.version, 'par', new.modifie_par),
      'maj', 'plan:' || new.id::text, false);
  exception when others then
    null;
  end;
  return null;
end;
$$;
drop trigger if exists plan_prevenir on public.plans;
create trigger plan_prevenir after update on public.plans
  for each row execute function public.plan_prevenir();
