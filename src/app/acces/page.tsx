import Link from "next/link";
import { formatFcfa, FULL_ACCESS_PRICE_FCFA } from "@/lib/constants";
import { getSetting, getViewer } from "@/lib/data";

export const metadata = { title: "Accès complet" };

export default async function Page() {
  const [viewer, contact] = await Promise.all([getViewer(), getSetting<{ texte: string }>("acces_contact")]);
  return (
    <div className="stack" style={{ maxWidth: 680 }}>
      <h1>Accès complet</h1>
      {viewer.hasFullAccess && <p className="notice notice--success">Votre compte dispose déjà de l&apos;accès complet.</p>}
      <section className="od-card od-card--peach stack-sm">
        <h2>{formatFcfa(FULL_ACCESS_PRICE_FCFA)}, à vie</h2>
        <ul>
          <li>Paiement unique, sans abonnement.</li>
          <li>Accès à toutes les fiches du catalogue : étapes, configurations et prompts.</li>
          <li>Aucun prix par fiche.</li>
        </ul>
        <p className="notice notice--warn small">Le paiement en ligne n&apos;est pas encore disponible.</p>
        {contact?.texte && <p className="small">{contact.texte}</p>}
      </section>
      <section className="stack-sm">
        <h2>Ce que ce prix ne comprend pas</h2>
        <p>Chaque fiche présente séparément le budget estimé pour lancer le business et ses dépenses récurrentes. Les outils externes (outils IA, hébergement, nom de domaine…) ont leurs propres conditions et peuvent entraîner des frais.</p>
      </section>
      <p className="small">Quelques fiches sont entièrement gratuites. <Link href="/?gratuit=1">Voir les fiches gratuites</Link>.</p>
    </div>
  );
}
