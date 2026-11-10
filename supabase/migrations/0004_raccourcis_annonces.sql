-- =====================================================================
-- Ma Coordo — raccourcis vers les temps forts, et annonces en direct
-- À coller dans Supabase : SQL Editor > New query > Run
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Raccourcis : certains moments servent de « temps forts »
-- ---------------------------------------------------------------------
alter table public.moments add column if not exists raccourci boolean not null default false;

-- Temps forts habituels déjà saisis (dont le mariage de démonstration)
update public.moments set raccourci = true
where not raccourci
  and titre ~* '^(cérémonie|vin d.honneur|cocktail|dîner|repas|soirée dansante|ouverture de bal)';

-- ---------------------------------------------------------------------
-- 2. Annonces envoyées à tous les intervenants d'un mariage
-- ---------------------------------------------------------------------
create table if not exists public.annonces (
  id uuid primary key default gen_random_uuid(),
  mariage_id uuid not null references public.mariages (id) on delete cascade,
  texte text not null check (char_length(texte) between 1 and 140),
  auteur text,                         -- nom affiché (« Laura », « Clara »…)
  envoyee_le timestamptz,              -- notifications parties
  created_at timestamptz not null default now()
);
create index if not exists annonces_mariage on public.annonces (mariage_id, created_at desc);
alter table public.annonces enable row level security;
revoke all on public.annonces from anon;

drop policy if exists "annonces de ses mariages" on public.annonces;
create policy "annonces de ses mariages" on public.annonces
  for all to authenticated
  using (public.est_proprietaire(mariage_id))
  with check (public.est_proprietaire(mariage_id));

-- Les liens ouverts sont prévenus en direct d'une nouvelle annonce
drop trigger if exists temps_reel_annonces on public.annonces;
create trigger temps_reel_annonces after insert or update or delete on public.annonces
  for each row execute function public.prevenir_ecrans();

-- Annonce envoyée depuis un lien avec l'accès coordination
create or replace function public.creer_annonce_jeton(p_jeton text, p_texte text)
returns uuid
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_moi public.intervenants;
  v_id uuid;
begin
  select * into v_moi from public.intervenants where jeton = p_jeton and acces_coordination;
  if not found then
    raise exception 'Accès refusé';
  end if;
  insert into public.annonces (mariage_id, texte, auteur)
  values (v_moi.mariage_id, left(trim(p_texte), 140), v_moi.nom)
  returning id into v_id;
  return v_id;
end;
$$;
revoke all on function public.creer_annonce_jeton(text, text) from public;
grant execute on function public.creer_annonce_jeton(text, text) to anon, authenticated;

-- Pour le programme d'envoi : notifications des annonces pas encore parties
create or replace function public.prendre_annonces(p_secret text, p_id uuid default null)
returns table (
  annonce_id uuid, texte text, auteur text, endpoint text, p256dh text, auth text, jeton text
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
  with a_envoyer as (
    update public.annonces an
    set envoyee_le = now()
    where an.envoyee_le is null
      and (p_id is null or an.id = p_id)
      and an.created_at > now() - interval '30 minutes'
    returning an.id, an.mariage_id, an.texte, an.auteur
  )
  select a.id, a.texte, a.auteur, ab.endpoint, ab.p256dh, ab.auth, i.jeton
  from a_envoyer a
  join public.intervenants i on i.mariage_id = a.mariage_id
  join public.abonnements_push ab on ab.intervenant_id = i.id;
end;
$$;
revoke all on function public.prendre_annonces(text, uuid) from public;
grant execute on function public.prendre_annonces(text, uuid) to anon;

-- ---------------------------------------------------------------------
-- 3. Ce que voit un lien personnel : + raccourcis et annonces récentes
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
    'intervenants', coalesce((
      select jsonb_agg(jsonb_build_object('id', i.id, 'nom', i.nom, 'role', i.role)
        order by i.ordre, i.nom)
      from public.intervenants i where i.mariage_id = v_mariage.id), '[]'::jsonb),
    'moments', coalesce((
      select jsonb_agg(jsonb_build_object(
          'id', m.id, 'titre', m.titre, 'debut', m.debut, 'fin', m.fin,
          'lieu', m.lieu, 'notes', m.notes, 'ordre', m.ordre, 'raccourci', m.raccourci,
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
