import { z } from "zod";
import { TOPICS } from "@/lib/topics";
import { COUNTIES, GOALS } from "@/lib/types";

// Structured output Claude returns on every chat turn.

/** Resource ids from the vetted list, or "911". The app turns them into Call/Text buttons. */
const Contacts = z.array(z.string());

export const StepSchema = z.object({
  title: z.string(),
  detail: z.string(),
  when: z.enum(["now", "today", "this-week"]),
  contacts: Contacts,
});

export const PlanSchema = z.object({
  dangerLevel: z.enum(["immediate", "planning"]),
  goal: z.enum(GOALS),
  goalNote: z.string(),
  title: z.string(),
  summary: z.string(),
  rightNow: z.object({ title: z.string(), detail: z.string(), contacts: Contacts }),
  steps: z.array(StepSchema),
  goBag: z.array(z.string()),
  resources: z.array(z.object({ id: z.string(), why: z.string() })),
});

/** What the client sends back: older saves and her own added steps may have no contacts. */
export const PlanInputSchema = PlanSchema.extend({
  rightNow: z.object({ title: z.string(), detail: z.string(), contacts: Contacts.optional() }),
  steps: z.array(StepSchema.extend({ contacts: Contacts.optional() })),
});

export const ModelOutputSchema = z.object({
  /** The chat message she sees. Usually ends with one gentle question. */
  reply: z.string(),
  /** Anyone the reply suggests she call or text (ids or "911"); empty if none. */
  contacts: Contacts,
  /** What she revealed this turn, per checklist topic. Note "declined" if she didn't want to answer. */
  learned: z.array(z.object({ topic: z.enum(TOPICS), note: z.string() })),
  /** County inferred from the city/neighborhood she mentions, if any. */
  county: z.enum(COUNTIES).nullable(),
  /** Full updated plan when there's enough to act on or something changed; otherwise null. */
  plan: PlanSchema.nullable(),
});

export type ModelOutput = z.infer<typeof ModelOutputSchema>;
