"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase-server";

export async function sendMessage(
  conversationId: number,
  formData: FormData,
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const content = String(
    formData.get("content") ?? "",
  ).trim();

  if (!content) {
    throw new Error("Message cannot be empty.");
  }

  if (content.length > 5000) {
    throw new Error("Message is too long.");
  }

  // Get conversation and verify the user belongs to it
  const {
    data: conversation,
    error: conversationError,
  } = await supabase
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

  // Insert message
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

  // Move conversation to the top of the inbox
  const { error: updateError } = await supabase
    .from("conversations")
    .update({
      updated_at: new Date().toISOString(),
    })
    .eq("id", conversationId);

  if (updateError) {
    throw new Error(updateError.message);
  }

  // Find the recipient
  const recipientId =
    conversation.client_id === user.id
      ? conversation.attorney_id
      : conversation.client_id;

  // Get sender name for a better notification
  const { data: senderProfile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();

  const senderName =
    senderProfile?.full_name?.trim() ||
    "Someone";

  // Get case title so the notification has context
  const { data: caseData } = await supabase
    .from("cases")
    .select("title")
    .eq("id", conversation.case_id)
    .maybeSingle();

  const caseTitle =
    caseData?.title?.trim() ||
    "your case";

  // Create notification for recipient
  const { error: notificationError } =
    await supabase.rpc("create_notification", {
      user_id_input: recipientId,
      type_input: "message",
      title_input: `New message from ${senderName}`,
      message_input: `${senderName} sent you a message about "${caseTitle}".`,
      link_input: `/messages/${conversationId}`,
    });

  if (notificationError) {
    throw new Error(notificationError.message);
  }

  // Refresh all relevant pages
  revalidatePath(`/messages/${conversationId}`);
  revalidatePath("/messages");
  revalidatePath("/notifications");
  revalidatePath("/dashboard");
}