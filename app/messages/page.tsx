import Link from "next/link";
import { redirect } from "next/navigation";

import Container from "@/components/ui/Container";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { createClient } from "@/lib/supabase-server";

type Conversation = {
  id: number;
  case_id: string;
  client_id: string;
  attorney_id: string;
  created_at: string;
  updated_at: string;
};

type CaseRecord = {
  id: string;
  title: string;
};

type ProfileRecord = {
  id: string;
  full_name: string | null;
};

type AttorneyRecord = {
  id: string;
  full_name: string;
};

type LastMessage = {
  conversation_id: number;
  content: string;
  sender_id: string;
  created_at: string;
};

type UnreadMessage = {
  conversation_id: number;
  sender_id: string;
};

function formatRelativeTime(date: string) {
  const timestamp = new Date(date).getTime();

  const differenceInSeconds = Math.max(
    0,
    Math.floor((Date.now() - timestamp) / 1000),
  );

  if (differenceInSeconds < 60) {
    return "Just now";
  }

  const minutes = Math.floor(differenceInSeconds / 60);

  if (minutes < 60) {
    return `${minutes}m`;
  }

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return `${hours}h`;
  }

  const days = Math.floor(hours / 24);

  if (days < 7) {
    return `${days}d`;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(date));
}

export default async function MessagesPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const {
    data: conversationData,
    error: conversationError,
  } = await supabase
    .from("conversations")
    .select(
      `
        id,
        case_id,
        client_id,
        attorney_id,
        created_at,
        updated_at
      `,
    )
    .or(
      `client_id.eq.${user.id},attorney_id.eq.${user.id}`,
    )
    .order("updated_at", { ascending: false });

  if (conversationError) {
    throw new Error(conversationError.message);
  }

  const conversations =
    (conversationData ?? []) as Conversation[];

  const caseIds = [
    ...new Set(
      conversations.map(
        (conversation) => conversation.case_id,
      ),
    ),
  ];

  const clientIds = [
    ...new Set(
      conversations.map(
        (conversation) => conversation.client_id,
      ),
    ),
  ];

  const attorneyIds = [
    ...new Set(
      conversations.map(
        (conversation) => conversation.attorney_id,
      ),
    ),
  ];

  const conversationIds = conversations.map(
    (conversation) => conversation.id,
  );

  const caseMap = new Map<string, CaseRecord>();

  const profileMap = new Map<
    string,
    ProfileRecord
  >();

  const attorneyMap = new Map<
    string,
    AttorneyRecord
  >();

  const lastMessageMap = new Map<
    number,
    LastMessage
  >();

  const unreadCountMap = new Map<
    number,
    number
  >();

  if (caseIds.length > 0) {
    const {
      data: casesData,
      error: casesError,
    } = await supabaseAdmin
      .from("cases")
      .select("id, title")
      .in("id", caseIds);

    if (casesError) {
      throw new Error(casesError.message);
    }

    for (const caseItem of casesData ?? []) {
      caseMap.set(
        caseItem.id,
        caseItem as CaseRecord,
      );
    }
  }

  if (clientIds.length > 0) {
    const {
      data: profilesData,
      error: profilesError,
    } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name")
      .in("id", clientIds);

    if (profilesError) {
      throw new Error(profilesError.message);
    }

    for (const profile of profilesData ?? []) {
      profileMap.set(
        profile.id,
        profile as ProfileRecord,
      );
    }
  }

  if (attorneyIds.length > 0) {
    const {
      data: attorneysData,
      error: attorneysError,
    } = await supabaseAdmin
      .from("attorneys")
      .select("id, full_name")
      .in("id", attorneyIds);

    if (attorneysError) {
      throw new Error(attorneysError.message);
    }

    for (const attorney of attorneysData ?? []) {
      attorneyMap.set(
        attorney.id,
        attorney as AttorneyRecord,
      );
    }
  }

  if (conversationIds.length > 0) {
    const {
      data: messagesData,
      error: messagesError,
    } = await supabaseAdmin
      .from("messages")
      .select(
        `
          conversation_id,
          content,
          sender_id,
          created_at
        `,
      )
      .in(
        "conversation_id",
        conversationIds,
      )
      .order("created_at", {
        ascending: false,
      });

    if (messagesError) {
      throw new Error(messagesError.message);
    }

    for (
      const message of
        (messagesData ?? []) as LastMessage[]
    ) {
      if (
        !lastMessageMap.has(
          message.conversation_id,
        )
      ) {
        lastMessageMap.set(
          message.conversation_id,
          message,
        );
      }
    }

    const {
      data: unreadData,
      error: unreadError,
    } = await supabaseAdmin
      .from("messages")
      .select(
        `
          conversation_id,
          sender_id
        `,
      )
      .in(
        "conversation_id",
        conversationIds,
      )
      .eq("read", false)
      .neq("sender_id", user.id);

    if (unreadError) {
      throw new Error(unreadError.message);
    }

    for (
      const message of
        (unreadData ?? []) as UnreadMessage[]
    ) {
      const currentCount =
        unreadCountMap.get(
          message.conversation_id,
        ) ?? 0;

      unreadCountMap.set(
        message.conversation_id,
        currentCount + 1,
      );
    }
  }

  return (
    <main className="min-h-screen bg-ink-950 pb-24 pt-28 text-white">
      <Container>
        <div className="mx-auto max-w-5xl">
          <header className="flex flex-col gap-6 border-b border-white/10 pb-10 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-medium text-brand-300">
                Messages
              </p>

              <h1 className="mt-4 text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
                Conversations
              </h1>

              <p className="mt-4 max-w-xl text-slate-400">
                Private conversations between clients
                and assigned attorneys.
              </p>
            </div>

            <Link
              href="/dashboard"
              className="text-sm font-medium text-slate-400 transition hover:text-white"
            >
              ← Back to dashboard
            </Link>
          </header>

          {conversations.length === 0 ? (
            <div className="py-24 text-center">
              <h2 className="text-2xl font-semibold">
                No conversations yet
              </h2>

              <p className="mt-3 text-slate-500">
                A conversation will appear when an
                attorney is assigned to a case.
              </p>
            </div>
          ) : (
            <div className="mt-10 overflow-hidden rounded-2xl border border-white/10">
              {conversations.map(
                (conversation, index) => {
                  const caseItem = caseMap.get(
                    conversation.case_id,
                  );

                  const isClient =
                    conversation.client_id ===
                    user.id;

                  const otherName = isClient
                    ? attorneyMap.get(
                        conversation.attorney_id,
                      )?.full_name ||
                      "Assigned attorney"
                    : profileMap.get(
                        conversation.client_id,
                      )?.full_name ||
                      "Client";

                  const lastMessage =
                    lastMessageMap.get(
                      conversation.id,
                    );

                  const unreadCount =
                    unreadCountMap.get(
                      conversation.id,
                    ) ?? 0;

                  return (
                    <Link
                      key={conversation.id}
                      href={`/messages/${conversation.id}`}
                      className={`block px-6 py-6 transition hover:bg-white/[0.04] ${
                        index > 0
                          ? "border-t border-white/10"
                          : ""
                      }`}
                    >
                      <div className="flex items-start justify-between gap-6">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-3">
                            <h2
                              className={`truncate text-lg ${
                                unreadCount > 0
                                  ? "font-bold text-white"
                                  : "font-semibold text-slate-200"
                              }`}
                            >
                              {otherName}
                            </h2>

                            <span className="rounded-full bg-brand-400/10 px-2.5 py-1 text-xs font-medium text-brand-300">
                              {isClient
                                ? "Attorney"
                                : "Client"}
                            </span>

                            {unreadCount > 0 && (
                              <span className="flex min-h-5 min-w-5 items-center justify-center rounded-full bg-brand-500 px-1.5 text-[10px] font-bold text-white">
                                {unreadCount > 99
                                  ? "99+"
                                  : unreadCount}
                              </span>
                            )}
                          </div>

                          <p className="mt-2 truncate text-sm text-slate-500">
                            {caseItem?.title ||
                              "Legal case"}
                          </p>

                          <p
                            className={`mt-4 truncate ${
                              unreadCount > 0
                                ? "font-medium text-slate-200"
                                : "text-slate-400"
                            }`}
                          >
                            {lastMessage
                              ? `${
                                  lastMessage.sender_id ===
                                  user.id
                                    ? "You: "
                                    : ""
                                }${lastMessage.content}`
                              : "No messages yet. Start the conversation."}
                          </p>
                        </div>

                        <div className="flex shrink-0 flex-col items-end gap-3">
                          <p className="text-xs text-slate-600">
                            {lastMessage
                              ? formatRelativeTime(
                                  lastMessage.created_at,
                                )
                              : ""}
                          </p>

                          {unreadCount > 0 && (
                            <span className="h-2.5 w-2.5 rounded-full bg-brand-400" />
                          )}
                        </div>
                      </div>
                    </Link>
                  );
                },
              )}
            </div>
          )}
        </div>
      </Container>
    </main>
  );
}