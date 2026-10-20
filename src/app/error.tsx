"use client";
export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="empty od-card" role="alert">
      <h1>Une erreur est survenue</h1>
      <p className="muted">Le contenu n&apos;a pas pu être chargé. Vérifiez votre connexion puis réessayez.</p>
      <button className="od-button" type="button" onClick={reset}>Réessayer</button>
    </div>
  );
}
