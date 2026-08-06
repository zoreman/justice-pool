import Link from "next/link";
import { redirect } from "next/navigation";

import Container from "@/components/ui/Container";
import { createClient } from "@/lib/supabase-server";

type AttorneyApplication = {
  id: number;
  status: string;
  created_at: string;
  case:
    | {
        id: string;
        title: string;
        category: string;
        status: string;
      }
    | {
        id: string;
        title: string;
        category: string;
        status: string;
      }[]
    | null;
};

function getRelatedCase(applicationCase: AttorneyApplication["case"]) {
  if (!applicationCase) {
    return null;
  }

  if (Array.isArray(applicationCase)) {
    return applicationCase[0] ?? null;
  }

  return applicationCase;
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
}

function statusLabel(status: string) {
  switch (status) {
    case "pending":
      return "Pending";
    case "accepted":
      return "Accepted";
    case "rejected":
      return "Not selected";
    case "withdrawn":
      return "Withdrawn";
    default:
      return status;
  }
}

function statusStyles(status: string) {
  switch (status) {
    case "accepted":
      return "bg-emerald-400/10 text-emerald-300";
    case "rejected":
      return "bg-red-400/10 text-red-300";
    case "withdrawn":
      return "bg-white/5 text-slate-400";
    default:
      return "bg-amber-400/10 text-amber-300";
  }
}

export default async function AttorneyDashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [
    { data: attorney, error: attorneyError },
    { data: applicationsData, error: applicationsError },
    { data: availableCasesData, error: availableCasesError },
  ] = await Promise.all([
    supabase
      .from("attorneys")
      .select(
        `
          id,
          full_name,
          bio,
          law_firm,
          practice_areas,
          years_experience,
          states,
          license_number,
          verified,
          accepting_cases,
          created_at
        `,
      )
      .eq("id", user.id)
      .maybeSingle(),

    supabase
      .from("attorney_applications")
      .select(
        `
          id,
          status,
          created_at,
          case:cases (
            id,
            title,
            category,
            status
          )
        `,
      )
      .eq("attorney_id", user.id)
      .order("created_at", { ascending: false }),

    supabase
      .from("cases")
      .select("id, title, category, goal, raised, days_left")
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(6),
  ]);

  if (attorneyError) {
    throw new Error(attorneyError.message);
  }

  if (!attorney) {
    redirect("/become-an-attorney");
  }

  if (applicationsError) {
    throw new Error(applicationsError.message);
  }

  if (availableCasesError) {
    throw new Error(availableCasesError.message);
  }

  const applications = ((applicationsData ?? []) as AttorneyApplication[])
    .map((application) => ({
      ...application,
      case: getRelatedCase(application.case),
    }))
    .filter(
      (
        application,
      ): application is Omit<AttorneyApplication, "case"> & {
        case: {
          id: string;
          title: string;
          category: string;
          status: string;
        };
      } => application.case !== null,
    );

  const availableCases = availableCasesData ?? [];

  const pendingApplications = applications.filter(
    (application) => application.status === "pending",
  ).length;

  const acceptedApplications = applications.filter(
    (application) => application.status === "accepted",
  ).length;

  return (
    <main className="min-h-screen bg-ink-950 pb-24 pt-28 text-white">
      <Container>
        <header className="border-b border-white/10 pb-12">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-medium text-brand-300">
                Attorney dashboard
              </p>

              <h1 className="mt-4 text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
                {attorney.full_name}
              </h1>

              <p className="mt-4 max-w-2xl leading-7 text-slate-400">
                Manage your profile, browse active cases, and track your
                representation applications.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/become-an-attorney"
                className="rounded-xl border border-white/10 px-5 py-3 text-sm font-semibold text-slate-300 transition hover:bg-white/5 hover:text-white"
              >
                Edit profile
              </Link>

              <Link
                href="/attorney/cases"
                className="rounded-xl bg-brand-500 px-5 py-3 text-sm font-semibold transition hover:bg-brand-400"
              >
                Browse cases
              </Link>
            </div>
          </div>
        </header>

        <section className="grid gap-6 border-b border-white/10 py-10 sm:grid-cols-4">
          <div>
            <p className="text-3xl font-semibold">
              {attorney.verified ? "Verified" : "Pending"}
            </p>
            <p className="mt-2 text-sm text-slate-500">
              Verification status
            </p>
          </div>

          <div>
            <p className="text-3xl font-semibold">
              {applications.length}
            </p>
            <p className="mt-2 text-sm text-slate-500">
              Total applications
            </p>
          </div>

          <div>
            <p className="text-3xl font-semibold">
              {pendingApplications}
            </p>
            <p className="mt-2 text-sm text-slate-500">
              Pending applications
            </p>
          </div>

          <div>
            <p className="text-3xl font-semibold">
              {acceptedApplications}
            </p>
            <p className="mt-2 text-sm text-slate-500">
              Accepted cases
            </p>
          </div>
        </section>

        <section className="py-14">
          <div className="grid gap-10 lg:grid-cols-[1fr_320px]">
            <div>
              <h2 className="text-2xl font-semibold">
                Your applications
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                Cases you have applied to represent.
              </p>

              {applications.length === 0 ? (
                <div className="mt-8 rounded-2xl border border-dashed border-white/10 px-8 py-14">
                  <p className="text-slate-500">
                    You have not applied to any cases yet.
                  </p>

                  <Link
                    href="/attorney/cases"
                    className="mt-5 inline-flex text-sm font-semibold text-brand-300 transition hover:text-white"
                  >
                    Browse available cases →
                  </Link>
                </div>
              ) : (
                <div className="mt-8 space-y-4">
                  {applications.map((application) => (
                    <article
                      key={application.id}
                      className="rounded-2xl border border-white/10 bg-white/[0.03] p-6"
                    >
                      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-sm text-brand-300">
                            {application.case.category}
                          </p>

                          <h3 className="mt-2 text-xl font-semibold">
                            {application.case.title}
                          </h3>

                          <p className="mt-2 text-sm text-slate-500">
                            Applied {formatDate(application.created_at)}
                          </p>
                        </div>

                        <div className="flex items-center gap-5">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-medium ${statusStyles(
                              application.status,
                            )}`}
                          >
                            {statusLabel(application.status)}
                          </span>

                          <Link
                            href={`/cases/${application.case.id}`}
                            className="text-sm font-semibold text-brand-300 transition hover:text-white"
                          >
                            View case →
                          </Link>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>

            <aside className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-300">
                Profile summary
              </p>

              <dl className="mt-6 space-y-6">
                <div>
                  <dt className="text-sm text-slate-500">Law firm</dt>
                  <dd className="mt-2 text-white">
                    {attorney.law_firm || "Independent"}
                  </dd>
                </div>

                <div>
                  <dt className="text-sm text-slate-500">Experience</dt>
                  <dd className="mt-2 text-white">
                    {attorney.years_experience} years
                  </dd>
                </div>

                <div>
                  <dt className="text-sm text-slate-500">
                    Practice areas
                  </dt>
                  <dd className="mt-2 text-white">
                    {attorney.practice_areas?.join(", ") || "None listed"}
                  </dd>
                </div>

                <div>
                  <dt className="text-sm text-slate-500">
                    Licensed states
                  </dt>
                  <dd className="mt-2 text-white">
                    {attorney.states?.join(", ") || "None listed"}
                  </dd>
                </div>

                <div>
                  <dt className="text-sm text-slate-500">
                    Accepting cases
                  </dt>
                  <dd className="mt-2 text-white">
                    {attorney.accepting_cases ? "Yes" : "No"}
                  </dd>
                </div>
              </dl>
            </aside>
          </div>
        </section>

        <section className="border-t border-white/10 pt-14">
          <div className="flex items-end justify-between gap-6">
            <div>
              <h2 className="text-2xl font-semibold">
                Available cases
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                Recently approved cases seeking legal representation.
              </p>
            </div>

            <Link
              href="/attorney/cases"
              className="text-sm font-semibold text-brand-300 transition hover:text-white"
            >
              View all →
            </Link>
          </div>

          <div className="mt-8 grid gap-5 lg:grid-cols-2">
            {availableCases.map((caseItem) => {
              const raised = Number(caseItem.raised) || 0;
              const goal = Number(caseItem.goal) || 0;

              const progress =
                goal > 0
                  ? Math.min(Math.round((raised / goal) * 100), 100)
                  : 0;

              return (
                <article
                  key={caseItem.id}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] p-6"
                >
                  <p className="text-sm text-brand-300">
                    {caseItem.category}
                  </p>

                  <h3 className="mt-3 text-xl font-semibold">
                    {caseItem.title}
                  </h3>

                  <div className="mt-6">
                    <div className="flex justify-between text-sm text-slate-500">
                      <span>Funding</span>
                      <span>{progress}%</span>
                    </div>

                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-brand-500"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>

                  <div className="mt-6 flex items-center justify-between">
                    <span className="text-sm text-slate-500">
                      {caseItem.days_left} days left
                    </span>

                    <Link
                      href={`/attorney/cases/${caseItem.id}`}
                      className="text-sm font-semibold text-brand-300 transition hover:text-white"
                    >
                      Review case →
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </Container>
    </main>
  );
}