import "server-only";
import { notFound } from "next/navigation";
import { createClient } from "./supabase/server";
import { getViewer, type PublicContent } from "./data";
import { SCHEMA_VERSION, type AnyFiche, type KitContent, type StepContent } from "./fiche-schema";

/** Garde serveur des pages et actions d'administration (la base revérifie via RLS). */
export async function requireAdmin() {
  const viewer = await getViewer();
  if (!viewer.isAdmin) notFound();
  return viewer;
}

export type AdminProjectRow = {
  id: string; slug: string; title: string; status: "draft" | "published" | "archived"; is_free: boolean; is_demo: boolean;
  category: string; updated_at: string; published_at: string | null; content_version: string;
};

export async function listAllProjects(): Promise<AdminProjectRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .select("id, slug, title, status, is_free, is_demo, category, updated_at, published_at, content_version")
    .order("updated_at", { ascending: false });
  if (error) throw new Error("Impossible de charger les fiches.");
  return data as AdminProjectRow[];
}

/**
 * Reconstitue une fiche au format d'import à partir de la base.
 * Toute modification de l'administration repasse par ce format et sa validation.
 */
export type ExportedFiche = { fiche: AnyFiche; status: string; isFree: boolean; retiredSteps: string[] };

export async function exportFiches(slugs: string[]): Promise<Map<string, ExportedFiche>> {
  const out = new Map<string, ExportedFiche>();
  if (slugs.length === 0) return out;
  const supabase = await createClient();
  const { data: projects, error } = await supabase.from("projects").select("*").in("slug", slugs);
  if (error) throw new Error("Impossible de lire les fiches existantes.");
  if (!projects?.length) return out;
  const ids = projects.map((p) => p.id);
  const [{ data: kits, error: e1 }, { data: steps, error: e2 }] = await Promise.all([
    supabase.from("project_kits").select("project_id, content").in("project_id", ids),
    supabase.from("project_steps").select("project_id, step_key, position, title, content, retired").in("project_id", ids).order("position"),
  ]);
  if (e1 || e2) throw new Error("Impossible de lire le contenu réservé.");
  for (const p of projects) {
    const pc = { ...(p.public_content as PublicContent) };
    const explication = pc.difficulte_explication ?? "";
    delete pc.difficulte_explication;
    const kit = (kits?.find((k) => k.project_id === p.id)?.content ?? {}) as KitContent;
    const ownSteps = (steps ?? []).filter((s) => s.project_id === p.id);
    const common = {
      id: p.slug,
      version: p.content_version,
      demonstration: p.is_demo,
      titre: p.title,
      resume: p.summary,
      categorie: p.category,
      pays: p.countries,
      date_verification: p.verified_at,
      acces: { gratuit: p.is_free },
      difficulte: { niveau: p.difficulty, explication },
      competences: p.skills,
      materiel: p.equipment,
      filtres: {
        budget_lancement: { min: p.launch_budget_min, max: p.launch_budget_max },
        depenses_mensuelles: { min: p.monthly_cost_min, max: p.monthly_cost_max },
        heures_hebdo: { min: p.weekly_hours_min, max: p.weekly_hours_max },
      },
      catalogue: p.od_number
        ? { numero: p.od_number, nom_travail: p.work_name, domaine: p.domain, client: p.client_type, ia_usage: p.ai_usage, preuve: p.evidence, mise_en_avant: p.featured }
        : null,
      apercu: pc,
    };
    const fiche = (p.content_level === "modele"
      ? { ...common, niveau_contenu: "modele" }
      : {
          ...common,
          niveau_contenu: "complete",
          reserve: {
            kit,
            etapes: ownSteps.filter((s) => !s.retired).map((s) => ({ id: s.step_key, titre: s.title, ...(s.content as StepContent) })),
          },
        }) as AnyFiche;
    out.set(p.slug, { fiche, status: p.status, isFree: p.is_free, retiredSteps: ownSteps.filter((s) => s.retired).map((s) => s.step_key) });
  }
  return out;
}

export async function saveFiches(fiches: AnyFiche[]): Promise<{ id: string; created: boolean }[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_import_fiches", { p_payload: { schema_version: SCHEMA_VERSION, fiches } });
  if (error) {
    throw new Error(
      error.code === "42501" ? "Accès refusé : rôle administrateur requis." : error.code === "23514" ? error.message : `L'enregistrement a échoué : ${error.message}`,
    );
  }
  return data as { id: string; created: boolean }[];
}

// ---------------------------------------------------------------------------
// Aperçu d'import : différences champ par champ
// ---------------------------------------------------------------------------

export type FicheDiff = {
  id: string;
  title: string;
  kind: "creation" | "modification" | "identique";
  changedFields: string[];
  steps: { added: string[]; modified: string[]; kept: string[] };
  statusNote: string;
};

const stable = (v: unknown): string => JSON.stringify(v, (_k, val) =>
  val && typeof val === "object" && !Array.isArray(val)
    ? Object.fromEntries(Object.entries(val).sort(([a], [b]) => a.localeCompare(b)))
    : val,
);

const stepsOf = (f: AnyFiche) => (f.niveau_contenu === "complete" ? f.reserve.etapes : []);
const kitOf = (f: AnyFiche): Partial<KitContent> => (f.niveau_contenu === "complete" ? f.reserve.kit : {});

export async function diffImport(fiches: AnyFiche[]): Promise<FicheDiff[]> {
  const existing = await exportFiches(fiches.map((f) => f.id));
  return fiches.map((f) => {
    const cur = existing.get(f.id);
    const level = f.niveau_contenu === "complete" ? "fiche complète" : "modèle";
    if (!cur) {
      return {
        id: f.id, title: f.titre, kind: "creation", changedFields: [],
        steps: { added: stepsOf(f).map((s) => s.id), modified: [], kept: [] },
        statusNote: `Créée en brouillon (${level})${f.niveau_contenu === "complete" ? `, ${f.acces.gratuit ? "gratuite" : "réservée à l'accès complet"}` : ""}.`,
      };
    }
    const changedFields: string[] = [];
    const top = ["niveau_contenu", "version", "demonstration", "titre", "resume", "categorie", "pays", "date_verification", "difficulte", "competences", "materiel", "filtres", "catalogue"] as const;
    for (const k of top) if (stable(f[k]) !== stable(cur.fiche[k])) changedFields.push(k);
    const fa = f.apercu as Record<string, unknown>, ca = cur.fiche.apercu as Record<string, unknown>;
    for (const k of Object.keys({ ...fa, ...ca })) if (stable(fa[k]) !== stable(ca[k])) changedFields.push(`apercu.${k}`);
    const fk = kitOf(f) as Record<string, unknown>, ck = kitOf(cur.fiche) as Record<string, unknown>;
    for (const k of Object.keys({ ...fk, ...ck })) if (stable(fk[k]) !== stable(ck[k])) changedFields.push(`reserve.kit.${k}`);
    if (f.niveau_contenu === "complete" && f.acces.gratuit !== cur.isFree) changedFields.push("acces.gratuit (ignoré : réglage conservé)");
    const curList = stepsOf(cur.fiche);
    const curSteps = new Map(curList.map((s) => [s.id, s]));
    const added: string[] = [], modified: string[] = [];
    stepsOf(f).forEach((s, i) => {
      const old = curSteps.get(s.id);
      if (!old) added.push(s.id);
      else if (stable(s) !== stable(old) || curList.indexOf(old) !== i) modified.push(s.id);
    });
    const kept = [...curSteps.keys()].filter((k) => !stepsOf(f).some((s) => s.id === k));
    const kind = changedFields.filter((c) => !c.startsWith("acces.")).length || added.length || modified.length ? "modification" : "identique";
    return {
      id: f.id, title: f.titre, kind, changedFields, steps: { added, modified, kept },
      statusNote: `Statut « ${cur.status === "published" ? "publiée" : cur.status === "draft" ? "brouillon" : "archivée"} » et accès « ${cur.isFree ? "gratuit" : "complet"} » conservés.${cur.status === "published" && kind === "modification" ? " Attention : les modifications seront visibles immédiatement." : ""}`,
    };
  });
}
