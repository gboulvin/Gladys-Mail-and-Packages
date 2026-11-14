// -----------------------------------------------------------------------------
// Devices published to Gladys.
//
//   - one SUMMARY device: the counters of every carrier added up, the letters
//     expected today (USPS Informed Delivery) and the last parcel event, as a
//     text feature;
//   - one device PER ENABLED CARRIER, with its own counters: "is my Amazon
//     parcel arriving today?" without a scene that adds things up.
//
// External ids are forever: `mailbox:summary` and `carrier:<carrier key>`.
// -----------------------------------------------------------------------------

import { DEVICE_FEATURE_CATEGORIES, DEVICE_FEATURE_TYPES } from '@gladysassistant/integration-sdk';
import { COUNTERS, SUMMARY_FEATURE } from './constants.js';
import { carrierName } from './carriers/index.js';
import { tl } from './i18n.js';

const SUMMARY = { type: 'mailbox', id: 'summary' };
const CARRIER_TYPE = 'carrier';

// Upper bound of a counter, for the gauges Gladys draws.
const COUNTER_MAX = 100;

export function summaryIds(gladys) {
  return gladys.externalIds(SUMMARY.type, SUMMARY.id);
}

export function carrierIds(gladys, carrier) {
  return gladys.externalIds(CARRIER_TYPE, carrier);
}

/** The ids of the device showing a carrier, or the summary for 'all'. */
export function idsFor(gladys, carrier) {
  return !carrier || carrier === 'all' ? summaryIds(gladys) : carrierIds(gladys, carrier);
}

function counterFeature(ids, key, language) {
  return {
    name: tl(language, `feature.${key}`),
    external_id: ids.feature(key),
    category: DEVICE_FEATURE_CATEGORIES.COUNTER_SENSOR,
    type: DEVICE_FEATURE_TYPES.SENSOR.INTEGER,
    min: 0,
    max: COUNTER_MAX,
    read_only: true,
    has_feedback: false,
    keep_history: true,
  };
}

/** Carriers that get a device: the enabled ones, `other` only when used. */
export function deviceCarriers(config) {
  return config.carriers.filter((key) => key !== 'other' || config.customSenders.length > 0);
}

/**
 * Discovery payload: the summary device, then one device per carrier.
 * Names are in the language chosen in the configuration: Gladys stores them
 * as plain text, and the user can rename them.
 */
export function buildDevices(gladys, config) {
  const { language } = config;
  const summary = summaryIds(gladys);
  const devices = [
    {
      name: tl(language, 'device.summary'),
      external_id: summary.device,
      features: [
        ...COUNTERS.map((key) => counterFeature(summary, key, language)),
        counterFeature(summary, SUMMARY_FEATURE.MAIL, language),
        {
          name: tl(language, `feature.${SUMMARY_FEATURE.LAST_UPDATE}`),
          external_id: summary.feature(SUMMARY_FEATURE.LAST_UPDATE),
          category: DEVICE_FEATURE_CATEGORIES.TEXT,
          type: DEVICE_FEATURE_TYPES.TEXT.TEXT,
          read_only: true,
          has_feedback: false,
          keep_history: true,
        },
      ],
    },
  ];
  for (const carrier of deviceCarriers(config)) {
    const ids = carrierIds(gladys, carrier);
    devices.push({
      name: tl(language, 'device.carrier', { carrier: carrierName(carrier) }),
      external_id: ids.device,
      features: COUNTERS.map((key) => counterFeature(ids, key, language)),
    });
  }
  return devices;
}

/** Short text of a parcel event, for the `last_update` feature. */
export function describePackage(pkg, language) {
  if (!pkg) {
    return '';
  }
  const parts = [carrierName(pkg.carrier), tl(language, `status.${pkg.status}`)];
  if (pkg.tracking) {
    parts.push(pkg.tracking);
  }
  return parts.join(' – ');
}

/**
 * States of every device, from a snapshot. Sent with publishChangedStates:
 * only the counters that moved reach Gladys.
 */
export function buildStates(gladys, config, snapshot) {
  const summary = summaryIds(gladys);
  const states = COUNTERS.map((key) => ({
    device_feature_external_id: summary.feature(key),
    state: snapshot.totals[key],
  }));
  states.push({
    device_feature_external_id: summary.feature(SUMMARY_FEATURE.MAIL),
    state: snapshot.mail,
  });
  const lastUpdate = describePackage(snapshot.lastPackage, config.language);
  if (lastUpdate) {
    states.push({
      device_feature_external_id: summary.feature(SUMMARY_FEATURE.LAST_UPDATE),
      text: lastUpdate,
    });
  }
  for (const carrier of deviceCarriers(config)) {
    const ids = carrierIds(gladys, carrier);
    for (const key of COUNTERS) {
      states.push({
        device_feature_external_id: ids.feature(key),
        state: snapshot.carriers[carrier]?.[key] ?? 0,
      });
    }
  }
  return states;
}
