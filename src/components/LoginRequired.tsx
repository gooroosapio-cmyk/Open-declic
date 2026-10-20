import Link from "next/link";

export function LoginRequired({ title, text, next }: { title: string; text: string; next: string }) {
  return (
    <div className="stack">
      <h1>{title}</h1>
      <div className="empty od-card">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/assets/open-declic/03_Illustrations/08_favoris.svg" alt="" width={640} height={480} />
        <p>{text}</p>
        <div className="row" style={{ justifyContent: "center" }}>
          <Link className="od-button" href={`/connexion?next=${next}`}>Se connecter</Link>
          <Link className="od-button od-button--secondary" href="/inscription">Créer un compte</Link>
        </div>
      </div>
    </div>
  );
}
