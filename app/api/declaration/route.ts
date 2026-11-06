import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { COUNTIES, type DeclarationResponse } from "@/lib/types";

// Turns her incident log into a DRAFT of the "describe the abuse" narrative for California
// form DV-100. Only written entries + dates arrive here; photos/audio never leave the device.
// PRIVACY: never log request bodies or drafts.

const MODEL = "claude-opus-5-5";
const client = new Anthropic();

const RequestSchema = z.object({
  entries: z
    .array(
      z.object({
        happenedAt: z.string().max(40),
        text: z.string().max(8000),
        photos: z.number().int().min(0).max(50),
        voiceNotes: z.number().int().min(0).max(50),
      })
    )
    .min(1)
    .max(200),
  county: z.enum(COUNTIES).optional(),
  locale: z.enum(["en", "es"]),
});

const DraftSchema = z.object({
  mostRecent: z.string(),
  earlier: z.string(),
  toCheck: z.array(z.string()),
});

const SYSTEM = `You help a survivor of intimate partner violence in California turn her own private incident notes into a DRAFT of the narrative where she describes the abuse on Judicial Council form DV-100 (Request for Domestic Violence Restraining Order). She will review it with a legal aid advocate before filing anything.

Write it as her, in the first person, in plain, factual, chronological language:
- mostRecent: the most recent incident in detail — the date (or approximate date), where it happened, what he said and did, any injuries, any weapons, who else was there (including children), whether police or medical help was involved, and how it made her afraid. Only include details that are in her notes.
- earlier: the earlier incidents in date order, oldest first, each starting with its date (or approximate date), a short paragraph each.
- Where an entry says photos or voice notes were saved, add "(photo saved)" or "(voice note saved)" at that point so she remembers she has evidence.
- Use "he" or the name she uses for him in her notes. Keep her words where they are clear.

Strict rules
- Never invent, embellish, guess, or add facts, dates, injuries, or quotes that are not in her notes. If something is vague, keep it vague (e.g. "In early March") and add an item to toCheck instead.
- No legal conclusions or legal advice, no characterizing him beyond what she describes, no persuasive adjectives. Facts only.
- toCheck: short, specific items she should confirm or add with her advocate (missing dates, whether children were present, police report numbers, medical visits, witnesses). 3 to 8 items.
- Write in the language of her notes (English or Spanish), unless asked otherwise. Courts in California accept forms in English; if her notes are in Spanish, write the draft in Spanish and add a toCheck item that an advocate can help translate it.`;

function json(body: DeclarationResponse, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

const FAILED = {
  en: "Couldn't make the draft. Please try again.",
  es: "No se pudo hacer el borrador. Inténtalo de nuevo.",
};

export async function POST(req: Request) {
  let body: z.infer<typeof RequestSchema>;
  try {
    body = RequestSchema.parse(await req.json());
  } catch {
    return json({ type: "error", message: FAILED.en }, 400);
  }

  if (process.env.PLAN_MOCK === "1" && process.env.NODE_ENV !== "production") {
    const sorted = [...body.entries].sort((a, b) => a.happenedAt.localeCompare(b.happenedAt));
    const last = sorted[sorted.length - 1];
    return json({
      type: "draft",
      draft: {
        mostRecent: `[Sample draft — mock mode] On ${last.happenedAt.slice(0, 10)}, ${last.text}`,
        earlier: sorted
          .slice(0, -1)
          .map((e) => `On ${e.happenedAt.slice(0, 10)}, ${e.text}`)
          .join("\n\n"),
        toCheck: ["Confirm each date.", "Note whether your children saw any of this.", "Add any police report numbers."],
      },
    });
  }

  const notes = [...body.entries]
    .sort((a, b) => a.happenedAt.localeCompare(b.happenedAt))
    .map((e) => {
      const extras = [e.photos && `${e.photos} photo(s) saved`, e.voiceNotes && `${e.voiceNotes} voice note(s) saved`]
        .filter(Boolean)
        .join(", ");
      return `Date: ${e.happenedAt}${extras ? ` [${extras}]` : ""}\n${e.text || "(no written notes)"}`;
    })
    .join("\n\n---\n\n");

  try {
    const response = await client.beta.messages.parse({
      model: MODEL,
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "medium", format: betaZodOutputFormat(DraftSchema) },
      system: SYSTEM,
      messages: [
        {
          role: "user",
          content: `My notes, oldest first${body.county ? ` (I live in ${body.county} County)` : ""}:\n\n${notes}`,
        },
      ],
    });
    if (response.stop_reason === "refusal" || response.stop_reason === "max_tokens" || !response.parsed_output) {
      return json({ type: "error", message: FAILED[body.locale] }, 502);
    }
    return json({ type: "draft", draft: response.parsed_output });
  } catch (err) {
    console.error(err instanceof Anthropic.APIError ? `Claude API error ${err.status}` : "Declaration failed");
    return json({ type: "error", message: FAILED[body.locale] }, 502);
  }
}
