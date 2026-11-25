-- =====================================================================
-- Mon Relais Presta — étape 7 : statistiques de l'administration
-- Par zone, département et métier : demandes déposées, transmises, signées.
-- Un administrateur limité à une zone ne voit que les chiffres de sa zone.
-- =====================================================================

create or replace function public.admin_statistiques(p_depuis date default null)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v jsonb;
begin
  if not est_admin() then raise exception 'Action réservée à l''administration' using errcode = '42501'; end if;

  with d as (
    select d.*, dep.zone,
           d.transmise_le is not null or d.statut in ('signee', 'non_signee') as est_transmise
    from demandes d join departements dep on dep.code = d.departement
    where d.statut <> 'annulee'
      and (p_depuis is null or d.cree_le >= p_depuis)
      and admin_gere(array[dep.zone])
  ),
  agreger as (
    select jsonb_build_object(
      'deposees', count(*),
      'transmises', count(*) filter (where est_transmise),
      'signees', count(*) filter (where statut = 'signee'),
      'non_signees', count(*) filter (where statut = 'non_signee'),
      'expirees', count(*) filter (where statut = 'expiree'),
      'ouvertes', count(*) filter (where statut = 'ouverte' and date_mariage >= current_date)
    ) as total from d
  ),
  p as (
    select p.*, d.mode_coordonnees from positionnements p join d on d.id = p.demande_id
  )
  select jsonb_build_object(
    'total', (select total from agreger),
    'par_zone', (select coalesce(jsonb_agg(x order by x->>'cle'), '[]') from (
        select jsonb_build_object('cle', zone, 'deposees', count(*), 'transmises', count(*) filter (where est_transmise),
               'signees', count(*) filter (where statut = 'signee')) x
        from d group by zone) z),
    'par_departement', (select coalesce(jsonb_agg(x order by (x->>'deposees')::int desc, x->>'cle'), '[]') from (
        select jsonb_build_object('cle', departement, 'deposees', count(*), 'transmises', count(*) filter (where est_transmise),
               'signees', count(*) filter (where statut = 'signee')) x
        from d group by departement) z),
    'par_metier', (select coalesce(jsonb_agg(x order by (x->>'deposees')::int desc), '[]') from (
        select jsonb_build_object('cle', metier_id, 'deposees', count(*), 'transmises', count(*) filter (where est_transmise),
               'signees', count(*) filter (where statut = 'signee')) x
        from d group by metier_id) z),
    'positionnements', (select jsonb_build_object(
        'total', count(*),
        'retires', count(*) filter (where retire_le is not null),
        'a_confirmer', count(*) filter (where mode_coordonnees = 'par_auteur' and retire_le is null),
        'coordonnees_recues', count(*) filter (where mode_coordonnees = 'par_auteur' and retire_le is null and coordonnees_recues_le is not null),
        'recues_sous_24h', count(*) filter (where mode_coordonnees = 'par_auteur' and retire_le is null
                                                 and coordonnees_recues_le <= cree_le + interval '24 hours')
      ) from p),
    'membres', (select jsonb_build_object(
        'valides', count(*) filter (where statut = 'valide'),
        'en_attente', count(*) filter (where statut = 'en_attente'),
        'suspendus', count(*) filter (where statut = 'suspendu'),
        'paca', count(*) filter (where statut = 'valide' and 'paca' = any (zones)),
        'rhone_alpes', count(*) filter (where statut = 'valide' and 'rhone_alpes' = any (zones))
      ) from membres where admin_gere(zones)),
    -- Membres qui donnent le plus (réciprocité)
    'meilleurs_donneurs', (select coalesce(jsonb_agg(x), '[]') from (
        select jsonb_build_object('id', m.id, 'nom', m.nom, 'donnees', count(*)) x
        from d join membres m on m.id = d.auteur_id
        group by m.id, m.nom order by count(*) desc, m.nom limit 5) z)
  ) into v;
  return v;
end $$;

revoke execute on function public.admin_statistiques from public, anon;
grant execute on function public.admin_statistiques to authenticated;
