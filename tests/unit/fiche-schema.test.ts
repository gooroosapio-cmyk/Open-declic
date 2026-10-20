import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { validateImport } from "@/lib/fiche-schema";

const CATS = ["saas", "site-web", "application-mobile", "jeu"];
const demo = () => JSON.parse(readFileSync("content/demo-fiches.json", "utf8"));

describe("validation de l'import", () => {
  it("accepte l'exemple de démonstration", () => {
    const r = validateImport(demo(), CATS);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.fiches).toHaveLength(4);
  });

  it("refuse une mauvaise version de schéma", () => {
    const d = demo();
    d.schema_version = "0.9";
    const r = validateImport(d, CATS);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.issues[0]).toMatchObject({ fiche: "(fichier)", champ: "schema_version" });
  });

  it("indique la fiche et le champ fautifs", () => {
    const d = demo();
    d.fiches[1].filtres.budget_lancement = { min: 50000, max: 1000 };
    delete d.fiches[2].titre;
    const r = validateImport(d, CATS);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ fiche: "demo-site-vitrine-maquis (n° 2)", champ: "filtres.budget_lancement" }),
      expect.objectContaining({ fiche: "demo-carnet-couture (n° 3)", champ: "titre" }),
    ]));
  });

  it("refuse un prompt contenant un champ à remplacer", () => {
    const d = demo();
    d.fiches[0].reserve.etapes[0].prompt.mission = "Agis comme un expert pour [NOM DU CLIENT].";
    const r = validateImport(d, CATS);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.issues[0].champ).toBe("reserve.etapes[1].prompt.mission");
  });

  it("refuse les identifiants en double et les catégories inconnues", () => {
    const d = demo();
    d.fiches[1].id = d.fiches[0].id;
    d.fiches[3].categorie = "inconnue";
    const r = validateImport(d, CATS);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.issues.map((i) => i.champ)).toEqual(expect.arrayContaining(["id", "categorie"]));
  });

  it("refuse les champs inconnus (fautes de frappe)", () => {
    const d = demo();
    d.fiches[0].titr = "x";
    const r = validateImport(d, CATS);
    expect(r.ok).toBe(false);
  });

  it("conserve un montant inconnu comme null", () => {
    const r = validateImport(demo(), CATS);
    if (!r.ok) throw new Error("invalide");
    expect(r.fiches[2].filtres.depenses_mensuelles).toEqual({ min: null, max: null });
  });
});
