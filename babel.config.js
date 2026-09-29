/**
 * Configuração do Babel.
 *
 * O Metro (dev server do app) já aplica `babel-preset-expo` por conta própria,
 * então o app funciona sem este arquivo. Ele existe por causa do Jest:
 *
 *  - o `babel-jest` do preset do React Native transforma os arquivos, inclusive
 *    `@react-native/jest-preset/jest/setup.js`, que contém anotações Flow
 *    (`value(id: TimeoutID)`). Sem remover Flow, o Jest falha com
 *    "Unexpected token, expected ','";
 *  - o `babel-preset-expo` inclui `@babel/plugin-transform-flow-strip-types`,
 *    mas o Babel não o acha sozinho: com o `node_modules` estrito do pnpm ele
 *    fica aninhado sob `expo` e não é resolvível a partir da raiz do projeto.
 *
 * Por isso `babel-preset-expo` é uma devDependency explícita.
 */
module.exports = function (api) {
  api.cache(true);

  return {
    presets: ['babel-preset-expo'],
  };
};
