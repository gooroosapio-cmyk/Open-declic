import { formatFcfa, FULL_ACCESS_PRICE_FCFA } from "@/lib/constants";
import { Icon } from "./Icon";

/**
 * Présentation de l'accès complet. Aucun paiement n'est activé :
 * aucun bouton ne simule un achat.
 */
export function AccessOffer({ contact, loggedIn }: { contact: string | null; loggedIn: boolean }) {
  return (
    <section className="od-card od-card--peach locked" aria-labelledby="offre-titre">
      <h3 id="offre-titre" className="row" style={{ gap: 8 }}><Icon name="verrou" /> Contenu réservé à l&apos;accès complet</h3>
      <p style={{ margin: 0 }}>
        <strong>Accès complet : {formatFcfa(FULL_ACCESS_PRICE_FCFA)}, à vie.</strong> Paiement unique, sans abonnement, valable pour tout le catalogue.
      </p>
      <p className="small" style={{ margin: 0 }}>Le paiement en ligne n&apos;est pas encore disponible.</p>
      {contact && <p className="small" style={{ margin: 0 }}>{contact}</p>}
      {!loggedIn && <p className="small" style={{ margin: 0 }}>Si vous disposez déjà de l&apos;accès complet, <a href="/connexion">connectez-vous</a>.</p>}
    </section>
  );
}
