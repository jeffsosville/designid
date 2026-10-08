import Link from "next/link";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";

type Row = {
  id: string;
  title: string;
  maker: string | null;
  term: { label_en: string; path_en: string | null } | null;
  item_images: { storage_path: string; is_primary: boolean }[];
};

export default function Gallery({ searchParams }: { searchParams: Promise<{ cat?: string }> }) {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-3xl">Collection</h1>
        <Link href="/items/new" className="rounded bg-stone-900 px-4 py-2 text-white dark:bg-stone-100 dark:text-stone-900">
          Add item
        </Link>
      </div>
      <Suspense fallback={<p className="mt-16 text-center text-stone-500">Loading…</p>}>
        <GalleryBody searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function GalleryBody({ searchParams }: { searchParams: Promise<{ cat?: string }> }) {
  const { cat } = await searchParams;
  const supabase = await createClient();

  const { data } = await supabase
    .from("items")
    .select("id, title, maker, term:nomenclature_terms(label_en, path_en), item_images(storage_path, is_primary)")
    .order("created_at", { ascending: false });

  const items = (data as unknown as Row[]) ?? [];
  const topOf = (r: Row) => r.term?.path_en?.split(" > ")[0] ?? "Unclassified";
  const categories = [...new Set(items.map(topOf))].sort();
  const shown = cat ? items.filter((r) => topOf(r) === cat) : items;

  const paths = shown
    .map((r) => (r.item_images.find((i) => i.is_primary) ?? r.item_images[0])?.storage_path)
    .filter(Boolean) as string[];
  const { data: signed } = paths.length
    ? await supabase.storage.from("item-images").createSignedUrls(paths, 3600)
    : { data: [] };
  const urlFor = new Map((signed ?? []).map((s) => [s.path, s.signedUrl]));

  return (
    <>
      {categories.length > 1 && (
        <nav className="mt-6 flex flex-wrap gap-2 text-sm">
          <Link href="/" className={`rounded-full border px-3 py-1 ${!cat ? "bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900" : ""}`}>All</Link>
          {categories.map((c) => (
            <Link key={c} href={`/?cat=${encodeURIComponent(c)}`} className={`rounded-full border px-3 py-1 ${cat === c ? "bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900" : ""}`}>
              {c}
            </Link>
          ))}
        </nav>
      )}

      {shown.length === 0 ? (
        <p className="mt-16 text-center text-stone-500">No items yet. Add your first piece.</p>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {shown.map((r) => {
            const p = (r.item_images.find((i) => i.is_primary) ?? r.item_images[0])?.storage_path;
            const src = p ? urlFor.get(p) : undefined;
            return (
              <Link key={r.id} href={`/items/${r.id}`} className="group">
                <div className="aspect-square overflow-hidden rounded bg-stone-100 dark:bg-stone-800">
                  {src && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={src} alt={r.title} className="h-full w-full object-cover transition group-hover:scale-105" />
                  )}
                </div>
                <div className="mt-2 font-medium">{r.title}</div>
                <div className="text-xs text-stone-500">{r.term?.label_en ?? "Unclassified"}{r.maker ? ` · ${r.maker}` : ""}</div>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
