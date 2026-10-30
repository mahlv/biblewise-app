/** @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} */
module.exports = (config) => ({
  type: 'widget',
  name: 'BiblewiseWidget',
  displayName: 'Biblewise',
  // Interactive buttons (Refresh) use App Intents, available from iOS 17.
  deploymentTarget: '17.0',
  colors: {
    $widgetBackground: '#FFF3F0',
    $accent: '#B90039',
    cardTop: { light: '#FFF3F0', dark: '#3A1A14' },
    cardBottom: { light: '#FFDDE3', dark: '#1F0F0C' },
    quoteText: { light: '#3A0A00', dark: '#FFF3F0' },
    authorText: { light: '#906F70', dark: '#D9B8BA' },
    brand: { light: '#B90039', dark: '#EF2D56' },
  },
  // Same App Group the app writes the quotes to (see lib/widgetSync.ts).
  entitlements: {
    'com.apple.security.application-groups': config.ios?.entitlements?.['com.apple.security.application-groups'] ?? [],
  },
});
