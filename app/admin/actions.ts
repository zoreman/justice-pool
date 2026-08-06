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

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profileError) {
    throw new Error(profileError.message);
  }

  if (profile?.role !== "admin") {
    redirect("/dashboard");
  }

  return supabase;
}

async function getCaseNotificationDetails(caseId: string) {
  const { data: caseData, error } = await supabaseAdmin
    .from("cases")
    .select("id, title, user_id")
    .eq("id", caseId)
    .single();

  if (error || !caseData) {
    throw new Error(error?.message ?? "Case not found.");
  }

  if (!caseData.user_id) {
    throw new Error("This case does not have an owner.");
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
  const { error } = await supabaseAdmin.rpc("create_notification", {
    user_id_input: userId,
    type_input: type,
    title_input: title,
    message_input: message,
    link_input: link,
  });

  if (error) {
    throw new Error(error.message);
  }
}

function refreshCasePages(caseId: string) {
  revalidatePath("/admin");
  revalidatePath("/cases");
  revalidatePath(`/cases/${caseId}`);
  revalidatePath("/");
  revalidatePath("/dashboard");
  revalidatePath("/notifications");
}

export async function approveCase(caseId: string) {
  const supabase = await requireAdmin();
  const caseData = await getCaseNotificationDetails(caseId);

  const { error } = await supabase
    .from("cases")
    .update({
      status: "active",
      verified: true,
    })
    .eq("id", caseId);

  if (error) {
    throw new Error(error.message);
  }

  await createCaseNotification({
    userId: caseData.user_id,
    type: "case_approved",
    title: "Your case was approved",
    message: `"${caseData.title}" is now approved and visible to the public.`,
    link: `/cases/${caseId}`,
  });

  refreshCasePages(caseId);
}

export async function requestChanges(
  caseId: string,
  formData: FormData,
) {
  const supabase = await requireAdmin();
  const caseData = await getCaseNotificationDetails(caseId);

  const reviewNotes = String(
    formData.get("reviewNotes") ?? "",
  ).trim();

  if (!reviewNotes) {
    throw new Error("Enter feedback for the applicant.");
  }

  const { error } = await supabase
    .from("cases")
    .update({
      status: "needs_revision",
      verified: false,
      review_notes: reviewNotes,
    })
    .eq("id", caseId);

  if (error) {
    throw new Error(error.message);
  }

  await createCaseNotification({
    userId: caseData.user_id,
    type: "case_revision",
    title: "Changes were requested",
    message: `"${caseData.title}" needs revisions: ${reviewNotes}`,
    link: `/cases/${caseId}/edit`,
  });

  refreshCasePages(caseId);
}

export async function rejectCase(caseId: string) {
  const supabase = await requireAdmin();
  const caseData = await getCaseNotificationDetails(caseId);

  const { error } = await supabase
    .from("cases")
    .update({
      status: "rejected",
      verified: false,
    })
    .eq("id", caseId);

  if (error) {
    throw new Error(error.message);
  }

  await createCaseNotification({
    userId: caseData.user_id,
    type: "case_rejected",
    title: "Your case was not approved",
    message: `"${caseData.title}" was reviewed and was not approved.`,
    link: "/dashboard",
  });

  refreshCasePages(caseId);
}