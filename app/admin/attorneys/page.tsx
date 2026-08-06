import Link from "next/link";
import { redirect } from "next/navigation";

import Container from "@/components/ui/Container";
import { createClient } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";

import {
  rejectAttorney,
  verifyAttorney,
} from "./actions";

type AttorneyRecord = {
  id: string;
  full_name: string;
  bio: string | null;
  law_firm: string | null;
  practice_areas: string[] | null;
  years_experience: number | null;
  states: string[] | null;
  license_number: string | null;
  verified: boolean;
  accepting_cases: boolean;
  created_at: string;
};

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
}

export default async function AdminAttorneysPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profileError) {
    throw new Error(profileError.message);
  }

  if (profile?.role !== "admin") {
    redirect("/dashboard");
  }

  const { data, error } = await supabaseAdmin
    .from("attorneys")
    .select(
      `
        id,
        full_name,
        bio,
        law_firm,
        practice_areas,
        years_experience,
        states,
        license_number,
        verified,
        accepting_cases,
        created_at
      `,
    )
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const attorneys = (data ?? []) as AttorneyRecord[];

  const pendingCount = attorneys.filter(
    (attorney) => !attorney.verified,
  ).length;

  return (
    <main className="min-h-screen bg-ink-950 pb-24 pt-28 text-white">
      <Container>
        <div className="mx-auto max-w-6xl">
          <Link
            href="/admin"
            className="text-sm font-medium text-slate-400 transition hover:text-white"
          >
            ← Back to admin
          </Link>

          <header className="mt-12 border-b border-white/10 pb-10">
            <p className="text-sm font-medium text-brand-300">
              Attorney verification
            </p>

            <h1 className="mt-4 text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
              Review attorney profiles
            </h1>

            <p className="mt-4 text-slate-400">
              {pendingCount} pending{" "}
              {pendingCount === 1 ? "profile" : "profiles"}
            </p>
          </header>

          {attorneys.length === 0 ? (
            <div className="py-20 text-center">
              <h2 className="text-2xl font-semibold">
                No attorney profiles
              </h2>

              <p className="mt-3 text-slate-500">
                Submitted attorney profiles will appear here.
              </p>
            </div>
          ) : (
            <section className="mt-10 space-y-6">
              {attorneys.map((attorney) => (
                <article
                  key={attorney.id}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] p-7"
                >
                  <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-3">
                        <h2 className="text-2xl font-semibold">
                          {attorney.full_name}
                        </h2>

                        <span
                          className={`rounded-full px-3 py-1 text-xs font-medium ${
                            attorney.verified
                              ? "bg-emerald-400/10 text-emerald-300"
                              : "bg-amber-400/10 text-amber-300"
                          }`}
                        >
                          {attorney.verified
                            ? "Verified"
                            : "Pending"}
                        </span>
                      </div>

                      <p className="mt-3 text-slate-400">
                        {attorney.law_firm || "Independent attorney"}
                      </p>

                      <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-500">
                        <span>
                          {attorney.years_experience ?? 0} years
                          experience
                        </span>

                        <span>
                          License:{" "}
                          {attorney.license_number || "Not provided"}
                        </span>

                        <span>
                          Submitted {formatDate(attorney.created_at)}
                        </span>
                      </div>

                      <div className="mt-5 flex flex-wrap gap-2">
                        {(attorney.practice_areas ?? []).map((area) => (
                          <span
                            key={area}
                            className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-300"
                          >
                            {area}
                          </span>
                        ))}
                      </div>

                      <p className="mt-5 text-sm text-slate-500">
                        Licensed in:{" "}
                        {attorney.states?.join(", ") || "Not listed"}
                      </p>

                      {attorney.bio && (
                        <p className="mt-6 leading-8 text-slate-400">
                          {attorney.bio}
                        </p>
                      )}
                    </div>

                    <div className="flex shrink-0 flex-wrap gap-3">
                      {!attorney.verified && (
                        <form
                          action={verifyAttorney.bind(
                            null,
                            attorney.id,
                          )}
                        >
                          <button
                            type="submit"
                            className="rounded-xl bg-brand-500 px-5 py-3 text-sm font-semibold transition hover:bg-brand-400"
                          >
                            Verify attorney
                          </button>
                        </form>
                      )}

                      <form
                        action={rejectAttorney.bind(
                          null,
                          attorney.id,
                        )}
                      >
                        <button
                          type="submit"
                          className="rounded-xl border border-white/10 px-5 py-3 text-sm font-semibold text-slate-300 transition hover:bg-white/5 hover:text-white"
                        >
                          Reject
                        </button>
                      </form>
                    </div>
                  </div>
                </article>
              ))}
            </section>
          )}
        </div>
      </Container>
    </main>
  );
}