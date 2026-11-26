-- Tests des règles d'accès, sur un Postgres local (après supabase-local.sql et les migrations).
-- Usage : psql -v ON_ERROR_STOP=1 -f tests/securite.sql   → s'arrête à la première erreur.
\set QUIET on
\o /dev/null
create or replace function pg_temp.en_tant_que(p_user uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', coalesce(p_user::text, ''), false);
end $$;
create or replace function pg_temp.verifier(p_ok boolean, p_message text) returns void language plpgsql as $$
begin
  if not coalesce(p_ok, false) then raise exception 'ÉCHEC : %', p_message; end if;
  raise notice 'ok : %', p_message;
end $$;

-- Laura (administratrice)
insert into personnes (role, prenom, email) values ('admin', 'Laura', 'laura@exemple.fr');
insert into auth.users (id, email) values ('00000000-0000-0000-0000-00000000000a', 'Laura@exemple.fr');
select pg_temp.verifier((select user_id from personnes where role = 'admin') = '00000000-0000-0000-0000-00000000000a', 'compte de Laura rattaché (majuscules ignorées)');

-- Adresse inconnue : pas de compte
do $$ begin
  insert into auth.users (email) values ('inconnu@exemple.fr');
  raise exception 'ÉCHEC : une adresse inconnue a pu créer un compte';
exception when raise_exception then
  if sqlerrm like 'ÉCHEC%' then raise; end if;
  raise notice 'ok : adresse inconnue refusée (%)', sqlerrm;
end $$;

-- Laura crée deux couples
set role authenticated;
select pg_temp.en_tant_que('00000000-0000-0000-0000-00000000000a');
select creer_couple('Camille', 'Julien', current_date + 300, 'Domaine de la Source', 'complete', 'fr', 'camille@exemple.fr', 'julien@exemple.fr') as a \gset
select creer_couple('Inès', 'Mathis', current_date - 2, 'Mas des Oliviers', 'coordination_1', 'en', 'ines@exemple.fr', 'mathis@exemple.fr') as b \gset
select pg_temp.verifier((select count(*) from etapes where couple_id = :'a' and parent_id is null) = 10, '10 étapes types copiées');
select pg_temp.verifier((select count(*) from etapes where couple_id = :'a' and parent_id is not null) = 30, '6 recherches × 5 sous-étapes');
select pg_temp.verifier((select count(*) from budget_postes where couple_id = :'a') = 11, '11 postes de budget');
select pg_temp.verifier((select count(*) from questions where couple_id = :'a') = 20, '20 questions');
insert into echeances (couple_id, libelle, montant, date_prevue) values (:'a', 'Acompte', 900, current_date);
insert into couples_prives (couple_id) values (:'a') on conflict do nothing;
update couples_prives set notes = 'secret' where couple_id = :'a';
reset role;
insert into medias (couple_id, chemin) values (:'b', :'b' || '/photo.jpg');
insert into medias (couple_id, chemin) values (:'a', :'a' || '/photo.jpg');
insert into storage.objects (bucket_id, name) values ('album', :'a' || '/photo.jpg'), ('album', :'b' || '/photo.jpg'), ('documents', :'b' || '/contrat.pdf');

-- Les mariés se connectent
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'camille@exemple.fr'),
  ('00000000-0000-0000-0000-0000000000a2', 'julien@exemple.fr'),
  ('00000000-0000-0000-0000-0000000000b1', 'ines@exemple.fr');

select set_config('test.b', :'b', false);
-- ---------- Camille (Organisation complète) ----------
set role authenticated;
select pg_temp.en_tant_que('00000000-0000-0000-0000-0000000000a1');
select pg_temp.verifier((select count(*) from couples) = 1, 'Camille ne voit que son couple');
select pg_temp.verifier((select count(*) from etapes where couple_id = :'b') = 0, 'Camille ne voit pas le rétroplanning d''un autre couple');
select pg_temp.verifier((select count(*) from couples_prives) = 0, 'notes privées invisibles pour le couple');
select pg_temp.verifier((select count(*) from personnes) = 2, 'Camille voit les deux accès de son couple seulement');
select pg_temp.verifier((select count(*) from storage.objects) = 0, 'aucun fichier d''un autre couple, album encore fermé');
select pg_temp.verifier((select count(*) from medias) = 0, 'album fermé avant le lendemain 10 h');

do $$ begin
  insert into etapes (couple_id, nom) select id, 'Essai' from couples;
  raise exception 'ÉCHEC : en organisation complète, le couple a pu ajouter une étape';
exception when insufficient_privilege then raise notice 'ok : rétroplanning en lecture seule (organisation complète)';
end $$;
update budget_postes set reel = 5 where true;
select pg_temp.verifier((select count(*) from budget_postes where reel is not null) = 0, 'budget en lecture seule (organisation complète)');
update echeances set statut = 'paye' where true;
select pg_temp.verifier((select count(*) from echeances where statut = 'paye') = 0, 'le couple ne peut pas marquer « payé »');
select declarer_virement(id) from echeances;
select pg_temp.verifier((select statut from echeances) = 'a_confirmer', 'virement déclaré → À confirmer');
do $$ begin
  update couples set formule = 'coordination_1';
  if exists (select 1 from couples where formule = 'coordination_1') then raise exception 'ÉCHEC : le couple a changé sa formule'; end if;
  raise notice 'ok : le couple ne peut pas changer sa formule';
end $$;

-- Questionnaire : Camille répond à la 1re question
insert into reponses (question_id, personne_id, couple_id, texte)
  select id, ma_personne(), couple_id, 'Joyeux, chaleureux, élégant' from questions where ordre = 1;
do $$ begin
  insert into reponses (question_id, personne_id, couple_id, texte)
    select q.id, p.id, q.couple_id, 'usurpation' from questions q, personnes p where q.ordre = 2 and p.prenom = 'Julien';
  raise exception 'ÉCHEC : Camille a répondu à la place de Julien';
exception when insufficient_privilege then raise notice 'ok : chacun répond depuis son propre accès';
end $$;

-- ---------- Julien ne voit pas encore la réponse de Camille ----------
select pg_temp.en_tant_que('00000000-0000-0000-0000-0000000000a2');
select pg_temp.verifier((select count(*) from reponses) = 0, 'Julien ne voit pas la réponse de Camille avant d''avoir répondu');
select pg_temp.verifier((select count(*) from qui_a_repondu(mon_couple())) = 1, 'Julien sait que Camille a répondu (sans voir la réponse)');
select pg_temp.verifier((select count(*) from qui_a_repondu(current_setting('test.b')::uuid)) = 0, 'aucune information sur un autre couple');
select repondre(id, 'Festif', '{}', '') from questions where ordre = 1;
select repondre(id, 'Festif, simple', '{}', '') from questions where ordre = 1;
select pg_temp.verifier((select texte from reponses where personne_id = ma_personne()) = 'Festif, simple', 'réponse modifiable par son auteur');
select pg_temp.verifier((select count(*) from reponses) = 2, 'après avoir répondu, Julien voit les deux réponses');

-- ---------- Inès (Coordination) ----------
select set_config('test.a', :'a', false);
select pg_temp.en_tant_que('00000000-0000-0000-0000-0000000000b1');
insert into etapes (couple_id, nom, ordre) values (:'b', 'Recherche officiant', 11);
select pg_temp.verifier((select count(*) from etapes e join etapes p on p.id = e.parent_id where p.nom = 'Recherche officiant') = 5, 'coordination : nouvelle recherche avec ses 5 sous-étapes');
insert into budget_postes (couple_id, nom, estime, reel) values (:'b', 'Faire-part', 300.10, 299.99);
select pg_temp.verifier((select reel - estime from budget_postes where nom = 'Faire-part') = -0.11, 'écart calculé au centime');
insert into prestataires (couple_id, nom) values (:'b', 'Soundbox');
insert into storage.objects (bucket_id, name) values ('documents', :'b' || '/devis.pdf');
insert into documents (couple_id, nom, chemin, statut) values (:'b', 'Devis DJ', :'b' || '/devis.pdf', 'relu');
select pg_temp.verifier((select statut from documents where nom = 'Devis DJ') = 'en_relecture', 'document déposé par le couple → En relecture');
do $$ begin
  insert into storage.objects (bucket_id, name) values ('documents', current_setting('test.a') || '/x.pdf');
  raise exception 'ÉCHEC : dépôt dans le dossier d''un autre couple';
exception when insufficient_privilege then raise notice 'ok : impossible de déposer chez un autre couple';
end $$;
select pg_temp.verifier((select count(*) from medias) = 1, 'album ouvert le lendemain du mariage');
select pg_temp.verifier((select count(*) from storage.objects where bucket_id = 'album') = 1, 'fichiers de l''album lisibles après ouverture (les siens seulement)');
insert into rendez_vous (couple_id, titre, debut) values (:'b', 'Dégustation', now() + interval '1 day');
select pg_temp.verifier((select ajoute_par from rendez_vous) = 'couple', 'rendez-vous « Ajouté par vous »');
select pg_temp.verifier((select count(*) from notifications) = 0, 'le couple ne voit pas les alertes destinées à Laura');

-- ---------- Laura ----------
select pg_temp.en_tant_que('00000000-0000-0000-0000-00000000000a');
select pg_temp.verifier((select count(*) from couples) = 2, 'Laura voit tous les couples');
select pg_temp.verifier((select count(*) from notifications where pour_admin) = 3, 'Laura alertée : virement, document, rendez-vous');
update echeances set statut = 'paye', paye_le = current_date where couple_id = :'a';
update documents set statut = 'relu', commentaire = 'Tout est clair' where couple_id = :'b';
insert into taches (couple_id, intitule, date_butoir) values (:'a', 'Envoyer la liste des invités', current_date + 2);
do $$ begin
  insert into echeances (couple_id, libelle, montant) select id, 'v' || g, 1 from couples, generate_series(1, 6) g where prenom_1 = 'Camille';
  raise exception 'ÉCHEC : plus de 6 versements';
exception when raise_exception then
  if sqlerrm like 'ÉCHEC%' then raise; end if;
  raise notice 'ok : 6 versements au maximum';
end $$;

-- ---------- Camille voit ses notifications ----------
select pg_temp.en_tant_que('00000000-0000-0000-0000-0000000000a1');
select pg_temp.verifier((select count(*) from notifications) = 2, 'Camille : paiement confirmé + nouvelle tâche');
select cocher_tache(id, true) from taches;
select pg_temp.verifier((select fait_le is not null from taches), 'le couple coche une tâche');

-- ---------- Sans connexion ----------
reset role;
set role anon;
select pg_temp.en_tant_que(null);
do $$ begin
  perform count(*) from couples;
  raise exception 'ÉCHEC : accès sans connexion';
exception when insufficient_privilege then raise notice 'ok : aucun accès sans connexion';
end $$;
select pg_temp.verifier(adresse_connue('JULIEN@exemple.fr'), 'adresse connue vérifiable avant envoi du lien');

-- ---------- Tâches du serveur ----------
reset role;
insert into taches (couple_id, intitule, date_butoir) values (:'a', 'Choisir le menu', current_date + 3), (:'a', 'Plus tard', current_date + 10);
set role service_role;
select pg_temp.verifier(creer_rappels_taches() = 1, 'rappel 3 jours avant la date butoir');
select pg_temp.verifier(creer_rappels_rdv() = 0, 'pas de rappel veille pour un rendez-vous ajouté par le couple');
select pg_temp.verifier(creer_notifications_album() = 1, 'album ouvert → notification + demande d''avis');
select pg_temp.verifier((select count(*) from prendre_notifications(100)) >= 7, 'file d''envoi des notifications');
reset role;
\echo 'Tous les tests de sécurité sont passés.'
