"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { supabaseAdmin } from "@/lib/supabase-admin";
import { createClient } from "@/lib/supabase-server";

function assertCaseIsOpen(caseStatus: string) {
  if (caseStatus === "closed") {
    throw new Error(
      "This case is closed and new messages can no longer be sent.",
    );
  }
}

async function requireConversationParticipant(
  conversationId: number,
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const {
    data: conversation,
    error: conversationError,
  } = await supabaseAdmin
    .from("conversations")
    .select(
      `
        id,
        case_id,
        client_id,
        attorney_id
      `,
    )
    .eq("id", conversationId)
    .single();

  if (conversationError || !conversation) {
    throw new Error("Conversation not found.");
  }

  const isParticipant =
    conversation.client_id === user.id ||
    conversation.attorney_id === user.id;

  if (!isParticipant) {
    throw new Error(
      "You do not have access to this conversation.",
    );
  }

  return {
    supabase,
    user,
    conversation,
  };
}

export async function sendMessage(
  conversationId: number,
  formData: FormData,
) {
  const { supabase, user, conversation } =
    await requireConversationParticipant(
      conversationId,
    );

  const content = String(
    formData.get("content") ?? "",
  ).trim();

  if (!content) {
    throw new Error("Message cannot be empty.");
  }

  if (content.length > 5000) {
    throw new Error("Message is too long.");
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
        case_status
      `,
    )
    .eq("id", conversation.case_id)
    .single();

  if (caseError || !caseData) {
    throw new Error("Case not found.");
  }

  assertCaseIsOpen(caseData.case_status);

  /*
   * Keep message creation under RLS.
   *
   * The INSERT policy verifies:
   * - sender_id = auth.uid()
   * - user belongs to the conversation
   */
  const {
    data: message,
    error: messageError,
  } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversationId,
      sender_id: user.id,
      content,
      read: false,
    })
    .select("id")
    .single();

  if (messageError || !message) {
    throw new Error(
      messageError?.message ??
        "Unable to send message.",
    );
  }

  /*
   * Updating conversation metadata is a
   * controlled server-side operation.
   */
  const {
    error: conversationUpdateError,
  } = await supabaseAdmin
    .from("conversations")
    .update({
      updated_at: new Date().toISOString(),
    })
    .eq("id", conversationId);

  if (conversationUpdateError) {
    console.error(
      "Unable to update conversation timestamp:",
      conversationUpdateError.message,
    );
  }

  const recipientId =
    conversation.client_id === user.id
      ? conversation.attorney_id
      : conversation.client_id;

  const {
    data: senderProfile,
    error: senderProfileError,
  } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();

  if (senderProfileError) {
    console.error(
      "Unable to load sender profile:",
      senderProfileError.message,
    );
  }

  const senderName =
    senderProfile?.full_name?.trim() ||
    "Someone";

  const caseTitle =
    caseData.title?.trim() ||
    "your case";

  const {
  error: notificationError,
} = await supabaseAdmin.rpc(
  "create_notification",
  {
    user_id_input: recipientId,
    type_input: "message",
    title_input:
      `New message from ${senderName}`,
    message_input:
      `${senderName} sent you a message about "${caseTitle}".`,
    link_input:
      `/messages/${conversationId}`,
  },
);

  if (notificationError) {
    console.error(
      "Unable to create message notification:",
      notificationError.message,
    );
  }

  revalidatePath(
    `/messages/${conversationId}`,
  );
  revalidatePath("/messages");
  revalidatePath("/notifications");
  revalidatePath("/dashboard");
  revalidatePath("/attorney/dashboard");
}

/*
 * Marks ONLY messages sent by the other
 * participant as read.
 *
 * This uses the service-role client only
 * after verifying the authenticated user
 * belongs to the conversation.
 */
export async function markMessagesRead(
  conversationId: number,
) {
  const { user } =
    await requireConversationParticipant(
      conversationId,
    );

  const {
    error: updateError,
  } = await supabaseAdmin
    .from("messages")
    .update({
      read: true,
    })
    .eq(
      "conversation_id",
      conversationId,
    )
    .neq("sender_id", user.id)
    .eq("read", false);

  if (updateError) {
    throw new Error(updateError.message);
  }

  revalidatePath(
    `/messages/${conversationId}`,
  );
  revalidatePath("/messages");
  revalidatePath("/notifications");
  revalidatePath("/dashboard");
  revalidatePath("/attorney/dashboard");
}