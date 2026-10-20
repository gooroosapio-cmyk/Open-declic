import { expect, test } from "@playwright/test";
import { createUser, login, sql } from "./helpers";

test("import du catalogue V1 complet par l'administration, puis publication groupée", async ({ page }) => {
  test.setTimeout(300_000);
  // Base locale uniquement : on repart d'un catalogue vide, comme en production.
  sql("delete from public.projects where od_number is not null");
  const admin = await createUser("import-v1", { admin: true });
  await login(page, admin.email, "/admin/import");
  await page.getByLabel("Fichier JSON").setInputFiles("content/catalogue-v1.json");
  await page.getByRole("button", { name: "1. Vérifier et prévisualiser" }).click();
  await expect(page.getByRole("heading", { name: "Aperçu : 200 fiches valides" })).toBeVisible({ timeout: 60_000 });
  await page.getByRole("button", { name: "2. Confirmer l'import (200 fiches)" }).click();
  await expect(page.getByText(/200 fiches créées en brouillon/)).toBeVisible({ timeout: 120_000 });
  expect(sql("select count(*) from public.projects where od_number is not null and status = 'draft'")).toBe("200");
  await page.goto("/admin");
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: /^Publier tous les brouillons/ }).click();
  await expect(page.getByText(/fiches publiées\./)).toBeVisible({ timeout: 60_000 });
  expect(sql("select count(*) || '/' || sum(featured::int) || '/' || sum(is_free::int) from public.projects where od_number is not null and status = 'published'")).toBe("200/10/2");
});
