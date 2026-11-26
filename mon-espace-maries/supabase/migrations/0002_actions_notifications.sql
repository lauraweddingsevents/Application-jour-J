-- =====================================================================
-- Mon Espace Mariés — actions, notifications automatiques, modèles types
-- À exécuter après 0001_structure.sql
-- =====================================================================

-- ---------------------------------------------------------------------
-- Création d'un couple : fiche, accès des mariés, copie des modèles types
-- ---------------------------------------------------------------------
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
  insert into etapes (couple_id, nom, ordre) select v_id, nom, ordre from modele_etapes order by ordre;
  insert into budget_postes (couple_id, nom, estime, ordre) select v_id, nom, estime, ordre from modele_budget order by ordre;
  insert into questions (couple_id, theme, texte, type, choix, sous_question, sous_question_si, ordre)
    select v_id, theme, texte, type, choix, sous_question, sous_question_si, ordre from modele_questions order by ordre;
  return v_id;
end $$;

-- Ajouter un marié à un couple existant (second e-mail saisi plus tard)
create or replace function public.ajouter_marie(p_couple uuid, p_prenom text, p_email text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if not est_admin() then raise exception 'Réservé à l''administration' using errcode = '42501'; end if;
  if (select count(*) from personnes where couple_id = p_couple) >= 2 then
    raise exception 'Ce couple a déjà ses deux accès' using errcode = 'P0001';
  end if;
  if exists (select 1 from personnes where lower(email) = lower(trim(p_email))) then
    raise exception 'Cette adresse e-mail est déjà utilisée' using errcode = 'P0001';
  end if;
  insert into personnes (role, couple_id, prenom, email) values ('marie', p_couple, trim(p_prenom), trim(p_email))
  returning id into v_id;
  return v_id;
end $$;

-- ---------------------------------------------------------------------
-- Actions du couple
-- ---------------------------------------------------------------------
-- « J'ai fait mon virement » : statut « À confirmer » + alerte à Laura
create or replace function public.declarer_virement(p_echeance uuid)
returns void language plpgsql security definer set search_path = public as $$
declare e echeances;
begin
  select * into e from echeances where id = p_echeance;
  if not found or e.couple_id is distinct from mon_couple() then
    raise exception 'Échéance introuvable' using errcode = 'P0001';
  end if;
  if e.statut <> 'a_venir' then return; end if;
  update echeances set statut = 'a_confirmer', declare_le = now() where id = p_echeance;
  perform notifier(e.couple_id, true, 'virement_declare',
    jsonb_build_object('libelle', e.libelle, 'montant', e.montant), '/admin/couple/' || e.couple_id || '?partie=echeancier');
end $$;

-- Le couple coche ou décoche une tâche
create or replace function public.cocher_tache(p_tache uuid, p_fait boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  update taches set fait_le = case when p_fait then now() else null end
  where id = p_tache and couple_id = mon_couple();
  if not found then raise exception 'Tâche introuvable' using errcode = 'P0001'; end if;
end $$;

-- Marquer les notifications comme lues
create or replace function public.marquer_notifications_lues()
returns void language sql security definer set search_path = public as $$
  update notifications set lu_le = now()
  where lu_le is null
    and ((pour_admin and est_admin()) or (not pour_admin and couple_id = mon_couple()));
$$;

-- Téléphones abonnés aux notifications
create or replace function public.enregistrer_push(p_endpoint text, p_p256dh text, p_auth text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if ma_personne() is null then raise exception 'Non connecté' using errcode = '42501'; end if;
  insert into abonnements_push (endpoint, personne_id, p256dh, auth)
  values (p_endpoint, ma_personne(), p_p256dh, p_auth)
  on conflict (endpoint) do update set personne_id = excluded.personne_id, p256dh = excluded.p256dh, auth = excluded.auth;
end $$;

create or replace function public.supprimer_push(p_endpoint text)
returns void language sql security definer set search_path = public as $$
  delete from abonnements_push where endpoint = p_endpoint and personne_id = ma_personne();
$$;

-- ---------------------------------------------------------------------
-- Notifications automatiques (déclenchées par les modifications)
-- ---------------------------------------------------------------------
-- Paiement confirmé par Laura
create or replace function public.evenement_echeance()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.statut = 'paye' and old.statut is distinct from 'paye' then
    perform notifier(new.couple_id, false, 'paiement_confirme',
      jsonb_build_object('libelle', new.libelle, 'montant', new.montant), '/espace/paiements');
  end if;
  return new;
end $$;
create trigger evenement_echeance after update of statut on public.echeances
  for each row execute function public.evenement_echeance();

-- Nouvelle tâche donnée aux mariés
create or replace function public.evenement_tache()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform notifier(new.couple_id, false, 'nouvelle_tache',
    jsonb_build_object('intitule', new.intitule, 'date_butoir', new.date_butoir), '/espace/a-faire');
  return new;
end $$;
create trigger evenement_tache after insert on public.taches
  for each row execute function public.evenement_tache();

-- Rendez-vous ajouté : prévenir l'autre partie
create or replace function public.evenement_rdv()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.ajoute_par = 'couple' then
    perform notifier(new.couple_id, true, 'rdv_couple',
      jsonb_build_object('titre', new.titre, 'debut', new.debut, 'date_a_fixer', new.date_a_fixer),
      '/admin/couple/' || new.couple_id || '?partie=rendez-vous');
  else
    perform notifier(new.couple_id, false, 'rdv_laura',
      jsonb_build_object('titre', new.titre, 'debut', new.debut, 'date_a_fixer', new.date_a_fixer), '/espace/rendez-vous');
  end if;
  return new;
end $$;
create trigger evenement_rdv after insert on public.rendez_vous
  for each row execute function public.evenement_rdv();

-- Document déposé par le couple / relu par Laura
create or replace function public.evenement_document()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' and new.depose_par = 'couple' then
    perform notifier(new.couple_id, true, 'document_depose', jsonb_build_object('nom', new.nom),
      '/admin/couple/' || new.couple_id || '?partie=documents');
  elsif tg_op = 'UPDATE' and new.statut = 'relu' and old.statut is distinct from 'relu' then
    perform notifier(new.couple_id, false, 'document_relu',
      jsonb_build_object('nom', new.nom, 'commentaire', new.commentaire), '/espace/documents');
  end if;
  return new;
end $$;
create trigger evenement_document after insert or update of statut on public.documents
  for each row execute function public.evenement_document();

-- Questionnaire terminé par les deux mariés (une seule alerte)
create or replace function public.evenement_reponse()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_maries int;
  v_questions int;
  v_reponses int;
begin
  if (select questionnaire_termine_le from couples where id = new.couple_id) is not null then
    return new;
  end if;
  select count(*) into v_maries from personnes where couple_id = new.couple_id;
  select count(*) into v_questions from questions where couple_id = new.couple_id;
  select count(*) into v_reponses from reponses r join questions q on q.id = r.question_id
    where r.couple_id = new.couple_id and (r.texte <> '' or cardinality(r.choix) > 0);
  if v_maries = 2 and v_questions > 0 and v_reponses >= v_questions * 2 then
    update couples set questionnaire_termine_le = now() where id = new.couple_id;
    perform notifier(new.couple_id, true, 'questionnaire_termine', '{}'::jsonb,
      '/admin/couple/' || new.couple_id || '?partie=questionnaire');
  end if;
  return new;
end $$;
create trigger evenement_reponse after insert or update on public.reponses
  for each row execute function public.evenement_reponse();

-- La date de la réponse est toujours celle du serveur
create or replace function public.date_reponse()
returns trigger language plpgsql set search_path = public as $$
begin
  new.maj_le := now();
  return new;
end $$;
create trigger date_reponse before insert or update on public.reponses
  for each row execute function public.date_reponse();

-- ---------------------------------------------------------------------
-- Fonctions du serveur (clé secrète uniquement) : envois et rappels
-- ---------------------------------------------------------------------
-- Prend les notifications à envoyer par e-mail et sur téléphone
create or replace function public.prendre_notifications(p_nombre int default 50)
returns setof public.notifications language sql security definer set search_path = public as $$
  update notifications set envoye_le = now()
  where id in (select id from notifications where envoye_le is null order by id limit p_nombre for update skip locked)
  returning *;
$$;

-- Rappel 3 jours avant la date butoir d'une tâche non faite
create or replace function public.creer_rappels_taches()
returns int language plpgsql security definer set search_path = public as $$
declare n int;
begin
  with t as (
    update taches set rappel_envoye_le = now()
    where fait_le is null and rappel_envoye_le is null and date_butoir is not null
      and date_butoir <= (now() at time zone 'Europe/Paris')::date + 3
      and date_butoir >= (now() at time zone 'Europe/Paris')::date
    returning couple_id, intitule, date_butoir)
  insert into notifications (couple_id, pour_admin, type, donnees, lien)
  select couple_id, false, 'rappel_tache', jsonb_build_object('intitule', intitule, 'date_butoir', date_butoir), '/espace/a-faire' from t;
  get diagnostics n = row_count;
  return n;
end $$;

-- Rappel la veille d'un rendez-vous ajouté par Laura
create or replace function public.creer_rappels_rdv()
returns int language plpgsql security definer set search_path = public as $$
declare n int;
begin
  with r as (
    update rendez_vous set rappel_envoye_le = now()
    where ajoute_par = 'laura' and rappel_envoye_le is null and debut is not null
      and (debut at time zone 'Europe/Paris')::date = (now() at time zone 'Europe/Paris')::date + 1
    returning couple_id, titre, debut, lieu, visio)
  insert into notifications (couple_id, pour_admin, type, donnees, lien)
  select couple_id, false, 'rappel_rdv', jsonb_build_object('titre', titre, 'debut', debut, 'lieu', lieu, 'visio', visio), '/espace/rendez-vous' from r;
  get diagnostics n = row_count;
  return n;
end $$;

-- Ouverture de l'album (lendemain du mariage, 10 h) + demande d'avis
create or replace function public.creer_notifications_album()
returns int language plpgsql security definer set search_path = public as $$
declare n int;
begin
  with c as (
    update couples set album_notifie_le = now()
    where album_notifie_le is null and album_ouvert(id)
      and date_mariage >= current_date - 30
    returning id)
  insert into notifications (couple_id, pour_admin, type, donnees, lien)
  select id, false, 'album_ouvert', '{}'::jsonb, '/espace' from c;
  get diagnostics n = row_count;
  return n;
end $$;

-- Couples dont les données doivent être supprimées (6 mois après le mariage)
create or replace function public.couples_a_supprimer()
returns setof uuid language sql stable security definer set search_path = public as $$
  select id from couples where date_mariage + interval '6 months' < now();
$$;

revoke execute on all functions in schema public from public, anon;
grant execute on function public.adresse_connue to anon, authenticated;
grant execute on function public.est_admin, public.mon_couple, public.ma_personne, public.acces_couple,
  public.en_coordination, public.peut_editer, public.album_ouvert, public.j_ai_repondu,
  public.creer_couple, public.ajouter_marie, public.declarer_virement, public.cocher_tache,
  public.marquer_notifications_lues, public.enregistrer_push, public.supprimer_push to authenticated;
revoke execute on function public.notifier, public.prendre_notifications, public.creer_rappels_taches,
  public.creer_rappels_rdv, public.creer_notifications_album, public.couples_a_supprimer from authenticated;
grant execute on function public.prendre_notifications, public.creer_rappels_taches, public.creer_rappels_rdv,
  public.creer_notifications_album, public.couples_a_supprimer, public.album_ouvert to service_role;
grant all on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;

-- ---------------------------------------------------------------------
-- Modèles types (modifiables ensuite dans Administration > Modèles types)
-- ---------------------------------------------------------------------
insert into public.modele_etapes (nom, ordre) values
  ('Devis', 1), ('Contrat', 2), ('Recherche lieu', 3), ('Recherche traiteur', 4),
  ('Recherche photographe', 5), ('Recherche vidéaste', 6), ('Recherche DJ', 7),
  ('Recherche fleuriste', 8), ('Visite technique', 9), ('Plan de table', 10);

insert into public.modele_sous_etapes (nom, ordre) values
  ('Demande de devis', 1), ('Relance des demandes de devis', 2), ('Envoi des devis aux mariés', 3),
  ('1er rendez-vous', 4), ('Signature du contrat et acompte', 5);

insert into public.modele_budget (nom, ordre) values
  ('Lieu', 1), ('Traiteur', 2), ('Photographe', 3), ('Vidéaste', 4), ('DJ', 5), ('Fleuriste', 6),
  ('Décoration', 7), ('Robe de mariée', 8), ('Wedding planner', 9), ('Coiffeuse', 10), ('Maquilleuse', 11);

insert into public.modele_questions (theme, texte, type, choix, sous_question, sous_question_si, ordre) values
  ('Vous deux', 'En trois mots, à quoi doit ressembler votre mariage ?', 'libre', '{}', '', '', 1),
  ('Vous deux', 'Qu''est-ce qui doit rendre ce jour unique, à votre image ?', 'libre', '{}', '', '', 2),
  ('Vous deux', 'Quel souvenir voulez-vous garder en priorité de cette journée ?', 'libre', '{}', '', '', 3),
  ('L''ambiance', 'Plutôt champêtre, bohème, chic, moderne, festif… ?', 'libre', '{}', '', '', 4),
  ('L''ambiance', 'Plutôt intime ou grande fête ?', 'libre', '{}', '', '', 5),
  ('L''ambiance', 'Plutôt détendu et naturel, ou élégant et cérémonieux ?', 'libre', '{}', '', '', 6),
  ('Les moments clés', 'Quel est le moment le plus important pour vous : cérémonie, cocktail, dîner, soirée ?', 'libre', '{}', '', '', 7),
  ('Les moments clés', 'Quelle(s) cérémonie(s) souhaitez-vous le jour J ?', 'choix', '{civile,religieuse,laïque}', 'Qui aimeriez-vous y faire parler ?', 'laïque', 8),
  ('Les moments clés', 'Quels moments aimeriez-vous partager seulement à deux (first look, séance photo…) ?', 'libre', '{}', '', '', 9),
  ('Les moments clés', 'Y a-t-il des traditions que vous tenez à garder, ou au contraire à éviter ?', 'libre', '{}', '', '', 10),
  ('Les invités', 'Combien d''invités imaginez-vous ?', 'libre', '{}', '', '', 11),
  ('Les invités', 'Les enfants sont-ils les bienvenus ?', 'libre', '{}', '', '', 12),
  ('Les invités', 'Y a-t-il des situations familiales délicates à prendre en compte ?', 'libre', '{}', '', '', 13),
  ('Le repas et la fête', 'Plutôt repas assis, buffet ou cocktail dînatoire ?', 'libre', '{}', '', '', 14),
  ('Le repas et la fête', 'Quelle musique ne doit surtout pas manquer ? Laquelle est interdite ?', 'libre', '{}', '', '', 15),
  ('Le repas et la fête', 'Des animations vous font-elles envie, ou au contraire vous mettent mal à l''aise ?', 'libre', '{}', '', '', 16),
  ('Les priorités et le budget', 'Sur quels postes êtes-vous prêts à investir davantage ?', 'libre', '{}', '', '', 17),
  ('Les priorités et le budget', 'Sur quoi pouvez-vous faire des économies sans regret ?', 'libre', '{}', '', '', 18),
  ('Les priorités et le budget', 'Qu''est-ce que vous ne voulez surtout pas le jour J ?', 'libre', '{}', '', '', 19),
  ('Pour Laura', 'Qu''attendez-vous en priorité de votre wedding planner ?', 'libre', '{}', '', '', 20);
