-- =====================================================================
-- Mon plan de salle — étape 6 : le plan dans les liens des intervenants
-- Chaque intervenant voit le plan adapté à son métier. Les noms des
-- invités ne sont envoyés qu'aux liens « coordination ».
-- À coller dans Supabase : SQL Editor > New query > Run
-- (uniquement des ajouts)
-- =====================================================================

-- Vue du plan choisie pour l'intervenant (vide = automatique selon le rôle)
alter table public.intervenants add column if not exists vue_plan text
  check (vue_plan in ('coordination', 'traiteur', 'loueur', 'decoration', 'simple', 'aucune'));

create or replace function public.vue_plan_auto(p_role text, p_categorie text, p_coordination boolean)
returns text
language sql
immutable
as $$
  select case
    when p_coordination or coalesce(p_role, '') ~* 'wedding|coordinat|organisat' then 'coordination'
    when coalesce(p_role, '') ~* 'traiteur|p[âa]tissi|barman|cuisin|chef|serveur|maître d|maitre d' then 'traiteur'
    when coalesce(p_role, '') ~* 'loueur|location|mobilier|lieu' then 'loueur'
    when coalesce(p_role, '') ~* 'd[ée]cor|fleur|sc[ée]no' then 'decoration'
    when p_categorie = 'proche' then 'aucune'
    else 'simple'
  end;
$$;

-- Ne garde du plan que ce qui sert à cette vue
create or replace function public.contenu_pour_vue(c jsonb, p_vue text)
returns jsonb
language sql
immutable
as $$
  select case when p_vue = 'coordination' then c else
    c || jsonb_build_object(
      'items', coalesce((
        select jsonb_agg(
          (case when p_vue = 'decoration' then i else i - 'note' end)
          || case when i ? 'guests' then jsonb_build_object('guests', coalesce((
            select jsonb_agg(case when p_vue = 'traiteur'
              then jsonb_strip_nulls(jsonb_build_object('id', coalesce(g -> 'id', to_jsonb(n::text)), 'nom', '', 'menu', g -> 'menu', 'note', g -> 'note'))
              else jsonb_build_object('id', coalesce(g -> 'id', to_jsonb(n::text)), 'nom', '') end)
            from jsonb_array_elements(i -> 'guests') with ordinality as x(g, n)), '[]'::jsonb))
          else '{}'::jsonb end
          order by o)
        from jsonb_array_elements(coalesce(c -> 'items', '[]'::jsonb)) with ordinality as y(i, o)), '[]'::jsonb),
      'nonPlaces', case when p_vue = 'traiteur' then coalesce((
          select jsonb_agg(jsonb_strip_nulls(jsonb_build_object('id', coalesce(g -> 'id', to_jsonb(n::text)), 'nom', '', 'menu', g -> 'menu', 'note', g -> 'note')))
          from jsonb_array_elements(coalesce(c -> 'nonPlaces', '[]'::jsonb)) with ordinality as z(g, n)), '[]'::jsonb)
        else '[]'::jsonb end)
  end;
$$;

-- Ce que voit un intervenant grâce à son lien
create or replace function public.plan_intervenant(p_jeton text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_int public.intervenants;
  v_vue text;
begin
  select * into v_int from public.intervenants where jeton = p_jeton;
  if not found then
    return null;
  end if;
  v_vue := coalesce(v_int.vue_plan, public.vue_plan_auto(v_int.role, v_int.categorie, v_int.acces_coordination));
  if v_vue = 'aucune' then
    return jsonb_build_object('vue', v_vue, 'plans', '[]'::jsonb);
  end if;
  return jsonb_build_object(
    'vue', v_vue,
    'plans', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', p.id, 'nom', p.nom, 'updated_at', p.updated_at,
        'contenu', public.contenu_pour_vue(p.contenu, v_vue)) order by p.created_at)
      from public.plans p
      where p.mariage_id = v_int.mariage_id and not p.archive), '[]'::jsonb));
end;
$$;
revoke all on function public.plan_intervenant(text) from public;
grant execute on function public.plan_intervenant(text) to anon, authenticated;

-- Quand un plan relié à un mariage change, les liens des intervenants
-- se mettent à jour (même signal que pour le déroulé)
create or replace function public.plan_prevenir_mariage()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_canal text;
begin
  for v_canal in
    select m.canal from public.mariages m
    where m.id in (new.mariage_id, old.mariage_id)
  loop
    begin
      perform realtime.send(jsonb_build_object('table', 'plans'), 'maj', 'mariage:' || v_canal, false);
    exception when others then
      null; -- une panne du temps réel ne doit jamais bloquer un enregistrement
    end;
  end loop;
  return null;
end;
$$;
drop trigger if exists plan_prevenir_mariage on public.plans;
create trigger plan_prevenir_mariage after update on public.plans
  for each row when (new.mariage_id is not null or old.mariage_id is not null)
  execute function public.plan_prevenir_mariage();
