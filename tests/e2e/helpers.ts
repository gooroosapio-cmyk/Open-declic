import { expect, type Page } from "@playwright/test";
import { execSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";

const env = Object.fromEntries(
  execSync("npx supabase status -o env", { encoding: "utf8" }).split("\n")
    .map((l) => l.match(/^([A-Z_]+)="?(.*?)"?$/)).filter((m): m is RegExpMatchArray => Boolean(m)).map((m) => [m[1], m[2]]),
);
if (!env.API_URL?.startsWith("http://127.0.0.1")) throw new Error("Tests réservés à la base locale.");
export const MAILPIT = env.MAILPIT_URL as string;
export const PASSWORD = "motdepasse-e2e-123";
const service = createClient(env.API_URL, env.SECRET_KEY, { auth: { persistSession: false } });
export const sql = (q: string) => execSync(`psql "${env.DB_URL}" -v ON_ERROR_STOP=1 -tA -c ${JSON.stringify(q)}`, { encoding: "utf8" }).trim();

export async function createUser(label: string, opts: { admin?: boolean; full?: boolean } = {}) {
  const email = `${label}-${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}@e2e.local`;
  const { data, error } = await service.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true });
  if (error) throw error;
  if (opts.admin) sql(`insert into public.user_roles (user_id, role) values ('${data.user.id}', 'admin')`);
  if (opts.full) sql(`insert into public.full_access (user_id, note) values ('${data.user.id}', 'e2e')`);
  return { id: data.user.id, email };
}

export async function login(page: Page, email: string, next = "/") {
  await page.goto(`/connexion?next=${encodeURIComponent(next)}`);
  await page.getByLabel("Adresse e-mail").fill(email);
  await page.getByLabel("Mot de passe", { exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/connexion"));
}

export async function logout(page: Page) {
  await page.goto("/compte");
  await page.getByRole("button", { name: "Se déconnecter" }).click();
  await expect(page.getByRole("link", { name: "Se connecter", exact: true })).toBeVisible();
}
