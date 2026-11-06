# Path Finder

A mobile web app that looks like a simple maze game. Behind a code, it holds a private tool
that helps people experiencing intimate partner violence in the **San Francisco Bay Area** build
a personalized safety plan, with resources that have been checked.

Hackathon prototype. `CLAUDE.md` has the full product spec, threat model and architecture.
`DESIGN.md` has the visual system, and `PRODUCT.md` covers users and voice.

## How it works

**Layer 1: the game.** A real, playable maze with levels, coins, Rewards and a Profile. On the
surface it's just a quiet puzzle game: the name, icon, title and history all say "Path Finder",
and there is only one URL (`/`).

**Layer 2: the private space.** It opens when she redeems **My code** under Rewards → *Redeem a code*.
- **Talk:** one ongoing chat. Claude asks one gentle question at a time (city, kids, phone safety,
  money, documents…), never about the abuse itself, and builds the plan from what she shares.
- **My plan:** the next step first, then the checklist (Now · Today · This week). Each step has
  Call/Text buttons for resources from the curated list. She can edit or check off steps.
- **Document:** a private incident log with photos and voice notes, which can be turned into a
  draft for a restraining order (form DV-100).
- **SOS:** call or text 911, text 911 her location, and 24/7 hotlines. No AI involved.
- **English and Spanish**, including translating the plan.

**Codes**
| Code | What it does | What an onlooker sees |
|---|---|---|
| Invite code `NEWPATH` | Opens setup on a fresh device (advocates hand it out) | Game account setup |
| My code | Opens the private space | Nothing: the game is replaced |
| Clear code | Erases everything saved in the private space | "Code redeemed! +200 coins" |

**Leaving fast:** the **Exit** button, **Esc**, or shaking the phone returns to the maze instantly
and locks the private space.

**Privacy:** there are no accounts and no server database. Everything is encrypted on the phone
(PBKDF2 → AES-GCM) with a key that exists only in memory while the private space is open. The
server doesn't store or log what she types. There are no analytics or third-party scripts.

## Run locally

```bash
npm install
cp .env.example .env.local   # add ANTHROPIC_API_KEY
npm run dev                  # http://localhost:3000
```

`PLAN_MOCK=1` in `.env.local` returns a sample plan without calling Claude.

### Demo shortcuts (dev server only)
- **`/demo`** shows the app inside a phone frame, for screen recording on a laptop.
- **`DEV`** in Rewards → *Redeem a code* opens the private space without setup. The first time,
  it shows how the codes and Exit work; after that it goes straight to My plan. **`DEVCLEAR`** is
  its Clear code. `DEV` replaces any codes set up in that browser, and both are removed from
  production builds.

Full flow for a demo: Rewards → `NEWPATH` → set My code and Clear code → practice the Clear code →
redeem My code → talk → see the plan → Exit.

## Stack
Next.js 16 (App Router), TypeScript, Tailwind v4 and the Anthropic SDK (`/api/plan`,
`/api/plan/translate`, `/api/declaration`). It's an installable PWA, deployed on Vercel.

```
app/page.tsx            the single route: switches between the game and the private space in state
app/api/                Claude routes (server-side only; key in ANTHROPIC_API_KEY)
app/demo/               phone frame for recording
components/game/        maze, Rewards (redeem field), Profile, Setup
components/hidden/      HiddenApp, Chat, PlanView, Log, Emergency, HowItWorks
lib/crypto.ts           codes + encrypted save; lib/vault.ts encrypted media
lib/prompt.ts, lib/topics.ts, lib/plan-schema.ts   how Claude is guided and what it returns
data/resources.bay-area.json   resources Claude can cite (built from safeescape-corpus/)
```

Resources come from `safeescape-corpus/`. Rebuild them with
`node --env-file=.env.local scripts/import-corpus.mjs`. Claude may only cite ids from this list,
and the app looks up names, numbers and links from it, so they can't be invented.

## Install as a web app
Deploy to Vercel (HTTPS), then:
- **iPhone (Safari):** Share → Add to Home Screen
- **Android (Chrome):** menu → Install app

The service worker only registers in production builds (`npm run build && npm start`).

## Known limitations
- Whoever opens the app first could set the codes.
- Someone with the device and developer tools could see that encrypted data exists.
- Claude can be wrong. The plan always shows 911 and the National DV Hotline
  (1-800-799-7233, text START to 88788).
- Not legal or medical advice. Before real use it needs review by DV advocates, a security
  review and an accessibility pass.
