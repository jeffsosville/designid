"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { TermPicker, type Term } from "@/components/TermPicker";

const CONDITIONS = ["excellent", "good", "fair", "poor"] as const;

export default function NewItemPage() {
  const router = useRouter();
  const [files, setFiles] = useState<File[]>([]);
  const [term, setTerm] = useState<Term | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const form = new FormData(e.currentTarget);
    const supabase = createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return router.push("/login");

    const value = form.get("estimated_value") as string;
    const { data: item, error: itemErr } = await supabase
      .from("items")
      .insert({
        title: form.get("title"),
        term_id: term?.id ?? null,
        description: form.get("description") || null,
        maker: form.get("maker") || null,
        date_made: form.get("date_made") || null,
        materials: form.get("materials") || null,
        dimensions: form.get("dimensions") || null,
        condition: form.get("condition") || null,
        provenance: form.get("provenance") || null,
        estimated_value: value ? Number(value) : null,
      })
      .select("id")
      .single();

    if (itemErr || !item) {
      setError(itemErr?.message ?? "Could not save item");
      setSaving(false);
      return;
    }

    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      const ext = f.name.split(".").pop() ?? "jpg";
      const path = `${user.id}/${item.id}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("item-images").upload(path, f, { contentType: f.type });
      if (upErr) {
        setError(`Image upload failed: ${upErr.message}`);
        continue;
      }
      await supabase.from("item_images").insert({ item_id: item.id, storage_path: path, is_primary: i === 0, sort_order: i });
    }

    router.push(`/items/${item.id}`);
  }

  const field = "w-full rounded border border-stone-300 bg-transparent px-3 py-2";

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10">
      <h1 className="font-serif text-3xl">Add an item</h1>
      <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-5">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Photos</span>
          <input type="file" accept="image/*" multiple onChange={(e) => setFiles(Array.from(e.target.files ?? []))} />
          {files.length > 0 && (
            <div className="mt-2 flex gap-2 overflow-x-auto">
              {files.map((f, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={i} src={URL.createObjectURL(f)} alt="" className="h-24 w-24 rounded object-cover" />
              ))}
            </div>
          )}
        </label>

        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium">Object name (Nomenclature)</span>
          <TermPicker value={term} onChange={setTerm} />
        </div>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Title</span>
          <input name="title" required className={field} placeholder="e.g. Eames lounge chair, walnut" />
        </label>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <label className="flex flex-col gap-1"><span className="text-sm font-medium">Maker / designer</span><input name="maker" className={field} /></label>
          <label className="flex flex-col gap-1"><span className="text-sm font-medium">Date made</span><input name="date_made" className={field} placeholder="c. 1956" /></label>
          <label className="flex flex-col gap-1"><span className="text-sm font-medium">Materials</span><input name="materials" className={field} /></label>
          <label className="flex flex-col gap-1"><span className="text-sm font-medium">Dimensions</span><input name="dimensions" className={field} /></label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">Condition</span>
            <select name="condition" className={field} defaultValue="">
              <option value="">—</option>
              {CONDITIONS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1"><span className="text-sm font-medium">Estimated value ($)</span><input name="estimated_value" type="number" step="0.01" className={field} /></label>
        </div>

        <label className="flex flex-col gap-1"><span className="text-sm font-medium">Description</span><textarea name="description" rows={3} className={field} /></label>
        <label className="flex flex-col gap-1"><span className="text-sm font-medium">Provenance</span><textarea name="provenance" rows={2} className={field} /></label>

        {error && <p className="text-sm text-red-600">{error}</p>}
        <button disabled={saving} className="self-start rounded bg-stone-900 px-4 py-2 text-white disabled:opacity-50 dark:bg-stone-100 dark:text-stone-900">
          {saving ? "Saving…" : "Save item"}
        </button>
      </form>
    </main>
  );
}
