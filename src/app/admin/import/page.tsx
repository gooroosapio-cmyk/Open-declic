import { ImportTool } from "@/components/admin/ImportTool";
import { SCHEMA_VERSION } from "@/lib/fiche-schema";

export default function ImportPage() {
  return (
    <div className="stack">
      <h1>Importer des fiches</h1>
      <div className="notice notice--info small">
        <p>Format : JSON, schéma version <strong>{SCHEMA_VERSION}</strong>. Documentation et exemple valide : <code>docs/IMPORT.md</code> et <code>content/demo-fiches.json</code>.</p>
        <p>Les nouvelles fiches arrivent en brouillon. Une fiche existante (même identifiant) est mise à jour sans changer son statut ni son réglage gratuit/complet.</p>
      </div>
      <ImportTool />
    </div>
  );
}
