import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { AdminPanel } from "@/components/admin/AdminPanel";

export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?denied=1");
  if (user.role !== "admin") redirect("/");

  return (
    <AppShell user={user}>
      <AdminPanel currentUser={user} />
    </AppShell>
  );
}
