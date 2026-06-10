# Automated QA (E2E)

The Playwright suite exercises the highest-risk rules against a live Foundry
VTT 13 world running PF1e v11.11. The manual checklist remains authoritative
for features not listed below.

## Required world fixture

The world must contain an actor named exactly:

`Dattoumaru Ikazuchi (test)`

That actor is the canonical template because its PF1e class and derived setup
cannot be reproduced by creating a generic PF1e actor. It must contain:

`YOUTON: KAIMON NO JUTSU (DEMONIC RELEASE: DESTRUCTION GATE TECHNIQUE)`

The YOUTON technique must remain below its auto-perform threshold. The suite
clones the actor before every test and never intentionally updates the original.
Additional techniques, target actors, tokens, buffs, messages, world items, and
test compendia are created temporarily and deleted during teardown.

## Environment

```bash
export FOUNDRY_USER="Your GM user"
export FOUNDRY_PASSWORD="Your password" # omit or leave empty for a passwordless user

# Optional overrides
export FOUNDRY_URL="http://localhost:30000"
export FOUNDRY_ACTOR="Dattoumaru Ikazuchi (test)"
export FOUNDRY_PERFORM_TECHNIQUE="YOUTON: KAIMON NO JUTSU (DEMONIC RELEASE: DESTRUCTION GATE TECHNIQUE)"
```

No credentials are stored in the repository. The login user must be a GM
because the suite temporarily changes world settings and creates documents.

## Running

```bash
npm install
npx playwright install chromium
npm run test:e2e
npm run test:e2e:headed
npm run test:e2e:ui
```

The Foundry world must already be running. Playwright installs the test API
directly in its browser page; there is no persistent test-mode setting.

## Current coverage

| Spec                     | Coverage                                                                                |
| ------------------------ | --------------------------------------------------------------------------------------- |
| `chakra.spec.mjs`        | Derived values, sheet editing/persistence, conditions, Chakra UI                        |
| `tap-reserves.spec.mjs`  | Real dialog UI, seal DCs, validation, success/failure, PF1e roll card                   |
| `use-technique.spec.mjs` | YOUTON perform failure/success, mastery bypass, insufficient chakra, Emergency Transfer |
| `auto-buffs.spec.mjs`    | Full technique-to-buff flow, targeting, refresh, lookup priority, PF1e expiry           |

Tests run serially because they share one Foundry world and browser page. A
test fails if required fixture data is missing; core scenarios do not skip.
Console errors and uncaught page errors also fail the active test.

## Isolation guarantees

Every test:

1. Clones the template actor.
2. Records changed module settings and selected targets.
3. Runs only against disposable documents.
4. Restores settings and targets.
5. Deletes generated messages, tokens, actors, items, and packs.
6. Verifies that the template actor's serialized data did not change.

The next run also removes stale E2E documents left by an interrupted process.
