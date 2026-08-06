import Container from "@/components/ui/Container";

export default function Footer() {
  return (
    <footer className="border-t border-slate-800 bg-slate-950 py-16 text-slate-300">
      <Container>
        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-xl font-semibold text-white">Justice Pool</p>

            <p className="mt-4 max-w-sm leading-7 text-slate-400">
              Connecting people with verified legal support and transparent
              community funding.
            </p>
          </div>

          <div>
            <p className="font-semibold text-white">Platform</p>

            <div className="mt-4 flex flex-col gap-3 text-sm text-slate-400">
              <a className="transition hover:text-white" href="#">
                Browse Cases
              </a>
              <a className="transition hover:text-white" href="#">
                Submit a Case
              </a>
              <a className="transition hover:text-white" href="#">
                How It Works
              </a>
            </div>
          </div>

          <div>
            <p className="font-semibold text-white">Company</p>

            <div className="mt-4 flex flex-col gap-3 text-sm text-slate-400">
              <a className="transition hover:text-white" href="#">
                About
              </a>
              <a className="transition hover:text-white" href="#">
                Contact
              </a>
              <a className="transition hover:text-white" href="#">
                For Lawyers
              </a>
            </div>
          </div>

          <div>
            <p className="font-semibold text-white">Legal</p>

            <div className="mt-4 flex flex-col gap-3 text-sm text-slate-400">
              <a className="transition hover:text-white" href="#">
                Privacy
              </a>
              <a className="transition hover:text-white" href="#">
                Terms
              </a>
              <a className="transition hover:text-white" href="#">
                Transparency
              </a>
            </div>
          </div>
        </div>

        <div className="mt-14 flex flex-col gap-4 border-t border-slate-800 pt-8 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 Justice Pool. All rights reserved.</p>
          <p>Justice should never depend on wealth.</p>
        </div>
      </Container>
    </footer>
  );
}