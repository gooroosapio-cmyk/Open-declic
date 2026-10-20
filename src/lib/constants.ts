// Libellés et listes fermées partagés par le catalogue, les filtres et l'import.

export const BRAND = "Open declic";
export const SIGNATURE = "Trouvez votre idée. Comprenez le modèle. Passez à l'action.";
export const FULL_ACCESS_PRICE_FCFA = 15000;

export const DIFFICULTIES = {
  debutant: "Débutant",
  intermediaire: "Intermédiaire",
  avance: "Avancé",
} as const;
export type Difficulty = keyof typeof DIFFICULTIES;
export const DIFFICULTY_ORDER: Difficulty[] = ["debutant", "intermediaire", "avance"];

export const SKILLS = {
  aucune: "Aucune compétence particulière",
  redaction: "Rédaction",
  design: "Sens visuel",
  marketing: "Marketing",
  vente: "Vente et relation client",
  programmation: "Notions de programmation",
  gestion: "Organisation et gestion",
  video: "Vidéo",
} as const;
export type Skill = keyof typeof SKILLS;

export const EQUIPMENT = {
  smartphone: "Smartphone",
  ordinateur: "Ordinateur",
  internet: "Connexion internet régulière",
  "appareil-photo": "Appareil photo",
  micro: "Micro",
} as const;
export type Equipment = keyof typeof EQUIPMENT;

export const COUNTRIES = {
  CI: "Côte d'Ivoire",
  SN: "Sénégal",
  CM: "Cameroun",
  FR: "France",
} as const;
export type Country = keyof typeof COUNTRIES;

/** Nature d'une information : jamais présenter une estimation comme un fait. */
export const NATURES = {
  fait_verifie: "Fait vérifié",
  estimation: "Estimation",
  hypothese: "Hypothèse",
  exemple: "Exemple",
} as const;
export type Nature = keyof typeof NATURES;

export const RECURRENCES = {
  unique: "Une fois",
  mensuel: "Par mois",
  annuel: "Par an",
  usage: "À l'usage",
} as const;
export type Recurrence = keyof typeof RECURRENCES;

export function formatFcfa(n: number): string {
  return `${new Intl.NumberFormat("fr-FR").format(n).replace(/ | /g, " ")} FCFA`;
}

/** Fourchette en FCFA ; un montant inconnu n'est jamais affiché comme zéro. */
export function formatRange(min: number | null, max: number | null, unit: "fcfa" | "h" = "fcfa"): string {
  const f = (n: number) => (unit === "fcfa" ? formatFcfa(n) : `${n} h`);
  if (min == null && max == null) return "Non renseigné";
  if (min != null && max != null) return min === max ? f(min) : `${f(min).replace(" FCFA", "")} – ${f(max)}`.replace(" h –", " –");
  if (min != null) return `À partir de ${f(min)}`;
  return `Jusqu'à ${f(max!)}`;
}
