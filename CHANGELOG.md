# Changelog

All notable changes to this integration are documented in this file. The format
follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project
uses [semantic versioning](https://semver.org/).

Describe each change under `## [Unreleased]` as you make it. The Release
workflow moves that section under the version it ships, and the section becomes
the notes of the version's GitHub Release.

## [Unreleased]

## [1.0.1] - 2026-11-14

### Added

- First version of Mail and Packages: packages and mail detected in a mailbox
  read over IMAP, read-only (TLS or STARTTLS, several folders, self-signed
  certificates on demand).
- 36 carriers: Amazon, UPS, FedEx, USPS (with Informed Delivery letters), DHL,
  DPD, GLS, TNT, Colissimo / La Poste, Chronopost, Mondial Relay, Relais Colis,
  Colis Privé, bpost, PostNL, Swiss Post, Hermes, Österreichische Post, Royal
  Mail, Evri, Correos, Correos Express, SEUR, MRW, BRT, Poste Italiane, InPost,
  Poczta Polska, PostNord, Canada Post, Purolator, Intelcom, OnTrac, Australia
  Post, AliExpress / Cainiao, Vinted — plus custom senders.
- Multilingual detection of the parcel steps (en, fr, de, es, it, nl, pl):
  shipped, out for delivery, ready for pickup (with the pickup code),
  delivered, delivery problem.
- A summary device and one device per carrier, with in transit, arriving
  today, delivered today, to pick up and delivery problem counters.
- Six scene triggers (one per parcel step, plus letters expected today), fired
  once per parcel step, restarts included.
- Two scene actions, `scan_mailbox` and `get_package_counts`, returning the
  counters and a ready-to-send summary sentence.
- Two dashboard widgets: the packages of the day and the package tracking
  list, with tracking links.
- "Test the connection" and "Scan the mailbox now" buttons.
- English, French, German and Spanish texts and documentation.

[Unreleased]: https://github.com/gboulvin/Gladys-Mail-and-Packages/compare/v1.0.1...HEAD
[1.0.1]: https://github.com/gboulvin/Gladys-Mail-and-Packages/releases/tag/v1.0.1
