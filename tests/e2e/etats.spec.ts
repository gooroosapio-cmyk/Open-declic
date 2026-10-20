import { expect, test } from "@playwright/test";
import { createUser, login, MAILPIT, PASSWORD } from "./helpers";

test("inscription avec confirmation d'e-mail réelle", async ({ page, request }) => {
  const email = `inscription-${Date.now().toString(36)}@e2e.local`;
  await page.goto("/inscription");
  await page.getByLabel("Adresse e-mail").fill(email);
  await page.getByLabel("Nouveau mot de passe").fill(PASSWORD);
  await page.getByRole("button", { name: "Créer mon compte" }).click();
  await expect(page.getByText(/Ouvrez le lien de confirmation/)).toBeVisible();

  // Connexion refusée tant que l'e-mail n'est pas confirmé
  await page.goto("/connexion");
  await page.getByLabel("Adresse e-mail").fill(email);
  await page.getByLabel("Mot de passe", { exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page.getByText(/pas encore confirmé/)).toBeVisible();

  // Lien reçu dans la boîte de test locale (Mailpit)
  let link: string | undefined;
  for (let i = 0; i < 20 && !link; i++) {
    const list = await (await request.get(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`)).json();
    const id = list.messages?.[0]?.ID;
    if (id) {
      const msg = await (await request.get(`${MAILPIT}/api/v1/message/${id}`)).json();
      link = (msg.Text as string).match(/https?:\/\/\S+verify\S+/)?.[0]?.replace(/\)$/, "");
    }
    if (!link) await page.waitForTimeout(500);
  }
  expect(link).toBeTruthy();
  await page.goto(link!);
  await page.waitForURL("http://127.0.0.1:3000/");
  await expect(page.getByRole("link", { name: "Mon compte" })).toBeVisible();
});

test("échec d'enregistrement signalé, sans fausse confirmation", async ({ page }) => {
  const user = await createUser("echec");
  await login(page, user.email, "/projets/demo-site-vitrine-maquis/kit");
  const step = page.locator("#etape-rediger-contenu");
  await page.route("**/*", (route) => (route.request().method() === "POST" && route.request().headers()["next-action"] ? route.abort() : route.continue()));
  await step.getByRole("button", { name: "Valider cette étape" }).click();
  await expect(step.getByText(/Échec de l'enregistrement/)).toBeVisible();
  await expect(step.getByRole("button", { name: "Valider cette étape" })).toBeVisible();
  await expect(step.getByText("Étape validée et enregistrée.")).toHaveCount(0);
  await page.unroute("**/*");
  await page.reload();
  await expect(page.getByText("0 étape validée sur 2")).toBeVisible();
});

test("copie impossible : solution de secours affichée", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", { value: { writeText: () => Promise.reject(new Error("refus")) } });
    document.execCommand = () => false;
  });
  await page.goto("/projets/demo-site-vitrine-maquis/kit");
  const cadrage = page.locator("#cadrage");
  await cadrage.getByRole("button", { name: "Copier le prompt" }).click();
  await expect(cadrage.getByText(/La copie automatique a échoué/)).toBeVisible();
  await expect(cadrage.getByText(/Prompt copié/)).toHaveCount(0);
});

test("Aide-moi à choisir : critères expliqués et modifiables", async ({ page }) => {
  await page.goto("/aide-choix");
  await page.getByLabel("Moins de 25 000 FCFA").check();
  await page.getByLabel("Jusqu'à 5 h", { exact: true }).check();
  await page.getByRole("button", { name: "Voir les projets correspondants" }).click();
  await expect(page).toHaveURL(/depuis=aide/);
  await expect(page.getByText("Pourquoi ce projet ?").first()).toBeVisible();
  await expect(page.getByText(/compatible avec votre limite de 25 000 FCFA/).first()).toBeVisible();
  await expect(page.getByText(/Aucun score de réussite/)).toBeVisible();
  await expect(page.getByLabel("Budget de lancement disponible")).toHaveValue("25000");
});

test("aucun résultat", async ({ page }) => {
  await page.goto("/?q=zzzzzz");
  await expect(page.getByRole("heading", { name: "Aucun projet ne correspond" })).toBeVisible();
});
