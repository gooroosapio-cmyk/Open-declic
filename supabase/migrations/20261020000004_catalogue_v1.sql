-- Open declic — catalogue V1 (OD-001 à OD-200)
-- Ajoute les niveaux de contenu (fiche complète / modèle), les repères du catalogue
-- et met à jour l'import (schéma 1.1, 1.0 toujours accepté).

alter table public.projects
  add column content_level text not null default 'complete' check (content_level in ('complete', 'modele')),
  add column od_number text unique check (od_number ~ '^OD-[0-9]{3}$'),
  add column work_name text,
  add column domain text,
  add column client_type text check (client_type in ('b2b', 'b2c', 'b2b2c')),
  add column ai_usage text check (ai_usage in ('non_necessaire', 'optionnelle', 'requise')),
  add column evidence text check (evidence in ('A', 'B', 'O')),
  add column featured boolean not null default false;

create index projects_featured_idx on public.projects (featured) where featured;

-- Un modèle n'a pas de contenu réservé.
create or replace function public.check_kit_level()
returns trigger language plpgsql set search_path = '' as $$
begin
  if exists (select 1 from public.projects p where p.id = new.project_id and p.content_level = 'modele') then
    raise exception 'Un modèle ne peut pas avoir de kit ni d''étapes.' using errcode = '23514';
  end if;
  return new;
end;
$$;
create trigger kits_level before insert or update on public.project_kits
  for each row execute function public.check_kit_level();
create trigger steps_level before insert or update on public.project_steps
  for each row execute function public.check_kit_level();

-- Catégories du catalogue V1 (types de produit).
insert into public.categories (slug, label, position) values
  ('saas-app', 'SaaS / application', 1),
  ('site', 'Site / plateforme', 2),
  ('jeu', 'Jeu web', 3)
on conflict (slug) do update set label = excluded.label, position = excluded.position;
update public.projects set category = 'saas-app' where category in ('saas', 'application-mobile');
update public.projects set category = 'site' where category = 'site-web';
delete from public.categories c
where c.slug in ('saas', 'site-web', 'application-mobile')
  and not exists (select 1 from public.projects p where p.category = c.slug);

create or replace function public.import_fiches_core(p_payload jsonb)
returns jsonb
language plpgsql
volatile
security invoker
set search_path = ''
as $$
declare
  f jsonb;
  s jsonb;
  v_id uuid;
  v_created boolean;
  v_level text;
  v_existing_level text;
  v_result jsonb := '[]'::jsonb;
  v_pos int;
begin
  for f in select * from jsonb_array_elements(p_payload -> 'fiches') loop
    v_level := coalesce(f ->> 'niveau_contenu', 'complete');
    select id, content_level into v_id, v_existing_level from public.projects where slug = f ->> 'id';
    v_created := v_id is null;

    if v_created then
      insert into public.projects (slug, status, is_free, is_demo, title, summary, category, difficulty, content_level)
      values (f ->> 'id', 'draft', (f -> 'acces' ->> 'gratuit')::boolean,
              coalesce((f ->> 'demonstration')::boolean, false),
              f ->> 'titre', f ->> 'resume', f ->> 'categorie', f -> 'difficulte' ->> 'niveau', v_level)
      returning id into v_id;
    elsif v_existing_level = 'complete' and v_level = 'modele' then
      -- Pas de suppression implicite : une fiche complète ne redevient pas un modèle par import.
      raise exception 'La fiche % est complète : elle ne peut pas être remplacée par un modèle.', f ->> 'id' using errcode = '23514';
    end if;

    update public.projects set
      content_level = v_level,
      is_demo = coalesce((f ->> 'demonstration')::boolean, false),
      title = f ->> 'titre',
      summary = f ->> 'resume',
      category = f ->> 'categorie',
      countries = array(select jsonb_array_elements_text(coalesce(f -> 'pays', '[]'::jsonb))),
      difficulty = f -> 'difficulte' ->> 'niveau',
      skills = array(select jsonb_array_elements_text(coalesce(f -> 'competences', '[]'::jsonb))),
      equipment = array(select jsonb_array_elements_text(coalesce(f -> 'materiel', '[]'::jsonb))),
      launch_budget_min = (f -> 'filtres' -> 'budget_lancement' ->> 'min')::int,
      launch_budget_max = (f -> 'filtres' -> 'budget_lancement' ->> 'max')::int,
      monthly_cost_min = (f -> 'filtres' -> 'depenses_mensuelles' ->> 'min')::int,
      monthly_cost_max = (f -> 'filtres' -> 'depenses_mensuelles' ->> 'max')::int,
      weekly_hours_min = (f -> 'filtres' -> 'heures_hebdo' ->> 'min')::int,
      weekly_hours_max = (f -> 'filtres' -> 'heures_hebdo' ->> 'max')::int,
      public_content = (f -> 'apercu') || jsonb_build_object('difficulte_explication', f -> 'difficulte' ->> 'explication'),
      od_number = f -> 'catalogue' ->> 'numero',
      work_name = f -> 'catalogue' ->> 'nom_travail',
      domain = f -> 'catalogue' ->> 'domaine',
      client_type = f -> 'catalogue' ->> 'client',
      ai_usage = f -> 'catalogue' ->> 'ia_usage',
      evidence = f -> 'catalogue' ->> 'preuve',
      featured = coalesce((f -> 'catalogue' ->> 'mise_en_avant')::boolean, false),
      content_version = f ->> 'version',
      schema_version = p_payload ->> 'schema_version',
      verified_at = (f ->> 'date_verification')::date
    where id = v_id;

    if v_level = 'complete' then
      insert into public.project_kits (project_id, content)
      values (v_id, f -> 'reserve' -> 'kit')
      on conflict (project_id) do update set content = excluded.content;

      v_pos := 0;
      for s in select * from jsonb_array_elements(f -> 'reserve' -> 'etapes') loop
        v_pos := v_pos + 1;
        insert into public.project_steps (project_id, step_key, position, title, content, retired)
        values (v_id, s ->> 'id', v_pos, s ->> 'titre', s - 'id' - 'titre', false)
        on conflict (project_id, step_key) do update
          set position = excluded.position, title = excluded.title,
              content = excluded.content, retired = false;
      end loop;
    end if;

    v_result := v_result || jsonb_build_object('id', f ->> 'id', 'created', v_created);
  end loop;
  return v_result;
end;
$$;

revoke all on function public.import_fiches_core(jsonb) from public, anon;
grant execute on function public.import_fiches_core(jsonb) to authenticated;
