import Link from "next/link";
import { redirect } from "next/navigation";

import Container from "@/components/ui/Container";
import { createClient } from "@/lib/supabase-server";

import {
  deleteNotification,
  markAllNotificationsRead,
  markNotificationRead,
} from "./actions";

type Notification = {
  id: number;
  type: string;
  title: string;
  message: string;
  link: string | null;
  read: boolean;
  created_at: string;
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

  const minutes = Math.floor(
    differenceInSeconds / 60,
  );

  if (minutes < 60) {
    return `${minutes} ${
      minutes === 1 ? "minute" : "minutes"
    } ago`;
  }

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return `${hours} ${
      hours === 1 ? "hour" : "hours"
    } ago`;
  }

  const days = Math.floor(hours / 24);

  if (days === 1) {
    return "Yesterday";
  }

  if (days < 7) {
    return `${days} days ago`;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
}

function notificationLabel(type: string) {
  switch (type) {
    case "case_approved":
      return "Case approved";

    case "case_status":
      return "Case status updated";

    case "case_document":
      return "New case document";

    case "case_document_request":
      return "Document requested";

    case "case_document_fulfilled":
      return "Document request fulfilled";
    
    case "consultation_accepted":
  return "Consultation accepted";

case "consultation_declined":
  return "Consultation declined";

    case "consultation_proposed":
      return "Consultation proposed";

  case "consultation_cancelled":
  return "Consultation cancelled";

case "consultation_rescheduled":
  return "Consultation rescheduled";

    case "message":
      return "New message";

    case "case_rejected":
      return "Case rejected";

    case "case_revision":
      return "Changes requested";

    case "contribution":
      return "New contribution";

    case "comment":
      return "New comment";

    case "follower":
      return "New follower";

    case "attorney_verified":
      return "Attorney verified";

    case "attorney_rejected":
      return "Attorney verification update";

    case "attorney_application_accepted":
      return "Application accepted";

    case "attorney_application_rejected":
      return "Application update";

    default:
      return "Notification";
  }
}

export default async function NotificationsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data, error } = await supabase
    .from("notifications")
    .select(
      "id, type, title, message, link, read, created_at",
    )
    .eq("user_id", user.id)
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    throw new Error(error.message);
  }

  const notifications =
    (data ?? []) as Notification[];

  const unreadCount = notifications.filter(
    (notification) => !notification.read,
  ).length;

  return (
    <main className="min-h-screen bg-ink-950 pb-24 pt-28 text-white">
      <Container>
        <div className="mx-auto max-w-4xl">
          <Link
            href="/dashboard"
            className="text-sm font-medium text-slate-400 transition hover:text-white"
          >
            ← Back to dashboard
          </Link>

          <header className="mt-12 flex flex-col gap-6 border-b border-white/10 pb-10 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-medium text-brand-300">
                Notifications
              </p>

              <h1 className="mt-4 text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
                Activity updates
              </h1>

              <p className="mt-4 text-slate-400">
                {unreadCount} unread{" "}
                {unreadCount === 1
                  ? "notification"
                  : "notifications"}
              </p>
            </div>

            {unreadCount > 0 && (
              <form action={markAllNotificationsRead}>
                <button
                  type="submit"
                  className="rounded-xl border border-white/10 px-5 py-3 text-sm font-semibold text-slate-300 transition hover:bg-white/5 hover:text-white"
                >
                  Mark all as read
                </button>
              </form>
            )}
          </header>

          {notifications.length === 0 ? (
            <div className="py-20 text-center">
              <h2 className="text-2xl font-semibold">
                No notifications yet
              </h2>

              <p className="mt-3 text-slate-500">
                New activity will appear here.
              </p>
            </div>
          ) : (
            <div className="mt-10 overflow-hidden rounded-2xl border border-white/10">
              {notifications.map(
                (notification, index) => (
                  <article
                    key={notification.id}
                    className={`px-6 py-6 ${
                      index > 0
                        ? "border-t border-white/10"
                        : ""
                    } ${
                      notification.read
                        ? "bg-transparent"
                        : "bg-white/[0.035]"
                    }`}
                  >
                    <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-300">
                            {notificationLabel(
                              notification.type,
                            )}
                          </span>

                          {!notification.read && (
                            <span className="h-2 w-2 rounded-full bg-brand-400" />
                          )}
                        </div>

                        <h2 className="mt-3 text-lg font-semibold">
                          {notification.title}
                        </h2>

                        <p className="mt-2 leading-7 text-slate-400">
                          {notification.message}
                        </p>

                        <p className="mt-3 text-sm text-slate-500">
                          {formatRelativeTime(
                            notification.created_at,
                          )}
                        </p>
                      </div>

                      <div className="flex shrink-0 flex-wrap items-center gap-4">
                        {notification.link && (
                          <Link
                            href={notification.link}
                            className="text-sm font-semibold text-brand-300 transition hover:text-white"
                          >
                            View →
                          </Link>
                        )}

                        {!notification.read && (
                          <form
                            action={markNotificationRead.bind(
                              null,
                              notification.id,
                            )}
                          >
                            <button
                              type="submit"
                              className="text-sm font-medium text-slate-400 transition hover:text-white"
                            >
                              Mark read
                            </button>
                          </form>
                        )}

                        <form
                          action={deleteNotification.bind(
                            null,
                            notification.id,
                          )}
                        >
                          <button
                            type="submit"
                            className="text-sm font-medium text-red-300 transition hover:text-red-200"
                          >
                            Delete
                          </button>
                        </form>
                      </div>
                    </div>
                  </article>
                ),
              )}
            </div>
          )}
        </div>
      </Container>
    </main>
  );
}