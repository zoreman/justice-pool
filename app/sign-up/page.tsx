"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Container from "@/components/ui/Container";
import { supabase } from "@/lib/supabase-browser";

export default function SignUpPage() {
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSignUp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setIsLoading(true);
    setMessage("");

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
        emailRedirectTo: `${window.location.origin}/login`,
      },
    });

    if (error) {
      setMessage(error.message);
      setIsLoading(false);
      return;
    }

    if (data.session) {
      router.push("/cases");
      router.refresh();
      return;
    }

    setMessage(
      "Account created. Check your email and confirm your account before signing in."
    );

    setIsLoading(false);
  }

  return (
    <main className="min-h-screen bg-ink-950 px-6 py-32 text-white">
      <Container>
        <div className="mx-auto max-w-md rounded-[2rem] border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-xl">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-300">
            Join Justice Pool
          </p>

          <h1 className="mt-4 text-4xl font-semibold tracking-[-0.04em]">
            Create your account
          </h1>

          <form onSubmit={handleSignUp} className="mt-10 space-y-6">
            <div>
              <label
                htmlFor="fullName"
                className="text-sm font-medium text-slate-300"
              >
                Full Name
              </label>

              <input
                id="fullName"
                name="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                autoComplete="name"
                required
                className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 outline-none transition focus:border-brand-400"
              />
            </div>

            <div>
              <label
                htmlFor="email"
                className="text-sm font-medium text-slate-300"
              >
                Email
              </label>

              <input
                id="email"
                name="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                required
                className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 outline-none transition focus:border-brand-400"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="text-sm font-medium text-slate-300"
              >
                Password
              </label>

              <input
                id="password"
                name="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="new-password"
                minLength={6}
                required
                className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 outline-none transition focus:border-brand-400"
              />
            </div>

            {message && (
              <p className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm leading-6 text-slate-300">
                {message}
              </p>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-2xl bg-brand-500 px-6 py-4 font-semibold transition hover:bg-brand-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? "Creating account..." : "Create Account"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-400">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-semibold text-brand-300 hover:text-brand-200"
            >
              Sign in
            </Link>
          </p>
        </div>
      </Container>
    </main>
  );
}