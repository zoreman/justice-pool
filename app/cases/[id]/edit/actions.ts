"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function resubmitCase(
  caseId: string,
  formData: FormData,
) {
  /*
   * Normal client is used only to establish
   * who is making the request.
   */
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const title = String(
    formData.get("title") ?? "",
  ).trim();

  const category = String(
    formData.get("category") ?? "",
  ).trim();

  const summary = String(
    formData.get("summary") ?? "",
  ).trim();

  const story = String(
    formData.get("story") ?? "",
  ).trim();

  const fundingGoal = Number(
    formData.get("goal"),
  );

  const campaignDays = Number(
    formData.get("days_left"),
  );

  /*
   * Validate all user-controlled input before
   * using the service-role client.
   */
  if (!title) {
    throw new Error(
      "Enter a case title.",
    );
  }

  if (title.length > 120) {
    throw new Error(
      "Case title cannot exceed 120 characters.",
    );
  }

  if (!category) {
    throw new Error(
      "Choose a category.",
    );
  }

  if (!summary) {
    throw new Error(
      "Enter a short summary.",
    );
  }

  if (summary.length > 350) {
    throw new Error(
      "Summary cannot exceed 350 characters.",
    );
  }

  if (!story) {
    throw new Error(
      "Enter the full story.",
    );
  }

  if (
    !Number.isFinite(fundingGoal) ||
    fundingGoal <= 0
  ) {
    throw new Error(
      "Enter a valid funding goal.",
    );
  }

  if (
    !Number.isInteger(campaignDays) ||
    campaignDays < 1 ||
    campaignDays > 365
  ) {
    throw new Error(
      "Campaign length must be between 1 and 365 days.",
    );
  }

  /*
   * Read the authoritative case record with
   * the trusted server client.
   */
  const {
    data: caseData,
    error: caseError,
  } = await supabaseAdmin
    .from("cases")
    .select(
      `
        id,
        user_id,
        status,
        case_status
      `,
    )
    .eq("id", caseId)
    .single();

  if (
    caseError ||
    !caseData
  ) {
    throw new Error(
      "Case not found.",
    );
  }

  /*
   * IMPORTANT:
   * Using supabaseAdmin bypasses RLS, so we
   * enforce ownership ourselves before making
   * any mutation.
   */
  if (
    caseData.user_id !==
    user.id
  ) {
    throw new Error(
      "You do not have permission to edit this case.",
    );
  }

  if (
    caseData.case_status ===
    "closed"
  ) {
    throw new Error(
      "This case is closed and can no longer be modified.",
    );
  }

  /*
   * Only cases explicitly returned for revision
   * can use this action.
   */
  if (
    caseData.status !==
      "needs_revision" &&
    caseData.case_status !==
      "needs_revision"
  ) {
    throw new Error(
      "This case is not awaiting revisions.",
    );
  }

  /*
   * Trusted server-side update.
   *
   * The browser cannot directly change protected
   * fields such as status, case_status or verified.
   */
  const {
    data: updatedCase,
    error: updateError,
  } = await supabaseAdmin
    .from("cases")
    .update({
      title,
      category,
      goal: fundingGoal,
      description: summary,
      summary,
      story,
      days_left: campaignDays,

      status: "pending",
      case_status: "submitted",
      verified: false,
      review_notes: null,
    })
    .eq("id", caseId)
    .eq("user_id", user.id)
    .eq(
      "case_status",
      caseData.case_status,
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
      "The case changed before resubmission completed. Refresh and try again.",
    );
  }

  /*
   * Record the workflow transition.
   */
  const {
    error: historyError,
  } = await supabaseAdmin
    .from("case_status_updates")
    .insert({
      case_id: caseId,
      changed_by: user.id,
      status: "submitted",
      note:
        "The claimant revised and resubmitted the case for review.",
    });

  if (historyError) {
    /*
     * Restore the review state if writing the
     * status history fails.
     */
    const {
      error: rollbackError,
    } = await supabaseAdmin
      .from("cases")
      .update({
        status:
          caseData.status,
        case_status:
          caseData.case_status,
      })
      .eq("id", caseId)
      .eq("user_id", user.id);

    if (rollbackError) {
      console.error(
        "Unable to rollback case resubmission:",
        rollbackError.message,
      );
    }

    throw new Error(
      historyError.message,
    );
  }

  revalidatePath(
    `/cases/${caseId}`,
  );

  revalidatePath(
    `/cases/${caseId}/edit`,
  );

  revalidatePath("/cases");
  revalidatePath("/dashboard");
  revalidatePath("/admin");

  redirect("/dashboard");
}