import "server-only";
import { cache } from "react";
import { createClient, isSupabaseConfigured } from "./supabase/server";
import type { FicheApercu, KitContent, ModeleApercu, StepContent } from "./fiche-schema";
import type { ProjectContext } from "./prompt-builder";

export type Viewer = {
  configured: boolean;
  userId: string | null;
  email: string | null;
  emailConfirmed: boolean;
  isAdmin: boolean;
  hasFullAccess: boolean;
};

export type ProjectSummary = {
  id: string;
  slug: string;
  status: "draft" | "published" | "archived";
  isFree: boolean;
  isDemo: boolean;
  title: string;
  summary: string;
  category: string;
  countries: string[];
  difficulty: string;
  skills: string[];
  equipment: string[];
  launchBudget: { min: number | null; max: number | null };
  monthlyCost: { min: number | null; max: number | null };
  weeklyHours: { min: number | null; max: number | null };
  verifiedAt: string | null;
  updatedAt: string;
  visual: { url: string; alt: string } | null;
  contentLevel: "complete" | "modele";
  odNumber: string | null;
  workName: string | null;
  domain: string | null;
  clientType: string | null;
  aiUsage: string | null;
  evidence: string | null;
  featured: boolean;
};

/** Aperçu public : complet pour une fiche, réduit pour un modèle. */
export type PublicContent = (FicheApercu | (ModeleApercu & Partial<Record<Exclude<keyof FicheApercu, keyof ModeleApercu>, undefined>>)) & {
  difficulte_explication?: string;
};
export const isCompleteApercu = (a: PublicContent): a is FicheApercu & { difficulte_explication?: string } => "client_cible" in a && Boolean(a.client_cible);

export type ProjectDetail = ProjectSummary & {
  apercu: PublicContent;
  contentVersion: string;
  outline: { step_key: string; position: number; title: string }[];
};

export type ReservedContent = {
  kit: KitContent;
  steps: (StepContent & { step_key: string; titre: string; position: number })[];
};

const SUMMARY_COLUMNS =
  "id, slug, status, is_free, is_demo, title, summary, category, countries, difficulty, skills, equipment, launch_budget_min, launch_budget_max, monthly_cost_min, monthly_cost_max, weekly_hours_min, weekly_hours_max, verified_at, updated_at, content_version, content_level, od_number, work_name, domain, client_type, ai_usage, evidence, featured";
// Le catalogue n'a besoin que des visuels, pas de tout l'aperçu.
const LIST_COLUMNS = `${SUMMARY_COLUMNS}, visuels:public_content->visuels`;
const PROJECT_COLUMNS = `${SUMMARY_COLUMNS}, public_content`;

type Row = {
  id: string; slug: string; status: ProjectSummary["status"]; is_free: boolean; is_demo: boolean; title: string;
  summary: string; category: string; countries: string[]; difficulty: string; skills: string[]; equipment: string[];
  launch_budget_min: number | null; launch_budget_max: number | null; monthly_cost_min: number | null;
  monthly_cost_max: number | null; weekly_hours_min: number | null; weekly_hours_max: number | null;
  verified_at: string | null; updated_at: string; content_version: string; public_content?: PublicContent;
  visuels?: { url: string; alt: string }[] | null;
  content_level: "complete" | "modele"; od_number: string | null; work_name: string | null; domain: string | null;
  client_type: string | null; ai_usage: string | null; evidence: string | null; featured: boolean;
};

function toSummary(r: Row): ProjectSummary {
  const v = (r.visuels ?? r.public_content?.visuels)?.[0];
  return {
    id: r.id, slug: r.slug, status: r.status, isFree: r.is_free, isDemo: r.is_demo, title: r.title,
    summary: r.summary, category: r.category, countries: r.countries, difficulty: r.difficulty,
    skills: r.skills, equipment: r.equipment,
    launchBudget: { min: r.launch_budget_min, max: r.launch_budget_max },
    monthlyCost: { min: r.monthly_cost_min, max: r.monthly_cost_max },
    weeklyHours: { min: r.weekly_hours_min, max: r.weekly_hours_max },
    verifiedAt: r.verified_at, updatedAt: r.updated_at,
    visual: v ? { url: v.url, alt: v.alt } : null,
    contentLevel: r.content_level, odNumber: r.od_number, workName: r.work_name, domain: r.domain,
    clientType: r.client_type, aiUsage: r.ai_usage, evidence: r.evidence, featured: r.featured,
  };
}

export class DataError extends Error {}

export const getViewer = cache(async (): Promise<Viewer> => {
  const empty: Viewer = { configured: isSupabaseConfigured(), userId: null, email: null, emailConfirmed: false, isAdmin: false, hasFullAccess: false };
  if (!empty.configured) return empty;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return empty;
  const [{ data: admin }, { data: full }] = await Promise.all([
    supabase.rpc("is_admin"),
    supabase.rpc("has_full_access"),
  ]);
  return {
    configured: true, userId: user.id, email: user.email ?? null,
    emailConfirmed: Boolean(user.email_confirmed_at), isAdmin: admin === true, hasFullAccess: full === true,
  };
});

export const getCategories = cache(async (): Promise<{ slug: string; label: string }[]> => {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();
  const { data, error } = await supabase.from("categories").select("slug, label").order("position");
  if (error) throw new DataError("Impossible de charger les catégories.");
  return data;
});

/** Fiches publiées (aperçu public uniquement). */
export const listPublishedProjects = cache(async (): Promise<ProjectSummary[]> => {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects").select(LIST_COLUMNS).eq("status", "published").order("od_number", { nullsFirst: false }).order("title");
  if (error) throw new DataError("Impossible de charger le catalogue.");
  return (data as Row[]).map(toSummary);
});

/** Fiche par identifiant stable. Brouillons visibles par l'admin uniquement (RLS). */
export const getProject = cache(async (slug: string): Promise<ProjectDetail | null> => {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.from("projects").select(PROJECT_COLUMNS).eq("slug", slug).maybeSingle();
  if (error) throw new DataError("Impossible de charger la fiche.");
  if (!data) return null;
  const row = data as Row;
  const { data: outline, error: e2 } = await supabase.rpc("project_outline", { p_project: row.id });
  if (e2) throw new DataError("Impossible de charger le plan de la fiche.");
  return { ...toSummary(row), apercu: row.public_content!, contentVersion: row.content_version, outline: outline ?? [] };
});

/**
 * Contenu réservé : n'est renvoyé que si la base l'autorise (RLS).
 * Renvoie null pour un visiteur non autorisé — le contenu n'est jamais lu.
 */
export const getReserved = cache(async (projectId: string): Promise<ReservedContent | null> => {
  const supabase = await createClient();
  const [{ data: kit, error: e1 }, { data: steps, error: e2 }] = await Promise.all([
    supabase.from("project_kits").select("content").eq("project_id", projectId).maybeSingle(),
    supabase.from("project_steps").select("step_key, position, title, content").eq("project_id", projectId).eq("retired", false).order("position"),
  ]);
  if (e1 || e2) throw new DataError("Impossible de charger le contenu du kit.");
  if (!kit) return null;
  return {
    kit: kit.content as KitContent,
    steps: (steps ?? []).map((s) => ({ ...(s.content as StepContent), step_key: s.step_key, titre: s.title, position: s.position })),
  };
});

export function canReadReserved(p: Pick<ProjectSummary, "isFree" | "status">, v: Viewer): boolean {
  return v.isAdmin || (p.status === "published" && (p.isFree || v.hasFullAccess));
}

export function toPromptContext(p: ProjectDetail): ProjectContext {
  return {
    title: p.title, summary: p.summary, countries: p.countries, difficulty: p.difficulty, skills: p.skills,
    equipment: p.equipment, launchBudget: p.launchBudget, monthlyCost: p.monthlyCost, weeklyHours: p.weeklyHours,
    targetClient: p.apercu.client_cible ?? "", problem: p.apercu.probleme, offer: p.apercu.offre ?? p.summary,
    localAdaptation: p.apercu.adaptation_locale,
    aiRole: p.apercu.role_ia ? `${p.apercu.role_ia.construction} ${p.apercu.role_ia.fonctionnement}` : "",
    workName: p.workName, odNumber: p.odNumber,
  };
}

export type UserProjectState = {
  favorite: boolean;
  started: { startedAt: string; currentStepKey: string | null } | null;
  validated: string[];
};

export async function getUserProjectState(projectId: string, viewer: Viewer): Promise<UserProjectState> {
  const empty: UserProjectState = { favorite: false, started: null, validated: [] };
  if (!viewer.userId) return empty;
  const supabase = await createClient();
  const [fav, started, progress] = await Promise.all([
    supabase.from("favorites").select("project_id").eq("project_id", projectId).maybeSingle(),
    supabase.from("user_projects").select("started_at, current_step_key").eq("project_id", projectId).maybeSingle(),
    supabase.from("step_progress").select("step_key").eq("project_id", projectId),
  ]);
  if (fav.error || started.error || progress.error) throw new DataError("Impossible de charger votre progression.");
  return {
    favorite: Boolean(fav.data),
    started: started.data ? { startedAt: started.data.started_at, currentStepKey: started.data.current_step_key } : null,
    validated: (progress.data ?? []).map((p) => p.step_key),
  };
}

export async function getSetting<T>(key: string): Promise<T | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("app_settings").select("value").eq("key", key).maybeSingle();
  return (data?.value as T) ?? null;
}

export type MyProject = ProjectSummary & {
  favorite: boolean;
  started: boolean;
  startedAt: string | null;
  validatedCount: number;
  totalSteps: number;
  nextStep: { step_key: string; title: string } | null;
};

/** Favoris et projets commencés de l'utilisateur connecté. */
export async function getMyProjects(): Promise<MyProject[]> {
  const supabase = await createClient();
  const [fav, started, progress] = await Promise.all([
    supabase.from("favorites").select(`project_id, projects(${SUMMARY_COLUMNS})`).order("created_at", { ascending: false }),
    supabase.from("user_projects").select(`project_id, started_at, updated_at, projects(${SUMMARY_COLUMNS})`).order("updated_at", { ascending: false }),
    supabase.from("step_progress").select("project_id, step_key"),
  ]);
  if (fav.error || started.error || progress.error) throw new DataError("Impossible de charger vos projets.");

  const byId = new Map<string, MyProject>();
  const add = (row: Row | null, patch: Partial<MyProject>) => {
    if (!row) return; // fiche dépubliée : invisible (RLS)
    const cur = byId.get(row.id) ?? { ...toSummary(row), favorite: false, started: false, startedAt: null, validatedCount: 0, totalSteps: 0, nextStep: null };
    byId.set(row.id, { ...cur, ...patch });
  };
  for (const s of started.data ?? []) add(s.projects as unknown as Row, { started: true, startedAt: s.started_at });
  for (const f of fav.data ?? []) add(f.projects as unknown as Row, { favorite: true });

  const validated = new Map<string, Set<string>>();
  for (const p of progress.data ?? []) {
    if (!validated.has(p.project_id)) validated.set(p.project_id, new Set());
    validated.get(p.project_id)!.add(p.step_key);
  }
  await Promise.all(
    [...byId.values()].filter((p) => p.started).map(async (p) => {
      const { data } = await supabase.rpc("project_outline", { p_project: p.id });
      const outline = (data ?? []) as { step_key: string; title: string }[];
      const done = validated.get(p.id) ?? new Set();
      const next = outline.find((s) => !done.has(s.step_key));
      byId.set(p.id, { ...p, totalSteps: outline.length, validatedCount: outline.filter((s) => done.has(s.step_key)).length, nextStep: next ? { step_key: next.step_key, title: next.title } : null });
    }),
  );
  return [...byId.values()];
}
