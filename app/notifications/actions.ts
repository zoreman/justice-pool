"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase-server";

async function requireUser() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return { supabase, user };
}

export async function markNotificationRead(notificationId: number) {
  const { supabase, user } = await requireUser();

  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("id", notificationId)
    .eq("user_id", user.id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/notifications");
  revalidatePath("/dashboard");
}

export async function markAllNotificationsRead() {
  const { supabase, user } = await requireUser();

  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("user_id", user.id)
    .eq("read", false);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/notifications");
  revalidatePath("/dashboard");
}

export async function deleteNotification(notificationId: number) {
  const { supabase, user } = await requireUser();

  const { error } = await supabase
    .from("notifications")
    .delete()
    .eq("id", notificationId)
    .eq("user_id", user.id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/notifications");
  revalidatePath("/dashboard");
}