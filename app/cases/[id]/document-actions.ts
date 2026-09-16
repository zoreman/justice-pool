"use server";

import { revalidatePath } from "next/cache";

import { supabaseAdmin } from "@/lib/supabase-admin";
import { createClient } from "@/lib/supabase-server";

function assertCaseIsOpen(caseStatus: string) {
  if (caseStatus === "closed") {
    throw new Error(
      "This case is closed and can no longer be modified.",
    );
  }
}

function refreshDocumentPages(caseId: string) {
  revalidatePath(`/cases/${caseId}`);
  revalidatePath("/cases");
  revalidatePath("/notifications");
  revalidatePath("/dashboard");
  revalidatePath("/attorney/dashboard");
  revalidatePath("/attorney/cases");
}

export async function assertCanUploadCaseDocument(
  caseId: string,
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You must be signed in.");
  }

  const { data: caseData, error: caseError } =
    await supabase
      .from("cases")
      .select(
        `
          id,
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

  const isCaseOwner =
    caseData.user_id === user.id;

  const isAssignedAttorney =
    caseData.assigned_attorney_id === user.id;

  if (!isCaseOwner && !isAssignedAttorney) {
    throw new Error(
      "You do not have permission to upload documents to this case.",
    );
  }

  return true;
}

export async function fulfillMatchingDocumentRequest(
  caseId: string,
  category: string,
  fileName: string,
): Promise<boolean> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You must be signed in.");
  }

  const { data: caseData, error: caseError } =
    await supabase
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

  const isCaseOwner =
    caseData.user_id === user.id;

  const isAssignedAttorney =
    caseData.assigned_attorney_id === user.id;

  if (!isCaseOwner && !isAssignedAttorney) {
    throw new Error(
      "You do not have access to this case.",
    );
  }

  if (caseData.case_status !== "documents_requested") {
    return false;
  }

  const { data: request, error: requestError } =
    await supabase
      .from("case_document_requests")
      .select(
        `
          id,
          requested_by,
          requested_from,
          category,
          status
        `,
      )
      .eq("case_id", caseId)
      .eq("requested_from", user.id)
      .eq("category", category)
      .eq("status", "pending")
      .order("created_at", {
        ascending: true,
      })
      .limit(1)
      .maybeSingle();

  if (requestError) {
    throw new Error(requestError.message);
  }

  if (!request) {
    refreshDocumentPages(caseId);
    return false;
  }

  /*
   * RLS UPDATE access for document requests
   * is intentionally restricted.
   *
   * We authenticated the user above and
   * verified that this request belongs to
   * the authenticated requested_from user.
   */
  const {
    data: fulfilledRequest,
    error: updateError,
  } = await supabaseAdmin
    .from("case_document_requests")
    .update({
      status: "fulfilled",
      fulfilled_at: new Date().toISOString(),
    })
    .eq("id", request.id)
    .eq("case_id", caseId)
    .eq("requested_from", user.id)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();

  if (updateError) {
    throw new Error(updateError.message);
  }

  if (!fulfilledRequest) {
    refreshDocumentPages(caseId);
    return false;
  }

  const { error: notificationError } =
    await supabaseAdmin.rpc("create_notification", {
      user_id_input: request.requested_by,
      type_input: "case_document_fulfilled",
      title_input: "Document request fulfilled",
      message_input: `${fileName} was uploaded for "${caseData.title}" and fulfilled your document request.`,
      link_input: `/cases/${caseId}`,
    });

  if (notificationError) {
    console.error(
      "Unable to create document fulfillment notification:",
      notificationError.message,
    );
  }

  refreshDocumentPages(caseId);

  return true;
}

export async function markDocumentsComplete(
  caseId: string,
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You must be signed in.");
  }

  const { data: caseData, error: caseError } =
    await supabase
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

  if (caseData.assigned_attorney_id !== user.id) {
    throw new Error(
      "Only the assigned attorney can complete document review.",
    );
  }

  if (caseData.case_status !== "documents_requested") {
    throw new Error(
      "The case must be in Documents Requested before filing can be prepared.",
    );
  }

  const {
    count: pendingRequestCount,
    error: pendingRequestError,
  } = await supabase
    .from("case_document_requests")
    .select("id", {
      count: "exact",
      head: true,
    })
    .eq("case_id", caseId)
    .eq("status", "pending");

  if (pendingRequestError) {
    throw new Error(pendingRequestError.message);
  }

  if ((pendingRequestCount ?? 0) > 0) {
    throw new Error(
      "All pending document requests must be fulfilled or cancelled first.",
    );
  }

  /*
   * Sensitive workflow transition.
   * Authorization was explicitly verified
   * above before using the admin client.
   */
  const {
    data: updatedCase,
    error: updateError,
  } = await supabaseAdmin
    .from("cases")
    .update({
      case_status: "filing_prepared",
    })
    .eq("id", caseId)
    .eq("case_status", "documents_requested")
    .eq("assigned_attorney_id", user.id)
    .select("id")
    .maybeSingle();

  if (updateError) {
    throw new Error(updateError.message);
  }

  if (!updatedCase) {
    throw new Error(
      "The case status changed before this action completed. Refresh and try again.",
    );
  }

  const { error: historyError } =
    await supabaseAdmin
      .from("case_status_updates")
      .insert({
        case_id: caseId,
        changed_by: user.id,
        status: "filing_prepared",
        note:
          "Document review is complete and the case filing is being prepared.",
      });

  if (historyError) {
    /*
     * Roll the workflow transition back if
     * its history entry could not be saved.
     */
    await supabaseAdmin
      .from("cases")
      .update({
        case_status: "documents_requested",
      })
      .eq("id", caseId)
      .eq("case_status", "filing_prepared")
      .eq("assigned_attorney_id", user.id);

    throw new Error(historyError.message);
  }

  const { error: notificationError } =
    await supabaseAdmin.rpc("create_notification", {
      user_id_input: caseData.user_id,
      type_input: "filing_prepared",
      title_input: "Documents complete",
      message_input: `Document review for "${caseData.title}" is complete and the filing is being prepared.`,
      link_input: `/cases/${caseId}`,
    });

  if (notificationError) {
    console.error(
      "Unable to create filing prepared notification:",
      notificationError.message,
    );
  }

  refreshDocumentPages(caseId);
}

export async function markCaseFiled(
  caseId: string,
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You must be signed in.");
  }

  const { data: caseData, error: caseError } =
    await supabase
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

  if (caseData.assigned_attorney_id !== user.id) {
    throw new Error(
      "Only the assigned attorney can mark this case as filed.",
    );
  }

  if (caseData.case_status !== "filing_prepared") {
    throw new Error(
      "The filing must be prepared before the case can be marked as filed.",
    );
  }

  /*
   * Sensitive workflow transition.
   * Only the authenticated assigned attorney
   * reaches this mutation.
   */
  const {
    data: updatedCase,
    error: updateError,
  } = await supabaseAdmin
    .from("cases")
    .update({
      case_status: "filed",
    })
    .eq("id", caseId)
    .eq("case_status", "filing_prepared")
    .eq("assigned_attorney_id", user.id)
    .select("id")
    .maybeSingle();

  if (updateError) {
    throw new Error(updateError.message);
  }

  if (!updatedCase) {
    throw new Error(
      "The case status changed before this action completed. Refresh and try again.",
    );
  }

  const { error: historyError } =
    await supabaseAdmin
      .from("case_status_updates")
      .insert({
        case_id: caseId,
        changed_by: user.id,
        status: "filed",
        note:
          "The assigned attorney confirmed that the legal filing was submitted.",
      });

  if (historyError) {
    await supabaseAdmin
      .from("cases")
      .update({
        case_status: "filing_prepared",
      })
      .eq("id", caseId)
      .eq("case_status", "filed")
      .eq("assigned_attorney_id", user.id);

    throw new Error(historyError.message);
  }

  const { error: notificationError } =
    await supabaseAdmin.rpc("create_notification", {
      user_id_input: caseData.user_id,
      type_input: "case_filed",
      title_input: "Case filed",
      message_input: `Your attorney confirmed that the filing for "${caseData.title}" has been submitted.`,
      link_input: `/cases/${caseId}`,
    });

  if (notificationError) {
    console.error(
      "Unable to create case filed notification:",
      notificationError.message,
    );
  }

  refreshDocumentPages(caseId);
}

export async function notifyCaseDocumentUploaded(
  caseId: string,
  fileName: string,
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You must be signed in.");
  }

  const { data: caseData, error: caseError } =
    await supabase
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

  const isCaseOwner =
    caseData.user_id === user.id;

  const isAssignedAttorney =
    caseData.assigned_attorney_id === user.id;

  if (!isCaseOwner && !isAssignedAttorney) {
    throw new Error(
      "You do not have access to this case.",
    );
  }

  const recipientId = isCaseOwner
    ? caseData.assigned_attorney_id
    : caseData.user_id;

  if (!recipientId) {
    refreshDocumentPages(caseId);
    return;
  }

  const { error: notificationError } =
    await supabaseAdmin.rpc("create_notification", {
      user_id_input: recipientId,
      type_input: "case_document",
      title_input: "New case document",
      message_input: `${fileName} was uploaded to "${caseData.title}".`,
      link_input: `/cases/${caseId}`,
    });

  if (notificationError) {
    console.error(
      "Unable to create document upload notification:",
      notificationError.message,
    );
  }

  refreshDocumentPages(caseId);
}

export async function deleteCaseDocument(
  caseId: string,
  documentId: number,
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You must be signed in.");
  }

  /*
   * Verify access before deleting either
   * the Storage object or database row.
   */
  const { data: caseData, error: caseError } =
    await supabase
      .from("cases")
      .select(
        `
          id,
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

  const isCaseOwner =
    caseData.user_id === user.id;

  const isAssignedAttorney =
    caseData.assigned_attorney_id === user.id;

  if (!isCaseOwner && !isAssignedAttorney) {
    throw new Error(
      "You do not have access to this case.",
    );
  }

  const {
    data: document,
    error: documentError,
  } = await supabase
    .from("case_documents")
    .select(
      `
        id,
        case_id,
        uploader_id,
        storage_path
      `,
    )
    .eq("id", documentId)
    .eq("case_id", caseId)
    .single();

  if (documentError || !document) {
    throw new Error("Document not found.");
  }

  if (document.uploader_id !== user.id) {
    throw new Error(
      "You can only delete documents you uploaded.",
    );
  }

  const { error: storageError } =
    await supabase.storage
      .from("case-documents")
      .remove([document.storage_path]);

  if (storageError) {
    throw new Error(storageError.message);
  }

  const {
    data: deletedDocument,
    error: databaseError,
  } = await supabase
    .from("case_documents")
    .delete()
    .eq("id", documentId)
    .eq("case_id", caseId)
    .eq("uploader_id", user.id)
    .select("id")
    .maybeSingle();

  if (databaseError) {
    throw new Error(databaseError.message);
  }

  if (!deletedDocument) {
    throw new Error(
      "The document changed before it could be deleted. Refresh and try again.",
    );
  }

  refreshDocumentPages(caseId);
}