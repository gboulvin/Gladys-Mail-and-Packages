// -----------------------------------------------------------------------------
// Application wiring: registers every handler on a Gladys client. Kept apart
// from index.js so the tests drive it with the SDK's fake Gladys.
// -----------------------------------------------------------------------------

import { createLogger } from '@gladysassistant/integration-sdk';
import { ACTIONS } from './actions.js';
import { normalizeConfig } from './config.js';
import { buildDevices } from './devices.js';
import { createEngine } from './engine.js';
import { SCENE_ACTIONS } from './scenes.js';
import { createStore } from './store.js';
import { WIDGETS, refreshWidgets } from './widgets.js';

const logger = createLogger({ name: 'app' });

const MINUTE_MS = 60 * 1000;

/**
 * @param {object} gladys SDK client (real or fake)
 * @param {{ store?: object, read?: Function, test?: Function, now?: () => Date }} [deps]
 */
export function createApp(gladys, deps = {}) {
  const store = deps.store ?? createStore();
  const engine = createEngine(gladys, { store, read: deps.read, now: deps.now });
  let config = normalizeConfig();
  let timer = null;

  async function scanAndRefresh() {
    try {
      await engine.scan(config);
    } catch {
      // Already logged and reported through the connection status.
    }
    refreshWidgets(gladys);
  }

  function schedule() {
    stop();
    timer = setInterval(scanAndRefresh, config.scan_interval * MINUTE_MS);
    timer.unref?.();
  }

  function stop() {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  }

  async function publishDevices() {
    await gladys.publishDiscoveredDevices(buildDevices(gladys, config));
  }

  // --- Discovery ---------------------------------------------------------------
  gladys.onScanRequest(async () => {
    await publishDevices();
    await scanAndRefresh();
  });

  // --- Manifest actions ------------------------------------------------------------
  for (const [key, handler] of Object.entries(ACTIONS)) {
    gladys.onAction(key, async (fields) => {
      const message = await handler(gladys, { fields, config, engine, test: deps.test });
      refreshWidgets(gladys);
      return message;
    });
  }

  // --- Scene actions ---------------------------------------------------------------
  for (const [key, handler] of Object.entries(SCENE_ACTIONS)) {
    gladys.onSceneAction(key, (fields) =>
      handler(gladys, { fields: fields ?? {}, config, engine }),
    );
  }

  // --- Widgets ---------------------------------------------------------------------
  for (const [key, widget] of Object.entries(WIDGETS)) {
    gladys.onWidgetGet(key, (request) => widget.get(gladys, { ...request, config, engine }));
    gladys.onWidgetAction(key, (actionKey, params, { settings } = {}) =>
      widget.action(gladys, { actionKey, params, settings, config, engine }),
    );
  }

  // --- Configuration -----------------------------------------------------------------
  gladys.onConfigUpdated(async (newConfig) => {
    logger.info('Configuration updated');
    config = normalizeConfig(newConfig);
    // Device names follow the language, the carrier list adds devices.
    await publishDevices();
    schedule();
    await scanAndRefresh();
  });

  // --- Lifecycle -----------------------------------------------------------------------
  gladys.on('connected', async () => {
    try {
      config = normalizeConfig(await gladys.getConfig());
      await store.load();
      await publishDevices();
      schedule();
      await scanAndRefresh();
    } catch (err) {
      logger.error(`Initialization failed: ${err.message}`);
    }
  });

  gladys.on('disconnected', stop);

  return {
    engine,
    stop,
    get config() {
      return config;
    },
  };
}
