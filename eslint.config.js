// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*"],
  },
  {
    // Every touchable goes through AppPressable (haptics + pressed feedback in one place).
    files: ["**/*.{ts,tsx}"],
    ignores: ["components/ui/AppPressable.tsx"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "react-native",
              importNames: ["Pressable"],
              message: "Use AppPressable from components/ui/AppPressable instead of Pressable (haptics and pressed feedback).",
            },
          ],
        },
      ],
    },
  },
]);
