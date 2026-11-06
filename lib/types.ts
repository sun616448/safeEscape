import type { TopicNotes } from "@/lib/topics";

// Shared contracts between the game layer and the hidden layer.
// Agree on changes with your partner before editing (see CLAUDE.md → Team workflow).

/** Which layer is on screen. Always client state, never a URL. */
export type Layer = "game" | "hidden";

/**
 * Outcome of a code typed into the game's "Redeem a code" field.
 * - "unlock":  My code (real passcode); the caller has switched to the hidden layer.
 * - "reward":  Clear code (panic); the caller has wiped saved data, and the game shows a
 *              normal "Code redeemed" reward so it looks like the code worked.
 * - "setup":   the public invite code on a device with no codes yet; the game opens setup.
 * - "expired": anything else; shown as an ordinary expired promo code.
 */
export type CodeResult = "unlock" | "reward" | "setup" | "expired";

export type Locale = "en" | "es";

export const COUNTIES = [
  "san-francisco",
  "alameda",
  "contra-costa",
  "san-mateo",
  "santa-clara",
  "marin",
  "solano",
  "napa",
  "sonoma",
] as const;
export type County = (typeof COUNTIES)[number];

/** One message in a situation chat. Saved (encrypted) so she can continue later. */
export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
  /** Who her reply tells her to contact: resource ids or "911". The app shows Call/Text buttons. */
  contacts?: string[];
}

/** Request body for POST /api/plan */
export interface PlanRequest {
  /** Recent chat history; last turn is always hers. */
  turns: ChatTurn[];
  county?: County;
  notes?: TopicNotes;
  currentPlan?: Plan;
  /** Titles of plan steps / go-bag items she has checked off. */
  done?: string[];
  locale: Locale;
}

export const GOALS = ["leave-now", "leave-soon", "preparing", "exploring", "stay-safer"] as const;
/**
 * leave-now: leaving today/tonight · leave-soon: within days/weeks · preparing: getting ready, no date
 * exploring: figuring out options, unsure about leaving · stay-safer: staying for now, wants to be safer
 */
export type Goal = (typeof GOALS)[number];

export type StepWhen = "now" | "today" | "this-week";

export interface PlanStep {
  title: string;
  detail: string;
  when: StepWhen;
  /** Who this step means calling/texting: resource ids or "911". Shown as action buttons. */
  contacts?: string[];
}

/** A personalized plan produced by Claude (validated server-side). */
export interface Plan {
  dangerLevel: "immediate" | "planning";
  /** Short title she'll recognize in her saved list, e.g. "Leaving with the kids". */
  title: string;
  summary: string;
  /** What she seems to want, inferred from the chat; she can correct it by saying so. */
  goal: Goal;
  /** One plain sentence reflecting her goal back, e.g. "You want to be ready to leave in a few weeks with your kids." */
  goalNote: string;
  /** The single most important thing to do next; drives the "Right now" card. */
  rightNow: { title: string; detail: string; contacts?: string[] };
  steps: PlanStep[];
  goBag: string[];
  /** IDs into data/resources.bay-area.json; the client looks up the details. */
  resources: { id: string; why: string }[];
}

/** Response from POST /api/plan: a chat reply, plus an updated plan when there is one. */
export type PlanResponse =
  | { type: "reply"; reply: string; contacts: string[]; county: County | null; notes: TopicNotes; plan: Plan | null }
  | { type: "error"; message: string };

export type ResourceType = "hotline" | "shelter" | "legal" | "counseling" | "housing" | "other";

export interface Resource {
  id: string;
  name: string;
  type: ResourceType;
  counties: (County | "all")[];
  phone?: string;
  text?: string;
  url?: string;
  hours?: string;
  languages?: string[];
  /** One short line shown on the card (en / es). */
  blurb: string;
  blurbEs: string;
  notes?: string;
  lastVerified: string; // YYYY-MM-DD
  source?: string; // where the phone/URL was verified
}

/** Her ongoing situation: the chat plus the plan it has built so far. */
export interface Situation {
  id: string;
  createdAt: string; // ISO
  updatedAt: string; // ISO
  turns: ChatTurn[];
  county?: County;
  /** What Claude has learned per checklist topic (lib/topics.ts). Sensitive: lives only in the encrypted save. */
  notes: TopicNotes;
  plan: Plan | null;
  /** "right-now:<title>", "step:<title>", "bag:<item>" → done */
  checked: Record<string, boolean>;
}

/** A photo or voice note attached to a log entry. Bytes live encrypted in IndexedDB (lib/vault.ts). */
export interface LogMedia {
  id: string;
  kind: "photo" | "audio";
}

/** One documented incident. Stays on the device; only text + dates are ever sent (for the court draft). */
export interface LogEntry {
  id: string;
  /** When it happened (she can edit this); ISO. */
  happenedAt: string;
  /** When she wrote it down; ISO. */
  createdAt: string;
  text: string;
  media: LogMedia[];
}

/** What gets encrypted and saved on the device: one ongoing chat, its plan, and the incident log. */
export interface SavedState {
  version: 4;
  locale: Locale;
  situation: Situation;
  log: LogEntry[];
}

/** Request body for POST /api/declaration */
export interface DeclarationRequest {
  entries: { happenedAt: string; text: string; photos: number; voiceNotes: number }[];
  county?: County;
  locale: Locale;
}

/** A draft of the "describe the abuse" narrative for California form DV-100. */
export interface Declaration {
  mostRecent: string;
  earlier: string;
  /** Things to check, add, or bring (e.g. "Confirm the date of the March incident"). */
  toCheck: string[];
}

export type DeclarationResponse = { type: "draft"; draft: Declaration } | { type: "error"; message: string };
