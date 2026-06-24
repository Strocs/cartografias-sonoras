import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

export default defineConfig({
  site: 'https://cartografias-sonoras.example.com',
  output: 'static',
  integrations: [react()],
});
