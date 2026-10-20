// Convertit les sources du catalogue V1 en fichier d'import Open declic (schéma 1.1).
//
//   Entrées : content/sources/catalogue-200-v1.json   (extrait du PDF, voir extract-catalogue-pdf.py)
//             content/sources/Open_declic_10_Fiches_Claude_V1.md (fiches complètes OD-001 à OD-010)
//   Sortie  : content/catalogue-v1.json
//
// Les textes sont repris tels quels. Seuls changements éditoriaux, appliqués de façon déterministe :
//   - les phrases des prompts qui fixaient le mode (« Mode Laisser l'IA choisir… cinq QCM ») sont retirées,
//     le mode étant choisi dans la console d'Open declic (au maximum trois questions à la fois) ;
//   - le prompt de démarrage cible directement l'identifiant de la fiche.
import { readFileSync, writeFileSync } from "node:fs";
import { SCHEMA_VERSION, validateImport, type AnyFiche, type Fiche, type Modele, type Step } from "../src/lib/fiche-schema";

type SourceModel = {
  numero: string; titre: string; type: string; domaine: string; client: string; difficulte: string; ia: string;
  v1: string; local: string; revenu: string; construire: string; preuve: "A" | "B" | "O"; source_nom: string | null; source_url: string | null;
};

const CATALOGUE_DATE = "2026-10-20";
const FREE = new Set(["OD-001", "OD-003"]); // fiches complètes gratuites (réglable dans l'administration)
const EUR_XOF = 655.957; // parité fixe

const models: SourceModel[] = JSON.parse(readFileSync("content/sources/catalogue-200-v1.json", "utf8")).modeles;
const md = readFileSync("content/sources/Open_declic_10_Fiches_Claude_V1.md", "utf8").replace(/\r\n/g, "\n");

const CATEGORY: Record<string, string> = { "SaaS/App": "saas-app", Site: "site", Jeu: "jeu" };
const LEVEL: Record<string, Fiche["difficulte"]["niveau"]> = { G1: "debutant", G2: "intermediaire", G3: "avance" };
const LEVEL_TEXT: Record<string, string> = {
  G1: "G1 : périmètre limité. Bon point de départ : peu de rôles, peu d'intégrations et logique simple. La sécurité et le paiement restent nécessaires.",
  G2: "G2 : davantage de règles, fichiers ou collaboration. Commencer par un pilote et avancer par modules avec la même méthode IA.",
  G3: "G3 : vidéo, orchestration, collecte technique ou temps réel plus exigeant. À envisager après un premier produit ; prévoir une revue technique avant production.",
};
const AI: Record<string, "non_necessaire" | "optionnelle" | "requise"> = { "IA N": "non_necessaire", "IA O": "optionnelle", "IA R": "requise" };
const CLIENT: Record<string, "b2b" | "b2c" | "b2b2c"> = { B2B: "b2b", B2C: "b2c", B2B2C: "b2b2c" };
const EVIDENCE_TEXT = {
  A: "Preuve A : adoption ou cas d'usage annoncé par l'éditeur, sans audit indépendant de revenus.",
  B: "Preuve B : produit de référence documenté ; ses ventes et sa rentabilité ne sont pas prouvées.",
  O: "Preuve O : proposition originale Open declic, hypothèse à valider.",
};
const LIMITS_CATALOGUE =
  "Modèle du catalogue V1 : le périmètre, la cible locale, la méthode de construction et la piste de revenu sont des propositions d'adaptation Open declic. Les sources peuvent évoluer : vérifier capacités, prix, licences et pays pris en charge au moment de construire. Les suggestions de revenus ne garantissent aucune vente.";

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const slugOf = (numero: string) => numero.toLowerCase();
const clean = (s: string) => s.replace(/\s+/g, " ").trim();
const firstSentenceUnder = (s: string, max: number) => {
  if (s.length <= max) return s;
  const cut = s.slice(0, max);
  const i = cut.lastIndexOf(". ");
  return i > 40 ? cut.slice(0, i + 1) : `${cut.slice(0, max - 1).trimEnd()}…`;
};

function base(m: SourceModel) {
  return {
    id: slugOf(m.numero),
    version: "1",
    demonstration: false,
    titre: m.titre,
    categorie: CATEGORY[m.type],
    date_verification: null,
    acces: { gratuit: FREE.has(m.numero) },
    difficulte: { niveau: LEVEL[m.difficulte], explication: LEVEL_TEXT[m.difficulte] },
    filtres: {
      budget_lancement: { min: null, max: null },
      depenses_mensuelles: { min: null, max: null },
      heures_hebdo: { min: null, max: null },
    },
  };
}

function reference(m: SourceModel, extra = "") {
  if (!m.source_url || !m.source_nom) return [];
  return [{
    nom: m.source_nom,
    url_officielle: m.source_url,
    description: clean(`${EVIDENCE_TEXT[m.preuve]} ${extra}`),
    sources: [{ titre: `Page officielle de ${m.source_nom}`, url: m.source_url, date_consultation: CATALOGUE_DATE }],
    date_verification: null,
    nature: "fait_verifie" as const,
  }];
}

function catalogueOf(m: SourceModel, workName: string | null, featured: boolean) {
  return {
    numero: m.numero, nom_travail: workName, domaine: m.domaine, client: CLIENT[m.client],
    ia_usage: AI[m.ia], preuve: m.preuve, mise_en_avant: featured,
  };
}

// ---------------------------------------------------------------------------
// Modèles (190)
// ---------------------------------------------------------------------------

function toModele(m: SourceModel): Modele {
  return {
    ...base(m),
    niveau_contenu: "modele",
    resume: m.v1,
    pays: [],
    competences: [],
    materiel: [],
    catalogue: catalogueOf(m, null, false),
    apercu: {
      v1: m.v1,
      adaptation_locale: m.local,
      revenu: m.revenu,
      construire: m.construire,
      references: reference(m),
      visuels: [],
      limites: m.preuve === "O" ? `${EVIDENCE_TEXT.O} ${LIMITS_CATALOGUE}` : LIMITS_CATALOGUE,
    },
  };
}

// ---------------------------------------------------------------------------
// Fiches complètes (10) depuis le document Markdown
// ---------------------------------------------------------------------------

function section(src: string, startRe: RegExp, endRe: RegExp): string {
  const s = src.search(startRe);
  if (s < 0) throw new Error(`Section introuvable : ${startRe}`);
  const rest = src.slice(s);
  const firstLineEnd = rest.indexOf("\n");
  const e = rest.slice(firstLineEnd).search(endRe);
  return e < 0 ? rest : rest.slice(0, firstLineEnd + e);
}
const bold = (src: string, label: string) => {
  const m = src.match(new RegExp(`^\\*\\*${label}\\.\\*\\* (.+)$`, "m"));
  if (!m) throw new Error(`Champ « ${label} » introuvable`);
  return m[1].trim();
};

const intro = section(md, /^# Open declic$/m, /^## Socle commun/m).trim();
const socle = section(md, /^## Socle commun/m, /^# OD-001/m).replace(/\n---\s*$/, "").trim();
const references = section(md, /^# Références techniques/m, /^\*\*Open declic — Votre idée/m).trim();
const commonHypotheses = section(md, /^### Hypothèses de départ communes/m, /^### Répartition/m).trim();
const roles = section(md, /^### Répartition des rôles/m, /^### Prompt de démarrage/m).trim();
const starter = md.match(/### Prompt de démarrage à copier dans Claude\n\n```text\n([\s\S]*?)\n```/)![1];
const humanWork = md.match(/^5\. (Le porteur du projet ouvre ses comptes.*)$/m)![1];

const TECH_REFS = [...references.matchAll(/^- \*\*(T\d{2})\*\* — \[(.+?)\]\((https:\/\/[^)]+)\)\.$/gm)].map((r) => ({
  titre: `${r[1]} — ${r[2]}`, url: r[3], description: "Source officielle citée par la fiche, consultée le 20 octobre 2026. À revérifier au moment de l'intégration.",
}));

const MODE_SENTENCES = [
  "Mode Laisser l’IA choisir : avance avec les valeurs par défaut et note les décisions. Si je demande Personnaliser, limite-toi à cinq QCM réellement utiles. ",
  "Mode par défaut : Laisser l’IA choisir. Reprends les hypothèses du document, indique-les et avance. Si je demande Personnaliser, pose au maximum cinq QCM utiles, jamais une question dont la réponse est déjà connue. ",
];
function stripMode(prompt: string): string {
  let out = prompt;
  for (const s of MODE_SENTENCES) out = out.replace(s, "");
  if (/cinq QCM/.test(out)) throw new Error("Phrase de mode non retirée");
  return out.trim();
}

const STEP_INFO: Record<string, { objectif: string; format: string; reglages: string[] }> = {
  E01: { objectif: "Préparer avec GPT le cadrage et les textes du projet, à transmettre ensuite à Claude.", format: "Fichiers brief.md, personas.md, parcours.md, textes-interface.csv et textes-email.md", reglages: ["Conservez les fichiers produits : vous les joindrez à Claude à l'étape suivante, plutôt qu'un résumé de mémoire."] },
  E02: { objectif: "Initialiser le dépôt, la configuration et les environnements, sans aucun secret dans le code.", format: "Dépôt exécutable, CLAUDE.md, README et .env.example sans secret", reglages: [] },
  E03: { objectif: "Obtenir une interface navigable, accessible et cohérente avec la direction visuelle proposée.", format: "docs/design-system.md, tokens CSS, composants et captures 360, 768 et 1440 px", reglages: [] },
  E04: { objectif: "Construire le parcours complet du MVP, relié à des données de test persistantes.", format: "Code de la tranche fonctionnelle et docs/architecture.md", reglages: [] },
  E05: { objectif: "Isoler les données de chaque compte et vérifier que les accès non autorisés sont refusés.", format: "Migrations versionnées, politiques RLS et docs/security.md", reglages: [] },
  E06: { objectif: "Préparer la facturation Visa avec un adaptateur simulé et des tests, sans fausse activation.", format: "Adaptateur de paiement, tests et docs/payments.md", reglages: ["PAYMENTS_ENABLED reste à false en production tant que la recette Visa n'est pas démontrée."] },
  E07: { objectif: "Préparer un aperçu protégé, le domaine, la sauvegarde et la procédure de retour arrière.", format: "URL d'aperçu protégée et docs/deploy.md", reglages: ["Demandez votre validation avant toute publication publique ou dépense."] },
  E08: { objectif: "Exécuter la recette, corriger les défauts et documenter les preuves observées.", format: "docs/test-report.md daté, avec captures utiles et liste des défauts", reglages: [] },
  E09: { objectif: "Préparer le pilote, le suivi et le premier point de décision.", format: "docs/runbook.md, plan-pilote.md, guide-utilisateur.md, FAQ et messages en brouillon", reglages: ["N'envoyez aucun message à de vrais clients sans l'avoir validé."] },
};

const CLAUDE_CODE_NOTE = "Pour produire et exécuter le code, utilisez Claude Code relié au dépôt : une simple conversation peut proposer des fichiers sans pouvoir les exécuter.";

function tool(label: string): { nom: string; url: string | null } {
  const l = label.replace(/\.$/, "");
  if (l === "GPT") return { nom: "GPT (ChatGPT)", url: "https://chatgpt.com" };
  return { nom: l, url: "https://claude.ai" };
}

function toFiche(m: SourceModel): Fiche {
  const block = section(md, new RegExp(`^# ${m.numero} — `, "m"), /^# (OD-\d{3}|Références techniques)/m).replace(/\n---\s*$/, "").trim();
  const header = block.match(/^\*\*Nom de travail : (.+?)\*\* · (.+)$/m)!;
  const workName = header[1];
  const refLine = block.match(/^\*\*Référence existante : \[(.+?)\]\((https:\/\/[^)]+)\)\*\*\. (.+)$/m)!;
  const A = section(block, /^## A\. /m, /^## B\. /m);
  const D = section(block, /^## D\. /m, /^## E\. /m);
  const G = block.slice(block.search(/^## G\. /m));
  const F = section(block, /^## F\. /m, /^## G\. /m);
  // Cahier réservé : écrans, données, sécurité, recette et exploitation (l'offre A est déjà publique).
  const cahier = block
    .slice(block.search(/^## B\. /m))
    .replace(/^## F\. [\s\S]*?(?=^## G\. )/m, "")
    .trim();

  const resultat = bold(A, "Résultat vendu");
  const validation = bold(A, "Validation locale");
  const monetisation = bold(A, "Monétisation");
  const continueSentence = validation.match(/Continuer[^.]*\./)?.[0];

  const stepBlocks = [...F.matchAll(new RegExp(`^### ${m.numero}-(E\\d{2}) — (.+)\\n\\n\\*\\*Outil : (.+?)\\*\\*\\n\\n\`\`\`text\\n([\\s\\S]*?)\\n\`\`\`\\n\\n\\*\\*Contrôle du débutant et livrable attendu\\.\\*\\* (.+)$`, "gm"))];
  if (stepBlocks.length !== 9) throw new Error(`${m.numero} : ${stepBlocks.length} étapes au lieu de 9`);

  const steps: Step[] = stepBlocks.map((sb, i) => {
    const [, code, titre, outil, prompt, controle] = sb;
    const info = STEP_INFO[code];
    const [verif, result] = controle.split(/ Résultat : /);
    const t = tool(outil);
    const next = stepBlocks[i + 1];
    return {
      id: `${slugOf(m.numero)}-${code.toLowerCase()}`,
      titre,
      objectif: info.objectif,
      prerequis: i === 0
        ? ["Le dossier de la fiche, à joindre à l'outil IA (bouton « Télécharger le dossier »)."]
        : ["Le dossier de la fiche, à joindre à l'outil IA.", "Les fichiers produits aux étapes précédentes."],
      outil: t,
      modeles: {
        minimum: { nom: null, note: "La fiche ne précise pas de modèle : à tester avant de l'indiquer." },
        recommande: { nom: null, note: "La fiche ne précise pas de modèle : à tester avant de l'indiquer." },
        economique: null,
        date_verification: null,
        source: null,
      },
      reglages: [...info.reglages, ...(t.nom.startsWith("Claude") && code !== "E01" ? [CLAUDE_CODE_NOTE] : [])],
      prompt: {
        titre,
        mission: stripMode(prompt),
        a_quoi_sert: `${info.objectif}${result ? ` Résultat attendu : ${result}` : ""}`,
        comment_utiliser: `Ouvrez ${t.nom}. Joignez le dossier de la fiche${i > 0 ? " et les fichiers des étapes précédentes" : ""}, collez le prompt puis vérifiez le résultat avant de passer à l'étape suivante. N'envoyez pas les neuf prompts en même temps.`,
      },
      resultat_attendu: { description: result ? capitalize(result.replace(/\.$/, "")) + "." : "Dossier de cadrage prêt à joindre à Claude.", format: info.format },
      verification: verif.trim(),
      etape_suivante: next ? next[2] : "Point de décision après les premiers retours réels du pilote.",
      livrables: [],
    };
  });

  const dossier = [
    intro,
    socle,
    `---\n\n${block}`,
    `---\n\n${references}`,
  ].join("\n\n");

  const v1 = bold(A, "V1");
  return {
    ...base(m),
    niveau_contenu: "complete",
    resume: firstSentenceUnder(resultat, 240),
    pays: ["CI"],
    competences: ["aucune"],
    materiel: ["ordinateur", "internet"],
    filtres: {
      budget_lancement: { min: null, max: null },
      depenses_mensuelles: { min: Math.round(50 * EUR_XOF), max: Math.round(100 * EUR_XOF) },
      heures_hebdo: { min: null, max: null },
    },
    catalogue: catalogueOf(m, workName, true),
    difficulte: { niveau: LEVEL[m.difficulte], explication: LEVEL_TEXT[m.difficulte] },
    apercu: {
      client_cible: bold(A, "Client"),
      offre: resultat,
      v1,
      reporte: bold(A, "Reporté"),
      revenu: monetisation,
      construire: m.construire,
      references: [{
        nom: refLine[1],
        url_officielle: refLine[2],
        description: clean(`${EVIDENCE_TEXT[m.preuve]} ${refLine[3]}`),
        sources: [{ titre: `Page officielle de ${refLine[1]}`, url: refLine[2], date_consultation: CATALOGUE_DATE }],
        date_verification: null,
        nature: "fait_verifie",
      }],
      adaptation_locale: m.local,
      alternatives: [],
      hypotheses: [
        monetisation,
        "Marché pilote : une niche en Côte d'Ivoire, puis adaptation pays par pays. C'est une hypothèse de cadrage, pas une validation de marché.",
        "Utilisateurs : 5 à 10 clients pilotes invités avant ouverture générale.",
      ],
      outils: [
        { nom: "GPT (ChatGPT)", url: "https://chatgpt.com", role: "Cadrage, rédaction et relecture indépendante.", obligatoire: true, cout: "Selon l'offre choisie ; à vérifier." },
        { nom: "Claude Code", url: "https://code.claude.com/docs/en/overview", role: "Conception et développement : dépôt, migrations, composants, tests et aperçu.", obligatoire: true, cout: "Selon l'offre choisie ; à vérifier." },
        { nom: "Supabase", url: "https://supabase.com", role: "Base PostgreSQL, authentification et stockage du produit.", obligatoire: true, cout: "À vérifier avant souscription." },
        { nom: "Hébergement compatible avec un usage commercial", url: null, role: "Mise en ligne de l'application. L'offre Hobby de Vercel est limitée à un usage personnel non commercial.", obligatoire: true, cout: "À vérifier avant souscription." },
        { nom: "Service de courriels transactionnels", url: null, role: "Envoi des confirmations et notifications, avec domaine vérifié.", obligatoire: true, cout: "À vérifier avant souscription." },
        { nom: "Prestataire de paiement acceptant Visa", url: null, role: "Encaissement de l'abonnement, uniquement si la restriction Visa avant débit est démontrée ; sinon pilote gratuit.", obligatoire: false, cout: "Frais du prestataire à vérifier." },
      ],
      budget: {
        lignes: [
          { libelle: "Infrastructure du pilote", min: Math.round(50 * EUR_XOF), max: Math.round(100 * EUR_XOF), recurrence: "mensuel", nature: "hypothese", hypothese: "Objectif indicatif de 50 à 100 € par mois (1 € = 655,957 FCFA), hors abonnements IA, taxes, domaine et frais Visa. Ce n'est pas un tarif garanti." },
          { libelle: "Abonnements aux outils IA", min: null, max: null, recurrence: "mensuel", nature: "hypothese", hypothese: "Selon les offres GPT et Claude choisies." },
          { libelle: "Nom de domaine", min: null, max: null, recurrence: "annuel", nature: "hypothese", hypothese: "Choisi et acheté après vérification de disponibilité et du prix de renouvellement." },
          { libelle: "Frais du prestataire de paiement Visa", min: null, max: null, recurrence: "usage", nature: "hypothese", hypothese: "Selon le prestataire éligible retenu." },
        ],
        note: "Construire un devis de fournisseurs avant activation. Le budget de lancement n'est pas chiffré par la fiche : il reste « non renseigné », pas nul.",
      },
      exploitation: {
        preparation: "Suivre les neuf étapes dans l'ordre et vérifier le résultat de chacune avant la suivante.",
        exploitation: "Chaque semaine : erreurs, courriels, files de tâches, paiements, demandes de suppression, quotas et coûts. Chaque mois : sauvegarde restaurée sur un environnement isolé, droits d'équipe revus et dépendances mises à jour avec recette.",
        maintenance: bold(G, "Maintenir"),
        travail_humain: humanWork,
      },
      role_ia: {
        construction: `GPT prépare le cadrage, les textes et la relecture ; Claude produit les fichiers, le code, les migrations et les tests. ${m.construire}`,
        fonctionnement: `IA à l'usage : non nécessaire en V1. Extension facultative : ${bold(G, "Extension facultative")}`,
      },
      test_demande: {
        description: validation,
        criteres_poursuite: [continueSentence ?? validation],
        criteres_revision: [],
      },
      livrables: [
        { nom: "Dépôt de code exécutable avec README et CLAUDE.md", format: "Dépôt Git" },
        { nom: "Migrations et politiques d'accès", format: ".sql" },
        { nom: "Documents de sécurité, paiement et déploiement", format: "docs/security.md, docs/payments.md, docs/deploy.md" },
        { nom: "Rapport de recette daté", format: "docs/test-report.md" },
        { nom: "Guide d'exploitation", format: "docs/runbook.md" },
      ],
      visuels: [],
      risques: [
        clean(D.split("\n").filter((l) => l && !l.startsWith("#"))[0]),
        "Paiement Visa : module désactivé tant que l'éligibilité du marchand et la restriction Visa avant débit ne sont pas démontrées.",
      ],
      limites: "Spécification et prompts de construction, pas une application déjà réalisée ou testée. La présence d'une offre commerciale ailleurs ne prouve ni sa rentabilité ni la demande dans un pays africain. Les prix proposés sont des hypothèses de test, pas des prix de marché vérifiés.",
    },
    reserve: {
      kit: {
        prompt_cadrage: {
          titre: "Prompt de démarrage dans Claude",
          mission: stripMode(starter).replace("Si aucun identifiant n’est indiqué, commence par OD-001.", `Le projet sélectionné est ${m.numero}, ${workName}.`),
          a_quoi_sert: "Ce prompt lance le travail : Claude lit le dossier de la fiche et son socle commun, inspecte l'environnement, crée CLAUDE.md et les documents de suivi, puis avance étape par étape sur ce seul projet.",
          comment_utiliser: "Ouvrez Claude, de préférence Claude Code relié à votre dépôt. Joignez le dossier de la fiche (bouton « Télécharger le dossier »), collez ce prompt, puis envoyez les prompts des étapes un par un en vérifiant chaque résultat.",
        },
        resume_transmission: {
          titre: "Préparer un résumé de transmission",
          mission: `Relis notre conversation sur ${m.numero}, ${workName}, et rédige le résumé de transmission : contexte, décisions, fichiers utiles et leur emplacement, tâches réalisées avec leur statut prévu, implémenté, vérifié ou bloqué, problèmes ouverts et prochaine action. Retire tout mot de passe, clé ou donnée personnelle sensible.`,
          a_quoi_sert: "Ce prompt permet de changer de conversation ou d'outil IA sans perdre le fil du projet.",
          comment_utiliser: "Collez-le à la fin d'une conversation devenue longue. Enregistrez le résumé dans docs/progress.md ou un fichier texte, puis joignez-le au début de la conversation suivante avec le dossier de la fiche.",
        },
        configurations: [
          { nom: "Supabase : données et comptes", role: "Conserver les données du produit, les comptes et les fichiers, avec des règles d'accès vérifiées par la base (RLS).", lien: "https://supabase.com", etapes: ["Créer un projet de test et un projet de production distincts.", "Appliquer les migrations versionnées produites par Claude.", "Activer la confirmation des courriels et déclarer les URLs de retour autorisées.", "Garder la clé secrète côté serveur uniquement ; ne jamais la coller dans une conversation."], verification: "Avec deux comptes A et B, aucune donnée de A n'est lisible ni modifiable par B." },
          { nom: "Hébergement et aperçu protégé", role: "Mettre l'application en ligne sur une offre autorisant l'usage commercial.", lien: "https://vercel.com/docs/plans/hobby", etapes: ["Relier le dépôt et vérifier la commande de construction.", "Déclarer les variables par environnement, sans valeur secrète dans le dépôt.", "Déployer un aperçu protégé avec des données fictives, puis faire la recette."], verification: "Le parcours principal fonctionne depuis un téléphone sur l'URL d'aperçu." },
          { nom: "Nom de domaine", role: "Donner une adresse personnalisée au produit. Facultatif pour le pilote.", lien: "https://vercel.com/docs/domains/working-with-domains/add-a-domain", etapes: ["Choisir et acheter un nom disponible, après votre accord.", "Recopier exactement les valeurs DNS fournies par l'hébergeur, sans effacer les enregistrements de messagerie.", "Contrôler HTTPS, le domaine principal, les redirections et les URLs d'authentification."], verification: "Le domaine ouvre la bonne application en HTTPS et la messagerie existante fonctionne encore." },
          { nom: "Paiement Visa (conditionnel)", role: "Encaisser l'abonnement du produit par un prestataire éligible. Désactivé tant que la restriction Visa avant débit n'est pas démontrée.", lien: null, etapes: ["Vérifier l'éligibilité du marchand, la devise XOF et la restriction Visa avant débit auprès du prestataire.", "Implémenter d'abord l'adaptateur simulé et ses tests (PAYMENTS_ENABLED=false).", "N'activer le paiement réel qu'après une recette sandbox complète."], verification: "Les droits ne sont accordés qu'après confirmation serveur du paiement ; un retour success=true seul n'ouvre rien." },
        ],
        ressources: TECH_REFS,
        cahier_md: cahier,
        socle_md: [commonHypotheses, roles, socle].join("\n\n"),
        dossier_md: dossier,
      },
      etapes: steps,
    },
  };
}

const fiches: AnyFiche[] = models.map((m) => (Number(m.numero.slice(3)) <= 10 ? toFiche(m) : toModele(m)));
const payload = { schema_version: SCHEMA_VERSION, fiches };
const result = validateImport(JSON.parse(JSON.stringify(payload)), ["saas-app", "site", "jeu"]);
if (!result.ok) {
  for (const i of result.issues.slice(0, 40)) console.error(`- ${i.fiche} › ${i.champ} : ${i.message}`);
  process.exit(1);
}
writeFileSync("content/catalogue-v1.json", JSON.stringify(payload, null, 1) + "\n");
const complete = fiches.filter((f) => f.niveau_contenu === "complete");
console.log(`content/catalogue-v1.json : ${fiches.length} fiches (${complete.length} complètes, ${complete.reduce((n, f) => n + (f.niveau_contenu === "complete" ? f.reserve.etapes.length : 0), 0)} étapes).`);
