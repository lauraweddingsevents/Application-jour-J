-- =====================================================================
-- Mon Relais Presta — étape 6 : notifications (e-mail, push) et rappels
-- =====================================================================

-- ---------- Téléphones abonnés aux notifications push ----------
create table if not exists public.abonnements_push (
  endpoint   text primary key,
  membre_id  uuid not null references public.membres (id) on delete cascade,
  p256dh     text not null,
  auth       text not null,
  cree_le    timestamptz not null default now()
);
create index if not exists abonnements_push_membre on public.abonnements_push (membre_id);
alter table public.abonnements_push enable row level security;
revoke all on public.abonnements_push from anon, authenticated;

create or replace function public.enregistrer_push(p_endpoint text, p_p256dh text, p_auth text)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform exiger_membre();
  insert into abonnements_push (endpoint, membre_id, p256dh, auth)
  values (p_endpoint, auth.uid(), p_p256dh, p_auth)
  on conflict (endpoint) do update set membre_id = excluded.membre_id, p256dh = excluded.p256dh, auth = excluded.auth;
end $$;

create or replace function public.supprimer_push(p_endpoint text)
returns void language sql security definer set search_path = public as $$
  delete from abonnements_push where endpoint = p_endpoint and membre_id = auth.uid();
$$;

-- ---------- Repères des rappels déjà envoyés ----------
alter table public.demandes add column if not exists relance_48h_le timestamptz;
alter table public.demandes add column if not exists rappel_15j_le timestamptz;
alter table public.positionnements add column if not exists rappel_20h_le timestamptz;

-- ---------- Événements liés aux membres (inscription, validation) ----------
create or replace function public.evenement_membre()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    insert into evenements (type, membre_id) values ('inscription', new.id);
  elsif new.statut is distinct from old.statut then
    if new.statut = 'valide' and old.statut in ('en_attente', 'refuse') then
      insert into evenements (type, membre_id) values ('membre_valide', new.id);
    elsif new.statut = 'en_attente' and old.statut = 'refuse' then
      insert into evenements (type, membre_id) values ('inscription', new.id);
    end if;
  end if;
  return new;
end $$;

drop trigger if exists membres_evenements on public.membres;
create trigger membres_evenements after insert or update of statut on public.membres
  for each row execute function public.evenement_membre();

-- ---------- Le serveur « prend » les événements à traiter ----------
-- (verrou « skip locked » : deux traitements simultanés ne prennent jamais le même événement)
create or replace function public.prendre_evenements(p_nombre int default 50)
returns setof public.evenements language sql security definer set search_path = public as $$
  update evenements set traite_le = now()
  where id in (
    select id from evenements where traite_le is null order by id limit p_nombre for update skip locked
  )
  returning *;
$$;

-- ---------- Rappels à envoyer (et marqués comme envoyés) ----------
-- 1. Mode « je transmets moi-même » : 20 h après un positionnement sans « coordonnées reçues »
create or replace function public.prendre_rappels_20h()
returns table (demande_id uuid, auteur_id uuid, membre_id uuid, positionne_le timestamptz)
language sql security definer set search_path = public as $$
  update positionnements p set rappel_20h_le = now()
  from demandes d
  where d.id = p.demande_id and d.mode_coordonnees = 'par_auteur'
    and d.statut in ('transmise', 'signee', 'non_signee')
    and p.retire_le is null and p.coordonnees_recues_le is null and p.rappel_20h_le is null
    and p.cree_le < now() - interval '20 hours'
    and p.cree_le > now() - interval '7 days'
  returning d.id, d.auteur_id, p.membre_id, p.cree_le;
$$;

-- 2. Aucun positionnement 48 h après le dépôt
create or replace function public.prendre_relances_48h()
returns table (demande_id uuid, auteur_id uuid)
language sql security definer set search_path = public as $$
  update demandes d set relance_48h_le = now()
  where d.statut = 'ouverte' and d.relance_48h_le is null
    and d.cree_le < now() - interval '48 hours'
    and d.date_mariage >= current_date
    and not exists (select 1 from positionnements p where p.demande_id = d.id and p.retire_le is null)
  returning d.id, d.auteur_id;
$$;

-- 3. 15 jours après la transmission : mettre à jour le statut (signée / non signée)
create or replace function public.prendre_rappels_15j()
returns table (demande_id uuid, auteur_id uuid)
language sql security definer set search_path = public as $$
  update demandes d set rappel_15j_le = now()
  where d.statut = 'transmise' and d.rappel_15j_le is null
    and d.transmise_le < now() - interval '15 days'
  returning d.id, d.auteur_id;
$$;

revoke execute on function public.enregistrer_push, public.supprimer_push, public.prendre_evenements,
  public.prendre_rappels_20h, public.prendre_relances_48h, public.prendre_rappels_15j, public.evenement_membre
  from public, anon, authenticated;
grant execute on function public.enregistrer_push, public.supprimer_push to authenticated;
grant execute on function public.prendre_evenements, public.prendre_rappels_20h,
  public.prendre_relances_48h, public.prendre_rappels_15j to service_role;

-- Le serveur (clé secrète) lit les tables pour composer les messages
grant select on public.membres, public.demandes, public.positionnements, public.metiers,
  public.departements, public.signalements, public.abonnements_push to service_role;
grant delete on public.abonnements_push to service_role;
grant execute on function public.expirer_demandes, public.purger_coordonnees to service_role;

-- ---------- Tâche planifiée : toutes les heures ----------
-- À exécuter une fois les réglages Vercel faits (voir docs/mise-en-service.md, étape 4) :
--   create extension if not exists pg_cron;
--   create extension if not exists pg_net;
--   select cron.schedule('relais-taches', '7 * * * *', $cron$
--     select net.http_get(
--       url := 'https://VOTRE-ADRESSE/api/taches',
--       headers := jsonb_build_object('Authorization', 'Bearer VOTRE_SECRET_TACHES')
--     );
--   $cron$);
