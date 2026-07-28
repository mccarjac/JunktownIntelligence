// Polyfills for JSZip and other Node.js modules
import { Buffer } from 'buffer';
import process from 'process/browser';

global.Buffer = Buffer;

if (typeof global.process === 'undefined') {
  global.process = process;
}

import { registerRootComponent } from 'expo';
import { configureLore } from 'lore';

import { afterworldsRuleset } from './src/rulesets/afterworlds';
import { afterworldsAssets } from './src/rulesets/afterworlds/assets';
import App from './App';

// Before registerRootComponent, and before anything can touch storage: the
// engine's field migration normalizes stored data against the *ruleset's*
// attribute table, so running it with the engine's default would rewrite real
// Junktown characters against the wrong one.
configureLore({ ruleset: afterworldsRuleset, assets: afterworldsAssets });

registerRootComponent(App);
