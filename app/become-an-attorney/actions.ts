"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase-server";

function getString(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

function getList(formData: FormData, name: string) {
  return getString(formData, name)
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

export async function createAttorneyProfile(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const fullName = getString(formData, "full_name");
  const bio = getString(formData, "bio");
  const lawFirm = getString(formData, "law_firm");
  const licenseNumber = getString(formData, "license_number");
  const practiceAreas = getList(formData, "practice_areas");
  const states = getList(formData, "states");
  const yearsExperience = Number(
    getString(formData, "years_experience"),
  );

  if (!fullName) {
    throw new Error("Enter your full name.");
  }

  if (!bio) {
    throw new Error("Enter a professional biography.");
  }

  if (!licenseNumber) {
    throw new Error("Enter your license number.");
  }

  if (practiceAreas.length === 0) {
    throw new Error("Enter at least one practice area.");
  }

  if (states.length === 0) {
    throw new Error("Enter at least one licensed state.");
  }

  if (
    !Number.isInteger(yearsExperience) ||
    yearsExperience < 0 ||
    yearsExperience > 80
  ) {
    throw new Error("Enter a valid number of years of experience.");
  }

  const { error: attorneyError } = await supabase
    .from("attorneys")
    .upsert(
      {
        id: user.id,
        full_name: fullName,
        bio,
        law_firm: lawFirm || null,
        practice_areas: practiceAreas,
        years_experience: yearsExperience,
        states,
        license_number: licenseNumber,
      },
      {
        onConflict: "id",
      },
    );

  if (attorneyError) {
    throw new Error(attorneyError.message);
  }

  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      full_name: fullName,
      role: "attorney",
    })
    .eq("id", user.id);

  if (profileError) {
    throw new Error(profileError.message);
  }

  revalidatePath("/dashboard");
  revalidatePath("/profile");
  revalidatePath("/attorney/dashboard");

  redirect("/attorney/dashboard");
}