// Shared test fixtures: a configured mailbox and a fake IMAP reader.

import { normalizeConfig } from '../src/config.js';
import { createStore } from '../src/store.js';

export const NOW = new Date('2026-11-14T15:00:00Z');

export const CONFIG = {
  imap_host: 'imap.example.com',
  imap_user: 'me@example.com',
  imap_password: 'secret',
  timezone: 'UTC',
};

export const config = (overrides = {}) => normalizeConfig({ ...CONFIG, ...overrides });

export const email = (from, subject, iso, extra = {}) => ({
  id: `<${from}|${subject}|${iso}>`,
  from,
  subject,
  date: new Date(iso),
  text: '',
  imageCount: 0,
  ...extra,
});

/** A reader serving `mailbox.messages`, editable between scans. */
export function fakeMailbox(messages = []) {
  const mailbox = {
    messages,
    calls: 0,
    error: null,
    async read(_config, { isCandidate }) {
      mailbox.calls += 1;
      if (mailbox.error) {
        throw mailbox.error;
      }
      return mailbox.messages.filter((message) => isCandidate(message.from));
    },
  };
  return mailbox;
}

export const memoryStore = () => createStore(null);
