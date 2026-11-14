import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_CONFIG, isConfigured, normalizeConfig } from '../src/config.js';
import { CARRIER_KEYS } from '../src/carriers/index.js';
import { LANGUAGES } from '../src/constants.js';
import { TEXT_ENTRIES, t } from '../src/i18n.js';

test('an empty config gets the defaults and is not configured', () => {
  const config = normalizeConfig();
  assert.equal(config.imap_port, DEFAULT_CONFIG.imap_port);
  assert.deepEqual(config.carriers, CARRIER_KEYS);
  assert.deepEqual(config.folders, ['INBOX']);
  assert.equal(isConfigured(config), false);
});

test('form values are typed and bounded', () => {
  const config = normalizeConfig({
    imap_port: '143',
    imap_security: 'starttls',
    scan_interval: '0',
    lookback_days: 365,
    carriers: ['ups', 'not-a-carrier'],
    imap_folder: ' INBOX ,  Shopping ,',
    language: 'fr-FR',
    imap_password: ' keep spaces ',
  });
  assert.equal(config.imap_port, 143);
  assert.equal(config.imap_security, 'starttls');
  assert.equal(config.scan_interval, 1);
  assert.equal(config.lookback_days, 30);
  assert.deepEqual(config.carriers, ['ups']);
  assert.deepEqual(config.folders, ['INBOX', 'Shopping']);
  assert.equal(config.language, 'fr');
  assert.equal(config.imap_password, ' keep spaces ');
});

test('every runtime text exists in the four languages', () => {
  for (const [key, entry] of Object.entries(TEXT_ENTRIES)) {
    for (const language of LANGUAGES) {
      assert.ok(entry[language], `${key} has no "${language}" text`);
    }
  }
  assert.deepEqual(
    t('status.folder_not_found', { folder: 'X' }).de,
    'Der Ordner „X“ existiert nicht auf dem Mailserver.',
  );
});

test('badges hold 16 characters at most', () => {
  for (const [key, entry] of Object.entries(TEXT_ENTRIES).filter(([k]) => k.startsWith('badge.'))) {
    for (const language of LANGUAGES) {
      assert.ok(entry[language].length <= 16, `${key}.${language}`);
    }
  }
});
