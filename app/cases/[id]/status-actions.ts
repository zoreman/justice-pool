"use server";

import { supabaseAdmin } from "@/lib/supabase-admin";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase-server";

type CaseStatus =
  | "submitted"
  | "under_review"
  | "approved"
  | "attorney_assigned"
  | "consultation_scheduled"
  | "documents_requested"
  | "filing_prepared"
  | "filed"
  | "negotiation"
  | "hearing"
  | "resolved"
  | "closed";

type UserRole =
  | "admin"
  | "attorney"
  | "claimant"
  | "user";

const allowedStatuses = new Set<CaseStatus>([
  "submitted",
  "under_review",
  "approved",
  "attorney_assigned",
  "consultation_scheduled",
  "documents_requested",
  "filing_prepared",
  "filed",
  "negotiation",
  "hearing",
  "resolved",
  "closed",
]);

/*
 * The valid legal workflow.
 *
 * A case cannot jump arbitrarily between stages.
 */
const allowedTransitions: Record<
  CaseStatus,
  CaseStatus[]
> = {
  submitted: [
    "under_review",
  ],

  under_review: [
    "approved",
  ],

  approved: [
    "attorney_assigned",
  ],

  attorney_assigned: [
    "consultation_scheduled",
  ],

  consultation_scheduled: [
    "documents_requested",
    "filing_prepared",
  ],

  documents_requested: [
    "filing_prepared",
  ],

  filing_prepared: [
    "filed",
  ],

  filed: [
    "negotiation",
    "hearing",
  ],

  negotiation: [
    "hearing",
    "resolved",
  ],

  hearing: [
    "resolved",
  ],

  resolved: [
    "closed",
  ],

  closed: [],
};

function formatStatus(
  status: string,
) {
  return status
    .replaceAll("_", " ")
    .replace(
      /\b\w/g,
      (letter) =>
        letter.toUpperCase(),
    );
}

function isCaseStatus(
  value: string,
): value is CaseStatus {
  return allowedStatuses.has(
    value as CaseStatus,
  );
}

function canRolePerformTransition({
  role,
  currentStatus,
  nextStatus,
  isCaseOwner,
  isAssignedAttorney,
}: {
  role: UserRole;
  currentStatus: CaseStatus;
  nextStatus: CaseStatus;
  isCaseOwner: boolean;
  isAssignedAttorney: boolean;
}) {
  /*
   * Admin controls the review / approval
   * portion of the workflow.
   */
  if (role === "admin") {
    return true;
  }

  /*
   * Assigned attorneys control the legal
   * workflow once they are attached to
   * the case.
   */
  if (isAssignedAttorney) {
    const attorneyStatuses: CaseStatus[] = [
      "consultation_scheduled",
      "documents_requested",
      "filing_prepared",
      "filed",
      "negotiation",
      "hearing",
      "resolved",
      "closed",
    ];

    return attorneyStatuses.includes(
      nextStatus,
    );
  }

  /*
   * The claimant should not be able to
   * manually move their case through
   * legal stages.
   *
   * They may close a case once it has
   * already been resolved.
   */
  if (
    isCaseOwner &&
    currentStatus === "resolved" &&
    nextStatus === "closed"
  ) {
    return true;
  }

  return false;
}

export async function updateCaseStatus(
  caseId: string,
  formData: FormData,
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

  const rawStatus = String(
    formData.get("status") ??
      "",
  )
    .trim()
    .toLowerCase();

  const note = String(
    formData.get("note") ??
      "",
  ).trim();

  if (!isCaseStatus(rawStatus)) {
    throw new Error(
      "Invalid case status.",
    );
  }

  if (note.length > 2000) {
    throw new Error(
      "Status note must be 2,000 characters or fewer.",
    );
  }

  const nextStatus =
    rawStatus;

  const [
    {
      data: caseData,
      error: caseError,
    },
    {
      data: profile,
      error: profileError,
    },
  ] = await Promise.all([
    supabase
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
      .eq(
        "id",
        caseId,
      )
      .single(),

    supabase
      .from("profiles")
      .select("role")
      .eq(
        "id",
        user.id,
      )
      .maybeSingle(),
  ]);

  if (
    caseError ||
    !caseData
  ) {
    throw new Error(
      "Case not found.",
    );
  }

  if (profileError) {
    throw new Error(
      profileError.message,
    );
  }

  const currentStatusValue =
    String(
      caseData.case_status ??
        "",
    )
      .trim()
      .toLowerCase();

  if (
    !isCaseStatus(
      currentStatusValue,
    )
  ) {
    throw new Error(
      `The case currently has an unsupported workflow status: "${caseData.case_status}".`,
    );
  }

  const currentStatus =
    currentStatusValue;

  if (
    currentStatus === nextStatus
  ) {
    throw new Error(
      "The case is already using this status.",
    );
  }

  const isCaseOwner =
    caseData.user_id ===
    user.id;

  const isAssignedAttorney =
    caseData.assigned_attorney_id ===
    user.id;

  const role =
    (profile?.role ??
      "user") as UserRole;

  const isAdmin =
    role === "admin";

  if (
    !isAdmin &&
    !isCaseOwner &&
    !isAssignedAttorney
  ) {
    throw new Error(
      "You do not have permission to update this case.",
    );
  }

  /*
   * Make sure the requested status is
   * actually reachable from the
   * current stage.
   */
  const validNextStatuses =
    allowedTransitions[
      currentStatus
    ];

  if (
    !validNextStatuses.includes(
      nextStatus,
    )
  ) {
    const available =
      validNextStatuses.length >
      0
        ? validNextStatuses
            .map(formatStatus)
            .join(", ")
        : "none";

    throw new Error(
      `Cannot move a case from "${formatStatus(
        currentStatus,
      )}" to "${formatStatus(
        nextStatus,
      )}". Valid next status: ${available}.`,
    );
  }

  /*
   * Check role permissions separately
   * from workflow order.
   */
  const hasRolePermission =
    canRolePerformTransition({
      role,
      currentStatus,
      nextStatus,
      isCaseOwner,
      isAssignedAttorney,
    });

  if (!hasRolePermission) {
    throw new Error(
      "You do not have permission to make this workflow change.",
    );
  }

  /*
   * Update with optimistic concurrency
   * protection.
   *
   * The .eq("case_status", currentStatus)
   * prevents two people from moving an
   * outdated version of the case at the
   * same time.
   */
  const {
    data: updatedCase,
    error: caseUpdateError,
  } = await supabaseAdmin
    .from("cases")
    .update({
      case_status:
        nextStatus,
    })
    .eq(
      "id",
      caseId,
    )
    .eq(
      "case_status",
      currentStatus,
    )
    .select("id")
    .maybeSingle();

  if (caseUpdateError) {
    throw new Error(
      caseUpdateError.message,
    );
  }

  if (!updatedCase) {
    throw new Error(
      "The case status changed before this request finished. Refresh the page and try again.",
    );
  }

  /*
   * Record the transition in the
   * permanent case timeline.
   */
  const {
    error: historyError,
  } = await supabaseAdmin
    .from(
      "case_status_updates",
    )
    .insert({
      case_id: caseId,
      changed_by:
        user.id,
      status:
        nextStatus,
      note:
        note || null,
    });

  if (historyError) {
    /*
     * Try to restore the previous
     * status if timeline recording
     * fails.
     */
    await supabaseAdmin
      .from("cases")
      .update({
        case_status:
          currentStatus,
      })
      .eq(
        "id",
        caseId,
      )
      .eq(
        "case_status",
        nextStatus,
      );

    throw new Error(
      historyError.message,
    );
  }

  /*
   * Notify every relevant participant
   * except the person who made the
   * change.
   */
  const recipients =
    new Set<string>();

  if (
    caseData.user_id &&
    caseData.user_id !==
      user.id
  ) {
    recipients.add(
      caseData.user_id,
    );
  }

  if (
    caseData.assigned_attorney_id &&
    caseData.assigned_attorney_id !==
      user.id
  ) {
    recipients.add(
      caseData.assigned_attorney_id,
    );
  }

  const readableStatus =
    formatStatus(
      nextStatus,
    );

  const notificationMessage =
    note
      ? `${caseData.title} is now "${readableStatus}". ${note}`
      : `${caseData.title} is now "${readableStatus}".`;

  for (
    const recipientId of
    recipients
  ) {
    const {
      error:
        notificationError,
    } = await supabaseAdmin.rpc(
      "create_notification",
      {
        user_id_input:
          recipientId,
        type_input:
          "case_status",
        title_input:
          "Case status updated",
        message_input:
          notificationMessage,
        link_input:
          `/cases/${caseId}`,
      },
    );

    if (
      notificationError
    ) {
      console.error(
        "Unable to create case status notification:",
        notificationError.message,
      );
    }
  }

  revalidatePath(
    `/cases/${caseId}`,
  );

  revalidatePath(
    "/cases",
  );

  revalidatePath(
    "/dashboard",
  );

  revalidatePath(
    "/attorney/dashboard",
  );

  revalidatePath(
    "/attorney/cases",
  );

  revalidatePath(
    "/notifications",
  );
}

async function advanceFiledCase(
  caseId: string,
  nextStatus:
    | "negotiation"
    | "hearing",
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
    error: caseError,
  } = await supabaseAdmin
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
    caseError ||
    !caseData
  ) {
    throw new Error(
      "Case not found.",
    );
  }

  /*
   * Only the attorney actually assigned
   * to this case can choose what happens
   * after filing.
   */
  if (
    caseData.assigned_attorney_id !==
    user.id
  ) {
    throw new Error(
      "Only the assigned attorney can advance the filed case.",
    );
  }

  /*
   * This action is specifically for the
   * post-filing decision.
   */
  if (
    caseData.case_status !==
    "filed"
  ) {
    throw new Error(
      "The case must be filed before choosing the next legal stage.",
    );
  }

  /*
   * Optimistic concurrency protection.
   */
  const {
    data: updatedCase,
    error: updateError,
  } = await supabaseAdmin
    .from("cases")
    .update({
      case_status:
        nextStatus,
    })
    .eq("id", caseId)
    .eq(
      "case_status",
      "filed",
    )
    .eq(
      "assigned_attorney_id",
      user.id,
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
      "The case status changed before this action completed. Refresh and try again.",
    );
  }

  const historyNote =
    nextStatus ===
    "negotiation"
      ? "The assigned attorney moved the case into negotiation."
      : "The assigned attorney moved the case toward a hearing.";

  /*
   * Add the change to the permanent
   * case timeline.
   */
  const {
    error: historyError,
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
        nextStatus,
      note:
        historyNote,
    });

  if (historyError) {
    /*
     * Restore Filed if timeline creation
     * fails.
     */
    await supabaseAdmin
      .from("cases")
      .update({
        case_status:
          "filed",
      })
      .eq(
        "id",
        caseId,
      )
      .eq(
        "case_status",
        nextStatus,
      );

    throw new Error(
      historyError.message,
    );
  }

  const title =
    nextStatus ===
    "negotiation"
      ? "Negotiation started"
      : "Case moving to hearing";

  const message =
    nextStatus ===
    "negotiation"
      ? `Your attorney moved "${caseData.title}" into the negotiation stage.`
      : `Your attorney moved "${caseData.title}" into the hearing stage.`;

  /*
   * Notify the claimant.
   */
  const {
    error: notificationError,
  } = await supabaseAdmin.rpc(
    "create_notification",
    {
      user_id_input:
        caseData.user_id,
      type_input:
        nextStatus ===
        "negotiation"
          ? "case_negotiation"
          : "case_hearing",
      title_input:
        title,
      message_input:
        message,
      link_input:
        `/cases/${caseId}`,
    },
  );

  if (notificationError) {
    console.error(
      "Unable to create post-filing notification:",
      notificationError.message,
    );
  }

  revalidatePath(
    `/cases/${caseId}`,
  );

  revalidatePath(
    "/cases",
  );

  revalidatePath(
    "/dashboard",
  );

  revalidatePath(
    "/attorney/dashboard",
  );

  revalidatePath(
    "/attorney/cases",
  );

  revalidatePath(
    "/notifications",
  );
}

export async function startNegotiation(
  caseId: string,
) {
  await advanceFiledCase(
    caseId,
    "negotiation",
  );
}

export async function moveToHearing(
  caseId: string,
) {
  await advanceFiledCase(
    caseId,
    "hearing",
  );
}
const allowedResolutionOutcomes =
  new Set([
    "settled",
    "won",
    "dismissed",
    "withdrawn",
    "other",
  ]);

function formatResolutionOutcome(
  outcome: string,
) {
  return outcome
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase(),
    );
}

export async function resolveCase(
  caseId: string,
  formData: FormData,
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

  const outcome = String(
    formData.get("outcome") ?? "",
  )
    .trim()
    .toLowerCase();

  const note = String(
    formData.get("note") ?? "",
  ).trim();

  if (
    !allowedResolutionOutcomes.has(
      outcome,
    )
  ) {
    throw new Error(
      "Select a valid resolution outcome.",
    );
  }

  if (!note) {
    throw new Error(
      "Please provide resolution details.",
    );
  }

  if (note.length > 3000) {
    throw new Error(
      "Resolution details must be 3,000 characters or fewer.",
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
        assigned_attorney_id,
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

  if (
    caseData.assigned_attorney_id !==
    user.id
  ) {
    throw new Error(
      "Only the assigned attorney can resolve this case.",
    );
  }

  if (
    caseData.case_status !==
      "negotiation" &&
    caseData.case_status !==
      "hearing"
  ) {
    throw new Error(
      "The case must be in Negotiation or Hearing before it can be resolved.",
    );
  }

  const previousStatus =
    caseData.case_status;

  const {
    data: updatedCase,
    error: updateError,
  } = await supabaseAdmin
    .from("cases")
    .update({
      case_status:
        "resolved",
    })
    .eq("id", caseId)
    .eq(
      "case_status",
      previousStatus,
    )
    .eq(
      "assigned_attorney_id",
      user.id,
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
      "The case status changed before this request completed. Refresh and try again.",
    );
  }

  const readableOutcome =
    formatResolutionOutcome(
      outcome,
    );

  const {
    error: historyError,
  } = await supabaseAdmin
    .from(
      "case_status_updates",
    )
    .insert({
      case_id: caseId,
      changed_by:
        user.id,
      status:
        "resolved",
      note:
        `${readableOutcome}: ${note}`,
    });

  if (historyError) {
    await supabaseAdmin
      .from("cases")
      .update({
        case_status:
          previousStatus,
      })
      .eq("id", caseId)
      .eq(
        "case_status",
        "resolved",
      );

    throw new Error(
      historyError.message,
    );
  }

  const {
    error: notificationError,
  } = await supabaseAdmin.rpc(
    "create_notification",
    {
      user_id_input:
        caseData.user_id,
      type_input:
        "case_resolved",
      title_input:
        "Case resolved",
      message_input:
        `"${caseData.title}" has been resolved. Outcome: ${readableOutcome}.`,
      link_input:
        `/cases/${caseId}`,
    },
  );

  if (notificationError) {
    console.error(
      "Unable to create resolution notification:",
      notificationError.message,
    );
  }

  revalidatePath(
    `/cases/${caseId}`,
  );

  revalidatePath(
    "/cases",
  );

  revalidatePath(
    "/dashboard",
  );

  revalidatePath(
    "/attorney/dashboard",
  );

  revalidatePath(
    "/attorney/cases",
  );

  revalidatePath(
    "/notifications",
  );
}

export async function closeCase(
  caseId: string,
  formData: FormData,
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

  const note = String(
    formData.get("note") ?? "",
  ).trim();

  if (note.length > 2000) {
    throw new Error(
      "Final note must be 2,000 characters or fewer.",
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
        assigned_attorney_id,
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

  const isCaseOwner =
    caseData.user_id ===
    user.id;

  const isAssignedAttorney =
    caseData.assigned_attorney_id ===
    user.id;

  if (
    !isCaseOwner &&
    !isAssignedAttorney
  ) {
    throw new Error(
      "Only the claimant or assigned attorney can close this case.",
    );
  }

  if (
    caseData.case_status !==
    "resolved"
  ) {
    throw new Error(
      "Only a resolved case can be closed.",
    );
  }

  const {
    data: updatedCase,
    error: updateError,
  } = await supabaseAdmin
    .from("cases")
    .update({
      case_status:
        "closed",
    })
    .eq("id", caseId)
    .eq(
      "case_status",
      "resolved",
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
      "The case status changed before this request completed. Refresh and try again.",
    );
  }

  const closureNote =
    note ||
    (isCaseOwner
      ? "The claimant confirmed that the resolved case is complete."
      : "The assigned attorney closed the resolved case.");

  const {
    error: historyError,
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
        "closed",
      note:
        closureNote,
    });

  if (historyError) {
    /*
     * Restore the previous state if
     * timeline recording fails.
     */
    await supabaseAdmin
      .from("cases")
      .update({
        case_status:
          "resolved",
      })
      .eq("id", caseId)
      .eq(
        "case_status",
        "closed",
      );

    throw new Error(
      historyError.message,
    );
  }

  /*
   * Notify the other participant.
   */
  const recipientId =
    isCaseOwner
      ? caseData.assigned_attorney_id
      : caseData.user_id;

  if (recipientId) {
    const {
      error:
        notificationError,
    } = await supabaseAdmin.rpc(
      "create_notification",
      {
        user_id_input:
          recipientId,
        type_input:
          "case_closed",
        title_input:
          "Case closed",
        message_input:
          `"${caseData.title}" has been closed. The case workflow is now complete.`,
        link_input:
          `/cases/${caseId}`,
      },
    );

    if (notificationError) {
      console.error(
        "Unable to create case closure notification:",
        notificationError.message,
      );
    }
  }

  revalidatePath(
    `/cases/${caseId}`,
  );

  revalidatePath(
    "/cases",
  );

  revalidatePath(
    "/dashboard",
  );

  revalidatePath(
    "/attorney/dashboard",
  );

  revalidatePath(
    "/attorney/cases",
  );

  revalidatePath(
    "/notifications",
  );
}