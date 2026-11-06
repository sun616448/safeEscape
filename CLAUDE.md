# safeEscape (public name: "Path Finder")

A mobile-first web app (PWA) that looks like a simple maze game ("Path Finder") but hides a
passcode-protected tool that helps people experiencing intimate partner violence (IPV) build a
personalized, safe escape plan. Scope: **San Francisco Bay Area** only (vision: expand later).
Stage: **hackathon prototype**.

## Threat model (read first — drives every decision)
The person most likely to see this app is the abuser, holding her phone. Assume they may
look at the home screen, open the app, scroll browser history, or check the tab switcher.
Therefore:
- Never show "safeEscape", "abuse", "DV", "escape plan", etc. anywhere visible in Layer 1:
  not in the app name, `<title>`, manifest, icon, URL, favicon, or meta tags. Public name is **Path Finder**.
- **Single route (`/`)**. The hidden layer is client state, never a URL/path/query/hash, so
  nothing shows up in history. No `router.push` to hidden screens.
- No analytics, no third-party scripts, no error reporters that capture user text.
- Server never logs or stores what the user types or the generated plan.
- Leaving the hidden layer must be instant and leave no trace on screen.

## Layer 1 — Decoy maze game
- An original, simple maze game (swipe/arrow-key movement, levels of increasing size).
  It must be genuinely playable so it holds up to inspection.
- Tabs: **Play** (the maze), **Rewards** (coin balance, rewards history, and an ordinary-looking
  **"Redeem a code"** promo-code field), **Profile** (avatar, levels completed, stats).
  Coins come from first-time level clears and from redeemed codes, so the balance looks normal.
- **Two codes, one name each, used the same way everywhere** (setup, hidden layer, advocate
  materials):
  - **My code** (real passcode) opens her private space.
  - **Clear code** (panic code) erases it. Not "backup code": in most apps that means "use if you
    forget your password", so she could wipe her own plan trying to get back in.
- **Invite code** (`INVITE_CODE` in `lib/crypto.ts`, currently `NEWPATH`): public, handed out by
  advocates, hotlines, or a support site. On a fresh install the app is only a game; redeeming the
  invite code opens setup. It only works while no codes exist on the device (so it can't be used
  to overwrite her codes), and works again after a Clear code wipe so she can start over.
- **Setup** (`components/game/Setup.tsx`), opened by the invite code. Clarity over obfuscation:
  she must understand what the codes do; it's shown once, while she holds the phone.
  1. Plain intro: two codes, both go in Rewards → Redeem a code; what each does.
  2. Choose My code, then Clear code (typed twice; ≥4 characters; not equal to each other or the
     invite code; case and spaces ignored).
  3. Practice the Clear code in a mock redeem box. Nothing is saved, so nothing is erased, and
     she sees exactly what an onlooker would see.
  4. "Go to Rewards and redeem My code" → first real unlock.
- Entering a code in the Redeem field (contract: `CodeResult` in `lib/types.ts`):
  - **My code** → unlock Layer 2.
  - **Clear code** → silently wipe all saved data (encrypted plan, situation, codes) and show a
    normal success: "Code redeemed! +200 coins", added to the rewards history. It must look like
    the code *worked*: an error here would make it look like she lied about what it was for.
  - **Invite code** with no codes set up → setup.
  - Anything else → "This code has expired or was already used." (never "Invalid code").
- The tab bar stays visible during setup; tapping Play leaves setup instantly.
- Rewards are free promo rewards on purpose, never "add funds" or payments: money is a common
  control point in abusive relationships, and a spending screen invites scrutiny.
- Game progress (`pf_progress`: levels, times, coins, rewards history) is not sensitive and is
  **not** wiped by the panic code, since a game reset to level 1 would be noticeable. It never
  stores any code that was typed.

## Layer 2 — Hidden planning tool
- **How this works** (`components/hidden/HowItWorks.tsx`): shown on the first unlock (nothing
  saved yet) and any time from a link. This is where plain, explicit language lives: what the
  app is, that data is encrypted on the phone, what My code / Clear code do, how to leave fast,
  911 and the hotline. Keep it in sync with setup wording.
- A free-text box: "Tell me what's going on" (natural language, any detail level).
- Optional quick fields: county (SF, Alameda, Contra Costa, San Mateo, Santa Clara, Marin,
  Solano, Napa, Sonoma), kids/pets, whether she's in danger right now.
- Sends the text to `/api/plan` → Claude → returns a structured plan rendered as cards.
- **Quick exit** (always available in Layer 2):
  - A persistent exit button (corner) → instantly returns to the maze and locks Layer 2.
  - `Esc` key on desktop; **shake** gesture on mobile (DeviceMotion; request permission on iOS).
  - Locking clears decrypted data from memory/React state.
- Plan can be saved encrypted (see Storage) and reopened with the passcode.

### Plan content — two modes (Claude triages from the text)
1. **Immediate danger** → lead with: call/text 911, get to a safe place, the 24/7 hotlines,
   emergency shelter intake. Short, urgent, few steps.
2. **Not in immediate danger** → a short-term plan: what to do *today* and this week, local
   resources to contact, **get on shelter waitlists now** (even if not leaving yet), go-bag
   checklist (IDs, birth certificates, SS cards, meds, cash, charger, keys, kids' documents),
   safe-documentation tips.

Both modes include matched Bay Area resources (from the curated list only) and a reminder of
911 / National DV Hotline (1-800-799-7233, text START to 88788).

## Storage & crypto (client-side)
- No accounts, no server database.
- Implemented in `lib/crypto.ts`: `createCodes`, `checkCode`, `saveState`, `wipeHiddenData`.
- **Dev shortcut:** under `npm run dev` only, redeeming `DEV` opens the hidden layer (Clear code
  `DEVCLEAR`), creating those codes if needed. It replaces any other codes in that browser. It is
  stripped from `next build`, so it never works on Vercel or a phone; use the invite flow there.
- My code → key via **PBKDF2 (WebCrypto, SHA-256, 250k iterations, random salt)** →
  **AES-GCM** encrypts `SavedState`; stored in localStorage as `pf_save`.
- My code verification = successful decryption (the code itself is never stored).
- Clear code stored only as a salted PBKDF2 hash (`pf_cfg`); matching it deletes every
  hidden-layer key (`pf_save`, `pf_cfg`) but keeps `pf_progress`, the ordinary game progress.
  Both derivations always run, so a wrong code and the Clear code take the same time.
- Codes are case-insensitive and ignore spaces, like promo codes.
- Unlocking returns a `Session` (`{key, salt, state}`); the hidden layer saves with
  `saveState(session, state)`. The key is non-extractable and lives only in React state; exiting
  drops it.
- Wrap all storage access in try/catch; app must work if storage is unavailable.

## Claude API
- Server-side only in a Next.js Route Handler: `app/api/plan/route.ts`. Key in
  `ANTHROPIC_API_KEY` (Vercel env var); never exposed to the client.
- SDK: `@anthropic-ai/sdk`. Model: `claude-opus-5-5` at effort `low` for chat turns and translation (speed), with server-side
  `fallbacks: "default"` (beta `server-side-fallback-2026-07-01`) so a classifier refusal on
  sensitive content retries on another model instead of failing.
- Each situation is an ongoing chat (saved encrypted, wiped by the panic code). `lib/topics.ts` is
  a deterministic, ordered safety-planning checklist (safe to talk now, city, lives with him, kids, how safe she feels, phone safety, trusted person, money/transport, documents, pets, language/immigration help offered, help tried). Every question must change the plan; it never asks about the abuse itself, health/medical details, addresses, or immigration status (trauma-informed; risk info goes into the plan instead of being asked). Each turn the route tells Claude what's known and the next
  gaps; Claude phrases one question at a time, records what she revealed per topic ("declined" =
  never re-ask), and holds the first plan until the essentials are known (unless danger or she asks).
  Each plan step and chat reply carries `contacts` (vetted resource ids or "911"); the client renders
  Call/Text buttons from the vetted data. She can edit the plan directly (Edit on My plan) or by chatting; the
  route sends her edits and checked-off steps back as context. Switching EN/ES translates the plan via
  `app/api/plan/translate/route.ts`. Claude infers her county from
  the city and her goal (leave-now | leave-soon | preparing | exploring | stay-safer), and returns a
  full updated plan whenever it has enough or something changes. She corrects the goal by chatting.
- Resources are matched by Claude from what she writes (she never has to search). It may only
  pick ids from `data/resources.bay-area.json`; the route drops unknown ids.
- `PLAN_MOCK=1` in `.env.local` returns a sample plan without calling Claude (dev only).
- System prompt includes the curated resource list and rules: trauma-informed, non-judgmental,
  plain language, triage danger level first, **only cite resources from the provided list —
  never invent names, phone numbers, or URLs**, not legal/medical advice.
- Return structured JSON (via tool use / JSON schema), e.g.
  `{ dangerLevel: "immediate" | "planning", summary, steps[], goBag[], resources[{id, why}] }`.
  The client looks up resource details by `id` from the local JSON, so links/numbers always come
  from vetted data.
- Do not log request bodies. Basic rate limiting per IP.

## Resources data
- Source of truth is the team corpus in `safeescape-corpus/` (edit `build.py` there, run `python3 -I build.py`).
- `node --env-file=.env.local scripts/import-corpus.mjs` turns `safeescape-corpus/resources.json` (75 entries;
  focus counties SF, San Mateo, Santa Clara) into `data/resources.bay-area.json` (the app's `Resource` shape, with
  quiet channels, kids/pets/citizenship constraints, topics, when-to-use, verification flags). Spanish card
  one-liners are cached in `data/blurbs.es.json`.
- The system prompt lists every resource in the corpus one-line format and uses the corpus rules (partner nearby →
  quiet channels; Y/?/N constraints; flagged → "confirm when you call"; no shelter locations; honest gaps) and the
  phases in `safeescape-corpus/leaving_plan.json` as the plan structure.

## Stack
@AGENTS.md

- Next.js 16 (App Router) + TypeScript + Tailwind v4, deployed on Vercel.
  Read the bundled docs in `node_modules/next/dist/docs/` before using Next.js APIs.
- PWA pieces already in place: `app/manifest.ts`, `app/apple-icon.png`, `public/icon*.{svg,png}`,
  `public/sw.js` (never caches `/api`), registered by `components/RegisterServiceWorker.tsx`
  in production only. Shared types live in `lib/types.ts`.
- PWA: `manifest.json` named "Path Finder" with a neutral maze icon, mobile-first layout,
  installable to home screen.
- Styling: whatever is quickest (Tailwind is fine).

## Suggested structure
```
app/page.tsx              single route; switches between Game and Hidden layers via state
app/api/plan/route.ts     Claude call
components/game/          GameShell (tabs), Maze, Rewards (redeem-code field), Profile, Setup
lib/maze.ts               maze generation + movement (seeded per level)
lib/gameProgress.ts       non-sensitive game progress store (pf_progress)
lib/crypto.ts             codes, invite code, PBKDF2 + AES-GCM save ("pf_save"), Clear-code wipe
components/hidden/        HiddenApp (bottom tabs: My plan · Talk · Record; SOS + Exit in the header),
                          PlanView (next step leads, then the checklist), Chat (one ongoing thread),
                          Log (encrypted incident log → DV-100 draft), Emergency (SOS screen), HowItWorks
lib/vault.ts              encrypted photo/voice notes in IndexedDB, using the session key from crypto.ts
lib/topics.ts             ordered safety-planning checklist the chat works through
lib/plan-schema.ts        zod schema for Claude's structured output
lib/prompt.ts             system prompt (voice, triage, vetted-resources rule)
lib/i18n.ts               hidden-layer strings, English + Spanish
lib/quickExit.ts          Esc + shake listeners
data/resources.bay-area.json
```

## Team workflow
Two contributors working in parallel. `main` is the shared base and must always run (demo-ready).

**Setup (once)**
- Repo owner adds the partner as a collaborator (GitHub → Settings → Collaborators).
- One person scaffolds the Next.js app on `main` and pushes it *before* anyone branches.
- `.env.local` stays out of git; share `ANTHROPIC_API_KEY` privately.
- Connect the repo to Vercel so every branch/PR gets a preview URL.

**Split by area to avoid conflicts**
- Person A: maze game, Profile/Setup, passcode + panic logic (`components/game/`, `lib/crypto.ts`).
- Person B: hidden layer, `/api/plan`, resources data (`components/hidden/`, `app/api/`, `data/`).
- Agree on shared contracts early in `lib/types.ts`: plan JSON schema, resource schema, and the
  layer-switch interface between game and hidden layer.

**Daily loop**
```
git checkout main && git pull
git checkout -b feat/<thing>            # short-lived branch
# commit often
git pull --rebase origin main           # pick up partner's work frequently
git push -u origin feat/<thing>         # open PR, partner skims, merge
```
- Merge small PRs every few hours; never one big merge at the end.
- After a merge, the other person immediately rebases on `main`.
- Announce before editing shared files (`app/page.tsx`, `package.json`, `lib/types.ts`).
- Resolve conflicts together on a call.

## Hidden-layer UX rules
- Visual system (colours, type, route, rules for the maze to match): see `DESIGN.md`.
- One ongoing chat and one plan (no list of conversations). Few words: no hints or subtitles;
  details are collapsed until tapped. "Start over" needs a second tap.

## Non-goals (prototype)
Accounts, multi-device sync, regions outside the Bay Area, chat history, push notifications.

## Known prototype limitations (be honest about these)
- Setup needs the invite code, so opening the app first shows only a game. But the invite code
  is public: an abuser who knows about Path Finder could redeem it and set the codes first.
- Setup and the How-this-works screen use plain words on purpose; someone who sees setup
  over her shoulder may understand it. It's shown once, and the tab bar leaves it instantly.
- A determined person with device access could inspect storage and see that encrypted data exists.
- Claude output can be wrong; the plan always surfaces 911 and the hotline.
- Before real-user use: review by DV advocates, security review, accessibility pass.
