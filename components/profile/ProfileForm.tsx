
"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { supabase } from "@/lib/supabase-browser";

type ProfileFormProps = {
  email: string;
  fullName: string;
  role: string;
  createdAt: string;
};

function formatDate(date: string) {
  if (!date) {
    return "Unknown";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
}

export default function ProfileForm({
  email,
  fullName,
  role,
  createdAt,
}: ProfileFormProps) {
  const router = useRouter();

  const [name, setName] = useState(fullName);
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setMessage("");
    setIsSaving(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setMessage("You need to sign in again.");
      setIsSaving(false);
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: name.trim(),
      })
      .eq("id", user.id);

    if (error) {
      setMessage(error.message);
      setIsSaving(false);
      return;
    }

    setMessage("Profile updated.");
    setIsSaving(false);
    router.refresh();
  }

  return (
    <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_240px]">
      <form onSubmit={handleSubmit}>
        <div>
          <label
            htmlFor="fullName"
            className="text-sm font-medium text-slate-300"
          >
            Full name
          </label>

          <input
            id="fullName"
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            className="mt-3 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-white outline-none transition focus:border-brand-400"
          />
        </div>

        <div className="mt-7">
          <label className="text-sm font-medium text-slate-300">
            Email
          </label>

          <input
            type="email"
            value={email}
            disabled
            className="mt-3 w-full cursor-not-allowed rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-slate-500"
          />
        </div>

        {message && (
          <p className="mt-6 text-sm text-slate-300">{message}</p>
        )}

        <button
          type="submit"
          disabled={isSaving}
          className="mt-7 rounded-xl bg-brand-500 px-6 py-3 text-sm font-semibold transition hover:bg-brand-400 disabled:opacity-60"
        >
          {isSaving ? "Saving..." : "Save changes"}
        </button>
      </form>

      <aside className="border-t border-white/10 pt-8 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
        <dl className="space-y-6">
          <div>
            <dt className="text-sm text-slate-500">Account role</dt>
            <dd className="mt-1 capitalize text-white">{role}</dd>
          </div>

          <div>
            <dt className="text-sm text-slate-500">Member since</dt>
            <dd className="mt-1 text-white">{formatDate(createdAt)}</dd>
          </div>
        </dl>
      </aside>
    </div>
  );
}