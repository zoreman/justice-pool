import Link from "next/link";
import { redirect } from "next/navigation";

import Container from "@/components/ui/Container";
import { createClient } from "@/lib/supabase-server";

import {
  approveCase,
  beginCaseReview,
  rejectCase,
  requestChanges,
} from "./actions";

type Profile = {
  id: string;
  full_name: string | null;
};

type AdminCase = {
  id: string;
  user_id: string | null;
  title: string;
  description: string;
  story: string | null;
  category: string;
  goal: number | string;
  days_left: number | string | null;
  status: string;
  case_status: string | null;
  created_at: string;
};

function formatCurrency(
  amount: number | string,
) {
  return new Intl.NumberFormat(
    "en-US",
    {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    },
  ).format(Number(amount) || 0);
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat(
    "en-US",
    {
      month: "short",
      day: "numeric",
      year: "numeric",
    },
  ).format(new Date(date));
}

function normalizeStatus(
  status: string | null,
) {
  return String(status ?? "")
    .trim()
    .toLowerCase();
}

function workflowLabel(
  status: string | null,
) {
  switch (
    normalizeStatus(status)
  ) {
    case "submitted":
      return "Awaiting review";

    case "under_review":
      return "Under review";

    case "approved":
      return "Approved";

    default:
      return normalizeStatus(status)
        .replaceAll("_", " ")
        .replace(
          /\b\w/g,
          (letter) =>
            letter.toUpperCase(),
        );
  }
}

function workflowStyles(
  status: string | null,
) {
  switch (
    normalizeStatus(status)
  ) {
    case "submitted":
      return "bg-blue-400/10 text-blue-300";

    case "under_review":
      return "bg-amber-400/10 text-amber-300";

    case "approved":
      return "bg-emerald-400/10 text-emerald-300";

    default:
      return "bg-white/5 text-slate-300";
  }
}

export default async function AdminPage() {
  const supabase =
    await createClient();

  const {
    data: { user },
  } =
    await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const {
    data: adminProfile,
    error: adminProfileError,
  } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (adminProfileError) {
    throw new Error(
      adminProfileError.message,
    );
  }

  if (
    adminProfile?.role !==
    "admin"
  ) {
    redirect("/dashboard");
  }

  /*
   * The admin queue contains cases that
   * still need an admin decision.
   *
   * Both Submitted and Under Review use
   * public status "pending".
   */
  const {
    data,
    error,
  } = await supabase
    .from("cases")
    .select(
      `
        id,
        user_id,
        title,
        description,
        story,
        category,
        goal,
        days_left,
        status,
        case_status,
        created_at
      `,
    )
    .eq("status", "pending")
    .in("case_status", [
      "submitted",
      "under_review",
    ])
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    throw new Error(
      error.message,
    );
  }

  const pendingCases =
    (data ?? []) as AdminCase[];

  const submitterIds = [
    ...new Set(
      pendingCases
        .map(
          (caseItem) =>
            caseItem.user_id,
        )
        .filter(
          (
            id,
          ): id is string =>
            Boolean(id),
        ),
    ),
  ];

  let submitterMap =
    new Map<
      string,
      Profile
    >();

  if (
    submitterIds.length >
    0
  ) {
    const {
      data: profiles,
      error: profilesError,
    } = await supabase
      .from("profiles")
      .select(
        "id, full_name",
      )
      .in(
        "id",
        submitterIds,
      );

    if (profilesError) {
      throw new Error(
        profilesError.message,
      );
    }

    submitterMap =
      new Map(
        (profiles ?? []).map(
          (profile) => [
            profile.id,
            profile as Profile,
          ],
        ),
      );
  }

  const submittedCount =
    pendingCases.filter(
      (caseItem) =>
        normalizeStatus(
          caseItem.case_status,
        ) === "submitted",
    ).length;

  const underReviewCount =
    pendingCases.filter(
      (caseItem) =>
        normalizeStatus(
          caseItem.case_status,
        ) ===
        "under_review",
    ).length;

  return (
    <main className="min-h-screen bg-[#050b18] pb-24 pt-28 text-white">
      <Container>
        <header className="border-b border-white/10 pb-10">
          <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-medium text-brand-300">
                Administration
              </p>

              <h1 className="mt-4 text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
                Case review
              </h1>

              <p className="mt-4 max-w-xl leading-7 text-slate-400">
                Review new case submissions before they are approved and published.
              </p>

              <div className="mt-6 flex flex-wrap gap-3 text-sm">
                <span className="rounded-full bg-blue-400/10 px-3 py-1.5 text-blue-300">
                  {submittedCount} awaiting review
                </span>

                <span className="rounded-full bg-amber-400/10 px-3 py-1.5 text-amber-300">
                  {underReviewCount} under review
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/admin/attorneys"
                className="inline-flex w-fit items-center gap-2 rounded-xl border border-white/10 px-5 py-3 text-sm font-semibold text-slate-300 transition hover:border-white/20 hover:bg-white/5 hover:text-white"
              >
                Review attorneys
              </Link>

              <Link
                href="/dashboard"
                className="inline-flex w-fit items-center gap-2 text-sm font-medium text-slate-400 transition hover:text-white"
              >
                ← Back to dashboard
              </Link>
            </div>
          </div>
        </header>

        <section>
          {pendingCases.length ===
          0 ? (
            <div className="py-24 text-center">
              <h2 className="text-2xl font-semibold">
                Nothing to review
              </h2>

              <p className="mt-3 text-slate-500">
                New case submissions will appear here.
              </p>
            </div>
          ) : (
            <div>
              {pendingCases.map(
                (caseItem) => {
                  const submitter =
                    caseItem.user_id
                      ? submitterMap.get(
                          caseItem.user_id,
                        )
                      : null;

                  const workflowStatus =
                    normalizeStatus(
                      caseItem.case_status,
                    );

                  const isSubmitted =
                    workflowStatus ===
                    "submitted";

                  const isUnderReview =
                    workflowStatus ===
                    "under_review";

                  return (
                    <article
                      key={
                        caseItem.id
                      }
                      className="border-b border-white/10 py-12"
                    >
                      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_280px]">
                        <div>
                          <div className="flex flex-wrap items-center gap-3 text-sm">
                            <span className="text-brand-300">
                              {
                                caseItem.category
                              }
                            </span>

                            <span className="text-slate-700">
                              •
                            </span>

                            <span
                              className={`rounded-full px-3 py-1 text-xs font-medium ${workflowStyles(
                                caseItem.case_status,
                              )}`}
                            >
                              {workflowLabel(
                                caseItem.case_status,
                              )}
                            </span>
                          </div>

                          <h2 className="mt-5 max-w-4xl text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">
                            {
                              caseItem.title
                            }
                          </h2>

                          <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-400">
                            {
                              caseItem.description
                            }
                          </p>

                          {caseItem.story && (
                            <details className="group mt-8 max-w-3xl border-y border-white/10">
                              <summary className="flex cursor-pointer list-none items-center justify-between py-5 text-sm font-medium text-slate-300 transition hover:text-white">
                                Read full submission

                                <span className="transition group-open:rotate-180">
                                  ↓
                                </span>
                              </summary>

                              <div className="border-t border-white/10 py-6">
                                <p className="whitespace-pre-line leading-8 text-slate-400">
                                  {
                                    caseItem.story
                                  }
                                </p>
                              </div>
                            </details>
                          )}

                          <div className="mt-8 flex flex-wrap gap-x-8 gap-y-3 text-sm text-slate-500">
                            <span>
                              Submitted by{" "}
                              <strong className="font-medium text-slate-300">
                                {submitter?.full_name ||
                                  "Unknown user"}
                              </strong>
                            </span>

                            <span>
                              {formatDate(
                                caseItem.created_at,
                              )}
                            </span>
                          </div>
                        </div>

                        <aside className="lg:border-l lg:border-white/10 lg:pl-8">
                          <dl className="space-y-5">
                            <div>
                              <dt className="text-sm text-slate-500">
                                Funding goal
                              </dt>

                              <dd className="mt-1 text-xl font-semibold">
                                {formatCurrency(
                                  caseItem.goal,
                                )}
                              </dd>
                            </div>

                            <div>
                              <dt className="text-sm text-slate-500">
                                Campaign length
                              </dt>

                              <dd className="mt-1 text-xl font-semibold">
                                {Number(
                                  caseItem.days_left,
                                ) || 0}{" "}
                                days
                              </dd>
                            </div>
                          </dl>

                          <div className="mt-8 space-y-3">
                            {/* SUBMITTED */}

                            {isSubmitted && (
                              <>
                                <div className="rounded-xl border border-blue-400/20 bg-blue-400/5 p-4">
                                  <p className="text-sm leading-6 text-blue-200">
                                    This submission has not been opened for formal review yet.
                                  </p>
                                </div>

                                <form
                                  action={beginCaseReview.bind(
                                    null,
                                    caseItem.id,
                                  )}
                                >
                                  <button
                                    type="submit"
                                    className="w-full rounded-xl bg-brand-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-400"
                                  >
                                    Begin review
                                  </button>
                                </form>
                              </>
                            )}

                            {/* UNDER REVIEW */}

                            {isUnderReview && (
                              <>
                                <form
                                  action={approveCase.bind(
                                    null,
                                    caseItem.id,
                                  )}
                                >
                                  <button
                                    type="submit"
                                    className="w-full rounded-xl bg-brand-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-400"
                                  >
                                    Approve case
                                  </button>
                                </form>

                                <form
                                  action={requestChanges.bind(
                                    null,
                                    caseItem.id,
                                  )}
                                  className="border-t border-white/10 pt-5"
                                >
                                  <label
                                    htmlFor={`reviewNotes-${caseItem.id}`}
                                    className="text-xs font-medium text-slate-500"
                                  >
                                    Feedback for applicant
                                  </label>

                                  <textarea
                                    id={`reviewNotes-${caseItem.id}`}
                                    name="reviewNotes"
                                    rows={4}
                                    required
                                    maxLength={
                                      2000
                                    }
                                    placeholder="Explain what the applicant needs to change."
                                    className="mt-3 w-full resize-none rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm leading-6 text-white outline-none transition placeholder:text-slate-600 focus:border-brand-400"
                                  />

                                  <button
                                    type="submit"
                                    className="mt-3 w-full rounded-xl border border-white/10 px-5 py-3 text-sm font-semibold text-slate-300 transition hover:border-white/20 hover:bg-white/5 hover:text-white"
                                  >
                                    Request changes
                                  </button>
                                </form>

                                <form
                                  action={rejectCase.bind(
                                    null,
                                    caseItem.id,
                                  )}
                                >
                                  <button
                                    type="submit"
                                    className="w-full px-5 py-2 text-sm font-medium text-slate-500 transition hover:text-red-300"
                                  >
                                    Reject case
                                  </button>
                                </form>
                              </>
                            )}

                            <Link
                              href={`/cases/${caseItem.id}`}
                              className="flex w-full items-center justify-center px-5 py-2 text-sm font-medium text-slate-500 transition hover:text-white"
                            >
                              Preview case →
                            </Link>
                          </div>
                        </aside>
                      </div>
                    </article>
                  );
                },
              )}
            </div>
          )}
        </section>
      </Container>
    </main>
  );
}