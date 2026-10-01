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

  if (data?.value) {
    rootCache = { id: data.value, at: Date.now() };
    return data.value;
  }

  // Auto-detect: search for a folder named "atlas" in Drive
  const { autoDetectRootFolder } = await import("@/lib/google-drive");
  const detectedId = await autoDetectRootFolder();
  if (detectedId) {
    await serviceClient
      .from("settings")
      .upsert(
        {
          key: "root_folder_id",
          value: detectedId,
          description: "Pasta raiz do Google Drive (auto-detectada)",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "key" }
      );
    rootCache = { id: detectedId, at: Date.now() };
    return detectedId;
  }

  throw new Error("Root folder not configured");
}

export function clearRootFolderCache() {
  rootCache = null;
}
