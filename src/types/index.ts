export interface DriveItem {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime?: string;
  createdTime?: string;
  parents?: string[];
  isFolder: boolean;
  hasThumbnail?: boolean;
  /** Signed URL for the thumbnail proxy; only present when Drive has a thumbnail. */
  thumb?: string;
  /** Search results only: where the item lives. */
  parentId?: string;
  parentName?: string;
}

export interface BreadcrumbItem {
  id: string;
  name: string;
}

export interface UserPermissions {
  can_view: boolean;
  can_download: boolean;
  can_upload: boolean;
  can_create_folder: boolean;
  can_rename_files: boolean;
  can_rename_folders: boolean;
  can_move_files: boolean;
  can_move_folders: boolean;
  can_delete_files: boolean;
  can_delete_folders: boolean;
}

export interface FolderListing {
  folder: BreadcrumbItem;
  breadcrumb: BreadcrumbItem[];
  permissions: UserPermissions;
  /** The user can only pass through this folder to reach folders shared with them. */
  limited: boolean;
  files: DriveItem[];
}

export interface AppUser {
  id: string;
  auth_id?: string;
  email: string;
  name: string;
  avatar_url?: string;
  role: "admin" | "user";
  is_active: boolean;
  created_at?: string;
  last_sign_in_at?: string | null;
}

export interface Group {
  id: string;
  name: string;
  description?: string;
}

export interface Permission extends UserPermissions {
  id: string;
  user_id?: string;
  group_id?: string;
  folder_drive_id: string;
  folder_name?: string;
  inherit: boolean;
}

export interface AuditLog {
  id: string;
  user_id?: string;
  user_email?: string;
  action: string;
  target_drive_id?: string;
  target_name?: string;
  target_parent_id?: string;
  details?: Record<string, unknown>;
  ip_address?: string;
  created_at: string;
}
