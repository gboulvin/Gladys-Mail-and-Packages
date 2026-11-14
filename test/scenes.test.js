import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createFakeGladys } from '@gladysassistant/integration-sdk/testing';
import { createEngine } from '../src/engine.js';
import { SCENE_ACTIONS } from '../src/scenes.js';
import { NOW, config, email, fakeMailbox, memoryStore } from './helpers.js';

const manifest = JSON.parse(
  await readFile(new URL('../gladys-assistant-integration.json', import.meta.url), 'utf8'),
);

const declaration = (key) => manifest.scene_actions.find((action) => action.key === key);

function setup(messages) {
  const gladys = createFakeGladys();
  const mailbox = fakeMailbox(messages);
  const engine = createEngine(gladys, { store: memoryStore(), read: mailbox.read, now: () => NOW });
  return { gladys, mailbox, engine };
}

const outForDelivery = email(
  'noreply@notif-colissimo-laposte.info',
  'Votre colis 6A12345678901 est en cours de livraison',
  '2026-11-14T07:00:00Z',
);

test('scan_mailbox scans, then returns exactly the declared outputs with their types', async () => {
  const { engine, mailbox } = setup([outForDelivery]);
  const outputs = await SCENE_ACTIONS.scan_mailbox(null, {
    fields: { carrier: 'all' },
    config: config({ language: 'fr' }),
    engine,
  });
  assert.equal(mailbox.calls, 1);
  const declared = declaration('scan_mailbox').outputs;
  assert.deepEqual(Object.keys(outputs).sort(), declared.map((o) => o.key).sort());
  for (const { key, type } of declared) {
    assert.equal(typeof outputs[key], type, `output ${key}`);
  }
  assert.equal(outputs.arriving_today, 1);
  assert.equal(outputs.expected_today, true);
  assert.equal(outputs.summary, "Colis : 1 arrive(nt) aujourd'hui.");
});

test('get_package_counts answers from the last scan, per carrier', async () => {
  const { engine, mailbox } = setup([outForDelivery]);
  await engine.scan(config());
  const colissimo = await SCENE_ACTIONS.get_package_counts(null, {
    fields: { carrier: 'colissimo' },
    config: config(),
    engine,
  });
  const ups = await SCENE_ACTIONS.get_package_counts(null, {
    fields: { carrier: 'ups' },
    config: config(),
    engine,
  });
  assert.equal(mailbox.calls, 1, 'no new scan');
  assert.equal(colissimo.arriving_today, 1);
  assert.equal(ups.arriving_today, 0);
  assert.equal(ups.expected_today, false);
  assert.equal(ups.summary, 'No package expected.');
});

test('every scene action is declared and handled', () => {
  assert.deepEqual(
    Object.keys(SCENE_ACTIONS).sort(),
    manifest.scene_actions.map((action) => action.key).sort(),
  );
});

test('a failed scan fails the scene action', async () => {
  const { engine, mailbox } = setup([]);
  mailbox.error = new Error('ECONNREFUSED');
  await assert.rejects(SCENE_ACTIONS.scan_mailbox(null, { fields: {}, config: config(), engine }));
});
