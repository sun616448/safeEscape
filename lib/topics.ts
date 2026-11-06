// Deterministic safety-planning checklist. The code decides WHAT still needs covering
// (in priority order); Claude decides HOW and WHEN to ask, one question at a time.

export const TOPICS = [
  "safe-now",
  "location",
  "lives-with-him",
  "kids",
  "how-safe",
  "phone-safety",
  "trusted-person",
  "money-transport",
  "documents",
  "pets",
  "immigration-language",
  "help-tried",
] as const;
export type Topic = (typeof TOPICS)[number];

/**
 * What each topic means for the plan, and how gently to ask it. Every topic is here only because the
 * answer changes the plan. Nothing here asks about what he did, injuries, or health.
 */
export const TOPIC_GUIDE: Record<Topic, string> = {
  "safe-now": "Is it safe for her to be chatting right now? (Decides whether to keep it short and lead with getting safe.)",
  location: "Just the city or area, never an address. (Finds help near her.)",
  "lives-with-him": "Does she live with him? (Changes how and when she can prepare or leave.)",
  kids: "Are there kids who'd come with her? (Shelter fit, their documents, school, custody help.)",
  "how-safe":
    "How safe she feels at home lately, in her own words, e.g. \"How have things felt at home lately?\" (Sets how urgent the plan is.) Never ask about specific acts, injuries, weapons, or threats. If she shares any, believe her, respond with care, and use it.",
  "phone-safety": "Could he see her phone, messages, or location? (Decides how she should contact help safely.)",
  "trusted-person": "Is there someone she trusts who could help or keep a bag for her? (A safe place and a go-bag spot.)",
  "money-transport": "Does she have a way to get around and some money of her own? (Transport and cash steps.)",
  documents: "Can she get to her ID and important papers? (Document steps.)",
  pets: "Are there pets she'd want to keep safe? (Pet-friendly options.)",
  "immigration-language":
    "OFFER, don't ask about status: whether she'd like help in another language, and that there are services that help no matter someone's immigration situation. (Picks the right resources.)",
  "help-tried": "Has she already talked to anyone, like a hotline or a shelter? (Builds on what she's done.)",
};

/** Older saves used these topic names. */
export const LEGACY_TOPICS: Record<string, Topic | null> = { "danger-signs": "how-safe", health: null };

/** Must be known (or declined) before Claude sends a first plan, unless she's in danger or asks. */
export const ESSENTIAL: Topic[] = ["safe-now", "location", "kids", "how-safe"];

/** Short note per topic. "declined" means she didn't want to answer: never ask again. */
export type TopicNotes = Partial<Record<Topic, string>>;

export function missingTopics(notes: TopicNotes = {}): Topic[] {
  return TOPICS.filter((t) => !notes[t]);
}

export function essentialsCovered(notes: TopicNotes = {}): boolean {
  return ESSENTIAL.every((t) => !!notes[t]);
}
