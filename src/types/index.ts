export interface DriveItem {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime?: string;
  iconLink?: string;
  thumbnailLink?: string;
  parents?: string[];
  isFolder: boolean;
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

export interface AppUser {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
  role: "admin" | "user";
  is_active: boolean;
}

export interface Group {
  id: string;
  name: string;
  description?: string;
}

export interface Permission {
  id: string;
  user_id?: string;
  group_id?: string;
  folder_drive_id: string;
  folder_name?: string;
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
