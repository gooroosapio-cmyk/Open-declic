import Link from "next/link";
import { Icon } from "@/components/Icon";
import { LoginRequired } from "@/components/LoginRequired";
import { ProjectProgress } from "@/components/ProjectProgress";
import { canReadReserved, getMyProjects, getViewer } from "@/lib/data";

export const metadata = { title: "Mes kits" };

export default async function Page() {
  const viewer = await getViewer();
  if (!viewer.userId) {
    return <LoginRequired title="Mes kits" text="Connectez-vous pour reprendre vos parcours, ressources et étapes là où vous les avez laissés." next="/mes-kits" />;
  }
  const kits = (await getMyProjects()).filter((p) => p.started);
  return (
    <div className="stack" style={{ gap: 24 }}>
      <h1>Mes kits</h1>
      {kits.length === 0 ? (
        <div className="empty od-card">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/assets/open-declic/03_Illustrations/05_configuration_outils.svg" alt="" width={640} height={480} />
          <h2>Aucun kit en cours</h2>
          <p className="muted">Démarrez un projet depuis sa fiche : son parcours, ses configurations et ses prompts apparaîtront ici.</p>
          <Link className="od-button" href="/">Découvrir les projets</Link>
        </div>
      ) : (
        <div className="grid-cards">
          {kits.map((p) => {
            const allowed = canReadReserved(p, viewer);
            return (
              <article key={p.id} className="od-card stack-sm">
                <h2 style={{ fontSize: 20 }}>{p.title}</h2>
                <ProjectProgress done={p.validatedCount} total={p.totalSteps} />
                {!allowed ? (
                  <p className="notice notice--warn small"><Icon name="verrou" small /> Ce kit nécessite l&apos;accès complet. Votre progression est conservée.</p>
                ) : p.nextStep ? (
                  <p className="small" style={{ margin: 0 }}>Prochaine étape : <strong>{p.nextStep.title}</strong></p>
                ) : (
                  <p className="notice notice--success small">Toutes les étapes sont validées.</p>
                )}
                <div className="row">
                  <Link className="od-button od-button--small" href={`/projets/${p.slug}/kit${p.nextStep ? `#etape-${p.nextStep.step_key}` : ""}`}>
                    {p.nextStep ? "Continuer" : "Ouvrir le kit"}
                  </Link>
                  <Link className="od-button od-button--ghost od-button--small" href={`/projets/${p.slug}/kit#cadrage`}>Prompts et ressources</Link>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
