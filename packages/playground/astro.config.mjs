import mdx from '@astrojs/mdx';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';

export default defineConfig({
  devToolbar: { enabled: false },
  markdown: { shikiConfig: { theme: 'github-light' } },
  integrations: [react(), mdx({ gfm: true })],
  vite: { plugins: [tailwindcss()] },
});
