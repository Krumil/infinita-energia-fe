# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

A small back-office team at Infinita Energia, one to three admin or accounting staff, runs the monthly commission close on desktop. Sales agents never log in. They're the subject of the data, not users of the app.

## Product Purpose

Calcolo Provvigioni calculates the commissions Infinita Energia owes its sales agents on energy contracts (electricity and gas, identified by POD/PDR), saves them as one invito a fatturare per agent per competence month, and tracks those invites until they're paid.

Success is judged on two things:

- Defensible amounts. Every commission traces back to an imported liquidation row and the agent's rule or tier, so a dispute with an agent can be settled from the app.
- Payment tracking. The team knows which invites are draft, sent, approved, invoiced and paid, and what's still owed for which months.

A fast close and the dashboard overview weren't chosen as success criteria. They support the job but don't define it.

## Positioning

The calculation isn't done by hand. The backend applies each agent's configured rules, tiers and parent overrides to the liquidations already imported for the month, and nothing is saved until an operator has previewed and reviewed the result. Rows that match no configuration are shown to the operator instead of being dropped.

## Operating Context

The monthly cycle runs across the app's tabs:

1. Ordini: import orders from Excel, and import the competence month's liquidation file. A month that already has liquidations is rejected; the operator can delete that month and reimport it.
2. Provvigioni: preview the month's commissions without saving anything, inspect unmatched rows, then edit amounts, remove rows or exclude agents.
3. Confirm the reviewed draft. It saves one draft invite per agent. An agent whose invite is no longer a draft is skipped, and the outcome says so.
4. Inviti: follow each invite through its states (Bozza, Inviato, Approvato) and record the invoice reference, invoice date, payment and payment date. The unpaid report recalculates an agent's unpaid commissions over a range of months and downloads a CSV.

Agenti and Regole (rules and scaglioni, the tiers) configure the calculation. Rules and tiers missing a customer type (tipo_utenza) are counted as incomplete in the navigation. The dashboard shows contracts and commissions by month, product and agent.

The exports (preview ZIP, saved invites ZIP, unpaid CSV) are read by internal accounting for checks, bookkeeping and payments. They aren't sent to agents.

## Capabilities and Constraints

- A React and Vite single-page app with hash navigation (`#dashboard`, `#agenti`, `#regole`, `#ordini`, `#provvigioni`, `#inviti`), backed by a Flask API with session-cookie authentication. The backend calculates commissions and parent overrides. The frontend edits the returned rows and derives display totals, and confirmation returns the authoritative saved totals.
- Italian is the default language and English is fully supported. Domain terms are Italian in the UI and the API: provvigioni, liquidazioni, competenza, inviti a fatturare, regole, scaglioni, agenti.
- Competence months are sent as the first day of the month (`YYYY-MM-01`), except the liquidation import, which takes `MM/YYYY`.
- A draft survives tab changes but not a browser reload. Manual row creation is outside this version.
- Agents form a hierarchy, and a parent earns an override on its children's sales. An agent can be excluded from statistics.
- Light, dark and system themes are supported.
- Automated tests are end-to-end only: Playwright in `e2e/` against the real backend.
- Open: retiring the legacy calculation endpoint and normalizing historical invite months depend on the backend owner (tasks 00 and 08 in `docs/frontend-calcolo-refactor/`).

## Brand Commitments

- Name: Calcolo Provvigioni in Italian, Commission Calculator in English.
- Company: Infinita Energia. The logo is `public/logo.png`, with 48, 96 and 512 pixel versions beside it.
- The README describes an Infinita Energia brand palette configured in `tailwind.config.js`. Whether it binds this internal tool hasn't been confirmed.

## Evidence on Hand

- Product documentation: `README.md` and `docs/frontend-calcolo-refactor/` (workflow decisions, task specs and manual test guides).
- The e2e suite in `e2e/` exercises the real flows end to end.
- The repo holds no real agent, customer or commission data. The e2e tests use months in 2031 and generated agents. Don't fabricate figures, agent names or customer details.

## Product Principles

1. Nothing is saved without review. A calculation stays a preview until an operator confirms it, and destructive actions such as deleting a month's liquidations ask first.
2. Every amount is explainable. Show where a commission came from (liquidation row, rule, tier, parent override), and surface what didn't match instead of hiding it.
3. Money state is never ambiguous. Draft, saved, skipped, sent, approved and paid must read as different things.
4. The users are a few experts repeating a monthly job. Favor precision and efficiency for repeat use over first-run guidance, and keep the Italian domain vocabulary they work in.
