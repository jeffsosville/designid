"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type Term = { id: string; label_en: string; path_en: string | null };

export function TermPicker({ value, onChange }: { value: Term | null; onChange: (t: Term | null) => void }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Term[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (q.trim().length < 2) return;
    const t = setTimeout(async () => {
      const supabase = createClient();
      const { data } = await supabase.rpc("search_terms", { q: q.trim(), max_results: 15 });
      setResults((data as Term[]) ?? []);
      setOpen(true);
    }, 200);
    return () => clearTimeout(t);
  }, [q]);

  if (value) {
    return (
      <div className="flex items-start justify-between gap-3 rounded border border-stone-300 px-3 py-2">
        <div>
          <div className="font-medium">{value.label_en}</div>
          <div className="text-xs text-stone-500">{value.path_en}</div>
        </div>
        <button type="button" onClick={() => onChange(null)} className="text-sm text-stone-500 underline">
          Change
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => results.length && setOpen(true)}
        placeholder="Search Nomenclature, e.g. chair, lamp, teapot"
        className="w-full rounded border border-stone-300 bg-transparent px-3 py-2"
      />
      {open && q.trim().length >= 2 && results.length > 0 && (
        <ul className="absolute z-10 mt-1 max-h-80 w-full overflow-auto rounded border border-stone-300 bg-white shadow-lg dark:bg-stone-900">
          {results.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                onClick={() => {
                  onChange(r);
                  setOpen(false);
                  setQ("");
                }}
                className="w-full px-3 py-2 text-left hover:bg-stone-100 dark:hover:bg-stone-800"
              >
                <div>{r.label_en}</div>
                <div className="text-xs text-stone-500">{r.path_en}</div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
