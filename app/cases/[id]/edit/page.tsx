import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import EditCaseForm from "@/components/cases/EditCaseForm";
import Container from "@/components/ui/Container";
import { createClient } from "@/lib/supabase-server";

type EditCasePageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditCasePage({
  params,
}: EditCasePageProps) {
  const { id } = await params;

  const supabase = await createClient();

  /*
   * Make sure the user is signed in.
   */
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  /*
   * Load the case.
   */
  const {
    data: caseData,
    error: caseError,
  } = await supabase
    .from("cases")
    .select(
      `
        id,
        title,
        category,
        goal,
        summary,
        story,
        days_left,
        user_id,
        status,
        case_status,
        review_notes
      `,
    )
    .eq("id", id)
    .single();

  if (caseError || !caseData) {
    notFound();
  }

  /*
   * Only the person who submitted the case
   * can edit it.
   */
  if (caseData.user_id !== user.id) {
    redirect("/dashboard");
  }

  /*
   * Closed cases can never be edited.
   */
  if (caseData.case_status === "closed") {
    redirect(`/cases/${id}`);
  }

  /*
   * This page is specifically for cases where
   * the admin requested revisions.
   */
  if (
    caseData.status !== "needs_revision" &&
    caseData.case_status !== "needs_revision"
  ) {
    redirect(`/cases/${id}`);
  }

  return (
    <main className="min-h-screen bg-ink-950 pb-28 pt-28 text-white">
      <Container>
        <div className="mx-auto max-w-3xl">
          <Link
            href="/dashboard"
            className="text-sm font-medium text-slate-400 transition hover:text-white"
          >
            ← Back to dashboard
          </Link>

          <header className="mt-10 border-b border-white/10 pb-10">
            <p className="text-sm font-medium text-brand-300">
              Case revisions
            </p>

            <h1 className="mt-4 text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
              Update your case
            </h1>

            <p className="mt-5 max-w-2xl leading-7 text-slate-400">
              An administrator reviewed your case
              and requested changes before it can
              be approved.
            </p>
          </header>

          {caseData.review_notes && (
            <section className="my-10 rounded-2xl border border-amber-400/20 bg-amber-400/[0.06] p-6">
              <p className="text-sm font-semibold text-amber-300">
                Review feedback
              </p>

              <p className="mt-3 whitespace-pre-line leading-7 text-slate-300">
                {caseData.review_notes}
              </p>
            </section>
          )}

          <section
            className={
              caseData.review_notes
                ? "pb-10"
                : "py-10"
            }
          >
            <EditCaseForm
              caseData={{
                id: caseData.id,
                title: caseData.title,
                category: caseData.category,
                goal: Number(caseData.goal),
                summary: caseData.summary,
                story: caseData.story,
                days_left: Number(
                  caseData.days_left,
                ),
              }}
            />
          </section>
        </div>
      </Container>
    </main>
  );
}