"""
Import Nomenclature for Museum Cataloging (SKOS JSON-LD export) into Supabase.

Download the JSON-LD file from https://www.nomenclature.info (Integration page), then:

    export SUPABASE_URL=https://<ref>.supabase.co
    export SUPABASE_SERVICE_ROLE_KEY=<service role key>   # server-side only, never in the app
    python scripts/import_nomenclature.py path/to/nomenclature.jsonld

Safe to re-run: rows are upserted on id.
Nomenclature is CC BY 4.0 - credit CHIN / AASLH in the site footer.
"""
import json
import os
import sys
import urllib.request

SKOS = "http://www.w3.org/2004/02/skos/core#"
LEVELS = {1: "category", 2: "class", 3: "subclass"}


def key(node, name):
    """Find a SKOS property whether the JSON-LD is compacted or expanded."""
    for k in (name, f"skos:{name}", SKOS + name):
        if k in node:
            return node[k]
    return None


def as_list(v):
    return v if isinstance(v, list) else ([] if v is None else [v])


def text(v, lang):
    for x in as_list(v):
        if isinstance(x, dict):
            if x.get("@language", "").lower().startswith(lang):
                return x.get("@value")
        elif isinstance(x, str) and lang == "en":
            return x
    return None


def ref(v):
    for x in as_list(v):
        return x.get("@id") if isinstance(x, dict) else x
    return None


def is_concept(node):
    types = as_list(node.get("@type"))
    return any(t in ("Concept", "skos:Concept", SKOS + "Concept") for t in types)


def load(path):
    with open(path, encoding="utf-8") as f:
        doc = json.load(f)
    nodes = doc.get("@graph", doc) if isinstance(doc, dict) else doc
    terms = {}
    for n in nodes:
        if not isinstance(n, dict) or not is_concept(n):
            continue
        label = text(key(n, "prefLabel"), "en")
        if not label:
            continue
        terms[n["@id"]] = {
            "id": n["@id"],
            "parent_id": ref(key(n, "broader")),
            "label_en": label,
            "label_fr": text(key(n, "prefLabel"), "fr"),
            "definition_en": text(key(n, "definition"), "en") or text(key(n, "scopeNote"), "en"),
        }
    return terms


def add_paths(terms):
    def chain(tid, seen=()):
        t = terms.get(tid)
        if not t or tid in seen:
            return []
        return chain(t["parent_id"], seen + (tid,)) + [t["label_en"]]

    for t in terms.values():
        if t["parent_id"] not in terms:
            t["parent_id"] = None  # drop links to concept schemes / outside vocabularies
        parts = chain(t["id"])
        t["path_en"] = " > ".join(parts)
        t["depth"] = len(parts)
        t["level"] = LEVELS.get(len(parts), "term")


def upsert(rows, url, key_):
    req = urllib.request.Request(
        f"{url}/rest/v1/nomenclature_terms?on_conflict=id",
        data=json.dumps(rows).encode(),
        method="POST",
        headers={
            "apikey": key_,
            "Authorization": f"Bearer {key_}",
            "Content-Type": "application/json",
            "Prefer": "resolution=merge-duplicates,return=minimal",
        },
    )
    urllib.request.urlopen(req).read()


def main():
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    url = os.environ["SUPABASE_URL"].rstrip("/")
    key_ = os.environ["SUPABASE_SERVICE_ROLE_KEY"]

    terms = load(sys.argv[1])
    if not terms:
        sys.exit("No SKOS concepts found - is this the JSON-LD export?")
    add_paths(terms)

    rows = sorted(terms.values(), key=lambda t: t["depth"])  # parents before children
    for i in range(0, len(rows), 500):
        upsert(rows[i : i + 500], url, key_)
        print(f"{min(i + 500, len(rows))}/{len(rows)}")
    print(f"Imported {len(rows)} terms.")


if __name__ == "__main__":
    main()
