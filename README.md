# designID

Photograph an object, name it with Nomenclature for Museum Cataloging, and keep it in a searchable collection.

Stack: Next.js 16 (App Router), Tailwind, Supabase (Postgres, Auth, Storage).

## Setup

1. **Database** – run each file in `supabase/migrations/` in order (001, 002, …) in the Supabase SQL Editor.
2. **Auth** – email + password, no emails sent. Supabase > Authentication > Sign In / Providers > Email: turn **off** "Confirm email".
3. **Env** – copy `.env.local.example` to `.env.local` and fill in the URL and publishable key.
4. **Terms** – download the JSON-LD export from nomenclature.info (Integration page), then:
   ```bash
   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... python scripts/import_nomenclature.py nomenclature.jsonld
   ```
5. `npm install && npm run dev`

## What's here

- `/login` – email + password sign in / create account
- `/` – gallery, filterable by top-level Nomenclature category
- `/items/new` – upload photos, pick a Nomenclature term, add details
- `/items/[id]` – item detail with the term's full hierarchy and definition

Each user only sees their own items and images (row-level security + per-user storage folders).

Nomenclature is CC BY 4.0; the footer carries the attribution.
