import { describe, expect, it } from "vitest";
import { EMPTY_FILTERS, evaluate, filtersToParams, parseFilters, sortItems, type CatalogItem } from "@/lib/filters";
import { formatRange } from "@/lib/constants";

const item = (o: Partial<CatalogItem>): CatalogItem => ({
  slug: "a", title: "A", summary: "", category: "saas", countries: ["CI"], difficulty: "debutant", skills: ["vente"],
  equipment: ["smartphone"], isFree: true, launchBudget: { min: 10000, max: 20000 }, monthlyCost: { min: 0, max: 5000 },
  weeklyHours: { min: 2, max: 4 }, updatedAt: "2026-10-01", contentLevel: "complete", odNumber: null, workName: null,
  domain: null, clientType: null, aiUsage: null, evidence: null, featured: false, ...o,
});
const cat = (s: string) => s;

describe("filtres déterministes", () => {
  it("sans critère, tout correspond", () => {
    expect(evaluate(item({}), EMPTY_FILTERS, cat).match).toBe(true);
  });
  it("budget : compare le minimum connu", () => {
    expect(evaluate(item({}), { ...EMPTY_FILTERS, budget: 10000 }, cat).match).toBe(true);
    expect(evaluate(item({}), { ...EMPTY_FILTERS, budget: 5000 }, cat).match).toBe(false);
  });
  it("un montant inconnu n'est jamais considéré comme nul", () => {
    const r = evaluate(item({ monthlyCost: { min: null, max: null } }), { ...EMPTY_FILTERS, mensuel: 0 }, cat);
    expect(r.match).toBe(false);
    expect(r.unknown).toBe(true);
    expect(formatRange(null, null)).toBe("Non renseigné");
  });
  it("option « inconnus » : la donnée non renseignée est affichée comme à vérifier", () => {
    const p = item({ launchBudget: { min: null, max: null }, equipment: [] });
    expect(evaluate(p, { ...EMPTY_FILTERS, budget: 10000, materiel: ["smartphone"] }, cat).match).toBe(false);
    const r = evaluate(p, { ...EMPTY_FILTERS, budget: 10000, materiel: ["smartphone"], inconnus: true }, cat);
    expect(r.match).toBe(true);
    expect(r.reasons.map((x) => x.text).join(" ")).toMatch(/non renseigné/);
  });
  it("un modèle sans matériel renseigné n'est pas considéré comme réalisable avec tout matériel", () => {
    expect(evaluate(item({ equipment: [] }), { ...EMPTY_FILTERS, materiel: ["smartphone"] }, cat).match).toBe(false);
  });
  it("filtres du catalogue : fiches complètes, domaine, client, IA, preuve", () => {
    const m = item({ contentLevel: "modele", domain: "Vente", clientType: "b2c", aiUsage: "optionnelle", evidence: "A", odNumber: "OD-015" });
    expect(evaluate(m, { ...EMPTY_FILTERS, complete: true }, cat).match).toBe(false);
    expect(evaluate(m, { ...EMPTY_FILTERS, domaine: "Vente", client: "b2c", ia: "optionnelle", preuve: "A" }, cat).match).toBe(true);
    expect(evaluate(m, { ...EMPTY_FILTERS, q: "od-015" }, cat).match).toBe(true);
  });
  it("tri par défaut : fiches complètes puis numéro du catalogue", () => {
    const sorted = sortItems([
      item({ slug: "m2", contentLevel: "modele", odNumber: "OD-012" }),
      item({ slug: "c2", odNumber: "OD-002" }),
      item({ slug: "m1", contentLevel: "modele", odNumber: "OD-011" }),
      item({ slug: "c1", odNumber: "OD-001" }),
    ], "pertinence");
    expect(sorted.map((s) => s.slug)).toEqual(["c1", "c2", "m1", "m2"]);
  });
  it("matériel : le projet doit être réalisable avec le matériel déclaré", () => {
    const p = item({ equipment: ["smartphone", "ordinateur"] });
    expect(evaluate(p, { ...EMPTY_FILTERS, materiel: ["smartphone"] }, cat).match).toBe(false);
    expect(evaluate(p, { ...EMPTY_FILTERS, materiel: ["smartphone", "ordinateur"] }, cat).match).toBe(true);
  });
  it("chaque critère produit une explication", () => {
    const r = evaluate(item({}), { ...EMPTY_FILTERS, budget: 50000, heures: 5, niveau: "intermediaire", competences: ["vente"] }, cat);
    expect(r.match).toBe(true);
    expect(r.reasons).toHaveLength(4);
    expect(r.reasons.every((x) => x.text.length > 0)).toBe(true);
  });
  it("recherche insensible aux accents", () => {
    expect(evaluate(item({ title: "Café" }), { ...EMPTY_FILTERS, q: "cafe" }, cat).match).toBe(true);
  });
  it("aller-retour URL", () => {
    const f = { ...EMPTY_FILTERS, budget: 25000, competences: ["vente", "gestion"], pays: "CI", gratuit: true, complete: true, domaine: "Vente", client: "b2b", ia: "requise", preuve: "B", inconnus: true };
    const back = parseFilters(filtersToParams(f, "budget"));
    expect(back.filters).toEqual(f);
    expect(back.sort).toBe("budget");
  });
  it("tri par budget : inconnus en dernier", () => {
    const sorted = sortItems([item({ slug: "x", launchBudget: { min: null, max: null } }), item({ slug: "y", launchBudget: { min: 0, max: 1 } })], "budget");
    expect(sorted.map((s) => s.slug)).toEqual(["y", "x"]);
  });
});
