"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";

function assertCaseIsOpen(
  caseStatus: string,
) {
  if (caseStatus === "closed") {
    throw new Error(
      "This case is closed and can no longer be modified.",
    );
  }
}

function refreshApplicationPages(
  caseId: string,
) {
  revalidatePath(`/cases/${caseId}`);
  revalidatePath(`/cases/${caseId}/applications`);
  revalidatePath("/cases");
  revalidatePath("/attorney/dashboard");
  revalidatePath("/attorney/cases");
  revalidatePath("/dashboard");
}

export async function applyToCase(
  caseId: string,
) {
  /*
   * Normal client is only used to establish
   * the identity of the requester.
   */
  const supabase =
    await createClient();

  const {
    data: { user },
  } =
    await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  /*
   * Use the trusted server client for the
   * authoritative case check.
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
        assigned_attorney_id,
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

  assertCaseIsOpen(
    caseData.case_status,
  );

  /*
   * Applications are only allowed for
   * approved, active cases that still
   * need an attorney.
   */
  if (
    caseData.case_status !==
    "approved"
  ) {
    throw new Error(
      "This case is not currently accepting attorney applications.",
    );
  }

  if (
    caseData.status !==
    "active"
  ) {
    throw new Error(
      "This case is not currently active.",
    );
  }

  if (
    caseData.assigned_attorney_id
  ) {
    throw new Error(
      "An attorney has already been assigned to this case.",
    );
  }

  if (
    caseData.user_id ===
    user.id
  ) {
    throw new Error(
      "You cannot apply to represent your own case.",
    );
  }

  /*
   * Verify the attorney using authoritative
   * server-side data.
   */
  const {
    data: attorney,
    error: attorneyError,
  } = await supabaseAdmin
    .from("attorneys")
    .select(
      `
        id,
        verified,
        verification_status,
        accepting_cases
      `,
    )
    .eq("id", user.id)
    .maybeSingle();

  if (attorneyError) {
    throw new Error(
      attorneyError.message,
    );
  }

  if (!attorney) {
    throw new Error(
      "You must create an attorney profile before applying to cases.",
    );
  }

  if (
    !attorney.verified ||
    attorney.verification_status !==
      "verified"
  ) {
    throw new Error(
      "Your attorney profile must be verified before you can apply to cases.",
    );
  }

  if (
    !attorney.accepting_cases
  ) {
    throw new Error(
      "Your attorney profile is not currently accepting cases.",
    );
  }

  /*
   * Check for an existing application.
   *
   * We use the trusted client because the
   * browser no longer controls application
   * creation.
   */
  const {
    data: existingApplication,
    error:
      existingApplicationError,
  } = await supabaseAdmin
    .from(
      "attorney_applications",
    )
    .select(
      `
        id,
        status
      `,
    )
    .eq(
      "case_id",
      caseId,
    )
    .eq(
      "attorney_id",
      user.id,
    )
    .maybeSingle();

  if (
    existingApplicationError
  ) {
    throw new Error(
      existingApplicationError.message,
    );
  }

  if (
    existingApplication
  ) {
    if (
      existingApplication.status ===
      "pending"
    ) {
      throw new Error(
        "You have already applied to this case.",
      );
    }

    if (
      existingApplication.status ===
      "accepted"
    ) {
      throw new Error(
        "You have already been selected for this case.",
      );
    }

    throw new Error(
      "You have already submitted an application for this case.",
    );
  }

  /*
   * Trusted application creation.
   *
   * The browser cannot choose attorney_id
   * or application status.
   */
  const {
    data: application,
    error: applicationError,
  } = await supabaseAdmin
    .from(
      "attorney_applications",
    )
    .insert({
      case_id:
        caseId,

      attorney_id:
        user.id,

      status:
        "pending",
    })
    .select("id")
    .single();

  if (
    applicationError ||
    !application
  ) {
    throw new Error(
      applicationError?.message ??
        "Unable to submit attorney application.",
    );
  }

  refreshApplicationPages(
    caseId,
  );

  return {
    success: true,
  };
}