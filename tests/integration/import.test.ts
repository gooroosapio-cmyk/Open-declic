import { readFileSync } from "node:fs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { validateImport, type Fiche } from "@/lib/fiche-schema";
import { makeAdmin, newUser, sql } from "./helpers";

const CATS = ["saas", "site-web", "application-mobile", "jeu"];
const SLUG = `test-import-${Date.now().toString(36)}`;
let admin: { id: string; client: SupabaseClient };
let user: { id: string; client: SupabaseClient };

function sample(): Fiche {
  const r = validateImport(JSON.parse(readFileSync("content/demo-fiches.json", "utf8")), CATS);
  if (!r.ok) throw new Error("exemple invalide");
  return { ...structuredClone(r.fiches[0]), id: SLUG, demonstration: false, acces: { gratuit: true } };
}
const payload = (fiches: Fiche[]) => ({ schema_version: "1.0", fiches });

beforeAll(async () => {
  admin = await newUser("import-admin");
  makeAdmin(admin.id);
  user = await newUser("import-user");
});
afterAll(() => {
  sql(`delete from public.projects where slug = '${SLUG}'`);
});

describe("import", () => {
  it("refuse un non-administrateur", async () => {
    const { error } = await user.client.rpc("admin_import_fiches", { p_payload: payload([sample()]) });
    expect(error?.code).toBe("42501");
    const core = await user.client.rpc("import_fiches_core", { p_payload: payload([sample()]) });
    expect(core.error).not.toBeNull(); // bloqué par RLS
    expect(sql(`select count(*) from public.projects where slug = '${SLUG}'`)).toBe("0");
  });

  it("crée une nouvelle fiche en brouillon", async () => {
    const { data, error } = await admin.client.rpc("admin_import_fiches", { p_payload: payload([sample()]) });
    expect(error).toBeNull();
    expect(data).toEqual([{ id: SLUG, created: true }]);
    expect(sql(`select status || ',' || is_free from public.projects where slug = '${SLUG}'`)).toBe("draft,true");
  });

  it("un import répété ne crée pas de doublon et préserve statut, accès et progression", async () => {
    const pid = sql(`select id from public.projects where slug = '${SLUG}'`);
    sql(`update public.projects set status = 'published' where id = '${pid}'`);
    expect((await user.client.from("step_progress").insert({ project_id: pid, step_key: "decrire-ecrans" })).error).toBeNull();

    const f = sample();
    f.titre = "Titre mis à jour";
    f.acces.gratuit = false; // ignoré pour une fiche existante
    f.reserve.etapes = f.reserve.etapes.filter((s) => s.id !== "tester-demande"); // absente : conservée
    f.reserve.etapes[0].objectif = "Objectif modifié";
    const { data, error } = await admin.client.rpc("admin_import_fiches", { p_payload: payload([f]) });
    expect(error).toBeNull();
    expect(data).toEqual([{ id: SLUG, created: false }]);

    expect(sql(`select count(*) from public.projects where slug = '${SLUG}'`)).toBe("1");
    expect(sql(`select title || ',' || status || ',' || is_free from public.projects where id = '${pid}'`)).toBe("Titre mis à jour,published,true");
    expect(sql(`select count(*) from public.project_steps where project_id = '${pid}'`)).toBe("3");
    expect(sql(`select content->>'objectif' from public.project_steps where project_id = '${pid}' and step_key = 'decrire-ecrans'`)).toBe("Objectif modifié");
    expect(sql(`select count(*) from public.step_progress where project_id = '${pid}'`)).toBe("1");
  });

  it("un JSON invalide est refusé avant tout enregistrement", () => {
    const f = sample() as unknown as Record<string, unknown>;
    delete f.resume;
    const r = validateImport(payload([f as unknown as Fiche]), CATS);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.issues[0]).toMatchObject({ champ: "resume" });
  });
});
