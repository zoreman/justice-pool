import Link from "next/link";
import {
  notFound,
  redirect,
} from "next/navigation";

import MessageAttachmentUpload from "@/components/messages/MessageAttachmentUpload";
import MessageComposer from "@/components/messages/MessageComposer";
import RealtimeMessages from "@/components/messages/Realtimemessages";
import Container from "@/components/ui/Container";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { createClient } from "@/lib/supabase-server";

import { sendMessage } from "./actions";

type MessagePageProps = {
  params: Promise<{
    conversationId: string;
  }>;
};

type MessageRecord = {
  id: number;
  sender_id: string;
  content: string;
  read: boolean;
  created_at: string;
};

type AttachmentRecord = {
  id: number;
  conversation_id: number;
  message_id: number | null;
  uploader_id: string;
  file_name: string;
  storage_path: string;
  mime_type: string | null;
  file_size: number | null;
  created_at: string;
};

export default async function MessagePage({
  params,
}: MessagePageProps) {
  const { conversationId } = await params;

  const supabase = await createClient();

  /*
   * Get the currently logged-in user.
   */
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  /*
   * Validate the conversation ID.
   */
  const numericConversationId =
    Number(conversationId);

  if (!Number.isInteger(numericConversationId)) {
    notFound();
  }

  /*
   * Load the conversation.
   */
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
    .eq("id", numericConversationId)
    .single();

  if (conversationError || !conversation) {
    notFound();
  }

  /*
   * Security check:
   * only the client or attorney may open this chat.
   */
  const isParticipant =
    conversation.client_id === user.id ||
    conversation.attorney_id === user.id;

  if (!isParticipant) {
    redirect("/messages");
  }

  /*
   * Mark all messages sent by the OTHER person as read.
   *
   * RealtimeMessages listens for these UPDATE events,
   * which causes "Seen" to appear for the sender.
   */
  const { error: readError } = await supabase
    .from("messages")
    .update({
      read: true,
    })
    .eq(
      "conversation_id",
      conversation.id,
    )
    .neq(
      "sender_id",
      user.id,
    )
    .eq(
      "read",
      false,
    );

  if (readError) {
    throw new Error(readError.message);
  }

  /*
   * Determine who the other participant is.
   */
  const otherUserId =
    conversation.client_id === user.id
      ? conversation.attorney_id
      : conversation.client_id;

  /*
   * Get the case and other participant's name.
   */
  const [
    {
      data: caseData,
      error: caseError,
    },
    {
      data: attorneyData,
      error: attorneyError,
    },
    {
      data: profileData,
      error: profileError,
    },
  ] = await Promise.all([
    supabaseAdmin
      .from("cases")
      .select("id, title")
      .eq(
        "id",
        conversation.case_id,
      )
      .maybeSingle(),

    supabaseAdmin
      .from("attorneys")
      .select("id, full_name")
      .eq(
        "id",
        otherUserId,
      )
      .maybeSingle(),

    supabaseAdmin
      .from("profiles")
      .select("id, full_name")
      .eq(
        "id",
        otherUserId,
      )
      .maybeSingle(),
  ]);

  if (caseError) {
    throw new Error(caseError.message);
  }

  if (attorneyError) {
    throw new Error(attorneyError.message);
  }

  if (profileError) {
    throw new Error(profileError.message);
  }

  const otherName =
    attorneyData?.full_name ||
    profileData?.full_name ||
    "Conversation participant";

  /*
   * Load messages.
   *
   * "read" is included because RealtimeMessages uses it
   * for the Seen indicator.
   */
  const {
    data: messagesData,
    error: messagesError,
  } = await supabase
    .from("messages")
    .select(
      `
        id,
        sender_id,
        content,
        read,
        created_at
      `,
    )
    .eq(
      "conversation_id",
      conversation.id,
    )
    .order(
      "created_at",
      {
        ascending: true,
      },
    );

  if (messagesError) {
    throw new Error(messagesError.message);
  }

  const messages =
    (messagesData ?? []) as MessageRecord[];

  /*
   * Load all attachments belonging to this conversation.
   */
  const {
    data: attachmentsData,
    error: attachmentsError,
  } = await supabase
    .from("message_attachments")
    .select(
      `
        id,
        conversation_id,
        message_id,
        uploader_id,
        file_name,
        storage_path,
        mime_type,
        file_size,
        created_at
      `,
    )
    .eq(
      "conversation_id",
      conversation.id,
    )
    .order(
      "created_at",
      {
        ascending: true,
      },
    );

  if (attachmentsError) {
    throw new Error(
      attachmentsError.message,
    );
  }

  const attachments =
    (attachmentsData ??
      []) as AttachmentRecord[];

  /*
   * The Storage bucket is private, so create temporary
   * signed URLs for every attachment.
   */
  const attachmentsWithUrls =
    await Promise.all(
      attachments.map(
        async (attachment) => {
          const {
            data,
            error,
          } =
            await supabase.storage
              .from(
                "message-attachments",
              )
              .createSignedUrl(
                attachment.storage_path,
                60 * 60,
              );

          if (error) {
            return {
              ...attachment,
              signedUrl: null,
            };
          }

          return {
            ...attachment,
            signedUrl:
              data.signedUrl,
          };
        },
      ),
    );

  return (
    <main className="min-h-screen bg-slate-50 pb-24 pt-20 sm:pb-32 sm:pt-28">
      <Container>
        <div className="mx-auto max-w-4xl px-1 sm:px-0">
          {/* Back to conversation list */}
          <Link
            href="/messages"
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-ink-950"
          >
            <span aria-hidden="true">
              ←
            </span>

            <span>
              Back to messages
            </span>
          </Link>

          {/* Conversation header */}
          <header className="mt-6 border-b border-slate-200 pb-5 sm:mt-8 sm:pb-6">
            <p className="text-sm font-medium text-brand-600">
              {caseData?.title ||
                "Legal case"}
            </p>

            <h1 className="mt-2 break-words text-2xl font-semibold tracking-[-0.03em] text-ink-950 sm:text-3xl">
              {otherName}
            </h1>
          </header>

          {/* Realtime conversation */}
          <section className="mt-6 sm:mt-8">
            <RealtimeMessages
              conversationId={
                conversation.id
              }
              userId={
                user.id
              }
              initialMessages={
                messages
              }
              initialAttachments={
                attachmentsWithUrls
              }
            />
          </section>

          {/* Shared files */}
          {attachmentsWithUrls.length >
            0 && (
            <section className="mt-8 border-t border-slate-200 pt-8">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 sm:text-sm">
                Shared files
              </p>

              <div className="mt-4 space-y-3">
                {attachmentsWithUrls.map(
                  (attachment) => (
                    <div
                      key={
                        attachment.id
                      }
                      className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-4 sm:gap-4 sm:px-5"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-ink-950 sm:text-base">
                          {
                            attachment.file_name
                          }
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          {attachment.file_size
                            ? `${Math.round(
                                attachment.file_size /
                                  1024,
                              )} KB`
                            : "File"}
                        </p>
                      </div>

                      {attachment.signedUrl ? (
                        <a
                          href={
                            attachment.signedUrl
                          }
                          target="_blank"
                          rel="noreferrer"
                          className="shrink-0 rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-brand-500 hover:text-brand-600 sm:px-4 sm:text-sm"
                        >
                          Open
                        </a>
                      ) : (
                        <span className="shrink-0 text-xs text-slate-400 sm:text-sm">
                          Unavailable
                        </span>
                      )}
                    </div>
                  ),
                )}
              </div>
            </section>
          )}

          {/* Attachment uploader */}
          <div className="mt-8">
            <MessageAttachmentUpload
              conversationId={
                conversation.id
              }
              userId={
                user.id
              }
            />
          </div>

          {/* Message composer + typing broadcaster */}
          <MessageComposer
            conversationId={
              conversation.id
            }
            userId={
              user.id
            }
            action={
              sendMessage
            }
          />
        </div>
      </Container>
    </main>
  );
}