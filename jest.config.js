/**
 * Configuração do Jest para o app.
 *
 * `jest-expo` traz o preset do Expo (transform do Babel para React Native,
 * mocks das APIs nativas e os padrões de `transformIgnorePatterns` que incluem
 * `.pnpm`, necessário porque o projeto usa pnpm).
 *
 * Usamos o preset de uma plataforma (`ios`) em vez de `universal` de propósito:
 * o universal roda cada teste 4x (web/node/ios/android) e, para a tela, o
 * comportamento de renderização é idêntico — 4x o tempo sem ganho de cobertura.
 */
module.exports = {
  preset: 'jest-expo/ios',
  testMatch: ['<rootDir>/test/**/*.test.ts', '<rootDir>/test/**/*.test.tsx'],
};
