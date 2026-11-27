-- =====================================================================
-- Mon Espace Mariés — « Qui s'en occupe » dans le rétroplanning (Laura ou les mariés)
-- À exécuter après 0004_invitation_manuelle.sql
-- =====================================================================
alter table public.etapes add column if not exists responsable text
  check (responsable in ('laura', 'maries'));
alter table public.modele_etapes add column if not exists responsable text
  check (responsable in ('laura', 'maries'));

-- Seule Laura choisit « qui s'en occupe » ; une étape ajoutée par les mariés est « par les mariés »
create or replace function public.proteger_responsable()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not est_admin() then
    if tg_op = 'INSERT' then
      new.responsable := case when new.parent_id is null then 'maries' else null end;
    else
      new.responsable := old.responsable;
    end if;
  end if;
  return new;
end $$;
drop trigger if exists proteger_responsable on public.etapes;
create trigger proteger_responsable before insert or update on public.etapes
  for each row execute function public.proteger_responsable();

-- Création d'un couple : le rétroplanning type est copié avec « qui s'en occupe »
create or replace function public.creer_couple(
  p_prenom_1 text, p_prenom_2 text, p_date date, p_lieu text, p_formule text, p_langue text,
  p_email_1 text, p_email_2 text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
begin
  if not est_admin() then
    raise exception 'Réservé à l''administration' using errcode = '42501';
  end if;
  if coalesce(trim(p_email_1), '') = '' then
    raise exception 'L''e-mail d''au moins un marié est nécessaire' using errcode = 'P0001';
  end if;
  if exists (select 1 from personnes where lower(email) in (lower(trim(p_email_1)), lower(trim(coalesce(p_email_2, ''))))) then
    raise exception 'Cette adresse e-mail est déjà utilisée par un autre espace' using errcode = 'P0001';
  end if;

  insert into couples (prenom_1, prenom_2, date_mariage, lieu, formule, langue)
  values (trim(p_prenom_1), trim(p_prenom_2), p_date, coalesce(trim(p_lieu), ''), p_formule, coalesce(p_langue, 'fr'))
  returning id into v_id;
  insert into couples_prives (couple_id) values (v_id);

  insert into personnes (role, couple_id, prenom, email) values ('marie', v_id, trim(p_prenom_1), trim(p_email_1));
  if coalesce(trim(p_email_2), '') <> '' then
    insert into personnes (role, couple_id, prenom, email) values ('marie', v_id, trim(p_prenom_2), trim(p_email_2));
  end if;

  -- Rétroplanning type (les « Recherche … » reçoivent leurs sous-étapes automatiquement)
  insert into etapes (couple_id, nom, ordre, responsable) select v_id, nom, ordre, responsable from modele_etapes order by ordre;
  insert into budget_postes (couple_id, nom, estime, ordre) select v_id, nom, estime, ordre from modele_budget order by ordre;
  insert into questions (couple_id, theme, texte, type, choix, sous_question, sous_question_si, ordre)
    select v_id, theme, texte, type, choix, sous_question, sous_question_si, ordre from modele_questions order by ordre;
  return v_id;
end $$;
