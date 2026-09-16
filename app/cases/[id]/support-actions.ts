"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

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

function refreshSupportPages(
  caseId: string,
) {
  revalidatePath(`/cases/${caseId}`);
  revalidatePath("/cases");
  revalidatePath("/dashboard");
}

export async function toggleCaseSupport(
  caseId: string,
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
  } = await supabase
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
      "Case not found.",
    );
  }

  assertCaseIsOpen(
    caseData.case_status,
  );

  const {
    data: existingSupport,
    error: supportLookupError,
  } = await supabase
    .from("case_supporters")
    .select("id")
    .eq("case_id", caseId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (supportLookupError) {
    throw new Error(
      supportLookupError.message,
    );
  }

  if (existingSupport) {
    const {
      data: deletedSupport,
      error: deleteError,
    } = await supabase
      .from("case_supporters")
      .delete()
      .eq("id", existingSupport.id)
      .eq("user_id", user.id)
      .select("id")
      .maybeSingle();

    if (deleteError) {
      throw new Error(
        deleteError.message,
      );
    }

    if (!deletedSupport) {
      throw new Error(
        "Support status changed before this request completed. Refresh and try again.",
      );
    }

    refreshSupportPages(caseId);

    return {
      supported: false,
    };
  }

  const {
    data: createdSupport,
    error: insertError,
  } = await supabase
    .from("case_supporters")
    .insert({
      case_id: caseId,
      user_id: user.id,
    })
    .select("id")
    .single();

  if (insertError || !createdSupport) {
    throw new Error(
      insertError?.message ??
        "Unable to follow this case.",
    );
  }

  refreshSupportPages(caseId);

  return {
    supported: true,
  };
}