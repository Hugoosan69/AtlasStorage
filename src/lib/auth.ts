import { createClient, createServiceClient } from "./supabase/server";
import type { AppUser } from "@/types";

export async function getCurrentUser(): Promise<AppUser | null> {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) return null;

  const serviceClient = await createServiceClient();
  const { data: appUser } = await serviceClient
    .from("users")
    .select("*")
    .eq("auth_id", authUser.id)
    .single();

  if (!appUser || !appUser.is_active) return null;

  return appUser as AppUser;
}

export async function requireUser(): Promise<AppUser> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  return user;
}

export async function requireAdmin(): Promise<AppUser> {
  const user = await requireUser();
  if (user.role !== "admin") throw new Error("Forbidden");
  return user;
}

let rootCache: { id: string; at: number } | null = null;

export async function getRootFolderId(): Promise<string> {
  if (rootCache && Date.now() - rootCache.at < 30_000) return rootCache.id;

  const serviceClient = await createServiceClient();
  const { data } = await serviceClient
    .from("settings")
    .select("value")
    .eq("key", "root_folder_id")
    .single();

  if (!data?.value) throw new Error("Root folder not configured");
  rootCache = { id: data.value, at: Date.now() };
  return data.value;
}

export function clearRootFolderCache() {
  rootCache = null;
}
