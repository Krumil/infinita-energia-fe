# AGENTS.md

## Limits set by the external management system

This app is built on top of a separate management system (gestionale) that we have no direct access to. Orders (ordini) and settlements (liquidazioni) come from it, and we can't change them, either at the source or in our database after import. Some inconsistencies follow from that and are accepted as known limits, not bugs to fix. Don't work around them by rewriting imported rows unless asked.

Known case: renaming an agent. The app lets an operator change an agent's name, but orders, settlements and saved invite rows keep the seller as the key the backend computed at import time (`normalize_name`: uppercase words sorted alphabetically). Reordering the words keeps the key. Changing a word, for example fixing a typo in the surname, gives the agent a new key, and the old rows stop matching: the calculation treats them as a seller who isn't one of our agents, and the screens show the stored key instead of the typed name, because `sellerNameLookup` in `src/lib/utils.ts` falls back to the key. That's accepted.

## Size of the e2e suite

The e2e tests run one at a time against a single database, so each one makes every run longer. Keep the suite small.

- A flow gets one test for its main path and one for the failure that would lose money or data, or block the operator. A variation of a flow goes into the test that already covers it, not into a new one.
- Behaviour shared by several screens is tested once, on the screen where it matters most: the "Non mostrare più" checkbox, tables that load a hundred rows at a time, typed agent names, translated server errors, late answers that must be discarded.
- Cosmetic details get no test: placeholders, tooltips, sort order, focus return, picker limits, layout at a given width.
- Before adding a test, look for one to extend or replace.
