/// <reference types="vitest/config" />
import { getViteConfig } from 'astro/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default getViteConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: 'happy-dom',
    globals: true,
  },
});
