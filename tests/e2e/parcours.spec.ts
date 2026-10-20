import { expect, test } from "@playwright/test";
import { createUser, login, logout } from "./helpers";

test("catalogue → filtre → fiche → favori → comparaison → kit → progression", async ({ page, context, browserName }) => {
  const user = await createUser("parcours");
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await login(page, user.email);

  // Catalogue immédiatement visible
  await page.goto("/");
  await page.waitForLoadState("networkidle"); // attendre l'hydratation avant d'interagir
  await expect(page.getByRole("heading", { name: "Trouvez votre déclic" })).toBeVisible();
  await expect(page.getByText("204 projets")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Fiches complètes, prêtes à construire" })).toBeVisible();

  // Filtre : fiches gratuites, budget (les fiches au budget non renseigné sont signalées)
  await page.locator("summary", { hasText: "Filtres" }).click();
  await page.getByLabel("Fiches gratuites seulement").click();
  await expect(page.getByLabel("Fiches gratuites seulement")).toBeChecked();
  await expect(page.getByText("4 projets", { exact: true })).toBeVisible();
  await page.getByLabel("Budget de lancement disponible").selectOption("25000");
  await expect(page.getByText(/^2 projets · 2 masqués faute de donnée renseignée/)).toBeVisible();
  await page.getByLabel("Budget de lancement disponible").selectOption("0");
  await expect(page.getByText(/^1 projet · 2 masqués faute de donnée renseignée/)).toBeVisible();
  // Afficher aussi les fiches au budget non renseigné, signalées « à vérifier »
  await page.getByRole("button", { name: "Les afficher aussi" }).click();
  await expect(page.getByText("3 projets", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Effacer les filtres" }).first().click();
  await expect(page.getByText("204 projets")).toBeVisible();

  // Fiche
  await page.getByRole("link", { name: "Prise de rendez-vous pour salons de coiffure" }).click();
  await page.waitForLoadState("networkidle");
  await expect(page.getByRole("heading", { level: 1, name: "Prise de rendez-vous pour salons de coiffure" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "1. Prix d'accès à Open declic" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "2. Budget estimé pour lancer le business" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "3. Dépenses récurrentes du business" })).toBeVisible();

  // Favori enregistré (après confirmation serveur) et persistant
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await expect(page.getByRole("button", { name: "Enregistré" })).toHaveAttribute("aria-pressed", "true");
  await page.reload();
  await expect(page.getByRole("button", { name: "Enregistré" })).toBeVisible();

  // Comparaison : 3 maximum
  await page.getByRole("button", { name: /^Comparer : / }).click();
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  for (const t of ["Carnet de commandes pour couturiers", "Quiz de culture générale locale"]) {
    await page.getByRole("button", { name: `Comparer : ${t}` }).click();
  }
  await page.getByRole("button", { name: "Comparer : Site vitrine et menu en ligne pour maquis" }).click();
  await expect(page.getByText("Limite atteinte : 3 projets maximum.")).toBeVisible();
  await page.getByRole("navigation", { name: "Navigation principale" }).getByRole("link", { name: /Comparer/ }).click();
  await expect(page.getByText("3 projets sur 3 maximum.")).toBeVisible();
  await expect(page.getByRole("columnheader")).toHaveCount(3);
  await page.getByRole("button", { name: "Retirer Quiz de culture générale locale de la comparaison" }).click();
  await expect(page.getByText("2 projets sur 3 maximum.")).toBeVisible();

  // Kit : démarrer, copier les deux variantes
  await page.goto("/projets/demo-rendez-vous-salons");
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: /Démarrer ce projet/ }).click();
  await page.waitForURL(/\/kit$/);
  const etape = page.locator("#etape-decrire-ecrans");
  await etape.getByText("Personnaliser", { exact: true }).click();
  await etape.getByRole("button", { name: "Copier le prompt" }).click();
  await expect(etape.getByText("Prompt copié (Personnaliser).")).toBeVisible();
  if (browserName === "chromium") {
    const c1 = await page.evaluate(() => navigator.clipboard.readText());
    expect(c1).toContain("MODE : PERSONNALISER");
    expect(c1).not.toMatch(/\[[^\]\n]{1,80}\]/);
  }
  await etape.getByText("Laisser l'IA choisir", { exact: true }).click();
  await etape.getByRole("button", { name: "Copier le prompt" }).click();
  await expect(etape.getByText("Prompt copié (Laisser l'IA choisir).")).toBeVisible();
  if (browserName === "chromium") {
    const c2 = await page.evaluate(() => navigator.clipboard.readText());
    expect(c2).toContain("MODE : LAISSER L'IA CHOISIR");
  }
  // Explications distinctes du texte copié
  await expect(etape.getByRole("heading", { name: "À quoi sert ce prompt ?" })).toBeVisible();
  await expect(etape.getByRole("heading", { name: "Comment l'utiliser ?" })).toBeVisible();

  // La copie ne valide pas l'étape ; validation manuelle confirmée
  await expect(page.getByText("0 étape validée sur 3")).toBeVisible();
  await etape.getByRole("button", { name: "Valider cette étape" }).click();
  await expect(etape.getByText("Étape validée et enregistrée.")).toBeVisible();
  await expect(page.getByText("1 étape validée sur 3")).toBeVisible();

  // Après rechargement puis reconnexion
  await page.reload();
  await expect(page.getByText("1 étape validée sur 3")).toBeVisible();
  await logout(page);
  await login(page, user.email, "/mes-kits");
  await expect(page.getByRole("heading", { name: "Mes kits" })).toBeVisible();
  await expect(page.getByText("1 étape sur 3")).toBeVisible();
  await expect(page.getByText("Prochaine étape : Construire la première version")).toBeVisible();
  await page.goto("/mes-projets");
  await expect(page.getByRole("heading", { name: "Favoris" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Prise de rendez-vous pour salons de coiffure" }).first()).toBeVisible();

  // Pas de défilement horizontal
  for (const path of ["/", "/projets/demo-rendez-vous-salons", "/projets/demo-rendez-vous-salons/kit", "/comparer", "/mes-projets"]) {
    await page.goto(path);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, path).toBeLessThanOrEqual(0);
  }
});
