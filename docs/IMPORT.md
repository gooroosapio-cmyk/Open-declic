# Format d'import des fiches — version 1.1

Les fiches s'importent depuis **Administration › Import** au format JSON.

- Schéma de référence (validation réelle) : `src/lib/fiche-schema.ts`
- Schéma JSON généré : `docs/fiche-schema-1.1.json` (`npm run schema`)
- Exemples valides : `content/catalogue-v1.json` (catalogue V1 : 10 fiches complètes et 190 modèles) et `content/demo-fiches.json` (4 fiches « Démonstration » utilisées par les tests)
- La version 1.0 reste acceptée : ses fiches sont lues comme des fiches complètes, sans repères de catalogue.

## Deux niveaux de contenu

| `niveau_contenu` | Contenu | Visible |
|---|---|---|
| `complete` | Aperçu détaillé, et kit réservé : étapes, prompts, configurations, cahier de construction, socle commun, dossier à télécharger | Aperçu pour tous ; kit pour les fiches gratuites, les membres complets et les administrateurs |
| `modele` | Aperçu réduit : V1, adaptation locale, piste de revenu, méthode de construction, référence | Tout est public ; aucun contenu réservé |

Un modèle peut devenir une fiche complète par un import ultérieur. L'inverse est refusé, pour éviter toute suppression implicite. La base refuse aussi d'ajouter un kit ou des étapes à un modèle.

## Repères du catalogue (`catalogue`, facultatif)

```jsonc
"catalogue": {
  "numero": "OD-001",            // identifiant affiché, unique
  "nom_travail": "Créneau Clair", // ou null
  "domaine": "Organisation",
  "client": "b2b | b2c | b2b2c",
  "ia_usage": "non_necessaire | optionnelle | requise",
  "preuve": "A | B | O",         // A : adoption publiée, B : produit documenté, O : proposition Open declic
  "mise_en_avant": true           // affichée en tête du catalogue
}
```

## Catalogue V1 : régénération

```bash
python3 -I scripts/extract-catalogue-pdf.py content/sources/Open_declic_200_Modeles_Duplicables_V1.pdf content/sources/catalogue-200-v1.json
npx tsx scripts/convert-v1.ts     # → content/catalogue-v1.json (validé par le schéma)
```

La conversion reprend les textes à l'identique. Elle n'apporte que les changements suivants :
- **Prompts** : la phrase qui fixait le mode (« Mode Laisser l'IA choisir… cinq QCM ») est retirée. Le mode se choisit dans la console d'Open declic, qui limite à trois questions à la fois.
- **Prompt de démarrage** : il cible directement le numéro de la fiche.
- **Dépenses mensuelles** : l'objectif « 50 à 100 € par mois » est converti au taux fixe 1 € = 655,957 FCFA et marqué comme hypothèse.
- **Valeurs non renseignées** : le budget de lancement, le temps hebdomadaire et, pour les modèles, les compétences et le matériel ne sont pas chiffrés par les sources ; ils restent vides.
- **Accès** : OD-001 et OD-003 sont gratuites par défaut. Ce réglage se modifie dans l'administration.

## Déroulement

1. **Vérifier et prévisualiser.** Le fichier est entièrement validé. Rien n'est enregistré à cette étape.
   - En cas d'erreur, la liste indique la fiche (identifiant et rang) et le champ concerné, par exemple :
     `demo-carnet-couture (n° 3) › reserve.etapes[2].prompt.mission : Le prompt contient un champ à remplacer…`
   - Si le fichier est valide, l'aperçu indique pour chaque fiche : **Ajout**, **Modification** (avec la liste des champs et des étapes modifiés) ou **Inchangée**.
2. **Confirmer l'import.** Le fichier est revalidé, puis enregistré en une seule transaction.

## Règles d'enregistrement

| Règle | Effet |
|---|---|
| Identifiant stable | `id` de la fiche (slug) et `id` de chaque étape. Un même identifiant met à jour, il ne crée jamais de doublon. |
| Import initial en brouillon | Une nouvelle fiche est toujours créée avec le statut « brouillon ». La publication se fait dans l'administration. |
| Réglages conservés | Pour une fiche existante, le statut (brouillon, publiée, archivée) et le réglage gratuit/complet ne sont **pas** modifiés par l'import. `acces.gratuit` ne sert qu'à la création. |
| Pas de suppression implicite | Une étape absente du fichier est conservée telle quelle (signalée dans l'aperçu). Pour la masquer, utilisez « Retirer l'étape » dans l'édition de la fiche. |
| Progression protégée | La progression des utilisateurs est liée à l'identifiant de l'étape et n'est jamais modifiée par un import. |
| Fiche publiée | Les modifications d'une fiche publiée sont visibles immédiatement. Dépubliez-la avant un changement important. |

## Structure

```jsonc
{
  "schema_version": "1.0",
  "fiches": [
    {
      "id": "mon-projet",                // identifiant stable : minuscules, chiffres, tirets (catalogue V1 : od-001…)
      "niveau_contenu": "complete",      // ou "modele"
      "version": "1",                    // version éditoriale de la fiche
      "demonstration": false,            // true = badge « Démonstration »
      "titre": "…",                      // 80 caractères max
      "resume": "…",                     // 240 caractères max
      "categorie": "saas-app",           // identifiant d'une catégorie existante : saas-app, site, jeu
      "pays": ["CI"],                    // CI, SN, CM, FR
      "date_verification": "2026-10-20", // ou null
      "acces": { "gratuit": false },     // utilisé à la création uniquement
      "difficulte": { "niveau": "debutant | intermediaire | avance", "explication": "…" },
      "competences": ["redaction"],      // aucune, redaction, design, marketing, vente, programmation, gestion, video
      "materiel": ["smartphone"],        // smartphone, ordinateur, internet, appareil-photo, micro
      "filtres": {                       // montants en FCFA ; null = inconnu (jamais 0 par défaut)
        "budget_lancement":    { "min": 10000, "max": 50000 },
        "depenses_mensuelles": { "min": null,  "max": null },
        "heures_hebdo":        { "min": 2,     "max": 5 }
      },
      "apercu": { … },                   // aperçu public, voir ci-dessous
      "reserve": { "kit": { … }, "etapes": [ … ] } // contenu protégé
    }
  ]
}
```

### `apercu` — visible par tous

| Champ | Contenu |
|---|---|
| `client_cible`, `probleme`, `offre` | Textes. |
| `exemple_livrable` | `{ description, nature }`. |
| `references[]` | Entreprises de référence : `{ nom, url_officielle, description, sources[{titre,url,date_consultation}], date_verification, nature }`. |
| `adaptation_locale`, `alternatives[]`, `hypotheses[]` | Adaptation au pays étudié et hypothèses à tester. |
| `outils[]` | `{ nom, url, role, obligatoire, cout }`. |
| `budget` | `{ lignes[{ libelle, min, max, recurrence, nature, hypothese? }], note }`. `recurrence` vaut `unique` (budget de lancement), `mensuel`, `annuel` ou `usage` (dépenses récurrentes). |
| `exploitation` | `{ preparation, exploitation, maintenance, travail_humain }`. |
| `role_ia` | `{ construction, fonctionnement }` : rôle de l'IA pour construire le projet et dans son fonctionnement. |
| `test_demande` | `{ description, criteres_poursuite[], criteres_revision[] }`. |
| `livrables[]`, `visuels[{url, alt, legende}]`, `risques[]`, `limites` | Le texte alternatif `alt` est obligatoire. |

`nature` distingue toujours `fait_verifie`, `estimation`, `hypothese` et `exemple`.

### `reserve` — fiches gratuites, membres complets et administrateurs

- `kit.prompt_cadrage` et `kit.resume_transmission` : prompts de niveau kit.
- `kit.configurations[]` : `{ nom, role, lien, etapes[], verification }`. Uniquement pour les projets qui en ont besoin (base de données, hébergement, domaine…).
- `kit.ressources[]` : `{ titre, url, description }`.
- `kit.cahier_md`, `kit.socle_md` : cahier de construction et socle commun, en Markdown. Ils sont affichés sans interpréter de HTML.
- `kit.dossier_md` : dossier complet téléchargeable (`/projets/<id>/kit/dossier`), à joindre à l'outil IA.
- `etapes[]` : 
  ```jsonc
  {
    "id": "decrire-ecrans",
    "titre": "…", "objectif": "…", "prerequis": ["…"],
    "outil": { "nom": "Claude", "url": "https://claude.ai" },
    "modeles": {
      "minimum":    { "nom": null, "note": "À tester avant publication." },
      "recommande": { "nom": null, "note": "…" },
      "economique": null,
      "date_verification": null, "source": null
    },
    "reglages": ["…"],
    "prompt": { "titre": "…", "mission": "…", "a_quoi_sert": "…", "comment_utiliser": "…",
                "texte_personnaliser": "(facultatif)", "texte_laisser_choisir": "(facultatif)" },
    "resultat_attendu": { "description": "…", "format": "…" },
    "verification": "…", "etape_suivante": "…",
    "livrables": [{ "nom": "…", "format": "…" }]
  }
  ```

Les noms de modèles restent `null` tant qu'ils n'ont pas été réellement testés. L'interface affiche alors « Non renseigné ».

## Prompts

Les prompts ne contiennent **aucun champ à remplacer** : `[...]`, `{{...}}` et `<MAJUSCULES>` sont refusés à la validation.

Pour chaque étape, Open declic assemble deux textes de façon déterministe, sans IA :

```
introduction + contexte de la fiche + description de l'étape + MISSION
+ règles du mode (Personnaliser / Laisser l'IA choisir)
+ règles communes + demande de résumé de transmission
```

Les règles sont définies dans `src/lib/prompt-builder.ts`. Elles demandent notamment à l'IA de poser au maximum trois questions à la fois avec options et recommandation, de ne rien inventer et de demander l'accord avant toute dépense ou publication.

`texte_personnaliser` et `texte_laisser_choisir` remplacent cet assemblage par un texte complet rédigé à la main, si nécessaire.

## Évolution du schéma

Toute modification incompatible du format crée une nouvelle version (`1.1`, `2.0`…). La version est vérifiée à l'import, et `docs/fiche-schema-<version>.json` est régénéré avec `npm run schema`.
