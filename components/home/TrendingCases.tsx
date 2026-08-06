import Link from "next/link";

import Container from "@/components/ui/Container";

type TrendingCase = {
  id: string;
  title: string;
  category: string;
  raised: number | string;
  goal: number | string;
  supporters: number | string;
  views: number | string;
  days_left: number;
};

type TrendingCasesProps = {
  cases: TrendingCase[];
};

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function TrendingCases({
  cases,
}: TrendingCasesProps) {
  return (
    <section
      id="cases"
      className="bg-slate-50 py-24 sm:py-32"
    >
      <Container>
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-600">
              Trending cases
            </p>

            <h2 className="mt-4 max-w-3xl text-4xl font-semibold tracking-[-0.04em] text-ink-950 sm:text-5xl">
              Campaigns gaining momentum.
            </h2>

            <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
              Explore verified legal cases receiving the most attention and
              community support.
            </p>
          </div>

          <Link
            href="/cases"
            className="text-sm font-semibold text-brand-600 transition hover:text-brand-500"
          >
            Browse all cases →
          </Link>
        </div>

        {cases.length === 0 ? (
          <div className="mt-12 rounded-2xl border border-slate-200 bg-white px-8 py-16 text-center">
            <h3 className="text-2xl font-semibold text-ink-950">
              No active cases yet
            </h3>

            <p className="mt-3 text-slate-500">
              Approved campaigns will appear here.
            </p>
          </div>
        ) : (
          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            {cases.map((item, index) => {
              const raised = Number(item.raised) || 0;
              const goal = Number(item.goal) || 0;
              const supporters = Number(item.supporters) || 0;
              const views = Number(item.views) || 0;

              const progress =
                goal > 0
                  ? Math.min(Math.round((raised / goal) * 100), 100)
                  : 0;

              return (
                <Link
                  key={item.id}
                  href={`/cases/${item.id}`}
                  className="group flex min-w-0 flex-col rounded-2xl border border-slate-200 bg-white p-7 shadow-sm transition hover:-translate-y-1 hover:border-slate-300 hover:shadow-lg"
                >
                  <div className="flex items-center justify-between gap-4">
                    <span className="rounded-full bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700">
                      {item.category}
                    </span>

                    <span className="text-xs font-semibold text-slate-400">
                      #{index + 1}
                    </span>
                  </div>

                  <h3 className="mt-7 text-2xl font-semibold leading-tight tracking-[-0.03em] text-ink-950">
                    {item.title}
                  </h3>

                  <div className="mt-8">
                    <div className="flex items-center justify-between text-sm text-slate-500">
                      <span>Funding progress</span>
                      <span>{progress}%</span>
                    </div>

                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-brand-500"
                        style={{ width: `${progress}%` }}
                      />
                    </div>

                    <div className="mt-5 flex items-end justify-between gap-4">
                      <p className="text-2xl font-semibold text-ink-950">
                        {formatCurrency(raised)}
                      </p>

                      <p className="text-sm text-slate-500">
                        of {formatCurrency(goal)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-auto grid grid-cols-3 gap-3 border-t border-slate-200 pt-6 text-xs text-slate-500">
                    <span>
                      {supporters}{" "}
                      {supporters === 1 ? "supporter" : "supporters"}
                    </span>

                    <span className="text-center">
                      {views} {views === 1 ? "view" : "views"}
                    </span>

                    <span className="text-right">
                      {item.days_left} days
                    </span>
                  </div>

                  <div className="mt-6 flex items-center justify-between text-sm font-semibold text-brand-600">
                    View case

                    <span className="transition-transform group-hover:translate-x-1">
                      →
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </Container>
    </section>
  );
}