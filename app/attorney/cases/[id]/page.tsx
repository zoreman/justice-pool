import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import ApplyToCaseForm from "@/components/attorney/ApplyToCaseForm";
import Container from "@/components/ui/Container";
import { createClient } from "@/lib/supabase-server";

import { applyToCase } from "./actions";

type AttorneyCasePageProps = {
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

export default async function AttorneyCasePage({
  params,
}: AttorneyCasePageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [
    { data: attorney, error: attorneyError },
    { data: caseData, error: caseError },
    {
      data: existingApplication,
      error: applicationError,
    },
  ] = await Promise.all([
    supabase
      .from("attorneys")
      .select("id, verified, accepting_cases")
      .eq("id", user.id)
      .maybeSingle(),

    supabase
      .from("cases")
      .select(
        `
          id,
          title,
          category,
          description,
          summary,
          goal,
          raised,
          supporters,
          days_left,
          status,
          assigned_attorney_id
        `,
      )
      .eq("id", id)
      .single(),

    supabase
      .from("attorney_applications")
      .select(
        "id, status, cover_letter, created_at",
      )
      .eq("attorney_id", user.id)
      .eq("case_id", id)
      .maybeSingle(),
  ]);

  if (attorneyError) {
    throw new Error(attorneyError.message);
  }

  if (!attorney) {
    redirect("/become-an-attorney");
  }

  if (caseError || !caseData) {
    notFound();
  }

  if (applicationError) {
    throw new Error(applicationError.message);
  }

  if (
    caseData.status !== "active" ||
    caseData.assigned_attorney_id
  ) {
    notFound();
  }

  const raised =
    Number(caseData.raised) || 0;

  const goal =
    Number(caseData.goal) || 0;

  const supporters =
    Number(caseData.supporters) || 0;

  const progress =
    goal > 0
      ? Math.min(
          Math.round(
            (raised / goal) * 100,
          ),
          100,
        )
      : 0;

  return (
    <main className="min-h-screen bg-ink-950 pb-24 pt-28 text-white">
      <Container>
        <div className="mx-auto max-w-5xl">
          <Link
            href="/attorney/cases"
            className="text-sm font-medium text-slate-400 transition hover:text-white"
          >
            ← Back to available cases
          </Link>

          <div className="mt-12 grid gap-12 lg:grid-cols-[minmax(0,1fr)_340px]">
            <section>
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-full bg-brand-500/10 px-3 py-1.5 text-xs font-semibold text-brand-300">
                  {caseData.category}
                </span>

                <span className="text-xs font-medium text-emerald-300">
                  Active case
                </span>
              </div>

              <h1 className="mt-6 text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
                {caseData.title}
              </h1>

              <p className="mt-6 text-lg leading-8 text-slate-400">
                {caseData.description}
              </p>

              <div className="mt-12 border-t border-white/10 pt-10">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-300">
                  Case summary
                </p>

                <p className="mt-5 whitespace-pre-line leading-8 text-slate-300">
                  {caseData.summary ??
                    "Additional case information is not available yet."}
                </p>
              </div>

              <section className="mt-14 border-t border-white/10 pt-10">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-300">
                  Representation application
                </p>

                {!attorney.verified ? (
                  <div className="mt-6 rounded-2xl border border-amber-400/20 bg-amber-400/[0.06] p-6">
                    <h2 className="font-semibold text-amber-100">
                      Verification required
                    </h2>

                    <p className="mt-2 leading-7 text-amber-100/70">
                      Your license must be
                      verified before you can
                      apply to represent this
                      case.
                    </p>
                  </div>
                ) : !attorney.accepting_cases ? (
                  <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
                    <h2 className="font-semibold">
                      You are not accepting new
                      cases
                    </h2>

                    <p className="mt-2 text-slate-400">
                      Update your attorney
                      profile before submitting
                      an application.
                    </p>
                  </div>
                ) : existingApplication ? (
                  <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
                    <p className="text-sm text-slate-500">
                      Application status
                    </p>

                    <p className="mt-2 font-semibold capitalize text-amber-300">
                      {
                        existingApplication.status
                      }
                    </p>

                    <p className="mt-6 whitespace-pre-line leading-8 text-slate-300">
                      {
                        existingApplication.cover_letter
                      }
                    </p>
                  </div>
                ) : (
                  <ApplyToCaseForm
                    caseId={caseData.id}
                    action={applyToCase}
                  />
                )}
              </section>
            </section>

            <aside>
              <div className="sticky top-28 rounded-2xl border border-white/10 bg-white/[0.03] p-7">
                <p className="text-sm text-slate-500">
                  Funding progress
                </p>

                <div className="mt-3 flex items-center justify-between">
                  <p className="text-3xl font-semibold">
                    {formatCurrency(raised)}
                  </p>

                  <p className="text-sm text-slate-400">
                    {progress}%
                  </p>
                </div>

                <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-brand-500"
                    style={{
                      width: `${progress}%`,
                    }}
                  />
                </div>

                <p className="mt-3 text-sm text-slate-500">
                  of {formatCurrency(goal)}{" "}
                  goal
                </p>

                <dl className="mt-8 space-y-6 border-t border-white/10 pt-6">
                  <div>
                    <dt className="text-sm text-slate-500">
                      Supporters
                    </dt>

                    <dd className="mt-1 text-xl font-semibold">
                      {supporters}
                    </dd>
                  </div>

                  <div>
                    <dt className="text-sm text-slate-500">
                      Time remaining
                    </dt>

                    <dd className="mt-1 text-xl font-semibold">
                      {caseData.days_left}{" "}
                      days
                    </dd>
                  </div>
                </dl>

                <Link
                  href={`/cases/${caseData.id}`}
                  className="mt-8 inline-flex text-sm font-semibold text-brand-300 transition hover:text-white"
                >
                  View public case page →
                </Link>
              </div>
            </aside>
          </div>
        </div>
      </Container>
    </main>
  );
}