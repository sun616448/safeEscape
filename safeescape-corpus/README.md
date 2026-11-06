# SafeEscape Bay Area DV Resource Corpus (v0.2, verified 2026-11-06)

**Focus counties: San Francisco, San Mateo, Santa Clara.** The six other Bay Area counties are kept in the data (`focus: false`) but are not exported to the app candidate file.

Self-contained and untracked by git; nothing outside this folder was modified.

## Files
- `build.py` - source of truth. Edit entries here, run `python3 -I build.py` (validates schema, writes the JSON/CSV).
- `resources.json` / `resources.csv` - all 75 entries (52 in focus counties).
- `resources.bay-area.candidate.json` - focus-county entries in the shape of CLAUDE.md's `data/resources.bay-area.json` plus extra fields. Copy/merge into `data/` in a PR once the shared schema is agreed; this folder never touches `data/` or `lib/types.ts`.
- `leaving_plan.json` - phased steps, each with `home_actions` (quiet, partner nearby) and `away_actions` (needs privacy), linked to resources by filter.
- `match.py` - reference matcher with 5 scenario tests (`python3 -I match.py`). Port the logic to TypeScript.

## Using it in the app
Goal: the user describes their situation in plain language and Claude uses it to chat or connect them to resources.
- `resources.prompt.txt` - compact one-line-per-entry list (about 3.5k tokens, 52 entries) to put in the system prompt. No retrieval needed.
- `system_prompt.md` - draft system prompt: triage, partner-present vs away, constraint handling, cite-by-id only, output JSON. Proposal for `app/api/plan/route.ts`.
- Inconsistent and unverified entries are **flagged, not fixed** (hackathon time): `verification_flag` is `inconsistent` (4) or `unverified` (17 aggregator-only; 11 in the three focus counties). The prompt tells Claude to prefer unflagged resources and say "confirm by phone"; the UI should show the same note.

## Situation layer (new in v0.2)
| Field | Values | Use |
|---|---|---|
| `urgency` | `immediate`, `planning` | "I need to be safe now" vs "I'm planning to leave" |
| `channels` | `voice`, `in_person` (need privacy) / `text`, `chat`, `web_form`, `email`, `web_info` (quiet) | when can the user do this? |
| `situation.partner_home` / `partner_away` | derived lists | UI buckets: "you can do this now" vs "do this when partner is away" |
| `partner_home_ok` | bool | quick filter |
| `channel_notes` | text | exact text number, chat URL, cautions |
| `constraints.children / pets / citizenship_required` | `{status: yes/no/unknown/partial, note}` | matching; `unknown` means "ask them", never "no" |
| `constraints.population` | text | who is served |
| `topics` | restraining_order, custody, immigration, money, pets, address_confidentiality, tech_safety, safety_planning | need-based matching |
| `when_to_use` | one line | what Claude matches the user's situation against |
| `confidence` | official / aggregator / conflict | how much to trust it; show "verify" for non-official |

Matcher rules: drop an entry only on an explicit `no`. `unknown` stays, with a flag ("ask about pets/children"). Immigration concern never filters out on citizenship unless an entry says `yes`; it boosts entries with `topics: immigration`. If partner is present, quiet-channel entries go to "now" and the rest go to "later".

Quiet is not the same as safe: browser history, message threads and shared accounts can reveal contact. The app should say so and offer the safer-device advice.

## What the research found
- **Quiet channels exist but are few.** San Francisco: SF.gov says text 911 if unsafe to call; La Casa 24-hr text line; Mayor's Office for Victims' Rights online form. San Mateo: text 911 (English only), court LiveChat and Guide-and-File online forms. Santa Clara: SafeChat Silicon Valley, court live chat/email. National DV Hotline chat/text everywhere.
- **Pets:** only San Mateo has a verified program (PHS Safe Pets: up to 30 days free, needs CORA referral and county residency). **None found for SF or Santa Clara.** Shelter pet policies are mostly unstated.
- **Citizenship:** explicit "no requirement" only for Next Door Solutions and CUAV (directory source) and San Mateo Victim Services (county page). Everything else is `unknown`. Immigration legal help is well covered (VAWA/U-visa providers listed per county).
- **Children:** CORA, Next Door Solutions, La Casa, Asian Women's Shelter, Raphael House serve children; boys' age limits mostly unstated (NDS: up to 18).
- **Rides:** no published, verified program found in any of the three counties. Uber Hope Rides funds 15 Family Justice Centers in 9 states, list not published. The plan tells users to ask the advocate; do not present this as a guaranteed service.

## Known conflicts / verify before launch
1. Next Door Solutions address: 234 E Gish Rd (county page) vs 1400 Parkmoor Ave (1degree). Shelter details come from 1degree only.
2. SF SafeHouse (1089 Mission) vs Riley Center (1175 Howard): two sf.gov pages agree, an HSH flyer parse swapped them. Phone-confirm before sending anyone in person.
3. Santa Clara Restraining Order Help Center hours differ between county page and court flyer.
4. San Mateo Family Justice Center (1510 Fashion Island Blvd): announced May 2025; opening and phone unconfirmed.
5. Santa Clara text-to-911 source is from 2019 (Los Gatos, Campbell not yet live then).
6. SafeChatSV: launched 2016, hours not captured; confirm it is still active.
7. 17 entries are `aggregator`-only (womenslaw.org, 1degree.org, Google-sites resource guide); phone-verify.

## Safety rules for the app (recommended)
1. Never publish or infer shelter street addresses; only office or access-point addresses.
2. Quick exit, no analytics or identifiers on this section, no account required, minimal local storage, neutral page title.
3. Show "last verified" on every entry; hide entries older than about 90 days until re-verified.
4. Have a local DV advocate review the wording and the home/away guidance. Not legal advice.

## Next research
1. Rides: ask agencies (CORA, La Casa, AWS, Next Door Solutions, YWCA) directly what transport help they give; check victim-witness funds and fare programs (Clipper/Muni/VTA/SamTrans/Caltrain).
2. Pets in SF and Santa Clara; shelter pet and boys'-age policies by phone.
3. Phone-verify the 17 aggregator entries and four `conflict` entries.
4. Add intake detail: voicemail safety, callback number display, interpreter lines, hours.
5. SF Family Justice Center status; San Mateo FJC opening; Santa Clara FJC schedules.
6. Monthly re-verification job (fetch each `source_url`, diff phones/hours).
