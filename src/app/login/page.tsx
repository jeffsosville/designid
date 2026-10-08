"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const f = new FormData(e.currentTarget);
    const email = String(f.get("email"));
    const password = String(f.get("password"));
    const supabase = createClient();

    const { data, error } =
      mode === "signin"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });

    if (error) {
      setError(error.message);
      setBusy(false);
      return;
    }
    if (!data.session) {
      setError('Account created, but Supabase is still set to confirm emails. Turn off "Confirm email" in Supabase, then sign in.');
      setBusy(false);
      setMode("signin");
      return;
    }
    router.push("/");
    router.refresh();
  }

  const field = "rounded border border-stone-300 bg-transparent px-3 py-2";

  return (
    <main className="mx-auto mt-32 w-full max-w-sm px-4">
      <h1 className="font-serif text-3xl">designID</h1>
      <p className="mt-2 text-sm text-stone-500">Catalog your collection with museum-standard names.</p>
      <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-3">
        <input name="email" type="email" required autoComplete="email" placeholder="Email" className={field} />
        <input
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete={mode === "signin" ? "current-password" : "new-password"}
          placeholder="Password"
          className={field}
        />
        <button disabled={busy} className="rounded bg-stone-900 px-3 py-2 text-white disabled:opacity-50 dark:bg-stone-100 dark:text-stone-900">
          {busy ? "…" : mode === "signin" ? "Sign in" : "Create account"}
        </button>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </form>
      <button
        onClick={() => {
          setMode(mode === "signin" ? "signup" : "signin");
          setError("");
        }}
        className="mt-4 text-sm text-stone-500 underline"
      >
        {mode === "signin" ? "New here? Create an account" : "Have an account? Sign in"}
      </button>
    </main>
  );
}
