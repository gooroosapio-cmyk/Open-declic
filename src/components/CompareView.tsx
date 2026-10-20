"use client";
import Link from "next/link";
import { COUNTRIES, DIFFICULTIES, EQUIPMENT, SKILLS, formatRange } from "@/lib/constants";
import type { ProjectSummary } from "@/lib/data";
import { COMPARE_MAX, useCompare } from "./compare-store";

const lbl = (d: Record<string, string>, keys: string[]) => keys.map((k) => d[k] ?? k).join(", ");

export function CompareView({ projects, categories }: { projects: ProjectSummary[]; categories: { slug: string; label: string }[] }) {
  const compare = useCompare();
  const selected = compare.ids.map((id) => projects.find((p) => p.slug === id)).filter((p): p is ProjectSummary => Boolean(p));
  const missing = compare.ids.length - selected.length;

  if (selected.length === 0) {
    return (
      <div className="empty od-card">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/assets/open-declic/03_Illustrations/04_parcours_etapes.svg" alt="" width={640} height={480} />
        <h2>Aucun projet à comparer</h2>
        <p className="muted">Ajoutez jusqu&apos;à {COMPARE_MAX} projets avec le bouton « Comparer » du catalogue.</p>
        <Link className="od-button" href="/">Découvrir les projets</Link>
      </div>
    );
  }
  const rows: [string, (p: ProjectSummary) => React.ReactNode][] = [
    ["Accès", (p) => (p.isFree ? "Gratuit" : "Accès complet")],
    ["Catégorie", (p) => categories.find((c) => c.slug === p.category)?.label ?? p.category],
    ["Budget de lancement", (p) => formatRange(p.launchBudget.min, p.launchBudget.max)],
    ["Dépenses mensuelles", (p) => formatRange(p.monthlyCost.min, p.monthlyCost.max)],
    ["Temps par semaine", (p) => formatRange(p.weeklyHours.min, p.weeklyHours.max, "h")],
    ["Difficulté", (p) => DIFFICULTIES[p.difficulty as keyof typeof DIFFICULTIES]],
    ["Compétences", (p) => lbl(SKILLS, p.skills)],
    ["Matériel", (p) => lbl(EQUIPMENT, p.equipment)],
    ["Pays étudiés", (p) => lbl(COUNTRIES, p.countries)],
  ];
  return (
    <div className="stack">
      <p className="small muted">{selected.length} projet{selected.length > 1 ? "s" : ""} sur {COMPARE_MAX} maximum.{missing > 0 && " Un projet sélectionné n'est plus disponible."}</p>
      <div className="table-scroll od-card" style={{ padding: 0 }} tabIndex={0} role="region" aria-label="Tableau de comparaison">
        <table className="compare-table">
          <caption className="sr-only">Comparaison des projets sélectionnés</caption>
          <thead>
            <tr>
              <td />
              {selected.map((p) => (
                <th key={p.slug} scope="col">
                  <Link href={`/projets/${p.slug}`}>{p.title}</Link>
                  {p.isDemo && <div><span className="od-badge od-badge--demo">Démonstration</span></div>}
                  <div><button type="button" className="link-button xsmall" onClick={() => compare.remove(p.slug)} aria-label={`Retirer ${p.title} de la comparaison`}>Retirer</button></div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(([label, fn]) => (
              <tr key={label}><th scope="row">{label}</th>{selected.map((p) => <td key={p.slug}>{fn(p)}</td>)}</tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="row">
        <button type="button" className="od-button od-button--ghost" onClick={compare.clear}>Vider la comparaison</button>
        {selected.length < COMPARE_MAX && <Link className="od-button od-button--secondary" href="/">Ajouter un projet</Link>}
      </div>
    </div>
  );
}
