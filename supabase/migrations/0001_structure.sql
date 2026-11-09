-- =====================================================================
-- Ma Coordo — structure de la base de données (version 1)
-- À coller dans Supabase : SQL Editor > New query > Run
-- =====================================================================

-- ---------------------------------------------------------------------
-- Petits outils
-- ---------------------------------------------------------------------

-- Fabrique un code aléatoire difficile à deviner (pour les liens /j/xxxx)
create or replace function public.nouveau_jeton(longueur int default 12)
returns text
language sql
volatile
set search_path = public
as $$
  select substr(
    translate(
      rtrim(encode(uuid_send(gen_random_uuid()), 'base64'), '=')
        || rtrim(encode(uuid_send(gen_random_uuid()), 'base64'), '='),
      '+/', 'xy'),
    1, longueur);
$$;

-- Met à jour automatiquement la date de dernière modification
create or replace function public.maj_date_modification()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- Profils (un par compte créateur)
-- ---------------------------------------------------------------------
create table public.profils (
  id uuid primary key references auth.users (id) on delete cascade,
  nom text,
  -- Formule commerciale : tout est gratuit pour l'instant
  formule text not null default 'gratuite'
    check (formule in ('gratuite', 'couple', 'pro')),
  created_at timestamptz not null default now()
);

-- Crée automatiquement le profil quand quelqu'un s'inscrit
create or replace function public.creer_profil()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profils (id) values (new.id) on conflict do nothing;
  return new;
end;
$$;

create trigger creer_profil_apres_inscription
  after insert on auth.users
  for each row execute function public.creer_profil();

-- ---------------------------------------------------------------------
-- Mariages
-- ---------------------------------------------------------------------
create table public.mariages (
  id uuid primary key default gen_random_uuid(),
  proprietaire_id uuid not null default auth.uid()
    references auth.users (id) on delete cascade,
  equipe_id uuid,                       -- prévu pour les équipes (plus tard)
  nom_marie_1 text not null,
  nom_marie_2 text not null,
  date_mariage date not null,
  lieu_principal text,
  fuseau_horaire text not null default 'Europe/Paris',
  delai_alerte_defaut int not null default 15
    check (delai_alerte_defaut between 0 and 180),
  -- Canal secret pour les mises à jour en temps réel
  canal text not null unique default public.nouveau_jeton(24),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.mariages (proprietaire_id);

-- ---------------------------------------------------------------------
-- Intervenants (prestataires et proches)
-- ---------------------------------------------------------------------
create table public.intervenants (
  id uuid primary key default gen_random_uuid(),
  mariage_id uuid not null references public.mariages (id) on delete cascade,
  nom text not null,
  role text,
  categorie text not null default 'prestataire'
    check (categorie in ('prestataire', 'proche')),
  telephone text,
  email text,
  jeton text not null unique default public.nouveau_jeton(12),
  acces_coordination boolean not null default false,
  ordre int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.intervenants (mariage_id);

-- ---------------------------------------------------------------------
-- Moments du déroulé
-- (début et fin sont des date + heure complètes : un moment à 1 h du
--  matin est enregistré le lendemain de la date du mariage)
-- ---------------------------------------------------------------------
create table public.moments (
  id uuid primary key default gen_random_uuid(),
  mariage_id uuid not null references public.mariages (id) on delete cascade,
  titre text not null,
  debut timestamptz not null,
  fin timestamptz,
  lieu text,
  notes text,
  ordre int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (fin is null or fin >= debut)
);
create index on public.moments (mariage_id, debut);

-- Qui est assigné à quel moment
create table public.moment_intervenants (
  moment_id uuid not null references public.moments (id) on delete cascade,
  intervenant_id uuid not null references public.intervenants (id) on delete cascade,
  primary key (moment_id, intervenant_id)
);
create index on public.moment_intervenants (intervenant_id);

-- ---------------------------------------------------------------------
-- Fiche pratique
-- ---------------------------------------------------------------------
create table public.fiche_elements (
  id uuid primary key default gen_random_uuid(),
  mariage_id uuid not null references public.mariages (id) on delete cascade,
  categorie text not null default 'note'
    check (categorie in ('contact', 'adresse', 'meteo', 'note')),
  titre text not null,
  contenu text,
  telephone text,
  adresse text,
  visibilite text not null default 'tous'
    check (visibilite in ('tous', 'prestataires')),
  ordre int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.fiche_elements (mariage_id);

-- Dates de modification automatiques
create trigger maj_mariages before update on public.mariages
  for each row execute function public.maj_date_modification();
create trigger maj_intervenants before update on public.intervenants
  for each row execute function public.maj_date_modification();
create trigger maj_moments before update on public.moments
  for each row execute function public.maj_date_modification();
create trigger maj_fiche before update on public.fiche_elements
  for each row execute function public.maj_date_modification();

-- =====================================================================
-- SÉCURITÉ : chaque créatrice ne voit que ses propres mariages.
-- Les personnes qui ont un lien n'accèdent jamais aux tables
-- directement : elles passent par la fonction vue_intervenant().
-- =====================================================================
alter table public.profils enable row level security;
alter table public.mariages enable row level security;
alter table public.intervenants enable row level security;
alter table public.moments enable row level security;
alter table public.moment_intervenants enable row level security;
alter table public.fiche_elements enable row level security;

revoke all on public.profils, public.mariages, public.intervenants,
  public.moments, public.moment_intervenants, public.fiche_elements
  from anon;

-- Le profil : on peut lire le sien et changer son nom (pas sa formule)
revoke update on public.profils from authenticated;
grant update (nom) on public.profils to authenticated;
create policy "lire son profil" on public.profils
  for select to authenticated using (id = auth.uid());
create policy "modifier son profil" on public.profils
  for update to authenticated using (id = auth.uid());

-- Vrai si le mariage appartient à la personne connectée
create or replace function public.est_proprietaire(p_mariage uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.mariages
    where id = p_mariage and proprietaire_id = auth.uid()
  );
$$;

create policy "ses mariages" on public.mariages
  for all to authenticated
  using (proprietaire_id = auth.uid())
  with check (proprietaire_id = auth.uid());

create policy "intervenants de ses mariages" on public.intervenants
  for all to authenticated
  using (public.est_proprietaire(mariage_id))
  with check (public.est_proprietaire(mariage_id));

create policy "moments de ses mariages" on public.moments
  for all to authenticated
  using (public.est_proprietaire(mariage_id))
  with check (public.est_proprietaire(mariage_id));

create policy "fiche de ses mariages" on public.fiche_elements
  for all to authenticated
  using (public.est_proprietaire(mariage_id))
  with check (public.est_proprietaire(mariage_id));

create policy "assignations de ses mariages" on public.moment_intervenants
  for all to authenticated
  using (exists (
    select 1 from public.moments m
    where m.id = moment_id and public.est_proprietaire(m.mariage_id)))
  with check (exists (
    select 1
    from public.moments m
    join public.intervenants i on i.mariage_id = m.mariage_id
    where m.id = moment_id and i.id = intervenant_id
      and public.est_proprietaire(m.mariage_id)));

-- =====================================================================
-- LIEN PERSONNEL : ce que voit un intervenant qui ouvre /j/<jeton>
-- (jamais de téléphone ni d'e-mail d'intervenant)
-- =====================================================================
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
          'lieu', m.lieu, 'notes', m.notes, 'ordre', m.ordre,
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
        and (f.visibilite = 'tous' or v_voit_tout)), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.vue_intervenant(text) from public;
grant execute on function public.vue_intervenant(text) to anon, authenticated;

-- =====================================================================
-- RETARD : décaler un moment (et, si on veut, tous les suivants)
-- Utilisable par la créatrice, ou via un lien avec accès coordination.
-- =====================================================================
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
    and (id = p_moment or (p_suivants and debut > v_moment.debut));
  get diagnostics v_nombre = row_count;
  return v_nombre;
end;
$$;

revoke all on function public.decaler_moments(uuid, int, boolean, text) from public;
grant execute on function public.decaler_moments(uuid, int, boolean, text)
  to anon, authenticated;

-- =====================================================================
-- TEMPS RÉEL : à chaque modification, on prévient les écrans ouverts
-- sur le canal secret du mariage (ils rechargent alors les données).
-- =====================================================================
create or replace function public.prevenir_ecrans()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ligne record;
  v_mariage uuid;
  v_canal text;
begin
  if tg_op = 'DELETE' then v_ligne := old; else v_ligne := new; end if;

  if tg_table_name = 'mariages' then
    v_mariage := v_ligne.id;
  elsif tg_table_name = 'moment_intervenants' then
    select mariage_id into v_mariage from public.moments where id = v_ligne.moment_id;
  else
    v_mariage := v_ligne.mariage_id;
  end if;

  select canal into v_canal from public.mariages where id = v_mariage;
  if v_canal is not null then
    begin
      perform realtime.send(
        jsonb_build_object('table', tg_table_name),
        'maj',
        'mariage:' || v_canal,
        false);
    exception when others then
      null; -- une panne du temps réel ne doit jamais bloquer une modification
    end;
  end if;
  return null;
end;
$$;

create trigger temps_reel_mariages after insert or update or delete on public.mariages
  for each row execute function public.prevenir_ecrans();
create trigger temps_reel_intervenants after insert or update or delete on public.intervenants
  for each row execute function public.prevenir_ecrans();
create trigger temps_reel_moments after insert or update or delete on public.moments
  for each row execute function public.prevenir_ecrans();
create trigger temps_reel_assignations after insert or update or delete on public.moment_intervenants
  for each row execute function public.prevenir_ecrans();
create trigger temps_reel_fiche after insert or update or delete on public.fiche_elements
  for each row execute function public.prevenir_ecrans();
