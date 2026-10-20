import Link from "next/link";
import { ProjectControls } from "@/components/admin/ProjectControls";
import { listAllProjects } from "@/lib/admin";

export default async function AdminHome() {
  const projects = await listAllProjects();
  const free = projects.filter((p) => p.is_free && p.status === "published").length;
  return (
    <div className="stack">
      <div className="row-between">
        <h1>Fiches</h1>
        <Link className="od-button od-button--secondary" href="/admin/import">Importer des fiches</Link>
      </div>
      <p className="small muted">{projects.length} fiche{projects.length > 1 ? "s" : ""} · {free} gratuite{free > 1 ? "s" : ""} publiée{free > 1 ? "s" : ""}. Les nouvelles fiches s&apos;ajoutent par import JSON et arrivent en brouillon.</p>
      {projects.length === 0 ? (
        <p className="od-card muted">Aucune fiche. Commencez par un import.</p>
      ) : (
        <ul className="stack-sm" style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {projects.map((p) => (
            <li key={p.id} className="od-card stack-sm">
              <div className="row-between">
                <div className="stack-sm" style={{ gap: 4 }}>
                  <div className="row">
                    <span className={`od-badge ${p.status === "published" ? "od-badge--free" : "od-badge--draft"}`}>
                      {p.status === "published" ? "Publiée" : p.status === "draft" ? "Brouillon" : "Archivée"}
                    </span>
                    {p.is_demo && <span className="od-badge od-badge--demo">Démonstration</span>}
                  </div>
                  <strong>{p.title}</strong>
                  <span className="xsmall muted"><code>{p.slug}</code> · v{p.content_version} · modifiée le {new Date(p.updated_at).toLocaleDateString("fr-FR")}</span>
                </div>
                <div className="row">
                  <Link className="od-button od-button--ghost od-button--small" href={`/projets/${p.slug}`}>Prévisualiser</Link>
                  <Link className="od-button od-button--secondary od-button--small" href={`/admin/fiches/${p.slug}`}>Modifier</Link>
                </div>
              </div>
              <ProjectControls id={p.id} slug={p.slug} status={p.status} isFree={p.is_free} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
