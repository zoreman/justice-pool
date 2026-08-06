"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Container from "@/components/ui/Container";
import { supabase } from "@/lib/supabase-browser";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setIsLoading(true);
    setMessage("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setMessage(error.message);
      setIsLoading(false);
      return;
    }

    router.push("/cases");
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-ink-950 px-6 py-32 text-white">
      <Container>
        <div className="mx-auto max-w-md rounded-[2rem] border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-xl">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-300">
            Welcome back
          </p>

          <h1 className="mt-4 text-4xl font-semibold tracking-[-0.04em]">
            Sign in to Justice Pool
          </h1>

          <form onSubmit={handleLogin} className="mt-10 space-y-6">
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
                autoComplete="current-password"
                required
                className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 outline-none transition focus:border-brand-400"
              />
            </div>

            {message && (
              <p className="rounded-2xl border border-red-400/20 bg-red-400/10 p-4 text-sm leading-6 text-red-200">
                {message}
              </p>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-2xl bg-brand-500 px-6 py-4 font-semibold transition hover:bg-brand-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-400">
            Don&apos;t have an account?{" "}
            <Link
              href="/sign-up"
              className="font-semibold text-brand-300 hover:text-brand-200"
            >
              Create one
            </Link>
          </p>
        </div>
      </Container>
    </main>
  );
}