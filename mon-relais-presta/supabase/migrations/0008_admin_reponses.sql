-- =====================================================================
-- Mon Relais Presta — administration : qui répond aux demandes
-- 1. Rubrique « Demandes » : chaque demande avec les prestataires positionnés
-- 2. Statistiques : classement de ceux qui répondent le plus
-- À exécuter dans Supabase → SQL Editor, AVANT de fusionner la mise à jour.
-- (Les coordonnées des mariés restent invisibles pour l'administration.)
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
        group by m.id, m.nom order by count(*) desc, m.nom limit 10) z),
    -- Membres qui répondent le plus (« Je suis dispo », sans s'être retirés)
    'meilleurs_repondants', (select coalesce(jsonb_agg(x), '[]') from (
        select jsonb_build_object('id', m.id, 'nom', m.nom,
                 'reponses', count(distinct p.demande_id),
                 'signees', count(distinct p.demande_id) filter (where p.signee_par = m.id)) x
        from (select p.*, d.signee_par from positionnements p join d on d.id = p.demande_id
              where p.retire_le is null) p
        join membres m on m.id = p.membre_id
        group by m.id, m.nom order by count(distinct p.demande_id) desc, m.nom limit 10) z)
  ) into v;
  return v;
end $$;

create or replace function public.admin_demandes(p_depuis date default null)
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not est_admin() then raise exception 'Action réservée à l''administration' using errcode = '42501'; end if;
  return (
    select coalesce(jsonb_agg(jsonb_build_object(
      'id', d.id, 'date_mariage', d.date_mariage, 'departement', d.departement, 'zone', dep.zone,
      'lieu', d.lieu, 'metier_id', d.metier_id, 'mode_coordonnees', d.mode_coordonnees,
      'statut', case when d.statut = 'ouverte' and d.date_mariage < current_date then 'expiree' else d.statut end,
      'cree_le', d.cree_le, 'transmise_le', d.transmise_le, 'signee_par', d.signee_par,
      'auteur', jsonb_build_object('id', a.id, 'nom', a.nom, 'entreprise', a.entreprise),
      'positionnes', (select coalesce(jsonb_agg(jsonb_build_object(
            'membre_id', m.id, 'nom', m.nom, 'entreprise', m.entreprise, 'message', p.message,
            'cree_le', p.cree_le, 'retire_le', p.retire_le, 'coordonnees_recues_le', p.coordonnees_recues_le)
            order by p.cree_le), '[]')
          from positionnements p join membres m on m.id = p.membre_id where p.demande_id = d.id)
    ) order by d.cree_le desc), '[]')
    from demandes d
    join departements dep on dep.code = d.departement
    join membres a on a.id = d.auteur_id
    where admin_gere(array[dep.zone])
      and (p_depuis is null or d.cree_le >= p_depuis)
  );
end $$;

revoke execute on function public.admin_demandes(date) from public, anon;
grant execute on function public.admin_demandes(date) to authenticated;
