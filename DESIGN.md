---
name: Calcolo Provvigioni
description: Commission calculation and invite tracking for Infinita Energia's back office.
colors:
  energia-sky: "hsl(197 66% 50%)"
  energia-leaf: "hsl(130 52% 45%)"
  sky-ink: "hsl(197 75% 32%)"
  leaf-ink: "hsl(130 55% 30%)"
  night-grid-navy: "hsl(211 100% 18%)"
  night-grid-navy-deep: "hsl(211 100% 14%)"
  slate-ink: "hsl(210 25% 25%)"
  muted-ink: "hsl(210 10% 40%)"
  metric-graphite: "hsl(210 6% 35%)"
  mist-paper: "hsl(205 24% 95%)"
  card-paper: "hsl(205 22% 97%)"
  secondary-wash: "hsl(205 18% 90%)"
  muted-wash: "hsl(205 16% 92%)"
  hairline: "hsl(205 14% 82%)"
  input-line: "hsl(205 14% 88%)"
  sky-wash: "hsl(197 55% 88%)"
  on-color: "hsl(0 0% 100%)"
  alarm-red: "hsl(0 65% 48%)"
  status-draft-bg: "#fef3c7"
  status-draft-text: "#b45309"
  status-sent-bg: "#dbeafe"
  status-sent-text: "#1d4ed8"
  status-approved-bg: "#d1fae5"
  status-approved-text: "#047857"
  status-neutral-bg: "#f1f5f9"
  status-neutral-text: "#475569"
  status-failed-bg: "#fee2e2"
  status-failed-text: "#b91c1c"
  notice-warning-bg: "#fffbeb"
  notice-warning-text: "#92400e"
  notice-warning-border: "#f59e0b"
  notice-success-bg: "#ecfdf5"
  notice-success-text: "#065f46"
  notice-info-bg: "#f0f9ff"
  notice-info-text: "#075985"
  series-1: "#2a78d6"
  series-2: "#eb6834"
  series-3: "#1baf7a"
  series-4: "#eda100"
  series-5: "#e87ba4"
  series-6: "#008300"
  series-7: "#4a3aa7"
  series-8: "#8c564b"
  series-9: "#0f9fb4"
  series-10: "#c43c45"
  series-11: "#8a8a1e"
  series-12: "#2f4b7c"
  series-muted: "#a9a8a0"
typography:
  display:
    fontFamily: "IBM Plex Mono, Consolas, monospace"
    fontSize: "3rem"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "-0.025em"
    fontFeature: "\"tnum\" 1"
  metric:
    fontFamily: "IBM Plex Mono, Consolas, monospace"
    fontSize: "1.875rem"
    fontWeight: 400
    lineHeight: "2.25rem"
    fontFeature: "\"tnum\" 1"
  headline:
    fontFamily: "Roboto Slab, Georgia, serif"
    fontSize: "1.5rem"
    fontWeight: 400
    lineHeight: "2rem"
    letterSpacing: "0.03em"
  title:
    fontFamily: "Roboto Slab, Georgia, serif"
    fontSize: "1.25rem"
    fontWeight: 400
    lineHeight: "1.75rem"
    letterSpacing: "0.025em"
  body:
    fontFamily: "Roboto, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.65
    letterSpacing: "0.01em"
  body-sm:
    fontFamily: "Roboto, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: "1.25rem"
    letterSpacing: "0.01em"
  label:
    fontFamily: "Roboto, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 600
    letterSpacing: "0.02em"
  caps:
    fontFamily: "Roboto Slab, Georgia, serif"
    fontSize: "0.875rem"
    fontWeight: 400
    letterSpacing: "0.12em"
  button:
    fontFamily: "Roboto Slab, Georgia, serif"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: "1.25rem"
    letterSpacing: "0.12em"
  nav:
    fontFamily: "Roboto Slab, Georgia, serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.65
    letterSpacing: "0.04em"
  numeric:
    fontFamily: "IBM Plex Mono, Consolas, monospace"
    fontSize: "0.875rem"
    fontWeight: 400
    fontFeature: "\"tnum\" 1"
rounded:
  sm: "2.375px"
  md: "4.375px"
  lg: "6.375px"
  soft: "17px"
  full: "9999px"
spacing:
  xs: "0.25rem"
  sm: "0.5rem"
  md: "0.75rem"
  lg: "1rem"
  xl: "1.5rem"
  2xl: "2rem"
  section: "2.5rem"
components:
  button-primary:
    backgroundColor: "{colors.energia-sky}"
    textColor: "{colors.night-grid-navy}"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
    padding: "0.5rem 1rem"
    height: "2.5rem"
  button-primary-hover:
    backgroundColor: "hsl(197 66% 50% / 0.9)"
  button-secondary:
    backgroundColor: "{colors.mist-paper}"
    textColor: "{colors.muted-ink}"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
    padding: "0.5rem 0.75rem"
    height: "2.25rem"
  button-secondary-hover:
    backgroundColor: "{colors.energia-leaf}"
    textColor: "{colors.night-grid-navy}"
  button-destructive:
    backgroundColor: "{colors.alarm-red}"
    textColor: "{colors.on-color}"
    rounded: "{rounded.md}"
    padding: "0.5rem 1rem"
    height: "2.5rem"
  input:
    backgroundColor: "{colors.mist-paper}"
    textColor: "{colors.slate-ink}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.sm}"
    padding: "0.5rem 0.75rem"
    height: "2.5rem"
  card-ledger:
    backgroundColor: "{colors.card-paper}"
    textColor: "{colors.slate-ink}"
    rounded: "{rounded.sm}"
    padding: "1.5rem"
  card-kpi:
    backgroundColor: "{colors.card-paper}"
    textColor: "{colors.metric-graphite}"
    typography: "{typography.display}"
    rounded: "{rounded.sm}"
    padding: "1.5rem"
  card-chart:
    backgroundColor: "{colors.card-paper}"
    textColor: "{colors.slate-ink}"
    rounded: "{rounded.soft}"
    padding: "2rem"
  header:
    backgroundColor: "{colors.night-grid-navy}"
    textColor: "{colors.on-color}"
    height: "72px"
  nav-item:
    textColor: "hsl(0 0% 100% / 0.6)"
    typography: "{typography.nav}"
    rounded: "{rounded.md}"
    padding: "0.625rem 1rem"
  nav-item-active:
    backgroundColor: "hsl(0 0% 100% / 0.12)"
    textColor: "{colors.on-color}"
  badge-status-draft:
    backgroundColor: "{colors.status-draft-bg}"
    textColor: "{colors.status-draft-text}"
    rounded: "{rounded.full}"
    padding: "0.125rem 0.625rem"
  badge-status-sent:
    backgroundColor: "{colors.status-sent-bg}"
    textColor: "{colors.status-sent-text}"
    rounded: "{rounded.full}"
    padding: "0.125rem 0.625rem"
  badge-status-approved:
    backgroundColor: "{colors.status-approved-bg}"
    textColor: "{colors.status-approved-text}"
    rounded: "{rounded.full}"
    padding: "0.125rem 0.625rem"
  notice-warning:
    backgroundColor: "{colors.notice-warning-bg}"
    textColor: "{colors.notice-warning-text}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.md}"
    padding: "0.75rem"
---

# Design System: Calcolo Provvigioni

## Overview

**Creative North Star: "The Monthly Close Desk"**

This is a workbench for one to three back-office experts who run the same commission close every month. The interface should feel like a tidy desk at the end of the day: everything squared away, every figure where it was left, nothing asking for attention it hasn't earned. The ledger style is the standard: cool mist paper behind hairline-bordered cards with near-square corners, Roboto Slab for headings and capitalized labels, and IBM Plex Mono for every figure. A Night Grid Navy band holds the navigation at the top, and the work area below it stays quiet.

Color does a job or stays out. Energia Sky marks the action that commits something. Energia Leaf marks a state change: the hovered button, the active tab, the focused field, the selected text. A small set of status hues carries money state (draft, sent, approved, paid, failed), and those hues appear nowhere else. The canvas is desktop-first and wide (up to 1600px), and tables carry most of the weight.

The dashboard is the one sanctioned exception. Its chart cards are soft (borderless, 17px corners, a quiet shadow, sentence-case titles) because they hold charts rather than records. That treatment stays on the dashboard and doesn't spread into the workflow tabs.

**Key Characteristics:**
- Near-square corners (2.375px on cards and fields, 4.375px on buttons) on a cool blue-grey paper.
- Three type voices: Roboto Slab for headings and caps labels, Roboto for prose and controls, IBM Plex Mono for amounts, counts, dates and codes.
- Two brand hues with fixed jobs: Sky commits, Leaf signals.
- Flat at rest, with a whisper of cool shadow under cards. Depth comes from paper tone, not from lift.
- A 17px root, so every rem in the system is 17px.
- Motion is short and functional: 150 to 300ms ease-out color and opacity changes. Dashboard cards land (a 12px rise and fade) the first time they scroll into view, in reading order, and KPI figures roll up into a clipped slot when new numbers arrive. Chart motion belongs to evilcharts: its loading skeleton while a request runs, its intro when the figures land. A chart mounts only when its card lands, so the intro plays where it can be seen; the HTML export mounts the rest already drawn. Reduced motion swaps the movement for a short fade.
- Light, dark and system themes, all driven by the same semantic tokens.

## Colors

A cool, low-chroma paper palette with two saturated brand hues from Infinita Energia, darkened from the README's brand values (#6EC1E4 and #61CE70) so they hold up on light surfaces.

### Primary
- **Energia Sky** (`energia-sky`): the commit color. Primary buttons (Calcola, Conferma, Salva, Crea agente), the focus ring on buttons and fields, and the selected day in the date picker. Text on a Sky fill is Night Grid Navy. In dark theme it lifts to hsl(197 60% 55%).
- **Sky Ink** (`sky-ink`): Sky as text on a light surface: link buttons, the small rule badges, the chart tooltip label. In dark theme it is Energia Sky itself, which reads well on graphite.

### Secondary
- **Energia Leaf** (`energia-leaf`): the signal color. The hover fill of every outline and ghost button (with Night Grid Navy text), the active nav icon and its underline, the hairline under the header, the 3px top bar on alert dialogs, focus outlines on non-button elements, and text selection (at 25%). In dark theme it lifts to hsl(130 50% 55%), where it reads well on graphite.
- **Leaf Ink** (`leaf-ink`): Leaf as text on a light surface: KPI labels in the Provvigioni total, the per-agent and total commission figures, the dropzone's click-to-upload prompt, and the hovered rule value. In dark theme it is Energia Leaf itself.

### Tertiary
- **Night Grid Navy** (`night-grid-navy`, fading to `night-grid-navy-deep`): the header band, as a top-to-bottom gradient, and the text on every Sky or Leaf fill. In dark theme the band becomes near-black graphite (hsl(210 20% 11%) to hsl(210 20% 7%)) so it doesn't glow, and text on the fills deepens to hsl(211 100% 12%) so it still clears 4.5:1 on the dimmed hover fill.

### Neutral
- **Mist Paper** (`mist-paper`): the page and the fill of fields and outline buttons. In light theme a faint Sky Wash radial sits in the top-left corner over a gradient down to hsl(210 20% 91%).
- **Card Paper** (`card-paper`): cards, popovers and sheets. One step lighter than the page, which is most of the depth the system uses.
- **Slate Ink** (`slate-ink`): body text and headings.
- **Muted Ink** (`muted-ink`): secondary text, table headers, captions, helper copy. It's the most used text color in the app.
- **Metric Graphite** (`metric-graphite`): large figures in KPI tiles, slightly softer than ink so a 51px number doesn't shout.
- **Secondary Wash** and **Muted Wash** (`secondary-wash`, `muted-wash`): sticky table headers (at 80 to 90% with blur), row hover, segmented-control tracks.
- **Hairline** and **Input Line** (`hairline`, `input-line`): card borders (usually at 50 to 60%), table rules, field borders.
- **Alarm Red** (`alarm-red`): destructive buttons, field errors, failed fetches.

Dark theme swaps the neutrals for graphite: page hsl(210 15% 10%), card hsl(210 12% 13%), text hsl(210 5% 90%), muted text hsl(210 5% 55%), borders hsl(210 10% 22%). Always reach for the semantic Tailwind tokens (background, card, foreground, muted-foreground, border) so both themes follow.

### Status
Money and order state use Tailwind's amber, blue, emerald, slate and red, each as a pale fill with dark text in light theme, and a 40% deep fill with a light tint in dark theme.
- **Draft** (Bozza, In verifica): amber.
- **Sent** (Inviato, Trasferito): blue.
- **Approved and paid** (Approvato, Accettato, Confermato, paid check): emerald.
- **Neutral or unpaid**: slate.
- **Failed or cancelled** (KO, Annullato): red.
- **Trend deltas**: dashboard year-on-year changes use green-700 up and red-700 down (green-400 and red-400 in dark), always with an arrow icon.
- **Notices**: warning notices (stale preview, unmatched rows, skipped agents) use amber-50 with an amber-500 border at 50%. Success uses emerald-50 and info uses sky-50, both with a 40% border.

### Chart Series
Twelve series colors checked for color-blind separation against the card, plus a muted grey for "Altri agenti". Series 1 to 7 cover most charts; 8 to 12 exist only for the products-by-agent stack. Money charts use series 3 (green) so revenue reads apart from contract counts.

### Named Rules
**The Sky Commits Rule.** Energia Sky fills only the button that commits or advances the work. A screen has one Sky-filled button per decision point.

**The Leaf Signals Rule.** Energia Leaf is a response, not a decoration. It appears when something is hovered, active, focused or selected, and in the few ledger accents listed above. It never fills a resting surface.

**The Status Hue Rule.** Amber, blue, emerald, slate and red mean state. Don't use them for categories, charts or decoration, or a draft will look like a chart series.

**The Small Text Contrast Rule.** Sky and Leaf fills sit below 3:1 against white and against Card Paper (white on Sky measured 2.85:1, Leaf on Card Paper 2.69:1). So neither fill carries white text, and neither color is used as text on a light surface. Text on a Sky or Leaf fill is Night Grid Navy (4.8:1). Text that has to read as Sky or Leaf uses Sky Ink or Leaf Ink (5 to 5.5:1 on paper). Spinners and decorative icons can stay in full Leaf.

## Typography

**Display Font:** Roboto Slab (with Georgia, serif)
**Body Font:** Roboto (with system-ui, sans-serif)
**Label/Mono Font:** IBM Plex Mono (with Consolas, monospace)

**Character:** Roboto Slab gives headings and caps labels the squared, printed feel of a ledger header, while Roboto stays neutral for everything a user reads or types. IBM Plex Mono with tabular figures makes every amount line up digit for digit.

The root size is 17px, so Tailwind's text-sm is 14.875px and text-2xl is 25.5px. Fonts load from Google Fonts in `index.html` (Roboto Slab 400 to 700, Roboto 400 to 700, IBM Plex Mono 400 to 600).

### Hierarchy
- **Display** (Plex Mono 600, 3rem, tight tracking): the single total on the Provvigioni preview. One per screen.
- **Metric** (Plex Mono 400, 1.875rem): dashboard KPI figures, in Metric Graphite.
- **Page title** (Roboto Slab 400, 2.25rem): the dashboard heading, the only page-level h1. Workflow tabs start at Headline.
- **Headline** (Roboto Slab 400, 1.5rem, 0.03em): the title of each tab section (Agenti, Regole, Scaglioni, Ordini, Calcola provvigioni).
- **Title** (Roboto Slab 400, 1.25rem, 0.025em): card, dialog-section and chart titles.
- **Body** (Roboto 400, 1rem, line-height 1.65, 0.01em): prose, descriptions, empty states.
- **Body small** (Roboto 400, 0.875rem): the working size. Table cells, controls, captions and helper text all sit here.
- **Label** (Roboto 600, 0.875rem, 0.02em): form field labels.
- **Caps** (Roboto Slab 400, 0.875rem, 0.12em, uppercase): KPI labels and ledger table headers (at 0.08em). Buttons use the same voice at weight 500.
- **Nav** (Roboto Slab 400, 13px, 0.04em, uppercase): header navigation.
- **Numeric** (Plex Mono 400, 0.875rem, tabular): amounts, counts, POD/PDR codes, months and dates inside tables.

### Named Rules
**The Mono Figures Rule.** Any number a user might compare or dispute (an amount, a count, a percentage, a competence month) is set in IBM Plex Mono with tabular figures and right-aligned in its column.

**The Sentence-Case Prose Rule.** Caps belong to buttons, nav, KPI labels and ledger table headers. Titles, descriptions, notices and dashboard chart titles stay in sentence case.

## Layout

A sticky 72px header spans the full width; its content and the main area share a centered column capped at 1600px. Main padding steps from 1rem on phones to 1.5rem at sm and 2rem at lg. Each tab stacks its blocks 2.5rem apart.

Inside a tab, the pattern is a section headline with its actions on the right (refresh as a secondary button, create as the primary), then one ledger card holding the table. The dashboard lays chart cards in two- and three-column grids at lg with 1.5rem gaps, and joins its three KPI tiles into one card split by hairlines (stacked on mobile, side by side from md).

Long tables scroll inside their card with a sticky, blurred header, so the page itself keeps the header and actions in view. Dialogs cap at 32rem wide; the invite dialog and sheets are wider where the form needs it.

The app is desktop-first because the close happens at a desk. Below md the nav drops its labels and keeps icons; below sm the app title collapses to the version tag. Action rows switch from stacked to a single row at sm.

## Elevation & Depth

Flat at rest. Cards separate from the page by paper tone and a hairline, plus a cool shadow so faint it reads as a printed edge (0 1px 3px at 8%). Hover deepens it slightly. Dialogs and toasts are the only surfaces that truly lift, over a 60% black overlay with a small backdrop blur. In dark theme the resting card shadow disappears entirely and depth comes from the graphite steps alone.

A 2% fractal-noise grain covers the whole viewport in both themes (1.5% in dark), giving the paper a little tooth. Backdrop blur appears only on sticky table headers and the dialog overlay.

### Shadow Vocabulary
- **Ledger rest** (`box-shadow: 0 1px 3px hsl(211 30% 50% / 0.08)`): resting ledger cards and dashboard cards.
- **Ledger hover** (`box-shadow: 0 4px 12px hsl(211 30% 50% / 0.12), 0 1px 3px hsl(211 30% 50% / 0.08)`): a hovered ledger card.
- **Dialog** (`box-shadow: 0 25px 50px -12px hsl(211 50% 30% / 0.25)`): dialogs and alert dialogs only.

### Named Rules
**The Flat-At-Rest Rule.** No surface floats until the user acts on it. A resting card gets the Ledger rest edge and nothing deeper; real lift appears only on hover or on a modal.

## Shapes

Corners are nearly square. The radius scale derives from a 0.375rem base at the 17px root: 2.375px for cards, KPI cards and text fields, 4.375px for buttons, selects and notices, 6.375px for dialogs. Fully round shapes are kept for status badges, the dashboard's chart/table toggle, the rules-incomplete counter in the nav, and the short underline beneath the active nav item. The 17px soft corner belongs to dashboard chart cards only.

Borders are single hairlines at reduced opacity (usually Hairline at 50 to 60%). Ledger tables close their header with a 2px Leaf rule at 25%. The file dropzone is the one dashed shape: a 2px dashed border that turns Leaf on hover or drag.

## Components

### Buttons
Quiet, exact, ruled. Buttons speak in letter-spaced Roboto Slab caps and stay small.
- **Shape:** gently squared (4.375px), 2.5rem tall by default and 2.25rem in toolbars.
- **Primary:** Energia Sky fill, Night Grid Navy Slab caps at 500 with 0.12em tracking, and a faint white top sheen. Hover drops the fill to 90%. Built as the default Button plus the ledger primary class, which adds the Slab caps and the sheen; the fill comes from the Button itself.
- **Secondary:** Mist Paper fill, Input Line border, Muted Ink Slab caps at 0.1em. Hover fills solid Energia Leaf with Night Grid Navy text.
- **Ghost:** no fill or border; hover is the same Leaf fill.
- **Destructive:** Alarm Red fill, white Roboto. Used inside confirm dialogs, never as a first click.
- **Focus:** a 2px Sky ring offset 2px from the edge.
- **Disabled:** 50% opacity, no pointer events.

### Chips (status badges)
- **Style:** fully round, 0.75rem semibold Roboto, pale status fill with dark status text and no border.
- **State:** one badge per state from the Status palette. The paid column uses an emerald badge with a check icon or a slate badge with a dash, so paid and unpaid differ by icon as well as color.

### Cards / Containers
- **Ledger card:** Card Paper, Hairline border at 60%, 2.375px corners, Ledger rest shadow, 1.5rem padding (or none when it frames a table). On hover the border firms up and the shadow deepens. It also shows a 3px Leaf rail along its left edge; that rail is legacy and must not be copied into new components.
- **KPI card:** the Provvigioni total. A diagonal gradient from Card Paper to a cooler tint, a Leaf border at 20%, and a Leaf hairline across the top that fades out at both ends. A Leaf Ink caps label sits over a 3rem Plex Mono figure that rises 8px into place on load.
- **Dashboard chart card** (dashboard only): Card Paper, no border, 17px corners, Ledger rest shadow, 2rem padding from sm. A Slab title with the covered months in Muted Ink beneath it, and a round chart/table toggle on the right so every chart can be read as numbers.

### Inputs / Fields
- **Style:** Mist Paper fill, Input Line border, 2.375px corners, 2.5rem tall, 15px Roboto, placeholders in Muted Ink at 70%.
- **Focus:** a 2px Sky ring offset 2px.
- **Error / Disabled:** errors turn the border and message Alarm Red; an incomplete rule turns its select border amber with a faint amber ring. Disabled fields drop to 50% opacity.
- **Labels:** Roboto 600 at 0.875rem above the field, never inside it.

### Navigation
- **Header:** Night Grid Navy gradient, 72px tall, logo and Slab app title with a mono version tag on the left, nav and utilities on the right, and a Leaf hairline along the bottom that fades out at both ends.
- **Items:** Slab caps at 13px, white at 60% with 1.75 stroke icons. Hover lifts the text to full white over a 6% white fill; the active item gets a 12% white fill, a Leaf icon at 2.25 stroke, and a 24px Leaf underline.
- **Badges:** the Regole item carries a round amber counter for incomplete rules.
- **Utilities:** settings and logout as 40px icon buttons; logout turns soft red on hover.

### Tables
- **Ledger tables** (Agenti, Regole, Scaglioni): Plex Mono throughout, Slab caps headers in Muted Ink at 0.08em over a 2px Leaf rule at 25%, 0.875rem cell padding, hairline row rules at 50%, a Secondary Wash row hover.
- **Workflow tables** (Provvigioni, Inviti): Roboto body-small cells, a sticky Secondary Wash header with blur, medium-weight Muted Ink headers, mono and right-aligned money columns, a Muted Wash row hover.

### Notices
Inline, never toasts, for anything the operator must act on: a stale preview, unmatched liquidation rows, skipped agents. A 4.375px rounded box in the matching notice color with a leading 16px icon, the message in body-small, and the action button on the right from sm.

### Dropzone
A dashed 2px Hairline frame with a faint top-down wash and a large muted upload icon. Hover or drag turns the frame and icon Leaf. A compact variant sits inside import dialogs.

### Empty states
Centered, with a 64px icon at 30% Muted Ink and a single italic Slab line in Muted Ink. They state what's missing and, where one exists, offer the button that fixes it.

## Do's and Don'ts

### Do:
- **Do** build new workflow screens from the ledger card, the ledger or workflow table, Slab headlines and Plex Mono figures.
- **Do** use the semantic tokens (background, card, foreground, muted-foreground, border, primary, accent) so light, dark and system themes all follow.
- **Do** give each decision point one Sky primary button, with refresh and cancel as secondary buttons.
- **Do** right-align money and counts in Plex Mono with tabular figures.
- **Do** show money state with the Status palette and pair the color with a word or an icon.
- **Do** keep warnings and skipped results inline next to the work they affect.
- **Do** honor reduced motion: wrap any entrance animation in motion-reduce and keep transitions at or under 300ms.

### Don't:
- **Don't** copy the ledger card's left hover rail into a new component, and don't add any other colored stripe along a card's left edge.
- **Don't** put a small caps label above a heading. KPI labels above a figure are the only stacked caps label.
- **Don't** use the dashboard's soft chart card (17px corners, no border) outside the dashboard.
- **Don't** set text in Energia Sky or Energia Leaf on a light surface, or white text on either fill (both below 3:1). Use Sky Ink, Leaf Ink or Night Grid Navy.
- **Don't** use amber, blue, emerald or red for anything but state.
- **Don't** give a resting card a shadow deeper than Ledger rest, a glow, or a gradient (the KPI card's diagonal wash is the one existing exception); depth comes from paper tone and a hairline.
- **Don't** introduce a new typeface or a fourth text voice.
