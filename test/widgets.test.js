import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createFakeGladys } from '@gladysassistant/integration-sdk/testing';
import { validateWidgetContent } from '@gladysassistant/integration-sdk';
import { createEngine } from '../src/engine.js';
import { WIDGETS, listContent, overviewContent } from '../src/widgets.js';
import { NOW, config, email, fakeMailbox, memoryStore } from './helpers.js';

const manifest = JSON.parse(
  await readFile(new URL('../gladys-assistant-integration.json', import.meta.url), 'utf8'),
);

async function scannedEngine(messages, cfg = config()) {
  const gladys = createFakeGladys();
  const engine = createEngine(gladys, {
    store: memoryStore(),
    read: fakeMailbox(messages).read,
    now: () => NOW,
  });
  await engine.scan(cfg);
  return engine;
}

const MESSAGES = [
  email(
    'mcinfo@ups.com',
    'UPS Update: Package Scheduled for Delivery Today 1Z999AA10123456784',
    '2026-11-14T07:00:00Z',
  ),
  email(
    'powiadomienia@inpost.pl',
    'InPost - Paczka umieszczona w Paczkomacie',
    '2026-11-14T08:00:00Z',
    {
      text: 'Numer 620000000000000000000001 Kod odbioru: 123456',
    },
  ),
  email('noreply@seur.com', 'No hemos podido entregar tu envío', '2026-11-14T09:00:00Z'),
  email(
    'USPSInformeddelivery@email.informeddelivery.usps.com',
    'Your Daily Digest',
    '2026-11-14T06:00:00Z',
    { imageCount: 2 },
  ),
];

test('the overview content is rendered exactly as sent', async () => {
  const engine = await scannedEngine(MESSAGES);
  for (const carrier of ['all', 'ups', 'usps', 'vinted']) {
    const content = overviewContent({ config: config(), engine, settings: { carrier } });
    assert.deepEqual(validateWidgetContent(content), [], `carrier ${carrier}`);
  }
});

test('the overview counts what the mailbox says', async () => {
  const engine = await scannedEngine(MESSAGES);
  const content = overviewContent({ config: config(), engine, settings: {} });
  const tiles = Object.fromEntries(
    content.components.filter((c) => c.type === 'value').map((c) => [c.label.en, c.value]),
  );
  assert.equal(tiles['Arriving today'], 1);
  assert.equal(tiles['To pick up'], 1);
  assert.equal(tiles['Delivery problems'], 1);
  assert.equal(tiles['Mail today'], 2);
});

test('the parcel list is rendered exactly as sent, with codes and tracking links', async () => {
  const engine = await scannedEngine(MESSAGES);
  const content = listContent({ config: config(), engine, settings: {} });
  assert.deepEqual(validateWidgetContent(content), []);
  const cards = content.components.find((c) => c.type === 'card-list').items;
  assert.equal(cards.length, 3);
  const inpost = cards.find((card) => card.title === 'InPost');
  assert.match(inpost.description.fr, /Code de retrait : 123456/);
  assert.match(inpost.links[0].url, /^https:\/\/inpost\.pl\//);
});

test('an empty mailbox renders an empty state', async () => {
  const engine = await scannedEngine([]);
  const content = listContent({ config: config(), engine, settings: { carrier: 'all' } });
  assert.deepEqual(validateWidgetContent(content), []);
  assert.equal(content.components[0].type, 'text');
});

test('an unconfigured mailbox still renders', async () => {
  const engine = await scannedEngine([], config({ imap_host: '' }));
  const content = overviewContent({ config: config({ imap_host: '' }), engine, settings: {} });
  assert.deepEqual(validateWidgetContent(content), []);
});

test('every widget is declared, and every button action is handled', async () => {
  const engine = await scannedEngine(MESSAGES);
  const declared = manifest.widgets.map((widget) => widget.key);
  assert.deepEqual(Object.keys(WIDGETS).sort(), [...declared].sort());
  for (const [key, widget] of Object.entries(WIDGETS)) {
    const content = await widget.get(null, { config: config(), engine, settings: {} });
    for (const button of content.components.filter((c) => c.type === 'button' && c.action)) {
      const toast = await widget.action(null, {
        actionKey: button.action.key,
        config: config(),
        engine,
      });
      assert.ok(toast.en, `${key}.${button.action.key} answers a toast`);
    }
    await assert.rejects(widget.action(null, { actionKey: 'nope', config: config(), engine }));
  }
});
