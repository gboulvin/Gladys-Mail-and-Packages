// -----------------------------------------------------------------------------
// Manifest actions: the buttons of the Configuration screen. The resolved
// multi-language message is displayed under the button; a thrown error too.
// -----------------------------------------------------------------------------

import { createLogger } from '@gladysassistant/integration-sdk';
import { isConfigured } from './config.js';
import { statusMessage } from './engine.js';
import { t } from './i18n.js';
import { testConnection } from './imap.js';
import { summarizeAll } from './summary.js';

const logger = createLogger({ name: 'actions' });

export const ACTIONS = {
  async test_connection(_gladys, { config, test = testConnection }) {
    logger.info('Action test_connection');
    if (!isConfigured(config)) {
      return statusMessage(config);
    }
    try {
      const { folders, messages } = await test(config);
      return t('action.test_ok', { folders, messages, days: config.lookback_days });
    } catch (err) {
      return statusMessage(config, err);
    }
  },

  async scan_now(_gladys, { config, engine }) {
    logger.info('Action scan_now');
    if (!isConfigured(config)) {
      return statusMessage(config);
    }
    try {
      const snapshot = await engine.scan(config);
      const summary = summarizeAll(snapshot.totals, snapshot.mail);
      return Object.fromEntries(
        Object.entries(summary).map(([language, text]) => [
          language,
          t('action.scan_ok', { summary: text })[language],
        ]),
      );
    } catch (err) {
      return statusMessage(config, err);
    }
  },
};
