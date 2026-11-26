-- =====================================================================
-- Mon Espace Mariés — structure de la base de données
-- À coller dans Supabase : SQL Editor > New query > Run
-- Projet Supabase propre à cette application (région Europe, Paris).
-- =====================================================================

create extension if not exists pgcrypto;

-- Code aléatoire difficile à deviner (QR code de la page invités)
create or replace function public.nouveau_jeton(longueur int default 16)
returns text language sql volatile set search_path = public as $$
  select substr(translate(encode(gen_random_bytes(24), 'base64'), '+/=', 'xyz'), 1, longueur);
$$;

-- ---------------------------------------------------------------------
-- Couples
-- ---------------------------------------------------------------------
create table public.couples (
  id uuid primary key default gen_random_uuid(),
  prenom_1 text not null check (length(prenom_1) between 1 and 80),
  prenom_2 text not null check (length(prenom_2) between 1 and 80),
  date_mariage date not null,
  lieu text not null default '' check (length(lieu) <= 200),
  formule text not null default 'complete'
    check (formule in ('complete', 'coordination_1', 'coordination_2', 'coordination_3')),
  langue text not null default 'fr' check (langue in ('fr', 'en')),
  -- Code du QR code de la page invités
  jeton_invites text not null unique default public.nouveau_jeton(16),
  questionnaire_termine_le timestamptz,
  album_notifie_le timestamptz,
  cree_le timestamptz not null default now()
);
create index on public.couples (date_mariage);

-- Partie privée de la fiche couple : jamais lisible par les mariés
create table public.couples_prives (
  couple_id uuid primary key references public.couples (id) on delete cascade,
  notes text not null default '' check (length(notes) <= 10000),
  lien_ma_coordo text not null default '' check (length(lien_ma_coordo) <= 500)
);

-- ---------------------------------------------------------------------
-- Personnes : Laura (administratrice) et chaque marié (un accès par personne)
-- ---------------------------------------------------------------------
create table public.personnes (
  id uuid primary key default gen_random_uuid(),
  role text not null check (role in ('admin', 'marie')),
  couple_id uuid references public.couples (id) on delete cascade,
  prenom text not null default '' check (length(prenom) <= 80),
  email text not null check (position('@' in email) > 1 and length(email) <= 200),
  telephone text not null default '' check (length(telephone) <= 40),
  user_id uuid unique references auth.users (id) on delete set null,
  derniere_connexion timestamptz,
  cree_le timestamptz not null default now(),
  check ((role = 'admin') = (couple_id is null))
);
create unique index personnes_email on public.personnes (lower(email));
create index on public.personnes (couple_id);

-- ---------------------------------------------------------------------
-- Outils de sécurité (utilisés par toutes les règles d'accès)
-- ---------------------------------------------------------------------
create or replace function public.est_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from personnes where user_id = auth.uid() and role = 'admin');
$$;

create or replace function public.mon_couple()
returns uuid language sql stable security definer set search_path = public as $$
  select couple_id from personnes where user_id = auth.uid() and role = 'marie' limit 1;
$$;

create or replace function public.ma_personne()
returns uuid language sql stable security definer set search_path = public as $$
  select id from personnes where user_id = auth.uid() limit 1;
$$;

-- Laura, ou un marié de ce couple
create or replace function public.acces_couple(p_couple uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select p_couple is not null and (est_admin() or p_couple = mon_couple());
$$;

-- Formule « Coordination » (jour J, 2 jours, 3 jours)
create or replace function public.en_coordination(p_couple uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select formule <> 'complete' from couples where id = p_couple), false);
$$;

-- Laura toujours ; le couple seulement en formule Coordination
create or replace function public.peut_editer(p_couple uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select est_admin() or (p_couple = mon_couple() and en_coordination(p_couple));
$$;

-- L'album s'ouvre le lendemain du mariage, à 10 h (heure de Paris)
create or replace function public.album_ouvert(p_couple uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((
    select now() >= ((date_mariage + 1)::timestamp + time '10:00') at time zone 'Europe/Paris'
    from couples where id = p_couple), false);
$$;

-- ---------------------------------------------------------------------
-- Connexion : seules les adresses connues (Laura, mariés invités) peuvent
-- recevoir un lien. Le compte est rattaché automatiquement à sa personne.
-- ---------------------------------------------------------------------
create or replace function public.rattacher_compte()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update personnes set user_id = new.id
  where lower(email) = lower(new.email) and user_id is null;
  if not found then
    raise exception 'ADRESSE_INCONNUE' using errcode = 'P0001';
  end if;
  return new;
end $$;

create trigger rattacher_compte_apres_inscription
  after insert on auth.users
  for each row execute function public.rattacher_compte();

create or replace function public.noter_connexion()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.last_sign_in_at is distinct from old.last_sign_in_at then
    update personnes set derniere_connexion = new.last_sign_in_at where user_id = new.id;
  end if;
  return new;
end $$;

create trigger noter_connexion_apres_connexion
  after update of last_sign_in_at on auth.users
  for each row execute function public.noter_connexion();

-- Vérification avant l'envoi du lien (message clair si l'adresse est inconnue)
create or replace function public.adresse_connue(p_email text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from personnes where lower(email) = lower(trim(p_email)));
$$;

-- ---------------------------------------------------------------------
-- Modèles types (réglages généraux de Laura)
-- ---------------------------------------------------------------------
create table public.modele_etapes (
  id uuid primary key default gen_random_uuid(),
  nom text not null check (length(nom) between 1 and 120),
  ordre int not null default 0
);
create table public.modele_sous_etapes (
  id uuid primary key default gen_random_uuid(),
  nom text not null check (length(nom) between 1 and 120),
  ordre int not null default 0
);
create table public.modele_budget (
  id uuid primary key default gen_random_uuid(),
  nom text not null check (length(nom) between 1 and 120),
  estime numeric(12, 2),
  ordre int not null default 0
);
create table public.modele_questions (
  id uuid primary key default gen_random_uuid(),
  theme text not null check (length(theme) between 1 and 120),
  texte text not null check (length(texte) between 1 and 500),
  type text not null default 'libre' check (type in ('libre', 'choix')),
  choix text[] not null default '{}',
  sous_question text not null default '',
  sous_question_si text not null default '',
  ordre int not null default 0
);

-- Réglages généraux (une seule ligne)
create table public.reglages (
  id int primary key default 1 check (id = 1),
  lien_avis_google text not null default '',
  lien_avis_mariagesnet text not null default ''
);
insert into public.reglages (id) values (1);

-- ---------------------------------------------------------------------
-- Contenu de chaque espace
-- ---------------------------------------------------------------------
create table public.etapes (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples (id) on delete cascade,
  parent_id uuid references public.etapes (id) on delete cascade,
  nom text not null check (length(nom) between 1 and 120),
  statut text not null default 'pas_commence' check (statut in ('termine', 'en_cours', 'pas_commence')),
  ordre int not null default 0,
  cree_le timestamptz not null default now()
);
create index on public.etapes (couple_id, ordre);
create index on public.etapes (parent_id);

-- Une sous-étape appartient au même couple que son étape
create or replace function public.verifier_etape()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.parent_id is not null then
    if not exists (select 1 from etapes where id = new.parent_id and couple_id = new.couple_id and parent_id is null) then
      raise exception 'Sous-étape invalide' using errcode = 'P0001';
    end if;
  end if;
  return new;
end $$;
create trigger verifier_etape before insert or update on public.etapes
  for each row execute function public.verifier_etape();

-- Une nouvelle « Recherche … » reçoit automatiquement les sous-étapes types
create or replace function public.ajouter_sous_etapes()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.parent_id is null and new.nom ilike 'recherche %' then
    insert into etapes (couple_id, parent_id, nom, ordre)
    select new.couple_id, new.id, m.nom, m.ordre from modele_sous_etapes m order by m.ordre;
  end if;
  return new;
end $$;
create trigger ajouter_sous_etapes after insert on public.etapes
  for each row execute function public.ajouter_sous_etapes();

create table public.budget_postes (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples (id) on delete cascade,
  nom text not null check (length(nom) between 1 and 120),
  estime numeric(12, 2) check (estime >= 0),
  reel numeric(12, 2) check (reel >= 0),
  ordre int not null default 0
);
create index on public.budget_postes (couple_id);

create table public.echeances (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples (id) on delete cascade,
  libelle text not null check (length(libelle) between 1 and 120),
  montant numeric(12, 2) not null check (montant >= 0),
  date_prevue date,
  statut text not null default 'a_venir' check (statut in ('a_venir', 'a_confirmer', 'paye')),
  declare_le timestamptz,
  paye_le date,
  ordre int not null default 0
);
create index on public.echeances (couple_id);

-- Jusqu'à 6 versements par couple
create or replace function public.limiter_echeances()
returns trigger language plpgsql set search_path = public as $$
begin
  if (select count(*) from echeances where couple_id = new.couple_id) >= 6 then
    raise exception 'Six versements au maximum' using errcode = 'P0001';
  end if;
  return new;
end $$;
create trigger limiter_echeances before insert on public.echeances
  for each row execute function public.limiter_echeances();

create table public.rendez_vous (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples (id) on delete cascade,
  titre text not null check (length(titre) between 1 and 160),
  debut timestamptz,
  date_a_fixer text not null default '' check (length(date_a_fixer) <= 80),
  lieu text not null default '' check (length(lieu) <= 200),
  visio boolean not null default false,
  ajoute_par text not null default 'couple' check (ajoute_par in ('laura', 'couple')),
  rappel_envoye_le timestamptz,
  cree_le timestamptz not null default now()
);
create index on public.rendez_vous (couple_id, debut);

create or replace function public.auteur_rdv()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    new.ajoute_par := case when est_admin() then 'laura' else 'couple' end;
    new.rappel_envoye_le := null;
  else
    new.ajoute_par := old.ajoute_par;
    new.couple_id := old.couple_id;
    if new.debut is distinct from old.debut then
      new.rappel_envoye_le := null;
    end if;
  end if;
  return new;
end $$;
create trigger auteur_rdv before insert or update on public.rendez_vous
  for each row execute function public.auteur_rdv();

create table public.taches (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples (id) on delete cascade,
  intitule text not null check (length(intitule) between 1 and 200),
  date_butoir date,
  fait_le timestamptz,
  rappel_envoye_le timestamptz,
  cree_le timestamptz not null default now()
);
create index on public.taches (couple_id);

create table public.prestataires (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples (id) on delete cascade,
  categorie text not null default '' check (length(categorie) <= 80),
  nom text not null check (length(nom) between 1 and 160),
  contact text not null default '' check (length(contact) <= 120),
  telephone text not null default '' check (length(telephone) <= 40),
  email text not null default '' check (length(email) <= 200),
  statut text not null default 'a_signer' check (statut in ('a_signer', 'signe', 'acompte')),
  cree_le timestamptz not null default now()
);
create index on public.prestataires (couple_id);

create table public.proches (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples (id) on delete cascade,
  nom text not null check (length(nom) between 1 and 120),
  role text not null default '' check (length(role) <= 160),
  telephone text not null default '' check (length(telephone) <= 40),
  cree_le timestamptz not null default now()
);
create index on public.proches (couple_id);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples (id) on delete cascade,
  nom text not null check (length(nom) between 1 and 200),
  chemin text not null unique,
  type_mime text not null default '',
  taille bigint not null default 0,
  depose_par text not null default 'laura' check (depose_par in ('laura', 'couple')),
  statut text not null default 'partage'
    check (statut in ('partage', 'signe', 'a_valider', 'en_relecture', 'relu')),
  commentaire text not null default '' check (length(commentaire) <= 2000),
  cree_le timestamptz not null default now()
);
create index on public.documents (couple_id);

create or replace function public.auteur_document()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if est_admin() then
    new.depose_par := 'laura';
  else
    new.depose_par := 'couple';
    new.statut := 'en_relecture';
    new.commentaire := '';
  end if;
  -- Le fichier doit être rangé dans le dossier du couple
  if split_part(new.chemin, '/', 1) <> new.couple_id::text then
    raise exception 'Emplacement de fichier invalide' using errcode = 'P0001';
  end if;
  return new;
end $$;
create trigger auteur_document before insert on public.documents
  for each row execute function public.auteur_document();

create table public.questions (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples (id) on delete cascade,
  theme text not null check (length(theme) between 1 and 120),
  texte text not null check (length(texte) between 1 and 500),
  type text not null default 'libre' check (type in ('libre', 'choix')),
  choix text[] not null default '{}',
  sous_question text not null default '',
  sous_question_si text not null default '',
  verdict text not null default '' check (length(verdict) <= 200),
  ordre int not null default 0
);
create index on public.questions (couple_id, ordre);

create table public.reponses (
  question_id uuid not null references public.questions (id) on delete cascade,
  personne_id uuid not null references public.personnes (id) on delete cascade,
  couple_id uuid not null references public.couples (id) on delete cascade,
  texte text not null default '' check (length(texte) <= 3000),
  choix text[] not null default '{}',
  sous_reponse text not null default '' check (length(sous_reponse) <= 1000),
  maj_le timestamptz not null default now(),
  primary key (question_id, personne_id)
);
create index on public.reponses (couple_id);

-- Vrai si la personne connectée a déjà répondu à cette question
create or replace function public.j_ai_repondu(p_question uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from reponses where question_id = p_question and personne_id = ma_personne());
$$;

-- Photos et vidéos des invités
create table public.medias (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples (id) on delete cascade,
  chemin text not null unique,
  type_mime text not null default '',
  taille bigint not null default 0,
  invite_prenom text not null default '' check (length(invite_prenom) <= 80),
  cree_le timestamptz not null default now()
);
create index on public.medias (couple_id, cree_le);

-- ---------------------------------------------------------------------
-- Notifications (dans l'appli ; e-mail et téléphone envoyés par le serveur)
-- ---------------------------------------------------------------------
create table public.notifications (
  id bigint generated always as identity primary key,
  couple_id uuid references public.couples (id) on delete cascade,
  pour_admin boolean not null default false,
  type text not null,
  donnees jsonb not null default '{}',
  lien text not null default '',
  lu_le timestamptz,
  envoye_le timestamptz,
  cree_le timestamptz not null default now()
);
create index on public.notifications (couple_id, cree_le desc);
create index notifications_a_envoyer on public.notifications (id) where envoye_le is null;

create or replace function public.notifier(p_couple uuid, p_pour_admin boolean, p_type text, p_donnees jsonb, p_lien text)
returns void language sql security definer set search_path = public as $$
  insert into notifications (couple_id, pour_admin, type, donnees, lien)
  values (p_couple, p_pour_admin, p_type, coalesce(p_donnees, '{}'), coalesce(p_lien, ''));
$$;

create table public.abonnements_push (
  endpoint text primary key,
  personne_id uuid not null references public.personnes (id) on delete cascade,
  p256dh text not null,
  auth text not null,
  cree_le timestamptz not null default now()
);
create index on public.abonnements_push (personne_id);

-- =====================================================================
-- RÈGLES D'ACCÈS (cloisonnement strict entre couples)
-- =====================================================================
alter table public.couples enable row level security;
alter table public.couples_prives enable row level security;
alter table public.personnes enable row level security;
alter table public.modele_etapes enable row level security;
alter table public.modele_sous_etapes enable row level security;
alter table public.modele_budget enable row level security;
alter table public.modele_questions enable row level security;
alter table public.reglages enable row level security;
alter table public.etapes enable row level security;
alter table public.budget_postes enable row level security;
alter table public.echeances enable row level security;
alter table public.rendez_vous enable row level security;
alter table public.taches enable row level security;
alter table public.prestataires enable row level security;
alter table public.proches enable row level security;
alter table public.documents enable row level security;
alter table public.questions enable row level security;
alter table public.reponses enable row level security;
alter table public.medias enable row level security;
alter table public.notifications enable row level security;
alter table public.abonnements_push enable row level security;

-- Accès des comptes connectés, filtré ensuite par les règles ci-dessous
-- (explicite : ne dépend pas de l'option « accès API automatique » du projet)
grant usage on schema public to anon, authenticated, service_role;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;

-- Personne sans compte : aucun accès direct aux tables
revoke all on all tables in schema public from anon;
revoke all on public.abonnements_push from authenticated;

-- Couples
create policy "couple lu" on public.couples for select to authenticated using (acces_couple(id));
create policy "couple géré par Laura" on public.couples for all to authenticated
  using (est_admin()) with check (est_admin());
create policy "fiche privée" on public.couples_prives for all to authenticated
  using (est_admin()) with check (est_admin());

-- Personnes : Laura voit tout ; chaque marié voit son couple
create policy "personnes lues" on public.personnes for select to authenticated
  using (est_admin() or user_id = auth.uid() or (couple_id is not null and couple_id = mon_couple()));
create policy "personnes gérées par Laura" on public.personnes for all to authenticated
  using (est_admin()) with check (est_admin());

-- Modèles : Laura seulement
create policy "modèle étapes" on public.modele_etapes for all to authenticated using (est_admin()) with check (est_admin());
create policy "modèle sous-étapes" on public.modele_sous_etapes for all to authenticated using (est_admin()) with check (est_admin());
create policy "modèle budget" on public.modele_budget for all to authenticated using (est_admin()) with check (est_admin());
create policy "modèle questions" on public.modele_questions for all to authenticated using (est_admin()) with check (est_admin());

-- Réglages : lus par tous les comptes (liens d'avis), modifiés par Laura
create policy "réglages lus" on public.reglages for select to authenticated using (true);
create policy "réglages modifiés" on public.reglages for update to authenticated using (est_admin()) with check (est_admin());

-- Rétroplanning, budget, prestataires : modifiables selon la formule
create policy "étapes lues" on public.etapes for select to authenticated using (acces_couple(couple_id));
create policy "étapes ajoutées" on public.etapes for insert to authenticated with check (peut_editer(couple_id));
create policy "étapes modifiées" on public.etapes for update to authenticated using (peut_editer(couple_id)) with check (peut_editer(couple_id));
create policy "étapes supprimées" on public.etapes for delete to authenticated using (peut_editer(couple_id));

create policy "budget lu" on public.budget_postes for select to authenticated using (acces_couple(couple_id));
create policy "budget ajouté" on public.budget_postes for insert to authenticated with check (peut_editer(couple_id));
create policy "budget modifié" on public.budget_postes for update to authenticated using (peut_editer(couple_id)) with check (peut_editer(couple_id));
create policy "budget supprimé" on public.budget_postes for delete to authenticated using (peut_editer(couple_id));

create policy "prestataires lus" on public.prestataires for select to authenticated using (acces_couple(couple_id));
create policy "prestataires ajoutés" on public.prestataires for insert to authenticated with check (peut_editer(couple_id));
create policy "prestataires modifiés" on public.prestataires for update to authenticated using (peut_editer(couple_id)) with check (peut_editer(couple_id));
create policy "prestataires supprimés" on public.prestataires for delete to authenticated using (peut_editer(couple_id));

-- Échéancier : lu par le couple, géré par Laura (le couple passe par declarer_virement)
create policy "échéances lues" on public.echeances for select to authenticated using (acces_couple(couple_id));
create policy "échéances gérées" on public.echeances for all to authenticated using (est_admin()) with check (est_admin());

-- Tâches : créées par Laura, cochées par le couple (cocher_tache)
create policy "tâches lues" on public.taches for select to authenticated using (acces_couple(couple_id));
create policy "tâches gérées" on public.taches for all to authenticated using (est_admin()) with check (est_admin());

-- Rendez-vous et proches : le couple et Laura ajoutent et modifient
create policy "rendez-vous" on public.rendez_vous for all to authenticated
  using (acces_couple(couple_id)) with check (acces_couple(couple_id));
create policy "proches" on public.proches for all to authenticated
  using (acces_couple(couple_id)) with check (acces_couple(couple_id));

-- Documents : Laura partage ; en coordination, le couple dépose
create policy "documents lus" on public.documents for select to authenticated using (acces_couple(couple_id));
create policy "documents déposés" on public.documents for insert to authenticated with check (peut_editer(couple_id));
create policy "documents relus" on public.documents for update to authenticated using (est_admin()) with check (est_admin());
create policy "documents retirés" on public.documents for delete to authenticated
  using (est_admin() or (couple_id = mon_couple() and depose_par = 'couple' and statut = 'en_relecture'));

-- Questionnaire
create policy "questions lues" on public.questions for select to authenticated using (acces_couple(couple_id));
create policy "questions gérées" on public.questions for all to authenticated using (est_admin()) with check (est_admin());

-- Réponses : la sienne toujours ; celle de l'autre seulement après avoir répondu soi-même
create policy "réponses lues" on public.reponses for select to authenticated
  using (est_admin() or personne_id = ma_personne()
         or (couple_id = mon_couple() and j_ai_repondu(question_id)));
create policy "réponse donnée" on public.reponses for insert to authenticated
  with check (personne_id = ma_personne() and couple_id = mon_couple()
              and exists (select 1 from questions q where q.id = question_id and q.couple_id = reponses.couple_id));
create policy "réponse modifiée" on public.reponses for update to authenticated
  using (personne_id = ma_personne()) with check (personne_id = ma_personne() and couple_id = mon_couple());

-- Album : Laura toujours ; le couple à partir de l'ouverture
create policy "album" on public.medias for select to authenticated
  using (est_admin() or (couple_id = mon_couple() and album_ouvert(couple_id)));
create policy "album trié par Laura" on public.medias for delete to authenticated using (est_admin());

-- Notifications
create policy "notifications lues" on public.notifications for select to authenticated
  using ((pour_admin and est_admin()) or (not pour_admin and couple_id = mon_couple()));

-- Droits sur les colonnes : le couple ne peut pas changer l'auteur ni le chemin d'un document
revoke update on public.documents from authenticated;
grant update (nom, statut, commentaire) on public.documents to authenticated;
revoke update on public.reponses from authenticated;
grant update (texte, choix, sous_reponse, maj_le) on public.reponses to authenticated;
revoke update on public.notifications, public.medias from authenticated;
revoke insert on public.notifications, public.medias from authenticated;
