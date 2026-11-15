-- =====================================================================
-- Suppression de son compte par la personne elle-même (RGPD)
-- Efface le compte, ses plans, ses mariages (avec leurs intervenants et
-- leurs liens) et tout ce qui en dépend.
-- À coller dans Supabase : SQL Editor > New query > Run
-- =====================================================================
create or replace function public.supprimer_mon_compte()
returns void
language plpgsql
volatile
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Connexion nécessaire';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;
revoke all on function public.supprimer_mon_compte() from public, anon;
grant execute on function public.supprimer_mon_compte() to authenticated;
