import Link from "next/link";
import { signIn } from "@/app/actions/auth";
import { AuthForm } from "@/components/AuthForm";

export const metadata = { title: "Se connecter" };

export default async function Page({ searchParams }: PageProps<"/connexion">) {
  const sp = await searchParams;
  const next = typeof sp.next === "string" ? sp.next : "/";
  return (
    <div className="stack" style={{ maxWidth: 440, margin: "0 auto" }}>
      <h1>Se connecter</h1>
      {sp.erreur === "lien" && (
        <p className="notice notice--error" role="alert">Ce lien est invalide ou a expiré. Connectez-vous ou demandez un nouveau lien.</p>
      )}
      <AuthForm action={signIn} submitLabel="Se connecter" pendingLabel="Connexion…" fields={["email", "password"]} next={next} />
      <p className="small"><Link href="/mot-de-passe-oublie">Mot de passe oublié ?</Link></p>
      <p className="small">Pas encore de compte ? <Link href="/inscription">Créer un compte</Link></p>
    </div>
  );
}
