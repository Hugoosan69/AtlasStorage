import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { FileBrowser } from "@/components/file-browser/FileBrowser";

export default async function Home() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?denied=1");

  return (
    <AppShell user={user}>
      <FileBrowser user={user} />
    </AppShell>
  );
}
