import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { createUser, login, sql } from "./helpers";

test("import : invalide, valide en brouillon, répété, puis publication", async ({ page }) => {
  const admin = await createUser("admin-import", { admin: true });
  const slug = `e2e-import-${Date.now().toString(36)}`;
  const demo = JSON.parse(readFileSync("content/demo-fiches.json", "utf8"));
  const fiche = { ...demo.fiches[1], id: slug, titre: "Fiche importée e2e" };
  const valid = JSON.stringify({ schema_version: "1.0", fiches: [fiche] });
  const invalid = JSON.stringify({ schema_version: "1.0", fiches: [{ ...fiche, resume: "", categorie: "inconnue" }] });

  try {
    await login(page, admin.email, "/admin/import");
    const area = page.getByLabel("Ou collez le contenu");

    await area.fill("{ pas du json");
    await page.getByRole("button", { name: "1. Vérifier et prévisualiser" }).click();
    await expect(page.getByText(/n'est pas un JSON valide/)).toBeVisible();

    await area.fill(invalid);
    await page.getByRole("button", { name: "1. Vérifier et prévisualiser" }).click();
    await expect(page.getByText(/rien n'a été enregistré/)).toBeVisible();
    await expect(page.locator(".issues")).toContainText(`${slug} (n° 1)`);
    await expect(page.locator(".issues")).toContainText("resume");
    await expect(page.locator(".issues")).toContainText("categorie");
    expect(sql(`select count(*) from public.projects where slug = '${slug}'`)).toBe("0");

    await area.fill(valid);
    await page.getByRole("button", { name: "1. Vérifier et prévisualiser" }).click();
    await expect(page.getByText("Ajout", { exact: true })).toBeVisible();
    await expect(page.getByText(/Créée en brouillon/)).toBeVisible();
    await page.getByRole("button", { name: /2\. Confirmer l'import/ }).click();
    await expect(page.getByText(/1 fiche créée en brouillon/)).toBeVisible();
    expect(sql(`select status from public.projects where slug = '${slug}'`)).toBe("draft");

    // Brouillon invisible du public
    const ctx = await page.context().browser()!.newContext();
    const anonPage = await ctx.newPage();
    expect((await anonPage.goto(`/projets/${slug}`))?.status()).toBe(404);

    // Import répété : rien à importer, pas de doublon
    await page.getByRole("button", { name: "1. Vérifier et prévisualiser" }).click();
    await expect(page.getByText("Inchangée", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Rien à importer" })).toBeDisabled();
    expect(sql(`select count(*) from public.projects where slug = '${slug}'`)).toBe("1");

    // Publication depuis l'administration
    await page.goto(`/admin/fiches/${slug}`);
    page.once("dialog", (d) => d.accept());
    await page.getByRole("button", { name: "Publier" }).click();
    await expect(page.getByText("Fiche publiée.")).toBeVisible();
    expect((await anonPage.goto(`/projets/${slug}`))?.status()).toBe(200);

    // Édition validée côté serveur : un titre trop long (81 caractères) est refusé, la saisie est conservée
    const titre = page.locator("details[open]").getByLabel("Titre", { exact: true });
    await titre.fill("x".repeat(81));
    await page.getByRole("button", { name: "Enregistrer les informations" }).click();
    await expect(page.locator(".issues")).toContainText("titre");
    await expect(titre).toHaveValue("x".repeat(81));
    await titre.fill("Titre modifié e2e");
    await page.getByRole("button", { name: "Enregistrer les informations" }).click();
    await expect(page.getByText("Modifications enregistrées.")).toBeVisible();
    expect(sql(`select title from public.projects where slug = '${slug}'`)).toBe("Titre modifié e2e");
    await ctx.close();
  } finally {
    sql(`delete from public.projects where slug = '${slug}'`);
  }
});

test("visuel : envoi avec description accessible puis retrait", async ({ page }) => {
  const admin = await createUser("admin-visuel", { admin: true });
  await login(page, admin.email, "/admin/fiches/demo-quiz-culture");
  await page.locator("summary", { hasText: "Visuels" }).click();
  const section = page.locator("details", { has: page.locator("summary", { hasText: "Visuels" }) });
  await section.getByLabel(/^Image/).setInputFiles("public/app-icon-512.png");
  await section.getByLabel("Description accessible (texte alternatif)").fill("Icône de test e2e");
  await section.getByRole("button", { name: "Ajouter le visuel" }).click();
  await expect(section.getByText("Modifications enregistrées.")).toBeVisible();
  await page.reload();
  await page.locator("summary", { hasText: "Visuels" }).click();
  const img = section.getByRole("img", { name: "Icône de test e2e" });
  await expect(img).toBeVisible();
  const src = await img.getAttribute("src");
  expect(src).toContain("/storage/v1/object/public/visuels/demo-quiz-culture/");
  expect((await page.request.get(src!)).status()).toBe(200);
  const count = Number(sql(`select jsonb_array_length(public_content->'visuels') from public.projects where slug = 'demo-quiz-culture'`));
  page.once("dialog", (d) => d.accept());
  await section.getByRole("button", { name: "Retirer" }).last().click();
  await expect(section.getByText("Modifications enregistrées.").last()).toBeVisible();
  expect(Number(sql(`select jsonb_array_length(public_content->'visuels') from public.projects where slug = 'demo-quiz-culture'`))).toBe(count - 1);
});
