// -----------------------------------------------------------------------------
// npm run manifest: regenerate gladys-assistant-integration.json from
// scripts/manifest-source.mjs, keeping `version` and `docker_image` (owned by
// the Release workflow), formatted with the repository's Prettier config.
// -----------------------------------------------------------------------------

import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import * as prettier from 'prettier';
import { buildManifest } from './manifest-source.mjs';

export const MANIFEST_PATH = fileURLToPath(
  new URL('../gladys-assistant-integration.json', import.meta.url),
);

export async function renderManifest(currentText) {
  const { version, docker_image } = JSON.parse(currentText);
  const options = { ...(await prettier.resolveConfig(MANIFEST_PATH)), filepath: MANIFEST_PATH };
  return prettier.format(JSON.stringify(buildManifest({ version, docker_image })), options);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const text = await renderManifest(await readFile(MANIFEST_PATH, 'utf8'));
  await writeFile(MANIFEST_PATH, text);
  console.log(`Wrote ${MANIFEST_PATH}`);
}
