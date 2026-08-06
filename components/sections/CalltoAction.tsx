import Button from "@/components/ui/Button";
import Container from "@/components/ui/Container";

export default function CallToAction() {
  return (
    <section className="bg-white py-32">
      <Container>
        <div className="relative overflow-hidden rounded-[40px] border border-slate-200 bg-slate-950 px-10 py-20 shadow-[0_40px_120px_rgba(15,23,42,0.25)] sm:px-20">

          {/* Background Glow */}
          <div className="absolute inset-0">
            <div className="absolute left-0 top-0 h-[450px] w-[450px] rounded-full bg-blue-600/15 blur-[140px]" />

            <div className="absolute right-0 bottom-0 h-[350px] w-[350px] rounded-full bg-cyan-400/10 blur-[120px]" />

            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:56px_56px]" />
          </div>

          <div className="relative mx-auto max-w-4xl text-center">

            <span className="rounded-full border border-blue-400/30 bg-blue-500/10 px-4 py-2 text-sm font-medium text-blue-300">
              Ready to get started?
            </span>

            <h2 className="mt-8 text-5xl font-semibold tracking-[-0.05em] text-white sm:text-7xl">
              Everyone deserves
              <br />
              access to justice.
            </h2>

            <p className="mx-auto mt-8 max-w-2xl text-xl leading-9 text-slate-400">
              Whether you're seeking legal representation or supporting someone
              who is, Justice Pool makes the process transparent, secure, and
              accessible.
            </p>

            <div className="mt-14 flex flex-col justify-center gap-5 sm:flex-row">
              <Button size="lg">
                Submit a Case
              </Button>

              <Button variant="secondary" size="lg">
                Explore Cases
              </Button>
            </div>

            <div className="mt-16 flex flex-wrap justify-center gap-12">

              <div>
                <p className="text-4xl font-bold text-white">100%</p>
                <p className="mt-2 text-slate-500">
                  Verified Lawyers
                </p>
              </div>

              <div>
                <p className="text-4xl font-bold text-white">24/7</p>
                <p className="mt-2 text-slate-500">
                  Case Tracking
                </p>
              </div>

              <div>
                <p className="text-4xl font-bold text-white">Secure</p>
                <p className="mt-2 text-slate-500">
                  Encrypted Documents
                </p>
              </div>

            </div>

          </div>
        </div>
      </Container>
    </section>
  );
}