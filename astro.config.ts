import tailwindcss from '@tailwindcss/vite';
import { defineConfig, fontProviders } from 'astro/config';
import react from '@astrojs/react';

export default defineConfig({
  site: 'https://cartografias-sonoras.example.com',
  output: 'static',
  integrations: [react()],
  image: {
    service: {
      entrypoint: 'astro/assets/services/sharp'
    }
  },
  fonts: [
    {
      provider: fontProviders.google(),
      name: 'Inter',
      cssVariable: '--font-inter',
      subsets: ['latin'],
      display: 'swap'
    },
    {
      provider: fontProviders.google(),
      name: 'Cormorant Garamond',
      cssVariable: '--font-cormorant',
      subsets: ['latin'],
      display: 'swap'
    }
  ],
  vite: {
    plugins: [tailwindcss()]
  }
});
