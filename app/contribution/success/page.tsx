import Link from "next/link";

import Container from "@/components/ui/Container";

export default function ContributionSuccessPage() {
  return (
    <main className="min-h-screen bg-ink-950 pb-24 pt-32 text-white">
      <Container>
        <div className="mx-auto max-w-xl text-center">
          <p className="text-sm font-medium text-brand-300">
            Payment submitted
          </p>

          <h1 className="mt-5 text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
            Thank you for contributing.
          </h1>

          <p className="mt-6 leading-8 text-slate-400">
            Stripe received your payment. Your contribution
            will be confirmed shortly.
          </p>

          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Link
              href="/dashboard"
              className="rounded-xl bg-brand-500 px-6 py-3 font-semibold transition hover:bg-brand-400"
            >
              View dashboard
            </Link>

            <Link
              href="/cases"
              className="rounded-xl border border-white/10 px-6 py-3 font-semibold text-slate-300 transition hover:bg-white/5 hover:text-white"
            >
              Browse cases
            </Link>
          </div>
        </div>
      </Container>
    </main>
  );
}