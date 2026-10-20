import Link from "next/link";
import { signUp } from "@/app/actions/auth";
import { AuthForm } from "@/components/AuthForm";

export const metadata = { title: "Créer un compte" };

export default function Page() {
  return (
    <div className="stack" style={{ maxWidth: 440, margin: "0 auto" }}>
      <h1>Créer un compte</h1>
      <p className="muted">Un compte gratuit permet d&apos;enregistrer vos favoris et votre progression sur les fiches gratuites.</p>
      <AuthForm action={signUp} submitLabel="Créer mon compte" pendingLabel="Création…" fields={["email", "new-password"]} />
      <p className="small">Déjà inscrit ? <Link href="/connexion">Se connecter</Link></p>
    </div>
  );
}
