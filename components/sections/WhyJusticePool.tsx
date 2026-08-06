import Container from "@/components/ui/Container";

const features = [
  {
    number: "01",
    title: "Verified legal professionals",
    description:
      "Lawyers are reviewed before joining the platform, helping applicants and supporters know who they are working with.",
  },
  {
    number: "02",
    title: "Transparent use of funds",
    description:
      "Funding goals, contributions, and case milestones are visible so supporters can understand how money is being used.",
  },
  {
    number: "03",
    title: "Protected case information",
    description:
      "Sensitive documents remain private while applicants control which details are shared with the public.",
  },
  {
    number: "04",
    title: "Access beyond income",
    description:
      "Justice Pool helps remove the financial barriers that prevent people from pursuing fair legal representation.",
  },
];

export default function WhyJusticePool() {
  return (
    <section className="relative overflow-hidden bg-slate-950 py-28 text-white sm:py-32">
      <div className="absolute inset-0">
        <div className="absolute left-0 top-0 h-[500px] w-[500px] rounded-full bg-blue-600/10 blur-[140px]" />
        <div className="absolute bottom-0 right-0 h-[420px] w-[420px] rounded-full bg-cyan-500/10 blur-[120px]" />
      </div>

      <Container>
        <div className="relative">
          <div className="grid gap-16 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-300">
                Why Justice Pool
              </p>

              <h2 className="mt-6 max-w-3xl text-4xl font-semibold tracking-[-0.04em] sm:text-6xl">
                Built for trust at every stage.
              </h2>
            </div>

            <p className="max-w-2xl text-lg leading-8 text-slate-400 lg:justify-self-end">
              Legal crowdfunding only works when applicants, lawyers, and
              supporters can trust the process. Every part of Justice Pool is
              designed around clarity, verification, and control.
            </p>
          </div>

          <div className="mt-20 grid gap-px overflow-hidden rounded-[2rem] border border-white/10 bg-white/10 md:grid-cols-2">
            {features.map((feature) => (
              <article
                key={feature.number}
                className="group relative min-h-[330px] bg-slate-950 p-8 transition duration-300 hover:bg-white/[0.04] sm:p-10"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-blue-300">
                    {feature.number}
                  </span>

                  <div className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 text-xl text-slate-400 transition group-hover:border-blue-400/40 group-hover:text-blue-300">
                    ↗
                  </div>
                </div>

                <div className="mt-24">
                  <h3 className="max-w-md text-3xl font-semibold tracking-[-0.03em]">
                    {feature.title}
                  </h3>

                  <p className="mt-5 max-w-lg leading-7 text-slate-400">
                    {feature.description}
                  </p>
                </div>

                <div className="absolute bottom-0 left-0 h-px w-0 bg-blue-400 transition-all duration-500 group-hover:w-full" />
              </article>
            ))}
          </div>

          <div className="mt-12 flex flex-col gap-6 rounded-[2rem] border border-white/10 bg-white/[0.04] p-8 backdrop-blur sm:flex-row sm:items-center sm:justify-between sm:p-10">
            <div>
              <p className="text-sm font-medium text-blue-300">
                Designed around accountability
              </p>

              <p className="mt-3 max-w-2xl text-2xl font-semibold tracking-[-0.02em]">
                Clear reviews, visible funding, and secure communication in one
                platform.
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-3 text-sm text-slate-300">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
              Platform safeguards active
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}