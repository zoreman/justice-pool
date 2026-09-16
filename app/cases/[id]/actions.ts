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

export async function createCaseUpdate(
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

  const title = String(
    formData.get("title") ?? "",
  ).trim();

  const content = String(
    formData.get("content") ?? "",
  ).trim();

  if (!title) {
    throw new Error(
      "Enter an update title.",
    );
  }

  if (!content) {
    throw new Error(
      "Enter update details.",
    );
  }

  const {
    data: caseData,
    error: caseError,
  } = await supabase
    .from("cases")
    .select(
      `
        id,
        user_id,
        case_status
      `,
    )
    .eq("id", caseId)
    .single();

  if (caseError || !caseData) {
    throw new Error(
      caseError?.message ??
        "Case not found.",
    );
  }

  assertCaseIsOpen(
    caseData.case_status,
  );

  if (
    caseData.user_id !==
    user.id
  ) {
    throw new Error(
      "You do not have permission to update this case.",
    );
  }

  const { error } =
    await supabase
      .from("case_updates")
      .insert({
        case_id: caseId,
        title,
        content,
        author_id: user.id,
      });

  if (error) {
    throw new Error(
      error.message,
    );
  }

  revalidatePath(
    `/cases/${caseId}`,
  );

  revalidatePath(
    "/dashboard",
  );
}