import { supabase } from "./supabaseClient";

export type NotificationType = "verdict" | "scheduled" | "completed";

// Creates an in-app notification row for a user. The patient's NotificationContext
// picks it up in real time. Never throws: a failed notification must not break the main action.
export async function notifyUser(userId: string, type: NotificationType, message: string) {
  try {
    const { error } = await supabase
      .from("notifications")
      .insert({ user_id: userId, type, message, read: false });
    if (error) console.warn("notifyUser failed:", error.message);
  } catch (err) {
    console.warn("notifyUser failed:", err);
  }
}
