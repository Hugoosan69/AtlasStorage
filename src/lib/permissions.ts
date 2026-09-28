import { createServiceClient } from "./supabase/server";
import { getFolderPath } from "./google-drive";
import type { AppUser, UserPermissions } from "@/types";

export const PERMISSION_KEYS = [
  "can_view",
  "can_download",
  "can_upload",
  "can_create_folder",
  "can_rename_files",
  "can_rename_folders",
  "can_move_files",
  "can_move_folders",
  "can_delete_files",
  "can_delete_folders",
] as const satisfies ReadonlyArray<keyof UserPermissions>;

export const NO_PERMISSIONS: UserPermissions = Object.fromEntries(
  PERMISSION_KEYS.map((k) => [k, false])
) as unknown as UserPermissions;

const ALL_PERMISSIONS: UserPermissions = Object.fromEntries(
  PERMISSION_KEYS.map((k) => [k, true])
) as unknown as UserPermissions;

type Rule = UserPermissions & { folder_drive_id: string; inherit: boolean };

export interface Access {
  isAdmin: boolean;
  rootId: string;
  rules: Rule[];
  traversable?: Set<string>;
}

export async function loadAccess(user: AppUser, rootId: string): Promise<Access> {
  if (user.role === "admin") return { isAdmin: true, rootId, rules: [] };

  const supabase = await createServiceClient();
  const { data: groups } = await supabase
    .from("user_groups")
    .select("group_id")
    .eq("user_id", user.id);
  const groupIds = (groups || []).map((g) => g.group_id);

  const query = supabase.from("permissions").select("*");
  const { data } = groupIds.length
    ? await query.or(`user_id.eq.${user.id},group_id.in.(${groupIds.join(",")})`)
    : await query.eq("user_id", user.id);

  return { isAdmin: false, rootId, rules: (data || []) as Rule[] };
}

/**
 * `chain` runs from the Atlas root to the target folder. A rule on the target always
 * applies; a rule on an ancestor applies only when it is inherited.
 */
export function resolve(access: Access, chain: string[] | null): UserPermissions {
  if (!chain) return NO_PERMISSIONS;
  if (access.isAdmin) return ALL_PERMISSIONS;

  const last = chain.length - 1;
  const result = { ...NO_PERMISSIONS };
  for (const rule of access.rules) {
    const index = chain.indexOf(rule.folder_drive_id);
    if (index === -1 || (index !== last && !rule.inherit)) continue;
    for (const key of PERMISSION_KEYS) if (rule[key]) result[key] = true;
  }
  return result;
}

export async function getChain(folderId: string, rootId: string) {
  const path = await getFolderPath(folderId, rootId);
  return path ? path.map((p) => p.id) : null;
}

export async function permissionsFor(access: Access, folderId: string) {
  return resolve(access, await getChain(folderId, access.rootId));
}

/** Ancestors of folders the user can view, so they can navigate down to them. */
export async function getTraversable(access: Access): Promise<Set<string>> {
  if (access.traversable) return access.traversable;

  const chains = await Promise.all(
    access.rules
      .filter((r) => r.can_view)
      .map((r) => getChain(r.folder_drive_id, access.rootId).catch(() => null))
  );
  const set = new Set<string>();
  for (const chain of chains) chain?.slice(0, -1).forEach((id) => set.add(id));

  access.traversable = set;
  return set;
}

export async function canSeeFolder(access: Access, chain: string[]) {
  if (access.isAdmin) return true;
  if (resolve(access, chain).can_view) return true;
  return (await getTraversable(access)).has(chain[chain.length - 1]);
}
