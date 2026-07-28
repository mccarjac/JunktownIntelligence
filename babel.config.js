module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // No module-resolver aliases: this app is a shell around the `lore`
    // package, and the only local code is its ruleset, imported relatively.
    plugins: ['react-native-reanimated/plugin'],
    env: {
      // Jest runs under CommonJS, so the dynamic `import()` inside the
      // engine's influenceAnalysis has to be lowered to `require()` for
      // tests. Metro/production builds are unaffected.
      test: {
        plugins: ['babel-plugin-dynamic-import-node'],
      },
    },
  };
};
