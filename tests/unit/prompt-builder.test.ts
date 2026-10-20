import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { validateImport } from "@/lib/fiche-schema";
import { buildKitPrompt, buildStepPrompt, type ProjectContext } from "@/lib/prompt-builder";

const r = validateImport(JSON.parse(readFileSync("content/demo-fiches.json", "utf8")), ["saas-app", "site", "jeu"]);
if (!r.ok) throw new Error("exemple invalide");
const f0 = r.fiches[0];
if (f0.niveau_contenu !== "complete") throw new Error("fiche complète attendue");
const f = f0;
const ctx: ProjectContext = {
  title: f.titre, summary: f.resume, countries: f.pays, difficulty: f.difficulte.niveau, skills: f.competences,
  equipment: f.materiel, launchBudget: f.filtres.budget_lancement, monthlyCost: f.filtres.depenses_mensuelles,
  weeklyHours: f.filtres.heures_hebdo, targetClient: f.apercu.client_cible, problem: f.apercu.probleme,
  offer: f.apercu.offre, localAdaptation: f.apercu.adaptation_locale, aiRole: f.apercu.role_ia.construction,
};

describe("assemblage des prompts", () => {
  const step = { ...f.reserve.etapes[0] };
  const perso = buildStepPrompt(ctx, step, 1, 3, "personnaliser");
  const auto = buildStepPrompt(ctx, step, 1, 3, "laisser_choisir");

  it("est déterministe", () => {
    expect(buildStepPrompt(ctx, step, 1, 3, "personnaliser")).toBe(perso);
  });
  it("produit deux variantes distinctes", () => {
    expect(perso).not.toBe(auto);
    expect(perso).toContain("MODE : PERSONNALISER");
    expect(auto).toContain("MODE : LAISSER L'IA CHOISIR");
  });
  it("ne contient aucun champ à remplacer", () => {
    for (const t of [perso, auto, buildKitPrompt(ctx, f.reserve.kit.prompt_cadrage, "personnaliser", "cadrage"), buildKitPrompt(ctx, f.reserve.kit.resume_transmission, "laisser_choisir", "transmission")]) {
      expect(t).not.toMatch(/\[[^\]\n]{1,80}\]|\{\{|<[A-Z_ ]{3,}>/);
    }
  });
  it("contient les règles exigées", () => {
    for (const needle of ["trois questions", "N'invente jamais", "accord explicite avant toute dépense", "résumé de transmission", "Ne me demande jamais de mot de passe", "Explique d'abord simplement l'objectif", "prochaine action"]) {
      expect(perso).toContain(needle);
    }
    expect(auto).toContain("N'invente jamais mes ressources personnelles");
  });
  it("inclut la mission et le contexte de la fiche", () => {
    expect(perso).toContain(step.prompt.mission);
    expect(perso).toContain(f.titre);
    expect(perso).toContain("Budget de lancement estimé par la fiche : 15 000 – 60 000 FCFA");
  });
  it("le résumé de transmission exclut les secrets", () => {
    expect(buildKitPrompt(ctx, f.reserve.kit.resume_transmission, "personnaliser", "transmission")).toContain("Retire tout mot de passe");
  });
});
