import { resolveAsset, afterworldsAssets } from '@/ruleset/assets';

describe('resolveAsset', () => {
  it('resolves a known key', () => {
    expect(resolveAsset(afterworldsAssets, 'map')).toBe(afterworldsAssets.map);
  });

  it('returns undefined for an unknown key', () => {
    expect(resolveAsset(afterworldsAssets, 'nonexistent')).toBeUndefined();
  });

  it('returns undefined when no key is given', () => {
    expect(resolveAsset(afterworldsAssets, undefined)).toBeUndefined();
  });
});
