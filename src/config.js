// -----------------------------------------------------------------------------
// Integration configuration.
//
// Filled in by the user in Gladys, from the `config_schema` of the manifest.
// This module provides the defaults and normalizes the received object, so the
// rest of the code never deals with `undefined`, a string port or a bad list.
// -----------------------------------------------------------------------------

import { CARRIER_KEYS, parseCustomSenders } from './carriers/index.js';
import { normalizeLanguage } from './i18n.js';

// Defaults: they MUST stay consistent with the `default` values of the
// manifest `config_schema` (test/manifest.test.js checks it). Secrets and
// required fields without a default are listed too, as empty strings.
export const DEFAULT_CONFIG = {
  imap_host: '',
  imap_port: 993,
  imap_security: 'tls', // 'tls' (implicit TLS, port 993) | 'starttls' (port 143)
  imap_user: '',
  imap_password: '',
  imap_folder: 'INBOX',
  allow_self_signed: false,
  carriers: CARRIER_KEYS,
  custom_senders: '',
  scan_interval: 5, // minutes
  lookback_days: 10,
  language: 'en',
  timezone: '',
};

const clamp = (value, min, max, fallback) => {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, Math.round(number)));
};

const text = (value, fallback = '') => (typeof value === 'string' ? value.trim() : fallback);

/**
 * Merge the user config with the defaults and force the types.
 * @param {Record<string, unknown>} raw config returned by the SDK
 */
export function normalizeConfig(raw = {}) {
  const carriers = Array.isArray(raw.carriers)
    ? raw.carriers.filter((key) => CARRIER_KEYS.includes(key))
    : DEFAULT_CONFIG.carriers;
  const folders = text(raw.imap_folder, DEFAULT_CONFIG.imap_folder)
    .split(',')
    .map((folder) => folder.trim())
    .filter(Boolean);

  return {
    imap_host: text(raw.imap_host),
    imap_port: clamp(raw.imap_port, 1, 65535, DEFAULT_CONFIG.imap_port),
    imap_security: raw.imap_security === 'starttls' ? 'starttls' : 'tls',
    imap_user: text(raw.imap_user),
    // Never trimmed: a password may legitimately start or end with a space.
    imap_password: typeof raw.imap_password === 'string' ? raw.imap_password : '',
    imap_folder: folders.join(', ') || DEFAULT_CONFIG.imap_folder,
    allow_self_signed: raw.allow_self_signed === true,
    carriers,
    custom_senders: text(raw.custom_senders),
    scan_interval: clamp(raw.scan_interval, 1, 120, DEFAULT_CONFIG.scan_interval),
    lookback_days: clamp(raw.lookback_days, 1, 30, DEFAULT_CONFIG.lookback_days),
    language: normalizeLanguage(raw.language ?? DEFAULT_CONFIG.language),
    timezone: text(raw.timezone),
    // Derived values, not stored by Gladys.
    folders: folders.length > 0 ? folders : [DEFAULT_CONFIG.imap_folder],
    customSenders: parseCustomSenders(raw.custom_senders),
  };
}

/** The mailbox can be scanned only once the three credentials are filled in. */
export function isConfigured(config) {
  return Boolean(config.imap_host && config.imap_user && config.imap_password);
}
