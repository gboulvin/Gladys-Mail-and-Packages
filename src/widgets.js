// -----------------------------------------------------------------------------
// Dashboard widgets (manifest `widgets`, Gladys 5.1+).
//
//   - packages_overview : the counters of the day as tiles, the mailbox
//                         status and a "Scan now" button;
//   - packages_list     : the parcels still on their way (and today's
//                         deliveries), with tracking number, pickup code and a
//                         link to the carrier's tracking page.
//
// Both have a `carrier` setting (one carrier, or all of them). The values are
// computed from the last scan: the engine nudges the widgets after each scan
// (refreshWidgets), the TTL is a safety net.
// -----------------------------------------------------------------------------

import { createLogger, WIDGET_COLORS } from '@gladysassistant/integration-sdk';
import { ALL_CARRIERS, COUNTER, STATUS } from './constants.js';
import { carrierName, trackingUrl } from './carriers/index.js';
import { isConfigured } from './config.js';
import { eachLanguage, t, tl } from './i18n.js';
import { buildOutputs } from './scenes.js';

const logger = createLogger({ name: 'widgets' });

export const OVERVIEW_WIDGET = 'packages_overview';
export const LIST_WIDGET = 'packages_list';
const SCAN_ACTION = 'scan';

const TTL_SECONDS = 600;
const MAX_LIST_ITEMS = 8;

const TILES = [
  { key: COUNTER.ARRIVING_TODAY, icon: 'truck', color: WIDGET_COLORS.PRIMARY },
  { key: COUNTER.IN_TRANSIT, icon: 'package', color: WIDGET_COLORS.INFO },
  { key: COUNTER.PICKUP, icon: 'map-pin', color: WIDGET_COLORS.WARNING },
  { key: COUNTER.DELIVERED, icon: 'check-circle', color: WIDGET_COLORS.SUCCESS },
  { key: COUNTER.EXCEPTION, icon: 'alert-triangle', color: WIDGET_COLORS.DANGER },
];

const STATUS_COLORS = {
  [STATUS.IN_TRANSIT]: WIDGET_COLORS.INFO,
  [STATUS.OUT_FOR_DELIVERY]: WIDGET_COLORS.PRIMARY,
  [STATUS.PICKUP]: WIDGET_COLORS.WARNING,
  [STATUS.DELIVERED]: WIDGET_COLORS.SUCCESS,
  [STATUS.EXCEPTION]: WIDGET_COLORS.DANGER,
};

function formatDate(date, timezone) {
  return eachLanguage((language) => {
    const options = { dateStyle: 'short', timeStyle: 'short' };
    try {
      return new Intl.DateTimeFormat(language, {
        ...options,
        timeZone: timezone || undefined,
      }).format(date);
    } catch {
      return new Intl.DateTimeFormat(language, options).format(date);
    }
  });
}

function mailboxStatus(config, lastScan) {
  if (!isConfigured(config)) {
    return { value: t('widget.not_configured'), color: WIDGET_COLORS.WARNING };
  }
  if (lastScan.at && !lastScan.ok) {
    return { value: t('widget.error'), color: WIDGET_COLORS.DANGER };
  }
  return lastScan.ok
    ? { value: t('widget.connected'), color: WIDGET_COLORS.SUCCESS }
    : { value: t('widget.never'), color: WIDGET_COLORS.NEUTRAL };
}

const scanButton = () => ({
  type: 'button',
  label: t('widget.refresh'),
  icon: 'refresh-cw',
  style: 'secondary',
  action: { key: SCAN_ACTION },
});

const selectedCarrier = (settings) => settings?.carrier || ALL_CARRIERS;

const showsMail = (config, carrier) =>
  config.carriers.includes('usps') && (carrier === ALL_CARRIERS || carrier === 'usps');

/** Content of the overview widget. */
export function overviewContent({ config, engine, settings }) {
  const carrier = selectedCarrier(settings);
  const outputs = buildOutputs(engine.snapshot, carrier, config.language);
  // Budget: 6 tiles, 1 status, 1 button = the 8 components a widget holds.
  // The day's sentence is the `summary` output of the scene actions.
  const components = [
    ...TILES.map((tile) => ({
      type: 'value',
      value: outputs[tile.key],
      label: t(`feature.${tile.key}`),
      icon: tile.icon,
      // A zero stays neutral: color draws the eye to what needs it.
      color: outputs[tile.key] > 0 ? tile.color : WIDGET_COLORS.NEUTRAL,
    })),
  ];
  if (showsMail(config, carrier)) {
    components.push({
      type: 'value',
      value: outputs.mail,
      label: t('widget.mail'),
      icon: 'mail',
      color: outputs.mail > 0 ? WIDGET_COLORS.PRIMARY : WIDGET_COLORS.NEUTRAL,
    });
  }
  const { lastScan } = engine;
  components.push(
    {
      type: 'status',
      items: [
        { label: t('widget.mailbox'), icon: 'inbox', ...mailboxStatus(config, lastScan) },
        {
          label: t('widget.last_scan'),
          icon: 'clock',
          value: lastScan.at ? formatDate(lastScan.at, config.timezone) : t('widget.never'),
          color: WIDGET_COLORS.NEUTRAL,
        },
      ],
    },
    scanButton(),
  );
  return { ttl_seconds: TTL_SECONDS, components };
}

function packageCard(pkg, timezone) {
  const url = trackingUrl(pkg.carrier, pkg.tracking);
  const description = eachLanguage((language) =>
    [
      pkg.subject,
      pkg.tracking ? tl(language, 'widget.tracking_number', { tracking: pkg.tracking }) : null,
      pkg.pickupCode ? tl(language, 'widget.pickup_code', { code: pkg.pickupCode }) : null,
    ]
      .filter(Boolean)
      .join('\n'),
  );
  const subtitle = pkg.pickupCode
    ? eachLanguage(
        (language) =>
          `${tl(language, `status.${pkg.status}`)} · ${tl(language, 'widget.pickup_code', {
            code: pkg.pickupCode,
          })}`,
      )
    : (pkg.tracking ?? formatDate(pkg.date, timezone));
  return {
    title: carrierName(pkg.carrier),
    subtitle,
    date: pkg.date.toISOString(),
    badge: { text: t(`badge.${pkg.status}`), color: STATUS_COLORS[pkg.status] },
    description,
    ...(url ? { links: [{ url, label: t('widget.track') }] } : {}),
  };
}

/** Content of the parcel list widget. */
export function listContent({ config, engine, settings }) {
  const carrier = selectedCarrier(settings);
  const packages = engine.snapshot.packages
    .filter((pkg) => carrier === ALL_CARRIERS || pkg.carrier === carrier)
    .slice(0, MAX_LIST_ITEMS);
  const components =
    packages.length > 0
      ? [
          {
            type: 'card-list',
            display: 'list',
            items: packages.map((pkg) => packageCard(pkg, config.timezone)),
          },
        ]
      : [{ type: 'text', variant: 'body', text: t('widget.no_package') }];
  components.push(scanButton());
  return { ttl_seconds: TTL_SECONDS, components };
}

async function scanAction({ actionKey, config, engine }) {
  if (actionKey !== SCAN_ACTION) {
    // Throwing acks the action as failed: the message reaches the user.
    throw new Error(`Unknown widget action: ${actionKey}`);
  }
  await engine.scan(config);
  // The core drops the cached content after a successful action.
  return t('widget.refreshed');
}

export const WIDGETS = {
  [OVERVIEW_WIDGET]: {
    async get(_gladys, request) {
      logger.debug(`onWidgetGet <- ${OVERVIEW_WIDGET}`);
      return overviewContent(request);
    },
    action: (_gladys, request) => scanAction(request),
  },
  [LIST_WIDGET]: {
    async get(_gladys, request) {
      logger.debug(`onWidgetGet <- ${LIST_WIDGET}`);
      return listContent(request);
    },
    action: (_gladys, request) => scanAction(request),
  },
};

/**
 * Ask the core to re-pull every widget now (after a scan, a config change or
 * a reconnection). Fire-and-forget, rate-limited core-side.
 */
export function refreshWidgets(gladys) {
  for (const key of Object.keys(WIDGETS)) {
    gladys.requestWidgetRefresh(key);
  }
}
