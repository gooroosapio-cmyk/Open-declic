import { beforeAll, describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { anon, makeAdmin, newUser, projectId } from "./helpers";

const FREE = "demo-rendez-vous-salons";
const RESERVED = "demo-carnet-couture";
let free: { id: string; client: SupabaseClient };
let member: { id: string; client: SupabaseClient };
let admin: { id: string; client: SupabaseClient };
let freeId: string, reservedId: string;

beforeAll(async () => {
  free = await newUser("gratuit");
  member = await newUser("membre");
  admin = await newUser("admin");
  makeAdmin(admin.id);
  freeId = projectId(FREE);
  reservedId = projectId(RESERVED);
  const { error } = await admin.client.rpc("admin_set_full_access", { p_user: member.id, p_grant: true, p_note: "test" });
  if (error) throw error;
});

describe("visiteur", () => {
  it("voit les aperçus publiés", async () => {
    const { data } = await anon().from("projects").select("slug").eq("status", "published");
    expect(data!.map((p) => p.slug)).toEqual(expect.arrayContaining([FREE, RESERVED]));
  });
  it("lit le contenu d'une fiche gratuite", async () => {
    const { data } = await anon().from("project_steps").select("step_key").eq("project_id", freeId);
    expect(data!.length).toBeGreaterThan(0);
  });
  it("ne reçoit aucun contenu réservé par accès direct", async () => {
    const steps = await anon().from("project_steps").select("content").eq("project_id", reservedId);
    const kit = await anon().from("project_kits").select("content").eq("project_id", reservedId);
    expect(steps.data).toEqual([]);
    expect(kit.data).toEqual([]);
  });
  it("voit le plan public (titres) sans le contenu", async () => {
    const { data } = await anon().rpc("project_outline", { p_project: reservedId });
    expect(data!.length).toBe(2);
    expect(Object.keys(data![0]).sort()).toEqual(["position", "step_key", "title"]);
  });
  it("ne peut pas écrire de favori ni de progression", async () => {
    const { error } = await anon().from("favorites").insert({ project_id: freeId });
    expect(error).not.toBeNull();
  });
});

describe("utilisateur gratuit", () => {
  it("ne lit pas le contenu réservé", async () => {
    const { data } = await free.client.from("project_steps").select("content").eq("project_id", reservedId);
    expect(data).toEqual([]);
  });
  it("ne peut pas valider une étape d'une fiche réservée", async () => {
    const { error } = await free.client.from("step_progress").insert({ user_id: free.id, project_id: reservedId, step_key: "concevoir-ecrans" });
    expect(error?.code).toBe("42501");
  });
  it("ne peut pas s'attribuer l'accès complet", async () => {
    const rpc = await free.client.rpc("admin_set_full_access", { p_user: free.id, p_grant: true });
    expect(rpc.error?.code).toBe("42501");
    const direct = await free.client.from("full_access").insert({ user_id: free.id });
    expect(direct.error).not.toBeNull();
    const role = await free.client.from("user_roles").insert({ user_id: free.id, role: "admin" });
    expect(role.error).not.toBeNull();
    const { data } = await free.client.rpc("has_full_access");
    expect(data).toBe(false);
  });
  it("ne peut pas modifier une fiche ni publier", async () => {
    const { data } = await free.client.from("projects").update({ is_free: true }).eq("id", reservedId).select();
    expect(data).toEqual([]);
  });
  it("enregistre favoris et progression sur une fiche gratuite", async () => {
    expect((await free.client.from("favorites").insert({ project_id: freeId })).error).toBeNull();
    expect((await free.client.from("user_projects").insert({ project_id: freeId })).error).toBeNull();
    expect((await free.client.from("step_progress").insert({ project_id: freeId, step_key: "decrire-ecrans" })).error).toBeNull();
  });
  it("ne voit pas les données d'un autre compte", async () => {
    const { data } = await member.client.from("step_progress").select("*").eq("user_id", free.id);
    expect(data).toEqual([]);
    const other = await member.client.from("favorites").insert({ user_id: free.id, project_id: reservedId });
    expect(other.error).not.toBeNull();
  });
  it("ne peut pas lister les comptes ni lire le journal", async () => {
    expect((await free.client.rpc("admin_list_users", { p_search: "" })).error?.code).toBe("42501");
    expect((await free.client.from("access_audit").select("*")).data).toEqual([]);
  });
});

describe("membre complet", () => {
  it("lit le contenu réservé et peut progresser", async () => {
    const { data } = await member.client.from("project_steps").select("step_key").eq("project_id", reservedId);
    expect(data!.length).toBe(2);
    expect((await member.client.from("step_progress").insert({ project_id: reservedId, step_key: "concevoir-ecrans" })).error).toBeNull();
  });
  it("ne lit pas les brouillons", async () => {
    const { data } = await member.client.from("projects").select("slug").neq("status", "published");
    expect(data).toEqual([]);
  });
});

describe("administrateur", () => {
  it("attribue et révoque avec trace", async () => {
    const target = await newUser("cible");
    expect((await admin.client.rpc("admin_set_full_access", { p_user: target.id, p_grant: true, p_note: "paiement test" })).error).toBeNull();
    expect((await target.client.rpc("has_full_access")).data).toBe(true);
    const dup = await admin.client.rpc("admin_set_full_access", { p_user: target.id, p_grant: true });
    expect(dup.error?.message).toContain("déjà");
    expect((await admin.client.rpc("admin_set_full_access", { p_user: target.id, p_grant: false, p_note: "remboursé" })).error).toBeNull();
    expect((await target.client.rpc("has_full_access")).data).toBe(false);
    const { data: audit } = await admin.client.from("access_audit").select("action, note, actor").eq("target_user", target.id).order("id");
    expect(audit).toEqual([
      { action: "grant", note: "paiement test", actor: admin.id },
      { action: "revoke", note: "remboursé", actor: admin.id },
    ]);
  });
  it("la révocation retire l'accès mais conserve la progression", async () => {
    expect((await admin.client.rpc("admin_set_full_access", { p_user: member.id, p_grant: false })).error).toBeNull();
    expect((await member.client.from("project_steps").select("step_key").eq("project_id", reservedId)).data).toEqual([]);
    expect((await member.client.from("step_progress").select("step_key").eq("project_id", reservedId)).data).toEqual([{ step_key: "concevoir-ecrans" }]);
  });
  it("liste les comptes", async () => {
    const { data, error } = await admin.client.rpc("admin_list_users", { p_search: "gratuit-" });
    expect(error).toBeNull();
    expect(data!.length).toBeGreaterThan(0);
  });
});
