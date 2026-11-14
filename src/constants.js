// -----------------------------------------------------------------------------
// Shared vocabulary. Every value below is STORED by Gladys (feature external
// ids, scene filters, widget settings): a published value is never renamed.
// -----------------------------------------------------------------------------

// Step of a parcel, as read from one notification email.
export const STATUS = {
  IN_TRANSIT: 'in_transit', // shipped, on its way
  OUT_FOR_DELIVERY: 'out_for_delivery', // on the truck, arriving today
  PICKUP: 'pickup', // waiting in a locker / pickup point / post office
  DELIVERED: 'delivered',
  EXCEPTION: 'exception', // delayed, failed attempt, returned
};

export const STATUSES = Object.values(STATUS);

// Counters published as device features (per carrier, and summed on the
// summary device). Keys are the feature keys.
export const COUNTER = {
  IN_TRANSIT: 'in_transit', // every parcel still on its way
  ARRIVING_TODAY: 'arriving_today', // announced "out for delivery" today
  DELIVERED: 'delivered', // delivered today
  PICKUP: 'pickup', // waiting to be picked up
  EXCEPTION: 'exception', // open delivery problems
};

export const COUNTERS = Object.values(COUNTER);

// Extra features of the summary device.
export const SUMMARY_FEATURE = {
  MAIL: 'mail', // letters announced today (USPS Informed Delivery)
  LAST_UPDATE: 'last_update', // text: the latest parcel event
};

// Scene trigger fired for each status (manifest `scene_triggers` keys).
export const TRIGGER_BY_STATUS = {
  [STATUS.IN_TRANSIT]: 'package_shipped',
  [STATUS.OUT_FOR_DELIVERY]: 'package_out_for_delivery',
  [STATUS.PICKUP]: 'package_ready_for_pickup',
  [STATUS.DELIVERED]: 'package_delivered',
  [STATUS.EXCEPTION]: 'package_exception',
};
export const MAIL_TRIGGER = 'mail_expected';

export const SCENE_TRIGGER_KEYS = [...Object.values(TRIGGER_BY_STATUS), MAIL_TRIGGER];

// Value of the "every carrier" choice of a carrier select.
export const ALL_CARRIERS = 'all';

export const LANGUAGES = ['en', 'fr', 'de', 'es'];
