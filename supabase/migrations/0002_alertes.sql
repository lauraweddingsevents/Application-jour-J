-- =====================================================================
-- Ma Coordo — alertes avant chaque moment (notifications sur téléphone)
-- À coller dans Supabase : SQL Editor > New query > Run
-- =====================================================================

-- Réglages privés (jamais lisibles depuis l'application)
create table if not exists public.reglages_prives (
  cle text primary key,
  valeur text not null
);
alter table public.reglages_prives enable row level security;
revoke all on public.reglages_prives from anon, authenticated;

-- Téléphones qui ont activé les alertes
create table if not exists public.abonnements_push (
  id uuid primary key default gen_random_uuid(),
  intervenant_id uuid not null references public.intervenants (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  delai_minutes int not null default 15 check (delai_minutes between 1 and 180),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists abonnements_push_intervenant on public.abonnements_push (intervenant_id);
alter table public.abonnements_push enable row level security;
revoke all on public.abonnements_push from anon, authenticated;
-- La créatrice peut seulement voir qui a activé les alertes (pas les clés)
grant select (id, intervenant_id, delai_minutes, created_at) on public.abonnements_push to authenticated;
drop policy if exists "alertes de ses intervenants" on public.abonnements_push;
create policy "alertes de ses intervenants" on public.abonnements_push
  for select to authenticated
  using (exists (
    select 1 from public.intervenants i
    where i.id = intervenant_id and public.est_proprietaire(i.mariage_id)));

-- Alertes déjà envoyées (pour ne jamais envoyer deux fois la même)
create table if not exists public.alertes_envoyees (
  abonnement_id uuid not null references public.abonnements_push (id) on delete cascade,
  moment_id uuid not null references public.moments (id) on delete cascade,
  debut_prevu timestamptz not null,
  envoyee_le timestamptz not null default now(),
  primary key (abonnement_id, moment_id, debut_prevu)
);
alter table public.alertes_envoyees enable row level security;
revoke all on public.alertes_envoyees from anon, authenticated;

-- ---------------------------------------------------------------------
-- Depuis un lien personnel : activer / régler / désactiver les alertes
-- ---------------------------------------------------------------------
create or replace function public.enregistrer_abonnement(
  p_jeton text, p_endpoint text, p_p256dh text, p_auth text, p_delai int
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_intervenant uuid;
begin
  select id into v_intervenant from public.intervenants where jeton = p_jeton;
  if v_intervenant is null then
    return false;
  end if;
  insert into public.abonnements_push (intervenant_id, endpoint, p256dh, auth, delai_minutes)
  values (v_intervenant, p_endpoint, p_p256dh, p_auth, greatest(1, least(180, coalesce(p_delai, 15))))
  on conflict (endpoint) do update
    set intervenant_id = excluded.intervenant_id,
        p256dh = excluded.p256dh,
        auth = excluded.auth,
        delai_minutes = excluded.delai_minutes,
        updated_at = now();
  return true;
end;
$$;

create or replace function public.supprimer_abonnement(p_jeton text, p_endpoint text)
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.abonnements_push a
  using public.intervenants i
  where a.endpoint = p_endpoint and a.intervenant_id = i.id and i.jeton = p_jeton;
$$;

revoke all on function public.enregistrer_abonnement(text, text, text, text, int) from public;
revoke all on function public.supprimer_abonnement(text, text) from public;
grant execute on function public.enregistrer_abonnement(text, text, text, text, int) to anon, authenticated;
grant execute on function public.supprimer_abonnement(text, text) to anon, authenticated;

-- ---------------------------------------------------------------------
-- Pour le programme d'envoi (protégé par un secret partagé)
-- ---------------------------------------------------------------------
create or replace function public.secret_valide(p_secret text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.reglages_prives
    where cle = 'secret_alertes' and p_secret is not null and valeur = p_secret);
$$;
revoke all on function public.secret_valide(text) from public;

-- Renvoie les alertes à envoyer maintenant, et les marque comme envoyées
create or replace function public.prendre_alertes(p_secret text)
returns table (
  abonnement_id uuid, endpoint text, p256dh text, auth text,
  jeton text, moment_id uuid, titre text, debut timestamptz, lieu text, fuseau_horaire text
)
language plpgsql
volatile
security definer
set search_path = public
as $$
begin
  if not public.secret_valide(p_secret) then
    raise exception 'Accès refusé';
  end if;
  return query
  with dues as (
    select a.id as abonnement_id, a.endpoint, a.p256dh, a.auth, i.jeton,
           m.id as moment_id, m.titre, m.debut, m.lieu, ma.fuseau_horaire
    from public.abonnements_push a
    join public.intervenants i on i.id = a.intervenant_id
    join public.mariages ma on ma.id = i.mariage_id
    join public.moment_intervenants mi on mi.intervenant_id = i.id
    join public.moments m on m.id = mi.moment_id
    where m.debut - make_interval(mins => a.delai_minutes) <= now()
      and m.debut > now() - interval '1 minute'
      and not exists (
        select 1 from public.alertes_envoyees e
        where e.abonnement_id = a.id and e.moment_id = m.id and e.debut_prevu = m.debut)
  ),
  marquees as (
    insert into public.alertes_envoyees (abonnement_id, moment_id, debut_prevu)
    select d.abonnement_id, d.moment_id, d.debut from dues d
    on conflict do nothing
    returning alertes_envoyees.abonnement_id, alertes_envoyees.moment_id
  )
  select d.* from dues d
  join marquees mq on mq.abonnement_id = d.abonnement_id and mq.moment_id = d.moment_id;
end;
$$;

-- Supprime un téléphone dont l'abonnement n'est plus valide
create or replace function public.oublier_abonnement(p_secret text, p_endpoint text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.secret_valide(p_secret) then
    raise exception 'Accès refusé';
  end if;
  delete from public.abonnements_push where endpoint = p_endpoint;
end;
$$;

-- Pour l'alerte de test : clés d'un téléphone, seulement pour son propre lien
create or replace function public.abonnement_pour_test(p_secret text, p_jeton text, p_endpoint text)
returns table (endpoint text, p256dh text, auth text)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.secret_valide(p_secret) then
    raise exception 'Accès refusé';
  end if;
  return query
  select a.endpoint, a.p256dh, a.auth
  from public.abonnements_push a
  join public.intervenants i on i.id = a.intervenant_id
  where a.endpoint = p_endpoint and i.jeton = p_jeton;
end;
$$;

revoke all on function public.prendre_alertes(text) from public;
revoke all on function public.oublier_abonnement(text, text) from public;
revoke all on function public.abonnement_pour_test(text, text, text) from public;
grant execute on function public.prendre_alertes(text) to anon;
grant execute on function public.oublier_abonnement(text, text) to anon;
grant execute on function public.abonnement_pour_test(text, text, text) to anon;

-- ---------------------------------------------------------------------
-- Planification : chaque minute, Supabase demande à l'application
-- d'envoyer les alertes dues. L'adresse et le secret sont lus dans
-- reglages_prives (ils sont enregistrés à l'étape suivante).
-- ---------------------------------------------------------------------
create extension if not exists pg_cron;
create extension if not exists pg_net;

create or replace function public.declencher_alertes()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_url text;
  v_secret text;
begin
  select valeur into v_url from public.reglages_prives where cle = 'adresse_alertes';
  select valeur into v_secret from public.reglages_prives where cle = 'secret_alertes';
  if v_url is null or v_secret is null then
    return;
  end if;
  perform net.http_post(
    url := v_url,
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || v_secret),
    body := '{}'::jsonb,
    timeout_milliseconds := 20000);
end;
$$;
revoke all on function public.declencher_alertes() from public, anon, authenticated;

select cron.unschedule('alertes-ma-coordo')
  where exists (select 1 from cron.job where jobname = 'alertes-ma-coordo');
select cron.schedule('alertes-ma-coordo', '* * * * *', 'select public.declencher_alertes()');
