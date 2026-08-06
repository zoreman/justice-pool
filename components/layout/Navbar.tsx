"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";

import Button from "@/components/ui/Button";
import Container from "@/components/ui/Container";
import { supabase } from "@/lib/supabase-browser";
import NotificationLink from "@/components/notifications/NotificationLink";

export default function Navbar() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    async function loadUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      setUser(user);
      setIsLoading(false);
    }

    loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  async function handleLogout() {
    setIsLoggingOut(true);

    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error(error.message);
      setIsLoggingOut(false);
      return;
    }

    setUser(null);
    router.push("/");
    router.refresh();
  }

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-slate-950/70 backdrop-blur-xl">
      <Container>
        <div className="flex h-20 items-center justify-between">
          <Link
            href="/"
            className="text-xl font-semibold tracking-tight text-white"
          >
            Justice Pool
          </Link>

          <nav className="hidden gap-10 text-sm text-slate-300 md:flex">
            <Link href="/" className="transition hover:text-white">
              Home
            </Link>

            <Link href="/cases" className="transition hover:text-white">
              Cases
            </Link>

            <Link href="/lawyers" className="transition hover:text-white">
              Lawyers
            </Link>

            <Link href="/about" className="transition hover:text-white">
              About
            </Link>
            <NotificationLink />
          </nav>

          <div className="flex items-center gap-3">
            {isLoading ? (
              <div className="h-11 w-24 animate-pulse rounded-2xl bg-white/10" />
            ) : user ? (
              <>
                <Link
                  href="/dashboard"
                  className="hidden text-sm font-medium text-slate-300 transition hover:text-white sm:block"
                >
                  Dashboard
                </Link>

                <Button
                  type="button"
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                >
                  {isLoggingOut ? "Logging Out..." : "Log Out"}
                </Button>
              </>
            ) : (
              <>
                <Link
                  href="/sign-up"
                  className="hidden text-sm font-medium text-slate-300 transition hover:text-white sm:block"
                >
                  Create Account
                </Link>

                <Link href="/login">
                  <Button>Sign In</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </Container>
    </header>
  );
}