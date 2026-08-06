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

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  if (profile?.role !== "admin") {
    redirect("/dashboard");
  }
}

function refreshAttorneyPages() {
  revalidatePath("/admin/attorneys");
  revalidatePath("/attorney/dashboard");
  revalidatePath("/attorney/cases");
  revalidatePath("/dashboard");
  revalidatePath("/notifications");
}

export async function verifyAttorney(attorneyId: string) {
  await requireAdmin();

  const { data: attorney, error: attorneyError } =
    await supabaseAdmin
      .from("attorneys")
      .select("id, full_name")
      .eq("id", attorneyId)
      .single();

  if (attorneyError || !attorney) {
    throw new Error(
      attorneyError?.message ?? "Attorney not found.",
    );
  }

  const { error: updateError } = await supabaseAdmin
    .from("attorneys")
    .update({
      verified: true,
      accepting_cases: true,
    })
    .eq("id", attorneyId);

  if (updateError) {
    throw new Error(updateError.message);
  }

  const { error: profileError } = await supabaseAdmin
    .from("profiles")
    .update({
      role: "attorney",
    })
    .eq("id", attorneyId);

  if (profileError) {
    throw new Error(profileError.message);
  }

  const { error: notificationError } =
    await supabaseAdmin.rpc("create_notification", {
      user_id_input: attorneyId,
      type_input: "attorney_verified",
      title_input: "Attorney profile verified",
      message_input:
        "Your attorney profile has been verified. You can now apply to represent cases.",
      link_input: "/attorney/cases",
    });

  if (notificationError) {
    throw new Error(notificationError.message);
  }

  refreshAttorneyPages();
}

export async function rejectAttorney(attorneyId: string) {
  await requireAdmin();

  const { data: attorney, error: attorneyError } =
    await supabaseAdmin
      .from("attorneys")
      .select("id, full_name")
      .eq("id", attorneyId)
      .single();

  if (attorneyError || !attorney) {
    throw new Error(
      attorneyError?.message ?? "Attorney not found.",
    );
  }

  const { error: updateError } = await supabaseAdmin
    .from("attorneys")
    .update({
      verified: false,
      accepting_cases: false,
    })
    .eq("id", attorneyId);

  if (updateError) {
    throw new Error(updateError.message);
  }

  const { error: profileError } = await supabaseAdmin
    .from("profiles")
    .update({
      role: "user",
    })
    .eq("id", attorneyId);

  if (profileError) {
    throw new Error(profileError.message);
  }

  const { error: notificationError } =
    await supabaseAdmin.rpc("create_notification", {
      user_id_input: attorneyId,
      type_input: "attorney_rejected",
      title_input: "Attorney verification update",
      message_input:
        "Your attorney profile could not be verified. Review your information and contact support if needed.",
      link_input: "/become-an-attorney",
    });

  if (notificationError) {
    throw new Error(notificationError.message);
  }

  refreshAttorneyPages();
}