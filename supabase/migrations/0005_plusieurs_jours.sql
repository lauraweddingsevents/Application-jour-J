-- =====================================================================
-- Ma Coordo — déroulé sur plusieurs jours (veille, jour J, lendemain…)
-- À coller dans Supabase : SQL Editor > New query > Run
-- =====================================================================

-- Jours supplémentaires d'un mariage (le jour J reste la date du mariage)
create table if not exists public.journees (
  id uuid primary key default gen_random_uuid(),
  mariage_id uuid not null references public.mariages (id) on delete cascade,
  date_jour date not null,
  titre text,                                   -- « Welcome dinner », « Brunch »…
  created_at timestamptz not null default now(),
  unique (mariage_id, date_jour)
);
alter table public.journees enable row level security;
revoke all on public.journees from anon;

drop policy if exists "jours de ses mariages" on public.journees;
create policy "jours de ses mariages" on public.journees
  for all to authenticated
  using (public.est_proprietaire(mariage_id))
  with check (public.est_proprietaire(mariage_id));

drop trigger if exists temps_reel_journees on public.journees;
create trigger temps_reel_journees after insert or update or delete on public.journees
  for each row execute function public.prevenir_ecrans();

-- Chaque moment appartient à un jour (vide = le jour J)
alter table public.moments
  add column if not exists journee_id uuid references public.journees (id) on delete cascade;
create index if not exists moments_journee on public.moments (journee_id);

-- Un moment ne peut appartenir qu'à un jour de SON mariage
create or replace function public.verifier_jour_moment()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.journee_id is not null and not exists (
    select 1 from public.journees j where j.id = new.journee_id and j.mariage_id = new.mariage_id) then
    raise exception 'Ce jour n''appartient pas à ce mariage';
  end if;
  return new;
end;
$$;
drop trigger if exists verifier_jour_moment on public.moments;
create trigger verifier_jour_moment before insert or update of journee_id, mariage_id on public.moments
  for each row execute function public.verifier_jour_moment();

-- ---------------------------------------------------------------------
-- Retard : « avec la suite » ne décale que les moments du MÊME jour
-- ---------------------------------------------------------------------
create or replace function public.decaler_moments(
  p_moment uuid,
  p_minutes int,
  p_suivants boolean default true,
  p_jeton text default null
)
returns int
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_moment public.moments;
  v_nombre int;
begin
  if p_minutes is null or p_minutes = 0 or abs(p_minutes) > 600 then
    raise exception 'Décalage invalide';
  end if;

  select * into v_moment from public.moments where id = p_moment;
  if not found then
    raise exception 'Moment introuvable';
  end if;

  if p_jeton is not null then
    if not exists (
      select 1 from public.intervenants
      where jeton = p_jeton and acces_coordination
        and mariage_id = v_moment.mariage_id) then
      raise exception 'Accès refusé';
    end if;
  elsif not public.est_proprietaire(v_moment.mariage_id) then
    raise exception 'Accès refusé';
  end if;

  update public.moments
  set debut = debut + make_interval(mins => p_minutes),
      fin = fin + make_interval(mins => p_minutes)
  where mariage_id = v_moment.mariage_id
    and (id = p_moment
         or (p_suivants and debut > v_moment.debut
             and journee_id is not distinct from v_moment.journee_id));
  get diagnostics v_nombre = row_count;
  return v_nombre;
end;
$$;

-- ---------------------------------------------------------------------
-- Ce que voit un lien personnel : + les jours, et le jour de chaque moment
-- ---------------------------------------------------------------------
create or replace function public.vue_intervenant(p_jeton text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_moi public.intervenants;
  v_mariage public.mariages;
  v_voit_tout boolean;
begin
  select * into v_moi from public.intervenants where jeton = p_jeton;
  if not found then
    return null;
  end if;
  select * into v_mariage from public.mariages where id = v_moi.mariage_id;
  v_voit_tout := v_moi.categorie = 'prestataire' or v_moi.acces_coordination;

  return jsonb_build_object(
    'maintenant', now(),
    'mariage', jsonb_build_object(
      'nom_marie_1', v_mariage.nom_marie_1,
      'nom_marie_2', v_mariage.nom_marie_2,
      'date_mariage', v_mariage.date_mariage,
      'lieu_principal', v_mariage.lieu_principal,
      'fuseau_horaire', v_mariage.fuseau_horaire,
      'delai_alerte_defaut', v_mariage.delai_alerte_defaut,
      'canal', v_mariage.canal),
    'moi', jsonb_build_object(
      'id', v_moi.id,
      'nom', v_moi.nom,
      'role', v_moi.role,
      'categorie', v_moi.categorie,
      'acces_coordination', v_moi.acces_coordination),
    'journees', coalesce((
      select jsonb_agg(jsonb_build_object('id', j.id, 'date_jour', j.date_jour, 'titre', j.titre)
        order by j.date_jour)
      from public.journees j where j.mariage_id = v_mariage.id), '[]'::jsonb),
    'intervenants', coalesce((
      select jsonb_agg(jsonb_build_object('id', i.id, 'nom', i.nom, 'role', i.role)
        order by i.ordre, i.nom)
      from public.intervenants i where i.mariage_id = v_mariage.id), '[]'::jsonb),
    'moments', coalesce((
      select jsonb_agg(jsonb_build_object(
          'id', m.id, 'titre', m.titre, 'debut', m.debut, 'fin', m.fin,
          'lieu', m.lieu, 'notes', m.notes, 'ordre', m.ordre, 'raccourci', m.raccourci,
          'journee_id', m.journee_id,
          'intervenants', coalesce((
            select jsonb_agg(mi.intervenant_id)
            from public.moment_intervenants mi where mi.moment_id = m.id),
            '[]'::jsonb))
        order by m.debut, m.ordre)
      from public.moments m where m.mariage_id = v_mariage.id), '[]'::jsonb),
    'fiche', coalesce((
      select jsonb_agg(jsonb_build_object(
          'id', f.id, 'categorie', f.categorie, 'titre', f.titre,
          'contenu', f.contenu, 'telephone', f.telephone, 'adresse', f.adresse,
          'visibilite', f.visibilite)
        order by f.ordre, f.created_at)
      from public.fiche_elements f
      where f.mariage_id = v_mariage.id
        and (f.visibilite = 'tous' or v_voit_tout)), '[]'::jsonb),
    'annonces', coalesce((
      select jsonb_agg(jsonb_build_object('id', a.id, 'texte', a.texte, 'auteur', a.auteur, 'le', a.created_at)
        order by a.created_at desc)
      from (
        select * from public.annonces
        where mariage_id = v_mariage.id and created_at > now() - interval '12 hours'
        order by created_at desc limit 10
      ) a), '[]'::jsonb)
  );
end;
$$;
