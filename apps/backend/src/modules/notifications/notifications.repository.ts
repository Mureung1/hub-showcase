import { supabaseAdminClient } from "../../common/config/supabase";
import {
  CreateNotificationInput,
  NotificationRecord
} from "./notifications.types";

const NOTIFICATION_COLUMNS = "id,user_id,type,title,message,read_at,created_at";

export async function findNotificationsByUserId(userId: string) {
  const { data, error } = await supabaseAdminClient
    .from("notifications")
    .select(NOTIFICATION_COLUMNS)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return data as unknown as NotificationRecord[];
}

export async function insertNotifications(inputs: CreateNotificationInput[]) {
  if (inputs.length === 0) {
    return [];
  }

  const { data, error } = await supabaseAdminClient
    .from("notifications")
    .insert(
      inputs.map((input) => ({
        user_id: input.userId,
        type: input.type,
        title: input.title,
        message: input.message
      }))
    )
    .select(NOTIFICATION_COLUMNS);

  if (error) {
    throw new Error(error.message);
  }

  return data as unknown as NotificationRecord[];
}

export async function markNotificationReadById(notificationId: string, userId: string) {
  const { data, error } = await supabaseAdminClient
    .from("notifications")
    .update({
      read_at: new Date().toISOString()
    })
    .eq("id", notificationId)
    .eq("user_id", userId)
    .select(NOTIFICATION_COLUMNS)
    .maybeSingle<NotificationRecord>();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}
