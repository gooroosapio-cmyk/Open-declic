import { requestPasswordReset } from "@/app/actions/auth";
import { AuthForm } from "@/components/AuthForm";

export const metadata = { title: "Mot de passe oublié" };

export default function Page() {
  return (
    <div className="stack" style={{ maxWidth: 440, margin: "0 auto" }}>
      <h1>Mot de passe oublié</h1>
      <p className="muted">Indiquez votre adresse e-mail : vous recevrez un lien pour choisir un nouveau mot de passe.</p>
      <AuthForm action={requestPasswordReset} submitLabel="Envoyer le lien" pendingLabel="Envoi…" fields={["email"]} />
    </div>
  );
}
