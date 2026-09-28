import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { FileBrowser } from "@/components/file-browser/FileBrowser";

export default async function Home() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?denied=1");

  return (
    <AppShell user={user}>
      <Suspense>
        <FileBrowser user={user} />
      </Suspense>
    </AppShell>
  );
}
