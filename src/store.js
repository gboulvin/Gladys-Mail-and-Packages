// -----------------------------------------------------------------------------
// Persistence of the scene events already fired.
//
// The counters are rebuilt from the mailbox at every scan, but a scene trigger
// must fire ONCE per parcel step, restarts included: the keys of the fired
// events are kept in /data/state.json (the only writable location of the
// container). Nothing else is stored: no email content, no credential.
// -----------------------------------------------------------------------------

import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { createLogger } from '@gladysassistant/integration-sdk';

const logger = createLogger({ name: 'store' });

const STATE_VERSION = 1;

export function defaultStatePath() {
  return join(process.env.DATA_DIR || '/data', 'state.json');
}

/**
 * @param {string|null} path file to persist to; `null` keeps everything in memory
 */
export function createStore(path = defaultStatePath()) {
  // key -> timestamp (ms) of the email that produced the event
  let seen = new Map();
  // false until a first scan recorded the events already in the mailbox
  let initialized = false;

  return {
    get initialized() {
      return initialized;
    },

    async load() {
      if (!path) {
        return;
      }
      try {
        const state = JSON.parse(await readFile(path, 'utf8'));
        if (state.version === STATE_VERSION && state.seen && typeof state.seen === 'object') {
          seen = new Map(Object.entries(state.seen));
          initialized = true;
        }
      } catch (err) {
        if (err.code !== 'ENOENT') {
          logger.warn(`Cannot read ${path}, starting from an empty state: ${err.message}`);
        }
      }
    },

    has(key) {
      return seen.has(key);
    },

    add(key, timestamp) {
      seen.set(key, timestamp);
    },

    /** Forget the events older than `before` (ms): their emails left the window. */
    prune(before) {
      for (const [key, timestamp] of seen) {
        if (timestamp < before) {
          seen.delete(key);
        }
      }
    },

    async save() {
      initialized = true;
      if (!path) {
        return;
      }
      try {
        await mkdir(dirname(path), { recursive: true });
        // Write then rename: a container stopped mid-write keeps the old file.
        const temporary = `${path}.tmp`;
        await writeFile(
          temporary,
          JSON.stringify({ version: STATE_VERSION, seen: Object.fromEntries(seen) }),
        );
        await rename(temporary, path);
      } catch (err) {
        // Not fatal: the triggers of this run still fire once, in memory.
        logger.warn(`Cannot write ${path}: ${err.message}`);
      }
    },
  };
}
