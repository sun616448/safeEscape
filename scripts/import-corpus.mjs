// Builds data/resources.bay-area.json from the team corpus (safeescape-corpus/resources.json).
// Run: node --env-file=.env.local scripts/import-corpus.mjs
// Spanish one-liners are made once with Claude and cached in data/blurbs.es.json (edit by hand freely).
import fs from "node:fs";
import Anthropic from "@anthropic-ai/sdk";

const SRC = "safeescape-corpus/resources.json";
const OUT = "data/resources.bay-area.json";
const ES = "data/blurbs.es.json";

const COUNTY = {
  "San Francisco": "san-francisco", "Alameda": "alameda", "Contra Costa": "contra-costa", "San Mateo": "san-mateo",
  "Santa Clara": "santa-clara", "Marin": "marin", "Solano": "solano", "Napa": "napa", "Sonoma": "sonoma",
};
const TYPE = { hotline: "hotline", shelter: "shelter", housing: "housing", legal: "legal", court_help: "legal" };

const firstSentence = (s) => (s ?? "").split(/(?<=\.)\s/)[0].trim();
/** "415-200-3575 (24-hr text); teen line…" → "Text 415-200-3575"; "Youth text line (510) 214-6331" → "Text (510) 214-6331" */
function textLine(t) {
  if (!t) return undefined;
  const first = t.split(";")[0].trim();
  if (/^text\s+\S+\s+to\s/i.test(first) || /^text\s+911$/i.test(first)) return first.replace(/\s*\((?!\d).*\)\s*$/, "");
  const num = first.match(/\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/);
  return num ? `Text ${num[0]}` : undefined;
}

const src = JSON.parse(fs.readFileSync(SRC, "utf8"));
const cache = fs.existsSync(ES) ? JSON.parse(fs.readFileSync(ES, "utf8")) : {};

const out = src.map((r) => {
  const counties = r.counties.length === 9 ? ["all"] : r.counties.map((c) => COUNTY[c]);
  return {
    id: r.id,
    name: r.name,
    type: TYPE[r.category] ?? "other",
    category: r.category,
    counties,
    blurb: firstSentence(r.when_to_use),
    blurbEs: cache[r.id] ?? "",
    phone: r.phone_24h ?? r.phone_office ?? undefined,
    is24h: !!r.phone_24h,
    text: textLine(r.text),
    url: r.website ?? undefined,
    hours: r.hours ?? undefined,
    languages: Array.isArray(r.languages) ? r.languages : r.languages ? String(r.languages).split(/\s*[,;]\s*/) : undefined,
    notes: r.services ?? undefined,
    accessNote: r.access_note ?? undefined,
    whenToUse: r.when_to_use,
    urgency: r.urgency,
    topics: r.topics ?? [],
    quietChannels: r.situation?.partner_home ?? [],
    channelNotes: r.channel_notes ?? undefined,
    constraints: {
      children: r.constraints.children.status,
      pets: r.constraints.pets.status,
      citizenshipRequired: r.constraints.citizenship_required.status,
      population: r.constraints.population ?? undefined,
    },
    confidence: r.confidence,
    flag: r.verification_flag ?? undefined,
    focus: r.focus,
    lastVerified: r.verified_on,
    source: r.source_url,
  };
});

const missing = out.filter((r) => !r.blurbEs);
if (missing.length) {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error(`${missing.length} entries need Spanish blurbs; set ANTHROPIC_API_KEY`);
  const client = new Anthropic();
  const msg = await client.messages.create({
    model: "claude-opus-5-5",
    max_tokens: 8000,
    system:
      "Translate each line into warm, plain Latin American Spanish (informal tú). Keep organization names. Return only a JSON object mapping each id to its translation.",
    messages: [{ role: "user", content: JSON.stringify(Object.fromEntries(missing.map((r) => [r.id, r.blurb]))) }],
  });
  const text = msg.content.find((b) => b.type === "text")?.text ?? "{}";
  const es = JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1));
  for (const r of missing) if (es[r.id]) cache[r.id] = r.blurbEs = es[r.id];
  fs.writeFileSync(ES, JSON.stringify(cache, null, 2) + "\n");
}

fs.writeFileSync(OUT, JSON.stringify(out, null, 2) + "\n");
console.log(`wrote ${out.length} resources (${out.filter((r) => r.focus).length} focus); ${out.filter((r) => !r.blurbEs).length} without Spanish`);
