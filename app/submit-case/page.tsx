import { redirect } from "next/navigation";

import Container from "@/components/ui/Container";
import SubmitCaseForm from "@/components/cases/SubmitCaseForm";
import { createClient } from "@/lib/supabase-server";

export default async function SubmitCasePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <main className="min-h-screen bg-ink-950 pb-20 pt-32 text-white">
      <Container>
        <div className="mx-auto max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-300">
            Case Submission
          </p>

          <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">
            Submit a legal case
          </h1>

          <p className="mt-4 max-w-2xl leading-7 text-slate-400">
            Tell us what happened, how much support is needed, and why this case
            matters. New submissions will begin with a pending review status.
          </p>

          <div className="mt-10 rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-xl sm:p-10">
            <SubmitCaseForm userId={user.id} />
          </div>
        </div>
      </Container>
    </main>
  );
}