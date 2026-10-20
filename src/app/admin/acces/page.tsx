import { AccessToggle } from "@/components/admin/AccessToggle";
import { createClient } from "@/lib/supabase/server";

type UserRow = { user_id: string; email: string; created_at: string; confirmed: boolean; is_admin: boolean; has_full_access: boolean; access_granted_at: string | null };
type AuditRow = { id: number; target_email: string | null; actor_email: string | null; action: "grant" | "revoke"; note: string | null; created_at: string };

export default async function AccessAdmin({ searchParams }: PageProps<"/admin/acces">) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : "";
  const supabase = await createClient();
  const [{ data: users, error }, { data: audit }] = await Promise.all([
    supabase.rpc("admin_list_users", { p_search: q }),
    supabase.from("access_audit").select("id, target_email, actor_email, action, note, created_at").order("created_at", { ascending: false }).limit(50),
  ]);
  return (
    <div className="stack">
      <h1>Accès complet</h1>
      <p className="small muted">Le paiement en ligne n&apos;est pas activé. L&apos;accès complet s&apos;attribue manuellement ici ; chaque opération est tracée. Un utilisateur ne peut jamais se l&apos;attribuer lui-même (contrôle en base).</p>
      <form className="row" role="search">
        <label className="od-field" style={{ flex: "1 1 240px" }}>
          <span className="sr-only">Rechercher par e-mail</span>
          <input className="od-input" type="search" name="q" defaultValue={q} placeholder="Rechercher par e-mail" />
        </label>
        <button className="od-button od-button--secondary" type="submit">Rechercher</button>
      </form>
      {error && <p className="notice notice--error">Impossible de charger les comptes.</p>}
      <ul className="stack-sm" style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {((users ?? []) as UserRow[]).map((u) => (
          <li key={u.user_id} className="od-card stack-sm">
            <div className="row">
              <strong>{u.email}</strong>
              {u.has_full_access ? <span className="od-badge od-badge--free">Accès complet</span> : <span className="od-badge od-badge--neutral">Gratuit</span>}
              {u.is_admin && <span className="od-badge">Admin</span>}
              {!u.confirmed && <span className="od-badge od-badge--draft">E-mail non confirmé</span>}
            </div>
            <p className="xsmall muted" style={{ margin: 0 }}>Inscrit le {new Date(u.created_at).toLocaleDateString("fr-FR")}{u.access_granted_at && ` · accès depuis le ${new Date(u.access_granted_at).toLocaleDateString("fr-FR")}`}</p>
            <AccessToggle userId={u.user_id} email={u.email} hasAccess={u.has_full_access} />
          </li>
        ))}
        {(users ?? []).length === 0 && !error && <li className="od-card muted">Aucun compte trouvé.</li>}
      </ul>
      <section className="stack-sm">
        <h2>Journal des opérations</h2>
        {(audit ?? []).length === 0 ? <p className="muted">Aucune opération enregistrée.</p> : (
          <div className="table-scroll" tabIndex={0} role="region" aria-label="Tableau défilant">
            <table className="data">
              <thead><tr><th>Date</th><th>Opération</th><th>Compte</th><th>Par</th><th>Note</th></tr></thead>
              <tbody>
                {((audit ?? []) as AuditRow[]).map((a) => (
                  <tr key={a.id}>
                    <td>{new Date(a.created_at).toLocaleString("fr-FR")}</td>
                    <td>{a.action === "grant" ? "Attribution" : "Révocation"}</td>
                    <td>{a.target_email}</td><td>{a.actor_email}</td><td>{a.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
