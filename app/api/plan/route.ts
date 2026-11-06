import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { mockResponse } from "@/lib/mock-plan";
import { ModelOutputSchema, PlanInputSchema } from "@/lib/plan-schema";
import { buildSystemPrompt, MAX_TURNS } from "@/lib/prompt";
import { essentialsCovered, LEGACY_TOPICS, missingTopics, TOPICS, type Topic, type TopicNotes } from "@/lib/topics";
import { getResource, resourcesFor, RESOURCES } from "@/lib/resources";
import { COUNTIES, type PlanResponse } from "@/lib/types";

// PRIVACY: never log request bodies, chat text, or generated plans.

const MODEL = "claude-opus-5-5";
const client = new Anthropic(); // reads ANTHROPIC_API_KEY

const RequestSchema = z.object({
  turns: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().trim().min(1).max(4000),
      })
    )
    .min(1)
    .max(200)
    .refine((t) => t[t.length - 1].role === "user", { message: "Last turn must be hers." }),
  county: z.enum(COUNTIES).optional(),
  notes: z.record(z.string().max(40), z.string().max(500)).optional(),
  currentPlan: PlanInputSchema.optional(),
  done: z.array(z.string().max(300)).max(100).optional(),
  locale: z.enum(["en", "es"]),
});

// Best-effort per-IP rate limit (in-memory; resets per server instance).
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 40;
const hits = new Map<string, number[]>();
function rateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > MAX_PER_WINDOW;
}

const ERRORS = {
  en: {
    busy: "Too many messages. Please wait a few minutes and try again.",
    failed: "Something went wrong. Please try again.",
    bad: "Something went wrong. Please try again.",
  },
  es: {
    busy: "Demasiados mensajes. Espera unos minutos e inténtalo de nuevo.",
    failed: "Algo salió mal. Inténtalo de nuevo.",
    bad: "Algo salió mal. Inténtalo de nuevo.",
  },
};

function json(body: PlanResponse, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (rateLimited(ip)) return json({ type: "error", message: ERRORS.en.busy }, 429);

  let body: z.infer<typeof RequestSchema>;
  try {
    body = RequestSchema.parse(await req.json());
  } catch {
    return json({ type: "error", message: ERRORS.en.bad }, 400);
  }
  const t = ERRORS[body.locale];

  if (process.env.PLAN_MOCK === "1" && process.env.NODE_ENV !== "production") {
    return json(mockResponse(body.turns, (body.notes ?? {}) as TopicNotes));
  }

  // Send the most recent turns; the current plan carries what came before.
  let recent = body.turns.slice(-MAX_TURNS);
  while (recent.length && recent[0].role !== "user") recent = recent.slice(1);

  const messages: Anthropic.Beta.BetaMessageParam[] = recent.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  // App-provided context goes in a trailing system message so the cached prefix stays stable.
  // Keep only current topics; map older saves (e.g. "danger-signs" → "how-safe"; "health" is dropped).
  const notes: TopicNotes = {};
  for (const [k, v] of Object.entries(body.notes ?? {})) {
    const topic = (TOPICS as readonly string[]).includes(k) ? (k as Topic) : LEGACY_TOPICS[k];
    if (topic && !notes[topic]) notes[topic] = v;
  }
  const known = Object.entries(notes).map(([k, v]) => `- ${k}: ${v}`);
  const missing = missingTopics(notes);
  const context = [
    `App language: ${body.locale === "es" ? "Spanish" : "English"}. Write the plan in this language. Reply in the language she writes in.`,
    body.county ? `County known so far: ${body.county}.` : "County not known yet.",
    known.length ? `What you know so far:\n${known.join("\n")}` : "You don't know anything about her situation yet.",
    missing.length
      ? `Still unknown, in priority order: ${missing.join(", ")}.`
      : "All checklist topics are covered.",
    essentialsCovered(notes)
      ? "Essentials are covered: you can send a plan."
      : "Essentials not yet covered: hold the first plan unless she's in danger or asks for one.",
    body.currentPlan
      ? `Her current plan, including any edits she made herself (update it if anything changed):\n${JSON.stringify(body.currentPlan)}`
      : "No plan yet.",
    body.done?.length ? `Already done (she checked these off): ${body.done.join("; ")}.` : "",
  ]
    .filter(Boolean)
    .join("\n");
  messages.push({ role: "system", content: context });

  try {
    const response = await client.beta.messages.parse({
      model: MODEL,
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "low", format: betaZodOutputFormat(ModelOutputSchema) },
      system: [
        {
          type: "text",
          // Full list (not county-filtered) keeps the prompt identical across requests → cacheable.
          text: buildSystemPrompt(RESOURCES),
          cache_control: { type: "ephemeral" },
        },
      ],
      messages,
    });

    if (response.stop_reason === "refusal" || response.stop_reason === "max_tokens") {
      return json({ type: "error", message: t.failed }, 502);
    }
    const out = response.parsed_output;
    if (!out) return json({ type: "error", message: t.failed }, 502);

    const county = out.county ?? body.county ?? null;
    const updatedNotes: TopicNotes = { ...notes };
    for (const { topic, note } of out.learned) if (note.trim()) updatedNotes[topic] = note.trim().slice(0, 500);
    // Enforce vetted-only resources: plan-level picks must serve her area; contacts may be any vetted id or 911.
    const allowed = new Set(resourcesFor(county ?? undefined).map((r) => r.id));
    const clean = (ids: string[] = []) =>
      [...new Set(ids)].filter((id) => id === "911" || getResource(id)).slice(0, 3);
    let plan = out.plan;
    if (plan) {
      const first = plan.rightNow.title.trim().toLowerCase();
      plan = {
        ...plan,
        rightNow: { ...plan.rightNow, contacts: clean(plan.rightNow.contacts) },
        steps: plan.steps
          .filter((s) => s.title.trim().toLowerCase() !== first) // never repeat the first step
          .map((s) => ({ ...s, contacts: clean(s.contacts) })),
        resources: plan.resources.filter((r) => getResource(r.id) && allowed.has(r.id)),
      };
    }

    return json({ type: "reply", reply: out.reply, contacts: clean(out.contacts), county, notes: updatedNotes, plan });
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) {
      return json({ type: "error", message: t.busy }, 429);
    }
    if (err instanceof Anthropic.APIError) {
      console.error(`Claude API error ${err.status}`); // status only, never content
    } else {
      console.error("Plan request failed");
    }
    return json({ type: "error", message: t.failed }, 502);
  }
}
