import Link from "next/link";
import { notFound } from "next/navigation";

import CaseUpdateForm from "@/components/cases/CaseUpdateForm";
import CaseViewTracker from "@/components/cases/CaseViewTracker";
import ContributeButton from "@/components/cases/ContributeButton";
import ShareButton from "@/components/cases/ShareButton";
import SupportCaseButton from "@/components/cases/SupportCaseButton";
import CommentForm from "@/components/comments/CommentForm";
import Container from "@/components/ui/Container";
import { createClient } from "@/lib/supabase-server";

import { createCaseUpdate } from "./actions";
import {
  createComment,
  deleteComment,
} from "./comment-actions";

type TimelineEvent = {
  title: string;
  description: string;
};

type CaseUpdate = {
  id: number;
  title: string;
  content: string;
  created_at: string;
};

type RecentSupporter = {
  contribution_id: number;
  supporter_name: string;
  amount: number;
  contributed_at: string;
};

type CaseComment = {
  id: number;
  user_id: string;
  content: string;
  created_at: string;
  commenter_name: string;
};

type CasePageProps = {
  params: Promise<{
    id: string;
  }>;
};

function formatCurrency(amount: number | string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Number(amount) || 0);
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
}

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
    return `${minutes} ${minutes === 1 ? "minute" : "minutes"} ago`;
  }

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;
  }

  const days = Math.floor(hours / 24);

  if (days === 1) {
    return "Yesterday";
  }

  if (days < 7) {
    return `${days} days ago`;
  }

  return formatDate(date);
}

export default async function CasePage({
  params,
}: CasePageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: caseData, error: caseError } = await supabase
    .from("cases")
    .select("*")
    .eq("id", id)
    .single();

   if (caseError) {
  throw new Error(`Case query failed: ${caseError.message}`);
}

if (!caseData) {
  throw new Error(`No case found with ID: ${id}`);
}

  const [
    { data: updatesData, error: updatesError },
    { data: supporterData, error: supporterError },
    { data: commentsData, error: commentsError },
  ] = await Promise.all([
    supabase
      .from("case_updates")
      .select("id, title, content, created_at")
      .eq("case_id", caseData.id)
      .order("created_at", { ascending: false }),

    supabase.rpc("get_recent_case_supporters", {
      case_id_input: caseData.id,
      limit_input: 8,
    }),

    supabase.rpc("get_case_comments", {
      case_id_input: caseData.id,
    }),
  ]);

  if (updatesError) {
    throw new Error(updatesError.message);
  }

  if (supporterError) {
    throw new Error(supporterError.message);
  }

  if (commentsError) {
    throw new Error(commentsError.message);
  }

  let isSupported = false;

  if (user) {
    const { data: supportRecord, error: supportError } =
      await supabase
        .from("case_supporters")
        .select("id")
        .eq("case_id", caseData.id)
        .eq("user_id", user.id)
        .maybeSingle();

    if (supportError) {
      throw new Error(supportError.message);
    }

    isSupported = Boolean(supportRecord);
  }

  const isCaseOwner = user?.id === caseData.user_id;

  const caseUpdates = (updatesData ?? []) as CaseUpdate[];
  const recentSupporters =
    (supporterData ?? []) as RecentSupporter[];
  const comments = (commentsData ?? []) as CaseComment[];

  const timeline = Array.isArray(caseData.timeline)
    ? (caseData.timeline as TimelineEvent[])
    : [];

  const raised = Number(caseData.raised) || 0;
  const goal = Number(caseData.goal) || 0;
  const supporters = Number(caseData.supporters) || 0;
  const views = Number(caseData.views) || 0;
  const shares = Number(caseData.shares) || 0;
  const daysLeft = Number(caseData.days_left) || 0;

  const progress =
    goal > 0
      ? Math.min(Math.round((raised / goal) * 100), 100)
      : 0;

  const attorneyName =
    caseData.attorney_name ?? "Attorney pending";

  const attorneyRole =
    caseData.attorney_role ?? "Legal representative";

  const attorneyExperience =
    caseData.attorney_experience ?? "Information coming soon";

  return (
    <main className="min-h-screen bg-slate-50">
      <CaseViewTracker caseId={caseData.id} />

      <section className="relative overflow-hidden bg-ink-950 pb-24 pt-36 text-white">
        <div className="absolute inset-0">
          <div className="absolute left-1/3 top-0 h-[600px] w-[600px] rounded-full bg-brand-500/15 blur-[160px]" />

          <div className="absolute right-0 top-20 h-[400px] w-[400px] rounded-full bg-accent-400/10 blur-[140px]" />

          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:72px_72px]" />
        </div>

        <Container>
          <div className="relative">
            <Link
              href="/cases"
              className="inline-flex items-center gap-2 text-sm font-medium text-slate-400 transition hover:text-white"
            >
              <span>←</span>
              Back to cases
            </Link>

            <div className="mt-12 grid gap-16 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-start">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="rounded-full bg-brand-500/15 px-4 py-2 text-sm font-semibold text-brand-200">
                    {caseData.category}
                  </span>

                  <span className="flex items-center gap-2 rounded-full bg-accent-400/10 px-4 py-2 text-sm font-medium text-accent-400">
                    <span className="h-2 w-2 rounded-full bg-current shadow-[0_0_10px_currentColor]" />
                    Verified case
                  </span>
                </div>

                <h1 className="mt-8 max-w-4xl break-words text-5xl font-semibold tracking-[-0.05em] sm:text-6xl lg:text-7xl">
                  {caseData.title}
                </h1>

                <p className="mt-8 max-w-2xl text-xl leading-9 text-slate-400">
                  {caseData.description}
                </p>
              </div>

              <aside className="rounded-[2rem] border border-white/10 bg-white/5 p-8 shadow-2xl shadow-black/20 backdrop-blur-xl">
                <div className="flex items-center justify-between text-sm text-slate-400">
                  <span>Funding progress</span>

                  <span className="font-semibold text-white">
                    {progress}%
                  </span>
                </div>

                <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-brand-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>

                <div className="mt-8">
                  <p className="text-sm text-slate-400">
                    Raised
                  </p>

                  <p className="mt-2 text-4xl font-semibold">
                    {formatCurrency(raised)}
                  </p>

                  <p className="mt-2 text-sm text-slate-400">
                    of {formatCurrency(goal)} goal
                  </p>
                </div>

                <div className="mt-8 grid grid-cols-2 gap-x-5 gap-y-6 border-y border-white/10 py-6 sm:grid-cols-4">
                  <div>
                    <p className="text-xs text-slate-400">
                      Supporters
                    </p>

                    <p className="mt-2 text-xl font-semibold">
                      {supporters}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-400">
                      Views
                    </p>

                    <p className="mt-2 text-xl font-semibold">
                      {views}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-400">
                      Shares
                    </p>

                    <p className="mt-2 text-xl font-semibold">
                      {shares}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-400">
                      Days left
                    </p>

                    <p className="mt-2 text-xl font-semibold">
                      {daysLeft}
                    </p>
                  </div>
                </div>

                <ContributeButton
                  caseId={caseData.id}
                  userId={user?.id ?? null}
                />

                <div className="mt-3 grid grid-cols-2 gap-3">
                  <SupportCaseButton
                    caseId={caseData.id}
                    userId={user?.id ?? null}
                    initialSupported={isSupported}
                  />

                  <ShareButton
                    caseId={caseData.id}
                    title={caseData.title}
                  />
                </div>

                <p className="mt-4 text-center text-xs leading-5 text-slate-500">
                  Contributions support approved legal fees and case expenses.
                </p>
              </aside>
            </div>
          </div>
        </Container>
      </section>

      <section className="py-24 sm:py-32">
        <Container>
          <div className="grid gap-16 lg:grid-cols-[minmax(0,1fr)_380px]">
            <div className="min-w-0">
              <section>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-600">
                  Case summary
                </p>

                <h2 className="mt-4 text-3xl font-semibold tracking-[-0.03em] text-ink-950">
                  About this case
                </h2>

                <p className="mt-6 max-w-3xl whitespace-pre-line text-lg leading-9 text-slate-600">
                  {caseData.summary ??
                    "More information about this case will be available soon."}
                </p>
              </section>

              <section className="mt-20">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-600">
                  Timeline
                </p>

                <h2 className="mt-4 text-3xl font-semibold tracking-[-0.03em] text-ink-950">
                  How the case reached this point
                </h2>

                {timeline.length === 0 ? (
                  <p className="mt-8 text-slate-600">
                    Timeline information will be added soon.
                  </p>
                ) : (
                  <div className="mt-10">
                    {timeline.map((event, index) => (
                      <div
                        key={`${event.title}-${index}`}
                        className="relative flex gap-6 pb-10"
                      >
                        {index !== timeline.length - 1 && (
                          <div className="absolute left-[11px] top-7 h-full w-px bg-slate-200" />
                        )}

                        <div className="relative mt-1 h-6 w-6 shrink-0 rounded-full border-4 border-brand-100 bg-brand-500" />

                        <div>
                          <h3 className="text-lg font-semibold text-ink-950">
                            {event.title}
                          </h3>

                          <p className="mt-2 leading-7 text-slate-600">
                            {event.description}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className="mt-20">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-600">
                  Case updates
                </p>

                <h2 className="mt-4 text-3xl font-semibold tracking-[-0.03em] text-ink-950">
                  Latest developments
                </h2>

                {caseUpdates.length === 0 ? (
                  <p className="mt-8 text-slate-600">
                    No updates have been posted yet.
                  </p>
                ) : (
                  <div className="mt-10 space-y-6">
                    {caseUpdates.map((update) => (
                      <article
                        key={update.id}
                        className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
                      >
                        <p className="text-sm text-slate-500">
                          {formatDate(update.created_at)}
                        </p>

                        <h3 className="mt-3 text-xl font-semibold text-ink-950">
                          {update.title}
                        </h3>

                        <p className="mt-4 whitespace-pre-line leading-8 text-slate-600">
                          {update.content}
                        </p>
                      </article>
                    ))}
                  </div>
                )}
              </section>

              <section className="mt-20">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-600">
                  Community support
                </p>

                <h2 className="mt-4 text-3xl font-semibold tracking-[-0.03em] text-ink-950">
                  Recent contributions
                </h2>

                {recentSupporters.length === 0 ? (
                  <div className="mt-8 border-y border-slate-200 py-10">
                    <p className="text-slate-600">
                      No contributions have been recorded yet.
                    </p>
                  </div>
                ) : (
                  <div className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white">
                    {recentSupporters.map((supporter, index) => (
                      <div
                        key={supporter.contribution_id}
                        className={`flex items-center justify-between gap-6 px-6 py-5 ${
                          index > 0
                            ? "border-t border-slate-200"
                            : ""
                        }`}
                      >
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-ink-950">
                            {supporter.supporter_name}
                          </p>

                          <p className="mt-1 text-sm text-slate-500">
                            {formatRelativeTime(
                              supporter.contributed_at,
                            )}
                          </p>
                        </div>

                        <p className="shrink-0 text-lg font-semibold text-ink-950">
                          {formatCurrency(supporter.amount / 100)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className="mt-20">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-600">
                  Discussion
                </p>

                <h2 className="mt-4 text-3xl font-semibold tracking-[-0.03em] text-ink-950">
                  Community comments
                </h2>

                <p className="mt-3 max-w-2xl leading-7 text-slate-600">
                  Ask respectful questions, share encouragement, and discuss
                  updates about this case.
                </p>

                {user ? (
                  <CommentForm
                    caseId={caseData.id}
                    action={createComment}
                  />
                ) : (
                  <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6">
                    <p className="text-slate-600">
                      <Link
                        href="/login"
                        className="font-semibold text-brand-600 transition hover:text-brand-500"
                      >
                        Sign in
                      </Link>{" "}
                      to join the discussion.
                    </p>
                  </div>
                )}

                {comments.length === 0 ? (
                  <div className="mt-10 border-y border-slate-200 py-10">
                    <p className="text-slate-600">
                      No comments have been posted yet.
                    </p>
                  </div>
                ) : (
                  <div className="mt-10 overflow-hidden rounded-2xl border border-slate-200 bg-white">
                    {comments.map((comment, index) => (
                      <article
                        key={comment.id}
                        className={`px-6 py-6 ${
                          index > 0
                            ? "border-t border-slate-200"
                            : ""
                        }`}
                      >
                        <div className="flex items-start justify-between gap-6">
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-ink-950">
                              {comment.commenter_name}
                            </p>

                            <p className="mt-1 text-sm text-slate-500">
                              {formatRelativeTime(comment.created_at)}
                            </p>
                          </div>

                          {user?.id === comment.user_id && (
                            <form
                              action={deleteComment.bind(
                                null,
                                caseData.id,
                                comment.id,
                              )}
                            >
                              <button
                                type="submit"
                                className="text-sm font-medium text-red-600 transition hover:text-red-500"
                              >
                                Delete
                              </button>
                            </form>
                          )}
                        </div>

                        <p className="mt-4 whitespace-pre-line leading-8 text-slate-600">
                          {comment.content}
                        </p>
                      </article>
                    ))}
                  </div>
                )}
              </section>

              {isCaseOwner && (
                <section className="mt-20">
                  <CaseUpdateForm
                    caseId={caseData.id}
                    action={createCaseUpdate}
                  />

                  {caseData.status === "active" && (
                    <Link
                      href={`/cases/${caseData.id}/applications`}
                      className="mt-6 inline-flex rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-ink-950 transition hover:border-brand-500 hover:text-brand-600"
                    >
                      Review attorney applications →
                    </Link>
                  )}
                </section>
              )}
            </div>

            <aside>
              <div className="sticky top-28 rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-600">
                  Assigned attorney
                </p>

                <div className="mt-8 flex items-center gap-4">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-brand-100 text-xl font-semibold text-brand-700">
                    {attorneyName === "Attorney pending"
                      ? "AP"
                      : attorneyName
                          .split(" ")
                          .map((name: string) => name[0])
                          .join("")}
                  </div>

                  <div className="min-w-0">
                    <h3 className="break-words text-xl font-semibold text-ink-950">
                      {attorneyName}
                    </h3>

                    <p className="mt-1 text-sm text-slate-500">
                      {attorneyRole}
                    </p>
                  </div>
                </div>

                <div className="mt-8 border-t border-slate-200 pt-6">
                  <p className="text-sm text-slate-500">
                    Experience
                  </p>

                  <p className="mt-2 font-semibold text-ink-950">
                    {attorneyExperience}
                  </p>
                </div>

                <div className="mt-6 rounded-2xl bg-brand-50 p-5">
                  <p className="text-sm leading-6 text-brand-800">
                    {caseData.assigned_attorney_id
                      ? "This attorney has been selected to represent the claimant."
                      : "A verified attorney has not been selected for this case yet."}
                  </p>
                </div>
              </div>
            </aside>
          </div>
        </Container>
      </section>
    </main>
  );
}