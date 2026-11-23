-- =====================================================================
-- Mon Relais Presta — plusieurs métiers par membre
-- (ex. une DJ qui est aussi chanteuse). À exécuter dans Supabase → SQL Editor,
-- AVANT de fusionner la mise à jour de l'application.
-- =====================================================================

-- ---------- Nouvelle colonne : la liste des métiers ----------
alter table public.membres add column if not exists metiers bigint[] not null default '{}';
update public.membres set metiers = array[metier_id] where cardinality(metiers) = 0 and metier_id is not null;

-- « metier_id » reste le métier principal (le premier de la liste) ; les deux colonnes
-- sont tenues à jour automatiquement, quelle que soit la façon dont la fiche est modifiée.
create or replace function public.synchroniser_metiers()
returns trigger language plpgsql set search_path = public as $$
begin
  if tg_op = 'UPDATE' and new.metier_id is distinct from old.metier_id and new.metiers is not distinct from old.metiers then
    new.metiers := array[new.metier_id];          -- ancienne version de l'application
  end if;
  if cardinality(new.metiers) = 0 and new.metier_id is not null then
    new.metiers := array[new.metier_id];
  end if;
  -- Sans doublon, ordre conservé
  new.metiers := (select coalesce(array_agg(x order by o), '{}') from (
                    select x, min(o) o from unnest(new.metiers) with ordinality t(x, o) group by x) u);
  new.metier_id := new.metiers[1];
  return new;
end $$;

drop trigger if exists membres_metiers on public.membres;
create trigger membres_metiers before insert or update on public.membres
  for each row execute function public.synchroniser_metiers();

alter table public.membres drop constraint if exists membres_metiers_nombre;
alter table public.membres add constraint membres_metiers_nombre check (cardinality(metiers) between 1 and 6);

grant select (metiers) on public.membres to authenticated;
grant select (metiers) on public.membres to service_role;

-- Tous les métiers existent-ils ?
create or replace function public.metiers_valides(p_metiers bigint[])
returns boolean language sql stable set search_path = public as $$
  select cardinality(p_metiers) between 1 and 6
     and not exists (select 1 from unnest(p_metiers) x where not exists (select 1 from metiers m where m.id = x));
$$;

-- ---------- Inscription et profil avec plusieurs métiers ----------
create or replace function public.inscription(
  p_nom text, p_entreprise text, p_metiers bigint[], p_zones text[],
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
  if not metiers_valides(p_metiers) then
    raise exception 'Choisissez entre 1 et 6 métiers.' using errcode = 'P0001';
  end if;
  if not departements_valides(p_zones, p_departements) then
    raise exception 'Départements incohérents avec les zones' using errcode = '23514';
  end if;
  select email into v_email from auth.users where id = auth.uid();

  insert into membres (id, email, nom, entreprise, metier_id, metiers, zones, departements, lien, charte_version)
  values (auth.uid(), v_email, trim(p_nom), trim(coalesce(p_entreprise, '')), p_metiers[1], p_metiers,
          p_zones, p_departements, trim(coalesce(p_lien, '')), v_version)
  on conflict (id) do update set
    nom = excluded.nom, entreprise = excluded.entreprise, metiers = excluded.metiers,
    zones = excluded.zones, departements = excluded.departements, lien = excluded.lien,
    charte_version = excluded.charte_version, charte_acceptee_le = now(),
    statut = case when membres.statut = 'refuse' then 'en_attente' else membres.statut end;
end $$;

create or replace function public.modifier_profil(
  p_nom text, p_entreprise text, p_metiers bigint[], p_zones text[],
  p_departements text[], p_lien text, p_notif_email boolean, p_notif_push boolean
) returns void language plpgsql security definer set search_path = public as $$
begin
  if not metiers_valides(p_metiers) then
    raise exception 'Choisissez entre 1 et 6 métiers.' using errcode = 'P0001';
  end if;
  if not departements_valides(p_zones, p_departements) then
    raise exception 'Départements incohérents avec les zones' using errcode = '23514';
  end if;
  update membres set
    nom = trim(p_nom), entreprise = trim(coalesce(p_entreprise, '')), metiers = p_metiers,
    zones = p_zones, departements = p_departements, lien = trim(coalesce(p_lien, '')),
    notif_email = p_notif_email, notif_push = p_notif_push
  where id = auth.uid();
  if not found then raise exception 'Fiche introuvable' using errcode = '42501'; end if;
end $$;

-- ---------- Administration : la liste des membres renvoie aussi les métiers ----------
drop function if exists public.admin_membres();
create function public.admin_membres()
returns table (
  id uuid, email text, nom text, entreprise text, metier_id bigint, metiers bigint[], zones text[],
  departements text[], lien text, role text, admin_zones text[], statut text,
  motif_statut text, cree_le timestamptz, statut_modifie_le timestamptz
) language sql stable security definer set search_path = public as $$
  select m.id, m.email, m.nom, m.entreprise, m.metier_id, m.metiers, m.zones, m.departements, m.lien,
         m.role, m.admin_zones, m.statut, m.motif_statut, m.cree_le, m.statut_modifie_le
  from membres m
  where admin_gere(m.zones)
  order by (m.statut = 'en_attente') desc, m.cree_le desc;
$$;

-- ---------- Fiche membre et détail d'une demande : avec tous les métiers ----------
create or replace function public.fiche_membre(p_id uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v jsonb;
begin
  perform exiger_membre();
  select jsonb_build_object(
    'id', m.id, 'nom', m.nom, 'entreprise', m.entreprise, 'metier_id', m.metier_id, 'metiers', m.metiers,
    'zones', m.zones, 'departements', m.departements, 'lien', m.lien, 'role', m.role,
    'statut', m.statut, 'cree_le', m.cree_le,
    'donnees', (select count(*) from demandes d where d.auteur_id = m.id and d.statut <> 'annulee'),
    'recues', (select count(distinct p.demande_id) from positionnements p where p.membre_id = m.id and p.retire_le is null),
    'signees', (select count(*) from demandes d where d.signee_par = m.id)
  ) into v
  from membres m
  where m.id = p_id and (m.statut = 'valide' or m.id = auth.uid() or admin_gere(m.zones));
  return v;
end $$;

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
          'membre_id', m.id, 'nom', m.nom, 'entreprise', m.entreprise, 'metier_id', m.metier_id, 'metiers', m.metiers,
          'lien', m.lien, 'message', p.message, 'cree_le', p.cree_le, 'retire_le', p.retire_le,
          'coordonnees_recues_le', p.coordonnees_recues_le,
          'email', m.email) order by p.cree_le), '[]')
       from positionnements p join membres m on m.id = p.membre_id
       where p.demande_id = p_id));
  end if;
  return v_resultat;
end $$;

revoke execute on function public.inscription(text, text, bigint[], text[], text[], text, int),
  public.modifier_profil(text, text, bigint[], text[], text[], text, boolean, boolean),
  public.admin_membres(), public.metiers_valides(bigint[]), public.synchroniser_metiers()
  from public, anon;
grant execute on function public.inscription(text, text, bigint[], text[], text[], text, int),
  public.modifier_profil(text, text, bigint[], text[], text[], text, boolean, boolean),
  public.admin_membres(), public.metiers_valides(bigint[])
  to authenticated;

-- Les anciennes versions (un seul métier) restent en place le temps de la mise à jour
-- de l'application ; elles pourront être supprimées ensuite.
