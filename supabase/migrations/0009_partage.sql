-- =====================================================================
-- Mon plan de salle — étape 3 : partage (liens, invitations, rôles,
-- commentaires)
-- À coller dans Supabase : SQL Editor > New query > Run
-- =====================================================================

-- Gestionnaire d'un plan = rôle « propriétaire » (créateur ou co-propriétaire)
create or replace function public.est_gestionnaire_plan(p_plan uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.role_plan(p_plan) = 'proprietaire', false);
$$;

-- ---------------------------------------------------------------------
-- 1. Liens de partage (lecture seule : sans compte ; modification : avec compte)
-- ---------------------------------------------------------------------
create table if not exists public.plans_liens (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.plans (id) on delete cascade,
  jeton text not null unique default public.nouveau_jeton(16),
  role text not null check (role in ('lecteur', 'editeur')),
  actif boolean not null default true,
  cree_par uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists plans_liens_plan on public.plans_liens (plan_id);
alter table public.plans_liens enable row level security;
revoke all on public.plans_liens from anon;
drop policy if exists "liens : gestionnaires" on public.plans_liens;
create policy "liens : gestionnaires" on public.plans_liens
  for all to authenticated
  using (public.est_gestionnaire_plan(plan_id))
  with check (public.est_gestionnaire_plan(plan_id));

-- Ce que montre un lien (lecture : le plan ; modification : il faut se connecter)
create or replace function public.plan_par_lien(p_jeton text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_lien public.plans_liens;
  v_plan public.plans;
begin
  select * into v_lien from public.plans_liens where jeton = p_jeton and actif;
  if not found then
    return null;
  end if;
  select * into v_plan from public.plans where id = v_lien.plan_id;
  return jsonb_build_object(
    'plan_id', v_plan.id,
    'nom', v_plan.nom,
    'role', v_lien.role,
    'version', v_plan.version,
    'updated_at', v_plan.updated_at,
    'deja_membre', public.role_plan(v_plan.id) is not null,
    'contenu', case when v_lien.role = 'lecteur' then v_plan.contenu else null end
  );
end;
$$;

-- Rejoindre un plan grâce à un lien (compte nécessaire) ; renvoie l'identifiant du plan
create or replace function public.rejoindre_plan_par_lien(p_jeton text)
returns uuid
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_lien public.plans_liens;
begin
  if auth.uid() is null then
    raise exception 'Connexion nécessaire';
  end if;
  select * into v_lien from public.plans_liens where jeton = p_jeton and actif;
  if not found then
    raise exception 'Lien invalide';
  end if;
  insert into public.plans_membres (plan_id, user_id, role)
  values (v_lien.plan_id, auth.uid(), v_lien.role)
  on conflict (plan_id, user_id) do update
    set role = case
      when plans_membres.role = 'proprietaire' then 'proprietaire'
      when excluded.role = 'editeur' then 'editeur'
      else plans_membres.role end;
  return v_lien.plan_id;
end;
$$;

-- ---------------------------------------------------------------------
-- 2. Invitations par e-mail : acceptées automatiquement dès que la
--    personne se connecte avec cette adresse
-- ---------------------------------------------------------------------
create table if not exists public.plans_invitations (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.plans (id) on delete cascade,
  email text not null check (email = lower(email) and email like '%@%'),
  role text not null check (role in ('proprietaire', 'editeur', 'lecteur')),
  invite_par uuid references auth.users (id) on delete set null,
  acceptee_le timestamptz,
  created_at timestamptz not null default now(),
  unique (plan_id, email)
);
alter table public.plans_invitations enable row level security;
revoke all on public.plans_invitations from anon;
drop policy if exists "invitations : gestionnaires" on public.plans_invitations;
create policy "invitations : gestionnaires" on public.plans_invitations
  for all to authenticated
  using (public.est_gestionnaire_plan(plan_id))
  with check (public.est_gestionnaire_plan(plan_id) and invite_par = auth.uid());

create or replace function public.accepter_invitations()
returns int
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  v_nombre int := 0;
  v record;
begin
  if auth.uid() is null or v_email = '' then
    return 0;
  end if;
  for v in select * from public.plans_invitations where email = v_email and acceptee_le is null loop
    insert into public.plans_membres (plan_id, user_id, role)
    values (v.plan_id, auth.uid(), v.role)
    on conflict (plan_id, user_id) do nothing;
    update public.plans_invitations set acceptee_le = now() where id = v.id;
    v_nombre := v_nombre + 1;
  end loop;
  return v_nombre;
end;
$$;

-- ---------------------------------------------------------------------
-- 3. Personnes ayant accès : liste, changement de rôle, retrait
-- ---------------------------------------------------------------------
create or replace function public.membres_plan(p_plan uuid)
returns table (user_id uuid, role text, nom text, email text, createur boolean)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if public.role_plan(p_plan) is null then
    raise exception 'Accès refusé';
  end if;
  return query
  select m.user_id, m.role, pr.nom, u.email::text, m.user_id = pl.proprietaire_id
  from public.plans_membres m
  join public.plans pl on pl.id = m.plan_id
  left join public.profils pr on pr.id = m.user_id
  left join auth.users u on u.id = m.user_id
  where m.plan_id = p_plan
  order by (m.user_id = pl.proprietaire_id) desc, m.created_at;
end;
$$;

create or replace function public.changer_role_plan(p_plan uuid, p_user uuid, p_role text)
returns void
language plpgsql
volatile
security definer
set search_path = public
as $$
begin
  if not public.est_gestionnaire_plan(p_plan) then
    raise exception 'Accès refusé';
  end if;
  if p_role not in ('proprietaire', 'editeur', 'lecteur') then
    raise exception 'Rôle invalide';
  end if;
  if exists (select 1 from public.plans where id = p_plan and proprietaire_id = p_user) then
    raise exception 'Le rôle de la créatrice du plan ne peut pas changer';
  end if;
  update public.plans_membres set role = p_role where plan_id = p_plan and user_id = p_user;
end;
$$;

-- Retirer quelqu'un (gestionnaire), ou quitter soi-même un plan partagé
create or replace function public.retirer_membre_plan(p_plan uuid, p_user uuid)
returns void
language plpgsql
volatile
security definer
set search_path = public
as $$
begin
  if not (public.est_gestionnaire_plan(p_plan) or p_user = auth.uid()) then
    raise exception 'Accès refusé';
  end if;
  if exists (select 1 from public.plans where id = p_plan and proprietaire_id = p_user) then
    raise exception 'La créatrice du plan ne peut pas être retirée';
  end if;
  delete from public.plans_membres where plan_id = p_plan and user_id = p_user;
end;
$$;

revoke all on function public.plan_par_lien(text) from public;
revoke all on function public.rejoindre_plan_par_lien(text) from public;
revoke all on function public.accepter_invitations() from public;
revoke all on function public.membres_plan(uuid) from public;
revoke all on function public.changer_role_plan(uuid, uuid, text) from public;
revoke all on function public.retirer_membre_plan(uuid, uuid) from public;
grant execute on function public.plan_par_lien(text) to anon, authenticated;
grant execute on function public.rejoindre_plan_par_lien(text) to authenticated;
grant execute on function public.accepter_invitations() to authenticated;
grant execute on function public.membres_plan(uuid) to authenticated;
grant execute on function public.changer_role_plan(uuid, uuid, text) to authenticated;
grant execute on function public.retirer_membre_plan(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------
-- 4. Commentaires sur un élément du plan (lecteurs compris)
-- ---------------------------------------------------------------------
create table if not exists public.plans_commentaires (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.plans (id) on delete cascade,
  element_id text,                     -- élément concerné (vide = tout le plan)
  auteur_id uuid default auth.uid() references auth.users (id) on delete set null,
  auteur_nom text,
  texte text not null check (char_length(texte) between 1 and 1000),
  regle boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists plans_commentaires_plan on public.plans_commentaires (plan_id, created_at);
alter table public.plans_commentaires enable row level security;
revoke all on public.plans_commentaires from anon;
drop policy if exists "commentaires : lire" on public.plans_commentaires;
create policy "commentaires : lire" on public.plans_commentaires
  for select to authenticated using (public.role_plan(plan_id) is not null);
drop policy if exists "commentaires : écrire" on public.plans_commentaires;
create policy "commentaires : écrire" on public.plans_commentaires
  for insert to authenticated
  with check (public.role_plan(plan_id) is not null and auteur_id = auth.uid());
drop policy if exists "commentaires : régler" on public.plans_commentaires;
create policy "commentaires : régler" on public.plans_commentaires
  for update to authenticated
  using (auteur_id = auth.uid() or public.role_plan(plan_id) in ('proprietaire', 'editeur'))
  with check (public.role_plan(plan_id) is not null);
drop policy if exists "commentaires : supprimer" on public.plans_commentaires;
create policy "commentaires : supprimer" on public.plans_commentaires
  for delete to authenticated
  using (auteur_id = auth.uid() or public.est_gestionnaire_plan(plan_id));

-- Prévient les écrans ouverts sur le plan qu'un commentaire a changé
create or replace function public.commentaire_prevenir()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  begin
    perform realtime.send(jsonb_build_object('t', 1), 'commentaire',
      'plan:' || coalesce(new.plan_id, old.plan_id)::text, false);
  exception when others then
    null;
  end;
  return null;
end;
$$;
drop trigger if exists commentaire_prevenir on public.plans_commentaires;
create trigger commentaire_prevenir after insert or update or delete on public.plans_commentaires
  for each row execute function public.commentaire_prevenir();
