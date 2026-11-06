import { essentialsCovered, missingTopics, type Topic, type TopicNotes } from "@/lib/topics";
import type { ChatTurn, Plan, PlanResponse } from "@/lib/types";

// Used only when PLAN_MOCK=1 (UI work without an API key). Never enabled in production.
// Walks the same deterministic checklist the real model is steered by, with canned wording.

const QUESTIONS: Record<Topic, string> = {
  "safe-now": "I'm really glad you reached out. Is it okay for you to chat right now?",
  location: "What city or area are you in? Just the city is plenty. It helps me find help near you.",
  "lives-with-him": "Do you live with him?",
  kids: "Are there kids who'd come with you? That changes which places can help.",
  "how-safe": "How have things felt at home lately? Whatever you share helps me know how quickly to plan.",
  "phone-safety": "Could he see your phone, messages, or location?",
  "trusted-person": "Is there someone you trust who could help, like a friend, family member, or coworker?",
  "money-transport": "Do you have any money of your own, and a way to get around?",
  documents: "Can you get to your ID and important papers, like birth certificates?",
  pets: "Are there any pets you'd want to keep safe?",
  "immigration-language": "Would help in another language be useful? There are also places that help no matter someone's immigration situation, if that matters to you.",
  "help-tried": "Have you already reached out anywhere, like a hotline, the police, or a shelter?",
};

const SAMPLE_PLAN: Plan = {
  dangerLevel: "planning",
  goal: "preparing",
  goalNote: "You want to be ready to leave with your kids, but not tonight.",
  title: "Getting ready with the kids",
  summary: "You're safe tonight and want to be ready to leave with your kids. Here's what to do over the next few days.",
  rightNow: {
    title: "Call to get on a shelter waitlist",
    detail: "Calling now holds your place even if you're not ready to leave yet.",
    contacts: ["a-safe-place"],
  },
  steps: [
    { title: "Call a 24/7 line when you're alone", detail: "Ask about shelter space and waitlists in Alameda County.", when: "now", contacts: ["fvlc"] },
    { title: "Photograph your important documents", detail: "IDs, birth certificates, Social Security cards. Save them somewhere he can't see, like a new email account.", when: "today" },
    { title: "Start a go-bag", detail: "Keep it at a trusted friend's place or at work if home isn't safe.", when: "today" },
    { title: "Check your phone's location sharing", detail: "Look in Maps and Find My, and for apps you didn't install.", when: "this-week" },
    { title: "Talk to a legal advocate", detail: "Ask about a restraining order and what it means for custody.", when: "this-week", contacts: ["fvlc"] },
  ],
  goBag: ["Photo ID", "Kids' birth certificates", "Medications", "Phone charger", "Cash", "Spare keys", "Change of clothes", "Kids' comfort items"],
  resources: [
    { id: "a-safe-place", why: "A 24-hour shelter in Oakland; they can tell you about space and waitlists." },
    { id: "fvlc", why: "Their 24/7 line helps with safety planning, and they offer free legal help with restraining orders." },
  ],
};

export function mockResponse(turns: ChatTurn[], prevNotes: TopicNotes): PlanResponse {
  const notes: TopicNotes = { ...prevNotes };
  const hers = turns[turns.length - 1].content;

  // Her latest message answers the topic we last asked about (the first gap before this turn).
  const askedBefore = turns.some((t) => t.role === "assistant");
  if (askedBefore) {
    const answered = missingTopics(prevNotes)[0];
    if (answered) notes[answered] = /rather not|skip|prefer not/i.test(hers) ? "declined" : hers.slice(0, 200);
  }

  const hadPlan = essentialsCovered(prevNotes);
  const next = missingTopics(notes)[0];
  const county = notes.location ? "alameda" : null;

  if (essentialsCovered(notes) && !hadPlan) {
    return {
      type: "reply",
      contacts: ["a-safe-place"],
      reply: `Thank you for telling me all that. I've made a first plan, and the first step is getting on a shelter waitlist. ${next ? QUESTIONS[next] : ""}`.trim(),
      county,
      notes,
      plan: SAMPLE_PLAN,
    };
  }
  return {
    type: "reply",
    contacts: [],
    reply: next ? QUESTIONS[next] : "Thank you. Your plan is up to date. Tell me whenever something changes.",
    county,
    notes,
    plan: null,
  };
}
