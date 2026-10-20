import Link from "next/link";
export default function NotFound() {
  return (
    <div className="empty od-card">
      <h1>Page introuvable</h1>
      <p className="muted">Cette page ou cette fiche n&apos;existe pas, ou n&apos;est pas encore publiée.</p>
      <Link className="od-button" href="/">Explorer les projets</Link>
    </div>
  );
}
