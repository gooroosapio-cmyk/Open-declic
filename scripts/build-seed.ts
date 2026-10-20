// Génère supabase/seed.sql à partir de content/demo-fiches.json.
// Le fichier est validé avec le même schéma que l'import de l'administration.
import { readFileSync, writeFileSync } from "node:fs";
import { SCHEMA_VERSION, validateImport } from "../src/lib/fiche-schema";

const raw = JSON.parse(readFileSync("content/demo-fiches.json", "utf8"));
const result = validateImport(raw, ["saas", "site-web", "application-mobile", "jeu"]);
if (!result.ok) {
  console.error("Fichier de démonstration invalide :");
  for (const i of result.issues) console.error(`- ${i.fiche} › ${i.champ} : ${i.message}`);
  process.exit(1);
}
const payload = JSON.stringify({ schema_version: SCHEMA_VERSION, fiches: result.fiches });
if (payload.includes("$seed$")) throw new Error("Délimiteur SQL présent dans le contenu.");

writeFileSync(
  "supabase/seed.sql",
  `-- Fichier généré par scripts/build-seed.ts — ne pas modifier à la main.
-- Fiches de DÉMONSTRATION uniquement (développement local).
select public.import_fiches_core($seed$${payload}$seed$::jsonb);
update public.projects set status = 'published', published_at = now() where is_demo;
`,
);
console.log(`seed.sql généré : ${result.fiches.length} fiches de démonstration.`);
