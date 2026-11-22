-- =====================================================================
-- Mon Relais Presta — étape 5 : fiches membres, réciprocité, signalements
-- =====================================================================

-- ---------- Fiche d'un membre, avec compteur de réciprocité ----------
-- Données : demandes transmises à la communauté (hors annulées)
-- Reçues  : demandes sur lesquelles le membre s'est positionné (sans s'être retiré)
create or replace function public.fiche_membre(p_id uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v jsonb;
begin
  perform exiger_membre();
  select jsonb_build_object(
    'id', m.id, 'nom', m.nom, 'entreprise', m.entreprise, 'metier_id', m.metier_id,
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

-- ---------- Signalements ----------
create table if not exists public.signalements (
  id          bigint generated always as identity primary key,
  auteur_id   uuid not null references public.membres (id) on delete cascade,
  cible       text not null check (cible in ('demande', 'membre')),
  demande_id  uuid references public.demandes (id) on delete cascade,
  membre_id   uuid references public.membres (id) on delete cascade,
  motif       text not null check (length(trim(motif)) between 5 and 1500),
  cree_le     timestamptz not null default now(),
  traite_le   timestamptz,
  traite_par  uuid references public.membres (id) on delete set null,
  decision    text not null default '',
  check ((cible = 'demande' and demande_id is not null) or (cible = 'membre' and membre_id is not null))
);
alter table public.signalements enable row level security;
revoke all on public.signalements from anon, authenticated;

create or replace function public.signaler(p_cible text, p_id uuid, p_motif text)
returns void language plpgsql security definer set search_path = public as $$
declare v_id bigint;
begin
  perform exiger_membre();
  if p_cible = 'demande' then
    if not exists (select 1 from demandes where id = p_id) then raise exception 'Demande introuvable.' using errcode = 'P0001'; end if;
    insert into signalements (auteur_id, cible, demande_id, motif) values (auth.uid(), 'demande', p_id, trim(p_motif)) returning id into v_id;
  elsif p_cible = 'membre' then
    if p_id = auth.uid() then raise exception 'Vous ne pouvez pas vous signaler vous-même.' using errcode = 'P0001'; end if;
    if not exists (select 1 from membres where id = p_id) then raise exception 'Membre introuvable.' using errcode = 'P0001'; end if;
    insert into signalements (auteur_id, cible, membre_id, motif) values (auth.uid(), 'membre', p_id, trim(p_motif)) returning id into v_id;
  else
    raise exception 'Cible inconnue' using errcode = '23514';
  end if;
  insert into evenements (type, membre_id, demande_id, donnees)
  values ('signalement', auth.uid(), case when p_cible = 'demande' then p_id end, jsonb_build_object('signalement', v_id));
end $$;

-- Zones concernées par un signalement (pour les administrateurs limités à une zone)
create or replace function public.zones_signalement(s signalements)
returns text[] language sql stable security definer set search_path = public as $$
  select case
    when s.cible = 'demande' then (select array[dep.zone] from demandes d join departements dep on dep.code = d.departement where d.id = s.demande_id)
    else (select zones from membres where id = s.membre_id)
  end;
$$;

create or replace function public.admin_signalements()
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', s.id, 'cible', s.cible, 'motif', s.motif, 'cree_le', s.cree_le,
    'traite_le', s.traite_le, 'decision', s.decision,
    'auteur', jsonb_build_object('id', a.id, 'nom', a.nom),
    'demande', case when s.cible = 'demande' then (select jsonb_build_object('id', d.id, 'lieu', d.lieu, 'date_mariage', d.date_mariage,
                  'metier_id', d.metier_id, 'statut', d.statut, 'auteur_id', d.auteur_id,
                  'auteur_nom', (select nom from membres where id = d.auteur_id)) from demandes d where d.id = s.demande_id) end,
    'membre', case when s.cible = 'membre' then (select jsonb_build_object('id', m.id, 'nom', m.nom, 'statut', m.statut) from membres m where m.id = s.membre_id) end
  ) order by (s.traite_le is null) desc, s.cree_le desc), '[]')
  from signalements s join membres a on a.id = s.auteur_id
  where admin_gere(zones_signalement(s));
$$;

create or replace function public.admin_traiter_signalement(p_id bigint, p_decision text)
returns void language plpgsql security definer set search_path = public as $$
declare s signalements;
begin
  select * into s from signalements where id = p_id;
  if s.id is null or not admin_gere(zones_signalement(s)) then
    raise exception 'Action réservée à l''administration' using errcode = '42501';
  end if;
  update signalements set traite_le = now(), traite_par = auth.uid(), decision = coalesce(p_decision, '') where id = p_id;
end $$;

-- L'administration peut retirer une demande abusive
create or replace function public.admin_annuler_demande(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_zone text;
begin
  select dep.zone into v_zone from demandes d join departements dep on dep.code = d.departement where d.id = p_id;
  if v_zone is null or not admin_gere(array[v_zone]) then
    raise exception 'Action réservée à l''administration' using errcode = '42501';
  end if;
  update demandes set statut = 'annulee', statut_maj_le = now(), modifie_le = now() where id = p_id and statut <> 'annulee';
  delete from coordonnees where demande_id = p_id;
  if nb_positionnes(p_id) > 0 then
    insert into evenements (type, demande_id, membre_id) values ('demande_annulee', p_id, auth.uid());
  end if;
end $$;

revoke execute on function public.fiche_membre, public.signaler, public.zones_signalement,
  public.admin_signalements, public.admin_traiter_signalement, public.admin_annuler_demande from public, anon;
grant execute on function public.fiche_membre, public.signaler,
  public.admin_signalements, public.admin_traiter_signalement, public.admin_annuler_demande to authenticated;
