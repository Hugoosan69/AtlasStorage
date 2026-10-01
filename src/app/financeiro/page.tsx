import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { FinanceView } from "@/components/FinanceView";

export default async function FinancePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?denied=1");

  return (
    <AppShell user={user}>
      <FinanceView isAdmin={user.role === "admin"} />
    </AppShell>
  );
}
