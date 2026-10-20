import Link from "next/link";
import { Suspense } from "react";
import { Catalogue } from "@/components/Catalogue";
import { Icon } from "@/components/Icon";
import { getCategories, getViewer, listPublishedProjects } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { SIGNATURE } from "@/lib/constants";

export default async function Home() {
  const [viewer, items, categories] = await Promise.all([getViewer(), listPublishedProjects(), getCategories()]);
  let favoriteIds: string[] = [];
  if (viewer.userId) {
    const supabase = await createClient();
    const { data } = await supabase.from("favorites").select("project_id");
    favoriteIds = (data ?? []).map((f) => f.project_id);
  }
  return (
    <div className="stack" style={{ gap: 20 }}>
      <section className="row-between" style={{ alignItems: "flex-end" }}>
        <div>
          <h1 style={{ marginBottom: 4 }}>Trouvez votre déclic</h1>
          <p className="muted" style={{ margin: 0 }}>{SIGNATURE}</p>
        </div>
        <Link className="od-button od-button--secondary" href="/aide-choix">
          <Icon name="aide" /> Aide-moi à choisir
        </Link>
      </section>
      {items.length === 0 ? (
        <div className="empty od-card">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/assets/open-declic/03_Illustrations/01_hero_demarrer.svg" alt="" width={640} height={480} />
          <h2>Le catalogue est en préparation</h2>
          <p className="muted">Aucune fiche n&apos;est encore publiée. Revenez bientôt.</p>
        </div>
      ) : (
        <Suspense fallback={<CatalogueSkeleton />}>
          <Catalogue items={items} categories={categories} favoriteIds={favoriteIds} loggedIn={Boolean(viewer.userId)} />
        </Suspense>
      )}
      <p className="xsmall muted">
        Open declic ne contient aucune IA intégrée : les prompts s&apos;utilisent dans les outils IA de votre choix. Les outils externes peuvent nécessiter un abonnement ou entraîner des frais.
      </p>
    </div>
  );
}

function CatalogueSkeleton() {
  return (
    <div className="grid-cards" aria-hidden="true">
      {[0, 1, 2].map((i) => <div key={i} className="od-skeleton" style={{ height: 380 }} />)}
    </div>
  );
}
