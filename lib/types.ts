// Shared contracts between the game layer and the hidden layer.
// Agree on changes with your partner before editing (see CLAUDE.md → Team workflow).

/** Which layer is on screen. Always client state, never a URL. */
export type Layer = "game" | "hidden";

export type County =
  | "san-francisco"
  | "alameda"
  | "contra-costa"
  | "san-mateo"
  | "santa-clara"
  | "marin"
  | "solano"
  | "napa"
  | "sonoma";

/** Request body for POST /api/plan */
export interface PlanRequest {
  situation: string;
  county?: County;
  hasKids?: boolean;
  hasPets?: boolean;
  inDangerNow?: boolean;
}

/** Response from POST /api/plan (produced by Claude, validated server-side). */
export interface Plan {
  dangerLevel: "immediate" | "planning";
  summary: string;
  steps: { title: string; detail: string; when: "now" | "today" | "this-week" }[];
  goBag: string[];
  /** IDs into data/resources.bay-area.json; the client looks up the details. */
  resources: { id: string; why: string }[];
}

export type ResourceType = "hotline" | "shelter" | "legal" | "counseling" | "housing" | "other";

export interface Resource {
  id: string;
  name: string;
  type: ResourceType;
  counties: County[] | ["all"];
  phone?: string;
  text?: string;
  url?: string;
  hours?: string;
  languages?: string[];
  notes?: string;
  lastVerified: string; // YYYY-MM-DD
}

/** What gets encrypted and saved on the device. */
export interface SavedState {
  situation: string;
  plan: Plan | null;
  checklist: Record<string, boolean>;
}
