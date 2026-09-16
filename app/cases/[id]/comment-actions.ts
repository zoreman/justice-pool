"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { supabaseAdmin } from "@/lib/supabase-admin";
import { createClient } from "@/lib/supabase-server";

function assertCaseIsOpen(
  caseStatus: string,
) {
  if (caseStatus === "closed") {
    throw new Error(
      "This case is closed and can no longer be modified.",
    );
  }
}

function refreshCommentPages(
  caseId: string,
) {
  revalidatePath(`/cases/${caseId}`);
  revalidatePath("/notifications");
  revalidatePath("/dashboard");
}

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

  const content = String(
    formData.get("content") ?? "",
  ).trim();

  if (!content) {
    throw new Error(
      "Enter a comment.",
    );
  }

  if (content.length > 1000) {
    throw new Error(
      "Comments cannot exceed 1,000 characters.",
    );
  }

  const {
    data: caseData,
    error: caseError,
  } = await supabaseAdmin
    .from("cases")
    .select(
      `
        id,
        title,
        user_id,
        case_status
      `,
    )
    .eq("id", caseId)
    .single();

  if (caseError || !caseData) {
    throw new Error(
      caseError?.message ??
        "Case not found.",
    );
  }

  assertCaseIsOpen(
    caseData.case_status,
  );

  const {
    error: commentError,
  } = await supabase
    .from("case_comments")
    .insert({
      case_id: caseId,
      user_id: user.id,
      content,
    });

  if (commentError) {
    throw new Error(
      commentError.message,
    );
  }

  if (
    caseData.user_id &&
    caseData.user_id !== user.id
  ) {
    const {
      error: notificationError,
    } = await supabaseAdmin.rpc(
      "create_notification",
      {
        user_id_input:
          caseData.user_id,
        type_input:
          "comment",
        title_input:
          "New comment on your case",
        message_input:
          `Someone commented on "${caseData.title}".`,
        link_input:
          `/cases/${caseId}`,
      },
    );

    if (notificationError) {
      console.error(
        "Unable to create comment notification:",
        notificationError.message,
      );
    }
  }

  refreshCommentPages(
    caseId,
  );
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

  const {
    data: caseData,
    error: caseError,
  } = await supabaseAdmin
    .from("cases")
    .select(
      `
        id,
        case_status
      `,
    )
    .eq("id", caseId)
    .single();

  if (caseError || !caseData) {
    throw new Error(
      caseError?.message ??
        "Case not found.",
    );
  }

  assertCaseIsOpen(
    caseData.case_status,
  );

  const {
    data: deletedComment,
    error,
  } = await supabase
    .from("case_comments")
    .delete()
    .eq("id", commentId)
    .eq("case_id", caseId)
    .eq("user_id", user.id)
    .select("id")
    .maybeSingle();

  if (error) {
    throw new Error(
      error.message,
    );
  }

  if (!deletedComment) {
    throw new Error(
      "Comment not found or you do not have permission to delete it.",
    );
  }

  refreshCommentPages(
    caseId,
  );
}