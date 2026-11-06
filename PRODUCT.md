# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

Mobile-first web app, installable as a PWA ("Add to Home Screen"). Must also work in a normal desktop/mobile browser tab.

## Users

**Primary:** people (primarily women) in the San Francisco Bay Area experiencing intimate partner violence who want to plan leaving safely. They are often on a phone the abuser may check, may have only minutes alone, may be in acute danger or planning weeks ahead, and may be stressed or in shock.

**Adversarial observer:** the abuser, who may pick up the phone, open the app, scroll browser history, or watch over her shoulder. Every public-facing surface is designed for this person to see nothing of note.

**Demo audience:** hackathon judges, who need to see the full flow on a phone in a few minutes.

## Product Purpose

Help a survivor turn "I need to get out" into a concrete, personalized, safe next-steps plan with vetted local resources, without leaving a trace that she's doing so.

Success (both count equally):
- **Demo:** judges see the maze → player code → hidden layer → real Claude-generated plan → instant quick exit, live on a phone.
- **Real-world credibility:** a survivor or DV advocate could use the hidden layer and trust its tone, safety behavior, and resources.

## Positioning

A genuinely playable maze game ("Path Finder") is the cover; the real tool lives behind a player code in the game's Profile screen. Natural-language input → Claude → a triaged plan (immediate danger vs. planning ahead) that only cites hand-vetted Bay Area resources, saved encrypted on-device, with a panic code that silently wipes everything.

## Operating Context

- Used in stolen moments: in a bathroom, on a break, after the abuser is asleep. Sessions may be interrupted at any second.
- Device may be shared or monitored; browser history and home screen are visible to the abuser.
- Two modes of need: **immediate danger** (911, safe place, hotlines, emergency shelter) and **planning** (today/this week steps, get on shelter waitlists now, go-bag, documentation).
- Built by a two-person hackathon team working on feature branches (see CLAUDE.md).

## Capabilities and Constraints

- **Layer 1 (public):** an original maze game, Profile screen with a "Player code" field, first-launch profile setup that creates a player code (real passcode) and backup code (panic code).
- **Layer 2 (hidden):** free-text situation input, optional county/kids/pets/danger fields, Claude-generated structured plan, go-bag checklist, matched resources, encrypted save.
- **Quick exit:** persistent exit button, Esc key, phone shake. Returns to the maze instantly and clears decrypted data.
- **Stealth:** single route, no URLs for hidden screens, public name/icon/metadata reveal nothing, no analytics, server never logs user text.
- **Resources:** only from the curated `data/resources.bay-area.json`; Claude never invents names, phone numbers, or URLs.
- **Languages:** hidden layer UI in **English and Spanish**; Claude replies in the language she writes in. Other Bay Area languages (Chinese, Vietnamese, Tagalog) are a future goal.
- **Scope:** Bay Area only (9 counties); expansion is the long-term vision.
- Not legal or medical advice; every plan surfaces 911 and the National DV Hotline (1-800-799-7233, text START to 88788).

## Brand Commitments

- Public name **Path Finder**. Never show "safeEscape", "abuse", "DV", or "escape plan" in Layer 1.
- Existing maze icon: `public/icon.svg` (teal #2f6f6a, cream #f4efe4, gold dot #f2b84b).
- **Hidden-layer voice:** calm, direct, warm, like a steady advocate. Short sentences, plain words, no jargon, never alarmist, never judgmental. She decides; the app offers options, not orders.
- **Game voice:** an ordinary, low-key casual puzzle game. Nothing that invites a second look.

## Evidence on Hand

- No vetted resource list yet; `data/resources.bay-area.json` must be hand-curated and every number/URL verified before the demo.
- No testimonials, advocate endorsements, partner organizations, or usage data. Do not fabricate any.

## Product Principles

1. **Safety beats features.** If something could expose her, cut it.
2. **Nothing to notice.** Layer 1 should be boring in the most convincing way.
3. **Vetted over clever.** Resources come from the curated list; Claude personalizes, it doesn't invent.
4. **Every second could be the last.** Any screen can be left instantly, and a partial session still helps.
5. **Her call.** Present options and trade-offs plainly; never pressure.

## Accessibility & Inclusion

- English + Spanish in the hidden layer.
- Readable under stress: plain language, large tap targets, works one-handed on a small phone.
- Trauma-informed copy throughout the hidden layer.
- Plan for WCAG 2.1 AA; formal audit is out of scope for the hackathon.
