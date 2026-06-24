/// <reference types="vitest/config" />
import { getViteConfig } from 'astro/config';

export default getViteConfig({
  test: {
    environment: 'happy-dom',
    globals: true,
    exclude: ['**/node_modules/**', 'tests/pages/**'],
  },
});
