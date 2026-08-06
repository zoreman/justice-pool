"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase-server";

export async function applyToCase(
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

  const coverLetter = String(
    formData.get("cover_letter") ?? "",
  ).trim();

  if (coverLetter.length < 100) {
    throw new Error(
      "Your application should be at least 100 characters.",
    );
  }

  if (coverLetter.length > 3000) {
    throw new Error(
      "Your application cannot exceed 3,000 characters.",
    );
  }

  const { data: attorney, error: attorneyError } = await supabase
    .from("attorneys")
    .select("id, verified, accepting_cases")
    .eq("id", user.id)
    .maybeSingle();

  if (attorneyError) {
    throw new Error(attorneyError.message);
  }

  if (!attorney) {
    redirect("/become-an-attorney");
  }

  if (!attorney.verified) {
    throw new Error(
      "Your attorney profile must be verified before applying.",
    );
  }

  if (!attorney.accepting_cases) {
    throw new Error(
      "Your attorney profile is not accepting new cases.",
    );
  }

  const { data: caseData, error: caseError } = await supabase
    .from("cases")
    .select("id, status, assigned_attorney_id")
    .eq("id", caseId)
    .single();

  if (caseError || !caseData) {
    throw new Error(caseError?.message ?? "Case not found.");
  }

  if (
    caseData.status !== "active" ||
    caseData.assigned_attorney_id
  ) {
    throw new Error(
      "This case is no longer accepting attorney applications.",
    );
  }

  const { data: existingApplication, error: existingError } =
    await supabase
      .from("attorney_applications")
      .select("id")
      .eq("attorney_id", user.id)
      .eq("case_id", caseId)
      .maybeSingle();

  if (existingError) {
    throw new Error(existingError.message);
  }

  if (existingApplication) {
    throw new Error(
      "You have already applied to represent this case.",
    );
  }

  const { error } = await supabase
    .from("attorney_applications")
    .insert({
      attorney_id: user.id,
      case_id: caseId,
      cover_letter: coverLetter,
      status: "pending",
    });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/attorney/dashboard");
  revalidatePath("/attorney/cases");
  revalidatePath(`/attorney/cases/${caseId}`);

  redirect("/attorney/dashboard");
}