// -----------------------------------------------------------------------------
// Scan engine: mailbox -> snapshot -> device states + scene events.
//
// One scan at a time (a manual scan during a scheduled one waits for it and
// shares its result). The snapshot of the last successful scan is kept in
// memory for the widgets and the scene actions.
// -----------------------------------------------------------------------------

import { createLogger } from '@gladysassistant/integration-sdk';
import { classifyMessage } from './classifier.js';
import { findCarrierBySender, carrierName, trackingUrl } from './carriers/index.js';
import { isConfigured } from './config.js';
import { buildStates } from './devices.js';
import { describeImapError, readMessages } from './imap.js';
import { MAIL_TRIGGER, TRIGGER_BY_STATUS } from './constants.js';
import { buildSnapshot, emptySnapshot } from './tracker.js';
import { t } from './i18n.js';

const logger = createLogger({ name: 'engine' });

const DAY_MS = 24 * 60 * 60 * 1000;
// A stable count is re-sent every 30 minutes, so it stays recently dated.
const STATE_HEARTBEAT_MS = 30 * 60 * 1000;
// An email older than this is history, not news: no scene event for it, even
// when it is seen for the first time (a folder added to the configuration).
const EVENT_MAX_AGE_MS = DAY_MS;

/** Scene event data of a parcel step: only the keys the triggers declare. */
export function packageEventData(pkg) {
  return {
    carrier: pkg.carrier,
    carrier_name: carrierName(pkg.carrier),
    tracking: pkg.tracking ?? '',
    tracking_url: trackingUrl(pkg.carrier, pkg.tracking) ?? '',
    pickup_code: pkg.pickupCode ?? '',
    subject: pkg.subject.slice(0, 300),
  };
}

/**
 * Connection status shown in the Configuration screen, from a scan error.
 * @returns {object} multi-language message
 */
export function statusMessage(config, error) {
  if (!isConfigured(config)) {
    return t('status.not_configured');
  }
  const { code, reason } = describeImapError(error);
  if (code === 'auth') {
    return t('status.auth_failed');
  }
  if (code === 'folder') {
    return t('status.folder_not_found', { folder: reason });
  }
  return t('status.unreachable', { reason });
}

/**
 * @param {object} gladys SDK client
 * @param {{ store: object, read?: Function, now?: () => Date, onScanned?: Function }} deps
 */
export function createEngine(gladys, { store, read = readMessages, now = () => new Date() }) {
  let snapshot = emptySnapshot(now());
  // { at: Date|null, ok: boolean, error: object|null }
  let lastScan = { at: null, ok: false, error: null };
  let running = null;

  async function fireNewEvents(config, events, current) {
    // First scan ever: what is already in the mailbox is the starting point,
    // not news. Record it without firing a burst of triggers.
    const fire = store.initialized;
    for (const event of events) {
      if (store.has(event.key)) {
        continue;
      }
      store.add(event.key, event.date.getTime());
      if (!fire || current - event.date.getTime() > EVENT_MAX_AGE_MS) {
        continue;
      }
      try {
        if (event.kind === 'mail') {
          await gladys.publishSceneEvent(MAIL_TRIGGER, { count: event.count });
        } else {
          await gladys.publishSceneEvent(
            TRIGGER_BY_STATUS[event.status],
            packageEventData(event.package),
          );
        }
      } catch (err) {
        // Not retried: a late "delivered" trigger is worse than none.
        logger.error(`Scene event ${event.key} failed: ${err.message}`);
      }
    }
    store.prune(current - (config.lookback_days + 1) * DAY_MS);
    await store.save();
  }

  async function runScan(config) {
    const scanAt = now();
    if (!isConfigured(config)) {
      lastScan = { at: lastScan.at, ok: false, error: { code: 'not_configured' } };
      await gladys.setConnectionStatus(false, statusMessage(config)).catch(() => {});
      return snapshot;
    }
    try {
      const options = { carriers: config.carriers, customSenders: config.customSenders };
      const messages = await read(config, {
        now: scanAt,
        isCandidate: (from) => Boolean(findCarrierBySender(from, options)),
      });
      const events = messages.map((message) => classifyMessage(message, options)).filter(Boolean);
      const next = buildSnapshot(events, { now: scanAt, timezone: config.timezone });
      logger.info(
        `Scan: ${messages.length} carrier email(s), ${next.packages.length} active package(s)`,
      );

      await gladys.publishChangedStates(buildStates(gladys, config, next), {
        heartbeat: STATE_HEARTBEAT_MS,
      });
      await fireNewEvents(config, next.events, scanAt.getTime());

      snapshot = next;
      lastScan = { at: scanAt, ok: true, error: null };
      await gladys.setConnectionStatus(true).catch(() => {});
    } catch (err) {
      // The message only: an IMAP error object can carry the login command.
      logger.error(`Scan failed: ${describeImapError(err).reason}`);
      lastScan = { at: scanAt, ok: false, error: err };
      await gladys.setConnectionStatus(false, statusMessage(config, err)).catch(() => {});
      throw err;
    }
    return snapshot;
  }

  return {
    /** Scan now; a scan already running is joined, not duplicated. */
    scan(config) {
      if (!running) {
        running = runScan(config).finally(() => {
          running = null;
        });
      }
      return running;
    },
    get snapshot() {
      return snapshot;
    },
    get lastScan() {
      return lastScan;
    },
  };
}
