# Design — thehegeo (Element client)

A locked design system for this app. Every screen defers to this file. Do not
re-pick a theme per surface — extend or amend this file when the system needs
to grow.

The system is named **Quietwork**. It is built *on top of* Compound (Element's
design-token package), not instead of it. Compound owns the colour ramps and
the semantic colour names; Quietwork owns surface assignment, elevation,
radii, motion, rhythm and reading measure.

> **Hard rule — presentation only.** Nothing in this system may change
> application logic, Matrix events, stores, routing, permissions, or the
> Synapse / OpenClaw / MCP / Plane integrations. If a visual improvement needs
> a behaviour change to work, drop the improvement.

---

## Genre

**modern-minimal.** The Linear / Stripe register: one precise sans, generous
whitespace, restrained accent, composed rather than animated.

Not *atmospheric* — this is an all-day work surface that must hold up in both
light and dark. Glow, bloom and dark-first vocabulary are out of scope.

## Macrostructure family

This is an application, so structure is largely fixed by function. Three
families:

- **App shell** — Workbench. Three zones: rail (room list) · canvas
  (conversation) · panel (KPI / info / threads). Zones are separated by a
  hairline seam, never by a heavy border or a shadow.
- **Conversation** — Long Document. The timeline is a reading surface first
  and a chat log second. Rhythm, measure and grouping do the work.
- **Settings / dialogs** — Long Document, single column, capped measure.

## Theme — Quietwork

Colour comes from Compound's ramps. Quietwork assigns them; it does not
redefine them. Raw values below are for reference only — always reference the
token.

### Surface ladder

The single most important idea in this system: **three surfaces, one hairline,
no decoration.**

| Role | Token | Light | Dark |
| --- | --- | --- | --- |
| Rail — chrome that frames the work | `--hg-surface-rail` | `gray-200` `#f7f9fa` | `gray-100` `#14171b` |
| Canvas — the reading surface | `--hg-surface-canvas` | `theme-bg` `#ffffff` | `theme-bg` `#101317` |
| Raised — composer, menus, dialogs, cards | `--hg-surface-raised` | `theme-bg` `#ffffff` | `gray-200` `#181a1f` |
| Sunken — code blocks, inputs, wells | `--hg-surface-sunken` | `gray-200` `#f7f9fa` | `gray-200` `#181a1f` |
| Seam — the only divider in the app | `--hg-seam` | `gray-400` @ 60 % | `gray-400` @ 70 % |

In **light**, the canvas is the brightest thing on screen and the rail recedes
one step. In **dark**, the canvas is the *darkest* thing on screen and chrome
lifts one step — content pops out of the deepest surface. Both readings are
the same idea: the conversation is the figure, everything else is ground.

### Accent

One accent: Compound green (`--cpd-color-bg-accent-rest`, `green-900`
`#007a61`). Budget is **≤ 5 % of any viewport**. It is allowed on exactly four
things:

1. The send button.
2. The selected-room marker in the rail.
3. The user's own message bubble (solid fill, `text-on-solid-primary`, 5.3:1).
4. The AI streaming indicator.

Everywhere else the accent is *absent*, not faint. Focus is blue
(`--cpd-color-border-focused`) and is never the accent — focus must stay
distinguishable from selection.

### Elevation

Four steps. Shadows are **theme-aware**: warm-neutral and soft in light, near
black and tight in dark, plus a 1px top highlight instead of a halo. Glow on
dark is banned.

| Token | Use |
| --- | --- |
| `--hg-elev-0` | flat — timeline, rail, most of the app |
| `--hg-elev-1` | resting card — composer, room-list drag ghost |
| `--hg-elev-2` | transient — context menus, dropdowns, tooltips, autocomplete |
| `--hg-elev-3` | modal — dialogs, lightbox chrome |

## Typography

**One sans, one mono.** The pairing is Inter × Fira Code — sans for everything
the human writes, mono for everything the machine writes. That contrast is the
typographic idea of an AI workspace; a third decorative face would dilute it.

- **Display** — Inter 600, tracking `-0.015em` at ≥ 1.125rem. Token:
  `--hg-font-display`. Used for room names, panel titles, dialog titles.
- **Body / UI** — Inter 400/500, Compound's `--cpd-font-body-*` scale.
- **Mono** — Fira Code 400. Token: `--hg-font-mono`. Code blocks, inline code,
  event IDs, KPI figures.
- **Numerals** — `font-variant-numeric: tabular-nums` on every badge,
  timestamp, counter and KPI figure. Non-negotiable; proportional figures in a
  column are a tell.

Headings are roman. No italic display type anywhere.

### Reading measure

Long AI answers are the primary content of this app. The timeline is
full-bleed by product decision, so measure is enforced on the **bubble**, not
the container:

```
--hg-measure: 68ch      /* text bubbles cap here, or 70% of container, whichever is smaller */
--hg-measure-wide: 92ch /* code blocks, tables, media — allowed to run wider */
```

## Spacing

Compound's 4-pt scale (`--cpd-space-*`) is the only scale. Quietwork adds
**semantic layout tokens** on top, so rhythm can be tuned in one place:

```
--hg-gutter        20px   /* horizontal inset of the conversation column */
--hg-rail-inset    12px   /* horizontal inset inside the rail            */
--hg-cluster-gap   24px   /* between messages from different senders     */
--hg-message-gap    4px   /* between consecutive messages, same sender   */
```

Grouping carries hierarchy: a 6× gap between speakers and a 1× gap within a
speaker's run reads as a conversation. Equal gaps read as a log file.

## Radii

A tight ladder. Controls are crisper than containers.

```
--hg-radius-xs    6px   /* chips, badges, inline code            */
--hg-radius-sm    8px   /* buttons, list rows, code blocks       */
--hg-radius-md   12px   /* menus, cards, panels                  */
--hg-radius-lg   16px   /* dialogs, message bubbles              */
--hg-radius-xl   22px   /* the composer card                     */
--hg-radius-pill 999px  /* avatars, counters, the send button    */
```

## Motion

Three easings, three durations, and a strong bias toward *none*.

```
--hg-ease-out    cubic-bezier(0.16, 1, 0.3, 1)     /* entering */
--hg-ease-in     cubic-bezier(0.7, 0, 0.84, 0)     /* leaving  */
--hg-ease-in-out cubic-bezier(0.65, 0, 0.35, 1)    /* toggles  */

--hg-dur-micro   120ms   /* press, colour shift        */
--hg-dur-short   200ms   /* hover, tooltip, menu open  */
--hg-dur-long    360ms   /* dialog, drawer             */
```

Rules:

- Animate `transform` and `opacity` only. Never `width`, `height`, `top`,
  `left`, `margin`, `padding`.
- **Never `transition: all`.** Name the properties.
- **Focus rings appear instantly.** Never transition `outline` or the focus
  `box-shadow`.
- **No per-item entrance animation in lists.** The timeline and the room list
  render hundreds of rows; an entrance on each one is both a performance cost
  and visual noise. Content is simply *there*.
- Exits run at ~75 % of the enter duration.
- `prefers-reduced-motion: reduce` collapses all spatial motion to an opacity
  crossfade ≤ 150ms. Functional motion (spinners, streaming indicator) keeps
  running, slower.

## Microinteractions stance

- **Silent success.** No celebratory toast for a thing the user can already
  see happened.
- **Hover is a whisper.** One signal per element — a background shift *or* a
  1px translate, never both, never a shadow bloom.
- **Every hover affordance has a focus equivalent.** Room-list hover menus,
  message action bars, and panel controls must be reachable by keyboard.
- Tooltips: 600ms delay on hover, **0ms on focus**.
- Touch targets ≥ 28px in dense chrome, ≥ 32px everywhere else.

## Focus

One treatment, applied globally:

```
outline: 2px solid var(--cpd-color-border-focused);
outline-offset: 2px;
border-radius: inherit;
```

Instant. Visible on every surface in both themes. Never removed without a
replacement.

## AI conversation — specific rules

The conversation area is the product. It gets stricter rules than the rest.

- **User messages** — solid accent fill, `text-on-solid-primary`, right-
  aligned, capped at `--hg-measure`.
- **Assistant messages** — `--hg-surface-sunken` fill on light, one step up
  from canvas on dark. Left-aligned. Same measure cap. Slightly looser
  `line-height` (1.55) than UI text, because these are paragraphs, not labels.
- **Code blocks** — sunken surface, `--hg-radius-sm`, mono, horizontal scroll
  (never wrap), `--hg-measure-wide`. No fake window chrome, no title bar with
  traffic-light dots.
- **Tables** — hairline rules only, no zebra striping, `tabular-nums`,
  horizontal scroll in their own container so the page never scrolls sideways.
- **Links** — underlined with a 2px offset, not colour-only.
- **Streaming** — a single accent hairline that travels across the top of the
  composer while the agent is generating, plus the stop button. One indicator,
  not three. Driven purely by the presence of the existing stop button in the
  DOM (`:has()`), so no component or state change is required.

## Per-surface allowances

- **Conversation** may use the measure caps and bubble treatment above.
- **Rail and panels** must stay flat (`--hg-elev-0`) — depth in chrome
  competes with the content.
- **Dialogs and menus** may use `--hg-elev-2` / `--hg-elev-3`.
- **Nothing** may use: gradient text, glassmorphism, aurora/mesh backgrounds,
  grain overlays on scrolling surfaces, coloured drop shadows, or emoji
  standing in for icons.

## What every surface MUST share

- The surface ladder and the single hairline seam.
- Inter + Fira Code. No third family.
- The accent budget and its four permitted uses.
- The focus treatment.
- The radius ladder.
- `tabular-nums` on all figures.

## What surfaces MAY differ on

- Density (the rail is denser than the conversation).
- Which elevation step they sit at.
- Measure (`--hg-measure` vs `--hg-measure-wide`).

## Exports

### tokens.css

The canonical implementation lives at
`apps/web/res/themes/light/css/_hg-tokens.pcss` and is imported by both the
light and dark theme entry points. It is the single source of truth for every
`--hg-*` value; component stylesheets reference tokens by name and never
inline a colour, shadow, radius, duration or easing.
