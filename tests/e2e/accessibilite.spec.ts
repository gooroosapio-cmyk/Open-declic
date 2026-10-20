import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { createUser, login } from "./helpers";

const PUBLIC = ["/", "/aide-choix", "/projets/demo-rendez-vous-salons", "/projets/demo-rendez-vous-salons/kit", "/projets/demo-carnet-couture/kit", "/comparer", "/acces", "/connexion", "/inscription"];

test("audit axe (WCAG 2.1 AA) des pages publiques et connectées", async ({ page }) => {
  const check = async (path: string) => {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    await page.locator("details").evaluateAll((els) => els.forEach((d) => ((d as HTMLDetailsElement).open = true)));
    const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    const summary = r.violations.map((v) => `${v.id} (${v.impact}) : ${v.nodes.slice(0, 3).map((n) => n.target.join(" ")).join(" | ")}`);
    expect(summary, path).toEqual([]);
  };
  for (const p of PUBLIC) await check(p);
  const admin = await createUser("axe-admin", { admin: true });
  await login(page, admin.email);
  for (const p of ["/mes-projets", "/mes-kits", "/compte", "/admin", "/admin/import", "/admin/acces", "/admin/reglages", "/admin/fiches/demo-rendez-vous-salons"]) await check(p);
});

test("navigation au clavier : lien d'évitement et focus visible", async ({ page }) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Aller au contenu" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#contenu$/);
});
