import Link from "next/link";
import { redirect } from "next/navigation";

import Container from "@/components/ui/Container";
import { createClient } from "@/lib/supabase-server";

function formatCurrency(amount: number | string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Number(amount) || 0);
}

export default async function AttorneyCasesPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: attorney } = await supabase
    .from("attorneys")
    .select("verified")
    .eq("id", user.id)
    .maybeSingle();

  if (!attorney) {
    redirect("/become-an-attorney");
  }

  const { data: cases, error } = await supabase
    .from("cases")
    .select(
      "id,title,category,description,goal,raised,days_left,assigned_attorney_id",
    )
    .eq("status", "active")
    .is("assigned_attorney_id", null)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (
    <main className="min-h-screen bg-slate-50 py-28">
      <Container>
        <Link
          href="/attorney/dashboard"
          className="text-sm font-medium text-slate-500 hover:text-black"
        >
          ← Back to dashboard
        </Link>

        <h1 className="mt-8 text-5xl font-semibold">
          Available Cases
        </h1>

        <p className="mt-4 text-slate-600">
          Apply to represent claimants seeking legal assistance.
        </p>

        <div className="mt-14 space-y-6">
          {(cases ?? []).map((caseItem) => (
            <article
              key={caseItem.id}
              className="rounded-3xl border bg-white p-8 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-brand-600">
                    {caseItem.category}
                  </p>

                  <h2 className="mt-2 text-2xl font-semibold">
                    {caseItem.title}
                  </h2>

                  <p className="mt-4 max-w-3xl text-slate-600">
                    {caseItem.description}
                  </p>
                </div>

                <div className="text-right">
                  <p className="font-semibold">
                    {formatCurrency(caseItem.raised)}
                  </p>

                  <p className="text-sm text-slate-500">
                    of {formatCurrency(caseItem.goal)}
                  </p>
                </div>
              </div>

              <div className="mt-8 flex items-center justify-between">
                <span className="text-sm text-slate-500">
                  {caseItem.days_left} days remaining
                </span>

                <Link
                  href={`/cases/${caseItem.id}`}
                  className="rounded-xl bg-brand-500 px-5 py-3 font-semibold text-white hover:bg-brand-400"
                >
                  View Case
                </Link>
              </div>
            </article>
          ))}
        </div>
      </Container>
    </main>
  );
}