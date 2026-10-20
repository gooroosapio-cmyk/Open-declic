import { COUNTRIES, DIFFICULTIES, EQUIPMENT, SKILLS, formatRange } from "./constants";
import type { KitContent, PromptDef, StepContent } from "./fiche-schema";

/**
 * Assemblage déterministe des prompts à copier.
 * Open declic ne génère rien : il juxtapose des textes préparés
 * (contexte de la fiche + règles communes + mode + mission).
 */

export type PromptMode = "personnaliser" | "laisser_choisir";

export const MODE_LABELS: Record<PromptMode, string> = {
  personnaliser: "Personnaliser",
  laisser_choisir: "Laisser l'IA choisir",
};

export const MODE_HINTS: Record<PromptMode, string> = {
  personnaliser: "L'IA vous pose d'abord les questions utiles, avec des options et sa recommandation.",
  laisser_choisir: "L'IA propose directement une configuration cohérente et annonce ses hypothèses. Tout reste modifiable.",
};

export type ProjectContext = {
  title: string;
  summary: string;
  countries: string[];
  difficulty: string;
  skills: string[];
  equipment: string[];
  launchBudget: { min: number | null; max: number | null };
  monthlyCost: { min: number | null; max: number | null };
  weeklyHours: { min: number | null; max: number | null };
  targetClient: string;
  problem?: string;
  workName?: string | null;
  odNumber?: string | null;
  offer: string;
  localAdaptation: string;
  aiRole: string;
};

export const COMMON_RULES = `RÈGLES À RESPECTER PENDANT TOUTE NOTRE CONVERSATION
1. Explique d'abord simplement l'objectif de cette étape, en quelques phrases, sans jargon. Si un terme technique est nécessaire, définis-le.
2. Utilise les informations déjà connues ci-dessus et les résultats que je te transmets. Ne me repose pas une question déjà résolue.
3. Pose au maximum trois questions à la fois. Pour chacune, propose deux ou trois options simples, indique ta recommandation et laisse-moi répondre librement.
4. Si je ne sais pas répondre, propose un choix raisonnable, explique pourquoi, et continue.
5. Guide-moi par petites étapes. Pour chaque action : où aller, quoi faire, le résultat attendu et comment vérifier que c'est réussi.
6. Réalise toi-même les actions accessibles dans ton environnement autorisé (rédaction, code, fichiers). Indique clairement ce que je dois faire moi-même.
7. N'invente jamais une action réalisée, un test exécuté, une connexion à un service, un chiffre de marché, un budget ou une compétence que je n'ai pas indiqués. Distingue toujours ce que tu as réellement fait de ce que tu proposes.
8. Si une erreur apparaît, aide-moi à la comprendre et à la résoudre avant de passer à la suite.
9. Demande mon accord explicite avant toute dépense, tout abonnement, toute publication publique ou toute opération destructive.
10. Ne me demande jamais de mot de passe, de clé secrète ou de code de vérification.
11. Termine en livrant le résultat attendu dans le format demandé, une vérification simple, la prochaine action utile, puis un résumé de transmission.`;

export const HANDOVER_RULES = `RÉSUMÉ DE TRANSMISSION À FOURNIR À LA FIN
Rédige un bloc intitulé « Résumé de transmission » que je pourrai coller dans une nouvelle conversation ou un autre outil IA. Il contient : le contexte du projet, les décisions prises, les fichiers utiles et leur emplacement, les tâches réalisées, les problèmes rencontrés ou ouverts, et la prochaine action. Il ne contient aucun mot de passe, aucune clé, aucun identifiant de connexion ni aucune donnée personnelle sensible.`;

export const MODE_RULES: Record<PromptMode, string> = {
  personnaliser: `MODE : PERSONNALISER
Avant de produire quoi que ce soit, identifie les informations qui manquent réellement pour réussir cette étape (par exemple mon budget, mon temps disponible, ma ville, mes outils ou mes préférences). Pose-moi ensuite les questions utiles, trois au maximum à la fois, avec des options et ta recommandation. Attends mes réponses, puis réalise la mission. Si tout est déjà connu, commence directement.`,
  laisser_choisir: `MODE : LAISSER L'IA CHOISIR
Propose directement une configuration cohérente avec les contraintes connues et réalise la mission. Pour les choix créatifs (nom, style, angle, exemples), tu peux varier les propositions ; si plusieurs directions sont utiles, présente-en trois au maximum et retiens la plus simple à tester. Annonce clairement chaque hypothèse que tu fais, présente-la comme modifiable, et explique comment la changer. N'invente jamais mes ressources personnelles (budget, matériel, compétences, contacts, comptes) ni des faits de marché, des prix ou des statistiques : signale-les comme « à vérifier » ou demande-les. Ne choisis pas au hasard les dépenses, les accès ou les règles de sécurité. Ne pose une question que si son absence empêche une réponse fiable.`,
};

const list = (items: string[]) => items.map((i) => `- ${i}`).join("\n");
const label = <T extends Record<string, string>>(dict: T, keys: string[]) =>
  keys.map((k) => dict[k as keyof T] ?? k).join(", ");

export function projectContextBlock(p: ProjectContext): string {
  const lines = [
    `CONTEXTE DU PROJET (fiche Open declic${p.odNumber ? ` ${p.odNumber}` : ""})`,
    `Projet : ${p.title}${p.workName ? ` (nom de travail : ${p.workName})` : ""}`,
    `Résumé : ${p.summary}`,
    `Client cible : ${p.targetClient}`,
  ];
  if (p.problem) lines.push(`Problème traité : ${p.problem}`);
  return `${lines.join("\n")}
Offre : ${p.offer}
Pays étudié(s) : ${label(COUNTRIES, p.countries)}
Adaptation locale envisagée : ${p.localAdaptation}
Difficulté : ${DIFFICULTIES[p.difficulty as keyof typeof DIFFICULTIES] ?? p.difficulty}
Compétences utiles : ${label(SKILLS, p.skills)}
Matériel nécessaire : ${label(EQUIPMENT, p.equipment)}
Budget de lancement estimé par la fiche : ${formatRange(p.launchBudget.min, p.launchBudget.max)}
Dépenses mensuelles estimées par la fiche : ${formatRange(p.monthlyCost.min, p.monthlyCost.max)}
Temps hebdomadaire estimé : ${formatRange(p.weeklyHours.min, p.weeklyHours.max, "h")}
Rôle de l'IA dans ce projet : ${p.aiRole}
Ces montants et durées sont des estimations de la fiche, pas des faits vérifiés pour ma situation.`;
}

function stepBlock(step: StepContent & { titre: string }, index: number, total: number): string {
  const parts = [
    `ÉTAPE ${index} SUR ${total} : ${step.titre}`,
    `Objectif : ${step.objectif}`,
  ];
  if (step.prerequis.length) parts.push(`Prérequis :\n${list(step.prerequis)}`);
  parts.push(`Outil utilisé : ${step.outil.nom}${step.outil.url ? ` (${step.outil.url})` : ""}`);
  if (step.reglages.length) parts.push(`Réglages utiles :\n${list(step.reglages)}`);
  parts.push(`Résultat attendu : ${step.resultat_attendu.description}\nFormat attendu : ${step.resultat_attendu.format}`);
  parts.push(`Vérification : ${step.verification}`);
  return parts.join("\n");
}

function assemble(blocks: string[]): string {
  return blocks.filter(Boolean).join("\n\n");
}

/** Prompt d'une étape du parcours. */
export function buildStepPrompt(
  ctx: ProjectContext,
  step: StepContent & { titre: string },
  index: number,
  total: number,
  mode: PromptMode,
): string {
  const override = mode === "personnaliser" ? step.prompt.texte_personnaliser : step.prompt.texte_laisser_choisir;
  if (override) return override;
  return assemble([
    `Je prépare un projet avec l'aide d'Open declic, une bibliothèque de projets. Tu vas m'accompagner sur une étape précise.`,
    projectContextBlock(ctx),
    stepBlock(step, index, total),
    `MISSION\n${step.prompt.mission}`,
    MODE_RULES[mode],
    COMMON_RULES,
    HANDOVER_RULES,
    `Si j'ai déjà un résumé de transmission d'une étape précédente, je le colle à la suite de ce message. Commence maintenant.`,
  ]);
}

/** Prompt initial de cadrage ou de résumé de transmission (niveau kit). */
export function buildKitPrompt(ctx: ProjectContext, def: PromptDef, mode: PromptMode, kind: "cadrage" | "transmission"): string {
  const override = mode === "personnaliser" ? def.texte_personnaliser : def.texte_laisser_choisir;
  if (override) return override;
  const intro =
    kind === "cadrage"
      ? `Je démarre un projet avec l'aide d'Open declic, une bibliothèque de projets. Tu vas m'aider à le cadrer avant de passer aux étapes.`
      : `Je travaille sur un projet préparé avec Open declic. J'ai besoin d'un résumé de transmission propre pour continuer dans une autre conversation ou un autre outil IA.`;
  return assemble([
    intro,
    projectContextBlock(ctx),
    `MISSION\n${def.mission}`,
    MODE_RULES[mode],
    COMMON_RULES,
    kind === "cadrage" ? HANDOVER_RULES : "",
    `Commence maintenant.`,
  ]);
}

export type KitPrompts = Pick<KitContent, "prompt_cadrage" | "resume_transmission">;
