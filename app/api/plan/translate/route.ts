import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { PlanInputSchema } from "@/lib/plan-schema";
import type { Plan } from "@/lib/types";

// Translates her plan's text when she switches the app language. Structure (order, ids, contacts,
// step timing) is kept on the server; Claude only rewrites the words. PRIVACY: never log bodies.

const client = new Anthropic();

const RequestSchema = z.object({ plan: PlanInputSchema, locale: z.enum(["en", "es"]) });

const TextSchema = z.object({
  title: z.string(),
  summary: z.string(),
  goalNote: z.string(),
  rightNow: z.object({ title: z.string(), detail: z.string() }),
  steps: z.array(z.object({ title: z.string(), detail: z.string() })),
  goBag: z.array(z.string()),
  resourceWhy: z.array(z.string()),
});

const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

export async function POST(req: Request) {
  let body: z.infer<typeof RequestSchema>;
  try {
    body = RequestSchema.parse(await req.json());
  } catch {
    return json({ type: "error" }, 400);
  }
  const { plan, locale } = body;
  const source = {
    title: plan.title,
    summary: plan.summary,
    goalNote: plan.goalNote,
    rightNow: { title: plan.rightNow.title, detail: plan.rightNow.detail },
    steps: plan.steps.map((s) => ({ title: s.title, detail: s.detail })),
    goBag: plan.goBag,
    resourceWhy: plan.resources.map((r) => r.why),
  };

  if (process.env.PLAN_MOCK === "1" && process.env.NODE_ENV !== "production") {
    return json({ type: "plan", plan }); // mock: unchanged
  }

  try {
    const response = await client.beta.messages.parse({
      model: "claude-opus-5-5",
      max_tokens: 8000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "low", format: betaZodOutputFormat(TextSchema) },
      system:
        "You translate a personal safety plan for a survivor of intimate partner violence. Translate every string into " +
        (locale === "es" ? "Spanish (warm, plain, Latin American Spanish; use the informal tú)" : "English (warm and plain)") +
        ". If a string is already in that language, keep it. Keep the meaning, tone, and length; keep organization names as they are. Return exactly the same structure with the same number of items in the same order.",
      messages: [{ role: "user", content: JSON.stringify(source) }],
    });
    const out = response.parsed_output;
    if (
      !out ||
      out.steps.length !== plan.steps.length ||
      out.goBag.length !== plan.goBag.length ||
      out.resourceWhy.length !== plan.resources.length
    ) {
      return json({ type: "error" }, 502);
    }
    const translated: Plan = {
      ...plan,
      title: out.title,
      summary: out.summary,
      goalNote: out.goalNote,
      rightNow: { ...plan.rightNow, ...out.rightNow },
      steps: plan.steps.map((s, i) => ({ ...s, ...out.steps[i] })),
      goBag: out.goBag,
      resources: plan.resources.map((r, i) => ({ ...r, why: out.resourceWhy[i] })),
    };
    return json({ type: "plan", plan: translated });
  } catch (err) {
    console.error(err instanceof Anthropic.APIError ? `Claude API error ${err.status}` : "Translate failed");
    return json({ type: "error" }, 502);
  }
}
