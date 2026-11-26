-- =====================================================================
-- Mon Espace Mariés — stockage des fichiers (documents, album)
-- À exécuter après 0002. Les fichiers sont rangés par couple :
--   documents/<id du couple>/<fichier>   album/<id du couple>/<fichier>
-- Aucun fichier n'est public : chaque lecture passe par ces règles.
-- =====================================================================

insert into storage.buckets (id, name, public)
values ('documents', 'documents', false), ('album', 'album', false)
on conflict (id) do nothing;

-- Id du couple d'après le dossier du fichier (null si le chemin est invalide)
create or replace function public.couple_du_fichier(p_nom text)
returns uuid language plpgsql immutable set search_path = public as $$
begin
  return split_part(p_nom, '/', 1)::uuid;
exception when others then
  return null;
end $$;
grant execute on function public.couple_du_fichier to authenticated, service_role;

-- Documents : lus par le couple et Laura ; déposés par Laura, ou par le couple en coordination
drop policy if exists "documents lus" on storage.objects;
create policy "documents lus" on storage.objects for select to authenticated
  using (bucket_id = 'documents' and public.acces_couple(public.couple_du_fichier(name)));

drop policy if exists "documents déposés" on storage.objects;
create policy "documents déposés" on storage.objects for insert to authenticated
  with check (bucket_id = 'documents' and public.peut_editer(public.couple_du_fichier(name)));

drop policy if exists "documents supprimés" on storage.objects;
create policy "documents supprimés" on storage.objects for delete to authenticated
  using (bucket_id = 'documents' and (
    public.est_admin()
    or exists (select 1 from public.documents d where d.chemin = name and d.couple_id = public.mon_couple()
               and d.depose_par = 'couple' and d.statut = 'en_relecture')));

-- Album : Laura toujours ; le couple à partir du lendemain du mariage, 10 h.
-- Les invités déposent par un lien signé fourni par le serveur (aucune règle d'ajout ici).
drop policy if exists "album lu" on storage.objects;
create policy "album lu" on storage.objects for select to authenticated
  using (bucket_id = 'album' and (
    public.est_admin()
    or (public.couple_du_fichier(name) = public.mon_couple() and public.album_ouvert(public.couple_du_fichier(name)))));

drop policy if exists "album trié" on storage.objects;
create policy "album trié" on storage.objects for delete to authenticated
  using (bucket_id = 'album' and public.est_admin());
