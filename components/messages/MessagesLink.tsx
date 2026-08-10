import RealtimeMessagesLink from "@/components/messages/RealtimeMessagesLink";
import { createClient } from "@/lib/supabase-server";

export default async function MessagesLink() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: conversations, error: conversationError } =
    await supabase
      .from("conversations")
      .select("id")
      .or(
        `client_id.eq.${user.id},attorney_id.eq.${user.id}`,
      );

  if (conversationError) {
    return null;
  }

  const conversationIds =
    conversations?.map(
      (conversation) => conversation.id,
    ) ?? [];

  let unreadCount = 0;

  if (conversationIds.length > 0) {
    const { count, error: countError } = await supabase
      .from("messages")
      .select("id", {
        count: "exact",
        head: true,
      })
      .in(
        "conversation_id",
        conversationIds,
      )
      .neq("sender_id", user.id)
      .eq("read", false);

    if (!countError) {
      unreadCount = count ?? 0;
    }
  }

  return (
    <RealtimeMessagesLink
      userId={user.id}
      conversationIds={conversationIds}
      initialUnreadCount={unreadCount}
    />
  );
}