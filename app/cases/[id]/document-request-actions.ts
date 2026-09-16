"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { supabaseAdmin } from "@/lib/supabase-admin";
import { createClient } from "@/lib/supabase-server";

function assertCaseIsOpen(caseStatus: string) {
  if (caseStatus === "closed") {
    throw new Error(
      "This case is closed and can no longer be modified.",
    );
  }
}

const allowedCategories = new Set([
  "evidence",
  "lease_contract",
  "court_filing",
  "correspondence",
  "identification",
  "other",
]);

function formatCategory(category: string) {
  return category
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase(),
    );
}

function refreshDocumentRequestPages(
  caseId: string,
) {
  revalidatePath(`/cases/${caseId}`);
  revalidatePath("/cases");
  revalidatePath("/notifications");
  revalidatePath("/dashboard");
  revalidatePath("/attorney/dashboard");
  revalidatePath("/attorney/cases");
}

export async function cancelDocumentRequest(
  caseId: string,
  requestId: number,
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  /*
   * Use the authenticated client to load
   * the request. RLS ensures the user is
   * actually a participant.
   */
  const {
    data: request,
    error: requestError,
  } = await supabase
    .from("case_document_requests")
    .select(
      `
        id,
        case_id,
        requested_by,
        status
      `,
    )
    .eq("id", requestId)
    .eq("case_id", caseId)
    .single();

  if (requestError || !request) {
    throw new Error(
      "Document request not found.",
    );
  }

  if (request.requested_by !== user.id) {
    throw new Error(
      "Only the attorney who created this request can cancel it.",
    );
  }

  if (request.status !== "pending") {
    throw new Error(
      "Only pending requests can be cancelled.",
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
        assigned_attorney_id,
        case_status
      `,
    )
    .eq("id", caseId)
    .single();

  if (caseError || !caseData) {
    throw new Error("Case not found.");
  }

  assertCaseIsOpen(caseData.case_status);

  if (
    caseData.assigned_attorney_id !== user.id
  ) {
    throw new Error(
      "You are no longer the assigned attorney for this case.",
    );
  }

  /*
   * No browser UPDATE policy exists for
   * document requests. This controlled
   * server action performs the mutation.
   */
  const {
    data: cancelledRequest,
    error: updateError,
  } = await supabaseAdmin
    .from("case_document_requests")
    .update({
      status: "cancelled",
    })
    .eq("id", requestId)
    .eq("case_id", caseId)
    .eq("requested_by", user.id)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();

  if (updateError) {
    throw new Error(updateError.message);
  }

  if (!cancelledRequest) {
    throw new Error(
      "This document request changed before it could be cancelled. Refresh and try again.",
    );
  }

  refreshDocumentRequestPages(caseId);
}

export async function createDocumentRequest(
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

  const category = String(
    formData.get("category") ?? "",
  ).trim();

  const note = String(
    formData.get("note") ?? "",
  ).trim();

  if (!allowedCategories.has(category)) {
    throw new Error(
      "Invalid document category.",
    );
  }

  if (!note) {
    throw new Error(
      "Please explain which document you need.",
    );
  }

  if (note.length > 2000) {
    throw new Error(
      "Document request note is too long.",
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

  if (caseError || !caseData) {
    throw new Error("Case not found.");
  }

  assertCaseIsOpen(caseData.case_status);

  if (
    caseData.assigned_attorney_id !== user.id
  ) {
    throw new Error(
      "Only the assigned attorney can request case documents.",
    );
  }

  if (
    caseData.case_status !==
      "consultation_scheduled" &&
    caseData.case_status !==
      "documents_requested"
  ) {
    throw new Error(
      "Documents cannot be requested at the current case stage.",
    );
  }

  /*
   * Keep creation under RLS.
   *
   * Your INSERT policy independently
   * verifies that the authenticated user
   * is the assigned attorney.
   */
  const {
    data: createdRequest,
    error: requestError,
  } = await supabase
    .from("case_document_requests")
    .insert({
      case_id: caseId,
      requested_by: user.id,
      requested_from: caseData.user_id,
      category,
      note,
      status: "pending",
    })
    .select("id")
    .single();

  if (requestError || !createdRequest) {
    throw new Error(
      requestError?.message ??
        "Unable to create document request.",
    );
  }

  /*
   * First request advances:
   *
   * consultation_scheduled
   *          ↓
   * documents_requested
   */
  if (
    caseData.case_status ===
    "consultation_scheduled"
  ) {
    const {
      data: updatedCase,
      error: caseStatusError,
    } = await supabaseAdmin
      .from("cases")
      .update({
        case_status:
          "documents_requested",
      })
      .eq("id", caseId)
      .eq(
        "case_status",
        "consultation_scheduled",
      )
      .eq(
        "assigned_attorney_id",
        user.id,
      )
      .select("id")
      .maybeSingle();

    if (caseStatusError) {
      await supabaseAdmin
        .from("case_document_requests")
        .delete()
        .eq("id", createdRequest.id)
        .eq("case_id", caseId);

      throw new Error(
        caseStatusError.message,
      );
    }

    if (!updatedCase) {
      await supabaseAdmin
        .from("case_document_requests")
        .delete()
        .eq("id", createdRequest.id)
        .eq("case_id", caseId);

      throw new Error(
        "The case status changed before the document request was completed. Refresh and try again.",
      );
    }

    /*
     * Status history is server-controlled.
     * There is intentionally no browser
     * INSERT policy for this table.
     */
    const {
      error: historyError,
    } = await supabaseAdmin
      .from("case_status_updates")
      .insert({
        case_id: caseId,
        changed_by: user.id,
        status:
          "documents_requested",
        note:
          "The assigned attorney requested documents from the claimant.",
      });

    if (historyError) {
      /*
       * Best-effort rollback.
       */
      await supabaseAdmin
        .from("cases")
        .update({
          case_status:
            "consultation_scheduled",
        })
        .eq("id", caseId)
        .eq(
          "case_status",
          "documents_requested",
        )
        .eq(
          "assigned_attorney_id",
          user.id,
        );

      await supabaseAdmin
        .from("case_document_requests")
        .delete()
        .eq("id", createdRequest.id)
        .eq("case_id", caseId);

      throw new Error(
        historyError.message,
      );
    }
  }

  const readableCategory =
    formatCategory(category);

  const {
    error: notificationError,
  } = await supabaseAdmin.rpc(
    "create_notification",
    {
      user_id_input: caseData.user_id,
      type_input:
        "case_document_request",
      title_input:
        "Document requested",
      message_input:
        `Your attorney requested a ${readableCategory} document for "${caseData.title}". ${note}`,
      link_input:
        `/cases/${caseId}`,
    },
  );

  if (notificationError) {
    console.error(
      "Unable to create document request notification:",
      notificationError.message,
    );
  }

  refreshDocumentRequestPages(caseId);
}