import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AddValuation } from "@/components/AddValuation";

const money = (n: number | null | undefined) => (n == null ? null : `$${Number(n).toLocaleString()}`);
const BASIS: Record<string, string> = {
  insurance: "Insurance appraisal",
  fair_market: "Fair market appraisal",
  auction_estimate: "Auction estimate",
  owner_estimate: "Owner estimate",
};

export default function ItemPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10">
      <Link href="/" className="text-sm text-stone-500 underline">← Collection</Link>
      <Suspense fallback={<p className="mt-16 text-center text-stone-500">Loading…</p>}>
        <ItemBody params={params} />
      </Suspense>
    </main>
  );
}

async function ItemBody({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: item } = await supabase
    .from("items")
    .select("*, term:nomenclature_terms(label_en, path_en, definition_en), item_images(storage_path, is_primary, sort_order), valuations(id, valued_on, amount, basis, appraiser, notes, created_at)")
    .eq("id", id)
    .single();
  if (!item) notFound();

  const images = [...(item.item_images ?? [])].sort((a, b) => Number(b.is_primary) - Number(a.is_primary) || a.sort_order - b.sort_order);
  const { data: signed } = images.length
    ? await supabase.storage.from("item-images").createSignedUrls(images.map((i) => i.storage_path), 3600)
    : { data: [] };

  const facts: [string, string | null][] = [
    ["Maker / designer", item.maker],
    ["Date made", item.date_made],
    ["Materials", item.materials],
    ["Dimensions", item.dimensions],
    ["Condition", item.condition],
    ["Location", item.location],
  ];
  const acquisition: [string, string | null][] = [
    ["Acquired", item.acquired_date],
    ["How", item.acquisition_method],
    ["From", item.acquired_from],
    ["Price paid", money(item.acquisition_price)],
  ];
  type V = { id: string; valued_on: string; amount: number; basis: string | null; appraiser: string | null; notes: string | null; created_at: string };
  const valuations = [...((item.valuations as V[]) ?? [])].sort(
    (a, b) => b.valued_on.localeCompare(a.valued_on) || b.created_at.localeCompare(a.created_at)
  );

  return (
      <div className="mt-6 grid gap-10 md:grid-cols-2">
        <div className="flex flex-col gap-3">
          {(signed ?? []).map((s) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={s.path} src={s.signedUrl ?? ""} alt={item.title} className="w-full rounded" />
          ))}
        </div>
        <div>
          <h1 className="font-serif text-3xl">{item.title}</h1>
          {item.term && (
            <div className="mt-3 rounded border border-stone-200 px-3 py-2 dark:border-stone-700">
              <div className="font-medium">{item.term.label_en}</div>
              <div className="text-xs text-stone-500">{item.term.path_en}</div>
              {item.term.definition_en && <p className="mt-2 text-sm">{item.term.definition_en}</p>}
            </div>
          )}
          <dl className="mt-6 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
            {facts.filter(([, v]) => v).map(([k, v]) => (
              <div key={k} className="contents">
                <dt className="text-stone-500">{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
          <h2 className="mt-8 text-sm font-medium text-stone-500">Value</h2>
          {valuations.length === 0 ? (
            <p className="mt-1 text-sm text-stone-500">No valuations yet.</p>
          ) : (
            <table className="mt-2 w-full text-sm">
              <tbody>
                {valuations.map((v, i) => (
                  <tr key={v.id} className={i === 0 ? "font-medium" : "text-stone-500"}>
                    <td className="py-1 pr-3">{v.valued_on}</td>
                    <td className="py-1 pr-3">{money(v.amount)}</td>
                    <td className="py-1 pr-3">{v.basis ? BASIS[v.basis] : ""}</td>
                    <td className="py-1">{v.appraiser}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <AddValuation itemId={item.id} />

          {acquisition.some(([, v]) => v) && (
            <>
              <h2 className="mt-8 text-sm font-medium text-stone-500">Acquisition</h2>
              <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
                {acquisition.filter(([, v]) => v).map(([k, v]) => (
                  <div key={k} className="contents">
                    <dt className="text-stone-500">{k}</dt>
                    <dd>{v}</dd>
                  </div>
                ))}
              </dl>
            </>
          )}

          {item.description && <p className="mt-6 whitespace-pre-line">{item.description}</p>}
          {item.provenance && (
            <>
              <h2 className="mt-6 text-sm font-medium text-stone-500">Provenance</h2>
              <p className="whitespace-pre-line">{item.provenance}</p>
            </>
          )}
        </div>
      </div>
  );
}
