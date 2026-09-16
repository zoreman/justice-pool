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

const allowedMeetingTypes = new Set([
  "video",
  "phone",
  "in_person",
]);

const allowedDurations = new Set([
  15,
  30,
  45,
  60,
  90,
  120,
]);

function refreshConsultationPages(caseId: string) {
  revalidatePath(`/cases/${caseId}`);
  revalidatePath("/cases");
  revalidatePath("/notifications");
  revalidatePath("/dashboard");
  revalidatePath("/attorney/dashboard");
  revalidatePath("/attorney/cases");
}

function formatConsultationDate(
  date: Date | string,
) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(
    typeof date === "string"
      ? new Date(date)
      : date,
  );
}

export async function proposeConsultation(
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

  const scheduledForInput = String(
    formData.get("scheduled_for") ?? "",
  ).trim();

  const durationMinutes = Number(
    formData.get("duration_minutes"),
  );

  const meetingType = String(
    formData.get("meeting_type") ?? "",
  ).trim();

  const locationOrLink = String(
    formData.get("location_or_link") ?? "",
  ).trim();

  const note = String(
    formData.get("note") ?? "",
  ).trim();

  if (!scheduledForInput) {
    throw new Error(
      "Please choose a consultation date and time.",
    );
  }

  const scheduledFor = new Date(
    scheduledForInput,
  );

  if (
    Number.isNaN(scheduledFor.getTime())
  ) {
    throw new Error(
      "Invalid consultation date.",
    );
  }

  if (
    scheduledFor.getTime() <= Date.now()
  ) {
    throw new Error(
      "Consultation must be scheduled in the future.",
    );
  }

  if (
    !allowedDurations.has(durationMinutes)
  ) {
    throw new Error(
      "Invalid consultation duration.",
    );
  }

  if (
    !allowedMeetingTypes.has(meetingType)
  ) {
    throw new Error(
      "Invalid meeting type.",
    );
  }

  if (note.length > 2000) {
    throw new Error(
      "Consultation note is too long.",
    );
  }

  const {
    data: caseData,
    error: caseError,
  } = await supabase
    .from("cases")
    .select(`
      id,
      title,
      user_id,
      assigned_attorney_id,
      case_status
    `)
    .eq("id", caseId)
    .single();

  if (caseError || !caseData) {
    throw new Error("Case not found.");
  }

  assertCaseIsOpen(
    caseData.case_status,
  );

  if (
    caseData.assigned_attorney_id !==
    user.id
  ) {
    throw new Error(
      "Only the assigned attorney can propose a consultation.",
    );
  }

  if (
    caseData.case_status !==
      "attorney_assigned" &&
    caseData.case_status !==
      "consultation_scheduled"
  ) {
    throw new Error(
      "A consultation cannot be proposed at the current case stage.",
    );
  }

  const {
    data: activeConsultation,
    error: activeConsultationError,
  } = await supabase
    .from("case_consultations")
    .select("id")
    .eq("case_id", caseId)
    .in("status", [
      "proposed",
      "accepted",
    ])
    .maybeSingle();

  if (activeConsultationError) {
    throw new Error(
      activeConsultationError.message,
    );
  }

  if (activeConsultation) {
    throw new Error(
      "This case already has an active consultation.",
    );
  }

  /*
   * This INSERT remains on the normal
   * authenticated client. RLS verifies
   * that the authenticated user is the
   * attorney assigned to the case.
   */
  const {
    error: consultationError,
  } = await supabase
    .from("case_consultations")
    .insert({
      case_id: caseId,
      attorney_id: user.id,
      client_id: caseData.user_id,
      scheduled_for:
        scheduledFor.toISOString(),
      duration_minutes:
        durationMinutes,
      meeting_type: meetingType,
      location_or_link:
        locationOrLink || null,
      note: note || null,
      status: "proposed",
    });

  if (consultationError) {
    throw new Error(
      consultationError.message,
    );
  }

  const formattedDate =
    formatConsultationDate(
      scheduledFor,
    );

  const {
    error: notificationError,
  } = await supabaseAdmin.rpc(
    "create_notification",
    {
      user_id_input:
        caseData.user_id,
      type_input:
        "consultation_proposed",
      title_input:
        "Consultation proposed",
      message_input:
        `Your attorney proposed a consultation for ${formattedDate} regarding "${caseData.title}".`,
      link_input:
        `/cases/${caseId}`,
    },
  );

  if (notificationError) {
    console.error(
      "Unable to create consultation proposal notification:",
      notificationError.message,
    );
  }

  refreshConsultationPages(caseId);
}

export async function acceptConsultation(
  caseId: string,
  consultationId: number,
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const {
    data: consultation,
    error: consultationError,
  } = await supabase
    .from("case_consultations")
    .select(`
      id,
      case_id,
      attorney_id,
      client_id,
      status,
      scheduled_for
    `)
    .eq("id", consultationId)
    .eq("case_id", caseId)
    .single();

  if (
    consultationError ||
    !consultation
  ) {
    throw new Error(
      "Consultation not found.",
    );
  }

  if (
    consultation.client_id !== user.id
  ) {
    throw new Error(
      "Only the claimant can accept this consultation.",
    );
  }

  if (
    consultation.status !== "proposed"
  ) {
    throw new Error(
      "This consultation is no longer awaiting a response.",
    );
  }

  const {
    data: caseData,
    error: caseError,
  } = await supabase
    .from("cases")
    .select(`
      id,
      title,
      user_id,
      assigned_attorney_id,
      case_status
    `)
    .eq("id", caseId)
    .single();

  if (caseError || !caseData) {
    throw new Error("Case not found.");
  }

  assertCaseIsOpen(
    caseData.case_status,
  );

  if (caseData.user_id !== user.id) {
    throw new Error(
      "You do not own this case.",
    );
  }

  if (
    caseData.assigned_attorney_id !==
    consultation.attorney_id
  ) {
    throw new Error(
      "This consultation does not belong to the currently assigned attorney.",
    );
  }

  if (
    caseData.case_status !==
      "attorney_assigned" &&
    caseData.case_status !==
      "consultation_scheduled"
  ) {
    throw new Error(
      "This consultation can no longer be accepted at the current case stage.",
    );
  }

  /*
   * Permission has now been verified.
   * Perform the controlled mutation
   * with the server-only admin client.
   */
  const {
    data: updatedConsultation,
    error: updateError,
  } = await supabaseAdmin
    .from("case_consultations")
    .update({
      status: "accepted",
      updated_at:
        new Date().toISOString(),
    })
    .eq("id", consultationId)
    .eq("case_id", caseId)
    .eq("client_id", user.id)
    .eq(
      "attorney_id",
      consultation.attorney_id,
    )
    .eq("status", "proposed")
    .select("id")
    .maybeSingle();

  if (updateError) {
    throw new Error(
      updateError.message,
    );
  }

  if (!updatedConsultation) {
    throw new Error(
      "This consultation changed before your response was processed. Refresh and try again.",
    );
  }

  if (
    caseData.case_status !==
    "consultation_scheduled"
  ) {
    const {
      data: updatedCase,
      error: statusUpdateError,
    } = await supabaseAdmin
      .from("cases")
      .update({
        case_status:
          "consultation_scheduled",
      })
      .eq("id", caseId)
      .eq("user_id", user.id)
      .eq(
        "assigned_attorney_id",
        consultation.attorney_id,
      )
      .eq(
        "case_status",
        "attorney_assigned",
      )
      .select("id")
      .maybeSingle();

    if (statusUpdateError) {
      await supabaseAdmin
        .from("case_consultations")
        .update({
          status: "proposed",
          updated_at:
            new Date().toISOString(),
        })
        .eq("id", consultationId)
        .eq("case_id", caseId)
        .eq("client_id", user.id)
        .eq(
          "attorney_id",
          consultation.attorney_id,
        )
        .eq("status", "accepted");

      throw new Error(
        statusUpdateError.message,
      );
    }

    if (!updatedCase) {
      await supabaseAdmin
        .from("case_consultations")
        .update({
          status: "proposed",
          updated_at:
            new Date().toISOString(),
        })
        .eq("id", consultationId)
        .eq("case_id", caseId)
        .eq("client_id", user.id)
        .eq(
          "attorney_id",
          consultation.attorney_id,
        )
        .eq("status", "accepted");

      throw new Error(
        "The case status changed before the consultation was accepted. Refresh and try again.",
      );
    }

    const {
  error: historyError,
} = await supabaseAdmin
  .from("case_status_updates")
  .insert({
    case_id: caseId,
    changed_by: user.id,
    status:
      "consultation_scheduled",
    note:
      "Consultation accepted and scheduled.",
  });
    if (historyError) {
      await supabaseAdmin
        .from("cases")
        .update({
          case_status:
            "attorney_assigned",
        })
        .eq("id", caseId)
        .eq("user_id", user.id)
        .eq(
          "assigned_attorney_id",
          consultation.attorney_id,
        )
        .eq(
          "case_status",
          "consultation_scheduled",
        );

      await supabaseAdmin
        .from("case_consultations")
        .update({
          status: "proposed",
          updated_at:
            new Date().toISOString(),
        })
        .eq("id", consultationId)
        .eq("case_id", caseId)
        .eq("client_id", user.id)
        .eq(
          "attorney_id",
          consultation.attorney_id,
        )
        .eq("status", "accepted");

      throw new Error(
        historyError.message,
      );
    }
  }

  const formattedDate =
    formatConsultationDate(
      consultation.scheduled_for,
    );

  const {
    error: notificationError,
  } = await supabaseAdmin.rpc(
    "create_notification",
    {
      user_id_input:
        consultation.attorney_id,
      type_input:
        "consultation_accepted",
      title_input:
        "Consultation accepted",
      message_input:
        `The claimant accepted the consultation for ${formattedDate} regarding "${caseData.title}".`,
      link_input:
        `/cases/${caseId}`,
    },
  );

  if (notificationError) {
    console.error(
      "Unable to create consultation accepted notification:",
      notificationError.message,
    );
  }

  refreshConsultationPages(caseId);
}

export async function declineConsultation(
  caseId: string,
  consultationId: number,
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const {
    data: consultation,
    error: consultationError,
  } = await supabase
    .from("case_consultations")
    .select(`
      id,
      case_id,
      attorney_id,
      client_id,
      status,
      scheduled_for
    `)
    .eq("id", consultationId)
    .eq("case_id", caseId)
    .single();

  if (
    consultationError ||
    !consultation
  ) {
    throw new Error(
      "Consultation not found.",
    );
  }

  if (
    consultation.client_id !== user.id
  ) {
    throw new Error(
      "Only the claimant can decline this consultation.",
    );
  }

  if (
    consultation.status !== "proposed"
  ) {
    throw new Error(
      "This consultation is no longer awaiting a response.",
    );
  }

  const {
    data: caseData,
    error: caseError,
  } = await supabase
    .from("cases")
    .select(`
      id,
      title,
      user_id,
      assigned_attorney_id,
      case_status
    `)
    .eq("id", caseId)
    .single();

  if (caseError || !caseData) {
    throw new Error("Case not found.");
  }

  assertCaseIsOpen(
    caseData.case_status,
  );

  if (caseData.user_id !== user.id) {
    throw new Error(
      "You do not own this case.",
    );
  }

  if (
    caseData.assigned_attorney_id !==
    consultation.attorney_id
  ) {
    throw new Error(
      "This consultation does not belong to the currently assigned attorney.",
    );
  }

  const {
    data: updatedConsultation,
    error: updateError,
  } = await supabaseAdmin
    .from("case_consultations")
    .update({
      status: "declined",
      updated_at:
        new Date().toISOString(),
    })
    .eq("id", consultationId)
    .eq("case_id", caseId)
    .eq("client_id", user.id)
    .eq(
      "attorney_id",
      consultation.attorney_id,
    )
    .eq("status", "proposed")
    .select("id")
    .maybeSingle();

  if (updateError) {
    throw new Error(
      updateError.message,
    );
  }

  if (!updatedConsultation) {
    throw new Error(
      "This consultation changed before your response was processed. Refresh and try again.",
    );
  }

  const formattedDate =
    formatConsultationDate(
      consultation.scheduled_for,
    );

  const {
    error: notificationError,
  } = await supabaseAdmin.rpc(
    "create_notification",
    {
      user_id_input:
        consultation.attorney_id,
      type_input:
        "consultation_declined",
      title_input:
        "Consultation declined",
      message_input:
        `The claimant declined the consultation proposed for ${formattedDate} regarding "${caseData.title}".`,
      link_input:
        `/cases/${caseId}`,
    },
  );

  if (notificationError) {
    console.error(
      "Unable to create consultation declined notification:",
      notificationError.message,
    );
  }

  refreshConsultationPages(caseId);
}

export async function cancelConsultation(
  caseId: string,
  consultationId: number,
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const {
    data: consultation,
    error: consultationError,
  } = await supabase
    .from("case_consultations")
    .select(`
      id,
      case_id,
      attorney_id,
      client_id,
      status,
      scheduled_for
    `)
    .eq("id", consultationId)
    .eq("case_id", caseId)
    .single();

  if (
    consultationError ||
    !consultation
  ) {
    throw new Error(
      "Consultation not found.",
    );
  }

  if (
    consultation.attorney_id !== user.id
  ) {
    throw new Error(
      "Only the assigned attorney can cancel this consultation.",
    );
  }

  if (
    consultation.status !== "proposed" &&
    consultation.status !== "accepted"
  ) {
    throw new Error(
      "This consultation can no longer be cancelled.",
    );
  }

  const {
    data: caseData,
    error: caseError,
  } = await supabase
    .from("cases")
    .select(`
      id,
      title,
      user_id,
      assigned_attorney_id,
      case_status
    `)
    .eq("id", caseId)
    .single();

  if (caseError || !caseData) {
    throw new Error("Case not found.");
  }

  assertCaseIsOpen(
    caseData.case_status,
  );

  if (
    caseData.assigned_attorney_id !==
    user.id
  ) {
    throw new Error(
      "You are no longer the assigned attorney for this case.",
    );
  }

  const {
    data: updatedConsultation,
    error: updateError,
  } = await supabaseAdmin
    .from("case_consultations")
    .update({
      status: "cancelled",
      updated_at:
        new Date().toISOString(),
    })
    .eq("id", consultationId)
    .eq("case_id", caseId)
    .eq("attorney_id", user.id)
    .eq(
      "client_id",
      consultation.client_id,
    )
    .in("status", [
      "proposed",
      "accepted",
    ])
    .select("id")
    .maybeSingle();

  if (updateError) {
    throw new Error(
      updateError.message,
    );
  }

  if (!updatedConsultation) {
    throw new Error(
      "This consultation changed before it could be cancelled. Refresh and try again.",
    );
  }

  const {
    error: notificationError,
  } = await supabaseAdmin.rpc(
    "create_notification",
    {
      user_id_input:
        consultation.client_id,
      type_input:
        "consultation_cancelled",
      title_input:
        "Consultation cancelled",
      message_input:
        `Your attorney cancelled the consultation for "${caseData.title}".`,
      link_input:
        `/cases/${caseId}`,
    },
  );

  if (notificationError) {
    console.error(
      "Unable to create consultation cancellation notification:",
      notificationError.message,
    );
  }

  refreshConsultationPages(caseId);
}

export async function rescheduleConsultation(
  caseId: string,
  consultationId: number,
  formData: FormData,
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const scheduledForInput = String(
    formData.get("scheduled_for") ?? "",
  ).trim();

  const durationMinutes = Number(
    formData.get("duration_minutes"),
  );

  const meetingType = String(
    formData.get("meeting_type") ?? "",
  ).trim();

  const locationOrLink = String(
    formData.get("location_or_link") ?? "",
  ).trim();

  const note = String(
    formData.get("note") ?? "",
  ).trim();

  const scheduledFor = new Date(
    scheduledForInput,
  );

  if (
    !scheduledForInput ||
    Number.isNaN(
      scheduledFor.getTime(),
    ) ||
    scheduledFor.getTime() <= Date.now()
  ) {
    throw new Error(
      "Choose a valid future consultation time.",
    );
  }

  if (
    !allowedDurations.has(durationMinutes)
  ) {
    throw new Error(
      "Invalid consultation duration.",
    );
  }

  if (
    !allowedMeetingTypes.has(meetingType)
  ) {
    throw new Error(
      "Invalid meeting type.",
    );
  }

  if (note.length > 2000) {
    throw new Error(
      "Consultation note is too long.",
    );
  }

  const {
    data: consultation,
    error: consultationError,
  } = await supabase
    .from("case_consultations")
    .select(`
      id,
      case_id,
      attorney_id,
      client_id,
      status
    `)
    .eq("id", consultationId)
    .eq("case_id", caseId)
    .single();

  if (
    consultationError ||
    !consultation
  ) {
    throw new Error(
      "Consultation not found.",
    );
  }

  if (
    consultation.attorney_id !== user.id
  ) {
    throw new Error(
      "Only the assigned attorney can reschedule this consultation.",
    );
  }

  if (
    consultation.status !== "proposed" &&
    consultation.status !== "accepted"
  ) {
    throw new Error(
      "This consultation can no longer be rescheduled.",
    );
  }

  const {
    data: caseData,
    error: caseError,
  } = await supabase
    .from("cases")
    .select(`
      id,
      title,
      user_id,
      assigned_attorney_id,
      case_status
    `)
    .eq("id", caseId)
    .single();

  if (caseError || !caseData) {
    throw new Error("Case not found.");
  }

  assertCaseIsOpen(
    caseData.case_status,
  );

  if (
    caseData.assigned_attorney_id !==
    user.id
  ) {
    throw new Error(
      "You are no longer the assigned attorney for this case.",
    );
  }

  if (
    caseData.case_status !==
      "attorney_assigned" &&
    caseData.case_status !==
      "consultation_scheduled"
  ) {
    throw new Error(
      "This consultation can no longer be rescheduled at the current case stage.",
    );
  }

  const {
    data: updatedConsultation,
    error: updateError,
  } = await supabaseAdmin
    .from("case_consultations")
    .update({
      scheduled_for:
        scheduledFor.toISOString(),
      duration_minutes:
        durationMinutes,
      meeting_type:
        meetingType,
      location_or_link:
        locationOrLink || null,
      note: note || null,
      status: "proposed",
      updated_at:
        new Date().toISOString(),
    })
    .eq("id", consultationId)
    .eq("case_id", caseId)
    .eq("attorney_id", user.id)
    .eq(
      "client_id",
      consultation.client_id,
    )
    .in("status", [
      "proposed",
      "accepted",
    ])
    .select("id")
    .maybeSingle();

  if (updateError) {
    throw new Error(
      updateError.message,
    );
  }

  if (!updatedConsultation) {
    throw new Error(
      "This consultation changed before it could be rescheduled. Refresh and try again.",
    );
  }

  const formattedDate =
    formatConsultationDate(
      scheduledFor,
    );

  const {
    error: notificationError,
  } = await supabaseAdmin.rpc(
    "create_notification",
    {
      user_id_input:
        consultation.client_id,
      type_input:
        "consultation_rescheduled",
      title_input:
        "Consultation rescheduled",
      message_input:
        `Your attorney proposed a new consultation time for ${formattedDate} regarding "${caseData.title}".`,
      link_input:
        `/cases/${caseId}`,
    },
  );

  if (notificationError) {
    console.error(
      "Unable to create consultation reschedule notification:",
      notificationError.message,
    );
  }

  refreshConsultationPages(caseId);
}