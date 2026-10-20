import { AdminNav } from "@/components/admin/AdminNav";
import { requireAdmin } from "@/lib/admin";

export const metadata = { title: "Administration", robots: { index: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <div className="stack" style={{ gap: 20 }}>
      <div className="stack-sm">
        <p className="small muted" style={{ margin: 0 }}>Administration</p>
        <AdminNav />
      </div>
      {children}
    </div>
  );
}
