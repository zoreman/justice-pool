import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import Container from "@/components/ui/Container";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { createClient } from "@/lib/supabase-server";

import {
  acceptAttorneyApplication,
  rejectAttorneyApplication,
} from "./actions";

type ApplicationsPageProps = {
  params: Promise<{
    id: string;
  }>;
};

type AttorneyDetails = {
  id: string;
  full_name: string;
  law_firm: string | null;
  bio: string | null;
  practice_areas: string[] | null;
  years_experience: number | null;
  states: string[] | null;
  verified: boolean;
};

type ApplicationRow = {
  id: number;
  attorney_id: string;
  cover_letter: string | null;
  status: string;
  created_at: string;
};

type ApplicationWithAttorney = ApplicationRow & {
  attorney: AttorneyDetails;
};

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
}

function statusStyles(status: string) {
  switch (status) {
    case "accepted":
      return "bg-emerald-400/10 text-emerald-300";
    case "rejected":
      return "bg-red-400/10 text-red-300";
    default:
      return "bg-amber-400/10 text-amber-300";
  }
}

export default async function CaseApplicationsPage({
  params,
}: ApplicationsPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: caseData, error: caseError } = await supabase
    .from("cases")
    .select(
      "id, title, category, user_id, assigned_attorney_id",
    )
    .eq("id", id)
    .single();

  if (caseError || !caseData) {
    notFound();
  }

  if (caseData.user_id !== user.id) {
    redirect("/dashboard");
  }

  const {
    data: applicationsData,
    error: applicationsError,
  } = await supabaseAdmin
    .from("attorney_applications")
    .select(
      `
        id,
        attorney_id,
        cover_letter,
        status,
        created_at
      `,
    )
    .eq("case_id", caseData.id)
    .order("created_at", { ascending: false });

  if (applicationsError) {
    throw new Error(applicationsError.message);
  }

  const applicationRows =
    (applicationsData ?? []) as ApplicationRow[];

  const attorneyIds = [
    ...new Set(
      applicationRows.map(
        (application) => application.attorney_id,
      ),
    ),
  ];

  let attorneyMap = new Map<string, AttorneyDetails>();

  if (attorneyIds.length > 0) {
    const {
      data: attorneysData,
      error: attorneysError,
    } = await supabaseAdmin
      .from("attorneys")
      .select(
        `
          id,
          full_name,
          law_firm,
          bio,
          practice_areas,
          years_experience,
          states,
          verified
        `,
      )
      .in("id", attorneyIds);

    if (attorneysError) {
      throw new Error(attorneysError.message);
    }

    attorneyMap = new Map(
      ((attorneysData ?? []) as AttorneyDetails[]).map(
        (attorney) => [attorney.id, attorney],
      ),
    );
  }

  const applications = applicationRows.reduce<
    ApplicationWithAttorney[]
  >((results, application) => {
    const attorney = attorneyMap.get(
      application.attorney_id,
    );

    if (!attorney) {
      return results;
    }

    results.push({
      ...application,
      attorney,
    });

    return results;
  }, []);


  return (
    <main className="min-h-screen bg-ink-950 pb-24 pt-28 text-white">
      <Container>
        <div className="mx-auto max-w-5xl">
          <Link
            href="/dashboard"
            className="text-sm font-medium text-slate-400 transition hover:text-white"
          >
            ← Back to dashboard
          </Link>

          <header className="mt-12 border-b border-white/10 pb-10">
            <p className="text-sm font-medium text-brand-300">
              Attorney applications
            </p>

            <h1 className="mt-4 text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
              {caseData.title}
            </h1>

            <p className="mt-4 text-slate-400">
              {caseData.category} · {applications.length}{" "}
              {applications.length === 1
                ? "application"
                : "applications"}
            </p>
          </header>

          {applications.length === 0 ? (
            <div className="py-20 text-center">
              <h2 className="text-2xl font-semibold">
                No applications yet
              </h2>

              <p className="mt-3 text-slate-500">
                Verified attorneys can apply to represent your case.
              </p>
            </div>
          ) : (
            <section className="mt-10 space-y-6">
              {applications.map((application) => {
                const attorney = application.attorney;
                const isPending = application.status === "pending";

                return (
                  <article
                    key={application.id}
                    className="rounded-2xl border border-white/10 bg-white/[0.03] p-7"
                  >
                    <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-3">
                          <h2 className="text-2xl font-semibold">
                            {attorney.full_name}
                          </h2>

                          {attorney.verified && (
                            <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-medium text-emerald-300">
                              Verified
                            </span>
                          )}

                          <span
                            className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${statusStyles(
                              application.status,
                            )}`}
                          >
                            {application.status}
                          </span>
                        </div>

                        <p className="mt-3 text-slate-400">
                          {attorney.law_firm || "Independent attorney"}
                        </p>

                        <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-500">
                          <span>
                            {attorney.years_experience ?? 0} years
                            experience
                          </span>

                          <span>
                            {attorney.states?.join(", ") ||
                              "States not listed"}
                          </span>
                        </div>

                        <div className="mt-5 flex flex-wrap gap-2">
                          {(attorney.practice_areas ?? []).map((area) => (
                            <span
                              key={area}
                              className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-300"
                            >
                              {area}
                            </span>
                          ))}
                        </div>

                        {attorney.bio && (
                          <p className="mt-6 leading-8 text-slate-400">
                            {attorney.bio}
                          </p>
                        )}

                        <div className="mt-7 border-t border-white/10 pt-6">
                          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-300">
                            Cover letter
                          </p>

                          <p className="mt-4 whitespace-pre-line leading-8 text-slate-300">
                            {application.cover_letter ||
                              "No cover letter was provided."}
                          </p>
                        </div>

                        <p className="mt-6 text-sm text-slate-500">
                          Applied {formatDate(application.created_at)}
                        </p>
                      </div>

                      {isPending && !caseData.assigned_attorney_id && (
                        <div className="flex shrink-0 flex-wrap gap-3">
                          <form
                            action={acceptAttorneyApplication.bind(
                              null,
                              caseData.id,
                              application.id,
                            )}
                          >
                            <button
                              type="submit"
                              className="rounded-xl bg-brand-500 px-5 py-3 text-sm font-semibold transition hover:bg-brand-400"
                            >
                              Select attorney
                            </button>
                          </form>

                          <form
                            action={rejectAttorneyApplication.bind(
                              null,
                              caseData.id,
                              application.id,
                            )}
                          >
                            <button
                              type="submit"
                              className="rounded-xl border border-white/10 px-5 py-3 text-sm font-semibold text-slate-300 transition hover:bg-white/5 hover:text-white"
                            >
                              Decline
                            </button>
                          </form>
                        </div>
                      )}
                    </div>
                  </article>
                );
              })}
            </section>
          )}
        </div>
      </Container>
    </main>
  );
}
console.log("PUBLIC APPLICATIONS PAGE LOADED");
