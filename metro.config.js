const { getDefaultConfig, mergeConfig } = require("@react-native/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = mergeConfig(getDefaultConfig(__dirname), {
  // Cap transform parallelism so the release bundle doesn't exhaust RAM on
  // memory-constrained machines (each worker loads the full module graph).
  maxWorkers: 2,
  resolver: {
    sourceExts: ['jsx', 'js', 'ts', 'tsx', 'cjs', 'json'],
    resolverMainFields: ['react-native', 'browser', 'main'],
  },
});

module.exports = withNativeWind(config, { input: "./global.css" });