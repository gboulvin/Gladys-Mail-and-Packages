// -----------------------------------------------------------------------------
// Email classifier: one notification email -> one parcel event.
//
// Pure functions, no network: the unit tests feed them plain objects. The
// input is the light message produced by src/imap.js:
//   { id, from, subject, date: Date, text, imageCount }
// -----------------------------------------------------------------------------

import { findCarrierBySender } from './carriers/index.js';
import { GENERIC_PICKUP_CODE, GENERIC_RULES } from './carriers/generic.js';

// Only the top of the body is searched: the footer of a shipping email is
// legal text and cross-selling, a good source of false tracking numbers.
const BODY_SEARCH_LIMIT = 6000;

function matchRule(rule, subject, body) {
  if (!rule.subject && !rule.body) {
    return false;
  }
  if (rule.subject && !rule.subject.test(subject)) {
    return false;
  }
  if (rule.body && !rule.body.test(body)) {
    return false;
  }
  return true;
}

function findStatus(carrier, subject, body) {
  const own = (carrier.rules ?? []).find((rule) => matchRule(rule, subject, body));
  if (own) {
    return own.status;
  }
  // The generic rules only read the subject: a body always contains words
  // like "delivered" ("once delivered, ...") whatever the step.
  return GENERIC_RULES.find((rule) => rule.subject.test(subject))?.status;
}

function firstMatch(patterns, ...texts) {
  for (const text of texts) {
    for (const pattern of patterns ?? []) {
      const match = pattern.exec(text);
      if (match) {
        // A capture group isolates the value from its context.
        return (match[1] ?? match[0]).replace(/[\s.]/g, '');
      }
    }
  }
  return null;
}

/**
 * Classify one email.
 * @param {{ id: string, from: string, subject: string, date: Date, text?: string, imageCount?: number }} message
 * @param {{ carriers: string[], customSenders?: string[] }} options enabled carriers
 * @returns {null
 *   | { kind: 'mail', carrier: string, count: number, date: Date, messageId: string }
 *   | { kind: 'package', carrier: string, status: string, tracking: string|null,
 *       pickupCode: string|null, subject: string, date: Date, messageId: string }}
 */
export function classifyMessage(message, options) {
  const carrier = findCarrierBySender(message.from, options);
  if (!carrier) {
    return null;
  }
  const subject = String(message.subject ?? '')
    .replace(/\s+/g, ' ')
    .trim();
  const body = String(message.text ?? '').slice(0, BODY_SEARCH_LIMIT);

  if (carrier.mail && matchRule(carrier.mail, subject, body)) {
    return {
      kind: 'mail',
      carrier: carrier.key,
      count: Math.max(0, Number(message.imageCount) || 0),
      date: message.date,
      messageId: message.id,
    };
  }

  const status = findStatus(carrier, subject, body);
  if (!status) {
    return null;
  }
  return {
    kind: 'package',
    carrier: carrier.key,
    status,
    tracking: firstMatch(carrier.tracking, subject, body),
    pickupCode: firstMatch([...(carrier.pickupCode ?? []), ...GENERIC_PICKUP_CODE], subject, body),
    subject,
    date: message.date,
    messageId: message.id,
  };
}
