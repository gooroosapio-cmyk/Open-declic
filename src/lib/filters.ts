import { COUNTRIES, DIFFICULTIES, DIFFICULTY_ORDER, EQUIPMENT, SKILLS, formatFcfa, formatRange, type Difficulty } from "./constants";

/** Sous-ensemble public d'une fiche utilisé par le catalogue (aucun contenu réservé). */
export type CatalogItem = {
  slug: string;
  title: string;
  summary: string;
  category: string;
  countries: string[];
  difficulty: string;
  skills: string[];
  equipment: string[];
  isFree: boolean;
  launchBudget: { min: number | null; max: number | null };
  monthlyCost: { min: number | null; max: number | null };
  weeklyHours: { min: number | null; max: number | null };
  updatedAt: string;
};

export type Filters = {
  q: string;
  budget: number | null; // budget de lancement disponible (FCFA)
  mensuel: number | null; // dépenses mensuelles acceptables (FCFA)
  niveau: Difficulty | null; // niveau maximum
  competences: string[]; // compétences mobilisées (au moins une)
  heures: number | null; // heures disponibles par semaine
  categorie: string | null;
  materiel: string[]; // matériel dont je dispose
  pays: string | null;
  gratuit: boolean;
};

export type SortKey = "pertinence" | "budget" | "temps" | "difficulte" | "recent";
export const SORTS: Record<SortKey, string> = {
  pertinence: "Ordre alphabétique",
  budget: "Budget de lancement croissant",
  temps: "Temps hebdomadaire croissant",
  difficulte: "Difficulté croissante",
  recent: "Mises à jour récentes",
};

export const EMPTY_FILTERS: Filters = {
  q: "", budget: null, mensuel: null, niveau: null, competences: [], heures: null, categorie: null, materiel: [], pays: null, gratuit: false,
};

const num = (v: string | null) => {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : null;
};
const listParam = (v: string | null) => (v ? v.split(",").filter(Boolean) : []);

export function parseFilters(sp: URLSearchParams): { filters: Filters; sort: SortKey } {
  const niveau = sp.get("niveau");
  const sort = sp.get("tri") as SortKey | null;
  return {
    filters: {
      q: sp.get("q") ?? "",
      budget: num(sp.get("budget")),
      mensuel: num(sp.get("mensuel")),
      niveau: niveau && niveau in DIFFICULTIES ? (niveau as Difficulty) : null,
      competences: listParam(sp.get("competences")).filter((s) => s in SKILLS),
      heures: num(sp.get("heures")),
      categorie: sp.get("categorie") || null,
      materiel: listParam(sp.get("materiel")).filter((s) => s in EQUIPMENT),
      pays: sp.get("pays") && sp.get("pays")! in COUNTRIES ? sp.get("pays") : null,
      gratuit: sp.get("gratuit") === "1",
    },
    sort: sort && sort in SORTS ? sort : "pertinence",
  };
}

export function filtersToParams(f: Filters, sort: SortKey, extra: Record<string, string> = {}): URLSearchParams {
  const p = new URLSearchParams();
  if (f.q) p.set("q", f.q);
  if (f.budget != null) p.set("budget", String(f.budget));
  if (f.mensuel != null) p.set("mensuel", String(f.mensuel));
  if (f.niveau) p.set("niveau", f.niveau);
  if (f.competences.length) p.set("competences", f.competences.join(","));
  if (f.heures != null) p.set("heures", String(f.heures));
  if (f.categorie) p.set("categorie", f.categorie);
  if (f.materiel.length) p.set("materiel", f.materiel.join(","));
  if (f.pays) p.set("pays", f.pays);
  if (f.gratuit) p.set("gratuit", "1");
  if (sort !== "pertinence") p.set("tri", sort);
  for (const [k, v] of Object.entries(extra)) p.set(k, v);
  return p;
}

export function activeFilterCount(f: Filters): number {
  return [f.budget != null, f.mensuel != null, f.niveau, f.competences.length, f.heures != null, f.categorie, f.materiel.length, f.pays, f.gratuit]
    .filter(Boolean).length;
}

const normalize = (s: string) => s.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");

/** Plus petite valeur connue d'une fourchette ; null si inconnue (jamais 0 par défaut). */
const lowest = (r: { min: number | null; max: number | null }) => r.min ?? r.max;

export type Reason = { ok: boolean; text: string };

/**
 * Évalue une fiche face aux critères actifs, de façon déterministe.
 * Chaque critère produit une explication lisible ; une valeur inconnue
 * ne satisfait jamais un critère chiffré.
 */
export function evaluate(item: CatalogItem, f: Filters, categoryLabel: (slug: string) => string): { match: boolean; reasons: Reason[]; unknown: boolean } {
  const reasons: Reason[] = [];
  let unknown = false;

  if (f.q) {
    const hay = normalize(`${item.title} ${item.summary} ${categoryLabel(item.category)}`);
    const ok = normalize(f.q).split(/\s+/).filter(Boolean).every((w) => hay.includes(w));
    reasons.push({ ok, text: ok ? `Contient « ${f.q} »` : `Ne contient pas « ${f.q} »` });
  }
  const money = (label: string, range: CatalogItem["launchBudget"], limit: number | null) => {
    if (limit == null) return;
    const low = lowest(range);
    if (low == null) {
      unknown = true;
      reasons.push({ ok: false, text: `${label} non renseigné : impossible de vérifier votre limite de ${formatFcfa(limit)}` });
      return;
    }
    const ok = low <= limit;
    reasons.push({ ok, text: `${label} estimé ${formatRange(range.min, range.max)} ${ok ? "compatible avec" : "au-dessus de"} votre limite de ${formatFcfa(limit)}` });
  };
  money("Budget de lancement", item.launchBudget, f.budget);
  money("Dépenses mensuelles", item.monthlyCost, f.mensuel);

  if (f.heures != null) {
    const low = lowest(item.weeklyHours);
    if (low == null) {
      unknown = true;
      reasons.push({ ok: false, text: "Temps hebdomadaire non renseigné" });
    } else {
      const ok = low <= f.heures;
      reasons.push({ ok, text: `Demande ${formatRange(item.weeklyHours.min, item.weeklyHours.max, "h")} par semaine, ${ok ? "compatible avec" : "plus que"} vos ${f.heures} h` });
    }
  }
  if (f.niveau) {
    const ok = DIFFICULTY_ORDER.indexOf(item.difficulty as Difficulty) <= DIFFICULTY_ORDER.indexOf(f.niveau);
    reasons.push({ ok, text: `Niveau ${DIFFICULTIES[item.difficulty as Difficulty] ?? item.difficulty}${ok ? "" : `, au-delà du niveau ${DIFFICULTIES[f.niveau]} choisi`}` });
  }
  if (f.competences.length) {
    const common = item.skills.filter((s) => f.competences.includes(s));
    const ok = common.length > 0;
    reasons.push({
      ok,
      text: ok
        ? `Mobilise : ${common.map((s) => SKILLS[s as keyof typeof SKILLS]).join(", ")}`
        : "Ne mobilise aucune des compétences choisies",
    });
  }
  if (f.materiel.length) {
    const missing = item.equipment.filter((e) => !f.materiel.includes(e));
    const ok = missing.length === 0;
    reasons.push({
      ok,
      text: ok
        ? "Réalisable avec le matériel dont vous disposez"
        : `Nécessite aussi : ${missing.map((e) => EQUIPMENT[e as keyof typeof EQUIPMENT]).join(", ")}`,
    });
  }
  if (f.categorie) {
    const ok = item.category === f.categorie;
    reasons.push({ ok, text: ok ? `Catégorie ${categoryLabel(item.category)}` : `Catégorie ${categoryLabel(item.category)}, différente` });
  }
  if (f.pays) {
    const ok = item.countries.includes(f.pays);
    reasons.push({ ok, text: ok ? `Étudié pour : ${COUNTRIES[f.pays as keyof typeof COUNTRIES]}` : "Pays non étudié" });
  }
  if (f.gratuit) {
    reasons.push({ ok: item.isFree, text: item.isFree ? "Fiche gratuite" : "Fiche réservée à l'accès complet" });
  }
  return { match: reasons.every((r) => r.ok), reasons, unknown };
}

export function sortItems<T extends CatalogItem>(items: T[], sort: SortKey): T[] {
  const byNull = (a: number | null, b: number | null) => (a == null ? (b == null ? 0 : 1) : b == null ? -1 : a - b);
  const copy = [...items];
  switch (sort) {
    case "budget":
      return copy.sort((a, b) => byNull(lowest(a.launchBudget), lowest(b.launchBudget)) || a.title.localeCompare(b.title, "fr"));
    case "temps":
      return copy.sort((a, b) => byNull(lowest(a.weeklyHours), lowest(b.weeklyHours)) || a.title.localeCompare(b.title, "fr"));
    case "difficulte":
      return copy.sort((a, b) => DIFFICULTY_ORDER.indexOf(a.difficulty as Difficulty) - DIFFICULTY_ORDER.indexOf(b.difficulty as Difficulty) || a.title.localeCompare(b.title, "fr"));
    case "recent":
      return copy.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    default:
      return copy.sort((a, b) => a.title.localeCompare(b.title, "fr"));
  }
}
