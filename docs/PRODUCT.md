# designID

**Catalog your collection with museum-standard names.**
Photograph an object, name it with Nomenclature for Museum Cataloging, and keep its story, value and location in one place.

> Living brief. Pieretti owns the vision sections; edit freely. Anything marked *(decided)* is what's being built — change it here first so both build chats stay in sync.

---

## Who it's for

**Now — Pieretti's own collection** *(decided)*
One collector, design objects, photo-first. Every feature is judged by whether Pieretti actually uses it.

**Later — possibly**
- Private design collectors with similar collections
- Dealers and advisors managing several collections
- Small museums and historic houses that already use Nomenclature

---

## What makes it different

Collector Systems (collectorsystems.com) is the closest comparable: deep, institutional, 1,000+ custom fields, its own classifications. designID takes the opposite approach:

- **The museum standard is the backbone.** Every object carries a Nomenclature term and its full path (Furnishings > Furniture > Seating Furniture > Chair), so the collection is searchable and comparable the way museums catalog.
- **Photo first, light by design.** Snap it, confirm the term, add what you know. A few well-chosen fields instead of a thousand.
- **Built for design objects.** Maker/designer, date, materials, provenance up front.

---

## Features

### Cataloging — *built*
- Photo upload, multiple images per item, primary image for the gallery
- Nomenclature term picker: type "chair", pick from the full hierarchy
- Maker / designer, date made, materials, dimensions, condition, description, provenance

### Collection gallery — *built*
- Photo grid of the whole collection
- Filter by top-level Nomenclature category
- Item count and total current value

### Acquisition & value — *built*
- Date acquired, how (purchase, auction, gift, inheritance…), from whom, price paid
- Dated valuation history: amount, basis (insurance, fair market, auction estimate, owner estimate), appraiser, notes
- Latest valuation shown on the item and rolled into the collection total

### Location — *built*
- Where each item is (room, storage, on loan)

### Next — *proposed, in order*
1. **Insurance / appraisal report** — PDF of the collection or a filtered set, with photos, terms and current values
2. **Edit item** — change details and photos after saving
3. **AI-suggested term** — upload a photo, get the likely Nomenclature term to confirm
4. **Public gallery page** — one shareable page per collection or selection
5. **Collections** — group items (by room, by designer, for a loan); tables exist, no screens yet

### Not now
- Native iOS/Android apps — the web app works on a phone camera
- Custom-field builder / 1,000-field model
- Multi-user teams and permissions
- WordPress / API publishing

---

## Data standard

Nomenclature for Museum Cataloging (CHIN / AASLH), version 4.0 plus ongoing updates. Licensed CC BY 4.0: free to use, attribution required (in the site footer). Imported from the JSON-LD download at nomenclature.info.

---

## Build status

| Piece | Status |
|---|---|
| GitHub repo | github.com/jeffsosville/designid (`main`) |
| Supabase | Project in the **designID** org (free plan, us-west-2). Migrations in `supabase/migrations/`, run in order in the SQL Editor |
| Migrations run | 001 initial schema — run. 002 acquisition/location/valuations and 003 no-login — **need running** |
| Nomenclature terms | **Not loaded yet** — need the JSON-LD file, then `scripts/import_nomenclature.py` |
| Hosting | Vercel |
| Sign-in | **None** — open demo, anyone with the URL can view and edit (migration 003). Add a passcode before sharing widely |
| Claude access | Supabase connector can't see the designID org yet — reconnect and select it |

---

## Open questions for Pieretti

- What kinds of objects are in the collection, and roughly how many?
- Which fields do you actually record today (spreadsheet, insurer forms)?
- Who needs the insurance report, and what format do they want?
- Anything you want to show publicly?

---

*Last updated: Oct 8, 2026*
