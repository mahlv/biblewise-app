const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Bible versions ship as `.bible` asset files (JSON text): they stay out of the JS bundle and are
// read on demand (see lib/bibleLoader.ts and scripts/build-bible-versions.mjs).
config.resolver.assetExts.push('bible');

module.exports = config;
