"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { TermPicker, type Term } from "@/components/TermPicker";

const CONDITIONS = ["excellent", "good", "fair", "poor"] as const;
const METHODS = ["purchase", "auction", "gift", "inheritance", "commission", "trade", "other"] as const;

type Suggestion = Term & {
  term_id: string;
  definition_en: string | null;
  confidence: "high" | "medium" | "low";
  reason: string;
};
type Details = {
  description: string;
  title: string;
  materials: string | null;
  date_estimate: string | null;
  maker: string | null;
};
type Result = { details: Details; suggestions: Suggestion[] };

// Shrink the photo before sending: faster upload, cheaper AI call.
async function toJpegDataUrl(file: File, max = 1200): Promise<string> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.85);
}

const badge: Record<Suggestion["confidence"], string> = {
  high: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  medium: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  low: "bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300",
};

export default function NewItemPage() {
  const router = useRouter();
  const [files, setFiles] = useState<File[]>([]);
  const [preview, setPreview] = useState("");
  const [identifying, setIdentifying] = useState(false);
  const [aiError, setAiError] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [term, setTerm] = useState<Term | null>(null);
  const [pickRank, setPickRank] = useState<number | null>(null);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function onPhotos(list: FileList | null) {
    const picked = Array.from(list ?? []);
    if (!picked.length) return;
    setFiles(picked);
    setPreview(URL.createObjectURL(picked[0]));
    setResult(null);
    setTerm(null);
    setPickRank(null);
    setSearching(false);
    setAiError("");
    setIdentifying(true);
    try {
      const image = await toJpegDataUrl(picked[0]);
      const res = await fetch("/api/identify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ image }),
      });
      const data = await res.json().catch(() => ({ error: "Identification failed" }));
      if (!res.ok) throw new Error(data.error ?? "Identification failed");
      setResult(data);
      if (data.suggestions[0]) {
        setTerm({ ...data.suggestions[0], id: data.suggestions[0].term_id });
        setPickRank(1);
      } else {
        setSearching(true);
      }
    } catch (e) {
      setAiError(`${(e as Error).message}. You can still pick the term yourself.`);
      setSearching(true);
    } finally {
      setIdentifying(false);
    }
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const form = new FormData(e.currentTarget);
    const supabase = createClient();

    const value = form.get("current_value") as string;
    const price = form.get("acquisition_price") as string;
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
        location: form.get("location") || null,
        acquired_date: form.get("acquired_date") || null,
        acquired_from: form.get("acquired_from") || null,
        acquisition_method: form.get("acquisition_method") || null,
        acquisition_price: price ? Number(price) : null,
        ai_result: result,
        ai_pick_rank: pickRank,
      })
      .select("id")
      .single();

    if (itemErr || !item) {
      setError(itemErr?.message ?? "Could not save item");
      setSaving(false);
      return;
    }

    if (value) {
      await supabase.from("valuations").insert({ item_id: item.id, amount: Number(value), basis: form.get("basis") || "owner_estimate" });
    }

    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      const ext = f.name.split(".").pop() ?? "jpg";
      const path = `items/${item.id}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("item-images").upload(path, f, { contentType: f.type });
      if (upErr) {
        setError(`Image upload failed: ${upErr.message}`);
        continue;
      }
      await supabase.from("item_images").insert({ item_id: item.id, storage_path: path, is_primary: i === 0, sort_order: i });
    }

    router.push(`/items/${item.id}`);
  }

  const field = "w-full rounded border border-stone-300 bg-transparent px-3 py-2 dark:border-stone-700";
  const d = result?.details;

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10">
      <Link href="/" className="text-sm text-stone-500 underline">← Collection</Link>
      <h1 className="mt-4 font-serif text-3xl">Add an item</h1>
      <p className="mt-1 text-stone-500">Take or upload a photo and we&apos;ll suggest its Nomenclature name.</p>

      <label className="mt-8 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-stone-300 p-6 text-center dark:border-stone-700">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="" className="max-h-80 rounded object-contain" />
        ) : (
          <span className="text-lg">Take a photo or choose photos</span>
        )}
        <span className="text-sm text-stone-500">
          {preview ? `${files.length} photo${files.length > 1 ? "s" : ""} · tap to change` : "The first photo is used to identify the object"}
        </span>
        <input type="file" accept="image/*" capture="environment" multiple className="hidden" onChange={(e) => onPhotos(e.target.files)} />
      </label>

      {identifying && <p className="mt-6 animate-pulse text-center text-stone-500">Identifying… about 10 seconds.</p>}
      {aiError && <p className="mt-4 text-sm text-amber-700 dark:text-amber-400">{aiError}</p>}

      {result && (
        <section className="mt-8">
          <p className="text-sm text-stone-600 dark:text-stone-400">{result.details.description}</p>
          {result.suggestions.length > 0 && (
            <>
              <h2 className="mt-6 text-sm font-medium">Suggested Nomenclature terms</h2>
              <ul className="mt-2 flex flex-col gap-2">
                {result.suggestions.map((s, i) => {
                  const selected = pickRank === i + 1;
                  return (
                    <li key={s.term_id}>
                      <button
                        type="button"
                        onClick={() => {
                          setTerm({ ...s, id: s.term_id });
                          setPickRank(i + 1);
                          setSearching(false);
                        }}
                        className={`w-full rounded border px-3 py-2 text-left ${selected ? "border-stone-900 ring-1 ring-stone-900 dark:border-stone-100 dark:ring-stone-100" : "border-stone-300 dark:border-stone-700"}`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium">{s.label_en}</span>
                          <span className={`rounded px-2 py-0.5 text-xs ${badge[s.confidence]}`}>{s.confidence}</span>
                        </div>
                        <div className="text-xs text-stone-500">{s.path_en}</div>
                        <div className="mt-1 text-sm">{s.reason}</div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </section>
      )}

      {preview && !identifying && (
        <div className="mt-4">
          {searching ? (
            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium">Object name (Nomenclature)</span>
              <TermPicker
                value={pickRank === null ? term : null}
                onChange={(t) => {
                  setTerm(t);
                  setPickRank(null);
                }}
              />
            </div>
          ) : (
            <button type="button" onClick={() => setSearching(true)} className="text-sm text-stone-500 underline">
              None of these — search the list myself
            </button>
          )}
        </div>
      )}

      {preview && !identifying && (
        <form key={result ? "ai" : "manual"} onSubmit={onSubmit} className="mt-8 flex flex-col gap-5 border-t border-stone-200 pt-8 dark:border-stone-800">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">Title</span>
            <input name="title" required defaultValue={d?.title ?? ""} className={field} placeholder="e.g. Eames lounge chair, walnut" />
          </label>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <label className="flex flex-col gap-1"><span className="text-sm font-medium">Maker / designer</span><input name="maker" defaultValue={d?.maker ?? ""} className={field} /></label>
            <label className="flex flex-col gap-1"><span className="text-sm font-medium">Date made</span><input name="date_made" defaultValue={d?.date_estimate ?? ""} className={field} placeholder="c. 1956" /></label>
            <label className="flex flex-col gap-1"><span className="text-sm font-medium">Materials</span><input name="materials" defaultValue={d?.materials ?? ""} className={field} /></label>
            <label className="flex flex-col gap-1"><span className="text-sm font-medium">Dimensions</span><input name="dimensions" className={field} /></label>
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium">Condition</span>
              <select name="condition" className={field} defaultValue="">
                <option value="">—</option>
                {CONDITIONS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1"><span className="text-sm font-medium">Location</span><input name="location" className={field} placeholder="Living room, storage unit B…" /></label>
          </div>

          <fieldset className="grid grid-cols-1 gap-5 border-t border-stone-200 pt-5 sm:grid-cols-2 dark:border-stone-700">
            <legend className="pr-2 text-sm font-medium text-stone-500">Acquisition</legend>
            <label className="flex flex-col gap-1"><span className="text-sm font-medium">Date acquired</span><input name="acquired_date" type="date" className={field} /></label>
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium">How</span>
              <select name="acquisition_method" className={field} defaultValue="">
                <option value="">—</option>
                {METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1"><span className="text-sm font-medium">From</span><input name="acquired_from" className={field} placeholder="Dealer, auction house, person" /></label>
            <label className="flex flex-col gap-1"><span className="text-sm font-medium">Price paid ($)</span><input name="acquisition_price" type="number" step="0.01" className={field} /></label>
          </fieldset>

          <fieldset className="grid grid-cols-1 gap-5 border-t border-stone-200 pt-5 sm:grid-cols-2 dark:border-stone-700">
            <legend className="pr-2 text-sm font-medium text-stone-500">Current value</legend>
            <label className="flex flex-col gap-1"><span className="text-sm font-medium">Value ($)</span><input name="current_value" type="number" step="0.01" className={field} /></label>
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium">Basis</span>
              <select name="basis" className={field} defaultValue="owner_estimate">
                <option value="owner_estimate">Owner estimate</option>
                <option value="insurance">Insurance appraisal</option>
                <option value="fair_market">Fair market appraisal</option>
                <option value="auction_estimate">Auction estimate</option>
              </select>
            </label>
          </fieldset>

          <label className="flex flex-col gap-1"><span className="text-sm font-medium">Description</span><textarea name="description" rows={3} defaultValue={d?.description ?? ""} className={field} /></label>
          <label className="flex flex-col gap-1"><span className="text-sm font-medium">Provenance</span><textarea name="provenance" rows={2} className={field} /></label>

          {error && <p className="text-sm text-red-600">{error}</p>}
          <button disabled={saving} className="self-start rounded bg-stone-900 px-4 py-2 text-white disabled:opacity-50 dark:bg-stone-100 dark:text-stone-900">
            {saving ? "Saving…" : term ? `Save as “${term.label_en}”` : "Save item"}
          </button>
        </form>
      )}
    </main>
  );
}
