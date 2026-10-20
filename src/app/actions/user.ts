"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/**
 * Actions personnelles. Chaque réponse ne signale un succès qu'après
 * confirmation de la base ; les règles RLS refusent toute écriture
 * sur les données d'un autre compte ou sur un contenu non autorisé.
 */
export type ActionResult = { ok: true } | { ok: false; error: string; needsLogin?: boolean };

async function currentUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return { supabase, user };
}

const LOGIN: ActionResult = { ok: false, error: "Connectez-vous pour enregistrer.", needsLogin: true };
const SAVE_FAILED = "L'enregistrement a échoué. Vérifiez votre connexion puis réessayez.";

export async function setFavorite(projectId: string, favorite: boolean): Promise<ActionResult> {
  const { supabase, user } = await currentUser();
  if (!user) return LOGIN;
  const { error } = favorite
    ? await supabase.from("favorites").upsert({ user_id: user.id, project_id: projectId }, { onConflict: "user_id,project_id", ignoreDuplicates: true })
    : await supabase.from("favorites").delete().eq("user_id", user.id).eq("project_id", projectId);
  if (error) return { ok: false, error: SAVE_FAILED };
  revalidatePath("/mes-projets");
  return { ok: true };
}

export async function startProject(projectId: string): Promise<ActionResult> {
  const { supabase, user } = await currentUser();
  if (!user) return LOGIN;
  const { error } = await supabase
    .from("user_projects")
    .upsert({ user_id: user.id, project_id: projectId }, { onConflict: "user_id,project_id", ignoreDuplicates: true });
  if (error) {
    return { ok: false, error: error.code === "42501" ? "Ce kit est réservé à l'accès complet." : SAVE_FAILED };
  }
  revalidatePath("/mes-projets");
  revalidatePath("/mes-kits");
  return { ok: true };
}

export async function setStepValidated(projectId: string, stepKey: string, validated: boolean): Promise<ActionResult> {
  const { supabase, user } = await currentUser();
  if (!user) return LOGIN;
  // Démarrer le projet si ce n'est pas déjà fait, puis enregistrer l'étape.
  const started = await supabase
    .from("user_projects")
    .upsert({ user_id: user.id, project_id: projectId }, { onConflict: "user_id,project_id", ignoreDuplicates: true });
  if (started.error) {
    return { ok: false, error: started.error.code === "42501" ? "Ce kit est réservé à l'accès complet." : SAVE_FAILED };
  }
  const { error } = validated
    ? await supabase.from("step_progress").upsert(
        { user_id: user.id, project_id: projectId, step_key: stepKey },
        { onConflict: "user_id,project_id,step_key", ignoreDuplicates: true },
      )
    : await supabase.from("step_progress").delete().eq("user_id", user.id).eq("project_id", projectId).eq("step_key", stepKey);
  if (error) return { ok: false, error: SAVE_FAILED };
  await supabase.from("user_projects").update({ current_step_key: stepKey }).eq("user_id", user.id).eq("project_id", projectId);
  revalidatePath("/mes-projets");
  revalidatePath("/mes-kits");
  return { ok: true };
}

export async function stopProject(projectId: string): Promise<ActionResult> {
  const { supabase, user } = await currentUser();
  if (!user) return LOGIN;
  // La progression des étapes est conservée : on retire seulement le projet de la liste.
  const { error } = await supabase.from("user_projects").delete().eq("user_id", user.id).eq("project_id", projectId);
  if (error) return { ok: false, error: SAVE_FAILED };
  revalidatePath("/mes-projets");
  revalidatePath("/mes-kits");
  return { ok: true };
}
