import 'i18next';
import type ptBR from '../locales/pt-BR.json';

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation';
    // pt-BR is the source of truth: every `t('some.key')` is checked against it.
    resources: { translation: typeof ptBR };
  }
}
