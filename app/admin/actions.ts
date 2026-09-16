"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { supabaseAdmin } from "@/lib/supabase-admin";
import { createClient } from "@/lib/supabase-server";

async function requireAdmin() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const {
    data: profile,
    error: profileError,
  } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profileError) {
    throw new Error(
      profileError.message,
    );
  }

  if (profile?.role !== "admin") {
    redirect("/dashboard");
  }

  return {
    supabase,
    user,
  };
}

async function getCaseDetails(
  caseId: string,
) {
  const {
    data: caseData,
    error,
  } = await supabaseAdmin
    .from("cases")
    .select(
      `
        id,
        title,
        user_id,
        status,
        case_status
      `,
    )
    .eq("id", caseId)
    .single();

  if (error || !caseData) {
    throw new Error(
      error?.message ??
        "Case not found.",
    );
  }

  if (!caseData.user_id) {
    throw new Error(
      "This case does not have an owner.",
    );
  }

  return caseData;
}

async function createCaseNotification({
  userId,
  type,
  title,
  message,
  link,
}: {
  userId: string;
  type: string;
  title: string;
  message: string;
  link: string;
}) {
  const { error } =
    await supabaseAdmin.rpc(
      "create_notification",
      {
        user_id_input: userId,
        type_input: type,
        title_input: title,
        message_input: message,
        link_input: link,
      },
    );

  if (error) {
    throw new Error(
      error.message,
    );
  }
}

function refreshCasePages(
  caseId: string,
) {
  revalidatePath("/admin");
  revalidatePath("/cases");
  revalidatePath(
    `/cases/${caseId}`,
  );
  revalidatePath("/");
  revalidatePath("/dashboard");
  revalidatePath("/notifications");
}

/*
 * SUBMITTED → UNDER REVIEW
 */
export async function beginCaseReview(
  caseId: string,
) {
  const { user } =
    await requireAdmin();

  const caseData =
    await getCaseDetails(
      caseId,
    );

  if (
    caseData.status !== "pending"
  ) {
    throw new Error(
      "This case is not awaiting review.",
    );
  }

  if (
    caseData.case_status !==
    "submitted"
  ) {
    throw new Error(
      "Only newly submitted cases can begin review.",
    );
  }

  const {
    data: updatedCase,
    error: updateError,
  } = await supabaseAdmin
    .from("cases")
    .update({
      case_status:
        "under_review",
    })
    .eq("id", caseId)
    .eq("status", "pending")
    .eq(
      "case_status",
      "submitted",
    )
    .select("id")
    .maybeSingle();

  if (updateError) {
    throw new Error(
      updateError.message,
    );
  }

  if (!updatedCase) {
    throw new Error(
      "The case changed before review could begin. Refresh and try again.",
    );
  }

  const {
    error: historyError,
  } = await supabaseAdmin
    .from("case_status_updates")
    .insert({
      case_id: caseId,
      changed_by: user.id,
      status: "under_review",
      note:
        "An administrator began reviewing the case submission.",
    });

  if (historyError) {
    /*
     * Roll the status back if the
     * timeline insert fails.
     */
    await supabaseAdmin
      .from("cases")
      .update({
        case_status:
          "submitted",
      })
      .eq("id", caseId)
      .eq(
        "case_status",
        "under_review",
      );

    throw new Error(
      historyError.message,
    );
  }

  await createCaseNotification({
    userId: caseData.user_id,
    type: "case_status",
    title:
      "Your case is under review",
    message:
      `"${caseData.title}" is now being reviewed by the Justice Pool team.`,
    link: `/cases/${caseId}`,
  });

  refreshCasePages(caseId);
}

/*
 * UNDER REVIEW → APPROVED
 */
export async function approveCase(
  caseId: string,
) {
  const { user } =
    await requireAdmin();

  const caseData =
    await getCaseDetails(
      caseId,
    );

  if (
    caseData.status !== "pending" ||
    caseData.case_status !==
      "under_review"
  ) {
    throw new Error(
      "This case must be under review before it can be approved.",
    );
  }

  const {
    data: updatedCase,
    error,
  } = await supabaseAdmin
    .from("cases")
    .update({
      status: "active",
      verified: true,
      case_status: "approved",
      review_notes: null,
    })
    .eq("id", caseId)
    .eq("status", "pending")
    .eq(
      "case_status",
      "under_review",
    )
    .select("id")
    .maybeSingle();

  if (error) {
    throw new Error(
      error.message,
    );
  }

  if (!updatedCase) {
    throw new Error(
      "The case changed before approval completed. Refresh and try again.",
    );
  }

  const {
    error: historyError,
  } = await supabaseAdmin
    .from("case_status_updates")
    .insert({
      case_id: caseId,
      changed_by: user.id,
      status: "approved",
      note:
        "The case was approved for publication and support.",
    });

  if (historyError) {
    throw new Error(
      historyError.message,
    );
  }

  await createCaseNotification({
    userId: caseData.user_id,
    type: "case_approved",
    title:
      "Your case was approved",
    message:
      `"${caseData.title}" is now approved and visible to the public.`,
    link: `/cases/${caseId}`,
  });

  refreshCasePages(caseId);
}

/*
 * UNDER REVIEW → NEEDS REVISION
 */
export async function requestChanges(
  caseId: string,
  formData: FormData,
) {
  const { user } =
    await requireAdmin();

  const caseData =
    await getCaseDetails(
      caseId,
    );

  if (
    caseData.status !== "pending" ||
    caseData.case_status !==
      "under_review"
  ) {
    throw new Error(
      "This case must be under review before changes can be requested.",
    );
  }

  const reviewNotes = String(
    formData.get(
      "reviewNotes",
    ) ?? "",
  ).trim();

  if (!reviewNotes) {
    throw new Error(
      "Enter feedback for the applicant.",
    );
  }

  if (
    reviewNotes.length > 2000
  ) {
    throw new Error(
      "Review feedback cannot exceed 2,000 characters.",
    );
  }

  const {
    data: updatedCase,
    error,
  } = await supabaseAdmin
    .from("cases")
    .update({
      status: "needs_revision",
      verified: false,
      case_status:
        "needs_revision",
      review_notes:
        reviewNotes,
    })
    .eq("id", caseId)
    .eq("status", "pending")
    .eq(
      "case_status",
      "under_review",
    )
    .select("id")
    .maybeSingle();

  if (error) {
    throw new Error(
      error.message,
    );
  }

  if (!updatedCase) {
    throw new Error(
      "The case changed before the revision request completed. Refresh and try again.",
    );
  }

  const {
    error: historyError,
  } = await supabaseAdmin
    .from("case_status_updates")
    .insert({
      case_id: caseId,
      changed_by: user.id,
      status:
        "needs_revision",
      note:
        "The administrator requested changes to the case submission.",
    });

  if (historyError) {
    throw new Error(
      historyError.message,
    );
  }

  await createCaseNotification({
    userId: caseData.user_id,
    type: "case_revision",
    title:
      "Changes were requested",
    message:
      `"${caseData.title}" needs revisions: ${reviewNotes}`,
    link:
      `/cases/${caseId}/edit`,
  });

  refreshCasePages(caseId);
}

/*
 * UNDER REVIEW → REJECTED
 */
export async function rejectCase(
  caseId: string,
) {
  const { user } =
    await requireAdmin();

  const caseData =
    await getCaseDetails(
      caseId,
    );

  if (
    caseData.status !== "pending" ||
    caseData.case_status !==
      "under_review"
  ) {
    throw new Error(
      "This case must be under review before it can be rejected.",
    );
  }

  const {
    data: updatedCase,
    error,
  } = await supabaseAdmin
    .from("cases")
    .update({
      status: "rejected",
      verified: false,
      case_status: "rejected",
    })
    .eq("id", caseId)
    .eq("status", "pending")
    .eq(
      "case_status",
      "under_review",
    )
    .select("id")
    .maybeSingle();

  if (error) {
    throw new Error(
      error.message,
    );
  }

  if (!updatedCase) {
    throw new Error(
      "The case changed before rejection completed. Refresh and try again.",
    );
  }

  const {
    error: historyError,
  } = await supabaseAdmin
    .from("case_status_updates")
    .insert({
      case_id: caseId,
      changed_by: user.id,
      status: "rejected",
      note:
        "The case submission was not approved.",
    });

  if (historyError) {
    throw new Error(
      historyError.message,
    );
  }

  await createCaseNotification({
    userId: caseData.user_id,
    type: "case_rejected",
    title:
      "Your case was not approved",
    message:
      `"${caseData.title}" was reviewed and was not approved.`,
    link: "/dashboard",
  });

  refreshCasePages(caseId);
}