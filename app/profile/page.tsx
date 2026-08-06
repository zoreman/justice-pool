import Link from "next/link";
import { redirect } from "next/navigation";

import Container from "@/components/ui/Container";
import ProfileForm from "@/components/profile/ProfileForm";
import { createClient } from "@/lib/supabase-server";

export default async function ProfilePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("full_name, role, created_at")
    .eq("id", user.id)
    .single();

  if (error) {
    throw new Error(error.message);
  }

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
            <p className="text-sm font-medium text-brand-300">Profile</p>

            <h1 className="mt-4 text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
              Account settings
            </h1>

            <p className="mt-4 max-w-xl leading-7 text-slate-400">
              Update your account information and review your membership
              details.
            </p>
          </header>

          <div className="pt-10">
            <ProfileForm
              email={user.email ?? ""}
              fullName={profile?.full_name ?? ""}
              role={profile?.role ?? "supporter"}
              createdAt={profile?.created_at ?? ""}
            />
          </div>
        </div>
      </Container>
    </main>
  );
}