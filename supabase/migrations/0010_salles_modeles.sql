-- =====================================================================
-- Mon plan de salle — étape 4 : salles modèles des lieux de réception
-- À coller dans Supabase : SQL Editor > New query > Run
-- =====================================================================

alter table public.plans add column if not exists est_modele boolean not null default false;
alter table public.plans add column if not exists modele_id uuid references public.plans (id) on delete set null;
alter table public.plans add column if not exists structure_verrouillee boolean not null default false;

-- Les liens peuvent aussi être des « liens de salle modèle » pour les couples
alter table public.plans_liens drop constraint if exists plans_liens_role_check;
alter table public.plans_liens add constraint plans_liens_role_check check (role in ('lecteur', 'editeur', 'modele'));

-- Ce que montre un lien : pour une salle modèle, la salle et le nom du lieu
create or replace function public.plan_par_lien(p_jeton text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_lien public.plans_liens;
  v_plan public.plans;
begin
  select * into v_lien from public.plans_liens where jeton = p_jeton and actif;
  if not found then
    return null;
  end if;
  select * into v_plan from public.plans where id = v_lien.plan_id;
  return jsonb_build_object(
    'plan_id', v_plan.id,
    'nom', v_plan.nom,
    'role', v_lien.role,
    'version', v_plan.version,
    'updated_at', v_plan.updated_at,
    'deja_membre', public.role_plan(v_plan.id) is not null,
    'lieu', (select nom from public.profils where id = v_plan.proprietaire_id),
    'contenu', case when v_lien.role in ('lecteur', 'modele') then v_plan.contenu else null end
  );
end;
$$;

-- Le couple crée son plan à partir d'une salle modèle ; renvoie l'identifiant du plan
create or replace function public.creer_plan_depuis_modele(p_jeton text, p_nom text, p_partager_lieu boolean default true)
returns uuid
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_lien public.plans_liens;
  v_modele public.plans;
  v_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Connexion nécessaire';
  end if;
  select * into v_lien from public.plans_liens where jeton = p_jeton and actif and role = 'modele';
  if not found then
    raise exception 'Lien invalide';
  end if;
  select * into v_modele from public.plans where id = v_lien.plan_id;
  insert into public.plans (proprietaire_id, nom, contenu, modele_id, structure_verrouillee)
  values (auth.uid(), left(coalesce(nullif(trim(p_nom), ''), v_modele.nom), 120),
          jsonb_set(v_modele.contenu, '{name}', to_jsonb(coalesce(nullif(trim(p_nom), ''), v_modele.nom))),
          v_modele.id, true)
  returning id into v_id;
  -- Le lieu voit le plan du couple (lecture), si le couple l'accepte
  if p_partager_lieu and v_modele.proprietaire_id <> auth.uid() then
    insert into public.plans_membres (plan_id, user_id, role)
    values (v_id, v_modele.proprietaire_id, 'lecteur')
    on conflict do nothing;
  end if;
  return v_id;
end;
$$;

-- Informations sur la salle d'origine d'un plan (pour l'afficher au couple)
create or replace function public.info_modele(p_plan uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_plan public.plans;
  v_modele public.plans;
begin
  if public.role_plan(p_plan) is null then
    return null;
  end if;
  select * into v_plan from public.plans where id = p_plan;
  if v_plan.modele_id is null then
    return null;
  end if;
  select * into v_modele from public.plans where id = v_plan.modele_id;
  if not found then
    return null;
  end if;
  return jsonb_build_object(
    'nom', v_modele.nom,
    'lieu', (select nom from public.profils where id = v_modele.proprietaire_id),
    'modifie_le', v_modele.updated_at);
end;
$$;

-- ---------------------------------------------------------------------
-- La structure fixée par le lieu ne peut pas être modifiée dans le plan
-- du couple (forme de la salle, éléments « fixes »). Seule la mise à
-- jour depuis la salle modèle peut la changer.
-- ---------------------------------------------------------------------
create or replace function public.plan_proteger_structure()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  e jsonb;
begin
  if not old.structure_verrouillee or coalesce(current_setting('plan.mise_a_jour_structure', true), '') = 'oui' then
    return new;
  end if;
  new.structure_verrouillee := true;
  new.modele_id := old.modele_id;
  if new.contenu is distinct from old.contenu then
    if (new.contenu -> 'room') is distinct from (old.contenu -> 'room') then
      raise exception 'La forme de la salle est fixée par le lieu de réception';
    end if;
    for e in select * from jsonb_array_elements(coalesce(old.contenu -> 'items', '[]'::jsonb)) loop
      if coalesce((e ->> 'verrou')::boolean, false) and not exists (
        select 1 from jsonb_array_elements(coalesce(new.contenu -> 'items', '[]'::jsonb)) n
        where (n - 'guests' - 'note') = (e - 'guests' - 'note')) then
        raise exception 'Cet élément est fixé par le lieu de réception : %', e ->> 'name';
      end if;
    end loop;
  end if;
  return new;
end;
$$;
drop trigger if exists plan_proteger_structure on public.plans;
create trigger plan_proteger_structure before update on public.plans
  for each row execute function public.plan_proteger_structure();

-- Mettre la structure du plan à jour depuis la salle modèle (le lieu a
-- modifié sa salle) : les tables et invités du couple sont gardés.
create or replace function public.mettre_a_jour_structure(p_plan uuid)
returns int
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_plan public.plans;
  v_modele public.plans;
  v_version int;
begin
  if public.role_plan(p_plan) not in ('proprietaire', 'editeur') then
    raise exception 'Accès refusé';
  end if;
  select * into v_plan from public.plans where id = p_plan;
  select * into v_modele from public.plans where id = v_plan.modele_id;
  if not found then
    raise exception 'La salle d''origine n''existe plus';
  end if;
  perform set_config('plan.mise_a_jour_structure', 'oui', true);
  update public.plans
  set contenu = jsonb_set(
        jsonb_set(v_plan.contenu, '{room}', v_modele.contenu -> 'room'),
        '{items}',
        coalesce((select jsonb_agg(i) from jsonb_array_elements(v_plan.contenu -> 'items') i
                  where not coalesce((i ->> 'verrou')::boolean, false)), '[]'::jsonb)
        -- éléments fixes de la salle modèle, en gardant les invités déjà placés dessus
        || coalesce((select jsonb_agg(jsonb_set(i, '{guests}', coalesce(
                    (select n -> 'guests' from jsonb_array_elements(v_plan.contenu -> 'items') n
                     where n ->> 'id' = i ->> 'id'), '[]'::jsonb)))
                  from jsonb_array_elements(v_modele.contenu -> 'items') i
                  where coalesce((i ->> 'verrou')::boolean, false)), '[]'::jsonb))
  where id = p_plan
  returning version into v_version;
  perform set_config('plan.mise_a_jour_structure', '', true);
  return v_version;
end;
$$;

revoke all on function public.creer_plan_depuis_modele(text, text, boolean) from public;
revoke all on function public.info_modele(uuid) from public;
revoke all on function public.mettre_a_jour_structure(uuid) from public;
grant execute on function public.creer_plan_depuis_modele(text, text, boolean) to authenticated;
grant execute on function public.info_modele(uuid) to authenticated;
grant execute on function public.mettre_a_jour_structure(uuid) to authenticated;
