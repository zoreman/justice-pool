import Link from "next/link";
import { redirect } from "next/navigation";

import Container from "@/components/ui/Container";
import { createClient } from "@/lib/supabase-server";
import NotificationLink from "@/components/notifications/NotificationLink";

type SubmittedCase = {
  id: string;
  title: string;
  category: string;
  status: string;
  goal: number | string;
  raised: number | string;
  created_at: string;
};

type FollowedCase = {
  id: string;
  title: string;
  category: string;
  goal: number | string;
  raised: number | string;
  status: string;
};

type SupportRecord = {
  id: number;
  created_at: string;
  case: FollowedCase | FollowedCase[] | null;
};

type ContributionCase = {
  id: string;
  title: string;
};

type ContributionRecord = {
  id: number;
  amount: number;
  status: string;
  created_at: string;
  case: ContributionCase | ContributionCase[] | null;
};

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
}

function formatCurrency(amount: number | string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(Number(amount) || 0);
}

function statusStyles(status: string) {
  switch (status) {
    case "active":
      return "bg-emerald-400/10 text-emerald-300";
    case "pending":
      return "bg-amber-400/10 text-amber-300";
    case "needs_revision":
      return "bg-blue-400/10 text-blue-300";
    case "rejected":
      return "bg-red-400/10 text-red-300";
    default:
      return "bg-white/5 text-slate-300";
  }
}

function statusLabel(status: string) {
  switch (status) {
    case "active":
      return "Approved";
    case "pending":
      return "Pending review";
    case "needs_revision":
      return "Changes requested";
    case "rejected":
      return "Rejected";
    default:
      return status;
  }
}

function getRelatedCase<T>(relatedCase: T | T[] | null): T | null {
  if (!relatedCase) {
    return null;
  }

  if (Array.isArray(relatedCase)) {
    return relatedCase[0] ?? null;
  }

  return relatedCase;
}

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [
    { data: profile },
    { data: submittedData, error: submittedError },
    { data: supportedData, error: supportedError },
    { data: contributionData, error: contributionError },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name, role, created_at")
      .eq("id", user.id)
      .single(),

    supabase
      .from("cases")
      .select("id, title, category, status, goal, raised, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),

    supabase
      .from("case_supporters")
      .select(
        `
          id,
          created_at,
          case:cases (
            id,
            title,
            category,
            goal,
            raised,
            status
          )
        `,
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),

    supabase
      .from("contributions")
      .select(
        `
          id,
          amount,
          status,
          created_at,
          case:cases (
            id,
            title
          )
        `,
      )
      .eq("user_id", user.id)
      .eq("status", "paid")
      .order("created_at", { ascending: false }),
  ]);

  if (submittedError) {
    throw new Error(submittedError.message);
  }

  if (supportedError) {
    throw new Error(supportedError.message);
  }

  if (contributionError) {
    throw new Error(contributionError.message);
  }

  const submittedCases = (submittedData ?? []) as SubmittedCase[];
  const supportRecords = (supportedData ?? []) as SupportRecord[];
  const contributionRecords =
    (contributionData ?? []) as ContributionRecord[];

  const followedCases = supportRecords
    .map((support) => ({
      id: support.id,
      created_at: support.created_at,
      case: getRelatedCase(support.case),
    }))
    .filter(
      (
        support,
      ): support is {
        id: number;
        created_at: string;
        case: FollowedCase;
      } => support.case !== null && support.case.status === "active",
    );

  const contributions = contributionRecords
    .map((contribution) => ({
      id: contribution.id,
      amount: contribution.amount,
      status: contribution.status,
      created_at: contribution.created_at,
      case: getRelatedCase(contribution.case),
    }))
    .filter(
      (
        contribution,
      ): contribution is {
        id: number;
        amount: number;
        status: string;
        created_at: string;
        case: ContributionCase;
      } => contribution.case !== null,
    );

  const totalContributedCents = contributions.reduce(
    (total, contribution) => total + Number(contribution.amount || 0),
    0,
  );

  const totalContributed = totalContributedCents / 100;

  const approvedCases = submittedCases.filter(
    (caseItem) => caseItem.status === "active",
  ).length;

  const pendingCases = submittedCases.filter(
    (caseItem) => caseItem.status === "pending",
  ).length;

  const revisionCases = submittedCases.filter(
    (caseItem) => caseItem.status === "needs_revision",
  ).length;

  const displayName = profile?.full_name?.trim() || "Justice Pool user";

  const stats = [
    {
      label: "Total cases",
      value: submittedCases.length,
    },
    {
      label: "Approved",
      value: approvedCases,
    },
    {
      label: "Pending review",
      value: pendingCases,
    },
    {
      label: "Following",
      value: followedCases.length,
    },
    {
      label: "Contributed",
      value: formatCurrency(totalContributed),
    },
  ];

  return (
    <main className="min-h-screen bg-ink-950 pb-28 pt-28 text-white">
      <Container>
        <header className="pb-14">
          <div className="flex flex-col gap-10 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-4xl">
              <p className="text-sm font-medium text-brand-300">
                Dashboard
              </p>

              <h1 className="mt-5 text-4xl font-semibold tracking-[-0.04em] sm:text-5xl lg:text-6xl">
                {displayName}
              </h1>

              <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-400">
                Manage your legal campaigns, followed cases, and contributions.
              </p>

              <div className="mt-7 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-500">
                <span>
                  {submittedCases.length}{" "}
                  {submittedCases.length === 1 ? "case" : "cases"} submitted
                </span>

                <span className="text-slate-700">•</span>

                <span>
                  {followedCases.length}{" "}
                  {followedCases.length === 1 ? "case" : "cases"} followed
                </span>

                {profile?.created_at && (
                  <>
                    <span className="text-slate-700">•</span>

                    <span>
                      Member since {formatDate(profile.created_at)}
                    </span>
                  </>
                )}
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-3 lg:pt-8">
  <NotificationLink variant="dashboard" />

  {profile?.role === "admin" && (
    <Link
      href="/admin"
      className="rounded-xl border border-white/10 px-5 py-3 text-sm font-semibold text-slate-300 transition hover:border-white/20 hover:bg-white/5 hover:text-white"
    >
      Admin
    </Link>
  )}

  {profile?.role === "attorney" && (
    <Link
      href="/attorney/dashboard"
      className="rounded-xl border border-white/10 px-5 py-3 text-sm font-semibold text-slate-300 transition hover:border-white/20 hover:bg-white/5 hover:text-white"
    >
      Attorney Dashboard
    </Link>
  )}

  {profile?.role !== "admin" && profile?.role !== "attorney" && (
    <Link
      href="/become-an-attorney"
      className="rounded-xl border border-white/10 px-5 py-3 text-sm font-semibold text-slate-300 transition hover:border-white/20 hover:bg-white/5 hover:text-white"
    >
      Become an Attorney
    </Link>
  )}

  <Link
    href="/profile"
    className="rounded-xl border border-white/10 px-5 py-3 text-sm font-semibold text-slate-300 transition hover:border-white/20 hover:bg-white/5 hover:text-white"
  >
    Profile
  </Link>

  <Link
    href="/submit-case"
    className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-400"
  >
    <span>+</span>
    Submit case
  </Link>
</div>
          </div>
        </header>

        <section className="border-y border-white/10 py-9">
          <div className="grid grid-cols-2 gap-x-8 gap-y-9 sm:grid-cols-5">
            {stats.map((stat) => (
              <div key={stat.label} className="min-w-0">
                <p className="text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">
                  {stat.value}
                </p>

                <p className="mt-2 text-sm leading-5 text-slate-500">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="py-16">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-3xl font-semibold tracking-[-0.03em]">
                Your cases
              </h2>

              <p className="mt-3 text-slate-500">
                Your latest submissions and review updates.
              </p>
            </div>

            <Link
              href="/cases"
              className="text-sm font-medium text-slate-400 transition hover:text-white"
            >
              Browse public cases →
            </Link>
          </div>

          {submittedCases.length === 0 ? (
            <div className="mt-10 rounded-2xl border border-dashed border-white/10 px-8 py-16 text-center">
              <h3 className="text-xl font-semibold">
                No submitted cases
              </h3>

              <p className="mt-3 text-slate-500">
                Submit a case when you are ready to request legal support.
              </p>
            </div>
          ) : (
            <div className="mt-10 space-y-5">
              {submittedCases.map((caseItem) => (
                <article
                  key={caseItem.id}
                  className="rounded-2xl border border-white/10 bg-white/[0.025] px-7 py-7"
                >
                  <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <h3 className="text-xl font-semibold sm:text-2xl">
                        {caseItem.title}
                      </h3>

                      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-3 text-sm">
                        <span className="text-slate-500">
                          {caseItem.category}
                        </span>

                        <span
                          className={`rounded-full px-3 py-1 text-xs font-medium ${statusStyles(
                            caseItem.status,
                          )}`}
                        >
                          {statusLabel(caseItem.status)}
                        </span>

                        <span className="text-slate-500">
                          Submitted {formatDate(caseItem.created_at)}
                        </span>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-8">
                      <div>
                        <p className="text-xs text-slate-500">
                          Funding goal
                        </p>

                        <p className="mt-2 text-lg font-semibold">
                          {formatCurrency(caseItem.goal)}
                        </p>
                      </div>

                      <Link
                        href={
                          caseItem.status === "needs_revision"
                            ? `/cases/${caseItem.id}/edit`
                            : `/cases/${caseItem.id}`
                        }
                        className="text-sm font-semibold text-brand-300 transition hover:text-white"
                      >
                        {caseItem.status === "needs_revision"
                          ? "Edit case →"
                          : "View case →"}
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="border-t border-white/10 py-16">
          <div>
            <h2 className="text-3xl font-semibold tracking-[-0.03em]">
              Your contributions
            </h2>

            <p className="mt-3 text-slate-500">
              Completed payments you have made to legal campaigns.
            </p>
          </div>

          {contributions.length === 0 ? (
            <div className="mt-10 rounded-2xl border border-dashed border-white/10 px-8 py-12">
              <p className="text-slate-500">
                You have not made any contributions yet.
              </p>

              <Link
                href="/cases"
                className="mt-5 inline-flex text-sm font-semibold text-brand-300 transition hover:text-white"
              >
                Browse cases →
              </Link>
            </div>
          ) : (
            <div className="mt-10 overflow-hidden rounded-2xl border border-white/10">
              {contributions.map((contribution, index) => (
                <article
                  key={contribution.id}
                  className={`flex flex-col gap-6 px-7 py-6 sm:flex-row sm:items-center sm:justify-between ${
                    index > 0 ? "border-t border-white/10" : ""
                  }`}
                >
                  <div>
                    <Link
                      href={`/cases/${contribution.case.id}`}
                      className="text-lg font-semibold transition hover:text-brand-300"
                    >
                      {contribution.case.title}
                    </Link>

                    <p className="mt-2 text-sm text-slate-500">
                      Paid {formatDate(contribution.created_at)}
                    </p>
                  </div>

                  <div className="flex items-center gap-5">
                    <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-medium text-emerald-300">
                      Paid
                    </span>

                    <p className="text-xl font-semibold">
                      {formatCurrency(contribution.amount / 100)}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="border-t border-white/10 pt-16">
          <h2 className="text-3xl font-semibold tracking-[-0.03em]">
            Followed cases
          </h2>

          <p className="mt-3 text-slate-500">
            Active cases you have chosen to follow.
          </p>

          {followedCases.length === 0 ? (
            <div className="mt-10 rounded-2xl border border-dashed border-white/10 px-8 py-12">
              <p className="text-slate-500">
                You are not following any cases yet.
              </p>
            </div>
          ) : (
            <div className="mt-10 grid gap-5 lg:grid-cols-2">
              {followedCases.map((support) => {
                const caseItem = support.case;
                const goal = Number(caseItem.goal) || 0;
                const raised = Number(caseItem.raised) || 0;

                const progress =
                  goal > 0
                    ? Math.min(Math.round((raised / goal) * 100), 100)
                    : 0;

                return (
                  <article
                    key={support.id}
                    className="rounded-2xl border border-white/10 bg-white/[0.025] p-7"
                  >
                    <p className="text-sm font-medium text-brand-300">
                      {caseItem.category}
                    </p>

                    <h3 className="mt-4 text-xl font-semibold">
                      {caseItem.title}
                    </h3>

                    <div className="mt-7">
                      <div className="flex justify-between text-sm text-slate-500">
                        <span>Funding progress</span>
                        <span>{progress}%</span>
                      </div>

                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                        <div
                          className="h-full rounded-full bg-brand-500"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>

                    <Link
                      href={`/cases/${caseItem.id}`}
                      className="mt-7 inline-flex text-sm font-semibold text-brand-300 transition hover:text-white"
                    >
                      View case →
                    </Link>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </Container>
    </main>
  );
}