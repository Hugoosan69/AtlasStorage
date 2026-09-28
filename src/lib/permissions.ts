import { createServiceClient } from "./supabase/server";
import type { UserPermissions } from "@/types";

const DEFAULT_PERMISSIONS: UserPermissions = {
  can_view: false,
  can_download: false,
  can_upload: false,
  can_create_folder: false,
  can_rename_files: false,
  can_rename_folders: false,
  can_move_files: false,
  can_move_folders: false,
  can_delete_files: false,
  can_delete_folders: false,
};

export async function getUserPermissions(
  userId: string,
  folderDriveId: string,
  rootFolderId: string
): Promise<UserPermissions> {
  const supabase = await createServiceClient();

  const { data: user } = await supabase
    .from("users")
    .select("id, role")
    .eq("id", userId)
    .single();

  if (!user) return DEFAULT_PERMISSIONS;

  if (user.role === "admin") {
    return {
      can_view: true,
      can_download: true,
      can_upload: true,
      can_create_folder: true,
      can_rename_files: true,
      can_rename_folders: true,
      can_move_files: true,
      can_move_folders: true,
      can_delete_files: true,
      can_delete_folders: true,
    };
  }

  const { data: userGroups } = await supabase
    .from("user_groups")
    .select("group_id")
    .eq("user_id", userId);

  const groupIds = (userGroups || []).map((ug) => ug.group_id);

  const { data: permissions } = await supabase
    .from("permissions")
    .select("*")
    .or(
      `user_id.eq.${userId}${groupIds.length > 0 ? `,group_id.in.(${groupIds.join(",")})` : ""}`
    );

  if (!permissions || permissions.length === 0) return DEFAULT_PERMISSIONS;

  const folderChain = await getFolderChain(folderDriveId, rootFolderId);

  const merged = { ...DEFAULT_PERMISSIONS };

  for (const folderId of folderChain) {
    const matching = permissions.filter(
      (p) =>
        p.folder_drive_id === folderId &&
        (p.folder_drive_id === folderDriveId || p.inherit)
    );

    for (const perm of matching) {
      for (const key of Object.keys(DEFAULT_PERMISSIONS) as Array<
        keyof UserPermissions
      >) {
        if (perm[key]) merged[key] = true;
      }
    }
  }

  return merged;
}

async function getFolderChain(
  folderId: string,
  rootFolderId: string
): Promise<string[]> {
  if (folderId === rootFolderId) return [rootFolderId];

  const { getFileMetadata } = await import("./google-drive");
  const chain: string[] = [];
  let currentId = folderId;

  while (currentId && currentId !== rootFolderId) {
    chain.unshift(currentId);
    const meta = await getFileMetadata(currentId);
    currentId = meta.parents?.[0] || "";
  }

  chain.unshift(rootFolderId);
  return chain;
}

export async function checkPermission(
  userId: string,
  folderDriveId: string,
  action: keyof UserPermissions,
  rootFolderId: string
): Promise<boolean> {
  const perms = await getUserPermissions(userId, folderDriveId, rootFolderId);
  return perms[action];
}
