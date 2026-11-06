# Path Finder — design system ("folded road map")

One visual world shared by the maze game (Layer 1) and the hidden layer (Layer 2), so moving
between them never looks like switching apps. The idea: **a warm, folded paper map.** The maze's
blue is the route; its gold player dot is "you are here".

Feeling: quiet and steady. Calm, warm, plain. Nothing should look like a generic AI app:
no gradients, glows, glass, rounded cards, pill buttons, drop shadows, or emoji.

## Colour tokens
Defined in `app/globals.css` on `.hl`, which wraps both the game (`GameShell`) and the hidden layer. Fonts load once in `app/layout.tsx`. Game screens share button/field classes from `components/game/styles.ts`.

| Token | Day map | Night map | Use |
|---|---|---|---|
| `--hl-bg` | `#f5e7c8` | `#1d1f2a` | Map paper (page background) |
| `--hl-surface` | `#fbf3df` | `#262938` | Fields and open sections |
| `--hl-paper-2` | `#ecd9b0` | `#171822` | Tab bar, the folded edge of the map |
| `--hl-ink` | `#2a2a35` | `#f1e6cc` | Text and rules (never pure black or white) |
| `--hl-muted` | `#55505a` | `#b6ad9c` | Secondary text |
| `--hl-line` | `#d9c493` | `#3a3d50` | Hairlines between rows |
| `--hl-brand` | `#2f5f86` | `#8ab8dc` | **Route blue**: the route line, primary buttons, links |
| `--hl-brand-dk` | `#1f4462` | `#b4d3ec` | Pressed and hover states |
| `--hl-brand-ink` | `#fff8e8` | `#11141c` | Text on route blue |
| `--hl-accent` | `#f2b84b` | `#f2b84b` | **Gold dot**: "you are here", the active tab, selection |
| `--hl-zone` | `#8a5418` | `#e3ad62` | Ochre legend labels (Now · Today · This week, dates) |
| `--hl-danger` | `#a3242c` | `#ff8f80` | SOS and 911 **only** |
| `--hl-danger-ink` | `#fff4e6` | `#2a0b0b` | Text on danger |
| `--hl-contour` | `rgba(47,95,134,.10)` | `rgba(138,184,220,.08)` | Terrain contour lines |

Rules:
- Red belongs only to emergencies. Never use it for errors or decoration.
- Gold marks one thing at a time: where she is now.
- The night map follows `prefers-color-scheme: dark`.

## Type
Both fonts are self-hosted via `next/font/google`, so there is no runtime request to Google.
- **Body: Atkinson Hyperlegible** (400/700), designed for low-vision legibility. Body 1rem/1.5.
- **Labels, titles, buttons: Barlow Semi Condensed** (500/600/700), the map-legend voice.
  - `.f-label`: 0.75rem, 700, uppercase, letter-spacing 0.1em (zones, meta line, tabs).
  - `.f-title`: 700, letter-spacing −0.005em (screen titles 1.875rem, current step 1.625rem).
  - `.f-btn`: 1rem, 700 (every button).

## Shape and space
- Radius **4px** everywhere (`--hl-radius`). Round shapes are only the route dots.
- Borders: 2px ink for inputs, secondary buttons and section rules; 1px `--hl-line` hairlines between rows.
- Touch targets are at least 44px (`min-h-11`). Primary emergency buttons are 96px tall.
- Single column, max width about 28rem, 20px side gutter. The bottom tab bar is `--hl-tabbar`.

## Signature: the route
- `.route`: a 6px route-blue line down the left edge (at 1.25rem), with stops sitting on it.
- **Current stop:** a 30px gold dot with a paper ring and a blue ring (`.here-dot`, a short scale-in,
  disabled under reduced motion), plus a large condensed title, the detail and action buttons.
- **Done stops** are filled blue with a check. **Stops ahead** are hollow rings.
- Zone labels (ochre `.f-label`) group stops: Now · Today · This week · Later.
- The same route is reused for the incident log (dated stops).
- One decoration only: faint concentric contour lines in the top-right corner (`.contours`).

## Components (hidden layer)
- **Header:** ES/EN label on the left; on the right, a red SOS button and an ink Exit button (Exit is always visible).
- **Tab bar:** paper-2 with a 2px ink top rule, condensed caps labels, and a gold bar over the active tab.
- **Buttons:**
  - primary: solid route blue;
  - secondary: 2px route-blue outline;
  - quiet action ("Done", "Start over"): underlined condensed text.
- **Resource rows:** no cards. Name in condensed bold, "24/7" in ochre, a one-line description, then square Call and Text buttons.
- **Chat:** no bubbles.
  - Claude's text sits plainly on the paper.
  - Her messages are indented with a small gold dot, like a pin on the map.

## For the maze game (Layer 1)
To stay in the same world:
- Draw the maze walls in `--hl-ink` on `--hl-bg` paper.
- Draw the path she has walked in route blue.
- The player is the gold dot with a blue ring, and the goal is a hollow ring.
- Use Barlow Semi Condensed caps for level and stats labels, with the same 4px radius and no shadows.
- The game must still read as an ordinary puzzle game: no words or symbols from Layer 2.

## Voice
Few words, plain and warm. No hints or subtitles; details stay collapsed until tapped.
"Start over" and deletes need a second tap.
