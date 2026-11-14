// -----------------------------------------------------------------------------
// IMAP driver: the only module that talks to the mail server.
//
// Read-only by design: the folder is opened read-only, nothing is moved,
// flagged or deleted, and a message keeps its "unread" state (BODY.PEEK).
//
// Two passes keep a busy mailbox cheap:
//   1. the ENVELOPES of the window (sender, subject, date) — a few hundred
//      bytes per email;
//   2. the CONTENT of the emails a known carrier sent, only (capped size).
// -----------------------------------------------------------------------------

import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import { createLogger } from '@gladysassistant/integration-sdk';

const logger = createLogger({ name: 'imap' });

// A shipping notification is a few dozen KB; the cap bounds the memory of a
// newsletter that happens to come from a carrier domain.
const MAX_SOURCE_BYTES = 512 * 1024;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Options of the IMAP client, built from the normalized config. */
export function imapOptions(config) {
  const implicitTls = config.imap_security !== 'starttls';
  return {
    host: config.imap_host,
    port: config.imap_port,
    secure: implicitTls,
    // STARTTLS is mandatory when chosen: never fall back to clear text.
    ...(implicitTls ? {} : { doSTARTTLS: true }),
    auth: { user: config.imap_user, pass: config.imap_password },
    tls: { rejectUnauthorized: !config.allow_self_signed },
    // The library logs every protocol line, credentials included: silence it.
    logger: false,
    connectionTimeout: 20_000,
    greetingTimeout: 15_000,
    socketTimeout: 60_000,
    disableAutoIdle: true,
  };
}

/**
 * Turn an IMAP error into a reason the user can act on.
 * @returns {{ code: 'auth' | 'folder' | 'network', reason: string }}
 */
export function describeImapError(err) {
  if (err?.authenticationFailed) {
    return { code: 'auth', reason: 'authentication failed' };
  }
  if (err?.mailboxMissing || err?.folderNotFound) {
    return { code: 'folder', reason: err.folder ?? 'unknown folder' };
  }
  const reason = [err?.code, err?.responseText || err?.message].filter(Boolean).join(' ');
  return { code: 'network', reason: reason.slice(0, 160) || 'unknown error' };
}

// Count the images of a message from its BODYSTRUCTURE: one scanned letter
// per image in a USPS Informed Delivery digest (logos excluded by size).
export function countImages(node) {
  if (!node) {
    return 0;
  }
  const own =
    typeof node.type === 'string' &&
    node.type.toLowerCase().startsWith('image/') &&
    (node.size ?? Infinity) > 5_000
      ? 1
      : 0;
  return own + (node.childNodes ?? []).reduce((sum, child) => sum + countImages(child), 0);
}

const senderOf = (envelope) =>
  String(envelope?.from?.[0]?.address ?? envelope?.sender?.[0]?.address ?? '').toLowerCase();

async function withClient(config, createClient, work) {
  const client = createClient(imapOptions(config));
  // An idle socket error after the work is done must not crash the process.
  client.on?.('error', (err) => logger.debug(`IMAP socket error: ${err.message}`));
  await client.connect();
  try {
    return await work(client);
  } finally {
    await client.logout().catch(() => client.close?.());
  }
}

async function openFolder(client, folder) {
  try {
    return await client.getMailboxLock(folder, { readOnly: true });
  } catch (err) {
    if (err.mailboxMissing || /nonexistent|not exist|unknown mailbox/i.test(err.responseText)) {
      err.folderNotFound = true;
      err.folder = folder;
    }
    throw err;
  }
}

/**
 * Read the carrier emails of the look-back window.
 * @param {object} config normalized config
 * @param {{ isCandidate: (from: string) => boolean, now?: Date, createClient?: Function }} options
 * @returns {Promise<Array<{ id, from, subject, date, text, imageCount }>>}
 */
export async function readMessages(config, { isCandidate, now = new Date(), createClient }) {
  const since = new Date(now.getTime() - config.lookback_days * DAY_MS);
  return withClient(
    config,
    createClient ?? ((options) => new ImapFlow(options)),
    async (client) => {
      const messages = new Map();
      for (const folder of config.folders) {
        const lock = await openFolder(client, folder);
        try {
          const uids = (await client.search({ since }, { uid: true })) || [];
          if (uids.length === 0) {
            continue;
          }
          const envelopes = await client.fetchAll(
            uids,
            { uid: true, envelope: true, bodyStructure: true, internalDate: true },
            { uid: true },
          );
          const candidates = envelopes.filter((msg) => isCandidate(senderOf(msg.envelope)));
          logger.debug(`${folder}: ${envelopes.length} emails, ${candidates.length} from carriers`);

          for (const msg of candidates) {
            // The Message-ID dedupes an email copied in two scanned folders.
            const id = msg.envelope?.messageId || `${folder}:${msg.uid}`;
            if (messages.has(id)) {
              continue;
            }
            const full = await client.fetchOne(
              String(msg.uid),
              { source: { maxLength: MAX_SOURCE_BYTES } },
              { uid: true },
            );
            let text = '';
            try {
              const parsed = await simpleParser(full?.source ?? Buffer.alloc(0), {
                skipImageLinks: true,
                skipTextToHtml: true,
              });
              // HTML-only emails: mailparser derives `text` from the HTML part.
              text = parsed.text ?? '';
            } catch (err) {
              logger.debug(`Cannot parse email ${msg.uid}: ${err.message}`);
            }
            messages.set(id, {
              id,
              from: senderOf(msg.envelope),
              subject: msg.envelope?.subject ?? '',
              date: new Date(msg.envelope?.date ?? msg.internalDate ?? now),
              text,
              imageCount: countImages(msg.bodyStructure),
            });
          }
        } finally {
          lock.release();
        }
      }
      return [...messages.values()];
    },
  );
}

/**
 * Connection test of the Configuration screen: log in, open every folder,
 * count the emails of the window. Reads no content.
 */
export async function testConnection(config, { now = new Date(), createClient } = {}) {
  const since = new Date(now.getTime() - config.lookback_days * DAY_MS);
  return withClient(
    config,
    createClient ?? ((options) => new ImapFlow(options)),
    async (client) => {
      let total = 0;
      for (const folder of config.folders) {
        const lock = await openFolder(client, folder);
        try {
          total += ((await client.search({ since }, { uid: true })) || []).length;
        } finally {
          lock.release();
        }
      }
      return { folders: config.folders.length, messages: total };
    },
  );
}
