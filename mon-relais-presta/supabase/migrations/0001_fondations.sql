-- =====================================================================
-- Mon Relais Presta — étape 1 : fondations
-- Membres, zones et départements, métiers, charte d'utilisation.
-- À exécuter dans Supabase → SQL Editor (projet propre à Mon Relais Presta).
-- =====================================================================

-- ---------- Départements (numéro, nom, zone) ----------
create table if not exists public.departements (
  code  text primary key,
  nom   text not null,
  zone  text not null check (zone in ('paca', 'rhone_alpes')),
  ordre int  not null default 0
);

insert into public.departements (code, nom, zone, ordre) values
  ('04', 'Alpes-de-Haute-Provence', 'paca', 1),
  ('05', 'Hautes-Alpes',            'paca', 2),
  ('06', 'Alpes-Maritimes',         'paca', 3),
  ('13', 'Bouches-du-Rhône',        'paca', 4),
  ('83', 'Var',                     'paca', 5),
  ('84', 'Vaucluse',                'paca', 6),
  ('01', 'Ain',                     'rhone_alpes', 11),
  ('07', 'Ardèche',                 'rhone_alpes', 12),
  ('26', 'Drôme',                   'rhone_alpes', 13),
  ('38', 'Isère',                   'rhone_alpes', 14),
  ('42', 'Loire',                   'rhone_alpes', 15),
  ('69', 'Rhône',                   'rhone_alpes', 16),
  ('73', 'Savoie',                  'rhone_alpes', 17),
  ('74', 'Haute-Savoie',            'rhone_alpes', 18)
on conflict (code) do update set nom = excluded.nom, zone = excluded.zone, ordre = excluded.ordre;

-- ---------- Métiers (liste modifiable par l'administration) ----------
create table if not exists public.metiers (
  id     bigint generated always as identity primary key,
  nom    text not null unique check (length(trim(nom)) between 2 and 60),
  ordre  int  not null default 0,
  actif  boolean not null default true
);

insert into public.metiers (nom, ordre) values
  ('Wedding planner', 1), ('Photographe', 2), ('Vidéaste', 3), ('DJ', 4),
  ('Musiciens', 5), ('Traiteur', 6), ('Bar', 7), ('Fleuriste', 8),
  ('Décoration', 9), ('Location de matériel', 10),
  ('Officiant de cérémonie laïque', 11), ('Coiffure', 12), ('Maquillage', 13),
  ('Lieu de réception', 14), ('Autre', 99)
on conflict (nom) do nothing;

-- ---------- Charte d'utilisation (un seul texte, versionné) ----------
create table if not exists public.charte (
  id         int primary key default 1 check (id = 1),
  texte      text not null,
  version    int  not null default 1,
  modifie_le timestamptz not null default now()
);

insert into public.charte (id, texte) values (1,
$$En rejoignant Mon Relais Presta, je m'engage à :

1. Ne transmettre une demande qu'avec l'accord des mariés pour partager leurs coordonnées.
2. Ne cliquer sur « Je suis dispo » que si je suis réellement disponible à la date et capable de répondre au besoin.
3. Contacter les mariés rapidement (sous 48 h) et avec bienveillance, au nom de la communauté.
4. Mettre à jour le statut des demandes (signée, non signée) pour faire vivre l'entraide.
5. Ne jamais réutiliser les coordonnées des mariés pour autre chose que leur demande (pas de prospection, pas de revente, pas de fichier).
6. Rester courtois et loyal envers les autres membres : pas de dénigrement, pas de démarchage des clients d'un confrère.
7. Signaler tout abus à l'administration plutôt que de le régler en public.

Les coordonnées des mariés sont supprimées automatiquement 3 mois après la date du mariage.
Tout manquement peut entraîner la suspension du compte.$$)
on conflict (id) do nothing;

-- ---------- Membres ----------
create table if not exists public.membres (
  id               uuid primary key references auth.users (id) on delete cascade,
  email            text not null,
  nom              text not null check (length(trim(nom)) between 2 and 80),
  entreprise       text not null default '' check (length(entreprise) <= 100),
  metier_id        bigint references public.metiers (id),
  zones            text[] not null check (cardinality(zones) between 1 and 2 and zones <@ array['paca','rhone_alpes']),
  departements     text[] not null default '{}' check (cardinality(departements) >= 1),
  lien             text not null default '' check (length(lien) <= 200),   -- Instagram ou site
  role             text not null default 'membre' check (role in ('membre', 'admin')),
  -- Administrateur limité à certaines zones (vide = toutes les zones)
  admin_zones      text[] not null default '{}',
  statut           text not null default 'en_attente'
                   check (statut in ('en_attente', 'valide', 'refuse', 'suspendu')),
  motif_statut     text not null default '',
  charte_version   int not null,
  charte_acceptee_le timestamptz not null default now(),
  notif_email      boolean not null default true,
  notif_push       boolean not null default true,
  cree_le          timestamptz not null default now(),
  statut_modifie_le timestamptz,
  statut_modifie_par uuid references auth.users (id) on delete set null
);
create index if not exists membres_statut on public.membres (statut);

-- ---------- Fonctions d'aide (droits) ----------
create or replace function public.est_membre_valide()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from membres where id = auth.uid() and statut = 'valide');
$$;

create or replace function public.est_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from membres where id = auth.uid() and statut = 'valide' and role = 'admin');
$$;

-- L'administrateur connecté gère-t-il ce membre ? (zones communes, ou admin de toutes les zones)
create or replace function public.admin_gere(p_zones text[])
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from membres a
    where a.id = auth.uid() and a.statut = 'valide' and a.role = 'admin'
      and (cardinality(a.admin_zones) = 0 or a.admin_zones && p_zones)
  );
$$;

-- Départements valides pour les zones choisies
create or replace function public.departements_valides(p_zones text[], p_departements text[])
returns boolean language sql stable set search_path = public as $$
  select cardinality(p_departements) >= 1 and not exists (
    select 1 from unnest(p_departements) d
    where not exists (select 1 from departements x where x.code = d and x.zone = any (p_zones))
  );
$$;

-- ---------- Sécurité : lecture ----------
alter table public.departements enable row level security;
alter table public.metiers      enable row level security;
alter table public.charte       enable row level security;
alter table public.membres      enable row level security;

revoke all on public.departements, public.metiers, public.charte, public.membres from anon, authenticated;

grant select on public.departements, public.metiers, public.charte to anon, authenticated;
create policy "tout le monde lit les départements" on public.departements for select using (true);
create policy "tout le monde lit les métiers"      on public.metiers      for select using (true);
create policy "tout le monde lit la charte"        on public.charte       for select using (true);

-- Membres : l'e-mail n'est jamais lisible directement (seulement via les fonctions admin)
grant select (id, nom, entreprise, metier_id, zones, departements, lien, role, statut,
              notif_email, notif_push, cree_le, charte_version)
  on public.membres to authenticated;
create policy "lire sa fiche" on public.membres for select using (id = auth.uid());
create policy "les membres validés se voient" on public.membres for select
  using (statut = 'valide' and public.est_membre_valide());
create policy "l'admin voit les membres de ses zones" on public.membres for select
  using (public.admin_gere(zones));

-- ---------- Inscription et profil (toujours par fonction) ----------
create or replace function public.inscription(
  p_nom text, p_entreprise text, p_metier_id bigint, p_zones text[],
  p_departements text[], p_lien text, p_charte_version int
) returns void language plpgsql security definer set search_path = public as $$
declare
  v_version int;
  v_email text;
begin
  if auth.uid() is null then raise exception 'non connecté' using errcode = '42501'; end if;
  select version into v_version from charte where id = 1;
  if p_charte_version is distinct from v_version then
    raise exception 'La charte a changé : relisez-la avant de valider.' using errcode = 'P0001';
  end if;
  if not departements_valides(p_zones, p_departements) then
    raise exception 'Départements incohérents avec les zones' using errcode = '23514';
  end if;
  select email into v_email from auth.users where id = auth.uid();

  insert into membres (id, email, nom, entreprise, metier_id, zones, departements, lien, charte_version)
  values (auth.uid(), v_email, trim(p_nom), trim(coalesce(p_entreprise, '')), p_metier_id,
          p_zones, p_departements, trim(coalesce(p_lien, '')), v_version)
  on conflict (id) do update set
    nom = excluded.nom, entreprise = excluded.entreprise, metier_id = excluded.metier_id,
    zones = excluded.zones, departements = excluded.departements, lien = excluded.lien,
    charte_version = excluded.charte_version, charte_acceptee_le = now(),
    -- Une inscription refusée peut être retentée ; jamais un compte suspendu
    statut = case when membres.statut = 'refuse' then 'en_attente' else membres.statut end;
end $$;

create or replace function public.modifier_profil(
  p_nom text, p_entreprise text, p_metier_id bigint, p_zones text[],
  p_departements text[], p_lien text, p_notif_email boolean, p_notif_push boolean
) returns void language plpgsql security definer set search_path = public as $$
begin
  if not departements_valides(p_zones, p_departements) then
    raise exception 'Départements incohérents avec les zones' using errcode = '23514';
  end if;
  update membres set
    nom = trim(p_nom), entreprise = trim(coalesce(p_entreprise, '')), metier_id = p_metier_id,
    zones = p_zones, departements = p_departements, lien = trim(coalesce(p_lien, '')),
    notif_email = p_notif_email, notif_push = p_notif_push
  where id = auth.uid();
  if not found then raise exception 'Fiche introuvable' using errcode = '42501'; end if;
end $$;

-- Accepter une nouvelle version de la charte
create or replace function public.accepter_charte(p_version int)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_version is distinct from (select version from charte where id = 1) then
    raise exception 'La charte a changé : relisez-la.' using errcode = 'P0001';
  end if;
  update membres set charte_version = p_version, charte_acceptee_le = now() where id = auth.uid();
end $$;

-- ---------- Administration ----------
-- Liste complète (avec e-mail) des membres que l'admin gère
create or replace function public.admin_membres()
returns table (
  id uuid, email text, nom text, entreprise text, metier_id bigint, zones text[],
  departements text[], lien text, role text, admin_zones text[], statut text,
  motif_statut text, cree_le timestamptz, statut_modifie_le timestamptz
) language sql stable security definer set search_path = public as $$
  select m.id, m.email, m.nom, m.entreprise, m.metier_id, m.zones, m.departements, m.lien,
         m.role, m.admin_zones, m.statut, m.motif_statut, m.cree_le, m.statut_modifie_le
  from membres m
  where admin_gere(m.zones)
  order by (m.statut = 'en_attente') desc, m.cree_le desc;
$$;

create or replace function public.admin_changer_statut(p_membre uuid, p_statut text, p_motif text default '')
returns void language plpgsql security definer set search_path = public as $$
declare v_zones text[];
begin
  select zones into v_zones from membres where id = p_membre;
  if v_zones is null or not admin_gere(v_zones) then
    raise exception 'Action réservée à l''administration' using errcode = '42501';
  end if;
  if p_membre = auth.uid() then
    raise exception 'Vous ne pouvez pas modifier votre propre statut' using errcode = 'P0001';
  end if;
  if p_statut not in ('en_attente', 'valide', 'refuse', 'suspendu') then
    raise exception 'Statut inconnu' using errcode = '23514';
  end if;
  update membres set statut = p_statut, motif_statut = coalesce(p_motif, ''),
         statut_modifie_le = now(), statut_modifie_par = auth.uid()
  where id = p_membre;
end $$;

-- Rôle : réservé aux administrateurs de toutes les zones
create or replace function public.admin_changer_role(p_membre uuid, p_role text, p_admin_zones text[] default '{}')
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from membres where id = auth.uid() and statut = 'valide'
                 and role = 'admin' and cardinality(admin_zones) = 0) then
    raise exception 'Action réservée à l''administratrice principale' using errcode = '42501';
  end if;
  if p_membre = auth.uid() then
    raise exception 'Vous ne pouvez pas modifier votre propre rôle' using errcode = 'P0001';
  end if;
  if p_role not in ('membre', 'admin') then raise exception 'Rôle inconnu' using errcode = '23514'; end if;
  update membres set role = p_role,
         admin_zones = case when p_role = 'admin' then coalesce(p_admin_zones, '{}') else '{}' end
  where id = p_membre;
end $$;

create or replace function public.admin_modifier_charte(p_texte text)
returns int language plpgsql security definer set search_path = public as $$
declare v int;
begin
  if not est_admin() then raise exception 'Action réservée à l''administration' using errcode = '42501'; end if;
  update charte set texte = p_texte, version = version + 1, modifie_le = now() where id = 1
  returning version into v;
  -- L'auteur de la modification l'a forcément acceptée
  update membres set charte_version = v, charte_acceptee_le = now() where id = auth.uid();
  return v;
end $$;

create or replace function public.admin_enregistrer_metier(p_id bigint, p_nom text, p_ordre int, p_actif boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not est_admin() then raise exception 'Action réservée à l''administration' using errcode = '42501'; end if;
  if p_id is null then
    insert into metiers (nom, ordre, actif) values (trim(p_nom), coalesce(p_ordre, 50), coalesce(p_actif, true));
  else
    update metiers set nom = trim(p_nom), ordre = coalesce(p_ordre, ordre), actif = coalesce(p_actif, actif)
    where id = p_id;
  end if;
end $$;

-- Droits d'exécution : uniquement les personnes connectées
revoke execute on function public.inscription, public.modifier_profil, public.accepter_charte,
  public.admin_membres, public.admin_changer_statut, public.admin_changer_role,
  public.admin_modifier_charte, public.admin_enregistrer_metier,
  public.est_membre_valide, public.est_admin, public.admin_gere
  from public, anon;
grant execute on function public.inscription, public.modifier_profil, public.accepter_charte,
  public.admin_membres, public.admin_changer_statut, public.admin_changer_role,
  public.admin_modifier_charte, public.admin_enregistrer_metier,
  public.est_membre_valide, public.est_admin, public.admin_gere
  to authenticated;

-- ---------- Première administratrice ----------
-- Après vous être inscrite dans l'application, exécutez (en remplaçant l'adresse) :
--   update public.membres set role = 'admin', admin_zones = '{}', statut = 'valide'
--   where email = 'votre-adresse@exemple.fr';
