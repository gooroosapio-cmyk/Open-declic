import { execSync } from "node:child_process";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Valeurs de l'instance LOCALE (`npx supabase status -o env`), jamais d'une instance distante.
const env = Object.fromEntries(
  execSync("npx supabase status -o env", { encoding: "utf8" })
    .split("\n")
    .map((l) => l.match(/^([A-Z_]+)="?(.*?)"?$/))
    .filter((m): m is RegExpMatchArray => Boolean(m))
    .map((m) => [m[1], m[2]]),
);
export const API_URL: string = env.API_URL;
export const PUBLISHABLE_KEY: string = env.PUBLISHABLE_KEY;
const SECRET_KEY: string = env.SECRET_KEY;
export const DB_URL: string = env.DB_URL;
if (!API_URL?.startsWith("http://127.0.0.1")) throw new Error("Les tests d'intégration ne s'exécutent que sur la base locale.");

export const anon = () => createClient(API_URL, PUBLISHABLE_KEY, { auth: { persistSession: false } });
const service = () => createClient(API_URL, SECRET_KEY, { auth: { persistSession: false } });

export const sql = (q: string) => execSync(`psql "${DB_URL}" -v ON_ERROR_STOP=1 -tA -c ${JSON.stringify(q)}`, { encoding: "utf8" }).trim();

const RUN = Date.now().toString(36);
export async function newUser(label: string): Promise<{ id: string; email: string; client: SupabaseClient }> {
  const email = `${label}-${RUN}@test.local`;
  const password = "motdepasse-test-123";
  const { data, error } = await service().auth.admin.createUser({ email, password, email_confirm: true });
  if (error) throw error;
  const client = createClient(API_URL, PUBLISHABLE_KEY, { auth: { persistSession: false } });
  const { error: e2 } = await client.auth.signInWithPassword({ email, password });
  if (e2) throw e2;
  return { id: data.user.id, email, client };
}

/** Promotion admin documentée : uniquement en SQL, jamais depuis l'application. */
export function makeAdmin(userId: string) {
  sql(`insert into public.user_roles (user_id, role) values ('${userId}', 'admin') on conflict do nothing`);
}

export function projectId(slug: string): string {
  return sql(`select id from public.projects where slug = '${slug}'`);
}
