import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createFakeGladys } from '@gladysassistant/integration-sdk/testing';
import { createEngine } from '../src/engine.js';
import { createApp } from '../src/app.js';
import { buildDevices, summaryIds, carrierIds } from '../src/devices.js';
import { createStore } from '../src/store.js';
import { COUNTER } from '../src/constants.js';
import { NOW, CONFIG, config, email, fakeMailbox, memoryStore } from './helpers.js';

const manifest = JSON.parse(
  await readFile(new URL('../gladys-assistant-integration.json', import.meta.url), 'utf8'),
);

const shipped = email(
  'mcinfo@ups.com',
  'UPS Update: Package Scheduled for Delivery Today 1Z999AA10123456784',
  '2026-11-14T07:00:00Z',
);
const delivered = email(
  'mcinfo@ups.com',
  'Your UPS Package was delivered 1Z999AA10123456784',
  '2026-11-14T13:00:00Z',
);

test('the devices pass the host API checks', async () => {
  const gladys = createFakeGladys();
  await gladys.publishDiscoveredDevices(buildDevices(gladys, config()));
  // summary + one device per carrier, `other` only with custom senders
  assert.equal(
    gladys.fake.discoveredDevices.length,
    1 + manifest.config_schema.find((f) => f.key === 'carriers').options.length - 1,
  );
  const names = gladys.fake.discoveredDevices.map((device) => device.name);
  assert.ok(names.includes('Mail and Packages'));
  assert.ok(names.includes('Packages – UPS'));
});

test('device names follow the configured language', () => {
  const gladys = createFakeGladys();
  const [summary, first] = buildDevices(
    gladys,
    config({ language: 'fr', carriers: ['colissimo'] }),
  );
  assert.equal(summary.name, 'Courrier et colis');
  assert.equal(first.name, 'Colis – Colissimo / La Poste');
});

test('a scan publishes the counters of the summary and of each carrier', async () => {
  const gladys = createFakeGladys();
  const mailbox = fakeMailbox([shipped]);
  const engine = createEngine(gladys, { store: memoryStore(), read: mailbox.read, now: () => NOW });
  await engine.scan(config());
  assert.equal(gladys.fake.lastState(summaryIds(gladys).feature(COUNTER.ARRIVING_TODAY)), 1);
  assert.equal(gladys.fake.lastState(carrierIds(gladys, 'ups').feature(COUNTER.IN_TRANSIT)), 1);
  assert.equal(gladys.fake.lastState(carrierIds(gladys, 'fedex').feature(COUNTER.IN_TRANSIT)), 0);
  assert.match(
    gladys.fake.lastState(summaryIds(gladys).feature('last_update')),
    /^UPS – Arriving today – 1Z/,
  );
  assert.equal(gladys.fake.connectionStatus.connected, true);
});

test('the first scan records the mailbox without firing, later emails fire once', async () => {
  const gladys = createFakeGladys();
  const mailbox = fakeMailbox([shipped]);
  const engine = createEngine(gladys, { store: memoryStore(), read: mailbox.read, now: () => NOW });

  await engine.scan(config());
  assert.equal(gladys.fake.sceneEvents.length, 0, 'what was already there is not news');

  mailbox.messages.push(delivered);
  await engine.scan(config());
  await engine.scan(config());
  assert.equal(gladys.fake.sceneEvents.length, 1, 'one event per parcel step, scans repeated');
  const [event] = gladys.fake.sceneEvents;
  assert.equal(event.key, 'package_delivered');
  assert.equal(event.data.carrier, 'ups');
  assert.equal(event.data.tracking, '1Z999AA10123456784');
  assert.match(event.data.tracking_url, /^https:\/\/www\.ups\.com\//);
});

test('scene event data only carries declared keys, as primitives', async () => {
  const gladys = createFakeGladys();
  const mailbox = fakeMailbox([]);
  const engine = createEngine(gladys, { store: memoryStore(), read: mailbox.read, now: () => NOW });
  await engine.scan(config());
  mailbox.messages.push(
    shipped,
    email(
      'USPSInformeddelivery@email.informeddelivery.usps.com',
      'Your Daily Digest',
      '2026-11-14T06:00:00Z',
      { imageCount: 3 },
    ),
  );
  await engine.scan(config());
  assert.deepEqual(gladys.fake.sceneEvents.map((e) => e.key).sort(), [
    'mail_expected',
    'package_out_for_delivery',
  ]);
  for (const { key, data } of gladys.fake.sceneEvents) {
    const trigger = manifest.scene_triggers.find((entry) => entry.key === key);
    assert.ok(trigger, `${key} must be declared`);
    const declared = [...(trigger.fields ?? []), ...(trigger.variables ?? [])].map((f) => f.key);
    for (const [name, value] of Object.entries(data)) {
      assert.ok(declared.includes(name), `${key}: data.${name} is not declared`);
      assert.ok(
        value === null || typeof value !== 'object',
        `${key}: data.${name} must be a primitive`,
      );
    }
  }
});

test('old emails seen for the first time do not fire', async () => {
  const gladys = createFakeGladys();
  const mailbox = fakeMailbox([]);
  const engine = createEngine(gladys, { store: memoryStore(), read: mailbox.read, now: () => NOW });
  await engine.scan(config());
  mailbox.messages.push(
    email('mcinfo@ups.com', 'Your UPS Package was delivered', '2026-11-10T13:00:00Z'),
  );
  await engine.scan(config());
  assert.equal(gladys.fake.sceneEvents.length, 0);
});

test('the fired events survive a restart', async (t) => {
  const dir = await mkdtemp(join(tmpdir(), 'mail-packages-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const path = join(dir, 'state.json');
  const mailbox = fakeMailbox([shipped]);

  const first = createFakeGladys();
  const store = createStore(path);
  await store.load();
  await createEngine(first, { store, read: mailbox.read, now: () => NOW }).scan(config());
  mailbox.messages.push(delivered);
  await createEngine(first, { store, read: mailbox.read, now: () => NOW }).scan(config());
  assert.equal(first.fake.sceneEvents.length, 1);

  const restarted = createFakeGladys();
  const reloaded = createStore(path);
  await reloaded.load();
  await createEngine(restarted, { store: reloaded, read: mailbox.read, now: () => NOW }).scan(
    config(),
  );
  assert.equal(restarted.fake.sceneEvents.length, 0, 'nothing fires twice after a restart');
});

test('a failed scan reports a readable connection status and keeps the last snapshot', async () => {
  const gladys = createFakeGladys();
  const mailbox = fakeMailbox([shipped]);
  const engine = createEngine(gladys, { store: memoryStore(), read: mailbox.read, now: () => NOW });
  await engine.scan(config());
  mailbox.error = Object.assign(new Error('Invalid credentials'), { authenticationFailed: true });
  await assert.rejects(engine.scan(config()));
  assert.equal(gladys.fake.connectionStatus.connected, false);
  assert.match(gladys.fake.connectionStatus.message.fr, /mot de passe/);
  assert.equal(engine.snapshot.totals[COUNTER.ARRIVING_TODAY], 1);
  assert.equal(engine.lastScan.ok, false);
});

test('an unconfigured mailbox is reported, not scanned', async () => {
  const gladys = createFakeGladys();
  const mailbox = fakeMailbox([shipped]);
  const engine = createEngine(gladys, { store: memoryStore(), read: mailbox.read, now: () => NOW });
  await engine.scan(config({ imap_password: '' }));
  assert.equal(mailbox.calls, 0);
  assert.equal(gladys.fake.connectionStatus.connected, false);
});

test('concurrent scans share one mailbox read', async () => {
  const gladys = createFakeGladys();
  const mailbox = fakeMailbox([shipped]);
  const engine = createEngine(gladys, { store: memoryStore(), read: mailbox.read, now: () => NOW });
  await Promise.all([engine.scan(config()), engine.scan(config())]);
  assert.equal(mailbox.calls, 1);
});

test('the app publishes devices and scans on connection, then answers Gladys', async (t) => {
  const mailbox = fakeMailbox([shipped]);
  const gladys = createFakeGladys({ config: CONFIG });
  const app = createApp(gladys, {
    store: memoryStore(),
    read: mailbox.read,
    test: async () => ({ folders: 1, messages: 42 }),
    now: () => NOW,
  });
  t.after(() => app.stop());
  await gladys.connect();

  assert.ok(gladys.fake.discoveredDevices.length > 1);
  assert.equal(mailbox.calls, 1);
  assert.ok(gladys.fake.widgetRefreshes.length > 0, 'widgets are nudged after a scan');

  const test = await gladys.fake.action('test_connection', {});
  assert.equal(test.success, true);
  assert.match(test.data.message.en, /42 message/);

  const scan = await gladys.fake.action('scan_now', {});
  assert.match(scan.data.message.fr, /1 arrive\(nt\) aujourd'hui/);

  const counts = await gladys.fake.sceneAction('get_package_counts', { carrier: 'ups' });
  assert.equal(counts.data.outputs.arriving_today, 1);
  assert.equal(counts.data.outputs.expected_today, true);
});
