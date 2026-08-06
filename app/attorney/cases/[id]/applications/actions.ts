"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { supabaseAdmin } from "@/lib/supabase-admin";
import { createClient } from "@/lib/supabase-server";

async function requireCaseOwner(caseId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: caseData, error } = await supabase
    .from("cases")
    .select("id, title, user_id, assigned_attorney_id")
    .eq("id", caseId)
    .single();

  if (error || !caseData) {
    throw new Error(error?.message ?? "Case not found.");
  }

  if (caseData.user_id !== user.id) {
    redirect("/dashboard");
  }

  return caseData;
}

function refreshApplicationPages(caseId: string) {
  revalidatePath(`/cases/${caseId}`);
  revalidatePath(`/cases/${caseId}/applications`);
  revalidatePath("/dashboard");
  revalidatePath("/attorney/dashboard");
  revalidatePath("/notifications");
}

export async function acceptAttorneyApplication(
  caseId: string,
  applicationId: number,
) {
  const caseData = await requireCaseOwner(caseId);

  if (caseData.assigned_attorney_id) {
    throw new Error("This case already has an assigned attorney.");
  }

  const { data: application, error: applicationError } =
    await supabaseAdmin
      .from("attorney_applications")
      .select("id, attorney_id, case_id, status")
      .eq("id", applicationId)
      .eq("case_id", caseId)
      .single();

  if (applicationError || !application) {
    throw new Error(
      applicationError?.message ?? "Application not found.",
    );
  }

  if (application.status !== "pending") {
    throw new Error("This application has already been reviewed.");
  }

  const { data: attorney, error: attorneyError } =
    await supabaseAdmin
      .from("attorneys")
      .select(
        "id, full_name, years_experience, verified",
      )
      .eq("id", application.attorney_id)
      .single();

  if (attorneyError || !attorney) {
    throw new Error(
      attorneyError?.message ?? "Attorney not found.",
    );
  }

  if (!attorney.verified) {
    throw new Error("This attorney is not verified.");
  }

  const { error: caseUpdateError } = await supabaseAdmin
    .from("cases")
    .update({
      assigned_attorney_id: attorney.id,
      attorney_name: attorney.full_name,
      attorney_role: "Assigned attorney",
      attorney_experience: `${attorney.years_experience ?? 0} years`,
    })
    .eq("id", caseId)
    .is("assigned_attorney_id", null);

  if (caseUpdateError) {
    throw new Error(caseUpdateError.message);
  }

  const { error: acceptedError } = await supabaseAdmin
    .from("attorney_applications")
    .update({
      status: "accepted",
    })
    .eq("id", applicationId)
    .eq("case_id", caseId);

  if (acceptedError) {
    throw new Error(acceptedError.message);
  }

  const { error: rejectedError } = await supabaseAdmin
    .from("attorney_applications")
    .update({
      status: "rejected",
    })
    .eq("case_id", caseId)
    .neq("id", applicationId)
    .eq("status", "pending");

  if (rejectedError) {
    throw new Error(rejectedError.message);
  }

  const { error: notificationError } =
    await supabaseAdmin.rpc("create_notification", {
      user_id_input: application.attorney_id,
      type_input: "attorney_application_accepted",
      title_input: "Your application was accepted",
      message_input: `You were selected to represent "${caseData.title}".`,
      link_input: `/cases/${caseId}`,
    });

  if (notificationError) {
    throw new Error(notificationError.message);
  }

  refreshApplicationPages(caseId);
}

export async function rejectAttorneyApplication(
  caseId: string,
  applicationId: number,
) {
  const caseData = await requireCaseOwner(caseId);

  const { data: application, error: applicationError } =
    await supabaseAdmin
      .from("attorney_applications")
      .select("id, attorney_id, status")
      .eq("id", applicationId)
      .eq("case_id", caseId)
      .single();

  if (applicationError || !application) {
    throw new Error(
      applicationError?.message ?? "Application not found.",
    );
  }

  if (application.status !== "pending") {
    throw new Error("This application has already been reviewed.");
  }

  const { error: updateError } = await supabaseAdmin
    .from("attorney_applications")
    .update({
      status: "rejected",
    })
    .eq("id", applicationId)
    .eq("case_id", caseId);

  if (updateError) {
    throw new Error(updateError.message);
  }

  const { error: notificationError } =
    await supabaseAdmin.rpc("create_notification", {
      user_id_input: application.attorney_id,
      type_input: "attorney_application_rejected",
      title_input: "Application update",
      message_input: `You were not selected to represent "${caseData.title}".`,
      link_input: "/attorney/dashboard",
    });

  if (notificationError) {
    throw new Error(notificationError.message);
  }

  refreshApplicationPages(caseId);
}