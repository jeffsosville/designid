"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LinkError() {
  const msg = useSearchParams().get("error");
  if (!msg) return null;
  return (
    <p className="mt-6 rounded border border-red-300 px-3 py-2 text-sm text-red-600">
      Sign-in didn&apos;t complete: {msg}. Request a new link and open it in this same browser.
    </p>
  );
}

function LoginForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      setError(error.message);
      setStatus("error");
    } else {
      setStatus("sent");
    }
  }

  return (
    <main className="mx-auto mt-32 w-full max-w-sm px-4">
      <h1 className="font-serif text-3xl">designID</h1>
      <p className="mt-2 text-sm text-stone-500">Catalog your collection with museum-standard names.</p>
      <LinkError />
      {status === "sent" ? (
        <p className="mt-8">Check {email} for a sign-in link.</p>
      ) : (
        <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-3">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="rounded border border-stone-300 bg-transparent px-3 py-2"
          />
          <button disabled={status === "sending"} className="rounded bg-stone-900 px-3 py-2 text-white disabled:opacity-50 dark:bg-stone-100 dark:text-stone-900">
            {status === "sending" ? "Sending…" : "Email me a sign-in link"}
          </button>
          {status === "error" && <p className="text-sm text-red-600">{error}</p>}
        </form>
      )}
    </main>
  );
}
