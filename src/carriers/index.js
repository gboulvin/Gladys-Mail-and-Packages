// -----------------------------------------------------------------------------
// Carrier registry: lookups over the definitions.
// -----------------------------------------------------------------------------

import { CARRIER_DEFINITIONS, OTHER_CARRIER } from './definitions.js';

// Every carrier a device / filter / option exists for, `other` last.
export const CARRIERS = [...CARRIER_DEFINITIONS, OTHER_CARRIER];

export const CARRIER_KEYS = CARRIERS.map((carrier) => carrier.key);

const BY_KEY = new Map(CARRIERS.map((carrier) => [carrier.key, carrier]));

export function getCarrier(key) {
  return BY_KEY.get(key);
}

export function carrierName(key) {
  return BY_KEY.get(key)?.name ?? key;
}

/**
 * Parse the `custom_senders` config: addresses (`shop@example.com`) or
 * domains (`example.com`), separated by commas, semicolons or spaces.
 * @param {string} raw
 * @returns {string[]} lowercased entries
 */
export function parseCustomSenders(raw) {
  return String(raw ?? '')
    .toLowerCase()
    .split(/[\s,;]+/)
    .map((entry) => entry.replace(/^@/, '').trim())
    .filter((entry) => /^[a-z0-9._%+-]+(@[a-z0-9.-]+)?$/.test(entry) && entry.includes('.'));
}

function matchesCustomSender(address, entries) {
  return entries.some((entry) =>
    entry.includes('@')
      ? address === entry
      : address.endsWith(`@${entry}`) || address.endsWith(`.${entry}`),
  );
}

/**
 * Find the carrier a sender address belongs to, among the enabled ones.
 * The user's own senders win: they are an explicit choice.
 * @param {string} address sender address
 * @param {{ carriers: string[], customSenders: string[] }} options
 * @returns {object|undefined} the carrier definition
 */
export function findCarrierBySender(address, { carriers, customSenders = [] }) {
  const from = String(address ?? '').toLowerCase();
  if (!from.includes('@')) {
    return undefined;
  }
  if (carriers.includes(OTHER_CARRIER.key) && matchesCustomSender(from, customSenders)) {
    return OTHER_CARRIER;
  }
  return CARRIER_DEFINITIONS.find(
    (carrier) =>
      carriers.includes(carrier.key) && carrier.senders.some((pattern) => pattern.test(from)),
  );
}

/**
 * Public tracking page of a parcel, when the carrier has one.
 * @returns {string|null} an https URL
 */
export function trackingUrl(carrierKey, tracking) {
  const template = BY_KEY.get(carrierKey)?.trackingUrl;
  if (!template || !tracking) {
    return null;
  }
  return template.replace('{tracking}', encodeURIComponent(tracking));
}
