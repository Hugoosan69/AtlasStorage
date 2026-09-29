import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { TrashView } from "@/components/TrashView";

export default async function TrashPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?denied=1");

  return (
    <AppShell user={user}>
      <TrashView />
    </AppShell>
  );
}
