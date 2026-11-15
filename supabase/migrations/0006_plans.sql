-- =====================================================================
-- Mon plan de salle — étape 1 : types de compte et plans enregistrés en ligne
-- À coller dans Supabase : SQL Editor > New query > Run
-- (n'enlève ni ne modifie rien de Ma Coordo : uniquement des ajouts)
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Type de compte sur le profil
-- ---------------------------------------------------------------------
alter table public.profils add column if not exists type_compte text
  check (type_compte in ('maries', 'lieu', 'decoratrice', 'prestataire', 'wedding_planner'));

-- Les comptes Ma Coordo existants sont des comptes « wedding planner »
update public.profils set type_compte = 'wedding_planner' where type_compte is null;

-- Chacun peut changer son nom et son type de compte (jamais sa formule)
grant update (nom, type_compte) on public.profils to authenticated;

-- ---------------------------------------------------------------------
-- 2. Les plans de salle
-- Le contenu du plan (salle, tables, zones, invités) est rangé dans un
-- seul bloc « contenu », comme dans le prototype.
-- ---------------------------------------------------------------------
create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(),
  proprietaire_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  nom text not null check (char_length(nom) between 1 and 120),
  contenu jsonb not null default '{}'::jsonb
    check (pg_column_size(contenu) < 2000000),   -- 2 Mo au plus par plan
  version int not null default 1,                -- augmente à chaque enregistrement
  archive boolean not null default false,
  modifie_par uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists plans_proprietaire on public.plans (proprietaire_id);

-- Qui a accès à quel plan, avec quel rôle
create table if not exists public.plans_membres (
  plan_id uuid not null references public.plans (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('proprietaire', 'editeur', 'lecteur')),
  created_at timestamptz not null default now(),
  primary key (plan_id, user_id)
);
create index if not exists plans_membres_user on public.plans_membres (user_id);

-- La personne qui crée un plan en devient automatiquement propriétaire
create or replace function public.plan_ajouter_proprietaire()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.plans_membres (plan_id, user_id, role)
  values (new.id, new.proprietaire_id, 'proprietaire')
  on conflict do nothing;
  return new;
end;
$$;
drop trigger if exists plan_ajouter_proprietaire on public.plans;
create trigger plan_ajouter_proprietaire after insert on public.plans
  for each row execute function public.plan_ajouter_proprietaire();

-- À chaque enregistrement : version + 1, date et auteur de la modification
create or replace function public.plan_avant_maj()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.contenu is distinct from old.contenu then
    new.version := old.version + 1;
  end if;
  new.updated_at := now();
  new.modifie_par := auth.uid();
  new.proprietaire_id := old.proprietaire_id;   -- le propriétaire ne change pas ici
  return new;
end;
$$;
drop trigger if exists plan_avant_maj on public.plans;
create trigger plan_avant_maj before update on public.plans
  for each row execute function public.plan_avant_maj();

-- ---------------------------------------------------------------------
-- 3. Sécurité : chacun ne voit que les plans auxquels il a accès
-- ---------------------------------------------------------------------
create or replace function public.role_plan(p_plan uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.plans_membres where plan_id = p_plan and user_id = auth.uid();
$$;

alter table public.plans enable row level security;
alter table public.plans_membres enable row level security;
revoke all on public.plans, public.plans_membres from anon;

drop policy if exists "lire ses plans" on public.plans;
create policy "lire ses plans" on public.plans
  for select to authenticated
  using (proprietaire_id = auth.uid() or public.role_plan(id) is not null);
drop policy if exists "créer un plan" on public.plans;
create policy "créer un plan" on public.plans
  for insert to authenticated with check (proprietaire_id = auth.uid());
drop policy if exists "modifier un plan" on public.plans;
create policy "modifier un plan" on public.plans
  for update to authenticated
  using (public.role_plan(id) in ('proprietaire', 'editeur'))
  with check (public.role_plan(id) in ('proprietaire', 'editeur'));
drop policy if exists "supprimer son plan" on public.plans;
create policy "supprimer son plan" on public.plans
  for delete to authenticated using (proprietaire_id = auth.uid());

drop policy if exists "voir les membres" on public.plans_membres;
create policy "voir les membres" on public.plans_membres
  for select to authenticated
  using (user_id = auth.uid() or public.role_plan(plan_id) is not null);
-- (ajout et retrait de membres : à l'étape 3, Partage)
