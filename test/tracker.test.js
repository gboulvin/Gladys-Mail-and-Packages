import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSnapshot, countersOf, dayKey } from '../src/tracker.js';
import { COUNTER, STATUS } from '../src/constants.js';

const now = new Date('2026-11-14T15:00:00Z');
const at = (iso) => new Date(iso);
let next = 0;
const pkg = (carrier, status, date, tracking = null, extra = {}) => ({
  kind: 'package',
  carrier,
  status,
  tracking,
  pickupCode: null,
  subject: `${carrier} ${status}`,
  date: at(date),
  messageId: `m${(next += 1)}`,
  ...extra,
});
const snap = (events) => buildSnapshot(events, { now, timezone: 'UTC' });

test('a parcel follows its tracking number through the steps', () => {
  const snapshot = snap([
    pkg('ups', STATUS.IN_TRANSIT, '2026-11-12T10:00:00Z', '1Z1'),
    pkg('ups', STATUS.OUT_FOR_DELIVERY, '2026-11-14T07:00:00Z', '1Z1'),
  ]);
  assert.equal(snapshot.packages.length, 1);
  assert.equal(snapshot.totals[COUNTER.IN_TRANSIT], 1);
  assert.equal(snapshot.totals[COUNTER.ARRIVING_TODAY], 1);
  assert.equal(snapshot.carriers.ups[COUNTER.ARRIVING_TODAY], 1);
});

test('a delivered parcel leaves "in transit" and counts as delivered today', () => {
  const snapshot = snap([
    pkg('ups', STATUS.IN_TRANSIT, '2026-11-12T10:00:00Z', '1Z1'),
    pkg('ups', STATUS.OUT_FOR_DELIVERY, '2026-11-14T07:00:00Z', '1Z1'),
    pkg('ups', STATUS.DELIVERED, '2026-11-14T12:00:00Z', '1Z1'),
  ]);
  assert.equal(snapshot.totals[COUNTER.IN_TRANSIT], 0);
  assert.equal(snapshot.totals[COUNTER.ARRIVING_TODAY], 0);
  assert.equal(snapshot.totals[COUNTER.DELIVERED], 1);
  assert.deepEqual(
    snapshot.events.map((event) => event.status),
    [STATUS.IN_TRANSIT, STATUS.OUT_FOR_DELIVERY, STATUS.DELIVERED],
  );
});

test('yesterday deliveries are not counted nor listed', () => {
  const snapshot = snap([pkg('fedex', STATUS.DELIVERED, '2026-11-13T12:00:00Z', '7712')]);
  assert.equal(snapshot.totals[COUNTER.DELIVERED], 0);
  assert.equal(snapshot.packages.length, 0);
});

test('a parcel never goes backwards', () => {
  const snapshot = snap([
    pkg('dhl', STATUS.DELIVERED, '2026-11-14T10:00:00Z', 'JJD1'),
    pkg('dhl', STATUS.IN_TRANSIT, '2026-11-14T11:00:00Z', 'JJD1'),
  ]);
  assert.equal(snapshot.packages[0].status, STATUS.DELIVERED);
  assert.equal(snapshot.events.length, 1);
});

test('a problem is reported, then the parcel moves on', () => {
  const snapshot = snap([
    pkg('ups', STATUS.OUT_FOR_DELIVERY, '2026-11-14T07:00:00Z', '1Z2'),
    pkg('ups', STATUS.EXCEPTION, '2026-11-14T09:00:00Z', '1Z2'),
  ]);
  assert.equal(snapshot.totals[COUNTER.EXCEPTION], 1);
  assert.equal(snapshot.totals[COUNTER.ARRIVING_TODAY], 0);
  const later = snap([
    pkg('ups', STATUS.OUT_FOR_DELIVERY, '2026-11-14T07:00:00Z', '1Z2'),
    pkg('ups', STATUS.EXCEPTION, '2026-11-14T09:00:00Z', '1Z2'),
    pkg('ups', STATUS.DELIVERED, '2026-11-14T13:00:00Z', '1Z2'),
  ]);
  assert.equal(later.totals[COUNTER.EXCEPTION], 0);
  assert.equal(later.totals[COUNTER.DELIVERED], 1);
});

test('untracked emails pair first shipped with first delivered', () => {
  const snapshot = snap([
    pkg('amazon', STATUS.IN_TRANSIT, '2026-11-10T10:00:00Z'),
    pkg('amazon', STATUS.IN_TRANSIT, '2026-11-11T10:00:00Z'),
    pkg('amazon', STATUS.DELIVERED, '2026-11-14T10:00:00Z'),
  ]);
  assert.equal(snapshot.totals[COUNTER.IN_TRANSIT], 1);
  assert.equal(snapshot.totals[COUNTER.DELIVERED], 1);
});

test('pickup codes are kept on the parcel', () => {
  const snapshot = snap([
    pkg('inpost', STATUS.PICKUP, '2026-11-14T08:00:00Z', '6200', { pickupCode: '123456' }),
  ]);
  assert.equal(snapshot.totals[COUNTER.PICKUP], 1);
  assert.equal(snapshot.packages[0].pickupCode, '123456');
});

test('letters are counted for today only', () => {
  const mail = (date, count, id) => ({
    kind: 'mail',
    carrier: 'usps',
    count,
    date: at(date),
    messageId: id,
  });
  const snapshot = snap([
    mail('2026-11-13T06:00:00Z', 3, 'a'),
    mail('2026-11-14T06:00:00Z', 2, 'b'),
  ]);
  assert.equal(snapshot.mail, 2);
  assert.equal(snapshot.events.filter((event) => event.kind === 'mail').length, 2);
});

test('the same emails always give the same snapshot', () => {
  const events = [
    pkg('ups', STATUS.IN_TRANSIT, '2026-11-12T10:00:00Z', '1Z3'),
    pkg('ups', STATUS.DELIVERED, '2026-11-14T12:00:00Z', '1Z3'),
  ];
  assert.deepEqual(snap(events).totals, snap([...events].reverse()).totals);
  assert.deepEqual(
    snap(events).events.map((event) => event.key),
    snap([...events].reverse()).events.map((event) => event.key),
  );
});

test('countersOf returns zeros for a carrier without parcel', () => {
  const snapshot = snap([]);
  assert.equal(countersOf(snapshot, 'ups')[COUNTER.IN_TRANSIT], 0);
  assert.equal(countersOf(snapshot, 'all'), snapshot.totals);
});

test('dayKey follows the time zone and survives a bad one', () => {
  const late = new Date('2026-11-14T23:30:00Z');
  assert.equal(dayKey(late, 'UTC'), '2026-11-14');
  assert.equal(dayKey(late, 'Europe/Paris'), '2026-11-15');
  assert.match(dayKey(late, 'Not/AZone'), /^\d{4}-\d{2}-\d{2}$/);
});
