import { expect, test } from "@playwright/test";
import { createUser, login } from "./helpers";

test("catalogue V1 : 10 fiches complètes en avant, modèles, filtres", async ({ page }) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  const featured = page.locator("section", { has: page.getByRole("heading", { name: "Fiches complètes, prêtes à construire" }) });
  await expect(featured.locator("article")).toHaveCount(10);
  await expect(featured.getByText("OD-001 · SaaS / application · Organisation")).toBeVisible();
  await expect(page.getByRole("button", { name: /Afficher plus/ })).toBeVisible();

  await page.locator("summary", { hasText: "Filtres" }).click();
  await page.getByLabel("Fiches complètes seulement (étapes et prompts)").click();
  await expect(page.getByText("14 projets", { exact: true })).toBeVisible();
  await page.getByLabel("Fiches complètes seulement (étapes et prompts)").click();
  await page.getByLabel("Domaine").selectOption("Sport & jeux");
  await expect(page.getByText("22 projets", { exact: true })).toBeVisible();
  await page.getByLabel("Niveau de preuve").selectOption("O");
  await expect(page.getByText("0 projet", { exact: true })).toBeVisible();
  await page.getByLabel("Domaine").selectOption("");
  await expect(page.getByText("10 projets", { exact: true })).toBeVisible();

  // Recherche par identifiant stable
  await page.getByRole("button", { name: "Effacer les filtres" }).first().click();
  await page.getByPlaceholder("Rechercher un projet, un secteur…").fill("OD-140");
  await expect(page.getByText("1 projet", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Carnet d’échéances des associations", exact: true }).click();
  await expect(page.getByText("Cahier de construction en préparation.")).toBeVisible();
  await expect(page.getByText("Proposition originale Open declic : aucune entreprise de référence.")).toBeVisible();
});

test("fiche complète : dossier téléchargeable selon l'accès", async ({ page, request }) => {
  // Gratuite pour tous
  const free = await request.get("/projets/od-001/kit/dossier");
  expect(free.status()).toBe(200);
  expect(free.headers()["content-disposition"]).toContain("OD-001");
  const text = await free.text();
  expect(text).toContain("# OD-001 — Réservation de rendez-vous pour indépendants");
  expect(text).toContain("## Socle commun");
  expect(text).not.toContain("# OD-002 —");

  // Réservée : refusée au visiteur, contenu absent de la page
  expect((await request.get("/projets/od-002/kit/dossier")).status()).toBe(403);
  const html = await (await request.get("/projets/od-002/kit")).text();
  expect(html).not.toContain("Formulaire Simple, à partir de sa fiche");

  // Membre complet : accès au kit et au dossier
  const member = await createUser("v1-membre", { full: true });
  await login(page, member.email, "/projets/od-002/kit");
  await expect(page.getByRole("link", { name: /Télécharger le dossier/ })).toBeVisible();
  await expect(page.locator("#etape-od-002-e01")).toContainText("Cadrer l’offre et écrire les textes");
  expect((await page.request.get("/projets/od-002/kit/dossier")).status()).toBe(200);
  await page.locator("summary", { hasText: "Cahier de construction" }).click();
  await expect(page.getByRole("heading", { name: "B. Charte, parcours et écrans" })).toBeVisible();
});
