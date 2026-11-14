# CLAUDE.md

Project rules for coding assistants (Claude Code reads this file) and for human
contributors.

## What this is

**Mail and Packages**, a Gladys Assistant **external integration**: a Node.js
service (Node 22+, ESM, no build step) that runs in its own sandboxed Docker
container, reads the shipping notifications of a mailbox over IMAP and talks
to Gladys through
[`@gladysassistant/integration-sdk`](https://github.com/GladysAssistant/integration-sdk-js).
Runtime dependencies: the SDK, `imapflow` (IMAP) and `mailparser` (MIME). It
started from the official JavaScript template and is inspired by the Home
Assistant [Mail and Packages](https://github.com/moralmunky/Home-Assistant-Mail-And-Packages)
integration.

## Commands

```bash
npm install
npm test                                     # node --test, the built-in runner
node --test test/classifier.test.js          # one file
node --test --test-name-pattern "colissimo"  # tests whose name matches
npm run lint                                 # ESLint
npm run format:check                         # Prettier, as the CI runs it
npm run format                               # Prettier, fix in place
npm run manifest                             # regenerate the manifest
npx github:GladysAssistant/integration-store .   # store admission checks
```

The CI (`.github/workflows/ci.yml`) runs `format:check`, `lint` and `test` on
Node 22 and 24, and builds the Docker image: run the three commands before
pushing.

## Architecture

```
index.js                          SDK bootstrap only
src/app.js                        handler wiring (scan timer, actions, scenes, widgets, config)
src/imap.js                       IMAP driver: read-only, envelopes first, then carrier emails only
src/carriers/definitions.js       carrier data: senders, status rules, tracking patterns, URLs
src/carriers/generic.js           multilingual status rules (ORDER MATTERS: exception first)
src/carriers/index.js             lookups (sender -> carrier, tracking URL, custom senders)
src/classifier.js                 one email -> one parcel event (pure)
src/tracker.js                    events -> parcels + counters + event keys (pure, deterministic)
src/engine.js                     scan -> publishChangedStates + publishSceneEvent (once per key)
src/store.js                      /data/state.json: keys of the scene events already fired
src/devices.js                    summary device + one device per carrier, and their states
src/scenes.js                     scene actions (manifest `scene_actions`)
src/widgets.js                    dashboard widgets (manifest `widgets`)
src/actions.js                    manifest `actions` (Configuration screen buttons)
src/i18n.js                       runtime texts in en, fr, de, es
src/config.js                     DEFAULT_CONFIG (mirrors the manifest defaults) + normalization
scripts/manifest-source.mjs       SOURCE of gladys-assistant-integration.json
docs/{en,fr,de,es}.md             user documentation, re-hosted by Gladys (en + fr mandatory)
test/                             node --test, against the SDK's fake Gladys, no network
```

## Rules

- **The manifest is generated.** Edit `scripts/manifest-source.mjs` (or the
  carriers), run `npm run manifest`, commit both. `test/manifest.test.js`
  fails when the committed manifest differs from the generated one.
- **Keys are forever.** Carrier keys, status values, counter / feature keys,
  scene trigger and action keys, output keys, widget keys and config keys are
  stored by Gladys (device external ids, scenes, dashboards). Never rename
  one; add a new one instead. External ids are built with
  `gladys.externalIds(type, platformId)`: `mailbox:summary` and
  `carrier:<carrier key>`.
- **Mailbox privacy.** Never log the password, an email body or an email
  address of the user. Never write to the mailbox (no flag, move, delete:
  folders are opened `readOnly`). Never send email data to a third party. The
  IMAP library logger stays `false`.
- **The container rootfs is read-only.** Write only under `/data`
  (`DATA_DIR` in development).
- **Scene events fire once per parcel step** (`store` keys), never for the
  emails already present at the first scan, never for emails older than a
  day, never as a consequence of a scene action. Event `data` holds only the
  keys the trigger declares, as primitives.
- **Widgets stay within the budget**: 8 components, 6 tiles, 1 status, 4
  buttons, badges ≤ 16 characters. `validateWidgetContent(content)` must
  return `[]` (see `test/widgets.test.js`).
- **Versions belong to the Release workflow** (Actions → Release). Never edit
  `version` in `package.json` or in the manifest, nor the `docker_image` tag,
  by hand.
- **Changelog.** Every user-visible change adds a line under `## [Unreleased]`
  in `CHANGELOG.md` (`### Added`, `Changed`, `Fixed`, `Removed`, `Security`).
  Never write a version heading.
- **Four languages.** Every user-facing text exists in English, French,
  German and Spanish: manifest texts (tested), runtime texts in `src/i18n.js`
  (tested), and `docs/*.md` kept in sync. Brand names stay as is.
- **New carrier = real subject in a test.** Each carrier rule or generic
  wording comes with a case in `test/classifier.test.js`. Mind the order of
  the generic rules: "could not be delivered" is a problem, "will be
  delivered today" is an announcement.
- **Style.** Prettier formats, ESLint catches mistakes. Comments explain why,
  in English. Tests never touch the network.
