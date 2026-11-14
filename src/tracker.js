// -----------------------------------------------------------------------------
// Parcel tracker: the classified emails of the mailbox -> the picture of the
// day (parcels, counters, events). Pure function: same emails in, same
// snapshot out, so a restart or a second scan never changes the counters.
//
// The mailbox is the source of truth. A parcel exists as long as one of its
// emails is younger than the look-back window: an email deleted or archived
// out of the scanned folder makes its parcel disappear at the next scan.
// -----------------------------------------------------------------------------

import { COUNTER, COUNTERS, STATUS } from './constants.js';

// How far a step is along the delivery: a later, "lower" email (a shipping
// confirmation delivered late) never takes a parcel backwards.
const RANK = {
  [STATUS.IN_TRANSIT]: 1,
  [STATUS.EXCEPTION]: 2,
  [STATUS.OUT_FOR_DELIVERY]: 3,
  [STATUS.PICKUP]: 4,
  [STATUS.DELIVERED]: 5,
};

const emptyCounters = () => Object.fromEntries(COUNTERS.map((key) => [key, 0]));

/**
 * Local calendar day of a date, as `YYYY-MM-DD`.
 * @param {Date} date
 * @param {string} [timezone] IANA name; the process timezone when empty
 */
export function dayKey(date, timezone) {
  const format = (timeZone) =>
    new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date);
  try {
    return format(timezone || undefined);
  } catch {
    // Unknown timezone name typed by the user: fall back to the process one.
    return format(undefined);
  }
}

// A parcel moves forward, except for a problem reported on a parcel that was
// on its way, and for a parcel that moves again after a problem.
function shouldAdvance(current, next) {
  if (current === STATUS.DELIVERED) {
    return false;
  }
  if (next === STATUS.EXCEPTION || current === STATUS.EXCEPTION) {
    return next !== current;
  }
  return RANK[next] > RANK[current];
}

/**
 * Emails without a tracking number cannot be linked by identity. A follow-up
 * ("delivered") is then attached to the oldest parcel of the same carrier
 * that is still open and less advanced: first shipped, first delivered.
 */
function findOpenUntracked(packages, event) {
  if (event.status === STATUS.IN_TRANSIT) {
    return undefined;
  }
  return packages.find(
    (pkg) =>
      pkg.carrier === event.carrier &&
      pkg.tracking === null &&
      pkg.status !== event.status &&
      shouldAdvance(pkg.status, event.status),
  );
}

/**
 * Build the snapshot of the mailbox.
 * @param {Array} events classified emails (see src/classifier.js)
 * @param {{ now: Date, timezone?: string }} context
 */
export function buildSnapshot(events, { now, timezone }) {
  const today = dayKey(now, timezone);
  const sorted = [...events].sort((a, b) => a.date - b.date);

  const packages = [];
  const byId = new Map();
  const packageEvents = [];
  const mailEvents = [];
  let mail = 0;

  for (const event of sorted) {
    if (event.kind === 'mail') {
      if (dayKey(event.date, timezone) === today) {
        mail += event.count;
      }
      mailEvents.push({
        key: `mail|${event.messageId}`,
        kind: 'mail',
        carrier: event.carrier,
        count: event.count,
        date: event.date,
      });
      continue;
    }

    let pkg = event.tracking
      ? byId.get(`${event.carrier}:${event.tracking}`)
      : findOpenUntracked(packages, event);
    if (!pkg) {
      pkg = {
        id: event.tracking
          ? `${event.carrier}:${event.tracking}`
          : `${event.carrier}:msg:${event.messageId}`,
        carrier: event.carrier,
        tracking: event.tracking,
        status: null,
        subject: event.subject,
        pickupCode: null,
        date: event.date,
      };
      packages.push(pkg);
      byId.set(pkg.id, pkg);
    }

    if (pkg.status !== null && !shouldAdvance(pkg.status, event.status)) {
      continue;
    }
    pkg.status = event.status;
    pkg.subject = event.subject;
    pkg.date = event.date;
    if (event.pickupCode && event.status === STATUS.PICKUP) {
      pkg.pickupCode = event.pickupCode;
    }
    // One event per parcel and step: the key is what the engine remembers to
    // fire each scene trigger once.
    packageEvents.push({
      key: `${pkg.id}|${event.status}`,
      kind: 'package',
      status: event.status,
      date: event.date,
      package: { ...pkg },
    });
  }

  const carriers = {};
  const totals = emptyCounters();
  const count = (carrier, counter) => {
    carriers[carrier] ??= emptyCounters();
    carriers[carrier][counter] += 1;
    totals[counter] += 1;
  };

  for (const pkg of packages) {
    const isToday = dayKey(pkg.date, timezone) === today;
    if (pkg.status === STATUS.IN_TRANSIT || pkg.status === STATUS.OUT_FOR_DELIVERY) {
      count(pkg.carrier, COUNTER.IN_TRANSIT);
    }
    if (pkg.status === STATUS.OUT_FOR_DELIVERY && isToday) {
      count(pkg.carrier, COUNTER.ARRIVING_TODAY);
    }
    if (pkg.status === STATUS.DELIVERED && isToday) {
      count(pkg.carrier, COUNTER.DELIVERED);
    }
    if (pkg.status === STATUS.PICKUP) {
      count(pkg.carrier, COUNTER.PICKUP);
    }
    if (pkg.status === STATUS.EXCEPTION) {
      count(pkg.carrier, COUNTER.EXCEPTION);
    }
  }

  // What is worth showing: everything still open, plus today's deliveries.
  const active = packages
    .filter((pkg) => pkg.status !== STATUS.DELIVERED || dayKey(pkg.date, timezone) === today)
    .sort((a, b) => b.date - a.date);

  return {
    generatedAt: now,
    totals,
    carriers,
    mail,
    packages: active,
    lastPackage: packageEvents.at(-1)?.package ?? null,
    events: [...packageEvents, ...mailEvents].sort((a, b) => a.date - b.date),
  };
}

export function emptySnapshot(now = new Date()) {
  return buildSnapshot([], { now });
}

/**
 * Counters of one carrier, or of every carrier.
 * @param {object} snapshot
 * @param {string} [carrier] carrier key; totals when empty or 'all'
 */
export function countersOf(snapshot, carrier) {
  if (!carrier || carrier === 'all') {
    return snapshot.totals;
  }
  return snapshot.carriers[carrier] ?? emptyCounters();
}
