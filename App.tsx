import React from 'react';
import { LoreApp } from 'lore';

/**
 * Junktown Intelligence is the Afterworlds flavor of Lore. Everything on
 * screen — characters, factions, locations, events, quests, Discord, sync —
 * comes from the engine; this repository supplies the ruleset that tells it
 * to say "Species", "Perks" and "Junktown Office", plus the app's identity
 * and its icons.
 *
 * The ruleset is registered in `index.ts` rather than passed here, because
 * storage migrations need it too and they cannot read a React context.
 */
export default function App() {
  return <LoreApp />;
}
