import Link from "next/link";
import { redirect } from "next/navigation";

import Container from "@/components/ui/Container";
import { createClient } from "@/lib/supabase-server";

import { createAttorneyProfile } from "./actions";

export default async function BecomeAttorneyPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: attorney } = await supabase
    .from("attorneys")
    .select(
      `
        full_name,
        bio,
        law_firm,
        practice_areas,
        years_experience,
        states,
        license_number
      `,
    )
    .eq("id", user.id)
    .maybeSingle();

  return (
    <main className="min-h-screen bg-ink-950 pb-24 pt-28 text-white">
      <Container>
        <div className="mx-auto max-w-3xl">
          <Link
            href="/dashboard"
            className="text-sm font-medium text-slate-400 transition hover:text-white"
          >
            ← Back to dashboard
          </Link>

          <header className="mt-12 border-b border-white/10 pb-10">
            <p className="text-sm font-medium text-brand-300">
              Attorney network
            </p>

            <h1 className="mt-4 text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
              Become an attorney
            </h1>

            <p className="mt-5 max-w-2xl leading-8 text-slate-400">
              Create your professional profile and submit your information for
              verification.
            </p>
          </header>

          <form
            action={createAttorneyProfile}
            className="mt-10 space-y-8"
          >
            <div>
              <label
                htmlFor="full_name"
                className="block text-sm font-medium text-slate-300"
              >
                Full name
              </label>

              <input
                id="full_name"
                name="full_name"
                type="text"
                required
                defaultValue={attorney?.full_name ?? ""}
                autoComplete="name"
                className="mt-3 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-white outline-none transition focus:border-brand-400"
              />
            </div>

            <div>
              <label
                htmlFor="law_firm"
                className="block text-sm font-medium text-slate-300"
              >
                Law firm
              </label>

              <input
                id="law_firm"
                name="law_firm"
                type="text"
                defaultValue={attorney?.law_firm ?? ""}
                placeholder="Optional"
                className="mt-3 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-brand-400"
              />
            </div>

            <div>
              <label
                htmlFor="bio"
                className="block text-sm font-medium text-slate-300"
              >
                Professional biography
              </label>

              <textarea
                id="bio"
                name="bio"
                required
                rows={7}
                defaultValue={attorney?.bio ?? ""}
                placeholder="Describe your background, experience, and approach to client representation."
                className="mt-3 w-full resize-y rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 leading-7 text-white outline-none transition placeholder:text-slate-600 focus:border-brand-400"
              />
            </div>

            <div className="grid gap-8 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="years_experience"
                  className="block text-sm font-medium text-slate-300"
                >
                  Years of experience
                </label>

                <input
                  id="years_experience"
                  name="years_experience"
                  type="number"
                  min="0"
                  max="80"
                  required
                  defaultValue={attorney?.years_experience ?? 0}
                  className="mt-3 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-white outline-none transition focus:border-brand-400"
                />
              </div>

              <div>
                <label
                  htmlFor="license_number"
                  className="block text-sm font-medium text-slate-300"
                >
                  License number
                </label>

                <input
                  id="license_number"
                  name="license_number"
                  type="text"
                  required
                  defaultValue={attorney?.license_number ?? ""}
                  className="mt-3 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-white outline-none transition focus:border-brand-400"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="practice_areas"
                className="block text-sm font-medium text-slate-300"
              >
                Practice areas
              </label>

              <input
                id="practice_areas"
                name="practice_areas"
                type="text"
                required
                defaultValue={
                  attorney?.practice_areas?.join(", ") ?? ""
                }
                placeholder="Employment, Housing, Civil Rights"
                className="mt-3 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-brand-400"
              />

              <p className="mt-2 text-sm text-slate-500">
                Separate multiple practice areas with commas.
              </p>
            </div>

            <div>
              <label
                htmlFor="states"
                className="block text-sm font-medium text-slate-300"
              >
                Licensed states
              </label>

              <input
                id="states"
                name="states"
                type="text"
                required
                defaultValue={attorney?.states?.join(", ") ?? ""}
                placeholder="New Jersey, New York"
                className="mt-3 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-brand-400"
              />

              <p className="mt-2 text-sm text-slate-500">
                Separate multiple states with commas.
              </p>
            </div>

            <div className="rounded-2xl border border-amber-400/20 bg-amber-400/[0.06] p-5">
              <p className="text-sm leading-7 text-amber-100">
                Your attorney profile will remain pending until Justice Pool
                verifies your licensing information.
              </p>
            </div>

            <button
              type="submit"
              className="rounded-xl bg-brand-500 px-6 py-3 font-semibold text-white transition hover:bg-brand-400"
            >
              Submit attorney profile
            </button>
          </form>
        </div>
      </Container>
    </main>
  );
}