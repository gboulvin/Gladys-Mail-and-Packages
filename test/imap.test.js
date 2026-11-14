// The IMAP driver against an in-memory client: no network in the tests.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  countImages,
  describeImapError,
  imapOptions,
  readMessages,
  testConnection,
} from '../src/imap.js';
import { config, NOW } from './helpers.js';

const raw = (from, subject, body) =>
  Buffer.from(
    [
      `From: Carrier <${from}>`,
      `Subject: ${subject}`,
      'Content-Type: text/html; charset=utf-8',
      '',
      body,
    ].join('\r\n'),
  );

function fakeClient(folders) {
  const calls = { connect: 0, logout: 0, fetchOne: [], locks: [] };
  let current = null;
  const client = {
    calls,
    on() {},
    async connect() {
      calls.connect += 1;
    },
    async logout() {
      calls.logout += 1;
    },
    async getMailboxLock(path, options) {
      calls.locks.push({ path, options });
      if (!folders[path]) {
        throw Object.assign(new Error('Mailbox does not exist'), { mailboxMissing: true });
      }
      current = folders[path];
      return { release() {} };
    },
    async search() {
      return current.map((message) => message.uid);
    },
    async fetchAll(uids) {
      return current.filter((message) => uids.includes(message.uid));
    },
    async fetchOne(uid) {
      calls.fetchOne.push(uid);
      return { source: current.find((message) => String(message.uid) === uid).source };
    },
  };
  return client;
}

const message = (uid, from, subject, body = '<p>hello</p>', extra = {}) => ({
  uid,
  envelope: { from: [{ address: from }], subject, date: NOW, messageId: `<${uid}@test>` },
  bodyStructure: { type: 'text/html' },
  source: raw(from, subject, body),
  ...extra,
});

test('only carrier emails are downloaded, the HTML body is read as text', async () => {
  const client = fakeClient({
    INBOX: [
      message(1, 'friend@example.com', 'Lunch?'),
      message(
        2,
        'mcinfo@ups.com',
        'Your UPS Package was delivered',
        '<p>Tracking <b>1Z999AA10123456784</b></p>',
      ),
    ],
  });
  const messages = await readMessages(config(), {
    isCandidate: (from) => from.endsWith('@ups.com'),
    now: NOW,
    createClient: () => client,
  });
  assert.deepEqual(client.calls.fetchOne, ['2']);
  assert.equal(messages.length, 1);
  assert.match(messages[0].text, /1Z999AA10123456784/);
  assert.equal(client.calls.logout, 1);
  assert.equal(client.calls.locks[0].options.readOnly, true, 'the folder is opened read-only');
});

test('an email copied in two scanned folders is read once', async () => {
  const twin = message(5, 'mcinfo@ups.com', 'Your UPS Package was delivered');
  const client = fakeClient({ INBOX: [twin], Shopping: [twin] });
  const messages = await readMessages(config({ imap_folder: 'INBOX, Shopping' }), {
    isCandidate: () => true,
    now: NOW,
    createClient: () => client,
  });
  assert.equal(messages.length, 1);
});

test('a missing folder is reported as such, and the session is closed', async () => {
  const client = fakeClient({ INBOX: [] });
  const error = await readMessages(config({ imap_folder: 'Parcels' }), {
    isCandidate: () => true,
    now: NOW,
    createClient: () => client,
  }).catch((err) => err);
  assert.deepEqual(describeImapError(error), { code: 'folder', reason: 'Parcels' });
  assert.equal(client.calls.logout, 1);
});

test('testConnection counts the emails of the window without downloading any', async () => {
  const client = fakeClient({ INBOX: [message(1, 'a@b.c', 'x'), message(2, 'a@b.c', 'y')] });
  assert.deepEqual(await testConnection(config(), { now: NOW, createClient: () => client }), {
    folders: 1,
    messages: 2,
  });
  assert.equal(client.calls.fetchOne.length, 0);
});

test('client options: TLS by default, mandatory STARTTLS, silent logger', () => {
  const tls = imapOptions(config());
  assert.equal(tls.secure, true);
  assert.equal(tls.logger, false, 'the protocol log would contain the password');
  assert.equal(tls.tls.rejectUnauthorized, true);
  const starttls = imapOptions(
    config({ imap_security: 'starttls', imap_port: 143, allow_self_signed: true }),
  );
  assert.equal(starttls.secure, false);
  assert.equal(starttls.doSTARTTLS, true);
  assert.equal(starttls.tls.rejectUnauthorized, false);
});

test('errors are described without their payload', () => {
  assert.equal(describeImapError({ authenticationFailed: true }).code, 'auth');
  assert.equal(
    describeImapError(Object.assign(new Error('connect ECONNREFUSED'), { code: 'ECONNREFUSED' }))
      .code,
    'network',
  );
});

test('countImages counts the scanned letters, not the logos', () => {
  const structure = {
    type: 'multipart/related',
    childNodes: [
      { type: 'text/html' },
      { type: 'image/png', size: 1200 },
      { type: 'image/jpeg', size: 40_000 },
      { type: 'image/jpeg', size: 38_000 },
    ],
  };
  assert.equal(countImages(structure), 2);
});
