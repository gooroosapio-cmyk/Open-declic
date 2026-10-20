import { CompareView } from "@/components/CompareView";
import { getCategories, listPublishedProjects } from "@/lib/data";

export const metadata = { title: "Comparer" };

export default async function Page() {
  const [projects, categories] = await Promise.all([listPublishedProjects(), getCategories()]);
  return (
    <div className="stack">
      <h1>Comparer</h1>
      <p className="muted">Comparez jusqu&apos;à trois projets sur leurs critères essentiels. La sélection est conservée sur cet appareil.</p>
      <CompareView projects={projects} categories={categories} />
    </div>
  );
}
