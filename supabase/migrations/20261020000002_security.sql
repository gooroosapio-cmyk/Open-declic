-- Open declic — règles d'accès (RLS), privilèges et fonctions d'administration

alter table public.user_roles enable row level security;
alter table public.full_access enable row level security;
alter table public.access_audit enable row level security;
alter table public.categories enable row level security;
alter table public.app_settings enable row level security;
alter table public.projects enable row level security;
alter table public.project_kits enable row level security;
alter table public.project_steps enable row level security;
alter table public.favorites enable row level security;
alter table public.user_projects enable row level security;
alter table public.step_progress enable row level security;

-- Privilèges de base : on retire tout puis on accorde le strict nécessaire.
revoke all on public.user_roles, public.full_access, public.access_audit,
  public.categories, public.app_settings, public.projects, public.project_kits,
  public.project_steps, public.favorites, public.user_projects, public.step_progress
  from anon, authenticated;

grant select on public.categories, public.app_settings, public.projects to anon, authenticated;
grant select on public.project_kits, public.project_steps to anon, authenticated;
grant insert, update, delete on public.categories, public.app_settings, public.projects,
  public.project_kits, public.project_steps to authenticated; -- filtré par RLS (admin)
grant select, insert, delete on public.favorites to authenticated;
grant select, insert, update, delete on public.user_projects, public.step_progress to authenticated;
grant select on public.user_roles, public.full_access to authenticated; -- sa propre ligne (RLS)
grant select on public.access_audit to authenticated; -- admin (RLS)
-- Aucune écriture directe sur user_roles, full_access, access_audit.

-- Rôles : chacun voit son propre rôle ; l'admin voit tout.
create policy "roles: lecture de soi ou admin" on public.user_roles
  for select to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());

create policy "accès complet: lecture de soi ou admin" on public.full_access
  for select to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());

create policy "journal: admin" on public.access_audit
  for select to authenticated using (public.is_admin());

-- Référentiels
create policy "catégories: lecture" on public.categories for select using (true);
create policy "catégories: admin" on public.categories for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "réglages: lecture" on public.app_settings for select using (true);
create policy "réglages: admin" on public.app_settings for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Aperçus publics : publiés pour tous, tout pour l'admin.
create policy "fiches: publiées ou admin" on public.projects for select
  using (status = 'published' or public.is_admin());
create policy "fiches: écriture admin" on public.projects for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Contenu réservé : fiche gratuite publiée, membre complet, ou admin.
create policy "kits: lecture autorisée" on public.project_kits for select
  using (public.can_read_reserved(project_id));
create policy "kits: écriture admin" on public.project_kits for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "étapes: lecture autorisée" on public.project_steps for select
  using (public.can_read_reserved(project_id));
create policy "étapes: écriture admin" on public.project_steps for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Données personnelles : uniquement les siennes.
create policy "favoris: les siens" on public.favorites for select to authenticated
  using (user_id = (select auth.uid()));
create policy "favoris: ajout" on public.favorites for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.projects p where p.id = project_id and p.status = 'published')
  );
create policy "favoris: retrait" on public.favorites for delete to authenticated
  using (user_id = (select auth.uid()));

create policy "projets commencés: les siens" on public.user_projects for select to authenticated
  using (user_id = (select auth.uid()));
create policy "projets commencés: démarrer" on public.user_projects for insert to authenticated
  with check (user_id = (select auth.uid()) and public.can_read_reserved(project_id));
create policy "projets commencés: reprendre" on public.user_projects for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and public.can_read_reserved(project_id));
create policy "projets commencés: retirer" on public.user_projects for delete to authenticated
  using (user_id = (select auth.uid()));

create policy "progression: la sienne" on public.step_progress for select to authenticated
  using (user_id = (select auth.uid()));
create policy "progression: valider" on public.step_progress for insert to authenticated
  with check (user_id = (select auth.uid()) and public.can_read_reserved(project_id));
create policy "progression: annuler" on public.step_progress for delete to authenticated
  using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Fonctions d'administration
-- ---------------------------------------------------------------------------

-- Recherche de comptes (auth.users n'est pas exposé à l'API).
create or replace function public.admin_list_users(p_search text default '')
returns table (user_id uuid, email text, created_at timestamptz, confirmed boolean,
               is_admin boolean, has_full_access boolean, access_granted_at timestamptz)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Accès refusé : rôle administrateur requis.' using errcode = '42501';
  end if;
  return query
    select u.id, u.email::text, u.created_at, u.email_confirmed_at is not null,
           exists (select 1 from public.user_roles r where r.user_id = u.id),
           f.user_id is not null, f.granted_at
    from auth.users u
    left join public.full_access f on f.user_id = u.id
    where coalesce(p_search, '') = '' or u.email ilike '%' || p_search || '%'
    order by u.created_at desc
    limit 100;
end;
$$;

-- Attribution ou révocation de l'accès complet, avec trace.
create or replace function public.admin_set_full_access(p_user uuid, p_grant boolean, p_note text default null)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_target_email text;
  v_actor_email text;
begin
  if not public.is_admin() then
    raise exception 'Accès refusé : rôle administrateur requis.' using errcode = '42501';
  end if;
  select email into v_target_email from auth.users where id = p_user;
  if v_target_email is null then
    raise exception 'Compte introuvable.' using errcode = 'P0002';
  end if;
  select email into v_actor_email from auth.users where id = v_actor;

  if p_grant then
    insert into public.full_access (user_id, granted_by, note)
    values (p_user, v_actor, p_note)
    on conflict (user_id) do nothing;
    if not found then
      raise exception 'Ce compte dispose déjà de l''accès complet.' using errcode = 'P0001';
    end if;
  else
    delete from public.full_access where user_id = p_user;
    if not found then
      raise exception 'Ce compte ne dispose pas de l''accès complet.' using errcode = 'P0001';
    end if;
  end if;

  insert into public.access_audit (target_user, target_email, actor, actor_email, action, note)
  values (p_user, v_target_email, v_actor, v_actor_email,
          case when p_grant then 'grant' else 'revoke' end, p_note);
end;
$$;

revoke all on function public.admin_list_users(text) from public, anon;
revoke all on function public.admin_set_full_access(uuid, boolean, text) from public, anon;
grant execute on function public.admin_list_users(text) to authenticated;
grant execute on function public.admin_set_full_access(uuid, boolean, text) to authenticated;
grant execute on function public.is_admin(), public.has_full_access(),
  public.can_read_reserved(uuid), public.project_outline(uuid) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Stockage des visuels (bucket public en lecture, écriture admin)
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('visuels', 'visuels', true, 5242880,
        array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'])
on conflict (id) do nothing;

create policy "visuels: écriture admin" on storage.objects for insert to authenticated
  with check (bucket_id = 'visuels' and public.is_admin());
create policy "visuels: modification admin" on storage.objects for update to authenticated
  using (bucket_id = 'visuels' and public.is_admin());
create policy "visuels: suppression admin" on storage.objects for delete to authenticated
  using (bucket_id = 'visuels' and public.is_admin());
