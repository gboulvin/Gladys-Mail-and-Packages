// -----------------------------------------------------------------------------
// Entry point of the "Mail and Packages" Gladys integration.
//
// The Gladys supervisor injects GLADYS_HOST_API_URL, GLADYS_INTEGRATION_TOKEN
// and GLADYS_INTEGRATION_SELECTOR: `new GladysIntegration()` reads them. All
// the logic is in src/app.js, wired here before connect().
// -----------------------------------------------------------------------------

import { GladysIntegration, logger } from '@gladysassistant/integration-sdk';
import { createApp } from './src/app.js';

const gladys = new GladysIntegration();
const app = createApp(gladys);

gladys.handleShutdown((signal) => {
  logger.info(`Received ${signal} -> graceful shutdown`);
  app.stop();
});

logger.info('Starting Mail and Packages...');
gladys.connect().catch((err) => {
  logger.error('Initial connection failed', err);
  process.exit(1);
});
