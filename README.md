# Open declic

**Trouvez votre idée. Comprenez le modèle. Passez à l'action.**

Open declic est une bibliothèque de projets numériques (SaaS, sites, applications, jeux) à lancer avec les outils d'IA de votre choix. Chaque fiche explique un modèle existant, propose une adaptation locale (notamment pour la Côte d'Ivoire), puis guide la réalisation : étapes, configurations et prompts prêts à copier.

Open declic **ne contient aucune IA intégrée** : aucun chatbot, aucun appel à une API de modèle, aucune génération. La plateforme organise les contenus et assemble des prompts préparés, de façon déterministe, que l'utilisateur colle dans un outil externe.

## Fonctions

- Comptes : inscription par e-mail et mot de passe, confirmation de l'e-mail, mot de passe oublié.
- Catalogue avec recherche, filtres (budget, dépenses mensuelles, difficulté, compétences, temps, catégorie, matériel, pays), tris et « Aide-moi à choisir » (règles déterministes avec explications).
- Fiches détaillées : aperçu public, coûts séparés (prix d'accès, budget de lancement, dépenses récurrentes), nature des informations (fait vérifié, estimation, hypothèse, exemple).
- Favoris, comparaison de trois projets au maximum, projets commencés, progression validée manuellement.
- Kits « Configurations & prompts » : prompt de cadrage, prompts par étape en modes **Personnaliser** et **Laisser l'IA choisir**, résumé de transmission, copie avec confirmation réelle et solution de secours.
- Accès gratuit ou complet (15 000 FCFA, accès à vie). Le paiement n'est pas activé : un administrateur attribue l'accès, et chaque opération est tracée.
- Administration : fiches, statut, réglage gratuit, étapes, prompts, modèles datés, visuels, JSON complet, catégories, réglages, import.
- Import JSON versionné, avec validation, aperçu des différences et identifiants stables.
- Application installable (manifeste PWA, sans mode hors ligne).

## Architecture

- Next.js 16 (App Router, TypeScript), rendu serveur, compatible Vercel.
- Supabase : Postgres, Auth, Storage. Les droits sont garantis par RLS et par des fonctions `SECURITY DEFINER` réservées aux administrateurs.
- Les données sont séparées en trois niveaux :
  - **aperçu public** : `projects` ;
  - **contenu réservé** : `project_kits`, `project_steps`, lus côté serveur uniquement si la base l'autorise ;
  - **données personnelles** : `favorites`, `user_projects`, `step_progress`.
- Aucune clé secrète dans l'application.

| Dossier | Contenu |
|---|---|
| `src/app` | Pages et actions serveur |
| `src/lib` | Accès aux données, schéma d'import, filtres, assemblage des prompts |
| `supabase/migrations` | Schéma, règles d'accès, import |
| `content/demo-fiches.json` | Fiches de démonstration (exemple d'import valide) |
| `docs/` | Configuration, format d'import, bilan des tests |
| `tests/` | Tests unitaires, d'intégration (base) et de bout en bout |

## Démarrer

Voir [docs/CONFIGURATION.md](docs/CONFIGURATION.md). En résumé :

```bash
npm install
npx supabase start && npx supabase db reset
cp .env.example .env.local   # valeurs publiques affichées par `npx supabase status`
npm run dev
```

## Tests

```bash
npm run typecheck && npm run lint
npm test                     # unitaires
npm run test:integration     # sécurité de la base et import (Supabase local requis)
npm run test:e2e             # parcours dans le navigateur (Supabase local requis)
```

Bilan des tests : [docs/TESTS.md](docs/TESTS.md).

## Ressources de marque

Le kit visuel V1 (« Étincelle corail ») est intégré : logo, icônes, illustrations, couleurs et typographies Manrope et Inter. Les maquettes PNG du kit ont servi de référence, mais ne sont pas utilisées dans l'interface.
