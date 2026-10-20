import Link from "next/link";
import { COUNTRIES, DIFFICULTIES, EQUIPMENT, SKILLS, formatRange } from "@/lib/constants";
import type { ProjectSummary } from "@/lib/data";
import type { Reason } from "@/lib/filters";
import { CompareButton } from "./CompareButton";
import { FavoriteButton } from "./FavoriteButton";
import { Icon } from "./Icon";

const lbl = (d: Record<string, string>, keys: string[]) => keys.map((k) => d[k] ?? k).join(", ");

export function AccessBadges({ p }: { p: Pick<ProjectSummary, "isFree" | "isDemo" | "status"> }) {
  return (
    <>
      {p.isDemo && <span className="od-badge od-badge--demo">Démonstration</span>}
      {p.isFree ? <span className="od-badge od-badge--free">Gratuit</span> : <span className="od-badge"><Icon name="verrou" small />Accès complet</span>}
      {p.status !== "published" && <span className="od-badge od-badge--draft">{p.status === "draft" ? "Brouillon" : "Archivée"}</span>}
    </>
  );
}

export function ProjectCard({ p, categoryLabel, favorite, loggedIn, reasons }: {
  p: ProjectSummary; categoryLabel: string; favorite: boolean; loggedIn: boolean; reasons?: Reason[];
}) {
  return (
    <article className="od-card project-card od-enter">
      <div className="visual">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={p.visual?.url ?? "/assets/open-declic/03_Illustrations/01_hero_demarrer.svg"} alt="" width={640} height={480} loading="lazy" decoding="async" />
      </div>
      <div className="badges"><AccessBadges p={p} /></div>
      <div className="body">
        <p className="xsmall muted" style={{ margin: 0 }}>{categoryLabel}</p>
        <h3><Link href={`/projets/${p.slug}`}>{p.title}</Link></h3>
        <p className="small" style={{ margin: 0 }}>{p.summary}</p>
        <dl className="facts">
          <div><dt>Budget de lancement</dt><dd>{formatRange(p.launchBudget.min, p.launchBudget.max)}</dd></div>
          <div><dt>Dépenses mensuelles</dt><dd>{formatRange(p.monthlyCost.min, p.monthlyCost.max)}</dd></div>
          <div><dt>Temps par semaine</dt><dd>{formatRange(p.weeklyHours.min, p.weeklyHours.max, "h")}</dd></div>
          <div><dt>Difficulté</dt><dd>{DIFFICULTIES[p.difficulty as keyof typeof DIFFICULTIES]}</dd></div>
        </dl>
        {reasons && reasons.length > 0 && (
          <div className="notice notice--info small" style={{ position: "relative", zIndex: 1 }}>
            <div>
              <strong>Pourquoi ce projet ?</strong>
              <ul style={{ margin: "4px 0 0", paddingLeft: 18 }}>
                {reasons.map((r) => <li key={r.text}>{r.text}</li>)}
              </ul>
            </div>
          </div>
        )}
        <details className="more">
          <summary>Détails</summary>
          <dl className="facts" style={{ gridTemplateColumns: "1fr", paddingBottom: 8 }}>
            <div><dt>Compétences mobilisées</dt><dd>{lbl(SKILLS, p.skills)}</dd></div>
            <div><dt>Matériel nécessaire</dt><dd>{lbl(EQUIPMENT, p.equipment)}</dd></div>
            <div><dt>Pays étudiés</dt><dd>{lbl(COUNTRIES, p.countries)}</dd></div>
          </dl>
        </details>
        <div className="card-actions">
          <FavoriteButton projectId={p.id} title={p.title} initial={favorite} loggedIn={loggedIn} />
          <CompareButton slug={p.slug} title={p.title} />
        </div>
      </div>
    </article>
  );
}
