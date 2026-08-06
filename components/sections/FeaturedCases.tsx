import Link from "next/link";
import Container from "@/components/ui/Container";

const featuredCases = [
  {
    id: "wrongful-termination",
    title: "Wrongful Termination",
    description:
      "A warehouse employee is seeking representation after reporting unsafe working conditions.",
    category: "Employment Law",
    raised: 18500,
    goal: 30000,
    supporters: 214,
    daysLeft: 11,
  },
  {
    id: "unlawful-eviction",
    title: "Unlawful Eviction",
    description:
      "A single parent is challenging an eviction filed after requesting essential apartment repairs.",
    category: "Housing Law",
    raised: 8200,
    goal: 20000,
    supporters: 96,
    daysLeft: 19,
  },
  {
    id: "disability-discrimination",
    title: "Disability Discrimination",
    description:
      "A qualified applicant is pursuing a workplace discrimination claim after being denied accommodations.",
    category: "Civil Rights",
    raised: 12400,
    goal: 25000,
    supporters: 148,
    daysLeft: 15,
  },
];

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function FeaturedCases() {
  return (
    <section id="cases" className="bg-slate-50 py-28 sm:py-32">
      <Container>
        <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-brand-600">
              Featured cases
            </p>

            <h2 className="mt-5 max-w-3xl text-4xl font-semibold tracking-[-0.04em] text-ink-950 sm:text-5xl">
              Help someone access the legal support they deserve.
            </h2>
          </div>

          <p className="max-w-md text-lg leading-8 text-slate-600">
            Every case is reviewed before appearing on the platform, giving
            supporters a clear and transparent way to contribute.
          </p>
        </div>

        <div className="mt-16 grid gap-7 lg:grid-cols-3">
          {featuredCases.map((item, index) => {
            const progress = Math.min(
              Math.round((item.raised / item.goal) * 100),
              100,
            );

            return (
              <article
                key={item.id}
                className={`group relative flex min-h-[500px] flex-col overflow-hidden rounded-[2rem] border p-8 transition duration-300 hover:-translate-y-2 ${
                  index === 0
                    ? "border-white/10 bg-ink-950 text-white shadow-2xl shadow-slate-950/15"
                    : "border-slate-200 bg-white text-ink-950 shadow-sm hover:shadow-2xl hover:shadow-slate-900/10"
                }`}
              >
                {index === 0 && (
                  <>
                    <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-brand-500/20 blur-3xl" />
                    <div className="absolute -bottom-24 -left-20 h-64 w-64 rounded-full bg-accent-400/10 blur-3xl" />
                  </>
                )}

                <div className="relative flex h-full flex-col">
                  <div className="flex items-center justify-between gap-4">
                    <span
                      className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                        index === 0
                          ? "bg-white/10 text-brand-200"
                          : "bg-brand-50 text-brand-700"
                      }`}
                    >
                      {item.category}
                    </span>

                    <span
                      className={`flex items-center gap-2 text-xs font-medium ${
                        index === 0 ? "text-accent-400" : "text-emerald-600"
                      }`}
                    >
                      <span className="h-2 w-2 rounded-full bg-current shadow-[0_0_10px_currentColor]" />
                      Verified
                    </span>
                  </div>

                  <h3 className="mt-8 text-2xl font-semibold tracking-[-0.03em]">
                    {item.title}
                  </h3>

                  <p
                    className={`mt-4 leading-7 ${
                      index === 0 ? "text-slate-400" : "text-slate-600"
                    }`}
                  >
                    {item.description}
                  </p>

                  <div className="mt-10">
                    <div
                      className={`flex items-center justify-between text-sm ${
                        index === 0 ? "text-slate-400" : "text-slate-500"
                      }`}
                    >
                      <span>Funding progress</span>
                      <span className="font-semibold">{progress}%</span>
                    </div>

                    <div
                      className={`mt-4 h-2.5 overflow-hidden rounded-full ${
                        index === 0 ? "bg-white/10" : "bg-slate-100"
                      }`}
                    >
                      <div
                        className="h-full rounded-full bg-brand-500 transition-all duration-700"
                        style={{ width: `${progress}%` }}
                      />
                    </div>

                    <div className="mt-5 flex items-end justify-between gap-4">
                      <div>
                        <p
                          className={`text-sm ${
                            index === 0 ? "text-slate-400" : "text-slate-500"
                          }`}
                        >
                          Raised
                        </p>

                        <p className="mt-1 text-2xl font-semibold">
                          {formatCurrency(item.raised)}
                        </p>
                      </div>

                      <p
                        className={`text-sm ${
                          index === 0 ? "text-slate-400" : "text-slate-500"
                        }`}
                      >
                        of {formatCurrency(item.goal)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-auto pt-10">
                    <div
                      className={`flex items-center justify-between border-t pt-6 text-sm ${
                        index === 0
                          ? "border-white/10 text-slate-400"
                          : "border-slate-200 text-slate-500"
                      }`}
                    >
                      <span>{item.supporters} supporters</span>
                      <span>{item.daysLeft} days remaining</span>
                    </div>

                    <Link
                      href={`/cases/${item.id}`}
                      className={`mt-8 flex w-full items-center justify-between rounded-2xl px-5 py-4 text-sm font-semibold transition ${
                        index === 0
                          ? "bg-[#EAF3FF] text-brand-700 hover:bg-white"
                          : "bg-ink-950 text-white hover:bg-brand-600"
                      }`}
                    >
                      View case

                      <span className="transition-transform duration-200 group-hover:translate-x-1">
                        →
                      </span>
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        <div className="mt-12 flex justify-center">
          <Link
            href="/cases"
            className="rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-ink-950 transition hover:border-brand-300 hover:bg-brand-50"
          >
            Explore all cases
          </Link>
        </div>
      </Container>
    </section>
  );
}