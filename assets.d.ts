// Bundled images the Afterworlds ruleset requires (its map). Expo generates
// `expo-env.d.ts` with these once the dev server has run, but that file is
// git-ignored, so type-checking a fresh clone needs them declared.
//
// This lives in its own file rather than in `global.d.ts` because that file
// has a top-level `import`, which makes it a module — and `declare module`
// inside a module is an augmentation, not the ambient declaration we need.
declare module '*.png' {
  import type { ImageSourcePropType } from 'react-native';
  const content: ImageSourcePropType;
  export default content;
}
