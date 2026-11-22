-- =====================================================================
-- Mon Relais Presta — étapes 2 à 4 : demandes, coordonnées, positionnements
-- =====================================================================

-- ---------- Demandes ----------
create table if not exists public.demandes (
  id               uuid primary key default gen_random_uuid(),
  auteur_id        uuid not null references public.membres (id) on delete cascade,
  -- Les demandes « dupliquées pour un autre métier » partagent le même groupe
  groupe_id        uuid not null default gen_random_uuid(),
  date_mariage     date not null,
  departement      text not null references public.departements (code),
  lieu             text not null check (length(trim(lieu)) between 2 and 120),
  metier_id        bigint not null references public.metiers (id),
  invites          int  not null check (invites between 1 and 3000),
  budget           int  check (budget is null or budget between 0 and 10000000),   -- en euros, facultatif
  note             text not null default '' check (length(note) <= 1500),
  -- « renseignees » : l'auteur a saisi les coordonnées des mariés
  -- « par_auteur »  : l'auteur les transmettra lui-même sous 24 h
  mode_coordonnees text not null check (mode_coordonnees in ('renseignees', 'par_auteur')),
  accord_maries    boolean not null check (accord_maries),
  statut           text not null default 'ouverte'
                   check (statut in ('ouverte', 'transmise', 'signee', 'non_signee', 'expiree', 'annulee')),
  signee_par       uuid references public.membres (id) on delete set null,
  cree_le          timestamptz not null default now(),
  modifie_le       timestamptz not null default now(),
  transmise_le     timestamptz,
  statut_maj_le    timestamptz,
  coordonnees_supprimees_le timestamptz
);
create index if not exists demandes_statut_date on public.demandes (statut, date_mariage);
create index if not exists demandes_auteur on public.demandes (auteur_id);
create index if not exists demandes_groupe on public.demandes (groupe_id);

-- ---------- Coordonnées des mariés (table verrouillée) ----------
create table if not exists public.coordonnees (
  demande_id uuid primary key references public.demandes (id) on delete cascade,
  nom        text not null default '' check (length(nom) <= 120),
  telephone  text not null default '' check (length(telephone) <= 40),
  email      text not null default '' check (length(email) <= 160)
);

-- ---------- Positionnements (« Je suis dispo ») ----------
create table if not exists public.positionnements (
  id          uuid primary key default gen_random_uuid(),
  demande_id  uuid not null references public.demandes (id) on delete cascade,
  membre_id   uuid not null references public.membres (id) on delete cascade,
  message     text not null default '' check (length(message) <= 800),
  engagement  boolean not null check (engagement),
  cree_le     timestamptz not null default now(),
  retire_le   timestamptz,
  coordonnees_recues_le timestamptz
);
-- Un seul positionnement actif par membre et par demande
create unique index if not exists positionnements_actif_unique
  on public.positionnements (demande_id, membre_id) where retire_le is null;
create index if not exists positionnements_membre on public.positionnements (membre_id);

-- ---------- Journal des événements (sert aux notifications) ----------
create table if not exists public.evenements (
  id          bigint generated always as identity primary key,
  type        text not null,
  demande_id  uuid references public.demandes (id) on delete cascade,
  membre_id   uuid references public.membres (id) on delete cascade,   -- personne à l'origine
  donnees     jsonb not null default '{}',
  cree_le     timestamptz not null default now(),
  traite_le   timestamptz
);
create index if not exists evenements_a_traiter on public.evenements (id) where traite_le is null;

-- Nombre maximal de prestataires positionnés par demande
create or replace function public.places_max() returns int language sql immutable as $$ select 3 $$;

-- ---------- Sécurité ----------
alter table public.demandes        enable row level security;
alter table public.coordonnees     enable row level security;
alter table public.positionnements enable row level security;
alter table public.evenements      enable row level security;
revoke all on public.demandes, public.coordonnees, public.positionnements, public.evenements from anon, authenticated;
-- Tout passe par les fonctions ci-dessous (aucun accès direct aux tables)

-- ---------- Fonctions internes ----------
create or replace function public.est_positionne(p_demande uuid, p_membre uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from positionnements
                 where demande_id = p_demande and membre_id = p_membre and retire_le is null);
$$;

create or replace function public.nb_positionnes(p_demande uuid)
returns int language sql stable security definer set search_path = public as $$
  select count(*)::int from positionnements where demande_id = p_demande and retire_le is null;
$$;

-- Vérifie que l'utilisateur est un membre validé
create or replace function public.exiger_membre()
returns void language plpgsql stable security definer set search_path = public as $$
begin
  if not est_membre_valide() then
    raise exception 'Réservé aux membres validés' using errcode = '42501';
  end if;
end $$;

-- Contrôle commun au dépôt et à la modification
create or replace function public.verifier_demande(
  p_date date, p_departement text, p_metier_id bigint, p_mode text, p_accord boolean,
  p_nom text, p_telephone text, p_email text
) returns void language plpgsql stable set search_path = public as $$
begin
  if p_date < current_date then
    raise exception 'La date du mariage est déjà passée.' using errcode = 'P0001';
  end if;
  if not exists (select 1 from departements where code = p_departement) then
    raise exception 'Département inconnu.' using errcode = 'P0001';
  end if;
  if not exists (select 1 from metiers where id = p_metier_id) then
    raise exception 'Métier inconnu.' using errcode = 'P0001';
  end if;
  if not coalesce(p_accord, false) then
    raise exception 'Les mariés doivent être d''accord pour que leurs coordonnées soient transmises.' using errcode = 'P0001';
  end if;
  if p_mode = 'renseignees' and coalesce(trim(p_telephone), '') = '' and coalesce(trim(p_email), '') = '' then
    raise exception 'Indiquez au moins le téléphone ou l''e-mail des mariés.' using errcode = 'P0001';
  end if;
end $$;

-- ---------- Déposer une demande (aussi pour « Dupliquer pour un autre métier ») ----------
create or replace function public.deposer_demande(
  p_date date, p_departement text, p_lieu text, p_metier_id bigint, p_invites int,
  p_budget int, p_note text, p_mode text, p_accord boolean,
  p_nom text default '', p_telephone text default '', p_email text default '',
  p_groupe_id uuid default null
) returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
  v_groupe uuid := coalesce(p_groupe_id, gen_random_uuid());
begin
  perform exiger_membre();
  perform verifier_demande(p_date, p_departement, p_metier_id, p_mode, p_accord, p_nom, p_telephone, p_email);
  -- Duplication : le groupe doit appartenir à l'auteur, et le métier ne pas y être déjà
  if p_groupe_id is not null then
    if not exists (select 1 from demandes where groupe_id = p_groupe_id and auteur_id = auth.uid()) then
      raise exception 'Demande d''origine introuvable.' using errcode = '42501';
    end if;
    if exists (select 1 from demandes where groupe_id = p_groupe_id and metier_id = p_metier_id and statut <> 'annulee') then
      raise exception 'Une demande existe déjà pour ce métier à ce mariage.' using errcode = 'P0001';
    end if;
  end if;

  insert into demandes (auteur_id, groupe_id, date_mariage, departement, lieu, metier_id, invites,
                        budget, note, mode_coordonnees, accord_maries)
  values (auth.uid(), v_groupe, p_date, p_departement, trim(p_lieu), p_metier_id, p_invites,
          p_budget, trim(coalesce(p_note, '')), p_mode, p_accord)
  returning id into v_id;

  if p_mode = 'renseignees' then
    insert into coordonnees (demande_id, nom, telephone, email)
    values (v_id, trim(coalesce(p_nom, '')), trim(coalesce(p_telephone, '')), lower(trim(coalesce(p_email, ''))));
  end if;

  insert into evenements (type, demande_id, membre_id) values ('nouvelle_demande', v_id, auth.uid());
  return v_id;
end $$;

-- ---------- Modifier une demande ----------
create or replace function public.modifier_demande(
  p_id uuid, p_date date, p_departement text, p_lieu text, p_metier_id bigint, p_invites int,
  p_budget int, p_note text, p_mode text, p_accord boolean,
  p_nom text default '', p_telephone text default '', p_email text default ''
) returns void language plpgsql security definer set search_path = public as $$
declare d demandes;
begin
  perform exiger_membre();
  select * into d from demandes where id = p_id for update;
  if d.id is null or d.auteur_id <> auth.uid() then
    raise exception 'Seul l''auteur peut modifier cette demande.' using errcode = '42501';
  end if;
  if d.statut not in ('ouverte', 'transmise') then
    raise exception 'Cette demande ne peut plus être modifiée.' using errcode = 'P0001';
  end if;
  -- Le métier ne change pas une fois des prestataires positionnés
  if p_metier_id <> d.metier_id and nb_positionnes(p_id) > 0 then
    raise exception 'Des prestataires sont déjà positionnés : le métier ne peut plus changer. Annulez et déposez une nouvelle demande.' using errcode = 'P0001';
  end if;
  perform verifier_demande(p_date, p_departement, p_metier_id, p_mode, p_accord, p_nom, p_telephone, p_email);

  update demandes set date_mariage = p_date, departement = p_departement, lieu = trim(p_lieu),
    metier_id = p_metier_id, invites = p_invites, budget = p_budget, note = trim(coalesce(p_note, '')),
    mode_coordonnees = p_mode, accord_maries = p_accord, modifie_le = now()
  where id = p_id;

  if p_mode = 'renseignees' then
    insert into coordonnees (demande_id, nom, telephone, email)
    values (p_id, trim(coalesce(p_nom, '')), trim(coalesce(p_telephone, '')), lower(trim(coalesce(p_email, ''))))
    on conflict (demande_id) do update set nom = excluded.nom, telephone = excluded.telephone, email = excluded.email;
  else
    delete from coordonnees where demande_id = p_id;
  end if;

  if nb_positionnes(p_id) > 0 then
    insert into evenements (type, demande_id, membre_id) values ('demande_modifiee', p_id, auth.uid());
  end if;
end $$;

-- ---------- Annuler une demande ----------
create or replace function public.annuler_demande(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare d demandes;
begin
  perform exiger_membre();
  select * into d from demandes where id = p_id for update;
  if d.id is null or d.auteur_id <> auth.uid() then
    raise exception 'Seul l''auteur peut annuler cette demande.' using errcode = '42501';
  end if;
  if d.statut in ('annulee', 'expiree') then return; end if;
  update demandes set statut = 'annulee', statut_maj_le = now(), modifie_le = now() where id = p_id;
  delete from coordonnees where demande_id = p_id;
  if nb_positionnes(p_id) > 0 then
    insert into evenements (type, demande_id, membre_id) values ('demande_annulee', p_id, auth.uid());
  end if;
end $$;

-- ---------- « Je suis dispo » ----------
create or replace function public.me_positionner(p_id uuid, p_message text, p_engagement boolean)
returns void language plpgsql security definer set search_path = public as $$
declare d demandes;
begin
  perform exiger_membre();
  -- Verrou : deux clics simultanés ne peuvent pas dépasser la limite
  select * into d from demandes where id = p_id for update;
  if d.id is null then raise exception 'Demande introuvable.' using errcode = 'P0001'; end if;
  if d.auteur_id = auth.uid() then
    raise exception 'Vous êtes l''auteur de cette demande.' using errcode = 'P0001';
  end if;
  if not coalesce(p_engagement, false) then
    raise exception 'Cochez la case d''engagement pour vous positionner.' using errcode = 'P0001';
  end if;
  if d.statut not in ('ouverte', 'transmise') or d.date_mariage < current_date then
    raise exception 'Cette demande n''est plus ouverte.' using errcode = 'P0001';
  end if;
  if est_positionne(p_id, auth.uid()) then
    raise exception 'Vous êtes déjà positionné(e) sur cette demande.' using errcode = 'P0001';
  end if;
  if nb_positionnes(p_id) >= places_max() then
    raise exception 'Demande complète : 3 prestataires sont déjà positionnés.' using errcode = 'P0001';
  end if;

  insert into positionnements (demande_id, membre_id, message, engagement)
  values (p_id, auth.uid(), trim(coalesce(p_message, '')), true);

  if d.statut = 'ouverte' then
    update demandes set statut = 'transmise', transmise_le = coalesce(transmise_le, now()), statut_maj_le = now()
    where id = p_id;
  end if;
  insert into evenements (type, demande_id, membre_id, donnees)
  values ('positionnement', p_id, auth.uid(),
          jsonb_build_object('premier', d.statut = 'ouverte', 'message', trim(coalesce(p_message, ''))));
end $$;

-- ---------- Se retirer ----------
create or replace function public.me_retirer(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare d demandes;
begin
  perform exiger_membre();
  select * into d from demandes where id = p_id for update;
  update positionnements set retire_le = now()
  where demande_id = p_id and membre_id = auth.uid() and retire_le is null;
  if not found then raise exception 'Vous n''êtes pas positionné(e) sur cette demande.' using errcode = 'P0001'; end if;
  -- Plus personne : la demande redevient ouverte
  if d.statut = 'transmise' and nb_positionnes(p_id) = 0 then
    update demandes set statut = 'ouverte', transmise_le = null, statut_maj_le = now() where id = p_id;
  end if;
  insert into evenements (type, demande_id, membre_id) values ('retrait', p_id, auth.uid());
end $$;

-- ---------- « Coordonnées reçues » (mode « je transmets moi-même ») ----------
create or replace function public.confirmer_coordonnees(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform exiger_membre();
  update positionnements set coordonnees_recues_le = coalesce(coordonnees_recues_le, now())
  where demande_id = p_id and membre_id = auth.uid() and retire_le is null;
  if not found then raise exception 'Vous n''êtes pas positionné(e) sur cette demande.' using errcode = 'P0001'; end if;
end $$;

-- ---------- Statut signé / non signé (auteur) ----------
create or replace function public.changer_statut_demande(p_id uuid, p_statut text, p_signee_par uuid default null)
returns void language plpgsql security definer set search_path = public as $$
declare d demandes;
begin
  perform exiger_membre();
  select * into d from demandes where id = p_id for update;
  if d.id is null or d.auteur_id <> auth.uid() then
    raise exception 'Seul l''auteur peut changer le statut.' using errcode = '42501';
  end if;
  if p_statut not in ('transmise', 'signee', 'non_signee') then
    raise exception 'Statut inconnu.' using errcode = '23514';
  end if;
  if d.transmise_le is null then
    raise exception 'La demande doit d''abord être transmise à un prestataire.' using errcode = 'P0001';
  end if;
  if d.statut in ('annulee') then
    raise exception 'Cette demande est annulée.' using errcode = 'P0001';
  end if;
  if p_statut = 'signee' and p_signee_par is not null
     and not exists (select 1 from positionnements where demande_id = p_id and membre_id = p_signee_par) then
    raise exception 'Ce prestataire ne s''est pas positionné sur la demande.' using errcode = 'P0001';
  end if;
  update demandes set statut = p_statut, statut_maj_le = now(),
    signee_par = case when p_statut = 'signee' then p_signee_par else null end
  where id = p_id;
end $$;

-- ---------- Lecture : liste des demandes ----------
-- Une ligne par demande, sans aucune coordonnée des mariés.
-- « complete » : 3 prestataires positionnés, plus de place.
create or replace function public.liste_demandes(p_toutes boolean default false)
returns table (
  id uuid, auteur_id uuid, auteur_nom text, groupe_id uuid, date_mariage date, departement text,
  zone text, lieu text, metier_id bigint, invites int, budget int, note text, mode_coordonnees text,
  statut text, cree_le timestamptz, transmise_le timestamptz, nb_positionnes int, complete boolean,
  je_suis_positionne boolean
) language sql stable security definer set search_path = public as $$
  select d.id, d.auteur_id, m.nom, d.groupe_id, d.date_mariage, d.departement, dep.zone, d.lieu,
         d.metier_id, d.invites, d.budget, d.note, d.mode_coordonnees,
         -- Date passée sans positionnement : « expirée » sans attendre la tâche automatique
         case when d.statut = 'ouverte' and d.date_mariage < current_date then 'expiree' else d.statut end,
         d.cree_le, d.transmise_le, n.nb, (n.nb >= places_max() and d.statut in ('ouverte', 'transmise')),
         est_positionne(d.id, auth.uid())
  from demandes d
  join membres m on m.id = d.auteur_id
  join departements dep on dep.code = d.departement
  cross join lateral (select nb_positionnes(d.id) as nb) n
  where est_membre_valide()
    and (p_toutes or (d.statut in ('ouverte', 'transmise') and d.date_mariage >= current_date))
  order by d.date_mariage, d.cree_le;
$$;

-- Mes demandes données et celles où je suis positionné(e)
create or replace function public.mes_suivis()
returns table (
  id uuid, role text, date_mariage date, departement text, lieu text, metier_id bigint,
  statut text, mode_coordonnees text, nb_positionnes int, complete boolean, cree_le timestamptz,
  positionne_le timestamptz, retire_le timestamptz, coordonnees_recues_le timestamptz, auteur_nom text
) language sql stable security definer set search_path = public as $$
  select d.id, 'auteur', d.date_mariage, d.departement, d.lieu, d.metier_id,
         case when d.statut = 'ouverte' and d.date_mariage < current_date then 'expiree' else d.statut end,
         d.mode_coordonnees, nb_positionnes(d.id), nb_positionnes(d.id) >= places_max() and d.statut in ('ouverte', 'transmise'),
         d.cree_le, null::timestamptz, null::timestamptz, null::timestamptz, null::text
  from demandes d where d.auteur_id = auth.uid() and est_membre_valide()
  union all
  select d.id, 'positionne', d.date_mariage, d.departement, d.lieu, d.metier_id,
         case when d.statut = 'ouverte' and d.date_mariage < current_date then 'expiree' else d.statut end,
         d.mode_coordonnees, nb_positionnes(d.id), nb_positionnes(d.id) >= places_max() and d.statut in ('ouverte', 'transmise'),
         d.cree_le, p.cree_le, p.retire_le, p.coordonnees_recues_le, m.nom
  from positionnements p
  join demandes d on d.id = p.demande_id
  join membres m on m.id = d.auteur_id
  where p.membre_id = auth.uid() and est_membre_valide()
    -- Dernier positionnement seulement (si retiré puis revenu)
    and p.cree_le = (select max(cree_le) from positionnements x where x.demande_id = p.demande_id and x.membre_id = p.membre_id)
  order by 3;
$$;

-- ---------- Lecture : une demande en détail ----------
-- Coordonnées des mariés : seulement pour l'auteur et les prestataires positionnés.
-- Liste des positionnés : seulement pour l'auteur (les autres voient le nombre).
create or replace function public.detail_demande(p_id uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  d demandes;
  v_auteur boolean;
  v_positionne boolean;
  v_resultat jsonb;
begin
  perform exiger_membre();
  select * into d from demandes where id = p_id;
  if d.id is null then return null; end if;
  v_auteur := d.auteur_id = auth.uid();
  v_positionne := est_positionne(p_id, auth.uid());

  v_resultat := to_jsonb(d) - 'accord_maries' || jsonb_build_object(
    'statut', case when d.statut = 'ouverte' and d.date_mariage < current_date then 'expiree' else d.statut end,
    'zone', (select zone from departements where code = d.departement),
    'auteur', (select jsonb_build_object('id', m.id, 'nom', m.nom, 'entreprise', m.entreprise, 'metier_id', m.metier_id, 'lien', m.lien)
               from membres m where m.id = d.auteur_id),
    'nb_positionnes', nb_positionnes(p_id),
    'places_max', places_max(),
    'je_suis_auteur', v_auteur,
    'je_suis_positionne', v_positionne,
    'mon_positionnement', (select to_jsonb(p) - 'membre_id' from positionnements p
                           where p.demande_id = p_id and p.membre_id = auth.uid()
                           order by p.cree_le desc limit 1),
    'groupe', (select coalesce(jsonb_agg(jsonb_build_object('id', g.id, 'metier_id', g.metier_id, 'statut', g.statut) order by g.cree_le), '[]')
               from demandes g where g.groupe_id = d.groupe_id and g.id <> d.id and g.statut <> 'annulee'
                 and (v_auteur or g.statut in ('ouverte', 'transmise')))
  );

  if v_auteur or v_positionne then
    v_resultat := v_resultat || jsonb_build_object('coordonnees',
      (select jsonb_build_object('nom', c.nom, 'telephone', c.telephone, 'email', c.email)
       from coordonnees c where c.demande_id = p_id));
  end if;

  if v_auteur then
    v_resultat := v_resultat || jsonb_build_object('positionnes',
      (select coalesce(jsonb_agg(jsonb_build_object(
          'membre_id', m.id, 'nom', m.nom, 'entreprise', m.entreprise, 'metier_id', m.metier_id,
          'lien', m.lien, 'message', p.message, 'cree_le', p.cree_le, 'retire_le', p.retire_le,
          'coordonnees_recues_le', p.coordonnees_recues_le,
          'email', m.email) order by p.cree_le), '[]')
       from positionnements p join membres m on m.id = p.membre_id
       where p.demande_id = p_id));
  end if;
  return v_resultat;
end $$;

-- ---------- Tâches automatiques (appelées par la tâche planifiée) ----------
-- Date passée sans positionnement → « Expirée »
create or replace function public.expirer_demandes()
returns int language sql security definer set search_path = public as $$
  with x as (
    update demandes set statut = 'expiree', statut_maj_le = now()
    where statut = 'ouverte' and date_mariage < current_date
    returning 1
  ) select count(*)::int from x;
$$;

-- RGPD : coordonnées des mariés supprimées 3 mois après la date du mariage
create or replace function public.purger_coordonnees()
returns int language plpgsql security definer set search_path = public as $$
declare n int;
begin
  with x as (
    delete from coordonnees c using demandes d
    where d.id = c.demande_id and d.date_mariage + interval '3 months' < current_date
    returning d.id
  )
  update demandes set coordonnees_supprimees_le = now() where id in (select id from x);
  get diagnostics n = row_count;
  return n;
end $$;

-- ---------- Droits d'exécution ----------
revoke execute on function public.est_positionne, public.nb_positionnes, public.exiger_membre,
  public.verifier_demande, public.deposer_demande, public.modifier_demande, public.annuler_demande,
  public.me_positionner, public.me_retirer, public.confirmer_coordonnees, public.changer_statut_demande,
  public.liste_demandes, public.mes_suivis, public.detail_demande,
  public.expirer_demandes, public.purger_coordonnees
  from public, anon;
grant execute on function public.deposer_demande, public.modifier_demande, public.annuler_demande,
  public.me_positionner, public.me_retirer, public.confirmer_coordonnees, public.changer_statut_demande,
  public.liste_demandes, public.mes_suivis, public.detail_demande
  to authenticated;
-- Tâches automatiques : uniquement le serveur (clé secrète)
grant execute on function public.expirer_demandes, public.purger_coordonnees to service_role;
