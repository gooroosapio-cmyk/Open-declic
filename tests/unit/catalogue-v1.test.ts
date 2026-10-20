import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { validateImport, type AnyFiche } from "@/lib/fiche-schema";

const raw = JSON.parse(readFileSync("content/catalogue-v1.json", "utf8"));
const sources = JSON.parse(readFileSync("content/sources/catalogue-200-v1.json", "utf8")).modeles;
const r = validateImport(raw, ["saas-app", "site", "jeu"]);

describe("catalogue V1 converti", () => {
  it("est valide et contient 200 fiches dont 10 complètes mises en avant", () => {
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.fiches).toHaveLength(200);
    const complete = r.fiches.filter((f) => f.niveau_contenu === "complete");
    expect(complete.map((f) => f.catalogue?.numero)).toEqual(Array.from({ length: 10 }, (_, i) => `OD-${String(i + 1).padStart(3, "0")}`));
    expect(complete.every((f) => f.catalogue?.mise_en_avant)).toBe(true);
    expect(r.fiches.filter((f) => f.catalogue?.mise_en_avant)).toHaveLength(10);
  });

  it("reprend fidèlement les totaux du PDF", () => {
    if (!r.ok) throw new Error("invalide");
    const fiches = r.fiches;
    const count = (fn: (f: AnyFiche) => string | undefined) =>
      fiches.reduce<Record<string, number>>((acc, f) => ({ ...acc, [fn(f) ?? "?"]: (acc[fn(f) ?? "?"] ?? 0) + 1 }), {});
    expect(count((f) => f.categorie)).toEqual({ "saas-app": 140, site: 40, jeu: 20 });
    expect(count((f) => f.difficulte.niveau)).toEqual({ debutant: 64, intermediaire: 126, avance: 10 });
    expect(count((f) => f.catalogue?.ia_usage)).toEqual({ non_necessaire: 165, optionnelle: 24, requise: 11 });
    expect(count((f) => f.catalogue?.preuve)).toEqual({ A: 39, B: 151, O: 10 });
    expect(new Set(r.fiches.map((f) => f.catalogue?.domaine)).size).toBe(28);
  });

  it("conserve les textes et sources du PDF", () => {
    if (!r.ok) throw new Error("invalide");
    for (const s of sources) {
      const f = r.fiches.find((x) => x.catalogue?.numero === s.numero)!;
      expect(f.titre).toBe(s.titre);
      expect(f.apercu.adaptation_locale).toBe(s.local);
      if (s.source_url) expect(f.apercu.references[0]?.url_officielle).toBe(s.source_url);
      else expect(f.apercu.references).toEqual([]);
    }
  });

  it("chaque fiche complète a 9 étapes, des prompts sans mode imposé et un dossier", () => {
    if (!r.ok) throw new Error("invalide");
    for (const f of r.fiches) {
      if (f.niveau_contenu !== "complete") continue;
      expect(f.reserve.etapes).toHaveLength(9);
      for (const s of f.reserve.etapes) {
        expect(s.prompt.mission).not.toMatch(/cinq QCM/);
        expect(s.prompt.mission).toContain(f.catalogue!.numero);
      }
      expect(f.reserve.kit.prompt_cadrage.mission).toContain(`Le projet sélectionné est ${f.catalogue!.numero}`);
      expect(f.reserve.kit.dossier_md).toContain(`# ${f.catalogue!.numero} — `);
      expect(f.reserve.kit.dossier_md).toContain("## Socle commun");
      // Un montant inconnu reste inconnu
      expect(f.filtres.budget_lancement).toEqual({ min: null, max: null });
    }
  });

  it("les deux fiches gratuites par défaut sont OD-001 et OD-003", () => {
    if (!r.ok) throw new Error("invalide");
    expect(r.fiches.filter((f) => f.acces.gratuit && f.niveau_contenu === "complete").map((f) => f.catalogue?.numero)).toEqual(["OD-001", "OD-003"]);
  });
});
