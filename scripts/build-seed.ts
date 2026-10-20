// Génère supabase/seed.sql (développement local uniquement) :
//   - content/catalogue-v1.json : catalogue V1 (10 fiches complètes + 190 modèles) ;
//   - content/demo-fiches.json  : 4 fiches « Démonstration » utilisées par les tests.
// Les fichiers sont validés avec le même schéma que l'import de l'administration.
import { readFileSync, writeFileSync } from "node:fs";
import { SCHEMA_VERSION, validateImport, type AnyFiche } from "../src/lib/fiche-schema";

const CATEGORIES = ["saas-app", "site", "jeu"];
const all: AnyFiche[] = [];
for (const file of ["content/catalogue-v1.json", "content/demo-fiches.json"]) {
  const result = validateImport(JSON.parse(readFileSync(file, "utf8")), CATEGORIES);
  if (!result.ok) {
    console.error(`${file} invalide :`);
    for (const i of result.issues) console.error(`- ${i.fiche} › ${i.champ} : ${i.message}`);
    process.exit(1);
  }
  all.push(...result.fiches);
}
const payload = JSON.stringify({ schema_version: SCHEMA_VERSION, fiches: all });
if (payload.includes("$seed$")) throw new Error("Délimiteur SQL présent dans le contenu.");

writeFileSync(
  "supabase/seed.sql",
  `-- Fichier généré par scripts/build-seed.ts — ne pas modifier à la main.
-- Développement local : catalogue V1 et fiches de démonstration, toutes publiées.
select public.import_fiches_core($seed$${payload}$seed$::jsonb);
update public.projects set status = 'published', published_at = now();
`,
);
console.log(`seed.sql généré : ${all.length} fiches.`);
