import type { Species } from './speciesTypes';

/**
 * Authoring shapes for the Afterworlds content tables — *fork-owned content,
 * not engine types*. They used to live in `src/models/types.ts`, which meant
 * the domain model carried the vocabulary of one ruleset.
 *
 * The engine's own counterparts are in `src/ruleset/types.ts`
 * (`Recipe`, `Quality`, …); `index.ts` transforms these into those.
 */
export interface Recipe {
  id: string;
  name: string;
  description: string;
  materials: string[];
}

export interface Distinction {
  id: string;
  name: string;
  description: string;
  allowedSpecies?: Species[];
}
