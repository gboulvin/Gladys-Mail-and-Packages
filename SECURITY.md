# Security policy

This integration holds the password of a mailbox: please take security reports
seriously, and send them privately.

## Reporting a vulnerability

Do **not** report a security problem in a public issue, pull request or forum
post.

Report it privately through GitHub instead: open the **Security** tab of this
repository, then **Report a vulnerability**.

No such button? Private reporting is not enabled yet: open an issue that only
asks the maintainers for a private contact, without any detail of the problem,
and send the report there.

Include, when you can:

- the version of the integration and of Gladys;
- what an attacker can do, and the steps to reproduce it;
- the log lines that help — remove passwords, email addresses, tracking
  numbers and email contents first.

The fix ships as a new version of the integration, and the advisory is
published once users can update.

## What the integration does with your data

- The IMAP password is stored by Gladys as a `secret` configuration value: it
  is never sent back to the browser, never logged (the IMAP library's protocol
  log is turned off) and never written to disk by the integration.
- The mailbox is opened read-only (`EXAMINE`, `BODY.PEEK`): the integration
  cannot move, flag or delete an email.
- Only the emails whose sender is an enabled carrier are downloaded, capped
  at 512 KB each, and kept in memory for the duration of a scan.
- `/data/state.json` holds the identifiers of the parcel steps already
  announced to the scenes (carrier, tracking number, timestamp) — no email
  content, no credential.
- TLS certificates are verified unless the user turns on "Accept a
  self-signed certificate"; STARTTLS, when chosen, is mandatory (no
  clear-text fallback).
- The integration makes no other network request: no tracking API, no
  telemetry. The tracking links shown in the widget point to the carriers'
  public pages and are opened by the user's browser only.

## Supported versions

Only the latest release receives security fixes: update the integration from
Gladys before reporting a problem.

## Scope

In scope: the code of this repository and the Docker image it publishes.

Out of scope: Gladys Assistant itself (see its
[security policy](https://github.com/GladysAssistant/Gladys/security/policy)),
the mail providers and the carriers.
