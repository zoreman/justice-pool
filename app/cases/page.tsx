import Link from "next/link";

import CasesBrowser from "@/components/cases/CasesBrowser";
import Container from "@/components/ui/Container";
import { createClient } from "@/lib/supabase-server";

export default async function CasesPage() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("cases")
    .select(
      "id, title, category, raised, goal, supporters, days_left, views, created_at",
    )
    .eq("status", "active")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }
  

  const cases = data ?? [];

  return (
    <main className="min-h-screen bg-slate-50">
      <section className="bg-ink-950 text-white">
        <Container>
          <div className="pb-12 pt-28 sm:pb-14 sm:pt-32">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm font-medium text-slate-400 transition hover:text-white"
            >
              ← Back to home
            </Link>

            <p className="mt-12 text-sm font-semibold uppercase tracking-[0.22em] text-brand-300">
              Browse cases
            </p>

            <h1 className="mt-5 max-w-3xl text-5xl font-semibold tracking-[-0.05em] sm:text-6xl">
              Verified legal cases.
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-400">
              Find verified cases currently raising funds for legal
              representation.
            </p>
          </div>
        </Container>
      </section>

      <CasesBrowser cases={cases} />
    </main>
  );
}