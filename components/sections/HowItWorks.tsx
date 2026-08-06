import Container from "@/components/ui/Container";

const steps = [
  {
    number: "01",
    title: "Tell us what happened",
    description:
      "Submit your case through a guided, secure application designed to capture the information legal reviewers need.",
  },
  {
    number: "02",
    title: "Get independently reviewed",
    description:
      "Qualified professionals review each submission before it becomes eligible for community support.",
  },
  {
    number: "03",
    title: "Receive trusted support",
    description:
      "Approved cases can connect with verified lawyers and raise transparent funding for eligible legal costs.",
  },
];

export default function HowItWorks() {
  return (
    <section className="overflow-hidden bg-white py-28 sm:py-32">
      <Container>
        <div className="grid gap-16 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
          <div className="lg:sticky lg:top-32">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-600">
              How It Works
            </p>

            <h2 className="mt-6 max-w-xl text-4xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-6xl">
              A clearer route from legal need to real support.
            </h2>

            <p className="mt-7 max-w-lg text-lg leading-8 text-slate-600">
              Justice Pool brings case review, lawyer access, and community
              funding into one transparent process.
            </p>

            <div className="relative mt-12 overflow-hidden rounded-[2rem] border border-slate-200 bg-slate-950 p-8 text-white shadow-2xl shadow-slate-950/10">
              <div className="absolute right-0 top-0 h-52 w-52 rounded-full bg-blue-500/20 blur-3xl" />

              <div className="relative">
                <p className="text-sm font-medium text-blue-300">
                  Built for confidence
                </p>

                <p className="mt-4 text-2xl font-semibold leading-9">
                  Every public case goes through review before funding begins.
                </p>

                <div className="mt-10 grid grid-cols-2 gap-4">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                    <p className="text-3xl font-semibold">100%</p>
                    <p className="mt-2 text-sm text-slate-400">
                      Reviewed cases
                    </p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                    <p className="text-3xl font-semibold">24/7</p>
                    <p className="mt-2 text-sm text-slate-400">
                      Progress access
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-5">
            {steps.map((step) => (
              <article
                key={step.number}
                className="group relative overflow-hidden rounded-[2rem] border border-slate-200 bg-slate-50 p-8 transition duration-300 hover:-translate-y-1 hover:border-blue-200 hover:bg-white hover:shadow-2xl hover:shadow-slate-950/10 sm:p-10"
              >
                <div className="absolute right-6 top-2 text-[7rem] font-semibold tracking-[-0.08em] text-slate-200/70 transition group-hover:text-blue-100">
                  {step.number}
                </div>

                <div className="relative max-w-xl">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-950 text-sm font-semibold text-white">
                    {step.number}
                  </div>

                  <h3 className="mt-10 text-3xl font-semibold tracking-[-0.03em] text-slate-950">
                    {step.title}
                  </h3>

                  <p className="mt-5 text-lg leading-8 text-slate-600">
                    {step.description}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}