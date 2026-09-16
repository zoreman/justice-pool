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

async function requireCaseOwner(
  caseId: string,
) {
  const supabase =
    await createClient();

  const {
    data: { user },
  } =
    await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const {
    data: caseData,
    error,
  } = await supabase
    .from("cases")
    .select(
      `
        id,
        title,
        user_id,
        assigned_attorney_id,
        case_status
      `,
    )
    .eq("id", caseId)
    .single();

  if (
    error ||
    !caseData
  ) {
    throw new Error(
      error?.message ??
        "Case not found.",
    );
  }

  /*
   * Every application action using
   * requireCaseOwner() is automatically
   * blocked once the case is closed.
   */
  assertCaseIsOpen(
    caseData.case_status,
  );

  if (
    caseData.user_id !==
    user.id
  ) {
    redirect("/dashboard");
  }

  return {
    supabase,
    user,
    caseData,
  };
}

function refreshApplicationPages(
  caseId: string,
) {
  revalidatePath(
    `/cases/${caseId}`,
  );

  revalidatePath(
    `/cases/${caseId}/applications`,
  );

  revalidatePath("/cases");
  revalidatePath("/dashboard");

  revalidatePath(
    "/attorney/dashboard",
  );

  revalidatePath(
    "/attorney/cases",
  );

  revalidatePath("/messages");
  revalidatePath("/notifications");
}

export async function acceptAttorneyApplication(
  caseId: string,
  applicationId: number,
) {
  const {
    user,
    caseData,
  } =
    await requireCaseOwner(
      caseId,
    );

  /*
   * Attorney assignment belongs at the
   * approved stage of the workflow.
   */
  if (
    caseData.case_status !==
    "approved"
  ) {
    throw new Error(
      "An attorney can only be selected while the case is in Approved status.",
    );
  }

  /*
   * Prevent replacing an attorney once
   * one has already been assigned.
   */
  if (
    caseData.assigned_attorney_id
  ) {
    throw new Error(
      "An attorney has already been assigned to this case.",
    );
  }

  const {
    data: application,
    error:
      applicationError,
  } = await supabaseAdmin
    .from(
      "attorney_applications",
    )
    .select(
      `
        id,
        attorney_id,
        case_id,
        status
      `,
    )
    .eq(
      "id",
      applicationId,
    )
    .eq(
      "case_id",
      caseId,
    )
    .single();

  if (
    applicationError ||
    !application
  ) {
    throw new Error(
      applicationError?.message ??
        "Application not found.",
    );
  }

  if (
    application.status !==
    "pending"
  ) {
    throw new Error(
      "This application has already been reviewed.",
    );
  }

  /*
   * Verify that the attorney still
   * exists and remains verified.
   */
  const {
    data: attorney,
    error: attorneyError,
  } = await supabaseAdmin
    .from("attorneys")
    .select(
      `
        id,
        full_name,
        years_experience,
        verified
      `,
    )
    .eq(
      "id",
      application.attorney_id,
    )
    .single();

  if (
    attorneyError ||
    !attorney
  ) {
    throw new Error(
      attorneyError?.message ??
        "Attorney not found.",
    );
  }

  if (!attorney.verified) {
    throw new Error(
      "This attorney is not verified.",
    );
  }

  /*
   * Assign the attorney and advance:
   *
   * approved
   *    ↓
   * attorney_assigned
   *
   * The status and null-attorney checks
   * provide stale-request protection.
   */
  const {
    data: updatedCase,
    error:
      caseUpdateError,
  } = await supabaseAdmin
    .from("cases")
    .update({
      assigned_attorney_id:
        attorney.id,

      attorney_name:
        attorney.full_name,

      attorney_role:
        "Assigned attorney",

      attorney_experience:
        `${attorney.years_experience} years`,

      case_status:
        "attorney_assigned",
    })
    .eq(
      "id",
      caseId,
    )
    .eq(
      "case_status",
      "approved",
    )
    .is(
      "assigned_attorney_id",
      null,
    )
    .select("id")
    .maybeSingle();

  if (
    caseUpdateError
  ) {
    throw new Error(
      caseUpdateError.message,
    );
  }

  if (!updatedCase) {
    throw new Error(
      "The case changed before the attorney could be assigned. Refresh and try again.",
    );
  }

  /*
   * Record the automatic workflow
   * transition.
   */
  const {
    error:
      statusHistoryError,
  } = await supabaseAdmin
    .from(
      "case_status_updates",
    )
    .insert({
      case_id:
        caseId,

      changed_by:
        user.id,

      status:
        "attorney_assigned",

      note:
        `${attorney.full_name} was selected to represent the claimant.`,
    });

  if (
    statusHistoryError
  ) {
    /*
     * Best-effort rollback if the
     * timeline could not be recorded.
     */
    await supabaseAdmin
      .from("cases")
      .update({
        assigned_attorney_id:
          null,

        attorney_name:
          null,

        attorney_role:
          null,

        attorney_experience:
          null,

        case_status:
          "approved",
      })
      .eq(
        "id",
        caseId,
      )
      .eq(
        "case_status",
        "attorney_assigned",
      )
      .eq(
        "assigned_attorney_id",
        attorney.id,
      );

    throw new Error(
      statusHistoryError.message,
    );
  }

  /*
   * Accept the selected application.
   */
  const {
    data:
      acceptedApplication,
    error: acceptedError,
  } = await supabaseAdmin
    .from(
      "attorney_applications",
    )
    .update({
      status:
        "accepted",
    })
    .eq(
      "id",
      applicationId,
    )
    .eq(
      "case_id",
      caseId,
    )
    .eq(
      "status",
      "pending",
    )
    .select("id")
    .maybeSingle();

  if (acceptedError) {
    throw new Error(
      acceptedError.message,
    );
  }

  if (
    !acceptedApplication
  ) {
    throw new Error(
      "This application changed before it could be accepted. Refresh and try again.",
    );
  }

  /*
   * Reject every other pending
   * application.
   */
  const {
    error: rejectedError,
  } = await supabaseAdmin
    .from(
      "attorney_applications",
    )
    .update({
      status:
        "rejected",
    })
    .eq(
      "case_id",
      caseId,
    )
    .neq(
      "id",
      applicationId,
    )
    .eq(
      "status",
      "pending",
    );

  if (rejectedError) {
    throw new Error(
      rejectedError.message,
    );
  }

  /*
   * Create the private claimant ↔
   * attorney conversation.
   */
  const {
    error:
      conversationError,
  } = await supabaseAdmin
    .from("conversations")
    .upsert(
      {
        case_id:
          caseId,

        client_id:
          caseData.user_id,

        attorney_id:
          application.attorney_id,

        updated_at:
          new Date().toISOString(),
      },
      {
        onConflict:
          "case_id,client_id,attorney_id",
      },
    );

  if (
    conversationError
  ) {
    throw new Error(
      conversationError.message,
    );
  }

  /*
   * Tell the selected attorney.
   */
  const {
    error:
      notificationError,
  } = await supabaseAdmin.rpc(
    "create_notification",
    {
      user_id_input:
        application.attorney_id,

      type_input:
        "attorney_application_accepted",

      title_input:
        "Your application was accepted",

      message_input:
        `You were selected to represent "${caseData.title}".`,

      link_input:
        `/cases/${caseId}`,
    },
  );

  if (
    notificationError
  ) {
    console.error(
      "Unable to create attorney acceptance notification:",
      notificationError.message,
    );
  }

  refreshApplicationPages(
    caseId,
  );
}

export async function rejectAttorneyApplication(
  caseId: string,
  applicationId: number,
) {
  const {
    caseData,
  } =
    await requireCaseOwner(
      caseId,
    );

  /*
   * Once an attorney has been selected,
   * there should no longer be pending
   * applications to manually review.
   */
  if (
    caseData.assigned_attorney_id
  ) {
    throw new Error(
      "An attorney has already been assigned to this case.",
    );
  }

  /*
   * Applications should only be reviewed
   * during the approved stage.
   */
  if (
    caseData.case_status !==
    "approved"
  ) {
    throw new Error(
      "Attorney applications cannot be reviewed at the current case stage.",
    );
  }

  const {
    data: application,
    error:
      applicationError,
  } = await supabaseAdmin
    .from(
      "attorney_applications",
    )
    .select(
      `
        id,
        attorney_id,
        status
      `,
    )
    .eq(
      "id",
      applicationId,
    )
    .eq(
      "case_id",
      caseId,
    )
    .single();

  if (
    applicationError ||
    !application
  ) {
    throw new Error(
      applicationError?.message ??
        "Application not found.",
    );
  }

  if (
    application.status !==
    "pending"
  ) {
    throw new Error(
      "This application has already been reviewed.",
    );
  }

  const {
    data:
      rejectedApplication,
    error: updateError,
  } = await supabaseAdmin
    .from(
      "attorney_applications",
    )
    .update({
      status:
        "rejected",
    })
    .eq(
      "id",
      applicationId,
    )
    .eq(
      "case_id",
      caseId,
    )
    .eq(
      "status",
      "pending",
    )
    .select("id")
    .maybeSingle();

  if (updateError) {
    throw new Error(
      updateError.message,
    );
  }

  if (
    !rejectedApplication
  ) {
    throw new Error(
      "This application changed before it could be rejected. Refresh and try again.",
    );
  }

  const {
    error:
      notificationError,
  } = await supabaseAdmin.rpc(
    "create_notification",
    {
      user_id_input:
        application.attorney_id,

      type_input:
        "attorney_application_rejected",

      title_input:
        "Application update",

      message_input:
        `You were not selected to represent "${caseData.title}".`,

      link_input:
        "/attorney/dashboard",
    },
  );

  if (
    notificationError
  ) {
    console.error(
      "Unable to create attorney rejection notification:",
      notificationError.message,
    );
  }

  refreshApplicationPages(
    caseId,
  );
}