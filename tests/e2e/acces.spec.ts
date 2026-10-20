import { expect, test } from "@playwright/test";
import { createUser, login, logout } from "./helpers";

const RESERVED_KIT = "/projets/demo-carnet-couture/kit";

test("visiteur : contenu gratuit visible, contenu réservé jamais envoyé", async ({ page, request }) => {
  await page.goto("/projets/demo-site-vitrine-maquis/kit");
  await expect(page.getByRole("heading", { name: "1. Cadrer le projet" })).toBeVisible();
  await expect(page.getByText("Vous consultez ce kit sans compte.")).toBeVisible();

  await page.goto(RESERVED_KIT);
  await expect(page.getByText("Contenu réservé à l'accès complet")).toBeVisible();
  await expect(page.getByText("Le paiement en ligne n'est pas encore disponible.")).toBeVisible();
  await expect(page.getByRole("button", { name: /payer|acheter/i })).toHaveCount(0);

  const html = await (await request.get(RESERVED_KIT)).text();
  expect(html).not.toContain("Agis comme un développeur mobile");
  expect(html).not.toContain("MODE : PERSONNALISER");
  const fiche = await (await request.get("/projets/demo-carnet-couture")).text();
  expect(fiche).not.toContain("Agis comme");
});

test("utilisateur gratuit, membre complet et administrateur", async ({ page }) => {
  const free = await createUser("acces-gratuit");
  const admin = await createUser("acces-admin", { admin: true });

  // Gratuit : réservé bloqué, admin inaccessible
  await login(page, free.email);
  await page.goto(RESERVED_KIT);
  await expect(page.getByText("Contenu réservé à l'accès complet")).toBeVisible();
  const resp = await page.goto("/admin");
  expect(resp?.status()).toBe(404);
  const resp2 = await page.goto("/admin/acces");
  expect(resp2?.status()).toBe(404);
  await logout(page);

  // Admin attribue l'accès complet (avec trace)
  await login(page, admin.email, "/admin/acces");
  await page.getByPlaceholder("Rechercher par e-mail").fill(free.email);
  await page.getByRole("button", { name: "Rechercher" }).click();
  await page.getByPlaceholder("Note (ex. paiement reçu le…)").fill("Test e2e");
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Attribuer l'accès complet" }).click();
  await expect(page.getByText("Accès complet attribué.")).toBeVisible();
  await page.reload();
  await expect(page.getByRole("cell", { name: free.email }).first()).toBeVisible();
  await expect(page.getByRole("cell", { name: "Test e2e" }).first()).toBeVisible();
  await logout(page);

  // Le même compte, devenu membre complet, lit le kit réservé
  await login(page, free.email, RESERVED_KIT);
  await expect(page.getByRole("heading", { name: "1. Cadrer le projet" })).toBeVisible();
  await expect(page.getByText("Contenu réservé à l'accès complet")).toHaveCount(0);
});
