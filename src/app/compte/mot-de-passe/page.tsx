import { redirect } from "next/navigation";
import { updatePassword } from "@/app/actions/auth";
import { AuthForm } from "@/components/AuthForm";
import { getViewer } from "@/lib/data";

export const metadata = { title: "Nouveau mot de passe" };

export default async function Page() {
  const viewer = await getViewer();
  if (!viewer.userId) redirect("/connexion?next=/compte/mot-de-passe");
  return (
    <div className="stack" style={{ maxWidth: 440, margin: "0 auto" }}>
      <h1>Choisir un nouveau mot de passe</h1>
      <AuthForm action={updatePassword} submitLabel="Enregistrer" pendingLabel="Enregistrement…" fields={["new-password"]} />
    </div>
  );
}
