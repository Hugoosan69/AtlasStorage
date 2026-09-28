import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { FileBrowser } from "@/components/file-browser/FileBrowser";

export default async function Home() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return <FileBrowser user={user} />;
}
