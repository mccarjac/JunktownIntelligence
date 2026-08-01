// Polyfills for JSZip and other Node.js modules
import { Buffer } from 'buffer';
import process from 'process/browser';

global.Buffer = Buffer;

if (typeof global.process === 'undefined') {
  global.process = process;
}

import { registerRootComponent } from 'expo';
import {
  configureLore,
  jsonDataStore,
  pdfDataStore,
  githubDataStore,
} from 'lore';

import { afterworldsRuleset } from './src/rulesets/afterworlds';
import { afterworldsAssets } from './src/rulesets/afterworlds/assets';
import App from './App';

// Before registerRootComponent, and before anything can touch storage: the
// engine's field migration normalizes stored data against the *ruleset's*
// attribute table, so running it with the engine's default would rewrite real
// Junktown characters against the wrong one.
//
// `dataStores` must be listed explicitly now — GitHub sync moved from a
// ruleset feature flag (`features.gitSync`) to an opt-in store registration.
// Omitting this would silently drop the GitHub Repository Sync section from
// the Data Management screen, even though the ruleset still declares
// everything else Junktown uses.
configureLore({
  ruleset: afterworldsRuleset,
  assets: afterworldsAssets,
  dataStores: [jsonDataStore, pdfDataStore, githubDataStore],
});

registerRootComponent(App);
