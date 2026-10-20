import Link from "next/link";
import { redirect } from "next/navigation";
import { signOut } from "@/app/actions/auth";
import { getViewer } from "@/lib/data";
import { formatFcfa, FULL_ACCESS_PRICE_FCFA } from "@/lib/constants";

export const metadata = { title: "Mon compte" };

export default async function Page() {
  const viewer = await getViewer();
  if (!viewer.userId) redirect("/connexion?next=/compte");
  return (
    <div className="stack" style={{ maxWidth: 560 }}>
      <h1>Mon compte</h1>
      <section className="od-card stack-sm">
        <p className="small muted">Connecté avec</p>
        <p><strong>{viewer.email}</strong></p>
        <p>
          Accès :{" "}
          {viewer.hasFullAccess ? (
            <span className="od-badge od-badge--free">Accès complet à vie</span>
          ) : (
            <span className="od-badge od-badge--neutral">Fiches gratuites</span>
          )}
          {viewer.isAdmin && <> <span className="od-badge">Administrateur</span></>}
        </p>
        {!viewer.hasFullAccess && (
          <p className="small">
            L&apos;accès complet ({formatFcfa(FULL_ACCESS_PRICE_FCFA)}, paiement unique) ouvre toutes les fiches. <Link href="/acces">En savoir plus</Link>
          </p>
        )}
      </section>
      <div className="row">
        <Link className="od-button od-button--ghost" href="/compte/mot-de-passe">Changer de mot de passe</Link>
        <form action={signOut}>
          <button className="od-button od-button--secondary" type="submit">Se déconnecter</button>
        </form>
      </div>
    </div>
  );
}
