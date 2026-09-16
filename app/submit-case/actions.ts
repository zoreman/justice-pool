"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export type SubmitCaseState = {
  error: string | null;
};

const allowedCategories = new Set([
  "Employment",
  "Housing",
  "Civil Rights",
  "Disability Discrimination",
  "Consumer Protection",
  "Education",
  "Immigration",
  "Other",
]);

function getString(
  formData: FormData,
  name: string,
) {
  return String(
    formData.get(name) ?? "",
  ).trim();
}

function createSlug(
  title: string,
) {
  const cleanedTitle = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  const suffix =
    crypto.randomUUID().slice(0, 8);

  return `${cleanedTitle || "case"}-${suffix}`;
}

export async function submitCase(
  
    _previousState: SubmitCaseState,
  formData: FormData,
): Promise<SubmitCaseState> {
      const supabase =
    await createClient();

  const {
    data: { user },
  } =
    await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const title =
    getString(
      formData,
      "title",
    );

  const category =
    getString(
      formData,
      "category",
    );

  const summary =
    getString(
      formData,
      "summary",
    );

  const story =
    getString(
      formData,
      "story",
    );

  const fundingGoal =
    Number(
      formData.get("goal"),
    );

  const deadlineDays =
    Number(
      formData.get("days_left"),
    );

  /*
   * Validate everything again on the server.
   * Browser validation is only for convenience.
   */
  if (!title) {
    return {
      error:
        "Enter a case title.",
    };
  }

  if (title.length > 120) {
    return {
      error:
        "Case title cannot exceed 120 characters.",
    };
  }

  if (
    !allowedCategories.has(
      category,
    )
  ) {
    return {
      error:
        "Choose a valid category.",
    };
  }

  if (!summary) {
    return {
      error:
        "Enter a short summary.",
    };
  }

  if (
    summary.length > 350
  ) {
    return {
      error:
        "Summary cannot exceed 350 characters.",
    };
  }

  if (!story) {
    return {
      error:
        "Enter the full story.",
    };
  }

  if (
    !Number.isFinite(
      fundingGoal,
    ) ||
    fundingGoal <= 0
  ) {
    return {
      error:
        "Enter a valid funding goal.",
    };
  }

  if (
    !Number.isInteger(
      fundingGoal,
    )
  ) {
    return {
      error:
        "Funding goal must be a whole dollar amount.",
    };
  }

  if (
    !Number.isInteger(
      deadlineDays,
    ) ||
    deadlineDays < 1 ||
    deadlineDays > 365
  ) {
    return {
      error:
        "Campaign length must be between 1 and 365 days.",
    };
  }

  const caseId =
    createSlug(title);

  /*
   * Trusted server controls every protected
   * initial value.
   */
  const { data: roleTest, error: roleTestError } =
  await supabaseAdmin.rpc("debug_current_role");
  
  
  const {
    error: caseError,
  } = await supabaseAdmin
    .from("cases")
    .insert({
      id: caseId,

      user_id:
        user.id,

      title,

      description:
        summary,

      category,

      goal:
        fundingGoal,

      summary,

      story,

      days_left:
        deadlineDays,

      /*
       * Protected values:
       * the user cannot choose these.
       */
      raised: 0,
      supporters: 0,
      views: 0,

      verified: false,

      status:
        "pending",

      case_status:
        "submitted",

      review_notes:
        null,

      assigned_attorney_id:
        null,

      attorney_name:
        null,

      attorney_role:
        null,

      attorney_experience:
        null,
    });

  if (caseError) {

  return {
    error:
      `CASE INSERT FAILED: ${caseError.message}`,
  };
}

  /*
   * Record the initial workflow event.
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
        "submitted",

      note:
        "The claimant submitted the case for review.",
    });

if (historyError) {
    /*
     * If history creation fails, remove the
     * case so we don't leave an incomplete
     * workflow record behind.
     */
    const {
      error: rollbackError,
    } = await supabaseAdmin
      .from("cases")
      .delete()
      .eq(
        "id",
        caseId,
      )
      .eq(
        "user_id",
        user.id,
      );

    if (
      rollbackError
    ) {
      console.error(
        "Unable to rollback failed case submission:",
        rollbackError.message,
      );
    }

    return {
      error:
        historyError.message,
    };
  }

  revalidatePath(
    "/cases",
  );

  revalidatePath(
    "/dashboard",
  );

  revalidatePath(
    "/admin",
  );

  redirect(
    `/cases/${caseId}`,
  );
}