import { z } from "zod";
import { COUNTRIES, DIFFICULTIES, EQUIPMENT, NATURES, RECURRENCES, SKILLS } from "./constants";

/**
 * Format d'import des fiches — version 1.0.
 * Documentation : docs/IMPORT.md. Exemple valide : content/demo-fiches.json.
 */
export const SCHEMA_VERSION = "1.0";

const keys = <T extends Record<string, string>>(o: T) => Object.keys(o) as [keyof T & string, ...(keyof T & string)[]];

const slug = z
  .string()
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Identifiant attendu en minuscules, chiffres et tirets (ex. « studio-contenus »).");

const PLACEHOLDER = /\[[^\]\n]{1,80}\]|\{\{[^}]*\}\}|<[A-Z_ ]{3,}>/;
const text = z.string().trim().min(1, "Texte obligatoire.");
const promptText = text.refine((s) => !PLACEHOLDER.test(s), {
  message: "Le prompt contient un champ à remplacer ([...], {{...}} ou <...>). Les prompts doivent être complets.",
});
const url = z.url({ protocol: /^https$/, message: "Lien https complet attendu." });
const isoDate = z.iso.date({ message: "Date attendue au format AAAA-MM-JJ." });
const nature = z.enum(keys(NATURES), { message: `Nature attendue : ${Object.keys(NATURES).join(", ")}.` });
const amount = z.number().int().nonnegative().nullable();

const range = z
  .strictObject({ min: amount, max: amount })
  .refine((r) => r.min == null || r.max == null || r.min <= r.max, { message: "Le minimum dépasse le maximum." });

const source = z.strictObject({ titre: text, url, date_consultation: isoDate });

const prompt = z.strictObject({
  titre: text,
  mission: promptText,
  /** Texte complet facultatif qui remplace l'assemblage automatique du mode. */
  texte_personnaliser: promptText.optional(),
  texte_laisser_choisir: promptText.optional(),
  a_quoi_sert: text,
  comment_utiliser: text,
});

const modelChoice = z.strictObject({
  nom: z.string().trim().min(1).nullable(),
  note: z.string().trim().optional(),
});

export const stepSchema = z.strictObject({
  id: slug,
  titre: text,
  objectif: text,
  prerequis: z.array(text).default([]),
  outil: z.strictObject({ nom: text, url: url.nullable() }),
  modeles: z.strictObject({
    minimum: modelChoice,
    recommande: modelChoice,
    economique: modelChoice.nullable().default(null),
    date_verification: isoDate.nullable(),
    source: z.string().trim().nullable().default(null),
  }),
  reglages: z.array(text).default([]),
  prompt,
  resultat_attendu: z.strictObject({ description: text, format: text }),
  verification: text,
  etape_suivante: text,
  livrables: z.array(z.strictObject({ nom: text, format: text })).default([]),
});

const configuration = z.strictObject({
  nom: text,
  role: text,
  lien: url.nullable(),
  etapes: z.array(text).min(1),
  verification: text,
});

const budgetLine = z.strictObject({
  libelle: text,
  min: amount,
  max: amount,
  recurrence: z.enum(keys(RECURRENCES)),
  nature,
  hypothese: z.string().trim().optional(),
});

export const ficheSchema = z.strictObject({
  id: slug,
  version: text,
  demonstration: z.boolean(),
  titre: text.max(80),
  resume: text.max(240),
  categorie: slug,
  pays: z.array(z.enum(keys(COUNTRIES))).min(1),
  date_verification: isoDate.nullable(),
  acces: z.strictObject({ gratuit: z.boolean() }),
  difficulte: z.strictObject({ niveau: z.enum(keys(DIFFICULTIES)), explication: text }),
  competences: z.array(z.enum(keys(SKILLS))).min(1),
  materiel: z.array(z.enum(keys(EQUIPMENT))).min(1),
  filtres: z.strictObject({
    budget_lancement: range,
    depenses_mensuelles: range,
    heures_hebdo: range,
  }),
  apercu: z.strictObject({
    client_cible: text,
    probleme: text,
    offre: text,
    exemple_livrable: z.strictObject({ description: text, nature }),
    references: z
      .array(
        z.strictObject({
          nom: text,
          url_officielle: url.nullable(),
          description: text,
          sources: z.array(source).default([]),
          date_verification: isoDate.nullable(),
          nature,
        }),
      )
      .default([]),
    adaptation_locale: text,
    alternatives: z.array(text).default([]),
    hypotheses: z.array(text).default([]),
    outils: z
      .array(z.strictObject({ nom: text, url: url.nullable(), role: text, obligatoire: z.boolean(), cout: text }))
      .default([]),
    budget: z.strictObject({ lignes: z.array(budgetLine), note: z.string().trim().default("") }),
    exploitation: z.strictObject({ preparation: text, exploitation: text, maintenance: text, travail_humain: text }),
    role_ia: z.strictObject({ construction: text, fonctionnement: text }),
    test_demande: z.strictObject({
      description: text,
      criteres_poursuite: z.array(text).min(1),
      criteres_revision: z.array(text).min(1),
    }),
    livrables: z.array(z.strictObject({ nom: text, format: text })).default([]),
    visuels: z.array(z.strictObject({ url: z.string().min(1), alt: text, legende: z.string().trim().default("") })).default([]),
    risques: z.array(text).default([]),
    limites: z.string().trim().default(""),
  }),
  reserve: z.strictObject({
    kit: z.strictObject({
      prompt_cadrage: prompt,
      resume_transmission: prompt,
      configurations: z.array(configuration).default([]),
      ressources: z.array(z.strictObject({ titre: text, url, description: text })).default([]),
    }),
    etapes: z.array(stepSchema).min(1, "Au moins une étape est nécessaire."),
  }),
});

export const importSchema = z
  .strictObject({
    schema_version: z.literal(SCHEMA_VERSION, { message: `Version de schéma attendue : « ${SCHEMA_VERSION} ».` }),
    fiches: z.array(z.unknown()).min(1, "Le fichier ne contient aucune fiche."),
  });

export type Fiche = z.infer<typeof ficheSchema>;
export type Step = z.infer<typeof stepSchema>;
export type PromptDef = z.infer<typeof prompt>;
export type FicheApercu = Fiche["apercu"];
export type KitContent = Fiche["reserve"]["kit"];
export type StepContent = Omit<Step, "id" | "titre">;

export type ImportIssue = { fiche: string; champ: string; message: string };

function pathToString(path: PropertyKey[]): string {
  return path.reduce<string>((acc, p) => (typeof p === "number" ? `${acc}[${p + 1}]` : acc ? `${acc}.${String(p)}` : String(p)), "");
}

/**
 * Valide un fichier d'import complet. Les erreurs indiquent la fiche
 * (identifiant ou rang) et le champ concerné, en français.
 */
export function validateImport(raw: unknown, knownCategories: string[]):
  | { ok: true; fiches: Fiche[] }
  | { ok: false; issues: ImportIssue[] } {
  const head = importSchema.safeParse(raw);
  if (!head.success) {
    return {
      ok: false,
      issues: head.error.issues.map((i) => ({ fiche: "(fichier)", champ: pathToString(i.path) || "(racine)", message: i.message })),
    };
  }
  const issues: ImportIssue[] = [];
  const fiches: Fiche[] = [];
  const seen = new Map<string, number>();
  head.data.fiches.forEach((f, idx) => {
    const label =
      f && typeof f === "object" && typeof (f as { id?: unknown }).id === "string"
        ? `${(f as { id: string }).id} (n° ${idx + 1})`
        : `fiche n° ${idx + 1}`;
    const r = ficheSchema.safeParse(f);
    if (!r.success) {
      for (const i of r.error.issues) issues.push({ fiche: label, champ: pathToString(i.path) || "(fiche)", message: i.message });
      const cat = (f as { categorie?: unknown })?.categorie;
      if (typeof cat === "string" && /^[a-z0-9-]+$/.test(cat) && !knownCategories.includes(cat)) {
        issues.push({ fiche: label, champ: "categorie", message: `Catégorie inconnue. Valeurs possibles : ${knownCategories.join(", ")}.` });
      }
      return;
    }
    const fiche = r.data;
    if (seen.has(fiche.id)) {
      issues.push({ fiche: label, champ: "id", message: `Identifiant déjà utilisé par la fiche n° ${seen.get(fiche.id)! + 1} du fichier.` });
    }
    seen.set(fiche.id, idx);
    if (!knownCategories.includes(fiche.categorie)) {
      issues.push({ fiche: label, champ: "categorie", message: `Catégorie inconnue. Valeurs possibles : ${knownCategories.join(", ")}.` });
    }
    const stepIds = new Set<string>();
    fiche.reserve.etapes.forEach((s, si) => {
      if (stepIds.has(s.id)) issues.push({ fiche: label, champ: `reserve.etapes[${si + 1}].id`, message: "Identifiant d'étape en double." });
      stepIds.add(s.id);
    });
    fiches.push(fiche);
  });
  return issues.length ? { ok: false, issues } : { ok: true, fiches };
}
