-- Open declic — schéma initial
-- Trois niveaux de données :
--   1. Aperçu public          : public.projects (fiches publiées uniquement)
--   2. Contenu réservé        : public.project_kits, public.project_steps
--   3. Données personnelles   : favorites, user_projects, step_progress
-- Les droits sont contrôlés par RLS. Les opérations sensibles (accès complet,
-- rôles) passent par des fonctions SECURITY DEFINER qui vérifient le rôle admin.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Rôles et accès
-- ---------------------------------------------------------------------------

create table public.user_roles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role text not null check (role in ('admin')),
  created_at timestamptz not null default now()
);
comment on table public.user_roles is
  'Rôles d''administration. Modifiable uniquement en SQL (voir docs/CONFIGURATION.md).';

create table public.full_access (
  user_id uuid primary key references auth.users (id) on delete cascade,
  granted_by uuid references auth.users (id) on delete set null,
  granted_at timestamptz not null default now(),
  note text
);
comment on table public.full_access is
  'Membres disposant de l''accès complet (à vie). Écriture via admin_set_full_access uniquement.';

create table public.access_audit (
  id bigint generated always as identity primary key,
  target_user uuid not null,
  target_email text,
  actor uuid,
  actor_email text,
  action text not null check (action in ('grant', 'revoke')),
  note text,
  created_at timestamptz not null default now()
);
comment on table public.access_audit is 'Journal des attributions et révocations d''accès complet.';

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.user_roles r
    where r.user_id = (select auth.uid()) and r.role = 'admin'
  );
$$;

create or replace function public.has_full_access()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.full_access f where f.user_id = (select auth.uid()));
$$;

-- ---------------------------------------------------------------------------
-- Référentiels et réglages
-- ---------------------------------------------------------------------------

create table public.categories (
  slug text primary key check (slug ~ '^[a-z0-9-]+$'),
  label text not null,
  position int not null default 0
);

create table public.app_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null
);
comment on table public.app_settings is
  'Réglages publics (contact pour l''accès, etc.). Aucun secret ici : la table est lisible par tous.';

-- ---------------------------------------------------------------------------
-- Fiches : aperçu public
-- ---------------------------------------------------------------------------

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  is_free boolean not null default false,
  is_demo boolean not null default false,
  title text not null,
  summary text not null,
  category text not null references public.categories (slug) on update cascade,
  countries text[] not null default '{}',
  difficulty text not null check (difficulty in ('debutant', 'intermediaire', 'avance')),
  skills text[] not null default '{}',
  equipment text[] not null default '{}',
  -- Montants en FCFA. NULL = inconnu (jamais assimilé à zéro).
  launch_budget_min integer check (launch_budget_min >= 0),
  launch_budget_max integer check (launch_budget_max >= 0),
  monthly_cost_min integer check (monthly_cost_min >= 0),
  monthly_cost_max integer check (monthly_cost_max >= 0),
  weekly_hours_min integer check (weekly_hours_min >= 0),
  weekly_hours_max integer check (weekly_hours_max >= 0),
  -- Reste de l'aperçu public (cible, problème, références, budget détaillé…).
  public_content jsonb not null default '{}'::jsonb,
  content_version text not null default '1',
  schema_version text not null default '1.0',
  verified_at date,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (launch_budget_min is null or launch_budget_max is null or launch_budget_min <= launch_budget_max),
  check (monthly_cost_min is null or monthly_cost_max is null or monthly_cost_min <= monthly_cost_max),
  check (weekly_hours_min is null or weekly_hours_max is null or weekly_hours_min <= weekly_hours_max)
);
create index projects_status_idx on public.projects (status);

-- ---------------------------------------------------------------------------
-- Fiches : contenu réservé
-- ---------------------------------------------------------------------------

create table public.project_kits (
  project_id uuid primary key references public.projects (id) on delete cascade,
  -- Prompt initial de cadrage, résumé de transmission, configurations, livrables…
  content jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table public.project_steps (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  step_key text not null check (step_key ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  position int not null,
  title text not null,
  -- Le titre est visible dans l'aperçu public ; le reste est réservé.
  content jsonb not null default '{}'::jsonb,
  -- Étape retirée d'un import ultérieur : conservée (progression intacte) mais masquée.
  retired boolean not null default false,
  updated_at timestamptz not null default now(),
  unique (project_id, step_key)
);

create or replace function public.can_read_reserved(p_project uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_admin() or exists (
    select 1 from public.projects p
    where p.id = p_project
      and p.status = 'published'
      and (p.is_free or public.has_full_access())
  );
$$;

-- Plan public d'une fiche publiée : titres des étapes uniquement.
create or replace function public.project_outline(p_project uuid)
returns table (step_key text, "position" int, title text)
language sql
stable
security definer
set search_path = ''
as $$
  select s.step_key, s.position, s.title
  from public.project_steps s
  join public.projects p on p.id = s.project_id
  where s.project_id = p_project
    and not s.retired
    and (p.status = 'published' or public.is_admin())
  order by s.position;
$$;

-- ---------------------------------------------------------------------------
-- Données personnelles
-- ---------------------------------------------------------------------------

create table public.favorites (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, project_id)
);

create table public.user_projects (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  started_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  current_step_key text,
  primary key (user_id, project_id)
);

-- La progression référence la clé stable de l'étape (pas son id) :
-- un import qui met à jour les étapes ne la fait jamais disparaître.
create table public.step_progress (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  step_key text not null,
  validated_at timestamptz not null default now(),
  primary key (user_id, project_id, step_key)
);

-- ---------------------------------------------------------------------------
-- updated_at
-- ---------------------------------------------------------------------------

create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger projects_touch before update on public.projects
  for each row execute function public.touch_updated_at();
create trigger kits_touch before update on public.project_kits
  for each row execute function public.touch_updated_at();
create trigger steps_touch before update on public.project_steps
  for each row execute function public.touch_updated_at();
create trigger user_projects_touch before update on public.user_projects
  for each row execute function public.touch_updated_at();
