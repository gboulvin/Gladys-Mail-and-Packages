// -----------------------------------------------------------------------------
// Scene actions (manifest `scene_actions`, Gladys 5.1+).
//
// Both return the same outputs, readable by the following actions of the
// scene ({{<column>.<row>.arriving_today}}...), so a scene can say "two
// parcels arrive today" or gate a notification on `expected_today`:
//   - scan_mailbox        : scan the mailbox now, then answer;
//   - get_package_counts  : answer from the last scan (instant, no network).
//
// Scene TRIGGERS need no handler: the engine fires them (src/engine.js).
// Never fire a scene event from here: a scene bound to it would loop.
// -----------------------------------------------------------------------------

import { createLogger } from '@gladysassistant/integration-sdk';
import { ALL_CARRIERS, COUNTER, COUNTERS } from './constants.js';
import { countersOf } from './tracker.js';
import { summarize } from './summary.js';

const logger = createLogger({ name: 'scenes' });

/** Outputs of the scene actions, for one carrier or all of them. */
export function buildOutputs(snapshot, carrier, language) {
  const counters = countersOf(snapshot, carrier);
  const allCarriers = !carrier || carrier === ALL_CARRIERS;
  // Letters are a USPS-only feature: they belong to "all" and to USPS.
  const mail = allCarriers || carrier === 'usps' ? snapshot.mail : 0;
  return {
    ...Object.fromEntries(COUNTERS.map((key) => [key, counters[key]])),
    mail,
    expected_today: counters[COUNTER.ARRIVING_TODAY] > 0 || counters[COUNTER.PICKUP] > 0,
    summary: summarize(counters, mail, language),
  };
}

export const SCENE_ACTIONS = {
  async scan_mailbox(_gladys, { fields, config, engine }) {
    logger.info(`Scene action scan_mailbox <- ${fields.carrier ?? ALL_CARRIERS}`);
    // A failed scan fails this action only: the scene logs it and continues.
    const snapshot = await engine.scan(config);
    return buildOutputs(snapshot, fields.carrier, config.language);
  },

  async get_package_counts(_gladys, { fields, config, engine }) {
    logger.info(`Scene action get_package_counts <- ${fields.carrier ?? ALL_CARRIERS}`);
    return buildOutputs(engine.snapshot, fields.carrier, config.language);
  },
};
