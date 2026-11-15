-- =====================================================================
-- Mon plan de salle — étape 5 : le plan de salle dans Ma Coordo
-- Un plan peut être relié à un mariage. Si le plan appartient à
-- quelqu'un d'autre (les mariés), il faut son accord.
-- À coller dans Supabase : SQL Editor > New query > Run
-- (uniquement des ajouts : rien n'est enlevé ni modifié dans Ma Coordo)
-- =====================================================================

alter table public.plans add column if not exists mariage_id uuid
  references public.mariages (id) on delete set null;
create index if not exists plans_mariage on public.plans (mariage_id);

-- Le lien plan ↔ mariage ne se change que par les fonctions ci-dessous
create or replace function public.plan_proteger_mariage()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if coalesce(current_setting('plan.rattachement', true), '') = 'oui' then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.mariage_id := null;
  else
    new.mariage_id := old.mariage_id;
  end if;
  return new;
end;
$$;
drop trigger if exists plan_proteger_mariage on public.plans;
create trigger plan_proteger_mariage before insert or update on public.plans
  for each row execute function public.plan_proteger_mariage();

-- ---------------------------------------------------------------------
-- Demandes de rattachement (en attente de l'accord du propriétaire du plan)
-- ---------------------------------------------------------------------
create table if not exists public.plans_rattachements (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.plans (id) on delete cascade,
  mariage_id uuid not null references public.mariages (id) on delete cascade,
  demande_par uuid not null references auth.users (id) on delete cascade,
  statut text not null default 'en_attente' check (statut in ('en_attente', 'acceptee', 'refusee')),
  created_at timestamptz not null default now(),
  repondu_le timestamptz,
  unique (plan_id, mariage_id)
);
alter table public.plans_rattachements enable row level security;
revoke all on public.plans_rattachements from anon;
drop policy if exists "rattachements : concernés" on public.plans_rattachements;
create policy "rattachements : concernés" on public.plans_rattachements
  for select to authenticated
  using (demande_par = auth.uid()
    or exists (select 1 from public.plans p where p.id = plan_id and p.proprietaire_id = auth.uid()));

-- Relier un plan à un de mes mariages : par un lien de partage du plan
-- (p_jeton) ou un plan auquel j'ai déjà accès (p_plan).
-- Renvoie 'rattache' (fait tout de suite) ou 'en_attente' (accord nécessaire).
create or replace function public.demander_rattachement(p_mariage uuid, p_plan uuid default null, p_jeton text default null)
returns text
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_plan public.plans;
  v_lien public.plans_liens;
begin
  if auth.uid() is null or not public.est_proprietaire(p_mariage) then
    raise exception 'Mariage introuvable';
  end if;
  if p_jeton is not null then
    select * into v_lien from public.plans_liens where jeton = p_jeton and actif;
    if not found then
      raise exception 'Ce lien ne fonctionne pas (il a peut-être été désactivé)';
    end if;
    select * into v_plan from public.plans where id = v_lien.plan_id;
  else
    select * into v_plan from public.plans where id = p_plan;
    if not found or public.role_plan(p_plan) is null then
      raise exception 'Plan introuvable';
    end if;
  end if;
  if v_plan.est_modele then
    raise exception 'Une salle modèle ne peut pas être reliée à un mariage';
  end if;
  if v_plan.mariage_id = p_mariage then
    return 'rattache';
  end if;
  if v_plan.proprietaire_id = auth.uid() then
    perform set_config('plan.rattachement', 'oui', true);
    update public.plans set mariage_id = p_mariage where id = v_plan.id;
    perform set_config('plan.rattachement', '', true);
    return 'rattache';
  end if;
  insert into public.plans_rattachements (plan_id, mariage_id, demande_par)
  values (v_plan.id, p_mariage, auth.uid())
  on conflict (plan_id, mariage_id) do update
    set statut = 'en_attente', demande_par = auth.uid(), created_at = now(), repondu_le = null;
  return 'en_attente';
end;
$$;

-- Mes demandes pour un mariage (pour l'onglet « Plan de salle »)
create or replace function public.mes_demandes_rattachement(p_mariage uuid)
returns table (id uuid, plan_nom text, statut text, created_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select r.id, p.nom, r.statut, r.created_at
  from public.plans_rattachements r join public.plans p on p.id = r.plan_id
  where r.mariage_id = p_mariage and r.demande_par = auth.uid() and r.statut <> 'acceptee'
    and p.mariage_id is distinct from p_mariage
  order by r.created_at desc;
$$;

create or replace function public.annuler_rattachement(p_demande uuid)
returns void
language sql
volatile
security definer
set search_path = public
as $$
  delete from public.plans_rattachements where id = p_demande and demande_par = auth.uid();
$$;

-- Demandes reçues sur mes plans (pour « Mes plans »)
create or replace function public.rattachements_a_valider()
returns table (id uuid, plan_id uuid, plan_nom text, mariage_nom text, date_mariage date, demandeur_nom text, created_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select r.id, p.id, p.nom, m.nom_marie_1 || ' & ' || m.nom_marie_2, m.date_mariage,
    coalesce(nullif(pr.nom, ''), u.email), r.created_at
  from public.plans_rattachements r
  join public.plans p on p.id = r.plan_id
  join public.mariages m on m.id = r.mariage_id
  left join public.profils pr on pr.id = r.demande_par
  left join auth.users u on u.id = r.demande_par
  where p.proprietaire_id = auth.uid() and r.statut = 'en_attente'
  order by r.created_at desc;
$$;

-- Le propriétaire du plan accepte ou refuse. S'il accepte, la personne
-- qui a demandé peut modifier le plan (les mariés gardent tous leurs droits).
create or replace function public.repondre_rattachement(p_demande uuid, p_accepter boolean)
returns void
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v public.plans_rattachements;
begin
  select r.* into v from public.plans_rattachements r join public.plans p on p.id = r.plan_id
  where r.id = p_demande and p.proprietaire_id = auth.uid() and r.statut = 'en_attente';
  if not found then
    raise exception 'Demande introuvable';
  end if;
  if p_accepter then
    if not exists (select 1 from public.mariages where id = v.mariage_id and proprietaire_id = v.demande_par) then
      raise exception 'Ce mariage n''existe plus';
    end if;
    perform set_config('plan.rattachement', 'oui', true);
    update public.plans set mariage_id = v.mariage_id where id = v.plan_id;
    perform set_config('plan.rattachement', '', true);
    insert into public.plans_membres (plan_id, user_id, role)
    values (v.plan_id, v.demande_par, 'editeur')
    on conflict (plan_id, user_id) do update
      set role = case when plans_membres.role = 'proprietaire' then 'proprietaire' else 'editeur' end;
  end if;
  update public.plans_rattachements
    set statut = case when p_accepter then 'acceptee' else 'refusee' end, repondu_le = now()
    where id = p_demande;
end;
$$;

-- Détacher un plan d'un mariage (le propriétaire du plan ou du mariage)
create or replace function public.detacher_plan(p_plan uuid)
returns void
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_plan public.plans;
begin
  select * into v_plan from public.plans where id = p_plan;
  if not found or v_plan.mariage_id is null
    or not (v_plan.proprietaire_id = auth.uid() or public.est_proprietaire(v_plan.mariage_id)) then
    raise exception 'Plan introuvable';
  end if;
  delete from public.plans_rattachements where plan_id = p_plan and mariage_id = v_plan.mariage_id;
  perform set_config('plan.rattachement', 'oui', true);
  update public.plans set mariage_id = null where id = p_plan;
  perform set_config('plan.rattachement', '', true);
end;
$$;

revoke all on function public.demander_rattachement(uuid, uuid, text), public.mes_demandes_rattachement(uuid),
  public.annuler_rattachement(uuid), public.rattachements_a_valider(), public.repondre_rattachement(uuid, boolean),
  public.detacher_plan(uuid) from public, anon;
grant execute on function public.demander_rattachement(uuid, uuid, text), public.mes_demandes_rattachement(uuid),
  public.annuler_rattachement(uuid), public.rattachements_a_valider(), public.repondre_rattachement(uuid, boolean),
  public.detacher_plan(uuid) to authenticated;
