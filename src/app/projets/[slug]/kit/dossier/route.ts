import { NextResponse } from "next/server";
import { canReadReserved, getProject, getReserved, getViewer } from "@/lib/data";

// Dossier de la fiche à joindre à l'outil IA : contenu réservé, contrôlé côté serveur puis par la base (RLS).
export async function GET(_req: Request, ctx: RouteContext<"/projets/[slug]/kit/dossier">) {
  const { slug } = await ctx.params;
  const [project, viewer] = await Promise.all([getProject(slug), getViewer()]);
  if (!project) return new NextResponse("Fiche introuvable.", { status: 404 });
  if (!canReadReserved(project, viewer)) return new NextResponse("Contenu réservé à l'accès complet.", { status: 403 });
  const reserved = await getReserved(project.id);
  const md = reserved?.kit.dossier_md;
  if (!md) return new NextResponse("Aucun dossier pour cette fiche.", { status: 404 });
  const name = `${project.odNumber ?? project.slug}-${(project.workName ?? project.title).normalize("NFD").replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-")}-dossier.md`;
  return new NextResponse(md, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${name}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
