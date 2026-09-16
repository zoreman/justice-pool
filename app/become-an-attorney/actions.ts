"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";

function getString(
  formData: FormData,
  name: string,
) {
  return String(
    formData.get(name) ?? "",
  ).trim();
}

function getList(
  formData: FormData,
  name: string,
) {
  return getString(
    formData,
    name,
  )
    .split(",")
    .map((value) =>
      value.trim(),
    )
    .filter(Boolean);
}

export async function createAttorneyProfile(
  formData: FormData,
) {
  /*
   * Normal client is used only to establish
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

  const fullName =
    getString(
      formData,
      "full_name",
    );

  const bio =
    getString(
      formData,
      "bio",
    );

  const lawFirm =
    getString(
      formData,
      "law_firm",
    );

  const licenseNumber =
    getString(
      formData,
      "license_number",
    );

  const practiceAreas =
    getList(
      formData,
      "practice_areas",
    );

  const states =
    getList(
      formData,
      "states",
    );

  const yearsExperience =
    Number(
      getString(
        formData,
        "years_experience",
      ),
    );

  /*
   * Validate all user-controlled values
   * before using the privileged client.
   */
  if (!fullName) {
    throw new Error(
      "Enter your full name.",
    );
  }

  if (
    fullName.length > 120
  ) {
    throw new Error(
      "Full name cannot exceed 120 characters.",
    );
  }

  if (!bio) {
    throw new Error(
      "Enter a professional biography.",
    );
  }

  if (
    bio.length > 5000
  ) {
    throw new Error(
      "Biography is too long.",
    );
  }

  if (!licenseNumber) {
    throw new Error(
      "Enter your license number.",
    );
  }

  if (
    licenseNumber.length >
    150
  ) {
    throw new Error(
      "License number is too long.",
    );
  }

  if (
    practiceAreas.length ===
    0
  ) {
    throw new Error(
      "Enter at least one practice area.",
    );
  }

  if (
    practiceAreas.length >
    20
  ) {
    throw new Error(
      "Too many practice areas were provided.",
    );
  }

  if (
    states.length === 0
  ) {
    throw new Error(
      "Enter at least one licensed state.",
    );
  }

  if (
    states.length > 50
  ) {
    throw new Error(
      "Too many states were provided.",
    );
  }

  if (
    !Number.isInteger(
      yearsExperience,
    ) ||
    yearsExperience < 0 ||
    yearsExperience > 80
  ) {
    throw new Error(
      "Enter a valid number of years of experience.",
    );
  }

  /*
   * Check whether an attorney profile
   * already exists.
   */
  const {
    data: existingAttorney,
    error: existingError,
  } = await supabaseAdmin
    .from("attorneys")
    .select(
      `
        id,
        verified,
        verification_status
      `,
    )
    .eq("id", user.id)
    .maybeSingle();

  if (existingError) {
    throw new Error(
      existingError.message,
    );
  }

  /*
   * A verified attorney must not be able
   * to use onboarding to reset or replace
   * their verification state.
   */
  if (
    existingAttorney?.verified ||
    existingAttorney
      ?.verification_status ===
      "verified"
  ) {
    throw new Error(
      "Your attorney profile is already verified.",
    );
  }

  /*
   * Create or resubmit the attorney
   * profile.
   *
   * Security-controlled values are forced
   * here and cannot be supplied by the
   * browser.
   */
  const {
    error: attorneyError,
  } = await supabaseAdmin
    .from("attorneys")
    .upsert(
      {
        id: user.id,

        full_name:
          fullName,

        bio,

        law_firm:
          lawFirm || null,

        practice_areas:
          practiceAreas,

        years_experience:
          yearsExperience,

        states,

        license_number:
          licenseNumber,

        verified: false,

        accepting_cases:
          false,

        verification_status:
          "pending",
      },
      {
        onConflict: "id",
      },
    );

  if (attorneyError) {
    throw new Error(
      attorneyError.message,
    );
  }

  /*
   * Update the normal profile's display
   * name.
   *
   * We also do this through the trusted
   * server client so this action remains
   * independent of browser UPDATE policies.
   */
  const {
    error: profileError,
  } = await supabaseAdmin
    .from("profiles")
    .update({
      full_name:
        fullName,
    })
    .eq(
      "id",
      user.id,
    );

  if (profileError) {
    throw new Error(
      profileError.message,
    );
  }

  revalidatePath(
    "/dashboard",
  );

  revalidatePath(
    "/profile",
  );

  revalidatePath(
    "/become-an-attorney",
  );

  revalidatePath(
    "/admin/attorneys",
  );

  revalidatePath(
    "/attorney/dashboard",
  );

  /*
   * User remains a normal user until
   * an administrator verifies them.
   */
  redirect("/dashboard");
}