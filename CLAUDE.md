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
- Has a **Profile** screen (avatar, levels completed, stats) containing an ordinary-looking
  **"Player code"** field (styled like a friend/sync code).
- **First launch:** an in-game "Create your profile" step asks for a *player code* (real
  passcode) and a *backup code* (panic code), worded like normal game account setup.
- Entering a code in the Profile field:
  - **Real passcode** → unlock Layer 2.
  - **Panic code** → silently wipe all saved data (encrypted plan, situation, codes) and keep
    showing the game as if nothing happened (show a generic "Invalid code" message).
  - Anything else → "Invalid code".

## Layer 2 — Hidden planning tool
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
- Passcode → key via **PBKDF2 (WebCrypto, SHA-256, ≥200k iterations, random salt)** →
  **AES-GCM** encrypts `{situation, plan, checklistState}`; blob stored in IndexedDB/localStorage
  under a neutral key name (e.g. `pf_save`).
- Passcode verification = successful decryption of the blob/canary (don't store the passcode).
- Panic code stored only as a salted hash; matching it deletes every app key from storage.
- Wrap all storage access in try/catch; app must work if storage is unavailable.

## Claude API
- Server-side only in a Next.js Route Handler: `app/api/plan/route.ts`. Key in
  `ANTHROPIC_API_KEY` (Vercel env var); never exposed to the client.
- SDK: `@anthropic-ai/sdk`. Model: `claude-sonnet-5-5` (fast; upgrade to `claude-opus-5-5` if quality needs it).
- System prompt includes the curated resource list and rules: trauma-informed, non-judgmental,
  plain language, triage danger level first, **only cite resources from the provided list —
  never invent names, phone numbers, or URLs**, not legal/medical advice.
- Return structured JSON (via tool use / JSON schema), e.g.
  `{ dangerLevel: "immediate" | "planning", summary, steps[], goBag[], resources[{id, why}] }`.
  The client looks up resource details by `id` from the local JSON, so links/numbers always come
  from vetted data.
- Do not log request bodies. Basic rate limiting per IP.

## Resources data
- `data/resources.bay-area.json`: vetted entries `{ id, name, type (hotline|shelter|legal|
  counseling|housing|other), counties[], phone, text, url, hours, languages[], notes }`.
- Hand-curated, with a `lastVerified` date. Include e.g. National DV Hotline, county DV
  agencies/shelters, legal aid orgs. Verify every number/URL before demo.

## Stack
- Next.js (App Router) + TypeScript, deployed on Vercel.
- PWA: `manifest.json` named "Path Finder" with a neutral maze icon, mobile-first layout,
  installable to home screen.
- Styling: whatever is quickest (Tailwind is fine).

## Suggested structure
```
app/page.tsx              single route; switches between Game and Hidden layers via state
app/api/plan/route.ts     Claude call
components/game/          Maze, Profile (player-code field), Setup
components/hidden/        SituationForm, PlanView, QuickExit
lib/crypto.ts             PBKDF2 + AES-GCM helpers, panic wipe
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

## Non-goals (prototype)
Accounts, multi-device sync, regions outside the Bay Area, chat history, push notifications.

## Known prototype limitations (be honest about these)
- Setup on first launch: if the abuser opens it first, they could set the codes.
- A determined person with device access could inspect storage and see that encrypted data exists.
- Claude output can be wrong; the plan always surfaces 911 and the hotline.
- Before real-user use: review by DV advocates, security review, accessibility pass.
