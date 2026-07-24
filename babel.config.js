module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./src'],
          extensions: ['.ios.js', '.android.js', '.js', '.ts', '.tsx', '.json'],
          alias: {
            '@': './src',
            '@components': './src/components',
            '@screens': './src/screens',
            '@models': './src/models',
            '@utils': './src/utils',
          },
        },
      ],
      'react-native-reanimated/plugin',
    ],
    env: {
      // Jest runs under CommonJS without --experimental-vm-modules, so the
      // native `import()` calls left untouched by babel-preset-expo (e.g.
      // influenceAnalysis.ts's lazy `@utils/characterStorage` import) need
      // to be lowered to `require()` only for tests; Metro/production
      // builds are unaffected.
      test: {
        plugins: ['babel-plugin-dynamic-import-node'],
      },
    },
  };
};
