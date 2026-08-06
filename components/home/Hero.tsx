import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Container from "@/components/ui/Container";

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-ink-950">
      <div className="absolute inset-0">
        <div className="absolute left-1/2 top-0 h-[900px] w-[900px] -translate-x-1/2 rounded-full bg-brand-500/15 blur-[180px]" />

        <div className="absolute right-0 top-40 h-[500px] w-[500px] rounded-full bg-accent-400/10 blur-[140px]" />

        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:72px_72px]" />
      </div>

      <Container>
        <div className="relative grid min-h-screen items-center gap-24 py-40 lg:grid-cols-2 lg:py-48">
          <div>
            <Badge>Launching Soon</Badge>

            <h1 className="mt-10 text-6xl font-semibold leading-[0.9] tracking-[-0.06em] text-white sm:text-7xl lg:text-[7rem]">
              Justice
              <br />
              should never
              <br />
              depend on
              <br />
              wealth.
            </h1>

            <p className="mt-12 max-w-xl text-xl leading-9 text-slate-400">
              Justice Pool connects people with trusted lawyers and transparent
              community funding, making legal representation accessible when it
              matters most.
            </p>

            <div className="mt-14 flex flex-col gap-4 sm:flex-row">
              <Button size="lg">Submit Case</Button>

              <Button variant="secondary" size="lg">
                Explore Cases
              </Button>
            </div>

            <div className="mt-16 flex items-center gap-6 text-slate-400">
              <div className="flex -space-x-3">
                <div className="h-10 w-10 rounded-full border-2 border-ink-950 bg-brand-400" />
                <div className="h-10 w-10 rounded-full border-2 border-ink-950 bg-accent-400" />
                <div className="h-10 w-10 rounded-full border-2 border-ink-950 bg-brand-700" />
              </div>

              <p className="max-w-xs text-sm leading-6">
                Trusted by lawyers, nonprofits, and supporters.
              </p>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -left-8 top-10 h-40 w-40 rounded-full bg-brand-400/20 blur-3xl" />

            <div className="relative rounded-[2.5rem] border border-white/10 bg-white/5 p-8 shadow-2xl shadow-black/20 backdrop-blur-xl sm:p-10">
              <div className="flex items-start justify-between gap-6">
                <div>
                  <p className="text-sm text-slate-400">Featured Case</p>

                  <h3 className="mt-2 text-2xl font-semibold text-white">
                    Wrongful Termination
                  </h3>
                </div>

                <div className="rounded-full bg-accent-400/15 px-4 py-2 text-sm font-medium text-accent-400">
                  Verified
                </div>
              </div>

              <div className="mt-12">
                <div className="flex justify-between gap-6 text-sm text-slate-400">
                  <span>Raised</span>
                  <span>$18,500 / $30,000</span>
                </div>

                <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full w-[62%] rounded-full bg-brand-500" />
                </div>
              </div>

              <div className="mt-14 grid gap-6">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
                  <p className="text-sm text-slate-400">Lawyer</p>

                  <p className="mt-3 text-lg font-semibold text-white">
                    Assigned
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
                  <p className="text-sm text-slate-400">Supporters</p>

                  <p className="mt-3 text-lg font-semibold text-white">
                    214 Contributors
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
                  <p className="text-sm text-slate-400">Category</p>

                  <p className="mt-3 text-lg font-semibold text-white">
                    Employment Law
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}