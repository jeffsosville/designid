"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function AddValuation({ itemId }: { itemId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const f = new FormData(e.currentTarget);
    const { error } = await createClient().from("valuations").insert({
      item_id: itemId,
      amount: Number(f.get("amount")),
      valued_on: f.get("valued_on") || undefined,
      basis: f.get("basis"),
      appraiser: f.get("appraiser") || null,
      notes: f.get("notes") || null,
    });
    setSaving(false);
    if (error) return setError(error.message);
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="mt-3 text-sm underline">
        Add valuation
      </button>
    );
  }

  const field = "w-full rounded border border-stone-300 bg-transparent px-2 py-1 text-sm";
  return (
    <form onSubmit={onSubmit} className="mt-3 grid grid-cols-2 gap-2 rounded border border-stone-200 p-3 dark:border-stone-700">
      <input name="amount" type="number" step="0.01" required placeholder="Amount ($)" className={field} />
      <input name="valued_on" type="date" className={field} />
      <select name="basis" defaultValue="insurance" className={field}>
        <option value="insurance">Insurance appraisal</option>
        <option value="fair_market">Fair market appraisal</option>
        <option value="auction_estimate">Auction estimate</option>
        <option value="owner_estimate">Owner estimate</option>
      </select>
      <input name="appraiser" placeholder="Appraiser" className={field} />
      <input name="notes" placeholder="Notes" className={`${field} col-span-2`} />
      {error && <p className="col-span-2 text-sm text-red-600">{error}</p>}
      <div className="col-span-2 flex gap-3">
        <button disabled={saving} className="rounded bg-stone-900 px-3 py-1 text-sm text-white disabled:opacity-50 dark:bg-stone-100 dark:text-stone-900">
          {saving ? "Saving…" : "Save"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="text-sm underline">Cancel</button>
      </div>
    </form>
  );
}
