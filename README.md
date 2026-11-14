# Mail and Packages for Gladys Assistant

**Packages and mail detected in your mailbox (UPS, FedEx, USPS, Amazon…).**

An external integration for [Gladys Assistant](https://gladysassistant.com)
that reads the shipping notifications of a mailbox over IMAP (read-only) and
turns them into devices, scene triggers, scene actions and dashboard widgets.
Inspired by the Home Assistant
[Mail and Packages](https://github.com/moralmunky/Home-Assistant-Mail-And-Packages)
integration, built from the official
[JavaScript template](https://github.com/GladysAssistant/integration-template-js).

User documentation: [English](docs/en.md) · [Français](docs/fr.md) ·
[Deutsch](docs/de.md) · [Español](docs/es.md).

## Features

| Surface              | What                                                                                                                                                     |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Devices              | A **summary** device (in transit, arriving today, delivered today, to pick up, delivery problems, letters expected today, last update) + one per carrier |
| Scene triggers       | `package_shipped`, `package_out_for_delivery`, `package_ready_for_pickup`, `package_delivered`, `package_exception`, `mail_expected`                     |
| Scene actions        | `scan_mailbox` (scan now) and `get_package_counts` (instant), with counters, `expected_today` and a ready-to-send `summary` sentence                     |
| Dashboard widgets    | `packages_overview` (tiles + mailbox status + "Scan now") and `packages_list` (tracking numbers, pickup codes, tracking links)                           |
| Configuration screen | "Test the connection" and "Scan the mailbox now" buttons, readable connection status                                                                     |
| Languages            | English, French, German and Spanish everywhere (manifest, messages, widgets, docs)                                                                       |

### Carriers

36 carriers, recognized by the sender of their emails, the step read from the
subject with carrier-specific rules plus generic rules in seven languages (en,
fr, de, es, it, nl, pl):

- **From Mail and Packages (Home Assistant)**: Amazon (all countries, Hub
  Locker pickup codes), UPS, FedEx, USPS (+ Informed Delivery letters), DHL,
  DPD, GLS, Canada Post, Hermes/Evri, Royal Mail, Australia Post, Poczta
  Polska, InPost.
- **Added here**: Colissimo / La Poste, Chronopost, Mondial Relay, Relais
  Colis, Colis Privé, bpost, PostNL, Swiss Post, Hermes (DE), Österreichische
  Post, TNT, Correos, Correos Express, SEUR, MRW, BRT, Poste Italiane,
  PostNord, Purolator, Intelcom, OnTrac/LaserShip, AliExpress/Cainiao, Vinted.
- **Other senders**: any shop or carrier, by address or domain, read with the
  generic rules.

### Beyond the Home Assistant integration

- A **parcel lifecycle** rather than per-subject counters: emails are linked
  by tracking number (or paired in order when there is none), a parcel never
  goes backwards, and "in transit" no longer counts parcels already delivered.
- **Pickup / locker** status with the pickup code, and a **delivery
  problem** status (delays, missed attempts, returns).
- **Scene events fired once per parcel step**, restarts included, and never
  for the emails already in the mailbox at install time.
- Tracking links to the carriers' public pages, in the list widget and the
  scene variables.
- Several folders, custom senders, configurable look-back window and time
  zone.

Not ported: the camera of USPS / Amazon images (an animated GIF of the scanned
letters). The letters are counted; the images are not republished.

## Development

```bash
npm install
npm test                 # node --test, against the SDK's fake Gladys — no network
npm run lint
npm run format:check
npm run manifest         # regenerate gladys-assistant-integration.json
```

Run it against a Gladys instance:

```bash
GLADYS_HOST_API_URL="http://localhost:1443" \
GLADYS_INTEGRATION_TOKEN="<token>" \
GLADYS_INTEGRATION_SELECTOR="mail-and-packages" \
DATA_DIR=./data LOG_LEVEL=debug \
npm start
```

### Project structure

```
index.js                     SDK bootstrap only
src/app.js                   handler wiring (testable with the fake Gladys)
src/imap.js                  IMAP driver (read-only, two passes: envelopes, then carrier emails)
src/carriers/definitions.js  the carriers: senders, status rules, tracking patterns, tracking URLs
src/carriers/generic.js      multilingual status rules
src/classifier.js            one email -> one parcel event
src/tracker.js               events -> parcels, counters (pure)
src/engine.js                scan -> device states + scene events (fired once)
src/devices.js               devices and their states
src/scenes.js                scene actions
src/widgets.js               dashboard widgets
src/actions.js               Configuration screen buttons
src/i18n.js                  runtime texts (en, fr, de, es)
src/store.js                 /data/state.json: the scene events already fired
scripts/manifest-source.mjs  source of the manifest (carriers × 4 languages)
docs/                        user documentation (en, fr mandatory; de, es optional)
```

### Adding a carrier

1. Add an entry to `src/carriers/definitions.js` (`key` is forever).
2. Add a case to `test/classifier.test.js` with a real subject.
3. `npm run manifest`, then a line under `## [Unreleased]` in `CHANGELOG.md`.

## Release

From the GitHub UI: describe the changes under `## [Unreleased]` in
[`CHANGELOG.md`](CHANGELOG.md), then **Actions → Release → Run workflow**. The
workflow bumps the version (package and manifest), tags, builds the
`linux/amd64` + `linux/arm64` image to `ghcr.io/gboulvin/gladys-mail-and-packages`
and publishes the GitHub Release. Add the topic `gladys-assistant-integration`
to the repository so that the Gladys store indexes it, and check the
integration with the store validator:

```bash
npx github:GladysAssistant/integration-store .
```

## License

Apache-2.0. The carrier sender addresses and subjects marked as such come from
[Home Assistant Mail and Packages](https://github.com/moralmunky/Home-Assistant-Mail-And-Packages)
(MIT).
