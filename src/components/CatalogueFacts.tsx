import { AI_USAGES, CLIENT_TYPES, DIFFICULTIES, EVIDENCE } from "@/lib/constants";
import type { ProjectSummary } from "@/lib/data";

const pick = <T extends Record<string, string>>(d: T, k: string | null) => (k && k in d ? d[k as keyof T] : null);

/** Repères du catalogue V1 : type, domaine, client, difficulté, IA à l'usage, preuve. */
export function CatalogueFacts({ p, category }: { p: ProjectSummary; category: string }) {
  return (
    <dl className="facts od-card">
      <div><dt>Type</dt><dd>{category}</dd></div>
      {p.domain && <div><dt>Domaine</dt><dd>{p.domain}</dd></div>}
      {p.clientType && <div><dt>Client</dt><dd>{pick(CLIENT_TYPES, p.clientType)}</dd></div>}
      <div><dt>Difficulté</dt><dd>{DIFFICULTIES[p.difficulty as keyof typeof DIFFICULTIES]}</dd></div>
      {p.aiUsage && <div><dt>IA à l&apos;usage</dt><dd>{pick(AI_USAGES, p.aiUsage)}</dd></div>}
      {p.evidence && <div><dt>Preuve</dt><dd>{pick(EVIDENCE, p.evidence)}</dd></div>}
    </dl>
  );
}

/** Synthèse du modèle : V1 limitée, adaptation locale, revenu, méthode de construction. */
export function ModelSummary({ v1, reporte, local, revenu, construire }: { v1?: string; reporte?: string; local?: string; revenu?: string; construire?: string }) {
  return (
    <div className="stack-sm">
      {v1 && (<><h3>Ce que fait la V1</h3><p>{v1}</p></>)}
      {reporte && (<><h3>Reporté après la V1</h3><p>{reporte}</p></>)}
      {local && (<><h3>Adaptation locale</h3><p>{local}</p></>)}
      {revenu && (<><h3>Piste de revenu <span className="od-badge od-badge--draft">Hypothèse</span></h3><p>{revenu}</p></>)}
      {construire && (<><h3>Construire avec l&apos;IA</h3><p>{construire}</p></>)}
    </div>
  );
}
