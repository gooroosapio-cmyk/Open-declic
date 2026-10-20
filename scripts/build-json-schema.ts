// Génère docs/fiche-schema-1.0.json (JSON Schema) à partir du schéma Zod de l'import.
import { writeFileSync } from "node:fs";
import { z } from "zod";
import { ficheSchema, SCHEMA_VERSION } from "../src/lib/fiche-schema";

const schema = z.toJSONSchema(
  z.strictObject({ schema_version: z.literal(SCHEMA_VERSION), fiches: z.array(ficheSchema).min(1) }),
  { io: "input", unrepresentable: "any" },
);
writeFileSync(
  `docs/fiche-schema-${SCHEMA_VERSION}.json`,
  JSON.stringify({ $id: `open-declic/fiche-schema-${SCHEMA_VERSION}`, title: `Import des fiches Open declic — v${SCHEMA_VERSION}`, ...schema }, null, 2) + "\n",
);
console.log(`docs/fiche-schema-${SCHEMA_VERSION}.json généré.`);
