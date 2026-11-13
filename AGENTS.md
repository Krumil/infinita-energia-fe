# AGENTS.md

## Limits set by the external management system

This app is built on top of a separate management system (gestionale) that we have no direct access to. Orders (ordini) and settlements (liquidazioni) come from it, and we can't change them, either at the source or in our database after import. Some inconsistencies follow from that and are accepted as known limits, not bugs to fix. Don't work around them by rewriting imported rows unless asked.

Known case: renaming an agent. The app lets an operator change an agent's name, but orders, settlements and saved invite rows keep the seller as the key the backend computed at import time (`normalize_name`: uppercase words sorted alphabetically). Reordering the words keeps the key. Changing a word, for example fixing a typo in the surname, gives the agent a new key, and the old rows stop matching: the calculation treats them as a seller who isn't one of our agents, and the screens show the stored key instead of the typed name, because `sellerNameLookup` in `src/lib/utils.ts` falls back to the key. That's accepted.
