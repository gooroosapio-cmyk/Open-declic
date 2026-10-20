import { saveCategory, saveContactSetting } from "@/app/actions/admin";
import { AdminForm } from "@/components/admin/AdminForm";
import { getCategories, getSetting } from "@/lib/data";

export default async function Settings() {
  const [contact, categories] = await Promise.all([getSetting<{ texte: string }>("acces_contact"), getCategories()]);
  return (
    <div className="stack">
      <h1>Réglages</h1>
      <section className="od-card stack">
        <h2>Contact pour l&apos;accès complet</h2>
        <p className="small muted">Texte public affiché sous l&apos;offre d&apos;accès complet (laisser vide pour ne rien afficher). N&apos;y mettez aucune donnée sensible.</p>
        <AdminForm action={saveContactSetting} submitLabel="Enregistrer">
          <label className="od-field">Texte<textarea className="od-input" name="texte" rows={3} defaultValue={contact?.texte ?? ""} /></label>
        </AdminForm>
      </section>
      <section className="od-card stack">
        <h2>Catégories</h2>
        <ul>{categories.map((c) => <li key={c.slug}>{c.label} <code className="xsmall">{c.slug}</code></li>)}</ul>
        <AdminForm action={saveCategory} submitLabel="Ajouter ou renommer">
          <p className="small muted">Saisissez un identifiant existant pour renommer, ou un nouvel identifiant pour ajouter.</p>
          <label className="od-field">Identifiant<input className="od-input" name="slug" required pattern="[a-z0-9]+(-[a-z0-9]+)*" /></label>
          <label className="od-field">Libellé<input className="od-input" name="label" required /></label>
          <label className="od-field">Position<input className="od-input" name="position" type="number" defaultValue={10} /></label>
        </AdminForm>
      </section>
    </div>
  );
}
