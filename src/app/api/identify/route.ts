import { createClient } from "@supabase/supabase-js";

export const maxDuration = 60;

const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-5-5";

type Candidate = {
  id: string;
  label_en: string;
  path_en: string | null;
  definition_en: string | null;
  alt_en: string[] | null;
};

type Details = {
  description: string;
  title: string;
  materials: string | null;
  date_estimate: string | null;
  maker: string | null;
  search_terms: string[];
};

type Match = { term_id: string; confidence: "high" | "medium" | "low"; reason: string };

async function callClaude(content: unknown[], tool: { name: string; description: string; input_schema: object }) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": process.env.ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1500,
      tools: [tool],
      tool_choice: { type: "tool", name: tool.name },
      messages: [{ role: "user", content }],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic API ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = await res.json();
  const block = data.content?.find((b: { type: string }) => b.type === "tool_use");
  if (!block) throw new Error("No structured answer from the model");
  return block.input;
}

const DESCRIBE_TOOL = {
  name: "describe_object",
  description: "Record what the object in the photo is.",
  input_schema: {
    type: "object",
    properties: {
      description: { type: "string", description: "2-3 sentences: what it is, form, function, notable features." },
      title: { type: "string", description: "Short catalog title, e.g. 'Brass candlestick, pair'." },
      materials: { type: ["string", "null"] },
      date_estimate: { type: ["string", "null"], description: "e.g. 'c. 1950s' or null if unclear." },
      maker: { type: ["string", "null"], description: "Maker/designer/brand only if visible or near-certain." },
      search_terms: {
        type: "array",
        items: { type: "string" },
        description:
          "5-10 plain English object names to look up in Nomenclature for Museum Cataloging, most specific first, then broader (e.g. 'teapot', 'pot, tea', 'pot', 'vessel'). Names of the object type, not adjectives.",
      },
    },
    required: ["description", "title", "materials", "date_estimate", "maker", "search_terms"],
  },
};

const CHOOSE_TOOL = {
  name: "choose_terms",
  description: "Pick the Nomenclature terms that best name the object.",
  input_schema: {
    type: "object",
    properties: {
      matches: {
        type: "array",
        maxItems: 3,
        items: {
          type: "object",
          properties: {
            term_id: { type: "string", description: "id from the candidate list" },
            confidence: { type: "string", enum: ["high", "medium", "low"] },
            reason: { type: "string", description: "One short sentence." },
          },
          required: ["term_id", "confidence", "reason"],
        },
      },
    },
    required: ["matches"],
  },
};

export async function POST(request: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({ error: "ANTHROPIC_API_KEY is not set on the server." }, { status: 500 });
  }

  const { image } = (await request.json()) as { image?: string };
  const m = image?.match(/^data:(image\/(?:jpeg|png|webp|gif));base64,(.+)$/);
  if (!m) return Response.json({ error: "Send a photo as a data URL." }, { status: 400 });
  const imageBlock = { type: "image", source: { type: "base64", media_type: m[1], data: m[2] } };

  try {
    // 1. Describe the object and propose names to look up
    const details: Details = await callClaude(
      [
        imageBlock,
        {
          type: "text",
          text: "You are a museum cataloger. Identify the object in this photo for a collector's catalog.",
        },
      ],
      DESCRIBE_TOOL
    );

    // 2. Look those names up in Nomenclature
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
    );
    const found = new Map<string, Candidate>();
    const lookups = await Promise.all(
      details.search_terms.slice(0, 10).map((q) => supabase.rpc("search_terms", { q, max_results: 8 }))
    );
    for (const { data } of lookups) {
      for (const t of (data as Candidate[]) ?? []) if (!found.has(t.id)) found.set(t.id, t);
    }
    const candidates = [...found.values()].slice(0, 60);

    if (candidates.length === 0) {
      return Response.json({ details, suggestions: [] });
    }

    // 3. Pick the best Nomenclature terms from the candidates
    const list = candidates
      .map(
        (c) =>
          `${c.id} | ${c.label_en} | ${c.path_en ?? ""}` +
          (c.alt_en?.length ? ` | also: ${c.alt_en.slice(0, 4).join(", ")}` : "") +
          (c.definition_en ? ` | ${c.definition_en.slice(0, 160)}` : "")
      )
      .join("\n");

    const { matches }: { matches: Match[] } = await callClaude(
      [
        imageBlock,
        {
          type: "text",
          text:
            `Object description: ${details.description}\n\n` +
            "Candidate terms from Nomenclature for Museum Cataloging (id | term | hierarchy | alternates | definition):\n" +
            list +
            "\n\nChoose up to 3 terms that correctly name this object, best first. Prefer the most specific term that is " +
            "clearly correct; if unsure between specific and broader, include both. Only use ids from the list.",
        },
      ],
      CHOOSE_TOOL
    );

    const suggestions = matches
      .filter((x) => found.has(x.term_id))
      .map((x) => {
        const t = found.get(x.term_id)!;
        return { ...x, label_en: t.label_en, path_en: t.path_en, definition_en: t.definition_en };
      });

    return Response.json({ details, suggestions });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 502 });
  }
}
