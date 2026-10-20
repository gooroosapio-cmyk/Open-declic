-- Open declic — import structuré des fiches et données de référence
--
-- Le JSON est validé côté serveur (src/lib/fiche-schema.ts) AVANT l'appel.
-- Cette fonction applique l'import en une seule transaction :
--   * identifiant stable = slug de la fiche, step_key de l'étape ;
--   * une nouvelle fiche est toujours créée en brouillon ;
--   * une fiche existante garde son statut et son réglage gratuit/complet ;
--   * aucune suppression implicite : les étapes absentes du fichier sont conservées ;
--   * la progression (step_progress) n'est jamais modifiée.

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
  v_result jsonb := '[]'::jsonb;
  v_pos int;
begin
  for f in select * from jsonb_array_elements(p_payload -> 'fiches') loop
    select id into v_id from public.projects where slug = f ->> 'id';
    v_created := v_id is null;

    if v_created then
      insert into public.projects (slug, status, is_free, is_demo, title, summary, category, difficulty)
      values (f ->> 'id', 'draft', (f -> 'acces' ->> 'gratuit')::boolean,
              coalesce((f ->> 'demonstration')::boolean, false),
              f ->> 'titre', f ->> 'resume', f ->> 'categorie', f -> 'difficulte' ->> 'niveau')
      returning id into v_id;
    end if;

    update public.projects set
      is_demo = coalesce((f ->> 'demonstration')::boolean, false),
      title = f ->> 'titre',
      summary = f ->> 'resume',
      category = f ->> 'categorie',
      countries = array(select jsonb_array_elements_text(f -> 'pays')),
      difficulty = f -> 'difficulte' ->> 'niveau',
      skills = array(select jsonb_array_elements_text(f -> 'competences')),
      equipment = array(select jsonb_array_elements_text(f -> 'materiel')),
      launch_budget_min = (f -> 'filtres' -> 'budget_lancement' ->> 'min')::int,
      launch_budget_max = (f -> 'filtres' -> 'budget_lancement' ->> 'max')::int,
      monthly_cost_min = (f -> 'filtres' -> 'depenses_mensuelles' ->> 'min')::int,
      monthly_cost_max = (f -> 'filtres' -> 'depenses_mensuelles' ->> 'max')::int,
      weekly_hours_min = (f -> 'filtres' -> 'heures_hebdo' ->> 'min')::int,
      weekly_hours_max = (f -> 'filtres' -> 'heures_hebdo' ->> 'max')::int,
      public_content = (f -> 'apercu') || jsonb_build_object('difficulte_explication', f -> 'difficulte' ->> 'explication'),
      content_version = f ->> 'version',
      schema_version = p_payload ->> 'schema_version',
      verified_at = (f ->> 'date_verification')::date
    where id = v_id;

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

    v_result := v_result || jsonb_build_object('id', f ->> 'id', 'created', v_created);
  end loop;
  return v_result;
end;
$$;

revoke all on function public.import_fiches_core(jsonb) from public, anon, authenticated;

create or replace function public.admin_import_fiches(p_payload jsonb)
returns jsonb
language plpgsql
volatile
security invoker
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Accès refusé : rôle administrateur requis.' using errcode = '42501';
  end if;
  return public.import_fiches_core(p_payload);
end;
$$;

-- admin_import_fiches s'exécute avec les droits de l'appelant (RLS admin),
-- il a donc besoin d'appeler le cœur.
grant execute on function public.import_fiches_core(jsonb) to authenticated;
revoke all on function public.admin_import_fiches(jsonb) from public, anon;
grant execute on function public.admin_import_fiches(jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- Données de référence
-- ---------------------------------------------------------------------------

insert into public.categories (slug, label, position) values
  ('saas', 'SaaS', 1),
  ('site-web', 'Site web', 2),
  ('application-mobile', 'Application mobile', 3),
  ('jeu', 'Jeu', 4)
on conflict (slug) do nothing;

insert into public.app_settings (key, value) values
  ('acces_contact', '{"texte": ""}'::jsonb)
on conflict (key) do nothing;
