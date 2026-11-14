// -----------------------------------------------------------------------------
// The day in one sentence: "Packages: 2 arriving today, 1 to pick up."
// Used by the manifest actions, the scene action outputs and the widgets.
// -----------------------------------------------------------------------------

import { COUNTER } from './constants.js';
import { eachLanguage, tl } from './i18n.js';

// Reading order of the sentence: what needs the user today comes first.
const ORDER = [
  COUNTER.ARRIVING_TODAY,
  COUNTER.PICKUP,
  COUNTER.EXCEPTION,
  COUNTER.DELIVERED,
  COUNTER.IN_TRANSIT,
];

/**
 * @param {Record<string, number>} counters
 * @param {number} mail letters expected today
 * @param {string} language
 */
export function summarize(counters, mail, language) {
  // "In transit" includes the parcels arriving today: say each one once.
  const shown = {
    ...counters,
    [COUNTER.IN_TRANSIT]: counters[COUNTER.IN_TRANSIT] - counters[COUNTER.ARRIVING_TODAY],
  };
  const parts = ORDER.filter((key) => shown[key] > 0).map((key) =>
    tl(language, `summary.${key}`, { n: shown[key] }),
  );
  const sentences = [];
  sentences.push(
    parts.length > 0
      ? `${tl(language, 'summary.packages')}${parts.join(', ')}.`
      : tl(language, 'summary.none'),
  );
  if (mail > 0) {
    sentences.push(`${tl(language, 'summary.mail', { n: mail })}.`);
  }
  return sentences.join(' ');
}

export function summarizeAll(counters, mail) {
  return eachLanguage((language) => summarize(counters, mail, language));
}
