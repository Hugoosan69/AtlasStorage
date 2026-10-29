import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { ReceiptsView } from "@/components/ReceiptsView";

export default async function ReceiptsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?denied=1");

  return (
    <AppShell user={user}>
      <ReceiptsView isAdmin={user.role === "admin"} />
    </AppShell>
  );
}
