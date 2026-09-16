import Link from "next/link";
import { notFound } from "next/navigation";

import {
  ConsultationActionForm,
  RescheduleConsultationForm,
} from "@/components/cases/ConsultationControls";
import CaseActionButton from "@/components/cases/CaseActionButton";
import CaseClosureForm from "@/components/cases/CaseClosureForm";
import CaseConsultationForm from "@/components/cases/CaseConsultationForm";
import CaseDocumentRequestForm from "@/components/cases/CaseDocumentRequestForm";
import CaseDocumentUpload from "@/components/cases/CaseDocumentUpload";
import CaseProgressTracker from "@/components/cases/CaseProgressTracker";
import CaseResolutionForm from "@/components/cases/CaseResolutionForm";
import CaseStatusForm from "@/components/cases/CaseStatusForm";
import CaseUpdateForm from "@/components/cases/CaseUpdateForm";
import CaseViewTracker from "@/components/cases/CaseViewTracker";
import ContributeButton from "@/components/cases/ContributeButton";
import ShareButton from "@/components/cases/ShareButton";
import SupportCaseButton from "@/components/cases/SupportCaseButton";
import CommentForm from "@/components/comments/CommentForm";
import Container from "@/components/ui/Container";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { createClient } from "@/lib/supabase-server";

import { createCaseUpdate } from "./actions";
import {
  createComment,
  deleteComment,
} from "./comment-actions";
import {
  acceptConsultation,
  cancelConsultation,
  declineConsultation,
  proposeConsultation,
  rescheduleConsultation,
} from "./consultation-actions";
import {
  cancelDocumentRequest,
  createDocumentRequest,
} from "./document-request-actions";
import {
  deleteCaseDocument,
  markDocumentsComplete,
} from "./document-actions";
import {
  closeCase,
  moveToHearing,
  resolveCase,
  startNegotiation,
  updateCaseStatus,
} from "./status-actions";

type CaseStatusUpdate = {
  id: number;
  status: string;
  note: string | null;
  created_at: string;
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

type CaseDocumentRequest = {
  id: number;
  requested_by: string;
  requested_from: string;
  category: string;
  note: string | null;
  status: string;
  created_at: string;
  fulfilled_at: string | null;
};

type CaseDocument = {
  id: number;
  uploader_id: string;
  file_name: string;
  storage_path: string;
  mime_type: string | null;
  file_size: number | null;
  category: string;
  created_at: string;
};

type DocumentUploader = {
  id: string;
  full_name: string | null;
};

type CaseConsultation = {
  id: number;
  attorney_id: string;
  client_id: string;
  scheduled_for: string;
  duration_minutes: number;
  meeting_type: string;
  location_or_link: string | null;
  note: string | null;
  status: string;
  created_at: string;
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

function formatStatus(status: string) {
  return status
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function documentCategoryLabel(category: string) {
  return category
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatConsultationDate(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(date));
}

function consultationTypeLabel(type: string) {
  switch (type) {
    case "video":
      return "Video call";

    case "phone":
      return "Phone call";

    case "in_person":
      return "In person";

    default:
      return formatStatus(type);
  }
}

function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center">
      <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-lg text-slate-400">
        —
      </div>

      <h3 className="mt-4 font-semibold text-ink-950">
        {title}
      </h3>

      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
        {description}
      </p>
    </div>
  );
}

export default async function CasePage({
  params,
}: CasePageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const {
    data: caseData,
    error: caseError,
  } = await supabase
    .from("cases")
    .select("*")
    .eq("id", id)
    .single();

  if (caseError || !caseData) {
    notFound();
  }

  const [
    { data: updatesData, error: updatesError },
    { data: supporterData, error: supporterError },
    { data: commentsData, error: commentsError },
    { data: statusUpdatesData, error: statusUpdatesError },
    { data: documentsData, error: documentsError },
    { data: documentRequestsData, error: documentRequestsError },
    { data: consultationsData, error: consultationsError },
  ] = await Promise.all([
    supabase
      .from("case_updates")
      .select(
        `
          id,
          title,
          content,
          created_at
        `,
      )
      .eq("case_id", caseData.id)
      .order("created_at", {
        ascending: false,
      }),

    supabase.rpc("get_recent_case_supporters", {
      case_id_input: caseData.id,
      limit_input: 8,
    }),

    supabase.rpc("get_case_comments", {
      case_id_input: caseData.id,
    }),

    supabaseAdmin
      .from("case_status_updates")
      .select(
        `
          id,
          status,
          note,
          created_at
        `,
      )
      .eq("case_id", caseData.id)
      .order("created_at", {
        ascending: true,
      }),

    supabase
      .from("case_documents")
      .select(
        `
          id,
          uploader_id,
          file_name,
          storage_path,
          mime_type,
          file_size,
          category,
          created_at
        `,
      )
      .eq("case_id", caseData.id)
      .order("created_at", {
        ascending: false,
      }),

    supabase
      .from("case_document_requests")
      .select(
        `
          id,
          requested_by,
          requested_from,
          category,
          note,
          status,
          created_at,
          fulfilled_at
        `,
      )
      .eq("case_id", caseData.id)
      .order("created_at", {
        ascending: false,
      }),

    supabase
      .from("case_consultations")
      .select(
        `
          id,
          attorney_id,
          client_id,
          scheduled_for,
          duration_minutes,
          meeting_type,
          location_or_link,
          note,
          status,
          created_at
        `,
      )
      .eq("case_id", caseData.id)
      .order("created_at", {
        ascending: false,
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

  if (statusUpdatesError) {
    throw new Error(statusUpdatesError.message);
  }

  if (documentsError) {
    throw new Error(documentsError.message);
  }

  if (documentRequestsError) {
    throw new Error(documentRequestsError.message);
  }

  if (consultationsError) {
    throw new Error(consultationsError.message);
  }

  let isSupported = false;

  if (user) {
    const {
      data: supportRecord,
      error: supportError,
    } = await supabase
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

  const isCaseOwner =
    user?.id === caseData.user_id;

  const isAssignedAttorney = Boolean(
    user &&
      caseData.assigned_attorney_id === user.id,
  );

  const canManageCase =
    isCaseOwner || isAssignedAttorney;

  const caseUpdates =
    (updatesData ?? []) as CaseUpdate[];

  const caseStatusUpdates =
    (statusUpdatesData ?? []) as CaseStatusUpdate[];

  const recentSupporters =
    (supporterData ?? []) as RecentSupporter[];

  const comments =
    (commentsData ?? []) as CaseComment[];

  const caseDocuments =
    (documentsData ?? []) as CaseDocument[];

  const documentRequests =
    (documentRequestsData ?? []) as CaseDocumentRequest[];

  const consultations =
    (consultationsData ?? []) as CaseConsultation[];

  const currentConsultation =
    consultations.find(
      (consultation) =>
        consultation.status === "proposed" ||
        consultation.status === "accepted",
    ) ?? null;

  const documentUploaderIds = [
    ...new Set(
      caseDocuments.map(
        (document) => document.uploader_id,
      ),
    ),
  ];

  const uploaderMap =
    new Map<string, DocumentUploader>();

  if (documentUploaderIds.length > 0) {
    const {
      data: uploaderProfiles,
      error: uploaderProfilesError,
    } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name")
      .in("id", documentUploaderIds);

    if (uploaderProfilesError) {
      throw new Error(
        uploaderProfilesError.message,
      );
    }

    for (const profile of
      (uploaderProfiles ?? []) as DocumentUploader[]) {
      uploaderMap.set(
        profile.id,
        profile,
      );
    }
  }

  const documentsWithUrls =
    canManageCase
      ? await Promise.all(
          caseDocuments.map(
            async (document) => {
              const {
                data,
                error,
              } = await supabase.storage
                .from("case-documents")
                .createSignedUrl(
                  document.storage_path,
                  60 * 60,
                );

              return {
                ...document,
                signedUrl: error
                  ? null
                  : data.signedUrl,
              };
            },
          ),
        )
      : [];

  const raised =
    Number(caseData.raised) || 0;

  const goal =
    Number(caseData.goal) || 0;

  const supporters =
    Number(caseData.supporters) || 0;

  const views =
    Number(caseData.views) || 0;

  const shares =
    Number(caseData.shares) || 0;

  const daysLeft =
    Number(caseData.days_left) || 0;

  const progress =
    goal > 0
      ? Math.min(
          Math.round(
            (raised / goal) * 100,
          ),
          100,
        )
      : 0;

  const attorneyName =
    caseData.attorney_name ??
    "Attorney pending";

  const attorneyRole =
    caseData.attorney_role ??
    "Legal representative";

  const attorneyExperience =
    caseData.attorney_experience ??
    "Information coming soon";

  return (
    <main className="min-h-screen bg-slate-50">
      <CaseViewTracker
        caseId={caseData.id}
      />

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

                  {caseData.verified ? (
  <span className="flex items-center gap-2 rounded-full bg-accent-400/10 px-4 py-2 text-sm font-medium text-accent-400">
    <span className="h-2 w-2 rounded-full bg-current shadow-[0_0_10px_currentColor]" />
    Verified case
  </span>
) : (
  <span className="flex items-center gap-2 rounded-full bg-amber-400/10 px-4 py-2 text-sm font-medium text-amber-300">
    <span className="h-2 w-2 rounded-full bg-current" />
    Pending verification
  </span>
)}
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
                  <span>
                    Funding progress
                  </span>

                  <span className="font-semibold text-white">
                    {progress}%
                  </span>
                </div>

                <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-brand-500"
                    style={{
                      width: `${progress}%`,
                    }}
                  />
                </div>

                <div className="mt-8">
                  <p className="text-sm text-slate-400">
                    Raised
                  </p>

                  <p className="mt-2 text-4xl font-semibold">
                    {formatCurrency(
                      raised,
                    )}
                  </p>

                  <p className="mt-2 text-sm text-slate-400">
                    of{" "}
                    {formatCurrency(
                      goal,
                    )}{" "}
                    goal
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
                  userId={
                    user?.id ?? null
                  }
                />

                <div className="mt-3 grid grid-cols-2 gap-3">
                  <SupportCaseButton
                    caseId={caseData.id}
                    userId={
                      user?.id ?? null
                    }
                    initialSupported={
                      isSupported
                    }
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
                <CaseProgressTracker
                  status={
                    caseData.case_status
                  }
                />
              </section>

              <section className="mt-20">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-600">
                  Timeline
                </p>

                <h2 className="mt-4 text-3xl font-semibold tracking-[-0.03em] text-ink-950">
                  Case progress
                </h2>

                {caseStatusUpdates.length === 0 ? (
                  <EmptyState
  title="No progress updates yet"
  description="Case milestones and status changes will appear here as the case moves forward."
/>
                ) : (
                  <div className="mt-10">
                    {caseStatusUpdates.map(
                      (update, index) => (
                        <div
                          key={update.id}
                          className="relative flex gap-6 pb-10"
                        >
                          {index !==
                            caseStatusUpdates.length -
                              1 && (
                            <div className="absolute left-[11px] top-7 h-full w-px bg-slate-200" />
                          )}

                          <div className="relative mt-1 h-6 w-6 shrink-0 rounded-full border-4 border-brand-100 bg-brand-500" />

                          <div className="min-w-0">
                            <h3 className="text-lg font-semibold text-ink-950">
                              {formatStatus(
                                update.status,
                              )}
                            </h3>

                            {update.note && (
                              <p className="mt-2 whitespace-pre-line leading-7 text-slate-600">
                                {update.note}
                              </p>
                            )}

                            <p className="mt-2 text-sm text-slate-400">
                              {formatDate(
                                update.created_at,
                              )}
                            </p>
                          </div>
                        </div>
                      ),
                    )}
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
                  <EmptyState
  title="No case updates yet"
  description="New developments from the claimant or legal team will appear here."
/>
                ) : (
                  <div className="mt-10 space-y-6">
                    {caseUpdates.map(
                      (update) => (
                        <article
                          key={update.id}
                          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
                        >
                          <p className="text-sm text-slate-500">
                            {formatDate(
                              update.created_at,
                            )}
                          </p>

                          <h3 className="mt-3 text-xl font-semibold text-ink-950">
                            {update.title}
                          </h3>

                          <p className="mt-4 whitespace-pre-line leading-8 text-slate-600">
                            {update.content}
                          </p>
                        </article>
                      ),
                    )}
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
                  <EmptyState
  title="Be the first to contribute"
  description="Contributions to this case will appear here once supporters begin helping fund its legal expenses."
/>
                ) : (
                  <div className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white">
                    {recentSupporters.map(
                      (
                        supporter,
                        index,
                      ) => (
                        <div
                          key={
                            supporter.contribution_id
                          }
                          className={`flex items-center justify-between gap-6 px-6 py-5 ${
                            index > 0
                              ? "border-t border-slate-200"
                              : ""
                          }`}
                        >
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-ink-950">
                              {
                                supporter.supporter_name
                              }
                            </p>

                            <p className="mt-1 text-sm text-slate-500">
                              {formatRelativeTime(
                                supporter.contributed_at,
                              )}
                            </p>
                          </div>

                          <p className="shrink-0 text-lg font-semibold text-ink-950">
                            {formatCurrency(
                              supporter.amount /
                                100,
                            )}
                          </p>
                        </div>
                      ),
                    )}
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
                  Ask respectful questions, share encouragement, and discuss updates about this case.
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
                  <EmptyState
  title="No comments yet"
  description={
    user
      ? "Start the conversation by leaving a respectful comment or question."
      : "Community discussion will appear here once people begin commenting."
  }
/>
                ) : (
                  <div className="mt-10 overflow-hidden rounded-2xl border border-slate-200 bg-white">
                    {comments.map(
                      (
                        comment,
                        index,
                      ) => (
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
                                {
                                  comment.commenter_name
                                }
                              </p>

                              <p className="mt-1 text-sm text-slate-500">
                                {formatRelativeTime(
                                  comment.created_at,
                                )}
                              </p>
                            </div>

                            {user?.id ===
                              comment.user_id && (
                              <form
                                action={deleteComment.bind(
                                  null,
                                  caseData.id,
                                  comment.id,
                                )}
                              >
                                <CaseActionButton
  label="Delete"
  pendingLabel="Deleting..."
  variant="textDanger"
/>
                              </form>
                            )}
                          </div>

                          <p className="mt-4 whitespace-pre-line leading-8 text-slate-600">
                            {comment.content}
                          </p>
                        </article>
                      ),
                    )}
                  </div>
                )}
              </section>

              {canManageCase &&
                caseData.case_status !==
                  "closed" && (
                  <section className="mt-20 space-y-6">
                    {/* CONSULTATION */}

                    {currentConsultation && (
                      <div className="rounded-2xl border border-slate-200 bg-white p-6">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div>
                            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-600">
                              Consultation
                            </p>

                            <h3 className="mt-3 text-xl font-semibold text-ink-950">
                              Upcoming consultation
                            </h3>
                          </div>

                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${
                              currentConsultation.status ===
                              "accepted"
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-amber-50 text-amber-700"
                            }`}
                          >
                            {currentConsultation.status ===
                            "accepted"
                              ? "Accepted"
                              : "Awaiting response"}
                          </span>
                        </div>

                        <div className="mt-6 grid gap-5 sm:grid-cols-2">
                          <div>
                            <p className="text-xs font-medium uppercase tracking-[0.12em] text-slate-400">
                              Date & time
                            </p>

                            <p className="mt-2 font-semibold text-ink-950">
                              {formatConsultationDate(
                                currentConsultation.scheduled_for,
                              )}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs font-medium uppercase tracking-[0.12em] text-slate-400">
                              Duration
                            </p>

                            <p className="mt-2 font-semibold text-ink-950">
                              {
                                currentConsultation.duration_minutes
                              }{" "}
                              minutes
                            </p>
                          </div>

                          <div>
                            <p className="text-xs font-medium uppercase tracking-[0.12em] text-slate-400">
                              Meeting type
                            </p>

                            <p className="mt-2 font-semibold text-ink-950">
                              {consultationTypeLabel(
                                currentConsultation.meeting_type,
                              )}
                            </p>
                          </div>

                          {currentConsultation.location_or_link && (
                            <div>
                              <p className="text-xs font-medium uppercase tracking-[0.12em] text-slate-400">
                                Meeting details
                              </p>

                              {currentConsultation.meeting_type ===
                                "video" &&
                              /^https?:\/\//i.test(
                                currentConsultation.location_or_link,
                              ) ? (
                                <a
                                  href={
                                    currentConsultation.location_or_link
                                  }
                                  target="_blank"
                                  rel="noreferrer"
                                  className="mt-2 inline-flex break-all font-semibold text-brand-600 transition hover:text-brand-500"
                                >
                                  Open meeting link →
                                </a>
                              ) : (
                                <p className="mt-2 break-words font-semibold text-ink-950">
                                  {
                                    currentConsultation.location_or_link
                                  }
                                </p>
                              )}
                            </div>
                          )}
                        </div>

                        {currentConsultation.note && (
                          <div className="mt-6 rounded-xl bg-slate-50 p-4">
                            <p className="whitespace-pre-line text-sm leading-7 text-slate-600">
                              {
                                currentConsultation.note
                              }
                            </p>
                          </div>
                        )}

                        {/* CLAIMANT CONTROLS */}

                        {isCaseOwner &&
                          currentConsultation.status ===
                            "proposed" && (
                            <div className="mt-6 border-t border-slate-200 pt-6">
                              <p className="text-sm font-medium text-amber-700">
                                Your attorney is waiting for your response.
                              </p>

                              <div className="mt-4 flex flex-wrap gap-3">
                                <ConsultationActionForm
                                  action={acceptConsultation.bind(
                                    null,
                                    caseData.id,
                                    currentConsultation.id,
                                  )}
                                  label="Accept consultation"
                                  pendingLabel="Accepting..."
                                />

                                <ConsultationActionForm
                                  action={declineConsultation.bind(
                                    null,
                                    caseData.id,
                                    currentConsultation.id,
                                  )}
                                  label="Decline"
                                  pendingLabel="Declining..."
                                  variant="danger"
                                />
                              </div>
                            </div>
                          )}

                        {isCaseOwner &&
                          currentConsultation.status ===
                            "accepted" && (
                            <div className="mt-6 rounded-xl bg-emerald-50 p-4">
                              <p className="text-sm font-medium text-emerald-700">
                                You accepted this consultation.
                              </p>
                            </div>
                          )}

                        {/* ATTORNEY CONTROLS */}

                        {isAssignedAttorney && (
                          <div className="mt-6 border-t border-slate-200 pt-6">
                            {currentConsultation.status ===
                              "proposed" && (
                              <p className="text-sm text-slate-500">
                                Waiting for the claimant to accept or decline.
                              </p>
                            )}

                            {currentConsultation.status ===
                              "accepted" && (
                              <div className="rounded-xl bg-emerald-50 p-4">
                                <p className="text-sm font-medium text-emerald-700">
                                  The claimant accepted this consultation.
                                </p>
                              </div>
                            )}

                            <div className="mt-5">
                              <ConsultationActionForm
                                action={cancelConsultation.bind(
                                  null,
                                  caseData.id,
                                  currentConsultation.id,
                                )}
                                label="Cancel consultation"
                                pendingLabel="Cancelling..."
                                variant="danger"
                              />
                            </div>

                            <details className="mt-5 rounded-xl border border-slate-200 bg-slate-50/60 p-5">
                              <summary className="cursor-pointer select-none text-sm font-semibold text-ink-950">
                                Reschedule consultation
                              </summary>

                              <p className="mt-3 text-sm leading-6 text-slate-500">
                                Sending a new time will require the claimant to accept the consultation again.
                              </p>

                              <RescheduleConsultationForm
                                action={rescheduleConsultation.bind(
                                  null,
                                  caseData.id,
                                  currentConsultation.id,
                                )}
                                consultationId={String(
                                  currentConsultation.id,
                                )}
                                durationMinutes={
                                  currentConsultation.duration_minutes
                                }
                                meetingType={
                                  currentConsultation.meeting_type
                                }
                                locationOrLink={
                                  currentConsultation.location_or_link
                                }
                                note={
                                  currentConsultation.note
                                }
                              />
                            </details>
                          </div>
                        )}
                      </div>
                    )}

                    {/* DOCUMENT REQUESTS */}

                    <div className="rounded-2xl border border-slate-200 bg-white p-6">
                      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-600">
                        Document requests
                      </p>

                      <h3 className="mt-3 text-xl font-semibold text-ink-950">
                        Requested files
                      </h3>

                      <p className="mt-2 text-sm leading-6 text-slate-500">
                        Documents requested by the assigned attorney for this case.
                      </p>

                      {documentRequests.length === 0 ? (
                        <EmptyState
  title="No document requests"
  description={
    isAssignedAttorney
      ? "You haven't requested any documents from the claimant yet."
      : "Your attorney hasn't requested any additional documents yet."
  }
/>
                      ) : (
                        <div className="mt-6 space-y-3">
                          {documentRequests.map(
                            (request) => (
                              <div
                                key={request.id}
                                className="rounded-xl border border-slate-200 px-4 py-4"
                              >
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                  <p className="font-semibold text-ink-950">
                                    {documentCategoryLabel(
                                      request.category,
                                    )}
                                  </p>

                                  <span
                                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                      request.status ===
                                      "fulfilled"
                                        ? "bg-emerald-50 text-emerald-700"
                                        : request.status ===
                                            "cancelled"
                                          ? "bg-slate-100 text-slate-500"
                                          : "bg-amber-50 text-amber-700"
                                    }`}
                                  >
                                    {request.status ===
                                    "fulfilled"
                                      ? "Fulfilled"
                                      : request.status ===
                                          "cancelled"
                                        ? "Cancelled"
                                        : "Pending"}
                                  </span>
                                </div>

                                {request.note && (
                                  <p className="mt-3 whitespace-pre-line leading-7 text-slate-600">
                                    {request.note}
                                  </p>
                                )}

                                <p className="mt-3 text-sm text-slate-400">
                                  Requested{" "}
                                  {formatDate(
                                    request.created_at,
                                  )}
                                </p>

                                {request.fulfilled_at && (
                                  <p className="mt-1 text-sm text-emerald-600">
                                    Fulfilled{" "}
                                    {formatDate(
                                      request.fulfilled_at,
                                    )}
                                  </p>
                                )}

                                {isAssignedAttorney &&
                                  request.status ===
                                    "pending" && (
                                     <form
  action={cancelDocumentRequest.bind(
    null,
    caseData.id,
    request.id,
  )}
  className="mt-4"
>
  <CaseActionButton
    label="Cancel request"
    pendingLabel="Cancelling..."
    variant="danger"
  />
</form>
                                  )}
                              </div>
                            ),
                          )}
                        </div>
                      )}
                    </div>

                    {isAssignedAttorney && (
                      <CaseDocumentRequestForm
                        caseId={
                          caseData.id
                        }
                        action={
                          createDocumentRequest
                        }
                      />
                    )}

                    {/* PRIVATE DOCUMENTS */}

                    <div className="rounded-2xl border border-slate-200 bg-white p-6">
                      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-600">
                        Private documents
                      </p>

                      <h3 className="mt-3 text-xl font-semibold text-ink-950">
                        Case files
                      </h3>

                      <p className="mt-2 text-sm leading-6 text-slate-500">
                        These files are only available to the claimant and assigned attorney.
                      </p>

                      {documentsWithUrls.length === 0 ? (
                        <EmptyState
  title="No case files yet"
  description="Documents securely shared between the claimant and assigned attorney will appear here."
/>
                      ) : (
                        <div className="mt-6 space-y-3">
                          {documentsWithUrls.map(
                            (document) => (
                              <div
                                key={document.id}
                                className="flex flex-col gap-4 rounded-xl border border-slate-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                              >
                                <div className="min-w-0">
                                  <p className="truncate font-semibold text-ink-950">
                                    {
                                      document.file_name
                                    }
                                  </p>

                                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                                    <span>
                                      {documentCategoryLabel(
                                        document.category,
                                      )}
                                    </span>

                                    <span>
                                      {document.uploader_id ===
                                      caseData.user_id
                                        ? "Claimant"
                                        : document.uploader_id ===
                                            caseData.assigned_attorney_id
                                          ? "Attorney"
                                          : "Participant"}
                                    </span>

                                    <span>
                                      {uploaderMap.get(
                                        document.uploader_id,
                                      )?.full_name ||
                                        "Unknown uploader"}
                                    </span>

                                    <span>
                                      {formatDate(
                                        document.created_at,
                                      )}
                                    </span>

                                    <span>
                                      {document.file_size
                                        ? `${Math.round(
                                            document.file_size /
                                              1024,
                                          )} KB`
                                        : "File"}
                                    </span>
                                  </div>
                                </div>

                                <div className="flex shrink-0 items-center gap-2">
                                  {document.signedUrl ? (
                                    <a
                                      href={
                                        document.signedUrl
                                      }
                                      target="_blank"
                                      rel="noreferrer"
                                      className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-brand-500 hover:text-brand-600"
                                    >
                                      Open
                                    </a>
                                  ) : (
                                    <span className="text-sm text-slate-400">
                                      Unavailable
                                    </span>
                                  )}

                                  {document.uploader_id ===
                                    user!.id && (
                                    <form
  action={deleteCaseDocument.bind(
    null,
    caseData.id,
    document.id,
  )}
>
  <CaseActionButton
    label="Delete"
    pendingLabel="Deleting..."
    variant="danger"
  />
</form>
                                  )}
                                </div>
                              </div>
                            ),
                          )}
                        </div>
                      )}
                    </div>

                    <CaseDocumentUpload
                      caseId={caseData.id}
                      userId={user!.id}
                    />

                    {isAssignedAttorney &&
                      caseData.case_status ===
                        "documents_requested" && (
                        <div className="rounded-2xl border border-slate-200 bg-white p-6">
                          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-600">
                            Document review
                          </p>

                          <h3 className="mt-3 text-xl font-semibold text-ink-950">
                            Required documents complete?
                          </h3>

                          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                            Once all requested documents have been received and reviewed,
                            confirm that the case is ready for filing preparation.
                          </p>

                          <form
  action={markDocumentsComplete.bind(
    null,
    caseData.id,
  )}
  className="mt-5"
>
  <CaseActionButton
    label="Mark documents complete"
    pendingLabel="Updating..."
  />
</form>
                        </div>
                      )}

                    {/* ATTORNEY CAN PROPOSE CONSULTATION */}

                    {isAssignedAttorney &&
                      !currentConsultation &&
                      (caseData.case_status ===
                        "attorney_assigned" ||
                        caseData.case_status ===
                          "consultation_scheduled") && (
                        <CaseConsultationForm
                          caseId={
                            caseData.id
                          }
                          action={
                            proposeConsultation
                          }
                        />
                      )}

                    {isAssignedAttorney &&
                      caseData.case_status ===
                        "filed" && (
                        <div className="rounded-2xl border border-slate-200 bg-white p-6">
                          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-600">
                            Post-filing
                          </p>

                          <h3 className="mt-3 text-xl font-semibold text-ink-950">
                            What happens next?
                          </h3>

                          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                            The filing has been submitted. Choose the next stage based on how the case is proceeding.
                          </p>

                          <div className="mt-6 grid gap-3 sm:grid-cols-2">
                            <form
  action={startNegotiation.bind(
    null,
    caseData.id,
  )}
>
  <CaseActionButton
    label="Start negotiation"
    pendingLabel="Starting..."
    fullWidth
  />
</form>

                            <form
  action={moveToHearing.bind(
    null,
    caseData.id,
  )}
>
  <CaseActionButton
    label="Move to hearing"
    pendingLabel="Updating..."
    variant="secondary"
    fullWidth
  />
</form>
                          </div>

                          <p className="mt-4 text-xs leading-5 text-slate-400">
                            Negotiation is for cases entering settlement discussions. Choose hearing when the matter needs to proceed toward a court hearing.
                          </p>
                        </div>
                      )}

                    {isAssignedAttorney &&
                      (caseData.case_status ===
                        "negotiation" ||
                        caseData.case_status ===
                          "hearing") && (
                        <CaseResolutionForm
                          caseId={
                            caseData.id
                          }
                          action={
                            resolveCase
                          }
                        />
                      )}

                    {(isCaseOwner ||
                      isAssignedAttorney) &&
                      caseData.case_status ===
                        "resolved" && (
                        <CaseClosureForm
                          caseId={
                            caseData.id
                          }
                          isCaseOwner={
                            isCaseOwner
                          }
                          isAssignedAttorney={
                            isAssignedAttorney
                          }
                          action={
                            closeCase
                          }
                        />
                      )}

                    <CaseStatusForm
                      caseId={
                        caseData.id
                      }
                      currentStatus={
                        caseData.case_status
                      }
                      isCaseOwner={
                        isCaseOwner
                      }
                      isAssignedAttorney={
                        isAssignedAttorney
                      }
                      action={
                        updateCaseStatus
                      }
                    />

                    {isCaseOwner && (
                      <CaseUpdateForm
                        caseId={
                          caseData.id
                        }
                        action={
                          createCaseUpdate
                        }
                      />
                    )}

                    {isCaseOwner &&
                      caseData.status ===
                        "active" && (
                        <Link
                          href={`/cases/${caseData.id}/applications`}
                          className="inline-flex rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-ink-950 transition hover:border-brand-500 hover:text-brand-600"
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
                    {attorneyName ===
                    "Attorney pending"
                      ? "AP"
                      : attorneyName
                          .split(" ")
                          .map(
                            (
                              name: string,
                            ) =>
                              name[0],
                          )
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

                {caseData.assigned_attorney_id &&
                  user && (
                    <Link
                      href="/messages"
                      className="mt-5 flex w-full items-center justify-center rounded-xl bg-ink-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                    >
                      Open messages
                    </Link>
                  )}
              </div>
            </aside>
          </div>
        </Container>
      </section>
    </main>
  );
}