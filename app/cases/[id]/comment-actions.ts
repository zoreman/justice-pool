"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { supabaseAdmin } from "@/lib/supabase-admin";
import { createClient } from "@/lib/supabase-server";

export async function createComment(
  caseId: string,
  formData: FormData,
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const content = String(formData.get("content") ?? "").trim();

  if (!content) {
    throw new Error("Enter a comment.");
  }

  if (content.length > 1000) {
    throw new Error("Comments cannot exceed 1,000 characters.");
  }

  const { data: caseData, error: caseError } = await supabaseAdmin
    .from("cases")
    .select("id, title, user_id")
    .eq("id", caseId)
    .single();

  if (caseError || !caseData) {
    throw new Error(caseError?.message ?? "Case not found.");
  }

  const { error: commentError } = await supabase
    .from("case_comments")
    .insert({
      case_id: caseId,
      user_id: user.id,
      content,
    });

  if (commentError) {
    throw new Error(commentError.message);
  }

  if (caseData.user_id && caseData.user_id !== user.id) {
    const { error: notificationError } = await supabaseAdmin.rpc(
      "create_notification",
      {
        user_id_input: caseData.user_id,
        type_input: "comment",
        title_input: "New comment on your case",
        message_input: `Someone commented on "${caseData.title}".`,
        link_input: `/cases/${caseId}`,
      },
    );

    if (notificationError) {
      throw new Error(notificationError.message);
    }
  }

  revalidatePath(`/cases/${caseId}`);
  revalidatePath("/notifications");
  revalidatePath("/dashboard");
}

export async function deleteComment(
  caseId: string,
  commentId: number,
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { error } = await supabase
    .from("case_comments")
    .delete()
    .eq("id", commentId)
    .eq("user_id", user.id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/cases/${caseId}`);
}