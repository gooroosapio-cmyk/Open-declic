"use server";
import { revalidatePath } from "next/cache";
import { diffImport, exportFiches, requireAdmin, saveFiches, type FicheDiff } from "@/lib/admin";
import { anyFicheSchema, validateImport, type AnyFiche, type Fiche, type ImportIssue } from "@/lib/fiche-schema";
import { createClient } from "@/lib/supabase/server";

export type AdminResult = { ok: boolean; message?: string; issues?: ImportIssue[] };

function revalidateAll(slug?: string) {
  revalidatePath("/", "layout");
  if (slug) revalidatePath(`/projets/${slug}`);
}

function issuesFromZod(fiche: string, error: { issues: { path: PropertyKey[]; message: string }[] }): ImportIssue[] {
  return error.issues.map((i) => ({ fiche, champ: i.path.map(String).join(".") || "(fiche)", message: i.message }));
}

async function knownCategories(): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("categories").select("slug");
  return (data ?? []).map((c) => c.slug);
}

// ---------------------------------------------------------------------------
// Publication et accès gratuit
// ---------------------------------------------------------------------------

export async function setProjectStatus(projectId: string, slug: string, status: "draft" | "published" | "archived"): Promise<AdminResult> {
  await requireAdmin();
  const supabase = await createClient();
  const patch: Record<string, unknown> = { status };
  if (status === "published") patch.published_at = new Date().toISOString();
  const { error } = await supabase.from("projects").update(patch).eq("id", projectId);
  if (error) return { ok: false, message: "La modification du statut a échoué." };
  revalidateAll(slug);
  return { ok: true, message: status === "published" ? "Fiche publiée." : status === "draft" ? "Fiche repassée en brouillon." : "Fiche archivée." };
}

export async function setProjectFree(projectId: string, slug: string, isFree: boolean): Promise<AdminResult> {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("projects").update({ is_free: isFree }).eq("id", projectId);
  if (error) return { ok: false, message: "La modification de l'accès a échoué." };
  revalidateAll(slug);
  return { ok: true, message: isFree ? "Fiche désormais gratuite." : "Fiche réservée à l'accès complet." };
}

// ---------------------------------------------------------------------------
// Édition d'une fiche (toujours validée par le schéma d'import)
// ---------------------------------------------------------------------------

async function loadFiche(slug: string): Promise<AnyFiche> {
  const f = (await exportFiches([slug])).get(slug);
  if (!f) throw new Error("Fiche introuvable.");
  return structuredClone(f.fiche);
}

async function validateAndSave(slug: string, candidate: unknown): Promise<AdminResult> {
  const parsed = anyFicheSchema.safeParse(candidate);
  if (!parsed.success) return { ok: false, message: "La fiche n'a pas été enregistrée : corrigez les erreurs.", issues: issuesFromZod(slug, parsed.error) };
  if (parsed.data.id !== slug) return { ok: false, message: "L'identifiant stable d'une fiche ne peut pas être modifié.", issues: [{ fiche: slug, champ: "id", message: "Identifiant modifié." }] };
  if (!(await knownCategories()).includes(parsed.data.categorie)) {
    return { ok: false, message: "Catégorie inconnue.", issues: [{ fiche: slug, champ: "categorie", message: "Catégorie inconnue." }] };
  }
  try {
    await saveFiches([parsed.data]);
  } catch (e) {
    return { ok: false, message: (e as Error).message };
  }
  revalidateAll(slug);
  return { ok: true, message: "Modifications enregistrées." };
}

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const intOrNull = (f: FormData, k: string): number | null | "invalid" => {
  const v = str(f, k);
  if (v === "") return null;
  const n = Number(v.replace(/\s/g, ""));
  return Number.isInteger(n) && n >= 0 ? n : "invalid";
};

export async function saveMainInfo(slug: string, _: AdminResult, form: FormData): Promise<AdminResult> {
  await requireAdmin();
  const fiche = await loadFiche(slug);
  const nums: Record<string, number | null> = {};
  for (const k of ["bl_min", "bl_max", "dm_min", "dm_max", "hh_min", "hh_max"]) {
    const v = intOrNull(form, k);
    if (v === "invalid") return { ok: false, message: "Montants et durées : nombres entiers positifs ou champ vide (inconnu).", issues: [{ fiche: slug, champ: k, message: "Nombre entier positif attendu." }] };
    nums[k] = v;
  }
  fiche.titre = str(form, "titre");
  fiche.resume = str(form, "resume");
  fiche.categorie = str(form, "categorie");
  fiche.version = str(form, "version");
  fiche.date_verification = str(form, "date_verification") || null;
  fiche.difficulte = { niveau: str(form, "niveau") as Fiche["difficulte"]["niveau"], explication: str(form, "explication") };
  fiche.filtres = {
    budget_lancement: { min: nums.bl_min, max: nums.bl_max },
    depenses_mensuelles: { min: nums.dm_min, max: nums.dm_max },
    heures_hebdo: { min: nums.hh_min, max: nums.hh_max },
  };
  return validateAndSave(slug, fiche);
}

export async function saveStep(slug: string, stepKey: string, _: AdminResult, form: FormData): Promise<AdminResult> {
  await requireAdmin();
  const fiche = await loadFiche(slug);
  if (fiche.niveau_contenu !== "complete") return { ok: false, message: "Un modèle n'a pas d'étapes." };
  const step = fiche.reserve.etapes.find((s) => s.id === stepKey);
  if (!step) return { ok: false, message: "Étape introuvable." };
  const model = (k: string) => ({ nom: str(form, `${k}_nom`) || null, note: str(form, `${k}_note`) || undefined });
  step.titre = str(form, "titre");
  step.objectif = str(form, "objectif");
  step.outil = { nom: str(form, "outil_nom"), url: str(form, "outil_url") || null };
  step.modeles = {
    minimum: model("min"),
    recommande: model("rec"),
    economique: str(form, "eco_nom") || str(form, "eco_note") ? model("eco") : null,
    date_verification: str(form, "date_verification") || null,
    source: str(form, "source") || null,
  };
  step.prompt = {
    ...step.prompt,
    titre: str(form, "prompt_titre"),
    mission: str(form, "mission"),
    a_quoi_sert: str(form, "a_quoi_sert"),
    comment_utiliser: str(form, "comment_utiliser"),
  };
  step.verification = str(form, "verification");
  return validateAndSave(slug, fiche);
}

export async function saveFicheJson(slug: string, _: AdminResult, form: FormData): Promise<AdminResult> {
  await requireAdmin();
  let candidate: unknown;
  try {
    candidate = JSON.parse(str(form, "json"));
  } catch (e) {
    return { ok: false, message: `JSON illisible : ${(e as Error).message}` };
  }
  return validateAndSave(slug, candidate);
}

/** Retire explicitement une étape (masquée, progression conservée). */
export async function setStepRetired(projectId: string, slug: string, stepKey: string, retired: boolean): Promise<AdminResult> {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("project_steps").update({ retired }).eq("project_id", projectId).eq("step_key", stepKey);
  if (error) return { ok: false, message: "La modification de l'étape a échoué." };
  revalidateAll(slug);
  return { ok: true, message: retired ? "Étape retirée (progression conservée)." : "Étape rétablie." };
}

// ---------------------------------------------------------------------------
// Visuels
// ---------------------------------------------------------------------------

const ALLOWED = ["image/png", "image/jpeg", "image/webp"];

export async function addVisual(slug: string, _: AdminResult, form: FormData): Promise<AdminResult> {
  await requireAdmin();
  const file = form.get("fichier");
  const alt = str(form, "alt");
  const legende = str(form, "legende");
  if (!alt) return { ok: false, message: "La description accessible est obligatoire." };
  if (!(file instanceof File) || file.size === 0) return { ok: false, message: "Choisissez une image." };
  if (!ALLOWED.includes(file.type)) return { ok: false, message: "Formats acceptés : PNG, JPEG, WebP." };
  if (file.size > 4 * 1024 * 1024) return { ok: false, message: "Image trop lourde (4 Mo maximum)." };
  const supabase = await createClient();
  const ext = file.type.split("/")[1].replace("jpeg", "jpg");
  const path = `${slug}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("visuels").upload(path, file, { contentType: file.type, upsert: false });
  if (error) return { ok: false, message: "L'envoi de l'image a échoué." };
  const url = supabase.storage.from("visuels").getPublicUrl(path).data.publicUrl;
  const fiche = await loadFiche(slug);
  fiche.apercu.visuels = [...fiche.apercu.visuels, { url, alt, legende }];
  return validateAndSave(slug, fiche);
}

export async function updateVisual(slug: string, index: number, action: "remove" | "first", alt?: string): Promise<AdminResult> {
  await requireAdmin();
  const fiche = await loadFiche(slug);
  const v = fiche.apercu.visuels;
  if (!v[index]) return { ok: false, message: "Visuel introuvable." };
  if (action === "remove") v.splice(index, 1);
  else v.unshift(...v.splice(index, 1));
  if (alt !== undefined && action === "first") v[0].alt = alt;
  return validateAndSave(slug, fiche);
}

// ---------------------------------------------------------------------------
// Accès complet (attribution / révocation tracées par la base)
// ---------------------------------------------------------------------------

export async function setFullAccess(userId: string, grant: boolean, note: string): Promise<AdminResult> {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_set_full_access", { p_user: userId, p_grant: grant, p_note: note.trim() || null });
  if (error) return { ok: false, message: error.message || "L'opération a échoué." };
  revalidatePath("/admin/acces");
  return { ok: true, message: grant ? "Accès complet attribué." : "Accès complet révoqué." };
}

// ---------------------------------------------------------------------------
// Import
// ---------------------------------------------------------------------------

export type ImportPreview =
  | { ok: false; message: string; issues: ImportIssue[] }
  | { ok: true; diffs: FicheDiff[]; count: number };

function parseJson(text: string): { ok: true; value: unknown } | { ok: false; message: string } {
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch (e) {
    return { ok: false, message: `Le fichier n'est pas un JSON valide : ${(e as Error).message}` };
  }
}

export async function previewImport(text: string): Promise<ImportPreview> {
  await requireAdmin();
  const parsed = parseJson(text);
  if (!parsed.ok) return { ok: false, message: parsed.message, issues: [] };
  const v = validateImport(parsed.value, await knownCategories());
  if (!v.ok) return { ok: false, message: `${v.issues.length} erreur${v.issues.length > 1 ? "s" : ""} : rien n'a été enregistré.`, issues: v.issues };
  return { ok: true, diffs: await diffImport(v.fiches), count: v.fiches.length };
}

export async function confirmImport(text: string): Promise<AdminResult> {
  await requireAdmin();
  const parsed = parseJson(text);
  if (!parsed.ok) return { ok: false, message: parsed.message };
  // Revalidation complète au moment de l'enregistrement.
  const v = validateImport(parsed.value, await knownCategories());
  if (!v.ok) return { ok: false, message: "Le fichier n'est plus valide.", issues: v.issues };
  try {
    const r = await saveFiches(v.fiches);
    revalidateAll();
    const created = r.filter((x) => x.created).length;
    return { ok: true, message: `Import terminé : ${created} fiche${created > 1 ? "s" : ""} créée${created > 1 ? "s" : ""} en brouillon, ${r.length - created} mise${r.length - created > 1 ? "s" : ""} à jour.` };
  } catch (e) {
    return { ok: false, message: (e as Error).message };
  }
}

// ---------------------------------------------------------------------------
// Réglages
// ---------------------------------------------------------------------------

export async function saveContactSetting(_: AdminResult, form: FormData): Promise<AdminResult> {
  const viewer = await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("app_settings").upsert({ key: "acces_contact", value: { texte: str(form, "texte") }, updated_by: viewer.userId, updated_at: new Date().toISOString() });
  if (error) return { ok: false, message: "L'enregistrement a échoué." };
  revalidateAll();
  return { ok: true, message: "Réglage enregistré." };
}

export async function saveCategory(_: AdminResult, form: FormData): Promise<AdminResult> {
  await requireAdmin();
  const slug = str(form, "slug");
  const label = str(form, "label");
  const position = Number(str(form, "position") || "0");
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) return { ok: false, message: "Identifiant : minuscules, chiffres et tirets." };
  if (!label) return { ok: false, message: "Libellé obligatoire." };
  const supabase = await createClient();
  const { error } = await supabase.from("categories").upsert({ slug, label, position: Number.isFinite(position) ? position : 0 });
  if (error) return { ok: false, message: "L'enregistrement a échoué." };
  revalidateAll();
  return { ok: true, message: "Catégorie enregistrée." };
}

/** Publie en une fois toutes les fiches en brouillon (après un import initial). */
export async function publishAllDrafts(): Promise<AdminResult> {
  await requireAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .update({ status: "published", published_at: new Date().toISOString() })
    .eq("status", "draft")
    .select("id");
  if (error) return { ok: false, message: "La publication a échoué." };
  revalidateAll();
  const n = data?.length ?? 0;
  return { ok: true, message: n === 0 ? "Aucun brouillon à publier." : `${n} fiche${n > 1 ? "s" : ""} publiée${n > 1 ? "s" : ""}.` };
}
