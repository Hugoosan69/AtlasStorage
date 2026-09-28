import { createServiceClient } from "./supabase/server";

export async function logAction(params: {
  userId: string;
  userEmail: string;
  action: string;
  targetDriveId?: string;
  targetName?: string;
  targetParentId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
}) {
  const supabase = await createServiceClient();
  await supabase.from("audit_logs").insert({
    user_id: params.userId,
    user_email: params.userEmail,
    action: params.action,
    target_drive_id: params.targetDriveId,
    target_name: params.targetName,
    target_parent_id: params.targetParentId,
    details: params.details,
    ip_address: params.ipAddress,
  });
}
